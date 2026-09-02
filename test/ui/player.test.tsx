import { render } from 'preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { closeDatabase, type EpisodeRecord } from '../../src/db/database.js';
import { Player } from '../../src/ui/player.js';
import { savePosition } from '../../src/player/position-store.js';
import { resetDatabase } from '../helpers/db.js';
import { clickButton, flush } from '../helpers/ui.js';
import { PLAYBACK_RATES, PLAYBACK_RATE_DEFAULT } from '../../src/config/build-config.js';

const EPISODE: EpisodeRecord = {
  id: 'feed-1::episode-2',
  feedId: 'feed-1',
  title: 'Folge 2',
  description: 'Die zweite Folge',
  enclosureUrl: 'https://example.com/2.mp3',
  publishedAt: Date.parse('2025-08-12T10:00:00Z'),
  durationSeconds: 3723,
};

let host: HTMLDivElement;
let play: ReturnType<typeof vi.fn>;
let pause: ReturnType<typeof vi.fn>;

const audioEl = () => host.querySelector('audio') as HTMLAudioElement;

async function mount(props: Record<string, unknown> = {}) {
  render(<Player episode={EPISODE} podcastTitle="Testpodcast" {...props} />, host);
  await flush();
}

beforeEach(async () => {
  await resetDatabase();
  play = vi.fn();
  pause = vi.fn();
  HTMLMediaElement.prototype.play = play as unknown as HTMLMediaElement['play'];
  HTMLMediaElement.prototype.pause = pause as unknown as HTMLMediaElement['pause'];
  Object.defineProperty(navigator, 'mediaSession', {
    value: { metadata: null, playbackState: 'none', setActionHandler: vi.fn() },
    configurable: true,
  });
  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(async () => {
  render(null, host);
  host.remove();
  await closeDatabase();
});

describe('FR-12: Wiedergabe und Navigation', () => {
  it('spielt die Enclosure-URL über ein audio-Element', async () => {
    await mount();
    expect(audioEl().getAttribute('src')).toBe('https://example.com/2.mp3');
  });

  it('startet und pausiert die Wiedergabe', async () => {
    await mount();
    await clickButton(host, 'Abspielen');
    expect(play).toHaveBeenCalledTimes(1);

    await clickButton(host, 'Pause');
    expect(pause).toHaveBeenCalledTimes(1);
  });

  it('springt 30 s vorwärts', async () => {
    await mount();
    audioEl().currentTime = 100;
    await clickButton(host, '+30');
    expect(audioEl().currentTime).toBe(130);
  });

  it('springt 15 s zurück', async () => {
    await mount();
    audioEl().currentTime = 100;
    await clickButton(host, '−15');
    expect(audioEl().currentTime).toBe(85);
  });

  it('springt nicht vor den Anfang', async () => {
    await mount();
    audioEl().currentTime = 5;
    await clickButton(host, '−15');
    expect(audioEl().currentTime).toBe(0);
  });

  it('setzt die Position über einen Klick auf die Fortschrittsleiste', async () => {
    await mount();
    const track = host.querySelector('.progress-track') as HTMLElement;
    // jsdom misst nichts; die Leiste bekommt fuer den Test eine Breite.
    track.getBoundingClientRect = () => ({ left: 0, width: 1000 }) as DOMRect;

    track.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 500 }));
    await flush();

    // Halbe Breite bei 3723 s Dauer.
    expect(audioEl().currentTime).toBeCloseTo(3723 / 2, 5);
  });

  it('meldet Dauer und Position ueber die Slider-Rolle', async () => {
    await mount();
    const track = host.querySelector('.progress-track') as HTMLElement;
    expect(track.getAttribute('role')).toBe('slider');
    expect(track.getAttribute('aria-valuemax')).toBe('3723');
    expect(track.getAttribute('aria-valuenow')).toBe('0');
  });
});

describe('FR-14: Hörposition', () => {
  it('US-03-AC-2: setzt beim Öffnen an der gespeicherten Position an', async () => {
    await savePosition(EPISODE.id, 750);
    await mount();
    expect(audioEl().currentTime).toBe(750);
  });

  it('beginnt ohne gespeicherte Position bei 0', async () => {
    await mount();
    expect(audioEl().currentTime).toBe(0);
  });
});

describe('FR-13: Media Session', () => {
  it('US-03-AC-1: meldet Episodentitel und Podcast an die Systemsteuerung', async () => {
    await mount();
    expect(navigator.mediaSession.metadata).toMatchObject({
      title: 'Folge 2',
      artist: 'Testpodcast',
    });
  });
});

describe('FR-24: Ticks nach oben reichen', () => {
  it('meldet gehörte Zeit an den Aufrufer', async () => {
    const onTick = vi.fn();
    await mount({ onTick });

    const audio = audioEl();
    for (let i = 0; i < 8; i++) {
      audio.currentTime += 0.25;
      audio.dispatchEvent(new Event('timeupdate'));
    }
    await flush();

    expect(onTick).toHaveBeenCalled();
    expect(onTick.mock.calls[0][0]).toMatchObject({
      feedId: 'feed-1',
      episodeId: 'feed-1::episode-2',
    });
  });
});

describe('FR-12: Abspielgeschwindigkeit', () => {
  const rateEl = () => host.querySelector('select[name="playback-rate"]') as HTMLSelectElement;

  it('bietet genau die konfigurierten Stufen an', async () => {
    await mount();

    const angeboten = [...rateEl().options].map((option) => Number(option.value));
    expect(angeboten).toEqual([...PLAYBACK_RATES]);
  });

  it('startet bei einfacher Geschwindigkeit', async () => {
    await mount();

    expect(Number(rateEl().value)).toBe(PLAYBACK_RATE_DEFAULT);
    expect(audioEl().playbackRate).toBe(PLAYBACK_RATE_DEFAULT);
  });

  it('setzt die gewaehlte Stufe am Audio-Element', async () => {
    await mount();

    rateEl().value = '1.8';
    rateEl().dispatchEvent(new Event('change', { bubbles: true }));
    await flush();

    expect(audioEl().playbackRate).toBe(1.8);
  });

  it('haelt die Stufe ueber einen Episodenwechsel hinweg', async () => {
    await mount();
    rateEl().value = '2.1';
    rateEl().dispatchEvent(new Event('change', { bubbles: true }));
    await flush();

    // Dieselbe Komponente, andere Episode: die einmal gewaehlte
    // Geschwindigkeit soll nicht stillschweigend zurueckspringen.
    await mount({ episode: { ...EPISODE, id: 'feed-1::episode-3', title: 'Folge 3' } });

    expect(Number(rateEl().value)).toBe(2.1);
    expect(audioEl().playbackRate).toBe(2.1);
  });

  it('beschriftet die Stufen mit Komma und Malzeichen', async () => {
    await mount();

    const beschriftungen = [...rateEl().options].map((option) => option.textContent);
    expect(beschriftungen).toContain('0,8×');
    expect(beschriftungen).toContain('1×');
    expect(beschriftungen).toContain('2,1×');
  });
});
