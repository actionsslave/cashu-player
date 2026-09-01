import { describe, expect, it } from 'vitest';
import {
  ALLOWED_MINTS,
  DEMO_RELAYS,
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

  it('NR-05: die Feed-Proxy-URL ist leer oder ein https-Endpunkt', () => {
    // OQ-03: leer heisst "kein Proxy". Alles andere muss https sein, sonst
    // blockiert der Browser den Abruf von einer HTTPS-Seite ohnehin.
    expect(FEED_PROXY_URL === '' || FEED_PROXY_URL.startsWith('https://')).toBe(true);
  });

  it('meldet offene Platzhalter, solange echte Werte fehlen', () => {
    const serialized = JSON.stringify({ ALLOWED_MINTS, DEMO_RELAYS, FEED_PROXY_URL });
    expect(hasPlaceholders()).toBe(serialized.includes(PLACEHOLDER_MARKER));
  });

  it('die gesetzten Werte enthalten keinen Platzhalter mehr', () => {
    expect(hasPlaceholders()).toBe(false);
  });

  it('A-05: der Reserve-Mint fehlt noch — bewusst, mit Testmint im Betrieb', () => {
    // Diese Erwartung ist eine Erinnerung, kein Qualitaetsmerkmal. Kommt der
    // zweite Mint dazu, wird sie rot und gehoert dann auf toBeGreaterThan(1)
    // gehoben. Siehe docs/kandidaten.md.
    expect(ALLOWED_MINTS).toEqual(['https://testnut.cashu.space']);
  });
});
