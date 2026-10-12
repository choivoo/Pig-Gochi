import { newGame } from '../src/game/core/newGame';
import { tapEgg } from '../src/game/core/care';
import { BALANCE } from '../src/data/balance';
import { activePet } from '../src/game/core/progress';
import type { PetInstance, SaveData } from '../src/types';

export const T0 = new Date(2026, 5, 10, 12, 0, 0).getTime(); // Wed 12:00 local

export function freshEgg(now = T0, egg: 'starlight' | 'flame' | 'dew' = 'starlight'): SaveData {
  return newGame({ name: '테스터', icon: 'star' }, egg, '별이', now, 'pet_test');
}
export function hatched(now = T0, egg: 'starlight' | 'flame' | 'dew' = 'starlight'): SaveData {
  let s = freshEgg(now, egg);
  for (let i = 0; i < BALANCE.growth.hatchTaps; i++) s = tapEgg(s, now + i).save;
  return s;
}
export function withPet(s: SaveData, patch: Partial<PetInstance>): SaveData {
  const pet = activePet(s) as PetInstance;
  return { ...s, ownedPets: { ...s.ownedPets, [pet.uid]: { ...pet, ...patch } } };
}
export function withStats(s: SaveData, stats: Partial<PetInstance['stats']>): SaveData {
  const pet = activePet(s) as PetInstance;
  return withPet(s, { stats: { ...pet.stats, ...stats } });
}
export const pet = (s: SaveData): PetInstance => activePet(s) as PetInstance;
