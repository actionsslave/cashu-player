import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(import.meta.dirname, '..', '..');
const manifest = JSON.parse(readFileSync(join(ROOT, 'public/manifest.webmanifest'), 'utf8'));
const indexHtml = readFileSync(join(ROOT, 'index.html'), 'utf8');

describe('FR-31: Web App Manifest', () => {
  it('nennt name, short_name, start_url und display: standalone', () => {
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
  });

  it('nennt eine Theme-Farbe', () => {
    expect(manifest.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('liefert Icons in 192 und 512 Pixeln', () => {
    const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
  });

  it('die Icon-Dateien liegen wirklich vor', () => {
    for (const icon of manifest.icons as { src: string }[]) {
      expect(existsSync(join(ROOT, 'public', icon.src.replace(/^\//, '')))).toBe(true);
    }
  });

  it('index.html verweist auf das Manifest', () => {
    expect(indexHtml).toMatch(/<link[^>]+rel="manifest"[^>]+href="\/manifest\.webmanifest"/);
  });

  it('index.html nennt dieselbe Theme-Farbe wie das Manifest', () => {
    expect(indexHtml).toContain(`content="${manifest.theme_color}"`);
  });
});
