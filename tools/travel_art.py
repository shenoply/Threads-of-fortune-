#!/usr/bin/env python3
"""Cut the travel art batch (art-src/travel-2026-09, from the ChatGPT prompts in
docs/handoff/travel-refs/INSTRUCTIONS.txt) into game files.

  python3 tools/travel_art.py
"""
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'art-src' / 'travel-2026-09'
PUB = ROOT / 'public' / 'art'


def bbox(im):
    a = np.array(im)[..., 3] > 10
    ys, xs = np.nonzero(a)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def head_x(im, top, bottom):
    """Centre of the neck: the mean column of the outline's top fifth, which the cargo never reaches."""
    a = np.array(im)[..., 3] > 10
    ys, xs = np.nonzero(a[top:top + (bottom - top) // 5])
    return xs.mean()


def match_token(src, ref, out):
    """Scale and place a token so the camel is as tall as the reference one and its neck is in the same column."""
    r = Image.open(ref).convert('RGBA'); s = Image.open(src).convert('RGBA')
    rx0, ry0, rx1, ry1 = bbox(r); sx0, sy0, sx1, sy1 = bbox(s)
    k = (ry1 - ry0) / (sy1 - sy0)
    piece = s.crop((sx0, sy0, sx1, sy1)).resize((round((sx1 - sx0) * k), round((sy1 - sy0) * k)), Image.LANCZOS)
    canvas = Image.new('RGBA', r.size, (0, 0, 0, 0))
    canvas.alpha_composite(piece, (round(head_x(r, ry0, ry1) - head_x(piece, 0, piece.height)), ry0))
    canvas.save(out, 'WEBP', quality=88, method=6)


def fit(src, size, out, **kw):
    im = Image.open(src).convert('RGBA'); im.thumbnail(size, Image.LANCZOS)
    c = Image.new('RGBA', size, (0, 0, 0, 0)); c.alpha_composite(im, ((size[0] - im.width) // 2, (size[1] - im.height) // 2))
    c.save(out, 'WEBP', quality=88, method=6, **kw)


# battle tokens: the camel in two cargo states, lined up on the old loaded camel; the rug bale on its own
match_token(SRC / '01-camel-cut.png', PUB / 'battle/camel.webp', PUB / 'battle/camel-cut.webp')
match_token(SRC / '02-camel-bare.png', PUB / 'battle/camel.webp', PUB / 'battle/camel-bare.webp')
fit(SRC / '03-rug-bale.png', (512, 512), PUB / 'battle/bale.webp')

# the Egyptian road bandits' leader, where the ambush screen already looks for him
(PUB / 'travel-threats').mkdir(exist_ok=True)
Image.open(SRC / '04-robber-leader.png').convert('RGB').resize((640, 640), Image.LANCZOS).save(PUB / 'travel-threats/egypt-rural-highway-robbers-leader.jpg', quality=86)

# the party on the map: two walking frames, split at the empty column between them, trimmed, 128 px tall
m = Image.open(SRC / '05-map-marker.png').convert('RGBA'); a = np.array(m)[..., 3] > 10
cols = a.any(axis=0); mid = m.width // 2
gap = min(range(mid - 300, mid + 300), key=lambda x: (cols[x], abs(x - mid)))
for i, (l, r) in enumerate([(0, gap), (gap, m.width)], 1):
    f = m.crop((l, 0, r, m.height)); f = f.crop(bbox(f))
    h = 128; f = f.resize((round(f.width * h / f.height), h), Image.LANCZOS)
    f.save(PUB / f'world/party-walk-{i}.webp', 'WEBP', quality=90, method=6)
    # the merchant alone, for a party with no camel yet: cut just past the camel's nose (the
    # rightmost opaque column at nose height, left of the man's fez), keeping him and the rope's end
    half = m.crop((l, 0, r, m.height)); ha = np.array(half)[..., 3] > 10
    band = ha[int(half.height * 0.26):int(half.height * 0.30), :int(half.width * 0.76)]
    nose = np.nonzero(band.any(axis=0))[0].max()
    solo = half.crop((nose + 12, 0, half.width, half.height)); solo = solo.crop(bbox(solo))
    solo = solo.resize((round(solo.width * h / solo.height), h), Image.LANCZOS)
    solo.save(PUB / f'world/party-solo-{i}.webp', 'WEBP', quality=90, method=6)
    print('marker frame', i, f.size, 'solo', solo.size)

# the camp, lit and cold, for the night-halt card
(PUB / 'events').mkdir(exist_ok=True)
for n in ['night', 'cold']:
    Image.open(SRC / f'0{6 if n == "night" else 7}-camp-{n}.png').convert('RGB').save(PUB / f'events/camp-{n}.webp', 'WEBP', quality=80, method=6)

for f in sorted([*(PUB / 'battle').glob('camel-*.webp'), PUB / 'battle/bale.webp', *(PUB / 'world').glob('party-walk-*'), *(PUB / 'events').glob('*'), PUB / 'travel-threats/egypt-rural-highway-robbers-leader.jpg']):
    print(f'  {str(f.relative_to(ROOT)):60s} {Image.open(f).size} {f.stat().st_size // 1024} KB')
