/**
 * Feed-Abruf mit Timeout (FR-11) und einmaligem Proxy-Fallback (FR-08).
 *
 * Der Proxy wird ausschließlich hier verwendet — Mint- und Relay-Verkehr läuft
 * nie darüber (NR-03).
 */
import { FEED_PROXY_URL, FEED_TIMEOUT_MS } from '../config/build-config.js';

export type FeedFetchFailure = 'http' | 'netz' | 'timeout';

export class FeedFetchError extends Error {
  readonly name = 'FeedFetchError';
  constructor(
    readonly reason: FeedFetchFailure,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
  }
}

export interface FeedResponse {
  xml: string;
  /** FR-08: sichtbar machen, dass der Feed über den Proxy kam. */
  viaProxy: boolean;
}

export interface FetchFeedOptions {
  fetchImpl?: typeof fetch;
}

interface Attempt {
  xml?: string;
  /** Gesetzt, wenn der Versuch scheiterte. */
  error?: FeedFetchError;
}

async function attempt(url: string, fetchImpl: typeof fetch): Promise<Attempt> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, FEED_TIMEOUT_MS);

  try {
    const response = await fetchImpl(url, { signal: controller.signal });
    if (!response.ok) {
      return {
        error: new FeedFetchError('http', `Der Feed antwortete mit HTTP ${response.status}.`),
      };
    }
    return { xml: await response.text() };
  } catch (cause) {
    return {
      error: timedOut
        ? new FeedFetchError(
            'timeout',
            `Der Feed hat binnen ${FEED_TIMEOUT_MS / 1000} s nicht geantwortet.`,
            { cause },
          )
        : new FeedFetchError('netz', 'Der Feed war nicht erreichbar.', { cause }),
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchFeed(url: string, options: FetchFeedOptions = {}): Promise<FeedResponse> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);

  const direct = await attempt(url, fetchImpl);
  if (direct.xml !== undefined) return { xml: direct.xml, viaProxy: false };

  // Nur ein Netzfehler ohne Antwort sieht im Browser wie eine CORS-Blockade aus.
  // Ein HTTP-Status ist eine echte Antwort, ein Timeout ist ein langsamer Host —
  // in beiden Fällen hilft der Proxy nicht, und der zweite Versuch würde beim
  // Timeout die Wartezeit verdoppeln (FR-11).
  if (direct.error?.reason !== 'netz') throw direct.error;

  const viaProxy = await attempt(`${FEED_PROXY_URL}${encodeURIComponent(url)}`, fetchImpl);
  if (viaProxy.xml !== undefined) return { xml: viaProxy.xml, viaProxy: true };

  throw direct.error ?? viaProxy.error;
}
