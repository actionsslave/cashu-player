import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerServiceWorker } from '../../src/pwa/register.js';

function installServiceWorker(register: ReturnType<typeof vi.fn>): void {
  Object.defineProperty(navigator, 'serviceWorker', { value: { register }, configurable: true });
}

function setSecureContext(secure: boolean): void {
  Object.defineProperty(window, 'isSecureContext', { value: secure, configurable: true });
}

afterEach(() => {
  Object.defineProperty(navigator, 'serviceWorker', { value: undefined, configurable: true });
  setSecureContext(true);
});

describe('FR-31: Service Worker registrieren', () => {
  it('registriert /sw.js im sicheren Kontext', async () => {
    const register = vi.fn().mockResolvedValue({});
    installServiceWorker(register);
    setSecureContext(true);

    await expect(registerServiceWorker()).resolves.toBe('registriert');
    expect(register).toHaveBeenCalledWith('/sw.js', { type: 'module', scope: '/' });
  });

  it('NFR-04: registriert nichts ohne sicheren Kontext', async () => {
    const register = vi.fn();
    installServiceWorker(register);
    setSecureContext(false);

    await expect(registerServiceWorker()).resolves.toBe('kein-sicherer-kontext');
    expect(register).not.toHaveBeenCalled();
  });

  it('registriert nichts, wenn der Browser keine Service Worker kennt', async () => {
    Object.defineProperty(navigator, 'serviceWorker', { value: undefined, configurable: true });
    await expect(registerServiceWorker()).resolves.toBe('nicht-unterstuetzt');
  });

  it('NFR-03: ein Fehler bei der Registrierung wirft keine Ausnahme', async () => {
    installServiceWorker(vi.fn().mockRejectedValue(new Error('kaputt')));
    setSecureContext(true);
    await expect(registerServiceWorker()).resolves.toBe('fehlgeschlagen');
  });
});
