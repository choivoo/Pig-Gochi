#!/usr/bin/env python3
"""Generates every PIXEL LIFE sprite as a real PNG into public/assets and writes the manifest.
Run: npm run assets:gen   (requires Pillow)."""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image
from pix import *
import pets, items

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUTD = os.path.join(ROOT, 'public', 'assets')
manifest = []

def save(img, rel, w, h, frames=1, use='', kind=''):
    p = os.path.join(OUTD, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    img = img.im if isinstance(img, Cv) else img
    img.save(p, optimize=True)
    manifest.append(dict(path='assets/' + rel, w=w, h=h, frames=frames, kind=kind, use=use, source='procedural (scripts/assets)', license='original, project-owned (CC0)'))

def main():
    import shutil
    if os.path.isdir(OUTD):
        shutil.rmtree(OUTD)  # no stale sprites survive a regeneration
    anchors = {}
    for n, sp in pets.PETS.items():
        sh, a = pets.pet_sheet(n)
        S = sp['size']
        save(sh, f'pets/{n}.png', S, S, len(pets.FRAMES), f'pet:{n}', 'pet-sheet')
        anchors[n] = dict(size=S, frames=pets.FRAMES, anchors=a, float=bool(sp.get('float')))
    for k in items.EGGS:
        save(items.egg_sheet(k), f'pets/egg_{k}.png', 32, 32, 5, f'egg:{k}', 'egg-sheet')
    for k in items.ROOMS:
        save(items.room(k), f'rooms/{k}.png', 192, 160, 1, f'room:{k}', 'room')
    fm = {}
    for k, (w, h, fn, meta) in items.FURN.items():
        save(mk_(w, h, fn), f'furniture/{k}.png', w, h, 1, f'furniture:{k}', 'furniture'); fm[k] = dict(w=w, h=h, **meta)
    am = {}
    for k, (slot, name, fn) in items.ACC.items():
        save(mk_(16, 16, fn), f'accessories/{k}.png', 16, 16, 1, f'accessory:{k}', 'accessory'); am[k] = dict(slot=slot, name=name)
    for k, fn in items.FOOD.items():
        save(mk_(16, 16, fn), f'food/{k}.png', 16, 16, 1, f'food:{k}', 'food')
    for k, fn in items.ICON.items():
        save(mk_(16, 16, fn), f'ui/icon_{k}.png', 16, 16, 1, f'icon:{k}', 'icon')
    for k, fn in items.EFFECT.items():
        save(mk_(16, 16, fn), f'effects/{k}.png', 16, 16, 1, f'effect:{k}', 'effect')
    for k, (w, h, fn) in items.MG.items():
        save(mk_(w, h, fn), f'minigames/{k}.png', w, h, 1, f'minigame:{k}', 'minigame')
    save(items.logo(), 'ui/logo.png', 104, 56, 1, 'title logo', 'logo')
    save(items.title_bg(), 'ui/title_bg.png', 192, 160, 1, 'title background', 'background')
    for i in range(3):
        save(items.cloud(i), f'ui/cloud{i}.png', 40, 18, 1, 'title/window clouds', 'effect')
    ic = items.pwa_icon()
    for sz in (192, 512):
        os.makedirs(os.path.join(ROOT, 'public', 'icons'), exist_ok=True)
        ic.im.resize((sz, sz), Image.NEAREST).save(os.path.join(ROOT, 'public', 'icons', f'icon-{sz}.png'))
        manifest.append(dict(path=f'icons/icon-{sz}.png', w=sz, h=sz, frames=1, kind='pwa', use='manifest.json', source='procedural', license='original'))
    # maskable: egg scaled into the safe zone on a solid bg
    mk = Image.new('RGBA', (512, 512), (255, 201, 214, 255))
    small = ic.im.resize((320, 320), Image.NEAREST)
    mk.alpha_composite(small, (96, 96)); mk.save(os.path.join(ROOT, 'public', 'icons', 'icon-maskable-512.png'))
    manifest.append(dict(path='icons/icon-maskable-512.png', w=512, h=512, frames=1, kind='pwa', use='manifest.json', source='procedural', license='original'))
    ic.im.resize((32, 32), Image.NEAREST).save(os.path.join(ROOT, 'public', 'favicon.png'))
    manifest.append(dict(path='favicon.png', w=32, h=32, frames=1, kind='pwa', use='index.html', source='procedural', license='original'))
    with open(os.path.join(OUTD, 'manifest.json'), 'w') as f:
        json.dump(dict(version=1, assets=manifest), f, indent=1)
    meta_dir = os.path.join(ROOT, 'src', 'data', 'generated')
    os.makedirs(meta_dir, exist_ok=True)
    with open(os.path.join(meta_dir, 'spriteMeta.json'), 'w') as f:
        json.dump(dict(pets=anchors, furniture=fm, accessories=am, window=list(items.WIN), floorY=items.FLOOR_Y), f, indent=1)
    # markdown report
    md = ['# 에셋 매니페스트 (자동 생성)', '', '`npm run assets:gen` 으로 생성됩니다. 모든 에셋은 Pillow 기반 프로그래밍 방식(절차적 도트아트)으로 제작되었으며 외부 이미지 에셋/모델을 사용하지 않았습니다.', '',
          '| 경로 | 크기 | 프레임 | 종류 | 사용 위치 |', '|---|---|---|---|---|']
    for m in manifest:
        md.append(f"| {m['path']} | {m['w']}×{m['h']} | {m['frames']} | {m['kind']} | {m['use']} |")
    os.makedirs(os.path.join(ROOT, 'docs', 'art'), exist_ok=True)
    open(os.path.join(ROOT, 'docs', 'art', 'asset-manifest.md'), 'w').write('\n'.join(md) + '\n')
    print('generated', len(manifest), 'assets')

def mk_(w, h, fn):
    c = Cv(w, h); fn(c); c.outline(); return c

if __name__ == '__main__':
    main()
