#!/usr/bin/env python3
"""Put his feet inside the shoes.

  python3 tools/feet.py [<shoe id> ...]      (no ids = every pair; run after tools/refit.py)

The shoes come from the image generator as empty shoes: the lining shows where his foot should
go in, and his bare foot, drawn underneath, pokes out around them at the heel and toes.
For each shoe this writes <id>-foot.png, a mask for the base body that hides his bare foot wherever it
    shows below the top of the shoe outside it (the game applies it while the shoes are worn).
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

HERO = Path(__file__).resolve().parent.parent / 'public' / 'art' / 'hero'
# painting his foot into the opening smeared skin over the shoe; left off
OPENING_FILL = False
SHOES = ['babouche', 'markub-red', 'oxfords', 'spectator', 'boots']
base = np.array(Image.open(HERO / 'hero-base-wardrobe.png').convert('RGBA')).astype(np.float32)
B = base[..., 3] > 40
SKIN = B & ((base[..., 0] - base[..., 2]) > 80) & (base[..., 0] < 200)
Hh, W = B.shape
yy, xx = np.mgrid[0:Hh, 0:W]


def shoes_of(a):
    """Each shoe of the pair as its own mask (left and right of the picture)."""
    A = a[..., 3] > 40
    lab, n = ndimage.label(ndimage.binary_closing(A, iterations=2))
    parts = [lab == i for i in range(1, n + 1)]
    parts = [p for p in parts if p.sum() > 800]
    return sorted(parts, key=lambda p: np.nonzero(p)[1].mean())


def fit(pid):
    f = HERO / 'wardrobe' / f'{pid}.png'
    a = np.array(Image.open(f).convert('RGBA')).astype(np.float32)
    out = a.copy()
    hide = np.zeros((Hh, W), bool)
    for shoe in shoes_of(a):
        ys, xs = np.nonzero(shoe)
        top = ys.min()
        # the opening: shoe pixels in the columns where his ankle comes down into it,
        # from the rim down to about a third of the shoe's height
        cols = [x for x in range(xs.min(), xs.max() + 1)
                if SKIN[max(0, top - 10): top - 1, x].mean() > 0.6 if top > 10]
        if cols and OPENING_FILL:
            xl, xr = min(cols), max(cols)
            depth = max(10, int((ys.max() - top) * 0.34))
            rim = np.array([np.nonzero(shoe[:, x])[0].min() if shoe[:, x].any() else top for x in range(xl, xr + 1)])
            region = np.zeros((Hh, W), float)
            for i, x in enumerate(range(xl, xr + 1)):
                region[rim[i]: rim[i] + depth, x] = 1
            region *= shoe
            # keep the shoe's own rim edge (a few pixels) around the opening
            inner = ndimage.binary_erosion(shoe, iterations=4)
            region *= inner
            region = ndimage.gaussian_filter(region, 1.6) * inner
            depthf = np.clip((yy - top) / depth, 0, 1)
            shade = 0.9 - 0.3 * depthf
            fill = base[..., :3] * shade[..., None]
            k = region * B
            out[..., :3] = out[..., :3] * (1 - k[..., None]) + fill * k[..., None]
        # bare foot outside the shoe, below its rim: hide it on the base body
        near = np.zeros((Hh, W), bool)
        x0, x1 = max(0, xs.min() - 40), min(W, xs.max() + 40)
        near[top + 6:, x0:x1] = True
        hide |= near & B & ~ndimage.binary_dilation(shoe, iterations=1)
    Image.fromarray(out.clip(0, 255).astype(np.uint8)).save(f, optimize=True)
    # mask for the base body: opaque = keep, clear = hide (feathered one pixel)
    keep = 1 - ndimage.gaussian_filter(hide.astype(float), 0.8)
    m = np.zeros((Hh, W, 4), np.uint8)
    m[..., :3] = 255
    m[..., 3] = (keep * 255).clip(0, 255).astype(np.uint8)
    Image.fromarray(m).save(HERO / 'wardrobe' / f'{pid}-foot.png', optimize=True)
    print(f'{pid}: feet in, {int(hide.sum())} px of bare foot hidden')


if __name__ == '__main__':
    for pid in sys.argv[1:] or SHOES:
        if (HERO / 'wardrobe' / f'{pid}.png').exists():
            fit(pid)
