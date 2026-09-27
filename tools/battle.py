#!/usr/bin/env python3
"""Make the WebP copies the battle screen loads from the battle art masters.

  python3 tools/battle.py

Masters (1024px tokens with transparency, 1024x1536 fields) live in art-src/battle and are not
deployed. Tokens keep their full square canvas, so every standing man and every rider comes out at
the same scale; 512px is plenty for a token drawn at a few dozen pixels on a phone.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'art-src' / 'battle'
OUT = ROOT / 'public' / 'art' / 'battle'
OUT.mkdir(parents=True, exist_ok=True)
before = after = 0
for f in sorted(SRC.iterdir()):
    if f.suffix == '.png':
        im = Image.open(f).convert('RGBA').resize((512, 512), Image.LANCZOS)
        dst = OUT / f'{f.stem}.webp'
        im.save(dst, 'WEBP', quality=86, method=6, alpha_quality=90)
    elif f.suffix == '.jpg':
        im = Image.open(f).convert('RGB')
        dst = OUT / f'{f.stem}.webp'
        im.save(dst, 'WEBP', quality=72, method=6)
    else:
        continue
    before += f.stat().st_size
    after += dst.stat().st_size
print(f'{before / 1e6:.1f} MB of masters -> {after / 1e6:.1f} MB of WebP')
