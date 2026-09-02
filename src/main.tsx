import { render } from 'preact';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Chrome, type Route } from './ui/chrome.js';
import { IdentityControl, IdentityNotices, useIdentity } from './ui/identity-bar.js';
import { InstallButton } from './ui/install-button.js';
import { FeedView } from './ui/feed-view.js';
import { Player } from './ui/player.js';
import { SessionColumn, isLowBalance } from './ui/session-column.js';
import { WalletPanel } from './ui/wallet-panel.js';
import { SettingsView } from './ui/settings-view.js';
import { BoostDialog } from './ui/boost-dialog.js';
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
import { hasPlaceholders } from './config/build-config.js';
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
          },
          { wallet, mintGateway, nostr },
        );
        void refreshBalance();
        return result.status;
      },
    });
  }, [nowPlaying, target, rate, rateConfirmed, wallet, mintGateway, nostr, refreshBalance]);

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
  const low = isLowBalance(balance, rate);
  const streamingNote = !session
    ? 'nur hören'
    : capability.canStream
      ? `streamt ${rate} Sat/min`
      : 'streamt nicht';

  return (
    <>
      <Chrome
        route={route}
        onRoute={setRoute}
        balance={route === 'wallet' ? undefined : balance}
        lowBalance={low}
      >
        <IdentityControl identity={identity} />
      </Chrome>

      {hasPlaceholders() && (
        <p class="config-warning">
          Konfiguration unvollständig: In src/config/build-config.ts stehen noch Platzhalter für
          Mints, Relays oder Feed-Proxy.
        </p>
      )}
      <IdentityNotices identity={identity} />

      {route === 'listen' && (
        <>
          {nowPlaying && (
            <div class="now-playing">
              {nowPlaying.artworkUrl ? (
                <img
                  class="cover halftone"
                  src={nowPlaying.artworkUrl}
                  alt=""
                  width={196}
                  height={196}
                />
              ) : (
                <span class="cover art-placeholder">Cover</span>
              )}
              <Player
                episode={nowPlaying.episode}
                podcastTitle={nowPlaying.podcastTitle}
                artworkUrl={nowPlaying.artworkUrl}
                streamingNote={streamingNote}
                canBoost={capability.canBoost}
                onBoost={() => setBoosting(true)}
                onTick={handleTick}
                onPositionChange={setPosition}
              />
              <SessionColumn
                loggedIn={Boolean(session)}
                balance={balance}
                streaming={streaming}
                blockedReason={
                  target && target.status !== 'resolved' ? target.message : undefined
                }
                ratePerMinute={rate}
                positionSeconds={position}
                onSignIn={() => void identity.signIn()}
                onGoToWallet={() => setRoute('wallet')}
              />
            </div>
          )}
          {feedback && <p class="notice">{feedback}</p>}
          <FeedView
            playingEpisodeId={nowPlaying?.episode.id}
            onEpisodeSelected={(episode, subscription) =>
              setNowPlaying({
                episode,
                podcastTitle: subscription.title,
                artworkUrl: subscription.imageUrl,
                npub: subscription.npub,
              })
            }
          />
        </>
      )}

      {route === 'wallet' && <WalletPanel wallet={wallet} onBalanceChange={setBalance} />}

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

      {askForRate && (
        <div class="dialog-backdrop">
          <div class="dialog" role="dialog" aria-label="Streaming-Satz bestätigen">
            <p class="dialog-title">Streaming-Satz bestätigen</p>
            <p>
              Beim Hören wird laufend gezahlt. Bitte den Satz bestätigen — er gilt für alle
              Podcasts. Die Freigabe in der nostr-Extension muss <strong>dauerhaft</strong>{' '}
              erteilt werden.
            </p>
            <SettingsRatePrompt rate={rate} onConfirm={handleConfirmRate} />
          </div>
        </div>
      )}

      {boosting && (
        <BoostDialog
          balance={balance}
          positionSeconds={position}
          podcastTitle={nowPlaying?.podcastTitle}
          episodeTitle={nowPlaying?.episode.title}
          onSend={handleBoost}
          onCancel={() => setBoosting(false)}
        />
      )}
    </>
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
