"""Where the map's painted decorations stand: palms, trees, olives, peaks, hills, desert marks, fields, sea marks.

Reads the painting (art-src/world/travel-map-master-4800.png for its colours, travel-map-painting-1610.png
for its relief, as tools/build-map.py does), the ground grid and everything the decorations must keep
clear of (written by tools/mapkit-clear.ts: sea, rivers, lakes, the canal, towns and wells with their
names, roads, railways, motor and sea routes, the names on the painting, the cartouche), and places each
kind of decoration by rules (below, in map units, regions by longitude and latitude through the painting's
projection, src/data/projection.ts):
  - peaks along the painted ranges: relief and snow read from the painting; ridges found from the relief
    (the Hessian's strongest bend), peaks set in rows along them, the heart of a range first and largest;
    snowy where the painting is white, red granite in Sinai, the Red Sea hills and Midian, bare elsewhere;
    Ararat and Damavand as the two very large snowy peaks at their real places;
  - hills on the edges and foothills of the ranges, green where the painting is green;
  - trees on the painting's greens inside sensible regions (the Black Sea coast, the Caspian shore, the
    Caucasus, western Anatolia, Greece, the Taurus), cedars on Mount Lebanon, oak in the Zagros foothills;
  - olives on the Levant coast, western Anatolia, Greece, Crete and Cyprus, and thick in the Ghouta;
  - fields in the Delta, the Nile valley, the Fayoum and Mesopotamia; palms thick along the Nile and in the
    Delta, the Fayoum, down the Tigris and Euphrates to Basra, on the Gulf and Oman coasts, in the Jordan
    valley and at the oases and wells, sparse on the Levant coast;
  - dunes, rocky outcrops and scrub in the deserts; wave strokes on the open sea, shallows along coasts.
Nothing stands on water but the sea marks, nothing on a river, and every town, name, road and route is
kept clear. Each item is checked by its whole outline at the largest it is drawn (it is drawn larger when
zoomed out, src/game/systems/mapKitDraw.ts). Each item gets a level of detail: level 0 is a sparse set
shown at every zoom, 1 joins at a middle zoom, 2 close in. Placement is seeded, so the same inputs always
give the same zones.
Writes src/data/mapKitZones.ts (items packed 8 bytes each, base64, sorted back to front) and, with
--overlay, a picture of the zones on the painting.
Run: python3 tools/build-mapkit.py [--overlay out.png] [--out src/data/mapKitZones.ts]
"""
import os, re, sys, json, math, base64, argparse, subprocess, tempfile
import numpy as np
import cv2
from PIL import Image, ImageDraw
from scipy import ndimage as nd
from skimage.feature import hessian_matrix, hessian_matrix_eigvals

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
MAP_W, MAP_H = 2000, 1214
F = 2.5                                 # the fine grid: 2.5 map units a cell
GW, GH = 800, 486
KIT = json.load(open(f'{ROOT}/src/data/mapKitSheets.json'))
KINDS = [k['kind'] for k in KIT['kinds']]
KI = {k: i for i, k in enumerate(KINDS)}
KH = {k['kind']: k['h'] for k in KIT['kinds']}
KA = {k['kind']: k['aspect'] for k in KIT['kinds']}
BOOST = [1.5, 1.25, 1.0]                # how much larger each level is drawn at its farthest zoom (mapKitDraw.ts)
SEED = 1925

# ---------------------------------------------------------------- the painting's projection (projection.ts)
_src = open(f'{ROOT}/src/data/projection.ts').read()
def _arr(name): return np.array([float(v) for v in re.search(rf'\b{name} = \[([^\]]*)\]', _src).group(1).split(',')])
QX, QY, CX, CY, WX, WY = (_arr(n) for n in ('QX', 'QY', 'CX', 'CY', 'WX', 'WY'))
MUPP = float(re.search(r'MAP_UNITS_PER_PX = ([\d.]+)', _src).group(1))
LON0, LAT0, KXP = 40.0, 32.0, float(re.search(r'KX = ([\d.]+)', _src).group(1))

def geo(lon, lat):
  x, y = lon - LON0, lat - LAT0
  f = np.array([1, x, y, x * x, x * y, y * y])
  px, py = f @ QX, f @ QY
  sx, sy = x * KXP, y
  r2 = (sx - CX) ** 2 + (sy - CY) ** 2
  with np.errstate(divide='ignore', invalid='ignore'): u = np.where(r2 > 0, r2 * np.log(r2), 0)
  n = len(CX)
  px += u @ WX[:n] + WX[n] + sx * WX[n + 1] + sy * WX[n + 2]
  py += u @ WY[:n] + WY[n] + sx * WY[n + 1] + sy * WY[n + 2]
  return float(px * MUPP), float(py * MUPP)

# ---------------------------------------------------------------- rasters on the fine grid
def blank(): return np.zeros((GH, GW), np.uint8)

def poly(pts_lonlat, dens=6):
  """a region given by longitude/latitude corners (edges densified, as the projection bends them)"""
  pts = []
  for i in range(len(pts_lonlat)):
    a, b = pts_lonlat[i], pts_lonlat[(i + 1) % len(pts_lonlat)]
    for k in range(dens):
      t = k / dens
      x, y = geo(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
      pts.append([x / F, y / F])
  m = blank()
  cv2.fillPoly(m, [np.round(np.array(pts)).astype(np.int32)], 1)
  return m.astype(bool)

def box(lo0, lo1, la0, la1): return poly([(lo0, la0), (lo1, la0), (lo1, la1), (lo0, la1)])

def disc(x, y, r):
  m = blank(); cv2.circle(m, (int(round(x / F)), int(round(y / F))), max(1, int(round(r / F))), 1, -1); return m.astype(bool)

def edt(mask):
  """distance in map units from each cell to the nearest cell of mask"""
  return nd.distance_transform_edt(~mask) * F

def cell(x, y):
  return min(GH - 1, max(0, int(y / F))), min(GW - 1, max(0, int(x / F)))

# ---------------------------------------------------------------- inputs
def load_clear():
  out = os.path.join(tempfile.mkdtemp(), 'clear.json')
  subprocess.run(['npx', 'tsx', 'tools/mapkit-clear.ts', out], cwd=ROOT, check=True, stdout=subprocess.DEVNULL)
  return json.load(open(out))

def painting_features():
  m = np.asarray(Image.open(f'{ROOT}/art-src/world/travel-map-master-4800.png').convert('RGB'))
  R, G, B = (m[..., i].astype(np.float32) for i in range(3))
  lum = (R + G + B) / 3
  def share(mask): return cv2.resize(mask.astype(np.float32), (GW, GH), interpolation=cv2.INTER_AREA)
  green = share((G / (R + 1) > 0.86) & (G > B * 1.12) & (lum < 205))
  snow = share((lum > 200) & ((m.max(-1).astype(np.int16) - m.min(-1)) < 45))
  wet = share((B > R + 8) & (B > 60))
  teal = share((B > R + 8) & (G > B * 0.92))           # the lighter blue-green of shallow water
  del m, R, G, B, lum
  # relief from the 1610 painting (as build-map.py reads it), with the water painted out first so that
  # coasts and river banks do not count as relief
  p = np.asarray(Image.open(f'{ROOT}/art-src/world/travel-map-painting-1610.png').convert('RGB'))
  pr, pb = p[..., 0].astype(int), p[..., 2].astype(int)
  w = cv2.dilate(((pb > pr + 8) & (pb > 60)).astype(np.uint8), np.ones((5, 5), np.uint8))
  q = cv2.inpaint(p, w, 5, cv2.INPAINT_TELEA).astype(np.float32).mean(-1)
  gy, gx = np.gradient(nd.gaussian_filter(q, 0.8))
  rel = nd.uniform_filter(cv2.resize(np.hypot(gx, gy), (GW, GH), interpolation=cv2.INTER_AREA), 6)
  return dict(green=green, snow=snow, wet=wet, teal=teal, rel=rel)

# ---------------------------------------------------------------- placement
class Placer:
  def __init__(self, land, sea, blocked_land, blocked_sea, rng_seed=SEED):
    self.land, self.sea = land, sea
    self.bl, self.bs = blocked_land, blocked_sea       # one raster for each level of detail
    self.occ = np.zeros((MAP_H, MAP_W), np.uint8)       # base footprints, 1 unit a pixel
    self.items = []
    self.seed = rng_seed
    self.near = {}                                     # kind -> spatial hash of placed items

  def outline_ok(self, kind, x, y, h, w, sea=False, lod=2):
    pts = [(x, y), (x - w / 2, y), (x + w / 2, y), (x - w * 0.35, y - h * 0.3), (x + w * 0.35, y - h * 0.3),
           (x - w / 4, y - h * 0.6), (x + w / 4, y - h * 0.6), (x, y - h * 0.9), (x, y - h * 0.5)]
    okm, blk = (self.sea, self.bs[lod]) if sea else (self.land, self.bl[lod])
    for px, py in pts:
      if px < 3 or py < 3 or px > MAP_W - 3 or py > MAP_H - 3: return False
      i, j = cell(px, py)
      if not okm[i, j] or blk[i, j]: return False
    return True

  def base(self, kind, x, y, h, w):
    # peaks crowd together as a range does (the nearer one drawn over the farther); the rest keep their ground
    k = (0.27, 0.1) if kind.startswith('peak') else (0.4, 0.16)
    return (x, y - h * 0.1), (max(1.0, w * k[0]), max(1.0, h * k[1]))

  def occ_free(self, kind, x, y, h, w):
    (cx, cy), (ax, ay) = self.base(kind, x, y, h, w)
    for px, py in ((cx, cy), (cx - ax * 0.8, cy), (cx + ax * 0.8, cy), (cx, cy - ay * 0.8), (cx, cy + ay * 0.8)):
      ix, iy = int(px), int(py)
      if 0 <= ix < MAP_W and 0 <= iy < MAP_H and self.occ[iy, ix]: return False
    return True

  def stamp(self, kind, x, y, h, w):
    (cx, cy), (ax, ay) = self.base(kind, x, y, h, w)
    cv2.ellipse(self.occ, (int(round(cx)), int(round(cy))), (int(round(ax)), int(round(ay))), 0, 0, 360, 1, -1)

  def spaced(self, kind, x, y, sp):
    hsh = self.near.setdefault(kind, {})
    gx, gy = int(x // 40), int(y // 40)
    for dx in (-1, 0, 1):
      for dy in (-1, 0, 1):
        for (qx, qy, qs) in hsh.get((gx + dx, gy + dy), ()):
          if (qx - x) ** 2 + (qy - y) ** 2 < min(sp, qs) ** 2: return False
    return True

  def add(self, kind, x, y, size, lod, rng, sp=0, force=False):
    h = KH[kind] * size; w = h * KA[kind]
    sea = KIT['kinds'][KI[kind]]['sea']
    b = BOOST[lod]
    if not force:
      if not self.outline_ok(kind, x, y, h * b, w * b, sea, lod): return False
      if not sea and not self.occ_free(kind, x, y, h, w): return False
    if not sea: self.stamp(kind, x, y, h, w)
    self.near.setdefault(kind, {}).setdefault((int(x // 40), int(y // 40)), []).append((x, y, sp))
    self.items.append((KI[kind], lod, round(x, 1), round(y, 1), size, int(rng.integers(0, 256))))
    return True

  def scatter(self, kind, D, stages, size=lambda x, y, r: r.uniform(0.85, 1.15), kind_of=None, order=None):
    """dart throwing over the density D (0..1 a cell): for each (level, spacing) stage, candidates on a
    jittered grid, tried in a seeded random order (or by `order`, a score to try highest first)"""
    rng = np.random.default_rng([self.seed, KI[kind]])
    ys, xs = np.where(D > 0)
    if not len(ys): return 0
    x0, x1, y0, y1 = xs.min() * F, (xs.max() + 1) * F, ys.min() * F, (ys.max() + 1) * F
    n0 = len(self.items)
    for lod, sp in stages:
      if sp <= 0: continue
      step = sp * 0.55
      gx = np.arange(x0, x1, step); gy = np.arange(y0, y1, step)
      cx, cy = np.meshgrid(gx, gy)
      cx = (cx + rng.uniform(0, step, cx.shape)).ravel(); cy = (cy + rng.uniform(0, step, cy.shape)).ravel()
      ii = np.clip((cy / F).astype(int), 0, GH - 1); jj = np.clip((cx / F).astype(int), 0, GW - 1)
      d = D[ii, jj]
      keep = d > 0
      cx, cy, d = cx[keep], cy[keep], d[keep]
      if order is not None:
        sc = order[ii[keep], jj[keep]] + rng.uniform(0, 1e-3, len(cx))
        idx = np.argsort(-sc)
      else:
        idx = rng.permutation(len(cx))
      roll = rng.uniform(0, 1, len(cx))
      for k in idx:
        # the far level a little fuller, so a region still reads as wooded or palm-lined zoomed right out
        if roll[k] >= d[k] * (1.6 if lod == 0 else 1.0): continue
        x, y = float(cx[k]), float(cy[k])
        if not self.spaced(kind, x, y, sp): continue
        kd = kind_of(x, y) if kind_of else kind
        if kd is None: continue
        s = size(x, y, rng)
        self.add(kd, x, y, s, lod, rng, sp)
    return len(self.items) - n0


def main(argv=None):
  ap = argparse.ArgumentParser()
  ap.add_argument('--out', default=f'{ROOT}/src/data/mapKitZones.ts')
  ap.add_argument('--overlay')
  a = ap.parse_args(argv)
  C = load_clear()
  P = painting_features()
  # ---- ground
  g5 = np.array([list(r) for r in C['grid']])
  g = np.repeat(np.repeat(g5, 2, 0), 2, 1)[:GH, :GW]
  sea = g == 'w'
  river = np.isin(g, ['R', 'B', 'F', 'C'])
  lake = g == 'L'
  # a margin of a cell off the sea, the rivers, lakes and canal, and off any clear painted water
  water = sea | river | lake | (P['wet'] > 0.5)
  land = ~nd.binary_dilation(water, iterations=1) & (P['wet'] < 0.25)
  open_sea = sea & (P['wet'] > 0.6)
  d_sea = edt(sea)                 # distance from the sea, on land
  d_shore = edt(~sea)              # distance from land, on the sea
  d_river = edt(river)
  green = nd.gaussian_filter(P['green'], 1.5)
  snow = nd.gaussian_filter(P['snow'], 1.0)
  rel = P['rel'].copy()
  rel[d_river < 12] = np.minimum(rel[d_river < 12], 6)   # the Nile's green banks are not relief

  # ---- what to keep clear of, for each level of detail: town pins, names and lines are drawn the same size
  # on the screen at every zoom, so they cover less ground the closer the level is seen
  CL = KIT['clear']
  def line(m, pts, half):
    if len(pts) < 2: return
    cv2.polylines(m, [np.round(np.array(pts) / F).astype(np.int32)], False, 1, max(1, int(round(2 * half / F))))
  def keep_clear(k):
    bl = blank(); bs = blank()
    for r in C['roads'] + C['rails'] + C['motor']: line(bl, r, CL['road'] * k)
    for r in C['sea']: line(bs, r, CL['sea'] * k)
    for p in C['places']:
      r = (CL['town'] if p['kind'] in ('city', 'port', 'home', 'town') else CL['place']) * k
      for m in (bl, bs):
        cv2.circle(m, (int(p['x'] / F), int(p['y'] / F)), max(1, int(round(r / F))), 1, -1)
        if p['name']:
          wd = (len(p['name']) * 7 + 10) * k
          cv2.rectangle(m, (int((p['x'] - wd / 2) / F), int((p['y'] + 5 * k) / F)), (int((p['x'] + wd / 2) / F), int((p['y'] + 22 * k) / F)), 1, -1)
    for l in C['labels']:
      font = (15 if l['kind'] in ('region', 'sea') else 11) * l['size'] * k
      per = {'region': 1.1, 'sea': 0.72, 'river': 0.62, 'minor': 0.72}[l['kind']]
      wd, ht = len(l['text']) * font * per + 6, font * 1.5
      rect = cv2.boxPoints(((l['x'] / F, l['y'] / F), (wd / F, ht / F), l['rot']))
      for m in (bl, bs): cv2.fillPoly(m, [np.round(rect).astype(np.int32)], 1)
    return bl.astype(bool), bs.astype(bool)
  far = blank()
  for o in C['ornaments']:
    wd, ht = (330, 170) if o['what'] == 'cartouche' else (300, 60)
    cv2.rectangle(far, (int((o['x'] - wd / 2) / F), int((o['y'] - ht / 2) / F)), (int((o['x'] + wd / 2) / F), int((o['y'] + ht / 2) / F)), 1, -1)
  # the edge of the painting (its burnt border)
  edge = blank().astype(bool); edge[:4, :] = edge[-5:, :] = True; edge[:, :4] = edge[:, -5:] = True
  BL, BS = [], []
  for lod, k in enumerate(CL['lodScale']):
    bl, bs = keep_clear(k)
    if lod == 0: bl |= far.astype(bool); bs |= far.astype(bool)
    BL.append(bl | edge); BS.append(bs | nd.binary_dilation(edge, iterations=6))
  pl = Placer(land, open_sea, BL, BS)
  bl = BL[2]
  places = {p['id']: p for p in C['places']}

  # ---- regions
  G = lambda m, floor=0.0: np.where(m, np.maximum(floor, np.clip((green - 0.1) / 0.3, 0, 1)), 0)
  nile_region = box(29.5, 33.2, 21.0, 31.7)
  delta = poly([(29.85, 31.25), (30.4, 31.62), (31.2, 31.62), (32.2, 31.35), (31.55, 30.55), (31.25, 30.02), (31.05, 30.02), (30.4, 30.6)])
  fayoum = disc(*geo(30.72, 29.35), 26)
  meso = poly([(42.0, 34.6), (44.6, 34.6), (46.2, 32.8), (48.8, 30.6), (48.6, 29.6), (47.4, 30.0), (45.0, 31.0), (43.2, 32.4), (41.6, 34.0)])
  meso_n = box(38.0, 44.5, 34.4, 37.0)
  near_nile = nile_region & (d_river < 11)
  near_meso = meso & (d_river < 13)

  # ---- 1. peaks: relief and snow, ridges, the heart of each range first
  lowered = box(32.0, 39.5, 21.0, 30.5) | box(55.0, 60.5, 22.0, 26.8)     # Sinai, the Red Sea hills, Hejaz; Oman: drawn lower on the painting
  central = box(50.0, 60.5, 27.0, 34.6)
  hejaz = box(35.0, 42.5, 19.5, 28.6) & (d_sea < 170) & (d_sea > 12)
  thr = np.where(hejaz, 6.8, np.where(lowered, 8.0, np.where(central, 10.5, 12.0)))
  M = np.clip((rel - thr) / 8 + 0.35, 0, 1) * (rel > thr)
  M = np.maximum(M, np.clip((snow - 0.06) * 6, 0, 1))
  M[~land] = 0
  M = nd.gaussian_filter(M, 1.0)
  mount = M > 0.3
  lab, n = nd.label(mount)
  sz = nd.sum(mount, lab, range(1, n + 1))
  mount = np.isin(lab, np.where(sz >= 8)[0] + 1)
  heart = np.clip(edt(~mount) / 20, 0, 1)
  H = hessian_matrix(nd.gaussian_filter(M, 1.5), sigma=2.0, order='rc', use_gaussian_derivatives=False)
  ev = hessian_matrix_eigvals(H)
  ridge = np.clip(-ev[1], 0, None)
  ridge /= max(1e-6, np.percentile(ridge[mount], 95))
  score = np.where(mount, M * (0.35 + np.clip(ridge, 0, 1)) + heart * 0.5, 0)
  granite = (poly([(32.6, 27.5), (34.6, 27.5), (34.9, 29.6), (33.0, 29.6)]) | box(32.0, 35.8, 21.0, 27.6)
             | box(34.7, 37.6, 25.5, 29.6) | box(35.2, 35.9, 29.5, 30.9))
  def peak_kind(x, y):
    i, j = cell(x, y)
    if snow[i, j] > 0.07 or (snow[i, j] > 0.035 and M[i, j] > 0.7): return 'peak-snow'
    return 'peak-granite' if granite[i, j] else 'peak-bare'
  def peak_size(x, y, r):
    i, j = cell(x, y)
    return float(np.clip(0.62 + 0.55 * heart[i, j] + 0.35 * M[i, j], 0.6, 1.5) * r.uniform(0.9, 1.1))
  rng = np.random.default_rng([SEED, 99])
  # Ararat and Damavand, at their real places, before anything else
  for name, lon, lat, size in (('Ararat', 44.30, 39.70, 1.0), ('Damavand', 52.11, 35.95, 0.85)):
    x, y = geo(lon, lat)
    # stand it on the nearest spot whose outline is clear (the summit is the spot, the base a little below)
    best = None
    for bst, sz in ((BOOST[0], size), (1.0, size), (1.0, size * 0.8)):
      h = KH['peak-big'] * sz
      for rr in range(0, 50, 2):
        for k in range(max(1, rr * 2)):
          t = 2 * math.pi * k / max(1, rr * 2)
          bx, by = x + rr * math.cos(t), y + h * 0.75 + rr * math.sin(t)
          if pl.outline_ok('peak-big', bx, by, h * bst, h * KA['peak-big'] * bst, False, 0 if bst > 1 else 2): best = (bx, by); break
        if best: break
      if best: size = sz; break
    bx, by = best or (x, y + KH['peak-big'] * size * 0.75)
    pl.add('peak-big', bx, by, size, 0, rng, 60, force=True)
  pl.scatter('peak-bare', np.where(mount, 1.0, 0), [(0, 26), (1, 14), (2, 8)], size=peak_size, kind_of=peak_kind, order=score)

  # ---- 2. hills: the edges and foothills of the ranges
  near_mount = edt(mount) < 45
  foot = (nd.binary_dilation(mount, iterations=5) & ~mount) | ((rel > np.where(lowered, 7.0, 8.5)) & ~mount & near_mount)
  foot &= land & ~near_nile & ~delta
  hill_d = np.where(foot, 0.55, 0)
  pl.scatter('hill-ochre', hill_d, [(0, 50), (1, 28), (2, 16)],
             kind_of=lambda x, y: 'hill-green' if green[cell(x, y)] > 0.18 else 'hill-ochre')

  # ---- 3. fields: the Delta, the Nile valley, the Fayoum, Mesopotamia
  field_d = np.zeros((GH, GW))
  field_d[delta & land] = 0.8
  field_d[near_nile & (green > 0.15)] = np.maximum(field_d[near_nile & (green > 0.15)], 0.6)
  field_d[fayoum & land] = 0.75
  field_d[near_meso & (green > 0.1)] = np.maximum(field_d[near_meso & (green > 0.1)], 0.5)
  pl.scatter('field', field_d * land, [(1, 18), (2, 10)])

  # ---- 4. trees: forests on the painting's greens in sensible regions; cedars and oak
  pontic = box(29.5, 41.8, 40.4, 42.3)
  hyrc = poly([(48.6, 38.7), (49.0, 37.3), (50.4, 36.75), (52.0, 36.35), (54.0, 36.55), (55.6, 37.1), (55.4, 37.7), (54.0, 37.05), (52.0, 36.85), (50.4, 37.35), (49.5, 37.7), (49.1, 38.8)])
  caucasus = box(39.5, 49.5, 40.7, 44.0)
  w_anat = box(26.0, 31.5, 37.0, 41.2)
  greece = box(19.5, 24.4, 36.2, 41.8)
  taurus = box(30.5, 36.8, 36.5, 37.9)
  cedar = poly([(35.62, 33.55), (35.9, 33.5), (36.3, 34.25), (36.35, 34.65), (36.05, 34.65), (35.72, 34.0)])
  zagros = poly([(43.0, 37.4), (45.5, 37.4), (46.8, 35.9), (48.6, 33.9), (51.6, 30.9), (52.6, 29.5), (51.6, 29.1), (49.6, 30.4), (47.6, 32.1), (45.6, 33.9), (44.6, 35.4), (43.0, 36.6)])
  bl_d = np.maximum.reduce([G(pontic) * 0.8, G(hyrc, 0.5) * 1.0, G(caucasus, 0.25) * 0.65, G(w_anat) * 0.45, G(greece, 0.15) * 0.35,
                            G(taurus) * 0.3, np.where(zagros & (rel > 6) & (rel < 15), 0.3, 0)])
  low = rel < 10
  con_d = np.maximum.reduce([G(pontic) * 0.55 * ~low, G(hyrc, 0.4) * 0.45 * ~low, G(caucasus, 0.3) * 0.5 * ~low, G(w_anat) * 0.35 * ~low,
                             G(greece, 0.3) * 0.45, G(taurus, 0.15) * 0.45 * ~low, np.where(cedar, 0.75, 0)])
  bl_d[~land] = 0; con_d[~land] = 0
  pl.scatter('conifer', con_d, [(0, 24), (1, 11), (2, 5.5)])
  pl.scatter('clump', bl_d * 0.6, [(0, 30), (1, 16), (2, 10)])
  pl.scatter('broadleaf', bl_d, [(0, 22), (1, 10), (2, 5)])

  # ---- 5. olives
  levant = box(34.4, 36.9, 31.2, 36.6) & (d_sea < 32)
  ghouta = disc(*geo(36.38, 33.5), 22)
  ol_d = np.maximum.reduce([np.where(levant, 0.45, 0), np.where(w_anat & (d_sea < 45), 0.4, 0), np.where(greece & box(21.0, 24.2, 36.2, 39.0), 0.4, 0),
                            np.where(box(23.4, 26.4, 34.8, 35.7), 0.4, 0), np.where(box(32.2, 34.7, 34.5, 35.75), 0.25, 0), np.where(ghouta, 0.9, 0)])
  ol_d[~land] = 0
  pl.scatter('olive', ol_d, [(0, 22), (1, 10), (2, 5)])

  # ---- 6. palms
  OASES = [(25.52, 29.20, 16), (28.86, 28.35, 14), (27.97, 27.06, 11), (29.0, 25.5, 16), (30.55, 25.45, 16), (36.57, 28.38, 11),
           (38.47, 27.63, 11), (37.92, 26.62, 12), (39.29, 25.70, 11), (39.61, 24.47, 15), (39.87, 29.81, 11), (41.69, 27.52, 12),
           (43.97, 26.33, 13), (46.72, 24.69, 14), (47.30, 24.15, 11), (49.59, 25.38, 17), (50.0, 26.55, 13), (50.55, 26.07, 9),
           (38.27, 34.56, 11), (56.92, 33.60, 11), (58.35, 29.10, 13), (57.74, 28.67, 11), (35.46, 31.86, 9), (35.0, 29.53, 8),
           (33.80, 31.13, 9), (36.82, 31.83, 8)]
  pa_d = np.zeros((GH, GW))
  def put(mask, v):
    pa_d[mask] = np.maximum(pa_d[mask], v if np.isscalar(v) else v[mask])
  put(near_nile, np.clip(1.4 - d_river / 11, 0, 1))
  put(delta, 0.7)
  put(fayoum, 0.85)
  put(near_meso, np.clip(1.3 - d_river / 13, 0, 1) * 0.9)
  put(meso_n & (d_river < 9), 0.22)
  put(box(47.6, 57.5, 24.0, 30.6) & (d_sea < 10), 0.35)
  put(box(55.8, 59.8, 22.4, 25.6) & (d_sea < 14), 0.45)
  put(poly([(35.42, 31.2), (35.62, 31.2), (35.7, 32.75), (35.55, 32.75)]), 0.7)
  put(box(34.2, 36.2, 31.2, 34.6) & (d_sea < 10), 0.15)
  for lon, lat, r in OASES:
    x, y = geo(lon, lat); put(disc(x, y, r), 0.95)
  for p in C['places']:
    if p['kind'] in ('oasis', 'camp', 'well', 'caravan'): put(disc(p['x'], p['y'], 24) & ~disc(p['x'], p['y'], 10), 0.65)
  pa_d[~land] = 0
  pl.scatter('palm', pa_d, [(0, 20), (1, 9), (2, 4.2)])

  # ---- 7. desert marks
  nafud = box(39.3, 43.6, 27.2, 29.4)
  dahna = poly([(44.0, 28.2), (45.2, 28.2), (48.6, 23.0), (47.5, 22.4)])
  rub = box(44.0, 57.0, 18.0, 23.2)
  syrian = box(37.4, 43.0, 30.6, 35.0)
  western = box(23.5, 30.6, 21.0, 30.9) & ~nile_region
  sand_sea = box(24.6, 27.4, 24.0, 29.6)
  n_sinai = box(32.4, 34.3, 30.4, 31.2)
  sinai = box(32.8, 34.9, 28.0, 30.4)
  kavir = box(51.5, 56.8, 33.4, 36.0)
  lut = box(57.0, 60.5, 28.4, 32.2)
  arabia = box(36.0, 51.0, 21.0, 30.5)
  desert_ok = land & ~mount & (green < 0.12) & ~near_nile & ~near_meso & ~delta & ~fayoum
  du_d = np.maximum.reduce([np.where(nafud, 0.8, 0), np.where(dahna, 0.7, 0), np.where(rub, 0.75, 0), np.where(sand_sea, 0.75, 0),
                            np.where(western, 0.2, 0), np.where(n_sinai, 0.5, 0), np.where(lut, 0.55, 0), np.where(syrian, 0.08, 0),
                            np.where(kavir, 0.15, 0)]) * desert_ok * (rel < 9)
  oc_d = np.maximum.reduce([np.where(syrian, 0.5, 0), np.where(western & ~sand_sea, 0.4, 0), np.where(sinai, 0.25, 0), np.where(kavir, 0.35, 0),
                            np.where(lut, 0.35, 0), np.where(arabia & ~nafud & ~dahna & ~rub, 0.3, 0)]) * desert_ok * (rel > 3)
  sc_d = np.maximum.reduce([np.where(syrian, 0.45, 0), np.where(arabia, 0.3, 0), np.where(western, 0.25, 0), np.where(sinai, 0.3, 0),
                            np.where(kavir | lut, 0.3, 0)]) * desert_ok
  pl.scatter('dune', du_d, [(0, 80), (1, 44), (2, 26)])
  pl.scatter('outcrop', oc_d, [(0, 90), (1, 46), (2, 26)])
  pl.scatter('scrub', sc_d, [(1, 36), (2, 15)])

  # ---- 8. the sea: wave strokes on open water, shallows along the coasts
  wv_d = np.where(open_sea & (d_shore >= 22), 0.65, 0)
  sh_d = np.where(open_sea & (d_shore >= 4) & (d_shore <= 15), np.where(P['teal'] > 0.4, 0.6, 0.25), 0)
  pl.scatter('wave', wv_d, [(0, 100), (1, 55), (2, 32)])
  pl.scatter('shallow', sh_d, [(1, 80), (2, 46)])

  items = sorted(pl.items, key=lambda t: (t[3], t[2], t[0]))
  write(a.out, items)
  counts = {}
  for t in items: counts[KINDS[t[0]]] = counts.get(KINDS[t[0]], 0) + 1
  print(f'{len(items)} items: ' + ', '.join(f'{k} {counts.get(k, 0)}' for k in KINDS))
  print('by level: ' + ', '.join(f'{l}: {sum(1 for t in items if t[1] == l)}' for l in range(3)))
  if a.overlay: overlay(items, a.overlay, bl)


def write(path, items):
  buf = bytearray()
  for k, lod, x, y, size, var in items:
    buf += bytes([k, lod]) + int(round(x * 10)).to_bytes(2, 'little') + int(round(y * 10)).to_bytes(2, 'little') + bytes([min(255, int(round(size * 64))), var])
  b64 = base64.b64encode(bytes(buf)).decode()
  lines = [b64[i:i + 160] for i in range(0, len(b64), 160)]
  with open(path, 'w') as f:
    f.write('// Generated by tools/build-mapkit.py from the painted travel map and what the map must keep clear. Do not edit by hand.\n')
    f.write('// Every map decoration, back to front (by its base, then left to right), 8 bytes each: kind (index into\n')
    f.write('// mapKitSheets.json kinds), level of detail (0 every zoom, 1 middle, 2 close), x and y in tenths of a map\n')
    f.write('// unit (little-endian), size in 64ths of the kind\'s height, variant (picks the frame).\n')
    f.write(f'export const KIT_COUNT = {len(items)};\n')
    f.write('export const KIT_ITEMS =\n' + '\n'.join(f"  '{l}'" + (' +' if i < len(lines) - 1 else ';') for i, l in enumerate(lines)) + '\n')


COLOURS = {'palm': (30, 120, 40), 'broadleaf': (60, 170, 60), 'clump': (20, 90, 30), 'conifer': (10, 70, 70), 'olive': (150, 160, 90),
           'peak-snow': (255, 255, 255), 'peak-big': (255, 0, 255), 'peak-bare': (110, 70, 40), 'peak-granite': (200, 60, 40),
           'hill-ochre': (210, 160, 60), 'hill-green': (130, 170, 60), 'dune': (250, 200, 120), 'outcrop': (90, 90, 90),
           'scrub': (160, 140, 60), 'field': (200, 230, 80), 'wave': (220, 240, 255), 'shallow': (60, 220, 220)}

def overlay(items, path, blocked):
  im = Image.open(f'{ROOT}/art-src/world/travel-map-painting-1610.png').convert('RGB').resize((MAP_W, MAP_H))
  im = Image.blend(im, Image.new('RGB', im.size, (120, 110, 100)), 0.35)
  d = ImageDraw.Draw(im, 'RGBA')
  bm = Image.fromarray((blocked * 60).astype(np.uint8)).resize((MAP_W, MAP_H))
  im.paste((255, 0, 0), (0, 0), bm)
  for k, lod, x, y, size, var in items:
    kd = KINDS[k]; c = COLOURS[kd]
    r = 1.2 + (2 - lod) * 0.8 + (3 if kd == 'peak-big' else 0)
    d.ellipse([x - r, y - r, x + r, y + r], fill=c + (230,), outline=(0, 0, 0, 160) if kd.startswith('peak') else None)
  y = 10
  for kd, c in COLOURS.items():
    d.rectangle([10, y, 24, y + 12], fill=c, outline=(0, 0, 0)); d.text((30, y), kd, fill=(255, 255, 255)); y += 16
  im.save(path)


if __name__ == '__main__':
  main()
