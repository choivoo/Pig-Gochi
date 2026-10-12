// 전투 화면: 캔버스 렌더링, 입력(드래그 발사), 이펙트
import { W, H, DT, clamp, cloneWorld, step, launch, edgeDistance } from './physics.js';
import { shotSpeed, MAX_PULL, MIN_PULL } from './combat.js';
import { sfx, vibrate } from './audio.js';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export class BattleView {
  constructor(canvas, battle, opts = {}) {
    this.cv = canvas; this.ctx = canvas.getContext('2d');
    this.b = battle; this.opts = opts;
    this.parts = []; this.floats = []; this.banners = []; this.ghosts = [];
    this.shake = 0; this.hitstop = 0; this.flash = 0;
    this.paused = false; this.drag = null; this.last = 0; this.raf = 0; this.dustT = 0;
    this.reduce = !!(battle.settings && battle.settings.reduceMotion);
    this.guideMode = (battle.settings && battle.settings.guide) || 'normal';
    this.rot = false; this.scale = 1;
    this.bg = this.makeBg();
    this.bind();
    this.resize();
    this.onResize = () => this.resize();
    window.addEventListener('resize', this.onResize);
    window.addEventListener('orientationchange', this.onResize);
    this.hook();
    this.raf = requestAnimationFrame((t) => this.loop(t));
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('orientationchange', this.onResize);
    const c = this.cv;
    c.onpointerdown = c.onpointermove = c.onpointerup = c.onpointercancel = null;
  }

  // ---------- 레이아웃 ----------
  resize() {
    const par = this.cv.parentElement;
    const cw = par.clientWidth, ch = par.clientHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.cv.width = Math.round(cw * dpr); this.cv.height = Math.round(ch * dpr);
    this.cv.style.width = cw + 'px'; this.cv.style.height = ch + 'px';
    this.dpr = dpr; this.cw = cw; this.ch = ch;
    this.rot = ch > cw * 1.05;
    this.scale = this.rot ? Math.min(cw / H, ch / W) : Math.min(cw / W, ch / H);
    this.scale *= 0.98;
  }
  toWorld(clientX, clientY) {
    const r = this.cv.getBoundingClientRect();
    let x = clientX - r.left - this.cw / 2, y = clientY - r.top - this.ch / 2;
    if (this.rot) { const t = x; x = y; y = -t; }
    return { x: x / this.scale + W / 2, y: y / this.scale + H / 2 };
  }

  toClient(wx, wy) {
    let x = (wx - W / 2) * this.scale, y = (wy - H / 2) * this.scale;
    if (this.rot) { const t = y; y = x; x = -t; }
    const r = this.cv.getBoundingClientRect();
    return { x: x + this.cw / 2 + r.left, y: y + this.ch / 2 + r.top };
  }

  // ---------- 입력 ----------
  bind() {
    const c = this.cv;
    c.style.touchAction = 'none';
    c.onpointerdown = (e) => {
      const b = this.b;
      if (this.paused || b.phase !== 'aim' || !b.isHuman(b.turnTeam) || this.drag) return;
      const p = this.toWorld(e.clientX, e.clientY);
      let best = null, bd = 1e9;
      for (const o of b.bodiesOf(b.turnTeam)) {
        const d = Math.hypot(o.x - p.x, o.y - p.y);
        if (d < o.r * 1.9 && d < bd) { bd = d; best = o; }
      }
      if (!best) return;
      c.setPointerCapture(e.pointerId);
      b.selId = best.id; b.dragging = true;
      this.drag = { body: best, t0: p, p, id: e.pointerId };
      sfx.click();
    };
    c.onpointermove = (e) => {
      if (!this.drag || e.pointerId !== this.drag.id) return;
      this.drag.p = this.toWorld(e.clientX, e.clientY);
      const pw = this.pullInfo();
      if (pw && (this.lastTick = (this.lastTick || 0) + 1) % 4 === 0) sfx.pull(pw.power);
    };
    const end = (e, cancel) => {
      if (!this.drag || e.pointerId !== this.drag.id) return;
      const info = this.pullInfo();
      const d = this.drag; this.drag = null; this.b.dragging = false;
      if (cancel || !info || info.len < MIN_PULL) return;
      if (info.cancelZone) return;
      this.b.shoot(d.body, info.dx, info.dy, info.power, info.spin);
    };
    c.onpointerup = (e) => end(e, false);
    c.onpointercancel = (e) => end(e, true);
  }

  pullInfo() {
    const d = this.drag; if (!d) return null;
    const b = d.body;
    const vx = d.t0.x - d.p.x, vy = d.t0.y - d.p.y;
    const len = Math.hypot(vx, vy);
    if (len < 1) return { len, power: 0, dx: 1, dy: 0, spin: 0 };
    const dx = vx / len, dy = vy / len;
    const power = clamp(len / MAX_PULL, 0, 1);
    // 스핀: 잡은 지점이 중심에서 벗어난 정도 (발사 방향 기준 좌우)
    const ox = d.t0.x - b.x, oy = d.t0.y - b.y;
    const lat = clamp((dx * oy - dy * ox) / b.r, -1, 1);
    return { len, power, dx, dy, spin: Math.abs(lat) < 0.18 ? 0 : lat, cancelZone: false };
  }

  // ---------- 이벤트 → 이펙트 ----------
  hook() {
    const b = this.b;
    b.on((e) => {
      switch (e.type) {
        case 'hit': {
          const i = clamp(e.impact / 700, 0, 1);
          sfx.hit(i); vibrate(10 + i * 30);
          this.burst(e.x, e.y, 6 + (i * 10) | 0, '#ffffff', 60 + i * 200);
          this.shake = Math.max(this.shake, 3 + i * 9);
          if (e.impact > 320 && !this.reduce) this.hitstop = 0.05;
          break;
        }
        case 'bump': sfx.wall(); break;
        case 'wall': sfx.wall(); this.burst(e.x, e.y, 3, '#e8d9b5', 60); break;
        case 'damage': {
          const big = e.crit;
          this.floats.push({ x: e.x + (Math.random() - 0.5) * 20, y: e.y - 10, vy: -40, life: 0.9, max: 0.9, text: String(e.dmg), color: e.b.team === 0 ? '#ff6b6b' : big ? '#ffd166' : '#ffffff', size: big ? 30 : 20, stroke: true });
          if (big) { sfx.crit(); this.banner('치명타!', '#ffd166', 0.6); }
          break;
        }
        case 'text': this.floats.push({ x: e.x, y: e.y, vy: -30, life: 1.1, max: 1.1, text: e.text, color: e.color || '#fff', size: 18, stroke: true }); break;
        case 'combo': sfx.combo(e.n); this.banner(e.n + '콤보!', '#ff9f43', 0.8); break;
        case 'launch': sfx.launch(e.power); if (!this.reduce) this.burst(e.b.x, e.b.y, 5, '#fff3e0', 120); break;
        case 'fallout': sfx.fall(); this.banner(e.b.team === 1 ? '낙사!' : '으아악!', e.b.team === 1 ? '#7bc96f' : '#ff6b6b', 0.9); vibrate([20, 30, 40]); break;
        case 'ko': {
          sfx.thud(); this.burst(e.b.x, e.b.y, 16, e.b.color, 220);
          this.ghosts.push({ x: e.b.x, y: e.b.y, emoji: e.b.emoji, life: 0.8, r: e.b.r });
          break;
        }
        case 'pin': sfx.pin(); this.banner('따먹기!', '#ff5fa2', 1.1); this.burst(e.x, e.y, 24, '#ffd166', 300); this.shake = 12; vibrate([30, 40, 60]); break;
        case 'edge': sfx.combo(3); this.banner('아슬아슬!', '#ffd166', 0.9); this.floats.push({ x: e.b.x, y: e.b.y - 34, vy: -30, life: 1, max: 1, text: '😱', color: '#fff', size: 26 }); break;
        case 'cushion': this.banner('필통이 받쳐줬어요!', '#7bc96f', 1.1); sfx.crit(); this.burst(e.b.x, e.b.y, 14, '#a5f3fc', 200); break;
        case 'save': this.banner('끈질기게 버텼다!', '#7bc96f', 1); sfx.crit(); break;
        case 'revive': this.banner('시간을 되감았다!', '#c9a6ff', 1.1); sfx.levelup(); break;
        case 'heal': sfx.skill(); this.floats.push({ x: e.b.x, y: e.b.y - 20, vy: -40, life: 1, max: 1, text: '+' + e.amount, color: '#7bc96f', size: 22, stroke: true }); break;
        case 'skill': sfx.skill(); this.burst(e.b.x, e.b.y, 12, '#a5f3fc', 160); break;
        case 'boom': this.burst(e.x, e.y, 30, '#ff8fa3', 360); this.shake = 14; break;
        case 'freeze': this.banner('빙결!', '#8fe3ff', 0.8); break;
        case 'stagger': this.banner('보스 기절!', '#ffd166', 1); break;
        case 'summon': this.banner('증원군 등장!', '#ff6b6b', 1); break;
        case 'shrink': this.banner('선생님 순찰! 책상이 좁아져요', '#ff6b6b', 1.4); this.shake = 10; sfx.bell(); break;
        case 'extra': this.banner('추가 턴!', '#7bc96f', 0.8); break;
        case 'skipped': this.banner('턴 넘김', '#fff', 0.6); break;
        case 'turn': if (!e.first) sfx.click(); this.banner(this.b.isHuman(e.team) ? (this.b.humanTeams.length > 1 ? (e.team === 0 ? '1P 차례' : '2P 차례') : '내 차례') : '상대 차례', e.team === 0 ? '#5aa9e6' : '#ff6b6b', 0.7, true); break;
        default: break;
      }
    });
  }

  burst(x, y, n, color, speed) {
    if (this.reduce) n = Math.min(n, 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = speed * (0.3 + Math.random() * 0.7);
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.4 + Math.random() * 0.4, max: 0.8, color, size: 2 + Math.random() * 3 });
    }
  }
  banner(text, color, life = 0.8, small = false) {
    this.banners = this.banners.filter((b) => b.small !== small || small);
    this.banners.push({ text, color, life, max: life, small });
  }

  // ---------- 루프 ----------
  loop(t) {
    this.raf = requestAnimationFrame((tt) => this.loop(tt));
    const dt = Math.min(0.05, (t - (this.last || t)) / 1000);
    this.last = t;
    if (!this.paused) {
      if (this.hitstop > 0) this.hitstop -= dt;
      else this.b.update(dt);
      this.tickFx(dt);
    }
    this.draw();
    if (this.opts.onTick) this.opts.onTick(this.b);
  }

  tickFx(dt) {
    for (const p of this.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; p.life -= dt; }
    this.parts = this.parts.filter((p) => p.life > 0);
    for (const f of this.floats) { f.y += f.vy * dt; f.life -= dt; }
    this.floats = this.floats.filter((f) => f.life > 0);
    for (const g of this.ghosts) g.life -= dt;
    this.ghosts = this.ghosts.filter((g) => g.life > 0);
    for (const b of this.banners) b.life -= dt;
    this.banners = this.banners.filter((b) => b.life > 0);
    this.shake *= 0.86;
    // 이동 중 지우개 가루
    if (!this.reduce) {
      this.dustT += dt;
      if (this.dustT > 0.04) {
        this.dustT = 0;
        for (const o of this.b.world.bodies) {
          if (!o.alive || o.fallen) continue;
          const sp = Math.hypot(o.vx, o.vy);
          if (sp > 220) this.parts.push({ x: o.x - o.vx * 0.02, y: o.y - o.vy * 0.02, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20, life: 0.45, max: 0.45, color: '#f5efe6', size: 2 + Math.random() * 2 });
        }
      }
    }
  }

  // ---------- 배경 사전 렌더 ----------
  makeBg() {
    const st = this.b.stage, w = this.b.world;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = '#2f2622'; g.fillRect(0, 0, W, H);
    // 바닥 무늬
    g.fillStyle = 'rgba(255,255,255,.04)';
    for (let i = 0; i < 20; i++) g.fillRect(0, i * 24, W, 2);
    const t = w.table;
    // 책상 그림자 + 테두리
    g.fillStyle = 'rgba(0,0,0,.35)'; rr(g, t.x - 4, t.y + 6, t.w + 8, t.h + 8, 22); g.fill();
    g.fillStyle = st.felt; rr(g, t.x - 10, t.y - 10, t.w + 20, t.h + 20, 24); g.fill();
    g.fillStyle = st.bg; rr(g, t.x, t.y, t.w, t.h, 16); g.fill();
    // 나뭇결/노트 줄
    g.save(); rr(g, t.x, t.y, t.w, t.h, 16); g.clip();
    let seed = st.ch * 97 + st.idx * 13;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    g.strokeStyle = 'rgba(0,0,0,.07)'; g.lineWidth = 2;
    for (let i = 0; i < 26; i++) {
      const y = t.y + rnd() * t.h; g.beginPath(); g.moveTo(t.x, y);
      g.bezierCurveTo(t.x + 200, y + rnd() * 16 - 8, t.x + 500, y + rnd() * 16 - 8, t.x + t.w, y + rnd() * 10 - 5); g.stroke();
    }
    // 낙서
    g.font = '26px sans-serif'; g.globalAlpha = 0.18; g.textAlign = 'center';
    const doodles = ['✏️', '⭐', '♥', '📐', '✂️', '☆', '✿'];
    for (let i = 0; i < 7; i++) g.fillText(doodles[i % doodles.length], t.x + 40 + rnd() * (t.w - 80), t.y + 40 + rnd() * (t.h - 80));
    g.globalAlpha = 1;
    // 구역
    for (const z of w.zones) {
      const col = { ice: 'rgba(150,215,255,.6)', glue: 'rgba(255,238,140,.7)', sand: 'rgba(235,228,212,.7)' }[z.type];
      g.fillStyle = col; rr(g, z.x, z.y, z.w, z.h, 28); g.fill();
      g.fillStyle = 'rgba(255,255,255,.35)'; g.font = '13px sans-serif'; g.textAlign = 'center';
      g.fillText({ ice: '💧 미끄러움', glue: '🧴 끈적끈적', sand: '✨ 분필가루' }[z.type], z.x + z.w / 2, z.y + z.h / 2 + 5);
      g.strokeStyle = 'rgba(255,255,255,.5)'; g.setLineDash([6, 6]); g.lineWidth = 2; rr(g, z.x, z.y, z.w, z.h, 28); g.stroke(); g.setLineDash([]);
    }
    g.restore();
    // 장애물
    for (const o of w.obstacles) {
      g.fillStyle = 'rgba(0,0,0,.3)'; rr(g, o.x + 3, o.y + 5, o.w, o.h, 10); g.fill();
      if (o.kind === 'case') {
        g.fillStyle = '#4b6cb7'; rr(g, o.x, o.y, o.w, o.h, 10); g.fill();
        g.strokeStyle = '#fff'; g.setLineDash([4, 5]); g.lineWidth = 2;
        g.beginPath(); if (o.w >= o.h) { g.moveTo(o.x + 8, o.y + o.h / 2); g.lineTo(o.x + o.w - 8, o.y + o.h / 2); } else { g.moveTo(o.x + o.w / 2, o.y + 8); g.lineTo(o.x + o.w / 2, o.y + o.h - 8); }
        g.stroke(); g.setLineDash([]);
      } else if (o.kind === 'books') {
        const cols = ['#e07a5f', '#81b29a', '#f2cc8f', '#3d405b'];
        const horiz = o.w >= o.h, n = 4, step2 = (horiz ? o.h : o.w) / n;
        for (let i = 0; i < n; i++) { g.fillStyle = cols[i % 4]; if (horiz) rr(g, o.x, o.y + i * step2, o.w, step2 - 2, 4); else rr(g, o.x + i * step2, o.y, step2 - 2, o.h, 4); g.fill(); }
      } else {
        g.fillStyle = '#f4a6c0'; rr(g, o.x, o.y, o.w, o.h, 18); g.fill();
        g.fillStyle = 'rgba(255,255,255,.4)'; rr(g, o.x + 5, o.y + 5, o.w - 10, 8, 4); g.fill();
      }
    }
    // 낙사 구역 경고 (가장자리)
    const grd = g.createLinearGradient(0, t.y, 0, t.y + 28);
    g.save(); rr(g, t.x, t.y, t.w, t.h, 16); g.clip();
    g.strokeStyle = 'rgba(255,80,80,.35)'; g.lineWidth = 10; rr(g, t.x + 2, t.y + 2, t.w - 4, t.h - 4, 14); g.stroke();
    g.restore();
    return c;
  }

  // ---------- 그리기 ----------
  draw() {
    const ctx = this.ctx, b = this.b;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#241c19'; ctx.fillRect(0, 0, this.cw, this.ch);
    ctx.save();
    ctx.translate(this.cw / 2, this.ch / 2);
    if (this.rot) ctx.rotate(Math.PI / 2);
    ctx.scale(this.scale, this.scale);
    ctx.translate(-W / 2, -H / 2);
    if (this.shake > 0.3 && !this.reduce) ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    ctx.drawImage(this.bg, 0, 0);
    const tb = b.world.table;
    if (tb.w < 739) { // 좁아진 책상 밖은 위험 구역
      ctx.fillStyle = 'rgba(180,40,40,.55)';
      ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.rect(tb.x, tb.y, tb.w, tb.h);
      ctx.fill('evenodd');
      ctx.strokeStyle = '#ff6b6b'; ctx.lineWidth = 4; ctx.setLineDash([10, 8]); ctx.strokeRect(tb.x, tb.y, tb.w, tb.h); ctx.setLineDash([]);
    }
    this.drawGuide(ctx);
    // 낙하 중 → 아래, 일반 → 위 순서
    const bodies = [...b.world.bodies].filter((o) => o.alive || o.dead).sort((p, q) => (p.fallen ? -1 : 0) - (q.fallen ? -1 : 0) || p.y - q.y);
    for (const o of bodies) this.drawBody(ctx, o);
    for (const g of this.ghosts) { ctx.globalAlpha = g.life / 0.8; ctx.font = g.r * 1.5 + 'px serif'; ctx.textAlign = 'center'; ctx.fillText('💨', g.x, g.y - (0.8 - g.life) * 40); ctx.globalAlpha = 1; }
    for (const p of this.parts) { ctx.globalAlpha = clamp(p.life / p.max, 0, 1); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
    for (const f of this.floats) {
      ctx.globalAlpha = clamp(f.life / f.max * 1.5, 0, 1);
      ctx.font = `800 ${f.size}px "Jua","Gowun Dodum",sans-serif`; ctx.textAlign = 'center';
      if (f.stroke) { ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(30,20,20,.85)'; ctx.strokeText(f.text, f.x, f.y); }
      ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    this.drawBanners(ctx);
  }

  drawGuide(ctx) {
    const d = this.drag; if (!d || this.b.phase !== 'aim') return;
    const info = this.pullInfo(); if (!info || info.len < MIN_PULL) return;
    const b = d.body, bw = this.b;
    const col = `hsl(${120 - info.power * 120},85%,55%)`;
    // 당김 선
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(d.t0.x, d.t0.y); ctx.lineTo(d.p.x, d.p.y); ctx.stroke();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(d.p.x, d.p.y, 9, 0, 7); ctx.fill();
    const mods = bw.mods;
    const full = this.guideMode === 'easy' || mods.guideFull;
    const speed = shotSpeed(b, info.power, mods);
    ctx.setLineDash([2, 10]); ctx.lineWidth = 5; ctx.strokeStyle = col;
    if (full) {
      const w = cloneWorld(bw.world); const c = w.bodies.find((x) => x.id === b.id);
      launch(c, info.dx, info.dy, speed, bw.curveFor(b, info.spin), mods.fmul || 1);
      ctx.beginPath(); ctx.moveTo(b.x, b.y);
      for (let i = 0; i < 140; i++) {
        step(w, DT); w.events.length = 0;
        if (i % 2 === 0) ctx.lineTo(c.x, c.y);
        if (c.fallen || (c.vx === 0 && c.vy === 0)) break;
      }
      ctx.stroke();
      ctx.setLineDash([]); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(c.x, c.y, 7, 0, 7); ctx.fill();
    } else {
      let len = this.guideMode === 'hard' ? 46 : clamp(speed * speed / (2 * 700) * 0.5, 40, 300);
      if (this.guideMode === 'hard') { len = 52; }
      const curve = bw.curveFor(b, info.spin);
      ctx.beginPath(); ctx.moveTo(b.x, b.y);
      if (Math.abs(curve) > 0.05 && this.guideMode !== 'hard') {
        // 휘어지는 방향 암시
        const px = b.x + info.dx * len * 0.6 - info.dy * curve * len * 0.25, py = b.y + info.dy * len * 0.6 + info.dx * curve * len * 0.25;
        ctx.quadraticCurveTo(px, py, b.x + info.dx * len, b.y + info.dy * len);
      } else ctx.lineTo(b.x + info.dx * len, b.y + info.dy * len);
      ctx.stroke();
      ctx.setLineDash([]);
      const ex = b.x + info.dx * (len + 8), ey = b.y + info.dy * (len + 8);
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(ex + info.dx * 14, ey + info.dy * 14); ctx.lineTo(ex - info.dy * 9, ey + info.dx * 9); ctx.lineTo(ex + info.dy * 9, ey - info.dx * 9); ctx.fill();
    }
    ctx.setLineDash([]);
    if (Math.abs(info.spin) > 0.01) {
      ctx.font = '700 15px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
      ctx.fillText(info.spin > 0 ? '↻ 회전' : '↺ 회전', b.x, b.y - b.r - 38);
    }
  }

  drawBody(ctx, o) {
    const b = this.b;
    let s = 1, alpha = 1, rotExtra = 0;
    if (o.fallen) { const k = clamp(o.fallT / 0.7, 0, 1); s = 1 - k * 0.7; alpha = 1 - k * 0.8; rotExtra = k * 2.4; }
    const pop = 1 + (o.pop || 0) * 0.14;
    ctx.save();
    ctx.globalAlpha = alpha;
    // 그림자
    if (!o.fallen) { ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(o.x + 3, o.y + o.r * 0.7, o.r * 0.95, o.r * 0.55, 0, 0, 7); ctx.fill(); }
    ctx.translate(o.x, o.y); ctx.scale(s * pop, s * pop);
    // 팀 링
    const mine = o.team === 0;
    const turnNow = b.phase === 'aim' && o.team === b.turnTeam && b.isHuman(o.team);
    ctx.lineWidth = 3;
    ctx.strokeStyle = mine ? 'rgba(90,169,230,.9)' : 'rgba(255,107,107,.9)';
    ctx.beginPath(); ctx.arc(0, 0, o.r + 4 + (turnNow ? Math.sin(performance.now() / 160) * 2 : 0), 0, 7);
    if (turnNow || o.boss) ctx.stroke();
    if (o.id === b.selId && mine && turnNow) { ctx.setLineDash([5, 5]); ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, o.r + 9, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
    ctx.rotate(o.angle * 0.35 + rotExtra);
    const w = o.r * 1.75, h = o.r * 1.25;
    // 몸통
    ctx.fillStyle = o.color; rr(ctx, -w / 2, -h / 2, w, h, 9); ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(60,40,40,.65)'; rr(ctx, -w / 2, -h / 2, w, h, 9); ctx.stroke();
    // 슬리브(포장지)
    ctx.fillStyle = mine ? 'rgba(90,169,230,.55)' : 'rgba(80,80,100,.45)';
    ctx.save(); rr(ctx, -w / 2, -h / 2, w, h, 9); ctx.clip(); ctx.fillRect(w * 0.12, -h / 2, w * 0.4, h); ctx.restore();
    ctx.rotate(-(o.angle * 0.35 + rotExtra));
    // 얼굴
    const ey = -o.r * 0.12, ex = o.r * 0.34;
    ctx.fillStyle = '#2b2b3a'; ctx.strokeStyle = '#2b2b3a'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    const hurt = (o.pop || 0) > 0.35, low = o.hp < o.maxhp * 0.3;
    if (hurt || o.fallen) {
      for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * ex - 4 * sx * -1, ey - 3); ctx.lineTo(sx * ex + 3 * sx * -1, ey); ctx.lineTo(sx * ex - 4 * sx * -1, ey + 3); ctx.stroke(); }
    } else { for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * ex, ey, o.r * 0.11, 0, 7); ctx.fill(); } }
    ctx.beginPath();
    if (o.fallen) ctx.arc(0, ey + o.r * 0.42, o.r * 0.1, 0, 7);
    else if (hurt || low) ctx.arc(0, ey + o.r * 0.55, o.r * 0.16, Math.PI * 1.1, Math.PI * 1.9);
    else ctx.arc(0, ey + o.r * 0.28, o.r * 0.17, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    // 이모지 배지
    ctx.font = Math.round(o.r * (o.kind === 'enemy' ? 0.95 : 0.75)) + 'px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(o.emoji, o.kind === 'enemy' ? 0 : o.r * 0.1, o.kind === 'enemy' ? -o.r * 0.95 : -o.r * 0.95);
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
    // HP 바
    if (!o.fallen && o.alive) {
      const bw = Math.max(40, o.r * 2), bx = o.x - bw / 2, by = o.y + o.r + 10;
      ctx.fillStyle = 'rgba(0,0,0,.5)'; rr(ctx, bx - 1, by - 1, bw + 2, 9, 4); ctx.fill();
      const ratio = clamp(o.hp / o.maxhp, 0, 1);
      ctx.fillStyle = mine ? '#6dd36d' : '#ff7a7a'; if (ratio < 0.3) ctx.fillStyle = '#ffb703';
      rr(ctx, bx, by, bw * ratio, 7, 3); ctx.fill();
      // 상태
      let ic = '';
      if (o.status.shield) ic += '🛡️'; if (o.status.sticky) ic += '🧴'; if (o.status.rage) ic += '🔥';
      if (b.skip[o.team] && o.boss) ic += '💫';
      if (ic) { ctx.font = '12px serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(ic, o.x, by + 22); }
      if (o.boss) { ctx.font = '700 12px sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(o.name, o.x, o.y - o.r - 34); }
    }
  }

  drawBanners(ctx) {
    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    let y = this.ch * 0.2;
    for (const bn of this.banners) {
      const t = 1 - bn.life / bn.max;
      const a = t < 0.15 ? t / 0.15 : bn.life < 0.2 ? bn.life / 0.2 : 1;
      const sc = t < 0.15 ? 0.6 + (t / 0.15) * 0.5 : 1.1 - Math.min(0.1, (t - 0.15) * 0.3);
      ctx.globalAlpha = clamp(a, 0, 1);
      const size = (bn.small ? 28 : 46) * Math.min(1, this.cw / 520);
      ctx.font = `800 ${size * sc}px "Jua","Gowun Dodum",sans-serif`; ctx.textAlign = 'center';
      ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(40,25,25,.9)'; ctx.lineJoin = 'round';
      const yy = bn.small ? this.ch * 0.1 : y;
      ctx.strokeText(bn.text, this.cw / 2, yy); ctx.fillStyle = bn.color; ctx.fillText(bn.text, this.cw / 2, yy);
      if (!bn.small) y += size + 6;
    }
    ctx.restore();
  }
}
