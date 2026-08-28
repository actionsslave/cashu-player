/**
 * IndexedDB unter der App-Origin (NFR-04). Alles, was einen Neustart überleben
 * muss, liegt hier — auch die Session, weil localStorage für diese App gesperrt
 * ist (NR-04).
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { StoredProof } from '../contracts/index.js';

export const DB_NAME = 'cashu-podcast-player';
export const DB_VERSION = 1;

export const STORES = [
  'session',
  'settings',
  'subscriptions',
  'episodes',
  'positions',
  'proofs',
  'history',
  'nutzapConfigs',
] as const;

/** Angemeldete Identität (FR-02). Kein privater Schlüssel, nur der Pubkey. */
export interface SessionRecord {
  key: 'current';
  pubkeyHex: string;
  npub: string;
  loggedInAt: number;
}

export interface SettingRecord {
  key: string;
  value: unknown;
}

export interface SubscriptionRecord {
  /** Stabile ID des Abos, abgeleitet aus der Feed-URL. */
  id: string;
  feedUrl: string;
  title: string;
  imageUrl?: string;
  /** FR-08: sichtbar machen, dass der Feed über den Proxy geladen wurde. */
  loadedViaProxy: boolean;
  /** FR-21: nostr-Identität des Podcasts aus dem Feed. */
  npub?: string;
  addedAt: number;
  refreshedAt: number;
}

export interface EpisodeRecord {
  id: string;
  feedId: string;
  title: string;
  description: string;
  enclosureUrl: string;
  publishedAt: number;
  durationSeconds?: number;
}

/** Hörposition je Episode (FR-14). */
export interface PositionRecord {
  episodeId: string;
  positionSeconds: number;
  updatedAt: number;
}

/**
 * Ein Proof in der Wallet. `state` trägt die Reserve-Semantik aus FR-29:
 * reservierte Proofs zählen nicht zum verfügbaren Guthaben, sind aber noch da.
 */
export interface ProofRecord {
  /** Der Proof-Secret ist innerhalb eines Mints eindeutig. */
  secret: string;
  mintUrl: string;
  amount: number;
  state: 'available' | 'reserved';
  /** Gesetzt, solange state === 'reserved'. */
  bundleId?: string;
  proof: StoredProof;
}

/** Zahlungsverlauf (FR-19). */
export interface HistoryRecord {
  id: string;
  direction: 'in' | 'out';
  amount: number;
  at: number;
  status: 'gesendet' | 'ausstehend' | 'fehlgeschlagen' | 'empfangen';
  kind: 'streaming' | 'boost' | 'import' | 'export';
  feedTitle?: string;
  episodeTitle?: string;
  /** Grund bei status === 'fehlgeschlagen'. */
  error?: string;
}

/** Gecachtes kind:10019 des Empfängers (FR-22). */
export interface NutzapConfigRecord {
  pubkeyHex: string;
  p2pkPubkey: string;
  mints: string[];
  relays: string[];
  fetchedAt: number;
}

export interface PlayerDb extends DBSchema {
  session: { key: string; value: SessionRecord };
  settings: { key: string; value: SettingRecord };
  subscriptions: { key: string; value: SubscriptionRecord };
  episodes: { key: string; value: EpisodeRecord; indexes: { feedId: string } };
  positions: { key: string; value: PositionRecord };
  proofs: { key: string; value: ProofRecord; indexes: { state: string; mintUrl: string } };
  history: { key: string; value: HistoryRecord; indexes: { at: number } };
  nutzapConfigs: { key: string; value: NutzapConfigRecord };
}

let connection: Promise<IDBPDatabase<PlayerDb>> | undefined;

export function openDatabase(): Promise<IDBPDatabase<PlayerDb>> {
  connection ??= openDB<PlayerDb>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore('session', { keyPath: 'key' });
      db.createObjectStore('settings', { keyPath: 'key' });
      db.createObjectStore('subscriptions', { keyPath: 'id' });
      const episodes = db.createObjectStore('episodes', { keyPath: 'id' });
      episodes.createIndex('feedId', 'feedId');
      db.createObjectStore('positions', { keyPath: 'episodeId' });
      const proofs = db.createObjectStore('proofs', { keyPath: 'secret' });
      proofs.createIndex('state', 'state');
      proofs.createIndex('mintUrl', 'mintUrl');
      const history = db.createObjectStore('history', { keyPath: 'id' });
      history.createIndex('at', 'at');
      db.createObjectStore('nutzapConfigs', { keyPath: 'pubkeyHex' });
    },
  });
  return connection;
}

/** Schließt die Verbindung und wartet, bis sie wirklich zu ist. */
export async function closeDatabase(): Promise<void> {
  const pending = connection;
  connection = undefined;
  if (pending) (await pending).close();
}
