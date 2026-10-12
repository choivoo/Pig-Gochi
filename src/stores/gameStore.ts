import { create } from 'zustand';
import { ACH_BY_ID } from '../data/achievements';
import { BALANCE } from '../data/balance';
import { SPECIES } from '../data/pets';
import { audio } from '../audio/audio';
import * as care from '../game/core/care';
import * as eco from '../game/core/economy';
import { checkAdultSpecial, evolve } from '../game/core/evolution';
import { finishMinigame, type GameId, type MinigameOutcome } from '../game/core/minigameReward';
import { newGame } from '../game/core/newGame';
import { activePet, claimMission, dailyLogin, ensureMissions, markActiveDay, runAction, type ActionResult, type GameEvent } from '../game/core/progress';
import { settleOffline, tickPet, type OfflineReport } from '../game/core/simulation';
import { dayKey, systemClock } from '../game/core/util';
import { newDialogueState, pickLine } from '../game/core/dialogue';
import { needTags, computeEmotion } from '../game/core/emotion';
import { seasonOf, timeOfDay, weatherFor } from '../game/core/weather';
import { preloadAll } from '../game/render/assets';
import { clearSave, loadSave, mirrorNow, writeSave } from '../persistence/storage';
import type { EggType, PlacedItem, SaveData, Settings } from '../types';

export type Screen = 'loading' | 'title' | 'intro' | 'setup' | 'game';
export type Panel = 'none' | 'food' | 'play' | 'care' | 'shop' | 'decorate' | 'dex' | 'achievements' | 'settings' | 'storage' | 'wardrobe' | 'menu' | 'status' | 'bath' | 'minigames' | 'missions';
export interface Toast { id: number; text: string; icon?: string; kind?: 'coin' | 'ach' | 'info' | 'error' }
export type Cinematic = { kind: 'hatch'; to: string; eggType: string } | { kind: 'evolve'; from: string; to: string; name: string } | null;

let clock = systemClock;
export const setClock = (c: typeof systemClock): void => { clock = c; };
export const now = (): number => clock.now();

type Listener = (e: GameEvent) => void;
const listeners = new Set<Listener>();
export const onGameEvent = (l: Listener): (() => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

const dlg = newDialogueState();
let toastId = 1;
let saveTimer: number | null = null;
let lastTick = 0;
let coinTimer: number | null = null;
let coinAcc = 0;

export interface GameStore {
  screen: Screen;
  panel: Panel;
  save: SaveData | null;
  hasSave: boolean;
  loadInfo: { recovered: boolean; messages: string[] } | null;
  progress: number;
  toasts: Toast[];
  bubble: { id: number; text: string } | null;
  cinematic: Cinematic;
  offlineReport: OfflineReport | null;
  welcome: { coins: number; streak: number } | null;
  activeMinigame: GameId | null;
  setup: { name: string; icon: string; eggType: EggType | null };
  editMode: boolean;
  tutorialVisible: boolean;
  init(): Promise<void>;
  setScreen(s: Screen): void;
  setPanel(p: Panel): void;
  setSetup(p: Partial<GameStore['setup']>): void;
  startNew(eggName: string): void;
  continueGame(): void;
  apply(res: ActionResult, opts?: { silent?: boolean }): ActionResult;
  feed(foodId: string): ActionResult;
  stroke(): ActionResult;
  bathe(): ActionResult;
  toggleSleep(): ActionResult;
  heal(kind: care.HealKind): ActionResult;
  play(toyId: string): ActionResult;
  tapEgg(): ActionResult;
  special(): ActionResult;
  useStarDust(): ActionResult;
  buy(itemId: string, qty?: number): ActionResult;
  setLayout(layout: PlacedItem[]): ActionResult;
  place(itemId: string, x: number, y: number, flip?: boolean): ActionResult;
  setRoom(id: string): ActionResult;
  equip(slot: 'head' | 'face' | 'neck' | 'side', id: string | null): ActionResult;
  doEvolve(): ActionResult;
  finishGame(id: GameId, score: number, max: number, runId: string): { res: ActionResult; outcome?: MinigameOutcome };
  claimMission(id: string): ActionResult;
  claimDex(): void;
  rename(name: string): void;
  startNewEgg(eggType: EggType, name: string): ActionResult;
  switchPet(uid: string): ActionResult;
  updateSettings(p: Partial<Settings>): void;
  replaceSave(s: SaveData): void;
  resetAll(): Promise<void>;
  tick(): void;
  say(tags: string[], force?: boolean): void;
  idleChat(): void;
  toast(text: string, icon?: string, kind?: Toast['kind']): void;
  dismissCinematic(): void;
  startMinigame(id: GameId | null): void;
  tutorial(ev: string): void;
  skipTutorial(): void;
  scheduleSave(immediate?: boolean): void;
  flush(): void;
}

export const useGame = create<GameStore>((set, get) => ({
  screen: 'loading', panel: 'none', save: null, hasSave: false, loadInfo: null, progress: 0, toasts: [], bubble: null, cinematic: null,
  offlineReport: null, welcome: null, activeMinigame: null, setup: { name: '', icon: 'star', eggType: null }, editMode: false, tutorialVisible: true,

  async init() {
    try { await preloadAll((d, t) => set({ progress: d / t })); } catch (e) { console.error('asset preload failed', e); }
    const loaded = await loadSave(now());
    if (loaded) {
      set({ save: loaded.save, hasSave: true, loadInfo: { recovered: loaded.recovered, messages: loaded.messages }, screen: 'title' });
      applySettings(loaded.save.settings);
    } else set({ screen: 'title', hasSave: false });
  },
  setScreen(s) { set({ screen: s, panel: 'none' }); },
  setPanel(p) { audio.sfx(p === 'none' ? 'close' : 'open'); set({ panel: p, editMode: p === 'decorate' }); },
  setSetup(p) { set({ setup: { ...get().setup, ...p } }); },

  startNew(eggName) {
    const { setup } = get();
    if (!setup.eggType) return;
    const t = now();
    const s = newGame({ name: setup.name.trim() || '트레이너', icon: setup.icon }, setup.eggType, eggName.trim() || '알', t, `pet_${t.toString(36)}`);
    const c = { s, now: t, events: [] as GameEvent[] };
    ensureMissions(c); markActiveDay(c); dailyLogin(c);
    set({ save: s, hasSave: true, screen: 'game', panel: 'none', tutorialVisible: true, offlineReport: null });
    lastTick = t;
    applySettings(s.settings);
    get().scheduleSave(true);
  },

  continueGame() {
    const s0 = get().save;
    if (!s0) return;
    const t = now();
    const { save: settled, report } = settleOffline(s0, t);
    const r = runAction(settled, t, (c) => {
      ensureMissions(c);
      markActiveDay(c);
      const login = dailyLogin(c);
      if (report.away && !(c.s.counters.welcomeBackDay === dayHash(t))) { c.s.counters.welcomeBackDay = dayHash(t); c.s.counters.welcomeBack = (c.s.counters.welcomeBack ?? 0) + 1; }
      return { ok: true, message: '', data: login ? { coins: login.coins, streak: login.streak } : undefined };
    });
    lastTick = t;
    set({ save: r.save, screen: 'game', panel: 'none', offlineReport: report, welcome: r.data && typeof r.data.coins === 'number' ? { coins: r.data.coins as number, streak: r.data.streak as number } : null });
    for (const e of r.events) emit(e);
    applySettings(r.save.settings);
    if (report.away) setTimeout(() => get().say(['welcome_back'], true), 600);
    get().scheduleSave(true);
  },

  apply(res, opts) {
    if (!res.ok) {
      if (res.message && !opts?.silent) { audio.sfx('error'); get().toast(res.message, undefined, 'error'); }
      return res;
    }
    set({ save: res.save });
    for (const e of res.events) emit(e);
    get().scheduleSave();
    return res;
  },

  feed(id) { const t = now(); const r = get().apply(care.feed(need(), t, id)); if (r.ok) get().tutorial('feed'); return r; },
  stroke() { const r = get().apply(care.stroke(need(), now()), { silent: true }); if (r.ok && r.data?.rewarded) get().tutorial('pet'); return r; },
  bathe() { const r = get().apply(care.bathe(need(), now())); if (r.ok) get().tutorial('bath'); return r; },
  toggleSleep() { return get().apply(care.toggleSleep(need(), now())); },
  heal(k) { return get().apply(care.heal(need(), now(), k)); },
  play(id) { return get().apply(care.playToy(need(), now(), id)); },
  special() { return get().apply(care.triggerSpecial(need(), now()), { silent: true }); },
  useStarDust() { return get().apply(care.useStarDust(need(), now())); },
  tapEgg() {
    const r = get().apply(care.tapEgg(need(), now()), { silent: true });
    if (r.ok && r.data?.hatched) {
      const pet = activePet(r.save);
      if (pet) set({ cinematic: { kind: 'hatch', to: pet.speciesId, eggType: pet.speciesId } });
      get().tutorial('hatch');
    }
    return r;
  },
  buy(id, qty = 1) {
    const r = get().apply(eco.buy(need(), now(), id, qty));
    if (r.ok) { audio.sfx('buy'); get().tutorial('buy'); }
    return r;
  },
  setLayout(layout) { return get().apply(eco.setLayout(need(), now(), layout), { silent: true }); },
  place(itemId, x, y, flip = false) {
    const r = get().apply(eco.placeFurniture(need(), now(), itemId, x, y, `f${now().toString(36)}${Math.floor(Math.random() * 1e5).toString(36)}`, flip));
    if (r.ok) get().tutorial('place');
    return r;
  },
  setRoom(id) { return get().apply(eco.setRoomTheme(need(), now(), id)); },
  equip(slot, id) { return get().apply(eco.equipAccessory(need(), now(), slot, id)); },
  doEvolve() {
    const r = get().apply(evolve(need(), now()), { silent: true });
    if (r.ok) {
      const ev = r.events.find((e) => e.type === 'evolve');
      const pet = activePet(r.save);
      if (ev && ev.type === 'evolve' && pet) set({ cinematic: { kind: 'evolve', from: ev.from, to: ev.to, name: pet.name } });
    } else get().toast(r.message, undefined, 'error');
    return r;
  },
  finishGame(id, score, max, runId) {
    const res = finishMinigame(need(), now(), id, score, max, runId);
    if (res.ok) { get().apply(res); get().tutorial('minigame'); }
    return { res, outcome: res.outcome };
  },
  claimMission(id) { const r = get().apply(claimMission(need(), now(), id)); if (r.ok) audio.sfx('coin'); return r; },
  claimDex() { const r = eco.claimDexRewards(need(), now()); if (r.ok && r.events.length) get().apply(r); },
  rename(name) {
    const s = get().save; const pet = s && activePet(s);
    if (!s || !pet) return;
    const n = name.trim().slice(0, 10);
    if (!n) return;
    set({ save: { ...s, ownedPets: { ...s.ownedPets, [pet.uid]: { ...pet, name: n } } } });
    get().scheduleSave();
  },
  startNewEgg(eggType, name) {
    const s = need();
    const pet = activePet(s);
    if (pet && pet.stage !== 'adult') return { ok: false, message: '성체가 된 뒤에 새로운 알을 키울 수 있어요.', save: s, events: [] };
    const t = now();
    const r = runAction(s, t, (c) => {
      const id = `pet_${t.toString(36)}_${Math.floor(Math.random() * 1e5).toString(36)}`;
      const egg = newEgg(eggType, name.trim() || '알', t, id);
      egg.stats = { ...egg.stats };
      c.s.ownedPets[id] = egg;
      if (pet) c.s.ownedPets[pet.uid] = { ...c.s.ownedPets[pet.uid], sleeping: false };
      c.s.activePetId = id;
      c.s.lastSimulationAt = t;
      return { ok: true, message: '새로운 알을 받았어요!' };
    });
    return get().apply(r);
  },
  switchPet(uid) {
    const s = need();
    if (!s.ownedPets[uid]) return { ok: false, message: '알 수 없는 펫이에요.', save: s, events: [] };
    const t = now();
    const r = runAction(s, t, (c) => {
      const cur = activePet(c.s);
      if (cur) cur.sleeping = false;
      c.s.activePetId = uid;
      c.s.lastSimulationAt = t;
      return { ok: true, message: `${c.s.ownedPets[uid].name}이(가) 방으로 돌아왔어요.` };
    });
    return get().apply(r);
  },
  updateSettings(p) {
    const s = get().save; if (!s) return;
    const settings = { ...s.settings, ...p };
    set({ save: { ...s, settings } });
    applySettings(settings);
    get().scheduleSave();
  },
  replaceSave(s) {
    set({ save: s, hasSave: true, panel: 'none' });
    lastTick = now();
    applySettings(s.settings);
    get().scheduleSave(true);
  },
  async resetAll() {
    if (saveTimer !== null) { clearTimeout(saveTimer); saveTimer = null; }
    await clearSave();
    set({ save: null, hasSave: false, screen: 'title', panel: 'none', cinematic: null, setup: { name: '', icon: 'star', eggType: null } });
  },

  tick() {
    const s = get().save;
    if (!s || get().screen !== 'game') return;
    const t = now();
    const pet = activePet(s);
    if (!pet) return;
    const gap = t - s.lastSimulationAt;
    let next: SaveData = s;
    if (gap < 0) next = { ...s, lastSimulationAt: t };
    else if (gap > 120000) {
      const { save: settled, report } = settleOffline(s, t);
      next = settled;
      if (report.away) { set({ offlineReport: report }); setTimeout(() => get().say(['welcome_back'], true), 400); }
    } else if (gap > 0) {
      const ticked = tickPet(pet, gap / 60000, { at: s.lastSimulationAt });
      next = { ...s, lastSimulationAt: t, ownedPets: { ...s.ownedPets, [pet.uid]: ticked } };
      if (pet.sleeping && !ticked.sleeping) emit({ type: 'wake' });
      if (!pet.illness && ticked.illness) get().toast(`${ticked.name}이(가) 아파요. 치료해 주세요.`, 'assets/ui/icon_medicine.png');
    }
    if (next !== s) set({ save: next });
    lastTick = t;
    // day rollover for missions
    if (next.missions.dayKey !== dayKey(t)) {
      const r = runAction(next, t, (c) => { ensureMissions(c); markActiveDay(c); return { ok: true, message: '' }; });
      set({ save: r.save });
    }
    if (Math.floor(t / 1000) % 15 === 0) {
      const r = checkAdultSpecial(get().save as SaveData, t);
      if (r.ok) get().apply(r, { silent: true });
    }
  },

  say(tags, force) {
    const s = get().save; const pet = s && activePet(s);
    if (!s || !pet) return;
    if (!force && get().bubble) return;
    const text = pickLine(tags, dlg);
    const id = Date.now();
    set({ bubble: { id, text } });
    setTimeout(() => { if (get().bubble?.id === id) set({ bubble: null }); }, 3600);
  },
  idleChat() {
    const s = get().save; const pet = s && activePet(s);
    if (!s || !pet || get().panel !== 'none' || get().activeMinigame || get().cinematic) return;
    const t = now(); const d = new Date(t);
    if (pet.stage === 'egg') { get().say(['hatch'], false); return; }
    const emo = computeEmotion(pet, d.getHours());
    const tod = timeOfDay(d.getHours());
    const w = weatherFor(dayKey(t), tod, seasonOf(d.getMonth()));
    const tags = [...needTags(pet, emo), ...(pet.personality ? [topPers(pet)] : []), tod, w === 'rain' ? 'rain' : w === 'snow' ? 'snow' : w === 'starry' ? 'stars' : 'idle'];
    get().say(tags.slice(0, 1 + Math.floor(Math.random() * tags.length)));
  },
  toast(text, icon, kind = 'info') {
    const id = toastId++;
    set({ toasts: [...get().toasts.slice(-3), { id, text, icon, kind }] });
    setTimeout(() => set({ toasts: get().toasts.filter((x) => x.id !== id) }), 2800);
  },
  dismissCinematic() { set({ cinematic: null }); },
  startMinigame(id) { audio.sfx(id ? 'start' : 'end'); set({ activeMinigame: id, panel: 'none' }); },

  tutorial(ev) {
    const s = get().save;
    if (!s || s.tutorial.done) return;
    const order = ['hatch', 'ack1', 'feed', 'pet', 'bath', 'minigame', 'buy', 'place', 'ack2'];
    const step = s.tutorial.step;
    if (order[step] !== ev) return;
    const t = now();
    const r = runAction(s, t, (c) => {
      c.s.tutorial.step = step + 1;
      const pet = activePet(c.s);
      const nextEv = order[step + 1];
      if (pet && nextEv === 'bath') pet.stats.cleanliness = Math.min(pet.stats.cleanliness, 55);
      if (pet && nextEv === 'feed') pet.stats.satiety = Math.min(pet.stats.satiety, 65);
      if (nextEv === 'buy') c.s.coins = Math.max(c.s.coins, 30);
      if (c.s.tutorial.step >= order.length) {
        c.s.tutorial.done = true;
        c.s.counters.tutorialDone = 1;
        if (!c.s.claimed.includes('tutorial')) { c.s.claimed.push('tutorial'); c.s.coins += BALANCE.tutorialReward; c.s.counters.coinsEarned = (c.s.counters.coinsEarned ?? 0) + BALANCE.tutorialReward; c.events.push({ type: 'coins', amount: BALANCE.tutorialReward }); }
        c.events.push({ type: 'toast', text: '튜토리얼 완료! 보상을 받았어요.', icon: 'assets/ui/icon_trophy.png' });
        checkAch(c);
      }
      return { ok: true, message: '' };
    });
    get().apply(r, { silent: true });
  },
  skipTutorial() {
    const s = get().save; if (!s) return;
    set({ save: { ...s, tutorial: { step: s.tutorial.step, done: true } } });
    get().scheduleSave();
  },

  scheduleSave(immediate) {
    if (saveTimer !== null) clearTimeout(saveTimer);
    const run = () => { saveTimer = null; const s = get().save; if (s) void writeSave({ ...s, lastSavedAt: now() }); };
    if (immediate) run(); else saveTimer = window.setTimeout(run, BALANCE.autosaveDebounceMs);
  },
  flush() {
    const s = get().save;
    if (!s) return;
    if (saveTimer !== null) { clearTimeout(saveTimer); saveTimer = null; }
    const out = { ...s, lastSavedAt: now() };
    mirrorNow(out);
    void writeSave(out);
  },
}));

function need(): SaveData {
  const s = useGame.getState().save;
  if (!s) throw new Error('no save loaded');
  return s;
}
function topPers(p: { personality: Record<string, number> }): string {
  return Object.entries(p.personality).sort((a, b) => b[1] - a[1])[0][0];
}
const dayHash = (t: number): number => Number(dayKey(t).replace(/-/g, ''));

import { checkAchievements as checkAch } from '../game/core/progress';
import { createEgg as newEgg } from '../game/core/pet';

function emit(e: GameEvent): void {
  const st = useGame.getState();
  switch (e.type) {
    case 'coins':
      coinAcc += e.amount;
      if (coinTimer === null) coinTimer = window.setTimeout(() => { st.toast(`+${coinAcc} 코인`, 'assets/ui/icon_coin.png', 'coin'); audio.sfx('coin'); coinAcc = 0; coinTimer = null; }, 300);
      break;
    case 'achievement': {
      const a = ACH_BY_ID[e.id];
      if (a) { st.toast(`업적 달성! ${a.title}`, 'assets/ui/icon_trophy.png', 'ach'); audio.sfx('achieve'); }
      break;
    }
    case 'toast': st.toast(e.text, e.icon); break;
    case 'feed': audio.sfx('eat'); setTimeout(() => st.say([e.reaction === 'fav' ? 'eat_fav' : e.reaction === 'dislike' ? 'eat_dislike' : 'eat'], true), 400); break;
    case 'pet': if (e.rewarded) { audio.sfx('pet'); if (Math.random() < 0.3) st.say(['pet', 'love'], true); } break;
    case 'bathe': audio.sfx('bath'); setTimeout(() => st.say(['clean'], true), 300); break;
    case 'sleep': audio.sfx('sleep'); break;
    case 'wake': st.say(['wake'], true); break;
    case 'heal': st.say(['recover'], true); break;
    case 'play': audio.sfx('jump'); st.say(['play'], true); break;
    case 'hatch': audio.sfx('hatch'); break;
    case 'evolve': audio.sfx('evolve'); break;
    case 'special': audio.sfx('start'); break;
    default: break;
  }
  listeners.forEach((l) => l(e));
}

export function applySettings(s: Settings): void {
  audio.setVolumes({ master: s.volume, music: s.musicVolume, sfx: s.sfxVolume, muted: s.muted });
  const r = document.documentElement;
  r.classList.toggle('reduced-motion', s.reducedMotion);
  r.classList.toggle('low-power', s.lowPower);
}
export const speciesName = (id: string): string => SPECIES[id]?.name ?? id;
export { lastTick as _lastTick };
