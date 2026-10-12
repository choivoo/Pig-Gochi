import { useEffect, useRef, useState } from 'react';
import { audio } from '../../audio/audio';
import { activePet } from '../../game/core/progress';
import { drawPet, img, PET_META } from '../../game/render/assets';
import { useGame } from '../../stores/gameStore';

interface Foam { x: number; y: number; r: number }
interface Drop { x: number; y: number; v: number }

/** Interactive bath: rub the foam away with finger/mouse. Cleanliness is applied once, when done. */
export function BathScene({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const save = useGame((s) => s.save);
  const bathe = useGame((s) => s.bathe);
  const pet = save && activePet(save);
  const [left, setLeft] = useState(100);
  const [done, setDone] = useState(false);
  const foam = useRef<Foam[]>([]);
  const total = useRef(1);
  const finished = useRef(false);

  useEffect(() => {
    if (!pet || pet.stage === 'egg') { onClose(); return; }
    if (pet.sleeping) { useGame.getState().toast('자고 있을 땐 목욕할 수 없어요.', undefined, 'error'); onClose(); return; }
    if (pet.stats.cleanliness >= 90) { useGame.getState().toast('이미 반짝반짝 깨끗해요!', undefined, 'error'); onClose(); return; }
    const S = PET_META[pet.speciesId]?.size ?? 32;
    const arr: Foam[] = [];
    for (let i = 0; i < 12; i++) arr.push({ x: 96 - S * 0.45 + ((i * 37) % 100) / 100 * S * 0.9, y: 114 - S * 0.7 + ((i * 53) % 100) / 100 * S * 0.6, r: 6 + (i % 3) * 2 });
    foam.current = arr;
    total.current = arr.length;
    audio.sfx('open');
  }, []);

  useEffect(() => {
    const c = ref.current;
    if (!c || !pet) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const drops: Drop[] = Array.from({ length: 14 }, (_, i) => ({ x: 20 + (i % 4) * 4, y: 30 + ((i * 11) % 40), v: 0.6 + (i % 3) * 0.2 }));
    let raf = 0;
    const reduced = save?.settings.reducedMotion;
    const loop = (t: number) => {
      ctx.setTransform(c.width / 192, 0, 0, c.height / 160, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#bfe8ff'; ctx.fillRect(0, 0, 192, 160);
      ctx.fillStyle = '#e6f6ff'; ctx.fillRect(0, 104, 192, 56);
      // shower
      ctx.fillStyle = '#9aa7b8'; ctx.fillRect(14, 8, 26, 5); ctx.fillRect(10, 8, 5, 40); ctx.fillStyle = '#6a7788'; ctx.fillRect(14, 13, 26, 3);
      ctx.fillStyle = '#7fd0ff';
      if (!reduced) for (const d of drops) { d.y += d.v; if (d.y > 112) d.y = 18; ctx.fillRect(Math.round(d.x), Math.round(d.y), 1, 3); }
      // tub back
      ctx.fillStyle = '#ffffff'; ctx.fillRect(40, 96, 112, 44); ctx.fillStyle = '#c8dff0'; ctx.fillRect(40, 96, 112, 4);
      ctx.fillStyle = '#7fd0ff'; ctx.fillRect(44, 104, 104, 30);
      const S = PET_META[pet.speciesId]?.size ?? 32;
      drawPet(ctx, pet.speciesId, { x: 96, y: 112 + (S > 40 ? 0 : 4), frame: Math.floor(t / 400) % 2 ? 'happy' : 'idle0' });
      // water front
      ctx.fillStyle = 'rgba(127,208,255,0.55)'; ctx.fillRect(44, 112, 104, 22);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(36, 134, 120, 8); ctx.fillStyle = '#c8dff0'; ctx.fillRect(36, 140, 120, 3);
      const f = img('assets/effects/foam.png');
      if (f) for (const b of foam.current) ctx.drawImage(f, Math.round(b.x - 8), Math.round(b.y - 8));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [pet, save?.settings.reducedMotion]);

  const rub = (e: React.PointerEvent) => {
    if (e.buttons === 0 && e.pointerType === 'mouse') return;
    const c = ref.current;
    if (!c || finished.current) return;
    const r = c.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 192, y = ((e.clientY - r.top) / r.height) * 160;
    const before = foam.current.length;
    foam.current = foam.current.filter((b) => Math.hypot(b.x - x, b.y - y) > 14);
    if (foam.current.length !== before) {
      audio.sfx('bath');
      setLeft(Math.round((foam.current.length / total.current) * 100));
      if (foam.current.length === 0) finish();
    }
  };
  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    const r = bathe();
    setDone(true);
    if (r.ok) setTimeout(() => { onClose(); }, 1300);
    else onClose();
  };
  if (!pet) return null;
  return (
    <div className="mg-wrap" role="dialog" aria-modal="true" aria-label="목욕">
      <div className="mg-bar"><b style={{ flex: 1 }}>{done ? '다 씻었어요! 뽀득뽀득 ✨' : `거품을 문질러 씻겨 주세요! (남은 거품 ${left}%)`}</b>
        <button className="btn small" onClick={() => { if (!finished.current && foam.current.length < total.current) finish(); else onClose(); }}>{foam.current.length < total.current && !done ? '바로 마치기' : '닫기'}</button></div>
      <div className="mg-canvas">
        <canvas ref={ref} width={576} height={480} style={{ width: 'min(100%, 70dvh * 1.2)', maxHeight: '100%', aspectRatio: '192 / 160' }} onPointerMove={rub} onPointerDown={rub} aria-label="목욕 장면. 거품을 문질러 보세요." />
      </div>
    </div>
  );
}
