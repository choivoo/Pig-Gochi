import { BALANCE as B } from '../../data/balance';
import { FOOD_BY_ID, TOYS } from '../../data/items';
import { SPECIES, EGG_BABY } from '../../data/pets';
import type { SaveData, Stats } from '../../types';
import { eggTypeOf } from './pet';
import { achievementProgress, activePet, addCoins, claimOnce, runAction, track, type ActionResult, type Ctx, type Outcome } from './progress';
import { clamp } from './util';

function bump(p: { stats: Stats }, d: Partial<Stats>): void {
  (Object.keys(d) as (keyof Stats)[]).forEach((k) => {
    p.stats[k] = clamp(p.stats[k] + (d[k] ?? 0));
  });
}
const cooling = (c: Ctx, key: string): boolean => (c.s.cooldowns[key] ?? 0) > c.now;
const setCool = (c: Ctx, key: string, ms: number): void => { c.s.cooldowns[key] = c.now + ms; };
const fail = (message: string): Outcome => ({ ok: false, message });

export function registerDex(c: Ctx, speciesId: string): boolean {
  if (!SPECIES[speciesId] || c.s.encyclopedia[speciesId]) return false;
  c.s.encyclopedia[speciesId] = { discoveredAt: c.now };
  if (claimOnce(c, `dex:${speciesId}`)) addCoins(c, B.economy.dexReward);
  track(c, 'dexCount', 0);
  c.events.push({ type: 'toast', text: `도감에 ${SPECIES[speciesId].name} 등록!`, icon: 'assets/ui/icon_book.png' });
  return true;
}

export function feed(save: SaveData, now: number, foodId: string): ActionResult {
  return runAction(save, now, (c) => {
    const pet = activePet(c.s);
    const food = FOOD_BY_ID[foodId];
    if (!pet || pet.stage === 'egg') return fail('아직 알이에요. 부화하면 먹일 수 있어요.');
    if (!food) return fail('알 수 없는 음식이에요.');
    if (pet.sleeping) return fail('쿨쿨 자고 있어요. 깨우고 나서 먹여 주세요.');
    if (cooling(c, 'feed')) return fail('천천히 먹을게요! 잠깐만 기다려 주세요.');
    const key = `food:${foodId}`;
    if (food.price > 0 && (c.s.inventory[key] ?? 0) < 1) return fail('보유한 음식이 없어요. 상점에서 구입해 주세요.');
    if (pet.stats.satiety >= B.care.overfedAt) return fail('배가 너무 불러요. 조금 있다가 다시 줘 보세요.');
    const sp = SPECIES[pet.speciesId];
    const fav = sp.favoriteFood === foodId;
    const dis = sp.dislikedFood === foodId;
    const hap = fav ? food.happiness * B.care.favoriteFoodHappyMultiplier + 3 : dis ? B.care.dislikedFoodHappy : food.happiness;
    const bond = food.bond + (fav ? B.bondGainFavorite : B.bondGainFeed);
    const d: Partial<Stats> = { satiety: food.satiety, happiness: hap, health: food.health, bond, stress: dis ? 3 : -2 };
    bump(pet, d);
    if (food.price > 0) c.s.inventory[key] = (c.s.inventory[key] ?? 0) - 1;
    if (food.price > 0 && c.s.inventory[key] <= 0) delete c.s.inventory[key];
    setCool(c, 'feed', B.care.feedGlobalCooldownMs);
    pet.lastFedAt = c.now;
    pet.care.feeds += 1;
    pet.care.bondGained += bond;
    if (fav) pet.care.favFoodCount += 1;
    pet.personality.glutton = clamp(pet.personality.glutton + 0.3);
    const tried = `tried_${foodId}`;
    if (!c.s.counters[tried]) { c.s.counters[tried] = 1; track(c, 'uniqueFoods'); }
    const reaction = fav ? 'fav' : dis ? 'dislike' : 'normal';
    c.events.push({ type: 'feed', foodId, reaction });
    track(c, 'feeds');
    return { ok: true, message: fav ? `${food.name}! 가장 좋아하는 음식이에요!` : dis ? `${food.name}은(는) 별로인가 봐요…` : `${food.name}을(를) 맛있게 먹었어요.`, data: { satiety: food.satiety, happiness: hap, bond } };
  });
}

export function stroke(save: SaveData, now: number): ActionResult {
  return runAction(save, now, (c) => {
    const pet = activePet(c.s);
    if (!pet || pet.stage === 'egg') return fail('알을 톡톡 두드려 보세요.');
    if (pet.sleeping) return fail('쿨쿨 자고 있어요.');
    const since = now - pet.lastStrokeAt;
    if (since < B.care.strokeCooldownMs && pet.lastStrokeAt > 0) {
      c.events.push({ type: 'pet', rewarded: false });
      return { ok: true, message: '', data: { rewarded: false } };
    }
    pet.strokeStreak = since < B.care.strokeWindowMs ? pet.strokeStreak + 1 : 0;
    pet.lastStrokeAt = now;
    const mult = Math.max(B.care.strokeMinMultiplier, Math.pow(B.care.strokeDiminish, pet.strokeStreak));
    const d: Partial<Stats> = { happiness: B.care.strokeHappy * mult, bond: B.care.strokeBond * mult, stress: -1 * mult };
    bump(pet, d);
    pet.care.bondGained += B.care.strokeBond * mult;
    pet.personality.affectionate = clamp(pet.personality.affectionate + 0.3 * mult);
    c.events.push({ type: 'pet', rewarded: mult >= 0.25 });
    if (mult >= 0.25) {
      pet.care.strokes += 1;
      track(c, 'strokes');
    }
    return { ok: true, message: mult >= 0.25 ? '기분 좋아해요!' : '조금 쉬었다가 쓰다듬어 주세요.', data: { rewarded: mult >= 0.25 } };
  });
}

export function bathe(save: SaveData, now: number): ActionResult {
  return runAction(save, now, (c) => {
    const pet = activePet(c.s);
    if (!pet || pet.stage === 'egg') return fail('알은 목욕할 수 없어요.');
    if (pet.sleeping) return fail('자고 있을 땐 목욕할 수 없어요.');
    if (pet.stats.cleanliness >= 90) return fail('이미 반짝반짝 깨끗해요!');
    bump(pet, { cleanliness: B.care.bath.cleanliness, happiness: B.care.bath.happiness, stress: B.care.bath.stress });
    pet.care.baths += 1;
    c.events.push({ type: 'bathe' });
    track(c, 'baths');
    return { ok: true, message: '뽀득뽀득! 깨끗해졌어요.' };
  });
}

export function toggleSleep(save: SaveData, now: number): ActionResult {
  return runAction(save, now, (c) => {
    const pet = activePet(c.s);
    if (!pet || pet.stage === 'egg') return fail('알은 이미 푹 자고 있어요.');
    if (cooling(c, 'sleepToggle')) return fail('잠깐만요, 아직 움직이는 중이에요.');
    setCool(c, 'sleepToggle', B.care.sleepToggleCooldownMs);
    if (pet.sleeping) {
      pet.sleeping = false;
      c.events.push({ type: 'wake' });
      return { ok: true, message: '일어났어요!' };
    }
    if (pet.stats.energy >= 90) return fail('아직 졸리지 않아요.');
    pet.sleeping = true;
    c.events.push({ type: 'sleep' });
    track(c, 'sleeps');
    return { ok: true, message: '쿨쿨… 잠이 들었어요.' };
  });
}

export type HealKind = 'rest' | 'medicine' | 'snack' | 'special';
export function heal(save: SaveData, now: number, kind: HealKind): ActionResult {
  return runAction(save, now, (c) => {
    const pet = activePet(c.s);
    if (!pet || pet.stage === 'egg') return fail('알은 치료할 필요가 없어요.');
    if (pet.stats.health >= 100 && !pet.illness) return fail('건강해요! 치료가 필요 없어요.');
    if (cooling(c, `heal_${kind}`)) return fail('조금 후에 다시 해 주세요.');
    let gain: number = B.care.heal.rest.health;
    if (kind === 'rest') {
      setCool(c, 'heal_rest', B.care.plain.rest.cooldownMs);
      bump(pet, { stress: B.care.plain.rest.stress });
    } else if (kind === 'snack') {
      gain = B.care.heal.snack.health;
      setCool(c, 'heal_snack', 60000);
      bump(pet, { satiety: 5, happiness: 2 });
    } else {
      const item = kind === 'medicine' ? 'special:medicine' : 'special:super_medicine';
      if ((c.s.inventory[item] ?? 0) < 1) return fail('치료 아이템이 없어요. 상점에서 구입하거나 기본 휴식을 이용해 보세요.');
      c.s.inventory[item] -= 1;
      if (c.s.inventory[item] <= 0) delete c.s.inventory[item];
      gain = kind === 'medicine' ? B.care.heal.medicine.health : B.care.heal.special.health;
    }
    const wasSick = !!pet.illness;
    bump(pet, { health: gain });
    if (pet.illness && (kind === 'special' || pet.stats.health >= 80)) {
      pet.illness = null;
      pet.badMinutes = 0;
      pet.care.recoveries += 1;
    }
    c.events.push({ type: 'heal', kind });
    track(c, 'heals', wasSick || pet.stats.health < 60 ? 1 : 0);
    return { ok: true, message: pet.illness ? '조금 나아졌어요. 한 번 더 돌봐 주세요.' : '몸이 가벼워졌어요!' };
  });
}

export function ownsToy(s: Ctx['s'], id: string): boolean {
  return id === 'ball' || (s.inventory[`toy:${id}`] ?? 0) > 0;
}

export function playToy(save: SaveData, now: number, toyId: string): ActionResult {
  return runAction(save, now, (c) => {
    const pet = activePet(c.s);
    const toy = TOYS.find((t) => t.id === toyId);
    if (!pet || pet.stage === 'egg') return fail('알과는 아직 놀 수 없어요.');
    if (!toy || !ownsToy(c.s, toyId)) return fail('이 장난감을 가지고 있지 않아요.');
    if (pet.sleeping) return fail('자고 있어요.');
    if (pet.illness) return fail('아파서 놀 수 없어요. 먼저 치료해 주세요.');
    if (pet.stats.energy < 12) return fail('너무 피곤해요. 먼저 재워 주세요.');
    if (cooling(c, 'play')) return fail('조금 쉬었다가 다시 놀아요!');
    setCool(c, 'play', B.care.playToy.cooldownMs);
    const fav = SPECIES[pet.speciesId].favoriteToy === toyId;
    bump(pet, { happiness: B.care.playToy.happiness + toy.happiness + (fav ? B.care.favoriteToyHappyBonus : 0), energy: B.care.playToy.energy, satiety: B.care.playToy.satiety, bond: B.care.playToy.bond, stress: -5 });
    pet.care.toyPlays += 1;
    pet.care.bondGained += B.care.playToy.bond;
    pet.personality.lively = clamp(pet.personality.lively + 0.4);
    c.events.push({ type: 'play', toyId });
    track(c, 'toyPlays');
    return { ok: true, message: fav ? '가장 좋아하는 장난감이에요!' : '신나게 놀았어요!' };
  });
}

export function useStarDust(save: SaveData, now: number): ActionResult {
  return runAction(save, now, (c) => {
    const pet = activePet(c.s);
    if (!pet || pet.stage === 'egg') return fail('알에게는 쓸 수 없어요.');
    if ((c.s.inventory['special:star_dust'] ?? 0) < 1) return fail('별가루가 없어요.');
    c.s.inventory['special:star_dust'] -= 1;
    if (c.s.inventory['special:star_dust'] <= 0) delete c.s.inventory['special:star_dust'];
    bump(pet, { bond: 6, happiness: 15, stress: -10 });
    pet.care.bondGained += 6;
    c.events.push({ type: 'special' });
    return { ok: true, message: '별가루가 반짝! 친밀도가 올랐어요.' };
  });
}

export function tapEgg(save: SaveData, now: number): ActionResult {
  return runAction(save, now, (c) => {
    const pet = activePet(c.s);
    if (!pet || pet.stage !== 'egg') return fail('알이 아니에요.');
    pet.hatchTaps += 1;
    if (pet.hatchTaps >= B.growth.hatchTaps) {
      const baby = EGG_BABY[eggTypeOf(pet)];
      pet.speciesId = baby;
      pet.stage = 'baby';
      pet.stageStartedAt = c.now;
      pet.growthMinutes = 0;
      pet.stats = { ...SPECIES[baby].baseStats };
      c.s.lastSimulationAt = c.now;
      registerDex(c, baby);
      c.events.push({ type: 'hatch' });
      track(c, 'hatches');
      return { ok: true, message: `${pet.name}이(가) 태어났어요!`, data: { hatched: true } };
    }
    return { ok: true, message: '알이 흔들려요!', data: { hatched: false, taps: pet.hatchTaps } };
  });
}

export function triggerSpecial(save: SaveData, now: number): ActionResult {
  return runAction(save, now, (c) => {
    const pet = activePet(c.s);
    if (!pet || pet.stage === 'egg' || pet.sleeping) return fail('지금은 할 수 없어요.');
    if (cooling(c, 'special')) return fail('쿨타임');
    setCool(c, 'special', 20000);
    bump(pet, { happiness: 2 });
    c.events.push({ type: 'special' });
    track(c, 'specials');
    return { ok: true, message: SPECIES[pet.speciesId].specialAction.name };
  });
}

export function startled(save: SaveData, now: number): ActionResult {
  return runAction(save, now, (c) => {
    if (!activePet(c.s)) return fail('');
    if (achievementProgress(c.s, 'startled') >= 1 && (c.s.counters.startled ?? 0) > 50) return fail('');
    track(c, 'startled');
    return { ok: true, message: '' };
  });
}
