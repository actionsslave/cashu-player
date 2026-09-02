import { describe, expect, it } from 'vitest';
import { plainText } from '../../src/ui/library-view.js';
import { matchesFilter, transactionType } from '../../src/ui/wallet-view.js';
import { payableTotal } from '../../src/ui/nutzap-dialog.js';
import type { HistoryRecord } from '../../src/db/database.js';

describe('Beschreibungen für eine Zeile aufbereiten', () => {
  it('entfernt Markup aus rohen Feed-Beschreibungen', () => {
    expect(plainText('<p>In der <b>heutigen</b> Folge</p>')).toBe('In der heutigen Folge');
  });

  it('löst die üblichen Entities auf', () => {
    expect(plainText('Thorsten &amp; Zetti &quot;live&quot;')).toBe('Thorsten & Zetti "live"');
  });

  it('drückt Zeilenumbrüche und Mehrfach-Leerzeichen zusammen', () => {
    expect(plainText('a\n\n   b')).toBe('a b');
  });

  it('lässt Text ohne Markup unverändert', () => {
    expect(plainText('Keine Angst')).toBe('Keine Angst');
  });
});

function entry(kind: HistoryRecord['kind']): HistoryRecord {
  return { id: kind, direction: 'out', amount: 10, at: 0, status: 'gesendet', kind };
}

describe('Verlauf: die drei Arten aus Entwurf 4a', () => {
  it('nennt Streaming und Boost gleichermassen Nutzap gesendet', () => {
    expect(transactionType(entry('streaming'))).toBe('Nutzap gesendet');
    expect(transactionType(entry('boost'))).toBe('Nutzap gesendet');
  });

  it('nennt einen Import Aufgeladen und einen Export Token exportiert', () => {
    expect(transactionType(entry('import'))).toBe('Aufgeladen');
    expect(transactionType(entry('export'))).toBe('Token exportiert');
  });

  it('filtert Nutzaps unabhängig davon, ob sie aus Streaming oder Boost stammen', () => {
    expect(matchesFilter(entry('streaming'), 'nutzap')).toBe(true);
    expect(matchesFilter(entry('boost'), 'nutzap')).toBe(true);
    expect(matchesFilter(entry('import'), 'nutzap')).toBe(false);
  });

  it('lässt bei Alle jede Art durch', () => {
    for (const kind of ['streaming', 'boost', 'import', 'export'] as const) {
      expect(matchesFilter(entry(kind), 'alle')).toBe(true);
    }
  });
});

describe('Entwurf 4b: der Knopf trägt die zahlbare Summe', () => {
  it('zählt nur Anteile mit Nutzap-Adresse', () => {
    const split = [
      { name: 'Host', amount: 475, hasNutzapAddress: true },
      { name: 'Gast', amount: 25, hasNutzapAddress: false },
    ];
    // Der Entwurf nennt genau diesen Fall: gewählt sind 500, gesendet werden 475.
    expect(payableTotal(split)).toBe(475);
  });

  it('ist null, wenn kein Empfänger eine Adresse hat', () => {
    expect(payableTotal([{ name: 'Gast', amount: 100, hasNutzapAddress: false }])).toBe(0);
  });

  it('entspricht dem vollen Betrag, wenn alle zahlbar sind', () => {
    expect(payableTotal([{ name: 'Host', amount: 210, hasNutzapAddress: true }])).toBe(210);
  });
});
