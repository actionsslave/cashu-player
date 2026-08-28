/**
 * Lokale Cashu-Wallet (FR-15) mit der Reserve-Semantik aus FR-29.
 *
 * Die Proofs liegen in IndexedDB; cashu-ts ist bewusst zustandslos und kennt
 * diesen Bestand nicht. Reservierte Proofs zählen nicht zum verfügbaren
 * Guthaben, sind aber noch vorhanden, bis commit oder release entscheidet.
 */
import {
  getEncodedToken,
  getTokenMetadata,
  normalizeMintUrl,
  normalizeProofAmounts,
} from '@cashu/cashu-ts';
import { ALLOWED_MINTS } from '../config/build-config.js';
import { openDatabase, type ProofRecord } from '../db/database.js';
import {
  MintUnreachableError,
  TokenImportError,
  type MintGateway,
} from './mint-gateway.js';
import { ensurePersistentStorage } from './persistence.js';
import {
  InsufficientFundsError,
  type ProofBundle,
  type StoredProof,
  type WalletService,
} from '../contracts/index.js';

function sum(records: { amount: number }[]): number {
  return records.reduce((total, record) => total + record.amount, 0);
}

/**
 * Wählt Proofs, die den Betrag decken und dabei möglichst wenig überschießen:
 * jeweils den größten Proof nehmen, der noch in den Restbetrag passt, und erst
 * am Ende den kleinsten, der den Rest abdeckt. Bei Zweierpotenzen — der üblichen
 * Stückelung eines Mints — trifft das den Betrag exakt und spart Wechselgeld.
 */
function selectProofs(candidates: ProofRecord[], amount: number): ProofRecord[] | undefined {
  const pool = [...candidates].sort((a, b) => a.amount - b.amount);
  const chosen: ProofRecord[] = [];
  let remaining = amount;

  while (remaining > 0 && pool.length > 0) {
    let index = -1;
    for (let i = pool.length - 1; i >= 0; i--) {
      if (pool[i].amount <= remaining) {
        index = i;
        break;
      }
    }
    // Kein Proof passt mehr in den Rest: der kleinste, der ihn deckt, schließt ab.
    if (index === -1) index = 0;
    const [picked] = pool.splice(index, 1);
    chosen.push(picked);
    remaining -= picked.amount;
  }

  return remaining <= 0 ? chosen : undefined;
}

export interface TokenExport {
  mintUrl: string;
  amount: number;
  token: string;
}

export interface ImportResult {
  amount: number;
  mintUrl: string;
}

export interface LocalWalletOptions {
  gateway?: MintGateway;
  allowedMints?: readonly string[];
}

/** Vergleicht Mint-URLs nach den Regeln von cashu-ts, nicht zeichengenau. */
function sameMint(a: string, b: string): boolean {
  try {
    return normalizeMintUrl(a) === normalizeMintUrl(b);
  } catch {
    return a === b;
  }
}

export class LocalWallet implements WalletService {
  private readonly gateway?: MintGateway;
  private readonly allowedMints: readonly string[];

  constructor(options: LocalWalletOptions = {}) {
    this.gateway = options.gateway;
    this.allowedMints = options.allowedMints ?? ALLOWED_MINTS;
  }

  private requireGateway(): MintGateway {
    if (!this.gateway) throw new Error('Kein MintGateway konfiguriert.');
    return this.gateway;
  }

  /** FR-17: Token prüfen, einlösen, Proofs und Verlaufseintrag speichern. */
  async importToken(token: string): Promise<ImportResult> {
    let mintUrl: string;
    try {
      mintUrl = getTokenMetadata(token).mint;
    } catch (cause) {
      throw new TokenImportError('ungueltig', 'Kein gültiger Cashu-Token.', { cause });
    }

    // NR-07: nur Mints aus der eigenen erlaubten Liste.
    if (!this.allowedMints.some((allowed) => sameMint(allowed, mintUrl))) {
      throw new TokenImportError(
        'mint-nicht-erlaubt',
        `Der Mint ${mintUrl} steht nicht in der erlaubten Liste.`,
      );
    }

    const gateway = this.requireGateway();
    let received: StoredProof[];
    try {
      if (await gateway.isTokenSpent(mintUrl, token)) {
        throw new TokenImportError(
          'bereits-eingeloest',
          'Dieser Token wurde beim Mint bereits eingelöst.',
        );
      }
      received = await gateway.receive(mintUrl, token);
    } catch (cause) {
      if (cause instanceof TokenImportError) throw cause;
      if (cause instanceof MintUnreachableError) {
        throw new TokenImportError('mint-nicht-erreichbar', cause.message, { cause });
      }
      throw cause;
    }

    // FR-18: spätestens jetzt liegt echtes Geld im Browser-Speicher.
    await ensurePersistentStorage();

    const db = await openDatabase();
    const tx = db.transaction(['proofs', 'history'], 'readwrite');
    const proofStore = tx.objectStore('proofs');
    let credited = 0;
    for (const proof of received) {
      const value = Number(proof.amount);
      credited += value;
      await proofStore.put({
        secret: proof.secret,
        mintUrl,
        amount: value,
        state: 'available',
        proof,
      });
    }
    await tx.objectStore('history').put({
      id: crypto.randomUUID(),
      direction: 'in',
      amount: credited,
      at: Date.now(),
      status: 'empfangen',
      kind: 'import',
    });
    await tx.done;

    return { amount: credited, mintUrl };
  }

  async balance(): Promise<number> {
    const db = await openDatabase();
    const available = await db.getAllFromIndex('proofs', 'state', 'available');
    return sum(available);
  }

  async reserve(amount: number, mintUrl?: string): Promise<ProofBundle> {
    const db = await openDatabase();
    const tx = db.transaction('proofs', 'readwrite');
    const available = (await tx.store.index('state').getAll('available')).filter(
      (record) => mintUrl === undefined || record.mintUrl === mintUrl,
    );

    const byMint = new Map<string, ProofRecord[]>();
    for (const record of available) {
      const bucket = byMint.get(record.mintUrl) ?? [];
      bucket.push(record);
      byMint.set(record.mintUrl, bucket);
    }

    let chosen: ProofRecord[] | undefined;
    let chosenMint: string | undefined;
    for (const [mint, records] of byMint) {
      const candidate = selectProofs(records, amount);
      if (candidate) {
        chosen = candidate;
        chosenMint = mint;
        break;
      }
    }

    if (!chosen || !chosenMint) {
      await tx.done;
      // Verfügbar meint hier: was bei einem einzelnen Mint zusammenkommt, denn
      // ein Bündel kann Proofs nur eines Mints enthalten.
      const best = Math.max(0, ...[...byMint.values()].map(sum));
      throw new InsufficientFundsError(amount, best);
    }

    const bundleId = crypto.randomUUID();
    for (const record of chosen) {
      await tx.store.put({ ...record, state: 'reserved', bundleId });
    }
    await tx.done;

    return {
      id: bundleId,
      amount: sum(chosen),
      mintUrl: chosenMint,
      proofs: chosen.map((record) => record.proof),
    };
  }

  async commit(bundle: ProofBundle): Promise<void> {
    const db = await openDatabase();
    const tx = db.transaction('proofs', 'readwrite');
    for (const proof of bundle.proofs) {
      await tx.store.delete(proof.secret);
    }
    await tx.done;
  }

  async release(bundle: ProofBundle): Promise<void> {
    const db = await openDatabase();
    const tx = db.transaction('proofs', 'readwrite');
    for (const proof of bundle.proofs) {
      const record = await tx.store.get(proof.secret);
      if (record) {
        const { bundleId: _dropped, ...rest } = record;
        await tx.store.put({ ...rest, state: 'available' });
      }
    }
    await tx.done;
  }

  /**
   * FR-16: Sicherung des verfügbaren Guthabens. Ein Cashu-Token trägt genau
   * einen Mint, deshalb ein Token je Mint. Reservierte Proofs bleiben außen vor
   * — sie stecken in einer laufenden Zahlung und wären im Export bald ungültig.
   */
  async exportTokens(): Promise<TokenExport[]> {
    const db = await openDatabase();
    const available = await db.getAllFromIndex('proofs', 'state', 'available');

    const byMint = new Map<string, ProofRecord[]>();
    for (const record of available) {
      const bucket = byMint.get(record.mintUrl) ?? [];
      bucket.push(record);
      byMint.set(record.mintUrl, bucket);
    }

    return [...byMint].map(([mintUrl, records]) => ({
      mintUrl,
      amount: sum(records),
      token: getEncodedToken({
        mint: mintUrl,
        unit: 'sat',
        proofs: normalizeProofAmounts(records.map((record) => record.proof)),
      }),
    }));
  }

  /** Der Vertrag aus Kapitel 5.7 liefert einen String; bei mehreren Mints eine Zeile je Token. */
  async exportAll(): Promise<string> {
    const exports = await this.exportTokens();
    return exports.map((entry) => entry.token).join('\n');
  }
}

export type { StoredProof };
