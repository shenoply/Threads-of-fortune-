#!/usr/bin/env python3
"""Convert the Arran batch (art-src/arran, from the user's Drive "Arran" folder; see
docs/handoff/ARRAN_LAB_FOR_CLAUDE.md) into game files under public/art/arran/.

  python3 tools/arran_art.py

The room keeps its 1536x1024 canvas so the HTML board and hotspot percentages stay aligned.
Portraits keep their 2:3 canvas (no trim) so every pose stands on the same baseline.
The reference arran-lab-scene.png and the archived leather-apron portrait are not exported.
"""
from pathlib import Path
from PIL import Image

SRC, OUT = Path('art-src/arran'), Path('public/art/arran')
OUT.mkdir(parents=True, exist_ok=True)

room = Image.open(SRC / '13-lab-room.png').convert('RGB')
assert room.size == (1536, 1024), room.size
room.save(OUT / '13-lab-room.webp', quality=84, method=6)
room.resize((768, 512), Image.LANCZOS).save(OUT / '13-lab-room-sm.webp', quality=80, method=6)

# landscape scenes (1536x1024): the library and the open reference book
for name in ('14-cairo-library', '15-open-reference-book'):
    im = Image.open(SRC / f'{name}.png').convert('RGB')
    im.save(OUT / f'{name}.webp', quality=84, method=6)
# portrait scene (1024x1536): the risky pass, for a dangerous-route encounter
Image.open(SRC / '16-risky-pass.png').convert('RGB').resize((768, 1152), Image.LANCZOS).save(OUT / '16-risky-pass.webp', quality=82, method=6)

for p in sorted(SRC.glob('[01][0-9]-*.png')):
    if p.stem in ('13-lab-room', '14-cairo-library', '15-open-reference-book', '16-risky-pass'):
        continue
    im = Image.open(p).convert('RGBA')
    im.resize((600, 900), Image.LANCZOS).save(OUT / f'{p.stem}.webp', quality=84, method=6)

for f in sorted(OUT.iterdir()):
    print(f, f.stat().st_size // 1024, 'KB')
