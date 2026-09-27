#!/usr/bin/env python3
"""Cut a clothing layer out of a picture of the hero wearing it.

  python3 tools/dress-extract.py <pose> <piece id> <dressed image> [--debug]

Why: when the image generator draws a garment on its own, it draws it on an imaginary body in
its own pose, so sleeves stick out where the hero's arms are not. Asking it instead to DRESS the
base image keeps his pose, so sleeves follow his real arms. This tool then keeps only what changed:

  1. Cuts the man out of the dressed picture (rembg) if it has no transparency.
  2. Lines it up with the base body: same top of head and soles of the feet, same centre.
  3. Compares it with the base, pixel by pixel (in Lab colour, slightly blurred so brushwork
     noise does not count). What differs is the new clothing; skin, face and undershirt that the
     generator left alone drop out.
  4. Throws away the head (clothes stop at the collar; hats are made the other way), cleans
     specks, fills holes inside the garment and softens the edge.
  5. Saves public/art/hero/<pose>/<piece id>.png, and the aligned dressed picture in _raw/.

--debug also writes the mask and a before/after preview next to the output.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
HERO = ROOT / 'public' / 'art' / 'hero'
HEAD_SLOTS_OK = set()  # pieces allowed above the collar (none yet: hats use autofit)


def alpha_mask(im, t=128):
    return np.asarray(im.getchannel('A')) > t


def cut_person(im):
    a = np.asarray(im.getchannel('A'))
    if (a < 250).mean() > 0.02:
        return im
    from rembg import new_session, remove
    return remove(im.convert('RGB'), session=new_session('isnet-general-use')).convert('RGBA')


def span(m):
    ys, xs = np.where(m)
    top, bot = ys.min(), ys.max()
    head = m[top:top + 60]
    hx = np.where(head.any(0))[0]
    return top, bot, (hx.min() + hx.max()) / 2


def to_lab(rgb):
    x = rgb.astype(np.float32) / 255.0
    x = np.where(x > 0.04045, ((x + 0.055) / 1.055) ** 2.4, x / 12.92)
    M = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]], np.float32)
    xyz = x @ M.T / np.array([0.9505, 1.0, 1.089], np.float32)
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def neck_row(m):
    rows = np.where(m.any(1))[0]
    top = rows[0]
    w = np.array([np.ptp(np.where(r)[0]) if r.any() else 0 for r in m])
    head_w = w[top:top + 200].max()
    start = next(y for y in range(top + 60, top + 480) if w[y] > head_w * 1.4)
    return min(range(top + 60, start), key=lambda y: w[y])


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    debug = '--debug' in sys.argv
    if len(args) != 3:
        print(__doc__)
        sys.exit(1)
    pose, pid, src = args
    base = Image.open(HERO / f'hero-base-{pose}.png').convert('RGBA')
    W, H = base.size
    bm = alpha_mask(base)
    dressed = cut_person(Image.open(src).convert('RGBA'))
    dm = alpha_mask(dressed)

    # 2. align: head top and soles of the feet on the base's, centred on the head
    bt, bb, bx = span(bm)
    dt, db, dx = span(dm)
    s = (bb - bt) / (db - dt)
    big = dressed.resize((round(dressed.width * s), round(dressed.height * s)), Image.LANCZOS)
    aligned = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    aligned.paste(big, (round(bx - dx * s), round(bt - dt * s)), big)
    am = alpha_mask(aligned)

    # 3. what changed
    blur = lambda im: np.asarray(im.convert('RGB').filter(ImageFilter.GaussianBlur(3)))
    diff = np.linalg.norm(to_lab(blur(aligned)) - to_lab(blur(base)), axis=-1)
    changed = am & ((diff > 14) | ~bm)

    # 4. no head; clean up
    neck = neck_row(bm)
    if pid not in HEAD_SLOTS_OK:
        changed[: max(0, neck - 18)] = False
    changed = ndimage.binary_opening(changed, iterations=2)
    lab, n = ndimage.label(changed)
    if n:
        sizes = ndimage.sum(changed, lab, range(1, n + 1))
        keep = [i + 1 for i, z in enumerate(sizes) if z > changed.size * 0.002]
        changed = np.isin(lab, keep)
    changed = ndimage.binary_closing(changed, iterations=7)
    changed = ndimage.binary_fill_holes(changed) & am
    soft = Image.fromarray((changed * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
    alpha = np.minimum(np.asarray(soft), np.asarray(aligned.getchannel('A')))
    layer = aligned.copy()
    layer.putalpha(Image.fromarray(alpha.astype(np.uint8)))

    out = HERO / pose / f'{pid}.png'
    out.parent.mkdir(parents=True, exist_ok=True)
    (out.parent / '_raw').mkdir(exist_ok=True)
    aligned.save(out.parent / '_raw' / f'{pid}-dressed.png', optimize=True)
    layer.save(out, optimize=True)
    cover = changed.mean() / max(bm.mean(), 1e-6)
    print(f'{pid}: layer saved ({cover:.0%} of the body area), scale {s:.3f}')
    if debug:
        prev = Image.new('RGBA', (W * 2, H), (58, 40, 24, 255))
        prev.alpha_composite(aligned, (0, 0))
        prev.alpha_composite(base, (W, 0))
        prev.alpha_composite(layer, (W, 0))
        prev.convert('RGB').resize((W, H // 2)).save(out.parent / '_raw' / f'{pid}-preview.jpg')


if __name__ == '__main__':
    main()
