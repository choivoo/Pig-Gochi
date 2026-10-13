import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from '../../src/data/achievements';
import { BALANCE } from '../../src/data/balance';
import { DIALOGUE } from '../../src/data/dialogue';
import { ACCESSORIES, FOODS, FURNITURE, ROOM_THEMES, SHOP_ITEMS } from '../../src/data/items';
import { ALL_SPECIES_IDS, SPECIES } from '../../src/data/pets';
import { newDialogueState, pickLine } from '../../src/game/core/dialogue';
import { computeEmotion } from '../../src/game/core/emotion';
import { seasonOf, timeOfDay, weatherFor } from '../../src/game/core/weather';
import { PetActor } from '../../src/game/entities/petActor';
import { rng } from '../../src/game/core/util';
import { hatched, pet } from '../helpers';

const pub = (p: string) => `public/${p}`;
describe('content targets (PART 3.8 / 22)', () => {
  it('meets the minimum counts', () => {
    expect(ALL_SPECIES_IDS).toHaveLength(21);
    expect(FOODS.length).toBeGreaterThanOrEqual(25);
    expect(FURNITURE.length).toBeGreaterThanOrEqual(30);
    expect(ACCESSORIES.length).toBeGreaterThanOrEqual(20);
    expect(ROOM_THEMES).toHaveLength(6);
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(40);
    expect(DIALOGUE.length).toBeGreaterThanOrEqual(120);
  });
  it('every sprite referenced by data exists on disk', () => {
    for (const id of ALL_SPECIES_IDS) expect(existsSync(pub(`assets/pets/${id}.png`)), id).toBe(true);
    for (const e of ['starlight', 'flame', 'dew']) expect(existsSync(pub(`assets/pets/egg_${e}.png`))).toBe(true);
    for (const f of FOODS) expect(existsSync(pub(`assets/food/${f.id}.png`)), f.id).toBe(true);
    for (const f of FURNITURE) expect(existsSync(pub(`assets/furniture/${f.id}.png`)), f.id).toBe(true);
    for (const a of ACCESSORIES) expect(existsSync(pub(`assets/accessories/${a.id}.png`)), a.id).toBe(true);
    for (const r of ROOM_THEMES) expect(existsSync(pub(`assets/rooms/${r.id}.png`)), r.id).toBe(true);
    for (const i of SHOP_ITEMS) expect(existsSync(pub(i.icon)), i.icon).toBe(true);
  });
  it('species data is complete and consistent', () => {
    for (const id of ALL_SPECIES_IDS) {
      const s = SPECIES[id];
      for (const k of ['id', 'name', 'description', 'species', 'lineage', 'growthStage', 'personalityTags', 'favoriteFood', 'dislikedFood', 'favoriteToy', 'baseStats', 'animationSet', 'spriteAtlas', 'dialoguePool', 'specialAction', 'evolutionCandidates', 'unlockConditions', 'encyclopediaDescription']) expect(s, `${id}.${k}`).toHaveProperty(k);
      expect(FOODS.some((f) => f.id === s.favoriteFood), `${id} fav`).toBe(true);
      expect(FOODS.some((f) => f.id === s.dislikedFood), `${id} dis`).toBe(true);
      expect(s.favoriteFood).not.toBe(s.dislikedFood);
    }
  });
  it('shop items have all required properties and unique ids', () => {
    expect(new Set(SHOP_ITEMS.map((i) => i.id)).size).toBe(SHOP_ITEMS.length);
    for (const i of SHOP_ITEMS) for (const k of ['id', 'name', 'desc', 'category', 'price', 'rarity', 'icon', 'stackable', 'maxStack']) expect(i).toHaveProperty(k);
  });
  it('sprite sheets have the documented sizes', () => {
    const meta = JSON.parse(readFileSync('src/data/generated/spriteMeta.json', 'utf8'));
    const want = { baby: 32, child: 48, adult: 64 } as const;
    for (const id of ALL_SPECIES_IDS) expect(meta.pets[id].size).toBe(want[SPECIES[id].growthStage as keyof typeof want]);
  });
  it('balance sheet matches the spec defaults', () => {
    expect(BALANCE.decayPerHour).toEqual({ satiety: 5, happiness: 4, cleanliness: 3, energy: 3 });
    expect(BALANCE.offline.capHours).toBe(8);
    expect(BALANCE.growth.babyToChildMinutes).toBe(45);
    expect(BALANCE.growth.childToAdultMinutes).toBe(480);
  });
});

describe('dialogue & emotion & weather', () => {
  it('never repeats the same line back to back', () => {
    const st = newDialogueState(); const r = rng(1);
    let last = '';
    for (let i = 0; i < 300; i++) { const l = pickLine(['happy', 'idle'], st, r); expect(l).not.toBe(last); last = l; }
  });
  it('falls back to idle for unknown tags', () => { expect(pickLine(['zzz'], newDialogueState(), rng(2)).length).toBeGreaterThan(0); });
  it('emotion follows the needs, not just happiness', () => {
    const p = pet(hatched());
    expect(computeEmotion({ ...p, stats: { ...p.stats, satiety: 10 } }, 12)).toBe('hungry');
    expect(computeEmotion({ ...p, stats: { ...p.stats, energy: 25 } }, 12)).toBe('sleepy');
    expect(computeEmotion({ ...p, sleeping: true }, 12)).toBe('sleepy');
    expect(computeEmotion({ ...p, illness: 'cold' }, 12)).toBe('sick');
    expect(computeEmotion({ ...p, stats: { ...p.stats, happiness: 20 } }, 12)).toBe('sad');
  });
  it('weather is stable for the same day and covers time-of-day rules', () => {
    for (const d of ['2026-01-05', '2026-06-10', '2026-10-20']) expect(weatherFor(d, 'day', 'summer')).toBe(weatherFor(d, 'day', 'summer'));
    expect(timeOfDay(3)).toBe('night'); expect(timeOfDay(8)).toBe('morning'); expect(timeOfDay(13)).toBe('day'); expect(timeOfDay(18)).toBe('evening');
    expect(seasonOf(0)).toBe('winter'); expect(seasonOf(3)).toBe('spring'); expect(seasonOf(6)).toBe('summer'); expect(seasonOf(9)).toBe('autumn');
    const kinds = new Set<string>();
    for (let i = 1; i <= 120; i++) kinds.add(weatherFor(`2026-12-${String(i % 28 + 1).padStart(2, '0')}-${i}`, 'day', 'winter'));
    expect(kinds.size).toBeGreaterThanOrEqual(3);
  });
});

describe('pet actor state machine', () => {
  const env = { emotion: 'calm' as const, sleeping: false, sick: false, size: 32, float: false, personality: pet(hatched()).personality, obstacles: [], bond: 10 };
  it('never leaves the room and never gets stuck in a timed state', () => {
    const a = new PetActor(rng(3));
    for (let i = 0; i < 6000; i++) {
      a.update(33, env);
      expect(a.x).toBeGreaterThanOrEqual(0); expect(a.x).toBeLessThanOrEqual(192);
      expect(a.y).toBeGreaterThanOrEqual(100); expect(a.y).toBeLessThanOrEqual(160);
    }
    a.trigger('EATING', 500);
    for (let i = 0; i < 40; i++) a.update(33, env);
    expect(a.state).not.toBe('EATING');
  });
  it('sleep and evolve states are not interrupted by other triggers', () => {
    const a = new PetActor(rng(4));
    a.update(16, { ...env, sleeping: true });
    expect(a.state).toBe('SLEEPING');
    expect(a.trigger('HAPPY', 500)).toBe(false);
    a.update(16, env);
    expect(a.state).not.toBe('SLEEPING');
    a.trigger('EVOLVING', 1000);
    expect(a.trigger('EATING', 500)).toBe(false);
  });
  it('walks around furniture footprints', () => {
    const a = new PetActor(rng(5));
    const block = [{ x: 60, y: 120, w: 70, h: 30 }];
    for (let i = 0; i < 5000; i++) a.update(33, { ...env, obstacles: block });
    expect(a.x > 60 - 8 && a.x < 130 + 8 && a.y > 118 && a.y < 156).toBe(false);
  });
});
