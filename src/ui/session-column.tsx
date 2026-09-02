/**
 * Die Spalte rechts neben dem Player — im Entwurf die einzige senkrechte Linie.
 *
 * Sie trägt vier Zustände: der laufende Sitzungszähler (1a) und die drei
 * Gründe, aus denen nicht gezahlt wird — kein Empfänger (3a), Guthaben fast
 * leer (3b), nicht angemeldet (3c).
 */
import { MIN_BALANCE_SATS } from '../config/build-config.js';
import { formatTimecode } from '../payments/nutzap.js';
import type { StreamingState } from '../payments/streaming.js';

export interface SessionColumnProps {
  loggedIn: boolean;
  balance: number;
  streaming: StreamingState;
  /** Grund, warum Zahlungen gesperrt sind; undefined heißt: sie laufen. */
  blockedReason?: string;
  ratePerMinute: number;
  positionSeconds: number;
  onSignIn: () => void;
  onGoToWallet: () => void;
}

/**
 * 3b: Wann versiegt das Guthaben? Restminuten aus Guthaben ÷ Satz, auf die
 * aktuelle Hörposition addiert. Bei Satz 0 gibt es keinen Zeitpunkt.
 */
export function streamingStopsAt(
  positionSeconds: number,
  balance: number,
  ratePerMinute: number,
): string | undefined {
  if (ratePerMinute <= 0) return undefined;
  return formatTimecode(positionSeconds + (balance / ratePerMinute) * 60);
}

/** Schwelle für 3b: weniger als rund zwei Minuten Streaming übrig. */
export function isLowBalance(balance: number, ratePerMinute: number): boolean {
  if (ratePerMinute <= 0) return false;
  return balance < Math.max(MIN_BALANCE_SATS, ratePerMinute * 2);
}

export function SessionColumn({
  loggedIn,
  balance,
  streaming,
  blockedReason,
  ratePerMinute,
  positionSeconds,
  onSignIn,
  onGoToWallet,
}: SessionColumnProps) {
  // 3c — nicht angemeldet. Neutral, nicht magenta: hier ist nichts kaputt.
  if (!loggedIn) {
    return (
      <aside class="session">
        <span class="kicker kicker-neutral">Nicht angemeldet</span>
        <p class="statement">Melde dich mit nostr an, um Podcasts zu bezahlen.</p>
        <p class="explain text-muted">
          Der Schlüssel signiert jeden Nutzap. Abos bleiben so oder so auf diesem Gerät.
        </p>
        <button type="button" class="btn btn-primary btn-block" onClick={onSignIn}>
          Anmelden
        </button>
      </aside>
    );
  }

  // 3a — der Feed nennt keinen Empfänger. Wiedergabe hängt nie an der Zahlung.
  if (blockedReason) {
    return (
      <aside class="session">
        <span class="kicker kicker-magenta">Kein Empfänger</span>
        <p class="statement">{blockedReason}</p>
        <p class="explain text-muted">
          Die Wiedergabe läuft. Es wird nichts gestreamt und Boosts sind aus, bis der Podcast
          eine nostr-Identität veröffentlicht.
        </p>
      </aside>
    );
  }

  // 3b — Guthaben reicht nur noch für kurze Zeit.
  if (isLowBalance(balance, ratePerMinute)) {
    const stopsAt = streamingStopsAt(positionSeconds, balance, ratePerMinute);
    return (
      <aside class="session">
        <span class="kicker kicker-magenta">Geht zur Neige</span>
        <p class="counter magenta">
          {balance} <span class="unit">Sat</span>
        </p>
        <p class="explain text-muted">
          {stopsAt ? `Streaming endet bei ${stopsAt}. ` : ''}Die Wiedergabe läuft weiter.
        </p>
        <button type="button" class="btn btn-primary btn-block" onClick={onGoToWallet}>
          Aufladen
        </button>
        <p class="footnote text-muted">Boosts über {balance} Sat sind nicht möglich.</p>
      </aside>
    );
  }

  // 1a — der Normalfall.
  const pending = Math.floor(streaming.pendingSats);
  return (
    <aside class="session">
      <span class="kicker kicker-neutral">Diese Sitzung</span>
      <p class="counter">
        {streaming.sentSats} <span class="unit">Sat</span>
      </p>
      <p class="zaps text-muted">
        {streaming.sentZaps === 1 ? 'in 1 Nutzap gesendet' : `in ${streaming.sentZaps} Nutzaps gesendet`}
      </p>
      {pending > 0 && <p class="pending">{pending} Sat ausstehend</p>}
      {streaming.reason && <p class="pending">{streaming.reason}</p>}
      <p class="footnote text-muted">Unter 1 Sat wandert in die nächste Minute.</p>
    </aside>
  );
}
