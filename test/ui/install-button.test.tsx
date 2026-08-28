import { render } from 'preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InstallButton } from '../../src/ui/install-button.js';
import { flush } from '../helpers/ui.js';

let host: HTMLDivElement;

function setDisplayMode(standalone: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches: standalone && query.includes('standalone'),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  });
}

function fireInstallPrompt(prompt = vi.fn().mockResolvedValue(undefined)) {
  const event = new Event('beforeinstallprompt') as Event & { prompt: unknown };
  event.prompt = prompt;
  window.dispatchEvent(event);
  return prompt;
}

const button = () =>
  [...host.querySelectorAll('button')].find((b) => b.textContent?.includes('Installieren'));

beforeEach(() => {
  setDisplayMode(false);
  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(() => {
  render(null, host);
  host.remove();
});

describe('FR-32: Installieren-Schaltfläche', () => {
  it('US-08-AC-1: erscheint, sobald der Browser die Installation anbietet', async () => {
    render(<InstallButton />, host);
    await flush();
    expect(button()).toBeUndefined();

    fireInstallPrompt();
    await flush();
    expect(button()).toBeDefined();
  });

  it('erscheint nicht, solange der Browser das Ereignis nicht liefert', async () => {
    render(<InstallButton />, host);
    await flush();
    expect(button()).toBeUndefined();
  });

  it('US-08-AC-3: erscheint nicht, wenn die App bereits installiert läuft', async () => {
    setDisplayMode(true);
    render(<InstallButton />, host);
    await flush();

    fireInstallPrompt();
    await flush();

    expect(button()).toBeUndefined();
  });

  it('US-08-AC-2: der Klick übergibt an den Browser-Dialog', async () => {
    render(<InstallButton />, host);
    await flush();
    const prompt = fireInstallPrompt();
    await flush();

    button()?.click();
    await flush();

    expect(prompt).toHaveBeenCalledTimes(1);
  });

  it('verschwindet, nachdem die App installiert wurde', async () => {
    render(<InstallButton />, host);
    await flush();
    fireInstallPrompt();
    await flush();
    expect(button()).toBeDefined();

    window.dispatchEvent(new Event('appinstalled'));
    await flush();

    expect(button()).toBeUndefined();
  });
});
