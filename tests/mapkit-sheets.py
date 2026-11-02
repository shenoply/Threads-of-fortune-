"""Synthetic decoration sheets for testing tools/cut-sheets.py before the painted ones exist.

Draws every sheet of src/data/mapKitSheets.json with its expected number of items: simple shapes in a grid
with transparent gaps, lit from the north-west, each with a soft shadow. Palms are a trunk and fronds drawn
as separate pieces a few pixels apart (they must come out as one item), a tree clump is several separate
crowns, and every sheet is sprinkled with specks (which must be dropped).
Run: python3 -I tests/mapkit-sheets.py <out dir>
"""
import sys, os, json, math, random
from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
SHEETS = json.load(open(os.path.join(ROOT, 'src/data/mapKitSheets.json')))['sheets']
N = 2048


def shadow(d, cx, by, w):
  d.ellipse([cx - w * 0.2, by - w * 0.08, cx + w * 0.7, by + w * 0.12], fill=(40, 30, 20, 70))


def palm(d, cx, by, s, rnd):
  shadow(d, cx, by, s * 0.8)
  d.line([cx, by, cx + s * 0.08, by - s * 0.7], fill=(110, 80, 50, 255), width=max(3, int(s * 0.05)))
  tx, ty = cx + s * 0.08, by - s * 0.72
  for k in range(6):
    a = -math.pi / 2 + (k - 2.5) * 0.55
    # each frond its own piece, a gap from the crown
    x0, y0 = tx + math.cos(a) * s * 0.08, ty + math.sin(a) * s * 0.08 + 2
    x1, y1 = tx + math.cos(a) * s * 0.36, ty + math.sin(a) * s * 0.22 + s * 0.06
    d.line([x0, y0, x1, y1], fill=(70, 100, 45, 255), width=max(3, int(s * 0.04)))


def tree(d, cx, by, s, col):
  shadow(d, cx, by, s * 0.7)
  d.rectangle([cx - s * 0.03, by - s * 0.3, cx + s * 0.03, by], fill=(100, 70, 40, 255))
  d.ellipse([cx - s * 0.3, by - s * 0.85, cx + s * 0.3, by - s * 0.25], fill=col, outline=(40, 40, 25, 255), width=3)


def clump(d, cx, by, s, col):
  for dx, dy in ((-0.35, 0), (0, -0.12), (0.35, 0.02)):
    # the crowns stand a few pixels apart: one clump all the same
    tree(d, cx + dx * s * 0.9, by + dy * s * 0.3, s * 0.6, col)


def conifer(d, cx, by, s, col):
  shadow(d, cx, by, s * 0.5)
  d.polygon([(cx, by - s), (cx - s * 0.22, by - s * 0.1), (cx + s * 0.22, by - s * 0.1)], fill=col, outline=(30, 40, 25, 255))
  d.rectangle([cx - s * 0.03, by - s * 0.12, cx + s * 0.03, by], fill=(90, 60, 35, 255))


def peak(d, cx, by, s, body, snow=None):
  shadow(d, cx, by, s * 1.1)
  top = (cx - s * 0.05, by - s * 0.8)
  d.polygon([(cx - s * 0.6, by), top, (cx + s * 0.6, by)], fill=body, outline=(50, 35, 20, 255))
  d.polygon([top, (cx + s * 0.6, by), (cx + s * 0.05, by)], fill=tuple(int(v * 0.7) for v in body[:3]) + (255,))
  if snow:
    d.polygon([top, (cx - s * 0.22, by - s * 0.5), (cx + s * 0.15, by - s * 0.52)], fill=snow)


def hill(d, cx, by, s, col):
  shadow(d, cx, by, s * 1.2)
  d.chord([cx - s * 0.7, by - s * 0.5, cx + s * 0.7, by + s * 0.5], 180, 360, fill=col, outline=(60, 45, 25, 255), width=3)


def patch(d, cx, by, w, h, col, lines=None):
  d.ellipse([cx - w / 2, by - h, cx + w / 2, by], fill=col)
  if lines:
    for k in range(1, 4):
      y = by - h * k / 4
      d.arc([cx - w * 0.4, y - h * 0.2, cx + w * 0.4, y + h * 0.2], 200, 340, fill=lines, width=3)


def draw_item(d, group, i, cx, by, s, rnd):
  if group == 'palm': palm(d, cx, by, s, rnd)
  elif group == 'tree': tree(d, cx, by, s, (80 + i * 4, 110, 50, 255))
  elif group == 'clump': clump(d, cx, by, s, (70, 105 + i * 3, 45, 255))
  elif group == 'conifer': conifer(d, cx, by, s, (45, 80 + i * 3, 45, 255))
  elif group == 'olive': tree(d, cx, by, s * 0.8, (120, 130, 90, 255))
  elif group == 'peak': peak(d, cx, by, s, (150, 130, 110, 255), (245, 245, 250, 255))
  elif group == 'big': peak(d, cx, by - s * 0.05, s * 1.5, (150, 130, 110, 255), (245, 245, 250, 255))
  elif group == 'bare': peak(d, cx, by, s, (150, 120, 85, 255))
  elif group == 'granite': peak(d, cx, by, s, (170, 90, 60, 255))
  elif group == 'ochre': hill(d, cx, by, s, (200, 160, 90, 255))
  elif group == 'green': hill(d, cx, by, s, (120, 140, 70, 255))
  elif group == 'dune': patch(d, cx, by, s * 1.5, s * 0.5, (225, 180, 110, 255), (170, 120, 70, 255))
  elif group == 'outcrop': peak(d, cx, by, s * 0.5, (140, 110, 80, 255))
  elif group == 'scrub': tree(d, cx, by, s * 0.4, (130, 125, 70, 255))
  elif group == 'field': patch(d, cx, by, s * 1.3, s * 0.6, (150, 160, 80, 255), (110, 120, 50, 255))
  elif group == 'wave': d.arc([cx - s * 0.5, by - s * 0.3, cx + s * 0.5, by + s * 0.1], 200, 340, fill=(240, 245, 245, 230), width=6)
  elif group == 'shallow': patch(d, cx, by, s * 1.4, s * 0.5, (120, 190, 190, 160))


def make(stem, spec, out):
  rnd = random.Random(stem)
  items = [g for g, c in spec['groups'] for _ in range(c)]
  if spec.get('largest'): items.insert(len(items) // 2, spec['largest'])
  cols = 5 if len(items) > 16 else 4
  cell = N // cols
  im = Image.new('RGBA', (N, N), (0, 0, 0, 0))
  d = ImageDraw.Draw(im)
  for i, g in enumerate(items):
    r, c = divmod(i, cols)
    cx, by = c * cell + cell / 2 + rnd.uniform(-20, 20), r * cell + cell * 0.8 + rnd.uniform(-10, 10)
    draw_item(d, g, i, cx, by, cell * 0.45, rnd)
  # specks of stray paint, to be dropped
  for _ in range(25):
    x, y = rnd.uniform(0, N), rnd.uniform(0, N)
    d.ellipse([x, y, x + 2, y + 2], fill=(90, 70, 40, 200))
  im.save(os.path.join(out, f'{stem}.png'))
  return len(items)


if __name__ == '__main__':
  out = sys.argv[1]
  os.makedirs(out, exist_ok=True)
  for stem, spec in SHEETS.items(): print(stem, make(stem, spec, out))
