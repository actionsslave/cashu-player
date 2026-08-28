/**
 * Entscheidet, was der Service Worker in den Cache legen darf.
 *
 * FR-31 verlangt einen Fetch-Handler, der die App-Shell cached.
 * NR-10 verbietet, Antworten von Mints oder Relays zu cachen — deshalb kommt
 * ausschließlich die eigene Origin in den Cache, und Mints sind zusätzlich
 * ausdrücklich ausgeschlossen, selbst wenn einer auf derselben Origin läge.
 */
export interface CachePolicyOptions {
  appOrigin: string;
  method?: string;
  allowedMints?: readonly string[];
}

export function shouldCache(url: string, options: CachePolicyOptions): boolean {
  if ((options.method ?? 'GET') !== 'GET') return false;

  let parsed: URL;
  let origin: URL;
  try {
    parsed = new URL(url);
    origin = new URL(options.appOrigin);
  } catch {
    return false;
  }

  // Relays sprechen wss, Mints und Feeds liegen auf fremden Origins — beides
  // fällt hier heraus, ohne dass es eine eigene Regel braucht.
  if (parsed.origin !== origin.origin) return false;

  for (const mint of options.allowedMints ?? []) {
    if (parsed.href.startsWith(mint.replace(/\/+$/, ''))) return false;
  }

  return true;
}
