import { render } from 'preact';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Frame, RouteLinks, type Route } from './ui/chrome.js';
import { IdentityControl, IdentityNotices, useIdentity } from './ui/identity-bar.js';
import { InstallButton } from './ui/install-button.js';
import { FeedView } from './ui/feed-view.js';
import { useLibrary } from './ui/library-view.js';
import { Player } from './ui/player.js';
import {
  listEpisodes,
  listSubscriptions,
  refreshSubscription,
  unsubscribe,
  type SubscriptionSummary,
} from './feed/subscriptions.js';
import { loadPosition } from './player/position-store.js';
import { Icon } from './ui/icons.js';
import { WalletView } from './ui/wallet-view.js';
import { SettingsView } from './ui/settings-view.js';
import { NutzapDialog } from './ui/nutzap-dialog.js';
import { paymentCapability } from './payments/capability.js';
import { resolvePaymentTarget } from './payments/resolve-target.js';
import { sendNutzap, retryPendingNutzaps } from './payments/pay.js';
import { SimplePoolGateway } from './payments/simple-pool-gateway.js';
import { StreamingController } from './payments/streaming.js';
import {
  confirmStreamingRate,
  getStreamingRate,
  isStreamingRateConfirmed,
} from './payments/streaming-settings.js';
import { runSigningProbe } from './identity/signing-permission.js';
import { LocalWallet } from './wallet/local-wallet.js';
import { CashuMintGateway } from './wallet/cashu-mint-gateway.js';
import { readStorageMode, type StorageMode } from './wallet/persistence.js';
import { registerServiceWorker } from './pwa/register.js';
import { hasPlaceholders, publicMints } from './config/build-config.js';
import type { PaymentTarget, ListeningTick } from './contracts/index.js';
import type { StreamingState } from './payments/streaming.js';
import type { Session } from './identity/session.js';
import type { EpisodeRecord } from './db/database.js';
import './ui/app.css';

interface NowPlaying {
  episode: EpisodeRecord;
  podcastTitle: string;
  artworkUrl?: string;
  npub?: string;
  podcastGuid?: string;
}

const LEER: StreamingState = {
  sentSats: 0,
  sentZaps: 0,
  pendingSats: 0,
  totalListenedSeconds: 0,
  stopped: false,
};

function App() {
  const [route, setRoute] = useState<Route>('listen');
  const [session, setSession] = useState<Session | undefined>(undefined);
  const [balance, setBalance] = useState(0);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | undefined>(undefined);
  const [target, setTarget] = useState<PaymentTarget | undefined>(undefined);
  const [streaming, setStreaming] = useState<StreamingState>(LEER);
  const [rate, setRate] = useState(0);
  const [rateConfirmed, setRateConfirmed] = useState(false);
  const [position, setPosition] = useState(0);
  const [boosting, setBoosting] = useState(false);
  const [feedback, setFeedback] = useState<string | undefined>(undefined);
  const [storageMode, setStorageMode] = useState<StorageMode | undefined>(undefined);
  const [expanded, setExpanded] = useState(false);
  const [subscriptions, setSubscriptions] = useState<SubscriptionSummary[]>([]);
  const [episodesByFeed, setEpisodesByFeed] = useState<Record<string, EpisodeRecord[]>>({});
  const [positions, setPositions] = useState<Map<string, number>>(new Map());

  const identity = useIdentity(setSession);
  const mintGateway = useMemo(() => new CashuMintGateway(), []);
  const nostr = useMemo(() => new SimplePoolGateway(), []);
  const wallet = useMemo(() => new LocalWallet({ gateway: mintGateway }), [mintGateway]);
  const controller = useRef<StreamingController | undefined>(undefined);

  const refreshBalance = useCallback(async () => {
    const next = await wallet.balance();
    setBalance(next);
    // FR-20: nach erfolgreicher Aufladung laufen die Zahlungen weiter.
    if (next >= 10) controller.current?.resume();
    return next;
  }, [wallet]);

  useEffect(() => {
    void getStreamingRate().then(setRate);
    void isStreamingRateConfirmed().then(setRateConfirmed);
    void readStorageMode().then(setStorageMode);
    void refreshBalance();
    // FR-29: was beim letzten Mal kein Relay bestätigt hat, wird erneut publiziert.
    void retryPendingNutzaps({ nostr });
  }, [nostr, refreshBalance]);

  // FR-21 bis FR-23: Empfänger des laufenden Podcasts auflösen.
  useEffect(() => {
    if (!nowPlaying) {
      setTarget(undefined);
      return;
    }
    let cancelled = false;
    void resolvePaymentTarget(nowPlaying.npub, { gateway: nostr }).then((resolved) => {
      if (!cancelled) setTarget(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [nowPlaying, nostr]);

  const capability = paymentCapability({ session, balance, target });

  // FR-24, FR-25: der Streaming-Controller lebt so lange wie Episode und Ziel.
  useEffect(() => {
    if (!nowPlaying || !target || target.status !== 'resolved' || !rateConfirmed || rate <= 0) {
      controller.current = undefined;
      setStreaming(LEER);
      return;
    }
    controller.current = new StreamingController({
      rate,
      balance: () => wallet.balance(),
      onUpdate: setStreaming,
      send: async (amount) => {
        const result = await sendNutzap(
          {
            target,
            amount,
            kind: 'streaming',
            feedTitle: nowPlaying.podcastTitle,
            episodeTitle: nowPlaying.episode.title,
            context: {
              podcastTitle: nowPlaying.podcastTitle,
              episodeTitle: nowPlaying.episode.title,
              podcastGuid: nowPlaying.podcastGuid,
              episodeGuid: nowPlaying.episode.guid,
            },
          },
          { wallet, mintGateway, nostr },
        );
        void refreshBalance();
        return result.status;
      },
    });
  }, [nowPlaying, target, rate, rateConfirmed, wallet, mintGateway, nostr, refreshBalance]);

  /** OQ-02: derselbe Kontext fuer Streaming und Boost. */
  function nutzapContext(positionSeconds: number) {
    return {
      podcastTitle: nowPlaying?.podcastTitle,
      episodeTitle: nowPlaying?.episode.title,
      podcastGuid: nowPlaying?.podcastGuid,
      episodeGuid: nowPlaying?.episode.guid,
      positionSeconds,
    };
  }

  /** Abos, Episoden und Hoerpositionen fuer die Bibliothek (2a). */
  const reloadLibrary = useCallback(async () => {
    const liste = await listSubscriptions();
    const listen = await Promise.all(liste.map((abo) => listEpisodes(abo.id)));

    const byFeed: Record<string, EpisodeRecord[]> = {};
    liste.forEach((abo, index) => {
      byFeed[abo.id] = listen[index];
    });

    const alle = listen.flat();
    const gespeichert = await Promise.all(alle.map((episode) => loadPosition(episode.id)));
    const map = new Map<string, number>();
    alle.forEach((episode, index) => {
      const wert = gespeichert[index];
      if (wert !== undefined) map.set(episode.id, wert);
    });

    setSubscriptions(liste);
    setEpisodesByFeed(byFeed);
    setPositions(map);
  }, []);

  useEffect(() => {
    void reloadLibrary();
  }, [reloadLibrary]);

  const handleTick = useCallback((tick: ListeningTick) => {
    setPosition(tick.positionSeconds);
    void controller.current?.handleTick(tick);
  }, []);

  async function handleConfirmRate(next: number) {
    // FR-04: Probe-Signatur, damit die Freigabe dauerhaft erteilt werden kann.
    await runSigningProbe().catch(() => undefined);
    await confirmStreamingRate(next);
    setRate(next);
    setRateConfirmed(true);
  }

  async function handleBoost(amount: number, content: string) {
    if (!target || target.status !== 'resolved') throw new Error('Kein Empfänger aufgelöst.');
    setFeedback(undefined);
    try {
      await sendNutzap(
        {
          target,
          amount,
          kind: 'boost',
          content,
          feedTitle: nowPlaying?.podcastTitle,
          episodeTitle: nowPlaying?.episode.title,
          context: nutzapContext(position),
        },
        { wallet, mintGateway, nostr },
      );
      setBoosting(false);
      setFeedback(`Boost über ${amount} Sat gesendet.`);
      await refreshBalance();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Der Boost ist fehlgeschlagen.');
    }
  }

  // NR-06: ohne Bestätigung des Satzes wird nichts gesendet. Gefragt wird erst,
  // wenn Zahlungen überhaupt möglich sind — sonst wäre die Frage sinnlos.
  const askForRate = capability.canStream && !rateConfirmed;
  const streamingNote = !session
    ? 'nur hören'
    : capability.canStream
      ? `streamt ${rate} Sat/min`
      : 'streamt nicht';

  // Der Entwurf zeigt in 2a keine Eingabe fuer neue Feeds. Ohne sie liesse sich
  // nichts abonnieren (FR-07), deshalb steht sie unter der Ueberschrift.
  const addFeed = (
    <FeedView
      compact
      playingEpisodeId={nowPlaying?.episode.id}
      onChanged={() => void reloadLibrary()}
    />
  );

  const library = useLibrary({
    subscriptions,
    addFeed,
    episodes: episodesByFeed,
    positions,
    playingEpisodeId: nowPlaying?.episode.id,
    onPlay: (episode, subscription, expand) => {
      setNowPlaying({
        episode,
        podcastTitle: subscription.title,
        artworkUrl: subscription.imageUrl,
        npub: subscription.npub,
        podcastGuid: subscription.podcastGuid,
      });
      setExpanded(expand);
    },
    onRefresh: async (id) => {
      await refreshSubscription(id);
      await reloadLibrary();
    },
    onUnsubscribe: async (id) => {
      await unsubscribe(id);
      await reloadLibrary();
    },
  });

  const walletHead = (
    <div class="top-row">
      <span class="wordmark" style={{ fontSize: '24px' }}>
        Cashu Player
      </span>
      <span class="spacer" />
      <RouteLinks route={route} onRoute={setRoute} />
      <span class="spacer" />
      <IdentityControl identity={identity} />
    </div>
  );

  const kopf =
    route === 'listen' && expanded ? (
      <div class="top-row">
        <button
          type="button"
          class="btn btn-ghost btn-icon"
          aria-label="Vollbild schließen"
          onClick={() => setExpanded(false)}
        >
          <Icon name="caret-down" size={20} />
        </button>
        <span class="kicker">Läuft gerade</span>
        <span class="spacer" />
        <RouteLinks route={route} onRoute={setRoute} />
      </div>
    ) : route === 'listen' ? (
      <>
        {library.head}
        <div class="top-row" style={{ marginTop: '8px' }}>
          <RouteLinks route={route} onRoute={setRoute} />
          <span class="spacer" />
          <IdentityControl identity={identity} />
        </div>
      </>
    ) : (
      walletHead
    );

  const datumsleiste =
    route === 'listen' && expanded ? (
      <>
        <span>{nowPlaying?.podcastTitle}</span>
        <span>{nowPlaying?.episode.title}</span>
        <span>{streamingNote}</span>
      </>
    ) : route === 'listen' ? (
      library.dateline
    ) : route === 'wallet' ? (
      <>
        <span>{`${publicMints().length} Mints`}</span>
        <span>Nur auf diesem Gerät gespeichert</span>
        <span>npub dient der Identität, nicht der Verwahrung</span>
      </>
    ) : undefined;

  return (
    <div class="nav-page">
      <Frame head={kopf} dateline={datumsleiste}>
        {hasPlaceholders() && (
          <p class="config-warning">
            Konfiguration unvollständig: In src/config/build-config.ts stehen noch Platzhalter.
          </p>
        )}
        <IdentityNotices identity={identity} />

        {route === 'listen' && !expanded && library.body}
        {route === 'wallet' && <WalletView wallet={wallet} onBalanceChange={setBalance} />}
        {route === 'settings' && (
          <>
            <SettingsView
              rate={rate}
              rateConfirmed={rateConfirmed}
              storageMode={storageMode}
              onConfirmRate={handleConfirmRate}
            />
            <div class="install-row">
              <InstallButton />
            </div>
          </>
        )}
        {feedback && <p class="notice">{feedback}</p>}
      </Frame>

      {/* Der Streifen bleibt montiert: das Audio-Element haengt daran und darf
          beim Umschalten auf Vollbild nicht neu starten. */}
      {route === 'listen' && nowPlaying && (
        <Player
          episode={nowPlaying.episode}
          podcastTitle={nowPlaying.podcastTitle}
          artworkUrl={nowPlaying.artworkUrl}
          expanded={expanded}
          onToggleExpand={() => setExpanded((v) => !v)}
          streamingNote={capability.canStream ? streamingNote : undefined}
          sentSats={streaming.sentSats}
          canBoost={capability.canBoost}
          onBoost={() => setBoosting(true)}
          onTick={handleTick}
          onPositionChange={setPosition}
        />
      )}

      {askForRate && (
        <div class="dialog-backdrop">
          <div class="dialog" role="dialog" aria-label="Streaming-Satz bestätigen">
            <p class="dialog-title">Streaming-Satz bestätigen</p>
            <p>
              Beim Hören wird laufend gezahlt. Bitte den Satz bestätigen — er gilt für alle
              Podcasts. Die Freigabe in der nostr-Extension muss <strong>dauerhaft</strong> erteilt
              werden.
            </p>
            <SettingsRatePrompt rate={rate} onConfirm={handleConfirmRate} />
          </div>
        </div>
      )}

      {boosting && (
        <NutzapDialog
          balance={balance}
          positionSeconds={position}
          podcastTitle={nowPlaying?.podcastTitle}
          episodeTitle={nowPlaying?.episode.title}
          onSend={handleBoost}
          onCancel={() => setBoosting(false)}
        />
      )}
    </div>
  );
}


/** Der Satz-Dialog aus US-05-AC-6, mit eigenem Entwurfswert. */
function SettingsRatePrompt({
  rate,
  onConfirm,
}: {
  rate: number;
  onConfirm: (rate: number) => Promise<void>;
}) {
  const [draft, setDraft] = useState(rate);
  return (
    <>
      <div class="field">
        <label for="rate">Sat pro Minute</label>
        <input
          id="rate"
          class="input"
          name="rate"
          type="number"
          value={draft}
          onInput={(event) => setDraft(Number((event.target as HTMLInputElement).value))}
        />
      </div>
      <div class="dialog-actions">
        <button type="button" class="btn btn-primary" onClick={() => void onConfirm(draft)}>
          Satz bestätigen
        </button>
      </div>
    </>
  );
}

const root = document.getElementById('app');
if (root) render(<App />, root);

// Im Dev-Server gibt es kein gebautes /sw.js; die Registrierung liefe ins Leere.
if (import.meta.env.PROD) void registerServiceWorker();
