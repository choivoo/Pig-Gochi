import { useEffect, useRef, useState } from 'react';
import { audio } from '../../audio/audio';
import { exportJson, parseImport } from '../../persistence/storage';
import { now, useGame } from '../../stores/gameStore';
import type { SaveData } from '../../types';

interface InstallEvt extends Event { prompt(): Promise<void> }

export function SettingsPanel() {
  const save = useGame((s) => s.save);
  const update = useGame((s) => s.updateSettings);
  const replaceSave = useGame((s) => s.replaceSave);
  const resetAll = useGame((s) => s.resetAll);
  const toast = useGame((s) => s.toast);
  const setPanel = useGame((s) => s.setPanel);
  const [pending, setPending] = useState<SaveData | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [canInstall, setCanInstall] = useState(false);
  useEffect(() => { setCanInstall(!!(window as unknown as { __install?: InstallEvt }).__install); }, []);
  const st = save?.settings;
  const lastExport = save?.counters.lastExport;
  const stale = save && (!lastExport || now() - lastExport > 7 * 86400000);

  const doExport = () => {
    if (!save) return;
    const blob = new Blob([exportJson(save)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pixel-life-save-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    useGame.setState({ save: { ...save, counters: { ...save.counters, lastExport: now() } } });
    useGame.getState().scheduleSave();
    toast('저장 데이터를 내보냈어요.', 'assets/ui/icon_save.png');
  };
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 5_000_000) { setMsg('파일이 너무 커요.'); return; }
    const r = parseImport(await f.text());
    if (!r.ok || !r.save) { setMsg(`가져오기 실패: ${r.error}`); return; }
    setMsg('');
    setPending(r.save);
  };
  return (
    <div className="stack">
      {st && save ? (
        <>
          <label className="field">전체 음량 {Math.round(st.volume * 100)}%<input className="range" type="range" min={0} max={1} step={0.05} value={st.volume} onChange={(e) => update({ volume: Number(e.target.value) })} /></label>
          <label className="field">음악 음량 {Math.round(st.musicVolume * 100)}%<input className="range" type="range" min={0} max={1} step={0.05} value={st.musicVolume} onChange={(e) => update({ musicVolume: Number(e.target.value) })} /></label>
          <label className="field">효과음 음량 {Math.round(st.sfxVolume * 100)}%<input className="range" type="range" min={0} max={1} step={0.05} value={st.sfxVolume} onChange={(e) => { update({ sfxVolume: Number(e.target.value) }); audio.sfx('click'); }} /></label>
          <label className="row"><input type="checkbox" checked={st.muted} onChange={(e) => update({ muted: e.target.checked })} style={{ width: 24, height: 24 }} /><b>소리 끄기 (음소거)</b></label>
          <label className="row"><input type="checkbox" checked={st.reducedMotion} onChange={(e) => update({ reducedMotion: e.target.checked })} style={{ width: 24, height: 24 }} /><b>움직임 줄이기</b></label>
          <label className="row"><input type="checkbox" checked={st.lowPower} onChange={(e) => update({ lowPower: e.target.checked })} style={{ width: 24, height: 24 }} /><b>저성능 모드 (파티클·배경 효과 줄이기)</b></label>
          <button className="btn" onClick={() => { useGame.setState({ save: { ...save, tutorial: { step: 1, done: false } } }); useGame.getState().scheduleSave(); setPanel('none'); }}>튜토리얼 다시 보기</button>
        </>
      ) : <div className="muted">게임을 시작하면 소리·접근성 설정을 바꿀 수 있어요.</div>}
      <div className="storage-note">⚠ 모든 데이터는 이 기기의 브라우저에만 저장돼요. 브라우저 데이터를 지우면 진행도가 사라질 수 있고, 다른 기기와 자동으로 동기화되지 않아요. 가끔 '내보내기'로 백업해 주세요.{stale && save ? ' (최근 7일간 백업한 적이 없어요!)' : ''}</div>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <button className="btn mint" disabled={!save} onClick={doExport}>저장 데이터 내보내기</button>
        <button className="btn sky" onClick={() => fileRef.current?.click()}>가져오기</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
      {msg && <div role="alert" className="toast error" style={{ animation: 'none' }}>{msg}</div>}
      {pending && (
        <div className="storage-note stack" role="alertdialog" aria-label="가져오기 확인">
          <b>이 파일로 현재 저장 데이터를 교체할까요?</b>
          <span>코인 {pending.coins} · 펫 {Object.keys(pending.ownedPets).length}마리 · 도감 {Object.keys(pending.encyclopedia).length}종</span>
          <div className="row"><button className="btn small" onClick={() => setPending(null)}>취소</button><button className="btn small red" onClick={() => { replaceSave(pending); useGame.setState({ screen: useGame.getState().screen }); setPending(null); toast('저장 데이터를 가져왔어요.', 'assets/ui/icon_save.png'); }}>교체하기</button></div>
        </div>
      )}
      {canInstall && <button className="btn gold" onClick={() => { const e = (window as unknown as { __install?: InstallEvt }).__install; void e?.prompt(); }}>홈 화면에 설치</button>}
      <div className="muted">iPhone/iPad는 Safari의 공유 버튼 → '홈 화면에 추가'로 설치할 수 있어요.</div>
      <hr style={{ width: '100%', border: '1px dashed var(--ink)' }} />
      {!confirmReset ? <button className="btn red" onClick={() => setConfirmReset(true)}>데이터 초기화</button> : (
        <div className="storage-note stack"><b>정말 모든 데이터를 삭제할까요? 되돌릴 수 없어요.</b>
          <div className="row"><button className="btn small" onClick={() => setConfirmReset(false)}>취소</button><button className="btn small red" onClick={() => { setConfirmReset(false); void resetAll(); }}>삭제하기</button></div></div>
      )}
      <div className="muted">PIXEL LIFE v1.0.0 · 모든 그래픽·사운드는 이 프로젝트에서 직접 제작했어요.</div>
    </div>
  );
}
