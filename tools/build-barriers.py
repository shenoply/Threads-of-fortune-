"""Rivers, lakes, the canal, and where you can cross them: the Bannerlord rule for the travel map.

Water you cannot walk through, beyond the open sea (landmask.ts): the big rivers and the canal (hand
traced from the painting, too thin and close in colour to detect cleanly), and the lakes (found by
colour on the painting). A river is crossed only at a bridge or a ford: every road the painting draws
over a river gets a bridge, and named crossings are added below. A ford is slow going; a bridge is a road.
Writes src/data/barriers.ts. Run again after changing the traces.
  python3 tools/build-barriers.py [review.jpg]
"""
import re, sys, json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd

ROOT = __file__.rsplit('/tools/', 1)[0]
W, H, CELL = 177, 118, 5
PX = 1536 / 885          # painting px per map unit
K = PX * CELL            # painting px per mask cell

sea = np.array([[c == '1' for c in r] for r in re.findall(r'"([01]{177})"', open(f'{ROOT}/src/data/landmask.ts').read())])
terr = np.array([list(r) for r in re.findall(r'"([dfhmr]{177})"', open(f'{ROOT}/src/data/terrain.ts').read())])
paint = Image.open(f'{ROOT}/public/art/world/travel-map.jpg').convert('RGB')

# ---- rivers, in painting pixels ----
RIVERS = {
  # the Nile from the south edge of the map to the Delta, traced on the painting (the older trace in
  # landmask.ts, tools/add-nile.py, ran up to 60 px east of the painted river and is opened up below)
  'Nile': [(430, 1024), (415, 985), (400, 955), (385, 930), (370, 910), (355, 885), (342, 855), (340, 820), (345, 785), (340, 760), (330, 740),
           (322, 720), (320, 705), (323, 712)],
  # the Tigris, from the Armenian hills down past Samarra to Baghdad and the join with the Euphrates
  'Tigris': [(1003, 92), (1060, 124), (1096, 131), (1131, 146), (1160, 164), (1189, 178), (1203, 199), (1206, 224), (1224, 242),
             (1260, 253), (1280, 262), (1324, 300), (1346, 332), (1353, 357), (1381, 386), (1396, 407), (1410, 443), (1420, 470), (1424, 505), (1424, 536)],
  # the Euphrates, from the bend east of Aleppo past Raqqa, Deir ez-Zor, Ramadi and Fallujah to the Shatt al-Arab
  'Euphrates': [(803, 289), (846, 285), (903, 289), (946, 303), (981, 324), (1010, 346), (1046, 360), (1081, 374), (1103, 400), (1131, 436),
                (1189, 471), (1239, 471), (1274, 464), (1317, 479), (1346, 500), (1389, 514), (1424, 536), (1417, 564), (1410, 593), (1431, 614), (1460, 643)],
  # the stream that runs down out of the hills into the lake north of Aleppo
  'Upper Euphrates': [(820, 193), (790, 205), (769, 218)],
  # the Delta: the Rosetta branch west of Tanta, the Damietta branch east of it
  # (traced against the painting: the main stream splits west of Cairo; the eastern branch is drawn from
  # just north-east of Cairo, with Cairo and Tanta on its west bank)
  'Nile (Rosetta branch)': [(323, 712), (322, 700), (310, 680), (307, 657), (317, 637), (322, 622)],
  'Nile (Damietta branch)': [(398, 706), (402, 694), (408, 675), (413, 660), (420, 650), (425, 628)],
  # the Suez Canal, Port Said to the Gulf of Suez through the Bitter Lakes
  'Suez Canal': [(566, 668), (570, 690), (576, 712), (583, 735), (590, 756)],
}
# where a river can be crossed besides the roads (painting px): [name, x, y, kind]
CROSSINGS = [
  ('the Cairo bridges', 330, 742, 'bridge'),       # Giza to Cairo: the railway and the Pyramids Road over the Nile
  ('the Beni Suef ferry', 393, 943, 'ford'),
  ('Benha bridge', 405, 688, 'bridge'),            # the Port Said line over the Damietta branch
  ('Kafr el-Zayyat bridge', 308, 668, 'bridge'),   # the Tanta-Alexandria railway over the Rosetta branch
  ('Mansoura ferry', 420, 645, 'ford'),
  ('Kantara crossing', 571, 694, 'bridge'),        # the Sinai railway's swing bridge over the canal
  ('Ismailia ferry', 579, 722, 'ford'),
  ('Fallujah bridge', 1300, 470, 'bridge'),        # the Baghdad road (and the Nairn cars) over the Euphrates
  ('Ramadi ford', 1210, 471, 'ford'),
  ('Deir ez-Zor ferry', 1081, 374, 'ford'),
  ('Raqqa ford', 1010, 346, 'ford'),
  ('Jarablus bridge', 846, 285, 'bridge'),         # the Baghdad Railway bridge, 1915
  ('Samarra ford', 1270, 258, 'ford'),
  ('Tikrit ford', 1206, 224, 'ford'),
  ('Mosul bridge', 1080, 128, 'bridge'),           # the pontoon bridge at Mosul
]

def cells_of_lines(lines, width_px):
  img = Image.new('L', paint.size, 0)
  d = ImageDraw.Draw(img)
  for pts in lines: d.line(pts, fill=255, width=width_px, joint='curve')
  a = np.asarray(img, float) / 255
  # share of each cell covered
  cov = a[: int(H * K) // 1, : int(W * K)]
  out = np.zeros((H, W))
  for y in range(H):
    for x in range(W):
      out[y, x] = a[int(y * K):int((y + 1) * K), int(x * K):int((x + 1) * K)].mean()
  return out

river_cov = {name: cells_of_lines([pts], 9) for name, pts in RIVERS.items()}
river = np.zeros((H, W), bool)
river_name = np.full((H, W), '', object)
for name, cov in river_cov.items():
  m = cov > 0.08
  river |= m
  river_name[m & (river_name == '')] = name
# the painted river wanders off the trace here and there: the painted water within two cells of the
# trace is river too (so the line on the map and the closed ground agree)
_rgb = np.asarray(paint).astype(int)
_r, _g, _b = _rgb[..., 0], _rgb[..., 1], _rgb[..., 2]
_wet = nd.binary_opening((_b - _r > -15) & (_b > 70) & (_g - _b < 25) & (_g > 60), iterations=1)
_cov = np.zeros((H, W))
for y in range(H):
  for x in range(W):
    _cov[y, x] = _wet[int(y * K):int((y + 1) * K), int(x * K):int((x + 1) * K)].mean()
near = nd.binary_dilation(river, iterations=2)
add = near & (_cov > 0.2) & ~river & ~sea
for y, x in zip(*np.where(add)):
  ys, xs = np.where(river[max(0, y - 2):y + 3, max(0, x - 2):x + 3])
  river[y, x] = True
  river_name[y, x] = river_name[max(0, y - 2) + ys[0], max(0, x - 2) + xs[0]]
# no diagonal leaks: where a river steps diagonally, fill the corner so the line is 4-connected
for _ in range(2):
  r = river.copy()
  for y in range(1, H):
    for x in range(1, W):
      if r[y, x] and r[y - 1, x - 1] and not r[y - 1, x] and not r[y, x - 1]: river[y - 1, x] = True; river_name[y - 1, x] = river_name[y, x]
      if r[y, x - 1] and r[y - 1, x] and not r[y, x] and not r[y - 1, x - 1]: river[y, x] = True; river_name[y, x] = river_name[y, x - 1]

# ---- lakes: blue on the painting, away from the sea ----
rgb = np.asarray(paint).astype(int)
r_, g_, b_ = rgb[..., 0], rgb[..., 1], rgb[..., 2]
wet = (b_ - r_ > -12) & (b_ > 75) & (g_ - b_ < 22)
wet = nd.binary_opening(wet, iterations=1)
lab, n = nd.label(wet)
sizes = nd.sum(wet, lab, range(1, n + 1))
lake_px = np.isin(lab, np.where(sizes > 250)[0] + 1)
# grow each lake out to its painted shore: neighbouring pixels that are still watery (greyer, paler
# water near the banks) join it, a few pixels at a time
loose = (b_ - r_ > -18) & (b_ > 55) & (g_ - b_ < 25)
for _ in range(10):
  lake_px = lake_px | (nd.binary_dilation(lake_px, iterations=1) & loose)
lake_px = nd.binary_closing(lake_px, iterations=3)
lake = np.zeros((H, W))
for y in range(H):
  for x in range(W):
    lake[y, x] = lake_px[int(y * K):int((y + 1) * K), int(x * K):int((x + 1) * K)].mean()
lake = (lake > 0.3) & ~sea & ~river
# a blob touching the sea is sea; keep only blobs that stand apart from it
ll, ln = nd.label(lake)
seaish = nd.binary_dilation(sea, iterations=2)
for i in range(1, ln + 1):
  # mostly sea-side shallows: part of the sea, not a lake
  if (seaish & (ll == i)).sum() > 0.25 * (ll == i).sum(): lake[ll == i] = False
# lakes drawn too pale to find by colour, as ellipses in painting px: (cx, cy, rx, ry)
for cx, cy, rx, ry in [(258, 900, 46, 19)]:  # Lake Qarun in the Fayoum
  yy, xx = np.mgrid[0:H, 0:W]
  lake |= ~river & ((((xx + 0.5) * K - cx) / rx) ** 2 + (((yy + 0.5) * K - cy) / ry) ** 2 <= 1)
LAKE_NAMES = [('Lake Qarun', 255, 892), ('Lake Tuz', 655, 233), ('Lake Van', 760, 232), ('Lake Hazar', 792, 256), ('Lake Egirdir', 687, 283),
              ('Lake Habbaniyah', 1260, 664), ('Lake Mariout', 150, 690)]

# ---- the old Nile trace, opened: it is replaced by the river above ----
old_nile = Image.new('L', (W, H), 0)
ImageDraw.Draw(old_nile).line([(x / K, y / K) for x, y in [(338, 700), (358, 750), (368, 800), (365, 850), (380, 900), (430, 950), (470, 1000), (492, 1024)]], fill=1, width=3)
old_nile = np.asarray(old_nile, bool) & sea
# keep anything joined to the open sea in the Gulf of Suez: only cells west of x=470 px or south-west of the gulf
open_land = old_nile.copy()

# ---- crossings ----
grid = np.full((H, W), '.', object)
grid[open_land] = 'O'
grid[river] = 'R'
grid[lake] = 'L'
canal = river_name == 'Suez Canal'
grid[canal] = 'C'
# a road painted over a river crosses it on a bridge
# (a road that runs along the bank for a while is not a bridge: a long run keeps one crossing, in its middle)
road_on = river & (terr == 'r')
rl, rn = nd.label(road_on, structure=np.ones((3, 3)))
for i in range(1, rn + 1):
  ys, xs = np.where(rl == i)
  if len(ys) <= 3: grid[ys, xs] = 'B'
  else:
    k = len(ys) // 2
    order = np.lexsort((xs, ys)); y0, x0 = ys[order[k]], xs[order[k]]
    for dy in (-1, 0, 1):
      for dx in (-1, 0, 1):
        if road_on[min(H-1, max(0, y0+dy)), min(W-1, max(0, x0+dx))]: grid[min(H-1, max(0, y0+dy)), min(W-1, max(0, x0+dx))] = 'B'
named = {}
for name, px, py, kind in CROSSINGS:
  cx, cy = int(px / K), int(py / K)
  for dy in range(-1, 2):
    for dx in range(-1, 2):
      x, y = cx + dx, cy + dy
      if 0 <= x < W and 0 <= y < H and grid[y, x] in ('R', 'C'):
        grid[y, x] = 'B' if kind == 'bridge' else 'F'
        named[(y, x)] = name
# towns stand on their rivers: the town itself is a crossing
towns = [l.split() for l in open(sys.argv[2] if len(sys.argv) > 2 else '/dev/null').read().splitlines()] if len(sys.argv) > 2 else []
src = open(f'{ROOT}/src/data/world.ts').read().split('export const SEA_ROUTES')[0]
towns = [(m[0], float(m[1]), float(m[2])) for m in re.findall(r"id: '([a-z]+)'[^\n]*? x: ([\d.]+), y: ([\d.]+)", src)]
for tid, x, y in towns:
  cx, cy = int(x / CELL), int(y / CELL)
  for dy in range(-2, 3):
    for dx in range(-2, 3):
      X, Y = cx + dx, cy + dy
      if 0 <= X < W and 0 <= Y < H and grid[Y, X] in ('R', 'C', 'L'):
        grid[Y, X] = 'B'
        named[(Y, X)] = f'the bridges at {tid.capitalize()}'

for y in range(H):
  for x in range(W):
    if grid[y, x] in ('B', 'F') and (y, x) not in named and river_name[y, x]:
      named[(y, x)] = f"{'a bridge' if grid[y, x] == 'B' else 'a ford'} over the {river_name[y, x].replace('Nile (', '').replace(')', '') if river_name[y, x].startswith('Nile') else river_name[y, x]}"
road_x = []
bl, bn = nd.label(grid == 'B', structure=np.ones((3, 3)))
for i in range(1, bn + 1):
  ys, xs = np.where(bl == i)
  cy, cx = ys.mean(), xs.mean()
  px, py = (cx + 0.5) * K, (cy + 0.5) * K
  if any(abs(px - qx) < 25 and abs(py - qy) < 25 for _, qx, qy, _ in CROSSINGS): continue
  nm = named.get((ys[0], xs[0]), 'a bridge')
  if nm.startswith('the bridges at'): continue
  road_x.append((nm[0].upper() + nm[1:], px, py, 'bridge'))
# ---- more mountains: the painted ranges and peak clusters that build-terrain.py left as open ground.
# Closed like the rest (M), except where a road crosses them (the pass) and around towns.
MORE_MOUNTAINS = {
  'the Red Sea hills': [(440, 790), (500, 775), (560, 800), (590, 850), (600, 900), (570, 960), (500, 972), (450, 940), (435, 860)],
  'the Jebel Druze': [(810, 538), (910, 538), (915, 580), (810, 582)],
  'the Harrat hills': [(952, 572), (1010, 572), (1012, 606), (952, 606)],
  'the desert ridges east of Amman': [(993, 588), (1077, 588), (1077, 614), (993, 614)],
  'the hills of Moab': [(777, 613), (860, 613), (862, 656), (777, 656)],
  'the Jebel Tubaiq': [(893, 613), (952, 613), (952, 648), (893, 648)],
  'the Transjordan ridges': [(810, 655), (912, 655), (912, 698), (810, 698)],
  'the southern Transjordan peaks': [(918, 667), (962, 667), (962, 702), (918, 702)],
  'the central Anatolian peaks': [(600, 195), (700, 195), (700, 240), (600, 240)],
  'the Zagros foothills': [(1290, 120), (1400, 120), (1420, 200), (1350, 215), (1300, 190)],
  'the Kurdish hills': [(1405, 250), (1536, 250), (1536, 320), (1405, 320)],
}
mt = Image.new('L', (W, H), 0)
for pts in MORE_MOUNTAINS.values(): ImageDraw.Draw(mt).polygon([(x / K, y / K) for x, y in pts], fill=1)
mt = np.asarray(mt, bool) & (grid == '.') & ~sea & (terr != 'r') & (terr != 'm')
for tid, x, y in towns:
  cx, cy = int(x / CELL), int(y / CELL)
  mt[max(0, cy - 2):cy + 3, max(0, cx - 2):cx + 3] = False
grid[mt] = 'M'
print('more mountain cells', int(mt.sum()))
rows = [''.join(r) for r in grid]
out = ['// Generated by tools/build-barriers.py from the painted travel map. Do not edit by hand.',
       '// . open ground (see terrain.ts), R river, C canal, L lake: closed. B bridge (a road), F ford (slow going).',
       '// O land the sea mask wrongly closed (an old, misplaced Nile trace): open ground. M mountains (closed).',
       f'export const BARRIER_ROWS: string[] = {json.dumps(rows)};',
       '/** names for the water and crossings, by cell index (y * 177 + x) */',
       f'export const BARRIER_NAMES: Record<number, string> = {json.dumps({**{int(y*W+x): river_name[y, x] for y in range(H) for x in range(W) if river[y, x] and river_name[y, x]}, **{int(y*W+x): v for (y, x), v in named.items()}})};',
       f'export const LAKES: {{ name: string; x: number; y: number }}[] = {json.dumps([{"name": n, "x": round(px / PX, 1), "y": round(py / PX, 1)} for n, px, py in LAKE_NAMES])};',
       f'export const CROSSINGS: {{ name: string; x: number; y: number; kind: "bridge" | "ford" }}[] = {json.dumps([{"name": n, "x": round(px / PX, 1), "y": round(py / PX, 1), "kind": k} for n, px, py, k in CROSSINGS + road_x])};']
open(f'{ROOT}/src/data/barriers.ts', 'w').write('\n'.join(out) + '\n')
print('river', int(river.sum()), 'lake', int(lake.sum()), 'bridges', int((grid == 'B').sum()), 'fords', int((grid == 'F').sum()))

# ---- review picture ----
if len(sys.argv) > 1:
  ov = Image.new('RGBA', paint.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
  COL = {'sea': (20, 70, 220, 90), 'R': (0, 160, 255, 170), 'C': (0, 220, 220, 190), 'L': (120, 0, 255, 150), 'B': (0, 230, 0, 230), 'F': (255, 230, 0, 230), 'm': (230, 0, 0, 110), 'M': (230, 0, 0, 110), 'h': (255, 150, 0, 55)}
  for y in range(H):
    for x in range(W):
      k = grid[y, x]
      if k == '.': k = 'sea' if sea[y, x] else terr[y, x]
      if k in COL: d.rectangle([x * K, y * K, (x + 1) * K - 1, (y + 1) * K - 1], fill=COL[k])
  im = Image.alpha_composite(paint.convert('RGBA'), ov)
  d = ImageDraw.Draw(im)
  for tid, x, y in towns:
    X, Y = x * PX, y * PX
    d.ellipse([X - 4, Y - 4, X + 4, Y + 4], fill='white', outline='black'); d.text((X + 6, Y - 6), tid, fill='white', stroke_width=2, stroke_fill='black')
  for n, px, py, k in CROSSINGS: d.text((px + 6, py + 2), n, fill=(255, 255, 160), stroke_width=2, stroke_fill='black')
  for n, px, py in LAKE_NAMES: d.text((px, py - 14), n, fill=(230, 200, 255), stroke_width=2, stroke_fill='black')
  for name, pts in RIVERS.items(): d.text((pts[len(pts) // 2][0] + 8, pts[len(pts) // 2][1]), name, fill=(170, 230, 255), stroke_width=2, stroke_fill='black')
  im.convert('RGB').save(sys.argv[1], quality=88)
