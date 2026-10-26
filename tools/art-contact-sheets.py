"""Contact sheets for the visual QA of the family and dealer portraits.

  python3 -I tools/art-contact-sheets.py <out-dir>

Writes three sheets from public/art:
  children-by-face.jpg   each look/sex/age group: faces 1, 2, 3 side by side (must be three different people)
  children-by-age.jpg    each of the 18 children: ages 5, 12, 18 side by side (must be one person growing up)
  dealers.jpg            the 16 dealers on the city tables (each distinct, matching his profile)
A missing picture shows as a grey tile with its file name, so gaps are visible too.
"""
import os, sys
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'art')
OUT = sys.argv[1] if len(sys.argv) > 1 else '.'
T = 220
LOOKS, SEXES, AGES = ['egypt', 'levant', 'desert'], ['son', 'daughter'], [5, 12, 18]
DEALERS = ['rival-shami', 'rival-selim', 'rival-fikry', 'rival-shalaby', 'rival-sahyoun', 'rival-kassab', 'rival-najjar', 'rival-tezcan',
           'rival-boghos', 'rival-yanni', 'rival-costa', 'rival-lucia', 'rival-tabet', 'rival-kouyoumdjian', 'rival-arslanian', 'rival-haddadin']

def tile(rel):
    p = os.path.join(ROOT, rel)
    if os.path.exists(p):
        im = Image.open(p).convert('RGB'); w, h = im.size; s = min(w, h)
        im = im.crop(((w - s) // 2, 0, (w - s) // 2 + s, s)).resize((T, T))
    else:
        im = Image.new('RGB', (T, T), (70, 70, 70))
    d = ImageDraw.Draw(im); d.rectangle([0, T - 18, T, T], fill=(0, 0, 0)); d.text((4, T - 15), os.path.basename(rel)[:34], fill=(255, 230, 160))
    return im

def sheet(rows, name):
    cols = max(len(r) for r in rows)
    out = Image.new('RGB', (cols * (T + 6) + 6, len(rows) * (T + 6) + 6), (25, 18, 10))
    for y, r in enumerate(rows):
        for x, rel in enumerate(r): out.paste(tile(rel), (6 + x * (T + 6), 6 + y * (T + 6)))
    out.save(os.path.join(OUT, name), quality=85); print(os.path.join(OUT, name))

face = lambda look, sex, age, v: f'family/child-{look}-{sex}-{age}{"" if v == 1 else f"-{v}"}.jpg'
sheet([[face(l, s, a, v) for v in (1, 2, 3)] for l in LOOKS for s in SEXES for a in AGES], 'children-by-face.jpg')
sheet([[face(l, s, a, v) for a in AGES] for l in LOOKS for s in SEXES for v in (1, 2, 3)], 'children-by-age.jpg')
sheet([DEALERS[i:i + 4] for i in range(0, 16, 4)], 'dealers.jpg')
