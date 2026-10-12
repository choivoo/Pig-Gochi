// 세이브: localStorage + 버전 마이그레이션 + 내보내기/가져오기
import { newEraser } from './rpg.js';
import { MISSION_POOL } from './data.js';
import { mulberry32 } from './physics.js';

const KEY = 'eraser_rpg_save';
const BACKUP = 'eraser_rpg_save_bak';
export const VERSION = 2;

export function defaultSave() {
  const e = newEraser('malrangi', 'e_start');
  return {
    version: VERSION,
    player: { name: '지휘관', level: 1, exp: 0, createdAt: Date.now() },
    coin: 300, chalk: 3,
    erasers: [e], shards: {}, party: ['e_start'],
    items: [],
    progress: { stars: {}, cleared: {} },
    dex: { erasers: ['malrangi'], enemies: {} },
    gacha: { pity_premium: 0, freeDay: '' },
    stats: { wins: 0, losses: 0, falls: 0, pins: 0, shots: 0, edges: 0, crits: 0, bestCombo: 0, gachas: 0, rogueBest: 0, hbClear: 0, stars: 0, owned: 1, combo2: 0 },
    claimed: {},
    daily: { date: '', counters: {}, missions: [], claimed: {} },
    attendance: { last: '', streak: 0 },
    shop: { date: '', items: [], bought: [] },
    settings: { diff: 'normal', sound: 0.8, bgm: 0.5, vibrate: true, guide: 'normal', reduceMotion: false, spin: true, timer: true, dda: true },
    tutorialDone: false,
    meta: { lastSeen: Date.now(), playTime: 0, grad: 0, gradUp: { hp: 0, atk: 0, coin: 0 } },
  };
}

const migrations = {
  1: (s) => { s.meta = s.meta || {}; s.meta.grad = s.meta.grad || 0; s.meta.gradUp = s.meta.gradUp || { hp: 0, atk: 0, coin: 0 }; s.settings.dda = s.settings.dda ?? true; s.version = 2; return s; },
};
export function migrate(s) {
  while (s.version < VERSION) { const f = migrations[s.version]; if (!f) break; s = f(s); }
  return s;
}
function merge(def, s) { // 누락된 키 보충
  for (const k of Object.keys(def)) {
    if (s[k] === undefined) s[k] = def[k];
    else if (def[k] && typeof def[k] === 'object' && !Array.isArray(def[k])) merge(def[k], s[k]);
  }
  return s;
}

export function load() {
  for (const k of [KEY, BACKUP]) {
    try {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const s = JSON.parse(raw);
      if (!s || !s.erasers || !s.erasers.length) continue;
      return merge(defaultSave(), migrate(s));
    } catch (e) { /* 다음 후보 */ }
  }
  return defaultSave();
}
export function persist(s) {
  try {
    s.meta.lastSeen = Date.now();
    const prev = localStorage.getItem(KEY);
    if (prev) localStorage.setItem(BACKUP, prev);
    localStorage.setItem(KEY, JSON.stringify(s));
    return true;
  } catch (e) { return false; }
}
export function exportCode(s) {
  const json = JSON.stringify(s);
  return btoa(unescape(encodeURIComponent(json)));
}
export function importCode(code) {
  const json = decodeURIComponent(escape(atob(code.trim())));
  const s = JSON.parse(json);
  if (!s || !Array.isArray(s.erasers) || !s.erasers.length || typeof s.coin !== 'number') throw new Error('잘못된 세이브 코드입니다');
  return merge(defaultSave(), migrate(s));
}

export const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };

// 일일 갱신: 미션/상점/무료 뽑기
export function dailyRefresh(s, rollEq) {
  const t = today();
  if (s.daily.date !== t) {
    const seed = [...t].reduce((a, c) => a + c.charCodeAt(0) * 31, 7);
    const rng = mulberry32(seed);
    const pool = [...MISSION_POOL];
    const pick = [];
    while (pick.length < 3) pick.push(pool.splice(Math.floor(rng() * pool.length), 1)[0].id);
    s.daily = { date: t, counters: {}, missions: pick, claimed: {} };
  }
  if (s.shop.date !== t) {
    const seed = [...t].reduce((a, c) => a + c.charCodeAt(0) * 17, 3);
    const rng = mulberry32(seed);
    s.shop = { date: t, items: Array.from({ length: 6 }, () => rollEq(rng)), bought: [] };
  }
}
export function bump(s, stat, n = 1) {
  s.daily.counters[stat] = (s.daily.counters[stat] || 0) + n;
}
