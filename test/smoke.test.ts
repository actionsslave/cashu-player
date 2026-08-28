import { describe, expect, it } from 'vitest';

describe('Gerüst', () => {
  it('führt Tests im jsdom-Environment aus', () => {
    expect(typeof document).toBe('object');
  });

  it('stellt IndexedDB im Test-Environment bereit', () => {
    expect(typeof indexedDB.open).toBe('function');
  });
});
