import { render } from 'preact';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { closeDatabase } from '../../src/db/database.js';
import { LocalWallet } from '../../src/wallet/local-wallet.js';
import { WalletPanel } from '../../src/ui/wallet-panel.js';
import { resetDatabase } from '../helpers/db.js';
import { clickButton, flush } from '../helpers/ui.js';
import { encodeToken, fakeGateway, freshProofs } from '../helpers/mint.js';
import { seedProofs } from '../helpers/proofs.js';

const ERLAUBT = 'https://mint-a.example';
const FREMD = 'https://fremder-mint.example';

let host: HTMLDivElement;

function mount(wallet: LocalWallet) {
  render(<WalletPanel wallet={wallet} />, host);
  return flush();
}

async function typeToken(value: string): Promise<void> {
  const field = host.querySelector('textarea') as HTMLTextAreaElement;
  field.value = value;
  field.dispatchEvent(new Event('input', { bubbles: true }));
  await flush();
}

function makeWallet(options = {}) {
  return new LocalWallet({
    gateway: fakeGateway({ received: freshProofs(ERLAUBT, [500]), ...options }),
    allowedMints: [ERLAUBT],
  });
}

beforeEach(async () => {
  await resetDatabase();
  Object.defineProperty(navigator, 'storage', {
    value: { persisted: async () => false, persist: async () => true },
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

describe('FR-15: Guthaben anzeigen', () => {
  it('zeigt das Guthaben gross auf der Seite, mit der Einheit daneben', async () => {
    await seedProofs([500]);
    await mount(makeWallet());
    // Entwurf 1d: die Zahl ist die Seite, "Sat" steht als eigener Block daneben.
    expect(host.querySelector('.balance-amount')?.textContent).toBe('500');
    expect(host.querySelector('.balance-unit')?.textContent).toContain('Sat');
  });
});

describe('FR-16: Sicherung', () => {
  it('warnt vor der ersten Aufladung, dass Löschen der Website-Daten das Guthaben vernichtet', async () => {
    await mount(makeWallet());
    expect(host.textContent).toMatch(/Website-Daten/i);
    expect(host.textContent).toMatch(/vernichtet|verloren/i);
  });

  it('US-04-AC-3: zeigt beim Export einen Cashu-Token als Text', async () => {
    await seedProofs([500]);
    await mount(makeWallet());
    await clickButton(host, 'Guthaben exportieren');
    const output = host.querySelector('.export-token')?.textContent ?? '';
    expect(output.startsWith('cashu')).toBe(true);
  });

  it('US-04-AC-3: zeigt denselben Token zusätzlich als QR-Code', async () => {
    await seedProofs([500]);
    await mount(makeWallet());
    await clickButton(host, 'Guthaben exportieren');
    expect(host.querySelector('svg.qr')).not.toBeNull();
  });
});

describe('FR-17: Aufladen', () => {
  it('US-04-AC-1: erhöht das angezeigte Guthaben nach dem Import', async () => {
    await mount(makeWallet());
    await typeToken(encodeToken(ERLAUBT, [500]));
    await clickButton(host, 'Aufladen');
    expect(host.textContent).toContain('500 Sat');
  });

  it('US-04-AC-4: nennt den Mint, der nicht in der erlaubten Liste steht', async () => {
    await mount(makeWallet());
    await typeToken(encodeToken(FREMD, [10]));
    await clickButton(host, 'Aufladen');
    expect(host.textContent).toContain(FREMD);
  });

  it('US-04-AC-5: lässt den Token im Eingabefeld, wenn der Mint nicht erreichbar ist', async () => {
    await mount(makeWallet({ unreachable: true }));
    const token = encodeToken(ERLAUBT, [10]);
    await typeToken(token);
    await clickButton(host, 'Aufladen');

    expect(host.textContent).toMatch(/Mint/i);
    expect((host.querySelector('textarea') as HTMLTextAreaElement).value).toBe(token);
  });

  it('leert das Eingabefeld nach einem erfolgreichen Import', async () => {
    await mount(makeWallet());
    await typeToken(encodeToken(ERLAUBT, [500]));
    await clickButton(host, 'Aufladen');
    expect((host.querySelector('textarea') as HTMLTextAreaElement).value).toBe('');
  });
});

describe('FR-18: Speichermodus', () => {
  it('zeigt nach dem ersten Aufladen "dauerhaft" oder "best effort"', async () => {
    await mount(makeWallet());
    await typeToken(encodeToken(ERLAUBT, [500]));
    await clickButton(host, 'Aufladen');
    expect(host.textContent).toMatch(/dauerhaft|best effort/);
  });
});

describe('FR-19: Verlauf', () => {
  it('zeigt den Eingang nach einem Import mit Betrag', async () => {
    await mount(makeWallet());
    await typeToken(encodeToken(ERLAUBT, [500]));
    await clickButton(host, 'Aufladen');
    const history = host.querySelector('.history-block')?.textContent ?? '';
    expect(history).toContain('500');
    // FR-19: Richtung, Art und Status stehen als eigene Spalten in der Tabelle.
    expect(history).toContain('+500 Sat');
    expect(history).toContain('Aufladung');
  });
});

describe('FR-17: welche Mints akzeptiert werden', () => {
  it('nennt die oeffentlichen Mints beim Aufladen', async () => {
    await mount(makeWallet());
    const liste = host.querySelector('.accepted-mints')?.textContent ?? '';

    expect(liste).toContain('mint.minibits.cash');
    expect(liste).toContain('mint.macadamia.cash');
  });

  it('blendet die Entwicklungs-Mints aus', async () => {
    await mount(makeWallet());
    // Niemand soll auf die Idee kommen, Testnetz-Geld zu schicken.
    expect(host.textContent).not.toContain('testnut');
  });

  it('zeigt die Mints ohne das https-Praefix, aber mit Pfad', async () => {
    await mount(makeWallet());
    const eintraege = [...host.querySelectorAll('.accepted-mints li')].map((n) =>
      n.textContent?.trim(),
    );
    expect(eintraege).toEqual(['mint.minibits.cash/Bitcoin', 'mint.macadamia.cash']);
  });
});
