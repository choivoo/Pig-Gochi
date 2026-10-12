import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { audio } from '../audio/audio';
import { PET_META, assetUrl } from '../game/render/assets';

export function Icon({ name, size = 'md', alt = '' }: { name: string; size?: 'xs' | 'sm' | 'md' | 'lg'; alt?: string }) {
  return <img className={`px-icon ${size === 'md' ? '' : size}`} src={assetUrl(`assets/ui/icon_${name}.png`)} alt={alt} aria-hidden={alt ? undefined : true} draggable={false} />;
}
export function Img({ src, size, className = '', alt = '' }: { src: string; size?: number; className?: string; alt?: string }) {
  return <img className={className} src={assetUrl(src)} alt={alt} aria-hidden={alt ? undefined : true} draggable={false} style={size ? { width: size, height: size, imageRendering: 'pixelated' } : { imageRendering: 'pixelated' }} />;
}

/** Shows one frame of a pet/egg sprite sheet at an integer scale. */
export function PetThumb({ speciesId, frame = 0, scale = 2, silhouette = false, className = '' }: { speciesId: string; frame?: number; scale?: number; silhouette?: boolean; className?: string }) {
  const isEgg = speciesId.startsWith('egg_');
  const S = isEgg ? 32 : (PET_META[speciesId]?.size ?? 32);
  const frames = isEgg ? 5 : 8;
  const st: CSSProperties = {
    width: S * scale, height: S * scale, backgroundImage: `url(${assetUrl(`assets/pets/${speciesId}.png`)})`, backgroundSize: `${S * frames * scale}px ${S * scale}px`,
    backgroundPosition: `-${frame * S * scale}px 0`, imageRendering: 'pixelated', backgroundRepeat: 'no-repeat', flex: 'none',
  };
  return <div className={`${silhouette ? 'silhouette' : ''} ${className}`} style={st} role="img" aria-label={silhouette ? '아직 발견하지 못한 생명체' : speciesId} />;
}

export function StatBar({ value, color, invert = false }: { value: number; color: string; invert?: boolean }) {
  const v = Math.max(0, Math.min(100, value));
  const low = invert ? v > 75 : v < 25;
  return (
    <div className={`bar ${low ? 'low' : ''}`} style={{ color }} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v)}>
      <i style={{ width: `${v}%` }} />
    </div>
  );
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';
export function Modal({ title, onClose, children, wide = false, icon }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean; icon?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const prev = useRef<Element | null>(null);
  useEffect(() => {
    prev.current = document.activeElement;
    const first = ref.current?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
      if (e.key === 'Tab' && ref.current) {
        const els = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (els.length === 0) return;
        const f = els[0], l = els[els.length - 1];
        if (e.shiftKey && document.activeElement === f) { e.preventDefault(); l.focus(); }
        else if (!e.shiftKey && document.activeElement === l) { e.preventDefault(); f.focus(); }
      }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); (prev.current as HTMLElement | null)?.focus?.(); };
  }, [onClose]);
  return (
    <div className="overlay" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`sheet ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <header>
          {icon && <Icon name={icon} size="sm" />}
          <h2>{title}</h2>
          <button className="btn small icon-only" onClick={() => { audio.sfx('click'); onClose(); }} aria-label="닫기"><Icon name="close" size="xs" /></button>
        </header>
        <div className="body">{children}</div>
      </div>
    </div>
  );
}

export const btnClick = (fn?: () => void) => () => { audio.sfx('click'); fn?.(); };
