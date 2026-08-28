import { describe, expect, it } from 'vitest';
import { shouldCache } from '../../src/pwa/cache-policy.js';

const APP = 'https://player.example';
const options = { appOrigin: APP, allowedMints: ['https://mint-a.example'] };

describe('FR-31: App-Shell cachen', () => {
  it('cached die Startseite der eigenen Origin', () => {
    expect(shouldCache(`${APP}/`, options)).toBe(true);
  });

  it('cached JavaScript und CSS der eigenen Origin', () => {
    expect(shouldCache(`${APP}/assets/main-abc.js`, options)).toBe(true);
    expect(shouldCache(`${APP}/assets/main-abc.css`, options)).toBe(true);
  });

  it('cached nur GET-Anfragen', () => {
    expect(shouldCache(`${APP}/`, { ...options, method: 'POST' })).toBe(false);
  });
});

describe('NR-10: Service Worker cached keine Zahlungsdaten', () => {
  it('cached keine Antwort eines erlaubten Mints', () => {
    expect(shouldCache('https://mint-a.example/v1/info', options)).toBe(false);
    expect(shouldCache('https://mint-a.example/v1/swap', options)).toBe(false);
  });

  it('cached auch einen Mint nicht, der auf derselben Origin läge', () => {
    expect(
      shouldCache(`${APP}/mint/v1/info`, { ...options, allowedMints: [`${APP}/mint`] }),
    ).toBe(false);
  });

  it('cached keine Relay-Verbindung', () => {
    expect(shouldCache('wss://relay.example', options)).toBe(false);
  });

  it('cached nichts von einer fremden Origin', () => {
    expect(shouldCache('https://feed.example/rss', options)).toBe(false);
    expect(shouldCache('https://cdn.example/audio.mp3', options)).toBe(false);
  });
});

describe('Randfälle', () => {
  it('cached keine unlesbare URL', () => {
    expect(shouldCache('nicht-mal-eine-url', options)).toBe(false);
  });

  it('cached die Prüfseiten mit, sie gehören zur eigenen Origin', () => {
    expect(shouldCache(`${APP}/pruefung/a02-mints.html`, options)).toBe(true);
  });
});
