/**
 * Einzige Konfigurationsdatei für Build-Konstanten (Kapitel 5.7).
 *
 * Werte mit PLACEHOLDER_MARKER sind noch nicht bestätigt und müssen vor der Demo
 * durch echte Werte ersetzt werden. hasPlaceholders() macht das zur Laufzeit sichtbar.
 */

export const PLACEHOLDER_MARKER = 'PLATZHALTER';

/**
 * Erlaubte Mints (FR-15, NR-07). Jeder Eintrag muss vor dem Bau einzeln auf
 * CORS-Tauglichkeit aus dem Browser geprüft werden — siehe A-02 und docs/manuelle-tests.md.
 * TODO: echte Mint-URLs eintragen (mit NUT-11 und NUT-12, ohne Fees, A-05).
 */
export const ALLOWED_MINTS: readonly string[] = [
  `https://mint-1.${PLACEHOLDER_MARKER}.example`,
  `https://mint-2.${PLACEHOLDER_MARKER}.example`,
];

/**
 * Relays für das Nachschlagen von kind:10019 (FR-22).
 * Nutzaps selbst gehen ausschließlich an die Relays aus dem kind:10019 des
 * Empfängers, nicht an diese Liste (FR-27, NR-02).
 * TODO: echte Demo-Relays eintragen.
 */
export const DEMO_RELAYS: readonly string[] = [
  `wss://relay-1.${PLACEHOLDER_MARKER}.example`,
  `wss://relay-2.${PLACEHOLDER_MARKER}.example`,
];

/**
 * Feed-Proxy für den zweiten Abrufversuch bei fehlenden CORS-Headern (FR-08).
 * Ausschließlich für RSS-Abrufe; niemals für Mint- oder Relay-Verkehr (NR-03).
 * Die Feed-URL wird an diesen Präfix angehängt (url-encoded).
 * TODO: echte Proxy-URL eintragen.
 */
export const FEED_PROXY_URL = `https://proxy.${PLACEHOLDER_MARKER}.example/rss?url=`;

/**
 * npub des Demo-Podcasts, als Rückfallebene, wenn der Feed keine nostr-Identität
 * trägt (A-04). TODO: echten Demo-npub eintragen.
 */
export const DEMO_NPUB = `npub1${PLACEHOLDER_MARKER.toLowerCase()}`;

/** Streaming-Satz: Vorgabe, Grenzen (FR-26). */
export const STREAMING_RATE_DEFAULT_SATS_PER_MINUTE = 10;
export const STREAMING_RATE_MIN = 0;
export const STREAMING_RATE_MAX = 1000;

/** Streaming-Intervall in Sekunden gehörter Zeit (FR-25, OQ-04). */
export const STREAMING_INTERVAL_SECONDS = 60;

/** Untergrenze, ab der Streaming-Zahlungen stoppen (FR-20). */
export const MIN_BALANCE_SATS = 10;

/** Boost-Vorgabebeträge in Sat (FR-28). */
export const BOOST_PRESETS_SATS: readonly number[] = [100, 1000, 5000, 21000];

/** Maximale Länge der Boost-Nachricht (FR-28). */
export const BOOST_MESSAGE_MAX_LENGTH = 280;

/** Cache-Dauer für kind:10019 in Millisekunden (FR-22). */
export const NUTZAP_CONFIG_CACHE_MS = 24 * 60 * 60 * 1000;

/** Timeout für Feed-Abrufe in Millisekunden (FR-11). */
export const FEED_TIMEOUT_MS = 10_000;

/** Timeout für Signaturanfragen an die Extension in Millisekunden (FR-03). */
export const SIGN_TIMEOUT_MS = 30_000;

/** Anzahl Episoden je Feed (FR-10). */
export const EPISODES_PER_FEED = 50;

/** Persistenzintervall der Hörposition in Millisekunden (FR-14). */
export const POSITION_PERSIST_INTERVAL_MS = 10_000;

/** Empfohlene NIP-07-Extensions, die FR-01 namentlich nennen muss. */
export const SUGGESTED_EXTENSIONS: readonly { name: string; url: string }[] = [
  { name: 'nos2x', url: 'https://github.com/fiatjaf/nos2x' },
  { name: 'Alby', url: 'https://getalby.com' },
];

/** True, solange irgendein Wert oben noch ein Platzhalter ist. */
export function hasPlaceholders(): boolean {
  const values = [...ALLOWED_MINTS, ...DEMO_RELAYS, FEED_PROXY_URL, DEMO_NPUB];
  return values.some((value) => value.toLowerCase().includes(PLACEHOLDER_MARKER.toLowerCase()));
}
