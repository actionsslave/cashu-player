import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { closeDatabase, openDatabase } from '../../src/db/database.js';
import { InsufficientFundsError, type ResolvedPaymentTarget } from '../../src/contracts/index.js';
import { LocalWallet } from '../../src/wallet/local-wallet.js';
import { MintUnreachableError } from '../../src/wallet/mint-gateway.js';
import { NoRelayError } from '../../src/payments/nostr-gateway.js';
import { sendNutzap } from '../../src/payments/pay.js';
import { listHistory } from '../../src/wallet/history.js';
import { resetDatabase } from '../helpers/db.js';
import { MINT_A, seedProofs } from '../helpers/proofs.js';
import { fakeGateway } from '../helpers/mint.js';
import { EMPFAENGER_HEX, EMPFAENGER_NPUB, P2PK_PUBKEY, fakeNostr } from '../helpers/nostr.js';
import type { SignedNostrEvent, UnsignedNostrEvent } from '../../src/identity/nip07.js';

const TARGET: ResolvedPaymentTarget = {
  status: 'resolved',
  npub: EMPFAENGER_NPUB,
  pubkeyHex: EMPFAENGER_HEX,
  p2pkPubkey: P2PK_PUBKEY,
  mints: [MINT_A],
  relays: ['wss://r1.example'],
  fetchedAt: 0,
};

const sign = vi.fn(
  async (event: UnsignedNostrEvent): Promise<SignedNostrEvent> => ({
    ...event,
    id: 'signiert',
    pubkey: 'sender',
    sig: 'sig',
  }),
);

function deps(overrides: Partial<Parameters<typeof sendNutzap>[1]> = {}) {
  return {
    wallet: new LocalWallet(),
    mintGateway: fakeGateway(),
    nostr: fakeNostr(),
    signEvent: sign,
    ...overrides,
  } as Parameters<typeof sendNutzap>[1];
}

beforeEach(async () => {
  await resetDatabase();
  sign.mockClear();
});

afterEach(async () => {
  await closeDatabase();
});

describe('FR-29: erfolgreicher Ablauf', () => {
  it('bucht den Betrag ab und meldet die bestätigenden Relays', async () => {
    await seedProofs([64]);
    const d = deps();

    const result = await sendNutzap({ target: TARGET, amount: 10, kind: 'boost' }, d);

    expect(result.status).toBe('gesendet');
    expect(result.acceptedBy).toEqual(['wss://relay-empfaenger.example']);
    await expect(d.wallet.balance()).resolves.toBe(54);
  });

  it('FR-27: publiziert ein kind:9321 mit den gelockten Proofs', async () => {
    await seedProofs([64]);
    const nostr = fakeNostr();
    await sendNutzap({ target: TARGET, amount: 10, kind: 'boost' }, deps({ nostr }));

    const event = nostr.published[0];
    expect(event.kind).toBe(9321);
    expect(event.tags.filter((tag) => tag[0] === 'proof').length).toBeGreaterThan(0);
    expect(event.tags).toContainEqual(['u', MINT_A]);
    expect(event.tags).toContainEqual(['p', EMPFAENGER_HEX]);
  });

  it('FR-27: lockt beim Mint auf den Schlüssel mit 02-Präfix', async () => {
    await seedProofs([64]);
    const mintGateway = fakeGateway();
    const send = vi.spyOn(mintGateway, 'send');

    await sendNutzap({ target: TARGET, amount: 10, kind: 'boost' }, deps({ mintGateway }));

    expect(send.mock.calls[0][3]).toBe(`02${P2PK_PUBKEY}`);
  });

  it('signiert über die Extension', async () => {
    await seedProofs([64]);
    await sendNutzap({ target: TARGET, amount: 10, kind: 'boost' }, deps());
    expect(sign).toHaveBeenCalledTimes(1);
  });

  it('FR-19: schreibt Podcast und Episode in den Verlauf', async () => {
    await seedProofs([64]);
    await sendNutzap(
      {
        target: TARGET,
        amount: 10,
        kind: 'streaming',
        feedTitle: 'Testpodcast',
        episodeTitle: 'Folge 2',
      },
      deps(),
    );

    const [entry] = await listHistory();
    expect(entry).toMatchObject({
      direction: 'out',
      amount: 10,
      kind: 'streaming',
      status: 'gesendet',
      feedTitle: 'Testpodcast',
      episodeTitle: 'Folge 2',
    });
  });

  it('FR-28: übergibt die Nachricht als content', async () => {
    await seedProofs([1024]);
    const nostr = fakeNostr();
    await sendNutzap(
      { target: TARGET, amount: 1000, kind: 'boost', content: 'Starke Folge 00:14:07' },
      deps({ nostr }),
    );
    expect(nostr.published[0].content).toBe('Starke Folge 00:14:07');
  });
});

describe('FR-29: Abbruch vor dem Mint-Swap', () => {
  it('US-06-AC-4: kein erreichbares Relay lässt das Guthaben vollständig stehen', async () => {
    await seedProofs([64]);
    const d = deps({ nostr: fakeNostr({ connectFails: true }) });

    await expect(sendNutzap({ target: TARGET, amount: 10, kind: 'boost' }, d)).rejects.toBeInstanceOf(
      NoRelayError,
    );

    await expect(d.wallet.balance()).resolves.toBe(64);
    expect((await listHistory())[0]).toMatchObject({ status: 'fehlgeschlagen' });
  });

  it('zu wenig Guthaben bricht ab, ohne zu publizieren', async () => {
    await seedProofs([4]);
    const nostr = fakeNostr();

    await expect(
      sendNutzap({ target: TARGET, amount: 10, kind: 'boost' }, deps({ nostr })),
    ).rejects.toBeInstanceOf(InsufficientFundsError);

    expect(nostr.published).toEqual([]);
    expect((await listHistory())[0]).toMatchObject({ status: 'fehlgeschlagen' });
  });

  it('ein nicht erreichbarer Mint gibt die reservierten Proofs frei', async () => {
    await seedProofs([64]);
    const d = deps({ mintGateway: fakeGateway({ unreachable: true }) });

    await expect(
      sendNutzap({ target: TARGET, amount: 10, kind: 'boost' }, d),
    ).rejects.toBeInstanceOf(MintUnreachableError);

    await expect(d.wallet.balance()).resolves.toBe(64);
  });
});

describe('FR-29: Abbruch nach dem Mint-Swap', () => {
  it('legt den Nutzap in die Warteschlange, wenn kein Relay bestätigt', async () => {
    await seedProofs([64]);
    const d = deps({ nostr: fakeNostr({ acceptedBy: [] }) });

    const result = await sendNutzap({ target: TARGET, amount: 10, kind: 'boost' }, d);

    expect(result.status).toBe('ausstehend');
    const db = await openDatabase();
    const pending = await db.getAll('pendingNutzaps');
    expect(pending).toHaveLength(1);
    expect(pending[0].event.kind).toBe(9321);
    expect(pending[0].relays).toEqual(['wss://r1.example']);
  });

  it('protokolliert die Zahlung als ausstehend, nicht als gesendet', async () => {
    await seedProofs([64]);
    await sendNutzap(
      { target: TARGET, amount: 10, kind: 'boost' },
      deps({ nostr: fakeNostr({ acceptedBy: [] }) }),
    );
    expect((await listHistory())[0]).toMatchObject({ status: 'ausstehend' });
  });

  it('gibt die gelockten Proofs nicht zurück — sie gehören dem Empfänger', async () => {
    await seedProofs([64]);
    const d = deps({ nostr: fakeNostr({ acceptedBy: [] }) });

    await sendNutzap({ target: TARGET, amount: 10, kind: 'boost' }, d);

    // 64 Sat eingesetzt, 10 Sat gelockt, 54 Sat Wechselgeld zurück.
    await expect(d.wallet.balance()).resolves.toBe(54);
  });
});
