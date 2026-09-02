/**
 * Anmeldung (FR-01, FR-02, FR-05, FR-06).
 *
 * Der Entwurf setzt die Identität in die Navigationszeile und hat für den
 * Extension-Hinweis aus FR-01 keinen Platz. Deshalb liegt der Zustand in einem
 * Hook: die Navigation zeigt das Bedienelement, die Seite darunter die Hinweise.
 */
import { useCallback, useEffect, useState } from 'preact/hooks';
import { SUGGESTED_EXTENSIONS } from '../config/build-config.js';
import { detectSigner, SignerError } from '../identity/nip07.js';
import { login, logout, restoreSession, shortNpub, type Session } from '../identity/session.js';

export interface Identity {
  session: Session | undefined;
  notice: string | undefined;
  showExtensions: boolean;
  confirmingLogout: boolean;
  signIn: () => Promise<void>;
  askLogout: () => void;
  cancelLogout: () => void;
  confirmLogout: () => Promise<void>;
}

export function useIdentity(onSessionChange?: (session: Session | undefined) => void): Identity {
  const [session, setSession] = useState<Session | undefined>(undefined);
  const [notice, setNotice] = useState<string | undefined>(undefined);
  // FR-01: fehlt window.nostr beim Start, nennt die App zwei Extensions.
  const [showExtensions, setShowExtensions] = useState(!detectSigner().available);
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  useEffect(() => {
    void restoreSession().then((restored) => {
      setSession(restored);
      onSessionChange?.(restored);
    });
  }, [onSessionChange]);

  const signIn = useCallback(async () => {
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
  }, [onSessionChange]);

  const confirmLogout = useCallback(async () => {
    await logout();
    setSession(undefined);
    setConfirmingLogout(false);
    onSessionChange?.(undefined);
  }, [onSessionChange]);

  return {
    session,
    notice,
    showExtensions,
    confirmingLogout,
    signIn,
    askLogout: () => setConfirmingLogout(true),
    cancelLogout: () => setConfirmingLogout(false),
    confirmLogout,
  };
}

/** Das Bedienelement in der Navigationszeile (Entwurf 1a bzw. 3c). */
export function IdentityControl({ identity }: { identity: Identity }) {
  if (!identity.session) {
    // 3c: statt Guthaben und npub steht hier die Aufforderung.
    return (
      <button type="button" class="btn btn-secondary" onClick={() => void identity.signIn()}>
        Mit nostr anmelden
      </button>
    );
  }
  return (
    <>
      <span class="nav-npub" title="Angemeldet">
        {shortNpub(identity.session.npub)}
      </span>
      <button type="button" class="btn btn-ghost" onClick={identity.askLogout}>
        Abmelden
      </button>
    </>
  );
}

/** Hinweise und der Abmelde-Dialog, unterhalb der Navigationszeile. */
export function IdentityNotices({ identity }: { identity: Identity }) {
  return (
    <>
      {identity.notice && <p class="notice">{identity.notice}</p>}

      {identity.showExtensions && (
        <p class="notice">
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

      {identity.confirmingLogout && (
        <div class="dialog-backdrop">
          <div class="dialog" role="dialog" aria-label="Abmelden bestätigen">
            <p class="dialog-title">Abmelden?</p>
            <p>Deine Wallet bleibt erhalten, nur die nostr-Identität wird entfernt.</p>
            <div class="dialog-actions">
              <button type="button" class="btn btn-secondary" onClick={identity.cancelLogout}>
                Abbrechen
              </button>
              <button
                type="button"
                class="btn btn-primary"
                onClick={() => void identity.confirmLogout()}
              >
                Ja, abmelden
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
