import { rng } from '../core/util';
import { H, W, rectsOverlap, skyBackdrop, sprite, type GameResult, type HudInfo, type MiniGame } from './base';

interface Drop { x: number; y: number; kind: 'star' | 'gold' | 'rock'; v: number; caught: boolean }
export const STARS_MAX = 480;
export const STARS_DURATION = 45;

/** Catch the falling stars. Pure logic is driven by update(dt); rendering is separate. */
export class StarCatcher implements MiniGame {
  basketX = W / 2;
  score = 0;
  time = STARS_DURATION;
  drops: Drop[] = [];
  private spawnT = 0.4;
  private r: () => number;
  private target: number | null = null;
  private keys = { left: false, right: false };
  caught = 0;
  popups: { x: number; y: number; t: number; text: string }[] = [];
  constructor(seed: number) { this.r = rng(seed); }

  elapsed(): number { return STARS_DURATION - this.time; }
  update(dtMs: number): void {
    if (this.isOver()) return;
    const dt = Math.min(dtMs, 50) / 1000;
    this.time = Math.max(0, this.time - dt);
    const el = this.elapsed();
    const dir = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0);
    if (dir !== 0) { this.basketX += dir * 130 * dt; this.target = null; }
    else if (this.target !== null) this.basketX += Math.max(-220 * dt, Math.min(220 * dt, this.target - this.basketX));
    this.basketX = Math.max(14, Math.min(W - 14, this.basketX));
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnT = Math.max(0.32, 0.9 - el * 0.013) * (0.8 + this.r() * 0.4);
      const roll = this.r();
      const kind: Drop['kind'] = roll < 0.16 ? 'gold' : roll < 0.38 ? 'rock' : 'star';
      this.drops.push({ x: 10 + this.r() * (W - 20), y: -12, kind, v: 38 + el * 1.6 + this.r() * 22, caught: false });
    }
    const basket = { x: this.basketX - 13, y: 134, w: 26, h: 8 };
    for (const d of this.drops) {
      d.y += d.v * dt;
      if (!d.caught && rectsOverlap({ x: d.x - 6, y: d.y - 6, w: 12, h: 12 }, basket)) {
        d.caught = true;
        const pts = d.kind === 'star' ? 10 : d.kind === 'gold' ? 30 : -15;
        this.score = Math.max(0, this.score + pts);
        if (pts > 0) this.caught++;
        this.popups.push({ x: d.x, y: 128, t: 0, text: pts > 0 ? `+${pts}` : `${pts}` });
      }
    }
    this.drops = this.drops.filter((d) => !d.caught && d.y < H + 14);
    for (const p of this.popups) { p.t += dt; p.y -= 24 * dt; }
    this.popups = this.popups.filter((p) => p.t < 0.7);
  }
  render(ctx: CanvasRenderingContext2D): void {
    skyBackdrop(ctx, '#2a2a6a', '#8fa8e8');
    ctx.fillStyle = '#fff6c0';
    for (let i = 0; i < 20; i++) ctx.fillRect((i * 47) % W, (i * 31) % 110, 1, 1);
    ctx.fillStyle = '#6bbd55'; ctx.fillRect(0, 146, W, 14); ctx.fillStyle = '#4f9a45'; ctx.fillRect(0, 146, W, 2);
    for (const d of this.drops) sprite(ctx, d.kind === 'star' ? 'star' : d.kind === 'gold' ? 'star_gold' : 'rock', d.x - 8, d.y - 8);
    sprite(ctx, 'basket', this.basketX - 14, 128);
    ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
    for (const p of this.popups) { ctx.fillStyle = p.text.startsWith('+') ? '#fff6a8' : '#ff9d9d'; ctx.fillText(p.text, p.x, p.y); }
  }
  pointer(kind: 'down' | 'move' | 'up', x: number): void { if (kind !== 'up') this.target = x; }
  key(code: string, down: boolean): void {
    if (code === 'ArrowLeft' || code === 'KeyA') this.keys.left = down;
    if (code === 'ArrowRight' || code === 'KeyD') this.keys.right = down;
  }
  dir(d: 'up' | 'down' | 'left' | 'right'): void { if (d === 'left') this.basketX -= 12; if (d === 'right') this.basketX += 12; }
  hud(): HudInfo { return { score: this.score, timeLeft: Math.ceil(this.time), extra: `받은 별 ${this.caught}` }; }
  isOver(): boolean { return this.time <= 0; }
  result(): GameResult { return { score: this.score, max: STARS_MAX, lines: [`받은 별 ${this.caught}개`] }; }
}
