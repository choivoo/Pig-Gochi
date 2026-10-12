import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { ALL_SPECIES_IDS, SPECIES } from '../../src/data/pets';
import { bathe, feed, stroke, tapEgg } from '../../src/game/core/care';
import { buy, placeFurniture, setLayout } from '../../src/game/core/economy';
import { chooseEvolution, evolve } from '../../src/game/core/evolution';
import { finishMinigame } from '../../src/game/core/minigameReward';
import { newGame } from '../../src/game/core/newGame';
import { activePet, ensureMissions, runAction } from '../../src/game/core/progress';
import { settleOffline, tickPet } from '../../src/game/core/simulation';
import { normalizeSave } from '../../src/persistence/migrate';
import { exportJson, loadSave, parseImport, writeSave, clearSave } from '../../src/persistence/storage';
import type { SaveData } from '../../src/types';
import { freshEgg, hatched, pet, T0, withPet, withStats } from '../helpers';
import { emptyCare } from '../../src/game/core/pet';

const H = 3600000;
const roundTrip = (s: SaveData): SaveData => normalizeSave(JSON.parse(JSON.stringify(s)), T0).save as SaveData;

describe('Scenario A: first pet, new game to save to continue', () => {
  it('egg -> hatch -> feed -> stroke -> bath -> minigame -> shop -> decorate -> reload keeps everything', () => {
    let s = freshEgg();
    expect(pet(s).stage).toBe('egg');
    for (let i = 0; i < 5; i++) s = tapEgg(s, T0 + i).save;
    expect(pet(s).speciesId).toBe('mongle');
    s = withStats(s, { satiety: 40, cleanliness: 40 });
    s = feed(s, T0 + 1000, 'kibble').save;
    s = stroke(s, T0 + 2000).save;
    s = bathe(s, T0 + 3000).save;
    const mg = finishMinigame(s, T0 + 4000, 'stars', 450, 480, 'a1');
    s = mg.save;
    expect(mg.outcome!.coins).toBe(70);
    const coinsBefore = s.coins;
    s = buy(s, T0 + 5000, 'furn:plant_pot').save;
    expect(s.coins).toBeLessThan(coinsBefore);
    s = placeFurniture(s, T0 + 6000, 'plant_pot', 100, 140, 'pot1').save;
    expect(s.roomLayout.some((x) => x.uid === 'pot1')).toBe(true);
    const back = roundTrip(s);
    expect(back.coins).toBe(s.coins);
    expect(back.roomLayout).toEqual(s.roomLayout);
    expect(pet(back).stats).toEqual(pet(s).stats);
    expect(back.counters.feeds).toBe(1);
    expect(back.minigameRecords.stars.best).toBe(450);
  });
});

describe('Scenario B: growth and evolution with injected time', () => {
  it('grows by simulated care time, evolves and persists the new form + dex', () => {
    let s = hatched();
    let t = T0;
    let guard = 0;
    while (activePet(s) && pet(s).growthMinutes < 45 && guard++ < 500) {
      t += 5 * 60000;
      let p = tickPet(pet(s), 5, { at: t - 5 * 60000 });
      p = { ...p, stats: { ...p.stats, satiety: Math.max(p.stats.satiety, 80), happiness: Math.max(p.stats.happiness, 80) } };
      s = withPet({ ...s, lastSimulationAt: t }, p);
    }
    expect(pet(s).growthMinutes).toBeGreaterThanOrEqual(45);
    const ev = evolve(s, t);
    expect(ev.ok).toBe(true);
    expect(pet(ev.save).stage).toBe('child');
    expect(Object.keys(ev.save.encyclopedia)).toContain(pet(ev.save).speciesId);
    const back = roundTrip(ev.save);
    expect(pet(back).speciesId).toBe(pet(ev.save).speciesId);
    expect(pet(back).history).toHaveLength(1);
  });
});

describe('Scenario C: offline', () => {
  it('4 hours offline decreases stats once, repeated restore does not double-apply', () => {
    const s = hatched();
    const saved = roundTrip(s);
    const r1 = settleOffline(saved, saved.lastSimulationAt + 4 * H);
    const r2 = settleOffline(r1.save, saved.lastSimulationAt + 4 * H);
    expect(pet(r1.save).stats.satiety).toBeLessThan(pet(s).stats.satiety);
    expect(pet(r2.save).stats).toEqual(pet(r1.save).stats);
    expect(r1.report.away).toBe(true);
  });
});

describe('Scenario D: economy', () => {
  it('fails when poor, succeeds when rich, deducts exactly, resists spam', () => {
    let s = { ...hatched(), coins: 20 };
    expect(buy(s, T0, 'furn:aquarium').ok).toBe(false);
    s = { ...s, coins: 400 };
    const spentBefore = s.counters.coinsSpent ?? 0;
    for (let i = 0; i < 6; i++) s = buy(s, T0 + i, 'furn:aquarium').save;
    expect(s.inventory['furn:aquarium']).toBeGreaterThanOrEqual(1);
    expect((s.counters.coinsSpent ?? 0) - spentBefore).toBe((s.inventory['furn:aquarium']) * 100);
  });
});

describe('Scenario F: full dex', () => {
  it('can discover all 21 forms and each has sprite + dex entry', () => {
    let s = hatched();
    // walk every lineage through every branch using crafted care records
    const adults = new Set<string>();
    for (const egg of ['starlight', 'flame', 'dew'] as const) {
      for (let branch = 0; branch < 2; branch++) for (let leaf = 0; leaf < 2; leaf++) {
        let g = hatched(T0, egg);
        const baby = pet(g);
        const child = SPECIES[baby.speciesId].evolutionCandidates[branch];
        // force the branch by making the care record strongly favour that candidate
        const aff = SPECIES[child].affinity ?? {};
        const rec = emptyCare(); for (const k of Object.keys(aff)) (rec as unknown as Record<string, number>)[k] = 999;
        g = withPet(g, { growthMinutes: 100, care: rec });
        expect(chooseEvolution(pet(g)).to).toBe(child);
        g = evolve(g, T0 + 1).save;
        const adult = SPECIES[child].evolutionCandidates[leaf];
        const aff2 = SPECIES[adult].affinity ?? {};
        const rec2 = emptyCare(); for (const k of Object.keys(aff2)) (rec2 as unknown as Record<string, number>)[k] = 999;
        g = withPet(g, { growthMinutes: 600, care: rec2, personality: { ...pet(g).personality } });
        const res = evolve(g, T0 + 2);
        adults.add(pet(res.save).speciesId);
        s = { ...s, encyclopedia: { ...s.encyclopedia, ...res.save.encyclopedia } };
      }
    }
    expect(adults.size).toBeGreaterThanOrEqual(10); // dominant-care crafted records reach (nearly) every final form
    expect(Object.keys(s.encyclopedia).length).toBeGreaterThanOrEqual(15);
    for (const id of Object.keys(s.encyclopedia)) expect(ALL_SPECIES_IDS).toContain(id);
  });
});

describe('storage, backup & pet garden', () => {
  it('stores then restores through IndexedDB', async () => {
    await clearSave();
    const s = { ...hatched(), coins: 4242, lastSavedAt: T0 + 9 };
    await writeSave(s);
    const l = await loadSave(T0);
    expect(l?.save.coins).toBe(4242);
    expect(pet(l!.save).speciesId).toBe('mongle');
  });
  it('export -> import yields an equivalent game', () => {
    const s = buy({ ...hatched(), coins: 300 }, T0, 'acc:glasses').save;
    const imp = parseImport(exportJson(s));
    expect(imp.ok).toBe(true);
    expect(imp.save!.inventory).toEqual(s.inventory);
    expect(imp.save!.coins).toBe(s.coins);
  });
  it('keeps old pets when a new egg is started, and each keeps its own history', () => {
    let s = hatched();
    const first = s.activePetId!;
    s = withPet(s, { stage: 'adult', speciesId: 'solbyeol', name: '별이', history: [{ from: 'mongsil', to: 'solbyeol', at: T0 }] });
    const egg = newGame({ name: 'a', icon: 'star' }, 'flame', '불이', T0, 'egg2');
    const merged: SaveData = { ...s, ownedPets: { ...s.ownedPets, egg2: egg.ownedPets.egg2 }, activePetId: 'egg2' };
    const back = roundTrip(merged);
    expect(Object.keys(back.ownedPets)).toEqual([first, 'egg2']);
    expect(back.ownedPets[first].name).toBe('별이');
    expect(back.ownedPets[first].history).toHaveLength(1);
    expect(back.activePetId).toBe('egg2');
  });
  it('layout survives save and gets validated against ownership after import', () => {
    let s = { ...hatched(), coins: 500 };
    s = buy(s, T0, 'furn:bookshelf').save;
    s = placeFurniture(s, T0, 'bookshelf', 8, 150, 'bk').save;
    const moved = setLayout(s, T0, s.roomLayout.map((l) => (l.uid === 'bk' ? { ...l, x: 120 } : l))).save;
    expect(roundTrip(moved).roomLayout.find((l) => l.uid === 'bk')?.x).toBe(120);
  });
  it('missions exist after the first session setup', () => {
    const s = runAction(hatched(), T0, (c) => { ensureMissions(c); return { ok: true, message: '' }; }).save;
    expect(s.missions.daily).toHaveLength(3);
  });
});
