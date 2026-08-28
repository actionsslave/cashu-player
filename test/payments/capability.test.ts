import { describe, expect, it } from 'vitest';
import { paymentCapability } from '../../src/payments/capability.js';

const SESSION = { pubkeyHex: 'ab', npub: 'npub1x', loggedInAt: 0 };
const GENUG = 1000;

describe('FR-05: Nutzung ohne Login', () => {
  it('sperrt Streaming und Boost ohne Anmeldung mit dem Hinweis "Login erforderlich"', () => {
    const capability = paymentCapability({ session: undefined, balance: GENUG });
    expect(capability.canStream).toBe(false);
    expect(capability.canBoost).toBe(false);
    expect(capability.reason).toBe('Login erforderlich');
  });

  it('lässt Abonnieren und Wiedergabe ohne Anmeldung uneingeschränkt zu', () => {
    const capability = paymentCapability({ session: undefined, balance: GENUG });
    expect(capability.canSubscribe).toBe(true);
    expect(capability.canPlay).toBe(true);
  });

  it('gibt Streaming und Boost nach der Anmeldung frei', () => {
    const capability = paymentCapability({ session: SESSION, balance: GENUG });
    expect(capability.canStream).toBe(true);
    expect(capability.canBoost).toBe(true);
    expect(capability.reason).toBeUndefined();
  });
});

describe('FR-20: Guthaben-Untergrenze', () => {
  it('US-05-AC-4: stoppt Streaming unter 10 Sat und verweist auf die Wallet', () => {
    const capability = paymentCapability({ session: SESSION, balance: 8 });
    expect(capability.canStream).toBe(false);
    expect(capability.reason).toMatch(/Guthaben zu niedrig/);
    expect(capability.reason).toMatch(/Wallet/);
  });

  it('lässt Streaming bei genau 10 Sat noch zu', () => {
    expect(paymentCapability({ session: SESSION, balance: 10 }).canStream).toBe(true);
  });

  it('gibt Streaming nach erfolgreicher Aufladung wieder frei', () => {
    expect(paymentCapability({ session: SESSION, balance: 8 }).canStream).toBe(false);
    expect(paymentCapability({ session: SESSION, balance: 500 }).canStream).toBe(true);
  });

  it('lässt Wiedergabe und Abonnieren auch bei leerer Wallet zu', () => {
    const capability = paymentCapability({ session: SESSION, balance: 0 });
    expect(capability.canPlay).toBe(true);
    expect(capability.canSubscribe).toBe(true);
  });

  it('nennt den fehlenden Login vor dem zu niedrigen Guthaben', () => {
    const capability = paymentCapability({ session: undefined, balance: 0 });
    expect(capability.reason).toBe('Login erforderlich');
  });
});
