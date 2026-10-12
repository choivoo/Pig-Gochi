export const clamp = (v: number, lo = 0, hi = 100): number => (v < lo ? lo : v > hi ? hi : v);

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic PRNG (mulberry32) */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(arr: T[], r: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const pad = (n: number) => String(n).padStart(2, '0');
export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
/** Weeks start on Monday (local time). */
export function weekKey(ts: number): string {
  const d = new Date(ts);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return dayKey(d.getTime());
}
export function dayDiff(a: string, b: string): number {
  const pa = a.split('-').map(Number);
  const pb = b.split('-').map(Number);
  const da = Date.UTC(pa[0], pa[1] - 1, pa[2]);
  const db = Date.UTC(pb[0], pb[1] - 1, pb[2]);
  return Math.round((db - da) / 86400000);
}
export const hourOf = (ts: number): number => new Date(ts).getHours();
export const isNightHour = (h: number): boolean => h >= 21 || h < 6;

export const systemClock = { now: () => Date.now() };
export const fixedClock = (t: number) => ({ now: () => t });

export function uid(prefix: string, now: number, n = 0): string {
  return `${prefix}_${now.toString(36)}_${n.toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}
