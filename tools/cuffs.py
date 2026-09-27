#!/usr/bin/env python3
"""Put his arm inside the sleeve: shade each cuff opening and carry the forearm up into it.

  python3 tools/cuffs.py <piece id> ...      (reads and writes public/art/hero/wardrobe/<id>.png)

Sleeves come from the image generator as empty tubes: the inside of the cuff is painted pale and
his forearm, drawn underneath, seems to come out beside the sleeve instead of from inside it.
For each cuff (columns where the forearm continues below the sleeve), an oval opening is fitted
to the bottom of the sleeve and filled with his own forearm in shadow, feathered into the cloth.
Run it once per picture, after tools/refit.py (refit starts again from the untouched original).
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

HERO = Path(__file__).resolve().parent.parent / 'public' / 'art' / 'hero'
base = np.array(Image.open(HERO / 'hero-base-wardrobe.png').convert('RGBA')).astype(np.float32)
B = base[..., 3] > 40
# bare skin (his forearm), not the pale linen underclothes of the base body
SKIN = B & ((base[..., 0] - base[..., 2]) > 80) & (base[..., 0] < 200)
Hh, W = B.shape
CX = W // 2


def cuffs(a):
    A = a[..., 3] > 40
    found = []
    for side in (-1, 1):
        xs = range(0, CX - 110) if side < 0 else range(CX + 110, W)
        cols = []
        for x in xs:
            col = np.nonzero(A[450:1000, x])[0]
            if not len(col):
                continue
            bot = col.max() + 450
            if bot >= 990 or bot - (col.min() + 450) < 40:
                continue  # the robe's skirt, or a stray edge
            if SKIN[bot + 3: bot + 16, x].mean() > 0.85:
                cols.append((x, bot))
        if len(cols) < 12:
            continue
        # keep the widest run of neighbouring columns: that is the cuff over the forearm
        runs, cur = [], [cols[0]]
        for c in cols[1:]:
            if c[0] == cur[-1][0] + 1:
                cur.append(c)
            else:
                runs.append(cur); cur = [c]
        runs.append(cur)
        run = max(runs, key=len)
        # widen to the whole mouth of the sleeve: neighbouring columns whose sleeve ends near the same row
        med = int(np.median([b for _, b in run]))
        def bottom(x):
            col = np.nonzero(A[450:1000, x])[0]
            return col.max() + 450 if len(col) else None
        x0, x1 = run[0][0], run[-1][0]
        while x0 > 0 and (b := bottom(x0 - 1)) is not None and abs(b - med) < 18 and b < 990:
            x0 -= 1; run.insert(0, (x0, b))
        while x1 < W - 1 and (b := bottom(x1 + 1)) is not None and abs(b - med) < 18 and b < 990:
            x1 += 1; run.append((x1, b))
        found.append(run)
    return found


def fix(a):
    out = a.copy()
    yy, xx = np.mgrid[0:Hh, 0:W]
    for run in cuffs(a):
        x0, x1 = run[0][0], run[-1][0]
        bots = np.array([b for _, b in run], float)
        cx, rx = (x0 + x1) / 2, (x1 - x0) / 2 * 0.80
        ry = max(6.0, rx * 0.30)
        cy = np.median(bots) - ry - 7  # the back rim of the opening stays as painted
        d = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2
        m = np.clip((1 - d) / 0.35, 0, 1)  # feathered oval
        m = ndimage.gaussian_filter(m, 1.2)
        # inside: his forearm carried on up, in the shadow of the sleeve (darker deeper in)
        arm = base.copy()
        depth = np.clip((yy - (cy - ry)) / (2 * ry), 0, 1)
        shade = 0.28 + 0.34 * depth
        fill = np.where(B[..., None], arm[..., :3] * shade[..., None], np.array([40, 26, 16], float))
        k = m * (a[..., 3] / 255.0)
        out[..., :3] = out[..., :3] * (1 - k[..., None]) + fill * k[..., None]
    return out


if __name__ == '__main__':
    for pid in sys.argv[1:]:
        f = HERO / 'wardrobe' / f'{pid}.png'
        a = np.array(Image.open(f).convert('RGBA')).astype(np.float32)
        n = len(cuffs(a))
        Image.fromarray(fix(a).clip(0, 255).astype(np.uint8)).save(f, optimize=True)
        print(f'{pid}: {n} cuff(s) shaded')
