// 적 AI: 후보 샷을 헤드리스 시뮬레이션으로 평가
import { cloneWorld, step, isSettled, launch, mulberry32, edgeDistance, inTable } from './physics.js';
import { shotSpeed, hitDamage, difficultyAim } from './combat.js';

export function simulateShot(world, bodyId, dx, dy, speed, curve = 0, fmul = 1, maxSteps = 260) {
  const w = cloneWorld(world);
  const b = w.bodies.find((x) => x.id === bodyId);
  launch(b, dx, dy, speed, curve, fmul);
  const evs = [];
  for (let i = 0; i < maxSteps; i++) {
    step(w);
    if (w.events.length) { evs.push(...w.events); w.events.length = 0; }
    if (i > 30 && isSettled(w)) break;
  }
  return { w, evs, b };
}

export function scoreShot(res, team, pers) {
  let s = 0;
  const seen = new Set();
  for (const e of res.evs) {
    if (e.type === 'hit' && e.a.team !== e.b.team) {
      const tot = e.spA + e.spB + 1;
      const toB = hitDamage(e.a, e.b, e.impact, e.spA / tot);
      const toA = hitDamage(e.b, e.a, e.impact, e.spB / tot);
      const own = e.a.team === team ? [e.a, e.b, toB, toA] : [e.b, e.a, toA, toB];
      s += own[2] * (pers === 'attack' ? 1.3 : 1) - own[3] * (pers === 'coward' ? 1.5 : 0.9);
    } else if (e.type === 'fall' && !seen.has(e.b.id)) {
      seen.add(e.b.id);
      const worth = 60 + e.b.maxhp * 0.5;
      if (e.b.team === team) s -= worth * (pers === 'coward' ? 2 : 1.6);
      else s += worth * (e.b.boss ? 0.4 : pers === 'edge' ? 1.5 : 1.1);
    }
  }
  for (const b of res.w.bodies) {
    if (b.team === team && b.alive && !b.fallen && inTable(res.w, b)) {
      const d = edgeDistance(res.w, b);
      if (d < b.r * 1.0) s -= 14 * (pers === 'coward' ? 2 : 1);
    }
  }
  return s;
}

// 계획: {body, dx, dy, power}
export function planShot(world, team, opts) {
  const { aim = 0.7, diff = 'normal', rngSeed = 1, blind = 1, mods = {} } = opts;
  const rng = mulberry32(rngSeed);
  const mine = world.bodies.filter((b) => b.team === team && b.alive && !b.fallen);
  const foes = world.bodies.filter((b) => b.team !== team && b.alive && !b.fallen);
  if (!mine.length || !foes.length) return null;
  const pers = mine[0].pers || 'attack';
  const powers = diff === 'easy' ? [0.55, 0.9] : [0.45, 0.7, 1];
  const cands = [];
  for (const b of mine) {
    if (b.stunned) continue;
    const angles = [];
    for (let a = 0; a < 360; a += diff === 'easy' ? 30 : 18) angles.push((a * Math.PI) / 180);
    for (const f of foes) {
      const a0 = Math.atan2(f.y - b.y, f.x - b.x);
      angles.push(a0, a0 + 0.06, a0 - 0.06);
    }
    for (const ang of angles) {
      for (const p of powers) {
        const dx = Math.cos(ang), dy = Math.sin(ang);
        const res = simulateShot(world, b.id, dx, dy, shotSpeed(b, p, mods));
        let sc = scoreShot(res, team, pers);
        // 대각 근접 보너스 (아무 일도 없을 때 적에게 접근)
        let nearest = 1e9;
        for (const f of foes) nearest = Math.min(nearest, Math.hypot(res.b.x - f.x, res.b.y - f.y));
        sc -= nearest * 0.03;
        if (res.b.fallen) sc -= 200;
        sc += rng() * 2;
        cands.push({ body: b, ang, power: p, score: sc });
      }
    }
  }
  if (!cands.length) return null;
  cands.sort((a, c) => c.score - a.score);
  // 실수: 조준 정확도가 낮을수록 최선이 아닌 샷(상위 후보 중 하나)을 고를 확률이 높다
  const smart = Math.min(1, aim * 1.15 / Math.max(0.35, difficultyAim(diff) * 0.55 + 0.45));
  let best = cands[0];
  if (rng() > smart) best = cands[Math.floor(rng() * rng() * Math.min(10, cands.length))];
  // 오차 주입
  const sigma = (1 - aim) * 0.32 * difficultyAim(diff) * blind;
  const g = () => (rng() + rng() + rng() - 1.5) * 0.8;
  const ang = best.ang + g() * sigma;
  const power = Math.min(1, Math.max(0.2, best.power + g() * sigma * 0.5));
  return { body: best.body, dx: Math.cos(ang), dy: Math.sin(ang), power, score: best.score };
}
