#!/usr/bin/env python3
"""The repainted travel map, stitched from the artist's sections into one master (art-src/world/repaint/).

Inputs (art-src/world/repaint/): whole.png (the whole map, 1610 x 977), tile-N.png (1536 x 1024 each: the old 4800 master's
rectangle in tiles.csv, 1728 x 1152, painted at 1536/1728 of its size) and positions.csv (the brief's town dots).

  python3 -I tools/map-repaint.py [--out art-src/world/travel-map-master2-4800.png] [--debug DIR] [--report]

How:
  1. Each section is enlarged by 1728/1536 (Lanczos) and laid at its exact rectangle. A section that is missing (tiles 7 and 8
     came back as a miniature of the whole map, so they are left out: SKIP below) is filled from whole.png, enlarged to the
     master. A corrected tile-7.png or tile-8.png dropped into the folder is used as soon as it is taken out of SKIP.
  2. Painted-out spots (PAINT_OUT): buildings and landmarks painted far from any town, replaced by the same spot of whole.png
     (or of the old master where whole.png has the same problem), colour-matched to the ring round it.
  3. Colour: each section is matched to whole.png in Lab, with a smooth offset field (a masked, wide blur of the difference,
     separately for sea and land, away from the landmarks), so the sections read as one painting.
  4. Seams: in each overlap a graph-cut seam (the least-difference path, colour and gradient) picks one section's pixels; the
     sections are joined along it with a multi-band blend of few bands (detail cut within a pixel or two, colour eased over
     some dozens), so nothing painted twice ghosts.
The size is the old master's, 4800 x 2913: the sections carry about 1536/1728 x 4800 = 4267 px of detail across the map, so
this is a slight enlargement and invents nothing; the whole.png strip (the south, under tiles 7 and 8) carries 1610.
"""
import argparse, csv, os, sys
import numpy as np
import cv2
from scipy import ndimage as nd
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'art-src/world/repaint')
OLD = os.path.join(ROOT, 'art-src/world/travel-map-master-4800.png')
MW, MH = 4800, 2913
TW, TH = 1728, 1152
SKIP = {7, 8}          # sections not used (drawn as a miniature map); whole.png fills their rectangles

# Painted-out spots, master px: (section, cx, cy, rx, ry, fill). section is a tile number or 'whole' (the whole.png strip);
# fill names the picture whose broad shape the fill should follow: 'whole' or 'old' ('ring': only the ground round it). Each is a building or landmark painted more than about 40 map units (96 px) from any town dot,
# or another town's landmark painted on a dot (see the report for which).
PAINT_OUT = [
  # tile 2: a domed mosque between Aleppo and Damascus (Homs, Hama: no town)
  (2, 1851, 914, 92, 50, 'old'),
  # tile 3: a small house in the far north-east
  (3, 4706, 566, 40, 28, 'old'),
  # tile 4: Fayoum's waterwheels and a pool painted 63 units south-west of its dot; Saqqara's step pyramid painted on
  # Fayoum's oasis; St Catherine's monastery and two palm groves in south Sinai, far from the dots
  (4, 846, 1630, 105, 56, 'old'),
  (4, 952, 1566, 52, 32, 'ring'),
  (4, 1342, 1880, 80, 56, 'old'),
  (4, 1310, 1800, 52, 36, 'old'),
  (4, 1632, 1647, 56, 38, 'whole'),
  # tile 5: Jerusalem's golden dome painted again on Amman's dot, Amman's theatre 74 units east of it, and a second
  # golden-domed mosque 68 units south of Baghdad
  (5, 1738, 1236, 62, 38, 'old'),
  (5, 1886, 1287, 80, 44, 'old'),
  (5, 2622, 1245, 92, 46, 'old'),
  # tile 9 (Oman and the Gulf): no town at all; every vignette is made up
  (9, 4122, 1829, 60, 36, 'whole'),
  (9, 4497, 1888, 75, 38, 'whole'),
  (9, 4219, 1986, 55, 38, 'whole'),
  (9, 4347, 2046, 66, 42, 'whole'),
  (9, 4670, 2099, 62, 40, 'whole'),
  (9, 3836, 2066, 30, 22, 'whole'),
  (9, 3845, 2271, 72, 46, 'whole'),
  (9, 4047, 2451, 80, 46, 'whole'),
  (9, 3507, 2331, 48, 34, 'whole'),
  (9, 3184, 2219, 82, 36, 'whole'),
  (9, 3620, 2511, 100, 56, 'whole'),
  # the whole.png strip: St Catherine's monastery and a palm grove with a minaret, far south of the dots
  ('whole', 2150, 2124, 160, 76, 'old'),
  ('whole', 1872, 1956, 110, 66, 'old'),
]


# Regions taken from one section only, where two sections each painted the same towns in different spots: (tile, x0, y0, x1, y1)
FORCE = [
  # Kashan and Isfahan: tile 6 has them on their dots, tile 3 (whose bottom edge they are on) higher up
  (6, 3100, 904, 3700, 1330),
]


def read_rgb(p):
  return np.asarray(Image.open(p).convert('RGB'))


def lanczos(a, w, h):
  return np.asarray(Image.fromarray(a).resize((w, h), Image.LANCZOS))


def lab(a):
  return cv2.cvtColor(a.astype(np.float32) / 255, cv2.COLOR_RGB2LAB)


def rgb(l):
  return np.clip(cv2.cvtColor(l.astype(np.float32), cv2.COLOR_LAB2RGB) * 255 + 0.5, 0, 255).astype(np.uint8)


def gblur(a, s):
  return cv2.GaussianBlur(a, (0, 0), s, borderType=cv2.BORDER_REFLECT)


def wet(a):
  a = a.astype(int)
  return (a[..., 2] > a[..., 0] + 8) & (a[..., 2] > 60)


def dots():
  out = []
  for r in csv.DictReader(open(os.path.join(SRC, 'positions.csv'))):
    if r['item'].startswith('landmark'):
      out.append((r['item'].split(': ', 1)[1], float(r['x_percent']) * MW / 100, float(r['y_percent']) * MH / 100))
  return out


def ellipse_mask(shape, x0, y0, cx, cy, rx, ry, feather=0.35):
  """a soft ellipse (1 inside, falling to 0 over the outer `feather` of the radius) on an array whose (0,0) is (x0, y0)"""
  h, w = shape
  yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
  d = np.sqrt(((xx + x0 - cx) / rx) ** 2 + ((yy + y0 - cy) / ry) ** 2)
  return np.clip((1 + feather - d) / feather, 0, 1)


def paint_out(img, x0, y0, spot, guide, bad):
  """paint out one spot of img (top-left at master (x0, y0)): the best-matching stretch of the same painting nearby is
  copied in (its brushwork), carried on the broad shape of the same spot in `guide` (whole.png or the old master, so the
  ground keeps its geography), matched to the ring round the spot and feathered in. `bad` marks master pixels that may
  not be copied from (landmarks and other painted-out spots)."""
  _, cx, cy, rx, ry, how = spot
  gw = 0 if how == 'ring' else 1.5
  h, w = img.shape[:2]
  pad = 1.8
  bx0, by0 = int(max(x0, cx - rx * pad)), int(max(y0, cy - ry * pad))
  bx1, by1 = int(min(x0 + w, cx + rx * pad)), int(min(y0 + h, cy + ry * pad))
  if bx1 <= bx0 or by1 <= by0: return
  bw, bh = bx1 - bx0, by1 - by0
  L = lab(img)
  m = ellipse_mask((bh, bw), bx0, by0, cx, cy, rx, ry)
  ring = (ellipse_mask((bh, bw), bx0, by0, cx, cy, rx * pad, ry * pad, 0.01) > 0.5) & (m == 0)
  tgt = L[by0 - y0:by1 - y0, bx0 - x0:bx1 - x0]
  # the guide's broad shape here, moved to the painting's colours on the ring
  G = lab(guide[by0:by1, bx0:bx1])
  G = G + (tgt[ring].mean(0) - G[ring].mean(0))
  Glow = gblur(G, 6)
  # candidate sources: the same box moved by (dx, dy), wholly inside the painting and clear of `bad`
  badl = bad[y0:y0 + h, x0:x0 + w].astype(np.float32)
  ii = cv2.integral(badl)
  # nor any water or river inside the copied spot (a stretch of coast or river copied in would be a new one)
  fe = img.astype(np.float32)
  greenish = (fe[..., 1] > fe[..., 0] * 0.97) & (fe.mean(-1) < 150)
  snowy = (fe.mean(-1) > 195) & ((fe.max(-1) - fe.min(-1)) < 50)
  # green ground is copied only into green ground
  rg = greenish[by0 - y0:by1 - y0, bx0 - x0:bx1 - x0][ring].mean() if ring.any() else 0
  greenish = snowy | (greenish if rg < 0.15 else np.zeros_like(greenish))
  wr = cv2.dilate(((water_and_rivers(img) > 0.25) | greenish).astype(np.uint8), np.ones((9, 9), np.uint8)).astype(np.float32)
  iw = cv2.integral(wr)
  ex0, ey0 = int(cx - rx * 1.1) - bx0, int(cy - ry * 1.1) - by0
  ew, eh = int(rx * 2.2), int(ry * 2.2)
  best, bo = None, None
  q = 3
  Ls = cv2.resize(L, (w // q, h // q), interpolation=cv2.INTER_AREA)
  rs = cv2.resize(ring.astype(np.float32), (bw // q, bh // q), interpolation=cv2.INTER_AREA) > 0.5
  ms = cv2.resize(m, (bw // q, bh // q), interpolation=cv2.INTER_AREA) > 0.3
  ts = Ls[(by0 - y0) // q:(by0 - y0) // q + rs.shape[0], (bx0 - x0) // q:(bx0 - x0) // q + rs.shape[1]]
  gs = cv2.resize(Glow, (rs.shape[1], rs.shape[0]), interpolation=cv2.INTER_AREA)
  R, st = 900, 10
  # no water at all in the copied spot if it can be had, else a little (a land of many streams)
  for tol in (0, 0.04 * ew * eh, 0.12 * ew * eh):
   if bo is not None: break
   for dy in range(-R, R + 1, st):
    for dx in range(-R, R + 1, st):
      if dx * dx + dy * dy < (max(rx, ry) * 2.2) ** 2: continue
      sx, sy = bx0 - x0 + dx, by0 - y0 + dy
      if sx < 0 or sy < 0 or sx + bw > w or sy + bh > h: continue
      if ii[sy + bh, sx + bw] - ii[sy, sx + bw] - ii[sy + bh, sx] + ii[sy, sx] > 0: continue
      ux, uy = max(0, sx + ex0), max(0, sy + ey0)
      vx, vy = min(w, sx + ex0 + ew), min(h, sy + ey0 + eh)
      if iw[vy, vx] - iw[uy, vx] - iw[vy, ux] + iw[uy, ux] > tol: continue
      c = Ls[sy // q:sy // q + rs.shape[0], sx // q:sx // q + rs.shape[1]]
      if c.shape[:2] != rs.shape: continue
      e = ((c[rs] - ts[rs]) ** 2).mean() + (gw * ((gblur(c, 2)[ms] - gs[ms]) ** 2).mean() if gw else 0)
      if best is None or e < best: best, bo = e, (dx, dy)
  if bo is None:
    out = tgt * (1 - m[..., None]) + G * m[..., None]
    img[by0 - y0:by1 - y0, bx0 - x0:bx1 - x0] = rgb(out)
    return None
  # the chosen stretch, feathered in, its colour eased to the ground round the spot by a smooth offset (taken on the ring,
  # spread across the spot)
  src = L[by0 - y0 + bo[1]:by1 - y0 + bo[1], bx0 - x0 + bo[0]:bx1 - x0 + bo[0]].copy()
  # only the dry ground of the ring (a spot is painted out to dry ground: the sea beside it must not tint it)
  rm = (ring & ~wet(img[by0 - y0:by1 - y0, bx0 - x0:bx1 - x0])).astype(np.float32)
  if rm.sum() < 30: rm = ring.astype(np.float32)
  sg = max(rx, ry) * 0.45
  num = gblur((tgt - src) * rm[..., None], sg); den = gblur(rm, sg)[..., None]
  glob = ((tgt - src) * rm[..., None]).sum((0, 1)) / max(rm.sum(), 1)
  wgt = np.clip(den / 0.05, 0, 1)
  off = num / np.maximum(den, 1e-6) * wgt + glob * (1 - wgt)
  src = src + off
  out = tgt * (1 - m[..., None]) + src * m[..., None]
  img[by0 - y0:by1 - y0, bx0 - x0:bx1 - x0] = rgb(out)
  return bo


def normconv(v, m, s):
  """masked Gaussian average of v (H x W x C) over the mask m, wide sigma s; where the mask is empty nearby, the
  mask's global mean"""
  # worked at a quarter size: the field is smooth
  q = 4
  h, w = m.shape
  vs = cv2.resize(v * m[..., None], (w // q, h // q), interpolation=cv2.INTER_AREA)
  ms = cv2.resize(m.astype(np.float32), (w // q, h // q), interpolation=cv2.INTER_AREA)
  num, den = gblur(vs, s / q), gblur(ms, s / q)
  glob = (v * m[..., None]).sum((0, 1)) / max(m.sum(), 1)
  wgt = np.clip(den / 0.02, 0, 1)[..., None]
  f = num / np.maximum(den, 1e-6)[..., None] * wgt + glob * (1 - wgt)
  return cv2.resize(f, (w, h), interpolation=cv2.INTER_LINEAR), m.sum()


def colour_match(img, ref, keep_out, sigma):
  """img and ref (uint8, same rect): img's colours moved, smoothly, to ref's, separately for sea and land"""
  L, R = lab(img), lab(ref)
  wi, wr = wet(img), wet(ref)
  pw = gblur(wi.astype(np.float32), 2.0)[..., None]
  d = R - L
  out = L.copy()
  fields = []
  for cls in (True, False):
    m = ((wi == cls) & (wr == cls) & ~keep_out).astype(np.float32)
    # stay clear of the coasts (the two paintings' shores differ by a pixel or two)
    m = cv2.erode(m, np.ones((9, 9), np.uint8))
    f, n = normconv(d, m, sigma)
    fields.append(f if n > 2000 else np.zeros_like(d))
  out += fields[0] * pw + fields[1] * (1 - pw)
  return rgb(out)


def tile_rects():
  return {int(r['tile'].split('-')[1]): (int(r['x']), int(r['y'])) for r in csv.DictReader(open(os.path.join(SRC, 'tiles.csv')))}


def water_and_rivers(a):
  """sea, lakes and the painted rivers (dark blue-green lines) as a 0..1 picture"""
  a = a.astype(np.float32)
  R, G, B = a[..., 0], a[..., 1], a[..., 2]
  lum = a.mean(-1)
  riv = np.clip(((G - R) + (B - R)) / 50, 0, 1) * np.clip((160 - lum) / 70, 0, 1)
  return np.maximum(riv, ((B > R + 8) & (B > 60)).astype(np.float32))


def fit_to_old(a, oldc, ignore, limit=80, smooth=20):
  """a (one section) moved, smoothly, so its coasts, lakes and rivers lie where the old master has them: a dense optical
  flow between the two pictures' water and rivers, trusted only where both have an edge and away from `ignore` (the
  landmarks, which each painting puts in its own spot), widely smoothed. Returns the moved picture and the field."""
  h, w = a.shape[:2]
  q = 2
  fa = cv2.GaussianBlur(cv2.resize(water_and_rivers(oldc), (w // q, h // q), interpolation=cv2.INTER_AREA), (0, 0), 1.5)
  fb = cv2.GaussianBlur(cv2.resize(water_and_rivers(a), (w // q, h // q), interpolation=cv2.INTER_AREA), (0, 0), 1.5)
  dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
  dis.setPatchSize(24); dis.setPatchStride(6); dis.setGradientDescentIterations(25)
  dis.setVariationalRefinementAlpha(40); dis.setVariationalRefinementIterations(10)
  fl = dis.calc((fa * 255).astype(np.uint8), (fb * 255).astype(np.uint8), None)
  ga = gblur(np.hypot(*np.gradient(fa)), 2); gb = gblur(np.hypot(*np.gradient(fb)), 2)
  wgt = np.minimum(ga, gb) * (cv2.resize(ignore.astype(np.uint8), (w // q, h // q), interpolation=cv2.INTER_NEAREST) == 0)
  s = smooth
  wd = gblur(wgt, s) + 1e-6
  F = np.stack([gblur(fl[..., k] * wgt, s) / wd for k in range(2)], -1)
  conf = np.clip(wd / max(np.percentile(wd, 60), 1e-4), 0, 1)[..., None]
  F = cv2.resize(F * conf, (w, h), interpolation=cv2.INTER_LINEAR) * q
  mag = np.hypot(F[..., 0], F[..., 1])
  F *= np.minimum(1, limit / np.maximum(mag, 1e-6))[..., None]
  yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
  moved = cv2.remap(a, xx + F[..., 0], yy + F[..., 1], cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
  return moved, F


def build(debug=None, sigma=140, bands=5, report=None):
  old = read_rgb(OLD)
  whole = lanczos(read_rgb(os.path.join(SRC, 'whole.png')), MW, MH)
  rects = tile_rects()
  D = dots()
  # around every town dot, the landmarks: kept out of the colour fields and the fit (each painting has them in its own spot)
  near_dot = np.zeros((MH, MW), bool)
  for _, x, y in D:
    x0, x1, y0, y1 = int(max(0, x - 170)), int(min(MW, x + 170)), int(max(0, y - 130)), int(min(MH, y + 110))
    near_dot[y0:y1, x0:x1] = True
  out_spots = np.zeros((MH, MW), bool)
  for sp in PAINT_OUT:
    _, cx, cy, rx, ry, _ = sp
    out_spots[int(max(0, cy - ry * 1.6)):int(cy + ry * 1.6), int(max(0, cx - rx * 1.6)):int(cx + rx * 1.6)] = True
  keep_out = near_dot | out_spots
  guides = {'whole': whole, 'old': old, 'ring': old}
  log = []
  # whole.png first (the base under everything), its own spots painted out and fitted to the old geography
  base = whole.copy()
  for sp in PAINT_OUT:
    if sp[0] == 'whole': log.append((sp, paint_out(base, 0, 0, sp, old, keep_out)))
  base, Fw = fit_to_old(base, old, keep_out)
  # a second, finer pass for whole.png: enlarged three times, its rivers need it (the Nile above all)
  base, Fw2 = fit_to_old(base, old, keep_out, smooth=10)
  Fw = Fw + Fw2
  layers = []   # (image uint8, x, y, mask uint8, name)
  used = sorted(t for t in rects if t not in SKIP and os.path.exists(os.path.join(SRC, f'tile-{t}.png')))
  fields = {'whole': Fw}
  for t in used:
    x, y = rects[t]
    a = lanczos(read_rgb(os.path.join(SRC, f'tile-{t}.png')), TW, TH)
    w, h = min(TW, MW - x), min(TH, MH - y)
    a = a[:h, :w].copy()
    for sp in PAINT_OUT:
      if sp[0] == t: log.append((sp, paint_out(a, x, y, sp, guides[sp[5]], keep_out)))
    a, F = fit_to_old(a, old[y:y + h, x:x + w], keep_out[y:y + h, x:x + w])
    fields[f'tile-{t}'] = F
    a = colour_match(a, base[y:y + h, x:x + w], keep_out[y:y + h, x:x + w], sigma)
    m = np.full((h, w), 255, np.uint8)
    # a section's own edges are never used where a neighbour covers them (painters fade or frame their edges)
    E = 24
    if x > 0: m[:, :E] = 0
    if y > 0: m[:E, :] = 0
    if x + w < MW: m[:, -E:] = 0
    if y + h < MH: m[-E:, :] = 0
    layers.append([a, x, y, m, f'tile-{t}'])
    mag = np.hypot(F[..., 0], F[..., 1])
    print(f'tile {t} laid at {x},{y}; fitted to the old geography by up to {mag.max():.0f} px (95% under {np.percentile(mag, 95):.0f})', file=sys.stderr)
  # whole.png where no section covers (the rectangles of the skipped tiles), lowest in the stack, reaching 100 px under
  # the sections round it for the seam
  cover = np.zeros((MH, MW), bool)
  for a, x, y, m, _ in layers: cover[y:y + a.shape[0], x:x + a.shape[1]] |= m > 0
  holes = ~cover
  if holes.any():
    reach = cv2.dilate(holes.astype(np.uint8), np.ones((201, 201), np.uint8)) > 0
    ys, xs = np.where(reach)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    m = (reach[y0:y1, x0:x1] * 255).astype(np.uint8)
    layers.insert(0, [base[y0:y1, x0:x1].copy(), x0, y0, m, 'whole'])
    print(f'whole.png fills {holes.sum() / 1e6:.2f} Mpx under {sorted(SKIP)} ({x0},{y0} .. {x1},{y1})', file=sys.stderr)
  # every landmark is taken from one section only (the one it stands deepest in): the others give way round it, so no
  # seam runs through a landmark
  force = np.full((MH, MW), -1, np.int16)
  for t, X0, Y0, X1, Y1 in FORCE:
    i = next(i for i, L in enumerate(layers) if L[4] == f'tile-{t}')
    force[Y0:Y1, X0:X1] = i
  for name, dx, dy in D:
    best, bm = None, -1
    for i, (a, x, y, m, n) in enumerate(layers):
      if n == 'whole': continue
      mg = min(dx - x, x + a.shape[1] - dx, dy - y, y + a.shape[0] - dy)
      if mg > bm: best, bm = i, mg
    if best is None or bm < 0: continue
    ba, bx, by, bmk, bn = layers[best]
    X0, X1 = max(int(dx - 200), bx + 24 if bx > 0 else 0), min(int(dx + 200), bx + ba.shape[1] - (24 if bx + ba.shape[1] < MW else 0))
    Y0, Y1 = max(int(dy - 160), by + 24 if by > 0 else 0), min(int(dy + 110), by + ba.shape[0] - (24 if by + ba.shape[0] < MH else 0))
    reg = force[Y0:Y1, X0:X1]
    reg[reg < 0] = best
  for i, L in enumerate(layers):
    a, x, y, m, n = L
    f = force[y:y + a.shape[0], x:x + a.shape[1]]
    m[(f >= 0) & (f != i)] = 0
  # seams: graph cut at half size (cost: colour and gradient difference)
  q = 2
  imgs = [cv2.resize(a, (a.shape[1] // q, a.shape[0] // q), interpolation=cv2.INTER_AREA).astype(np.float32) for a, *_ in layers]
  corners = [(x // q, y // q) for _, x, y, _, _ in layers]
  masks = [cv2.UMat(cv2.resize(m, (m.shape[1] // q, m.shape[0] // q), interpolation=cv2.INTER_NEAREST)) for _, _, _, m, _ in layers]
  finder = cv2.detail_GraphCutSeamFinder('COST_COLOR_GRAD')
  masks = finder.find(imgs, corners, masks)
  blender = cv2.detail_MultiBandBlender(0, bands)
  blender.prepare((0, 0, MW, MH))
  # one owner for every pixel: the graph cut's (at half size), the gaps it leaves given to the nearest owner, then
  # enlarged; nowhere outside a section's own usable area
  hq, wq = MH // q + 1, MW // q + 1
  lab_q = np.zeros((hq, wq), np.int32)
  for i, ((a, x, y, m0, name), mk) in enumerate(zip(layers, masks)):
    mk = mk.get() if isinstance(mk, cv2.UMat) else mk
    reg = lab_q[y // q:y // q + mk.shape[0], x // q:x // q + mk.shape[1]]
    reg[(mk > 0) & (reg == 0)] = i + 1
  def fill_nearest(lb):
    if (lb == 0).any():
      _, idx = nd.distance_transform_edt(lb == 0, return_indices=True)
      lb = lb[idx[0], idx[1]]
    return lb
  lab_q = fill_nearest(lab_q)
  owner = cv2.resize(lab_q.astype(np.uint16), (wq * q, hq * q), interpolation=cv2.INTER_NEAREST)[:MH, :MW].astype(np.int32)
  # a pixel given to a layer that does not reach it goes to the nearest owner that does (or any layer reaching it)
  def valid(own):
    ok = np.zeros((MH, MW), bool)
    for i, (a, x, y, m0, name) in enumerate(layers):
      ok[y:y + a.shape[0], x:x + a.shape[1]] |= (own[y:y + a.shape[0], x:x + a.shape[1]] == i + 1) & (m0 > 0)
    return ok
  ok = valid(owner)
  owner[~ok] = 0
  owner = fill_nearest(owner)
  ok = valid(owner)
  for i, (a, x, y, m0, name) in enumerate(layers):
    reg, okr = owner[y:y + a.shape[0], x:x + a.shape[1]], ok[y:y + a.shape[0], x:x + a.shape[1]]
    put = ~okr & (m0 > 0)
    reg[put] = i + 1; okr[put] = True
  seams = []
  for i, (a, x, y, m0, name) in enumerate(layers):
    mk = ((owner[y:y + a.shape[0], x:x + a.shape[1]] == i + 1)).astype(np.uint8) * 255
    seams.append((name, x, y, mk))
    blender.feed(cv2.cvtColor(a, cv2.COLOR_RGB2BGR).astype(np.int16), mk, (x, y))
  res, _ = blender.blend(None, None)
  res = cv2.cvtColor(np.clip(res, 0, 255).astype(np.uint8), cv2.COLOR_BGR2RGB)
  own = np.zeros((MH, MW), bool)
  for _, x, y, mk in seams: own[y:y + mk.shape[0], x:x + mk.shape[1]] |= mk > 0
  if (~own).any():
    print(f'{(~own).sum()} px owned by no section: filled from whole.png', file=sys.stderr)
    res[~own] = base[~own]
  for sp, bo in log:
    print(f'painted out {sp[0]} at {sp[1]},{sp[2]} ({sp[3] * 2}x{sp[4] * 2} px): brushwork from {bo} px off, shape from {sp[5]}', file=sys.stderr)
  if debug:
    os.makedirs(debug, exist_ok=True)
    lab_im = np.zeros((MH, MW), np.uint8)
    for i, (_, x, y, mk) in enumerate(seams): lab_im[y:y + mk.shape[0], x:x + mk.shape[1]][mk > 0] = i + 1
    edge = (cv2.morphologyEx(lab_im, cv2.MORPH_GRADIENT, np.ones((3, 3), np.uint8)) > 0)
    np.save(os.path.join(debug, 'owner.npy'), lab_im)
    v = res.copy(); v[cv2.dilate(edge.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0] = (255, 0, 255)
    Image.fromarray(v).resize((1600, 971), Image.LANCZOS).save(os.path.join(debug, 'seams.png'))
    with open(os.path.join(debug, 'owners.txt'), 'w') as f:
      for i, (n, *_ ) in enumerate(seams): f.write(f'{i + 1} {n}\n')
    np.savez_compressed(os.path.join(debug, 'fields.npz'), **{k: v[::4, ::4] for k, v in fields.items()})
  return res


def main():
  ap = argparse.ArgumentParser()
  ap.add_argument('--out', default=os.path.join(ROOT, 'art-src/world/travel-map-master2-4800.png'))
  ap.add_argument('--debug')
  ap.add_argument('--sigma', type=float, default=140)
  ap.add_argument('--bands', type=int, default=5)
  a = ap.parse_args()
  res = build(a.debug, a.sigma, a.bands)
  Image.fromarray(res).save(a.out, optimize=False, compress_level=6)
  print(f'wrote {a.out} ({MW} x {MH})')


if __name__ == '__main__':
  main()
