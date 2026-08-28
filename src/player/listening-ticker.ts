/**
 * Leere Implementierung der ListeningTick-Quelle (Kapitel 5.7, FR-24).
 * Wird in Paket B testgetrieben gefüllt.
 */
import type { ListeningTickHandler, ListeningTickSource } from '../contracts/index.js';

export class ListeningTicker implements ListeningTickSource {
  onTick(_handler: ListeningTickHandler): () => void {
    throw new Error('Nicht implementiert: Paket B');
  }
}
