import { H, W, type GameResult, type HudInfo, type MiniGame } from './base';
import { rng } from '../core/util';

export type Judge = 'PERFECT' | 'GREAT' | 'GOOD' | 'MISS';
export const WINDOWS = { perfect: 45, great: 90, good: 140 };
export const LEAD_MS = 1500;
export const LANES = 3;

export function judge(deltaMs: number): Judge {
  const d = Math.abs(deltaMs);
  return d <= WINDOWS.perfect ? 'PERFECT' : d <= WINDOWS.great ? 'GREAT' : d <= WINDOWS.good ? 'GOOD' : 'MISS';
}
export const POINTS: Record<Judge, number> = { PERFECT: 100, GREAT: 70, GOOD: 40, MISS: 0 };
export const comboBonus = (combo: number): number => Math.min(20, combo * 2);

/** Deterministic chart: 120 BPM, eighth-note grid, 3 lanes. Returns note times in ms from chart start. */
export function buildChart(seed: number, bpm = 120, beats = 40): { t: number; lane: number }[] {
  const r = rng(seed);
  const eighth = 60000 / bpm / 2;
  const notes: { t: number; lane: number }[] = [];
  let lane = 1;
  for (let i = 4; i < beats * 2; i++) {
    const strong = i % 2 === 0;
    if (strong || r() < 0.28) {
      if (r() < 0.7) lane = Math.floor(r() * LANES); else lane = (lane + 1) % LANES;
      notes.push({ t: Math.round(i * eighth), lane });
    }
  }
  return notes;
}
export const chartMax = (n: number): number => { let s = 0; for (let i = 1; i <= n; i++) s += POINTS.PERFECT + comboBonus(i); return s; };

interface Note { t: number; lane: number; state: 'pending' | 'hit' | 'miss' }
const LINE_Y = 128;

export class RhythmGame implements MiniGame {
  notes: Note[];
  clock = -LEAD_MS; // ms; notes play at t >= 0
  score = 0;
  combo = 0;
  maxCombo = 0;
  counts: Record<Judge, number> = { PERFECT: 0, GREAT: 0, GOOD: 0, MISS: 0 };
  lastJudge: { j: Judge; t: number; lane: number } | null = null;
  private flash = [0, 0, 0];
  private end: number;
  constructor(seed: number, private onJudge?: (j: Judge) => void) {
    this.notes = buildChart(seed).map((n) => ({ ...n, state: 'pending' as const }));
    this.end = (this.notes[this.notes.length - 1]?.t ?? 0) + 1500;
  }
  /** `at` lets the host pass the input timestamp so frame drops do not skew judgement. */
  press(lane: number, at: number = this.clock): void {
    if (this.isOver()) return;
    this.flash[lane] = 120;
    let best: Note | null = null;
    for (const n of this.notes) {
      if (n.state !== 'pending' || n.lane !== lane) continue;
      if (Math.abs(n.t - at) <= WINDOWS.good && (!best || Math.abs(n.t - at) < Math.abs(best.t - at))) best = n;
    }
    if (!best) return;
    const j = judge(best.t - at);
    best.state = 'hit';
    this.apply(j, lane);
  }
  private apply(j: Judge, lane: number): void {
    this.counts[j]++;
    if (j === 'MISS') this.combo = 0;
    else { this.combo++; this.maxCombo = Math.max(this.maxCombo, this.combo); this.score += POINTS[j] + comboBonus(this.combo); }
    this.lastJudge = { j, t: 0, lane };
    this.onJudge?.(j);
  }
  update(dtMs: number): void {
    if (this.isOver()) return;
    this.clock += Math.min(dtMs, 100);
    for (const n of this.notes) {
      if (n.state === 'pending' && this.clock - n.t > WINDOWS.good) { n.state = 'miss'; this.apply('MISS', n.lane); }
    }
    for (let i = 0; i < 3; i++) this.flash[i] = Math.max(0, this.flash[i] - dtMs);
    if (this.lastJudge) this.lastJudge.t += dtMs;
  }
  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#241c46'; ctx.fillRect(0, 0, W, H);
    const laneW = 48, x0 = (W - laneW * LANES) / 2;
    for (let i = 0; i < LANES; i++) {
      ctx.fillStyle = i % 2 ? '#2f2560' : '#352a6c'; ctx.fillRect(x0 + i * laneW, 0, laneW, H);
      ctx.fillStyle = '#4a3c8a'; ctx.fillRect(x0 + i * laneW, 0, 1, H);
      if (this.flash[i] > 0) { ctx.fillStyle = 'rgba(255,224,122,0.35)'; ctx.fillRect(x0 + i * laneW, LINE_Y - 20, laneW, 28); }
    }
    ctx.fillStyle = '#4a3c8a'; ctx.fillRect(x0 + LANES * laneW - 1, 0, 1, H);
    ctx.fillStyle = '#ffe27a'; ctx.fillRect(x0, LINE_Y, laneW * LANES, 2);
    const keys = ['A', 'S', 'D'];
    ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
    for (let i = 0; i < LANES; i++) { ctx.fillStyle = '#ffffff'; ctx.fillText(keys[i], x0 + i * laneW + laneW / 2, LINE_Y + 16); }
    for (const n of this.notes) {
      if (n.state !== 'pending') continue;
      const y = LINE_Y - ((n.t - this.clock) / LEAD_MS) * (LINE_Y + 8);
      if (y < -10 || y > H) continue;
      const colors = ['#ff9db8', '#9fe3c4', '#9fd0ff'];
      ctx.fillStyle = '#4a3548'; ctx.fillRect(x0 + n.lane * laneW + 5, y - 6, laneW - 10, 12);
      ctx.fillStyle = colors[n.lane]; ctx.fillRect(x0 + n.lane * laneW + 7, y - 4, laneW - 14, 8);
    }
    if (this.lastJudge && this.lastJudge.t < 500) {
      const colors: Record<Judge, string> = { PERFECT: '#ffe27a', GREAT: '#9fe3c4', GOOD: '#9fd0ff', MISS: '#ff8a8a' };
      ctx.fillStyle = colors[this.lastJudge.j]; ctx.font = 'bold 14px sans-serif'; ctx.fillText(this.lastJudge.j, W / 2, 80 - this.lastJudge.t / 30);
    }
    if (this.combo >= 2) { ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.fillText(`${this.combo} COMBO`, W / 2, 30); }
    if (this.clock < 0) { ctx.fillStyle = '#fff'; ctx.font = 'bold 16px sans-serif'; ctx.fillText(String(Math.ceil(-this.clock / 500)), W / 2, 70); }
  }
  pointer(kind: 'down' | 'move' | 'up', x: number): void {
    if (kind !== 'down') return;
    const laneW = 48, x0 = (W - laneW * LANES) / 2;
    const lane = Math.floor((x - x0) / laneW);
    if (lane >= 0 && lane < LANES) this.press(lane);
    else this.press(x < W / 2 ? 0 : 2);
  }
  key(code: string, down: boolean): void {
    if (!down) return;
    const m: Record<string, number> = { KeyA: 0, ArrowLeft: 0, KeyS: 1, ArrowDown: 1, ArrowUp: 1, KeyD: 2, ArrowRight: 2 };
    if (code in m) this.press(m[code]);
  }
  dir(d: 'up' | 'down' | 'left' | 'right'): void { this.press(d === 'left' ? 0 : d === 'right' ? 2 : 1); }
  hud(): HudInfo { return { score: this.score, extra: `콤보 ${this.combo} (최고 ${this.maxCombo})` }; }
  isOver(): boolean { return this.clock >= this.end; }
  result(): GameResult {
    return { score: this.score, max: chartMax(this.notes.length), lines: [`PERFECT ${this.counts.PERFECT} · GREAT ${this.counts.GREAT} · GOOD ${this.counts.GOOD} · MISS ${this.counts.MISS}`, `최고 콤보 ${this.maxCombo}`] };
  }
}
