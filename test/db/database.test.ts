import { afterEach, describe, expect, it } from 'vitest';
import { closeDatabase, openDatabase, STORES } from '../../src/db/database.js';

afterEach(() => {
  closeDatabase();
});

describe('IndexedDB-Schema', () => {
  it('NFR-04: legt alle Stores für Abos, Episoden, Proofs und Verlauf an', async () => {
    const db = await openDatabase();
    expect([...db.objectStoreNames].sort()).toEqual([...STORES].sort());
  });

  it('speichert und liest einen Wert wieder aus', async () => {
    const db = await openDatabase();
    await db.put('settings', { key: 'streamingRate', value: 21 });
    const read = await db.get('settings', 'streamingRate');
    expect(read).toEqual({ key: 'streamingRate', value: 21 });
  });

  it('indiziert Episoden nach Feed', async () => {
    const db = await openDatabase();
    const store = db.transaction('episodes').store;
    expect([...store.indexNames]).toContain('feedId');
  });

  it('liefert bei mehrfachem Öffnen dieselbe Verbindung', async () => {
    const first = await openDatabase();
    const second = await openDatabase();
    expect(second).toBe(first);
  });
});
