/**
 * Subscriptions-Block aus Entwurf 1a und die leere Bibliothek aus 3d
 * (FR-07 bis FR-11, FR-21).
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
  /** Episode, die gerade läuft — im Entwurf fett und in Textfarbe. */
  playingEpisodeId?: string;
  onEpisodeSelected?: (episode: EpisodeRecord, subscription: SubscriptionSummary) => void;
}

function describeError(error: unknown): string {
  if (error instanceof FeedParseError) return error.message;
  if (error instanceof FeedFetchError) return error.message;
  return 'Der Feed konnte nicht geladen werden.';
}

export function FeedView({
  fetchImpl,
  proxyUrl,
  playingEpisodeId,
  onEpisodeSelected,
}: FeedViewProps) {
  const [url, setUrl] = useState('');
  const [subscriptions, setSubscriptions] = useState<SubscriptionSummary[]>([]);
  const [episodes, setEpisodes] = useState<Record<string, EpisodeRecord[]>>({});
  const [error, setError] = useState<string | undefined>(undefined);
  const [confirmingId, setConfirmingId] = useState<string | undefined>(undefined);

  const reload = useCallback(async () => {
    // Der Entwurf zeigt alle Abos nebeneinander, jedes mit seinen neuesten
    // Folgen. Die Episodenlisten laufen parallel: eine Schleife mit await je
    // Feed haengt die Zahl der Renderrunden an die Zahl der Abos.
    const list = await listSubscriptions();
    const listen = await Promise.all(list.map((entry) => listEpisodes(entry.id)));

    const byFeed: Record<string, EpisodeRecord[]> = {};
    list.forEach((entry, index) => {
      byFeed[entry.id] = listen[index];
    });

    // Beides in einem Zug, damit nie eine Abo-Liste ohne ihre Episoden steht.
    setSubscriptions(list);
    setEpisodes(byFeed);
  }, []);

  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (loaded) return;
    setLoaded(true);
    void reload();
  }, [loaded, reload]);

  async function handleSubscribe() {
    setError(undefined);
    try {
      // US-02-AC-4: liegt das Abo schon vor, legt subscribe kein zweites an.
      await subscribe(url, { fetchImpl, proxyUrl });
      setUrl('');
      await reload();
    } catch (cause) {
      setError(describeError(cause));
    }
  }

  async function handleRefresh(id: string) {
    setError(undefined);
    try {
      await refreshSubscription(id, { fetchImpl, proxyUrl });
      await reload();
    } catch (cause) {
      // FR-11: der letzte Stand bleibt stehen, nur der Hinweis kommt dazu.
      setError(describeError(cause));
    }
  }

  async function handleUnsubscribe(id: string) {
    await unsubscribe(id);
    setConfirmingId(undefined);
    await reload();
  }

  const addFeed = (
    <div class="add-feed">
      <input
        class="input"
        type="url"
        name="feed-url"
        placeholder="https://…/rss"
        value={url}
        onInput={(event) => setUrl((event.target as HTMLInputElement).value)}
      />
      <button
        type="button"
        class="btn btn-primary"
        onClick={() => void handleSubscribe()}
        disabled={url.trim() === ''}
      >
        Abonnieren
      </button>
    </div>
  );

  // 3d — leere Bibliothek. Kein Transport, keine Session-Spalte, keine Illustration.
  if (subscriptions.length === 0) {
    return (
      <section class="empty-library">
        <span class="kicker">Nichts in der Wiedergabe</span>
        <h1>Füg einen Feed ein, um zu hören.</h1>
        <p class="lead text-muted">
          Jede RSS-Adresse funktioniert. Podcasts mit hinterlegter nostr-Identität werden pro
          Minute aus deiner Wallet bezahlt; die übrigen laufen einfach.
        </p>
        {addFeed}
        {error && <p class="wallet-error">{error}</p>}
      </section>
    );
  }

  return (
    <section class="subscriptions">
      <h2>Abos</h2>
      <p class="subline text-muted">
        Je die drei neuesten Folgen. Nur Titel — Feed-Beschreibungen sind rohes HTML.
      </p>
      {addFeed}
      {error && <p class="wallet-error">{error}</p>}

      <div class="feed-grid">
        {subscriptions.map((subscription) => (
          <div class="subscription" key={subscription.id}>
            <div class="feed-head">
              {subscription.imageUrl ? (
                <img
                  class="art halftone"
                  src={subscription.imageUrl}
                  alt=""
                  width={52}
                  height={52}
                />
              ) : (
                <span class="art art-placeholder">Art</span>
              )}
              <div>
                <h4>{subscription.title}</h4>
                <p class="count text-muted">
                  <span>{subscription.totalEpisodes ?? subscription.episodeCount} Episoden</span>
                  {subscription.loadedViaProxy && (
                    <span class="tag tag-neutral">über Proxy geladen</span>
                  )}
                </p>
              </div>
            </div>

            {/* US-07-AC-1: der konkret fehlende Baustein, hier die nostr-Identität. */}
            {!subscription.npub && (
              <p class="feed-blocked">
                Keine Zahlungen: Dieser Feed trägt keine nostr-Identität. Die Wiedergabe läuft.
              </p>
            )}

            <div class="episodes">
              {(episodes[subscription.id] ?? []).slice(0, EPISODES_VISIBLE).map((episode) => (
                <button
                  type="button"
                  key={episode.id}
                  class={episode.id === playingEpisodeId ? 'ep playing' : 'ep'}
                  onClick={() => onEpisodeSelected?.(episode, subscription)}
                >
                  {episode.title}
                </button>
              ))}
            </div>

            <div class="feed-actions">
              <button
                type="button"
                class="btn btn-ghost"
                onClick={() => void handleRefresh(subscription.id)}
              >
                Aktualisieren
              </button>
              <button
                type="button"
                class="btn btn-ghost"
                onClick={() => setConfirmingId(subscription.id)}
              >
                Abbestellen
              </button>
            </div>

            {confirmingId === subscription.id && (
              <div class="dialog-backdrop">
                <div class="dialog" role="dialog" aria-label="Abbestellen bestätigen">
                  <p class="dialog-title">„{subscription.title}" abbestellen?</p>
                  <p>Die Episodendaten werden mitgelöscht.</p>
                  <div class="dialog-actions">
                    <button
                      type="button"
                      class="btn btn-secondary"
                      onClick={() => setConfirmingId(undefined)}
                    >
                      Abbrechen
                    </button>
                    <button
                      type="button"
                      class="btn btn-primary"
                      onClick={() => void handleUnsubscribe(subscription.id)}
                    >
                      Ja, abbestellen
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
