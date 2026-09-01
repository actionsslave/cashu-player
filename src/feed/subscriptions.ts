/**
 * Abos und Episoden (FR-07 bis FR-11, FR-21).
 */
import {
  openDatabase,
  type EpisodeRecord,
  type SubscriptionRecord,
} from '../db/database.js';
import { fetchFeed, type FetchFeedOptions } from './fetch.js';
import { parseFeed, type ParsedFeed } from './parse.js';

export interface SubscriptionSummary extends SubscriptionRecord {
  episodeCount: number;
}

/**
 * Stabile ID eines Abos. Die normalisierte URL ist die ID: sie ist eindeutig,
 * lesbar und macht US-02-AC-4 ohne zusätzlichen Index prüfbar.
 */
export function feedId(url: string): string {
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    parsed.hash = '';
    const path = parsed.pathname.replace(/\/+$/, '');
    return `${parsed.protocol}//${parsed.host.toLowerCase()}${path}${parsed.search}`;
  } catch {
    return trimmed.replace(/\/+$/, '');
  }
}

function episodeKey(id: string, guid: string): string {
  return `${id}::${guid}`;
}

async function storeFeed(
  id: string,
  feedUrl: string,
  parsed: ParsedFeed,
  viaProxy: boolean,
  addedAt: number,
): Promise<SubscriptionRecord> {
  const record: SubscriptionRecord = {
    id,
    feedUrl,
    title: parsed.title,
    imageUrl: parsed.imageUrl,
    loadedViaProxy: viaProxy,
    npub: parsed.npub,
    totalEpisodes: parsed.totalEpisodes,
    addedAt,
    refreshedAt: Date.now(),
  };

  const db = await openDatabase();
  const tx = db.transaction(['subscriptions', 'episodes'], 'readwrite');
  await tx.objectStore('subscriptions').put(record);

  const episodes = tx.objectStore('episodes');
  // Alte Episoden dieses Feeds weg, damit ein Refresh nicht unbegrenzt anwächst.
  for (const key of await episodes.index('feedId').getAllKeys(id)) {
    await episodes.delete(key);
  }
  for (const episode of parsed.episodes) {
    const stored: EpisodeRecord = {
      id: episodeKey(id, episode.guid),
      feedId: id,
      title: episode.title,
      description: episode.description,
      enclosureUrl: episode.enclosureUrl,
      publishedAt: episode.publishedAt,
      durationSeconds: episode.durationSeconds,
    };
    await episodes.put(stored);
  }
  await tx.done;

  return record;
}

/** FR-07: Feed laden, parsen und als Abo anlegen. */
export async function subscribe(
  url: string,
  options: FetchFeedOptions = {},
): Promise<SubscriptionRecord> {
  const id = feedId(url);
  const db = await openDatabase();

  // US-02-AC-4: dieselbe URL legt kein zweites Abo an.
  const existing = await db.get('subscriptions', id);
  if (existing) return existing;

  const response = await fetchFeed(url.trim(), options);
  const parsed = parseFeed(response.xml);
  return storeFeed(id, url.trim(), parsed, response.viaProxy, Date.now());
}

/** FR-11: Feed neu laden. Scheitert das, bleibt der letzte Stand unangetastet. */
export async function refreshSubscription(
  id: string,
  options: FetchFeedOptions = {},
): Promise<SubscriptionRecord> {
  const db = await openDatabase();
  const existing = await db.get('subscriptions', id);
  if (!existing) throw new Error(`Abo ${id} ist nicht vorhanden.`);

  const response = await fetchFeed(existing.feedUrl, options);
  const parsed = parseFeed(response.xml);
  return storeFeed(id, existing.feedUrl, parsed, response.viaProxy, existing.addedAt);
}

/** FR-09: Abo-Liste mit Cover, Titel und Anzahl Episoden. */
export async function listSubscriptions(): Promise<SubscriptionSummary[]> {
  const db = await openDatabase();
  const subscriptions = await db.getAll('subscriptions');
  return Promise.all(
    subscriptions
      .sort((a, b) => a.addedAt - b.addedAt)
      .map(async (subscription) => ({
        ...subscription,
        episodeCount: await db.countFromIndex('episodes', 'feedId', subscription.id),
      })),
  );
}

/** FR-09: Abbestellen löscht auch die Episodendaten. */
export async function unsubscribe(id: string): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(['subscriptions', 'episodes'], 'readwrite');
  await tx.objectStore('subscriptions').delete(id);
  const episodes = tx.objectStore('episodes');
  for (const key of await episodes.index('feedId').getAllKeys(id)) {
    await episodes.delete(key);
  }
  await tx.done;
}

/** FR-10: Episoden absteigend nach Datum. */
export async function listEpisodes(id: string): Promise<EpisodeRecord[]> {
  const db = await openDatabase();
  const episodes = await db.getAllFromIndex('episodes', 'feedId', id);
  return episodes.sort((a, b) => b.publishedAt - a.publishedAt);
}
