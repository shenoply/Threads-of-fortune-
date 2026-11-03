"""Cut the map decoration sheets into atlases the map draws from.

The artist paints each kind of decoration on one transparent sheet (art-src/map-kit/sheets/<stem>.png,
2048 x 2048, items in a loose grid with clear gaps; the stems and what each holds are in
src/data/mapKitSheets.json). For each sheet this script:
  1. finds every item by its alpha: connected pieces after a small dilation, so the separate fronds of a
     palm or the puffs of a tree clump stay one item; specks far smaller than the sheet's items are dropped;
  2. puts the items in reading order (rows top to bottom, each row left to right) and shares them out
     among the sheet's groups in that order ('largest' first takes the biggest item out on its own); an
     optional <stem>.groups.json beside the sheet (a list of group names in reading order) overrides that;
  3. crops each item with a margin (other items' pixels masked out), trims it, shrinks it to the sheet's
     'px' height if taller, and finds its base: the middle of the lowest solid row (a cast shadow, being
     thin, is not counted), which the map stands on the item's spot;
  4. packs the items on shelves into one atlas, public/art/map/kit/<stem>.webp, with <stem>.json beside
     it (each frame's rectangle, its base point, its height without the shadow below, and its group).
The map finds the atlases on its own (vite.config.ts lists public/art/map/kit), and draws them in place of
its ink placeholders; no code change.
Run: python3 -I tools/cut-sheets.py [--src art-src/map-kit/sheets] [--out public/art/map/kit] [--contact out.png]
"""
import sys, os, json, argparse
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
MANIFEST = os.path.join(ROOT, 'src/data/mapKitSheets.json')
ALPHA_ON = 20       # a pixel belongs to an item from this alpha up
SOLID = 150         # and counts as solid (not shadow or soft edge) from this
PAD = 2             # transparent pixels round each frame in the atlas


def disc(r):
  y, x = np.ogrid[-r:r + 1, -r:r + 1]
  return x * x + y * y <= r * r


def find_items(rgba):
  """the items on a sheet: a list of (label mask slice, area, bbox) in reading order, and the label map"""
  a = rgba[..., 3]
  on = a > ALPHA_ON
  H, W = on.shape
  r = max(3, round(min(W, H) / 256))      # 8 px on a 2048 sheet
  try:
    import cv2
    grown = cv2.dilate(on.astype(np.uint8), disc(r).astype(np.uint8)) > 0
  except ImportError:
    grown = nd.binary_dilation(on, structure=disc(r))
  lab, n = nd.label(grown, structure=np.ones((3, 3)))
  if n == 0: return [], lab, r
  areas = nd.sum(on, lab, range(1, n + 1))
  big = [v for v in areas if v >= 64]
  if not big: return [], lab, r
  med = float(np.median(big))
  keep = [k + 1 for k, v in enumerate(areas) if v >= max(64, 0.04 * med)]
  objs = nd.find_objects(lab)
  items = []
  for k in keep:
    sl = objs[k - 1]
    m = (lab[sl] == k) & on[sl]
    ys, xs = np.where(m)
    y0, y1, x0, x1 = sl[0].start + ys.min(), sl[0].start + ys.max() + 1, sl[1].start + xs.min(), sl[1].start + xs.max() + 1
    items.append({'k': k, 'area': float(areas[k - 1]), 'box': (x0, y0, x1, y1)})
  # reading order: rows of items whose heights overlap by half the smaller one, top to bottom, then left to right
  items.sort(key=lambda it: it['box'][1])
  rows = []
  for it in items:
    x0, y0, x1, y1 = it['box']
    for row in rows:
      ry0, ry1 = row['y0'], row['y1']
      ov = min(y1, ry1) - max(y0, ry0)
      if ov >= 0.5 * min(y1 - y0, row['h']):
        row['items'].append(it); row['y0'] = min(ry0, y0); row['y1'] = max(ry1, y1); row['h'] = min(row['h'], y1 - y0)
        break
    else:
      rows.append({'y0': y0, 'y1': y1, 'h': y1 - y0, 'items': [it]})
  rows.sort(key=lambda r_: (r_['y0'] + r_['y1']) / 2)
  ordered = [it for row in rows for it in sorted(row['items'], key=lambda it: (it['box'][0] + it['box'][2]) / 2)]
  return ordered, lab, r


def share_groups(stem, items, spec, override):
  """the group of each item, in reading order"""
  n = len(items)
  if override is not None:
    if len(override) != n: raise SystemExit(f'{stem}: {len(override)} names in the groups file, {n} items on the sheet')
    return list(override), []
  out = [None] * n
  rest = list(range(n))
  notes = []
  if spec.get('largest') and n:
    big = max(rest, key=lambda i: items[i]['area'])
    out[big] = spec['largest']; rest.remove(big)
  groups = spec['groups']
  want = sum(c for _, c in groups)
  if len(rest) != want:
    notes.append(f'{stem}: expected {want + (1 if spec.get("largest") else 0)} items, found {n}; groups shared out in proportion')
  # in order, each group its share (exact when the count is as expected)
  total = len(rest); acc = 0; i = 0
  for gi, (g, c) in enumerate(groups):
    take = round((acc + c) * total / want) - round(acc * total / want) if want else 0
    if gi == len(groups) - 1: take = total - i
    for j in rest[i:i + take]: out[j] = g
    i += take; acc += c
  return out, notes


def base_of(alpha):
  """the item's base (x, y) and its height above the base, from the solid pixels (in the frame's pixels)"""
  solid = alpha > SOLID
  if solid.sum() < 4: solid = alpha > ALPHA_ON
  ys, xs = np.where(solid)
  h, w = alpha.shape
  top = ys.min()
  counts = solid.sum(1)
  need = max(2, int(0.03 * (xs.max() - xs.min() + 1)))
  rows = np.where(counts >= need)[0]
  bottom = rows.max() if len(rows) else ys.max()
  band = max(1, int(0.08 * (bottom - top + 1)))
  sel = solid[max(top, bottom - band):bottom + 1]
  bx = np.where(sel)[1]
  ax = float(bx.mean()) if len(bx) else w / 2
  return ax, float(bottom + 1), float(bottom + 1 - top)


def resize_rgba(im, w, h):
  # shrink with the colour premultiplied by alpha, so soft edges do not darken
  return im.convert('RGBa').resize((w, h), Image.LANCZOS).convert('RGBA')


def pack(sizes, maxw):
  """shelf packing: positions for (w, h) boxes, tallest first; returns (positions, width, height)"""
  order = sorted(range(len(sizes)), key=lambda i: (-sizes[i][1], -sizes[i][0]))
  pos = [None] * len(sizes)
  x = y = shelf = 0; used_w = 0
  for i in order:
    w, h = sizes[i]
    if x + w > maxw and x > 0:
      y += shelf; x = 0; shelf = 0
    pos[i] = (x, y)
    x += w; shelf = max(shelf, h); used_w = max(used_w, x)
  return pos, used_w, y + shelf


def cut_sheet(path, stem, spec, out_dir):
  im = Image.open(path).convert('RGBA')
  rgba = np.asarray(im)
  items, lab, r = find_items(rgba)
  gfile = os.path.splitext(path)[0] + '.groups.json'
  override = json.load(open(gfile)) if os.path.exists(gfile) else None
  groups, notes = share_groups(stem, items, spec, override)
  H, W = lab.shape
  crops = []
  for it, g in zip(items, groups):
    x0, y0, x1, y1 = it['box']
    m = r
    X0, Y0, X1, Y1 = max(0, x0 - m), max(0, y0 - m), min(W, x1 + m), min(H, y1 + m)
    c = rgba[Y0:Y1, X0:X1].copy()
    other = (lab[Y0:Y1, X0:X1] != it['k'])
    c[other, 3] = 0
    a = c[..., 3]
    ys, xs = np.where(a > 0)
    c = c[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    tall = spec.get('pxLargest', spec['px']) if g == spec.get('largest') else spec['px']
    ch, cw = c.shape[:2]
    k = min(1.0, tall / ch, (tall * 3) / cw)
    pic = Image.fromarray(c, 'RGBA')
    if k < 1: pic = resize_rgba(pic, max(1, round(cw * k)), max(1, round(ch * k)))
    ax, ay, ih = base_of(np.asarray(pic)[..., 3])
    crops.append({'pic': pic, 'g': g, 'ax': ax, 'ay': ay, 'ih': ih, 'src': [int(x0), int(y0), int(x1 - x0), int(y1 - y0)]})
  sizes = [(c['pic'].width + 2 * PAD, c['pic'].height + 2 * PAD) for c in crops]
  area = sum(w * h for w, h in sizes)
  maxw = max([w for w, _ in sizes] + [int((area * 1.2) ** 0.5)])
  maxw = min(4096, -(-maxw // 16) * 16)
  pos, aw, ah = pack(sizes, maxw) if crops else ([], 1, 1)
  atlas = Image.new('RGBA', (max(1, aw), max(1, ah)), (0, 0, 0, 0))
  frames = []
  for c, (px, py) in zip(crops, pos):
    atlas.paste(c['pic'], (px + PAD, py + PAD))
    frames.append({'x': px + PAD, 'y': py + PAD, 'w': c['pic'].width, 'h': c['pic'].height,
                   'ax': round(c['ax'], 1), 'ay': round(c['ay'], 1), 'ih': round(c['ih'], 1), 'g': c['g'], 'src': c['src']})
  os.makedirs(out_dir, exist_ok=True)
  atlas.save(os.path.join(out_dir, f'{stem}.webp'), 'WEBP', quality=88, method=4)
  by = {}
  for i, f in enumerate(frames): by.setdefault(f['g'], []).append(i)
  meta = {'image': f'{stem}.webp', 'w': atlas.width, 'h': atlas.height, 'frames': frames, 'groups': by}
  with open(os.path.join(out_dir, f'{stem}.json'), 'w') as fh: json.dump(meta, fh, separators=(',', ':'))
  return meta, atlas, notes


def contact(results, path):
  """every atlas, one under another, each frame boxed with its base marked"""
  pics = []
  for stem, meta, atlas in results:
    bg = Image.new('RGBA', (atlas.width, atlas.height + 18), (236, 222, 188, 255))
    bg.alpha_composite(atlas, (0, 18))
    d = ImageDraw.Draw(bg)
    d.text((4, 3), f'{stem}  ' + '  '.join(f'{g} {len(v)}' for g, v in meta['groups'].items()), fill=(60, 40, 20, 255))
    for f in meta['frames']:
      d.rectangle([f['x'], f['y'] + 18, f['x'] + f['w'] - 1, f['y'] + f['h'] - 1 + 18], outline=(160, 60, 40, 255))
      bx, by = f['x'] + f['ax'], f['y'] + f['ay'] + 18
      d.line([bx - 4, by, bx + 4, by], fill=(20, 20, 160, 255)); d.line([bx, by - 4, bx, by + 4], fill=(20, 20, 160, 255))
    pics.append(bg)
  if not pics: return
  W = max(p.width for p in pics); H = sum(p.height + 8 for p in pics)
  out = Image.new('RGBA', (W, H), (250, 245, 230, 255)); y = 0
  for p in pics: out.alpha_composite(p, (0, y)); y += p.height + 8
  out.convert('RGB').save(path)


def main(argv=None):
  ap = argparse.ArgumentParser()
  ap.add_argument('--src', default=os.path.join(ROOT, 'art-src/map-kit/sheets'))
  ap.add_argument('--out', default=os.path.join(ROOT, 'public/art/map/kit'))
  ap.add_argument('--contact')
  a = ap.parse_args(argv)
  sheets = json.load(open(MANIFEST))['sheets']
  results, notes = [], []
  for stem, spec in sheets.items():
    path = next((os.path.join(a.src, f'{stem}{e}') for e in ('.png', '.webp') if os.path.exists(os.path.join(a.src, f'{stem}{e}'))), None)
    if not path: continue
    meta, atlas, nn = cut_sheet(path, stem, spec, a.out)
    notes += nn
    results.append((stem, meta, atlas))
    print(f'{stem}: {len(meta["frames"])} items -> {meta["w"]}x{meta["h"]} atlas (' + ', '.join(f'{g} {len(v)}' for g, v in meta['groups'].items()) + ')')
  for n in notes: print('note:', n)
  if not results: print(f'no sheets in {a.src}')
  if a.contact: contact(results, a.contact)


if __name__ == '__main__':
  main()
