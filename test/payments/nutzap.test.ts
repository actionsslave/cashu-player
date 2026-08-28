import { describe, expect, it } from 'vitest';
import type { ResolvedPaymentTarget, StoredProof } from '../../src/contracts/index.js';
import { buildNutzap, p2pkLockKey } from '../../src/payments/nutzap.js';
import { EMPFAENGER_HEX, EMPFAENGER_NPUB, P2PK_PUBKEY } from '../helpers/nostr.js';

const TARGET: ResolvedPaymentTarget = {
  status: 'resolved',
  npub: EMPFAENGER_NPUB,
  pubkeyHex: EMPFAENGER_HEX,
  p2pkPubkey: P2PK_PUBKEY,
  mints: ['https://Mint-A.example/'],
  relays: ['wss://r1.example'],
  fetchedAt: 0,
};

const PROOFS: StoredProof[] = [
  { id: '00ad268c4d1f5826', amount: 8, secret: 's1', C: `02${'a'.repeat(64)}` },
  { id: '00ad268c4d1f5826', amount: 2, secret: 's2', C: `02${'b'.repeat(64)}` },
];

const tagsOf = (event: { tags: string[][] }, name: string) =>
  event.tags.filter((tag) => tag[0] === name);

describe('FR-27: Nutzap bauen', () => {
  it('ist ein kind:9321-Event', () => {
    expect(buildNutzap({ target: TARGET, mintUrl: TARGET.mints[0], proofs: PROOFS }).kind).toBe(9321);
  });

  it('trägt je Proof ein proof-Tag mit dem serialisierten Proof', () => {
    const event = buildNutzap({ target: TARGET, mintUrl: TARGET.mints[0], proofs: PROOFS });
    const proofTags = tagsOf(event, 'proof');
    expect(proofTags).toHaveLength(2);
    expect(JSON.parse(proofTags[0][1])).toEqual(PROOFS[0]);
  });

  it('trägt das unit-Tag sat', () => {
    const event = buildNutzap({ target: TARGET, mintUrl: TARGET.mints[0], proofs: PROOFS });
    expect(tagsOf(event, 'unit')[0]).toEqual(['unit', 'sat']);
  });

  it('trägt die Mint-URL exakt so, wie sie im kind:10019 steht', () => {
    const event = buildNutzap({ target: TARGET, mintUrl: TARGET.mints[0], proofs: PROOFS });
    expect(tagsOf(event, 'u')[0]).toEqual(['u', 'https://Mint-A.example/']);
  });

  it('trägt den Empfänger im p-Tag', () => {
    const event = buildNutzap({ target: TARGET, mintUrl: TARGET.mints[0], proofs: PROOFS });
    expect(tagsOf(event, 'p')[0]).toEqual(['p', EMPFAENGER_HEX]);
  });

  it('ist ohne Nachricht inhaltlich leer', () => {
    expect(buildNutzap({ target: TARGET, mintUrl: TARGET.mints[0], proofs: PROOFS }).content).toBe('');
  });

  it('FR-28: übernimmt die Nachricht in den content', () => {
    const event = buildNutzap({
      target: TARGET,
      mintUrl: TARGET.mints[0],
      proofs: PROOFS,
      content: 'Starke Folge 00:14:07',
    });
    expect(event.content).toBe('Starke Folge 00:14:07');
  });

  it('trägt einen Zeitstempel in Sekunden', () => {
    const event = buildNutzap({ target: TARGET, mintUrl: TARGET.mints[0], proofs: PROOFS });
    expect(event.created_at).toBeGreaterThan(1_600_000_000);
    expect(Number.isInteger(event.created_at)).toBe(true);
  });
});

describe('FR-27: P2PK-Schlüssel', () => {
  it('stellt dem x-only-Schlüssel aus kind:10019 ein 02 voran', () => {
    expect(p2pkLockKey(P2PK_PUBKEY)).toBe(`02${P2PK_PUBKEY}`);
  });

  it('lässt einen bereits komprimierten Schlüssel unverändert', () => {
    expect(p2pkLockKey(`02${P2PK_PUBKEY}`)).toBe(`02${P2PK_PUBKEY}`);
    expect(p2pkLockKey(`03${P2PK_PUBKEY}`)).toBe(`03${P2PK_PUBKEY}`);
  });
});
