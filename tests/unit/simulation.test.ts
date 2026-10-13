import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../src/data/balance';
import { settleOffline, tickPet } from '../../src/game/core/simulation';
import { hatched, pet, T0, withPet, withStats } from '../helpers';

const H = 3600000;
describe('simulation', () => {
  it('keeps every stat inside 0..100 even for absurd durations', () => {
    const p = pet(hatched());
    const out = tickPet(p, 100000, { at: T0 });
    for (const v of Object.values(out.stats)) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(100); }
  });
  it('decays awake stats per hour using the balance sheet', () => {
    const p = { ...pet(hatched()), personality: { lively: 0, calm: 0, affectionate: 0, shy: 60, curious: 50, prankster: 0, glutton: 0, sleepy: 0 } };
    p.stats = { ...p.stats, satiety: 100, happiness: 100, cleanliness: 100, energy: 100 };
    const out = tickPet(p, 60, { at: T0 });
    expect(out.stats.satiety).toBeCloseTo(100 - BALANCE.decayPerHour.satiety, 1);
    expect(out.stats.happiness).toBeCloseTo(100 - BALANCE.decayPerHour.happiness, 1);
    expect(out.stats.cleanliness).toBeCloseTo(100 - BALANCE.decayPerHour.cleanliness, 1);
    expect(out.stats.energy).toBeCloseTo(100 - BALANCE.decayPerHour.energy, 1);
  });
  it('restores energy while sleeping and wakes automatically', () => {
    let s = withStats(hatched(), { energy: 20 });
    s = withPet(s, { sleeping: true });
    const out = tickPet(pet(s), 180, { at: T0 });
    expect(out.stats.energy).toBeGreaterThanOrEqual(90);
    expect(out.sleeping).toBe(false);
    expect(out.care.sleepCount).toBe(1);
  });
  it('does not drain health merely because time passed', () => {
    const p = pet(hatched());
    const out = tickPet(p, 120, { at: T0 });
    expect(out.stats.health).toBe(100);
  });
  it('makes the pet ill only after a long neglected period', () => {
    const s = withStats(hatched(), { satiety: 0, happiness: 10, cleanliness: 10, energy: 90 });
    const early = tickPet(pet(s), 60, { at: T0 });
    expect(early.illness).toBeNull();
    const late = tickPet(pet(s), 5 * 60, { at: T0 });
    expect(late.illness).toBe('tummy');
    expect(late.stats.health).toBeLessThan(100);
  });
  it('is deterministic', () => {
    const p = pet(hatched());
    expect(tickPet(p, 777, { at: T0 })).toEqual(tickPet(p, 777, { at: T0 }));
  });
  it('treats negative elapsed time as zero and re-anchors the clock', () => {
    const s = hatched();
    const { save, report } = settleOffline(s, s.lastSimulationAt - 5 * H);
    expect(report.clockWentBack).toBe(true);
    expect(pet(save).stats).toEqual(pet(s).stats);
    expect(save.lastSimulationAt).toBe(s.lastSimulationAt - 5 * H);
  });
  it('caps offline penalty at the configured maximum', () => {
    const s = hatched();
    const a = settleOffline(s, s.lastSimulationAt + 8 * H).save;
    const b = settleOffline(s, s.lastSimulationAt + 500 * H).save;
    expect(pet(b).stats).toEqual(pet(a).stats);
  });
  it('never applies offline decay twice for the same instant', () => {
    const s = hatched();
    const t = s.lastSimulationAt + 4 * H;
    const once = settleOffline(s, t).save;
    const twice = settleOffline(once, t).save;
    expect(pet(twice).stats).toEqual(pet(once).stats);
    expect(twice.lastSimulationAt).toBe(t);
  });
  it('keeps the pet recoverable (floors) after a long absence', () => {
    const s = hatched();
    const out = pet(settleOffline(s, s.lastSimulationAt + 20 * H).save);
    expect(out.stats.satiety).toBeGreaterThanOrEqual(BALANCE.offline.floors.satiety - 20);
    expect(out.stats.health).toBeGreaterThanOrEqual(BALANCE.offline.floors.health);
    expect(out.stats.health).toBeGreaterThan(0);
  });
  it('4 hours offline lowers needs but not catastrophically (scenario C)', () => {
    const s = hatched();
    const before = pet(s).stats;
    const out = pet(settleOffline(s, s.lastSimulationAt + 4 * H).save).stats;
    expect(out.satiety).toBeLessThan(before.satiety);
    expect(out.happiness).toBeLessThan(before.happiness);
    expect(out.satiety).toBeGreaterThan(30);
  });
  it('gives only limited growth credit for offline time', () => {
    const s = hatched();
    const out = pet(settleOffline(s, s.lastSimulationAt + 8 * H).save);
    expect(out.growthMinutes).toBeLessThanOrEqual(BALANCE.offline.growthCreditMinutes);
  });
  it('does not touch eggs', () => {
    const egg = { ...pet(hatched()), stage: 'egg' as const };
    expect(tickPet(egg, 600, { at: T0 })).toBe(egg);
  });
});
