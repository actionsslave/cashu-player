import { describe, expect, it } from 'vitest';
import { paymentCapability } from '../../src/payments/capability.js';

const SESSION = { pubkeyHex: 'ab', npub: 'npub1x', loggedInAt: 0 };

describe('FR-05: Nutzung ohne Login', () => {
  it('sperrt Streaming und Boost ohne Anmeldung mit dem Hinweis "Login erforderlich"', () => {
    const capability = paymentCapability({ session: undefined });
    expect(capability.canStream).toBe(false);
    expect(capability.canBoost).toBe(false);
    expect(capability.reason).toBe('Login erforderlich');
  });

  it('lässt Abonnieren und Wiedergabe ohne Anmeldung uneingeschränkt zu', () => {
    const capability = paymentCapability({ session: undefined });
    expect(capability.canSubscribe).toBe(true);
    expect(capability.canPlay).toBe(true);
  });

  it('gibt Streaming und Boost nach der Anmeldung frei', () => {
    const capability = paymentCapability({ session: SESSION });
    expect(capability.canStream).toBe(true);
    expect(capability.canBoost).toBe(true);
    expect(capability.reason).toBeUndefined();
  });
});
