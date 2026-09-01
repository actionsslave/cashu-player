import { render } from 'preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { closeDatabase } from '../../src/db/database.js';
import { FeedView } from '../../src/ui/feed-view.js';
import { resetDatabase } from '../helpers/db.js';
import { clickButton, flush } from '../helpers/ui.js';
import { EPISODES_VISIBLE } from '../../src/config/build-config.js';
import { FEED_OHNE_NOSTR, VOLLSTAENDIGER_FEED, feedMitEpisoden } from '../feed/fixtures.js';

const URL_A = 'https://feed.example/rss';

let host: HTMLDivElement;

const serve = (body: string, status = 200) =>
  vi.fn<typeof fetch>().mockResolvedValue(new Response(body, { status }));

async function mount(fetchImpl: ReturnType<typeof serve>) {
  render(<FeedView fetchImpl={fetchImpl} />, host);
  await flush();
}

async function addFeed(url = URL_A): Promise<void> {
  const field = host.querySelector('input[name="feed-url"]') as HTMLInputElement;
  field.value = url;
  field.dispatchEvent(new Event('input', { bubbles: true }));
  await flush();
  await clickButton(host, 'Abonnieren');
}

beforeEach(async () => {
  await resetDatabase();
  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(async () => {
  render(null, host);
  host.remove();
  await closeDatabase();
});

describe('FR-07, FR-09: Abonnieren und Abo-Liste', () => {
  it('US-02-AC-1: zeigt Titel, Cover und die Episoden nach dem Abonnieren', async () => {
    await mount(serve(VOLLSTAENDIGER_FEED));
    await addFeed();

    expect(host.textContent).toContain('Testpodcast');
    expect(host.querySelector('img.cover')?.getAttribute('src')).toBe(
      'https://example.com/cover.jpg',
    );
    expect(host.textContent).toContain('Folge 2');
    expect(host.textContent).toContain('Folge 1');
  });

  it('FR-09: nennt die Anzahl der Episoden am Abo', async () => {
    await mount(serve(VOLLSTAENDIGER_FEED));
    await addFeed();
    expect(host.querySelector('.subscription')?.textContent).toContain('2 Episoden');
  });

  it('US-02-AC-3: meldet "Kein gültiger Podcast-Feed" und legt kein Abo an', async () => {
    await mount(serve('<html><body>nix</body></html>'));
    await addFeed();

    expect(host.textContent).toContain('Kein gültiger Podcast-Feed');
    expect(host.querySelectorAll('.subscription')).toHaveLength(0);
  });

  it('US-02-AC-4: legt dieselbe URL kein zweites Mal an', async () => {
    await mount(serve(VOLLSTAENDIGER_FEED));
    await addFeed();
    await addFeed();
    expect(host.querySelectorAll('.subscription')).toHaveLength(1);
  });
});

describe('FR-08: Proxy-Kennzeichnung', () => {
  it('US-02-AC-2: markiert ein über den Proxy geladenes Abo sichtbar', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response(VOLLSTAENDIGER_FEED, { status: 200 }));

    // Proxy explizit, weil FEED_PROXY_URL im Build leer ist (OQ-03) und es
    // ohne Ziel keinen Zweitversuch gaebe. Geprueft wird die Kennzeichnung,
    // nicht die Auslieferungsentscheidung.
    render(<FeedView fetchImpl={fetchImpl} proxyUrl="https://proxy.example/rss?url=" />, host);
    await flush();
    await addFeed();

    expect(host.textContent).toContain('über Proxy geladen');
  });
});

describe('FR-09: Abbestellen', () => {
  it('bestellt erst nach Bestätigung ab', async () => {
    await mount(serve(VOLLSTAENDIGER_FEED));
    await addFeed();

    await clickButton(host, 'Abbestellen');
    expect(host.querySelectorAll('.subscription')).toHaveLength(1);

    await clickButton(host, 'Ja, abbestellen');
    expect(host.querySelectorAll('.subscription')).toHaveLength(0);
  });

  it('weist im Dialog darauf hin, dass die Episodendaten mitgelöscht werden', async () => {
    await mount(serve(VOLLSTAENDIGER_FEED));
    await addFeed();
    await clickButton(host, 'Abbestellen');
    expect(host.textContent).toMatch(/Episoden/i);
  });
});

describe('FR-09: Anzahl in der Abo-Zeile', () => {
  it('nennt die Gesamtzahl des Feeds, nicht die sichtbaren oder gespeicherten', async () => {
    await mount(serve(feedMitEpisoden(70)));
    await addFeed();

    const zeile = host.querySelector('.subscription')?.textContent ?? '';
    expect(zeile).toContain('70 Episoden');
    expect(host.querySelectorAll('.episodes li')).toHaveLength(EPISODES_VISIBLE);
  });
});

describe('FR-10: Episodenliste', () => {
  it('zeigt je Episode nur den Titel', async () => {
    await mount(serve(VOLLSTAENDIGER_FEED));
    await addFeed();

    const episodes = host.querySelector('.episodes')?.textContent ?? '';
    expect(episodes).toContain('Folge 2');
    expect(episodes).toContain('Folge 1');
    // Dauer, Datum und Beschreibung gehoeren nicht mehr in die Liste.
    expect(episodes).not.toContain('1:02:03');
    expect(episodes).not.toContain('12.8.2025');
    expect(episodes).not.toContain('Die zweite Folge');
  });

  it('zeigt hoechstens EPISODES_VISIBLE Episoden', async () => {
    // Der Feed traegt 70 Episoden, gespeichert werden 50 (EPISODES_PER_FEED),
    // sichtbar sind EPISODES_VISIBLE.
    await mount(serve(feedMitEpisoden(70)));
    await addFeed();

    expect(host.querySelectorAll('.episodes li')).toHaveLength(EPISODES_VISIBLE);
  });

  it('US-02-AC-1: haelt die Reihenfolge absteigend nach Datum', async () => {
    await mount(serve(VOLLSTAENDIGER_FEED));
    await addFeed();

    // Zwei Episoden, weniger als EPISODES_VISIBLE — der Schnitt greift nicht,
    // die Reihenfolge ist trotzdem die neueste zuerst.
    const titles = [...host.querySelectorAll('.episodes button')].map((b) => b.textContent);
    expect(titles).toEqual(['Folge 2', 'Folge 1']);
  });

  it('macht den Titel anklickbar und meldet die Episode nach oben', async () => {
    const onEpisodeSelected = vi.fn();
    render(<FeedView fetchImpl={serve(VOLLSTAENDIGER_FEED)} onEpisodeSelected={onEpisodeSelected} />, host);
    await flush();
    await addFeed();

    await clickButton(host.querySelector('.episodes') as HTMLElement, 'Folge 2');

    expect(onEpisodeSelected).toHaveBeenCalledTimes(1);
    const [episode, subscription] = onEpisodeSelected.mock.calls[0];
    expect(episode).toMatchObject({ title: 'Folge 2' });
    expect(episode.enclosureUrl).toMatch(/^https:\/\//);
    expect(subscription).toMatchObject({ title: 'Testpodcast' });
  });
});

describe('FR-11: Refresh', () => {
  it('lässt bei einem HTTP-Fehler den letzten Stand stehen und zeigt einen Hinweis', async () => {
    const fetchImpl = serve(VOLLSTAENDIGER_FEED);
    await mount(fetchImpl);
    await addFeed();

    fetchImpl.mockResolvedValue(new Response('weg', { status: 500 }));
    await clickButton(host, 'Aktualisieren');

    expect(host.textContent).toContain('500');
    expect(host.textContent).toContain('Folge 2');
  });
});

describe('FR-21, US-07-AC-1: Podcast ohne nostr-Identität', () => {
  it('nennt die fehlende nostr-Identität als Grund', async () => {
    await mount(serve(FEED_OHNE_NOSTR));
    await addFeed();
    expect(host.textContent).toMatch(/keine nostr-Identität/i);
  });

  it('nennt keinen solchen Grund, wenn der Feed einen npub trägt', async () => {
    await mount(serve(VOLLSTAENDIGER_FEED));
    await addFeed();
    expect(host.textContent).not.toMatch(/keine nostr-Identität/i);
  });
});
