import type { Emotion, Personality } from '../../types';
import { EMOTION_FRAME } from '../core/emotion';
import { FLOOR_Y, ROOM_W } from '../render/constants';

export type ActorState =
  | 'IDLE' | 'WALKING' | 'LOOKING' | 'EATING' | 'PLAYING' | 'SLEEPING' | 'BATHING'
  | 'HAPPY' | 'SAD' | 'SICK' | 'EVOLVING' | 'INTERACTING';

export interface Rect { x: number; y: number; w: number; h: number }
export interface ActorEnv {
  emotion: Emotion;
  sleeping: boolean;
  sick: boolean;
  size: number;
  float: boolean;
  personality: Record<Personality, number>;
  obstacles: Rect[]; // furniture footprints on the floor
  bedSpot?: { x: number; y: number };
  tableSpot?: { x: number; y: number };
  bond: number;
}

/** States that may be overridden by the autonomous brain (everything else is a locked, timed action). */
const AUTONOMOUS: ActorState[] = ['IDLE', 'WALKING', 'LOOKING', 'HAPPY', 'SAD'];
const FEET_MIN = 124;
const FEET_MAX = 152;

/** Safe state machine: only one animation at a time; timed states always expire back to IDLE. */
export class PetActor {
  x = ROOM_W / 2;
  y = 138;
  state: ActorState = 'IDLE';
  flip = false;
  private t = 0; // time in current state (ms)
  private duration = 0;
  private nextThink = 1500;
  private targetX = this.x;
  private targetY = this.y;
  private blinkAt = 3000;
  private blinking = 0;
  private hop = 0; // vertical offset in px (>=0 means raised)
  private hopV = 0;
  private clock = 0;
  special: string | null = null;
  glow = 0;
  constructor(private rand: () => number = Math.random) {}

  get busy(): boolean { return !AUTONOMOUS.includes(this.state); }

  /** Locked action (eat, play, interact, evolve...). Returns false if refused. */
  trigger(state: ActorState, durationMs: number, force = false): boolean {
    if (this.state === 'EVOLVING' && state !== 'EVOLVING' && !force) return false;
    if (this.state === 'SLEEPING' && state !== 'SLEEPING' && !force) return false;
    this.state = state;
    this.t = 0;
    this.duration = durationMs;
    if (state === 'HAPPY' || state === 'PLAYING') this.jump(4);
    return true;
  }

  jump(power = 4): void {
    if (this.hop > 0.1) return;
    this.hopV = power;
    this.hop = 0.01;
  }
  moveTo(x: number, y: number): void {
    this.targetX = Math.max(8 + 0, Math.min(ROOM_W - 8, x));
    this.targetY = Math.max(FEET_MIN, Math.min(FEET_MAX, y));
    this.state = 'WALKING';
    this.t = 0;
    this.duration = 8000;
  }
  stopTimed(): void { if (this.busy && this.state !== 'SLEEPING' && this.state !== 'EVOLVING') this.toIdle(); }
  private toIdle(): void { this.state = 'IDLE'; this.t = 0; this.duration = 0; this.nextThink = 1200 + this.rand() * 2500; }

  private blocked(x: number, y: number, env: ActorEnv): boolean {
    const half = env.size * 0.28;
    return env.obstacles.some((o) => x + half > o.x && x - half < o.x + o.w && y > o.y - 4 && y < o.y + o.h + 6);
  }

  private pickTarget(env: ActorEnv): void {
    for (let i = 0; i < 8; i++) {
      const half = env.size / 2;
      const x = half + 6 + this.rand() * (ROOM_W - env.size - 12);
      const y = FEET_MIN + this.rand() * (FEET_MAX - FEET_MIN);
      if (!this.blocked(x, y, env)) { this.moveTo(x, y); return; }
    }
    this.toIdle();
  }

  private think(env: ActorEnv): void {
    const p = env.personality;
    const lively = p.lively / 100 + (env.emotion === 'excited' ? 0.4 : 0);
    const sleepy = (p.sleepy + (env.emotion === 'sleepy' ? 60 : 0)) / 100;
    const shy = p.shy / 100;
    const r = this.rand();
    const wWalk = 0.35 + lively * 0.5 - sleepy * 0.2 - (env.emotion === 'sad' ? 0.15 : 0);
    const wLook = 0.2;
    const wJump = 0.08 + (p.prankster / 100) * 0.2 + (env.emotion === 'joy' || env.emotion === 'excited' ? 0.15 : 0);
    const total = Math.max(0.1, wWalk) + wLook + wJump + 0.2;
    const roll = r * total - Math.max(0.1, wWalk);
    if (roll < 0) {
      if (env.bond > 40 && this.rand() < 0.25 + (1 - shy) * 0.2) this.moveTo(ROOM_W / 2 + (this.rand() - 0.5) * 40, FEET_MAX - 2); // approach the player
      else this.pickTarget(env);
    } else if (roll - wLook < 0) { this.flip = !this.flip; this.trigger('LOOKING', 1400 + this.rand() * 1200); }
    else if (roll - wLook - wJump < 0) { this.jump(4 + this.rand() * 2); this.trigger('HAPPY', 900); }
    else { this.toIdle(); this.nextThink = 2500 + this.rand() * 3000; }
  }

  update(dtMs: number, env: ActorEnv): void {
    const dt = Math.min(dtMs, 100);
    this.clock += dt;
    this.t += dt;
    // forced states from outside world
    if (env.sleeping && this.state !== 'SLEEPING') {
      this.state = 'SLEEPING';
      if (env.bedSpot) { this.x = env.bedSpot.x; this.y = env.bedSpot.y; }
      this.t = 0; this.duration = 0;
    } else if (!env.sleeping && this.state === 'SLEEPING') this.toIdle();
    if (this.state === 'SLEEPING') { this.hop = 0; return; }

    // vertical hop physics
    if (this.hop > 0 || this.hopV > 0) {
      this.hop += this.hopV * (dt / 60);
      this.hopV -= 0.5 * (dt / 60);
      if (this.hop <= 0) { this.hop = 0; this.hopV = 0; }
    }
    // blink
    this.blinkAt -= dt;
    if (this.blinkAt <= 0) { this.blinking = 140; this.blinkAt = 2500 + this.rand() * 3500; }
    if (this.blinking > 0) this.blinking -= dt;

    if (this.duration > 0 && this.t >= this.duration && this.state !== 'WALKING') this.toIdle();

    if (this.state === 'WALKING') {
      const speed = (env.emotion === 'sad' || env.emotion === 'tired' ? 0.012 : env.emotion === 'excited' ? 0.03 : 0.02) * (0.8 + env.personality.lively / 250);
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const dist = Math.hypot(dx, dy);
      const step = speed * dt;
      if (dist <= step || this.t > this.duration) { this.x = this.targetX; this.y = this.targetY; this.toIdle(); }
      else {
        const nx = this.x + (dx / dist) * step;
        const ny = this.y + (dy / dist) * step;
        if (!this.blocked(this.x, this.y, env) && this.blocked(nx, ny, env)) this.toIdle(); // already stuck inside furniture -> allowed to walk out
        else { this.x = nx; this.y = ny; if (Math.abs(dx) > 0.5) this.flip = dx < 0; }
      }
    } else if (AUTONOMOUS.includes(this.state)) {
      this.nextThink -= dt;
      if (this.nextThink <= 0 && this.state !== 'HAPPY') { this.nextThink = 2000 + this.rand() * 3500; this.think(env); }
      if (this.state === 'IDLE' && env.sick) this.state = 'SICK';
      if (this.state === 'SICK' && !env.sick) this.toIdle();
      if (this.state === 'IDLE' && (env.emotion === 'sad' || env.emotion === 'hungry')) this.state = 'SAD';
      if (this.state === 'SAD' && env.emotion !== 'sad' && env.emotion !== 'hungry') this.toIdle();
    }
    // keep away from furniture that was dropped on us
    if (this.blocked(this.x, this.y, env)) this.pickTarget(env);
    this.x = Math.max(env.size / 2 - 4, Math.min(ROOM_W - env.size / 2 + 4, this.x));
  }

  /** Visual pose for the renderer. */
  pose(env: ActorEnv): { frame: string; x: number; y: number; flip: boolean; bob: number; hop: number } {
    const tick = Math.floor(this.clock / (this.state === 'WALKING' ? 170 : 520)) % 2;
    let frame = tick === 0 ? 'idle0' : 'idle1';
    switch (this.state) {
      case 'SLEEPING': frame = 'sleep'; break;
      case 'EATING': frame = Math.floor(this.clock / 230) % 2 === 0 ? 'eat' : 'idle0'; break;
      case 'HAPPY': case 'INTERACTING': case 'PLAYING': frame = Math.floor(this.clock / 260) % 2 === 0 ? 'happy' : 'idle1'; break;
      case 'SAD': frame = 'sad'; break;
      case 'SICK': frame = 'sick'; break;
      case 'LOOKING': frame = 'idle0'; break;
      case 'EVOLVING': frame = 'idle0'; break;
      default: break;
    }
    if ((this.state === 'IDLE' || this.state === 'LOOKING') && this.blinking > 0) frame = 'blink';
    if (this.state === 'IDLE' && env.emotion !== 'calm' && tick === 0 && EMOTION_FRAME[env.emotion] === 'happy' && env.emotion === 'excited') frame = 'happy';
    const walkBob = this.state === 'WALKING' ? (Math.floor(this.clock / 170) % 2) : 0;
    const floatBob = env.float ? Math.round(5 + Math.sin(this.clock / 420) * 2) : 0;
    return { frame, x: this.x, y: this.y, flip: this.flip, bob: walkBob + floatBob, hop: Math.round(this.hop) };
  }

  setPosition(x: number, y: number): void { this.x = x; this.y = Math.max(FEET_MIN, Math.min(FEET_MAX, y)); this.targetX = this.x; this.targetY = this.y; }
}

export const FLOOR_BOUNDS = { min: FEET_MIN, max: FEET_MAX, floorY: FLOOR_Y };
