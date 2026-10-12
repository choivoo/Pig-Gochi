import { SPECIES, EGG_BABY } from '../../data/pets';
import type { CareRecord, EggType, Personality, PetInstance, Stats } from '../../types';
import { hashString } from './util';

export const PERSONALITIES: Personality[] = ['lively', 'calm', 'affectionate', 'shy', 'curious', 'prankster', 'glutton', 'sleepy'];

export const emptyCare = (): CareRecord => ({
  happyMinutes: 0, cleanMinutes: 0, restMinutes: 0, nightMinutes: 0, sleepCount: 0, minigames: 0, rhythmPlays: 0,
  favFoodCount: 0, bondGained: 0, recoveries: 0, toyPlays: 0, strokes: 0, feeds: 0, baths: 0, roomScore: 0,
});

export function personalityFor(speciesId: string): Record<Personality, number> {
  const tags = SPECIES[speciesId]?.personalityTags ?? [];
  const o = {} as Record<Personality, number>;
  for (const p of PERSONALITIES) o[p] = tags.includes(p) ? 70 : 25;
  return o;
}

export function createEgg(eggType: EggType, name: string, now: number, id: string): PetInstance {
  const stats: Stats = { satiety: 85, happiness: 80, cleanliness: 95, energy: 90, health: 100, bond: 5, stress: 0 };
  return {
    uid: id, speciesId: `egg_${eggType}`, name, stage: 'egg', hatchTaps: 0, stats, bornAt: now, stageStartedAt: now,
    growthMinutes: 0, sleeping: false, illness: null, badMinutes: 0, personality: personalityFor(EGG_BABY[eggType]),
    seed: hashString(id), accessories: {}, care: emptyCare(), history: [], lastFedAt: 0, lastStrokeAt: 0, strokeStreak: 0, special: false,
  };
}

export const isEgg = (p: PetInstance): boolean => p.stage === 'egg';
export const eggTypeOf = (p: PetInstance): EggType => p.speciesId.replace('egg_', '') as EggType;
export function spriteIdOf(p: PetInstance): string {
  return p.speciesId;
}
