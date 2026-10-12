import { useEffect, useRef } from 'react';
import { drawPet } from '../game/render/assets';
import type { AccSlot } from '../types';

export function PetPreview({ speciesId, accessories, scale = 3, frame = 'idle0' }: { speciesId: string; accessories?: Partial<Record<AccSlot, string>>; scale?: number; frame?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    const t0 = performance.now();
    const loop = (now: number) => {
      ctx.imageSmoothingEnabled = false;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.clearRect(0, 0, 64, 64);
      const bob = Math.floor((now - t0) / 500) % 2;
      drawPet(ctx, speciesId, { x: 32, y: 60, frame: bob ? 'idle1' : frame, accessories });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [speciesId, accessories, scale, frame]);
  return <canvas ref={ref} width={64 * scale} height={64 * scale} style={{ imageRendering: 'pixelated', background: '#fff3da', border: '3px solid var(--ink)', borderRadius: 8 }} aria-label="미리보기" />;
}
