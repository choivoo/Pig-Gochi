import { useEffect, useState } from 'react';
import { audio } from '../audio/audio';
import { Icon } from '../components/common';
import { CinematicOverlay } from '../components/Cinematic';
import { GameScreen } from '../screens/GameScreen';
import { IntroScreen, SetupScreen, TitleScreen } from '../screens/TitleScreens';
import { Modal } from '../components/common';
import { DexPanel } from '../screens/panels/DexPanel';
import { SettingsPanel } from '../screens/panels/SettingsPanel';
import { useGame } from '../stores/gameStore';

function Toasts() {
  const toasts = useGame((s) => s.toasts);
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind ?? ''}`}>
          {t.icon && <img className="px-icon sm" src={`${import.meta.env.BASE_URL}${t.icon}`} alt="" />}
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}

function UpdateBanner() {
  const [reg, setReg] = useState<ServiceWorkerRegistration | null>(null);
  useEffect(() => {
    const h = (e: Event) => setReg((e as CustomEvent<ServiceWorkerRegistration>).detail);
    window.addEventListener('pl-update-ready', h);
    return () => window.removeEventListener('pl-update-ready', h);
  }, []);
  if (!reg) return null;
  return (
    <div className="update-banner" role="alert">
      <span style={{ flex: 1 }}>새 버전이 준비됐어요!</span>
      <button className="btn small" onClick={() => { reg.waiting?.postMessage('SKIP_WAITING'); window.location.reload(); }}>업데이트</button>
      <button className="btn small icon-only" aria-label="닫기" onClick={() => setReg(null)}><Icon name="close" size="xs" /></button>
    </div>
  );
}

export function App() {
  const screen = useGame((s) => s.screen);
  const progress = useGame((s) => s.progress);
  const init = useGame((s) => s.init);
  const panel = useGame((s) => s.panel);
  const setPanel = useGame((s) => s.setPanel);
  const hasSave = useGame((s) => s.hasSave);

  useEffect(() => { void init(); }, [init]);
  useEffect(() => {
    const unlock = () => audio.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    const flush = () => useGame.getState().flush();
    const vis = () => { if (document.hidden) flush(); else if (useGame.getState().screen === 'game') useGame.getState().tick(); };
    document.addEventListener('visibilitychange', vis);
    window.addEventListener('pagehide', flush);
    return () => { window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); document.removeEventListener('visibilitychange', vis); window.removeEventListener('pagehide', flush); };
  }, []);
  useEffect(() => {
    if (screen !== 'game') return;
    const tick = window.setInterval(() => useGame.getState().tick(), 1000);
    return () => clearInterval(tick);
  }, [screen]);
  useEffect(() => {
    audio.music(screen === 'title' || screen === 'intro' || screen === 'setup' ? 'menu' : null);
  }, [screen]);

  return (
    <div className="app">
      {screen === 'loading' && (
        <div className="loading" role="status">
          <img src={`${import.meta.env.BASE_URL}assets/pets/egg_starlight.png`} alt="" style={{ width: 160, height: 32, objectFit: 'none', objectPosition: '0 0', imageRendering: 'pixelated', transform: 'scale(3)', transformOrigin: 'center', marginBottom: 20 }} />
          <div>불러오는 중…</div>
          <div className="loadbar"><i style={{ width: `${Math.round(progress * 100)}%` }} /></div>
        </div>
      )}
      {screen === 'title' && <TitleScreen />}
      {screen === 'intro' && <IntroScreen />}
      {screen === 'setup' && <SetupScreen />}
      {screen === 'game' && <GameScreen />}
      {screen !== 'game' && panel === 'dex' && <Modal title="도감" icon="book" onClose={() => setPanel('none')} wide><DexPanel /></Modal>}
      {screen !== 'game' && panel === 'settings' && <Modal title="설정" icon="settings" onClose={() => setPanel('none')}><SettingsPanel /></Modal>}
      <CinematicOverlay />
      <Toasts />
      <UpdateBanner />
      {hasSave && null}
    </div>
  );
}
