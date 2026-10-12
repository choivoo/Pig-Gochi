import meta from '../../data/generated/spriteMeta.json';

const base = (p: string): string => `${import.meta.env.BASE_URL}${p}`;
const cache = new Map<string, HTMLImageElement>();

export const PET_FRAMES = meta.pets.mongle.frames as string[];
export type PetMeta = { size: number; frames: string[]; float: boolean; anchors: Record<'head' | 'face' | 'neck' | 'side' | 'feet', number[]> };
export const PET_META = meta.pets as unknown as Record<string, PetMeta>;

export function loadImage(path: string): Promise<HTMLImageElement> {
  const hit = cache.get(path);
  if (hit && hit.complete) return Promise.resolve(hit);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { cache.set(path, img); resolve(img); };
    img.onerror = () => { console.error('[assets] failed to load', path); cache.set(path, img); resolve(img); };
    img.src = base(path);
  });
}

export function img(path: string): HTMLImageElement | undefined {
  const i = cache.get(path);
  return i && i.complete && i.naturalWidth > 0 ? i : undefined;
}
export const assetUrl = base;

interface ManifestEntry { path: string; kind: string }
let preloadPromise: Promise<void> | null = null;
export function preloadAll(onProgress?: (done: number, total: number) => void): Promise<void> {
  if (preloadPromise) return preloadPromise;
  preloadPromise = (async () => {
    const res = await fetch(base('assets/manifest.json'));
    const mf = (await res.json()) as { assets: ManifestEntry[] };
    const list = mf.assets.filter((a) => a.path.startsWith('assets/'));
    let done = 0;
    await Promise.all(list.map((a) => loadImage(a.path).then(() => { done++; onProgress?.(done, list.length); })));
  })();
  return preloadPromise;
}

export function frameIndex(speciesId: string, frame: string): number {
  const m = PET_META[speciesId];
  const i = m ? m.frames.indexOf(frame) : 0;
  return i < 0 ? 0 : i;
}

export interface DrawPetOpts { x: number; y: number; frame: string; flip?: boolean; alpha?: number; accessories?: Partial<Record<string, string>>; whiteout?: number; scale?: number; }
/** Draws a pet with its feet at (x,y) (x = horizontal centre). */
export function drawPet(ctx: CanvasRenderingContext2D, speciesId: string, o: DrawPetOpts): void {
  const m = PET_META[speciesId];
  if (speciesId.startsWith('egg_')) { drawEgg(ctx, speciesId, o); return; }
  const sheet = img(`assets/pets/${speciesId}.png`);
  if (!m || !sheet) return;
  const S = m.size;
  const sc = o.scale ?? 1;
  const fi = frameIndex(speciesId, o.frame);
  const dx = Math.round(o.x - (S * sc) / 2);
  const dy = Math.round(o.y - (m.anchors.feet[1] + 1) * sc);
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
  if (o.flip) { ctx.translate(Math.round(o.x) * 2, 0); ctx.scale(-1, 1); }
  ctx.drawImage(sheet, fi * S, 0, S, S, dx, dy, S * sc, S * sc);
  if (o.whiteout && o.whiteout > 0) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.globalAlpha = Math.min(1, o.whiteout);
    ctx.fillStyle = '#fff';
    ctx.fillRect(dx, dy, S * sc, S * sc);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
  if (o.accessories) drawAccessories(ctx, speciesId, o, dx, dy);
}

function drawAccessories(ctx: CanvasRenderingContext2D, speciesId: string, o: DrawPetOpts, dx: number, dy: number): void {
  const m = PET_META[speciesId];
  const sc = o.scale ?? 1;
  const dir = o.flip ? -1 : 1;
  for (const [slot, id] of Object.entries(o.accessories ?? {})) {
    if (!id) continue;
    const im = img(`assets/accessories/${id}.png`);
    if (!im) continue;
    const a = m.anchors;
    let ax: number, ay: number;
    if (slot === 'head') { ax = a.head[0]; ay = a.head[1] + 4; }
    else if (slot === 'face') { ax = a.face[0]; ay = a.face[1] - 1; }
    else if (slot === 'neck') { ax = a.neck[0]; ay = a.neck[1] - 3; }
    else { ax = a.side[0]; ay = a.side[1]; }
    // head items sit on top of the head (bottom-centre anchored); others are centred
    const w = im.width, h = im.height;
    const ox = slot === 'side' ? ax - w / 2 : ax - w / 2;
    const oy = slot === 'head' ? ay - h : ay - h / 2;
    const cx = o.flip ? m.size - (ox + w) : ox;
    void dir;
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
    if (o.flip && slot !== 'head' && slot !== 'face' && slot !== 'neck') { /* side items mirror with the pet */ }
    ctx.drawImage(im, Math.round(dx + cx * sc), Math.round(dy + oy * sc), w * sc, h * sc);
    ctx.restore();
  }
}

function drawEgg(ctx: CanvasRenderingContext2D, id: string, o: DrawPetOpts): void {
  const sheet = img(`assets/pets/${id}.png`);
  if (!sheet) return;
  const idx = ({ idle: 0, wobbleL: 1, wobbleR: 2, crack1: 3, crack2: 4 } as Record<string, number>)[o.frame] ?? 0;
  const sc = o.scale ?? 1;
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
  ctx.drawImage(sheet, idx * 32, 0, 32, 32, Math.round(o.x - 16 * sc), Math.round(o.y - 30 * sc), 32 * sc, 32 * sc);
  ctx.restore();
}
