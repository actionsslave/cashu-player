import { render } from 'preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PaymentsPanel } from '../../src/ui/payments-panel.js';
import type { PaymentCapability } from '../../src/payments/capability.js';
import type { StreamingState } from '../../src/payments/streaming.js';
import { clickButton, flush } from '../helpers/ui.js';

let host: HTMLDivElement;

const FREI: PaymentCapability = {
  canSubscribe: true,
  canPlay: true,
  canStream: true,
  canBoost: true,
};

const STATE: StreamingState = {
  sentSats: 0,
  pendingSats: 0,
  totalListenedSeconds: 0,
  stopped: false,
};

const onConfirmRate = vi.fn(async () => undefined);
const onBoost = vi.fn(async () => undefined);

async function mount(props: Record<string, unknown> = {}) {
  render(
    <PaymentsPanel
      capability={FREI}
      streaming={STATE}
      rate={10}
      rateConfirmed={true}
      balance={5000}
      positionSeconds={847}
      onConfirmRate={onConfirmRate}
      onBoost={onBoost}
      {...props}
    />,
    host,
  );
  await flush();
}

beforeEach(() => {
  onConfirmRate.mockClear();
  onBoost.mockClear();
  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(() => {
  render(null, host);
  host.remove();
});

describe('US-05-AC-6: einmalige Bestätigung des Satzes', () => {
  it('fragt den Satz ab, solange er nicht bestätigt ist', async () => {
    await mount({ rateConfirmed: false });
    expect(host.textContent).toMatch(/Sat pro Minute/i);
    expect(host.querySelector('input[name="rate"]')).not.toBeNull();
  });

  it('FR-04: erklärt, dass die Freigabe in der Extension dauerhaft sein muss', async () => {
    await mount({ rateConfirmed: false });
    expect(host.textContent).toMatch(/dauerhaft/i);
  });

  it('übergibt den bestätigten Satz', async () => {
    await mount({ rateConfirmed: false });
    const field = host.querySelector('input[name="rate"]') as HTMLInputElement;
    field.value = '21';
    field.dispatchEvent(new Event('input', { bubbles: true }));
    await flush();
    await clickButton(host, 'Satz bestätigen');

    expect(onConfirmRate).toHaveBeenCalledWith(21);
  });

  it('fragt nach der Bestätigung nicht erneut', async () => {
    await mount({ rateConfirmed: true });
    expect(host.querySelector('input[name="rate"]')).toBeNull();
  });
});

describe('FR-30: Rückmeldung im Player', () => {
  it('US-05-AC-1: zeigt den Sitzungszähler der gesendeten Sat', async () => {
    await mount({ streaming: { ...STATE, sentSats: 30 } });
    expect(host.textContent).toContain('30 Sat');
  });

  it('zeigt den Grund, wenn eine Zahlung scheitert', async () => {
    await mount({ streaming: { ...STATE, reason: 'Kein Relay erreichbar' } });
    expect(host.textContent).toContain('Kein Relay erreichbar');
  });

  it('US-06-AC-1: bestätigt einen erfolgreichen Boost', async () => {
    await mount();
    await clickButton(host, 'Boost');
    await clickButton(host, 'Boost senden');

    expect(onBoost).toHaveBeenCalled();
    expect(host.textContent).toMatch(/gesendet/i);
  });

  it('zeigt den Fehlergrund eines gescheiterten Boosts', async () => {
    await mount({
      onBoost: vi.fn(async () => {
        throw new Error('Kein Relay hat bestätigt.');
      }),
    });
    await clickButton(host, 'Boost');
    await clickButton(host, 'Boost senden');

    expect(host.textContent).toContain('Kein Relay hat bestätigt.');
  });
});

describe('FR-23: gesperrte Zahlungen', () => {
  it('US-07-AC-1: nennt den Grund und lässt Boost nicht zu', async () => {
    await mount({
      capability: {
        ...FREI,
        canStream: false,
        canBoost: false,
        reason: 'Der Feed enthält keine nostr-Identität.',
      },
    });

    expect(host.textContent).toContain('Der Feed enthält keine nostr-Identität.');
    const boost = [...host.querySelectorAll('button')].find((b) => b.textContent === 'Boost');
    expect(boost?.disabled).toBe(true);
  });

  it('fragt den Satz nicht ab, solange Zahlungen gesperrt sind', async () => {
    await mount({
      rateConfirmed: false,
      capability: { ...FREI, canStream: false, canBoost: false, reason: 'Login erforderlich' },
    });
    expect(host.querySelector('input[name="rate"]')).toBeNull();
  });
});
