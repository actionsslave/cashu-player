/**
 * Wann sind Streaming und Boost erlaubt und warum nicht?
 * Deckt FR-05 (Login) und FR-20 (Guthaben-Untergrenze) ab.
 * Paket E ergänzt die Empfängerauflösung (FR-23).
 */
import { MIN_BALANCE_SATS } from '../config/build-config.js';
import type { Session } from '../identity/session.js';

export interface CapabilityInput {
  session: Session | undefined;
  /** Verfügbares Guthaben in Sat. */
  balance: number;
}

export interface PaymentCapability {
  /** FR-05: Abonnieren ist nie gesperrt. */
  canSubscribe: boolean;
  /** FR-05: Wiedergabe ist nie gesperrt. */
  canPlay: boolean;
  canStream: boolean;
  canBoost: boolean;
  /** Anzeigetext neben den deaktivierten Bedienelementen. */
  reason?: string;
}

const ALWAYS = { canSubscribe: true, canPlay: true } as const;

export function paymentCapability({ session, balance }: CapabilityInput): PaymentCapability {
  if (!session) {
    return { ...ALWAYS, canStream: false, canBoost: false, reason: 'Login erforderlich' };
  }

  // FR-20: unter der Untergrenze werden laufende Streaming-Zahlungen gestoppt.
  if (balance < MIN_BALANCE_SATS) {
    return {
      ...ALWAYS,
      canStream: false,
      canBoost: balance > 0,
      reason: 'Guthaben zu niedrig — in der Wallet aufladen',
    };
  }

  return { ...ALWAYS, canStream: true, canBoost: true };
}
