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

  it('A-05: mehr als ein Mint, damit einer ausfallen darf', () => {
    expect(ALLOWED_MINTS.length).toBeGreaterThan(1);
  });

  it('fuehrt genau die entschiedenen Mints', () => {
    // Erinnerung, kein Qualitaetsmerkmal: Wird die Liste geaendert, wird diese
    // Zeile rot und die Begruendung gehoert nach docs/kandidaten.md.
    // testnut.cashu.exchange kann kein NUT-12 (DLEQ) — bewusst in Kauf
    // genommen, siehe dort.
    expect([...ALLOWED_MINTS]).toEqual([
      'https://mint.minibits.cash/Bitcoin',
      'https://mint.macadamia.cash',
      'https://testnut.cashu.exchange',
      'https://testnut.cashu.space',
    ]);
  });

  it('NR-07: kein Eintrag doppelt, auch nicht in anderer Schreibweise', () => {
    const normalisiert = ALLOWED_MINTS.map((mint) => mint.toLowerCase().replace(/\/+$/, ''));
    expect(new Set(normalisiert).size).toBe(ALLOWED_MINTS.length);
  });
});
