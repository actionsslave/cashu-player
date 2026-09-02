/**
 * Bibliothek aus Entwurf 2a: Shows, Episodes, Show-Seite und Suche.
 *
 * Der Umschalter Shows ⇄ Episodes tauscht die ganze Fläche aus — er ist die
 * Hauptnavigation, kein Filter, und bleibt über Seitenwechsel bestehen.
 * Magenta markiert im ganzen Entwurf genau eine Sache: ungehört.
 */
import type { ComponentChildren } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import type { EpisodeRecord } from '../db/database.js';
import type { SubscriptionSummary } from '../feed/subscriptions.js';
import { formatRemaining, isPlayed, remainingSeconds, unplayedCount } from '../player/progress.js';
import { Icon } from './icons.js';

export type LibraryTab = 'shows' | 'episodes';
export type SearchFilter = 'all' | 'shows' | 'episodes' | 'unplayed';

export interface LibraryProps {
  subscriptions: SubscriptionSummary[];
  /**
   * Feed hinzufuegen. Der Entwurf zeigt in 2a keine Eingabe — ohne sie liesse
   * sich aber nichts abonnieren (FR-07). Sie steht deshalb unter der
   * Abschnittsueberschrift.
   */
  addFeed?: ComponentChildren;
  /** Episoden je Abo-ID, bereits absteigend nach Datum. */
  episodes: Record<string, EpisodeRecord[]>;
  positions: Map<string, number>;
  playingEpisodeId?: string;
  onPlay: (episode: EpisodeRecord, subscription: SubscriptionSummary, expand: boolean) => void;
  /** FR-11: manueller Refresh, im Entwurf hinter dem Dreipunkt-Menü. */
  onRefresh?: (id: string) => Promise<void>;
  /** FR-09: Abbestellen nach Bestätigung, ebenfalls dort. */
  onUnsubscribe?: (id: string) => Promise<void>;
}

/** Beschreibungen der Feeds tragen rohes HTML; für eine Zeile reicht der Text. */
export function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function Cover({ url, klasse }: { url?: string; klasse: string }) {
  return url ? (
    <img class={`${klasse} halftone`} src={url} alt="" />
  ) : (
    <span class={`${klasse} art-placeholder`}>Cover</span>
  );
}

/** Eine Episodenzeile, wie 2a Episodes und die Show-Seite sie zeigen. */
function EpisodeRow({
  episode,
  subscription,
  kicker,
  unplayed,
  positions,
  onPlay,
  onShowPage,
}: {
  episode: EpisodeRecord;
  subscription: SubscriptionSummary;
  kicker: string;
  unplayed: boolean;
  positions: Map<string, number>;
  onPlay: (episode: EpisodeRecord, subscription: SubscriptionSummary, expand: boolean) => void;
  onShowPage?: boolean;
}) {
  const position = positions.get(episode.id);
  const played = isPlayed(episode.durationSeconds, position);
  const rest = remainingSeconds(episode.durationSeconds, position);

  return (
    <div class={onShowPage ? 'episode-row on-show' : 'episode-row'}>
      <div>
        <span class="kicker-line">
          {unplayed && <span class="new-dot small" aria-label="ungehört" />}
          {kicker}
        </span>
        {/* Titel klicken: abspielen und in den Vollbild-Player wechseln. */}
        <button type="button" class="title" onClick={() => onPlay(episode, subscription, true)}>
          {episode.title}
        </button>
        <p class="desc">{plainText(episode.description)}</p>
      </div>
      <span class={played ? 'remaining played' : 'remaining'}>
        {played ? 'Gehört' : rest !== undefined ? formatRemaining(rest) : ''}
      </span>
      {/* Knopf klicken: abspielen, Liste bleibt stehen. */}
      <button
        type="button"
        class={played ? 'btn btn-icon btn-ghost' : 'btn btn-icon btn-secondary'}
        aria-label={`${episode.title} abspielen`}
        onClick={() => onPlay(episode, subscription, false)}
      >
        <Icon name="play" size={17} />
      </button>
    </div>
  );
}

export function useLibrary({
  subscriptions,
  addFeed,
  episodes,
  positions,
  playingEpisodeId,
  onPlay,
  onRefresh,
  onUnsubscribe,
}: LibraryProps) {
  const [view, setView] = useState<LibraryTab>('shows');
  const [openShow, setOpenShow] = useState<string | undefined>(undefined);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SearchFilter>('all');

  const ungehoert = useMemo(() => {
    const map = new Map<string, number>();
    for (const abo of subscriptions) {
      map.set(abo.id, unplayedCount(episodes[abo.id] ?? [], positions));
    }
    return map;
  }, [subscriptions, episodes, positions]);

  /** Alle Episoden über alle Abos, neueste zuerst. */
  const alle = useMemo(() => {
    const flach: { episode: EpisodeRecord; subscription: SubscriptionSummary }[] = [];
    for (const abo of subscriptions) {
      for (const episode of episodes[abo.id] ?? []) flach.push({ episode, subscription: abo });
    }
    return flach.sort((a, b) => b.episode.publishedAt - a.episode.publishedAt);
  }, [subscriptions, episodes]);

  const heute = new Date().toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const mitNeuen = [...ungehoert.values()].filter((n) => n > 0).length;
  const show = subscriptions.find((abo) => abo.id === openShow);

  // ── Suche ──────────────────────────────────────────────────────────
  const treffer = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === '') return { shows: [], episodes: [] };
    const shows =
      filter === 'episodes' || filter === 'unplayed'
        ? []
        : subscriptions.filter((abo) => abo.title.toLowerCase().includes(q));
    const eps =
      filter === 'shows'
        ? []
        : alle
            .filter(({ episode }) => episode.title.toLowerCase().includes(q))
            .filter(
              ({ episode }) =>
                filter !== 'unplayed' ||
                !isPlayed(episode.durationSeconds, positions.get(episode.id)),
            );
    return { shows, episodes: eps };
  }, [query, filter, subscriptions, alle, positions]);

  const kopfSuche = (
    <div class="search-head">
      <Icon name="magnifying-glass" size={24} />
      <input
        type="search"
        name="library-search"
        aria-label="Abos durchsuchen"
        placeholder="Suchen"
        value={query}
        autoFocus
        onInput={(event) => setQuery((event.target as HTMLInputElement).value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setSearchOpen(false);
        }}
      />
      <button
        type="button"
        class="btn btn-ghost btn-icon"
        aria-label="Suche schließen"
        onClick={() => setSearchOpen(false)}
      >
        <Icon name="x" size={20} />
      </button>
    </div>
  );

  const umschalter = (
    <div class="seg" role="tablist" aria-label="Ansicht">
      {(['shows', 'episodes'] as const).map((id) => (
        <button
          type="button"
          key={id}
          role="tab"
          aria-selected={view === id}
          class={view === id ? 'seg-opt active' : 'seg-opt'}
          onClick={() => {
            setView(id);
            setOpenShow(undefined);
          }}
        >
          {id === 'shows' ? 'Shows' : 'Episoden'}
        </button>
      ))}
    </div>
  );

  const kopfBibliothek = (
    <div class="top-row">
      {show ? (
        <button type="button" class="btn btn-ghost" onClick={() => setOpenShow(undefined)}>
          <Icon name="arrow-left" size={18} /> Alle Shows
        </button>
      ) : (
        <span class="wordmark">Podcasts</span>
      )}
      <span class="spacer" />
      {umschalter}
      <span class="spacer" />
      <button
        type="button"
        class="btn btn-ghost btn-icon"
        aria-label="Abos durchsuchen"
        onClick={() => setSearchOpen(true)}
      >
        <Icon name="magnifying-glass" size={20} />
      </button>
    </div>
  );

  const datumsleiste = searchOpen ? (
    <>
      <div class="search-filters">
        {(
          [
            ['all', 'Alle'],
            ['shows', 'Shows'],
            ['episodes', 'Episoden'],
            ['unplayed', 'Ungehört'],
          ] as const
        ).map(([id, label]) => (
          <button
            type="button"
            key={id}
            class={filter === id ? 'active' : undefined}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <span>Durchsucht deine Abos</span>
    </>
  ) : show ? (
    <>
      <span>{show.title}</span>
      <span>
        {show.totalEpisodes ?? show.episodeCount} Episoden · {ungehoert.get(show.id) ?? 0} neu
      </span>
      <span>Neueste zuerst</span>
    </>
  ) : (
    <>
      <span>{heute}</span>
      <span>
        {subscriptions.length === 1 ? '1 Abo' : `${subscriptions.length} Abos`} · {mitNeuen} mit
        neuen Folgen
      </span>
      <span>{view === 'shows' ? 'Zuletzt aktualisiert' : 'Neueste zuerst'}</span>
    </>
  );

  return {
    head: searchOpen ? kopfSuche : kopfBibliothek,
    dateline: datumsleiste,
    body: searchOpen ? (
      <SearchResults
        leer={query.trim() === ''}
        treffer={treffer}
        positions={positions}
        onOpenShow={(id) => {
          setSearchOpen(false);
          setOpenShow(id);
        }}
        onPlay={onPlay}
      />
    ) : show ? (
      <ShowPage
        show={show}
        episodes={episodes[show.id] ?? []}
        positions={positions}
        onPlay={onPlay}
        onRefresh={onRefresh}
        onUnsubscribe={async (id) => {
          await onUnsubscribe?.(id);
          setOpenShow(undefined);
        }}
      />
    ) : view === 'shows' ? (
      <ShowsGrid
        subscriptions={subscriptions}
        ungehoert={ungehoert}
        addFeed={addFeed}
        onOpen={setOpenShow}
      />
    ) : (
      <EpisodesList
        alle={alle}
        positions={positions}
        playingEpisodeId={playingEpisodeId}
        onPlay={onPlay}
      />
    ),
  };
}

function ShowsGrid({
  subscriptions,
  ungehoert,
  addFeed,
  onOpen,
}: {
  subscriptions: SubscriptionSummary[];
  ungehoert: Map<string, number>;
  addFeed?: ComponentChildren;
  onOpen: (id: string) => void;
}) {
  return (
    <>
      <div class="section-head">
        <h3>Abos</h3>
      </div>
      {addFeed}
      <div class="show-grid">
        {subscriptions.map((abo) => {
          const neu = ungehoert.get(abo.id) ?? 0;
          return (
            <div class="show-tile subscription" key={abo.id}>
              <button
                type="button"
                class="ep"
                style={{ display: 'block', width: '100%' }}
                onClick={() => onOpen(abo.id)}
              >
                <Cover url={abo.imageUrl} klasse="cover" />
                <span class="title-row">
                  {neu > 0 && <span class="new-dot" aria-label="neue Folgen" />}
                  <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '18px' }}>
                    {abo.title}
                  </span>
                </span>
              </button>
              <p class="meta">
                {neu > 0 ? `${neu} neu` : 'Alles gehört'} ·{' '}
                {abo.totalEpisodes ?? abo.episodeCount} Episoden
                {abo.loadedViaProxy && ' · über Proxy geladen'}
              </p>
            </div>
          );
        })}
      </div>
    </>
  );
}

function EpisodesList({
  alle,
  positions,
  playingEpisodeId,
  onPlay,
}: {
  alle: { episode: EpisodeRecord; subscription: SubscriptionSummary }[];
  positions: Map<string, number>;
  playingEpisodeId?: string;
  onPlay: LibraryProps['onPlay'];
}) {
  return (
    <>
      <div class="section-head">
        <h3>Neueste Folgen</h3>
      </div>
      <div class="episodes">
        {alle.map(({ episode, subscription }) => (
          <EpisodeRow
            key={episode.id}
            episode={episode}
            subscription={subscription}
            kicker={subscription.title}
            unplayed={
              episode.id !== playingEpisodeId &&
              !isPlayed(episode.durationSeconds, positions.get(episode.id))
            }
            positions={positions}
            onPlay={onPlay}
          />
        ))}
      </div>
    </>
  );
}

function ShowPage({
  show,
  episodes,
  positions,
  onPlay,
  onRefresh,
  onUnsubscribe,
}: {
  show: SubscriptionSummary;
  episodes: EpisodeRecord[];
  positions: Map<string, number>;
  onPlay: LibraryProps['onPlay'];
  onRefresh?: (id: string) => Promise<void>;
  onUnsubscribe?: (id: string) => Promise<void>;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <div class="show-header">
        <Cover url={show.imageUrl} klasse="cover" />
        <div>
          <h2>{show.title}</h2>
          {!show.npub && (
            <p class="feed-blocked">
              Keine Zahlungen: Dieser Feed trägt keine nostr-Identität. Die Wiedergabe läuft.
            </p>
          )}
        </div>
        <div class="actions">
          <button type="button" class="btn btn-secondary">
            <Icon name="check" size={16} /> Abonniert
          </button>
          {/* FR-09 und FR-11 liegen im Dreipunkt-Menü; der Entwurf sieht es vor. */}
          <button
            type="button"
            class="btn btn-icon btn-ghost"
            aria-label="Weitere Aktionen"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Icon name="dots-three" size={18} />
          </button>
          {menuOpen && (
            <div class="show-menu">
              <button
                type="button"
                class="btn btn-ghost"
                onClick={() => {
                  setMenuOpen(false);
                  void onRefresh?.(show.id);
                }}
              >
                Aktualisieren
              </button>
              <button
                type="button"
                class="btn btn-ghost"
                onClick={() => {
                  setMenuOpen(false);
                  setConfirming(true);
                }}
              >
                Abbestellen
              </button>
            </div>
          )}
        </div>
      </div>

      {confirming && (
        <div class="dialog-backdrop">
          <div class="dialog" role="dialog" aria-label="Abbestellen bestätigen">
            <p class="dialog-title">„{show.title}" abbestellen?</p>
            <p>Die Episodendaten werden mitgelöscht.</p>
            <div class="dialog-actions">
              <button type="button" class="btn btn-secondary" onClick={() => setConfirming(false)}>
                Abbrechen
              </button>
              <button
                type="button"
                class="btn btn-primary"
                onClick={() => void onUnsubscribe?.(show.id)}
              >
                Ja, abbestellen
              </button>
            </div>
          </div>
        </div>
      )}
      <div class="episodes">
        {episodes.map((episode) => (
          <EpisodeRow
            key={episode.id}
            episode={episode}
            subscription={show}
            kicker={new Date(episode.publishedAt).toLocaleDateString('de-DE', {
              day: 'numeric',
              month: 'long',
            })}
            unplayed={!isPlayed(episode.durationSeconds, positions.get(episode.id))}
            positions={positions}
            onPlay={onPlay}
            onShowPage
          />
        ))}
      </div>
    </>
  );
}

function SearchResults({
  leer,
  treffer,
  positions,
  onOpenShow,
  onPlay,
}: {
  leer: boolean;
  treffer: {
    shows: SubscriptionSummary[];
    episodes: { episode: EpisodeRecord; subscription: SubscriptionSummary }[];
  };
  positions: Map<string, number>;
  onOpenShow: (id: string) => void;
  onPlay: LibraryProps['onPlay'];
}) {
  // Ohne Eingabe ist nichts gesucht worden — „keine Treffer" waere gelogen.
  if (leer) {
    return <p class="text-muted">Tippe, um deine Abos zu durchsuchen.</p>;
  }
  if (treffer.shows.length === 0 && treffer.episodes.length === 0) {
    return <p class="text-muted">Keine Treffer in deinen Abos.</p>;
  }
  return (
    <>
      {treffer.shows.length > 0 && (
        <div class="search-group">
          <span class="kicker kicker-neutral">Shows</span>
          {treffer.shows.map((abo) => (
            <button
              type="button"
              class="search-show-row ep"
              key={abo.id}
              style={{ width: '100%' }}
              onClick={() => onOpenShow(abo.id)}
            >
              <Cover url={abo.imageUrl} klasse="cover" />
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '18px' }}>
                {abo.title}
              </span>
            </button>
          ))}
        </div>
      )}
      {treffer.episodes.length > 0 && (
        <div class="search-group">
          <span class="kicker kicker-neutral">Episoden</span>
          <div class="episodes">
            {treffer.episodes.map(({ episode, subscription }) => (
              <EpisodeRow
                key={episode.id}
                episode={episode}
                subscription={subscription}
                kicker={subscription.title}
                unplayed={!isPlayed(episode.durationSeconds, positions.get(episode.id))}
                positions={positions}
                onPlay={onPlay}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
