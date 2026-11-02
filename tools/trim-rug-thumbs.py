#!/usr/bin/env python3
"""Cut the pale studio ground off the rug thumbnails (art/rugs/thumbs/<id>.webp).

  python3 tools/trim-rug-thumbs.py            # write trimmed thumbs (masters kept in art-src/rug-thumbs/)
  python3 tools/trim-rug-thumbs.py --sheet D  # also write before/after contact sheets into D

Many rug photographs show the carpet on a pale studio ground. The carpet view finds the carpet at run time
(src/components/RugViewer/trim.ts, carpetCrop); cards are small and many, so their pictures are cut once
here instead, with the same rule: scanning in from each edge, a line belongs to the ground while almost all
of it is smooth and close to the corners' colour. Wool and fringe are full of fine contrast, so the fringe
stays with the carpet. The crop is found on the full photograph and the thumbnail is made again from it.
The untouched thumbnails stay in art-src/rug-thumbs/ (the script always starts from those). It also writes
src/data/rugCrops.json (x, y, w, h as fractions of the full photograph, and the carpet's aspect), which
CutRug.tsx uses to show a full-size photograph without its ground in the few large views.
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
RUGS = ROOT / 'public' / 'art' / 'rugs'
THUMBS = RUGS / 'thumbs'
MASTERS = ROOT / 'art-src' / 'rug-thumbs'


def carpet_crop(im: Image.Image):
    """Port of trim.ts find(): the carpet's box in the picture's pixels, or None when it fills the picture."""
    W, H = im.size
    k = min(1, 360 / max(W, H))
    w, h = max(8, round(W * k)), max(8, round(H * k))
    d = np.asarray(im.convert('RGBA').resize((w, h), Image.BILINEAR)).astype(np.int32)
    rgb, a = d[..., :3], d[..., 3]
    lum = rgb[..., 0] * 0.3 + rgb[..., 1] * 0.59 + rgb[..., 2] * 0.11
    corners = [(1, 1), (1, w - 2), (h - 2, 1), (h - 2, w - 2)]
    diffc = lambda p, q: int(np.abs(d[p][:3] - d[q][:3]).sum())
    ref = sorted(corners, key=lambda p: -sum(1 for q in corners if diffc(p, q) < 60))[0]
    clear = a < 40
    ref_clear = d[ref][3] < 40
    dref = np.abs(rgb - d[ref][:3]).sum(axis=2)
    # max neighbour luminance difference (edges use the pixel itself -> 0)
    g = np.zeros((h, w))
    pad = np.pad(lum, 1, mode='edge')
    cpad = np.pad(clear, 1, mode='constant', constant_values=False)
    for dy, dx in ((0, -1), (0, 1), (-1, 0), (1, 0)):
        nb = pad[1 + dy:1 + dy + h, 1 + dx:1 + dx + w]
        nbc = cpad[1 + dy:1 + dy + h, 1 + dx:1 + dx + w]
        g = np.maximum(g, np.where(nbc, 255, np.abs(nb - lum)))
    if ref_clear:
        ground = clear.copy()
    else:
        ground = clear | ((dref <= 90) & (g < 7))
    filled = ~ground

    def run(share):
        gap = max(1, round(len(share) * 0.015))
        best, best_m, s0, last, m = (0, 0), -1, -1, -1, 0
        for i, f in enumerate(share):
            if f < 0.06:
                continue
            if s0 < 0 or i - last > gap + 1:
                if s0 >= 0 and m > best_m:
                    best_m, best = m, (s0, last + 1)
                s0, m = i, 0
            m += f
            last = i
        if s0 >= 0 and m > best_m:
            best = (s0, last + 1)
        return best

    L, T, R, B = 0, 0, w, h
    for _ in range(2):
        T, B = run(filled[:, L:R].mean(axis=1) if R > L else np.zeros(h))
        if B - T < 4:
            return None
        L, R = run(filled[T:B, :].mean(axis=0))
        if R - L < 4:
            return None
    if R - L < w * 0.3 or B - T < h * 0.3:
        return None
    if L <= 0 and T <= 0 and R >= w and B >= h:
        return None
    import math
    sx, sy = W / w, H / h
    ix, iy = max(sx, W * 0.006), max(sy, H * 0.006)
    x = min(W - 1, math.ceil(L * sx + (ix if L > 0 else 0)))
    y = min(H - 1, math.ceil(T * sy + (iy if T > 0 else 0)))
    x2 = max(x + 1, math.floor(R * sx - (ix if R < w else 0)))
    y2 = max(y + 1, math.floor(B * sy - (iy if B < h else 0)))
    return (x, y, x2, y2)


def tighten(im: Image.Image, box):
    """The fringe runs along the short ends (left and right in these photographs); along the long sides the
    rule above can stop a line or two short, leaving a pale hairline of ground or shadow. Step those edges
    in while a row is still mostly ground-coloured or transparent (at most 4% of the height)."""
    x, y, x2, y2 = box
    d = np.asarray(im.convert('RGBA')).astype(np.int32)
    H, W = d.shape[:2]
    cs = [d[2, 2], d[2, W - 3], d[H - 3, 2], d[H - 3, W - 3]]
    ref = sorted(cs, key=lambda p: -sum(1 for q in cs if np.abs(p[:3] - q[:3]).sum() < 60))[0]
    def groundy(row):
        seg = d[row, x:x2]
        g = (seg[:, 3] < 40) | (np.abs(seg[:, :3] - ref[:3]).sum(axis=1) < 45 if ref[3] >= 40 else False)
        return g.mean() > 0.45
    lim = max(2, int(H * 0.04))
    n = 0
    while n < lim and y < y2 - 2 and groundy(y): y += 1; n += 1
    n = 0
    while n < lim and y2 > y + 2 and groundy(y2 - 1): y2 -= 1; n += 1
    return (x, y, x2, y2)


def hairline(im):
    """after scaling down, a last row of the long sides can still be mostly pale and flat (ground or the
    carpet's soft shadow): drop up to 3 such rows top and bottom"""
    d = np.asarray(im.convert('RGB')).astype(np.int32)
    def flat(y):
        r = d[y]
        return ((r[:, 0] > 195) & (r[:, 1] > 185) & (r[:, 2] > 165)).mean() > 0.45 and r.std(axis=0).mean() < 14
    t, b = 0, im.height
    while t < 3 and flat(t): t += 1
    while im.height - b < 3 and flat(b - 1): b -= 1
    return im.crop((0, t, im.width, b)) if (t or b < im.height) else im


def sheet(pairs, out: Path, label: str):
    cw, ch, cols = 220, 160, 6
    rows = (len(pairs) + cols - 1) // cols
    S = Image.new('RGB', (cols * cw, rows * ch), (40, 30, 22))
    dr = ImageDraw.Draw(S)
    for n, (name, im) in enumerate(pairs):
        t = im.copy(); t.thumbnail((cw - 10, ch - 24))
        x, y = (n % cols) * cw, (n // cols) * ch
        S.paste(t, (x + (cw - t.width) // 2, y + 4))
        dr.text((x + 6, y + ch - 18), name[:32], fill=(235, 215, 170))
    S.save(out / f'{label}.png')


def main():
    sheet_dir = Path(sys.argv[sys.argv.index('--sheet') + 1]) if '--sheet' in sys.argv else None
    MASTERS.mkdir(parents=True, exist_ok=True)
    before, after = [], []
    crops = {}
    for full in sorted(RUGS.glob('*.webp')):
        thumb = THUMBS / full.name
        master = MASTERS / full.name
        if not master.exists():
            if not thumb.exists():
                continue
            master.write_bytes(thumb.read_bytes())
        old = Image.open(master).convert('RGB')
        im = Image.open(full)
        box = carpet_crop(im)
        before.append((full.stem, old))
        if box is None:
            out = old
            thumb.write_bytes(master.read_bytes())
        else:
            box = tighten(im, box)
            W, H = im.size
            crops[full.stem] = [round(box[0] / W, 4), round(box[1] / H, 4), round((box[2] - box[0]) / W, 4), round((box[3] - box[1]) / H, 4), round((box[2] - box[0]) / (box[3] - box[1]), 4)]
            c = (im.convert('RGBA') if im.mode in ('RGBA', 'LA', 'P') else im.convert('RGB')).crop(box)
            k = min(1, 400 / max(c.size))
            out = c.resize((max(1, round(c.width * k)), max(1, round(c.height * k))), Image.LANCZOS)
            out = hairline(out)
            out.save(thumb, 'WEBP', quality=84, method=6, alpha_quality=90)
        print(f'{full.stem:28s} {im.size} crop={box} -> {out.size}')
        after.append((full.stem, out))
    import json
    (ROOT / 'src' / 'data' / 'rugCrops.json').write_text(json.dumps(crops, separators=(',', ':')) + '\n')
    if sheet_dir:
        sheet_dir.mkdir(parents=True, exist_ok=True)
        sheet(before, sheet_dir, 'before')
        sheet(after, sheet_dir, 'after')


if __name__ == '__main__':
    main()
