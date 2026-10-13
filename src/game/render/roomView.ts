import { FURN_BY_ID } from '../../data/items';
import type { AccSlot, Emotion, Personality, PlacedItem } from '../../types';
import { PetActor, type ActorEnv, type Rect } from '../entities/petActor';
import { snapPlacement } from '../core/economy';
import type { Season, TimeOfDay, Weather } from '../core/weather';
import { PET_META, drawPet, img } from './assets';
import { ROOM_H, ROOM_W, WINDOW, fitCanvas } from './constants';

export interface RoomViewState {
  theme: string;
  layout: PlacedItem[];
  speciesId: string;
  stage: 'egg' | 'baby' | 'child' | 'adult';
  accessories: Partial<Record<AccSlot, string>>;
  sleeping: boolean;
  sick: boolean;
  special: boolean;
  emotion: Emotion;
  personality: Record<Personality, number>;
  bond: number;
  hatchTaps: number;
  tod: TimeOfDay;
  weather: Weather;
  season: Season;
  editMode: boolean;
  selectedUid: string | null;
  lowPower: boolean;
  reducedMotion: boolean;
  evolveReady: boolean;
}
export interface RoomCallbacks {
  onTapPet?: () => void;
  onStroke?: () => void;
  onLongPressPet?: () => void;
  onTapFurniture?: (fn: string, uid: string) => void;
  onTapEgg?: () => void;
  onEditSelect?: (uid: string | null) => void;
  onEditCommit?: (layout: PlacedItem[]) => void;
  onPoke?: () => void;
}
interface Fx { name: string; x: number; y: number; vx: number; vy: number; age: number; life: number; sc: number }

const TOD_SKY: Record<TimeOfDay, [string, string]> = { morning: ['#ffd2b0', '#bfe3ff'], day: ['#7cc8ff', '#d8f1ff'], evening: ['#ff9470', '#ffd9a8'], night: ['#161a44', '#3a3f7a'] };
const TOD_TINT: Record<TimeOfDay, [string, number]> = { morning: ['#ffe0c0', 0.12], day: ['#ffffff', 0], evening: ['#ff9a60', 0.2], night: ['#3a4090', 0.45] };

export class RoomView {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  cb: RoomCallbacks = {};
  actor = new PetActor();
  bubbleEl: HTMLElement | null = null;
  s: RoomViewState | null = null;
  private fx: Fx[] = [];
  private raf = 0;
  private last = 0;
  private acc = 0;
  private clock = 0;
  private running = false;
  private food: { id: string; t: number } | null = null;
  private eggShake = 0;
  private editLayout: PlacedItem[] | null = null;
  private drag: { uid: string; dx: number; dy: number; moved: boolean } | null = null;
  private press: { x: number; y: number; t: number; onPet: boolean; stroking: boolean; strokeDist: number; lastX: number; lastY: number; furn?: { fn: string; uid: string }; long: boolean; timer: number } | null = null;
  private lastPokes: number[] = [];
  scale = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const c = canvas.getContext('2d', { alpha: false });
    if (!c) throw new Error('2D canvas not supported');
    this.ctx = c;
    canvas.addEventListener('pointerdown', this.down);
    canvas.addEventListener('pointermove', this.move);
    canvas.addEventListener('pointerup', this.up);
    canvas.addEventListener('pointercancel', this.cancel);
    canvas.addEventListener('pointerleave', this.leave);
  }

  setState(s: RoomViewState): void {
    this.s = s;
    if (!s.editMode) this.editLayout = null;
  }

  resize(cssW: number, cssH: number, dpr: number): void {
    this.scale = fitCanvas(this.canvas, ROOM_W, ROOM_H, cssW, cssH, dpr);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      if (document.hidden) { this.last = now; return; }
      const dt = now - this.last;
      this.last = now;
      const minFrame = this.s?.lowPower ? 33 : 0;
      this.acc += dt;
      if (this.acc < minFrame) return;
      const step = this.acc;
      this.acc = 0;
      this.frame(step);
    };
    this.raf = requestAnimationFrame(loop);
  }
  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }
  destroy(): void {
    this.stop();
    const c = this.canvas;
    c.removeEventListener('pointerdown', this.down);
    c.removeEventListener('pointermove', this.move);
    c.removeEventListener('pointerup', this.up);
    c.removeEventListener('pointercancel', this.cancel);
    c.removeEventListener('pointerleave', this.leave);
    if (this.press) clearTimeout(this.press.timer);
  }

  // ---------- effects API ----------
  spawn(name: string, x: number, y: number, n = 1, spread = 10): void {
    const max = this.s?.lowPower ? 12 : 40;
    for (let i = 0; i < n && this.fx.length < max; i++) {
      this.fx.push({ name, x: x + (Math.random() - 0.5) * spread, y, vx: (Math.random() - 0.5) * 0.02, vy: -0.03 - Math.random() * 0.02, age: 0, life: 1100 + Math.random() * 500, sc: 1 });
    }
  }
  petCenter(): { x: number; y: number } {
    const s = this.s;
    const size = s ? this.petSize() : 32;
    return { x: this.actor.x, y: this.actor.y - size * 0.6 };
  }
  /** Centre of the pet in CSS pixels (used by tests / accessibility helpers). */
  petScreenCenter(): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    const size = this.petSize();
    const cy = this.s?.stage === 'egg' ? 120 : this.actor.y - size / 2;
    const cx = this.s?.stage === 'egg' ? 96 : this.actor.x;
    return { x: r.left + (cx / ROOM_W) * r.width, y: r.top + (cy / ROOM_H) * r.height };
  }
  petSize(): number {
    const s = this.s;
    if (!s) return 32;
    if (s.stage === 'egg') return 32;
    return PET_META[s.speciesId]?.size ?? 32;
  }
  showFood(id: string): void { this.food = { id, t: 0 }; }
  shakeEgg(): void { this.eggShake = 500; }

  // ---------- environment ----------
  private layout(): PlacedItem[] { return this.editLayout ?? this.s?.layout ?? []; }
  private obstacles(): Rect[] {
    const out: Rect[] = [];
    for (const it of this.layout()) {
      const d = FURN_BY_ID[it.itemId];
      if (!d || d.slot !== 'floor') continue;
      out.push({ x: it.x + 2, y: it.y - 8, w: d.w - 4, h: 8 });
    }
    return out;
  }
  private env(): ActorEnv {
    const s = this.s as RoomViewState;
    const bed = this.layout().map((it) => ({ it, d: FURN_BY_ID[it.itemId] })).find((x) => x.d?.fn === 'sleep');
    const table = this.layout().map((it) => ({ it, d: FURN_BY_ID[it.itemId] })).find((x) => x.d?.fn === 'eat');
    return {
      emotion: s.emotion, sleeping: s.sleeping, sick: s.sick, size: this.petSize(), float: !!PET_META[s.speciesId]?.float, personality: s.personality,
      obstacles: this.obstacles(), bond: s.bond,
      bedSpot: bed ? { x: bed.it.x + bed.d.w / 2, y: Math.min(152, bed.it.y - 6) } : undefined,
      tableSpot: table ? { x: table.it.x + table.d.w / 2, y: Math.min(152, table.it.y + 6) } : undefined,
    };
  }

  /** Walks to the dining table (if any) and returns true when eating is triggered. */
  startEating(): void {
    const e = this.env();
    if (e.tableSpot) { this.actor.setPosition(Math.max(24, Math.min(ROOM_W - 24, e.tableSpot.x - 22)), e.tableSpot.y + 14 > 152 ? 150 : e.tableSpot.y + 14); }
    this.actor.trigger('EATING', 2000, true);
  }

  // ---------- main frame ----------
  private frame(dt: number): void {
    const s = this.s;
    if (!s) return;
    this.clock += dt;
    const env = this.env();
    if (s.stage !== 'egg') {
      if (s.evolveReady && this.actor.state === 'IDLE') this.actor.glow = 1;
      else this.actor.glow = Math.max(0, this.actor.glow - dt / 500);
      this.actor.update(dt, env);
    }
    if (this.eggShake > 0) this.eggShake -= dt;
    if (this.food) { this.food.t += dt; if (this.food.t > 1900) this.food = null; }
    for (const f of this.fx) { f.age += dt; f.x += f.vx * dt; f.y += f.vy * dt * (s.reducedMotion ? 0.3 : 1); }
    this.fx = this.fx.filter((f) => f.age < f.life);
    // ambient particles near a happy pet
    if (!s.reducedMotion && !s.lowPower && s.stage !== 'egg') {
      if (this.actor.state === 'INTERACTING' && Math.random() < dt / 160) this.spawn('heart', this.actor.x, this.actor.y - this.petSize() * 0.75, 1, 18);
      if (s.sleeping && Math.random() < dt / 1400) this.spawn('zzz', this.actor.x + 8, this.actor.y - this.petSize() * 0.7, 1, 4);
      if (s.sick && Math.random() < dt / 1800) this.spawn('sweat', this.actor.x + 10, this.actor.y - this.petSize() * 0.7, 1, 4);
      if (s.emotion === 'angry' && Math.random() < dt / 2500) this.spawn('anger', this.actor.x + 8, this.actor.y - this.petSize() * 0.8, 1, 4);
      if (s.emotion === 'sad' && Math.random() < dt / 3500) this.spawn('tear', this.actor.x - 6, this.actor.y - this.petSize() * 0.5, 1, 4);
      if (s.special && Math.random() < dt / 900) this.spawn('sparkle', this.actor.x, this.actor.y - this.petSize() * 0.5, 1, this.petSize());
    }
    this.draw(env);
  }

  private draw(env: ActorEnv): void {
    const s = this.s as RoomViewState;
    const ctx = this.ctx;
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#fff3da';
    ctx.fillRect(0, 0, ROOM_W, ROOM_H);
    this.drawSky();
    const room = img(`assets/rooms/${s.theme}.png`) ?? img('assets/rooms/cozy.png');
    if (room) ctx.drawImage(room, 0, 0);
    // furniture + pet sorted by baseline
    const items = [...this.layout()].map((it) => ({ it, d: FURN_BY_ID[it.itemId] })).filter((x) => x.d);
    const rugs = items.filter((x) => x.d.slot === 'rug');
    const wall = items.filter((x) => x.d.slot === 'wall');
    const floor = items.filter((x) => x.d.slot === 'floor').sort((a, b) => a.it.y - b.it.y);
    for (const x of [...rugs, ...wall]) this.drawItem(x.it, x.d.w, x.d.h);
    const pose = s.stage === 'egg' ? null : this.actor.pose(env);
    const petY = s.stage === 'egg' ? 132 : this.actor.y;
    let petDrawn = false;
    const drawPetNow = () => { petDrawn = true; this.drawPetLayer(env, pose); };
    for (const x of floor) {
      if (!petDrawn && petY < x.it.y - 1) drawPetNow();
      this.drawItem(x.it, x.d.w, x.d.h);
    }
    if (!petDrawn) drawPetNow();
    this.drawLights();
    this.drawTint();
    this.drawFx();
    if (s.editMode) this.drawEditOverlay();
  }

  private drawSky(): void {
    const s = this.s as RoomViewState;
    const ctx = this.ctx;
    const { x, y, w, h } = WINDOW;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    const [top, bot] = TOD_SKY[s.tod];
    const bands = 6;
    for (let i = 0; i < bands; i++) {
      ctx.fillStyle = mixHex(top, bot, i / (bands - 1));
      ctx.fillRect(x, y + Math.floor((h * i) / bands), w, Math.ceil(h / bands) + 1);
    }
    const t = this.clock / 1000;
    if (s.tod === 'night') {
      ctx.fillStyle = '#fff6c0';
      for (let i = 0; i < 12; i++) {
        const sx = x + ((i * 37) % (w - 2)) + 1, sy = y + ((i * 19) % (h - 16)) + 2;
        if (s.reducedMotion || Math.floor(t * 1.5 + i) % 5 !== 0) ctx.fillRect(sx, sy, 1, 1);
      }
      ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.arc(x + w - 12, y + 10, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = TOD_SKY.night[0]; ctx.beginPath(); ctx.arc(x + w - 9, y + 8, 4.5, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = s.tod === 'evening' ? '#ff7a5a' : '#ffe27a';
      const sy = s.tod === 'day' ? y + 9 : y + h - 12;
      ctx.beginPath(); ctx.arc(x + (s.tod === 'morning' ? 10 : s.tod === 'day' ? w - 14 : w - 8), sy, 5, 0, Math.PI * 2); ctx.fill();
    }
    const cloudN = s.weather === 'clear' || s.weather === 'starry' ? 1 : 3;
    for (let i = 0; i < cloudN; i++) {
      const c = img(`assets/ui/cloud${i % 3}.png`);
      if (c) {
        const off = s.reducedMotion ? 0 : (t * (2 + i)) % (w + 40);
        ctx.globalAlpha = s.weather === 'rain' ? 0.95 : 0.85;
        ctx.drawImage(c, Math.round(x - 40 + ((off + i * 30) % (w + 40))), y + 4 + i * 8);
        ctx.globalAlpha = 1;
      }
    }
    if (s.weather === 'rain') {
      ctx.fillStyle = '#9fd0ff';
      for (let i = 0; i < 14; i++) ctx.fillRect(x + ((i * 11 + Math.floor(t * 40)) % w), y + ((i * 17 + Math.floor(t * 70)) % h), 1, 3);
    } else if (s.weather === 'snow' || (s.season === 'winter' && s.weather !== 'clear')) {
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 16; i++) ctx.fillRect(x + ((i * 13 + Math.floor(Math.sin(t + i) * 3)) % w + w) % w, y + ((i * 7 + Math.floor(t * 12)) % h), 1, 1);
    } else if (!s.reducedMotion && s.tod !== 'night') {
      if (s.season === 'spring') { ctx.fillStyle = '#ffb3c7'; for (let i = 0; i < 6; i++) ctx.fillRect(x + ((i * 9 + Math.floor(t * 8)) % w), y + ((i * 13 + Math.floor(t * 10)) % h), 2, 1); }
      else if (s.season === 'autumn') { ctx.fillStyle = '#e8903a'; for (let i = 0; i < 6; i++) ctx.fillRect(x + ((i * 9 + Math.floor(Math.sin(t + i) * 4) + 8) % w), y + ((i * 13 + Math.floor(t * 9)) % h), 2, 2); }
    }
    if (s.season === 'winter') { ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y + h - 4, w, 4); }
    ctx.restore();
  }

  private drawItem(it: PlacedItem, w: number, h: number): void {
    const im = img(`assets/furniture/${it.itemId}.png`);
    if (!im) return;
    const ctx = this.ctx;
    const x = Math.round(it.x), y = Math.round(it.y - h);
    if (it.flip) { ctx.save(); ctx.translate(x + w, 0); ctx.scale(-1, 1); ctx.drawImage(im, 0, y); ctx.restore(); }
    else ctx.drawImage(im, x, y);
  }

  private drawPetLayer(env: ActorEnv, pose: ReturnType<PetActor['pose']> | null): void {
    const s = this.s as RoomViewState;
    const ctx = this.ctx;
    if (s.stage === 'egg') {
      const wob = this.eggShake > 0 ? (Math.floor(this.clock / 70) % 2 === 0 ? 'wobbleL' : 'wobbleR') : Math.floor(this.clock / 1500) % 6 === 0 ? 'wobbleL' : 'idle';
      const frame = s.hatchTaps >= 4 ? 'crack2' : s.hatchTaps >= 2 ? 'crack1' : wob;
      const hop = this.eggShake > 0 ? 0 : Math.round(Math.sin(this.clock / 500));
      drawShadow(ctx, 96, 134, 12);
      drawPet(ctx, s.speciesId, { x: 96, y: 134 + hop, frame: this.eggShake > 0 && s.hatchTaps >= 2 ? frame : frame });
      this.actor.setPosition(96, 134);
      return;
    }
    if (!pose) return;
    const size = env.size;
    drawShadow(ctx, pose.x, pose.y, size * 0.3 - (pose.hop > 0 || env.float ? 2 : 0));
    const lift = pose.bob + pose.hop;
    const squash = this.actor.state === 'EVOLVING';
    drawPet(ctx, s.speciesId, { x: pose.x, y: pose.y - lift, frame: pose.frame, flip: pose.flip, accessories: s.accessories, whiteout: squash ? 0.6 + Math.sin(this.clock / 60) * 0.4 : this.actor.glow > 0 ? 0.25 + Math.sin(this.clock / 180) * 0.2 : 0 });
    if (this.food && this.actor.state === 'EATING') {
      const f = img(`assets/food/${this.food.id}.png`);
      if (f) {
        const p = Math.min(1, this.food.t / 1800);
        const h = Math.max(2, Math.round(16 * (1 - p)));
        const fx = Math.round(pose.x + (pose.flip ? -size * 0.45 : size * 0.45) - 8);
        const fy = Math.round(pose.y - size * 0.35);
        ctx.drawImage(f, 0, 16 - h, 16, h, fx, fy + (16 - h), 16, h);
      }
    }
    // bubble anchor
    if (this.bubbleEl) {
      const px = (pose.x / ROOM_W) * 100, py = ((pose.y - lift - size - 2) / ROOM_H) * 100;
      this.bubbleEl.style.left = `${Math.max(14, Math.min(86, px))}%`;
      this.bubbleEl.style.top = `${Math.max(3, py)}%`;
    }
  }

  private drawLights(): void {
    const s = this.s as RoomViewState;
    if (s.lowPower || (s.tod !== 'night' && s.tod !== 'evening')) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const it of this.layout()) {
      if (!['stand_lamp', 'moon_lamp', 'star_lamp'].includes(it.itemId)) continue;
      const d = FURN_BY_ID[it.itemId];
      const cx = it.x + d.w / 2, cy = it.y - d.h * 0.6;
      for (let r = 26; r >= 8; r -= 6) { ctx.fillStyle = `rgba(255,220,120,${0.05 + (26 - r) * 0.004})`; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
  }

  private drawTint(): void {
    const s = this.s as RoomViewState;
    const [col, a] = TOD_TINT[s.tod];
    if (a <= 0) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = a * 1.4;
    ctx.fillStyle = col;
    ctx.fillRect(0, 0, ROOM_W, ROOM_H);
    ctx.restore();
  }

  private drawFx(): void {
    const ctx = this.ctx;
    for (const f of this.fx) {
      const im = img(`assets/effects/${f.name}.png`);
      if (!im) continue;
      const k = f.age / f.life;
      ctx.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      ctx.drawImage(im, Math.round(f.x - 8), Math.round(f.y - 8));
    }
    ctx.globalAlpha = 1;
  }

  private drawEditOverlay(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= ROOM_W; x += 8) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ROOM_H); ctx.stroke(); }
    for (let y = 0; y <= ROOM_H; y += 8) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(ROOM_W, y); ctx.stroke(); }
    const sel = this.layout().find((i) => i.uid === this.s?.selectedUid);
    if (sel) {
      const d = FURN_BY_ID[sel.itemId];
      ctx.strokeStyle = '#ffd84d'; ctx.lineWidth = 1;
      ctx.setLineDash([3, 2]);
      ctx.strokeRect(sel.x - 1.5, sel.y - d.h - 1.5, d.w + 3, d.h + 3);
    }
    ctx.restore();
  }

  // ---------- pointer input ----------
  private toLogical(e: PointerEvent): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * ROOM_W, y: ((e.clientY - r.top) / r.height) * ROOM_H };
  }
  private petBox(): Rect {
    const size = this.petSize();
    return { x: this.actor.x - size / 2, y: this.actor.y - size - 2, w: size, h: size + 4 };
  }
  private hitPet(p: { x: number; y: number }): boolean {
    const b = this.petBox();
    return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
  }
  private hitItem(p: { x: number; y: number }): PlacedItem | null {
    const items = [...this.layout()].map((it) => ({ it, d: FURN_BY_ID[it.itemId] })).filter((x) => x.d);
    items.sort((a, b) => (b.d.slot === 'wall' ? -1 : b.it.y) - (a.d.slot === 'wall' ? -1 : a.it.y));
    for (const x of items) {
      if (p.x >= x.it.x && p.x <= x.it.x + x.d.w && p.y >= x.it.y - x.d.h && p.y <= x.it.y) return x.it;
    }
    return null;
  }

  private down = (e: PointerEvent): void => {
    if (!this.s) return;
    this.canvas.setPointerCapture?.(e.pointerId);
    const p = this.toLogical(e);
    if (this.s.editMode) {
      const it = this.hitItem(p);
      this.cb.onEditSelect?.(it ? it.uid : null);
      if (it) {
        if (!this.editLayout) this.editLayout = this.s.layout.map((x) => ({ ...x }));
        this.drag = { uid: it.uid, dx: p.x - it.x, dy: p.y - it.y, moved: false };
      }
      return;
    }
    const onPet = this.s.stage === 'egg' ? Math.hypot(p.x - 96, p.y - 120) < 18 : this.hitPet(p);
    const hit = onPet ? null : this.hitItem(p);
    const d = hit ? FURN_BY_ID[hit.itemId] : null;
    const timer = window.setTimeout(() => {
      if (this.press && !this.press.stroking && this.press.onPet) { this.press.long = true; this.cb.onLongPressPet?.(); }
    }, 550);
    this.press = { x: p.x, y: p.y, t: performance.now(), onPet, stroking: false, strokeDist: 0, lastX: p.x, lastY: p.y, furn: d?.fn && hit ? { fn: d.fn, uid: hit.uid } : undefined, long: false, timer };
  };
  private move = (e: PointerEvent): void => {
    if (!this.s) return;
    const p = this.toLogical(e);
    if (this.drag && this.editLayout) {
      const it = this.editLayout.find((x) => x.uid === this.drag?.uid);
      if (it) {
        const sp = snapPlacement(it.itemId, p.x - this.drag.dx, p.y - this.drag.dy);
        if (sp.x !== it.x || sp.y !== it.y) { it.x = sp.x; it.y = sp.y; this.drag.moved = true; }
      }
      return;
    }
    const pr = this.press;
    if (!pr || !pr.onPet || this.s.stage === 'egg') return;
    const dist = Math.hypot(p.x - pr.lastX, p.y - pr.lastY);
    pr.lastX = p.x; pr.lastY = p.y;
    if (Math.hypot(p.x - pr.x, p.y - pr.y) > 6 && this.hitPet(p)) {
      pr.stroking = true;
      clearTimeout(pr.timer);
      pr.strokeDist += dist;
      if (pr.strokeDist > 16) {
        pr.strokeDist = 0;
        this.actor.trigger('INTERACTING', 900);
        this.cb.onStroke?.();
      }
    }
  };
  private up = (e: PointerEvent): void => {
    if (!this.s) return;
    this.canvas.releasePointerCapture?.(e.pointerId);
    if (this.drag && this.editLayout) {
      const layout = this.editLayout;
      this.drag = null;
      this.cb.onEditCommit?.(layout.map((x) => ({ ...x })));
      return;
    }
    const pr = this.press;
    this.press = null;
    if (!pr) return;
    clearTimeout(pr.timer);
    if (pr.stroking || pr.long) return;
    const dt = performance.now() - pr.t;
    if (pr.onPet && dt < 550) {
      if (this.s.stage === 'egg') { this.shakeEgg(); this.cb.onTapEgg?.(); return; }
      const now = performance.now();
      this.lastPokes = this.lastPokes.filter((t) => now - t < 1400);
      this.lastPokes.push(now);
      if (this.lastPokes.length >= 6) { this.lastPokes = []; this.cb.onPoke?.(); }
      else this.cb.onTapPet?.();
    } else if (pr.furn) this.cb.onTapFurniture?.(pr.furn.fn, pr.furn.uid);
  };
  private cancel = (): void => { if (this.press) clearTimeout(this.press.timer); this.press = null; if (this.drag) { this.drag = null; this.editLayout = null; } };
  private leave = (): void => { /* pointer capture keeps events flowing */ };
}

function drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.fillStyle = 'rgba(60,40,70,0.22)';
  ctx.beginPath();
  ctx.ellipse(Math.round(x), Math.round(y) - 1, Math.max(4, r), 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
}
function mixHex(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`;
}
