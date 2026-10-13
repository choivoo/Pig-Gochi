import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from '../../src/data/achievements';
import { DAILY_POOL, MISSION_BY_ID } from '../../src/data/missions';
import { claimMission, dailyLogin, ensureMissions, runAction, track, markActiveDay } from '../../src/game/core/progress';
import { dayKey, weekKey } from '../../src/game/core/util';
import { hatched, T0 } from '../helpers';

const DAY = 86400000;
describe('achievements', () => {
  it('has at least 40 achievements with unique ids across all 8 categories', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(40);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    expect(new Set(ACHIEVEMENTS.map((a) => a.category)).size).toBe(8);
  });
  it('unlocks when the target is reached and pays the reward exactly once', () => {
    const s = hatched();
    const a = runAction(s, T0, (c) => { track(c, 'feeds', 10); return { ok: true, message: '' }; });
    expect(a.save.achievements.feed10).toBeDefined();
    const coins = a.save.coins;
    const b = runAction(a.save, T0, (c) => { track(c, 'feeds', 1); return { ok: true, message: '' }; });
    expect(b.save.coins).toBe(coins);
    expect(b.events.filter((e) => e.type === 'achievement')).toHaveLength(0);
  });
});

describe('missions', () => {
  it('assigns 3 daily + 2 weekly missions deterministically per day', () => {
    const run = (t: number) => runAction(hatched(), t, (c) => { ensureMissions(c); return { ok: true, message: '' }; }).save.missions;
    const m = run(T0);
    expect(m.daily).toHaveLength(3);
    expect(m.weekly).toHaveLength(2);
    expect(run(T0).daily.map((x) => x.id)).toEqual(m.daily.map((x) => x.id));
    expect(new Set(m.daily.map((x) => x.id)).size).toBe(3);
  });
  it('rolls over at the day boundary and the weekly reset is a consistent Monday', () => {
    const s0 = runAction(hatched(), T0, (c) => { ensureMissions(c); return { ok: true, message: '' }; }).save;
    const s1 = runAction(s0, T0 + DAY, (c) => { ensureMissions(c); return { ok: true, message: '' }; }).save;
    expect(s1.missions.dayKey).toBe(dayKey(T0 + DAY));
    expect(new Date(weekKey(T0)).getDay()).toBe(1);
    expect(weekKey(T0)).toBe(weekKey(T0 + DAY));
  });
  it('tracks progress, allows claiming once, then refuses', () => {
    let s = runAction(hatched(), T0, (c) => { ensureMissions(c); return { ok: true, message: '' }; }).save;
    const m = s.missions.daily[0];
    const def = MISSION_BY_ID[m.id];
    s = runAction(s, T0, (c) => { track(c, def.event, def.target); return { ok: true, message: '' }; }).save;
    expect(s.missions.daily[0].progress).toBe(def.target);
    const r = claimMission(s, T0, m.id);
    expect(r.ok).toBe(true);
    expect(r.save.coins).toBeGreaterThanOrEqual(s.coins + def.coins);
    expect(claimMission(r.save, T0, m.id).ok).toBe(false);
  });
  it('refuses to claim unfinished missions', () => {
    const s = runAction(hatched(), T0, (c) => { ensureMissions(c); return { ok: true, message: '' }; }).save;
    expect(claimMission(s, T0, s.missions.daily[0].id).ok).toBe(false);
  });
  it('counts distinct interaction days for the weekly mission', () => {
    let s = runAction(hatched(), T0, (c) => { ensureMissions(c); return { ok: true, message: '' }; }).save;
    for (const t of [T0, T0, T0 + DAY]) s = runAction(s, t, (c) => { ensureMissions(c); markActiveDay(c); return { ok: true, message: '' }; }).save;
    expect(s.missions.weekDays).toHaveLength(2);
  });
  it('daily pool contains the spec examples', () => {
    expect(DAILY_POOL.some((d) => d.event === 'feeds' && d.target === 2)).toBe(true);
    expect(DAILY_POOL.some((d) => d.event === 'minigames' && d.target === 1)).toBe(true);
    expect(DAILY_POOL.some((d) => d.event === 'strokes' && d.target === 3)).toBe(true);
  });
});

describe('login streak', () => {
  it('pays once per day and halves (not resets) the streak after a missed day', () => {
    let s = hatched();
    const day = (t: number) => runAction(s, t, (c) => { dailyLogin(c); return { ok: true, message: '' }; });
    s = day(T0).save; expect(s.streak).toBe(1);
    const again = day(T0 + 1000); expect(again.save.coins).toBe(s.coins);
    s = day(T0 + DAY).save; s = day(T0 + 2 * DAY).save; s = day(T0 + 3 * DAY).save; s = day(T0 + 4 * DAY).save;
    expect(s.streak).toBe(5);
    s = day(T0 + 8 * DAY).save;
    expect(s.streak).toBe(2);
  });
});
