#!/usr/bin/env python3
"""Tighten clothing layers onto the hero's base body: sleeves, trousers and shoes.

  python3 tools/refit.py [<piece id> ...]        (no ids = every top, coat, trousers and shoes)

tools/autofit.py lines up hats and collars. This handles the rest of the body. For each piece it
searches for the horizontal/vertical stretch and shift that leaves the least paint outside his
body (sleeves standing off his arms, trouser legs wider than his legs) while still covering what
the piece covered before. Shoes are fitted one at a time so each covers its whole foot, sole on
the floor. A coat's -cover.png mask gets the same move as the coat.

Originals are kept in <scratch>/_raw (pass RAW=dir in the environment), never overwritten twice.
"""
import os
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
DIR = ROOT / 'public' / 'art' / 'hero' / 'wardrobe'
RAW = Path(os.environ.get('RAW', DIR / '_raw'))
TOPS = ['linen-shirt', 'galabiya-work', 'galabiya-white', 'galabiya-wool', 'dress-shirt', 'kaftan',
        'vest-embroidered', 'stambouli', 'linen-suit', 'bisht', 'frock-coat', 'burnous']
LEGS = ['sirwal', 'linen-trousers', 'wool-trousers', 'morning-trousers']
SLEEVELESS = {'vest-embroidered'}
ANKLE_LENGTH = {'galabiya-white', 'galabiya-work', 'galabiya-wool', 'kaftan'}
FEET = ['babouche', 'markub-red', 'oxfords', 'spectator', 'boots']
Q = 4  # search at a quarter of full size

base_full = np.array(Image.open(DIR.parent / 'hero-base-wardrobe.png').convert('RGBA'))
H, W = base_full.shape[:2]
B = base_full[..., 3] > 40
b = B[::Q, ::Q]
tol = ndimage.binary_dilation(b, iterations=3)
ys, xs = np.nonzero(B)
CX = (xs.min() + xs.max()) / 2
# the ankles: the narrowest row of the legs in the lowest fifth, just above the feet
SOLE = int(ys.max())
rows = np.arange(int(H * 0.8), SOLE - int(H * 0.035))
width = np.array([B[r].sum() for r in rows])
ANKLE = int(rows[np.argmin(width)])
feet = b.copy(); feet[: ANKLE // Q, :] = False
# the front of the foot and the toes; a backless slipper rightly shows the heel
toes = b.copy(); toes[: (SOLE - 48) // Q, :] = False


def pts(mask):
    y, x = np.nonzero(mask)
    return x.astype(np.float32), y.astype(np.float32)


def raster(x, y, shape):
    m = np.zeros(shape, bool)
    xi, yi = np.round(x).astype(int), np.round(y).astype(int)
    ok = (xi >= 0) & (xi < shape[1]) & (yi >= 0) & (yi < shape[0])
    m[yi[ok], xi[ok]] = True
    return ndimage.binary_closing(m, iterations=1)


def search(px, py, ax, ay, sxs, sys_, dxs, dys, must, need):
    """Least spill outside the body, keeping `need` of the pixels in `must` covered."""
    best = None
    total = max(1, must.sum())
    for sx in sxs:
        for sy in sys_:
            for dx in dxs:
                for dy in dys:
                    m = raster(ax + (px - ax) * sx + dx, ay + (py - ay) * sy + dy, b.shape)
                    if (m & must).sum() / total < need:
                        continue
                    spill = (m & ~tol).sum()
                    key = (spill, abs(sx - 1) + abs(sy - 1))
                    if best is None or key < best[0]:
                        best = (key, sx, sy, dx, dy)
    return best


def warp(img, ax, ay, sx, sy, dx, dy, box=None):
    """Scale about (ax, ay) and shift, in full-size pixels; `box` limits it to part of the image."""
    a = np.array(img).astype(np.float32)
    out = np.zeros_like(a) if box is None else a.copy()
    src = a if box is None else np.where(box[..., None], a, 0)
    if box is not None:
        out[box] = 0
    # output (y, x) samples input at ((y - dy - ay) / sy + ay, (x - dx - ax) / sx + ax)
    mat = np.diag([1 / sy, 1 / sx])
    off = [ay - (ay + dy) / sy, ax - (ax + dx) / sx]
    for c in range(4):
        ch = ndimage.affine_transform(src[..., c], mat, offset=off, order=1, mode='constant', cval=0)
        out[..., c] = np.maximum(out[..., c], ch) if box is not None else ch
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


def save(pid, img, moves):
    f = DIR / f'{pid}.png'
    RAW.mkdir(parents=True, exist_ok=True)
    if not (RAW / f.name).exists():
        Image.open(f).save(RAW / f.name)
    img.save(f, optimize=True)
    cover = DIR / f'{pid}-cover.png'
    if cover.exists() and moves:
        if not (RAW / cover.name).exists():
            Image.open(cover).save(RAW / cover.name)
        c = Image.open(RAW / cover.name).convert('RGBA')
        if c.size != (W, H):
            c = c.resize((W, H))
        for mv in moves:
            c = warp(c, *mv)
        c.save(cover, optimize=True)


def raw(pid):
    f = RAW / f'{pid}.png'
    return Image.open(f if f.exists() else DIR / f'{pid}.png').convert('RGBA')


def fit_body(pid, legs):
    img = raw(pid)
    p = np.array(img)[..., 3][::Q, ::Q] > 40
    must = b & p
    px, py = pts(p)
    top = py.min()
    ax, ay = CX / Q, top  # the neckline or waistband stays put
    if legs:
        # trousers: fill the legs from the waistband to just above the ankle, no wider than needed
        # and on down the shins to just above the ankle, within the width of the trouser legs
        bottom = int(py.max())
        low = np.nonzero(p[bottom - 6: bottom + 1].any(axis=0))[0]
        shins = np.zeros_like(b); shins[bottom:(ANKLE - 12) // Q, low.min(): low.max() + 1] = True
        must = must | (b & shins)
        best = search(px, py, ax, ay, np.arange(0.80, 1.07, 0.02), np.arange(0.96, 1.20, 0.02), np.arange(-4, 5, 2), [0], must, 0.97)
    elif pid in SLEEVELESS:
        # a vest covers his chest and back only: his arms hang outside it
        sh = B[int(H * 0.26)]
        xs0 = np.nonzero(sh)[0]
        chest = np.zeros_like(b); chest[int(top): int(py.max()), (xs0.min() + 14) // Q: (xs0.max() - 14) // Q] = True
        must = b & p & chest
        best = search(px, py, ax, ay, np.arange(0.70, 1.02, 0.02), [1.0], np.arange(-4, 5, 2), [0], must, 0.97)
    else:
        best = search(px, py, ax, ay, np.arange(0.80, 1.05, 0.02), [1.0], np.arange(-4, 5, 2), [0], must, 0.985)
    if not best:
        print(f'{pid}: no fit keeps it covering him; left as is'); return
    _, sx, sy, dx, dy = best
    if pid in ANKLE_LENGTH:
        # an ankle-length robe painted short: let the hem down to just above the ankle
        full = np.nonzero(np.array(img)[..., 3] > 40)[0]
        sy = max(sy, (ANKLE - 30 - full.min()) / (full.max() - full.min()))
    mv = (CX, ay * Q, sx, sy, dx * Q, dy * Q)
    save(pid, warp(img, *mv), [mv])
    print(f'{pid}: width x{sx:.2f}, length x{sy:.2f}, shift {dx * Q:+.0f}px')


def fit_feet(pid):
    img = raw(pid)
    a = np.array(img)[..., 3] > 40
    out, moves = img, []
    for side in (0, 1):  # his right foot is on the left of the picture
        half = np.zeros_like(a); half[:, : int(CX)] = side == 0; half[:, int(CX):] = side == 1
        shoe = (a & half)[::Q, ::Q]
        if not shoe.any():
            continue
        foot = toes & half[::Q, ::Q]
        px, py = pts(shoe)
        fy, fx = np.nonzero(foot)
        ax, ay = px.mean(), py.max()  # scale about the sole
        dx0, dy0 = fx.mean() - ax, fy.max() - ay
        # the smallest shoe that hides every toe, its sole on the floor
        best = None
        for s in np.arange(0.9, 1.6, 0.03):
            best = search(px, py, ax, ay, [s], [s], np.arange(dx0 - 10, dx0 + 11, 1), np.arange(dy0 - 3, dy0 + 9, 1), foot, 0.97)
            if best:
                break
        if not best:
            print(f'{pid}: side {side} cannot cover the foot; left as is'); continue
        _, s, _, dx, dy = best
        mv = (ax * Q, ay * Q, s, s, dx * Q, dy * Q, half)
        out = warp(out, *mv)
        moves.append(mv)
        print(f'{pid} side {side}: size x{s:.2f}, shift {dx * Q:+.0f},{dy * Q:+.0f}px')
    save(pid, out, [])


if __name__ == '__main__':
    ids = sys.argv[1:] or TOPS + LEGS + FEET
    print(f'ankle row {ANKLE}, sole row {SOLE}')
    for pid in ids:
        if not (DIR / f'{pid}.png').exists() and not (RAW / f'{pid}.png').exists():
            continue
        if pid in FEET:
            fit_feet(pid)
        else:
            fit_body(pid, pid in LEGS)
