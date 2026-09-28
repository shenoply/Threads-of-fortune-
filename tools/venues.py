#!/usr/bin/env python3
"""Make the game files from the cabaret art masters.

  python3 tools/venues.py

Masters live in art-src/venues/masters (the numbered PNGs from the art pack) and are not deployed.
Interiors and show nights become 1536x1024 WebP; exteriors and the closed door 1600x800 WebP
(2:1, centre-cropped if a master is another ratio); contact portraits 512x512 JPEG; Nadia's standing
figure a 655x983 RGBA WebP fitted without stretching, like the other buyer cut-outs.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'art-src' / 'venues' / 'masters'
VEN = ROOT / 'public' / 'art' / 'venues'
POR = ROOT / 'public' / 'art' / 'portraits'
VENUES = {'alhambra-cairo': '01 02 03', 'qamar': '05 06 07', 'sala-badia': '10 11 12', 'sala-santi': '14 15 16', 'maxim-istanbul': '18 19 20'}
PORTRAITS = {'04': 'farid-nassar', '08': 'nadia-wahba', '13': 'salma-farid', '17': 'youssef-hanna', '21': 'kemal-arslan'}


def master(num: str) -> Image.Image:
    f = next(SRC.glob(f'{num}-*.png'))
    return Image.open(f)


def crop_to(im: Image.Image, ratio: float) -> Image.Image:
    w, h = im.size
    if abs(w / h - ratio) < 0.01:
        return im
    if w / h > ratio:
        nw = int(h * ratio); x = (w - nw) // 2; return im.crop((x, 0, x + nw, h))
    nh = int(w / ratio); y = (h - nh) // 2; return im.crop((0, y, w, y + nh))


def scene(num: str, dst: Path):
    im = crop_to(master(num).convert('RGB'), 1.5).resize((1536, 1024), Image.LANCZOS)
    im.save(dst, 'WEBP', quality=82, method=6)


def front(num: str, dst: Path):
    im = crop_to(master(num).convert('RGB'), 2.0).resize((1600, 800), Image.LANCZOS)
    im.save(dst, 'WEBP', quality=82, method=6)


total = 0
for vid, nums in VENUES.items():
    a, b, c = nums.split()
    d = VEN / vid; d.mkdir(parents=True, exist_ok=True)
    scene(a, d / 'interior.webp'); scene(b, d / 'show.webp'); front(c, d / 'exterior.webp')
    total += sum(f.stat().st_size for f in d.iterdir())
front('22', VEN / 'closed-door.webp'); total += (VEN / 'closed-door.webp').stat().st_size
for num, cid in PORTRAITS.items():
    im = crop_to(master(num).convert('RGB'), 1.0).resize((512, 512), Image.LANCZOS)
    im.save(POR / f'{cid}.jpg', 'JPEG', quality=88, optimize=True)
    total += (POR / f'{cid}.jpg').stat().st_size
# Nadia at the stall: the whole figure, fitted inside the buyer cut-out size
n = master('09').convert('RGBA')
n.thumbnail((655, 983), Image.LANCZOS)
n.save(POR / 'nadia-wahba-stall.webp', 'WEBP', quality=88, method=6, alpha_quality=95)
total += (POR / 'nadia-wahba-stall.webp').stat().st_size
print(f'{total / 1e6:.1f} MB of game files written')
