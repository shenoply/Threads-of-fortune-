#!/usr/bin/env python3
"""Check every wardrobe picture on the hero before anyone sees it.

  python3 tools/wardrobe-audit.py [out_dir]

Composes exactly like the game (stacking order, layers behind him, coats hiding the shirt
outside their outline) and writes:
  audit-pieces.jpg   every piece alone on the base body, flagged ones outlined in red
  audit-outfits.jpg  a set of complete outfits, to see how pieces sit over each other
and prints a report of problems:
  head   a piece that is not a hat covering his face
  spill  paint sticking out well beyond his body (sleeves or hems floating in the air)
  empty  a picture with nothing in it
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
HERO = ROOT / 'public' / 'art' / 'hero'
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT
data = json.loads(subprocess.run(['node', 'tools/pieces-json.mjs'], cwd=ROOT, capture_output=True, text=True).stdout)
P = data['pieces']
base = Image.open(HERO / 'hero-base-wardrobe.png').convert('RGBA')
W, H = base.size
bm = np.asarray(base)[..., 3] > 100
brgb = np.asarray(base.convert('RGB')).astype(int)
rows = np.where(bm.any(1))[0]
top = rows[0]
widths = np.array([np.ptp(np.where(r)[0]) if r.any() else 0 for r in bm])
head_w = widths[top:top + 200].max()
start = next(y for y in range(top + 60, top + 480) if widths[y] > head_w * 1.4)
neck = min(range(top + 60, start), key=lambda y: widths[y])
cx = W / 2
FACE_OK = {'head'}
FACE_IDS = {'spectacles', 'scarf'}
ROBES = {'sirwal', 'galabiya-work', 'galabiya-white', 'galabiya-wool', 'kaftan', 'bisht', 'burnous', 'frock-coat', 'keffiyeh'}
FREE = {'cane', 'kilij', 'ottoman-mauser', 'enfield', 'satchel', 'briefcase', 'mauser-c96', 'webley', 'misbaha'}


def layer(pid):
    f = HERO / 'wardrobe' / f'{pid}.png'
    return Image.open(f).convert('RGBA') if f.exists() else None


def compose(ids, bg=(58, 40, 24, 255)):
    ids = [i for i in ids if i and i in P]
    out = Image.new('RGBA', (W, H), bg)
    outer = next((i for i in ids if P[i]['slot'] == 'outer'), None)
    cover = HERO / 'wardrobe' / f'{outer}-cover.png' if outer and P[outer].get('hidesUnder') else None
    order = sorted(ids, key=lambda i: P[i]['z'])
    drawn_base = False
    for i in order:
        if P[i]['z'] >= 0 and not drawn_base:
            out.alpha_composite(base); drawn_base = True
        L = layer(i)
        if L is None:
            continue
        if P[i]['slot'] == 'top' and cover and cover.exists():
            a = np.asarray(L).copy()
            cm = np.asarray(Image.open(cover).convert('RGBA'))[..., 3].astype(np.float32) / 255
            a[..., 3] = (a[..., 3] * cm).astype(np.uint8)
            L = Image.fromarray(a)
        out.alpha_composite(L)
    if not drawn_base:
        out.alpha_composite(base)
    return out


def check(pid):
    L = layer(pid)
    if L is None:
        return ['missing']
    a = np.asarray(L)[..., 3] > 100
    n = a.sum()
    if n < 50:
        return ['empty']
    probs = []
    p = P[pid]
    if p['slot'] not in FACE_OK and pid not in FACE_IDS:
        face = a[: neck - 6, int(cx - head_w * 0.4): int(cx + head_w * 0.4)].sum()
        if face > 200:
            probs.append(f'head ({face}px over his face)')
    if p['slot'] in ('top', 'outer') and pid != 'vest-embroidered':
        short = []
        for y in range(neck + 45, neck + 115, 10):
            bx = np.where(bm[y])[0]; gx = np.where(a[y])[0]
            if len(bx) and len(gx):
                short.append(np.ptp(gx) / max(1, np.ptp(bx)))
        if short and min(short) < 0.97:
            probs.append(f'narrow (his shoulders show beside it, {min(short):.0%} as wide)')
    if p['slot'] in ('top', 'outer') and pid != 'vest-embroidered':
        # undershirt showing down his sides: base torso edge pixels not covered
        seen = 0
        for y in range(neck + 130, neck + 330, 8):
            lab, nseg = ndimage.label(bm[y])
            k = lab[int(cx)]
            if not k:
                continue
            xs = np.where(lab == k)[0]
            for x in (xs.min() + 2, xs.max() - 2):
                # only undershirt counts (light cream); his arm touching his side is fine
                if not a[y, x] and brgb[y, x].sum() > 420:
                    seen += 1
        if seen > 4:
            probs.append(f'sides ({seen} spots where the undershirt shows down his sides)')
    if pid not in FREE and p['slot'] != 'head':
        d = 95 if pid in ('bisht', 'burnous') else 70 if pid in ROBES else 40 if p['slot'] in ('top', 'outer') else 28
        body = ndimage.binary_dilation(bm, iterations=d)
        out = (a & ~body).sum() / n
        if out > 0.04:
            probs.append(f'spill ({out:.0%} of the piece floats off his body)')
    return probs


report = {}
ids = [i for i in P if (HERO / 'wardrobe' / f'{i}.png').exists()]
missing = [i for i in P if i not in ids]
tw, th = 180, 270
cols = 8
sheet = Image.new('RGB', (cols * tw, ((len(ids) + cols - 1) // cols) * th), (0, 0, 0))
for k, pid in enumerate(ids):
    probs = check(pid)
    if probs:
        report[pid] = probs
    t = compose([pid]).convert('RGB').crop((150, 60, 874, 1520)).resize((tw, th))
    d = ImageDraw.Draw(t)
    d.rectangle((0, 0, tw, 13), fill=(160, 20, 20) if probs else (0, 0, 0))
    d.text((3, 1), pid, fill=(255, 225, 160))
    if probs:
        d.rectangle((0, 0, tw - 1, th - 1), outline=(220, 30, 30), width=3)
    sheet.paste(t, ((k % cols) * tw, (k // cols) * th))
sheet.save(OUT / 'audit-pieces.jpg', quality=86)

S = data['start']
OUTFITS = {
    'Start (his father\'s)': [S['head'], S['top'], S['outer'], S['legs'], S['feet']],
    'Cairo effendi': ['tarboosh', 'dress-shirt', 'stambouli', 'wool-trousers', 'oxfords', 'watch', 'briefcase'],
    'Court': ['tarboosh', 'dress-shirt', 'frock-coat', 'morning-trousers', 'oxfords', 'cane', 'ring'],
    'Damascus merchant': ['turban-silk', 'galabiya-white', 'kaftan', 'sirwal', 'markub-red', 'misbaha', 'sash'],
    'Desert road': ['keffiyeh', 'galabiya-work', 'burnous', 'sirwal', 'boots', 'ottoman-mauser', 'khanjar'],
    'Alexandria': ['boater', 'linen-shirt', 'linen-suit', 'linen-trousers', 'spectator', 'spectacles', 'scarf'],
    'Old Cairo family': ['qeleshe', 'linen-shirt', 'vest-embroidered', 'sirwal', 'babouche', 'sash', 'kilij'],
    'Sheikh': ['kalpak', 'galabiya-wool', 'bisht', 'sirwal', 'markub-red', 'webley', 'satchel'],
}
ow, oh = 300, 450
osheet = Image.new('RGB', (4 * ow, 2 * oh), (0, 0, 0))
for k, (name, o) in enumerate(OUTFITS.items()):
    t = compose(o).convert('RGB').crop((120, 40, 904, 1530)).resize((ow, oh))
    d = ImageDraw.Draw(t)
    d.rectangle((0, 0, ow, 16), fill=(0, 0, 0))
    d.text((4, 2), name, fill=(255, 225, 160))
    osheet.paste(t, ((k % 4) * ow, (k // 4) * oh))
osheet.save(OUT / 'audit-outfits.jpg', quality=88)

print(f'{len(ids)} pieces checked, {len(report)} flagged, {len(missing)} without a picture')
for pid, probs in report.items():
    print(f'  {pid}: ' + '; '.join(probs))
if missing:
    print('  no picture: ' + ', '.join(missing))
