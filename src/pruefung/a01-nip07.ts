/**
 * Prüfseite für A-01: Signiert die NIP-07-Extension nach einmaliger dauerhafter
 * Freigabe wiederholt ohne weitere Interaktion?
 *
 * Die Seite kann ein Extension-Fenster nicht selbst erkennen. Sie misst die Dauer
 * jeder Signatur; ein Freigabedialog macht sich als lange Dauer bemerkbar.
 * Das Urteil fällt der Mensch, siehe docs/manuelle-tests.md.
 */
import { getProvider, type UnsignedNostrEvent } from './nip07.js';

const out = document.getElementById('out') as HTMLElement;
const status = document.getElementById('status') as HTMLElement;

function line(text: string): void {
  const row = document.createElement('div');
  row.textContent = text;
  out.appendChild(row);
}

function probeEvent(index: number): UnsignedNostrEvent {
  return {
    kind: 9321,
    created_at: Math.floor(Date.now() / 1000),
    tags: [['t', 'a01-probe']],
    content: `A-01 Probe ${index}`,
  };
}

function detect(): void {
  const provider = getProvider();
  status.textContent = provider
    ? 'window.nostr gefunden.'
    : 'window.nostr fehlt. Extension installieren (nos2x oder Alby) und Seite neu laden.';
}

async function getPubkey(): Promise<void> {
  const provider = getProvider();
  if (!provider) return;
  const started = performance.now();
  try {
    const pubkey = await provider.getPublicKey();
    line(`getPublicKey: ${pubkey} (${Math.round(performance.now() - started)} ms)`);
  } catch (error) {
    line(`getPublicKey abgelehnt oder fehlgeschlagen: ${String(error)}`);
  }
}

async function signSeries(count: number, gapSeconds: number): Promise<void> {
  const provider = getProvider();
  if (!provider) return;
  line(`--- Serie: ${count} Signaturen im Abstand von ${gapSeconds} s ---`);
  for (let index = 1; index <= count; index++) {
    const started = performance.now();
    try {
      await provider.signEvent(probeEvent(index));
      const elapsed = Math.round(performance.now() - started);
      const verdict = elapsed < 500 ? 'ohne Interaktion' : 'auffällig langsam — Fenster?';
      line(`Signatur ${index}: ${elapsed} ms — ${verdict}`);
    } catch (error) {
      line(`Signatur ${index} fehlgeschlagen: ${String(error)}`);
      return;
    }
    if (index < count) {
      await new Promise((resolve) => setTimeout(resolve, gapSeconds * 1000));
    }
  }
  line('--- Serie beendet ---');
}

detect();
document.getElementById('pubkey')?.addEventListener('click', () => void getPubkey());
document.getElementById('quick')?.addEventListener('click', () => void signSeries(3, 5));
document.getElementById('realistic')?.addEventListener('click', () => void signSeries(3, 60));
