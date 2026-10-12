"""Procedural pixel-art pets: 21 original creatures x 8 expression frames."""
import math
from pix import *

FRAMES = ['idle0', 'idle1', 'blink', 'happy', 'sad', 'sleep', 'eat', 'sick']
DARK = '#3a2a3e'

# rx/ry are fractions of the sprite size.  See docs/art/art-spec.md
PETS = {
 # ---- Starlight lineage
 'mongle':   dict(size=32, rx=.34, ry=.30, main='#fffaf2', shade='#e3d6f3', belly='#ffffff', cheek='#ffb3c7', ear='#fffaf2', ear_in='#ffc9d6', ears='round', tail='star', tail_c='#ffe27a', feet='#e3d6f3'),
 'mongsil':  dict(size=48, rx=.34, ry=.30, main='#ffe9ee', shade='#f4c2d3', belly='#fff7f9', cheek='#ff9db8', ear='#ffe9ee', ear_in='#ffb3c7', ears='round', tail='star', tail_c='#ffe27a', feet='#f4c2d3', extras=['sparkle']),
 'gureumi':  dict(size=48, rx=.33, ry=.26, main='#cfe9fb', shade='#9fcdf0', belly='#f4fbff', cheek='#ffc2d4', ears='none', tail='puff', tail_c='#f4fbff', body='cloud', float=True, extras=[]),
 'solbyeol': dict(size=64, rx=.33, ry=.29, main='#fffaf2', shade='#d9c8f3', belly='#fff3c9', cheek='#ffa8c2', ear='#fffaf2', ear_in='#ffc9d6', ears='round', tail='star', tail_c='#ffd84d', feet='#d9c8f3', extras=['starmark', 'sparkle', 'halo']),
 'daltsom':  dict(size=64, rx=.33, ry=.29, main='#b9a6e6', shade='#8d79c9', belly='#e4daf7', cheek='#f3a6d0', ear='#b9a6e6', ear_in='#e4daf7', ears='round', tail='puff', tail_c='#e4daf7', feet='#8d79c9', extras=['moonmark', 'sparkle']),
 'gureumwang': dict(size=64, rx=.34, ry=.26, main='#eaf6ff', shade='#a9d3f0', belly='#ffffff', cheek='#ffb3c7', ears='none', tail='puff', tail_c='#ffffff', body='cloud', float=True, extras=['crown']),
 'pokpungmong': dict(size=64, rx=.34, ry=.26, main='#8393b8', shade='#5b6a94', belly='#b9c4de', cheek='#ffd84d', ears='none', tail='lightning', tail_c='#ffe14a', body='cloud', float=True, extras=['bolt']),
 # ---- Flame lineage
 'toktok':   dict(size=32, rx=.33, ry=.29, main='#ffa65c', shade='#e8743b', belly='#ffd9a0', cheek='#ff7a6b', ear='#ffa65c', ear_in='#ffd9a0', ears='pointy', tail='flame', tail_c='#ff5a3c', tail_c2='#ffd84d', feet='#e8743b'),
 'bulssi':   dict(size=48, rx=.34, ry=.29, main='#ff7a4d', shade='#d9482e', belly='#ffc890', cheek='#ffd0a0', ear='#ff7a4d', ear_in='#ffc890', ears='pointy', tail='flame', tail_c='#ff3d2e', tail_c2='#ffd84d', feet='#d9482e', extras=['flamecrest']),
 'jeongikong': dict(size=48, rx=.27, ry=.35, main='#ffd84d', shade='#e8a800', belly='#fff2a8', cheek='#ff8a6b', ear='#ffd84d', ear_in='#fff2a8', ears='pointy', tail='lightning', tail_c='#ff9d2e', feet='#e8a800', extras=['bolt']),
 'hwayeomtori': dict(size=64, rx=.28, ry=.29, main='#ff8a3d', shade='#d9552a', belly='#ffd9a0', cheek='#ffd0a0', ears='none', tail='flame', tail_c='#ff4a2e', tail_c2='#ffd84d', feet='#e8a800', extras=['flamecrest', 'wings_flame', 'beak']),
 'jaetbitryong': dict(size=64, rx=.30, ry=.29, main='#a8a8bc', shade='#74748c', belly='#e8dccb', cheek='#ffb09a', ear='#a8a8bc', ear_in='#e8dccb', ears='none', tail='dragon', tail_c='#a8a8bc', tail_c2='#ff7a3d', feet='#74748c', extras=['horns', 'wings_bat', 'scales']),
 'beongaetto': dict(size=64, rx=.28, ry=.30, main='#fff0a0', shade='#ecc94b', belly='#fffbe0', cheek='#ffa08a', ear='#fff0a0', ear_in='#ffc2d4', ears='long', tail='lightning', tail_c='#ffb800', feet='#ecc94b', extras=['bolt']),
 'neonkaet': dict(size=64, rx=.32, ry=.28, main='#3f3a78', shade='#2b2757', belly='#6e68b8', cheek='#ff7ad9', ear='#3f3a78', ear_in='#ff7ad9', ears='cat', tail='glow', tail_c='#5af0ff', feet='#2b2757', extras=['neon'], eye='#5af0ff'),
 # ---- Nature lineage
 'mulkong':  dict(size=32, rx=.30, ry=.27, main='#9fe3c4', shade='#63c29b', belly='#dcf8ea', cheek='#ffb3c7', ears='none', tail='none', body='drop', feet='#63c29b', extras=['sprout']),
 'mulbangul': dict(size=48, rx=.31, ry=.27, main='#8fd3ff', shade='#58aee8', belly='#d8f1ff', cheek='#ffb3c7', ears='none', tail='wave', tail_c='#58aee8', body='drop', feet='#58aee8', extras=['fins']),
 'saessak':  dict(size=48, rx=.32, ry=.29, main='#9be07a', shade='#5fb34a', belly='#e2f7c8', cheek='#ffb3c7', ear='#5fb34a', ear_in='#b6ec8f', ears='leaf', tail='leaf', tail_c='#5fb34a', feet='#5fb34a', extras=['sprout']),
 'paadori':  dict(size=64, rx=.30, ry=.29, main='#5bb8f0', shade='#3585c9', belly='#e6f6ff', cheek='#ffb3c7', ears='none', tail='wave', tail_c='#3585c9', feet='#3585c9', extras=['fins', 'foam']),
 'seoripin': dict(size=64, rx=.30, ry=.27, main='#d9f1ff', shade='#9bcdf0', belly='#ffffff', cheek='#ffb3d0', ears='none', tail='fish', tail_c='#9bcdf0', feet='#9bcdf0', extras=['fins', 'frost']),
 'supyojeong': dict(size=64, rx=.30, ry=.29, main='#a8e68a', shade='#6bbd55', belly='#f1fbd8', cheek='#ffb3c7', ear='#6bbd55', ear_in='#d4f5b0', ears='leaf', tail='leaf', tail_c='#6bbd55', feet='#6bbd55', extras=['wings_leaf', 'flower']),
 'gasitori': dict(size=64, rx=.33, ry=.29, main='#8fae5e', shade='#5f7d3c', belly='#e4e8b0', cheek='#ffb09a', ears='none', tail='leaf', tail_c='#5f7d3c', feet='#5f7d3c', extras=['spikes', 'beak']),
}

def _g(sp, S, frame):
    sc = S / 32.0
    rx = round(sp['rx'] * S); ry = round(sp['ry'] * S)
    if frame == 'idle1':
        ry -= 1 if S < 64 else 2
    base = S - (3 if sp.get('float') else 5)
    cx = S // 2 - (round(sc * 1.5) if sp.get('tail', 'none') != 'none' else 0)
    return dict(sc=sc, S=S, rx=rx, ry=ry, cx=cx, cy=base - ry + (2 if S == 64 and any(e.startswith('wings') or e in ('horns','crown') for e in sp.get('extras', [])) else 0), base=base)

def _tail(sp, g, cv):
    t = sp.get('tail', 'none')
    if t == 'none': return
    sc, cx, cy, rx, ry = g['sc'], g['cx'], g['cy'], g['rx'], g['ry']
    L = Cv(g['S'], g['S']); c = sp.get('tail_c', sp['main']); c2 = sp.get('tail_c2', '#ffd84d')
    tx, ty = cx + rx * .85, cy + ry * .15
    if t == 'star':
        L.poly(star_pts(tx + 3 * sc, ty - 3 * sc, 5.2 * sc, 2.2 * sc), c)
    elif t == 'flame':
        L.ell(tx + 3 * sc, ty - 2 * sc, 3.5 * sc, 4 * sc, c)
        L.poly([(tx + 1 * sc, ty - 4 * sc), (tx + 3.5 * sc, ty - 10 * sc), (tx + 6 * sc, ty - 4 * sc)], c)
        L.ell(tx + 3 * sc, ty - 2 * sc, 1.6 * sc, 2.2 * sc, c2)
    elif t == 'leaf':
        L.poly([(tx, ty), (tx + 3 * sc, ty - 6 * sc), (tx + 8 * sc, ty - 8 * sc), (tx + 7 * sc, ty - 2 * sc), (tx + 3 * sc, ty + 1 * sc)], c)
        L.line(tx + 1, ty - 1, tx + 6 * sc, ty - 6 * sc, mix(c, '#ffffff', .4))
    elif t == 'wave':
        for i in range(4):
            L.ell(tx + 2 * sc + i * 1.8 * sc, ty - 1 * sc - math.sin(i * 1.2) * 3.5 * sc - i * 1.2 * sc, 2.4 * sc, 2.4 * sc, c)
        L.set(tx + 8 * sc, ty - 8 * sc, '#ffffff')
    elif t == 'lightning':
        L.poly([(tx, ty - 2 * sc), (tx + 5 * sc, ty - 9 * sc), (tx + 4 * sc, ty - 5 * sc), (tx + 9 * sc, ty - 11 * sc), (tx + 5 * sc, ty + 1 * sc), (tx + 6 * sc, ty - 3 * sc)], c)
    elif t == 'puff':
        L.ell(tx + 2.5 * sc, ty, 3.4 * sc, 3.4 * sc, c)
    elif t == 'fish':
        L.poly([(tx - 1, ty), (tx + 8 * sc, ty - 7 * sc), (tx + 6 * sc, ty), (tx + 8 * sc, ty + 5 * sc)], c)
    elif t == 'dragon':
        for i in range(5):
            r = (3.4 - i * .5) * sc
            L.ell(tx + 1 * sc + i * 2.6 * sc, ty + 1 * sc - i * 1.8 * sc, r, r, c)
        L.ell(tx + 11 * sc, ty - 7 * sc, 1.6 * sc, 1.8 * sc, c2)
    elif t == 'glow':
        for i in range(6):
            L.ell(tx + 1 * sc + i * 2 * sc, ty + 2 * sc - (i * i * .35) * sc, 2.2 * sc, 2.2 * sc, c)
    cv.paste_outlined(L)

def _wings(sp, g, cv, kind):
    sc, cx, cy, rx, ry = g['sc'], g['cx'], g['cy'], g['rx'], g['ry']
    for side in (-1, 1):
        L = Cv(g['S'], g['S'])
        wx = cx + side * (rx + 1 * sc); wy = cy - ry * .1
        sc = g['sc'] * .72
        if kind == 'wings_bat':
            c = sp['shade']
            L.poly([(wx, wy), (wx + side * 7 * sc, wy - 9 * sc), (wx + side * 6 * sc, wy - 3 * sc), (wx + side * 11 * sc, wy - 4 * sc), (wx + side * 7 * sc, wy + 2 * sc), (wx + side * 9 * sc, wy + 5 * sc), (wx + side * 2 * sc, wy + 4 * sc)], c)
        elif kind == 'wings_flame':
            L.poly([(wx, wy + 2 * sc), (wx + side * 8 * sc, wy - 8 * sc), (wx + side * 9 * sc, wy - 1 * sc), (wx + side * 4 * sc, wy + 5 * sc)], '#ff4a2e')
            L.poly([(wx, wy + 2 * sc), (wx + side * 6 * sc, wy - 5 * sc), (wx + side * 6 * sc, wy), (wx + side * 3 * sc, wy + 4 * sc)], '#ffd84d')
        else:  # leaf wings
            L.poly([(wx, wy + 2 * sc), (wx + side * 7 * sc, wy - 10 * sc), (wx + side * 11 * sc, wy - 4 * sc), (wx + side * 6 * sc, wy + 5 * sc)], '#d4f5b0')
            L.line(wx, wy + 2 * sc, wx + side * 9 * sc, wy - 6 * sc, '#8fd96b')
        cv.paste_outlined(L)

def _back_extras(sp, g, cv):
    for e in sp.get('extras', []):
        if e.startswith('wings'):
            _wings(sp, g, cv, e)
    if 'spikes' in sp.get('extras', []):
        sc, cx, cy, rx, ry = g['sc'], g['cx'], g['cy'], g['rx'], g['ry']
        L = Cv(g['S'], g['S'])
        for a in (200, 235, 270, 305, 340):
            ar = math.radians(a)
            px, py = cx + math.cos(ar) * rx * .95, cy + math.sin(ar) * ry * .95
            L.poly([(px - 2 * sc, py + 1 * sc), (px + math.cos(ar) * 6 * sc, py + math.sin(ar) * 6 * sc), (px + 2 * sc, py + 1 * sc)], '#c9a15a')
        cv.paste_outlined(L)

def _ears(sp, g, cv):
    k = sp.get('ears', 'none')
    if k == 'none': return
    sc, cx, cy, rx, ry = g['sc'], g['cx'], g['cy'], g['rx'], g['ry']
    for side in (-1, 1):
        L = Cv(g['S'], g['S'])
        ex = cx + side * rx * .62; ey = cy - ry * .82
        c, ci = sp['ear'], sp.get('ear_in', sp['belly'])
        if k == 'round':
            L.ell(ex, ey, 3.4 * sc, 3.4 * sc, c); L.ell(ex, ey + .5, 1.8 * sc, 1.8 * sc, ci)
        elif k == 'pointy':
            L.poly([(ex - 3 * sc, ey + 3 * sc), (ex + side * 1.5 * sc, ey - 6 * sc), (ex + 3.5 * sc, ey + 3 * sc)], c)
            L.poly([(ex - 1 * sc, ey + 2.5 * sc), (ex + side * 1 * sc, ey - 2 * sc), (ex + 2 * sc, ey + 2.5 * sc)], ci)
        elif k == 'cat':
            L.poly([(ex - 4 * sc, ey + 4 * sc), (ex + side * 0.5 * sc - 1, ey - 6 * sc), (ex + 4 * sc, ey + 4 * sc)], c)
            L.poly([(ex - 2 * sc, ey + 3 * sc), (ex + side * .5 * sc, ey - 2.5 * sc), (ex + 2 * sc, ey + 3 * sc)], ci)
        elif k == 'long':
            L.ell(ex + side * 1.5 * sc, ey - 5 * sc, 2.6 * sc, 7.5 * sc, c); L.ell(ex + side * 1.5 * sc, ey - 4.5 * sc, 1.2 * sc, 5 * sc, ci)
        elif k == 'leaf':
            L.poly([(ex - 2 * sc, ey + 3 * sc), (ex + side * 5 * sc - 1, ey - 5 * sc), (ex + side * 6 * sc, ey + 1 * sc), (ex + 2 * sc, ey + 4 * sc)], c)
            L.line(ex, ey + 2 * sc, ex + side * 4 * sc, ey - 2 * sc, ci)
        cv.paste_outlined(L)

def _body(sp, g):
    S, cx, cy, rx, ry, sc = g['S'], g['cx'], g['cy'], g['rx'], g['ry'], g['sc']
    L = Cv(S, S); m = set()
    kind = sp.get('body', 'round')
    L.ell(cx, cy, rx, ry, sp['main'], m)
    if kind == 'drop':
        L.poly([(cx - rx * .75, cy - ry * .45), (cx, cy - ry * 1.55), (cx + rx * .75, cy - ry * .45)], sp['main'], m)
    elif kind == 'cloud':
        for dx, dy, r in ((-.62, -.5, .55), (.62, -.5, .55), (0, -.75, .62), (-.9, .15, .42), (.9, .15, .42)):
            L.ell(cx + dx * rx, cy + dy * ry, r * ry * 1.05, r * ry * 1.05, sp['main'], m)
    # shading (lower-right crescent) + highlight
    top = min(y for _, y in m)
    for (x, y) in list(m):
        u, v = (x + .5 - cx) / rx, (y + .5 - cy) / ry
        if u * .6 + v * .85 > .72 or (kind == 'cloud' and v > .62):
            L.set(x, y, sp['shade'])
    if 'belly' in sp and sp['belly'] != sp['main']:
        L.ell(cx, cy + ry * .38, rx * .55, ry * .5, sp['belly'])
    hx, hy = cx - rx * .55, cy - ry * .6
    L.set(hx, hy, '#ffffff'); L.set(hx + 1, hy, '#ffffff'); L.set(hx, hy + 1, '#ffffff')
    ex = sp.get('extras', [])
    if 'neon' in ex:
        for (x, y) in m:
            if (x + y * 2) % 11 == 0 and y < cy + ry * .5:
                L.set(x, y, '#5af0ff')
    if 'scales' in ex:
        for (x, y) in m:
            if (x // 3 + y // 2) % 4 == 0 and y > cy - ry * .2 and abs(x - cx) < rx * .5 is False:
                pass
        for dy in (.1, .35, .6):
            for dx in (-.35, 0, .35):
                L.set(cx + dx * rx * 2.2 + (dy > .3) * 2, cy + dy * ry * 1.2, mix(sp['shade'], '#000000', .15))
    return L, m

def _feet(sp, g, cv):
    if sp.get('float'): return
    sc, cx, cy, rx, ry = g['sc'], g['cx'], g['cy'], g['rx'], g['ry']
    L = Cv(g['S'], g['S'])
    for side in (-1, 1):
        L.ell(cx + side * rx * .45, g['base'] + .2, 2.8 * sc, 2 * sc, sp.get('feet', sp['shade']))
    cv.paste_outlined(L)

def _front_extras(sp, g, cv):
    sc, cx, cy, rx, ry, S = g['sc'], g['cx'], g['cy'], g['rx'], g['ry'], g['S']
    ex = sp.get('extras', [])
    top_y = cy - ry * (1.55 if sp.get('body') == 'drop' else 1)
    if sp.get('body') == 'cloud': top_y = cy - ry * 1.3
    L = Cv(S, S)
    if 'crown' in ex:
        y = top_y + 1 * sc; w = 4.5 * sc
        L.poly([(cx - w, y), (cx - w, y - 5 * sc), (cx - w / 2, y - 2.5 * sc), (cx, y - 6 * sc), (cx + w / 2, y - 2.5 * sc), (cx + w, y - 5 * sc), (cx + w, y)], '#ffd84d')
        L.set(cx, y - 2 * sc, '#ff6b8b')
    if 'horns' in ex:
        for side in (-1, 1):
            L.poly([(cx + side * rx * .5 - 2 * sc, top_y + 3 * sc), (cx + side * rx * .7, top_y - 4 * sc), (cx + side * rx * .5 + 2 * sc, top_y + 3 * sc)], '#f3e6c8')
    if 'sprout' in ex:
        y = top_y + 1
        L.poly([(cx, y), (cx - 6 * sc, y - 3 * sc), (cx - 5 * sc, y - 7 * sc), (cx - 1, y - 3 * sc)], '#8fd96b')
        L.poly([(cx, y), (cx + 6 * sc, y - 4 * sc), (cx + 5 * sc, y - 8 * sc), (cx + 1, y - 3 * sc)], '#6bbd55')
    if 'flamecrest' in ex:
        y = top_y + 2
        L.poly([(cx - 3 * sc, y), (cx - 2 * sc, y - 5 * sc), (cx, y - 3 * sc), (cx + 1 * sc, y - 8 * sc), (cx + 3 * sc, y - 3 * sc), (cx + 4 * sc, y)], '#ff4a2e')
        L.poly([(cx - 1 * sc, y), (cx, y - 3 * sc), (cx + 1 * sc, y - 4 * sc), (cx + 2 * sc, y)], '#ffd84d')
    if 'flower' in ex:
        fx, fy = cx + rx * .55, top_y + 4 * sc
        for a in range(5):
            ar = a * 2 * math.pi / 5
            L.ell(fx + math.cos(ar) * 2.4 * sc, fy + math.sin(ar) * 2.4 * sc, 1.8 * sc, 1.8 * sc, '#ff9db8')
        L.ell(fx, fy, 1.4 * sc, 1.4 * sc, '#ffe27a')
    if 'frost' in ex:
        for dx in (-3, 0, 3):
            h = 6 if dx == 0 else 4
            L.poly([(cx + dx * sc - 1.5 * sc, top_y + 2 * sc), (cx + dx * sc, top_y - h * sc), (cx + dx * sc + 1.5 * sc, top_y + 2 * sc)], '#ffffff')
    if 'fins' in ex:
        for side in (-1, 1):
            L.poly([(cx + side * rx * .95, cy - 1 * sc), (cx + side * (rx + 4 * sc), cy - 4 * sc), (cx + side * (rx + 3.5 * sc), cy + 3 * sc)], sp['shade'])
    if 'foam' in ex:
        for dx in (-.5, 0, .5):
            L.ell(cx + dx * rx, top_y + 1 * sc, 2.2 * sc, 2.2 * sc, '#ffffff')
    if 'halo' in ex:
        L.ell(cx, top_y - 3 * sc, 5 * sc, 1.8 * sc, '#ffe27a'); L.ell(cx, top_y - 3 * sc, 3 * sc, .9 * sc, None)
    cv.paste_outlined(L)

def _marks(sp, g, cv):
    sc, cx, cy, rx, ry = g['sc'], g['cx'], g['cy'], g['rx'], g['ry']
    ex = sp.get('extras', [])
    my = cy - ry * .62
    if 'starmark' in ex:
        cv.poly(star_pts(cx, my, 3 * sc, 1.3 * sc), '#ffd84d')
    if 'moonmark' in ex:
        cv.ell(cx, my, 3 * sc, 3 * sc, '#ffe27a'); cv.ell(cx + 1.4 * sc, my - .6 * sc, 2.6 * sc, 2.6 * sc, sp['main'])
    if 'bolt' in ex:
        by = my + 1
        cv.poly([(cx - 1 * sc, by - 3 * sc), (cx + 2 * sc, by - 3 * sc), (cx + 0, by), (cx + 2 * sc, by), (cx - 2 * sc, by + 4 * sc), (cx - 0.5 * sc, by + 0.5 * sc), (cx - 2 * sc, by + .5 * sc)], '#ffe14a')
    if 'sparkle' in ex:
        for (dx, dy) in ((-rx - 3 * sc, -ry * 1.2), (rx + 2 * sc, -ry * 1.3)):
            x, y = cx + dx, cy + dy
            cv.pts([(x, y), (x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)], '#ffe27a')

def _face(sp, g, cv, frame):
    sc, cx, cy, rx, ry, S = g['sc'], g['cx'], g['cy'], g['rx'], g['ry'], g['S']
    ew = max(2, round(2 * sc)); eh = ew + 1
    ex_off = rx * .42
    ey = round(cy - ry * .12)
    ec = sp.get('eye', DARK)
    bird = 'beak' in sp.get('extras', [])
    for side in (-1, 1):
        x = round(cx + side * ex_off - ew / 2 + (0 if side < 0 else 0))
        if frame in ('idle0', 'idle1', 'eat'):
            cv.rect(x, ey, ew, eh, ec)
            if ew >= 3: cv.set(x, ey, None); cv.set(x + ew - 1, ey + eh - 1, None) if False else None
            cv.set(x, ey, '#ffffff'); 
            if ew >= 4: cv.set(x + 1, ey, '#ffffff'); cv.set(x, ey + 1, '#ffffff')
        elif frame == 'blink':
            cv.rect(x, ey + eh // 2, ew + 1, 1, ec)
        elif frame == 'happy':
            w = ew // 2 + 1
            for i in range(-w, w + 1):
                cv.set(x + ew // 2 + i, ey + 1 + abs(i) * (1 if sc < 1.5 else 1) - (0), ec)
            cv.set(x + ew // 2, ey, ec)
        elif frame == 'sad':
            cv.rect(x, ey, ew, eh, ec); cv.set(x, ey, '#ffffff')
            cv.set(x + (ew if side < 0 else -1), ey + eh, '#7fd0ff')
            cv.set(x + (ew if side < 0 else -1), ey + eh + 1, '#7fd0ff')
            for i in range(ew + 1):
                cv.set(x + i, ey - 2 - (i if side > 0 else ew - i) // 2, ec)
        elif frame == 'sleep':
            for i in range(ew + 1):
                cv.set(x + i, ey + 1 + (1 if 0 < i < ew else 0), ec)
        elif frame == 'sick':
            for i in range(ew + 1):
                cv.set(x + i, ey + i * eh // (ew + 1), ec); cv.set(x + ew - i, ey + i * eh // (ew + 1), ec)
    # cheeks
    cheek = '#b6e08a' if frame == 'sick' else sp.get('cheek', '#ffb3c7')
    for side in (-1, 1):
        cv.ell(cx + side * (ex_off + ew * .9), ey + eh + 1, 1.6 * sc, .9 * sc + .3, cheek)
    my = ey + eh + 1
    if bird:
        cv.poly([(cx - 2 * sc, my - 1), (cx + 2 * sc, my - 1), (cx, my + 2.5 * sc)], '#ffb830')
        cv.line(cx - 2 * sc + 1, my - 1, cx + 2 * sc - 1, my - 1, '#ffd870')
        return
    h = max(1, round(sc))
    if frame == 'eat':
        cv.ell(cx, my + .5, 1.8 * sc, 1.7 * sc, DARK); cv.ell(cx, my + 1.2 * sc, 1 * sc, .8 * sc, '#ff7a94')
    elif frame == 'sad' or frame == 'sick':
        for i in range(-h, h + 1):
            cv.set(cx + i, my + 1 + (1 if abs(i) < h else 0) * 0 + (0 if abs(i) == h else -1) + 1, DARK)
    elif frame == 'happy':
        cv.ell(cx, my + .3, 1.6 * sc, 1.4 * sc, DARK); cv.rect(cx - h, my - 1, 2 * h + 1, 1, sp['belly'] if False else DARK)
        cv.ell(cx, my + 1.1 * sc, .9 * sc, .6 * sc + .2, '#ff7a94')
    elif frame == 'sleep':
        cv.rect(cx, my + 1, 1, 1, DARK); cv.rect(cx - 1, my + 1, 3, 1, DARK) if sc >= 1.5 else None
    else:
        for i in range(-h, h + 1):
            cv.set(cx + i, my + (1 if abs(i) < h else 0), DARK)

def draw_pet(name, frame):
    sp = PETS[name]; S = sp['size']
    g = _g(sp, S, frame)
    cv = Cv(S, S)
    _back_extras(sp, g, cv)
    _tail(sp, g, cv)
    _feet(sp, g, cv)
    _ears(sp, g, cv)
    body, mask = _body(sp, g)
    cv.paste_outlined(body)
    _front_extras(sp, g, cv)
    _marks(sp, g, cv)
    _face(sp, g, cv, frame)
    if frame == 'sick':
        # green-ish tint on the body mask
        for (x, y) in mask:
            r, gg, b, a = cv.get(x, y)
            if a and (r, gg, b) != rgba(OUT)[:3]:
                cv.p[x, y] = (int(r * .85), min(255, int(gg * .95 + 14)), int(b * .8), a)
    return cv, g

def pet_sheet(name):
    frames, anchors = [], None
    for f in FRAMES:
        cv, g = draw_pet(name, f)
        frames.append(cv)
        if f == 'idle0':
            bb = cv.bbox()
            sp = PETS[name]
            ey = round(g['cy'] - g['ry'] * .12)
            anchors = dict(head=[g['cx'], bb[1]], face=[g['cx'], ey + 1], neck=[g['cx'], round(g['cy'] + g['ry'] * .45)],
                           side=[round(g['cx'] + g['rx'] * .6), bb[1] + 3], feet=[g['cx'], g['base']])
    return sheet(frames, PETS[name]['size'], PETS[name]['size']), anchors
