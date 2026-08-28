import { render } from 'preact';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { QrCode, toQrMatrix } from '../../src/ui/qr-code.js';

let host: HTMLDivElement;

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(() => {
  render(null, host);
  host.remove();
});

describe('FR-16: Export als QR-Code', () => {
  it('erzeugt eine quadratische Modul-Matrix', () => {
    const matrix = toQrMatrix('cashuBtest');
    expect(matrix.length).toBeGreaterThan(20);
    expect(matrix.every((row) => row.length === matrix.length)).toBe(true);
  });

  it('wächst mit der Länge des Tokens', () => {
    const klein = toQrMatrix('cashuB' + 'x'.repeat(20));
    const gross = toQrMatrix('cashuB' + 'x'.repeat(600));
    expect(gross.length).toBeGreaterThan(klein.length);
  });

  it('rendert ein SVG mit so vielen Zeilen wie Modulen', () => {
    render(<QrCode value="cashuBtest" />, host);
    const svg = host.querySelector('svg');
    expect(svg).not.toBeNull();
    const matrix = toQrMatrix('cashuBtest');
    expect(svg?.getAttribute('viewBox')).toBe(`0 0 ${matrix.length} ${matrix.length}`);
  });

  it('rendert nichts für einen leeren Wert', () => {
    render(<QrCode value="" />, host);
    expect(host.querySelector('svg')).toBeNull();
  });
});
