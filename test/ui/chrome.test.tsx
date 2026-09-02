import { render } from 'preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Chrome } from '../../src/ui/chrome.js';
import { clickButton, flush } from '../helpers/ui.js';

let host: HTMLDivElement;
const onRoute = vi.fn();

async function mount(props: Record<string, unknown> = {}) {
  render(<Chrome route="listen" onRoute={onRoute} balance={412} {...props} />, host);
  await flush();
}

beforeEach(() => {
  onRoute.mockClear();
  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(() => {
  render(null, host);
  host.remove();
});

describe('Layout-Rahmen aus dem Handoff', () => {
  it('trägt Mastkopf-Linie, Marke und Haarlinie', async () => {
    await mount();
    expect(host.querySelector('.masthead-rule')).not.toBeNull();
    expect(host.querySelector('.nav-brand')?.textContent).toBe('Cashu Player');
    expect(host.querySelector('.nav-hairline')).not.toBeNull();
  });

  it('kennzeichnet die aktive Route mit aria-current', async () => {
    await mount({ route: 'wallet' });
    const aktiv = host.querySelector('[aria-current="page"]');
    expect(aktiv?.textContent).toBe('Wallet');
  });

  it('meldet einen Routenwechsel nach oben', async () => {
    await mount();
    await clickButton(host, 'Einstellungen');
    expect(onRoute).toHaveBeenCalledWith('settings');
  });

  it('zeigt das Guthaben in der Zeile', async () => {
    await mount();
    expect(host.querySelector('.nav-balance')?.textContent).toBe('412 Sat');
  });

  it('lässt das Guthaben weg, wo die Seite es selbst trägt', async () => {
    // Entwurf 1d: auf der Wallet-Route ist das Guthaben die Seite.
    await mount({ balance: undefined });
    expect(host.querySelector('.nav-balance')).toBeNull();
  });

  it('3b: hebt ein knappes Guthaben in der Zeile hervor', async () => {
    await mount({ balance: 18, lowBalance: true });
    expect(host.querySelector('.nav-balance')?.classList.contains('low')).toBe(true);
  });
});
