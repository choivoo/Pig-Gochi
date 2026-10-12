#!/usr/bin/env node
// Asset validator: file existence, PNG validity, alpha channel, sizes, sprite-sheet integrity,
// oversize files, duplicate entries, unreferenced assets and the pixelated rendering filter.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname, basename } from 'node:path';

const root = new URL('../..', import.meta.url).pathname;
const pub = join(root, 'public');
const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

function readPng(path) {
  const b = readFileSync(path);
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (b.length < 33 || sig.some((v, i) => b[i] !== v)) return null;
  const w = b.readUInt32BE(16), h = b.readUInt32BE(20), colorType = b[25];
  let hasTrns = false, idat = 0, end = false;
  for (let o = 8; o + 8 <= b.length;) {
    const len = b.readUInt32BE(o), type = b.toString('ascii', o + 4, o + 8);
    if (type === 'tRNS') hasTrns = true;
    if (type === 'IDAT') idat++;
    if (type === 'IEND') end = true;
    o += 12 + len;
  }
  return { w, h, colorType, alpha: colorType === 6 || colorType === 4 || hasTrns, valid: idat > 0 && end, bytes: b.length };
}

const mfPath = join(pub, 'assets', 'manifest.json');
if (!existsSync(mfPath)) { console.error('manifest missing: run npm run assets:gen'); process.exit(1); }
const manifest = JSON.parse(readFileSync(mfPath, 'utf8')).assets;

const seen = new Set();
for (const a of manifest) {
  if (seen.has(a.path)) err(`duplicate manifest entry: ${a.path}`);
  seen.add(a.path);
  const p = join(pub, a.path);
  if (!existsSync(p)) { err(`missing file: ${a.path}`); continue; }
  const info = readPng(p);
  if (!info) { err(`not a valid PNG: ${a.path}`); continue; }
  if (!info.valid) err(`truncated/corrupt PNG: ${a.path}`);
  if (info.h !== a.h) err(`${a.path}: height ${info.h} != manifest ${a.h}`);
  if (info.w !== a.w * a.frames) err(`${a.path}: width ${info.w} != ${a.w}x${a.frames} frames`);
  if (a.frames > 1 && info.w % a.frames !== 0) err(`${a.path}: sheet width not divisible by frames`);
  if (!info.alpha && !['room', 'background'].includes(a.kind)) err(`${a.path}: no alpha channel`);
  if (info.bytes > 60 * 1024) warn(`large file (${(info.bytes / 1024).toFixed(1)} KB): ${a.path}`);
  if (info.w > 1024 || info.h > 1024) err(`texture too large: ${a.path} ${info.w}x${info.h}`);
}

// files on disk but not in manifest
const onDisk = walk(join(pub, 'assets')).filter((f) => extname(f) === '.png').map((f) => relative(pub, f));
for (const f of onDisk) if (!seen.has(f)) err(`unlisted asset (not in manifest): ${f}`);

// unreferenced assets: the id (file basename) must appear in source or data
const src = walk(join(root, 'src')).filter((f) => /\.(ts|tsx|json)$/.test(f)).map((f) => readFileSync(f, 'utf8')).join('\n');
const unref = [];
for (const a of manifest) {
  if (!a.path.startsWith('assets/')) continue;
  let id = basename(a.path, '.png').replace(/^icon_/, '').replace(/^egg_/, '');
  const kind = a.path.split('/')[1];
  if (id.startsWith('profile_')) { if (!src.includes('profile_')) unref.push(a.path); continue; }
  const rx = new RegExp(`['"\`/ ]${id}['"\`.]|${id}\\b`);
  if (kind === 'ui' && /^(logo|title_bg|cloud\d)$/.test(id)) { if (!src.includes(id.replace(/\d/, ''))) unref.push(a.path); continue; }
  if (!rx.test(src)) unref.push(a.path);
}
for (const u of unref) warn(`possibly unreferenced asset: ${u}`);

// pixelated filter present
const css = readFileSync(join(root, 'src/styles/global.css'), 'utf8');
if (!/image-rendering:\s*pixelated/.test(css)) err('global.css must set image-rendering: pixelated');
const ts = walk(join(root, 'src')).filter((f) => /\.ts$/.test(f)).map((f) => readFileSync(f, 'utf8')).join('\n');
if (!/imageSmoothingEnabled\s*=\s*false/.test(ts)) err('canvas code must disable imageSmoothingEnabled');

// PWA files
for (const f of ['manifest.json', 'sw.js', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png']) if (!existsSync(join(pub, f))) err(`PWA file missing: ${f}`);

console.log(`assets checked: ${manifest.length} manifest entries, ${onDisk.length} PNGs on disk`);
for (const w of warnings) console.log('warn:', w);
for (const e of errors) console.error('ERROR:', e);
if (errors.length) { console.error(`${errors.length} error(s)`); process.exit(1); }
console.log('asset check passed');
