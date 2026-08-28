/**
 * NIP-07-Schnittstelle, wie Extensions sie in die Seite injizieren.
 * Nur die zwei Methoden, die FR-02 und FR-03 brauchen.
 */
export interface UnsignedNostrEvent {
  kind: number;
  created_at: number;
  tags: string[][];
  content: string;
}

export interface SignedNostrEvent extends UnsignedNostrEvent {
  id: string;
  pubkey: string;
  sig: string;
}

export interface Nip07Provider {
  getPublicKey(): Promise<string>;
  signEvent(event: UnsignedNostrEvent): Promise<SignedNostrEvent>;
}

declare global {
  interface Window {
    nostr?: Nip07Provider;
  }
}

export function getProvider(): Nip07Provider | undefined {
  return window.nostr;
}
