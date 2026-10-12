import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../src/data/balance';
import { ALL_SPECIES_IDS, SPECIES } from '../../src/data/pets';
import { chooseEvolution, evolutionReady, evolve, scoreCandidate } from '../../src/game/core/evolution';
import { emptyCare } from '../../src/game/core/pet';
import { hatched, pet, T0, withPet } from '../helpers';

const care = (o: Partial<ReturnType<typeof emptyCare>>) => ({ ...emptyCare(), ...o });

describe('evolution', () => {
  it('is not ready before the growth time and ready after', () => {
    let s = hatched();
    expect(evolutionReady(pet(s))).toBeNull();
    s = withPet(s, { growthMinutes: BALANCE.growth.babyToChildMinutes });
    expect(evolutionReady(pet(s))).toBe('child');
    expect(evolutionReady({ ...pet(s), sleeping: true })).toBeNull();
  });
  it('baby: affection care -> mongsil, rest care -> gureumi', () => {
    const a = withPet(hatched(), { growthMinutes: 50, care: care({ happyMinutes: 280, bondGained: 40, strokes: 40 }) });
    expect(chooseEvolution(pet(a)).to).toBe('mongsil');
    const b = withPet(hatched(), { growthMinutes: 50, care: care({ sleepCount: 6, restMinutes: 200, cleanMinutes: 250 }) });
    expect(chooseEvolution(pet(b)).to).toBe('gureumi');
  });
  it('is deterministic for identical records, including ties', () => {
    const p = withPet(hatched(), { growthMinutes: 50 });
    const a = chooseEvolution(pet(p));
    for (let i = 0; i < 20; i++) expect(chooseEvolution(pet(p))).toEqual(a);
  });
  it('score function = weighted care + personality + preference', () => {
    const p = withPet(hatched(), { care: care({ happyMinutes: 300 }) });
    const hi = scoreCandidate(pet(p), 'mongsil');
    const lo = scoreCandidate(pet(hatched()), 'mongsil');
    expect(hi).toBeGreaterThan(lo);
  });
  it('every non-final species has candidates that exist', () => {
    for (const id of ALL_SPECIES_IDS) for (const c of SPECIES[id].evolutionCandidates) expect(SPECIES[c]).toBeDefined();
    expect(ALL_SPECIES_IDS.length).toBe(21);
    expect(ALL_SPECIES_IDS.filter((i) => SPECIES[i].growthStage === 'baby').length).toBe(3);
    expect(ALL_SPECIES_IDS.filter((i) => SPECIES[i].growthStage === 'child').length).toBe(6);
    expect(ALL_SPECIES_IDS.filter((i) => SPECIES[i].growthStage === 'adult').length).toBe(12);
  });
  it('evolve changes species, registers the dex, records history, pays first-evolution bonus once', () => {
    const s = withPet(hatched(), { growthMinutes: 60, care: care({ happyMinutes: 280, bondGained: 40 }) });
    const r = evolve(s, T0 + 1000);
    expect(r.ok).toBe(true);
    const p = pet(r.save);
    expect(p.speciesId).toBe('mongsil');
    expect(p.stage).toBe('child');
    expect(p.growthMinutes).toBe(0);
    expect(p.history).toHaveLength(1);
    expect(r.save.encyclopedia.mongsil).toBeDefined();
    expect(r.save.achievements.evo1).toBeDefined();
    expect(r.save.claimed).toContain('firstEvolution');
    // cannot evolve again right away
    expect(evolve(r.save, T0 + 2000).ok).toBe(false);
  });
  it('can grow from egg to every adult form with the right care (scenario F)', () => {
    const reachable = new Set<string>();
    const profiles = [care({ happyMinutes: 300, bondGained: 40, strokes: 40, favFoodCount: 6 }), care({ sleepCount: 6, restMinutes: 200, cleanMinutes: 300, nightMinutes: 120 }), care({ minigames: 8, toyPlays: 10, rhythmPlays: 4, feeds: 25 }), care({ baths: 6, cleanMinutes: 300, roomScore: 10, nightMinutes: 100 })];
    for (const egg of ['starlight', 'flame', 'dew'] as const) {
      for (const p1 of profiles) for (const p2 of profiles) {
        let s = withPet(hatched(T0, egg), { growthMinutes: 100, care: p1 });
        s = evolve(s, T0 + 10).save;
        s = withPet(s, { growthMinutes: 600, care: p2 });
        s = evolve(s, T0 + 20).save;
        reachable.add(pet(s).speciesId);
        expect(pet(s).stage).toBe('adult');
      }
    }
    // all 12 adult forms must be reachable through some care style
    const adults = ALL_SPECIES_IDS.filter((i) => SPECIES[i].growthStage === 'adult');
    const missing = adults.filter((a) => !reachable.has(a));
    expect(missing).toEqual([]);
  });
});
