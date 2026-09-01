/**
 * Netzwerkschicht zum Mint. Alles, was die Wallet über HTTPS beim Mint tut,
 * läuft über dieses Interface — die Wallet-Logik selbst bleibt dadurch ohne Netz
 * prüfbar, und NR-02 hat genau eine Stelle, an der sie durchgesetzt wird.
 */
import type { StoredProof } from '../contracts/index.js';

export interface MintGateway {
  /** NUT-07: Ist der Token beim Mint schon eingelöst? */
  isTokenSpent(mintUrl: string, token: string): Promise<boolean>;
  /** NUT-03: Token einlösen, frische Proofs für diese Wallet erhalten. */
  receive(mintUrl: string, token: string): Promise<StoredProof[]>;
  /**
   * NUT-03 und NUT-11: `amount` abspalten, Rest als Wechselgeld zurück.
   * Mit `p2pkPubkey` werden die abgespaltenen Proofs auf diesen Schlüssel gelockt.
   */
  send(
    mintUrl: string,
    amount: number,
    proofs: StoredProof[],
    p2pkPubkey?: string,
  ): Promise<{ send: StoredProof[]; keep: StoredProof[] }>;
}

export class MintUnreachableError extends Error {
  readonly name = 'MintUnreachableError';
  constructor(
    readonly mintUrl: string,
    options?: { cause?: unknown },
  ) {
    super(`Keine Verbindung zum Mint ${mintUrl}.`, options);
  }
}

export type TokenImportFailure =
  | 'ungueltig'
  | 'mint-nicht-erlaubt'
  | 'einheit-nicht-unterstuetzt'
  | 'bereits-eingeloest'
  | 'mint-nicht-erreichbar';

export class TokenImportError extends Error {
  readonly name = 'TokenImportError';
  constructor(
    readonly reason: TokenImportFailure,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
  }
}
