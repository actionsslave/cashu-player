import { describe, expect, it } from 'vitest';
import {
  ALLOWED_MINTS,
  DEMO_RELAYS,
  DEMO_NPUB,
  FEED_PROXY_URL,
  PLACEHOLDER_MARKER,
  hasPlaceholders,
} from '../../src/config/build-config.js';

describe('Build-Konstanten', () => {
  it('NR-05: alle erlaubten Mints sind https-Endpunkte', () => {
    expect(ALLOWED_MINTS.length).toBeGreaterThan(0);
    for (const mint of ALLOWED_MINTS) {
      expect(mint.startsWith('https://')).toBe(true);
    }
  });

  it('NR-05: alle Demo-Relays sind wss-Endpunkte', () => {
    expect(DEMO_RELAYS.length).toBeGreaterThan(0);
    for (const relay of DEMO_RELAYS) {
      expect(relay.startsWith('wss://')).toBe(true);
    }
  });

  it('NR-05: die Feed-Proxy-URL ist ein https-Endpunkt', () => {
    expect(FEED_PROXY_URL.startsWith('https://')).toBe(true);
  });

  it('meldet offene Platzhalter, solange echte Werte fehlen', () => {
    const serialized = JSON.stringify({ ALLOWED_MINTS, DEMO_RELAYS, DEMO_NPUB, FEED_PROXY_URL });
    expect(hasPlaceholders()).toBe(serialized.includes(PLACEHOLDER_MARKER));
  });
});
