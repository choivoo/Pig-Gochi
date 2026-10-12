import { BALANCE as B } from '../../data/balance';
import type { EggType, SaveData } from '../../types';
import { createEgg } from './pet';
import { dayKey, weekKey } from './util';

export const DEFAULT_SETTINGS = {
  volume: 0.7, musicVolume: 0.5, sfxVolume: 0.8, muted: false, reducedMotion: false, lowPower: false, tutorialSkipAnim: false,
};

export function emptySave(now: number): SaveData {
  return {
    schemaVersion: B.schemaVersion,
    playerProfile: { name: '트레이너', icon: 'star' },
    activePetId: null,
    ownedPets: {},
    coins: B.startCoins,
    inventory: { 'furn:bed_basic': 1, 'furn:dining_table': 1, 'furn:toybox': 1 },
    ownedRooms: ['cozy'],
    roomTheme: 'cozy',
    roomLayout: [
      { uid: 'p1', itemId: 'bed_basic', x: 8, y: 144, flip: false },
      { uid: 'p2', itemId: 'dining_table', x: 136, y: 136, flip: false },
      { uid: 'p3', itemId: 'toybox', x: 160, y: 152, flip: false },
    ],
    encyclopedia: {},
    achievements: {},
    counters: {},
    missions: { dayKey: '', weekKey: '', daily: [], weekly: [], weekDays: [] },
    minigameRecords: {},
    settings: { ...DEFAULT_SETTINGS },
    tutorial: { step: 0, done: false },
    claimed: [],
    cooldowns: {},
    createdAt: now,
    lastSavedAt: now,
    lastSimulationAt: now,
    lastLoginDay: '',
    streak: 0,
  };
}

export function newGame(profile: { name: string; icon: string }, eggType: EggType, eggName: string, now: number, petId = `pet_${now.toString(36)}`): SaveData {
  const s = emptySave(now);
  s.playerProfile = profile;
  const egg = createEgg(eggType, eggName, now, petId);
  s.ownedPets[egg.uid] = egg;
  s.activePetId = egg.uid;
  s.missions.dayKey = '';
  void dayKey; void weekKey;
  return s;
}
