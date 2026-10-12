import { BALANCE as B } from '../../data/balance';
import { SPECIES } from '../../data/pets';
import type { CareRecord, PetInstance, Personality, SaveData, Stage } from '../../types';
import { registerDex } from './care';
import { PERSONALITIES, emptyCare } from './pet';
import { activePet, addCoins, claimOnce, runAction, track, type ActionResult, type Ctx } from './progress';
import { FURN_BY_ID } from '../../data/items';
import { hashString, rng } from './util';

export type EvolveStep = 'child' | 'adult';

export function evolutionReady(pet: PetInstance | undefined): EvolveStep | null {
  if (!pet || pet.sleeping) return null;
  if (pet.stage === 'baby' && pet.growthMinutes >= B.growth.babyToChildMinutes) return 'child';
  if (pet.stage === 'child' && pet.growthMinutes >= B.growth.childToAdultMinutes) return 'adult';
  return null;
}

export function growthProgress(pet: PetInstance): number {
  if (pet.stage === 'baby') return Math.min(1, pet.growthMinutes / B.growth.babyToChildMinutes);
  if (pet.stage === 'child') return Math.min(1, pet.growthMinutes / B.growth.childToAdultMinutes);
  return 1;
}

export function computeRoomScore(layout: SaveData['roomLayout']): number {
  let score = 0;
  const kinds = new Set<string>();
  for (const it of layout) {
    kinds.add(it.itemId);
    score += 1;
    if (['plant_pot', 'cactus', 'small_tree', 'aquarium'].includes(it.itemId)) score += 1;
  }
  return Math.min(B.evolution.caps.roomScore, Math.round(score * 0.5 + kinds.size * 0.5));
}

/** evolutionScore = weightedCareScore + personalityAffinity + preferenceBonus */
export function scoreCandidate(pet: PetInstance, candidateId: string): number {
  const sp = SPECIES[candidateId];
  const E = B.evolution;
  let weighted = 0;
  for (const [k, w] of Object.entries(sp.affinity ?? {})) {
    if (!w || k === 'personality') continue;
    const cap = E.caps[k as keyof typeof E.caps] ?? 1;
    weighted += w * Math.min(1, (pet.care[k as keyof CareRecord] ?? 0) / cap) * E.weightScale;
  }
  let pers = 0;
  for (const [p, w] of Object.entries(sp.personalityAffinity ?? {})) pers += (w ?? 0) * (pet.personality[p as Personality] / 100) * E.personalityScale;
  const top = PERSONALITIES.reduce((a, b) => (pet.personality[b] > pet.personality[a] ? b : a));
  const pref = sp.personalityTags.includes(top) ? E.preferenceBonus : 0;
  return weighted + pers + pref;
}

export function chooseEvolution(pet: PetInstance): { to: string; scores: Record<string, number> } {
  const cands = SPECIES[pet.speciesId].evolutionCandidates;
  const scores: Record<string, number> = {};
  for (const id of cands) scores[id] = Math.round(scoreCandidate(pet, id) * 100) / 100;
  // identical input -> identical output; ties broken by seeded rule
  const r = rng(pet.seed ^ hashString(pet.speciesId))();
  let best = cands[0];
  for (const id of cands) {
    if (scores[id] > scores[best] + 1e-9) best = id;
    else if (Math.abs(scores[id] - scores[best]) <= 1e-9 && id !== best && r < 0.5) best = id;
  }
  return { to: best, scores };
}

export function evolve(save: SaveData, now: number): ActionResult {
  return runAction(save, now, (c: Ctx) => {
    const pet = activePet(c.s);
    const step = evolutionReady(pet);
    if (!pet || !step) return { ok: false, message: '아직 진화할 준비가 되지 않았어요.' };
    pet.care.roomScore = computeRoomScore(c.s.roomLayout);
    const { to, scores } = chooseEvolution(pet);
    const from = pet.speciesId;
    pet.history.push({ from, to, at: c.now, scores });
    pet.speciesId = to;
    pet.stage = SPECIES[to].growthStage as Stage;
    pet.stageStartedAt = c.now;
    pet.growthMinutes = 0;
    pet.care = emptyCare();
    pet.stats.health = Math.max(pet.stats.health, 70);
    pet.stats.happiness = Math.min(100, pet.stats.happiness + 10);
    pet.special = false;
    registerDex(c, to);
    c.events.push({ type: 'evolve', from, to });
    track(c, 'evolutions');
    if (pet.stage === 'child') track(c, 'childReached');
    if (pet.stage === 'adult') {
      track(c, 'adults');
      track(c, `adult_${SPECIES[to].lineage}`);
    }
    if (claimOnce(c, 'firstEvolution')) addCoins(c, B.economy.firstEvolutionCoins);
    return { ok: true, message: `${pet.name}이(가) ${SPECIES[to].name}(으)로 성장했어요!`, data: { to, from } };
  });
}

/** Adult "special growth": strong bond + lots of happy care time. */
export function checkAdultSpecial(save: SaveData, now: number): ActionResult {
  return runAction(save, now, (c) => {
    const pet = activePet(c.s);
    if (!pet || pet.stage !== 'adult' || pet.special) return { ok: false, message: '' };
    if (pet.stats.bond < B.growth.adultSpecialBondNeeded || pet.care.happyMinutes < 120) return { ok: false, message: '' };
    pet.special = true;
    c.events.push({ type: 'toast', text: `${pet.name}과(와) 특별한 유대가 생겼어요! ✨`, icon: 'assets/ui/icon_heart.png' });
    return { ok: true, message: '특별 성장 상태!' };
  });
}

export const furnName = (id: string): string => FURN_BY_ID[id]?.name ?? id;
