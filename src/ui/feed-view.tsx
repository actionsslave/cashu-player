/**
 * Abos und Episoden (FR-07 bis FR-11, FR-21).
 */
import { useCallback, useEffect, useState } from 'preact/hooks';
import { EPISODES_VISIBLE } from '../config/build-config.js';
import type { EpisodeRecord } from '../db/database.js';
import { FeedFetchError } from '../feed/fetch.js';
import { FeedParseError } from '../feed/parse.js';
import {
  listEpisodes,
  listSubscriptions,
  refreshSubscription,
  subscribe,
  unsubscribe,
  type SubscriptionSummary,
} from '../feed/subscriptions.js';

export interface FeedViewProps {
  /** Nur für Tests; im Betrieb der fetch des Browsers. */
  fetchImpl?: typeof fetch;
  /** Nur für Tests; im Betrieb FEED_PROXY_URL aus der Build-Konfiguration. */
  proxyUrl?: string;
  onEpisodeSelected?: (episode: EpisodeRecord, subscription: SubscriptionSummary) => void;
}

export function formatDuration(seconds: number | undefined): string {
  if (!seconds) return '';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(rest)}` : `${minutes}:${pad(rest)}`;
}

function describeError(error: unknown): string {
  if (error instanceof FeedParseError) return error.message;
  if (error instanceof FeedFetchError) return error.message;
  return 'Der Feed konnte nicht geladen werden.';
}

export function FeedView({ fetchImpl, proxyUrl, onEpisodeSelected }: FeedViewProps) {
  const [url, setUrl] = useState('');
  const [subscriptions, setSubscriptions] = useState<SubscriptionSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [episodes, setEpisodes] = useState<EpisodeRecord[]>([]);
  const [error, setError] = useState<string | undefined>(undefined);
  const [confirmingId, setConfirmingId] = useState<string | undefined>(undefined);

  const reload = useCallback(
    async (select?: string) => {
      const list = await listSubscriptions();
      setSubscriptions(list);
      const active = select ?? selectedId ?? list[0]?.id;
      setSelectedId(active);
      setEpisodes(active ? await listEpisodes(active) : []);
    },
    [selectedId],
  );

  // Einmal beim Mounten laden; spätere Aktualisierungen laufen über die Handler,
  // damit die Auswahl des Nutzers nicht bei jedem Renderlauf zurückspringt.
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (loaded) return;
    setLoaded(true);
    void reload();
  }, [loaded, reload]);

  async function handleSubscribe() {
    setError(undefined);
    try {
      // US-02-AC-4: liegt das Abo schon vor, springt die Ansicht dorthin.
      const subscription = await subscribe(url, { fetchImpl, proxyUrl });
      setUrl('');
      await reload(subscription.id);
    } catch (cause) {
      setError(describeError(cause));
    }
  }

  async function handleRefresh(id: string) {
    setError(undefined);
    try {
      await refreshSubscription(id, { fetchImpl, proxyUrl });
      await reload(id);
    } catch (cause) {
      // FR-11: der letzte Stand bleibt stehen, nur der Hinweis kommt dazu.
      setError(describeError(cause));
    }
  }

  async function handleUnsubscribe(id: string) {
    await unsubscribe(id);
    setConfirmingId(undefined);
    const list = await listSubscriptions();
    setSubscriptions(list);
    const next = list[0]?.id;
    setSelectedId(next);
    setEpisodes(next ? await listEpisodes(next) : []);
  }

  const selected = subscriptions.find((subscription) => subscription.id === selectedId);

  return (
    <section class="feeds">
      <h2>Abos</h2>
      <div class="add-feed">
        <input
          type="url"
          name="feed-url"
          placeholder="https://…/rss"
          value={url}
          onInput={(event) => setUrl((event.target as HTMLInputElement).value)}
        />
        <button type="button" onClick={() => void handleSubscribe()} disabled={url.trim() === ''}>
          Abonnieren
        </button>
      </div>
      {error && <p class="error">{error}</p>}

      <ul class="subscriptions">
        {subscriptions.map((subscription) => (
          <li
            class={`subscription${subscription.id === selectedId ? ' selected' : ''}`}
            key={subscription.id}
          >
            {subscription.imageUrl && (
              <img class="cover" src={subscription.imageUrl} alt="" width={48} height={48} />
            )}
            <button type="button" class="link" onClick={() => void reload(subscription.id)}>
              {subscription.title}
            </button>
            <span class="meta">{subscription.episodeCount} Episoden</span>
            {subscription.loadedViaProxy && <span class="badge">über Proxy geladen</span>}
            <button type="button" onClick={() => void handleRefresh(subscription.id)}>
              Aktualisieren
            </button>
            <button type="button" onClick={() => setConfirmingId(subscription.id)}>
              Abbestellen
            </button>
            {confirmingId === subscription.id && (
              <div class="dialog" role="dialog" aria-label="Abbestellen bestätigen">
                <p>„{subscription.title}" abbestellen? Die Episodendaten werden mitgelöscht.</p>
                <button type="button" onClick={() => void handleUnsubscribe(subscription.id)}>
                  Ja, abbestellen
                </button>
                <button type="button" onClick={() => setConfirmingId(undefined)}>
                  Abbrechen
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {selected && (
        <>
          <h3>{selected.title}</h3>
          {/* US-07-AC-1: der konkret fehlende Baustein, hier die nostr-Identität. */}
          {!selected.npub && (
            <p class="locked">
              Zahlungen sind für diesen Podcast nicht möglich: Der Feed enthält keine
              nostr-Identität.
            </p>
          )}
          {/*
            FR-10: die neuesten EPISODES_VISIBLE Episoden, je Episode bewusst
            nur der Titel. Datum, Dauer und Beschreibung stehen
            weiterhin am EpisodeRecord und werden beim Parsen gespeichert — sie
            sind hier nur nicht sichtbar, weil die Beschreibungen der Feeds die
            Liste unlesbar machen. Der Titel waehlt die Episode aus; die
            Wiedergabe uebernimmt der Player.
          */}
          <ul class="episodes">
            {episodes.slice(0, EPISODES_VISIBLE).map((episode) => (
              <li key={episode.id}>
                <button
                  type="button"
                  class="link"
                  onClick={() => onEpisodeSelected?.(episode, selected)}
                >
                  {episode.title}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
