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

# the party on the map: two walking frames side by side. Both are cut with ONE crop box (the union of
# the two outlines, in each half's own coordinates) so the figure stays put between steps instead of
# jittering by the difference between two separately trimmed frames. 128 px tall = 2x the map size.
m = Image.open(SRC / '05-map-marker.png').convert('RGBA')
halves = [m.crop((0, 0, m.width // 2, m.height)), m.crop((m.width // 2, 0, m.width // 2 * 2, m.height))]
boxes = [bbox(hf) for hf in halves]
union = (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))
h = 128
for i, hf in enumerate(halves, 1):
    f = hf.crop(union); f = f.resize((round(f.width * h / f.height), h), Image.LANCZOS)
    f.save(PUB / f'world/party-walk-{i}.webp', 'WEBP', quality=90, method=6)
# the merchant alone, for a party with no camel yet: cut just past the camel's nose (the rightmost
# opaque column at nose height, left of the man's fez), the same column in both frames
def nose(hf):
    ha = np.array(hf)[..., 3] > 10
    band = ha[int(hf.height * 0.26):int(hf.height * 0.30), :int(hf.width * 0.76)]
    return np.nonzero(band.any(axis=0))[0].max()
cut = max(nose(hf) for hf in halves) + 12
solos = [hf.crop((cut, 0, hf.width, hf.height)) for hf in halves]
sb = [bbox(x) for x in solos]
su = (min(b[0] for b in sb), min(b[1] for b in sb), max(b[2] for b in sb), max(b[3] for b in sb))
for i, x in enumerate(solos, 1):
    x = x.crop(su); x = x.resize((round(x.width * h / x.height), h), Image.LANCZOS)
    x.save(PUB / f'world/party-solo-{i}.webp', 'WEBP', quality=90, method=6)
print('marker frames', Image.open(PUB / 'world/party-walk-1.webp').size, Image.open(PUB / 'world/party-walk-2.webp').size,
      'solo', Image.open(PUB / 'world/party-solo-1.webp').size, Image.open(PUB / 'world/party-solo-2.webp').size)

# the camp, lit and cold, for the night-halt card
(PUB / 'events').mkdir(exist_ok=True)
for n in ['night', 'cold']:
    Image.open(SRC / f'0{6 if n == "night" else 7}-camp-{n}.png').convert('RGB').save(PUB / f'events/camp-{n}.webp', 'WEBP', quality=80, method=6)

for f in sorted([*(PUB / 'battle').glob('camel-*.webp'), PUB / 'battle/bale.webp', *(PUB / 'world').glob('party-walk-*'), *(PUB / 'events').glob('*'), PUB / 'travel-threats/egypt-rural-highway-robbers-leader.jpg']):
    print(f'  {str(f.relative_to(ROOT)):60s} {Image.open(f).size} {f.stat().st_size // 1024} KB')
