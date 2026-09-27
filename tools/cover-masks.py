#!/usr/bin/env python3
"""Make the masks that stop a shirt showing where a coat should hide it.

  python3 tools/cover-masks.py [pose]          (default: wardrobe)

For every coat or robe with sleeves (hidesUnder in src/data/wardrobe.ts, listed below), writes
public/art/hero/<pose>/<id>-cover.png: opaque where whatever he wears under the coat may show,
transparent where the coat hides it. Across the coat's height the shirt may show only where the
coat itself is, or in a strip down the middle of his chest (the open front and the collar). So a
shirt sleeve can never stick out past a coat sleeve or peep through the gap under the arm. Above
the coat only the collar shows; below its hem the shirt shows freely, so a galabiya still hangs
below a jacket.
The game applies the mask to the shirt layer when that coat is worn.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent / 'public' / 'art' / 'hero'
COATS = ['stambouli', 'linen-suit', 'kaftan', 'bisht', 'frock-coat', 'burnous']


def main():
    pose = sys.argv[1] if len(sys.argv) > 1 else 'wardrobe'
    bm = np.asarray(Image.open(ROOT / f'hero-base-{pose}.png').convert('RGBA'))[..., 3] > 100
    cx = bm.shape[1] / 2
    widths = np.array([np.ptp(np.where(r)[0]) if r.any() else 0 for r in bm])
    shoulder = widths[: int(bm.shape[0] * 0.4)].max()
    half = int(shoulder * 0.26)  # the open front of a coat stays within this of the centre line
    for pid in COATS:
        src = ROOT / pose / f'{pid}.png'
        if not src.exists():
            print(f'{pid}: no picture, skipped')
            continue
        a = np.asarray(Image.open(src).convert('RGBA'))[..., 3] > 90
        a = ndimage.binary_opening(a, iterations=2)
        h, w = a.shape
        ys = np.where(a.any(1))[0]
        top, bot = ys.min(), ys.max()
        allow = np.ones((h, w), bool)
        filled = ndimage.binary_closing(a, iterations=6)
        allow[top: bot + 1] = filled[top: bot + 1]
        # the open front: between the coat's two fronts, only on rows where it has both
        wide = int(half * 1.8)
        for y in range(top, bot + 1):
            xs = np.where(filled[y, int(cx - wide): int(cx + wide)])[0] + int(cx - wide)
            L = xs[xs < cx]; R = xs[xs > cx]
            if len(L) and len(R):
                allow[y, L.max(): R.min() + 1] = True
        # above the coat's shoulders only the collar shows; the shirt's own shoulders stay hidden
        allow[:top] = False
        allow[:top, int(cx - half * 0.38): int(cx + half * 0.38)] = True
        # soften so the cut never shows as a hard line
        m = Image.fromarray((allow * 255).astype(np.uint8))
        out = Image.new('RGBA', (w, h), (255, 255, 255, 0))
        out.putalpha(m)
        dest = ROOT / pose / f'{pid}-cover.png'
        out.save(dest, optimize=True)
        print(f'{pid}: mask saved')


if __name__ == '__main__':
    main()
