import { BALANCE as B } from '../../data/balance';
import type { SaveData } from '../../types';
import { activePet, addCoins, claimOnce, runAction, track, type ActionResult } from './progress';
import { clamp, dayKey } from './util';

export const GAME_IDS = ['stars', 'fishing', 'memory', 'runner', 'maze', 'rhythm'] as const;
export type GameId = (typeof GAME_IDS)[number];

export function gradeFor(fraction: number): { grade: number; coins: number } {
  const f = Math.max(0, Math.min(1, fraction));
  for (const t of B.minigame.rewardTiers) if (f >= t.minFrac) return { grade: t.grade, coins: t.coins };
  return { grade: 0, coins: B.minigame.rewardTiers[B.minigame.rewardTiers.length - 1].coins };
}

export interface MinigameOutcome { grade: number; coins: number; newBest: boolean; duplicate: boolean }

/** Applies the reward of one finished run exactly once (runId is the idempotency key). */
export function finishMinigame(save: SaveData, now: number, gameId: GameId, score: number, maxScore: number, runId: string): ActionResult & { outcome?: MinigameOutcome } {
  let outcome: MinigameOutcome | undefined;
  const res = runAction(save, now, (c) => {
    const key = `mg:${runId}`;
    if (c.s.claimed.includes(key)) {
      outcome = { grade: 0, coins: 0, newBest: false, duplicate: true };
      return { ok: false, message: '이미 정산된 결과예요.' };
    }
    claimOnce(c, key);
    const s = Math.max(0, Math.floor(Number.isFinite(score) ? score : 0));
    const { grade, coins: base } = gradeFor(maxScore > 0 ? s / maxScore : 0);
    const dk = `mgday_${dayKey(now)}`;
    const plays = c.s.counters[dk] ?? 0;
    c.s.counters[dk] = plays + 1;
    const coins = plays >= B.minigame.dailyFullRewardPlays ? Math.max(1, Math.round(base * B.minigame.diminishedFactor)) : base;
    addCoins(c, coins);
    const rec = c.s.minigameRecords[gameId] ?? { best: 0, plays: 0, bestGrade: 0 };
    const newBest = s > rec.best;
    c.s.minigameRecords[gameId] = { best: Math.max(rec.best, s), plays: rec.plays + 1, bestGrade: Math.max(rec.bestGrade, grade) };
    const pet = activePet(c.s);
    if (pet && pet.stage !== 'egg') {
      pet.stats.happiness = clamp(pet.stats.happiness + B.minigame.happy);
      pet.stats.bond = clamp(pet.stats.bond + B.minigame.bond);
      pet.stats.energy = clamp(pet.stats.energy - B.minigame.energyCost);
      pet.care.minigames += 1;
      pet.care.bondGained += B.minigame.bond;
      if (gameId === 'rhythm') pet.care.rhythmPlays += 1;
    }
    if (!c.s.counters[`playedgame_${gameId}`]) { c.s.counters[`playedgame_${gameId}`] = 1; track(c, 'uniqueGames'); }
    track(c, 'minigames');
    track(c, `mg_${gameId}`);
    if (gameId === 'maze' && grade >= 1) track(c, 'mazeClears');
    if (grade >= 4) track(c, 'mgTopGrade');
    outcome = { grade, coins, newBest, duplicate: false };
    return { ok: true, message: `코인 ${coins}개 획득!` };
  });
  return { ...res, outcome };
}
