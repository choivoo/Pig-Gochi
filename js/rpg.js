// RPG 계산: 스탯, 경험치, 장비, 뽑기, 스테이지 생성
import { ERASERS, ENEMIES, RARITY, EQUIP_TPL, EQ_RAR, GACHA_POOLS, CHAPTERS, SURFACES, STAR_COST } from './data.js';
import { mulberry32 } from './physics.js';

export const MAX_LV = 50;
export const expNeed = (lv) => Math.round(30 * Math.pow(lv, 1.5));

export function newEraser(baseId, uid) {
  return { uid: uid || 'e_' + Math.random().toString(36).slice(2, 9), baseId, level: 1, exp: 0, star: 0, pts: { hp: 0, atk: 0, def: 0, spd: 0 }, free: 0, equip: { cover: null, case: null, charm: null }, nick: '', aff: 0 };
}

export function equipStats(item) {
  const t = EQUIP_TPL[item.tpl];
  const k = EQ_RAR[item.rar] * (1 + 0.15 * item.plus);
  const out = {};
  for (const [s, v] of Object.entries(t.stats)) out[s] = Math.round(v * k * 10) / 10;
  return out;
}

// 보유 장비 → 합산
export function computeStats(inst, save) {
  const base = ERASERS[inst.baseId];
  const rar = RARITY[base.rar].mult;
  const lv = inst.level - 1;
  const starMul = 1 + 0.05 * inst.star + (inst.star >= 4 ? 0.05 : 0);
  const affMul = 1 + Math.min(0.1, inst.aff / 12000);
  const mul = rar * 0.55 + 0.45; // 등급 보정을 완만하게
  let hp = base.hp * (1 + 0.09 * lv) * mul + inst.pts.hp * 12;
  let atk = base.atk * (1 + 0.07 * lv) * mul + inst.pts.atk * 2;
  let def = base.def * (1 + 0.06 * lv) * mul + inst.pts.def * 1.5;
  let spd = base.spd + lv * 0.25 + inst.pts.spd * 1;
  let crit = base.crit, luck = 5, critDmg = 1.5;
  for (const slot of ['cover', 'case', 'charm']) {
    const id = inst.equip[slot];
    const it = id && save ? save.items.find((x) => x.uid === id) : null;
    if (!it) continue;
    const s = equipStats(it);
    hp += s.hp || 0; atk += s.atk || 0; def += s.def || 0; spd += s.spd || 0; crit += s.crit || 0; luck += s.luck || 0;
  }
  if (base.passive === 'critBoost') crit += 10;
  hp *= 1.35 * starMul * affMul; atk *= starMul * affMul; def *= starMul;
  return {
    hp: Math.round(hp), atk: Math.round(atk * 10) / 10, def: Math.round(def * 10) / 10, spd: Math.round(spd * 10) / 10,
    crit: Math.min(70, crit), critDmg, luck, r: base.r, m: base.m,
  };
}

export function skillsFor(inst) {
  const base = ERASERS[inst.baseId];
  const unlock = [1, 5, 12];
  return base.skills.filter((_, i) => inst.level >= unlock[i]);
}

export function addExp(inst, amount) {
  let up = 0;
  if (inst.level >= MAX_LV) return 0;
  inst.exp += amount;
  while (inst.level < MAX_LV && inst.exp >= expNeed(inst.level)) {
    inst.exp -= expNeed(inst.level); inst.level++; inst.free += 2; up++;
  }
  if (inst.level >= MAX_LV) inst.exp = 0;
  return up;
}

export function enemyStats(id, level) {
  const b = ENEMIES[id];
  const lv = level - 1;
  return {
    hp: Math.round(b.hp * (b.boss ? 0.95 : 1.2) * (1 + 0.1 * lv)), atk: Math.round(b.atk * (1 + 0.075 * lv) * 10) / 10,
    def: Math.round(b.def * (1 + 0.06 * lv) * 10) / 10, spd: b.spd, r: b.r, m: b.m,
  };
}

// ===== 장비 생성 =====
export function rollEquipment(rng, rarBias = 0) {
  const keys = Object.keys(EQUIP_TPL);
  const tpl = keys[Math.floor(rng() * keys.length)];
  const x = rng() - rarBias * 0.1;
  const rar = x < 0.6 ? 'N' : x < 0.88 ? 'R' : x < 0.98 ? 'SR' : 'SSR';
  return { uid: 'i_' + Math.floor(rng() * 1e9).toString(36) + Date.now().toString(36).slice(-3), tpl, slot: EQUIP_TPL[tpl].slot, rar, plus: 0 };
}
export const enhanceCost = (it) => Math.round(80 * Math.pow(1.45, it.plus) * EQ_RAR[it.rar]);
export const sellPrice = (it) => Math.round((30 + 25 * it.plus) * EQ_RAR[it.rar] * 1.5);
export const MAX_PLUS = 10;

// ===== 뽑기 =====
export const GACHA = {
  normal: { name: '일반 뽑기', costType: 'coin', cost: 500, rates: [['N', 70], ['R', 25], ['SR', 5]], pityAt: 0 },
  premium: { name: '고급 뽑기', costType: 'chalk', cost: 5, rates: [['R', 60], ['SR', 37], ['SSR', 3]], pityAt: 50 },
};
export function gachaRoll(kind, save, rng) {
  const g = GACHA[kind];
  let rar;
  const pityKey = 'pity_' + kind;
  const pity = save.gacha[pityKey] || 0;
  if (g.pityAt && pity + 1 >= g.pityAt) rar = 'SSR';
  else {
    let x = rng() * 100;
    rar = g.rates[g.rates.length - 1][0];
    for (const [r, p] of g.rates) { if (x < p) { rar = r; break; } x -= p; }
  }
  if (g.pityAt) save.gacha[pityKey] = rar === 'SSR' ? 0 : pity + 1;
  const pool = GACHA_POOLS[rar];
  const id = pool[Math.floor(rng() * pool.length)];
  return { rar, id };
}

// 지우개 획득 처리. 중복이면 조각
export function grantEraser(save, id) {
  const owned = save.erasers.find((e) => e.baseId === id);
  if (!owned) {
    const e = newEraser(id);
    save.erasers.push(e);
    if (!save.dex.erasers.includes(id)) save.dex.erasers.push(id);
    return { isNew: true, inst: e };
  }
  const n = RARITY[ERASERS[id].rar].shard;
  save.shards[id] = (save.shards[id] || 0) + n;
  return { isNew: false, shards: n, inst: owned };
}
export function canAwaken(save, inst) {
  if (inst.star >= 5) return false;
  return (save.shards[inst.baseId] || 0) >= STAR_COST[inst.star];
}

// ===== 스테이지 생성 =====
export const LAYOUTS = [
  [],
  [{ x: 380, y: 170, w: 40, h: 110, kind: 'case' }],
  [{ x: 360, y: 60, w: 80, h: 70, kind: 'case' }, { x: 360, y: 320, w: 80, h: 70, kind: 'case' }],
  [{ x: 400, y: 150, w: 90, h: 150, kind: 'books' }],
  [{ x: 250, y: 100, w: 40, h: 40, kind: 'bag' }, { x: 510, y: 310, w: 40, h: 40, kind: 'bag' }],
  [{ x: 330, y: 205, w: 140, h: 40, kind: 'case' }],
  [{ x: 280, y: 60, w: 30, h: 110, kind: 'books' }, { x: 490, y: 280, w: 30, h: 110, kind: 'books' }],
  [{ x: 365, y: 190, w: 70, h: 70, kind: 'books' }],
  [{ x: 200, y: 180, w: 30, h: 90, kind: 'bag' }, { x: 570, y: 180, w: 30, h: 90, kind: 'bag' }],
  [{ x: 340, y: 40, w: 120, h: 40, kind: 'case' }, { x: 340, y: 370, w: 120, h: 40, kind: 'case' }],
];
const ZONE_SETS = {
  wood: [null, null, 'sand', null, 'glue', null, 'ice', null, 'sand', 'glue'],
  cloth: ['glue', null, 'sand', 'glue', null, 'sand', null, 'glue', 'sand', 'glue'],
  paint: ['ice', null, 'ice', 'glue', null, 'ice', 'sand', null, 'ice', 'ice'],
  steel: [null, 'ice', null, 'ice', 'sand', null, 'ice', null, 'ice', 'sand'],
  gym: ['ice', 'ice', null, 'sand', 'ice', null, 'ice', 'ice', null, 'ice'],
  office: ['glue', 'sand', null, 'glue', 'ice', 'glue', null, 'sand', 'glue', 'glue'],
};

export const TUTORIAL_HINTS = {
  '0-1': ['내 지우개를 꾹 눌러 뒤로 당겼다가 놓아보세요!', '당긴 반대 방향으로, 당긴 만큼 세게 날아가요.'],
  '0-2': ['책상 밖으로 떨어지면 낙사! 적을 책상 끝으로 밀어내세요.', '내 지우개가 떨어지지 않게 조심!'],
  '0-3': ['적에게 살짝 닿은 채로 멈추면 "따먹기"! 큰 피해를 줘요.', '아래 스킬 버튼은 집중력이 차면 사용할 수 있어요.'],
};

export function getStage(ch, idx) {
  const C = CHAPTERS[ch];
  const id = ch + '-' + idx;
  const rng = mulberry32(ch * 1000 + idx * 17 + 5);
  const layoutIdx = ch === 0 ? [0, 0, 1][idx - 1] : (idx * 3 + ch) % LAYOUTS.length;
  const obstacles = LAYOUTS[layoutIdx].map((o) => ({ ...o, e: o.kind === 'bag' ? 0.25 : 0.72 }));
  // 표면 구역
  const zones = [];
  const zt = ch === 0 ? null : ZONE_SETS[C.surface][(idx - 1) % 10];
  if (zt) {
    const mu = { ice: 0.12, glue: 3.2, sand: 2.0 }[zt];
    const sides = [[130, 130], [440, 220], [260, 260]];
    const s = sides[(idx + ch) % 3];
    zones.push({ x: s[0] + 40, y: s[1] - 70 + (rng() * 30 | 0), w: 160, h: 110, type: zt, mu });
  }
  let enemies = [], title, lvl, boss = false, mid = false;
  if (ch === 0) {
    lvl = 1;
    enemies = [[['dummy'], ['dummy', 'dummy'], ['pencil']][idx - 1]].flat().map((e) => ({ id: e, lv: 1 }));
    title = ['허수아비 연습', '낙사 연습', '첫 번째 연필'][idx - 1];
  } else {
    lvl = C.lvBase + Math.floor(idx * (ch === 1 ? 0.45 : 0.65));
    if (idx === 10) { boss = true; enemies = [{ id: C.boss, lv: lvl + 1 }]; title = '보스: ' + ENEMIES[C.boss].name; }
    else if (idx === 9) { mid = true; enemies = [{ id: C.mid, lv: lvl }]; title = '중간보스: ' + ENEMIES[C.mid].name; if (ch >= 3) enemies.push({ id: C.pool[0], lv: lvl - 1 }); }
    else {
      const n = Math.min(ch === 1 ? 2 : 3, idx < 3 ? 1 : idx < 6 ? 2 : 3);
      for (let i = 0; i < n; i++) enemies.push({ id: C.pool[Math.floor(rng() * C.pool.length)], lv: lvl - (n > 1 ? 1 : 0) });
      title = C.name + ' ' + idx;
    }
  }
  // 적 배치
  const spots = [[610, 225], [560, 130], [560, 320], [660, 225]];
  enemies.forEach((e, i) => { e.x = spots[i][0]; e.y = spots[i][1]; });
  const turnPar = boss ? 18 : mid ? 12 : 4 + enemies.length * 2;
  return {
    id, ch, idx, title, boss, mid, elite: false, lv: lvl, surface: C.surface, bg: C.bg, felt: C.felt, chapterName: C.name,
    obstacles, zones, baseMu: SURFACES[C.surface].mu, enemies, turnPar,
    reward: { exp: Math.round(18 + lvl * 7 + (boss ? 80 : mid ? 40 : 0)), coin: Math.round(40 + lvl * 9 + (boss ? 200 : mid ? 80 : 0)), chalk: boss ? 3 : mid ? 1 : 0 },
    hints: TUTORIAL_HINTS[id] || null,
  };
}
export const stageList = (ch) => Array.from({ length: CHAPTERS[ch].count }, (_, i) => getStage(ch, i + 1));

// ===== 무한 책상 (로그라이크) =====
const ROGUE_NORMAL = ['pencil', 'fatpencil', 'sharp', 'ballpen', 'marker', 'slime', 'highlighter', 'crayon', 'scissors', 'tape', 'compass', 'protractor', 'ironsharp', 'stamp', 'stapler'];
const ROGUE_BOSS = ['bossSharp', 'boss2B', 'bossTri', 'bossZipper', 'bossPalette', 'bossNeon', 'bossMagnet', 'bossCompass', 'bossWhistle', 'bossPE', 'bossRed', 'bossHB'];
export function makeRogueStage(room, seed) {
  const rng = mulberry32(seed * 7919 + room * 31);
  const boss = room % 10 === 0;
  const lv = 2 + Math.floor(room * 1.6);
  const tier = Math.min(ROGUE_NORMAL.length, 3 + Math.floor(room * 0.9));
  const enemies = [];
  if (boss) enemies.push({ id: ROGUE_BOSS[Math.min(ROGUE_BOSS.length - 1, room / 10 - 1)], lv: lv + 2 });
  else {
    const n = Math.min(3, 1 + Math.floor(room / 4));
    for (let i = 0; i < n; i++) enemies.push({ id: ROGUE_NORMAL[Math.floor(rng() * tier)], lv: lv - (n > 1 ? 1 : 0) });
  }
  const spots = [[610, 225], [560, 130], [560, 320], [660, 225]];
  enemies.forEach((e, i) => { e.x = spots[i][0]; e.y = spots[i][1]; });
  const surfaces = ['wood', 'cloth', 'paint', 'steel', 'gym', 'office'];
  const sf = surfaces[Math.floor(rng() * surfaces.length)];
  const C = CHAPTERS[1 + surfaces.indexOf(sf)];
  const zt = [null, 'ice', 'glue', 'sand'][Math.floor(rng() * 4)];
  const zones = zt ? [{ x: 200 + (rng() * 300 | 0), y: 120 + (rng() * 100 | 0), w: 150, h: 100, type: zt, mu: { ice: 0.12, glue: 3.2, sand: 2.0 }[zt] }] : [];
  return {
    id: 'r-' + room, ch: C.id, idx: room, title: boss ? '보스 방 ' + room : '무한 책상 ' + room + '번째 방', boss, mid: false, lv,
    surface: sf, bg: C.bg, felt: C.felt, chapterName: '무한 책상', obstacles: LAYOUTS[Math.floor(rng() * LAYOUTS.length)].map((o) => ({ ...o, e: o.kind === 'bag' ? 0.25 : 0.72 })),
    zones, baseMu: SURFACES[sf].mu, enemies, turnPar: 99, reward: { exp: 0, coin: 20 + room * 15, chalk: 0 }, hints: null,
  };
}
