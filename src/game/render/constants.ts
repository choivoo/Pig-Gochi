export const ROOM_W = 192;
export const ROOM_H = 160;
export const FLOOR_Y = 104;
export const WINDOW = { x: 72, y: 18, w: 48, h: 40 };

/**
 * Sizes a pixel canvas: the backing store is an integer multiple of the logical size (crisp),
 * the CSS size fits the container exactly (no wasted space on phones).
 */
export function fitCanvas(c: HTMLCanvasElement, lw: number, lh: number, cssW: number, cssH: number, dpr: number): number {
  let fit = Math.min((cssW * dpr) / lw, (cssH * dpr) / lh);
  if (fit < 1) fit = Math.max(0.5, fit);
  const near = Math.round(fit);
  if (Math.abs(fit - near) / near < 0.04 && near >= 1) fit = near;
  const k = Math.max(1, Math.ceil(fit));
  if (c.width !== lw * k || c.height !== lh * k) { c.width = lw * k; c.height = lh * k; }
  c.style.width = `${(lw * fit) / dpr}px`;
  c.style.height = `${(lh * fit) / dpr}px`;
  return k;
}
