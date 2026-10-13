import { rng } from '../core/util';
import { drawPet } from '../render/assets';
import { H, W, type GameResult, type HudInfo, type MiniGame } from './base';

export type MazeDifficulty = 'easy' | 'normal' | 'hard';
export const MAZE_SIZE: Record<MazeDifficulty, { w: number; h: number; stars: number }> = { easy: { w: 7, h: 5, stars: 2 }, normal: { w: 11, h: 8, stars: 3 }, hard: { w: 15, h: 11, stars: 4 } };

/** Tile grid of (2w+1)x(2h+1): true = wall. Recursive back-tracker => perfect maze, every cell reachable. */
export function generateMaze(w: number, h: number, seed: number): boolean[][] {
  const r = rng(seed);
  const gw = 2 * w + 1, gh = 2 * h + 1;
  const g: boolean[][] = Array.from({ length: gh }, () => Array<boolean>(gw).fill(true));
  const stack: [number, number][] = [[0, 0]];
  g[1][1] = false;
  const seen = new Set<string>(['0,0']);
  while (stack.length) {
    const [cx, cy] = stack[stack.length - 1];
    const dirs = ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const).filter(([dx, dy]) => {
      const nx = cx + dx, ny = cy + dy;
      return nx >= 0 && ny >= 0 && nx < w && ny < h && !seen.has(`${nx},${ny}`);
    });
    if (!dirs.length) { stack.pop(); continue; }
    const [dx, dy] = dirs[Math.floor(r() * dirs.length)];
    const nx = cx + dx, ny = cy + dy;
    g[2 * ny + 1][2 * nx + 1] = false;
    g[cy + ny + 1][cx + nx + 1] = false;
    seen.add(`${nx},${ny}`);
    stack.push([nx, ny]);
  }
  return g;
}
export function mazeSolvable(g: boolean[][], from: [number, number], to: [number, number]): boolean {
  const q: [number, number][] = [from];
  const seen = new Set([from.join(',')]);
  while (q.length) {
    const [x, y] = q.shift() as [number, number];
    if (x === to[0] && y === to[1]) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (g[ny]?.[nx] === false && !seen.has(`${nx},${ny}`)) { seen.add(`${nx},${ny}`); q.push([nx, ny]); }
    }
  }
  return false;
}

const T = 16;
export class MazeGame implements MiniGame {
  grid: boolean[][];
  px = 1; py = 1; // tile coords
  exit: [number, number];
  stars: Set<string>;
  starsGot = 0;
  starsTotal: number;
  time = 0;
  private moveCd = 0;
  private held: 'up' | 'down' | 'left' | 'right' | null = null;
  private swipe: { x: number; y: number } | null = null;
  done = false;
  private cam = { x: 0, y: 0 };
  constructor(public difficulty: MazeDifficulty, seed: number, private speciesId: string) {
    const s = MAZE_SIZE[difficulty];
    this.grid = generateMaze(s.w, s.h, seed);
    this.exit = [2 * s.w - 1, 2 * s.h - 1];
    this.stars = new Set();
    const r = rng(seed ^ 0x9e3779b9);
    // place stars on open cells (never on start/exit)
    const open: [number, number][] = [];
    for (let y = 1; y < this.grid.length; y += 2) for (let x = 1; x < this.grid[0].length; x += 2) if (!(x === 1 && y === 1) && !(x === this.exit[0] && y === this.exit[1])) open.push([x, y]);
    this.starsTotal = Math.min(s.stars, open.length);
    while (this.stars.size < this.starsTotal) { const [x, y] = open[Math.floor(r() * open.length)]; this.stars.add(`${x},${y}`); }
  }
  maxScore(): number { return 100 + this.starsTotal * 30 + 100; }
  score(): number { return this.done ? 100 + this.starsGot * 30 + Math.max(0, Math.round((100 - this.time) * 1)) : this.starsGot * 30; }
  step(dx: number, dy: number): boolean {
    if (this.done) return false;
    const nx = this.px + dx, ny = this.py + dy;
    if (this.grid[ny]?.[nx] !== false) return false;
    this.px = nx; this.py = ny;
    if (this.stars.delete(`${nx},${ny}`)) this.starsGot++;
    if (nx === this.exit[0] && ny === this.exit[1]) this.done = true;
    return true;
  }
  update(dtMs: number): void {
    if (this.done) return;
    this.time += dtMs / 1000;
    this.moveCd -= dtMs;
    if (this.held && this.moveCd <= 0) { const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[this.held]; this.step(d[0], d[1]); this.moveCd = 110; }
    const tx = this.px * T + T / 2 - W / 2, ty = this.py * T + T / 2 - H / 2;
    const maxX = Math.max(0, this.grid[0].length * T - W), maxY = Math.max(0, this.grid.length * T - H);
    const cx = Math.max(0, Math.min(maxX, tx)), cy = Math.max(0, Math.min(maxY, ty));
    this.cam.x += (cx - this.cam.x) * 0.25; this.cam.y += (cy - this.cam.y) * 0.25;
  }
  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#2a2250'; ctx.fillRect(0, 0, W, H);
    const gw = this.grid[0].length, gh = this.grid.length;
    const ox = gw * T < W ? Math.floor((W - gw * T) / 2) : -Math.round(this.cam.x);
    const oy = gh * T < H ? Math.floor((H - gh * T) / 2) : -Math.round(this.cam.y);
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
      const sx = ox + x * T, sy = oy + y * T;
      if (sx < -T || sy < -T || sx > W || sy > H) continue;
      if (this.grid[y][x]) { ctx.fillStyle = '#8a78d0'; ctx.fillRect(sx, sy, T, T); ctx.fillStyle = '#a898e0'; ctx.fillRect(sx, sy, T, 3); ctx.fillStyle = '#6a58b0'; ctx.fillRect(sx, sy + T - 3, T, 3); }
      else { ctx.fillStyle = '#fff3da'; ctx.fillRect(sx, sy, T, T); ctx.fillStyle = '#f2e2c0'; ctx.fillRect(sx + 7, sy + 7, 2, 2); }
    }
    ctx.fillStyle = '#ff4a6a'; ctx.fillRect(ox + this.exit[0] * T + 4, oy + this.exit[1] * T + 3, 8, 6); ctx.fillStyle = '#8a5a3c'; ctx.fillRect(ox + this.exit[0] * T + 3, oy + this.exit[1] * T + 2, 2, 12);
    for (const s of this.stars) { const [x, y] = s.split(',').map(Number); ctx.fillStyle = '#ffd84d'; ctx.fillRect(ox + x * T + 5, oy + y * T + 5, 6, 6); ctx.fillStyle = '#fff6a8'; ctx.fillRect(ox + x * T + 7, oy + y * T + 3, 2, 10); ctx.fillRect(ox + x * T + 3, oy + y * T + 7, 10, 2); }
    drawPet(ctx, this.speciesId.startsWith('egg') ? 'mongle' : this.speciesId, { x: ox + this.px * T + T / 2, y: oy + this.py * T + T - 1, frame: this.done ? 'happy' : 'idle0', scale: 0.4 });
  }
  pointer(kind: 'down' | 'move' | 'up', x: number, y: number): void {
    if (kind === 'down') this.swipe = { x, y };
    else if (kind === 'move' && this.swipe) {
      const dx = x - this.swipe.x, dy = y - this.swipe.y;
      if (Math.hypot(dx, dy) > 10) {
        if (Math.abs(dx) > Math.abs(dy)) this.step(dx > 0 ? 1 : -1, 0); else this.step(0, dy > 0 ? 1 : -1);
        this.swipe = { x, y };
      }
    } else if (kind === 'up') this.swipe = null;
  }
  key(code: string, down: boolean): void {
    const m: Record<string, 'up' | 'down' | 'left' | 'right'> = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
    const d = m[code];
    if (!d) return;
    if (down) { if (this.held !== d) { this.held = d; this.moveCd = 0; } } else if (this.held === d) this.held = null;
  }
  dir(d: 'up' | 'down' | 'left' | 'right'): void { const v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[d]; this.step(v[0], v[1]); }
  hud(): HudInfo { return { score: this.score(), extra: `별 ${this.starsGot}/${this.starsTotal} · ${Math.floor(this.time)}초` }; }
  isOver(): boolean { return this.done; }
  result(): GameResult { return { score: this.score(), max: this.maxScore(), lines: [`별 ${this.starsGot}/${this.starsTotal}개`, `걸린 시간 ${Math.round(this.time)}초`] }; }
}
