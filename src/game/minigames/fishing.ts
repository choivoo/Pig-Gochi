import { rng } from '../core/util';
import { H, W, skyBackdrop, sprite, type GameResult, type HudInfo, type MiniGame } from './base';

export type FishKind = 'small' | 'mid' | 'gold';
export const FISH: Record<FishKind, { points: number; zone: number; speed: number; sprite: string }> = {
  small: { points: 10, zone: 0.34, speed: 0.9, sprite: 'fish_small' },
  mid: { points: 25, zone: 0.24, speed: 1.35, sprite: 'fish_mid' },
  gold: { points: 60, zone: 0.14, speed: 1.9, sprite: 'fish_gold' },
};
export const FISHING_ROUNDS = 8;
export const FISHING_MAX = 160;
type Phase = 'wait' | 'bite' | 'result' | 'done';

/** Pure timing logic: `inZone` is the single source of truth for a successful catch. */
export function inZone(marker: number, zoneStart: number, zoneSize: number): boolean {
  return marker >= zoneStart && marker <= zoneStart + zoneSize;
}

export class Fishing implements MiniGame {
  score = 0;
  round = 0;
  phase: Phase = 'wait';
  private t = 0;
  private waitFor = 1.6;
  fish: FishKind = 'small';
  marker = 0;
  private dirn = 1;
  zoneStart = 0.3;
  last = '';
  caught: Record<FishKind, number> = { small: 0, mid: 0, gold: 0 };
  biteTime = 0;
  private r: () => number;
  constructor(seed: number) { this.r = rng(seed); this.startRound(); }

  private startRound(): void {
    this.phase = 'wait'; this.t = 0; this.waitFor = 1.2 + this.r() * 1.8; this.marker = 0; this.dirn = 1;
    const roll = this.r();
    this.fish = roll < 0.5 ? 'small' : roll < 0.85 ? 'mid' : 'gold';
    this.zoneStart = 0.12 + this.r() * (0.76 - FISH[this.fish].zone);
  }
  /** Player action: tap / space */
  tap(): void {
    if (this.phase === 'wait') { this.last = '너무 일러요! 물고기가 도망갔어요.'; this.finishRound(false); return; }
    if (this.phase === 'bite') {
      const ok = inZone(this.marker, this.zoneStart, FISH[this.fish].zone);
      if (ok) { this.score += FISH[this.fish].points; this.caught[this.fish]++; this.last = `${this.fish === 'gold' ? '황금 ' : this.fish === 'mid' ? '' : '작은 '}물고기를 낚았어요! +${FISH[this.fish].points}`; }
      else this.last = '아쉬워요! 놓쳤어요.';
      this.finishRound(ok);
    }
  }
  private finishRound(_ok: boolean): void { this.phase = 'result'; this.t = 0; }
  update(dtMs: number): void {
    if (this.phase === 'done') return;
    const dt = Math.min(dtMs, 50) / 1000;
    this.t += dt;
    if (this.phase === 'wait' && this.t >= this.waitFor) { this.phase = 'bite'; this.t = 0; this.biteTime = 0; }
    else if (this.phase === 'bite') {
      this.biteTime += dt;
      this.marker += this.dirn * FISH[this.fish].speed * dt;
      if (this.marker >= 1) { this.marker = 1; this.dirn = -1; } else if (this.marker <= 0) { this.marker = 0; this.dirn = 1; }
      if (this.biteTime > 4.5) { this.last = '물고기가 도망갔어요.'; this.finishRound(false); }
    } else if (this.phase === 'result' && this.t > 1.1) {
      this.round++;
      if (this.round >= FISHING_ROUNDS) this.phase = 'done'; else this.startRound();
    }
  }
  render(ctx: CanvasRenderingContext2D): void {
    skyBackdrop(ctx, '#bfe8ff', '#fff3da');
    ctx.fillStyle = '#6bbd55'; ctx.fillRect(0, 0, W, 0);
    ctx.fillStyle = '#8fd96b'; ctx.fillRect(0, 96, W, 64);
    sprite(ctx, 'pond', 48, 70);
    // rod + pet silhouette (a simple sitting buddy)
    ctx.fillStyle = '#8a5a3c'; ctx.fillRect(34, 58, 2, 40); ctx.fillRect(34, 58, 58, 1);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(92, 58, 1, 14 + (this.phase === 'bite' ? Math.round(Math.sin(this.biteTime * 20)) : 0));
    sprite(ctx, 'bobber', 89, 70 + (this.phase === 'bite' ? 2 : 0));
    ctx.fillStyle = '#ffd8a8'; ctx.beginPath(); ctx.arc(26, 96, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a3548'; ctx.fillRect(22, 94, 2, 3); ctx.fillRect(29, 94, 2, 3); ctx.fillRect(25, 100, 3, 1);
    if (this.phase === 'bite') {
      ctx.fillStyle = '#ffd84d'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('!', 92, 50);
      // gauge
      const gx = 36, gy = 130, gw = 120, gh = 12;
      ctx.fillStyle = '#4a3548'; ctx.fillRect(gx - 2, gy - 2, gw + 4, gh + 4);
      ctx.fillStyle = '#fff3da'; ctx.fillRect(gx, gy, gw, gh);
      ctx.fillStyle = '#6bd98a'; ctx.fillRect(gx + gw * this.zoneStart, gy, gw * FISH[this.fish].zone, gh);
      ctx.fillStyle = '#ff4a6a'; ctx.fillRect(gx + gw * this.marker - 1, gy - 4, 3, gh + 8);
    }
    if (this.phase === 'wait') { ctx.fillStyle = '#4a3548'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('찌를 지켜보세요…', 96, 138); }
    if (this.phase === 'result') {
      sprite(ctx, FISH[this.fish].sprite, 88, 56 - Math.min(14, this.t * 30));
      ctx.fillStyle = '#4a3548'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(this.last, 96, 140);
    }
  }
  pointer(kind: 'down' | 'move' | 'up'): void { if (kind === 'down') this.tap(); }
  key(code: string, down: boolean): void { if (down && (code === 'Space' || code === 'Enter')) this.tap(); }
  dir(): void { this.tap(); }
  hud(): HudInfo { return { score: this.score, extra: `${Math.min(this.round + 1, FISHING_ROUNDS)}/${FISHING_ROUNDS}번째` }; }
  isOver(): boolean { return this.phase === 'done'; }
  result(): GameResult { return { score: this.score, max: FISHING_MAX, lines: [`작은 ${this.caught.small} · 중간 ${this.caught.mid} · 황금 ${this.caught.gold}마리`] }; }
}
void H;
