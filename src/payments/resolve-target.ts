/**
 * Leere Implementierung der Empfängerauflösung (Kapitel 5.7, FR-21 bis FR-23).
 * Wird in Paket E testgetrieben gefüllt.
 */
import type { PaymentTarget } from '../contracts/index.js';

export function resolvePaymentTarget(_npub: string | undefined): Promise<PaymentTarget> {
  throw new Error('Nicht implementiert: Paket E');
}
