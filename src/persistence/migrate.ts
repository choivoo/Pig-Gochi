import { BALANCE } from '../data/balance';
import { SPECIES } from '../data/pets';
import { DEFAULT_SETTINGS, emptySave } from '../game/core/newGame';
import { emptyCare, personalityFor } from '../game/core/pet';
import { clamp } from '../game/core/util';
import type { PetInstance, SaveData, Stats } from '../types';

type Raw = Record<string, unknown>;
const isObj = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const str = (v: unknown, d: string): string => (typeof v === 'string' ? v : d);

/** Each migration upgrades a raw object from version N to N+1. Add new ones at the end. */
export const MIGRATIONS: Record<number, (raw: Raw) => Raw> = {
  // v0 (prototype saves without cooldown/streak bookkeeping) -> v1
  0: (raw) => ({ ...raw, cooldowns: raw.cooldowns ?? {}, streak: raw.streak ?? 0, lastLoginDay: raw.lastLoginDay ?? '', claimed: raw.claimed ?? [], schemaVersion: 1 }),
};

export function migrate(raw: Raw): Raw {
  let cur = raw;
  let v = num(cur.schemaVersion, 0);
  if (v > BALANCE.schemaVersion) throw new Error('이 저장 데이터는 더 최신 버전의 게임에서 만들어졌어요.');
  while (v < BALANCE.schemaVersion) {
    const fn = MIGRATIONS[v];
    if (!fn) throw new Error(`지원하지 않는 저장 버전(${v})이에요.`);
    cur = fn(cur);
    v = num(cur.schemaVersion, v + 1);
  }
  return cur;
}

const STAT_KEYS: (keyof Stats)[] = ['satiety', 'happiness', 'cleanliness', 'energy', 'health', 'bond', 'stress'];

function normalizePet(raw: unknown): PetInstance | null {
  if (!isObj(raw)) return null;
  const sid = str(raw.speciesId, '');
  const isEgg = sid.startsWith('egg_') && ['starlight', 'flame', 'dew'].includes(sid.slice(4));
  if (!isEgg && !SPECIES[sid]) return null;
  const rs = isObj(raw.stats) ? raw.stats : {};
  const stats = {} as Stats;
  for (const k of STAT_KEYS) stats[k] = clamp(num(rs[k], k === 'stress' ? 0 : 80));
  const base = isEgg ? 'mongle' : sid;
  const pers = personalityFor(base);
  if (isObj(raw.personality)) for (const k of Object.keys(pers) as (keyof typeof pers)[]) pers[k] = clamp(num((raw.personality as Raw)[k], pers[k]));
  const care = emptyCare();
  if (isObj(raw.care)) for (const k of Object.keys(care) as (keyof typeof care)[]) care[k] = Math.max(0, num((raw.care as Raw)[k], 0));
  const stage = (isEgg ? 'egg' : SPECIES[sid].growthStage);
  return {
    uid: str(raw.uid, `pet_${Math.random().toString(36).slice(2)}`),
    speciesId: sid, name: str(raw.name, isEgg ? '알' : SPECIES[sid].name).slice(0, 12), stage,
    hatchTaps: Math.max(0, Math.floor(num(raw.hatchTaps, 0))), stats, bornAt: num(raw.bornAt, Date.now()), stageStartedAt: num(raw.stageStartedAt, Date.now()),
    growthMinutes: Math.max(0, num(raw.growthMinutes, 0)), sleeping: raw.sleeping === true && !isEgg,
    illness: ['cold', 'tummy', 'tired', 'weak'].includes(str(raw.illness, '')) ? (raw.illness as PetInstance['illness']) : null,
    badMinutes: Math.max(0, num(raw.badMinutes, 0)), personality: pers, seed: num(raw.seed, 1) >>> 0,
    accessories: isObj(raw.accessories) ? (Object.fromEntries(Object.entries(raw.accessories).filter(([k, v]) => ['head', 'face', 'neck', 'side'].includes(k) && typeof v === 'string')) as PetInstance['accessories']) : {},
    care, history: Array.isArray(raw.history) ? (raw.history as PetInstance['history']).filter((h) => isObj(h) && typeof h.to === 'string').slice(-40) : [],
    lastFedAt: num(raw.lastFedAt, 0), lastStrokeAt: num(raw.lastStrokeAt, 0), strokeStreak: Math.max(0, num(raw.strokeStreak, 0)), special: raw.special === true,
  };
}

export interface LoadResult { ok: boolean; save?: SaveData; errors: string[]; repaired: boolean }

/** Validates + repairs untrusted data. Unknown pets/items are dropped, never executed. */
export function normalizeSave(input: unknown, now = Date.now()): LoadResult {
  const errors: string[] = [];
  if (!isObj(input)) return { ok: false, errors: ['저장 데이터 형식이 올바르지 않아요.'], repaired: false };
  let raw: Raw;
  try { raw = migrate(input); } catch (e) { return { ok: false, errors: [(e as Error).message], repaired: false }; }
  const base = emptySave(now);
  const pets: Record<string, PetInstance> = {};
  if (isObj(raw.ownedPets)) for (const [k, v] of Object.entries(raw.ownedPets)) {
    const p = normalizePet(v);
    if (p) pets[k] = { ...p, uid: k }; else errors.push(`알 수 없는 펫 데이터를 건너뛰었어요(${k}).`);
  }
  let active = typeof raw.activePetId === 'string' && pets[raw.activePetId] ? raw.activePetId : null;
  if (!active) active = Object.keys(pets)[0] ?? null;
  if (!active) return { ok: false, errors: [...errors, '저장 데이터에 펫이 없어요.'], repaired: false };
  const prof = isObj(raw.playerProfile) ? raw.playerProfile : {};
  const inv: Record<string, number> = {};
  if (isObj(raw.inventory)) for (const [k, v] of Object.entries(raw.inventory)) if (typeof v === 'number' && v > 0 && Number.isFinite(v)) inv[k] = Math.min(999, Math.floor(v));
  const layout = Array.isArray(raw.roomLayout) ? (raw.roomLayout as unknown[]).filter(isObj).map((l, i) => ({ uid: str(l.uid, `p${i}`), itemId: str(l.itemId, ''), x: num(l.x, 0), y: num(l.y, 144), flip: l.flip === true })).filter((l) => l.itemId) : base.roomLayout;
  const ms = isObj(raw.missions) ? raw.missions : {};
  const settings = { ...DEFAULT_SETTINGS, ...(isObj(raw.settings) ? raw.settings : {}) };
  const clampV = (v: unknown, d: number) => clamp(num(v, d), 0, 1);
  const save: SaveData = {
    schemaVersion: BALANCE.schemaVersion,
    playerProfile: { name: str(prof.name, '트레이너').slice(0, 12), icon: str(prof.icon, 'star') },
    activePetId: active, ownedPets: pets, coins: Math.max(0, Math.floor(num(raw.coins, base.coins))), inventory: inv,
    ownedRooms: Array.isArray(raw.ownedRooms) && raw.ownedRooms.length ? (raw.ownedRooms as unknown[]).filter((x): x is string => typeof x === 'string') : ['cozy'],
    roomTheme: str(raw.roomTheme, 'cozy'), roomLayout: layout,
    encyclopedia: isObj(raw.encyclopedia) ? (Object.fromEntries(Object.entries(raw.encyclopedia).filter(([k, v]) => SPECIES[k] && isObj(v)).map(([k, v]) => [k, { discoveredAt: num((v as Raw).discoveredAt, now) }])) as SaveData['encyclopedia']) : {},
    achievements: isObj(raw.achievements) ? (Object.fromEntries(Object.entries(raw.achievements).filter(([, v]) => isObj(v)).map(([k, v]) => [k, { unlockedAt: num((v as Raw).unlockedAt, now) }])) as SaveData['achievements']) : {},
    counters: isObj(raw.counters) ? (Object.fromEntries(Object.entries(raw.counters).filter(([, v]) => typeof v === 'number' && Number.isFinite(v))) as Record<string, number>) : {},
    missions: {
      dayKey: str(ms.dayKey, ''), weekKey: str(ms.weekKey, ''), weekDays: Array.isArray(ms.weekDays) ? (ms.weekDays as unknown[]).filter((x): x is string => typeof x === 'string') : [],
      daily: Array.isArray(ms.daily) ? (ms.daily as unknown[]).filter(isObj).map((m) => ({ id: str(m.id, ''), progress: num(m.progress, 0), claimed: m.claimed === true })) : [],
      weekly: Array.isArray(ms.weekly) ? (ms.weekly as unknown[]).filter(isObj).map((m) => ({ id: str(m.id, ''), progress: num(m.progress, 0), claimed: m.claimed === true })) : [],
    },
    minigameRecords: isObj(raw.minigameRecords) ? (raw.minigameRecords as SaveData['minigameRecords']) : {},
    settings: { ...settings, volume: clampV(settings.volume, 0.7), musicVolume: clampV(settings.musicVolume, 0.5), sfxVolume: clampV(settings.sfxVolume, 0.8) },
    tutorial: isObj(raw.tutorial) ? { step: Math.max(0, Math.floor(num(raw.tutorial.step, 0))), done: raw.tutorial.done === true } : { step: 0, done: false },
    claimed: Array.isArray(raw.claimed) ? (raw.claimed as unknown[]).filter((x): x is string => typeof x === 'string') : [],
    cooldowns: {}, createdAt: num(raw.createdAt, now), lastSavedAt: num(raw.lastSavedAt, now), lastSimulationAt: num(raw.lastSimulationAt, now),
    lastLoginDay: str(raw.lastLoginDay, ''), streak: Math.max(0, Math.floor(num(raw.streak, 0))),
  };
  // keep layout within what the player owns
  const counts: Record<string, number> = {};
  save.roomLayout = save.roomLayout.filter((l) => { counts[l.itemId] = (counts[l.itemId] ?? 0) + 1; return counts[l.itemId] <= (save.inventory[`furn:${l.itemId}`] ?? 0); });
  if (!save.ownedRooms.includes(save.roomTheme)) save.roomTheme = 'cozy';
  if (!save.ownedRooms.includes('cozy')) save.ownedRooms.unshift('cozy');
  return { ok: true, save, errors, repaired: errors.length > 0 };
}
