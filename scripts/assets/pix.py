"""Tiny pixel-art drawing toolkit (Pillow). All shapes are hard-edged, no anti-aliasing."""
from PIL import Image
import math

def rgba(c, a=255):
    if isinstance(c, tuple):
        return c
    c = c.lstrip('#')
    if len(c) == 3:
        c = ''.join(ch * 2 for ch in c)
    if len(c) == 8:
        a = int(c[6:8], 16)
    return (int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16), a)

def mix(c1, c2, t):
    a, b = rgba(c1), rgba(c2)
    return '#%02x%02x%02x' % tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

OUT = '#4a3548'  # shared outline colour -> consistent art style

class Cv:
    def __init__(s, w, h):
        s.w, s.h = w, h
        s.im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        s.p = s.im.load()

    def get(s, x, y):
        if 0 <= x < s.w and 0 <= y < s.h:
            return s.p[x, y]
        return (0, 0, 0, 0)

    def set(s, x, y, c):
        x, y = int(x), int(y)
        if c is not None and 0 <= x < s.w and 0 <= y < s.h:
            s.p[x, y] = rgba(c)

    def rect(s, x, y, w, h, c):
        for j in range(int(h)):
            for i in range(int(w)):
                s.set(x + i, y + j, c)

    def ell(s, cx, cy, rx, ry, c, mask=None):
        for y in range(int(math.floor(cy - ry)) - 1, int(math.ceil(cy + ry)) + 2):
            for x in range(int(math.floor(cx - rx)) - 1, int(math.ceil(cx + rx)) + 2):
                if ((x + .5 - cx) / max(rx, .01)) ** 2 + ((y + .5 - cy) / max(ry, .01)) ** 2 <= 1:
                    s.set(x, y, c)
                    if mask is not None:
                        mask.add((x, y))

    def poly(s, pts, c, mask=None):
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
        for y in range(int(min(ys)) - 1, int(max(ys)) + 2):
            for x in range(int(min(xs)) - 1, int(max(xs)) + 2):
                px, py = x + .5, y + .5
                inside = False
                j = len(pts) - 1
                for i in range(len(pts)):
                    xi, yi = pts[i]; xj, yj = pts[j]
                    if (yi > py) != (yj > py) and px < (xj - xi) * (py - yi) / (yj - yi + 1e-9) + xi:
                        inside = not inside
                    j = i
                if inside:
                    s.set(x, y, c)
                    if mask is not None:
                        mask.add((x, y))

    def line(s, x0, y0, x1, y1, c):
        x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
        dx, dy = abs(x1 - x0), -abs(y1 - y0)
        sx = 1 if x0 < x1 else -1; sy = 1 if y0 < y1 else -1
        err = dx + dy
        while True:
            s.set(x0, y0, c)
            if x0 == x1 and y0 == y1:
                break
            e2 = 2 * err
            if e2 >= dy: err += dy; x0 += sx
            if e2 <= dx: err += dx; y0 += sy

    def pts(s, lst, c):
        for x, y in lst:
            s.set(x, y, c)

    def art(s, x, y, rows, pal):
        """Draw ASCII rows; '.' transparent. pal maps char -> colour."""
        for j, row in enumerate(rows):
            for i, ch in enumerate(row):
                if ch != '.' and ch in pal:
                    s.set(x + i, y + j, pal[ch])

    def outline(s, c=OUT):
        add = []
        for y in range(s.h):
            for x in range(s.w):
                if s.p[x, y][3] == 0:
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        if s.get(x + dx, y + dy)[3] > 0:
                            add.append((x, y)); break
        for x, y in add:
            s.p[x, y] = rgba(c)
        return s

    def paste(s, other, ox=0, oy=0):
        for y in range(other.h):
            for x in range(other.w):
                v = other.p[x, y]
                if v[3] > 0:
                    s.set(x + ox, y + oy, v)

    def paste_outlined(s, layer, c=OUT):
        """Composite a layer with its own outline (sticker look)."""
        big = Cv(s.w, s.h); big.paste(layer); big.outline(c)
        s.paste(big)

    def bbox(s):
        return s.im.getbbox()

def sheet(frames, w, h):
    out = Image.new('RGBA', (w * len(frames), h), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        out.paste(f.im, (i * w, 0))
    return out

def star_pts(cx, cy, r, ri=None, n=5, rot=-math.pi / 2):
    ri = ri or r * .45
    pts = []
    for i in range(n * 2):
        rr = r if i % 2 == 0 else ri
        a = rot + i * math.pi / n
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    return pts
