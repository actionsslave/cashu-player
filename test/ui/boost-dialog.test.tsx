import { render } from 'preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BoostDialog } from '../../src/ui/boost-dialog.js';
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

const sendButton = () =>
  [...host.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Boost senden');

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
  it('bietet die vier Vorgabebeträge an', async () => {
    await mount();
    const labels = [...host.querySelectorAll('button')].map((b) => b.textContent?.trim());
    for (const preset of ['100', '1000', '5000', '21000']) {
      expect(labels.some((label) => label?.startsWith(preset))).toBe(true);
    }
  });

  it('US-06-AC-1: sendet den gewählten Betrag mit Nachricht und Zeitmarke', async () => {
    await mount();
    await clickButton(host, '1000');
    await typeMessage('Starke Folge');
    await clickButton(host, 'Boost senden');

    expect(onSend).toHaveBeenCalledWith(1000, 'Starke Folge 00:14:07');
  });

  it('hängt die Zeitmarke auch ohne Nachricht an', async () => {
    await mount();
    await clickButton(host, '100');
    await clickButton(host, 'Boost senden');

    expect(onSend).toHaveBeenCalledWith(100, '00:14:07');
  });

  it('nimmt einen frei eingegebenen Betrag an', async () => {
    await mount();
    await typeAmount('333');
    await clickButton(host, 'Boost senden');

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
    await clickButton(host, '1000');
    await clickButton(host, 'Abbrechen');

    expect(onSend).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
