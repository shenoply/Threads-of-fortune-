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
  5. (since 2026-11-05) The whole.png strip sharpened and its join eased (south_join), then every building the painter put in
     painted out (LANDMARKS_OUT): the game draws its own, bigger landmark overlays on the towns.
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


# Every landmark and building the painter put in (since 2026-11-05): painted out of the finished master, the separate
# landmark overlays (public/art/map/NN-<town>.webp) stand on the towns instead (the painted ones were small and often off
# their towns). Master px: (what, cx, cy, rx, ry), an ellipse round the vignette and its cast shadow; a vignette of odd
# shape takes two. Filled by guided quilting (synth_out below).
LANDMARKS_OUT = [
  # on coasts, rivers and the Delta's canals: guided quilting, so the shore or the water goes on where it ran
  ('constantinople', 900, 106, 160, 62, 'quilt'),
  ('alexandria', 812, 1338, 78, 40, 'quilt'),
  ('tanta', 1013, 1343, 40, 46, 'quilt'),
  ('cairo', 1080, 1424, 72, 60, 'quilt'),
  ('port-said', 1233, 1316, 48, 52, 'quilt'),
  ('suez', 1372, 1478, 88, 58, 'quilt'),
  ('suez-bay', 1345, 1530, 80, 22, 'quilt'),
  ('suez-ship', 1300, 1500, 36, 28, 'quilt'),
  ('beirut', 1628, 1038, 92, 42, 'quilt'),
  ('haifa', 1600, 1196, 58, 44, 'quilt'),
  ('jaffa', 1520, 1258, 44, 44, 'quilt'),
  ('jerusalem', 1612, 1268, 52, 34, 'quilt'),
  # on open ground: quilted from the ground round it, the first painting only a faint guide, no water copied in
  ('angora', 1375, 296, 112, 54, 'copy'),
  ('konya', 1280, 526, 112, 60, 'land64'),
  ('giza', 944, 1502, 86, 50, 'copy2'),
  ('bir-el-abd', 1362, 1384, 46, 38, 'quilt'),
  ('tarabin', 1506, 1372, 86, 38, 'quilt'),
  ('st-catherine', 1457, 1590, 58, 34, 'copy2'),
  ('aleppo', 1925, 748, 100, 60, 'quilt'),
  ('beirut-smudge', 1752, 1030, 30, 26, 'copy'),
  ('damascus', 1822, 1082, 100, 60, 'copy'),
  ('rutba', 2245, 1120, 112, 48, 'copy2'),
  ('baghdad', 2650, 1060, 100, 58, 'land'),
  ('palms-iraq', 2505, 1250, 40, 42, 'copy'),
  ('khanaqin', 2697, 937, 112, 66, 'copy2'),
  ('kermanshah', 2885, 918, 82, 54, 'copy'),
  ('hamadan', 3000, 890, 50, 42, 'copy'),
  ('hamadan-trees', 3050, 912, 24, 16, 'copy'),
  ('tabriz', 2908, 508, 120, 50, 'copy2'),
  ('tehran', 3328, 800, 128, 58, 'copy2'),
  ('kashan', 3350, 1003, 104, 44, 'copy2'),
  ('isfahan', 3385, 1165, 112, 45, 'copy'),
  ('isfahan-trees', 3480, 1175, 30, 25, 'copy'),
  ('isfahan-dome', 3405, 1112, 32, 26, 'copy'),
  ('isfahan-minaret', 3350, 1120, 14, 28, 'copy'),
  ('kerman', 3980, 1412, 90, 56, 'copy2'),
]


def min_cut(E, K, ov):
  """which pixels of a new patch to take (0..1, P x P), image-quilting style: along each side where the patch overlaps
  what is already laid (K), the least-error path through the overlap; outside it the old pixels stay. Softened by a
  pixel or so, so the cut never shows as a hard edge."""
  P = E.shape[0]
  N = np.ones((P, P), np.float32)
  def path(C):   # C: rows x cols; a top-to-bottom path, one column per row
    r, c = C.shape
    cum = C.copy()
    for i in range(1, r):
      prev = cum[i - 1]
      m = np.minimum(prev, np.minimum(np.r_[np.inf, prev[:-1]], np.r_[prev[1:], np.inf]))
      cum[i] += m
    j = int(np.argmin(cum[-1])); out = np.zeros(r, int); out[-1] = j
    for i in range(r - 2, -1, -1):
      lo, hi = max(0, j - 1), min(c, j + 2)
      j = lo + int(np.argmin(cum[i, lo:hi])); out[i] = j
    return out
  cols = np.arange(P)
  if K[:, :ov].mean() > 0.5:
    pth = path(E[:, :ov]); N[cols[None, :] < pth[:, None]] = 0
  if K[:, -ov:].mean() > 0.5:
    pth = path(E[:, -ov:]) + P - ov; N[cols[None, :] > pth[:, None]] = 0
  if K[:ov, :].mean() > 0.5:
    pth = path(E[:ov, :].T); N[cols[:, None] < pth[None, :]] = 0
  if K[-ov:, :].mean() > 0.5:
    pth = path(E[-ov:, :].T) + P - ov; N[cols[:, None] > pth[None, :]] = 0
  N = gblur(N, 1.0)
  N[~K] = 1
  return N


def synth_out(img, guide, hole, bad, P=40, step=26, R=360, wg=0.6, we=1.0, dry=False, ww_pen=0.0, others=None, log=None):
  """Fill `hole` (bool, master size) in img (uint8, master size) by guided quilting: patch by patch (P px, overlapping by
  P - step), the stretch of the same painting nearby (within R px) whose own pixels agree best with what is already there
  (round the hole and the patches laid so far) and whose ground in `guide` (the first painting, which has no buildings and
  the same coasts and rivers) looks most like the guide's ground at the hole, so a coast, a river or a field edge goes on
  where it ran. No copy from `bad` (other buildings, other holes). The patches are feathered into one another, the whole
  eased into the ground round it."""
  H, W = hole.shape
  lbl, n = nd.label(cv2.dilate(hole.astype(np.uint8), np.ones((3, 3), np.uint8)))
  out = img.copy()
  for k in range(1, n + 1):
    ys, xs = np.where(lbl == k)
    hx0, hx1, hy0, hy1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    X0, Y0 = max(0, hx0 - R), max(0, hy0 - R)
    X1, Y1 = min(W, hx1 + R), min(H, hy1 + R)
    hl = (lbl[Y0:Y1, X0:X1] == k)
    # a little beyond the vignette, so its edge is laid by patches too and feathered
    grow = cv2.dilate(hl.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13))) > 0
    T = lab(out[Y0:Y1, X0:X1])
    G = lab(guide[Y0:Y1, X0:X1])
    G = gblur(G, 1.2)
    G[..., 0] *= 0.6
    G = np.dstack([G, water_and_rivers(guide[Y0:Y1, X0:X1]) * 25]).astype(np.float32)
    # source positions (top-left corners) whose patch keeps clear of anything bad
    bl = bad[Y0:Y1, X0:X1] | grow
    # on open ground no water is copied in at all (a lake or a stretch of river copied in would be a new one)
    if dry: bl = bl | (cv2.dilate((water_and_rivers(out[Y0:Y1, X0:X1]) > 0.25).astype(np.uint8), np.ones((7, 7), np.uint8)) > 0)
    bl = bl.astype(np.float32)
    ii = cv2.integral(bl)
    hh, ww = hl.shape
    okpos = (ii[P:, P:] - ii[:-P, P:] - ii[P:, :-P] + ii[:-P, :-P]) == 0   # (hh-P+1, ww-P+1)
    # the brushwork's busyness (mean gradient of the lightness): a source as busy as the ground round the hole, so the
    # fill is never a smooth smear (least squares alone prefers the smoothest stretch)
    gm = np.hypot(cv2.Sobel(T[..., 0], cv2.CV_32F, 1, 0, ksize=3), cv2.Sobel(T[..., 0], cv2.CV_32F, 0, 1, ksize=3))
    ring = (cv2.dilate(hl.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (61, 61))) > 0) & ~grow
    if others is not None and (ring & ~others[Y0:Y1, X0:X1]).sum() > 200: ring &= ~others[Y0:Y1, X0:X1]
    e_t = gm[ring].mean()
    e_s = cv2.boxFilter(gm, -1, (P, P), normalize=True, borderType=cv2.BORDER_REFLECT)[P // 2:P // 2 + hh - P + 1, P // 2:P // 2 + ww - P + 1]
    epen = we * ((e_s - e_t) / max(e_t, 1)) ** 2 * 100
    # and as snowy and as green as the ground round it (a clump of snow or a stand of trees copied onto bare hills reads
    # as a blot)
    rw = out[Y0:Y1, X0:X1].astype(np.float32)
    # (water: as much of it in the copied patch as the first painting has at the spot, so no islet or spit is copied in)
    wsrc = cv2.boxFilter((water_and_rivers(out[Y0:Y1, X0:X1]) > 0.25).astype(np.float32), -1, (P, P), normalize=True, borderType=cv2.BORDER_REFLECT)[P // 2:P // 2 + hh - P + 1, P // 2:P // 2 + ww - P + 1]
    wgd = (water_and_rivers(guide[Y0:Y1, X0:X1]) > 0.25).astype(np.float32)
    for cls in (((rw.mean(-1) > 190) & ((rw.max(-1) - rw.min(-1)) < 60)),
                ((rw[..., 1] > rw[..., 0] * 0.97) & (rw.mean(-1) < 150))):
      fr = cls[ring].mean()
      fs = cv2.boxFilter(cls.astype(np.float32), -1, (P, P), normalize=True, borderType=cv2.BORDER_REFLECT)[P // 2:P // 2 + hh - P + 1, P // 2:P // 2 + ww - P + 1]
      epen = epen + 3000 * np.maximum(0, np.abs(fs - fr) - 0.04) ** 2
    known = ~grow
    # (the other buildings not yet painted out are not known ground: nothing is matched to them)
    if others is not None: known &= ~(others[Y0:Y1, X0:X1] & ~grow)
    cur = T.copy()
    gy0, gx0 = np.where(grow)[0].min(), np.where(grow)[1].min()
    gy1, gx1 = np.where(grow)[0].max() + 1, np.where(grow)[1].max() + 1
    ov = P - step
    used = 0
    for py in range(gy0 - ov, gy1 - ov, step):
      for px in range(gx0 - ov, gx1 - ov, step):
        py_, px_ = min(max(0, py), hh - P), min(max(0, px), ww - P)
        g = grow[py_:py_ + P, px_:px_ + P]
        if not (g & ~known[py_:py_ + P, px_:px_ + P]).any(): continue
        K = known[py_:py_ + P, px_:px_ + P]
        tp = np.ascontiguousarray(cur[py_:py_ + P, px_:px_ + P])
        c1 = cv2.matchTemplate(T, tp, cv2.TM_SQDIFF, mask=np.dstack([K.astype(np.float32)] * 3)) / max(K.sum(), 1)
        c2 = cv2.matchTemplate(G, np.ascontiguousarray(G[py_:py_ + P, px_:px_ + P]), cv2.TM_SQDIFF) / (P * P)
        cost = c1 + wg * c2 + epen
        if ww_pen:
          kn = K.mean()
          # the known part of the patch says how much water there is where it is known; the first painting where it is not
          tw = (wgd[py_:py_ + P, px_:px_ + P] * (1 - K)).sum() + ((water_and_rivers(rgb(tp)) > 0.25) * K).sum()
          cost = cost + ww_pen * np.maximum(0, np.abs(wsrc - tw / (P * P)) - 0.02) ** 2
        cost[~okpos] = np.inf
        sy, sx = np.unravel_index(np.argmin(cost), cost.shape)
        if not np.isfinite(cost[sy, sx]): continue
        src = T[sy:sy + P, sx:sx + P]
        # its colour shifted by the mean difference on the overlap (a patch from a lighter or bluer stretch would show as a block)
        if K.sum() > P:
          src = src + ((tp - src) * K[..., None]).sum((0, 1)) / K.sum() * 0.85
        N = min_cut(((src - tp) ** 2).sum(-1), K, ov)
        cur[py_:py_ + P, px_:px_ + P] = tp * (1 - N[..., None]) + src * N[..., None]
        known[py_:py_ + P, px_:px_ + P] = True
        used += 1
    syn = cur
    # eased into the ground round it: the difference on a thin band just outside the vignette, spread smoothly inward
    band = grow & ~hl
    d = (T - syn) * band[..., None]
    sg = 10
    off = gblur(d, sg) / np.maximum(gblur(band.astype(np.float32), sg), 1e-3)[..., None]
    wgt = np.clip(gblur(band.astype(np.float32), sg) / 0.05, 0, 1)[..., None]
    syn = syn + off * wgt * 0.8
    # feathered: the vignette itself all synthesis, the band blended out to the painting
    f = np.clip(nd.distance_transform_edt(~hl) / 6.0, 0, 1)
    f = (1 - f) * grow
    f = np.maximum(f, hl).astype(np.float32)[..., None]
    region = T * (1 - f) + syn * f
    out[Y0:Y1, X0:X1] = np.where(grow[..., None], rgb(region), out[Y0:Y1, X0:X1])
    if log is not None: log.append((k, hx0, hy0, hx1 - hx0, hy1 - hy0, used))
  return out


def copy_out(img, spot, bad, R=560, ke=2.0, near=30.0, others=None):
  """paint out one spot (master px ellipse) by copying in one stretch of the same painting nearby, whole, so its brushwork
  stays coherent (as paint_out), chosen by how the ground round the spot looks in a terrain descriptor rather than in
  plain colour: the colour softened (so no stretch wins for being smooth), how busy the brushwork is (relief or plain),
  the snow, the green and the water, compared on the ring round the spot; no water inside the copy, nothing from `bad`,
  and the nearer the better. The copy is eased into the ring by a smooth colour offset and feathered in."""
  _, cx, cy, rx, ry = spot[:5]
  H, W = img.shape[:2]
  pad = 1.7
  bx0, by0, bx1, by1 = int(cx - rx * pad), int(cy - ry * pad), int(cx + rx * pad), int(cy + ry * pad)
  X0, Y0, X1, Y1 = max(0, bx0 - R), max(0, by0 - R), min(W, bx1 + R), min(H, by1 + R)
  win = img[Y0:Y1, X0:X1]
  L = lab(win)
  f = win.astype(np.float32)
  gm = np.hypot(cv2.Sobel(L[..., 0], cv2.CV_32F, 1, 0, ksize=3), cv2.Sobel(L[..., 0], cv2.CV_32F, 0, 1, ksize=3))
  snow = ((f.mean(-1) > 190) & ((f.max(-1) - f.min(-1)) < 60)).astype(np.float32)
  green = ((f[..., 1] > f[..., 0] * 0.97) & (f.mean(-1) < 150)).astype(np.float32)
  wat = (water_and_rivers(win) > 0.25).astype(np.float32)
  D = np.dstack([gblur(L, 3), gblur(gm, 6)[..., None] * ke, gblur(snow, 4)[..., None] * 60, gblur(green, 4)[..., None] * 40,
                 gblur(wat, 2)[..., None] * 80]).astype(np.float32)
  bw, bh = bx1 - bx0, by1 - by0
  tx, ty = bx0 - X0, by0 - Y0
  m = ellipse_mask((bh, bw), bx0, by0, cx, cy, rx, ry)
  ring = ((ellipse_mask((bh, bw), bx0, by0, cx, cy, rx * pad, ry * pad, 0.01) > 0.5) & (m == 0))
  # (another building not yet painted out is no guide to the ground)
  if others is not None:
    oth = np.zeros_like(ring); oy0, ox0 = max(0, by0), max(0, bx0)
    oth[oy0 - by0:min(H, by1) - by0, ox0 - bx0:min(W, bx1) - bx0] = others[oy0:min(H, by1), ox0:min(W, bx1)]
    if (ring & ~oth).sum() > 200: ring &= ~oth
  ring = ring.astype(np.float32)
  tmpl = np.ascontiguousarray(D[ty:ty + bh, tx:tx + bw])
  cost = cv2.matchTemplate(D, tmpl, cv2.TM_SQDIFF, mask=np.ascontiguousarray(np.dstack([ring] * D.shape[2]))) / ring.sum()
  hh, ww = cost.shape
  # no water, nothing bad, inside the ellipse (and its feather) of the copy
  inner = (ellipse_mask((bh, bw), bx0, by0, cx, cy, rx * 1.15, ry * 1.15, 0.01) > 0.5).astype(np.float32)
  for blk in (wat, bad[Y0:Y1, X0:X1].astype(np.float32)):
    c = cv2.matchTemplate(blk, inner, cv2.TM_CCORR)
    cost[c > 0.5] = np.inf
  # the bad mask over the whole box (the ring of a copy may not be another building either)
  yy, xx = np.mgrid[0:hh, 0:ww]
  d2 = (xx - tx) ** 2 + (yy - ty) ** 2
  cost[d2 < (max(rx, ry) * 2.2) ** 2] = np.inf
  cost = cost + near * d2 / (R * R)
  sy, sx = np.unravel_index(np.argmin(cost), cost.shape)
  if not np.isfinite(cost[sy, sx]): return None
  src = L[sy:sy + bh, sx:sx + bw].copy()
  tgt = L[ty:ty + bh, tx:tx + bw]
  rm = ring * (1 - wet(win[ty:ty + bh, tx:tx + bw]))
  if rm.sum() < 30: rm = ring
  sg = max(rx, ry) * 0.4
  num = gblur((tgt - src) * rm[..., None], sg); den = gblur(rm, sg)[..., None]
  glob = ((tgt - src) * rm[..., None]).sum((0, 1)) / max(rm.sum(), 1)
  wgt = np.clip(den / 0.05, 0, 1)
  src = src + num / np.maximum(den, 1e-6) * wgt + glob * (1 - wgt)
  out = tgt * (1 - m[..., None]) + src * m[..., None]
  img[by0:by1, bx0:bx1] = rgb(out)
  return (sx - tx, sy - ty)


def south_join(res, owner, a1=0.9, a2=0.3, fade=0.35, band=90):
  """the whole.png strip (the south, under the skipped tiles 7 and 8; owner == 1) is whole.png enlarged three times and read
  soft beside the sections, with a hard line where they meet (2026-11-05: the owner saw it where the Nile changes width).
  Its lightness is sharpened (a fine and a broader unsharp mask, the colour left alone), eased in over a few pixels at the
  join; on the sections' side the finest brushwork is eased back a little over `band` px towards the join, so the change of
  sharpness runs over a stretch instead of along a line. (The broad colour already runs on across the join: the
  multi-band blend sees to it.)"""
  W = owner == 1
  if not W.any(): return res
  dIn = nd.distance_transform_edt(W).astype(np.float32)
  dOut = nd.distance_transform_edt(~W).astype(np.float32)
  ys, xs = np.where(dOut < band + 40)
  y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
  L = lab(res[y0:y1, x0:x1])
  di, do = dIn[y0:y1, x0:x1], dOut[y0:y1, x0:x1]
  Wc = W[y0:y1, x0:x1]
  l = L[..., 0]
  hp1 = l - gblur(l, 2.2); hp2 = l - gblur(gblur(l, 2.2), 7)
  ws = np.clip(di / 12, 0, 1) * Wc
  wf = fade * np.clip(1 - do / band, 0, 1) * ~Wc
  l2 = l + ws * (a1 * hp1 + a2 * hp2) - wf * hp1
  L2 = L.copy(); L2[..., 0] = l2
  out = res.copy()
  out[y0:y1, x0:x1] = rgb(L2)
  return out


def ellipses(spots, shape=(MH, MW)):
  m = np.zeros(shape, np.uint8)
  for _, cx, cy, rx, ry, *_ in spots: cv2.ellipse(m, (int(cx), int(cy)), (int(rx), int(ry)), 0, 0, 360, 1, -1)
  return m > 0


BUSY = {}
QUILT = dict(wg=1.5, ww_pen=3000.0)
# per spot, where another weighing came out cleaner (each looked at full size)
QUILT_SPOT = {'alexandria': dict(wg=0.6)}


def landmarks_out(res, old, only=None):
  bad = cv2.dilate(ellipses(LANDMARKS_OUT).astype(np.uint8), np.ones((31, 31), np.uint8)) > 0
  # the frame of the painting is not copied in
  bad[:40] = bad[-40:] = True; bad[:, :40] = bad[:, -40:] = True
  todo = [l for l in LANDMARKS_OUT if only is None or l[0] in only]
  # the buildings still standing (each comes off as it is painted out): no fill is matched to one
  left = cv2.dilate(ellipses(todo).astype(np.uint8), np.ones((15, 15), np.uint8)) > 0
  def done(spots):
    nonlocal left
    left &= ~(cv2.dilate(ellipses(spots).astype(np.uint8), np.ones((15, 15), np.uint8)) > 0)
  out = res.copy()
  for l in todo:
    if l[5] != 'copy2': continue
    bo = copy_out(out, l, bad, others=left & ~ellipses([l]))
    done([l])
    print(f'copy2: {l[0]} at {l[1]},{l[2]}: brushwork from {bo} px off', file=sys.stderr)
  for l in todo:
    if l[5] != 'copy': continue
    bo = paint_out(out, 0, 0, ('master',) + tuple(l[1:5]) + ('ring',), old, bad, R=520, busy=BUSY.get(l[0], (1.0, 0))[0], near=BUSY.get(l[0], (1.0, 0))[1], others=left & ~ellipses([l]))
    done([l])
    print(f'copy: {l[0]} at {l[1]},{l[2]}: brushwork from {bo} px off', file=sys.stderr)
  runs = [('quilt', QUILT, [l for l in todo if l[5] == 'quilt' and l[0] not in QUILT_SPOT])]
  runs += [('quilt', {**QUILT, **QUILT_SPOT[l[0]]}, [l]) for l in todo if l[5] == 'quilt' and l[0] in QUILT_SPOT]
  runs += [('land', dict(wg=0.0, dry=True, P=48, step=32), [l for l in todo if l[5] == 'land']),
           ('land64', dict(wg=0.0, dry=True, P=64, step=44), [l for l in todo if l[5] == 'land64'])]
  for how, kw, spots in runs:
    if not spots: continue
    log = []
    out = synth_out(out, old, ellipses(spots), bad, log=log, others=left, **kw)
    done(spots)
    for k, x, y, w, h, u in log: print(f'{how}: hole {k} at {x},{y} ({w}x{h} px): {u} patches', file=sys.stderr)
  return out


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


def paint_out(img, x0, y0, spot, guide, bad, R=900, busy=None, near=0.0, others=None):
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
  if others is not None and (ring & ~others[by0:by1, bx0:bx1]).sum() > 200: ring &= ~others[by0:by1, bx0:bx1]
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
  if busy is not None: greenish = np.zeros_like(greenish)   # (the snow and green of the copy are matched to the ring instead)
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
  st = 10
  if busy is not None:
    # (since 2026-11-05, for the landmarks) a stretch as busy, as snowy and as green as the ring round the spot, so the
    # fill is neither a soft smear (the whole.png south) nor a blot of snow or trees
    gmf = np.hypot(cv2.Sobel(L[..., 0], cv2.CV_32F, 1, 0, ksize=3), cv2.Sobel(L[..., 0], cv2.CV_32F, 0, 1, ksize=3))
    snowf = ((fe.mean(-1) > 190) & ((fe.max(-1) - fe.min(-1)) < 60)).astype(np.float32)
    greenf = ((fe[..., 1] > fe[..., 0] * 0.97) & (fe.mean(-1) < 150)).astype(np.float32)
    rr = ring
    feats = [(cv2.integral(gmf), gmf[by0 - y0:by1 - y0, bx0 - x0:bx1 - x0][rr].mean(), 'g'),
             (cv2.integral(snowf), snowf[by0 - y0:by1 - y0, bx0 - x0:bx1 - x0][rr].mean(), 's'),
             (cv2.integral(greenf), greenf[by0 - y0:by1 - y0, bx0 - x0:bx1 - x0][rr].mean(), 'v')]
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
      if busy is not None:
        A = (vx - ux) * (vy - uy)
        for I, tv, kind in feats:
          v = (I[vy, vx] - I[uy, vx] - I[vy, ux] + I[uy, ux]) / A
          e += busy * 100 * ((v - tv) / max(tv, 1)) ** 2 if kind == 'g' else 3000 * max(0, abs(v - tv) - 0.03) ** 2
        # and the nearer the better (the same country)
        e += near * (dx * dx + dy * dy) / (R * R)
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
  # the whole.png strip sharpened, and its join with the sections eased (since 2026-11-05)
  if layers[0][4] == 'whole': res = south_join(res, owner)
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
  ap.add_argument('--stitched', help='a stitched master saved by --save-stitched: only the landmarks are painted out')
  ap.add_argument('--save-stitched', help='also save the stitched master before the landmarks are painted out')
  a = ap.parse_args()
  res = read_rgb(a.stitched) if a.stitched else build(a.debug, a.sigma, a.bands)
  if a.save_stitched: Image.fromarray(res).save(a.save_stitched, compress_level=1)
  res = landmarks_out(res, read_rgb(OLD))
  Image.fromarray(res).save(a.out, optimize=False, compress_level=6)
  print(f'wrote {a.out} ({MW} x {MH})')


if __name__ == '__main__':
  main()
