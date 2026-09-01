import { WALLET_UNIT } from '../config/build-config.js';

/**
 * Auswertung der Mint-Prüfung für A-02 (Browser-Erreichbarkeit, CORS) und
 * A-05 (NUT-11, NUT-12, keine Fees).
 */

export interface MintInfoLike {
  name?: string;
  version?: string;
  nuts?: Record<string, { supported?: boolean } | undefined>;
}

export interface KeysetLike {
  id: string;
  unit: string;
  active: boolean;
  input_fee_ppk?: number;
}

export interface MintSummary {
  name: string;
  version: string;
  /** NUT-11 (P2PK) — ohne ihn wäre der Nutzap-Token für jeden ausgebbar. */
  nut11: boolean;
  /** NUT-12 (DLEQ) — von NIP-61 ausdrücklich empfohlen. */
  nut12: boolean;
  /** Höchste Input-Fee der aktiven sat-Keysets in ppk. */
  maxInputFeePpk: number;
  feeFree: boolean;
}

function supports(info: MintInfoLike, nut: string): boolean {
  return info.nuts?.[nut]?.supported === true;
}

export function summarizeMint(info: MintInfoLike, keysets: KeysetLike[]): MintSummary {
  const activeSatFees = keysets
    .filter((keyset) => keyset.active && keyset.unit === WALLET_UNIT)
    .map((keyset) => keyset.input_fee_ppk ?? 0);
  const maxInputFeePpk = activeSatFees.length > 0 ? Math.max(...activeSatFees) : 0;
  return {
    name: info.name ?? 'unbekannt',
    version: info.version ?? 'unbekannt',
    nut11: supports(info, '11'),
    nut12: supports(info, '12'),
    maxInputFeePpk,
    feeFree: maxInputFeePpk === 0,
  };
}
