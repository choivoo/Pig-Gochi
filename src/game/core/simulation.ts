import { BALANCE as B } from '../../data/balance';
import type { Illness, PetInstance, Personality, SaveData, Stats } from '../../types';
import { clamp, hourOf, isNightHour } from './util';

const DECAY_MULT: Partial<Record<Personality, Partial<Record<keyof typeof B.decayPerHour, number>>>> = {
  glutton: { satiety: 1.25 },
  lively: { energy: 1.15, happiness: 1.1 },
  sleepy: { energy: 1.1 },
  calm: { happiness: 0.9 },
  affectionate: { happiness: 1.1 },
};

function topPersonalities(p: PetInstance): Personality[] {
  return (Object.entries(p.personality) as [Personality, number][]).sort((a, b) => b[1] - a[1]).slice(0, 2).map((x) => x[0]);
}
function decayMult(p: PetInstance, key: keyof typeof B.decayPerHour): number {
  let m = 1;
  for (const t of topPersonalities(p)) m *= DECAY_MULT[t]?.[key] ?? 1;
  return m;
}

const lowest = (s: Stats): 'satiety' | 'happiness' | 'cleanliness' | 'energy' => {
  const keys = ['satiety', 'happiness', 'cleanliness', 'energy'] as const;
  return keys.reduce((a, b) => (s[b] < s[a] ? b : a));
};
export function illnessFor(s: Stats): Illness {
  const k = lowest(s);
  return k === 'satiety' ? 'tummy' : k === 'energy' ? 'tired' : k === 'cleanliness' ? 'cold' : 'weak';
}
export const ILLNESS_NAME: Record<Illness, string> = { cold: '감기', tummy: '배탈', tired: '피로', weak: '컨디션 저하' };

export interface TickOpts {
  /** timestamp the chunk starts at (for time-of-day) */
  at: number;
  offline?: boolean;
}

/** Advances one pet by `minutes`. Pure: returns a new pet. Deterministic. */
export function tickPet(pet: PetInstance, minutes: number, opts: TickOpts): PetInstance {
  if (!(minutes > 0) || pet.stage === 'egg') return pet;
  const p: PetInstance = { ...pet, stats: { ...pet.stats }, care: { ...pet.care } };
  let left = minutes;
  let at = opts.at;
  while (left > 0) {
    const step = Math.min(left, 10);
    stepPet(p, step, at, !!opts.offline);
    left -= step;
    at += step * 60000;
  }
  return p;
}

function stepPet(p: PetInstance, min: number, at: number, offline: boolean): void {
  const h = min / 60;
  const s = p.stats;
  const night = isNightHour(hourOf(at));
  if (p.sleeping) {
    s.energy = clamp(s.energy + B.sleepPerHour.energy * h);
    s.satiety = clamp(s.satiety + B.sleepPerHour.satiety * h);
    s.cleanliness = clamp(s.cleanliness + B.sleepPerHour.cleanliness * h);
    s.stress = clamp(s.stress - B.stress.recoverPerHourGood * 2 * h);
    if (!offline) p.care.restMinutes += min;
    if (s.energy >= B.wakeEnergy) {
      p.sleeping = false;
      p.care.sleepCount += 1;
    }
  } else {
    const sick = p.illness ? 1.3 : 1;
    s.satiety = clamp(s.satiety - B.decayPerHour.satiety * decayMult(p, 'satiety') * h);
    s.happiness = clamp(s.happiness - B.decayPerHour.happiness * decayMult(p, 'happiness') * sick * h);
    s.cleanliness = clamp(s.cleanliness - B.decayPerHour.cleanliness * h);
    s.energy = clamp(s.energy - B.decayPerHour.energy * decayMult(p, 'energy') * h);
    const bad = s.satiety < B.stress.badThreshold || s.happiness < B.stress.badThreshold || s.cleanliness < B.stress.badThreshold || s.energy < B.stress.badThreshold;
    s.stress = clamp(s.stress + (bad ? B.stress.gainPerHourBad : -B.stress.recoverPerHourGood) * h);
    if (!offline) {
      if (s.happiness >= 60) p.care.happyMinutes += min;
      if (s.cleanliness >= 60) p.care.cleanMinutes += min;
      if (night) p.care.nightMinutes += min;
    }
  }
  // health
  const veryBad = Math.min(s.satiety, s.happiness, s.cleanliness, s.energy) < B.health.badStatThreshold;
  p.badMinutes = veryBad ? p.badMinutes + min : Math.max(0, p.badMinutes - min * 2);
  if (p.badMinutes >= B.health.badMinutesForDamage) s.health = clamp(s.health - B.health.damagePerHour * h);
  else if (!p.illness && Math.min(s.satiety, s.happiness, s.cleanliness, s.energy) > 40) s.health = clamp(s.health + B.health.recoverPerHourGood * h);
  if (p.illness) s.health = clamp(s.health - 1 * h);
  if (!p.illness && p.badMinutes >= B.health.illnessMinBadMinutes) {
    p.illness = illnessFor(s);
  }
  // growth: only counts while not neglected
  const neglected = Math.min(s.satiety, s.cleanliness, s.happiness) < B.growth.neglectThreshold || s.health < 20;
  if (!offline && !neglected) p.growthMinutes += min;
}

export interface OfflineReport {
  elapsedMs: number;
  appliedMinutes: number;
  away: boolean; // true when a meaningful time passed
  clockWentBack: boolean;
  before?: Stats;
  after?: Stats;
}

/**
 * Deterministic offline settlement of the active pet. Calling twice with the same `now`
 * is a no-op (lastSimulationAt is advanced), so decay can never be applied twice.
 */
export function settleOffline(save: SaveData, now: number): { save: SaveData; report: OfflineReport } {
  const raw = now - save.lastSimulationAt;
  const out: SaveData = { ...save, lastSimulationAt: now };
  if (!(raw > 0)) {
    return { save: out, report: { elapsedMs: 0, appliedMinutes: 0, away: false, clockWentBack: raw < 0 } };
  }
  const hours = Math.min(raw / 3600000, B.offline.maxPlausibleHours);
  const applied = Math.min(hours, B.offline.capHours) * 60;
  const pet = save.activePetId ? save.ownedPets[save.activePetId] : undefined;
  if (!pet || pet.stage === 'egg' || applied < 1) {
    return { save: out, report: { elapsedMs: raw, appliedMinutes: 0, away: raw > 30 * 60000, clockWentBack: false } };
  }
  const before = { ...pet.stats };
  let next = tickPet(pet, applied, { at: save.lastSimulationAt, offline: true });
  // floors: never worse than max(floor, start value) -> always recoverable
  const stats = { ...next.stats };
  (Object.keys(B.offline.floors) as (keyof typeof B.offline.floors)[]).forEach((k) => {
    const floor = Math.min(before[k], B.offline.floors[k]);
    if (k === 'stress') stats.stress = Math.min(stats.stress, before.stress + B.offline.maxStressGain);
    else stats[k] = Math.max(stats[k], floor);
  });
  const credit = Math.min(applied, B.offline.growthCreditMinutes);
  next = { ...next, stats, badMinutes: 0, growthMinutes: next.growthMinutes + (Math.min(stats.satiety, stats.cleanliness, stats.happiness) < B.growth.neglectThreshold ? 0 : credit) };
  out.ownedPets = { ...save.ownedPets, [pet.uid]: next };
  return { save: out, report: { elapsedMs: raw, appliedMinutes: applied, away: raw > 30 * 60000, clockWentBack: false, before, after: stats } };
}
