import { rng } from '../core/util';
import { drawPet } from '../render/assets';
import { H, W, rectsOverlap, skyBackdrop, sprite, type GameResult, type HudInfo, type MiniGame } from './base';

export const RUNNER_MAX = 300;
const GROUND = 132;
const GRAVITY = 760;
const JUMP_V = 270;
interface Obs { x: number; kind: 'rock' | 'bush'; w: number; h: number; passed: boolean }

export class Runner implements MiniGame {
  y = 0; // height above ground
  vy = 0;
  grounded = true;
  speed = 78;
  dist = 0;
  passed = 0;
  over = false;
  obstacles: Obs[] = [];
  private nextGap = 140;
  private r: () => number;
  private t = 0;
  constructor(seed: number, private speciesId: string) { this.r = rng(seed); }

  jump(): void { if (this.grounded && !this.over) { this.vy = JUMP_V; this.grounded = false; } }
  score(): number { return Math.floor(this.dist / 7) + this.passed * 5; }
  /** Hitbox is slightly smaller than the sprite so near misses feel fair. */
  petBox() { return { x: 28 + 6, y: GROUND - this.y - 22, w: 16, h: 20 }; }
  update(dtMs: number): void {
    if (this.over) return;
    const dt = Math.min(dtMs, 40) / 1000;
    this.t += dt;
    this.speed = Math.min(200, 78 + this.t * 3.2);
    this.dist += this.speed * dt;
    if (!this.grounded) {
      this.y += this.vy * dt; this.vy -= GRAVITY * dt;
      if (this.y <= 0) { this.y = 0; this.vy = 0; this.grounded = true; }
    }
    this.nextGap -= this.speed * dt;
    if (this.nextGap <= 0) {
      const kind = this.r() < 0.55 ? 'rock' : 'bush';
      this.obstacles.push({ x: W + 12, kind, w: 16, h: kind === 'rock' ? 14 : 22, passed: false });
      // gap always leaves enough room for one full jump
      this.nextGap = this.speed * (0.95 + this.r() * 0.9) + 20;
    }
    for (const o of this.obstacles) {
      o.x -= this.speed * dt;
      const box = { x: o.x + 2, y: GROUND - o.h + 2, w: o.w - 4, h: o.h - 3 };
      if (rectsOverlap(this.petBox(), box)) this.over = true;
      if (!o.passed && o.x + o.w < 28) { o.passed = true; this.passed++; }
    }
    this.obstacles = this.obstacles.filter((o) => o.x > -24);
  }
  render(ctx: CanvasRenderingContext2D): void {
    skyBackdrop(ctx, '#9fd8ff', '#fff3da');
    const off = Math.floor(this.dist) % 32;
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 4; i++) { const cx = ((i * 70 - this.dist * 0.2) % (W + 60) + W + 60) % (W + 60) - 30; ctx.fillRect(cx, 24 + i * 12, 26, 5); ctx.fillRect(cx + 5, 20 + i * 12, 16, 5); }
    ctx.fillStyle = '#8fd96b'; ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = '#6bbd55'; ctx.fillRect(0, GROUND, W, 3);
    ctx.fillStyle = '#5fa84a'; for (let x = -off; x < W; x += 32) ctx.fillRect(x, GROUND + 12, 10, 2);
    for (const o of this.obstacles) sprite(ctx, o.kind === 'rock' ? 'obstacle_rock' : 'obstacle_bush', o.x, GROUND - (o.kind === 'rock' ? 16 : 24) + 2);
    const frame = this.over ? 'sad' : !this.grounded ? 'happy' : Math.floor(this.t * 9) % 2 ? 'idle0' : 'idle1';
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    drawPet(ctx, this.speciesId.startsWith('egg') ? 'mongle' : this.speciesId, { x: 42, y: GROUND + 4 - this.y, frame, scale: 0.5 });
    ctx.restore();
  }
  pointer(kind: 'down' | 'move' | 'up'): void { if (kind === 'down') this.jump(); }
  key(code: string, down: boolean): void { if (down && (code === 'Space' || code === 'ArrowUp' || code === 'KeyW')) this.jump(); }
  dir(d: 'up' | 'down' | 'left' | 'right'): void { if (d === 'up') this.jump(); }
  hud(): HudInfo { return { score: this.score(), extra: `속도 ${Math.round(this.speed)}` }; }
  isOver(): boolean { return this.over; }
  result(): GameResult { return { score: this.score(), max: RUNNER_MAX, lines: [`달린 거리 ${Math.floor(this.dist / 10)}m`, `넘은 장애물 ${this.passed}개`] }; }
}
