"""The travel map, built from the painting (art-src/world/travel-map-painting-1610.png, 1610 x 977).

One painting covers the whole map, Crete to Kerman. The map is 2000 x 1214 units (the painting at
2000/1610 units to a pixel), on a grid of 5-unit cells (400 x 243). This script:
  1. fits a projection from real longitude/latitude to the painting: a least-squares quadratic through
     control points measured on the painting (coasts, gulf heads, lakes, capes), with a thin-plate
     spline through what is left over, so each measured feature lands where it is painted;
     written to src/data/projection.ts so the game can place anything by longitude and latitude;
  2. places every town and well from its longitude and latitude (with the few nudges listed in
     NUDGE_PX) and writes their x, y into src/data/world.ts;
  3. reads the sea and lakes from the painting's blues (src/data/landmask.ts), the fertile ground from
     its greens, the mountains from its snow and relief (src/data/terrain.ts, with the roads);
  4. traces the big rivers and the canal (hand-traced on the painting: they are too thin, and the Nile
     too green, to find by colour) with their bridges and fords (src/data/barriers.ts);
  5. writes the old-to-new map transform used to move old saves (src/game/state/mapMove.ts).
Run: python3 tools/build-map.py [--overlay out.png] [--report]
"""
import re, sys, json, math
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd

ROOT = __file__.rsplit('/tools/', 1)[0]
PAINTING = f'{ROOT}/art-src/world/travel-map-painting-1610.png'
PW, PH = 1610, 977
MAP_W, MAP_H = 2000, 1214
S = MAP_W / PW                     # map units per painting pixel
CELL = 5
W, H = MAP_W // CELL, math.ceil(MAP_H / CELL)   # 400 x 243
K = CELL / S                       # painting pixels per cell

# ---------------------------------------------------------------- 1. projection
# name, lon, lat, painting x, painting y (measured on zoomed crops of the painting)
CP = [
  ('Port Said (canal mouth)', 32.30, 31.26, 418, 448),
  ('Suez (head of the gulf)', 32.55, 29.97, 425, 494),
  ('Cairo (Delta apex)', 31.24, 30.05, 346, 478),
  ('Alexandria', 29.92, 31.20, 283, 448),
  ('Rosetta mouth', 30.42, 31.45, 308, 437),
  ('Damietta mouth', 31.82, 31.52, 390, 432),
  ('Lake Qarun (Fayoum)', 30.60, 29.47, 318, 524),
  ('Gulf of Aqaba head', 35.00, 29.53, 531, 499),
  ('Ras Muhammad', 34.25, 27.73, 503, 578),
  ('Dead Sea', 35.50, 31.50, 548, 430),
  ('Sea of Galilee', 35.60, 32.82, 566, 397),
  ('Gulf of Iskenderun head', 36.15, 36.85, 588, 231),
  ('Cyprus, Cape Andreas', 34.59, 35.69, 516, 270),
  ('Cyprus, Cape Arnauti', 32.27, 35.10, 445, 292),
  ('Crete, west cape', 23.55, 35.50, 88, 280),
  ('Crete, east cape', 26.30, 35.28, 195, 290),
  ('Rhodes', 28.00, 36.20, 259, 250),
  ('Constantinople', 28.98, 41.01, 300, 56),
  ('Gulf of Izmit head', 29.90, 40.76, 340, 64),
  ('Lake Van', 42.90, 38.65, 842, 150),
  ('Lake Urmia', 45.40, 37.70, 925, 188),
  ('Lake Sevan', 45.30, 40.35, 950, 82),
  ('Caspian, Gorgan bay', 54.00, 36.85, 1208, 216),
  ('Shatt al-Arab mouth', 48.55, 29.95, 1020, 484),
  ('Kuwait bay', 47.90, 29.40, 988, 508),
  ('Ras Musandam (Hormuz)', 56.37, 26.38, 1302, 663),
  ('Qatar, north tip', 51.22, 26.15, 1110, 668),
  ('Jeddah', 39.17, 21.50, 693, 862),
  ('Caspian, Anzali bend', 49.47, 37.47, 1062, 206),
  ('Caspian, Babolsar', 52.65, 36.70, 1148, 232),
  ('Absheron point', 50.37, 40.45, 1102, 80),
  ('Bandar Abbas', 56.28, 27.18, 1295, 623),
  ('Bandar Lengeh bend', 54.88, 26.56, 1215, 656),
  # the Levant coast, where the painting draws no capes: the coast at each port's latitude
  ('Gaza (coast)', 34.45, 31.50, 503, 436),
  ('Jaffa (coast)', 34.75, 32.05, 514, 419),
  ('Haifa (coast)', 34.99, 32.82, 526, 396),
  ('Tyre (coast)', 35.20, 33.27, 535, 380),
  ('Beirut (coast)', 35.50, 33.89, 546, 355),
  ('Tripoli (coast)', 35.84, 34.44, 565, 331),
  ('Latakia (coast)', 35.78, 35.52, 572, 283),
  ('El Arish (coast)', 33.80, 31.13, 487, 448),
]
LON0, LAT0, KX = 40.0, 32.0, math.cos(math.radians(32))

def quad_feats(lon, lat):
  x, y = np.asarray(lon, float) - LON0, np.asarray(lat, float) - LAT0
  return np.stack([np.ones_like(x), x, y, x * x, x * y, y * y], -1)

def tps_u(r2):
  with np.errstate(divide='ignore', invalid='ignore'):
    v = r2 * np.log(r2)
  return np.where(r2 > 0, v, 0.0)

def solve(cp):
  lon = np.array([c[1] for c in cp]); lat = np.array([c[2] for c in cp])
  P = np.array([[c[3], c[4]] for c in cp], float)
  A = quad_feats(lon, lat)
  quad, *_ = np.linalg.lstsq(A, P, rcond=None)
  res = A @ quad - P
  n = len(cp)
  sx, sy = (lon - LON0) * KX, lat - LAT0
  L = np.zeros((n + 3, n + 3))
  L[:n, :n] = tps_u((sx[:, None] - sx[None]) ** 2 + (sy[:, None] - sy[None]) ** 2)
  Pm = np.stack([np.ones(n), sx, sy], 1)
  L[:n, n:] = Pm; L[n:, :n] = Pm.T
  rhs = np.zeros((n + 3, 2)); rhs[:n] = -res
  tps = np.linalg.solve(L, rhs)
  return quad, tps, sx, sy, res

QUAD, TPS, SX, SY, RES = solve(CP)

def to_px(lon, lat, quad=QUAD, tps=TPS, sx=SX, sy=SY):
  lon = np.asarray(lon, float); lat = np.asarray(lat, float)
  base = quad_feats(lon, lat) @ quad
  x, y = (lon - LON0) * KX, lat - LAT0
  r2 = (x[..., None] - sx) ** 2 + (y[..., None] - sy) ** 2
  n = len(sx)
  return base + tps_u(r2) @ tps[:n] + tps[n] + x[..., None] * tps[n + 1] + y[..., None] * tps[n + 2]

def px(lon, lat):
  p = to_px(lon, lat); return float(p[0]), float(p[1])

# ---------------------------------------------------------------- 2. towns
TOWNS = {
  'giza': (31.21, 30.01), 'saqqara': (31.22, 29.87), 'fayoum': (30.84, 29.31), 'cairo': (31.24, 30.05),
  'tanta': (31.00, 30.79), 'alexandria': (29.92, 31.20), 'portsaid': (32.30, 31.26), 'suez': (32.55, 29.97),
  'sinai': (33.97, 28.56), 'bedouin': (33.85, 30.85), 'jaffa': (34.75, 32.05), 'jerusalem': (35.23, 31.78),
  'beirut': (35.50, 33.89), 'damascus': (36.29, 33.51), 'amman': (35.93, 31.95), 'aleppo': (37.16, 36.20),
  'konya': (32.49, 37.87), 'istanbul': (28.98, 41.01), 'ankara': (32.85, 39.93), 'baghdad': (44.39, 33.31),
  'khanaqin': (45.38, 34.35), 'kermanshah': (47.07, 34.31), 'hamadan': (48.51, 34.80), 'tehran': (51.39, 35.69),
  'tabriz': (46.29, 38.08), 'kashan': (51.44, 33.98), 'isfahan': (51.67, 32.65), 'kerman': (57.08, 30.28),
}
WELLS = {
  'well-ajrud': (32.40, 30.07), 'well-ayun': (32.66, 29.87), 'well-feiran': (33.65, 28.70),
  'well-abd': (33.00, 31.02), 'well-rutba': (40.28, 33.03),
}
# Placed by hand on the painting (painting px). Cairo, Giza and Saqqara are a few kilometres apart, two
# or three pixels on the painting: they are drawn apart, Cairo on the east bank of the Nile, Giza on
# the west bank, Saqqara south of it (the walk between Cairo and Giza still counts at its true length,
# SHORT_WALKS in game/systems/world.ts). Baghdad sits on the painted Tigris; the ports on the painted shore.
NUDGE_PX = {
  'cairo': (353, 474), 'giza': (339, 479), 'saqqara': (338, 491),
  'baghdad': (873, 363),
  'jaffa': (516, 419), 'beirut': (548, 355), 'alexandria': (285, 451), 'portsaid': (414, 451), 'suez': (424, 493),
  'istanbul': (300, 50), 'hamadan': (1014, 309),
}

def town_px(tid):
  if tid in NUDGE_PX: return NUDGE_PX[tid]
  lo, la = TOWNS.get(tid) or WELLS[tid]
  return px(lo, la)

def mu(p):  # painting px -> map units
  return (round(p[0] * S, 1), round(p[1] * S, 1))

# ---------------------------------------------------------------- 3. sea, lakes, ground
img = np.asarray(Image.open(PAINTING).convert('RGB')).astype(int)
R_, G_, B_ = img[..., 0], img[..., 1], img[..., 2]
wet = (B_ > R_ + 8) & (B_ > 60)
lab, nlab = nd.label(wet)
sizes = nd.sum(wet, lab, range(1, nlab + 1))

def per_cell(mask):
  """share of each cell covered by a painting-pixel mask"""
  out = np.zeros((H, W))
  m = mask.astype(float)
  for y in range(H):
    y0, y1 = int(y * K), min(PH, int((y + 1) * K))
    if y0 >= PH: continue
    row = m[y0:y1]
    for x in range(W):
      x0, x1 = int(x * K), min(PW, int((x + 1) * K))
      if x0 < x1 and y0 < y1: out[y, x] = row[:, x0:x1].mean()
  return out

def line_mask(lines, width_px, size=(PW, PH)):
  im = Image.new('L', size, 0); d = ImageDraw.Draw(im)
  for pts in lines: d.line([tuple(p) for p in pts], fill=255, width=width_px, joint='curve')
  return np.asarray(im) > 0

# the Suez Canal (painting px): drawn in blue, but a canal, not open sea
CANAL = [(418, 449), (419, 462), (420, 474), (422, 484), (425, 493)]
canal_px = line_mask([CANAL], 7)
sea_px = np.isin(lab, np.where(sizes >= 1000)[0] + 1) & ~canal_px
lake_px = np.isin(lab, np.where((sizes >= 120) & (sizes < 1000))[0] + 1)
sea = per_cell(sea_px) > 0.45

# ---------------------------------------------------------------- 4. rivers (painting px)
RIVERS = {
  'Nile': [(330, 977), (330, 955), (333, 940), (333, 920), (334, 905), (340, 895), (348, 880), (355, 870), (365, 860), (370, 845),
           (380, 835), (395, 828), (405, 820), (412, 805), (415, 790), (418, 770), (420, 745), (420, 725), (418, 710), (418, 695),
           (412, 688), (398, 680), (390, 665), (378, 655), (368, 645), (362, 630), (362, 615), (355, 602), (340, 595), (333, 580),
           (330, 565), (333, 550), (342, 535), (348, 515), (347, 500), (346, 480), (346, 466)],
  'Nile (Rosetta branch)': [(346, 466), (338, 456), (325, 447), (310, 438)],
  'Nile (Damietta branch)': [(346, 466), (355, 456), (368, 447), (388, 434)],
  'Suez Canal': CANAL,
  'Euphrates': [(660, 222), (672, 240), (668, 258), (680, 272), (700, 272), (720, 278), (735, 290), (750, 305), (760, 320), (765, 335),
                (775, 348), (790, 350), (805, 358), (820, 365), (840, 370), (852, 380), (858, 398), (862, 420), (868, 435), (880, 445),
                (900, 448), (915, 452), (922, 465), (935, 470), (955, 474), (975, 474)],
  'Tigris': [(838, 245), (826, 268), (820, 298), (830, 320), (845, 338), (858, 360), (873, 368), (878, 380), (885, 402), (900, 408),
             (915, 412), (930, 425), (940, 440), (950, 455), (965, 465), (975, 474)],
  'Shatt al-Arab': [(975, 474), (990, 478), (1005, 481), (1018, 484)],
  # the Jordan between the Sea of Galilee and the Dead Sea (painted as one water with them)
  'Jordan': [(564, 402), (562, 409), (560, 417)],
}
river = np.zeros((H, W), bool); river_name = np.full((H, W), '', object)
for name, pts in RIVERS.items():
  m = per_cell(line_mask([pts], 5)) > 0.06
  m &= ~sea
  river |= m; river_name[m & (river_name == '')] = name
# the painted river water beside a trace is river too
near = nd.binary_dilation(river, iterations=1)
wetc = per_cell(wet & ~sea_px)
add = near & (wetc > 0.25) & ~river & ~sea
for y, x in zip(*np.where(add)):
  ys, xs = np.where(river[max(0, y - 1):y + 2, max(0, x - 1):x + 2])
  if len(ys): river[y, x] = True; river_name[y, x] = river_name[max(0, y - 1) + ys[0], max(0, x - 1) + xs[0]]
# no diagonal leaks
for _ in range(2):
  r = river.copy()
  for y in range(1, H):
    for x in range(1, W):
      if r[y, x] and r[y - 1, x - 1] and not r[y - 1, x] and not r[y, x - 1]: river[y - 1, x] = True; river_name[y - 1, x] = river_name[y, x]
      if r[y, x - 1] and r[y - 1, x] and not r[y, x] and not r[y - 1, x - 1]: river[y, x] = True; river_name[y, x] = river_name[y, x - 1]
river &= ~sea

lake = (per_cell(lake_px) > 0.3) & ~sea & ~river
LAKE_NAMES = [('Lake Van', 42.9, 38.65), ('Lake Urmia', 45.4, 37.7), ('Lake Sevan', 45.3, 40.35), ('The Dead Sea', 35.5, 31.5),
              ('The Sea of Galilee', 35.6, 32.82)]

# ---- ground: fertile from the greens, mountains from snow and relief
lum = img.mean(-1)
green = (G_ > R_ * 0.95) & (G_ > B_ * 1.1) & (G_ < 190)
snow = (lum > 200) & ((img.max(-1) - img.min(-1)) < 45)
gy, gx = np.gradient(nd.gaussian_filter(lum, 0.8))
grad = np.hypot(gx, gy)
Gc = per_cell(green)
Sc = per_cell(snow)
Rc = nd.uniform_filter(per_cell(grad), 3)       # the painted relief: mean brightness gradient, about 2 over plain desert, 15 in the Zagros
T = np.full((H, W), 'd')
fert = nd.uniform_filter(Gc, 3) > 0.15
T[fert] = 'f'
mount = ((Rc > 13) | (nd.uniform_filter(Sc, 3) > 0.12)) & ~fert
mount = nd.binary_opening(mount, iterations=1)
lab_m, nm = nd.label(mount)
msz = nd.sum(mount, lab_m, range(1, nm + 1))
mount = np.isin(lab_m, np.where(msz >= 12)[0] + 1)
hills = ((Rc > 8.5) | nd.binary_dilation(mount, iterations=1)) & ~mount & ~fert
T[hills] = 'h'
T[mount] = 'm'

# ---------------------------------------------------------------- roads (lon/lat waypoints between towns)
# after the 1920s routes; a road is the only way over closed mountains
ROADS = [
  ('giza', [], 'saqqara'), ('saqqara', [], 'fayoum'), ('giza', [], 'fayoum'),
  ('giza', [], 'cairo'),                                                           # over the English Bridge
  ('cairo', [(31.18, 30.46)], 'tanta'),                                            # by Benha
  ('tanta', [(30.82, 30.82), (30.47, 31.03)], 'alexandria'),                       # Kafr el-Zayyat, Damanhur
  ('cairo', [(31.9, 30.08), (32.40, 30.07)], 'suez'),                              # the desert road by Ajrud
  ('cairo', [(31.50, 30.59), ('px', 413, 471), ('px', 412, 459)], 'portsaid'),      # Zagazig, Ismailia, up the west bank of the canal
  ('suez', [(32.66, 29.87), (33.11, 29.04), (33.65, 28.70)], 'sinai'),             # Ayun Musa, Abu Zenima, Wadi Feiran
  ('sinai', [(34.05, 29.15), (33.80, 29.90)], 'bedouin'),                          # north over the Tih by Nakhl
  ('portsaid', [('px', 429, 458), (33.20, 30.80)], 'bedouin'),                     # across at Kantara
  ('suez', [(32.95, 30.08), (33.50, 30.30)], 'bedouin'),                           # the Mitla pass
  ('portsaid', [('px', 429, 458), (33.00, 31.00), (33.80, 31.10), (34.47, 31.47)], 'jaffa'),   # Kantara, Bir el-Abd, El Arish, Gaza
  ('jaffa', [(34.87, 31.93)], 'jerusalem'),                                        # by Ramle
  ('bedouin', [(34.79, 31.25), (35.10, 31.53)], 'jerusalem'),                      # Beersheba, Hebron
  ('jerusalem', [('px', 552, 411), ('px', 569, 411)], 'amman'),                    # Jericho, the Allenby bridge
  ('amman', [(36.10, 32.62)], 'damascus'),                                         # Deraa
  ('jerusalem', [(35.26, 32.22), (35.62, 33.00), (35.82, 33.12)], 'damascus'),     # Nablus, Jisr Banat Yaqub, Quneitra
  ('jaffa', [(35.03, 32.80), (35.25, 33.27), (35.42, 33.56)], 'beirut'),           # Haifa, Tyre, Sidon
  ('beirut', [(35.77, 33.81), (35.90, 33.82)], 'damascus'),                        # over the Dahr el-Baidar
  ('damascus', [(36.72, 34.73), (36.75, 35.13)], 'aleppo'),                        # Homs, Hama
  ('aleppo', [(36.63, 37.03), (36.25, 37.07), (35.32, 37.00), (34.78, 37.28), (34.05, 37.51)], 'konya'),  # Islahiye, Adana, the Cilician Gates, Eregli
  ('konya', [(32.90, 39.00)], 'ankara'),
  ('ankara', [(30.52, 39.78), (30.00, 40.20), (29.70, 40.70)], 'istanbul'),        # Eskisehir, Izmit
  ('konya', [(30.54, 38.76), (30.52, 39.78), (30.00, 40.20), (29.70, 40.70)], 'istanbul'),   # Afyon, Eskisehir
  ('damascus', [(37.50, 33.30), (40.28, 33.03), ('px', 818, 378), ('px', 849, 384)], 'baghdad'),  # the desert track by Rutba, Ramadi, over the Euphrates at Fallujah
  ('aleppo', [('px', 662, 274), ('px', 700, 281), ('px', 739, 298), ('px', 763, 331), ('px', 792, 360), ('px', 818, 378), ('px', 849, 384)], 'baghdad'),  # down the right bank of the Euphrates by Meskene, Raqqa, Deir ez-Zor, Abu Kamal, Hit, Ramadi
  # the Persian road and its branches
  ('baghdad', [(44.65, 33.75), (45.00, 34.10)], 'khanaqin'),                       # Baqubah, up the Diyala
  ('khanaqin', [(45.58, 34.52), (45.86, 34.46), (46.15, 34.40), (46.24, 34.27), (46.60, 34.25)], 'kermanshah'),  # Qasr-i Shirin, the Paitak pass, Karand
  ('kermanshah', [(47.43, 34.38), (47.96, 34.50), (48.12, 34.78)], 'hamadan'),    # Bisitun, Kangavar, the Asadabad pass
  ('hamadan', [(48.95, 35.20), (49.20, 35.60), (50.00, 36.27), (50.70, 35.95)], 'tehran'),  # the Avaj pass, Qazvin
  ('hamadan', [(48.60, 35.50), (48.48, 36.67), (47.70, 37.42), (47.00, 37.90)], 'tabriz'),  # Zanjan, Mianeh
  ('tehran', [(50.70, 35.95), (50.00, 36.27), (49.20, 36.55), (48.48, 36.67), (47.70, 37.42), (47.00, 37.90)], 'tabriz'),
  ('tehran', [(51.20, 35.20), (50.88, 34.64)], 'kashan'),                          # Qom
  ('kashan', [(51.65, 33.50), (51.55, 33.10)], 'isfahan'),                         # Natanz
  ('isfahan', [(53.08, 32.86), (54.36, 31.90), (56.00, 30.40)], 'kerman'),         # Nain, Yazd, Rafsanjan
]
# (a ('px', x, y) waypoint is placed by hand on the painting: where the real place would fall in the water
# or on the wrong bank of the painted canal or river)

def road_pts(a, via, b):
  pts = [town_px(a)]
  for v in via: pts.append((v[1], v[2]) if v[0] == 'px' else px(*v))
  pts.append(town_px(b))
  return pts

road_lines = []
road = np.zeros((H, W), bool)
for a, via, b in ROADS:
  pts = road_pts(a, via, b)
  road_lines.append({'a': a, 'b': b, 'pts': [list(mu(p)) for p in pts]})
  im = Image.new('L', (W, H), 0); ImageDraw.Draw(im).line([(x / K, y / K) for x, y in pts], fill=1, width=1)
  road |= np.asarray(im, bool)
# a road is 4-connected: where its line steps diagonally, the corner is road too (no slipping between two
# mountain cells that only touch at a corner)
for _ in range(2):
  r = road.copy()
  for y in range(1, H):
    for x in range(1, W):
      if r[y, x] and r[y - 1, x - 1] and not r[y - 1, x] and not r[y, x - 1]: road[y - 1, x] = True
      if r[y, x - 1] and r[y - 1, x] and not r[y, x] and not r[y - 1, x - 1]: road[y, x] = True
road &= ~sea & ~lake
T[road] = 'r'
# towns stand on open ground
for tid in TOWNS:
  x, y = town_px(tid); cx, cy = int(x / K), int(y / K)
  for dy in (-1, 0, 1):
    for dx in (-1, 0, 1):
      X, Y = cx + dx, cy + dy
      if 0 <= Y < H and 0 <= X < W and not sea[Y, X] and T[Y, X] in 'mh': T[Y, X] = 'f'

# ---------------------------------------------------------------- crossings
CROSSINGS = [
  ('the Cairo bridges', None, None, 'bridge'),         # the English Bridge and the Pyramids Road, Giza to Cairo
  ('the Beni Suef ferry', 31.10, 29.07, 'ford'),
  ('Benha bridge', 31.18, 30.46, 'bridge'),
  ('Kafr el-Zayyat bridge', 30.82, 30.82, 'bridge'),
  ('Mansoura ferry', 31.38, 31.04, 'ford'),
  ('the Allenby bridge', 'px', 561, 411, 'bridge'),
  ('Kantara crossing', 'px', 421, 458, 'bridge'),        # the Sinai railway's swing bridge over the canal
  ('Ismailia ferry', 32.27, 30.60, 'ford'),
  ('Fallujah bridge', 'px', 850, 383, 'bridge'),
  ('Ramadi ford', 'px', 822, 370, 'ford'),
  ('Deir ez-Zor ferry', 40.14, 35.33, 'ford'),
  ('Raqqa ford', 39.00, 35.95, 'ford'),
  ('Jarablus bridge', 38.00, 36.82, 'bridge'),
  ('Samarra ford', 'px', 838, 331, 'ford'),
  ('Tikrit ford', 'px', 822, 304, 'ford'),
  ('Mosul bridge', 43.13, 36.34, 'bridge'),
]
def crossing_px(name, lo, la):
  if lo == 'px': return la
  if name == 'the Cairo bridges':
    a, b = town_px('cairo'), town_px('giza'); return ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
  return px(lo, la)

grid = np.full((H, W), '.', object)
grid[river] = 'R'; grid[lake] = 'L'
grid[river_name == 'Suez Canal'] = 'C'
named = {}
# a road over a river crosses it on a bridge (a road along a bank keeps one bridge, in the middle of its run)
road_on = (grid == 'R') | (grid == 'C')
road_on &= road
rl, rn = nd.label(road_on, structure=np.ones((3, 3)))
for i in range(1, rn + 1):
  ys, xs = np.where(rl == i)
  if len(ys) <= 3: grid[ys, xs] = 'B'
  else:
    k = len(ys) // 2; order = np.lexsort((xs, ys)); y0, x0 = ys[order[k]], xs[order[k]]
    for dy in (-1, 0, 1):
      for dx in (-1, 0, 1):
        Y, X = min(H - 1, max(0, y0 + dy)), min(W - 1, max(0, x0 + dx))
        if road_on[Y, X]: grid[Y, X] = 'B'
snap_report = []
crossings_out = []
for c_ in CROSSINGS:
  name, kind = c_[0], c_[-1]
  x, y = crossing_px(name, 'px', (c_[2], c_[3])) if c_[1] == 'px' else crossing_px(name, c_[1], c_[2]); cx, cy = x / K, y / K
  ys, xs = np.where((grid == 'R') | (grid == 'C') | (grid == 'B') | (grid == 'F'))
  d = np.hypot(xs + 0.5 - cx, ys + 0.5 - cy); j = d.argmin()
  sx_, sy_ = xs[j], ys[j]
  snap_report.append((name, round(float(d[j]) * CELL, 1)))
  for dy in range(-1, 2):
    for dx in range(-1, 2):
      X, Y = sx_ + dx, sy_ + dy
      if 0 <= X < W and 0 <= Y < H and grid[Y, X] in ('R', 'C', 'B', 'F'):
        if grid[Y, X] != 'B': grid[Y, X] = 'B' if kind == 'bridge' else 'F'
        named[(Y, X)] = name
  crossings_out.append({'name': name, 'x': round((sx_ + 0.5) * CELL, 1), 'y': round((sy_ + 0.5) * CELL, 1), 'kind': kind})
# towns stand on their rivers: the town itself is a crossing
for tid in TOWNS:
  x, y = town_px(tid); cx, cy = int(x / K), int(y / K)
  for dy in range(-2, 3):
    for dx in range(-2, 3):
      X, Y = cx + dx, cy + dy
      # (Suez had no bridge in 1925: the canal was crossed there by the ferry to Port Tewfik)
      if tid == 'suez' and 0 <= X < W and 0 <= Y < H and grid[Y, X] in ('R', 'C', 'B'): grid[Y, X] = 'F'; named[(Y, X)] = 'the Suez ferry'
      elif 0 <= X < W and 0 <= Y < H and grid[Y, X] in ('R', 'C'): grid[Y, X] = 'B'; named[(Y, X)] = f'the bridges at {tid.capitalize()}'
for y in range(H):
  for x in range(W):
    if grid[y, x] in ('B', 'F') and (y, x) not in named and river_name[y, x]:
      rn_ = river_name[y, x]
      rn_ = rn_.replace('Nile (', '').replace(')', '') if rn_.startswith('Nile') else rn_
      named[(y, x)] = f"{'a bridge' if grid[y, x] == 'B' else 'a ford'} over the {rn_}"
bl, bn = nd.label(grid == 'B', structure=np.ones((3, 3)))
for i in range(1, bn + 1):
  ys, xs = np.where(bl == i)
  cy_, cx_ = ys.mean(), xs.mean()
  X, Y = (cx_ + 0.5) * CELL, (cy_ + 0.5) * CELL
  if any(abs(X - c['x']) < 30 and abs(Y - c['y']) < 30 for c in crossings_out): continue
  nm_ = named.get((ys[0], xs[0]), 'a bridge')
  if nm_.startswith('the bridges at'): continue
  crossings_out.append({'name': nm_[0].upper() + nm_[1:], 'x': round(X, 1), 'y': round(Y, 1), 'kind': 'bridge'})

# ---------------------------------------------------------------- straits: the Dardanelles for ships
# Marmara is painted shut at its western end: open the cells between it and the Aegean
marmara_id = None
for i in np.argsort(sizes)[::-1][:8]:
  ys, xs = np.where(lab == i + 1)
  if 200 <= xs.min() <= 230 and ys.max() < 90: marmara_id = i + 1
strait_cells = []
if marmara_id:
  ys, xs = np.where(lab == marmara_id); j = xs.argmin(); a = (xs[j], ys[j])
  med = sea_px & (lab != marmara_id); ys2, xs2 = np.where(med[:, :a[0]]); d = np.hypot(xs2 - a[0], ys2 - a[1]); k = d.argmin(); b = (xs2[k], ys2[k])
  n = int(max(abs(b[0] - a[0]), abs(b[1] - a[1])) / K * 2) + 2
  for t in range(n + 1):
    X = int((a[0] + (b[0] - a[0]) * t / n) / K); Y = int((a[1] + (b[1] - a[1]) * t / n) / K)
    if not sea[Y, X] and (X, Y) not in strait_cells: strait_cells.append((X, Y))
# and the Bosporus, from Constantinople to the Black Sea, for completeness of the coast (no port uses it)

# ---------------------------------------------------------------- write
def write(path, text):
  open(f'{ROOT}/{path}', 'w').write(text)

write('src/data/landmask.ts',
  "// Generated by tools/build-map.py from the painted travel map (art-src/world/travel-map-painting-1610.png).\n"
  f"// 1 = water (the seas, read from the painting's blues). {W} x {H} cells of {CELL} map units over the\n"
  f"// {MAP_W} x {MAP_H} map. Rivers, lakes and the canal are in barriers.ts. Do not edit by hand.\n"
  f"export const MASK_W = {W}, MASK_H = {H}, CELL = {CELL};\n"
  "export const WATER_ROWS: string[] = [" + ",".join('"' + ''.join('1' if c else '0' for c in row) + '"' for row in sea) + "];\n"
  "/** cells opened for ships only: the Dardanelles, narrower than a cell on the painting */\n"
  f"export const STRAIT_CELLS: [number, number][] = {json.dumps([[int(a), int(b)] for a, b in strait_cells])};\n")

write('src/data/terrain.ts',
  '// Generated by tools/build-map.py from the painted travel map. Do not edit by hand.\n'
  '// d desert, f fertile, h hills, m mountains (impassable), r road. Water is in landmask.ts.\n'
  f'export const TERRAIN_ROWS: string[] = {json.dumps(["".join(row) for row in T])};\n'
  '/** Roads in map units, town to town. */\n'
  f'export const ROAD_LINES: {{ a: string; b: string; pts: [number, number][] }}[] = {json.dumps(road_lines)};\n')

names = {**{int(y * W + x): river_name[y, x] for y in range(H) for x in range(W) if river[y, x] and river_name[y, x]}, **{int(y * W + x): v for (y, x), v in named.items()}}
write('src/data/barriers.ts',
  '// Generated by tools/build-map.py from the painted travel map. Do not edit by hand.\n'
  '// . open ground (see terrain.ts), R river, C canal, L lake: closed. B bridge (a road), F ford (slow going).\n'
  f'export const BARRIER_ROWS: string[] = {json.dumps(["".join(r) for r in grid])};\n'
  f'/** names for the water and crossings, by cell index (y * {W} + x) */\n'
  f'export const BARRIER_NAMES: Record<number, string> = {json.dumps(names)};\n'
  f'export const LAKES: {{ name: string; x: number; y: number }}[] = {json.dumps([{"name": n, "x": mu(px(lo, la))[0], "y": mu(px(lo, la))[1]} for n, lo, la in LAKE_NAMES])};\n'
  f'export const CROSSINGS: {{ name: string; x: number; y: number; kind: "bridge" | "ford" }}[] = {json.dumps(crossings_out)};\n')

n = len(CP)
write('src/data/projection.ts',
  '// Generated by tools/build-map.py. Do not edit by hand.\n'
  '// Real longitude and latitude to map units on the painted travel map: a quadratic fitted by least squares\n'
  '// to points measured on the painting, plus a thin-plate spline through what the quadratic leaves over.\n'
  f'export const MAP_UNITS_PER_PX = {S};\n'
  f'const LON0 = {LON0}, LAT0 = {LAT0}, KX = {KX};\n'
  f'const QX = {json.dumps([round(v, 8) for v in QUAD[:, 0]])}, QY = {json.dumps([round(v, 8) for v in QUAD[:, 1]])};\n'
  f'const CX = {json.dumps([round(v, 6) for v in SX])}, CY = {json.dumps([round(v, 6) for v in SY])};\n'
  f'const WX = {json.dumps([round(v, 8) for v in TPS[:, 0]])}, WY = {json.dumps([round(v, 8) for v in TPS[:, 1]])};\n'
  'const U = (r2: number) => (r2 > 0 ? r2 * Math.log(r2) : 0);\n'
  '/** longitude, latitude (degrees) to map units */\n'
  'export function geo(lon: number, lat: number): { x: number; y: number } {\n'
  '  const x = lon - LON0, y = lat - LAT0, f = [1, x, y, x * x, x * y, y * y];\n'
  '  let px = 0, py = 0;\n'
  '  for (let i = 0; i < 6; i++) { px += f[i] * QX[i]; py += f[i] * QY[i]; }\n'
  '  const sx = x * KX, sy = y, n = CX.length;\n'
  '  for (let i = 0; i < n; i++) { const u = U((sx - CX[i]) ** 2 + (sy - CY[i]) ** 2); px += u * WX[i]; py += u * WY[i]; }\n'
  '  px += WX[n] + sx * WX[n + 1] + sy * WX[n + 2];\n'
  '  py += WY[n] + sx * WY[n + 1] + sy * WY[n + 2];\n'
  '  return { x: Math.round(px * MAP_UNITS_PER_PX * 10) / 10, y: Math.round(py * MAP_UNITS_PER_PX * 10) / 10 };\n'
  '}\n')

# towns and wells into world.ts
src = open(f'{ROOT}/src/data/world.ts').read()
old_pos = {m[0]: (float(m[1]), float(m[2])) for m in re.findall(r"id: '([a-z-]+)'[^\n]*? x: ([\d.]+), y: ([\d.]+)", src)}
new_pos = {}
for tid in list(TOWNS) + list(WELLS):
  x, y = mu(town_px(tid)); new_pos[tid] = (x, y)
  src, k = re.subn(r"(id: '%s'[^\n]*? x: )[\d.]+(, y: )[\d.]+" % re.escape(tid), lambda m: f'{m.group(1)}{x}{m.group(2)}{y}', src, count=1)
  assert k == 1, tid
open(f'{ROOT}/src/data/world.ts', 'w').write(src)

# the old-to-new transform for saves: settlements as control points (old map units -> new map units)
if '--old' in sys.argv or True:
  OLD = json.load(open(f'{ROOT}/tools/old-map-positions.json'))
  ids = [t for t in TOWNS if t in OLD]
  o = np.array([OLD[t] for t in ids]); nw = np.array([new_pos[t] for t in ids])
  m_ = len(ids)
  A = np.c_[np.ones(m_), o]
  aff, *_ = np.linalg.lstsq(A, nw, rcond=None)
  r = A @ aff - nw
  ox, oy = o[:, 0] / 100, o[:, 1] / 100
  L = np.zeros((m_ + 3, m_ + 3)); L[:m_, :m_] = tps_u((ox[:, None] - ox[None]) ** 2 + (oy[:, None] - oy[None]) ** 2) + 0.05 * np.eye(m_)
  Pm = np.stack([np.ones(m_), ox, oy], 1); L[:m_, m_:] = Pm; L[m_:, :m_] = Pm.T
  rhs = np.zeros((m_ + 3, 2)); rhs[:m_] = -r
  wt = np.linalg.solve(L, rhs)
  write('src/game/state/mapMove.ts',
    '// Generated by tools/build-map.py. Do not edit by hand.\n'
    '// Saves from before the one-painting map (save 33) kept positions on the old map (the 1536 px painting\n'
    '// shown 885 units across, Persia drawn east of it, 1265 x 590). This carries a point on the old map to\n'
    '// the same place on the new one: an affine fit through the towns, bent by a thin-plate spline so every\n'
    '// town lands on itself.\n'
    'export const OLD_MAP = { w: 1265, h: 590, cell: 5, cols: 253, rows: 118 };\n'
    f'const A = {json.dumps([[round(v, 6) for v in row] for row in aff.tolist()])};\n'
    f'const OX = {json.dumps([round(v, 4) for v in ox])}, OY = {json.dumps([round(v, 4) for v in oy])};\n'
    f'const WX = {json.dumps([round(v, 6) for v in wt[:, 0]])}, WY = {json.dumps([round(v, 6) for v in wt[:, 1]])};\n'
    'const U = (r2: number) => (r2 > 0 ? r2 * Math.log(r2) : 0);\n'
    'export function oldToNew(p: { x: number; y: number }): { x: number; y: number } {\n'
    '  let x = A[0][0] + p.x * A[1][0] + p.y * A[2][0], y = A[0][1] + p.x * A[1][1] + p.y * A[2][1];\n'
    '  const sx = p.x / 100, sy = p.y / 100, n = OX.length;\n'
    '  for (let i = 0; i < n; i++) { const u = U((sx - OX[i]) ** 2 + (sy - OY[i]) ** 2); x += u * WX[i]; y += u * WY[i]; }\n'
    '  x += WX[n] + sx * WX[n + 1] + sy * WX[n + 2]; y += WY[n] + sx * WY[n + 1] + sy * WY[n + 2];\n'
    f'  return {{ x: Math.max(0, Math.min({MAP_W - 1}, x)), y: Math.max(0, Math.min({MAP_H - 1}, y)) }};\n'
    '}\n')

# ---------------------------------------------------------------- report
if '--report' in sys.argv:
  r = np.hypot(RES[:, 0], RES[:, 1])
  print(f'quadratic fit: rms {np.sqrt((r ** 2).mean()):.1f} px, max {r.max():.1f} px (thin-plate spline brings every control point to 0)')
  for c, e in zip(CP, RES): print(f'  {c[0]:28s} {e[0]:+6.1f} {e[1]:+6.1f}')
  print('crossings snapped to the traced rivers (map units moved):', snap_report)
  for tid in TOWNS:
    x, y = new_pos[tid]; cx, cy = int(x / CELL), int(y / CELL)
    print(f'  {tid:11s} {x:7.1f} {y:7.1f}  ground {T[cy, cx]} barrier {grid[cy, cx]} sea {int(sea[cy, cx])}')
print({c: int((T == c).sum()) for c in 'dfhmr'}, 'river', int(river.sum()), 'lake', int(lake.sum()), 'bridges', int((grid == 'B').sum()), 'fords', int((grid == 'F').sum()), 'straits', strait_cells)

if '--overlay' in sys.argv:
  out = sys.argv[sys.argv.index('--overlay') + 1]
  base = Image.open(PAINTING).convert('RGB').resize((W * 8, H * 8), Image.LANCZOS)
  ov = Image.new('RGBA', base.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
  COL = {'sea': (20, 70, 220, 90), 'R': (0, 160, 255, 190), 'C': (0, 230, 230, 200), 'L': (140, 0, 255, 160), 'B': (0, 230, 0, 230), 'F': (255, 230, 0, 230),
         'm': (230, 0, 0, 100), 'h': (255, 150, 0, 50), 'r': (255, 255, 255, 120), 'f': (40, 200, 60, 40)}
  for y in range(H):
    for x in range(W):
      k = grid[y, x]
      if k == '.': k = 'sea' if sea[y, x] else T[y, x]
      if k in COL: d.rectangle([x * 8, y * 8, x * 8 + 7, y * 8 + 7], fill=COL[k])
  im = Image.alpha_composite(base.convert('RGBA'), ov); d = ImageDraw.Draw(im)
  for tid, (x, y) in new_pos.items():
    X, Y = x / CELL * 8, y / CELL * 8
    d.ellipse([X - 5, Y - 5, X + 5, Y + 5], fill='white', outline='black'); d.text((X + 7, Y - 7), tid, fill='white', stroke_width=2, stroke_fill='black')
  for c in crossings_out[:len(CROSSINGS)]: d.text((c['x'] / CELL * 8 + 6, c['y'] / CELL * 8 + 2), c['name'], fill=(255, 255, 160), stroke_width=2, stroke_fill='black')
  im.convert('RGB').save(out)
