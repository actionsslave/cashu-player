import { render } from 'preact';
import { useState } from 'preact/hooks';
import { IdentityBar } from './ui/identity-bar.js';
import { paymentCapability } from './payments/capability.js';
import type { Session } from './identity/session.js';
import './ui/app.css';

function App() {
  const [session, setSession] = useState<Session | undefined>(undefined);
  const capability = paymentCapability({ session });

  return (
    <div class="app">
      <IdentityBar onSessionChange={setSession} />
      <main>
        <h1>Cashu-Podcast-Player</h1>
        {/* FR-05: Streaming und Boost sind ohne Anmeldung sichtbar deaktiviert. */}
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
