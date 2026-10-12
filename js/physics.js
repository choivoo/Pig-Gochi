// 순수 2D 물리 (DOM 무관, 결정론적). 지우개는 원으로 충돌 처리한다.
export const DT = 1 / 60;
export const W = 800, H = 450;
const BASE_DECEL = 860; // px/s^2
const DRAG = 0.5;

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function makeBody(o) {
  return Object.assign({
    id: 0, team: 0, x: 0, y: 0, vx: 0, vy: 0, r: 22, m: 1, angle: 0, curve: 0, fmul: 1, e: 0.62,
    alive: true, fallen: false, fallT: 0, noClip: false,
  }, o);
}

export function makeWorld(opts = {}) {
  return {
    table: opts.table || { x: 30, y: 30, w: 740, h: 390 },
    obstacles: opts.obstacles || [], // {x,y,w,h,kind,e}
    zones: opts.zones || [],         // {x,y,w,h,type,mu}
    baseMu: opts.baseMu ?? 1,
    bodies: [], events: [], t: 0,
  };
}

export function cloneWorld(w) {
  return {
    table: w.table, obstacles: w.obstacles, zones: w.zones, baseMu: w.baseMu,
    bodies: w.bodies.map((b) => ({ ...b })), events: [], t: w.t,
  };
}

export function surfaceMu(world, x, y) {
  for (const z of world.zones) {
    if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) return z.mu;
  }
  return world.baseMu;
}
export function inTable(world, b) {
  const t = world.table;
  return b.x > t.x && b.x < t.x + t.w && b.y > t.y && b.y < t.y + t.h;
}
export function edgeDistance(world, b) {
  const t = world.table;
  return Math.min(b.x - t.x, t.x + t.w - b.x, b.y - t.y, t.y + t.h - b.y);
}

export function launch(b, dirx, diry, speed, curve = 0, fmul = 1) {
  const l = Math.hypot(dirx, diry) || 1;
  b.vx = (dirx / l) * speed; b.vy = (diry / l) * speed;
  b.curve = curve; b.fmul = fmul;
}

function collideObstacle(b, o, ev, world) {
  const cx = clamp(b.x, o.x, o.x + o.w), cy = clamp(b.y, o.y, o.y + o.h);
  let dx = b.x - cx, dy = b.y - cy;
  let d = Math.hypot(dx, dy);
  if (d >= b.r) return;
  let nx, ny;
  if (d < 1e-6) { // 중심이 내부
    const l = b.x - o.x, rr = o.x + o.w - b.x, t = b.y - o.y, bt = o.y + o.h - b.y;
    const m = Math.min(l, rr, t, bt);
    if (m === l) { nx = -1; ny = 0; } else if (m === rr) { nx = 1; ny = 0; } else if (m === t) { nx = 0; ny = -1; } else { nx = 0; ny = 1; }
    d = -m;
  } else { nx = dx / d; ny = dy / d; }
  b.x += nx * (b.r - d); b.y += ny * (b.r - d);
  const vn = b.vx * nx + b.vy * ny;
  if (vn < 0) {
    const e = o.e ?? 0.7;
    b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny;
    b.curve = 0;
    if (-vn > 40) ev.push({ type: 'wall', b, impact: -vn, x: b.x - nx * b.r, y: b.y - ny * b.r, kind: o.kind });
  }
}

export function step(world, dt = DT) {
  const ev = world.events;
  const bs = world.bodies;
  for (const b of bs) {
    if (!b.alive) continue;
    if (b.fallen) { b.fallT += dt; b.x += b.vx * dt * 0.6; b.y += b.vy * dt * 0.6; continue; }
    let sp = Math.hypot(b.vx, b.vy);
    if (sp > 0) {
      if (b.curve) { // 회전: 속도 방향을 천천히 돌린다
        const ang = b.curve * (sp / 700) * dt * 4.2;
        const c = Math.cos(ang), s = Math.sin(ang);
        const nvx = b.vx * c - b.vy * s, nvy = b.vx * s + b.vy * c;
        b.vx = nvx; b.vy = nvy;
      }
      const mu = surfaceMu(world, b.x, b.y) * b.fmul;
      const ns = Math.max(0, sp - (BASE_DECEL * mu + sp * DRAG) * dt);
      const k = ns / sp; b.vx *= k; b.vy *= k; sp = ns;
      if (sp < 7) { b.vx = 0; b.vy = 0; b.curve = 0; sp = 0; }
    }
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (sp > 25) b.angle += (Math.atan2(b.vy, b.vx) - b.angle) * 0.12;
    for (const o of world.obstacles) collideObstacle(b, o, ev, world);
  }
  // 지우개끼리 충돌
  for (let i = 0; i < bs.length; i++) {
    const a = bs[i];
    if (!a.alive || a.fallen) continue;
    for (let j = i + 1; j < bs.length; j++) {
      const c = bs[j];
      if (!c.alive || c.fallen) continue;
      const dx = c.x - a.x, dy = c.y - a.y, rs = a.r + c.r;
      const d2 = dx * dx + dy * dy;
      if (d2 >= rs * rs) continue;
      const d = Math.sqrt(d2) || 0.001;
      const nx = dx / d, ny = dy / d;
      const spA = Math.hypot(a.vx, a.vy), spC = Math.hypot(c.vx, c.vy);
      const overlap = rs - d;
      const ia = 1 / a.m, ic = 1 / c.m;
      a.x -= nx * overlap * (ia / (ia + ic)); a.y -= ny * overlap * (ia / (ia + ic));
      c.x += nx * overlap * (ic / (ia + ic)); c.y += ny * overlap * (ic / (ia + ic));
      const rv = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny;
      if (rv < 0) {
        const e = Math.min(a.e, c.e);
        const j2 = (-(1 + e) * rv) / (ia + ic);
        a.vx -= j2 * ia * nx; a.vy -= j2 * ia * ny;
        c.vx += j2 * ic * nx; c.vy += j2 * ic * ny;
        a.curve = 0; c.curve = 0;
        if (-rv > 18) ev.push({ type: 'hit', a, b: c, impact: -rv, spA, spB: spC, nx, ny, x: a.x + nx * a.r, y: a.y + ny * a.r });
      }
    }
  }
  // 낙사 판정
  for (const b of bs) {
    if (b.alive && !b.fallen && !b.noClip && !inTable(world, b)) {
      b.fallen = true; b.fallT = 0;
      ev.push({ type: 'fall', b });
    }
  }
  world.t += dt;
}

export function isSettled(world) {
  for (const b of world.bodies) {
    if (b.alive && !b.fallen && (b.vx !== 0 || b.vy !== 0)) return false;
    if (b.alive && b.fallen && b.fallT < 0.7) return false;
  }
  return true;
}
