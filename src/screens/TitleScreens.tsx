import { useEffect, useMemo, useState } from 'react';
import { audio } from '../audio/audio';
import { Icon, PetThumb } from '../components/common';
import { EGGS } from '../data/pets';
import { useGame } from '../stores/gameStore';
import { assetUrl } from '../game/render/assets';

const ICONS = ['star', 'flame', 'leaf', 'moon', 'cloud', 'drop'];

export function TitleScreen() {
  const hasSave = useGame((s) => s.hasSave);
  const setScreen = useGame((s) => s.setScreen);
  const setPanel = useGame((s) => s.setPanel);
  const cont = useGame((s) => s.continueGame);
  const loadInfo = useGame((s) => s.loadInfo);
  const toast = useGame((s) => s.toast);
  const [confirmNew, setConfirmNew] = useState(false);
  useEffect(() => { if (loadInfo?.recovered) toast('저장 데이터를 복구해서 불러왔어요.', 'assets/ui/icon_save.png'); }, [loadInfo, toast]);
  const clouds = [{ top: '10%', dur: 60, i: 0, delay: -10 }, { top: '22%', dur: 85, i: 1, delay: -40 }, { top: '34%', dur: 70, i: 2, delay: -25 }];
  return (
    <div className="title">
      <img className="title-bg" src={assetUrl('assets/ui/title_bg.png')} alt="" />
      {clouds.map((c) => <img key={c.i} className="cloud" src={assetUrl(`assets/ui/cloud${c.i}.png`)} alt="" style={{ top: c.top, width: 120, animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s` }} />)}
      <div className="logo-wrap">
        <img className="logo" src={assetUrl('assets/ui/logo.png')} alt="PIXEL LIFE" />
        <p className="sub">작은 생명의 세계</p>
      </div>
      <div className="egg glint" style={{ backgroundImage: `url(${assetUrl('assets/pets/egg_starlight.png')})` }} role="img" aria-label="흔들리는 알" />
      <nav className="menu" aria-label="메인 메뉴">
        <button className="btn pink" onClick={() => { audio.sfx('start'); if (hasSave) setConfirmNew(true); else setScreen('intro'); }}>새 게임</button>
        <button className="btn mint" disabled={!hasSave} onClick={() => { audio.sfx('start'); cont(); }}>이어하기</button>
        <div className="row">
          <button className="btn sky" style={{ flex: 1 }} onClick={() => { audio.sfx('click'); setPanel('dex'); }}><Icon name="book" size="sm" />도감</button>
          <button className="btn lav" style={{ flex: 1 }} onClick={() => { audio.sfx('click'); setPanel('settings'); }}><Icon name="settings" size="sm" />설정</button>
        </div>
      </nav>
      <div className="ver">v1.0.0 · 데이터는 이 기기에만 저장돼요</div>
      {confirmNew && (
        <div className="overlay" role="alertdialog" aria-modal="true" aria-label="새 게임 확인">
          <div className="sheet" style={{ borderBottom: '4px solid var(--ink)', borderRadius: 14 }}>
            <div className="body stack">
              <b>새 게임을 시작할까요?</b>
              <span className="muted">저장된 게임이 있어요. 새로 시작하면 지금 저장된 데이터는 새 저장으로 교체돼요. (설정에서 먼저 내보내기로 백업할 수 있어요.)</span>
              <div className="row"><button className="btn" style={{ flex: 1 }} onClick={() => setConfirmNew(false)}>취소</button><button className="btn red" style={{ flex: 1 }} onClick={() => { setConfirmNew(false); setScreen('intro'); }}>새로 시작</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const LINES = ['어느 날, 작은 별 하나가 당신에게 도착했어요.', '이 안에는 아직 세상을 모르는 생명체가 잠들어 있어요.', '이 작은 친구를 함께 키워 볼까요?'];

export function IntroScreen() {
  const setScreen = useGame((s) => s.setScreen);
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(0);
  const stars = useMemo(() => Array.from({ length: 36 }, (_, k) => ({ k, x: (k * 53) % 100, y: (k * 29) % 100, d: (k % 5) * 0.4 })), []);
  const line = LINES[i];
  useEffect(() => {
    setShown(0);
    const id = window.setInterval(() => setShown((n) => (n >= line.length ? n : n + 1)), 55);
    return () => clearInterval(id);
  }, [line]);
  useEffect(() => {
    if (shown < line.length) return;
    const id = window.setTimeout(() => { if (i < LINES.length - 1) setI(i + 1); }, 1700);
    return () => clearTimeout(id);
  }, [shown, line, i]);
  const advance = () => {
    audio.sfx('click');
    if (shown < line.length) setShown(line.length);
    else if (i < LINES.length - 1) setI(i + 1);
  };
  return (
    <div className="intro" onClick={advance} role="button" tabIndex={0} aria-label="화면을 눌러 계속" onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') advance(); }}>
      {stars.map((s) => <span key={s.k} className="star" style={{ left: `${s.x}%`, top: `${s.y}%`, animationDelay: `${s.d}s` }} />)}
      <div className="egg-drop" style={{ backgroundImage: `url(${assetUrl('assets/pets/egg_starlight.png')})` }} />
      <p aria-live="polite">{line.slice(0, shown)}</p>
      <div className="row" onClick={(e) => e.stopPropagation()}>
        <button className="btn small" onClick={() => setScreen('title')}>돌아가기</button>
        {i >= LINES.length - 1 && shown >= line.length
          ? <button className="btn pink" onClick={() => { audio.sfx('start'); setScreen('setup'); }}>게임 시작</button>
          : <button className="btn small" onClick={() => { audio.sfx('click'); setScreen('setup'); }}>건너뛰기</button>}
      </div>
    </div>
  );
}

export function SetupScreen() {
  const { setup, setSetup, startNew, setScreen } = useGame();
  const [step, setStep] = useState(0);
  const [eggName, setEggName] = useState('');
  const egg = EGGS.find((e) => e.id === setup.eggType);
  const nameOk = setup.name.trim().length >= 1 && setup.name.trim().length <= 10;
  useEffect(() => { if (egg && !eggName) setEggName(''); }, [egg, eggName]);
  return (
    <div className="screen" style={{ overflowY: 'auto', background: 'var(--cream)' }}>
      <div className="setup">
        {step === 0 && (
          <>
            <h1>어떤 이름으로 불러 드릴까요?</h1>
            <label className="field">플레이어 닉네임 (최대 10자)
              <input className="input" value={setup.name} maxLength={10} placeholder="트레이너" onChange={(e) => setSetup({ name: e.target.value })} aria-invalid={!nameOk && setup.name.length > 0} />
            </label>
            <div className="field">프로필 아이콘
              <div className="icon-pick" role="group" aria-label="프로필 아이콘">
                {ICONS.map((ic) => <button key={ic} aria-pressed={setup.icon === ic} aria-label={`아이콘 ${ic}`} onClick={() => { audio.sfx('click'); setSetup({ icon: ic }); }}><Icon name={`profile_${ic}`} size="lg" /></button>)}
              </div>
            </div>
            <div className="row"><button className="btn" onClick={() => setScreen('intro')}>이전</button>
              <button className="btn pink" style={{ flex: 1 }} onClick={() => { if (!setup.name.trim()) setSetup({ name: '트레이너' }); setStep(1); }}>다음</button></div>
          </>
        )}
        {step === 1 && (
          <>
            <h1>어떤 알을 선택할까요?</h1>
            {EGGS.map((e) => (
              <button key={e.id} className="egg-card" aria-pressed={setup.eggType === e.id} onClick={() => { audio.sfx('click'); setSetup({ eggType: e.id }); }}>
                <PetThumb speciesId={`egg_${e.id}`} frame={0} scale={2} />
                <span><b>{e.name}</b><br /><span className="muted">{e.desc}</span></span>
              </button>
            ))}
            <div className="row"><button className="btn" onClick={() => setStep(0)}>이전</button>
              <button className="btn pink" style={{ flex: 1 }} disabled={!setup.eggType} onClick={() => setStep(2)}>다음</button></div>
          </>
        )}
        {step === 2 && egg && (
          <>
            <h1>알의 이름을 지어 주세요</h1>
            <div className="center"><PetThumb speciesId={`egg_${egg.id}`} frame={0} scale={4} /></div>
            <label className="field">알의 이름 (최대 8자)
              <input className="input" value={eggName} maxLength={8} placeholder="예: 별이" onChange={(e) => setEggName(e.target.value)} />
            </label>
            <div className="row"><button className="btn" onClick={() => setStep(1)}>이전</button>
              <button className="btn pink" style={{ flex: 1 }} onClick={() => { audio.sfx('start'); startNew(eggName.trim() || '별이'); }}>육성 시작!</button></div>
          </>
        )}
      </div>
    </div>
  );
}
