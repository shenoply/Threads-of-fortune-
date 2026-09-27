#!/usr/bin/env python3
"""Fit clothing layers onto the hero's base body automatically.

  python3 tools/autofit.py <pose> [<piece id> ...]     (no ids = every layer in that pose)

The image generator draws each piece nicely but at its own size and position. This measures
the base body (top of head, forehead width, neck, shoulder span) from its transparency, measures
the piece the same way, then scales and moves the piece so it sits where it should. The fitted
image replaces the layer; the untouched original is kept in public/art/hero/<pose>/_raw/.

Anchors per kind of piece:
  hats      the band (a row near the bottom of the hat) matches the forehead width and sits
            just above the eyebrows; a few hats name a different band row (see BAND)
  tops/coats  the shoulder span (widest row in the top part) matches the base shoulders, and
            the collar sits at the base of the neck
Anything else is left as it is: use the wardrobe's Fit mode for those.
"""
import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
HERO = ROOT / 'public' / 'art' / 'hero'
HEAD = {'taqiyah', 'tarboosh', 'qeleshe', 'turban-white', 'turban-silk', 'kalpak', 'keffiyeh', 'boater'}
BODY = {'linen-shirt', 'galabiya-work', 'galabiya-white', 'galabiya-wool', 'dress-shirt',
        'vest-embroidered', 'stambouli', 'linen-suit', 'kaftan', 'bisht', 'frock-coat', 'burnous'}
# pieces whose painted collar stands higher than a plain neckline: push them down this many px
COLLAR_DROP = {}
# pieces that leave his arms bare: never widened to cover the shoulders
SLEEVELESS = {'vest-embroidered'}
# extra px to clear below the neckline for pieces painted with a filled neck or a tall collar
NECK_CLEAR = {'dress-shirt': 24, 'kaftan': 14}
# which row of the hat (fraction of its height from the top) is the band that grips the head,
# and how much wider than the forehead that band is
# ratio is against the head's full width (ear to ear)
# and where on the head that band lands (fraction from the top of the head to the neck)
LEGS = {'sirwal', 'wool-trousers', 'linen-trousers', 'morning-trousers'}
FEET = {'babouche', 'markub-red', 'oxfords', 'spectator', 'boots'}
WAIST = {'sash', 'belt'}
# pieces placed against landmarks of the wardrobe base (measured: eyes, hands, hips)
PLACED = {'scarf', 'spectacles', 'watch', 'ring', 'webley', 'mauser-c96', 'khanjar', 'satchel', 'briefcase', 'kilij', 'ottoman-mauser', 'enfield', 'cane', 'misbaha'}
BAND = {'boater': (0.93, 1.32, 0.38), 'keffiyeh': (0.08, 0.98, 0.2), 'turban-silk': (0.97, 0.88, 0.6), 'turban-white': (0.9, 0.88, 0.42), 'kalpak': (0.92, 0.8, 0.42)}
DEFAULT_BAND = (0.92, 0.8, 0.42)


def mask(im):
    return np.asarray(im.convert('RGBA'))[..., 3] > 100


def width_at(m, y):
    xs = np.where(m[int(y)])[0]
    return (xs.min(), xs.max()) if len(xs) else (None, None)


def measure_base(pose):
    m = mask(Image.open(HERO / f'hero-base-{pose}.png'))
    rows = np.where(m.any(1))[0]
    top = rows[0]
    widths = np.array([(lambda a, b: (b - a) if a is not None else 0)(*width_at(m, y)) for y in range(m.shape[0])])
    # the neck: narrowest row between the widest part of the head and where the shoulders start
    search = range(top + 60, top + 420)
    head_w = widths[top:top + 200].max()
    shoulders_start = next(y for y in search if widths[y] > head_w * 1.4)
    neck = min(range(top + 60, shoulders_start), key=lambda y: widths[y])
    brow = top + (neck - top) * 0.40
    l, r = width_at(m, brow)
    cx = (l + r) / 2
    fore_w = head_w  # full head width; hats are sized against it
    shoulder = max(widths[neck:neck + 150])
    bottom = rows[-1]
    from scipy import ndimage

    def mid_seg(y):
        # the run of body pixels containing the centre line (the torso, not the arms)
        lab, _ = ndimage.label(m[y])
        k = lab[int(cx)]
        if not k:
            return None
        xs = np.where(lab == k)[0]
        return xs.min(), xs.max()
    # crotch: first row below the chest where the centre line is empty
    crotch = next(y for y in range(neck + 300, bottom) if not m[y, int(cx)])
    torso = [(y, mid_seg(y)) for y in range(neck + 200, crotch - 120)]
    waist, (wl, wr) = min(((y, sg) for y, sg in torso if sg), key=lambda t: t[1][1] - t[1][0])
    # ankles: the narrowest leg rows in the lowest fifth
    def leg_w(y):
        lab, n = ndimage.label(m[y])
        return max((np.ptp(np.where(lab == i)[0]) for i in range(1, n + 1)), default=0)
    lo = bottom - int((bottom - top) * 0.2)
    ankle = min(range(lo, bottom - 40), key=leg_w)
    # the two feet, below the ankles
    feet = []
    fm = m.copy(); fm[:ankle] = False
    lab, n = ndimage.label(fm)
    for i in sorted(range(1, n + 1), key=lambda i: -(lab == i).sum())[:2]:
        ys, xs = np.where(lab == i)
        feet.append((xs.min(), ys.min(), xs.max(), ys.max()))
    feet.sort()
    hands = []
    for lo_x, hi_x in ((0, int(cx - (bottom - top) * 0.17)), (int(cx + (bottom - top) * 0.13), m.shape[1])):
        sub = m[crotch - 180: crotch + 20, lo_x:hi_x]
        ys, xs = np.where(sub)
        hb = ys.max()
        hands.append(((xs.min() + xs.max()) / 2 + lo_x, crotch - 180 + hb - 42, xs.max() - xs.min()))
    return dict(m=m, top=top, neck=neck, brow=brow, fore_w=fore_w, cx=cx, shoulder=shoulder, size=m.shape[::-1],
                waist=waist, waist_w=wr - wl, hands=hands, waist_cx=(wl + wr) / 2, crotch=crotch, ankle=ankle, bottom=bottom, feet=feet)


def bbox(m):
    ys, xs = np.where(m)
    return xs.min(), ys.min(), xs.max(), ys.max()


def place(im, scale, dx, dy, size):
    """Scale about the origin, then shift; returns a new canvas of the base's size."""
    w, h = im.size
    small = im.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
    out = Image.new('RGBA', size, (0, 0, 0, 0))
    out.paste(small, (round(dx), round(dy)), small)
    return out


def fit_hat(im, pid, b):
    m = mask(im)
    x0, y0, x1, y1 = bbox(m)
    frac, ratio, at = BAND.get(pid, DEFAULT_BAND)
    land = b['top'] + (b['neck'] - b['top']) * at
    band_y = y0 + (y1 - y0) * frac
    l, r = width_at(m, band_y)
    band_w, band_cx = r - l, (l + r) / 2
    s = b['fore_w'] * ratio / band_w
    # the band row lands on the brow line, centred on the head
    return place(im, s, b['cx'] - band_cx * s, land - band_y * s, b['size'])


def cover_shoulders(out, b):
    """Stretch a garment's shoulder band sideways, row by row, until it covers his shoulders and
    the short sleeves of the undershirt painted on the base; the stretch fades out down the chest."""
    a = np.asarray(out).copy()
    H, W = a.shape[:2]
    m = a[..., 3] > 100
    y_start, y_full, y_end = b['neck'] + 15, b['neck'] + 160, b['neck'] + 250
    res = a.copy()
    for y in range(y_start, min(y_end, H)):
        gx = np.where(m[y])[0]
        bx = np.where(b['m'][y])[0]
        if len(gx) < 10 or len(bx) < 10:
            continue
        gl, gr = gx.min(), gx.max()
        bl, br = bx.min() - 4, bx.max() + 4
        w = 1.0 if y <= y_full else max(0.0, 1 - (y - y_full) / (y_end - y_full))
        L = round(gl + (min(gl, bl) - gl) * w)
        R = round(gr + (max(gr, br) - gr) * w)
        if L >= gl and R <= gr:
            continue
        xs = np.arange(L, R + 1)
        src = gl + (xs - L) * (gr - gl) / max(1, R - L)
        s0 = np.clip(np.floor(src).astype(int), 0, W - 1)
        s1 = np.clip(s0 + 1, 0, W - 1)
        f = (src - s0)[:, None]
        row = a[y]
        res[y, L:R + 1] = (row[s0] * (1 - f) + row[s1] * f).astype(np.uint8)
    return Image.fromarray(res)


def _segments(row):
    lab, n = ndimage.label(row)
    return [(np.where(lab == i)[0].min(), np.where(lab == i)[0].max()) for i in range(1, n + 1)]


def _stretch(res, a, y, s0, s1, t0, t1):
    """Resample row y of a so the run s0..s1 fills t0..t1."""
    W = a.shape[1]
    xs = np.arange(t0, t1 + 1)
    src = s0 + (xs - t0) * (s1 - s0) / max(1, t1 - t0)
    i0 = np.clip(np.floor(src).astype(int), 0, W - 1)
    i1 = np.clip(i0 + 1, 0, W - 1)
    f = (src - i0)[:, None]
    res[y, t0:t1 + 1] = (a[y][i0] * (1 - f) + a[y][i1] * f).astype(np.uint8)


def cover_torso(out, b):
    """Below the armpits, stretch the edge of the garment's body out to his torso's edge, so the
    undershirt never shows down his sides. Sleeves and an open front are left alone."""
    a = np.asarray(out).copy()
    m = a[..., 3] > 100
    res = a.copy()
    cx = int(b['cx'])
    for y in range(b['neck'] + 120, b['crotch'] - 10):
        segs = _segments(b['m'][y])
        torso = next(((l, r) for l, r in segs if l <= cx <= r), None)
        if not torso:
            continue
        tl, tr = torso[0] - 3, torso[1] + 3
        gsegs = _segments(m[y])
        # left side: the garment run nearest inside his left edge
        inside = [(l, r) for l, r in gsegs if tl < l < tl + 70 and r > l + 8]
        if inside and not any(l <= tl < r for l, r in gsegs):
            l, r = min(inside)
            _stretch(res, a, y, l, r, tl, r)
        inside = [(l, r) for l, r in gsegs if tr - 70 < r < tr and r > l + 8]
        if inside and not any(l < tr <= r for l, r in gsegs):
            l, r = max(inside, key=lambda t: t[1])
            _stretch(res, a, y, l, r, l, tr)
    return Image.fromarray(res)


def widen_to_torso(out, b):
    """Scale the garment sideways (only sideways, evenly about his centre line) by just enough that
    its body reaches his torso's edges below the armpits. Even scaling keeps stripes straight."""
    a = np.asarray(out)
    m = a[..., 3] > 100
    cx = b['cx']
    need = 1.0
    for y in range(b['neck'] + 130, b['crotch'] - 20, 6):
        segs = _segments(b['m'][y])
        torso = next(((l, r) for l, r in segs if l <= cx <= r), None)
        if not torso:
            continue
        gsegs = [(l, r) for l, r in _segments(m[y]) if r > l + 8 and torso[0] - 10 < r and l < torso[1] + 10]
        if not gsegs:
            continue
        gl = min(l for l, r in gsegs); gr = max(r for l, r in gsegs)
        if gl > torso[0] - 3:
            need = max(need, (cx - torso[0] + 3) / max(1, cx - gl))
        if gr < torso[1] + 3:
            need = max(need, (torso[1] + 3 - cx) / max(1, gr - cx))
    need = min(need, 1.18)
    if need <= 1.001:
        return out
    W, H = out.size
    wide = out.resize((round(W * need), H), Image.LANCZOS)
    res = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    res.paste(wide, (round(cx - cx * need), 0), wide)
    return res


def close_armpits(out, b):
    """Close small gaps between a sleeve and the body of the garment where his undershirt would
    show, by extending the fabric on each side into the gap. The open front is never closed."""
    a = np.asarray(out).copy()
    m = a[..., 3] > 100
    res = a.copy()
    cx = b['cx']
    front = b['shoulder'] * 0.2
    for y in range(b['neck'] + 40, min(b['crotch'] - 60, a.shape[0])):
        segs = [(l, r) for l, r in _segments(m[y]) if r > l + 3]
        for (l1, r1), (l2, r2) in zip(segs, segs[1:]):
            gap = l2 - r1 - 1
            if gap <= 0 or gap > 70:
                continue
            if abs((r1 + l2) / 2 - cx) < front:  # the open front of a coat
                continue
            if not b['m'][y, r1 + 1: l2].all():  # real air between arm and body: leave it
                continue
            mid = (r1 + l2) // 2
            e1, e2 = max(l1, r1 - 10), min(r2, l2 + 10)  # only a thin strip at each edge moves
            _stretch(res, a, y, e1, r1, e1, mid)
            _stretch(res, a, y, l2, e2, mid + 1, e2)
    return Image.fromarray(res)


def fit_body(im, pid, b):
    m = mask(im)
    x0, y0, x1, y1 = bbox(m)
    h = y1 - y0
    span = max((lambda a, c: (c - a) if a is not None else 0)(*width_at(m, y)) for y in range(y0, y0 + int(h * 0.18)))
    l, r = width_at(m, y0 + 3)
    collar_cx = (l + r) / 2 if l is not None else (x0 + x1) / 2
    s = b['shoulder'] / span
    top_y = b['neck'] - 12 + COLLAR_DROP.get(pid, 0)
    # collar top sits a little above the narrowest point of the neck
    out = place(im, s, b['cx'] - collar_cx * s, top_y - y0 * s, b['size'])
    # sleeved pieces: search size and height together for the best cover of his shoulders and
    # arms with the least paint off his body (drawn garments have their own shoulder slope)
    if pid not in SLEEVELESS:
        k = 4  # work at quarter size
        bm_s = b['m'][::k, ::k]
        band = np.zeros_like(bm_s)
        band[(b['neck'] + 25) // k: (b['crotch'] - 200) // k] = True
        want = bm_s & band
        body_d = ndimage.binary_dilation(bm_s, iterations=7) | ~band
        small = im.resize((im.width // k, im.height // k), Image.BILINEAR)
        best = None
        for ds in np.linspace(0.9, 1.25, 15):
            for dy in range(0, 64, 6):
                ss = s * ds
                o = place(small, ss, (b['cx'] - collar_cx * ss * k) / k, (top_y + dy - y0 * ss * k) / k, (b['size'][0] // k, b['size'][1] // k))
                om = np.asarray(o)[..., 3] > 100
                cover = (om & want).sum() / max(1, want.sum())
                spill = (om & ~body_d).sum() / max(1, om.sum())
                score = cover - 2.5 * spill
                if best is None or score > best[0]:
                    best = (score, ss, dy)
        _, s, dy = best
        top_y += dy
        out = place(im, s, b['cx'] - collar_cx * s, top_y - y0 * s, b['size'])
    if pid not in SLEEVELESS:
        out = widen_to_torso(out, b)
        out = cover_shoulders(out, b)
        out = close_armpits(out, b)
    # nothing a shirt or coat carries may cover his chin and beard: clear the patch above the neckline
    a = np.asarray(out).copy()
    half = int(b['fore_w'] * 0.42)
    x0c, x1c = int(b['cx'] - half), int(b['cx'] + half)
    a[: b['neck'] + 6 + NECK_CLEAR.get(pid, 0), x0c:x1c, 3] = 0
    return Image.fromarray(a)


def fit_legs(im, pid, b):
    m = mask(im)
    x0, y0, x1, y1 = bbox(m)
    # waistband on his waist, hems on his ankles (a little lower for straight trousers)
    hem = b['ankle'] + (4 if pid == 'sirwal' else 16)
    s = (hem - b['waist']) / (y1 - y0)
    return place(im, s, b['waist_cx'] - (x0 + x1) / 2 * s, b['waist'] - y0 * s, b['size'])


def fit_feet(im, pid, b):
    from scipy import ndimage
    m = mask(im)
    lab, n = ndimage.label(m)
    parts = sorted(range(1, n + 1), key=lambda i: -(lab == i).sum())[:2]
    boxes = sorted([(lambda ys, xs: (xs.min(), ys.min(), xs.max(), ys.max()))(*np.where(lab == i)) + (i,) for i in parts])
    out = Image.new('RGBA', b['size'], (0, 0, 0, 0))
    arr = np.asarray(im)
    for (x0, y0, x1, y1, i), (fx0, fy0, fx1, fy1) in zip(boxes, b['feet']):
        piece = arr.copy(); piece[lab != i] = 0
        one = Image.fromarray(piece).crop((x0, y0, x1 + 1, y1 + 1))
        s = (fx1 - fx0) * 1.12 / (x1 - x0)
        one = one.resize((max(1, round(one.width * s)), max(1, round(one.height * s))), Image.LANCZOS)
        out.paste(one, (round((fx0 + fx1) / 2 - one.width / 2), round(fy1 + 4 - one.height)), one)
    return out


def fit_waist(im, pid, b):
    m = mask(im)
    x0, y0, x1, y1 = bbox(m)
    band_y = y0 + (y1 - y0) * 0.08
    l, r = width_at(m, band_y)
    s = b['waist_w'] * 1.12 / (r - l)
    return place(im, s, b['waist_cx'] - (l + r) / 2 * s, b['waist'] - 28 - y0 * s, b['size'])


def skin_box(im):
    """Bounding box of the painted hand some pieces come with (cane, prayer beads)."""
    a = np.asarray(im.convert('RGBA')).astype(np.float32)
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    mx = np.maximum(np.maximum(r, g), b); mn = np.minimum(np.minimum(r, g), b)
    sat = (mx - mn) / np.maximum(mx, 1)
    skin = (al > 128) & (r > g) & (g > b) & (sat > 0.2) & (sat < 0.62) & (mx > 90)
    ys, xs = np.where(skin)
    top = ys.min()
    keep = ys < top + (ys.max() - top) * 0.6 if len(ys) else ys
    return xs[keep].min(), ys[keep].min(), xs[keep].max(), ys[keep].max()


def fit_placed(im, pid, b):
    m = mask(im)
    x0, y0, x1, y1 = bbox(m)
    w, h = x1 - x0, y1 - y0
    eyes_y, eyes_cx = b['top'] + (b['neck'] - b['top']) * 0.53, b['cx']
    lh, rh = b['hands']  # (cx, cy, width) of the hand on the viewer's left / right
    body_h = b['bottom'] - b['top']
    if pid in ('cane', 'misbaha'):
        hx0, hy0, hx1, hy1 = skin_box(im)
        hcx, hcy = (hx0 + hx1) / 2, (hy0 + hy1) / 2
        if pid == 'cane':  # hand over his right hand, tip on the floor
            s = (b['bottom'] - lh[1]) / (y1 - hcy)
        else:
            s = lh[2] * 1.5 / (hx1 - hx0)
        return place(im, s, lh[0] - hcx * s, lh[1] - hcy * s, b['size'])
    # target: (width or None, height or None, centre x, top y)
    T = {
        'scarf': (b['shoulder'] * 0.36, None, b['cx'], b['neck'] - 8),
        'spectacles': (b['fore_w'] * 0.72, None, eyes_cx, eyes_y - h * (b['fore_w'] * 0.72 / w) / 2),
        'watch': (b['shoulder'] * 0.34, None, b['cx'] + b['shoulder'] * 0.06, b['neck'] + 215),
        'ring': (22, None, lh[0] + 6, lh[1] + 8),
        'webley': (b['waist_w'] * 1.3, None, b['waist_cx'] - b['waist_w'] * 0.1, b['waist'] + 55),
        'mauser-c96': (None, body_h * 0.22, lh[0] + 40, b['waist'] + 40),
        'khanjar': (b['waist_w'] * 0.62, None, b['waist_cx'], b['waist'] + 10),
        'satchel': (None, (b['crotch'] + 40) - (b['neck'] + 40), b['cx'] + b['shoulder'] * 0.12, b['neck'] + 40),
        'briefcase': (200, None, rh[0] + 10, rh[1] + 18),
        'kilij': (None, body_h * 0.45, b['waist_cx'] + b['waist_w'] * 0.62, b['neck'] + 170),
        'ottoman-mauser': (None, body_h * 0.62, b['cx'] - b['shoulder'] * 0.2, b['top'] + 10),
        'enfield': (None, body_h * 0.62, b['cx'] - b['shoulder'] * 0.2, b['top'] + 10),
    }[pid]
    tw, th, tcx, ttop = T
    s = tw / w if tw else th / h
    return place(im, s, tcx - (x0 + x1) / 2 * s, ttop - y0 * s, b['size'])


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    pose = sys.argv[1]
    b = measure_base(pose)
    print(f"base {pose}: top {b['top']}, brow {b['brow']:.0f}, head {b['fore_w']}px, neck {b['neck']}, shoulders {b['shoulder']}px, waist {b['waist']} ({b['waist_w']}px), crotch {b['crotch']}, ankle {b['ankle']}, feet {b['feet']}")
    folder = HERO / pose
    raw = folder / '_raw'
    raw.mkdir(exist_ok=True)
    ids = sys.argv[2:] or [p.stem for p in folder.glob('*.png')]
    for pid in ids:
        src = folder / f'{pid}.png'
        keep = raw / f'{pid}.png'
        if not keep.exists():
            shutil.copy(src, keep)
        im = Image.open(keep).convert('RGBA')
        if pid in HEAD:
            out = fit_hat(im, pid, b)
        elif pid in BODY:
            out = fit_body(im, pid, b)
        elif pid in LEGS:
            out = fit_legs(im, pid, b)
        elif pid in FEET:
            out = fit_feet(im, pid, b)
        elif pid in WAIST:
            out = fit_waist(im, pid, b)
        elif pid in PLACED:
            out = fit_placed(im, pid, b)
        else:
            print(f'{pid}: no automatic rule, left as drawn')
            continue
        out.save(src, optimize=True)
        print(f'{pid}: fitted')


if __name__ == '__main__':
    main()
