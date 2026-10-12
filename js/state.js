// 전역 상태와 UI 공용 헬퍼
import { load, persist, dailyRefresh, today, bump } from './save.js';
import { rollEquipment } from './rpg.js';
import { sfx } from './audio.js';

export const G = { save: null, screen: 'title', view: null, battle: null, lossStreak: 0, onBack: null };
export const acts = {};          // data-act 핸들러 레지스트리
export const screens = {};       // 화면 렌더러
export { bump, today };

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function init() {
  G.save = load();
  dailyRefresh(G.save, rollEquipment);
  save();
}
export function save() { persist(G.save); }

export function toast(msg, ms = 1800) {
  const root = $('#toast-root');
  const d = document.createElement('div');
  d.className = 'toast'; d.innerHTML = msg;
  root.appendChild(d);
  setTimeout(() => d.classList.add('out'), ms);
  setTimeout(() => d.remove(), ms + 400);
}

// 모달: buttons = [{label, cls, val}] → Promise(val)
export function modal(html, buttons = [{ label: '확인', val: true, cls: 'pri' }], opts = {}) {
  return new Promise((resolve) => {
    const root = $('#modal-root');
    const wrap = document.createElement('div');
    wrap.className = 'modal-wrap' + (opts.cls ? ' ' + opts.cls : '');
    wrap.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><div class="modal-body">${html}</div><div class="modal-btns">${buttons.map((b, i) => `<button class="btn ${b.cls || ''}" data-i="${i}">${b.label}</button>`).join('')}</div></div>`;
    root.appendChild(wrap);
    const close = (v) => { wrap.remove(); resolve(v); };
    wrap.querySelectorAll('.modal-btns .btn').forEach((bt) => {
      bt.onclick = (e) => { e.stopPropagation(); sfx.click(); close(buttons[+bt.dataset.i].val); };
    });
    if (opts.dismiss) wrap.onclick = (e) => { if (e.target === wrap) close(opts.dismissVal ?? false); };
    wrap.modalBody = wrap.querySelector('.modal-body');
    wrap.closeWith = close;
    if (opts.onOpen) opts.onOpen(wrap);
  });
}
export const confirmBox = (html, yes = '네', no = '아니오') => modal(html, [{ label: no, val: false }, { label: yes, val: true, cls: 'pri' }], { dismiss: true });

export function go(name, params) {
  G.screen = name; G.params = params || {};
  const root = $('#screen');
  root.scrollTop = 0;
  $('#battle').hidden = true;
  $('#main-ui').hidden = false;
  const f = screens[name];
  root.innerHTML = '';
  if (f) f(root, G.params);
  const hideNav = ['title'].includes(name);
  $('#nav').hidden = hideNav; $('#topbar').hidden = hideNav;
  $$('#nav .tab').forEach((t) => t.classList.toggle('on', t.dataset.go === name || (t.dataset.go === 'adventure' && ['stage'].includes(name))));
  renderTop();
}
export function refresh() { go(G.screen, G.params); }

export function renderTop() {
  const s = G.save;
  const el = $('#topbar');
  if (!el) return;
  el.innerHTML = `<div class="cur"><span class="ci">🪙</span><b>${s.coin.toLocaleString()}</b></div><div class="cur"><span class="ci">✏️</span><b>${s.chalk}</b></div><div class="grow"></div><button class="icon-btn" data-act="goSettings" aria-label="설정">⚙️</button>`;
}

// 이벤트 위임
export function bindActions() {
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-act],[data-go]');
    if (!t) return;
    if (t.dataset.go) { sfx.click(); go(t.dataset.go); return; }
    const f = acts[t.dataset.act];
    if (f) { sfx.click(); f(t.dataset, t, e); }
  });
}

export function addReward(r) {
  const s = G.save;
  if (r.coin) s.coin += r.coin;
  if (r.chalk) s.chalk += r.chalk;
}
export const rewardText = (r) => [r.coin ? `🪙 ${r.coin}` : '', r.chalk ? `✏️ ${r.chalk}` : '', r.eraser ? `🧽 지우개 획득!` : ''].filter(Boolean).join('  ');

export function partySlots() {
  const c = G.save.progress.cleared;
  return 1 + (c['1-5'] ? 1 : 0) + (c['2-10'] ? 1 : 0);
}
export function getInst(uid) { return G.save.erasers.find((e) => e.uid === uid); }
