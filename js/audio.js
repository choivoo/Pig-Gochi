// WebAudio 합성 효과음 + 간단한 BGM (외부 파일 없음)
let ctx = null, master = null, bgmGain = null, sfxVol = 0.8, bgmVol = 0.5, bgmTimer = null, bgmOn = false;

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 1; master.connect(ctx.destination);
    bgmGain = ctx.createGain(); bgmGain.gain.value = bgmVol * 0.18; bgmGain.connect(master);
  } catch (e) { ctx = null; }
}
export function setVolumes(sfx, bgm) {
  sfxVol = sfx; bgmVol = bgm;
  if (bgmGain) bgmGain.gain.value = bgm * 0.18;
}
function tone(freq, dur, type = 'sine', vol = 0.3, slide = 0, delay = 0, dest = null) {
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * (dest ? 1 : sfxVol)), t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(dest || master); o.start(t0); o.stop(t0 + dur + 0.02);
}
function noise(dur, vol = 0.2, hp = 800, delay = 0) {
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = ctx.createBufferSource(); s.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
  const g = ctx.createGain(); g.gain.value = vol * sfxVol;
  s.connect(f); f.connect(g); g.connect(master); s.start(t0);
}
export const sfx = {
  click: () => tone(660, 0.06, 'triangle', 0.18),
  back: () => tone(420, 0.07, 'triangle', 0.15),
  pull: (p) => tone(180 + p * 380, 0.05, 'sine', 0.06),
  launch: (p) => { tone(240 + p * 120, 0.12, 'square', 0.14, -120); noise(0.1, 0.12, 1500); },
  hit: (i) => { // i: 0~1
    tone(150 + i * 80, 0.1, 'square', 0.12 + i * 0.16, -80); noise(0.06 + i * 0.1, 0.1 + i * 0.2, 400);
  },
  wall: () => tone(300, 0.05, 'triangle', 0.1),
  fall: () => { tone(500, 0.6, 'sine', 0.25, -420); },
  thud: () => { tone(110, 0.15, 'sine', 0.3, -50); },
  crit: () => { tone(1200, 0.12, 'triangle', 0.2, 600); tone(1700, 0.15, 'sine', 0.15, 0, 0.07); },
  combo: (n) => tone(440 * Math.pow(1.122, Math.min(n, 10) * 2), 0.14, 'triangle', 0.22),
  pin: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'square', 0.16, 0, i * 0.07)); },
  coin: () => { tone(988, 0.07, 'square', 0.12); tone(1319, 0.14, 'square', 0.12, 0, 0.06); },
  win: () => { [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', 0.25, 0, i * 0.11)); },
  lose: () => { [392, 349, 311, 262].forEach((f, i) => tone(f, 0.25, 'sawtooth', 0.12, 0, i * 0.17)); },
  levelup: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.15, 'triangle', 0.22, 0, i * 0.08)); },
  gacha: () => { for (let i = 0; i < 6; i++) { noise(0.05, 0.15, 2500, i * 0.09); tone(300 + i * 30, 0.05, 'square', 0.08, 0, i * 0.09); } },
  gachaGet: (rank) => { [0, 1, 2].forEach((i) => tone(600 + rank * 150 + i * 200, 0.3, 'triangle', 0.25, 0, i * 0.1)); },
  skill: () => { tone(400, 0.2, 'sawtooth', 0.14, 500); },
  bell: () => { tone(1046, 0.8, 'sine', 0.2); tone(1568, 0.8, 'sine', 0.1); },
};

// 펜타토닉 BGM (학교 멜로디언 느낌)
const PENTA = [262, 294, 330, 392, 440, 523, 587, 659];
let step = 0;
const PATTERN = [0, 2, 4, 2, 5, 4, 2, 3, 0, 2, 4, 5, 7, 5, 4, 2];
export function startBgm() {
  if (!ctx || bgmOn) return;
  bgmOn = true;
  const tick = () => {
    if (!bgmOn) return;
    const n = PATTERN[step % PATTERN.length];
    tone(PENTA[n], 0.34, 'triangle', 0.5, 0, 0, bgmGain);
    if (step % 4 === 0) tone(PENTA[n] / 2, 0.5, 'sine', 0.5, 0, 0, bgmGain);
    step++;
    bgmTimer = setTimeout(tick, 330);
  };
  tick();
}
export function stopBgm() { bgmOn = false; clearTimeout(bgmTimer); }
export const vibrate = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* 미지원 */ } };
