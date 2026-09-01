import { afterEach, describe, expect, it, vi } from 'vitest';
import { FeedFetchError, fetchFeed } from '../../src/feed/fetch.js';

const XML = '<rss version="2.0"><channel><title>T</title></channel></rss>';

/** Proxy wird injiziert, damit die Tests nicht an der Build-Konstante haengen. */
const PROXY = 'https://proxy.example/rss?url=';

const ok = (body: string) => new Response(body, { status: 200 });
const corsFehler = () => Promise.reject(new TypeError('Failed to fetch'));

afterEach(() => {
  vi.useRealTimers();
});

describe('FR-08: Proxy-Fallback bei CORS', () => {
  it('US-02-AC-2: lädt über den Proxy, wenn der direkte Abruf an CORS scheitert', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockImplementationOnce(corsFehler)
      .mockResolvedValueOnce(ok(XML));

    const result = await fetchFeed('https://feed.example/rss', { fetchImpl, proxyUrl: PROXY });

    expect(result.xml).toBe(XML);
    expect(result.viaProxy).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('NR-03: hängt die Feed-URL url-kodiert an die konfigurierte Proxy-URL', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockImplementationOnce(corsFehler)
      .mockResolvedValueOnce(ok(XML));

    await fetchFeed('https://feed.example/rss?x=1', { fetchImpl, proxyUrl: PROXY });

    expect(fetchImpl.mock.calls[1][0]).toBe(
      `${PROXY}${encodeURIComponent('https://feed.example/rss?x=1')}`,
    );
  });

  it('fragt den Proxy nicht an, wenn der direkte Abruf gelingt', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(ok(XML));
    const result = await fetchFeed('https://feed.example/rss', { fetchImpl, proxyUrl: PROXY });

    expect(result.viaProxy).toBe(false);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('versucht den Proxy genau einmal', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(corsFehler);
    await expect(
      fetchFeed('https://feed.example/rss', { fetchImpl, proxyUrl: PROXY }),
    ).rejects.toBeInstanceOf(FeedFetchError);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('OQ-03: ohne konfigurierten Proxy bleibt es beim einen Versuch', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(corsFehler);

    await expect(
      fetchFeed('https://feed.example/rss', { fetchImpl, proxyUrl: '' }),
    ).rejects.toMatchObject({ reason: 'netz' });

    // Ohne Ziel waere der Zweitversuch ein Abruf auf die nackte Feed-URL
    // relativ zur eigenen Origin — ein Fehlschlag mit irrefuehrendem Grund.
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('OQ-03: ein gelungener Direktabruf ist ohne Proxy unveraendert nicht viaProxy', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(ok(XML));
    const result = await fetchFeed('https://feed.example/rss', { fetchImpl, proxyUrl: '' });

    expect(result).toMatchObject({ xml: XML, viaProxy: false });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe('FR-11: Fehler und Timeout', () => {
  it('meldet einen HTTP-Fehler mit Status und versucht keinen Proxy', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('nicht da', { status: 404 }));

    const error = await fetchFeed('https://feed.example/rss', { fetchImpl }).catch((e) => e);
    expect(error).toBeInstanceOf(FeedFetchError);
    expect(error.reason).toBe('http');
    expect(error.message).toContain('404');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('bricht nach 10 s ab und nennt den Timeout als Grund', async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );

    const pending = fetchFeed('https://feed.example/rss', { fetchImpl });
    const assertion = expect(pending).rejects.toMatchObject({ reason: 'timeout' });
    await vi.advanceTimersByTimeAsync(21_000);
    await assertion;
  });

  it('versucht nach einem Timeout keinen Proxy — das würde die Wartezeit verdoppeln', async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );

    const pending = fetchFeed('https://feed.example/rss', { fetchImpl });
    const assertion = expect(pending).rejects.toMatchObject({ reason: 'timeout' });
    await vi.advanceTimersByTimeAsync(21_000);
    await assertion;
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('meldet einen Netzfehler, wenn auch der Proxy scheitert', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(corsFehler);
    await expect(
      fetchFeed('https://feed.example/rss', { fetchImpl, proxyUrl: PROXY }),
    ).rejects.toMatchObject({
      reason: 'netz',
    });
  });
});
