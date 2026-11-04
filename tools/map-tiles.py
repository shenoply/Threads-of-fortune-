#!/usr/bin/env python3
"""The travel map's close-zoom tiles, cut straight from the full-size master (art-src/world/travel-map-master-4800.png).

Close in on a phone the single 4800-wide painting is blown up two to four times on the screen and reads as a soft
smear. These tiles carry the same painting at twice that (9600 x 5826 in all, 1024 px tiles), made only from the
master with nothing invented: a Lanczos enlargement, a gentle local-contrast pass (a broad one for the forms and a fine
one for the brushwork, on the lightness only, so colours do not shift), and a faint hand-made paper grain (fine tooth,
a little mottling and long fibres, all drawn procedurally from the pixel's position, so the grain runs on unbroken
from one tile into the next). Nothing moves: tile (c, r) is exactly the master's pixels c*512 .. c*512+512 across and
r*512 .. down, doubled, so the tiles lie exactly over the single picture.

  python3 -I tools/map-tiles.py [--out public/art/world/tiles2-9k] [--master PNG] [--treated] [--crop x,y,w out.png] [--q 84]

Since 2026-11-04 the master is the repainted one (art-src/world/travel-map-master2-4800.png, tools/map-repaint.py): its detail is
painted, so the tiles are its plain Lanczos doubling; --treated brings back the contrast and grain pass made for the old master.

Writes <out>/r<row>c<col>.webp (the grid's size is MAP_TILES in src/game/systems/mapRender.ts). --crop writes a before/after strip
of one spot (master pixels) instead, for review.
"""
import argparse, os, sys
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MASTER = os.path.join(ROOT, 'art-src/world/travel-map-master2-4800.png')
TILE = 1024          # tile size, enlarged pixels
UP = 2               # enlargement
PAD = 48             # master pixels round each tile while working (the blurs reach this far)


def hash2(ix, iy, seed):
    """a well-mixed 0..1 value for each integer lattice point (uint32 arithmetic)"""
    h = (ix.astype(np.uint32) * np.uint32(0x8DA6B343)) ^ (iy.astype(np.uint32) * np.uint32(0xD8163841)) ^ np.uint32(seed * 0x9E3779B9 & 0xFFFFFFFF)
    h ^= h >> np.uint32(13)
    h *= np.uint32(0x5BD1E995)
    h ^= h >> np.uint32(15)
    return (h & np.uint32(0xFFFFFF)).astype(np.float32) / np.float32(0xFFFFFF)


def value_noise(u, v, seed):
    """smooth value noise at real coordinates u, v (lattice step 1), about -0.5..0.5"""
    iu, iv = np.floor(u), np.floor(v)
    fu, fv = u - iu, v - iv
    fu, fv = fu * fu * (3 - 2 * fu), fv * fv * (3 - 2 * fv)
    iu, iv = iu.astype(np.int64), iv.astype(np.int64)
    a = hash2(iu, iv, seed); b = hash2(iu + 1, iv, seed); c = hash2(iu, iv + 1, seed); d = hash2(iu + 1, iv + 1, seed)
    return (a + (b - a) * fu + (c - a) * fv + (a - b - c + d) * fu * fv) - 0.5


def grain(x0, y0, w, h):
    """the paper, for the enlarged pixels x0..x0+w, y0..y0+h: fine tooth, soft mottling, long fibres at a slant"""
    y, x = np.mgrid[y0:y0 + h, x0:x0 + w].astype(np.float32)
    tooth = value_noise(x / 1.6, y / 1.6, 1) * 0.9 + value_noise(x / 3.5, y / 3.5, 2) * 0.7
    mottle = value_noise(x / 22, y / 22, 3) * 0.8 + value_noise(x / 60, y / 60, 4) * 0.6
    a = np.float32(0.42)
    fu, fv = x * np.cos(a) + y * np.sin(a), -x * np.sin(a) + y * np.cos(a)
    fibre = value_noise(fu / 26, fv / 1.8, 5) * 0.8
    return tooth * 0.55 + mottle * 0.35 + fibre * 0.45


def _box(a, r, axis):
    """a box blur of half-width r along one axis (edges held)"""
    n = a.shape[axis]
    p = np.pad(a, [(r + 1, r) if k == axis else (0, 0) for k in range(a.ndim)], mode='edge')
    c = np.cumsum(p, axis=axis, dtype=np.float64)
    hi = np.take(c, np.arange(2 * r + 1, 2 * r + 1 + n), axis=axis)
    lo = np.take(c, np.arange(0, n), axis=axis)
    return ((hi - lo) / (2 * r + 1)).astype(np.float32)


def blur(a, sigma):
    """a Gaussian blur of a float image (one channel), as three box blurs each way"""
    r = max(1, int(round((np.sqrt(12 * sigma * sigma / 3 + 1) - 1) / 2)))
    for _ in range(3):
        a = _box(_box(a, r, 0), r, 1)
    return a


PLAIN = True   # the repainted master (since 2026-11-04) carries its own brushwork: no contrast pass, no grain


def treat(rgb, gx0, gy0):
    """the enlarged, treated picture for an RGB uint8 crop of the master whose top-left is master pixel (gx0, gy0)"""
    im = Image.fromarray(rgb)
    up = im.resize((im.width * UP, im.height * UP), Image.LANCZOS)
    if PLAIN:
        return np.asarray(up)
    a = np.asarray(up, dtype=np.float32) / 255
    L = a @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    # local contrast on the lightness: a broad pass (forms, relief) and a fine one (the brush), both gentle
    d = (L - blur(L, 16)) * 0.3 + (L - blur(L, 2.4)) * 0.3
    # never more than a little either way (no halos round the coasts and rivers)
    d = np.clip(d, -0.05, 0.05)
    a = a + d[..., None]
    g = grain(gx0 * UP, gy0 * UP, a.shape[1], a.shape[0])
    # the grain multiplies, a touch less in the shadows, so dark seas are not speckled
    k = 0.11 * (0.6 + 0.4 * np.clip(L, 0, 1))
    a = a * (1 + g[..., None] * k[..., None])
    return np.clip(a * 255 + 0.5, 0, 255).astype(np.uint8)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=os.path.join(ROOT, 'public/art/world/tiles2-9k'))
    ap.add_argument('--master', default=MASTER)
    ap.add_argument('--treated', action='store_true', help='the old local-contrast and paper-grain pass (for the old, softer master)')
    ap.add_argument('--q', type=int, default=84)
    ap.add_argument('--crop', nargs=2, metavar=('X,Y,W', 'OUT'))
    a = ap.parse_args()
    global PLAIN
    PLAIN = not a.treated
    m = np.asarray(Image.open(a.master).convert('RGB'))
    H, W = m.shape[:2]
    padded = np.pad(m, ((PAD, PAD), (PAD, PAD), (0, 0)), mode='edge')
    if a.crop:
        x, y, w = map(int, a.crop[0].split(','))
        src = padded[y:y + w + 2 * PAD, x:x + w + 2 * PAD]
        t = treat(src, x - PAD, y - PAD)[PAD * UP:(PAD + w) * UP, PAD * UP:(PAD + w) * UP]
        plain = Image.fromarray(m[y:y + w, x:x + w]).resize((w * UP, w * UP), Image.BICUBIC)
        strip = Image.new('RGB', (w * UP * 2 + 8, w * UP), (40, 30, 20))
        strip.paste(plain, (0, 0)); strip.paste(Image.fromarray(t), (w * UP + 8, 0))
        strip.save(a.crop[1])
        return
    os.makedirs(a.out, exist_ok=True)
    half = TILE // UP
    cols, rows = -(-W // half), -(-H // half)
    total = 0
    for r in range(rows):
        for c in range(cols):
            x0, y0 = c * half, r * half
            w, h = min(half, W - x0), min(half, H - y0)
            src = padded[y0:y0 + h + 2 * PAD, x0:x0 + w + 2 * PAD]
            t = treat(src, x0 - PAD, y0 - PAD)[PAD * UP:(PAD + h) * UP, PAD * UP:(PAD + w) * UP]
            p = os.path.join(a.out, f'r{r}c{c}.webp')
            Image.fromarray(t).save(p, 'WEBP', quality=a.q, method=6)
            total += os.path.getsize(p)
        print(f'row {r + 1}/{rows}', file=sys.stderr)
    print(f'{cols} x {rows} tiles of {TILE}, {W * UP} x {H * UP} in all, {total / 1e6:.1f} MB')


if __name__ == '__main__':
    main()
