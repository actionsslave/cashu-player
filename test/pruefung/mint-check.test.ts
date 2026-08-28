import { describe, expect, it } from 'vitest';
import { summarizeMint } from '../../src/pruefung/mint-check.js';

const info = (nuts: Record<string, { supported: boolean }>) => ({
  name: 'Testmint',
  version: 'Nutshell/0.16',
  nuts,
});

describe('Mint-Prüfung (A-02, A-05)', () => {
  it('A-02: erkennt NUT-11 und NUT-12 als unterstützt', () => {
    const summary = summarizeMint(info({ '11': { supported: true }, '12': { supported: true } }), []);
    expect(summary.nut11).toBe(true);
    expect(summary.nut12).toBe(true);
  });

  it('A-02: erkennt fehlende NUT-11-Unterstützung', () => {
    const summary = summarizeMint(info({ '12': { supported: true } }), []);
    expect(summary.nut11).toBe(false);
  });

  it('A-02: wertet supported:false als nicht unterstützt', () => {
    const summary = summarizeMint(info({ '11': { supported: false } }), []);
    expect(summary.nut11).toBe(false);
  });

  it('A-05: meldet ein Keyset mit Fees als nicht fee-frei', () => {
    const summary = summarizeMint(info({}), [
      { id: 'a', unit: 'sat', active: true, input_fee_ppk: 100 },
    ]);
    expect(summary.feeFree).toBe(false);
    expect(summary.maxInputFeePpk).toBe(100);
  });

  it('A-05: aktive sat-Keysets ohne Fee gelten als fee-frei', () => {
    const summary = summarizeMint(info({}), [
      { id: 'a', unit: 'sat', active: true, input_fee_ppk: 0 },
      { id: 'b', unit: 'sat', active: false, input_fee_ppk: 500 },
    ]);
    expect(summary.feeFree).toBe(true);
  });

  it('A-05: fehlendes input_fee_ppk zählt als 0', () => {
    const summary = summarizeMint(info({}), [{ id: 'a', unit: 'sat', active: true }]);
    expect(summary.feeFree).toBe(true);
  });

  it('nennt Name und Version des Mints für den Prüfbericht', () => {
    const summary = summarizeMint(info({}), []);
    expect(summary.name).toBe('Testmint');
    expect(summary.version).toBe('Nutshell/0.16');
  });
});
