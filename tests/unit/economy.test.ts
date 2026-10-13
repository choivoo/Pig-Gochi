import { describe, expect, it } from 'vitest';
import { SHOP_BY_ID } from '../../src/data/items';
import { buy, equipAccessory, placeFurniture, setLayout, setRoomTheme, snapPlacement, claimDexRewards } from '../../src/game/core/economy';
import { finishMinigame, gradeFor } from '../../src/game/core/minigameReward';
import { hatched, pet, T0 } from '../helpers';

const rich = (coins = 1000) => { const s = hatched(); return { ...s, coins }; };
/** coins actually spent = drop in balance + rewards earned meanwhile (first-purchase achievements etc.) */
const spent = (a: { coins: number; counters: Record<string, number> }, b: { coins: number; counters: Record<string, number> }) => a.coins - b.coins + ((b.counters.coinsEarned ?? 0) - (a.counters.coinsEarned ?? 0));

describe('economy', () => {
  it('blocks purchases the player cannot afford and leaves coins untouched', () => {
    const s = rich(10);
    const r = buy(s, T0, 'furn:bed_star');
    expect(r.ok).toBe(false);
    expect(r.save.coins).toBe(10);
    expect(r.save.inventory['furn:bed_star']).toBeUndefined();
  });
  it('deducts exactly the price and adds the item (scenario D)', () => {
    const s = rich(100);
    const price = SHOP_BY_ID['furn:rug_star'].price as number;
    const r = buy(s, T0, 'furn:rug_star');
    expect(r.ok).toBe(true);
    expect(spent(s, r.save)).toBe(price);
    expect(r.save.inventory['furn:rug_star']).toBe(1);
    expect(r.save.counters.purchases).toBe(1);
    expect(r.save.counters.coinsSpent).toBe(price);
  });
  it('stackable items add the quantity; totals are checked as a whole', () => {
    const s = rich(100);
    const r = buy(s, T0, 'food:apple', 5);
    expect(r.save.inventory['food:apple']).toBe(5);
    expect(spent(s, r.save)).toBe(5 * 8);
    expect(buy(rich(30), T0, 'food:apple', 5).ok).toBe(false);
  });
  it('non-stackable items cannot be bought twice', () => {
    const r1 = buy(rich(), T0, 'acc:glasses');
    expect(r1.ok).toBe(true);
    const r2 = buy(r1.save, T0, 'acc:glasses');
    expect(r2.ok).toBe(false);
    expect(r2.save.coins).toBe(r1.save.coins);
  });
  it('rapid repeated purchase of a one-off item only charges once', () => {
    let s = rich();
    let ok = 0;
    for (let i = 0; i < 5; i++) { const r = buy(s, T0 + i, 'toy:kite'); if (r.ok) ok++; s = r.save; }
    expect(ok).toBe(1);
    expect(s.counters.coinsSpent).toBe(30);
  });
  it('rejects invalid quantities, unknown items and locked/reward-only items', () => {
    expect(buy(rich(), T0, 'food:apple', 0).ok).toBe(false);
    expect(buy(rich(), T0, 'food:apple', 1.5).ok).toBe(false);
    expect(buy(rich(), T0, 'nope').ok).toBe(false);
    expect(buy(rich(), T0, 'furn:trophy').ok).toBe(false);
    expect(buy(rich(), T0, 'room:cloud').ok).toBe(false);
  });
  it('max stack is enforced', () => {
    expect(buy({ ...rich(), inventory: { 'food:apple': 98 } }, T0, 'food:apple', 5).ok).toBe(false);
  });
  it('buying a room theme unlocks it and it can be activated', () => {
    const r = buy(rich(), T0, 'room:starry');
    expect(r.save.ownedRooms).toContain('starry');
    expect(setRoomTheme(r.save, T0, 'starry').save.roomTheme).toBe('starry');
    expect(setRoomTheme(rich(), T0, 'neon').ok).toBe(false);
  });
  it('furniture can only be placed if owned and not already used up', () => {
    let s = rich();
    expect(placeFurniture(s, T0, 'plant_pot', 40, 140, 'u1').ok).toBe(false);
    s = buy(s, T0, 'furn:plant_pot').save;
    const p = placeFurniture(s, T0, 'plant_pot', 41, 139, 'u1');
    expect(p.ok).toBe(true);
    const placed = p.save.roomLayout.find((x) => x.uid === 'u1');
    expect(placed && placed.x % 8 === 0 && placed.y % 8 === 0).toBe(true);
    expect(placeFurniture(p.save, T0, 'plant_pot', 40, 140, 'u2').ok).toBe(false);
  });
  it('setLayout drops items the player does not own and clamps positions', () => {
    const s = rich();
    const r = setLayout(s, T0, [{ uid: 'a', itemId: 'bed_basic', x: -50, y: 9999, flip: false }, { uid: 'b', itemId: 'piano', x: 0, y: 0, flip: false }, { uid: 'c', itemId: 'bed_basic', x: 0, y: 0, flip: false }]);
    expect(r.save.roomLayout.map((x) => x.itemId)).toEqual(['bed_basic']);
    expect(r.save.roomLayout[0].x).toBe(0);
    expect(r.save.roomLayout[0].y).toBeLessThanOrEqual(156);
  });
  it('snap keeps wall items on the wall and floor items on the floor', () => {
    const wall = snapPlacement('wall_clock', 60, 500);
    expect(wall.y).toBeLessThan(104);
    const floor = snapPlacement('bed_basic', 60, 0);
    expect(floor.y).toBeGreaterThanOrEqual(120);
  });
  it('accessories require ownership and the right slot', () => {
    let s = rich();
    expect(equipAccessory(s, T0, 'head', 'crown_small').ok).toBe(false);
    s = buy(s, T0, 'acc:beret').save;
    expect(equipAccessory(s, T0, 'face', 'beret').ok).toBe(false);
    const r = equipAccessory(s, T0, 'head', 'beret');
    expect(pet(r.save).accessories.head).toBe('beret');
    expect(pet(equipAccessory(r.save, T0, 'head', null).save).accessories.head).toBeUndefined();
  });
  it('dex milestone rewards are granted exactly once', () => {
    let s = rich();
    s = { ...s, encyclopedia: Object.fromEntries(['mongle', 'mongsil', 'gureumi'].map((k) => [k, { discoveredAt: T0 }])) };
    const a = claimDexRewards(s, T0).save;
    expect(a.inventory['furn:garland']).toBe(1);
    const b = claimDexRewards({ ...a, inventory: { ...a.inventory, 'furn:garland': 0 } }, T0).save;
    expect(b.inventory['furn:garland']).toBe(0); // not re-granted
  });
});

describe('minigame rewards', () => {
  it('maps score fractions to the documented coin tiers', () => {
    expect(gradeFor(0).coins).toBe(10);
    expect(gradeFor(0.2).coins).toBe(20);
    expect(gradeFor(0.5).coins).toBe(35);
    expect(gradeFor(0.7).coins).toBe(50);
    expect(gradeFor(0.95).coins).toBe(70);
    expect(gradeFor(5).grade).toBe(4);
  });
  it('pays a result exactly once (same run id) and records the best score', () => {
    const s = hatched();
    const a = finishMinigame(s, T0, 'stars', 330, 480, 'run-1');
    expect(a.ok).toBe(true);
    expect(a.outcome?.coins).toBe(50);
    const b = finishMinigame(a.save, T0, 'stars', 330, 480, 'run-1');
    expect(b.ok).toBe(false);
    expect(b.save.coins).toBe(a.save.coins);
    expect(a.save.minigameRecords.stars).toMatchObject({ best: 330, plays: 1 });
    expect(a.save.counters.minigames).toBe(1);
  });
  it('gives the pet happiness/bond and participation coin for a poor score', () => {
    const s = hatched();
    const r = finishMinigame(s, T0, 'fishing', 0, 160, 'run-x');
    expect(r.outcome?.coins).toBe(10);
    expect(pet(r.save).stats.bond).toBeGreaterThan(pet(s).stats.bond);
  });
  it('sanitizes garbage scores', () => {
    const r = finishMinigame(hatched(), T0, 'runner', Number.NaN, 300, 'run-nan');
    expect(r.ok).toBe(true);
    expect(r.save.minigameRecords.runner.best).toBe(0);
    const neg = finishMinigame(hatched(), T0, 'runner', -50, 300, 'run-neg');
    expect(neg.save.minigameRecords.runner.best).toBe(0);
  });
  it('reduces rewards after many runs in one day (anti-farming)', () => {
    let s = hatched();
    const gains: number[] = [];
    for (let i = 0; i < 12; i++) { const r = finishMinigame(s, T0 + i, 'stars', 480, 480, `r${i}`); s = r.save; gains.push(r.outcome?.coins ?? 0); }
    expect(gains[0]).toBe(70);
    expect(gains[11]).toBeLessThan(gains[0]);
  });
});
