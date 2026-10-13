import { useEffect, useState } from 'react';
import { audio } from '../audio/audio';
import { Icon, Modal, StatBar } from '../components/common';
import { LINEAGE_NAME, SPECIES, STAGE_NAME } from '../data/pets';
import { computeEmotion, EMOTION_ICON, EMOTION_LABEL } from '../game/core/emotion';
import { evolutionReady, growthProgress } from '../game/core/evolution';
import { ILLNESS_NAME } from '../game/core/simulation';
import { activePet } from '../game/core/progress';
import { seasonOf, timeOfDay, TOD_NAME, WEATHER_NAME, weatherFor } from '../game/core/weather';
import { dayKey } from '../game/core/util';
import { useNow } from '../hooks/useNow';
import { MISSION_BY_ID } from '../data/missions';
import { now, useGame, type Panel } from '../stores/gameStore';
import type { Stats } from '../types';
import { MinigameHost } from '../game/minigames/MinigameHost';
import { RoomStage } from './RoomStage';
import { BathScene } from './panels/BathScene';
import { CarePanel } from './panels/CarePanel';
import { DexPanel } from './panels/DexPanel';
import { EditTray } from './panels/EditTray';
import { FoodPanel } from './panels/FoodPanel';
import { AchievementsPanel } from './panels/AchievementsPanel';
import { PlayPanel } from './panels/PlayPanel';
import { SettingsPanel } from './panels/SettingsPanel';
import { ShopPanel } from './panels/ShopPanel';
import { StatusPanel } from './panels/StatusPanel';
import { StoragePanel } from './panels/StoragePanel';
import { WardrobePanel } from './panels/WardrobePanel';

const STAT_UI: { key: keyof Stats; icon: string; label: string; color: string; invert?: boolean }[] = [
  { key: 'satiety', icon: 'hunger', label: '포만감', color: '#ff9d3d' },
  { key: 'happiness', icon: 'heart', label: '행복도', color: '#ff6b9d' },
  { key: 'cleanliness', icon: 'clean', label: '청결도', color: '#4fb8e8' },
  { key: 'energy', icon: 'energy', label: '에너지', color: '#e8b800' },
  { key: 'health', icon: 'health', label: '건강', color: '#ff5a5a' },
  { key: 'bond', icon: 'bond', label: '친밀도', color: '#c06be8' },
  { key: 'stress', icon: 'stress', label: '스트레스', color: '#7a7a9a', invert: true },
];

function StatusBar() {
  const save = useGame((s) => s.save);
  const [open, setOpen] = useState(false);
  const pet = save && activePet(save);
  if (!pet) return null;
  if (pet.stage === 'egg') {
    return <div className="statusbar" aria-label="알 상태"><b>알을 톡톡 두드려 보세요! ({pet.hatchTaps}/5)</b><div className="bar" style={{ color: '#ff9db8', marginTop: 4 }}><i style={{ width: `${(pet.hatchTaps / 5) * 100}%` }} /></div></div>;
  }
  const rows = (list: typeof STAT_UI) => list.map((s) => {
    const v = pet.stats[s.key];
    return (
      <div className="stat-row" key={s.key} title={`${s.label} ${Math.round(v)}`}>
        <Icon name={s.icon} size="sm" alt={s.label} />
        <span className="lbl">{s.label}</span>
        <StatBar value={v} color={s.color} invert={s.invert} />
        <span className="stat-num">{Math.round(v)}</span>
      </div>
    );
  });
  const emo = computeEmotion(pet, new Date(now()).getHours());
  return (
    <div className="statusbar" aria-label="펫 상태">
      <div className="stat-compact">{rows(STAT_UI.slice(0, 4))}</div>
      <div className={open ? '' : 'sr'} data-extra>
        <div className="stat-compact" style={{ display: 'block' }}>{rows(STAT_UI.slice(4))}</div>
        <div className="growthbar">성장 {Math.round(growthProgress(pet) * 100)}% · 기분 {EMOTION_ICON[emo]} {EMOTION_LABEL[emo]}{pet.illness ? ` · 🤒 ${ILLNESS_NAME[pet.illness]}` : ''}</div>
      </div>
      <button className="stat-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? '▲ 접기' : '▼ 상태 더 보기'}</button>
    </div>
  );
}

function Hud() {
  const save = useGame((s) => s.save);
  const setPanel = useGame((s) => s.setPanel);
  const t = useNow(30000);
  const pet = save && activePet(save);
  if (!save || !pet) return null;
  const unclaimed = [...save.missions.daily, ...save.missions.weekly].filter((m) => m.progress >= (MISSION_BY_ID[m.id]?.target ?? 1e9) && !m.claimed).length;
  const d = new Date(t);
  const tod = timeOfDay(d.getHours());
  const w = weatherFor(dayKey(t), tod, seasonOf(d.getMonth()));
  const sp = SPECIES[pet.speciesId];
  return (
    <header className="hud">
      <Icon name={`profile_${save.playerProfile.icon}`} size="sm" />
      <div className="who">
        <b>{pet.name}{pet.special ? ' ✨' : ''}</b>
        <small>{save.playerProfile.name} · {pet.stage === 'egg' ? '알' : `${sp.name} · ${STAGE_NAME[pet.stage]}`} · {TOD_NAME[tod]}·{WEATHER_NAME[w]}</small>
      </div>
      <button className="btn small icon-only" aria-label={save.settings.muted ? '소리 켜기' : '소리 끄기'} aria-pressed={save.settings.muted} onClick={() => useGame.getState().updateSettings({ muted: !save.settings.muted })}><Icon name={save.settings.muted ? 'mute' : 'sound'} size="sm" /></button>
      <div className="coin-chip" aria-label={`코인 ${save.coins}개`}><Icon name="coin" size="sm" /><span>{save.coins}</span></div>
      <button className="btn small icon-only" aria-label="더보기 메뉴" onClick={() => setPanel('menu')}><Icon name="bag" size="sm" />{unclaimed > 0 && <span className="dot" aria-label="받을 보상" style={{ position: 'relative', width: 10, height: 10, background: 'var(--red)', border: '2px solid var(--ink)', borderRadius: '50%', marginLeft: -6, marginTop: -16 }} />}</button>
    </header>
  );
}

const TUTORIAL: Record<number, { text: string; hl?: string }> = {
  0: { text: '알을 톡톡 눌러서 부화시켜 보세요! (5번)' },
  1: { text: '짠! 태어났어요. 아래 상태 막대로 포만감·행복도·청결도 등을 확인해요. 확인했다면 [다음]을 눌러요.', hl: 'ack' },
  2: { text: '배가 고프대요! [먹이]에서 기본 사료를 먹여 보세요.', hl: 'feed' },
  3: { text: '펫을 손가락(마우스)으로 쓰다듬어 보세요. 친밀도가 올라가요.' },
  4: { text: '[목욕]으로 깨끗하게 씻겨 주세요.', hl: 'bath' },
  5: { text: '[놀이]에서 미니게임 "별 모으기"를 해 보세요. 코인을 벌 수 있어요.', hl: 'play' },
  6: { text: '[상점]에서 마음에 드는 물건을 하나 구입해 보세요.', hl: 'shop' },
  7: { text: '[꾸미기]에서 가구를 하나 배치하고 [저장]해 보세요.', hl: 'decorate' },
  8: { text: '게임을 닫아도 이 기기에 자동 저장돼요. 브라우저 데이터를 지우면 사라지니 설정에서 가끔 백업해 주세요.', hl: 'ack' },
};

function TutorialOverlay() {
  const save = useGame((s) => s.save);
  const tutorial = useGame((s) => s.tutorial);
  const skip = useGame((s) => s.skipTutorial);
  if (!save || save.tutorial.done) return null;
  const st = save.tutorial.step;
  const info = TUTORIAL[st];
  if (!info) return null;
  return (
    <div className="tutorial" role="status" aria-live="polite">
      <div className="t"><span className="n">튜토리얼 {st + 1}/9</span>{info.text}</div>
      {info.hl === 'ack' && <button className="btn small mint" onClick={() => tutorial(st === 1 ? 'ack1' : 'ack2')}>{st === 8 ? '완료' : '다음'}</button>}
      <button className="btn small" onClick={skip} aria-label="튜토리얼 건너뛰기">건너뛰기</button>
    </div>
  );
}

function WelcomeBack() {
  const report = useGame((s) => s.offlineReport);
  const welcome = useGame((s) => s.welcome);
  const [open, setOpen] = useState(true);
  const save = useGame((s) => s.save);
  const pet = save && activePet(save);
  if (!open || !pet || (!report?.away && !welcome)) return null;
  const hours = report ? Math.floor(report.elapsedMs / 3600000) : 0;
  return (
    <Modal title={report?.away ? '다시 만나서 반가워요!' : '오늘의 인사'} icon="heart" onClose={() => setOpen(false)}>
      <div className="stack">
        {report?.away && <p style={{ margin: 0 }}>{pet.name}이(가) 기다리고 있었어요. {hours >= 1 ? `약 ${hours}시간` : '한동안'} 자리를 비웠지만 괜찮아요. 천천히 돌봐 주세요 💕</p>}
        {report?.away && report.before && report.after && <div className="muted">자리를 비운 사이 포만감 {Math.round(report.before.satiety)}→{Math.round(report.after.satiety)}, 행복도 {Math.round(report.before.happiness)}→{Math.round(report.after.happiness)} (최대 8시간까지만 반영돼요)</div>}
        {welcome && welcome.coins > 0 && <div className="storage-note">출석 보상 코인 {welcome.coins}개를 받았어요! (연속 {welcome.streak}일)</div>}
        <button className="btn pink" onClick={() => setOpen(false)}>좋아요!</button>
      </div>
    </Modal>
  );
}

function ActionBar() {
  const save = useGame((s) => s.save);
  const setPanel = useGame((s) => s.setPanel);
  const sleep = useGame((s) => s.toggleSleep);
  const pet = save && activePet(save);
  const tut = save && !save.tutorial.done ? TUTORIAL[save.tutorial.step]?.hl : undefined;
  if (!save || !pet) return null;
  const egg = pet.stage === 'egg';
  const go = (p: Panel) => () => { audio.sfx('click'); setPanel(p); };
  const dis = egg;
  const needFeed = !egg && pet.stats.satiety < 30;
  const needBath = !egg && pet.stats.cleanliness < 30;
  const sick = !egg && (!!pet.illness || pet.stats.health < 40);
  const btn = (id: string, icon: string, label: string, color: string, onClick: () => void, opts: { disabled?: boolean; dot?: boolean } = {}) => (
    <button key={id} className={`act c-${color} ${tut === id ? 'hl' : ''}`} onClick={onClick} disabled={opts.disabled} aria-label={label}>
      <Icon name={icon} />{label}{opts.dot && <span className="dot" aria-label="주의" />}
    </button>
  );
  return (
    <nav className="actions" aria-label="돌보기 메뉴">
      {btn('status', sick ? 'medicine' : 'stats', '상태', 'sky', go('status'), { dot: sick })}
      {btn('feed', 'feed', '먹이', 'gold', go('food'), { disabled: dis, dot: needFeed })}
      {btn('bath', 'bath', '목욕', 'sky', go('bath'), { disabled: dis, dot: needBath })}
      {btn('play', 'play', '놀이', 'pink', go('play'), { disabled: dis })}
      {btn('sleep', 'sleep', pet.sleeping ? '깨우기' : '잠자기', 'lav', () => { audio.sfx('click'); sleep(); }, { disabled: dis })}
      {btn('shop', 'shop', '상점', 'mint', go('shop'))}
      {btn('decorate', 'decorate', '꾸미기', 'pink', go('decorate'))}
      {btn('dex', 'book', '도감', 'lav', go('dex'))}
    </nav>
  );
}

function Panels() {
  const panel = useGame((s) => s.panel);
  const setPanel = useGame((s) => s.setPanel);
  const close = () => setPanel('none');
  switch (panel) {
    case 'food': return <Modal title="먹이 주기" icon="feed" onClose={close}><FoodPanel /></Modal>;
    case 'play': return <Modal title="놀이" icon="play" onClose={close} wide><PlayPanel tab="toys" /></Modal>;
    case 'minigames': return <Modal title="미니게임" icon="game" onClose={close} wide><PlayPanel tab="games" /></Modal>;
    case 'care': return <Modal title="치료" icon="medicine" onClose={close}><CarePanel /></Modal>;
    case 'shop': return <Modal title="상점" icon="shop" onClose={close} wide><ShopPanel /></Modal>;
    case 'dex': return <Modal title="도감" icon="book" onClose={close} wide><DexPanel /></Modal>;
    case 'achievements': case 'missions': return <Modal title="미션 · 업적" icon="trophy" onClose={close} wide><AchievementsPanel initial={panel === 'missions' ? 'missions' : 'ach'} /></Modal>;
    case 'settings': return <Modal title="설정" icon="settings" onClose={close}><SettingsPanel /></Modal>;
    case 'storage': return <Modal title="펫 보관함" icon="pets" onClose={close} wide><StoragePanel /></Modal>;
    case 'wardrobe': return <Modal title="꾸며 주기" icon="star" onClose={close}><WardrobePanel /></Modal>;
    case 'status': return <Modal title="상태" icon="stats" onClose={close}><StatusPanel /></Modal>;
    case 'menu': return <Modal title="메뉴" icon="bag" onClose={close}><MenuLinks /></Modal>;
    case 'bath': return <BathScene onClose={close} />;
    default: return null;
  }
}

function EvolveButton() {
  const save = useGame((s) => s.save);
  const doEvolve = useGame((s) => s.doEvolve);
  const pet = save && activePet(save);
  if (!pet || !evolutionReady(pet)) return null;
  return <button className="btn gold evolve-btn" onClick={() => { audio.sfx('start'); doEvolve(); }}>✨ 진화할 수 있어요!</button>;
}

export function GameScreen() {
  const save = useGame((s) => s.save);
  const panel = useGame((s) => s.panel);
  const mg = useGame((s) => s.activeMinigame);
  const setPanel = useGame((s) => s.setPanel);
  const toggleSleep = useGame((s) => s.toggleSleep);
  const editing = panel === 'decorate';
  const pet = save && activePet(save);
  useEffect(() => {
    // gentle idle chatter
    const id = window.setInterval(() => useGame.getState().idleChat(), 14000);
    const first = window.setTimeout(() => useGame.getState().idleChat(), 1500);
    return () => { clearInterval(id); clearTimeout(first); };
  }, []);
  useEffect(() => {
    const h = new Date(now()).getHours();
    audio.music(mg ? 'minigame' : h >= 21 || h < 6 ? 'night' : 'room');
  }, [mg, pet?.sleeping]);
  // keyboard shortcuts
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (useGame.getState().panel !== 'none' || useGame.getState().activeMinigame || (e.target as HTMLElement)?.tagName === 'INPUT') return;
      const map: Record<string, Panel> = { f: 'food', b: 'bath', p: 'play', s: 'shop', d: 'decorate', c: 'dex', t: 'status' };
      if (map[e.key.toLowerCase()]) setPanel(map[e.key.toLowerCase()]);
      if (e.key.toLowerCase() === 'z') toggleSleep();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [setPanel, toggleSleep]);
  if (!save || !pet) return null;
  const onFurniture = (fn: string) => {
    if (fn === 'sleep') toggleSleep();
    else if (fn === 'eat') setPanel('food');
    else if (fn === 'play') setPanel('play');
    else if (fn === 'accessory') setPanel('wardrobe');
    else if (fn === 'minigame') setPanel('minigames');
    else if (fn === 'watch') useGame.getState().say(['curious'], true);
  };
  return (
    <div className="game">
      <Hud />
      {editing ? <EditTray /> : (
        <>
          <div style={{ position: 'relative', minHeight: 0, display: 'flex', flexDirection: 'column', gridRow: 2 }}>
            <RoomStage onFurniture={onFurniture} />
            <EvolveButton />
          </div>
          <StatusBar />
          <ActionBar />
        </>
      )}
      <Panels />
      {!editing && <TutorialOverlay />}
      <WelcomeBack />
      {mg && <MinigameHost id={mg} />}
    </div>
  );
}

export function MenuLinks() {
  const setPanel = useGame((s) => s.setPanel);
  const setScreen = useGame((s) => s.setScreen);
  return (
    <div className="stack">
    <div className="grid">
      {([['medicine', '치료', 'care'], ['mission', '미션', 'missions'], ['trophy', '업적', 'achievements'], ['pets', '보관함', 'storage'], ['star', '꾸며 주기', 'wardrobe'], ['settings', '설정', 'settings']] as const).map(([i, l, p]) => (
        <button key={p} className="btn" onClick={() => setPanel(p)}><Icon name={i} size="sm" />{l}</button>
      ))}
    </div>
    <button className="btn" onClick={() => { useGame.getState().flush(); setScreen('title'); }}><Icon name="home" size="sm" />타이틀로 (자동 저장됨)</button>
    </div>
  );
}
export { LINEAGE_NAME };
