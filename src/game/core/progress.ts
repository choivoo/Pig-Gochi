import { ACHIEVEMENTS, ACH_BY_ID } from '../../data/achievements';
import { BALANCE as B } from '../../data/balance';
import { DAILY_POOL, MISSION_BY_ID, WEEKLY_POOL } from '../../data/missions';
import type { SaveData } from '../../types';
import { dayDiff, dayKey, hashString, rng, shuffle, weekKey } from './util';

export type GameEvent =
  | { type: 'feed'; foodId: string; reaction: 'fav' | 'dislike' | 'normal' }
  | { type: 'pet'; rewarded: boolean }
  | { type: 'bathe' }
  | { type: 'sleep' }
  | { type: 'wake' }
  | { type: 'heal'; kind: string }
  | { type: 'play'; toyId: string }
  | { type: 'hatch' }
  | { type: 'evolve'; from: string; to: string }
  | { type: 'special' }
  | { type: 'toast'; text: string; icon?: string }
  | { type: 'coins'; amount: number }
  | { type: 'achievement'; id: string }
  | { type: 'mission'; id: string };

export interface Ctx { s: SaveData; now: number; events: GameEvent[] }
export interface Outcome { ok: boolean; message: string; data?: Record<string, number | string | boolean> }
export interface ActionResult extends Outcome { save: SaveData; events: GameEvent[] }

export function cloneSave(s: SaveData): SaveData {
  return structuredClone(s);
}

/** Runs `fn` on a cloned save; failed actions return the original save untouched. */
export function runAction(save: SaveData, now: number, fn: (c: Ctx) => Outcome): ActionResult {
  const c: Ctx = { s: cloneSave(save), now, events: [] };
  const out = fn(c);
  if (!out.ok) return { ...out, save, events: [] };
  c.s.lastSavedAt = now;
  return { ...out, save: c.s, events: c.events };
}

export const activePet = (s: SaveData) => (s.activePetId ? s.ownedPets[s.activePetId] : undefined);

/** Reward guard: returns true only the first time a key is claimed. */
export function claimOnce(c: Ctx, key: string): boolean {
  if (c.s.claimed.includes(key)) return false;
  c.s.claimed.push(key);
  if (c.s.claimed.length > 4000) c.s.claimed = c.s.claimed.slice(-3000);
  return true;
}

export function addCoins(c: Ctx, amount: number, earned = true): void {
  const a = Math.max(0, Math.floor(amount));
  if (a === 0) return;
  c.s.coins += a;
  if (earned) c.s.counters.coinsEarned = (c.s.counters.coinsEarned ?? 0) + a;
  c.events.push({ type: 'coins', amount: a });
}

export function spendCoins(c: Ctx, amount: number): boolean {
  if (c.s.coins < amount || amount < 0) return false;
  c.s.coins -= amount;
  c.s.counters.coinsSpent = (c.s.counters.coinsSpent ?? 0) + amount;
  return true;
}

/** Increments a counter and the matching missions, then re-evaluates achievements. */
export function track(c: Ctx, key: string, n = 1): void {
  c.s.counters[key] = (c.s.counters[key] ?? 0) + n;
  for (const m of [...c.s.missions.daily, ...c.s.missions.weekly]) {
    const def = MISSION_BY_ID[m.id];
    if (def && def.event === key && !m.claimed) m.progress = Math.min(def.target, m.progress + n);
  }
  checkAchievements(c);
}

export function achievementProgress(s: SaveData, counter: string): number {
  if (counter === 'dexCount') return Object.keys(s.encyclopedia).length;
  return s.counters[counter] ?? 0;
}

export function checkAchievements(c: Ctx): void {
  for (const a of ACHIEVEMENTS) {
    if (c.s.achievements[a.id]) continue;
    if (achievementProgress(c.s, a.counter) >= a.target) {
      c.s.achievements[a.id] = { unlockedAt: c.now };
      if (claimOnce(c, `ach:${a.id}`)) addCoins(c, a.reward);
      c.events.push({ type: 'achievement', id: a.id });
    }
  }
}

export function ensureMissions(c: Ctx): void {
  const m = c.s.missions;
  const dk = dayKey(c.now);
  const wk = weekKey(c.now);
  if (m.dayKey !== dk) {
    const picks = shuffle(DAILY_POOL, rng(hashString('d' + dk))).slice(0, 3);
    m.dayKey = dk;
    m.daily = picks.map((d) => ({ id: d.id, progress: 0, claimed: false }));
  }
  if (m.weekKey !== wk) {
    const picks = shuffle(WEEKLY_POOL, rng(hashString('w' + wk))).slice(0, 2);
    m.weekKey = wk;
    m.weekDays = [];
    m.weekly = picks.map((d) => ({ id: d.id, progress: 0, claimed: false }));
  }
}

/** Marks today as an "interaction day" (weekly mission). */
export function markActiveDay(c: Ctx): void {
  const dk = dayKey(c.now);
  const m = c.s.missions;
  if (!m.weekDays.includes(dk)) {
    m.weekDays.push(dk);
    for (const w of m.weekly) {
      const def = MISSION_BY_ID[w.id];
      if (def?.event === 'activeDays' && !w.claimed) w.progress = Math.min(def.target, m.weekDays.length);
    }
  }
}

export function claimMission(save: SaveData, now: number, id: string): ActionResult {
  return runAction(save, now, (c) => {
    const m = [...c.s.missions.daily, ...c.s.missions.weekly].find((x) => x.id === id);
    const def = MISSION_BY_ID[id];
    if (!m || !def) return { ok: false, message: '알 수 없는 미션이에요.' };
    if (m.claimed) return { ok: false, message: '이미 받은 보상이에요.' };
    if (m.progress < def.target) return { ok: false, message: '아직 완료하지 못했어요.' };
    const key = `mission:${def.weekly ? c.s.missions.weekKey : c.s.missions.dayKey}:${id}`;
    m.claimed = true;
    if (claimOnce(c, key)) addCoins(c, def.coins);
    c.events.push({ type: 'mission', id });
    return { ok: true, message: `${def.title} 완료! 코인 ${def.coins}개를 받았어요.` };
  });
}

export interface LoginReward { coins: number; streak: number; first: boolean }
/** Gentle streak: a missed day halves the streak instead of resetting it. */
export function dailyLogin(c: Ctx): LoginReward | null {
  const dk = dayKey(c.now);
  if (c.s.lastLoginDay === dk) return null;
  const prev = c.s.lastLoginDay;
  if (!prev) c.s.streak = 1;
  else {
    const diff = dayDiff(prev, dk);
    c.s.streak = diff === 1 ? c.s.streak + 1 : Math.max(1, Math.floor(c.s.streak / 2));
  }
  c.s.lastLoginDay = dk;
  const coins = B.economy.streakDailyCoins * Math.min(c.s.streak, B.economy.streakMaxDays);
  if (claimOnce(c, `login:${dk}`)) addCoins(c, coins);
  return { coins, streak: c.s.streak, first: !prev };
}

export { ACH_BY_ID };
