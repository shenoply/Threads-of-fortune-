"""One-off: add the Nile as a real water obstacle south of the Delta (it was left out of landmask.ts
on purpose before now - 'rivers are fordable and left as land'). Hand-traced from the painting against
the settlement positions (see check with scripts/debug), not auto-detected: the river is too thin and
too close in colour to the open sea for a clean automatic split. Run once, then re-run
tools/build-terrain.py to pick up the new water in the road/mountain layer.
"""
import re
import numpy as np
from PIL import Image, ImageDraw

ROOT = __file__.rsplit('/tools/', 1)[0]
W, H, CELL = 177, 118, 5
PX = 1536 / 885
K = PX * CELL  # painting px per mask cell

rows = re.findall(r'"([01]{177})"', open(f'{ROOT}/src/data/landmask.ts').read())
water = np.array([[c == '1' for c in r] for r in rows], dtype=bool)
assert water.shape == (H, W)

# The Nile's course south of Cairo, traced against the painting (public/art/world/travel-map.jpg) and
# cross-checked against the settlement coordinates in src/data/world.ts: Giza/Saqqara/Fayoum sit on the
# west bank, Cairo and everything east and north of it on the east bank. Points are in painting pixels.
# Starts at y=700, just south of Cairo's latitude: the Delta above that (where the existing Tanta-
# Alexandria road already crosses several braided distributaries on real bridges) is left alone, same
# as the smaller rivers drawn elsewhere on the map.
NILE = [(338, 700), (358, 750), (368, 800), (365, 850), (380, 900), (430, 950), (470, 1000), (492, 1024)]
# the one crossing: roughly where Cairo's bridges stood, between Giza and Cairo. Radius is generous -
# the river line is 3 cells wide and runs on the diagonal, so a tight radius leaves slivers of water
# right at the opening that still wall it off.
BRIDGE_PX = (349, 710)
BRIDGE_RADIUS_PX = 40

canvas = Image.new('L', (W, H), 0)
dr = ImageDraw.Draw(canvas)
dr.line([(x / K, y / K) for x, y in NILE], fill=1, width=3)
river = np.asarray(canvas, bool)

before = water.sum()
water = water | river
# punch the bridge: a crossing a caravan can actually use
bx, by = BRIDGE_PX[0] / K, BRIDGE_PX[1] / K
br = BRIDGE_RADIUS_PX / K
yy, xx = np.ogrid[:H, :W]
bridge_mask = (xx - bx) ** 2 + (yy - by) ** 2 <= br ** 2
water = water & ~bridge_mask
after = water.sum()
print(f'water cells: {before} -> {after} (+{after - before})')

out_rows = [''.join('1' if c else '0' for c in row) for row in water]
header = (
    "// 1 = water. 177 x 118 cells, 5 px each, over the painted travel map (art/world/travel-map.jpg, 1536 x 1024,\n"
    "// shown at 885 x 590). Built from the painting: sea is blue. The Nile is traced in too, south of Cairo,\n"
    "// with one crossing near Cairo's bridges (tools/add-nile.py) - the Delta above that, and rivers\n"
    "// drawn elsewhere on the map, are still open land/fordable.\n"
)
body = f"export const MASK_W = {W}, MASK_H = {H}, CELL = {CELL};\n"
body += "export const WATER_ROWS: string[] = [" + ",".join(f'"{r}"' for r in out_rows) + "];\n"
open(f'{ROOT}/src/data/landmask.ts', 'w').write(header + body)
print('wrote src/data/landmask.ts')
