import { render } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import { IdentityBar } from './ui/identity-bar.js';
import { WalletPanel } from './ui/wallet-panel.js';
import { FeedView } from './ui/feed-view.js';
import { paymentCapability } from './payments/capability.js';
import { LocalWallet } from './wallet/local-wallet.js';
import { CashuMintGateway } from './wallet/cashu-mint-gateway.js';
import { hasPlaceholders } from './config/build-config.js';
import type { Session } from './identity/session.js';
import './ui/app.css';

function App() {
  const [session, setSession] = useState<Session | undefined>(undefined);
  const [balance, setBalance] = useState(0);
  const wallet = useMemo(() => new LocalWallet({ gateway: new CashuMintGateway() }), []);
  const capability = paymentCapability({ session, balance });

  return (
    <div class="app">
      <IdentityBar onSessionChange={setSession} />
      <main>
        <h1>Cashu-Podcast-Player</h1>
        {hasPlaceholders() && (
          <p class="warning">
            Konfiguration unvollständig: In src/config/build-config.ts stehen noch Platzhalter für
            Mints, Relays, Feed-Proxy oder Demo-npub.
          </p>
        )}
        <FeedView />
        <WalletPanel wallet={wallet} onBalanceChange={setBalance} />
        {/* FR-05, FR-20: Streaming und Boost sind sichtbar deaktiviert, solange ihre
            Bedingungen nicht erfüllt sind. Paket E hängt hier den Player an. */}
        <section>
          <button type="button" disabled={!capability.canStream}>
            Streaming
          </button>{' '}
          <button type="button" disabled={!capability.canBoost}>
            Boost
          </button>
          {capability.reason && <p class="locked">{capability.reason}</p>}
        </section>
      </main>
    </div>
  );
}

const root = document.getElementById('app');
if (root) render(<App />, root);
