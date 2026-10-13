import { useEffect, useRef, useState } from 'react';
import { audio } from '../audio/audio';
import { SPECIES } from '../data/pets';
import { drawPet, img } from '../game/render/assets';
import { useGame } from '../stores/gameStore';
import { euro, iga } from '../utils/josa';

const SIZE = 128;
interface Particle { x: number; y: number; vx: number; vy: number; c: string }

/** Hatch / evolution scene drawn on a small canvas (scaled up with nearest-neighbour). Skippable. */
export function CinematicOverlay() {
  const cine = useGame((s) => s.cinematic);
  const dismiss = useGame((s) => s.dismissCinematic);
  const reduced = useGame((s) => s.save?.settings.reducedMotion ?? false);
  const petName = useGame((s) => { const a = s.save?.activePetId; return a ? s.save?.ownedPets[a]?.name ?? '' : ''; });
  const ref = useRef<HTMLCanvasElement>(null);
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState(false);
  const total = cine?.kind === 'hatch' ? 4200 : 6200;
  const finalMsg = !cine ? '' : cine.kind === 'hatch' ? `${iga(petName)} 태어났어요!\n${SPECIES[cine.to]?.name ?? ''}의 모습이에요.` : `축하해요!\n${iga(petName)} ${euro(SPECIES[cine.to]?.name ?? '')} 성장했어요!`;

  useEffect(() => {
    if (!cine) return;
    setDone(false);
    setMsg('');
    audio.music(cine.kind === 'evolve' ? 'evolve' : null);
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    const parts: Particle[] = [];
    let raf = 0;
    const t0 = performance.now();
    let flashed = false;
    const baby = cine.to;
    const draw = (now: number) => {
      const t = reduced ? total : now - t0;
      ctx.clearRect(0, 0, SIZE, SIZE);
      ctx.fillStyle = cine.kind === 'evolve' ? '#0e1030' : '#1a1440';
      ctx.fillRect(0, 0, SIZE, SIZE);
      for (let i = 0; i < 26; i++) { ctx.fillStyle = '#fff6c0'; if ((Math.floor(t / 300) + i) % 4 !== 0) ctx.fillRect((i * 37) % SIZE, (i * 53) % SIZE, 1, 1); }
      if (cine.kind === 'hatch') {
        const egg = `egg_${cine.eggType.replace('egg_', '')}`;
        if (t < 2800) {
          const shake = Math.floor(t / 90) % 2 === 0 ? 'wobbleL' : 'wobbleR';
          drawPet(ctx, egg, { x: 64, y: 96, frame: t < 1000 ? 'idle' : t < 1900 ? shake : 'crack1' });
          if (t > 1900) drawPet(ctx, egg, { x: 64, y: 96, frame: 'crack2', alpha: Math.min(1, (t - 1900) / 900) });
        } else if (t < 3100) {
          ctx.fillStyle = `rgba(255,255,255,${1 - Math.abs(t - 2950) / 150})`; ctx.fillRect(0, 0, SIZE, SIZE);
          if (!flashed) { flashed = true; for (let i = 0; i < 40; i++) parts.push({ x: 64, y: 80, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.7) * 3, c: ['#ffd84d', '#ff9db8', '#b8e8d1', '#ffffff'][i % 4] }); audio.sfx('hatch'); }
        } else drawPet(ctx, baby, { x: 64, y: 100 - Math.abs(Math.sin((t - 3100) / 140)) * (t < 3900 ? 8 : 0), frame: 'happy' });
        if (t > 3100 && !msg) setMsg(`${iga(petName)} 태어났어요!\n${SPECIES[baby]?.name ?? ''}의 모습이에요.`);
      } else {
        const from = cine.from, to = cine.to;
        const k = t / total;
        ctx.fillStyle = `rgba(0,0,0,${Math.min(0.6, k * 3)})`; ctx.fillRect(0, 0, SIZE, SIZE);
        if (t < 2600) {
          const shiver = Math.floor(t / 70) % 2;
          drawPet(ctx, from, { x: 64 + shiver, y: 100 - Math.min(10, t / 150), frame: 'idle0', whiteout: Math.min(1, t / 2600) });
          if (parts.length < 60) for (let i = 0; i < 2; i++) { const a = Math.random() * Math.PI * 2; parts.push({ x: 64 + Math.cos(a) * 60, y: 80 + Math.sin(a) * 60, vx: 0, vy: 0, c: ['#fff6a8', '#ffd0e8', '#bfe8ff'][i % 3] }); }
          for (const p of parts) { p.x += (64 - p.x) * 0.06; p.y += (80 - p.y) * 0.06; }
        } else if (t < 3400) {
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, SIZE, SIZE);
          if (!flashed) { flashed = true; parts.length = 0; for (let i = 0; i < 50; i++) parts.push({ x: 64, y: 80, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.7) * 4, c: ['#ffd84d', '#ff9db8', '#b8e8d1', '#ffffff'][i % 4] }); audio.sfx('achieve'); }
        } else {
          const a = Math.min(1, (t - 3400) / 600);
          drawPet(ctx, to, { x: 64, y: 100 - Math.abs(Math.sin((t - 3400) / 160)) * (t < 4400 ? 8 : 0), frame: 'happy', whiteout: 1 - a });
        }
        if (t > 3400 && !msg) setMsg(`축하해요!\n${iga(petName)} ${euro(SPECIES[to]?.name ?? '')} 성장했어요!`);
      }
      for (const p of parts) { if (flashed) { p.x += p.vx; p.y += p.vy; p.vy += 0.05; } ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2); }
      const star = img('assets/effects/sparkle.png');
      if (star && t > 3400) ctx.drawImage(star, 8 + ((t / 40) % 100), 10 + Math.sin(t / 200) * 6);
      if (t >= total) { setDone(true); return; }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); audio.music(null); };
  }, [cine]);

  useEffect(() => { if (done) setMsg((m) => m || '…'); }, [done]);
  if (!cine) return null;
  const close = () => { dismiss(); useGame.getState().say([cine.kind === 'hatch' ? 'hatch' : 'evolved'], true); };
  return (
    <div className="cine" role="dialog" aria-modal="true" aria-label={cine.kind === 'hatch' ? '부화' : '진화'} onKeyDown={(e) => { if (e.key === 'Escape') close(); }}>
      <canvas ref={ref} width={SIZE} height={SIZE} />
      <div className="msg" style={{ whiteSpace: 'pre-line' }} aria-live="polite">{msg}</div>
      <div className="row">
        {!done && <button className="btn" onClick={() => { setMsg(finalMsg); setDone(true); }}>건너뛰기</button>}
        <button className="btn pink" onClick={close} disabled={!done && !msg}>{done ? '확인' : '계속'}</button>
      </div>
    </div>
  );
}
