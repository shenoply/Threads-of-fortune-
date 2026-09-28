#!/usr/bin/env python3
"""Cut each prop out of its ChatGPT edit by comparing it with the empty stall it was made from.
  python3 tools/prop-extract.py <folder of edits> <out folder>
Writes <name>.png (the prop alone, transparent, full 1536x1024 canvas so it lines up) and prints
how well each edit kept the rest of the picture (median difference) and where the prop landed."""
import sys, os, glob, json
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
import importlib.util
_s = importlib.util.spec_from_file_location('lp', 'tools/layer-prep.py'); _lp = importlib.util.module_from_spec(_s); _s.loader.exec_module(_lp)
cut = _lp.cut_out
base = Image.open('public/art/stall2/stall-empty-patched.png').convert('RGB')
inp, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
B = np.asarray(base.filter(ImageFilter.GaussianBlur(2))).astype(int)
report = {}
# glass, thin blades and flat cloth confuse rembg: use the changed area for these
DIFF_ONLY = {'prop-lamp', 'prop-swords', 'prop-prayerrug'}
for f in sorted(glob.glob(os.path.join(inp, '*.png'))):
    name = os.path.basename(f)[:-4]
    im = Image.open(f).convert('RGB')
    if im.size != base.size: im = im.resize(base.size, Image.LANCZOS)
    A = np.asarray(im.filter(ImageFilter.GaussianBlur(2))).astype(int)
    d = np.abs(A - B).sum(2)
    med = float(np.median(d))
    thr = max(40, np.percentile(d, 90) * 2.2)
    m = ndimage.binary_opening(d > thr, iterations=2)
    lab, n = ndimage.label(ndimage.binary_closing(m, iterations=6))
    if n == 0: report[name] = {'median': med, 'box': None}; continue
    sizes = ndimage.sum(m, lab, range(1, n + 1)); big = int(np.argmax(sizes)) + 1
    keep = lab == big
    # also keep other large pieces close to the main one (e.g. the second lantern, smoke)
    for i, s in enumerate(sizes, 1):
        if i != big and s > sizes[big - 1] * 0.25: keep |= lab == i
    keep = ndimage.binary_fill_holes(keep)
    keep = ndimage.binary_dilation(keep, iterations=2)
    # the object itself, without the patch of wall ChatGPT repainted around it: cut the object out of
    # its box with rembg and keep only what lies inside the changed area
    ys, xs = np.where(keep); pad = 12
    x0, y0 = max(xs.min() - pad, 0), max(ys.min() - pad, 0); x1, y1 = min(xs.max() + pad, im.width), min(ys.max() + pad, im.height)
    obj = np.asarray(cut(im.crop((x0, y0, x1, y1))))[..., 3] / 255.0
    alpha = np.zeros(keep.shape); alpha[y0:y1, x0:x1] = obj
    alpha *= ndimage.gaussian_filter(ndimage.binary_dilation(keep, iterations=6).astype(float), 2)
    if name in DIFF_ONLY or alpha.max() < 0.5:   # rembg found nothing: fall back to the changed area
        alpha = ndimage.gaussian_filter(keep.astype(float), 1.2)
    keep = alpha > 0.3
    rgba = np.dstack([np.asarray(im), (alpha * 255).astype(np.uint8)])
    Image.fromarray(rgba).save(os.path.join(out, name + '.png'), optimize=True)
    ys, xs = np.where(keep)
    report[name] = {'median': round(med, 1), 'box': [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]}
    print(f'{name:22s} rest-of-picture diff {med:5.1f}   prop at x {xs.min()}-{xs.max()}, y {ys.min()}-{ys.max()}')
json.dump(report, open(os.path.join(out, 'report.json'), 'w'), indent=1)
