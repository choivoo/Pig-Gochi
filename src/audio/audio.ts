/** Tiny Web Audio synth: no audio files, so nothing can 404. Starts only after a user gesture. */
type Wave = OscillatorType;
interface Tone { f: number; d: number; t?: Wave; v?: number; at?: number; slide?: number }

const SFX: Record<string, Tone[]> = {
  click: [{ f: 660, d: 0.05, t: 'square', v: 0.4 }],
  open: [{ f: 440, d: 0.06, t: 'triangle' }, { f: 660, d: 0.08, t: 'triangle', at: 0.05 }],
  close: [{ f: 600, d: 0.06, t: 'triangle' }, { f: 400, d: 0.08, t: 'triangle', at: 0.05 }],
  eat: [{ f: 300, d: 0.06, t: 'square', v: 0.4 }, { f: 360, d: 0.06, t: 'square', v: 0.4, at: 0.1 }, { f: 300, d: 0.06, t: 'square', v: 0.4, at: 0.2 }],
  pet: [{ f: 880, d: 0.09, t: 'sine', slide: 1.4 }, { f: 1100, d: 0.1, t: 'sine', at: 0.08 }],
  jump: [{ f: 300, d: 0.14, t: 'square', v: 0.4, slide: 2.2 }],
  bath: [{ f: 500, d: 0.05, t: 'sine', slide: 1.6 }, { f: 700, d: 0.05, t: 'sine', at: 0.07, slide: 1.4 }, { f: 600, d: 0.06, t: 'sine', at: 0.14, slide: 1.5 }],
  sleep: [{ f: 440, d: 0.2, t: 'sine' }, { f: 330, d: 0.25, t: 'sine', at: 0.2 }, { f: 262, d: 0.4, t: 'sine', at: 0.45 }],
  coin: [{ f: 988, d: 0.07, t: 'square', v: 0.35 }, { f: 1319, d: 0.18, t: 'square', v: 0.35, at: 0.07 }],
  buy: [{ f: 523, d: 0.08, t: 'triangle' }, { f: 659, d: 0.08, t: 'triangle', at: 0.08 }, { f: 784, d: 0.16, t: 'triangle', at: 0.16 }],
  error: [{ f: 220, d: 0.12, t: 'sawtooth', v: 0.3 }, { f: 180, d: 0.16, t: 'sawtooth', v: 0.3, at: 0.12 }],
  evolve: [262, 330, 392, 523, 659, 784, 1046].map((f, i) => ({ f, d: 0.22, t: 'triangle' as Wave, at: i * 0.14 })),
  achieve: [{ f: 523, d: 0.1, t: 'square', v: 0.35 }, { f: 659, d: 0.1, t: 'square', v: 0.35, at: 0.1 }, { f: 784, d: 0.1, t: 'square', v: 0.35, at: 0.2 }, { f: 1046, d: 0.3, t: 'square', v: 0.35, at: 0.3 }],
  start: [{ f: 392, d: 0.1, t: 'square', v: 0.35 }, { f: 523, d: 0.1, t: 'square', v: 0.35, at: 0.1 }, { f: 784, d: 0.2, t: 'square', v: 0.35, at: 0.2 }],
  end: [{ f: 784, d: 0.1, t: 'square', v: 0.35 }, { f: 523, d: 0.1, t: 'square', v: 0.35, at: 0.1 }, { f: 392, d: 0.25, t: 'square', v: 0.35, at: 0.2 }],
  hatch: [{ f: 330, d: 0.1, t: 'triangle' }, { f: 392, d: 0.1, t: 'triangle', at: 0.1 }, { f: 523, d: 0.1, t: 'triangle', at: 0.2 }, { f: 784, d: 0.4, t: 'triangle', at: 0.3 }],
  tap: [{ f: 220, d: 0.06, t: 'triangle', v: 0.5 }],
  perfect: [{ f: 1046, d: 0.07, t: 'sine' }], great: [{ f: 880, d: 0.07, t: 'sine' }], good: [{ f: 660, d: 0.07, t: 'sine' }], miss: [{ f: 160, d: 0.1, t: 'sawtooth', v: 0.25 }],
};

const N = (n: number) => 440 * Math.pow(2, (n - 9) / 12); // semitones above C4
const TRACKS: Record<string, { bpm: number; wave: Wave; notes: (number | null)[]; bass?: (number | null)[] }> = {
  menu: { bpm: 96, wave: 'triangle', notes: [12, null, 16, null, 19, null, 16, null, 14, null, 17, null, 21, null, 17, null], bass: [0, null, null, null, 5, null, null, null] },
  room: { bpm: 84, wave: 'sine', notes: [12, 16, 19, 16, 14, 17, 21, 17, 12, 16, 19, 24, 21, 19, 16, null], bass: [0, null, 7, null, 5, null, 9, null] },
  night: { bpm: 66, wave: 'sine', notes: [9, null, 12, null, 16, null, 12, null, 7, null, 11, null, 14, null, 11, null], bass: [0, null, null, null, -2, null, null, null] },
  minigame: { bpm: 132, wave: 'square', notes: [12, 12, 19, 12, 16, 12, 19, 21, 14, 14, 21, 14, 17, 14, 21, 24], bass: [0, null, 0, null, 5, null, 5, null] },
  evolve: { bpm: 72, wave: 'triangle', notes: [12, 16, 19, 24, 19, 16, 12, null, 14, 17, 21, 26, 21, 17, 14, null] },
};

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  vol = { master: 0.7, music: 0.5, sfx: 0.8, muted: false };
  private track: string | null = null;
  private timer: number | null = null;
  private step = 0;
  private nextTime = 0;
  private wanted: string | null = null;

  /** Must be called from a user gesture handler. */
  unlock(): void {
    if (this.ctx) { if (this.ctx.state === 'suspended') void this.ctx.resume(); return; }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain(); this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain(); this.sfxGain.connect(this.master);
      this.apply();
      if (this.wanted) this.music(this.wanted);
    } catch { this.ctx = null; }
  }
  setVolumes(v: { master: number; music: number; sfx: number; muted: boolean }): void { this.vol = v; this.apply(); }
  private apply(): void {
    if (!this.master || !this.musicGain || !this.sfxGain) return;
    this.master.gain.value = this.vol.muted ? 0 : this.vol.master;
    this.musicGain.gain.value = this.vol.music * 0.35;
    this.sfxGain.gain.value = this.vol.sfx * 0.6;
  }
  sfx(name: string): void {
    if (!this.ctx || !this.sfxGain || this.vol.muted) return;
    const tones = SFX[name];
    if (!tones) return;
    const t0 = this.ctx.currentTime;
    for (const t of tones) this.tone(this.sfxGain, t, t0);
  }
  private tone(dest: GainNode, t: Tone, t0: number): void {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    const s = t0 + (t.at ?? 0);
    o.type = t.t ?? 'square'; o.frequency.setValueAtTime(t.f, s);
    if (t.slide) o.frequency.exponentialRampToValueAtTime(t.f * t.slide, s + t.d);
    const v = t.v ?? 0.5;
    g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(v, s + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, s + t.d);
    o.connect(g); g.connect(dest); o.start(s); o.stop(s + t.d + 0.02);
  }
  music(name: string | null): void {
    this.wanted = name;
    if (!this.ctx) return;
    if (this.track === name) return;
    this.track = name;
    if (this.timer !== null) { clearInterval(this.timer); this.timer = null; }
    if (!name || !TRACKS[name]) return;
    this.step = 0; this.nextTime = this.ctx.currentTime + 0.05;
    this.timer = window.setInterval(() => this.schedule(), 100);
  }
  private schedule(): void {
    if (!this.ctx || !this.musicGain || !this.track) return;
    const tr = TRACKS[this.track];
    const stepDur = 60 / tr.bpm / 2;
    while (this.nextTime < this.ctx.currentTime + 0.3) {
      const n = tr.notes[this.step % tr.notes.length];
      if (n !== null && n !== undefined && !this.vol.muted) this.tone(this.musicGain, { f: N(n), d: stepDur * 1.6, t: tr.wave, v: 0.5 }, this.nextTime);
      const b = tr.bass?.[this.step % (tr.bass?.length ?? 1)];
      if (b !== null && b !== undefined) this.tone(this.musicGain, { f: N(b - 12), d: stepDur * 3, t: 'sine', v: 0.6 }, this.nextTime);
      this.nextTime += stepDur; this.step++;
    }
  }
  stopAll(): void { if (this.timer !== null) { clearInterval(this.timer); this.timer = null; } this.track = null; }
}
export const audio = new AudioEngine();
