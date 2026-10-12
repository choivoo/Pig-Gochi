import type { FoodKind, Lineage } from '../types';
import meta from './generated/spriteMeta.json';

export interface FoodDef { id: string; name: string; price: number; satiety: number; happiness: number; health: number; bond: number; lineage?: Lineage; kind: FoodKind; cooldownMs: number; rarity: number; unlock?: Unlock; desc: string }
export type Unlock = { kind: 'dex'; count: number } | { kind: 'achievement'; id: string } | { kind: 'evolutions'; count: number };

const f = (id: string, name: string, price: number, satiety: number, happiness: number, kind: FoodKind, extra: Partial<FoodDef> = {}): FoodDef => ({
  id, name, price, satiety, happiness, health: 0, bond: 0, kind, cooldownMs: 0, rarity: price >= 35 ? 3 : price >= 20 ? 2 : 1, desc: '', ...extra,
});
export const FOODS: FoodDef[] = [
  f('kibble', '기본 사료', 0, 25, 0, 'meal', { desc: '언제나 무료로 먹을 수 있는 든든한 사료.' }),
  f('apple', '사과', 8, 15, 4, 'snack', { desc: '아삭아삭 새콤달콤.' }),
  f('strawberry', '딸기', 12, 10, 8, 'snack', { desc: '빨갛게 잘 익은 딸기.' }),
  f('banana', '바나나', 10, 18, 4, 'snack', { desc: '부드럽고 달콤한 바나나.' }),
  f('carrot', '당근', 8, 14, 2, 'snack', { health: 2, desc: '눈에 좋은 당근.' }),
  f('onigiri', '주먹밥', 15, 30, 5, 'meal', { desc: '김이 폭 감싼 주먹밥.' }),
  f('bread', '식빵', 12, 24, 3, 'meal', { desc: '폭신한 식빵.' }),
  f('egg', '계란', 14, 18, 3, 'meal', { health: 3, desc: '단백질 가득한 계란.' }),
  f('milk', '우유', 12, 12, 4, 'drink', { health: 3, lineage: 'starlight', desc: '고소한 우유.' }),
  f('juice', '주스', 14, 8, 8, 'drink', { desc: '상큼한 오렌지 주스.' }),
  f('cookie', '쿠키', 16, 10, 10, 'sweet', { lineage: 'starlight', desc: '바삭한 초코칩 쿠키.' }),
  f('pudding', '푸딩', 20, 14, 12, 'sweet', { desc: '말랑말랑 푸딩.' }),
  f('cake', '케이크', 30, 18, 16, 'sweet', { desc: '딸기 케이크 한 조각.' }),
  f('donut', '도넛', 22, 12, 13, 'sweet', { desc: '달콤한 도넛.' }),
  f('jelly', '젤리', 20, 6, 14, 'sweet', { desc: '쫀득쫀득 젤리.' }),
  f('icecream', '아이스크림', 24, 8, 14, 'sweet', { desc: '시원한 아이스크림.' }),
  f('pancake', '팬케이크', 26, 22, 10, 'meal', { lineage: 'flame', desc: '시럽을 듬뿍 얹은 팬케이크.' }),
  f('sandwich', '샌드위치', 28, 30, 6, 'meal', { lineage: 'flame', desc: '든든한 샌드위치.' }),
  f('fish', '생선', 28, 26, 6, 'meal', { health: 3, lineage: 'nature', desc: '신선한 생선.' }),
  f('soup', '수프', 22, 20, 4, 'meal', { health: 8, lineage: 'nature', desc: '몸이 따뜻해지는 수프.' }),
  f('starcandy', '특별 별사탕', 40, 10, 20, 'sweet', { bond: 2, lineage: 'starlight', desc: '별빛이 담긴 특별한 사탕.' }),
  f('firejelly', '불꽃 젤리', 36, 10, 14, 'sweet', { lineage: 'flame', desc: '입안이 따뜻해지는 젤리.' }),
  f('dewberry', '이슬 열매', 36, 12, 14, 'snack', { health: 3, lineage: 'nature', desc: '아침 이슬을 머금은 열매.' }),
  f('mooncookie', '달빛 쿠키', 36, 10, 14, 'sweet', { lineage: 'starlight', desc: '달빛을 닮은 쿠키.' }),
  f('rainbowpudding', '무지개 푸딩', 60, 20, 25, 'sweet', { bond: 3, desc: '일곱 빛깔 푸딩. 아주 특별해요.' }),
];
export const FOOD_BY_ID: Record<string, FoodDef> = Object.fromEntries(FOODS.map((x) => [x.id, x]));

export interface ToyDef { id: string; name: string; price: number; happiness: number; desc: string }
export const TOYS: ToyDef[] = [
  { id: 'ball', name: '말랑 공', price: 0, happiness: 0, desc: '기본 놀이 공.' },
  { id: 'plush', name: '봉제인형 놀이', price: 25, happiness: 2, desc: '포근한 인형 놀이.' },
  { id: 'blocks', name: '쌓기 블록', price: 25, happiness: 2, desc: '블록을 쌓아요.' },
  { id: 'kite', name: '구름 연', price: 30, happiness: 3, desc: '하늘 높이 연을 날려요.' },
  { id: 'drum', name: '통통 북', price: 30, happiness: 3, desc: '리듬에 맞춰 두드려요.' },
  { id: 'yarn', name: '털실 뭉치', price: 30, happiness: 3, desc: '데굴데굴 굴리는 털실.' },
];
export const TOY_ICON: Record<string, string> = { ball: 'play', plush: 'pets', blocks: 'care', kite: 'star', drum: 'game', yarn: 'heart' };

export interface FurnMeta { w: number; h: number; slot: 'floor' | 'wall' | 'rug'; fn?: string; name: string }
export const FURNITURE_META = meta.furniture as Record<string, FurnMeta>;
export interface FurnDef extends FurnMeta { id: string; price: number | null; unlock?: Unlock; rotatable: boolean }
const PRICE: Record<string, number> = {
  bed_basic: 0, bed_star: 90, bed_wood: 70, sofa_small: 60, cushion: 15, desk: 45, chair: 25, dining_table: 0, fridge: 55, bookshelf: 65,
  toybox: 0, rug_round: 30, rug_star: 45, plant_pot: 20, cactus: 20, small_tree: 60, stand_lamp: 35, moon_lamp: 40, star_lamp: 40,
  toy_train: 45, blocks: 30, plush: 35, aquarium: 100, whiteboard: 50, game_console: 80, bean_bag: 40, piano: 110, cardboard_house: 45,
  wall_clock: 30, poster_star: 30, poster_forest: 30, mirror: 50, curtain: 35, wall_shelf: 35,
};
const UNLOCKS: Record<string, Unlock> = {
  garland: { kind: 'dex', count: 3 }, frame_gold: { kind: 'dex', count: 15 }, trophy: { kind: 'dex', count: 21 },
};
export const FURNITURE: FurnDef[] = Object.entries(FURNITURE_META).map(([id, m]) => ({
  id, ...m, price: UNLOCKS[id] ? null : (PRICE[id] ?? 40), unlock: UNLOCKS[id], rotatable: ['bed_basic', 'bed_star', 'bed_wood', 'sofa_small', 'desk', 'toy_train', 'plush', 'chair', 'piano', 'cardboard_house'].includes(id),
}));
export const FURN_BY_ID: Record<string, FurnDef> = Object.fromEntries(FURNITURE.map((x) => [x.id, x]));

export interface AccDef { id: string; name: string; slot: 'head' | 'face' | 'neck' | 'side'; price: number; rarity: number }
const ACC_PRICE: Record<string, number> = { ribbon_red: 30, ribbon_blue: 30, crown_small: 0, pin_star: 35, glasses: 40, sunglasses: 45, hat_wizard: 60, beret: 45, hat_santa: 45, cat_ears: 50, butterfly: 35, flower_deco: 35, bag_small: 40, scarf: 40, pin_heart: 35, pin_moon: 35, hat_cloud: 55, hat_explorer: 55, necklace_gem: 70, halo: 80 };
export const ACCESSORIES: AccDef[] = Object.entries(meta.accessories as Record<string, { slot: AccDef['slot']; name: string }>).map(([id, a]) => ({
  id, name: a.name, slot: a.slot, price: ACC_PRICE[id] ?? 40, rarity: (ACC_PRICE[id] ?? 40) >= 55 ? 3 : 2,
}));
export const ACC_BY_ID: Record<string, AccDef> = Object.fromEntries(ACCESSORIES.map((x) => [x.id, x]));

export const ROOM_THEMES = [
  { id: 'cozy', name: '포근한 기본 방', price: 0, unlock: undefined as Unlock | undefined },
  { id: 'starry', name: '별빛 침실', price: 120, unlock: undefined },
  { id: 'forest', name: '숲속 오두막', price: 120, unlock: undefined },
  { id: 'ocean', name: '바닷속 휴식방', price: 150, unlock: undefined },
  { id: 'cloud', name: '구름 위의 집', price: null as number | null, unlock: { kind: 'dex', count: 8 } as Unlock },
  { id: 'neon', name: '네온 게임룸', price: 180, unlock: undefined },
];

export interface SpecialDef { id: string; name: string; price: number; desc: string }
export const SPECIALS: SpecialDef[] = [
  { id: 'medicine', name: '간단한 약', price: 30, desc: '건강을 크게 회복해요.' },
  { id: 'super_medicine', name: '특별 치료제', price: 80, desc: '아픈 몸을 완전히 회복해요.' },
  { id: 'star_dust', name: '별가루', price: 60, desc: '뿌려 주면 친밀도가 오르고 행복해져요.' },
];

export type ItemCategory = 'food' | 'toy' | 'furniture' | 'room' | 'accessory' | 'special';
export interface ShopItem { id: string; name: string; category: ItemCategory; price: number | null; rarity: number; icon: string; desc: string; stackable: boolean; maxStack: number; unlock?: Unlock; effect?: string }
export const SHOP_ITEMS: ShopItem[] = [
  ...FOODS.filter((x) => x.price > 0).map((x): ShopItem => ({ id: `food:${x.id}`, name: x.name, category: 'food', price: x.price, rarity: x.rarity, icon: `assets/food/${x.id}.png`, desc: x.desc, stackable: true, maxStack: 99, effect: `포만감 +${x.satiety} 행복 +${x.happiness}` })),
  ...TOYS.filter((x) => x.price > 0).map((x): ShopItem => ({ id: `toy:${x.id}`, name: x.name, category: 'toy', price: x.price, rarity: 2, icon: `assets/ui/icon_${TOY_ICON[x.id]}.png`, desc: x.desc, stackable: false, maxStack: 1 })),
  ...FURNITURE.map((x): ShopItem => ({ id: `furn:${x.id}`, name: x.name, category: 'furniture', price: x.price, rarity: (x.price ?? 100) >= 80 ? 3 : 2, icon: `assets/furniture/${x.id}.png`, desc: x.slot === 'wall' ? '벽에 걸어요.' : x.slot === 'rug' ? '바닥에 깔아요.' : '방에 놓아요.', stackable: true, maxStack: 5, unlock: x.unlock })),
  ...ROOM_THEMES.filter((x) => x.price !== 0).map((x): ShopItem => ({ id: `room:${x.id}`, name: x.name, category: 'room', price: x.price, rarity: 3, icon: `assets/rooms/${x.id}.png`, desc: '방의 분위기가 바뀌어요.', stackable: false, maxStack: 1, unlock: x.unlock })),
  ...ACCESSORIES.map((x): ShopItem => ({ id: `acc:${x.id}`, name: x.name, category: 'accessory', price: x.id === 'crown_small' ? null : x.price, rarity: x.rarity, icon: `assets/accessories/${x.id}.png`, desc: '펫에게 꾸며 줄 수 있어요.', stackable: false, maxStack: 1, unlock: x.id === 'crown_small' ? { kind: 'dex', count: 21 } : undefined })),
  ...SPECIALS.map((x): ShopItem => ({ id: `special:${x.id}`, name: x.name, category: 'special', price: x.price, rarity: 3, icon: x.id === 'star_dust' ? 'assets/effects/sparkle.png' : 'assets/ui/icon_medicine.png', desc: x.desc, stackable: true, maxStack: 20 })),
];
export const SHOP_BY_ID: Record<string, ShopItem> = Object.fromEntries(SHOP_ITEMS.map((x) => [x.id, x]));
export const CATEGORY_NAME: Record<ItemCategory, string> = { food: '음식', toy: '장난감', furniture: '가구', room: '배경', accessory: '액세서리', special: '특별 아이템' };
