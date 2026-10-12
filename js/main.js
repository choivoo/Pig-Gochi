// 엔트리: 초기화, 액션 연결, 서비스 워커
import { G, acts, init, bindActions, go, save, $, toast, modal } from './state.js';
import './screens.js';
import { ghostFromHash } from './modes.js';
import { registerFightActs } from './fight.js';
import { initAudio, stopBgm } from './audio.js';

registerFightActs(acts);

function boot() {
  init();
  window.__G = G; // 디버그/E2E 테스트용
  bindActions();
  go('title');
  // 첫 터치에서 오디오 잠금 해제
  window.addEventListener('pointerdown', () => initAudio(), { once: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { save(); if (G.view) G.view.paused = true; stopBgm(); }
    else if (G.view && !document.querySelector('.modal-wrap')) G.view.paused = false;
  });
  window.addEventListener('pagehide', save);
  setInterval(() => { if (G.save) { G.save.meta.playTime += 30; save(); } }, 30000);
  // 뒤로가기: 전투 중이면 일시정지, 아니면 홈으로
  history.replaceState({ g: 1 }, '');
  history.pushState({ g: 2 }, '');
  window.addEventListener('popstate', () => {
    history.pushState({ g: 2 }, '');
    if (G.battle && !G.battle.over) { if (!document.querySelector('.modal-wrap')) acts.pause(); }
    else if (!document.querySelector('.modal-wrap') && G.screen !== 'title' && G.screen !== 'home') go('home');
  });
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* 오프라인 캐시 없이 계속 */ });
  }
  const gh = ghostFromHash();
  if (gh) window.__ghost = gh;
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
