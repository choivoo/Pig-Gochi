"""Procedural pixel art for eggs, rooms, furniture, accessories, food, icons, effects, minigames."""
import math, random
from pix import *

def mk(w, h, fn, outline=True):
    c = Cv(w, h); fn(c)
    if outline: c.outline()
    return c

# --------------------------------------------------------------- eggs (32x32, 5 frames)
EGGS = {
  'starlight': dict(main='#fffaf2', shade='#d9c8f3', spot='#c8b3ee', acc='#ffd84d'),
  'flame':     dict(main='#ffb36b', shade='#e8743b', spot='#ff5a3c', acc='#ffd84d'),
  'dew':       dict(main='#c9f0f0', shade='#8fd7d0', spot='#7fe0b8', acc='#ffffff'),
}
def egg_frame(k, wob=0, crack=0):
    e = EGGS[k]; c = Cv(32, 32); m = set()
    c.ell(16, 20, 9, 10, e['main'], m); c.ell(16, 14, 7, 10, e['main'], m)
    for (x, y) in m:
        if (x - 16) * .6 + (y - 20) * .5 > 6.5: c.set(x, y, e['shade'])
    if k == 'starlight':
        for (x, y) in ((12, 14), (20, 18), (14, 23), (19, 11)): c.pts([(x, y), (x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)], e['spot'])
        c.poly(star_pts(16, 19, 3.2, 1.4), e['acc'])
    elif k == 'flame':
        for i, x in enumerate(range(8, 25)):
            y = 21 + (2 if i % 4 < 2 else 0)
            c.set(x, y, e['spot']); c.set(x, y + 1, e['spot']) if x % 2 == 0 else None
        c.poly([(16, 8), (13, 14), (16, 12), (19, 14)], e['acc'])
    else:
        for (x, y) in ((12, 15), (20, 20), (14, 24)): c.ell(x, y, 1.6, 2, e['spot']); c.set(x - 1, y - 1, '#ffffff')
        c.ell(19, 12, 1.2, 1.5, e['acc'])
    c.set(12, 12, '#ffffff'); c.set(12, 13, '#ffffff'); c.set(13, 11, '#ffffff')
    c.outline()
    if crack >= 1:
        for (x, y) in ((16, 9), (15, 10), (16, 11), (17, 12), (16, 13), (15, 14)): c.set(x, y, OUT)
    if crack >= 2:
        for (x, y) in ((14, 14), (13, 15), (14, 16), (13, 17), (18, 12), (19, 13), (20, 12), (21, 14)): c.set(x, y, OUT)
        for (x, y) in ((15, 11), (17, 11), (16, 12)): c.set(x, y, '#fff6a8')
    if wob:
        out = Cv(32, 32)
        for y in range(32):
            sh = int(round(wob * max(0, (26 - y)) / 13.0))
            for x in range(32):
                v = c.get(x, y)
                if v[3]: out.set(x + sh, y, v)
        return out
    return c

def egg_sheet(k):
    fr = [egg_frame(k), egg_frame(k, -1), egg_frame(k, 1), egg_frame(k, 0, 1), egg_frame(k, 0, 2)]
    return sheet(fr, 32, 32)

# --------------------------------------------------------------- rooms (192x160)
FLOOR_Y = 104
WIN = (72, 18, 48, 40)  # transparent hole for sky
ROOMS = {
 'cozy':   dict(w1='#fff0d6', w2='#ffe6bf', f1='#dba36a', f2='#c98f55', base='#8a5a3c', frame='#a8744a', deco='stripes'),
 'starry': dict(w1='#5a4a8a', w2='#504180', f1='#3c3566', f2='#352e5c', base='#2a2450', frame='#ffd84d', deco='stars'),
 'forest': dict(w1='#c28d58', w2='#b27e4b', f1='#8a6a3d', f2='#7a5c34', base='#4e3a22', frame='#5f9a4a', deco='logs'),
 'ocean':  dict(w1='#5ec4d8', w2='#52b6cc', f1='#f1dba0', f2='#e6cd8a', base='#3a8fa8', frame='#ffffff', deco='bubbles'),
 'cloud':  dict(w1='#cfe9ff', w2='#c2e0fa', f1='#ffffff', f2='#e9f4ff', base='#a9cdee', frame='#ffffff', deco='clouds'),
 'neon':   dict(w1='#2a2250', w2='#241c46', f1='#1d1840', f2='#2a2260', base='#ff4fd8', frame='#4ff3ff', deco='neon'),
}
def room(k):
    r = ROOMS[k]; c = Cv(192, 160); rnd = random.Random(k)
    for y in range(FLOOR_Y):
        for x in range(192):
            c.set(x, y, r['w1'] if (x // 8 + (y // 8) * (0 if r['deco'] in ('logs',) else 1)) % 2 == 0 or r['deco'] in ('stars', 'bubbles', 'clouds', 'neon') and (x // 16) % 2 == 0 else r['w2'])
    if r['deco'] == 'stripes':
        for x in range(0, 192, 16): c.rect(x, 0, 2, FLOOR_Y, r['w2'])
    if r['deco'] == 'logs':
        for y in range(0, FLOOR_Y, 12): c.rect(0, y + 11, 192, 1, '#8a5f33'); c.rect(0, y, 192, 1, '#cfa06b')
    if r['deco'] == 'stars':
        for _ in range(26): x, y = rnd.randrange(4, 188), rnd.randrange(4, 96); c.pts([(x, y), (x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)] if rnd.random() < .4 else [(x, y)], '#ffe27a')
    if r['deco'] == 'bubbles':
        for _ in range(16):
            x, y, rr = rnd.randrange(6, 186), rnd.randrange(6, 96), rnd.choice([2, 3, 4]); c.ell(x, y, rr, rr, '#9fe3ee'); c.set(x - 1, y - 1, '#ffffff')
    if r['deco'] == 'clouds':
        for (x, y) in ((20, 30), (150, 24), (30, 76), (160, 70)): c.ell(x, y, 12, 5, '#ffffff'); c.ell(x - 6, y - 3, 6, 5, '#ffffff'); c.ell(x + 5, y - 4, 7, 5, '#ffffff')
    if r['deco'] == 'neon':
        for x in range(0, 192, 16): c.rect(x, 0, 1, FLOOR_Y, '#3a2f78')
        for y in range(0, FLOOR_Y, 16): c.rect(0, y, 192, 1, '#3a2f78')
        c.rect(0, 14, 192, 2, '#ff4fd8'); c.rect(0, 84, 192, 2, '#4ff3ff')
    # floor
    for y in range(FLOOR_Y, 160):
        for x in range(192):
            if k in ('cozy', 'forest'):
                c.set(x, y, r['f1'] if ((y - FLOOR_Y) // 14) % 2 == 0 else r['f2'])
                if (x + ((y - FLOOR_Y) // 14) * 37) % 64 == 0: c.set(x, y, mix(r['f2'], '#000000', .2))
            else:
                c.set(x, y, r['f1'] if ((x // 16) + ((y - FLOOR_Y) // 14)) % 2 == 0 else r['f2'])
    if k == 'ocean':
        for (x, y) in ((20, 130), (150, 140), (90, 150), (60, 118)): c.poly(star_pts(x, y, 4, 1.8), '#ff9db8')
    c.rect(0, FLOOR_Y - 3, 192, 3, r['base']); c.rect(0, FLOOR_Y, 192, 1, mix(r['base'], '#000000', .25))
    # window hole + frame
    x, y, w, h = WIN
    for yy in range(y - 3, y + h + 3):
        for xx in range(x - 3, x + w + 3): c.set(xx, yy, r['frame'])
    for yy in range(y, y + h):
        for xx in range(x, x + w): c.p[xx, yy] = (0, 0, 0, 0)
    c.rect(x + w // 2 - 1, y, 2, h, r['frame']); c.rect(x, y + h // 2 - 1, w, 2, r['frame'])
    c.rect(x - 5, y + h + 3, w + 10, 3, mix(r['frame'], '#000000', .15))
    # outline of window frame
    for yy in range(y - 4, y + h + 7):
        for xx in range(x - 6, x + w + 6):
            if c.get(xx, yy)[3] == 255 and (xx in (x - 3, x + w + 2) or yy == y - 3) and (xx, yy) != 0: pass
    return c

# --------------------------------------------------------------- furniture
def F(): return {}
FURN = {}
def furn(id, w, h, **meta):
    def deco(fn):
        FURN[id] = (w, h, fn, meta); return fn
    return deco

def bed(main, blanket, pillow, wood):
    def d(c):
        c.rect(2, 18, 44, 8, wood); c.rect(2, 8, 4, 18, wood); c.rect(42, 12, 4, 14, wood)
        c.rect(6, 12, 36, 10, main); c.rect(6, 15, 36, 8, blanket); c.rect(8, 8, 12, 6, pillow); c.rect(10, 9, 6, 1, '#ffffff')
        c.rect(3, 26, 3, 4, wood); c.rect(42, 26, 3, 4, wood)
    return d
furn('bed_basic', 48, 32, slot='floor', fn='sleep', name='기본 침대')(bed('#fff6e6', '#8ecbe8', '#ffffff', '#c98f55'))
furn('bed_star', 48, 32, slot='floor', fn='sleep', name='별빛 침대')(lambda c: (bed('#e8defa', '#6a58b0', '#fff3b0', '#4a3c80')(c), c.poly(star_pts(24, 19, 4, 1.8), '#ffd84d')))
furn('bed_wood', 48, 32, slot='floor', fn='sleep', name='나무 침대')(lambda c: (bed('#f4e6c8', '#8fbf6a', '#fff6e6', '#8a5a3c')(c), c.rect(14, 18, 20, 2, '#6a8f4a')))

@furn('sofa_small', 48, 32, slot='floor', name='작은 소파')
def _(c):
    c.rect(2, 8, 44, 14, '#ff9db8'); c.rect(0, 14, 8, 14, '#f27a9c'); c.rect(40, 14, 8, 14, '#f27a9c'); c.rect(8, 16, 32, 10, '#ffb3c7'); c.rect(8, 22, 32, 2, '#f27a9c'); c.rect(4, 28, 3, 3, '#8a5a3c'); c.rect(41, 28, 3, 3, '#8a5a3c')
@furn('cushion', 16, 14, slot='floor', name='쿠션')
def _(c): c.ell(8, 8, 7, 5, '#ffd84d'); c.poly(star_pts(8, 8, 3, 1.3), '#ffffff')
@furn('desk', 40, 32, slot='floor', name='책상')
def _(c): c.rect(0, 8, 40, 5, '#c98f55'); c.rect(2, 13, 4, 17, '#a8744a'); c.rect(34, 13, 4, 17, '#a8744a'); c.rect(8, 13, 24, 6, '#b8834f'); c.rect(18, 15, 4, 2, '#ffd84d'); c.rect(6, 1, 8, 7, '#ff9db8'); c.rect(8, 3, 4, 1, '#fff')
@furn('chair', 20, 30, slot='floor', name='의자')
def _(c): c.rect(2, 2, 16, 12, '#a8744a'); c.rect(2, 14, 16, 4, '#c98f55'); c.rect(3, 18, 3, 10, '#8a5a3c'); c.rect(14, 18, 3, 10, '#8a5a3c')
@furn('dining_table', 44, 32, slot='floor', fn='eat', name='식탁')
def _(c): c.ell(22, 12, 20, 6, '#f0c690'); c.rect(2, 12, 40, 3, '#d9a870'); c.rect(18, 15, 8, 14, '#c98f55'); c.rect(12, 28, 20, 3, '#a8744a'); c.ell(22, 9, 5, 2, '#ffffff'); c.rect(21, 6, 2, 2, '#ff6b6b')
@furn('fridge', 24, 44, slot='floor', name='작은 냉장고')
def _(c): c.rect(2, 2, 20, 40, '#e8f4fb'); c.rect(2, 16, 20, 2, '#9bcdf0'); c.rect(18, 6, 2, 7, '#8aa4b8'); c.rect(18, 22, 2, 10, '#8aa4b8'); c.rect(5, 5, 4, 3, '#ff9db8'); c.rect(4, 4, 4, 1, '#ffffff')
@furn('bookshelf', 32, 52, slot='floor', name='책장')
def _(c):
    c.rect(1, 2, 30, 48, '#a8744a'); 
    for y in (4, 19, 34): c.rect(3, y, 26, 12, '#7a5030')
    cols = ['#ff6b6b', '#6bc7ff', '#ffd84d', '#8fd96b', '#c8a3f0', '#ff9db8']
    for row, y in enumerate((5, 20, 35)):
        x = 4
        for i in range(5): c.rect(x, y + (i % 2), 4, 10 - (i % 2), cols[(i + row * 2) % 6]); x += 5
@furn('toybox', 28, 22, slot='floor', fn='play', name='장난감 상자')
def _(c): c.rect(1, 8, 26, 12, '#6bc7ff'); c.rect(1, 8, 26, 3, '#3a9fe0'); c.rect(11, 12, 6, 4, '#ffd84d'); c.ell(8, 6, 4, 4, '#ff6b6b'); c.rect(18, 3, 6, 6, '#8fd96b')
@furn('rug_round', 56, 18, slot='rug', name='동그란 러그')
def _(c): c.ell(28, 9, 26, 7, '#ff9db8'); c.ell(28, 9, 19, 4.6, '#fff0f4'); c.ell(28, 9, 11, 2.6, '#ffc9d6')
@furn('rug_star', 56, 18, slot='rug', name='별 러그')
def _(c): c.ell(28, 9, 26, 7, '#6a58b0'); c.ell(28, 9, 20, 5, '#8a78d0'); c.poly(star_pts(28, 9, 9, 3.6), '#ffd84d')
@furn('plant_pot', 18, 28, slot='floor', name='화분')
def _(c): c.ell(9, 8, 6, 6, '#6bbd55'); c.ell(5, 10, 3, 4, '#8fd96b'); c.ell(13, 9, 3, 4, '#8fd96b'); c.rect(4, 16, 10, 9, '#d9784a'); c.rect(3, 16, 12, 2, '#e8905c')
@furn('cactus', 18, 28, slot='floor', name='선인장')
def _(c): c.rect(6, 4, 6, 20, '#6bbd55'); c.rect(1, 10, 5, 3, '#6bbd55'); c.rect(1, 6, 3, 7, '#6bbd55'); c.rect(12, 12, 5, 3, '#6bbd55'); c.rect(14, 8, 3, 7, '#6bbd55'); c.rect(4, 20, 10, 6, '#d9784a'); c.set(9, 2, '#ff9db8'); c.set(8, 2, '#ff9db8')
@furn('small_tree', 36, 60, slot='floor', name='작은 나무')
def _(c): c.rect(14, 30, 8, 26, '#8a5a3c'); c.ell(18, 20, 15, 15, '#6bbd55'); c.ell(10, 26, 9, 8, '#8fd96b'); c.ell(26, 24, 8, 8, '#5fa84a'); c.pts([(12, 14), (22, 10), (26, 22)], '#ff9db8')
@furn('stand_lamp', 18, 52, slot='floor', name='스탠드 조명')
def _(c): c.poly([(3, 4), (15, 4), (12, 16), (6, 16)], '#ffe9a8'); c.rect(8, 16, 2, 30, '#8a5a3c'); c.rect(3, 46, 12, 3, '#6e4630')
@furn('moon_lamp', 20, 22, slot='floor', name='달 조명')
def _(c): c.ell(10, 10, 8, 8, '#fff3b0'); c.ell(13, 8, 6, 6, '#00000000'); c.rect(6, 18, 8, 3, '#8a7ac0')
@furn('star_lamp', 20, 22, slot='floor', name='별 조명')
def _(c): c.poly(star_pts(10, 10, 9, 4), '#ffe27a'); c.rect(6, 18, 8, 3, '#8a7ac0')
@furn('toy_train', 36, 18, slot='floor', name='장난감 기차')
def _(c): c.rect(1, 5, 12, 9, '#ff6b6b'); c.rect(9, 1, 5, 6, '#ff6b6b'); c.rect(15, 7, 9, 7, '#ffd84d'); c.rect(26, 7, 8, 7, '#6bc7ff'); [c.ell(x, 15, 2.2, 2.2, '#4a3548') for x in (5, 11, 19, 30)]
@furn('blocks', 28, 20, slot='floor', name='블록 장난감')
def _(c): c.rect(1, 10, 10, 9, '#ff6b6b'); c.rect(11, 10, 10, 9, '#6bc7ff'); c.rect(6, 1, 10, 9, '#ffd84d'); c.rect(8, 4, 6, 3, '#ffffff'); c.rect(22, 13, 5, 6, '#8fd96b')
@furn('plush', 22, 24, slot='floor', name='봉제인형')
def _(c): c.ell(11, 15, 8, 7, '#f2c9a0'); c.ell(11, 7, 6, 6, '#f2c9a0'); c.ell(6, 3, 2.5, 2.5, '#f2c9a0'); c.ell(16, 3, 2.5, 2.5, '#f2c9a0'); c.pts([(9, 7), (13, 7)], '#4a3548'); c.rect(10, 9, 2, 1, '#c98f55'); c.rect(8, 11, 6, 2, '#ff6b6b')
@furn('aquarium', 44, 36, slot='floor', fn='watch', name='작은 수족관')
def _(c): c.rect(2, 6, 40, 22, '#bfe8ff'); c.rect(2, 20, 40, 8, '#f1dba0'); c.rect(0, 4, 44, 3, '#8aa4b8'); c.rect(0, 28, 44, 5, '#6e8aa0'); c.ell(14, 14, 4, 2.5, '#ff9d3d'); c.poly([(18, 14), (22, 11), (22, 17)], '#ff9d3d'); c.ell(30, 17, 3, 2, '#ff6b9d'); c.poly([(28, 20), (28, 15), (33, 18)], '#ff6b9d'); c.rect(8, 22, 3, 4, '#6bbd55'); c.rect(34, 20, 3, 6, '#6bbd55')
@furn('whiteboard', 44, 52, slot='floor', name='화이트보드')
def _(c): c.rect(2, 2, 40, 28, '#ffffff'); c.rect(2, 2, 40, 28, '#ffffff'); c.rect(0, 0, 44, 2, '#8aa4b8'); c.line(8, 12, 20, 18, '#6bc7ff'); c.line(20, 18, 30, 8, '#ff6b6b'); c.poly(star_pts(34, 20, 4, 1.6), '#ffd84d'); c.rect(4, 32, 2, 18, '#8a8a9a'); c.rect(38, 32, 2, 18, '#8a8a9a'); c.rect(4, 48, 36, 2, '#8a8a9a')
@furn('game_console', 28, 40, slot='floor', fn='minigame', name='게임기')
def _(c): c.rect(2, 2, 24, 36, '#ff6b8b'); c.rect(5, 5, 18, 14, '#2a2250'); c.rect(7, 7, 14, 10, '#8fe8a8'); c.poly(star_pts(14, 12, 3, 1.3), '#2a2250'); c.rect(6, 24, 6, 2, '#2a2250'); c.rect(8, 22, 2, 6, '#2a2250'); c.ell(20, 24, 2, 2, '#ffd84d'); c.ell(17, 29, 2, 2, '#6bc7ff')
@furn('trophy', 20, 28, slot='floor', name='특별 트로피')
def _(c): c.rect(4, 2, 12, 9, '#ffd84d'); c.ell(10, 10, 6, 4, '#ffd84d'); c.rect(8, 13, 4, 6, '#e8b000'); c.rect(4, 19, 12, 4, '#8a5a3c'); c.rect(0, 3, 4, 5, '#ffd84d'); c.rect(16, 3, 4, 5, '#ffd84d'); c.poly(star_pts(10, 6, 3, 1.3), '#fff6a8')
@furn('bean_bag', 32, 24, slot='floor', name='빈백')
def _(c): c.ell(16, 14, 14, 9, '#8fd9c8'); c.ell(16, 8, 9, 5, '#a8eadb'); c.rect(9, 12, 14, 1, '#6bc7b0')
@furn('piano', 44, 40, slot='floor', name='작은 피아노')
def _(c): c.rect(2, 4, 40, 18, '#4a3a5a'); c.rect(4, 22, 36, 10, '#ffffff'); [c.rect(5 + i * 4, 22, 1, 10, '#c8c8d8') for i in range(8)]; [c.rect(8 + i * 8, 22, 3, 6, '#2a2a3a') for i in range(4)]; c.rect(4, 32, 4, 6, '#4a3a5a'); c.rect(36, 32, 4, 6, '#4a3a5a'); c.rect(10, 6, 10, 2, '#fff3b0')
@furn('cardboard_house', 40, 36, slot='floor', name='상자 집')
def _(c): c.rect(2, 12, 36, 22, '#d9a870'); c.poly([(0, 14), (20, 0), (40, 14)], '#c98f55'); c.rect(14, 20, 12, 14, '#4a3548'); c.rect(15, 21, 10, 13, '#6e5060'); c.rect(4, 14, 6, 5, '#bfe8ff')
# wall items
@furn('wall_clock', 20, 20, slot='wall', name='벽시계')
def _(c): c.ell(10, 10, 9, 9, '#ffffff'); c.line(10, 10, 10, 4, '#4a3548'); c.line(10, 10, 14, 12, '#4a3548'); c.pts([(10, 2), (10, 18), (2, 10), (18, 10)], '#ff6b6b')
@furn('poster_star', 22, 30, slot='wall', name='별 포스터')
def _(c): c.rect(1, 1, 20, 28, '#3a2f78'); c.rect(3, 3, 16, 24, '#5a4aa0'); c.poly(star_pts(11, 13, 6, 2.6), '#ffd84d'); c.pts([(5, 22), (16, 6), (6, 7)], '#fff')
@furn('poster_forest', 22, 30, slot='wall', name='숲 포스터')
def _(c): c.rect(1, 1, 20, 28, '#bfe8ff'); c.poly([(2, 28), (8, 10), (14, 28)], '#6bbd55'); c.poly([(9, 28), (15, 14), (21, 28)], '#4f9a45'); c.ell(16, 7, 3, 3, '#ffe27a')
@furn('frame_gold', 28, 24, slot='wall', name='황금 액자')
def _(c): c.rect(0, 0, 28, 22, '#ffd84d'); c.rect(3, 3, 22, 16, '#bfe8ff'); c.ell(14, 14, 5, 4, '#ffa65c'); c.ell(14, 9, 4, 4, '#ffa65c'); c.pts([(12, 9), (16, 9)], '#4a3548')
@furn('mirror', 22, 36, slot='wall', fn='accessory', name='거울')
def _(c): c.ell(11, 17, 10, 15, '#c98f55'); c.ell(11, 17, 8, 13, '#dff4ff'); c.line(7, 8, 12, 4, '#ffffff'); c.line(6, 12, 9, 8, '#ffffff')
@furn('curtain', 18, 46, slot='wall', name='창문 커튼')
def _(c): c.poly([(0, 0), (18, 0), (14, 40), (6, 44), (0, 40)], '#ff9db8'); [c.rect(x, 2, 1, 36, '#f27a9c') for x in (5, 10)]; c.rect(0, 0, 18, 3, '#c98f55')
@furn('garland', 48, 14, slot='wall', name='별 가랜드')
def _(c): c.line(0, 2, 24, 6, '#8a5a3c'); c.line(24, 6, 47, 2, '#8a5a3c'); [c.poly(star_pts(x, y, 4, 1.8), col) for x, y, col in ((6, 6, '#ffd84d'), (16, 9, '#ff9db8'), (24, 11, '#6bc7ff'), (33, 9, '#8fd96b'), (42, 6, '#ffd84d'))]
@furn('wall_shelf', 36, 18, slot='wall', name='벽 선반')
def _(c): c.rect(0, 12, 36, 4, '#a8744a'); c.rect(4, 4, 8, 8, '#ff6b6b'); c.ell(20, 7, 4, 5, '#8fd96b'); c.rect(18, 8, 4, 4, '#d9784a'); c.rect(26, 2, 6, 10, '#6bc7ff')

# --------------------------------------------------------------- accessories (16x16)
ACC = {}
def acc(id, slot, name):
    def deco(fn): ACC[id] = (slot, name, fn); return fn
    return deco
@acc('ribbon_red', 'side', '빨간 리본')
def _(c): c.poly([(8, 8), (1, 3), (1, 12)], '#ff4a5e'); c.poly([(8, 8), (15, 3), (15, 12)], '#ff4a5e'); c.ell(8, 8, 2.2, 2.2, '#d92e44')
@acc('ribbon_blue', 'side', '파란 리본')
def _(c): c.poly([(8, 8), (1, 3), (1, 12)], '#4a9eff'); c.poly([(8, 8), (15, 3), (15, 12)], '#4a9eff'); c.ell(8, 8, 2.2, 2.2, '#2e6fd9')
@acc('crown_small', 'head', '작은 왕관')
def _(c): c.poly([(2, 13), (2, 5), (5, 8), (8, 3), (11, 8), (14, 5), (14, 13)], '#ffd84d'); c.set(8, 10, '#ff6b8b'); c.set(4, 11, '#6bc7ff'); c.set(12, 11, '#6bc7ff')
@acc('pin_star', 'side', '별 머리핀')
def _(c): c.poly(star_pts(8, 8, 6, 2.6), '#ffd84d')
@acc('glasses', 'face', '안경')
def _(c): c.ell(4, 8, 3.2, 3.2, '#00000000'); c.ell(4, 8, 3.4, 3.4, '#4a3548'); c.ell(4, 8, 2.2, 2.2, '#dff4ff'); c.ell(12, 8, 3.4, 3.4, '#4a3548'); c.ell(12, 8, 2.2, 2.2, '#dff4ff'); c.rect(7, 7, 2, 1, '#4a3548')
@acc('sunglasses', 'face', '선글라스')
def _(c): c.rect(0, 5, 7, 5, '#2a2250'); c.rect(9, 5, 7, 5, '#2a2250'); c.rect(7, 6, 2, 1, '#2a2250'); c.pts([(1, 6), (10, 6)], '#6a6aa0')
@acc('hat_wizard', 'head', '마법사 모자')
def _(c): c.poly([(8, 0), (3, 12), (13, 12)], '#6a58b0'); c.rect(0, 12, 16, 3, '#6a58b0'); c.rect(3, 9, 10, 2, '#ffd84d'); c.poly(star_pts(8, 6, 2, 1), '#ffd84d')
@acc('beret', 'head', '작은 베레모')
def _(c): c.ell(8, 10, 7, 4, '#d9485e'); c.rect(7, 4, 2, 3, '#d9485e'); c.rect(1, 12, 14, 2, '#b83048')
@acc('hat_santa', 'head', '산타 모자')
def _(c): c.poly([(2, 12), (9, 2), (14, 12)], '#e8392e'); c.ell(10, 3, 2.4, 2.4, '#ffffff'); c.rect(1, 11, 14, 3, '#ffffff')
@acc('cat_ears', 'head', '고양이 귀')
def _(c): c.poly([(1, 14), (3, 3), (8, 12)], '#3a3a4a'); c.poly([(8, 12), (13, 3), (15, 14)], '#3a3a4a'); c.poly([(3, 12), (4, 6), (6, 11)], '#ff9db8'); c.poly([(10, 11), (12, 6), (13, 12)], '#ff9db8')
@acc('butterfly', 'side', '나비 장식')
def _(c): c.ell(4, 6, 3.4, 3.4, '#ff9d3d'); c.ell(4, 11, 2.6, 2.6, '#ffd84d'); c.ell(12, 6, 3.4, 3.4, '#ff9d3d'); c.ell(12, 11, 2.6, 2.6, '#ffd84d'); c.rect(7, 4, 2, 9, '#4a3548')
@acc('flower_deco', 'side', '꽃 장식')
def _(c):
    for a in range(5): ar = a * 2 * math.pi / 5; c.ell(8 + math.cos(ar) * 4, 8 + math.sin(ar) * 4, 2.8, 2.8, '#ff7aa8')
    c.ell(8, 8, 2.4, 2.4, '#ffe27a')
@acc('bag_small', 'neck', '작은 가방')
def _(c): c.rect(3, 5, 10, 9, '#c98f55'); c.rect(3, 5, 10, 3, '#a8744a'); c.rect(7, 7, 2, 2, '#ffd84d'); c.line(4, 5, 8, 0, '#8a5a3c'); c.line(12, 5, 8, 0, '#8a5a3c')
@acc('scarf', 'neck', '목도리')
def _(c): c.rect(0, 3, 16, 5, '#e8392e'); c.rect(9, 8, 5, 7, '#e8392e'); [c.rect(x, 4, 2, 1, '#ffffff') for x in (2, 6, 10)]; c.rect(9, 12, 5, 1, '#ffffff')
@acc('pin_heart', 'side', '하트 핀')
def _(c): c.ell(5, 6, 3.4, 3.4, '#ff4a7e'); c.ell(11, 6, 3.4, 3.4, '#ff4a7e'); c.poly([(1.6, 8), (14.4, 8), (8, 15)], '#ff4a7e'); c.set(4, 4, '#ffffff')
@acc('pin_moon', 'side', '달 핀')
def _(c): c.ell(8, 8, 6, 6, '#ffe27a'); c.ell(11, 6, 5, 5, '#00000000')
@acc('hat_cloud', 'head', '구름 모자')
def _(c): c.ell(8, 10, 7, 3.4, '#ffffff'); c.ell(5, 7, 3.6, 3.6, '#ffffff'); c.ell(10, 6, 4.2, 4.2, '#ffffff'); c.rect(3, 11, 10, 2, '#cfe9fb')
@acc('hat_explorer', 'head', '탐험가 모자')
def _(c): c.ell(8, 8, 5, 4, '#c9a15a'); c.rect(0, 11, 16, 3, '#b38a44'); c.rect(3, 9, 10, 2, '#7a5a30')
@acc('necklace_gem', 'neck', '보석 목걸이')
def _(c): c.line(1, 2, 8, 9, '#ffd84d'); c.line(15, 2, 8, 9, '#ffd84d'); c.poly([(8, 8), (5, 11), (8, 15), (11, 11)], '#4ff3ff'); c.set(7, 10, '#ffffff')
@acc('halo', 'head', '천사 고리')
def _(c): c.ell(8, 8, 7, 3, '#ffe27a'); c.ell(8, 8, 4.4, 1.4, '#00000000')

# --------------------------------------------------------------- foods (16x16)
FOOD = {}
def food(id):
    def deco(fn): FOOD[id] = fn; return fn
    return deco
@food('kibble')
def _(c): c.ell(8, 10, 7, 4.5, '#c98f55'); c.rect(1, 8, 14, 2, '#a8744a'); [c.rect(x, 5 + (x % 2), 2, 2, '#8a5a3c') for x in (4, 7, 10)]
@food('apple')
def _(c): c.ell(8, 9, 6, 6, '#ff4a4a'); c.rect(8, 1, 1, 3, '#8a5a3c'); c.poly([(9, 3), (13, 2), (11, 5)], '#6bbd55'); c.set(5, 6, '#ffffff'); c.set(5, 7, '#ffffff')
@food('strawberry')
def _(c): c.poly([(2, 5), (14, 5), (8, 15)], '#ff4a6a'); c.ell(8, 6, 6, 3, '#ff4a6a'); c.poly([(3, 4), (8, 1), (13, 4), (8, 6)], '#6bbd55'); c.pts([(6, 8), (10, 8), (8, 10), (7, 12), (9, 12)], '#ffe27a')
@food('banana')
def _(c): [c.ell(3 + i * 1.8, 12 - math.sin(i / 6.0 * math.pi) * 8, 3, 2.6, '#ffe14a') for i in range(8)]; c.set(1, 13, '#8a5a3c')
@food('carrot')
def _(c): c.poly([(3, 5), (13, 5), (8, 15)], '#ff8a2e'); c.poly([(8, 5), (4, 0), (7, 4)], '#6bbd55'); c.poly([(8, 5), (12, 0), (9, 4)], '#6bbd55'); c.pts([(6, 8), (9, 10), (7, 12)], '#d9661a')
@food('onigiri')
def _(c): c.poly([(8, 1), (1, 13), (15, 13)], '#ffffff'); c.ell(8, 11, 7, 3, '#ffffff'); c.rect(5, 10, 6, 5, '#2a3a3a'); c.pts([(7, 6), (9, 8)], '#e8e8f0')
@food('bread')
def _(c): c.ell(8, 9, 7, 5, '#e8b070'); c.ell(8, 6, 5, 3, '#f2c48a'); c.line(5, 5, 7, 8, '#c98f55'); c.line(9, 5, 11, 8, '#c98f55')
@food('egg')
def _(c): c.ell(8, 9, 7, 5.5, '#ffffff'); c.ell(4, 6, 3, 3, '#ffffff'); c.ell(8, 9, 3, 3, '#ffc83d'); c.set(7, 8, '#fff2a8')
@food('milk')
def _(c): c.rect(4, 4, 8, 11, '#ffffff'); c.poly([(4, 4), (8, 0), (12, 4)], '#6bc7ff'); c.rect(5, 8, 6, 3, '#6bc7ff'); c.set(7, 9, '#ffffff')
@food('juice')
def _(c): c.rect(3, 4, 10, 11, '#ffffff'); c.rect(4, 6, 8, 8, '#ff9d3d'); c.line(10, 0, 8, 5, '#ff4a6a'); c.rect(5, 7, 1, 4, '#ffd08a')
@food('cookie')
def _(c): c.ell(8, 8, 7, 7, '#e8b070'); c.pts([(5, 5), (10, 6), (6, 10), (11, 11), (8, 8)], '#6e4630'); c.set(4, 4, '#f6d4a0')
@food('pudding')
def _(c): c.poly([(3, 14), (13, 14), (14, 5), (2, 5)], '#ffe27a'); c.rect(2, 3, 12, 3, '#8a5a3c'); c.ell(8, 2, 2, 2, '#ff4a6a'); c.rect(4, 8, 1, 4, '#fff6b8')
@food('cake')
def _(c): c.rect(1, 6, 14, 8, '#fff0f4'); c.rect(1, 6, 14, 3, '#ff9db8'); c.rect(1, 11, 14, 1, '#ffc9d6'); c.ell(5, 4, 2.5, 2.5, '#ff4a6a'); c.ell(11, 4, 2.5, 2.5, '#ff4a6a'); c.set(5, 3, '#fff')
@food('donut')
def _(c): c.ell(8, 8, 7, 7, '#ffa8c0'); c.ell(8, 8, 2.4, 2.4, '#00000000'); c.pts([(3, 6), (6, 3), (11, 4), (12, 9), (10, 12), (4, 10)], '#ffffff'); c.pts([(5, 4), (12, 7), (5, 12)], '#6bc7ff')
@food('jelly')
def _(c): c.ell(8, 10, 7, 5, '#b78cf0'); c.ell(8, 8, 5, 5, '#c8a3f8'); c.rect(4, 5, 2, 3, '#e8d4ff'); c.rect(6, 1, 4, 3, '#6bbd55')
@food('icecream')
def _(c): c.poly([(4, 8), (12, 8), (8, 15)], '#e8b070'); c.ell(8, 6, 4.5, 4.5, '#ffb8d0'); c.ell(8, 3, 3.5, 3, '#fff0d6'); c.set(7, 2, '#fff'); c.line(5, 9, 8, 13, '#c98f55')
@food('pancake')
def _(c): c.ell(8, 12, 7, 3, '#d9a060'); c.ell(8, 9, 7, 3, '#e8b878'); c.ell(8, 6, 6.4, 3, '#f2c890'); c.rect(6, 4, 4, 3, '#ffe27a'); c.rect(7, 7, 3, 3, '#a86a2a')
@food('sandwich')
def _(c): c.poly([(1, 13), (15, 13), (15, 8), (1, 8)], '#f2c890'); c.rect(1, 7, 14, 2, '#6bbd55'); c.rect(1, 9, 14, 2, '#ff6b6b'); c.rect(1, 3, 14, 4, '#f2c890'); c.rect(1, 12, 14, 3, '#e8b070')
@food('fish')
def _(c): c.ell(7, 8, 6, 4, '#6bc7ff'); c.poly([(11, 8), (15, 3), (15, 13)], '#4a9eff'); c.set(4, 7, '#2a2250'); c.rect(6, 9, 4, 1, '#bfe8ff')
@food('soup')
def _(c): c.ell(8, 10, 7, 5, '#ffffff'); c.rect(1, 9, 14, 2, '#ffffff'); c.ell(8, 9, 6, 2.4, '#ff9d3d'); c.pts([(5, 3), (6, 2), (5, 1), (10, 3), (11, 2), (10, 1)], '#e8e8f0')
@food('starcandy')
def _(c): c.poly(star_pts(8, 8, 7.5, 3.4), '#ffd84d'); c.set(6, 6, '#ffffff'); c.set(7, 5, '#ffffff')
@food('firejelly')
def _(c): c.ell(8, 10, 6, 5, '#ff5a3c'); c.poly([(4, 8), (8, 0), (12, 8)], '#ff5a3c'); c.poly([(6, 9), (8, 4), (10, 9)], '#ffd84d')
@food('dewberry')
def _(c): [c.ell(x, y, 3.2, 3.2, '#5a8cff') for x, y in ((5, 10), (11, 10), (8, 6))]; c.poly([(8, 3), (13, 1), (11, 4)], '#6bbd55'); [c.set(x, y, '#ffffff') for x, y in ((4, 9), (10, 9), (7, 5))]
@food('mooncookie')
def _(c): c.ell(8, 8, 7, 7, '#fff0b0'); c.ell(8, 8, 4.4, 4.4, '#f2d878'); c.ell(10, 7, 3.6, 3.6, '#fff0b0')
@food('rainbowpudding')
def _(c):
    c.poly([(3, 14), (13, 14), (14, 5), (2, 5)], '#ffe27a')
    for i, col in enumerate(('#ff6b6b', '#ffa65c', '#ffe14a', '#8fd96b', '#6bc7ff')): c.rect(2 + (i // 2 if False else 0), 6 + i * 2 - (1 if i else 0), 12, 2, col)
    c.rect(2, 2, 12, 3, '#fff6fb'); c.ell(8, 2, 2, 2, '#ff4a6a')

# --------------------------------------------------------------- icons (16x16)
ICON = {}
def icon(id):
    def deco(fn): ICON[id] = fn; return fn
    return deco
@icon('feed')
def _(c): c.ell(8, 10, 7, 4.5, '#ffb347'); c.rect(1, 8, 14, 2, '#e8903a'); c.line(11, 1, 6, 7, '#8a8aa0'); c.rect(3, 1, 1, 6, '#8a8aa0')
@icon('bath')
def _(c): c.poly([(8, 1), (2, 9), (14, 9)], '#6bc7ff'); c.ell(8, 10, 5.5, 5, '#6bc7ff'); c.rect(5, 7, 2, 3, '#dff4ff')
@icon('play')
def _(c): c.ell(8, 8, 7, 7, '#ff6b6b'); c.line(2, 6, 14, 10, '#ffffff'); c.line(2, 10, 14, 6, '#ffd84d'); c.set(5, 4, '#fff')
@icon('sleep')
def _(c): c.ell(7, 9, 6, 6, '#ffe27a'); c.ell(10, 7, 5, 5, '#00000000'); c.rect(10, 1, 5, 1, '#8a7ac0'); c.rect(14, 2, 1, 1, '#8a7ac0'); c.rect(11, 3, 4, 1, '#8a7ac0')
@icon('shop')
def _(c): c.rect(2, 5, 12, 10, '#ff9db8'); c.rect(2, 5, 12, 2, '#f27a9c'); c.line(5, 5, 6, 1, '#8a5a3c'); c.line(11, 5, 10, 1, '#8a5a3c'); c.set(8, 10, '#ffffff')
@icon('decorate')
def _(c): c.poly([(1, 8), (8, 1), (15, 8)], '#ff6b6b'); c.rect(3, 8, 10, 7, '#ffe9c0'); c.rect(7, 10, 3, 5, '#a8744a'); c.rect(4, 9, 2, 2, '#6bc7ff')
@icon('book')
def _(c): c.rect(2, 2, 12, 13, '#8a78d0'); c.rect(4, 3, 9, 11, '#fff3da'); c.rect(2, 2, 2, 13, '#6a58b0'); c.rect(6, 6, 5, 1, '#c8c8d8'); c.rect(6, 9, 4, 1, '#c8c8d8')
@icon('stats')
def _(c): c.rect(2, 9, 3, 6, '#6bc7ff'); c.rect(6, 5, 3, 10, '#8fd96b'); c.rect(10, 2, 3, 13, '#ffa65c')
@icon('coin')
def _(c): c.ell(8, 8, 7, 7, '#ffd84d'); c.ell(8, 8, 4.4, 4.4, '#f2b800'); c.rect(7, 5, 2, 6, '#ffe98a')
@icon('heart')
def _(c): c.ell(5, 6, 3.6, 3.6, '#ff4a7e'); c.ell(11, 6, 3.6, 3.6, '#ff4a7e'); c.poly([(1.4, 8), (14.6, 8), (8, 15)], '#ff4a7e'); c.set(4, 4, '#ffffff')
@icon('medicine')
def _(c): c.ell(8, 8, 7, 5, '#ff6b6b'); c.rect(8, 3, 8, 10, '#ffffff'); c.rect(1, 3, 7, 10, '#ff6b6b'); c.rect(0, 4, 16, 8, '#00000000'); c.ell(4, 8, 4, 4.5, '#ff6b6b'); c.ell(12, 8, 4, 4.5, '#ffffff'); c.rect(4, 4, 8, 9, '#ff6b6b'); c.rect(8, 4, 5, 9, '#ffffff')
@icon('settings')
def _(c):
    c.ell(8, 8, 6, 6, '#a8a8c0'); [c.rect(8 + int(math.cos(a * math.pi / 4) * 7) - 1, 8 + int(math.sin(a * math.pi / 4) * 7) - 1, 2, 2, '#a8a8c0') for a in range(8)]; c.ell(8, 8, 2.4, 2.4, '#00000000')
@icon('star')
def _(c): c.poly(star_pts(8, 8.5, 7.5, 3.2), '#ffd84d')
@icon('trophy')
def _(c): c.rect(4, 1, 8, 7, '#ffd84d'); c.ell(8, 8, 4, 3, '#ffd84d'); c.rect(7, 10, 2, 3, '#e8b000'); c.rect(4, 13, 8, 2, '#8a5a3c'); c.rect(1, 2, 3, 4, '#ffd84d'); c.rect(12, 2, 3, 4, '#ffd84d')
@icon('home')
def _(c): c.poly([(0, 8), (8, 1), (16, 8)], '#ff6b6b'); c.rect(3, 8, 10, 7, '#ffe9c0'); c.rect(7, 10, 3, 5, '#a8744a')
@icon('close')
def _(c): c.line(3, 3, 12, 12, '#ff6b6b'); c.line(4, 3, 13, 12, '#ff6b6b'); c.line(12, 3, 3, 12, '#ff6b6b'); c.line(13, 3, 4, 12, '#ff6b6b')
@icon('back')
def _(c): c.poly([(1, 8), (8, 2), (8, 6), (14, 6), (14, 10), (8, 10), (8, 14)], '#6bc7ff')
@icon('bag')
def _(c): c.rect(2, 5, 12, 10, '#c98f55'); c.rect(2, 5, 12, 3, '#a8744a'); c.rect(6, 1, 4, 4, '#8a5a3c'); c.rect(7, 2, 2, 2, '#00000000')
@icon('sound')
def _(c): c.rect(1, 5, 3, 6, '#a8a8c0'); c.poly([(4, 5), (9, 1), (9, 15), (4, 11)], '#a8a8c0'); c.pts([(11, 6), (12, 8), (11, 10), (13, 4), (14, 8), (13, 12)], '#6bc7ff')
@icon('mute')
def _(c): c.rect(1, 5, 3, 6, '#a8a8c0'); c.poly([(4, 5), (9, 1), (9, 15), (4, 11)], '#a8a8c0'); c.line(11, 5, 15, 11, '#ff6b6b'); c.line(15, 5, 11, 11, '#ff6b6b')
@icon('clock')
def _(c): c.ell(8, 8, 7, 7, '#ffffff'); c.line(8, 8, 8, 3, '#4a3548'); c.line(8, 8, 12, 9, '#4a3548')
@icon('check')
def _(c): c.line(2, 8, 6, 12, '#4fbf6a'); c.line(3, 8, 7, 12, '#4fbf6a'); c.line(6, 12, 14, 3, '#4fbf6a'); c.line(7, 12, 15, 3, '#4fbf6a')
@icon('lock')
def _(c): c.rect(3, 7, 10, 8, '#ffd84d'); c.rect(5, 2, 6, 6, '#a8a8c0'); c.rect(7, 4, 2, 4, '#00000000'); c.rect(7, 10, 2, 3, '#8a5a3c')
@icon('paw')
def _(c): c.ell(8, 11, 4.5, 3.6, '#ff9db8'); [c.ell(x, y, 1.8, 2.2, '#ff9db8') for x, y in ((3, 6), (6, 3), (10, 3), (13, 6))]
@icon('game')
def _(c): c.ell(8, 9, 7, 5, '#8a78d0'); c.rect(3, 7, 4, 1, '#ffffff'); c.rect(4, 6, 1, 3, '#ffffff'); c.set(11, 7, '#ffd84d'); c.set(12, 9, '#6bc7ff')
@icon('mission')
def _(c): c.rect(3, 2, 10, 13, '#fff3da'); c.rect(6, 1, 4, 2, '#a8744a'); [c.rect(5, y, 6, 1, '#8a78d0') for y in (6, 9, 12)]
@icon('save')
def _(c): c.rect(2, 2, 12, 12, '#6bc7ff'); c.rect(4, 2, 8, 5, '#ffffff'); c.rect(5, 9, 6, 5, '#4a7fcf')
@icon('hunger')
def _(c): c.ell(8, 10, 7, 4.5, '#ffb347'); c.rect(1, 8, 14, 2, '#e8903a'); c.ell(8, 5, 3, 2, '#ff6b6b')
@icon('energy')
def _(c): c.poly([(9, 0), (3, 9), (7, 9), (6, 15), (13, 6), (9, 6)], '#ffd84d')
@icon('clean')
def _(c): c.poly(star_pts(8, 8, 7, 2.5, 4), '#8fe8ff'); c.pts([(13, 2), (14, 3), (12, 3), (13, 4)], '#ffffff')
@icon('health')
def _(c): c.rect(6, 1, 4, 14, '#ff6b6b'); c.rect(1, 6, 14, 4, '#ff6b6b')
@icon('stress')
def _(c): c.ell(8, 9, 6, 4, '#a8a8c0'); c.ell(5, 7, 3, 3, '#a8a8c0'); c.ell(10, 6, 3.4, 3.4, '#a8a8c0'); c.poly([(7, 11), (10, 11), (8, 15)], '#ffd84d')
@icon('bond')
def _(c): c.ell(4, 6, 3, 3, '#ff9db8'); c.ell(9, 6, 3, 3, '#ff9db8'); c.poly([(1.4, 8), (11.6, 8), (6.5, 14)], '#ff9db8'); c.ell(12, 10, 3, 3, '#ffd84d')
@icon('pets')
def _(c): c.ell(8, 9, 6, 5, '#fff6e6'); c.ell(4, 4, 2, 2.4, '#fff6e6'); c.ell(12, 4, 2, 2.4, '#fff6e6'); c.pts([(6, 8), (10, 8)], '#4a3548')
@icon('care')
def _(c): c.rect(2, 4, 12, 10, '#ffd0e0'); c.poly([(8, 1), (2, 6), (14, 6)], '#ff8aae'); c.ell(8, 10, 2.4, 2.4, '#ff4a7e')
for i, (nm, col) in enumerate((('star', '#ffd84d'), ('flame', '#ff8a3d'), ('leaf', '#8fd96b'), ('moon', '#b9a6e6'), ('cloud', '#bfe3ff'), ('drop', '#6bc7ff'))):
    def mkp(col=col, nm=nm):
        def f(c):
            c.ell(8, 8, 7, 7, col); c.rect(4, 6, 2, 3, '#4a3548'); c.rect(10, 6, 2, 3, '#4a3548'); c.rect(7, 10, 2, 1, '#4a3548'); c.set(5, 6, '#ffffff'); c.set(11, 6, '#ffffff')
            c.ell(3.4, 10, 1.4, 1, '#ff9db8'); c.ell(12.6, 10, 1.4, 1, '#ff9db8')
        return f
    ICON['profile_' + nm] = mkp()

# --------------------------------------------------------------- effects (16x16)
EFFECT = {}
def effect(id):
    def deco(fn): EFFECT[id] = fn; return deco
    return deco
@effect('heart')
def _(c): ICON['heart'](c)
@effect('star')
def _(c): ICON['star'](c)
@effect('zzz')
def _(c): c.rect(2, 2, 7, 2, '#8a7ac0'); c.line(8, 4, 2, 9, '#8a7ac0'); c.rect(2, 9, 7, 2, '#8a7ac0'); c.rect(9, 10, 5, 1, '#a898e0'); c.rect(13, 11, 1, 1, '#a898e0'); c.rect(9, 14, 5, 1, '#a898e0')
@effect('sweat')
def _(c): c.poly([(8, 1), (3, 9), (13, 9)], '#7fd0ff'); c.ell(8, 10, 5, 4.6, '#7fd0ff'); c.set(6, 9, '#ffffff')
@effect('music')
def _(c): c.ell(5, 12, 3, 2.4, '#8a78d0'); c.rect(7, 2, 2, 10, '#8a78d0'); c.poly([(9, 2), (14, 5), (9, 7)], '#8a78d0')
@effect('sparkle')
def _(c): c.poly(star_pts(8, 8, 7.5, 1.6, 4), '#fff6a8')
@effect('bubble')
def _(c): c.ell(8, 8, 6, 6, '#bfe8ff'); c.set(5, 5, '#ffffff'); c.set(6, 5, '#ffffff'); c.set(5, 6, '#ffffff')
@effect('flame')
def _(c): ICON['firejelly'](c) if 'firejelly' in ICON else c.poly([(8, 0), (2, 10), (8, 15), (14, 10)], '#ff5a3c')
@effect('drop')
def _(c): c.poly([(8, 1), (3, 9), (13, 9)], '#6bc7ff'); c.ell(8, 10, 5, 4.6, '#6bc7ff'); c.set(6, 9, '#ffffff')
@effect('note')
def _(c): c.ell(4, 12, 2.6, 2, '#ff9db8'); c.ell(11, 11, 2.6, 2, '#ff9db8'); c.rect(5, 3, 1, 9, '#ff9db8'); c.rect(12, 2, 1, 9, '#ff9db8'); c.rect(5, 3, 8, 2, '#ff9db8')
@effect('anger')
def _(c): [c.rect(x, y, w, h, '#ff4a4a') for x, y, w, h in ((2, 7, 5, 2), (4, 5, 2, 6), (9, 3, 5, 2), (11, 1, 2, 6), (9, 10, 5, 2), (11, 8, 2, 6))]
@effect('question')
def _(c): c.ell(8, 5, 4, 3.6, '#6bc7ff'); c.ell(8, 5, 2, 1.6, '#00000000'); c.rect(9, 7, 3, 3, '#6bc7ff'); c.rect(6, 9, 3, 2, '#6bc7ff'); c.rect(6, 13, 3, 2, '#6bc7ff')
@effect('exclaim')
def _(c): c.rect(6, 1, 4, 9, '#ffd84d'); c.rect(6, 12, 4, 3, '#ffd84d')
@effect('coin_fx')
def _(c): ICON['coin'](c)
@effect('dust')
def _(c): c.ell(4, 10, 3, 3, '#e8dccb'); c.ell(9, 8, 4, 4, '#f4ece0'); c.ell(12, 11, 2.6, 2.6, '#e8dccb')
@effect('tear')
def _(c): c.poly([(8, 3), (5, 9), (11, 9)], '#7fd0ff'); c.ell(8, 10, 3.4, 3.4, '#7fd0ff')
@effect('foam')
def _(c): c.ell(5, 9, 4, 4, '#ffffff'); c.ell(11, 7, 4, 4, '#ffffff'); c.ell(9, 11, 3, 3, '#ffffff'); c.set(4, 8, '#bfe8ff')

# --------------------------------------------------------------- minigame sprites
MG = {}
def mg(id, w, h):
    def deco(fn): MG[id] = (w, h, fn); return fn
    return deco
@mg('star', 16, 16)
def _(c): c.poly(star_pts(8, 8.5, 7.5, 3.2), '#ffe27a'); c.set(6, 6, '#ffffff')
@mg('star_gold', 16, 16)
def _(c): c.poly(star_pts(8, 8.5, 7.5, 3.2), '#ffb800'); c.poly(star_pts(8, 8.5, 4.4, 1.9), '#ffe98a')
@mg('rock', 16, 16)
def _(c): c.ell(8, 9, 6.5, 5.5, '#9a9aaa'); c.ell(6, 7, 3, 2.4, '#bcbccb'); c.rect(9, 11, 4, 1, '#7a7a8a')
@mg('basket', 28, 20)
def _(c): c.poly([(1, 5), (27, 5), (23, 18), (5, 18)], '#c98f55'); c.rect(0, 3, 28, 3, '#a8744a'); [c.rect(x, 7, 1, 10, '#a8744a') for x in (8, 13, 18)]; c.rect(4, 11, 20, 1, '#a8744a')
@mg('fish_small', 16, 12)
def _(c): c.ell(7, 6, 6, 4, '#8fe3a8'); c.poly([(11, 6), (15, 2), (15, 10)], '#6bc7a0'); c.set(4, 5, '#2a2250')
@mg('fish_mid', 16, 12)
def _(c): c.ell(7, 6, 6.4, 4.6, '#6bc7ff'); c.poly([(11, 6), (15, 1), (15, 11)], '#4a9eff'); c.set(4, 5, '#2a2250'); c.rect(6, 8, 4, 1, '#bfe8ff')
@mg('fish_gold', 16, 12)
def _(c): c.ell(7, 6, 6.4, 4.6, '#ffc83d'); c.poly([(11, 6), (15, 1), (15, 11)], '#ff9d3d'); c.set(4, 5, '#2a2250'); c.rect(6, 4, 4, 1, '#fff2a8')
@mg('bobber', 8, 10)
def _(c): c.ell(4, 6, 3, 3, '#ff4a4a'); c.rect(1, 6, 6, 1, '#ffffff'); c.rect(3, 1, 2, 3, '#8a5a3c')
@mg('card_back', 24, 24)
def _(c): c.rect(1, 1, 22, 22, '#8a78d0'); c.rect(3, 3, 18, 18, '#a898e0'); c.poly(star_pts(12, 12, 6, 2.6), '#ffe27a')
@mg('obstacle_rock', 16, 16)
def _(c): c.ell(8, 10, 7, 6, '#9a9aaa'); c.ell(6, 8, 3, 2.5, '#bcbccb'); c.rect(9, 12, 4, 1, '#7a7a8a')
@mg('obstacle_bush', 16, 24)
def _(c): c.ell(8, 17, 7, 6, '#4f9a45'); c.ell(8, 10, 5, 6, '#6bbd55'); c.pts([(5, 8), (10, 12), (7, 16)], '#ff9db8')
@mg('flag', 16, 16)
def _(c): c.rect(3, 1, 2, 14, '#8a5a3c'); c.poly([(5, 2), (14, 5), (5, 8)], '#ff4a6a')
@mg('note_tile', 24, 10)
def _(c): c.rect(0, 0, 24, 10, '#ff9db8'); c.rect(1, 1, 22, 3, '#ffc9d6'); c.rect(1, 6, 22, 3, '#f27a9c')
@mg('pond', 96, 40)
def _(c): c.ell(48, 22, 46, 16, '#6bc7ff'); c.ell(48, 20, 40, 12, '#8fdcff'); c.pts([(20, 18), (60, 24), (40, 14), (75, 18)], '#ffffff')

# --------------------------------------------------------------- logo / title / pwa
G = {  # 5x7 glyphs
 'P': ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
 'I': ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
 'X': ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
 'E': ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
 'L': ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
 'F': ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
}
def logo():
    sc = 3
    def word(t, w):
        c = Cv(w, 7 * sc + 4)
        x = 2
        for ch in t:
            for j, row in enumerate(G[ch]):
                for i, v in enumerate(row):
                    if v == '#':
                        col = ['#ffc9d6', '#ffc9d6', '#ffb0c8', '#ff9db8', '#ff9db8', '#f27a9c', '#f27a9c'][j]
                        c.rect(x + i * sc, 2 + j * sc, sc, sc, col)
            x += 6 * sc
        return c
    top = word('PIXEL', 98); bot = word('LIFE', 80)
    out = Cv(104, 56)
    out.paste(top, 3, 1); out.paste(bot, 12, 27)
    sh = Cv(104, 56)
    sh.paste(out); sh.outline(OUT); sh.outline(OUT)
    fin = Cv(104, 56)
    for y in range(56):
        for x in range(104):
            if sh.get(x, y)[3]: fin.set(x, y + 0, sh.get(x, y)) if False else None
    base = Cv(104, 56); base.paste(out); base.outline(OUT)
    s2 = Cv(104, 56)
    for y in range(56):
        for x in range(104):
            v = base.get(x, y)
            if v[3]: s2.set(x, y, v)
    # drop shadow
    res = Cv(104, 56)
    for y in range(55):
        for x in range(103):
            if base.get(x, y)[3]: res.set(x + 1, y + 1, '#c08aa0')
    res.paste(base)
    # star sparkles
    for (x, y) in ((100, 6), (4, 50)): res.pts([(x, y), (x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)], '#ffe27a')
    return res

def title_bg():
    c = Cv(192, 160)
    bands = ['#cfeaff', '#d8efff', '#e3f4ff', '#f0f9ff', '#fff3da', '#ffe9c8']
    for y in range(160): c.rect(0, y, 192, 1, bands[min(5, y * 6 // 108)])
    c.ell(40, 150, 90, 46, '#a8e6a0'); c.ell(150, 156, 100, 50, '#8fd98a'); c.ell(96, 170, 120, 40, '#7acb78')
    rnd = random.Random(7)
    for _ in range(40):
        x, y = rnd.randrange(0, 192), rnd.randrange(112, 160); c.set(x, y, '#6fbf6c'); c.set(x, y - 1, '#6fbf6c')
    for (x, y, col) in ((20, 128, '#ff9db8'), (160, 134, '#fff3b0'), (60, 146, '#ffffff'), (130, 150, '#ffb3c7'), (176, 122, '#ffffff'), (30, 150, '#ffe27a')):
        c.pts([(x, y), (x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)], col); c.set(x, y, '#ffe27a')
    return c

def cloud(i):
    c = Cv(40, 18)
    if i == 0: c.ell(12, 11, 10, 5, '#ffffff'); c.ell(22, 8, 8, 6, '#ffffff'); c.ell(28, 12, 8, 4, '#ffffff')
    elif i == 1: c.ell(20, 11, 16, 5, '#ffffff'); c.ell(15, 7, 7, 5, '#ffffff'); c.ell(25, 8, 6, 4, '#ffffff')
    else: c.ell(10, 11, 8, 4, '#ffffff'); c.ell(20, 9, 8, 5, '#ffffff')
    c.outline('#bcd9f0')
    return c

def pwa_icon():
    c = Cv(64, 64)
    for y in range(64): c.rect(0, y, 64, 1, mix('#ffc9d6', '#d9c7f1', y / 63))
    e = egg_frame('starlight')
    big = Cv(64, 64)
    for y in range(32):
        for x in range(32):
            v = e.get(x, y)
            if v[3]:
                for dy in range(1): pass
    # scale egg 1.5x by nearest
    for y in range(64):
        for x in range(64):
            sx, sy = int((x - 8) / 1.5), int((y - 10) / 1.5)
            if 0 <= sx < 32 and 0 <= sy < 32:
                v = e.get(sx, sy)
                if v[3]: c.set(x, y, v)
    for (x, y) in ((10, 12), (52, 20), (14, 50), (50, 52)): c.pts([(x, y), (x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1), (x, y - 2), (x, y + 2)], '#ffffff')
    return c
