import { render } from 'preact';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { IdentityBar } from './ui/identity-bar.js';
import { InstallButton } from './ui/install-button.js';
import { FeedView } from './ui/feed-view.js';
import { Player } from './ui/player.js';
import { WalletPanel } from './ui/wallet-panel.js';
import { PaymentsPanel } from './ui/payments-panel.js';
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
  pendingSats: 0,
  totalListenedSeconds: 0,
  stopped: false,
};

function App() {
  const [session, setSession] = useState<Session | undefined>(undefined);
  const [balance, setBalance] = useState(0);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | undefined>(undefined);
  const [target, setTarget] = useState<PaymentTarget | undefined>(undefined);
  const [streaming, setStreaming] = useState<StreamingState>(LEER);
  const [rate, setRate] = useState(0);
  const [rateConfirmed, setRateConfirmed] = useState(false);
  const [position, setPosition] = useState(0);

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
    await refreshBalance();
  }

  return (
    <div class="app">
      <IdentityBar onSessionChange={setSession} />
      <InstallButton />
      <main>
        <h1>Cashu-Podcast-Player</h1>
        {hasPlaceholders() && (
          <p class="warning">
            Konfiguration unvollständig: In src/config/build-config.ts stehen noch Platzhalter für
            Mints, Relays, Feed-Proxy oder Demo-npub.
          </p>
        )}
        <FeedView
          onEpisodeSelected={(episode, subscription) =>
            setNowPlaying({
              episode,
              podcastTitle: subscription.title,
              artworkUrl: subscription.imageUrl,
              npub: subscription.npub,
            })
          }
        />
        <WalletPanel wallet={wallet} onBalanceChange={setBalance} />
        <PaymentsPanel
          capability={capability}
          streaming={streaming}
          rate={rate}
          rateConfirmed={rateConfirmed}
          balance={balance}
          positionSeconds={position}
          onConfirmRate={handleConfirmRate}
          onBoost={handleBoost}
        />
        <Player
          episode={nowPlaying?.episode}
          podcastTitle={nowPlaying?.podcastTitle}
          artworkUrl={nowPlaying?.artworkUrl}
          onTick={handleTick}
        />
      </main>
    </div>
  );
}

const root = document.getElementById('app');
if (root) render(<App />, root);

// Im Dev-Server gibt es kein gebautes /sw.js; die Registrierung liefe ins Leere.
if (import.meta.env.PROD) void registerServiceWorker();
