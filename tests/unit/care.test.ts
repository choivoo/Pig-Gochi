import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../src/data/balance';
import { SPECIES } from '../../src/data/pets';
import { bathe, feed, heal, playToy, stroke, tapEgg, toggleSleep } from '../../src/game/core/care';
import { freshEgg, hatched, pet, T0, withPet, withStats } from '../helpers';

describe('care actions', () => {
  it('eggs hatch after the configured number of taps', () => {
    let s = freshEgg();
    for (let i = 0; i < BALANCE.growth.hatchTaps - 1; i++) { const r = tapEgg(s, T0 + i); expect(r.data?.hatched).toBe(false); s = r.save; }
    const r = tapEgg(s, T0 + 10);
    expect(r.data?.hatched).toBe(true);
    expect(pet(r.save).stage).toBe('baby');
    expect(pet(r.save).speciesId).toBe('mongle');
    expect(r.save.encyclopedia.mongle).toBeDefined();
  });
  it('each egg type hatches into its own baby', () => {
    expect(pet(hatched(T0, 'flame')).speciesId).toBe('toktok');
    expect(pet(hatched(T0, 'dew')).speciesId).toBe('mulkong');
  });
  it('free kibble raises satiety and clamps to 100', () => {
    const s = withStats(hatched(), { satiety: 80 });
    const r = feed(s, T0, 'kibble');
    expect(r.ok).toBe(true);
    expect(pet(r.save).stats.satiety).toBe(100);
  });
  it('refuses to overfeed and does not consume the item', () => {
    let s = withStats(hatched(), { satiety: 95 });
    s = { ...s, inventory: { ...s.inventory, 'food:apple': 2 } };
    const r = feed(s, T0, 'apple');
    expect(r.ok).toBe(false);
    expect(r.save.inventory['food:apple']).toBe(2);
  });
  it('requires owning purchased food and consumes one on success', () => {
    let s = withStats(hatched(), { satiety: 30 });
    expect(feed(s, T0, 'apple').ok).toBe(false);
    s = { ...s, inventory: { ...s.inventory, 'food:apple': 1 } };
    const r = feed(s, T0, 'apple');
    expect(r.ok).toBe(true);
    expect(r.save.inventory['food:apple']).toBeUndefined();
  });
  it('favourite food gives more happiness than a neutral one; disliked food hurts', () => {
    const base = withStats(hatched(), { satiety: 30, happiness: 50 });
    const sp = SPECIES.mongle;
    const inv = { ...base.inventory, [`food:${sp.favoriteFood}`]: 1, [`food:${sp.dislikedFood}`]: 1, 'food:banana': 1 };
    const s = { ...base, inventory: inv };
    const fav = pet(feed(s, T0, sp.favoriteFood).save).stats.happiness;
    const neutral = pet(feed(s, T0, 'banana').save).stats.happiness;
    const dis = pet(feed(s, T0, sp.dislikedFood).save).stats.happiness;
    expect(fav).toBeGreaterThan(neutral);
    expect(dis).toBeLessThan(50);
  });
  it('enforces a global feed cooldown', () => {
    const s = withStats(hatched(), { satiety: 20 });
    const a = feed(s, T0, 'kibble');
    expect(a.ok).toBe(true);
    const b = feed(withStats(a.save, { satiety: 20 }), T0 + 500, 'kibble');
    expect(b.ok).toBe(false);
    const c = feed(withStats(a.save, { satiety: 20 }), T0 + BALANCE.care.feedGlobalCooldownMs + 1, 'kibble');
    expect(c.ok).toBe(true);
  });
  it('cannot feed a sleeping pet', () => {
    const s = withPet(withStats(hatched(), { satiety: 20 }), { sleeping: true });
    expect(feed(s, T0, 'kibble').ok).toBe(false);
  });
  it('stroking gives diminishing returns and a cooldown', () => {
    let s = withStats(hatched(), { happiness: 10, bond: 0 });
    const gains: number[] = [];
    let t = T0;
    for (let i = 0; i < 8; i++) { t += BALANCE.care.strokeCooldownMs + 10; const before = pet(s).stats.bond; s = stroke(s, t).save; gains.push(pet(s).stats.bond - before); }
    expect(gains[0]).toBeGreaterThan(gains[3]);
    expect(gains[7]).toBeLessThanOrEqual(BALANCE.care.strokeBond * BALANCE.care.strokeMinMultiplier + 1e-9);
    const within = stroke(s, t + 100).save;
    expect(pet(within).stats.bond).toBe(pet(s).stats.bond);
  });
  it('bathing restores cleanliness once and is refused when already clean', () => {
    const s = withStats(hatched(), { cleanliness: 30 });
    const r = bathe(s, T0);
    expect(pet(r.save).stats.cleanliness).toBe(75);
    expect(bathe(withStats(r.save, { cleanliness: 95 }), T0).ok).toBe(false);
  });
  it('sleep toggles, restores state and counts', () => {
    const s = withStats(hatched(), { energy: 40 });
    const a = toggleSleep(s, T0);
    expect(pet(a.save).sleeping).toBe(true);
    expect(a.save.counters.sleeps).toBe(1);
    const b = toggleSleep(a.save, T0 + 5000);
    expect(pet(b.save).sleeping).toBe(false);
    expect(toggleSleep(withStats(hatched(), { energy: 100 }), T0).ok).toBe(false);
  });
  it('treatment: free rest always works and cures illness at high health', () => {
    let s = withStats(hatched(), { health: 60 });
    s = withPet(s, { illness: 'cold' });
    const r = heal(s, T0, 'rest');
    expect(r.ok).toBe(true);
    expect(pet(r.save).stats.health).toBe(68);
    const r2 = heal(withStats(r.save, { health: 75 }), T0 + BALANCE.care.plain.rest.cooldownMs + 1, 'rest');
    expect(pet(r2.save).illness).toBeNull();
    expect(pet(r2.save).care.recoveries).toBe(1);
  });
  it('medicine needs an item', () => {
    const s = withStats(hatched(), { health: 50 });
    expect(heal(s, T0, 'medicine').ok).toBe(false);
    const r = heal({ ...s, inventory: { ...s.inventory, 'special:medicine': 1 } }, T0, 'medicine');
    expect(r.ok).toBe(true);
    expect(pet(r.save).stats.health).toBe(75);
  });
  it('play needs energy and no illness', () => {
    const s = hatched();
    expect(playToy(s, T0, 'ball').ok).toBe(true);
    expect(playToy(withStats(s, { energy: 5 }), T0, 'ball').ok).toBe(false);
    expect(playToy(withPet(s, { illness: 'cold' }), T0, 'ball').ok).toBe(false);
    expect(playToy(s, T0, 'kite').ok).toBe(false); // not owned
  });
  it('failed actions never change the save', () => {
    const s = withPet(hatched(), { sleeping: true });
    const r = bathe(s, T0);
    expect(r.ok).toBe(false);
    expect(r.save).toBe(s);
  });
});
