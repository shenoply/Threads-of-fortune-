#!/usr/bin/env python3
"""Make the WebP copies the game loads from the hero's PNG pictures (base bodies, clothes, cover masks).

  python3 tools/webp.py

The PNGs stay as the masters that tools/autofit.py and tools/refit.py work on; run this after
changing any of them. WebP keeps the same look and transparency at about a quarter of the size.
"""
from pathlib import Path
from PIL import Image

HERO = Path(__file__).resolve().parent.parent / 'public' / 'art' / 'hero'
before = after = 0
for png in sorted(HERO.rglob('*.png')):
    if '_raw' in png.parts:
        continue
    webp = png.with_suffix('.webp')
    im = Image.open(png).convert('RGBA')
    # masks only carry an outline: keep them exact
    im.save(webp, 'WEBP', lossless=png.stem.endswith(('-cover', '-foot')), quality=90, method=6, alpha_quality=100)
    before += png.stat().st_size
    after += webp.stat().st_size
print(f'{before / 1e6:.1f} MB of PNG -> {after / 1e6:.1f} MB of WebP')
