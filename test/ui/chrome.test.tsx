import { render } from 'preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Frame, RouteLinks } from '../../src/ui/chrome.js';
import { clickButton, flush } from '../helpers/ui.js';

let host: HTMLDivElement;
const onRoute = vi.fn();

beforeEach(() => {
  onRoute.mockClear();
  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(() => {
  render(null, host);
  host.remove();
});

describe('Der Rahmen, den jeder Screen teilt', () => {
  it('trägt Mastkopf-Linie, Kopf, Datumsleiste und Haarlinie', async () => {
    render(
      <Frame head={<span class="wordmark">Podcasts</span>} dateline={<span>Dienstag</span>}>
        <p>Inhalt</p>
      </Frame>,
      host,
    );
    await flush();

    expect(host.querySelector('.masthead-rule')).not.toBeNull();
    expect(host.querySelector('.wordmark')?.textContent).toBe('Podcasts');
    expect(host.querySelector('.dateline')?.textContent).toBe('Dienstag');
    expect(host.querySelector('.nav-hairline')).not.toBeNull();
    expect(host.querySelector('.content')?.textContent).toBe('Inhalt');
  });

  it('lässt die Datumsleiste weg, wo ein Screen keine hat', async () => {
    render(<Frame head={<span />} />, host);
    await flush();
    expect(host.querySelector('.dateline')).toBeNull();
  });
});

describe('Routenlinks', () => {
  it('kennzeichnet die aktive Route mit aria-current', async () => {
    render(<RouteLinks route="wallet" onRoute={onRoute} />, host);
    await flush();
    expect(host.querySelector('[aria-current="page"]')?.textContent).toBe('Wallet');
  });

  it('meldet einen Routenwechsel nach oben', async () => {
    render(<RouteLinks route="listen" onRoute={onRoute} />, host);
    await flush();
    await clickButton(host, 'Einstellungen');
    expect(onRoute).toHaveBeenCalledWith('settings');
  });
});
