import { BALANCE as B } from '../../data/balance';
import { ACC_BY_ID, FURN_BY_ID, SHOP_BY_ID, type Unlock } from '../../data/items';
import { ALL_SPECIES_IDS } from '../../data/pets';
import type { AccSlot, PlacedItem, SaveData } from '../../types';
import { FLOOR_Y, ROOM_W } from '../render/constants';
import { computeRoomScore } from './evolution';
import { activePet, claimOnce, runAction, spendCoins, track, type ActionResult } from './progress';
import { dayKey } from './util';

export function isUnlocked(s: SaveData, u?: Unlock): boolean {
  if (!u) return true;
  if (u.kind === 'dex') return Object.keys(s.encyclopedia).length >= u.count;
  if (u.kind === 'achievement') return !!s.achievements[u.id];
  return (s.counters.evolutions ?? 0) >= u.count;
}
export function unlockText(u?: Unlock): string {
  if (!u) return '';
  if (u.kind === 'dex') return `도감 ${u.count}종 발견 시 해금`;
  if (u.kind === 'achievement') return '업적 달성 시 해금';
  return `진화 ${u.count}회 시 해금`;
}

export const owned = (s: SaveData, id: string): number => s.inventory[id] ?? 0;

export function buy(save: SaveData, now: number, itemId: string, qty = 1): ActionResult {
  return runAction(save, now, (c) => {
    const item = SHOP_BY_ID[itemId];
    if (!item) return { ok: false, message: '존재하지 않는 상품이에요.' };
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) return { ok: false, message: '수량이 올바르지 않아요.' };
    if (item.price === null) return { ok: false, message: '이 상품은 상점에서 구입할 수 없어요.' };
    if (!isUnlocked(c.s, item.unlock)) return { ok: false, message: '아직 해금되지 않았어요.' };
    if (item.category === 'room') {
      const rid = itemId.replace('room:', '');
      if (c.s.ownedRooms.includes(rid)) return { ok: false, message: '이미 가지고 있어요.' };
      qty = 1;
    } else if (!item.stackable && owned(c.s, itemId) >= 1) return { ok: false, message: '이미 가지고 있어요.' };
    if (owned(c.s, itemId) + qty > item.maxStack) return { ok: false, message: `최대 ${item.maxStack}개까지 가질 수 있어요.` };
    const total = item.price * qty;
    if (c.s.coins < total) return { ok: false, message: `코인이 부족해요. (필요 ${total}, 보유 ${c.s.coins})` };
    if (!spendCoins(c, total)) return { ok: false, message: '결제에 실패했어요.' };
    if (item.category === 'room') c.s.ownedRooms.push(itemId.replace('room:', ''));
    else c.s.inventory[itemId] = owned(c.s, itemId) + qty;
    track(c, 'purchases');
    c.events.push({ type: 'toast', text: `${item.name} 구입 완료!`, icon: item.icon });
    return { ok: true, message: `${item.name}을(를) 구입했어요!` };
  });
}

// ----- room decoration -----
export const MAX_ITEMS = 30;
export function snapPlacement(itemId: string, x: number, y: number): { x: number; y: number } {
  const def = FURN_BY_ID[itemId];
  const sx = Math.max(0, Math.min(ROOM_W - def.w, Math.round(x / 8) * 8));
  let lo: number, hi: number;
  if (def.slot === 'wall') { lo = def.h + 6; hi = FLOOR_Y - 8; }
  else if (def.slot === 'rug') { lo = FLOOR_Y + 20; hi = 156; }
  else { lo = FLOOR_Y + 16; hi = 156; }
  const sy = Math.max(lo, Math.min(hi, Math.round(y / 8) * 8));
  return { x: sx, y: sy };
}
export const placedCount = (s: SaveData, itemId: string): number => s.roomLayout.filter((p) => p.itemId === itemId).length;

export function placeFurniture(save: SaveData, now: number, itemId: string, x: number, y: number, uid: string, flip = false): ActionResult {
  return runAction(save, now, (c) => {
    const def = FURN_BY_ID[itemId];
    if (!def) return { ok: false, message: '알 수 없는 가구예요.' };
    if (placedCount(c.s, itemId) >= owned(c.s, `furn:${itemId}`)) return { ok: false, message: '보관함에 남은 가구가 없어요.' };
    if (c.s.roomLayout.length >= MAX_ITEMS) return { ok: false, message: '방이 가득 찼어요.' };
    const p = snapPlacement(itemId, x, y);
    const item: PlacedItem = { uid, itemId, x: p.x, y: p.y, flip };
    c.s.roomLayout.push(item);
    track(c, 'furniturePlaced');
    const pet = activePet(c.s);
    if (pet) pet.care.roomScore = computeRoomScore(c.s.roomLayout);
    return { ok: true, message: `${def.name}을(를) 놓았어요.` };
  });
}

export function setLayout(save: SaveData, now: number, layout: PlacedItem[]): ActionResult {
  return runAction(save, now, (c) => {
    const counts: Record<string, number> = {};
    const clean: PlacedItem[] = [];
    for (const it of layout) {
      const def = FURN_BY_ID[it.itemId];
      if (!def) continue;
      counts[it.itemId] = (counts[it.itemId] ?? 0) + 1;
      if (counts[it.itemId] > owned(c.s, `furn:${it.itemId}`)) continue;
      const p = snapPlacement(it.itemId, it.x, it.y);
      clean.push({ uid: it.uid, itemId: it.itemId, x: p.x, y: p.y, flip: !!it.flip });
    }
    const oldIds = new Set(c.s.roomLayout.map((x) => x.uid));
    c.s.roomLayout = clean.slice(0, MAX_ITEMS);
    const added = c.s.roomLayout.filter((x) => !oldIds.has(x.uid)).length;
    if (added > 0) track(c, 'furniturePlaced', added);
    const pet = activePet(c.s);
    if (pet) pet.care.roomScore = computeRoomScore(c.s.roomLayout);
    return { ok: true, message: '저장했어요.' };
  });
}

export function setRoomTheme(save: SaveData, now: number, id: string): ActionResult {
  return runAction(save, now, (c) => {
    if (!c.s.ownedRooms.includes(id)) return { ok: false, message: '아직 가지고 있지 않은 방이에요.' };
    if (c.s.roomTheme === id) return { ok: false, message: '이미 사용 중이에요.' };
    c.s.roomTheme = id;
    track(c, 'roomsChanged');
    return { ok: true, message: '방 분위기가 바뀌었어요!' };
  });
}

export function equipAccessory(save: SaveData, now: number, slot: AccSlot, accId: string | null): ActionResult {
  return runAction(save, now, (c) => {
    const pet = activePet(c.s);
    if (!pet || pet.stage === 'egg') return { ok: false, message: '알에게는 착용시킬 수 없어요.' };
    if (accId === null) {
      delete pet.accessories[slot];
      return { ok: true, message: '액세서리를 벗겼어요.' };
    }
    const def = ACC_BY_ID[accId];
    if (!def || def.slot !== slot) return { ok: false, message: '착용할 수 없어요.' };
    if (owned(c.s, `acc:${accId}`) < 1) return { ok: false, message: '가지고 있지 않아요.' };
    pet.accessories[slot] = accId;
    track(c, 'accEquipped');
    return { ok: true, message: `${def.name}을(를) 착용했어요!` };
  });
}

/** Rewards for dex milestones (idempotent). */
export function claimDexRewards(save: SaveData, now: number): ActionResult {
  return runAction(save, now, (c) => {
    const n = Object.keys(c.s.encyclopedia).length;
    const give = (key: string, id: string, isRoom = false) => {
      if (!claimOnce(c, key)) return;
      if (isRoom) { if (!c.s.ownedRooms.includes(id)) c.s.ownedRooms.push(id); } else c.s.inventory[id] = Math.max(1, owned(c.s, id));
      c.events.push({ type: 'toast', text: '도감 보상을 받았어요!', icon: 'assets/ui/icon_trophy.png' });
    };
    if (n >= 3) give('dexr:3', 'furn:garland');
    if (n >= 8) give('dexr:8', 'cloud', true);
    if (n >= 15) give('dexr:15', 'furn:frame_gold');
    if (n >= ALL_SPECIES_IDS.length) { give('dexr:21', 'acc:crown_small'); give('dexr:21b', 'furn:trophy'); }
    return { ok: true, message: '' };
  });
}

export const dexRewardList = [
  { count: 3, text: '작은 별 장식 (별 가랜드)' },
  { count: 8, text: '특별 벽지 (구름 위의 집)' },
  { count: 15, text: '황금 액자' },
  { count: 21, text: '특별 왕관 + 트로피' },
];

export function minigameCoinsToday(s: SaveData, now: number): number {
  return s.counters[`mgday_${dayKey(now)}`] ?? 0;
}
void B;
