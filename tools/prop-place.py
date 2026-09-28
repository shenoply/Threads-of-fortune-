#!/usr/bin/env python3
"""Fix props ChatGPT put in the wrong place: keep only the part inside a crop box, then move/scale it.
Works on the cut-outs from prop-extract.py (full 1536x1024 transparent canvases), in place."""
from PIL import Image
import numpy as np
from scipy import ndimage
D = 'public/art/stall2/props/'
# name: (crop box on the canvas, dx, dy, scale, anchor) - anchor 'bottom' keeps the base on its new line
FIX = {
    'prop-hookah':    ((430, 355, 585, 500), 230, -16, 1.0),   # ChatGPT raised the shelf; put it back on the bottom shelf, right end
    'prop-prayerrug': ((505, 40, 705, 262), 0, -32, 0.54),        # too tall: it hung over the top shelf
    'prop-astrolabe': ((470, 75, 590, 212), 213, 0, 1.0),       # was in the middle; its spot is the right end
    'prop-gramophone':((530, 235, 705, 346), -143, 0, 1.0),     # was on the right; its spot is the left end
    'cat-counter':    ((150, 540, 400, 900), 520, 0, 1.0),        # the hero's hands cover the left end; sit her mid-counter
    'prop-birdcage':  ((540, 60, 690, 270), 0, -40, 0.82),        # hung lower than the top-shelf items; lift and shrink
}
for name, (box, dx, dy, s) in FIX.items():
    im = Image.open(D + name + '.png').convert('RGBA')
    part = im.crop(box)
    if s != 1.0:
        w, h = part.size; part = part.resize((int(w * s), int(h * s)), Image.LANCZOS)
        # scale about the top centre (hanging things) 
        nx = box[0] + (w - part.width) // 2; ny = box[1] + int(48 * (1 - s)) + 48
    else:
        nx, ny = box[0], box[1]
    out = Image.new('RGBA', im.size, (0, 0, 0, 0)); out.alpha_composite(part, (nx + dx, ny + dy))
    out.save(D + name + '.png', optimize=True)
    a = np.asarray(out)[..., 3] > 60; ys, xs = np.where(a)
    print(f'{name}: now x {xs.min()}-{xs.max()}, y {ys.min()}-{ys.max()}')
