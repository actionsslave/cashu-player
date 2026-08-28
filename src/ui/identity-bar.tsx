/**
 * Kopfzeile mit Anmeldung (FR-01, FR-02, FR-05, FR-06).
 */
import { useEffect, useState } from 'preact/hooks';
import { SUGGESTED_EXTENSIONS } from '../config/build-config.js';
import { detectSigner, SignerError } from '../identity/nip07.js';
import { login, logout, restoreSession, shortNpub, type Session } from '../identity/session.js';

export interface IdentityBarProps {
  onSessionChange?: (session: Session | undefined) => void;
}

export function IdentityBar({ onSessionChange }: IdentityBarProps) {
  const [session, setSession] = useState<Session | undefined>(undefined);
  const [notice, setNotice] = useState<string | undefined>(undefined);
  // FR-01: fehlt window.ostr beim Start, nennt die App zwei Extensions.
  const [showExtensions, setShowExtensions] = useState(!detectSigner().available);
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  useEffect(() => {
    void restoreSession().then((restored) => {
      setSession(restored);
      onSessionChange?.(restored);
    });
  }, [onSessionChange]);

  async function handleLogin() {
    setNotice(undefined);
    try {
      const next = await login();
      setSession(next);
      setShowExtensions(false);
      onSessionChange?.(next);
    } catch (error) {
      const reason = error instanceof SignerError ? error.reason : undefined;
      if (reason === 'keine-extension') {
        setShowExtensions(true);
        setNotice('Keine nostr-Extension gefunden.');
      } else if (reason === 'timeout') {
        setNotice('Anmeldung abgebrochen: Die Extension hat nicht geantwortet.');
      } else {
        setNotice('Anmeldung abgebrochen');
      }
    }
  }

  async function handleLogout() {
    await logout();
    setSession(undefined);
    setConfirmingLogout(false);
    onSessionChange?.(undefined);
  }

  return (
    <header class="identity-bar">
      {session ? (
        <>
          <span class="npub" title="Angemeldet">
            {shortNpub(session.npub)}
          </span>
          <button type="button" onClick={() => setConfirmingLogout(true)}>
            Abmelden
          </button>
        </>
      ) : (
        <button type="button" onClick={() => void handleLogin()}>
          Mit nostr anmelden
        </button>
      )}

      {notice && <p class="notice">{notice}</p>}

      {showExtensions && (
        <p class="extensions">
          Für die Anmeldung wird eine NIP-07-Extension gebraucht, zum Beispiel{' '}
          {SUGGESTED_EXTENSIONS.map((extension, index) => (
            <>
              {index > 0 && ' oder '}
              <a href={extension.url} target="_blank" rel="noreferrer">
                {extension.name}
              </a>
            </>
          ))}
          . Abonnieren und Wiedergabe funktionieren auch ohne Anmeldung.
        </p>
      )}

      {confirmingLogout && (
        <div class="dialog" role="dialog" aria-label="Abmelden bestätigen">
          <p>Abmelden? Deine Wallet bleibt erhalten, nur die nostr-Identität wird entfernt.</p>
          <button type="button" onClick={() => void handleLogout()}>
            Ja, abmelden
          </button>
          <button type="button" onClick={() => setConfirmingLogout(false)}>
            Abbrechen
          </button>
        </div>
      )}
    </header>
  );
}
