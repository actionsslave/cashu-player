import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { closeDatabase } from '../../src/db/database.js';
import {
  listEpisodes,
  listSubscriptions,
  refreshSubscription,
  subscribe,
  unsubscribe,
} from '../../src/feed/subscriptions.js';
import { resetDatabase } from '../helpers/db.js';
import { FEED_OHNE_NOSTR, VOLLSTAENDIGER_FEED, feedMitEpisoden } from './fixtures.js';

const URL_A = 'https://feed.example/rss';

const serve = (body: string, status = 200) =>
  vi.fn<typeof fetch>().mockResolvedValue(new Response(body, { status }));

beforeEach(async () => {
  await resetDatabase();
});

afterEach(async () => {
  await closeDatabase();
});

describe('FR-07: Feed per URL hinzufügen', () => {
  it('US-02-AC-1: legt das Abo mit Titel und Cover an', async () => {
    const subscription = await subscribe(URL_A, { fetchImpl: serve(VOLLSTAENDIGER_FEED) });
    expect(subscription.title).toBe('Testpodcast');
    expect(subscription.imageUrl).toBe('https://example.com/cover.jpg');
  });

  it('FR-21: speichert die nostr-Identität am Abo', async () => {
    const subscription = await subscribe(URL_A, { fetchImpl: serve(VOLLSTAENDIGER_FEED) });
    expect(subscription.npub).toBe(
      'npub1sn0wdenkukak0d9dfczzeacvhkrgz92ak56egt7vdgzn8pv2wfqqhrjdv9',
    );
  });

  it('US-02-AC-3: legt bei einer Seite ohne RSS kein Abo an', async () => {
    await expect(
      subscribe(URL_A, { fetchImpl: serve('<html><body>nix</body></html>') }),
    ).rejects.toThrow(/Kein gültiger Podcast-Feed/);
    expect(await listSubscriptions()).toEqual([]);
  });

  it('US-02-AC-4: legt dieselbe URL kein zweites Mal an', async () => {
    const first = await subscribe(URL_A, { fetchImpl: serve(VOLLSTAENDIGER_FEED) });
    const second = await subscribe(URL_A, { fetchImpl: serve(VOLLSTAENDIGER_FEED) });
    expect(second.id).toBe(first.id);
    expect(await listSubscriptions()).toHaveLength(1);
  });

  it('US-02-AC-4: erkennt dieselbe URL trotz Leerzeichen und Schrägstrich am Ende', async () => {
    await subscribe(URL_A, { fetchImpl: serve(VOLLSTAENDIGER_FEED) });
    await subscribe(`  ${URL_A}/  `, { fetchImpl: serve(VOLLSTAENDIGER_FEED) });
    expect(await listSubscriptions()).toHaveLength(1);
  });

  it('FR-08: merkt sich, dass der Feed über den Proxy geladen wurde', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response(VOLLSTAENDIGER_FEED, { status: 200 }));

    // Proxy explizit, weil FEED_PROXY_URL im Build leer ist (OQ-03).
    const subscription = await subscribe(URL_A, {
      fetchImpl,
      proxyUrl: 'https://proxy.example/rss?url=',
    });
    expect(subscription.loadedViaProxy).toBe(true);
  });
});

describe('FR-09: Abo-Liste und Abbestellen', () => {
  it('nennt je Abo die Anzahl der Episoden', async () => {
    await subscribe(URL_A, { fetchImpl: serve(VOLLSTAENDIGER_FEED) });
    const [entry] = await listSubscriptions();
    expect(entry.episodeCount).toBe(2);
  });

  it('löscht beim Abbestellen auch die Episodendaten', async () => {
    const subscription = await subscribe(URL_A, { fetchImpl: serve(VOLLSTAENDIGER_FEED) });
    await unsubscribe(subscription.id);

    expect(await listSubscriptions()).toEqual([]);
    expect(await listEpisodes(subscription.id)).toEqual([]);
  });

  it('lässt die Episoden anderer Abos beim Abbestellen unangetastet', async () => {
    const a = await subscribe(URL_A, { fetchImpl: serve(VOLLSTAENDIGER_FEED) });
    const b = await subscribe('https://zweiter.example/rss', { fetchImpl: serve(FEED_OHNE_NOSTR) });

    await unsubscribe(a.id);

    expect(await listEpisodes(b.id)).toHaveLength(1);
  });
});

describe('FR-10: Episodenliste', () => {
  it('liefert die Episoden absteigend nach Datum', async () => {
    const subscription = await subscribe(URL_A, { fetchImpl: serve(VOLLSTAENDIGER_FEED) });
    const titles = (await listEpisodes(subscription.id)).map((episode) => episode.title);
    expect(titles).toEqual(['Folge 2', 'Folge 1']);
  });

  it('speichert höchstens 50 Episoden je Feed', async () => {
    const subscription = await subscribe(URL_A, { fetchImpl: serve(feedMitEpisoden(70)) });
    expect(await listEpisodes(subscription.id)).toHaveLength(50);
  });
});

describe('FR-11: Refresh', () => {
  it('übernimmt neue Episoden aus dem neu geladenen Feed', async () => {
    const subscription = await subscribe(URL_A, { fetchImpl: serve(FEED_OHNE_NOSTR) });
    await refreshSubscription(subscription.id, { fetchImpl: serve(VOLLSTAENDIGER_FEED) });
    expect(await listEpisodes(subscription.id)).toHaveLength(2);
  });

  it('lässt bei einem HTTP-Fehler den letzten Stand stehen und meldet den Fehler', async () => {
    const subscription = await subscribe(URL_A, { fetchImpl: serve(VOLLSTAENDIGER_FEED) });

    await expect(
      refreshSubscription(subscription.id, { fetchImpl: serve('weg', 500) }),
    ).rejects.toMatchObject({ reason: 'http' });

    expect(await listEpisodes(subscription.id)).toHaveLength(2);
    expect(await listSubscriptions()).toHaveLength(1);
  });

  it('meldet einen unbekannten Abo-Schlüssel', async () => {
    await expect(refreshSubscription('gibt-es-nicht')).rejects.toThrow(/Abo/);
  });
});
