/**
 * Service Worker für die App-Shell (FR-31).
 *
 * Strategie: Netz zuerst, Cache als Rückfallebene. So ist die App nach einem
 * Deploy sofort aktuell und offline trotzdem startbar (NFR-03).
 * Was in den Cache darf, entscheidet ausschließlich shouldCache — dort steht
 * auch die Durchsetzung von NR-10.
 *
 * Die Typen der Service-Worker-Umgebung sind hier lokal deklariert. Die
 * WebWorker-Lib von TypeScript kollidiert mit der DOM-Lib der übrigen App,
 * und für diese paar Ereignisse lohnt keine zweite tsconfig.
 */
import { ALLOWED_MINTS } from './config/build-config.js';
import { shouldCache } from './pwa/cache-policy.js';

interface ExtendableEventLike extends Event {
  waitUntil(promise: Promise<unknown>): void;
}

interface FetchEventLike extends ExtendableEventLike {
  request: Request;
  respondWith(response: Promise<Response>): void;
}

interface ServiceWorkerScope {
  location: Location;
  skipWaiting(): Promise<void>;
  clients: { claim(): Promise<void> };
  addEventListener(type: 'install' | 'activate', listener: (event: ExtendableEventLike) => void): void;
  addEventListener(type: 'fetch', listener: (event: FetchEventLike) => void): void;
}

const worker = self as unknown as ServiceWorkerScope;

const CACHE_NAME = 'cashu-player-shell-v1';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

worker.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      // Ein einzelner fehlender Eintrag darf die Installation nicht kippen.
      .then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(url))))
      .then(() => worker.skipWaiting()),
  );
});

worker.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => worker.clients.claim()),
  );
});

worker.addEventListener('fetch', (event) => {
  const allowed = shouldCache(event.request.url, {
    appOrigin: worker.location.origin,
    method: event.request.method,
    allowedMints: ALLOWED_MINTS,
  });
  // Alles andere — Mints, Relays, Feeds, Audio — geht am Worker vorbei ins Netz.
  if (!allowed) return;

  event.respondWith(
    fetch(event.request)
      .then(async (response) => {
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(event.request, response.clone());
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        const shell = await caches.match('/index.html');
        if (shell) return shell;
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      }),
  );
});
