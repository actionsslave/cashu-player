/**
 * NIP-07: Zugriff auf das window.nostr-Objekt, das Signer-Extensions in die
 * Seite injizieren. Betrifft FR-01 und FR-03.
 */
import { SIGN_TIMEOUT_MS, SUGGESTED_EXTENSIONS } from '../config/build-config.js';

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

/** Nur die zwei Methoden, die FR-02 und FR-03 brauchen. */
export interface Nip07Provider {
  getPublicKey(): Promise<string>;
  signEvent(event: UnsignedNostrEvent): Promise<SignedNostrEvent>;
}

declare global {
  interface Window {
    nostr?: Nip07Provider;
  }
}

export type SignerFailure = 'keine-extension' | 'abgelehnt' | 'timeout';

const MESSAGES: Record<SignerFailure, string> = {
  'keine-extension': 'Keine nostr-Extension gefunden.',
  abgelehnt: 'Die Anfrage wurde in der Extension abgelehnt.',
  timeout: `Die Extension hat binnen ${SIGN_TIMEOUT_MS / 1000} s nicht geantwortet.`,
};

export class SignerError extends Error {
  readonly name = 'SignerError';
  constructor(
    readonly reason: SignerFailure,
    options?: { cause?: unknown },
  ) {
    super(MESSAGES[reason], options);
  }
}

export interface SignerDetection {
  available: boolean;
  suggestions: readonly { name: string; url: string }[];
}

/** FR-01: Ist eine Extension da? Wenn nicht, welche zwei sind zu empfehlen? */
export function detectSigner(): SignerDetection {
  return { available: typeof window.nostr?.signEvent === 'function', suggestions: SUGGESTED_EXTENSIONS };
}

export function getProvider(): Nip07Provider | undefined {
  return window.nostr;
}

function withTimeout<T>(work: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new SignerError('timeout')), SIGN_TIMEOUT_MS);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (cause: unknown) => {
        clearTimeout(timer);
        // TODO: NIP-07 legt kein Fehlerformat fest. Eine Ablehnung durch den Nutzer
        // ist von einem internen Extension-Fehler nicht unterscheidbar; beides
        // landet hier als 'abgelehnt'. Original bleibt als cause erhalten.
        reject(new SignerError('abgelehnt', { cause }));
      },
    );
  });
}

/** FR-03: Signieren mit Timeout und benanntem Abbruchgrund. */
export function signEvent(event: UnsignedNostrEvent): Promise<SignedNostrEvent> {
  const provider = getProvider();
  if (!provider) return Promise.reject(new SignerError('keine-extension'));
  return withTimeout(provider.signEvent(event));
}

/** FR-02: Pubkey der Extension holen, mit denselben Fehlergründen wie FR-03. */
export function getPublicKey(): Promise<string> {
  const provider = getProvider();
  if (!provider) return Promise.reject(new SignerError('keine-extension'));
  return withTimeout(provider.getPublicKey());
}
