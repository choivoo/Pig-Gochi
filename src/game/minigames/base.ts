import { img } from '../render/assets';

export const W = 192;
export const H = 160;

export interface HudInfo { score: number; extra?: string; timeLeft?: number }
export interface GameResult { score: number; max: number; lines: string[] }
export interface MiniGame {
  update(dtMs: number): void;
  render(ctx: CanvasRenderingContext2D): void;
  pointer(kind: 'down' | 'move' | 'up', x: number, y: number): void;
  key(code: string, down: boolean): void;
  dir?(d: 'up' | 'down' | 'left' | 'right'): void;
  hud(): HudInfo;
  isOver(): boolean;
  result(): GameResult;
}

export function sprite(ctx: CanvasRenderingContext2D, name: string, x: number, y: number, w?: number, h?: number): void {
  const im = img(`assets/minigames/${name}.png`);
  if (im) ctx.drawImage(im, Math.round(x), Math.round(y), w ?? im.width, h ?? im.height);
}
export function effect(ctx: CanvasRenderingContext2D, name: string, x: number, y: number): void {
  const im = img(`assets/effects/${name}.png`);
  if (im) ctx.drawImage(im, Math.round(x), Math.round(y));
}
export function skyBackdrop(ctx: CanvasRenderingContext2D, top = '#9fd8ff', bottom = '#e6f6ff'): void {
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = mix(top, bottom, i / 7);
    ctx.fillRect(0, (H * i) / 8, W, H / 8 + 1);
  }
}
function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`;
}
export const rectsOverlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): boolean =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
