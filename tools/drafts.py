#!/usr/bin/env python3
"""Cut the September 2026 art drafts into game files.

  python3 tools/drafts.py

Sources: art-src/drafts-2026-09/*.png (the seven drafts, untouched).
Writes public/art/drafts/ (what the game uses): the voyage as three WebP frames cut clear of the
panel dividers, the two Cairo auction rooms as WebP, and 96 px transparent copies of the map icons.
Writes art-src/drafts-2026-09/cut/ (kept, not shipped): the carpet in three states and the two
negotiation figures as trimmed transparent PNGs, the stall background as WebP, and the twelve icons
at full size, named by subject.
"""
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'art-src' / 'drafts-2026-09'
OUT = ROOT / 'public' / 'art' / 'drafts'
CUT = SRC / 'cut'
(OUT / 'icons').mkdir(parents=True, exist_ok=True); (CUT / 'icons').mkdir(parents=True, exist_ok=True)


def pieces(name: str, min_px=4000, close=6, pad=6, rows=True):
    """Each separate figure on a transparent sheet, trimmed to its alpha with a small margin."""
    im = Image.open(SRC / name).convert('RGBA'); a = np.array(im); m = a[..., 3] > 8
    lab, n = ndimage.label(ndimage.binary_closing(m, iterations=close))
    boxes = []
    for i in range(1, n + 1):
        ys, xs = np.nonzero(lab == i)
        if len(ys) < min_px:
            continue
        boxes.append((i, xs.min(), ys.min(), xs.max(), ys.max()))
    # a grid reads row by row; a single row (carpet, negotiation) reads left to right
    boxes.sort(key=(lambda b: (b[2] // 250, b[1])) if rows else (lambda b: b[1]))
    out = []
    for i, x0, y0, x1, y1 in boxes:
        # keep only this piece's pixels, so a neighbour's fringe never leaks into the crop
        keep = ndimage.binary_dilation(lab == i, iterations=3)
        b = a.copy(); b[..., 3] = np.where(keep, b[..., 3], 0)
        x0, y0 = max(0, x0 - pad), max(0, y0 - pad); x1, y1 = min(a.shape[1] - 1, x1 + pad), min(a.shape[0] - 1, y1 + pad)
        out.append(Image.fromarray(b[y0:y1 + 1, x0:x1 + 1]))
    return out


def save_png(im: Image.Image, path: Path):
    im.save(path, 'PNG', optimize=True)


# carpet: folded, partly unrolled, flat (left to right on the sheet)
for im, state in zip(pieces('Anatolian carpet in three states.png', rows=False), ['folded', 'unrolling', 'flat']):
    save_png(im, CUT / f'carpet-{state}.png')

# negotiation: seller left, buyer right
for im, who in zip(pieces('Giza Carpet Market Negotiation.png', rows=False), ['seller', 'buyer']):
    save_png(im, CUT / f'negotiation-{who}.png')

# voyage: three panels split at the two light divider columns, cut 6 px clear of each
v = Image.open(SRC / 'From Port Said to Jaffa.png').convert('RGB'); va = np.array(v).astype(int)
std = va.std(axis=0).mean(axis=1)
divs = [x for x in range(20, va.shape[1] - 20) if std[x] < 6]
edges = [0] + [d for d in divs] + [va.shape[1]]
frames = []
for (l, r), name in zip(zip(edges[:-1], edges[1:]), ['depart', 'sea', 'arrive']):
    f = v.crop((l + (6 if l else 0), 0, r - (6 if r < va.shape[1] else 0), va.shape[0]))
    f.save(OUT / f'voyage-{name}.webp', 'WEBP', quality=86, method=6); frames.append(f.size)

# backgrounds
Image.open(SRC / 'Empty Sunlit Giza Carpet Stall.png').convert('RGB').save(CUT / 'stall-sunlit.webp', 'WEBP', quality=82, method=6)
for name, dst in [('1925 Cairo Carpet Auction.png', 'auction-cairo-grand-intro.webp'),
                  ('Modest Cairo Carpet Auction Room, 1925.png', 'auction-cairo-small-room.webp')]:
    Image.open(SRC / name).convert('RGB').save(OUT / dst, 'WEBP', quality=82, method=6)

# map icons, 4 x 3, reading order
ICONS = ['port', 'caravanserai', 'carpet-market', 'auction', 'palace', 'guards',
         'station', 'oasis', 'tailor', 'gunsmith', 'cabaret', 'provisions']
icons = pieces('1925 Egypt-Levant merchant icon sheet.png', min_px=3000, close=8, pad=4)
assert len(icons) == 12, len(icons)
for im, name in zip(icons, ICONS):
    save_png(im, CUT / 'icons' / f'{name}.png')
    sm = im.copy(); sm.thumbnail((96, 96), Image.LANCZOS)
    canvas = Image.new('RGBA', (96, 96), (0, 0, 0, 0)); canvas.paste(sm, ((96 - sm.width) // 2, (96 - sm.height) // 2), sm)
    save_png(canvas, OUT / 'icons' / f'{name}-96.png')

print('voyage frames', frames, '| dividers at', divs)
for f in sorted([*OUT.rglob('*'), *CUT.rglob('*')]):
    if f.is_file() and not (f.parent.name == 'icons' and f.parent.parent == OUT):
        print(f'  {str(f.relative_to(ROOT)):55s} {Image.open(f).size} {f.stat().st_size // 1024} KB')
