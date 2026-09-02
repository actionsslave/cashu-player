import { render } from 'preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SessionColumn,
  isLowBalance,
  streamingStopsAt,
} from '../../src/ui/session-column.js';
import type { StreamingState } from '../../src/payments/streaming.js';
import { clickButton, flush } from '../helpers/ui.js';

let host: HTMLDivElement;

const LAUFEND: StreamingState = {
  sentSats: 40,
  sentZaps: 4,
  pendingSats: 6.4,
  totalListenedSeconds: 277,
  stopped: false,
};

const onSignIn = vi.fn();
const onGoToWallet = vi.fn();

async function mount(props: Record<string, unknown> = {}) {
  render(
    <SessionColumn
      loggedIn
      balance={412}
      streaming={LAUFEND}
      ratePerMinute={10}
      positionSeconds={847}
      onSignIn={onSignIn}
      onGoToWallet={onGoToWallet}
      {...props}
    />,
    host,
  );
  await flush();
}

beforeEach(() => {
  onSignIn.mockClear();
  onGoToWallet.mockClear();
  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(() => {
  render(null, host);
  host.remove();
});

describe('Entwurf 1a: laufende Sitzung', () => {
  it('FR-30: zeigt Zähler, Anzahl der Nutzaps und den offenen Rest', async () => {
    await mount();
    const text = host.textContent ?? '';
    expect(text).toContain('40');
    expect(text).toContain('in 4 Nutzaps gesendet');
    // 6,4 Sat offener Rest werden als volle 6 Sat ausgewiesen.
    expect(text).toContain('6 Sat ausstehend');
  });

  it('FR-25: nennt die Regel für Beträge unter 1 Sat', async () => {
    await mount();
    expect(host.textContent).toContain('Unter 1 Sat');
  });

  it('nennt einen einzelnen Nutzap im Singular', async () => {
    await mount({ streaming: { ...LAUFEND, sentZaps: 1 } });
    expect(host.textContent).toContain('in 1 Nutzap gesendet');
  });

  it('verschweigt den offenen Rest, solange er unter 1 Sat liegt', async () => {
    await mount({ streaming: { ...LAUFEND, pendingSats: 0.4 } });
    expect(host.textContent).not.toContain('ausstehend');
  });
});

describe('Entwurf 3c: nicht angemeldet', () => {
  it('fordert zur Anmeldung auf, ohne von einem Fehler zu sprechen', async () => {
    await mount({ loggedIn: false });
    expect(host.textContent).toContain('Nicht angemeldet');
    expect(host.querySelector('.kicker-magenta')).toBeNull();
  });

  it('meldet den Anmeldewunsch nach oben', async () => {
    await mount({ loggedIn: false });
    await clickButton(host, 'Anmelden');
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });
});

describe('Entwurf 3a: kein Empfänger', () => {
  it('US-07-AC-1: nennt den Grund und hält die Wiedergabe ausdrücklich offen', async () => {
    await mount({ blockedReason: 'Der Feed enthält keine nostr-Identität.' });
    expect(host.textContent).toContain('Der Feed enthält keine nostr-Identität.');
    expect(host.textContent).toContain('Die Wiedergabe läuft');
  });

  it('zeigt keinen Sitzungszähler, solange nichts gezahlt werden kann', async () => {
    await mount({ blockedReason: 'Kein Empfänger.' });
    expect(host.querySelector('.counter')).toBeNull();
  });
});

describe('Entwurf 3b: Guthaben geht zur Neige', () => {
  it('FR-20: nennt den Zeitpunkt, an dem das Streaming endet', async () => {
    // 15 Sat bei 10 Sat/min = 1,5 min ab Position 00:14:07 → 00:15:37.
    await mount({ balance: 15, positionSeconds: 847 });
    expect(host.textContent).toContain('00:15:37');
    expect(host.textContent).toContain('Die Wiedergabe läuft weiter');
  });

  it('führt zur Wallet', async () => {
    await mount({ balance: 15 });
    await clickButton(host, 'Aufladen');
    expect(onGoToWallet).toHaveBeenCalledTimes(1);
  });
});

describe('Schwelle und Restzeit', () => {
  it('isLowBalance greift unter rund zwei Minuten Streaming', () => {
    expect(isLowBalance(15, 10)).toBe(true);
    expect(isLowBalance(25, 10)).toBe(false);
  });

  it('isLowBalance ist ohne Satz bedeutungslos', () => {
    expect(isLowBalance(0, 0)).toBe(false);
  });

  it('streamingStopsAt rechnet Guthaben durch Satz auf die Hörposition', () => {
    expect(streamingStopsAt(847, 15, 10)).toBe('00:15:37');
  });

  it('streamingStopsAt liefert ohne Satz keinen Zeitpunkt', () => {
    expect(streamingStopsAt(847, 15, 0)).toBeUndefined();
  });
});
