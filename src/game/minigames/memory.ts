import { rng, shuffle } from '../core/util';
import { img } from '../render/assets';
import { H, W, type GameResult, type HudInfo, type MiniGame } from './base';

export type MemDifficulty = 'easy' | 'normal' | 'hard';
export const MEM_LAYOUT: Record<MemDifficulty, { cols: number; rows: number }> = { easy: { cols: 3, rows: 2 }, normal: { cols: 4, rows: 3 }, hard: { cols: 4, rows: 4 } };
const FACES = [
  'pets/mongle', 'pets/toktok', 'pets/mulkong', 'food/apple', 'food/cake', 'food/starcandy', 'food/donut', 'food/fish',
];

export function memoryDeck(pairs: number, seed: number): number[] {
  const ids: number[] = [];
  for (let i = 0; i < pairs; i++) ids.push(i, i);
  return shuffle(ids, rng(seed));
}
export const memoryMax = (pairs: number): number => pairs * 60 + 60;
export function memoryScore(pairs: number, moves: number, seconds: number): number {
  return pairs * 40 + Math.max(0, pairs * 3 - moves) * 10 + Math.max(0, Math.round(60 - seconds));
}

interface Card { face: number; open: boolean; matched: boolean }
export class MemoryGame implements MiniGame {
  cards: Card[];
  cols: number; rows: number;
  moves = 0;
  time = 0;
  private first = -1;
  private lock = 0; // ms until mismatched cards flip back
  private pending: number[] = [];
  pairsFound = 0;
  pairs: number;
  private finishedScore: number | null = null;
  constructor(public difficulty: MemDifficulty, seed: number) {
    const l = MEM_LAYOUT[difficulty];
    this.cols = l.cols; this.rows = l.rows; this.pairs = (l.cols * l.rows) / 2;
    this.cards = memoryDeck(this.pairs, seed).map((face) => ({ face, open: false, matched: false }));
  }
  private cell() { return Math.min(Math.floor((W - 16) / this.cols), Math.floor((H - 16) / this.rows), 40); }
  private origin() { const c = this.cell(); return { x: Math.floor((W - c * this.cols) / 2), y: Math.floor((H - c * this.rows) / 2) }; }
  flip(i: number): boolean {
    if (this.isOver() || this.lock > 0) return false;
    const c = this.cards[i];
    if (!c || c.open || c.matched) return false;
    c.open = true;
    if (this.first < 0) { this.first = i; return true; }
    this.moves++;
    const a = this.cards[this.first];
    if (a.face === c.face) { a.matched = c.matched = true; this.pairsFound++; this.first = -1; if (this.pairsFound === this.pairs) this.finishedScore = memoryScore(this.pairs, this.moves, this.time); }
    else { this.pending = [this.first, i]; this.lock = 700; this.first = -1; }
    return true;
  }
  update(dtMs: number): void {
    if (this.isOver()) return;
    this.time += dtMs / 1000;
    if (this.lock > 0) { this.lock -= dtMs; if (this.lock <= 0) { for (const i of this.pending) this.cards[i].open = false; this.pending = []; this.lock = 0; } }
  }
  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#b8e8d1'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#a8dcc4'; for (let y = 0; y < H; y += 16) for (let x = (y / 16) % 2 ? 0 : 8; x < W; x += 16) ctx.fillRect(x, y, 8, 8);
    const c = this.cell(), o = this.origin();
    this.cards.forEach((card, i) => {
      const x = o.x + (i % this.cols) * c, y = o.y + Math.floor(i / this.cols) * c;
      const inner = c - 4;
      ctx.fillStyle = '#4a3548'; ctx.fillRect(x + 1, y + 1, inner + 2, inner + 2);
      if (card.open || card.matched) {
        ctx.fillStyle = card.matched ? '#fff6c0' : '#ffffff'; ctx.fillRect(x + 2, y + 2, inner, inner);
        const im = img(`assets/${FACES[card.face]}.png`);
        if (im) {
          const isPet = FACES[card.face].startsWith('pets/');
          const sw = isPet ? 32 : im.width, sh = isPet ? 32 : im.height;
          ctx.drawImage(im, 0, 0, sw, sh, x + 2 + Math.floor((inner - Math.min(inner, sw)) / 2), y + 2 + Math.floor((inner - Math.min(inner, sh)) / 2), Math.min(inner, sw), Math.min(inner, sh));
        }
      } else {
        ctx.fillStyle = '#8a78d0'; ctx.fillRect(x + 2, y + 2, inner, inner);
        ctx.fillStyle = '#a898e0'; ctx.fillRect(x + 4, y + 4, inner - 4, inner - 4);
        ctx.fillStyle = '#ffe27a'; ctx.fillRect(x + c / 2 - 2, y + c / 2 - 3, 4, 4);
      }
    });
  }
  pointer(kind: 'down' | 'move' | 'up', px: number, py: number): void {
    if (kind !== 'down') return;
    const c = this.cell(), o = this.origin();
    const cx = Math.floor((px - o.x) / c), cy = Math.floor((py - o.y) / c);
    if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) return;
    this.flip(cy * this.cols + cx);
  }
  private cursor = 0;
  key(code: string, down: boolean): void {
    if (!down) return;
    if (code === 'ArrowRight') this.cursor = (this.cursor + 1) % this.cards.length;
    if (code === 'ArrowLeft') this.cursor = (this.cursor + this.cards.length - 1) % this.cards.length;
    if (code === 'ArrowDown') this.cursor = (this.cursor + this.cols) % this.cards.length;
    if (code === 'ArrowUp') this.cursor = (this.cursor + this.cards.length - this.cols) % this.cards.length;
    if (code === 'Space' || code === 'Enter') this.flip(this.cursor);
  }
  hud(): HudInfo { return { score: this.pairsFound * 40, extra: `이동 ${this.moves}회 · ${Math.floor(this.time)}초 · 짝 ${this.pairsFound}/${this.pairs}` }; }
  isOver(): boolean { return this.finishedScore !== null; }
  result(): GameResult { const s = this.finishedScore ?? 0; return { score: s, max: memoryMax(this.pairs), lines: [`이동 ${this.moves}회 (최소 ${this.pairs}회)`, `걸린 시간 ${Math.round(this.time)}초`] }; }
}
