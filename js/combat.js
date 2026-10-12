// 전투 공통 계산 (UI 무관)
import { clamp } from './physics.js';

export const VMIN = 120, VMAX = 900, MAX_PULL = 130, MIN_PULL = 14;

export function shotSpeed(b, power, mods = {}) {
  let v = VMIN + (VMAX - VMIN) * Math.pow(clamp(power, 0, 1), 0.92);
  v /= Math.pow(b.m, 0.18);
  if (b.status && b.status.sticky) v *= 0.7;
  if (mods.speedMul) v *= mods.speedMul;
  return Math.min(v, VMAX * 1.35);
}

export function atkOf(b) {
  let a = b.atk;
  if (b.status && b.status.rage) a *= 1.25;
  if (b.passive === 'growing') a *= 1 + Math.min(0.4, 0.08 * (b.growth || 0));
  return a;
}
export function defOf(b) {
  let d = b.def;
  if (b.status && b.status.rage) d *= 0.85;
  return d;
}

// att가 def에게 가하는 기대 피해 (치명타 제외)
export function hitDamage(att, def, impact, share, mult = 1) {
  const f = clamp(impact / 430, 0.25, 2.4);
  let d = atkOf(att) * f * (0.3 + 0.7 * share) * mult;
  if (def.status && def.status.shield) d *= 0.6;
  if (def.passive === 'heavy') d *= 0.9;
  d -= defOf(def) * 0.5;
  return Math.max(1, d);
}

export function difficultyAim(diff) {
  return { easy: 1.5, normal: 1.0, hard: 0.55, hell: 0.15 }[diff] ?? 1;
}
