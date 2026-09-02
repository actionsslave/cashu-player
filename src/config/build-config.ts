/**
 * Einzige Konfigurationsdatei für Build-Konstanten (Kapitel 5.7).
 *
 * Werte mit PLACEHOLDER_MARKER sind noch nicht bestätigt und müssen vor der Demo
 * durch echte Werte ersetzt werden. hasPlaceholders() macht das zur Laufzeit sichtbar.
 */

export const PLACEHOLDER_MARKER = 'PLATZHALTER';

/**
 * Erlaubte Mints (FR-15, NR-07).
 *
 * Beide sind oeffentliche Testmints: ihre Tokens sind wertlos, also kann in
 * der Entwicklung niemand echte Betraege verlieren. Geprueft am 02.09.2026
 * ueber /v1/info und /v1/keysets, beide mit Access-Control-Allow-Origin `*`:
 *
 *   testnut.cashu.exchange  Nutshell-CF 0.0.1  NUT-11 ja, NUT-12 NEIN,
 *                           aktives sat-Keyset 10 ppk
 *   testnut.cashu.space     cdk-mintd 0.17.0   NUT-11 ja, NUT-12 ja,
 *                           aktives sat-Keyset 100 ppk
 *
 * A-05 verlangt zwei Mints mit NUT-11 und NUT-12. Der Reserve-Mint erfuellt
 * das nur halb: testnut.cashu.exchange meldet `NUT-12: supported false`. Ohne
 * DLEQ kann der Empfaenger nicht pruefen, ob der Mint seine Token markiert
 * hat — NIP-61 empfiehlt es deshalb ausdruecklich. Am 02.09.2026 bewusst in
 * Kauf genommen, weil cashu.space beim Minten nicht zuverlaessig war.
 * Vor der Demo neu entscheiden: docs/kandidaten.md nennt Alternativen mit
 * vollstaendigem NUT-12.
 *
 * Beide fuehren neben sat weitere Einheiten. Ein versehentlich in usd
 * gemintetes Token faengt die Einheitenpruefung in importToken() ab.
 *
 * CORS ist eine Eigenschaft des Paares aus Origin und Mint: Die Pruefung oben
 * lief von der Kommandozeile, nicht aus dem Browser unter der Demo-Origin.
 * A-02 ueber /pruefung/a02-mints.html bleibt Pflicht.
 */
export const ALLOWED_MINTS: readonly string[] = [
  'https://testnut.cashu.exchange',
  'https://testnut.cashu.space',
];

/**
 * Relays für das Nachschlagen von kind:10019 (FR-22).
 * Nutzaps selbst gehen ausschließlich an die Relays aus dem kind:10019 des
 * Empfängers, nicht an diese Liste (FR-27, NR-02).
 * TODO: echte Demo-Relays eintragen.
 */
export const DEMO_RELAYS: readonly string[] = [
  'wss://relay.damus.io',
  'wss://relay.primal.net',
  'wss://nos.lol',
];

/**
 * Feed-Proxy für den zweiten Abrufversuch bei fehlenden CORS-Headern (FR-08).
 * Ausschließlich für RSS-Abrufe; niemals für Mint- oder Relay-Verkehr (NR-03).
 * Die Feed-URL wird an diesen Präfix angehängt (url-encoded).
 *
 * Leer heisst: kein Proxy. fetchFeed() ueberspringt den Zweitversuch dann und
 * meldet den urspruenglichen Netzfehler. Das ist der Rueckfall aus OQ-03 —
 * fuer die Demo Feeds waehlen, die CORS bereits setzen. Ein oeffentlicher
 * Dienst saehe mit, welche Feeds gelesen werden, und kann waehrend der Demo
 * ausfallen; ein eigener Proxy braucht die Origin aus OQ-08.
 *
 * Sobald eine Adresse feststeht, hier eintragen — sonst aendert sich nichts.
 */
export const FEED_PROXY_URL: string = '';

/** Streaming-Satz: Vorgabe, Grenzen (FR-26). */
export const STREAMING_RATE_DEFAULT_SATS_PER_MINUTE = 10;
export const STREAMING_RATE_MIN = 0;
export const STREAMING_RATE_MAX = 1000;

/** Streaming-Intervall in Sekunden gehörter Zeit (FR-25, OQ-04). */
export const STREAMING_INTERVAL_SECONDS = 60;

/**
 * Die einzige Einheit, die die Wallet fuehrt (FR-15, FR-17).
 *
 * Guthaben, Export und das `unit`-Tag des Nutzaps (FR-27) haengen alle daran.
 * Mints koennen mehrere Einheiten anbieten — testnut.cashu.space etwa sat,
 * msat, usd und eur — deshalb wird sie beim Import geprueft und nicht
 * angenommen.
 */
export const WALLET_UNIT = 'sat';

/** Untergrenze, ab der Streaming-Zahlungen stoppen (FR-20). */
export const MIN_BALANCE_SATS = 10;

/**
 * Boost-Vorgabebeträge in Sat (FR-28).
 * Vielfache von 21 aus dem Design-Handoff (Entwurf 1e) — dort ausdrücklich als
 * gewollt bezeichnet und deshalb nicht auf runde Zahlen zurückgedreht.
 */
export const BOOST_PRESETS_SATS: readonly number[] = [210, 2100, 4200, 21000];

/** Maximale Länge der Boost-Nachricht (FR-28). */
export const BOOST_MESSAGE_MAX_LENGTH = 280;

/** Cache-Dauer für kind:10019 in Millisekunden (FR-22). */
export const NUTZAP_CONFIG_CACHE_MS = 24 * 60 * 60 * 1000;

/** Timeout für Feed-Abrufe in Millisekunden (FR-11). */
export const FEED_TIMEOUT_MS = 10_000;

/** Timeout für Signaturanfragen an die Extension in Millisekunden (FR-03). */
export const SIGN_TIMEOUT_MS = 30_000;

/** Anzahl Episoden, die je Feed geladen und gespeichert werden (FR-10). */
export const EPISODES_PER_FEED = 50;

/**
 * Anzahl Episoden, die in der Liste sichtbar sind (FR-10).
 *
 * Bewusst getrennt von EPISODES_PER_FEED: Gespeichert bleiben 50, damit eine
 * groessere Zahl hier kein erneutes Laden aller Feeds erzwingt.
 */
export const EPISODES_VISIBLE = 3;

/**
 * Wählbare Abspielgeschwindigkeiten (FR-12).
 * Die Hörzeit zählt in Medienzeit: Bei 2× läuft der Streaming-Zähler doppelt
 * so schnell hoch, weil in derselben Wanduhrzeit doppelt so viel Inhalt
 * gehört wird. Der ListeningTicker rechnet den Faktor in seine
 * Sprungerkennung ein (siehe listening-ticker.ts).
 */
export const PLAYBACK_RATES: readonly number[] = [0.8, 1, 1.2, 1.5, 1.8, 2, 2.1];

/** Vorgabe der Abspielgeschwindigkeit (FR-12). */
export const PLAYBACK_RATE_DEFAULT = 1;

/** Persistenzintervall der Hörposition in Millisekunden (FR-14). */
export const POSITION_PERSIST_INTERVAL_MS = 10_000;

/** Empfohlene NIP-07-Extensions, die FR-01 namentlich nennen muss. */
export const SUGGESTED_EXTENSIONS: readonly { name: string; url: string }[] = [
  { name: 'nos2x', url: 'https://github.com/fiatjaf/nos2x' },
  { name: 'Alby', url: 'https://getalby.com' },
];

/** True, solange irgendein Wert oben noch ein Platzhalter ist. */
export function hasPlaceholders(): boolean {
  const values = [...ALLOWED_MINTS, ...DEMO_RELAYS, FEED_PROXY_URL];
  return values.some((value) => value.toLowerCase().includes(PLACEHOLDER_MARKER.toLowerCase()));
}
