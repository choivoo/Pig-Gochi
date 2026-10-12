import type { SaveData } from '../types';
import { normalizeSave } from './migrate';

const DB_NAME = 'pixel-life';
const STORE = 'kv';
const MIRROR_KEY = 'pixel-life-mirror-v1';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB unavailable'));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbGet(key: string): Promise<unknown> {
  const db = await openDb();
  return new Promise((res, rej) => {
    const r = db.transaction(STORE).objectStore(STORE).get(key);
    r.onsuccess = () => { db.close(); res(r.result); };
    r.onerror = () => { db.close(); rej(r.error); };
  });
}
async function idbPut(entries: Record<string, unknown>): Promise<void> {
  const db = await openDb();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    const st = tx.objectStore(STORE);
    for (const [k, v] of Object.entries(entries)) st.put(v, k);
    tx.oncomplete = () => { db.close(); res(); };
    tx.onerror = () => { db.close(); rej(tx.error); };
    tx.onabort = () => { db.close(); rej(tx.error); };
  });
}
async function idbDelete(): Promise<void> {
  const db = await openDb();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => { db.close(); res(); };
    tx.onerror = () => { db.close(); rej(tx.error); };
  });
}

function readMirror(): unknown {
  try { const t = localStorage.getItem(MIRROR_KEY); return t ? JSON.parse(t) : undefined; } catch { return undefined; }
}
function writeMirror(save: SaveData): void {
  try { localStorage.setItem(MIRROR_KEY, JSON.stringify(save)); } catch { /* quota / privacy mode */ }
}

export interface Loaded { save: SaveData; recovered: boolean; messages: string[] }

/** main -> backup -> localStorage mirror; newest valid save wins. Corrupt data never crashes startup. */
export async function loadSave(now = Date.now()): Promise<Loaded | null> {
  const candidates: { src: string; data: unknown }[] = [];
  try { candidates.push({ src: 'main', data: await idbGet('main') }); } catch { /* ignore */ }
  try { candidates.push({ src: 'backup', data: await idbGet('backup') }); } catch { /* ignore */ }
  candidates.push({ src: 'mirror', data: readMirror() });
  let best: { save: SaveData; src: string; msgs: string[] } | null = null;
  let sawCorrupt = false;
  for (const c of candidates) {
    if (c.data === undefined || c.data === null) continue;
    const r = normalizeSave(c.data, now);
    if (!r.ok || !r.save) { sawCorrupt = true; continue; }
    if (!best || r.save.lastSavedAt > best.save.lastSavedAt) best = { save: r.save, src: c.src, msgs: r.errors };
  }
  if (!best) return null;
  return { save: best.save, recovered: sawCorrupt || best.src === 'backup', messages: best.msgs };
}

let lastGood: SaveData | null = null;
export async function writeSave(save: SaveData): Promise<void> {
  writeMirror(save);
  try {
    const entries: Record<string, unknown> = { main: save };
    if (lastGood) entries.backup = lastGood;
    await idbPut(entries);
    lastGood = save;
  } catch { /* mirror already written */ }
}

export async function clearSave(): Promise<void> {
  lastGood = null;
  try { await idbDelete(); } catch { /* ignore */ }
  try { localStorage.removeItem(MIRROR_KEY); } catch { /* ignore */ }
}

export function exportJson(save: SaveData): string {
  return JSON.stringify({ format: 'pixel-life-save', version: save.schemaVersion, exportedAt: Date.now(), data: save }, null, 1);
}

export function parseImport(text: string): { ok: boolean; save?: SaveData; error?: string } {
  let obj: unknown;
  try { obj = JSON.parse(text); } catch { return { ok: false, error: 'JSON 형식이 올바르지 않아요.' }; }
  if (typeof obj !== 'object' || obj === null) return { ok: false, error: '저장 파일 형식이 아니에요.' };
  const wrapped = obj as { format?: string; data?: unknown };
  const data = wrapped.format === 'pixel-life-save' ? wrapped.data : obj;
  const r = normalizeSave(data);
  if (!r.ok || !r.save) return { ok: false, error: r.errors[0] ?? '저장 데이터를 읽을 수 없어요.' };
  return { ok: true, save: r.save };
}

export function mirrorNow(save: SaveData): void { writeMirror(save); }
