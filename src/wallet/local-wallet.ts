/**
 * Leere Implementierung des WalletService-Vertrags (Kapitel 5.7).
 * Wird in Paket C testgetrieben gefüllt.
 */
import type { ProofBundle, WalletService } from '../contracts/index.js';

export class LocalWallet implements WalletService {
  balance(): Promise<number> {
    throw new Error('Nicht implementiert: Paket C');
  }

  reserve(_amount: number, _mintUrl?: string): Promise<ProofBundle> {
    throw new Error('Nicht implementiert: Paket C');
  }

  commit(_bundle: ProofBundle): Promise<void> {
    throw new Error('Nicht implementiert: Paket C');
  }

  release(_bundle: ProofBundle): Promise<void> {
    throw new Error('Nicht implementiert: Paket C');
  }

  exportAll(): Promise<string> {
    throw new Error('Nicht implementiert: Paket C');
  }
}
