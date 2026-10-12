import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { BALANCE } from '../../src/data/balance';
import { buy } from '../../src/game/core/economy';
import { MIGRATIONS, normalizeSave } from '../../src/persistence/migrate';
import { clearSave, exportJson, loadSave, parseImport, writeSave } from '../../src/persistence/storage';
import { hatched, pet, T0 } from '../helpers';

const store: Record<string, string> = {};
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => (k in store ? store[k] : null), setItem: (k: string, v: string) => { store[k] = String(v); }, removeItem: (k: string) => { delete store[k]; },
  clear: () => { for (const k of Object.keys(store)) delete store[k]; }, key: () => null, length: 0,
} as Storage;

describe('save schema', () => {
  it('round-trips through JSON without losing anything', () => {
    const s = buy({ ...hatched(), coins: 500 }, T0, 'furn:rug_star').save;
    const r = normalizeSave(JSON.parse(JSON.stringify(s)), T0);
    expect(r.ok).toBe(true);
    const out = r.save!;
    expect(out.coins).toBe(s.coins);
    expect(out.inventory).toEqual(s.inventory);
    expect(out.roomLayout).toEqual(s.roomLayout);
    expect(pet(out).stats).toEqual(pet(s).stats);
    expect(out.encyclopedia).toEqual(s.encyclopedia);
    expect(out.schemaVersion).toBe(BALANCE.schemaVersion);
  });
  it('contains every required top-level field', () => {
    const s = hatched();
    for (const k of ['schemaVersion', 'playerProfile', 'activePetId', 'ownedPets', 'coins', 'inventory', 'roomLayout', 'encyclopedia', 'achievements', 'missions', 'minigameRecords', 'settings', 'createdAt', 'lastSavedAt', 'lastSimulationAt']) expect(s).toHaveProperty(k);
  });
  it('migrates a version-0 save (missing bookkeeping fields)', () => {
    const v0 = JSON.parse(JSON.stringify(hatched())) as Record<string, unknown>;
    v0.schemaVersion = 0; delete v0.cooldowns; delete v0.streak; delete v0.claimed; delete v0.lastLoginDay;
    const r = normalizeSave(v0, T0);
    expect(r.ok).toBe(true);
    expect(r.save?.claimed).toEqual([]);
    expect(r.save?.schemaVersion).toBe(BALANCE.schemaVersion);
    expect(typeof MIGRATIONS[0]).toBe('function');
  });
  it('rejects saves from the future and garbage', () => {
    expect(normalizeSave({ schemaVersion: 999 }).ok).toBe(false);
    expect(normalizeSave('hello').ok).toBe(false);
    expect(normalizeSave(null).ok).toBe(false);
    expect(normalizeSave({ schemaVersion: 1, ownedPets: {} }).ok).toBe(false);
  });
  it('repairs bad numbers, clamps stats and drops unknown pets/items', () => {
    const s = JSON.parse(JSON.stringify(hatched())) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    s.coins = -50; s.ownedPets.pet_test.stats.satiety = 9999; s.ownedPets.pet_test.stats.health = 'x';
    s.ownedPets.evil = { speciesId: '<script>', name: 'x' };
    s.inventory = { 'food:apple': 3, bad: 'NaN', 'food:cake': -2 };
    s.roomLayout.push({ uid: 'z', itemId: 'not-owned-piano', x: 1, y: 1 });
    const r = normalizeSave(s, T0);
    expect(r.ok).toBe(true);
    const out = r.save!;
    expect(out.coins).toBe(0);
    expect(pet(out).stats.satiety).toBe(100);
    expect(pet(out).stats.health).toBe(80);
    expect(out.ownedPets.evil).toBeUndefined();
    expect(out.inventory).toEqual({ 'food:apple': 3 });
    expect(out.roomLayout.find((l) => l.uid === 'z')).toBeUndefined();
    expect(r.repaired).toBe(true);
  });
  it('export/import round-trips and rejects non-saves', () => {
    const s = hatched();
    const imp = parseImport(exportJson(s));
    expect(imp.ok).toBe(true);
    expect(imp.save?.coins).toBe(s.coins);
    expect(parseImport('{not json').ok).toBe(false);
    expect(parseImport('{"format":"pixel-life-save","data":{"schemaVersion":1}}').ok).toBe(false);
    expect(parseImport('[1,2]').ok).toBe(false);
  });
});

describe('IndexedDB storage', () => {
  beforeEach(async () => { await clearSave(); });
  it('returns null when nothing is stored', async () => { expect(await loadSave(T0)).toBeNull(); });
  it('saves and loads the newest data', async () => {
    const a = { ...hatched(), coins: 111, lastSavedAt: T0 + 1 };
    await writeSave(a);
    const loaded = await loadSave(T0);
    expect(loaded?.save.coins).toBe(111);
  });
  it('recovers from a corrupted main slot using the mirror/backup', async () => {
    const a = { ...hatched(), coins: 222, lastSavedAt: T0 + 5 };
    await writeSave(a);
    await writeSave({ ...a, coins: 333, lastSavedAt: T0 + 6 });
    // corrupt main slot
    const db = await new Promise<IDBDatabase>((res, rej) => { const r = indexedDB.open('pixel-life', 1); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    await new Promise<void>((res) => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put({ broken: true }, 'main'); tx.oncomplete = () => res(); });
    db.close();
    delete store['pixel-life-mirror-v1'];
    const loaded = await loadSave(T0);
    expect(loaded).not.toBeNull();
    expect(loaded?.recovered).toBe(true);
    expect(loaded?.save.coins).toBe(222);
  });
  it('survives a completely corrupt localStorage mirror', async () => {
    store['pixel-life-mirror-v1'] = '{{{{';
    expect(await loadSave(T0)).toBeNull();
  });
});
