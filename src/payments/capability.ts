/**
 * Wann sind Streaming und Boost erlaubt und warum nicht?
 * Aktueller Stand: nur die Login-Bedingung aus FR-05.
 * Paket E ergänzt hier die Empfängerauflösung (FR-23) und das Guthaben (FR-20).
 */
import type { Session } from '../identity/session.js';

export interface CapabilityInput {
  session: Session | undefined;
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

export function paymentCapability({ session }: CapabilityInput): PaymentCapability {
  if (!session) {
    return {
      canSubscribe: true,
      canPlay: true,
      canStream: false,
      canBoost: false,
      reason: 'Login erforderlich',
    };
  }
  return { canSubscribe: true, canPlay: true, canStream: true, canBoost: true };
}
