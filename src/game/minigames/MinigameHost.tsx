import { useCallback, useEffect, useRef, useState } from 'react';
import { audio } from '../../audio/audio';
import { Icon } from '../../components/common';
import { useGame } from '../../stores/gameStore';
import type { GameId } from '../core/minigameReward';
import { activePet } from '../core/progress';
import { fitCanvas } from '../render/constants';
import { H, W, type GameResult, type MiniGame } from './base';
import { Fishing } from './fishing';
import { MazeGame, type MazeDifficulty } from './maze';
import { MemoryGame, type MemDifficulty } from './memory';
import { GAME_META } from './meta';
import { RhythmGame } from './rhythm';
import { Runner } from './runner';
import { StarCatcher } from './stars';

export function makeGame(id: GameId, diff: string, seed: number, speciesId: string): MiniGame {
  switch (id) {
    case 'stars': return new StarCatcher(seed);
    case 'fishing': return new Fishing(seed);
    case 'memory': return new MemoryGame(diff as MemDifficulty, seed);
    case 'runner': return new Runner(seed, speciesId);
    case 'maze': return new MazeGame(diff as MazeDifficulty, seed, speciesId);
    case 'rhythm': return new RhythmGame(seed, (j) => audio.sfx(j === 'PERFECT' ? 'perfect' : j === 'GREAT' ? 'great' : j === 'GOOD' ? 'good' : 'miss'));
  }
}
const GRADE_LABEL = ['D', 'C', 'B', 'A', 'S'];

export function MinigameHost({ id }: { id: GameId }) {
  const meta = GAME_META[id];
  const species = useGame((s) => { const p = s.save ? activePet(s.save) : undefined; return p?.speciesId ?? 'mongle'; });
  const start = useGame((s) => s.startMinigame);
  const finishGame = useGame((s) => s.finishGame);
  const reduced = useGame((s) => s.save?.settings.reducedMotion ?? false);
  const [phase, setPhase] = useState<'intro' | 'play' | 'over'>('intro');
  const [paused, setPaused] = useState(false);
  const [diff, setDiff] = useState(meta.difficulties?.[meta.difficulties.length > 1 ? 1 : 0]?.id ?? 'normal');
  const [hud, setHud] = useState({ score: 0, extra: '', timeLeft: undefined as number | undefined });
  const [result, setResult] = useState<{ r: GameResult; grade: number; coins: number; newBest: boolean } | null>(null);
  const game = useRef<MiniGame | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const runId = useRef('');
  const finished = useRef(false);
  const phaseRef = useRef(phase);
  const pausedRef = useRef(paused);
  phaseRef.current = phase; pausedRef.current = paused;

  const begin = useCallback(() => {
    const seed = Date.now() % 2147483647;
    game.current = makeGame(id, diff, seed, species);
    runId.current = `${id}-${seed}-${Math.floor(Math.random() * 1e9)}`;
    finished.current = false;
    setResult(null); setPaused(false); setPhase('play');
    setHud({ score: 0, extra: '', timeLeft: undefined });
    audio.sfx('start');
  }, [id, diff, species]);

  const finish = useCallback(() => {
    if (finished.current || !game.current) return;
    finished.current = true;
    const r = game.current.result();
    const { outcome } = finishGame(id, r.score, r.max, runId.current);
    setResult({ r, grade: outcome?.grade ?? 0, coins: outcome?.coins ?? 0, newBest: outcome?.newBest ?? false });
    setPhase('over');
    audio.sfx('end');
  }, [finishGame, id]);

  // loop
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    let raf = 0, last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = now - last; last = now;
      const g = game.current;
      ctx.setTransform(c.width / W, 0, 0, c.height / H, 0, 0);
      ctx.imageSmoothingEnabled = false;
      if (!g) { ctx.fillStyle = '#2a2250'; ctx.fillRect(0, 0, W, H); return; }
      if (phaseRef.current === 'play' && !pausedRef.current) { g.update(dt); if (g.isOver()) finish(); }
      g.render(ctx);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [finish]);

  // hud polling + fit
  useEffect(() => {
    const iv = window.setInterval(() => { const g = game.current; if (g && phaseRef.current === 'play') { const h = g.hud(); setHud({ score: h.score, extra: h.extra ?? '', timeLeft: h.timeLeft }); } }, 120);
    const fit = () => {
      const w = wrap.current, c = canvas.current;
      if (!w || !c) return;
      fitCanvas(c, W, H, w.clientWidth, w.clientHeight, window.devicePixelRatio || 1);
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (wrap.current) ro.observe(wrap.current);
    return () => { clearInterval(iv); ro.disconnect(); };
  }, []);

  // keyboard + auto-pause
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (e.code === 'Escape' && phaseRef.current === 'play') { setPaused((p) => !p); return; }
      if (phaseRef.current === 'play' && !pausedRef.current && !e.repeat) game.current?.key(e.code, true);
    };
    const ku = (e: KeyboardEvent) => { if (phaseRef.current === 'play') game.current?.key(e.code, false); };
    const vis = () => { if (document.hidden && phaseRef.current === 'play') setPaused(true); };
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku); document.addEventListener('visibilitychange', vis);
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); document.removeEventListener('visibilitychange', vis); };
  }, []);

  const ptr = (kind: 'down' | 'move' | 'up') => (e: React.PointerEvent) => {
    if (phaseRef.current !== 'play' || pausedRef.current || !canvas.current) return;
    if (kind === 'move' && e.buttons === 0 && e.pointerType === 'mouse' && id !== 'stars') return;
    const r = canvas.current.getBoundingClientRect();
    if (kind === 'down') canvas.current.setPointerCapture?.(e.pointerId);
    game.current?.pointer(kind, ((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H);
  };
  const pad = id === 'maze';
  void reduced;
  return (
    <div className="mg-wrap" role="dialog" aria-modal="true" aria-label={meta.name}>
      <div className="mg-bar">
        <button className="btn small icon-only" aria-label="게임 종료" onClick={() => start(null)}><Icon name="back" size="sm" /></button>
        <div className="score" aria-live="off"><span>{meta.name}</span><span>점수 {hud.score}</span>{hud.timeLeft !== undefined && <span>⏱ {hud.timeLeft}초</span>}<span style={{ fontWeight: 700 }}>{hud.extra}</span></div>
        {phase === 'play' && <button className="btn small" onClick={() => setPaused(true)}>일시정지</button>}
      </div>
      <div className="mg-canvas" ref={wrap}>
        <canvas ref={canvas} width={W * 3} height={H * 3} onPointerDown={ptr('down')} onPointerMove={ptr('move')} onPointerUp={ptr('up')} aria-label={`${meta.name} 게임 화면`} />
        {phase === 'intro' && (
          <div className="mg-overlay"><div className="mg-card">
            <h3>{meta.name}</h3>
            <div style={{ textAlign: 'left', fontWeight: 700, fontSize: 14 }}>{meta.how.map((l) => <div key={l}>• {l}</div>)}</div>
            {meta.difficulties && <div className="row" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>{meta.difficulties.map((d) => <button key={d.id} className={`btn small ${diff === d.id ? 'pink' : ''}`} aria-pressed={diff === d.id} onClick={() => setDiff(d.id)}>{d.label}</button>)}</div>}
            <button className="btn pink" onClick={begin}>시작!</button>
            <button className="btn small" onClick={() => start(null)}>돌아가기</button>
          </div></div>
        )}
        {phase === 'play' && paused && (
          <div className="mg-overlay"><div className="mg-card"><h3>일시정지</h3>
            <button className="btn mint" onClick={() => setPaused(false)}>계속하기</button>
            <button className="btn" onClick={begin}>처음부터</button>
            <button className="btn red" onClick={() => start(null)}>그만하기 (보상 없음)</button></div></div>
        )}
        {phase === 'over' && result && (
          <div className="mg-overlay"><div className="mg-card" role="status">
            <h3>결과</h3>
            <div className="grade" aria-label={`등급 ${GRADE_LABEL[result.grade]}`}>{GRADE_LABEL[result.grade]}</div>
            <div style={{ fontWeight: 900, fontSize: 22 }}>{result.r.score}점{result.newBest ? ' 🎉 최고 기록!' : ''}</div>
            {result.r.lines.map((l) => <div key={l} className="muted">{l}</div>)}
            <div className="coin-chip" style={{ alignSelf: 'center' }}><Icon name="coin" size="sm" />+{result.coins} 코인 · 친밀도 +2</div>
            <button className="btn pink" onClick={begin}>다시 하기</button>
            <button className="btn" onClick={() => start(null)}>나가기</button>
          </div></div>
        )}
      </div>
      {pad && phase === 'play' && (
        <div className="mg-pad" aria-label="방향 버튼">
          {(['up', 'left', 'down', 'right'] as const).map((d) => <button key={d} className={`btn ${d}`} aria-label={{ up: '위', down: '아래', left: '왼쪽', right: '오른쪽' }[d]} onPointerDown={(e) => { e.preventDefault(); game.current?.dir?.(d); }}>{{ up: '▲', down: '▼', left: '◀', right: '▶' }[d]}</button>)}
        </div>
      )}
    </div>
  );
}
