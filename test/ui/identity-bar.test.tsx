import { render } from 'preact';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { npubEncode } from 'nostr-tools/nip19';
import { closeDatabase } from '../../src/db/database.js';
import { resetDatabase } from '../helpers/db.js';
import { clickButton, flush } from '../helpers/ui.js';
import { IdentityBar } from '../../src/ui/identity-bar.js';

const PUBKEY_HEX = '3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d';
const NPUB = npubEncode(PUBKEY_HEX);

let host: HTMLDivElement;

const click = (label: string) => clickButton(host, label);

beforeEach(async () => {
  await resetDatabase();
  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(async () => {
  render(null, host);
  host.remove();
  delete (window as { nostr?: unknown }).nostr;
  await closeDatabase();
});

describe('FR-01: Hinweis ohne Extension', () => {
  it('US-01-AC-3: nennt zwei Extensions, wenn window.nostr fehlt', async () => {
    render(<IdentityBar />, host);
    await flush();
    await click('Mit nostr anmelden');
    expect(host.textContent).toContain('nos2x');
    expect(host.textContent).toContain('Alby');
  });
});

describe('FR-02: Anmelden', () => {
  it('US-01-AC-1: zeigt den npub nach der Anmeldung in gekürzter Form', async () => {
    (window as { nostr?: unknown }).nostr = { getPublicKey: async () => PUBKEY_HEX };
    render(<IdentityBar />, host);
    await flush();
    await click('Mit nostr anmelden');
    expect(host.textContent).toContain(NPUB.slice(0, 10));
    expect(host.textContent).not.toContain(NPUB);
  });

  it('US-01-AC-2: stellt eine bestehende Session ohne Freigabeabfrage wieder her', async () => {
    (window as { nostr?: unknown }).nostr = { getPublicKey: async () => PUBKEY_HEX };
    render(<IdentityBar />, host);
    await flush();
    await click('Mit nostr anmelden');

    render(null, host);
    delete (window as { nostr?: unknown }).nostr;
    render(<IdentityBar />, host);
    await flush();

    expect(host.textContent).toContain(NPUB.slice(0, 10));
  });

  it('US-01-AC-4: eine abgelehnte Freigabe zeigt "Anmeldung abgebrochen"', async () => {
    (window as { nostr?: unknown }).nostr = {
      getPublicKey: async () => {
        throw new Error('rejected');
      },
    };
    render(<IdentityBar />, host);
    await flush();
    await click('Mit nostr anmelden');
    expect(host.textContent).toContain('Anmeldung abgebrochen');
  });
});

describe('FR-06: Abmelden', () => {
  it('weist im Bestätigungsdialog darauf hin, dass die Wallet erhalten bleibt', async () => {
    (window as { nostr?: unknown }).nostr = { getPublicKey: async () => PUBKEY_HEX };
    render(<IdentityBar />, host);
    await flush();
    await click('Mit nostr anmelden');
    await click('Abmelden');
    expect(host.textContent).toMatch(/Wallet bleibt erhalten/i);
  });

  it('meldet erst nach Bestätigung ab', async () => {
    (window as { nostr?: unknown }).nostr = { getPublicKey: async () => PUBKEY_HEX };
    render(<IdentityBar />, host);
    await flush();
    await click('Mit nostr anmelden');
    await click('Abmelden');
    expect(host.textContent).toContain(NPUB.slice(0, 10));

    await click('Ja, abmelden');
    expect(host.textContent).toContain('Mit nostr anmelden');
  });
});
