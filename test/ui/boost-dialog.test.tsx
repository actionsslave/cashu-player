import { render } from 'preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BoostDialog } from '../../src/ui/boost-dialog.js';
import { BOOST_PRESETS_SATS } from '../../src/config/build-config.js';
import { clickButton, flush } from '../helpers/ui.js';

let host: HTMLDivElement;

const onSend = vi.fn(async () => undefined);
const onCancel = vi.fn();

async function mount(props: Record<string, unknown> = {}) {
  render(
    <BoostDialog
      balance={5000}
      positionSeconds={847}
      onSend={onSend}
      onCancel={onCancel}
      {...props}
    />,
    host,
  );
  await flush();
}

/** Der Sendeknopf traegt im Entwurf den Betrag: "210 Sat senden". */
const sendButton = () =>
  [...host.querySelectorAll('button')].find((b) => b.textContent?.trim().endsWith('Sat senden'));

const clickSend = async () => {
  sendButton()?.click();
  await flush();
};

async function typeMessage(value: string): Promise<void> {
  const field = host.querySelector('textarea') as HTMLTextAreaElement;
  field.value = value;
  field.dispatchEvent(new Event('input', { bubbles: true }));
  await flush();
}

async function typeAmount(value: string): Promise<void> {
  const field = host.querySelector('input[name="boost-amount"]') as HTMLInputElement;
  field.value = value;
  field.dispatchEvent(new Event('input', { bubbles: true }));
  await flush();
}

beforeEach(() => {
  onSend.mockClear();
  onCancel.mockClear();
  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(() => {
  render(null, host);
  host.remove();
});

describe('FR-28: Boost mit Betrag und Nachricht', () => {
  it('bietet genau die konfigurierten Vorgabebetraege an', async () => {
    await mount({ balance: 50_000 });
    const labels = [...host.querySelectorAll('.boost-presets button')].map((b) =>
      b.textContent?.trim(),
    );
    expect(labels).toEqual(BOOST_PRESETS_SATS.map((p) => p.toLocaleString('de-DE')));
  });

  it('US-06-AC-2: sperrt Vorgaben oberhalb des Guthabens', async () => {
    await mount({ balance: 300 });
    const buttons = [...host.querySelectorAll('.boost-presets button')] as HTMLButtonElement[];
    // 210 ist bezahlbar, 2 100 / 4 200 / 21 000 nicht.
    expect(buttons.map((b) => b.disabled)).toEqual([false, true, true, true]);
  });

  it('US-06-AC-1: sendet den gewählten Betrag mit Nachricht und Zeitmarke', async () => {
    await mount();
    await clickButton(host, '2.100');
    await typeMessage('Starke Folge');
    await clickSend();

    expect(onSend).toHaveBeenCalledWith(2100, 'Starke Folge 00:14:07');
  });

  it('hängt die Zeitmarke auch ohne Nachricht an', async () => {
    await mount();
    await clickButton(host, '210');
    await clickSend();

    expect(onSend).toHaveBeenCalledWith(210, '00:14:07');
  });

  it('nimmt einen frei eingegebenen Betrag an', async () => {
    await mount();
    await typeAmount('333');
    await clickSend();

    expect(onSend).toHaveBeenCalledWith(333, '00:14:07');
  });
});

describe('US-06-AC-5: Nachrichtenlänge', () => {
  it('verhindert mehr als 280 Zeichen', async () => {
    await mount();
    await typeMessage('x'.repeat(400));
    const field = host.querySelector('textarea') as HTMLTextAreaElement;
    expect(field.value.length).toBe(280);
  });

  it('zeigt die verbleibende Länge an', async () => {
    await mount();
    await typeMessage('x'.repeat(80));
    expect(host.textContent).toContain('200');
  });
});

describe('US-06-AC-2: zu wenig Guthaben', () => {
  it('deaktiviert den Sendeknopf', async () => {
    await mount({ balance: 500 });
    await typeAmount('1000');
    expect(sendButton()?.disabled).toBe(true);
  });

  it('zeigt das verfügbare Guthaben', async () => {
    await mount({ balance: 500 });
    expect(host.textContent).toContain('500 Sat');
  });

  it('lässt einen Betrag genau in Höhe des Guthabens zu', async () => {
    await mount({ balance: 500 });
    await typeAmount('500');
    expect(sendButton()?.disabled).toBe(false);
  });

  it('deaktiviert den Sendeknopf bei Betrag 0', async () => {
    await mount();
    await typeAmount('0');
    expect(sendButton()?.disabled).toBe(true);
  });
});

describe('US-06-AC-3: Abbrechen', () => {
  it('sendet nichts', async () => {
    await mount();
    await clickButton(host, '210');
    await clickButton(host, 'Abbrechen');

    expect(onSend).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
