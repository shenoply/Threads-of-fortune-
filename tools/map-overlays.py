#!/usr/bin/env python3
"""The travel map's painted overlays (the artist's map art pack): town landmarks, ships, the wake, caravans and the
small groups of people, from the cut-outs in art-src/map-overlays/ to the WebP files the map draws.

  python3 -I tools/map-overlays.py [--contact out.png]

Each cut-out is cleaned first: the faint haze round it (alpha under 24) is cleared, and the bits of neighbouring items
that came along when the sheet was cut (feet from the row above, a tower from the next vignette) are dropped: only the
largest painted part and whatever lies close to it is kept. Then it is trimmed to what is painted, so the base of a
landmark is the bottom centre of its picture, and shrunk to what the map needs.

  landmarks/landmark-<town>.png  ->  public/art/map/<code>-<name>.webp   (codes and names in src/data/mapArt.ts)
  ships/S<n>-*.png, S-wake.png   ->  public/art/map/S<n>-<name>.webp, S-wake.webp
  caravans/C<n>-*.png            ->  public/art/map/C<n>-caravan.webp
  people/people-<what>.png       ->  public/art/map/people/<what>.webp

The route pieces (art-src/map-overlays/unused/) are not used: the map draws its own roads and railways, and the
pieces in the pack are partly cut off or under the wrong names.
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as nd

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'art-src' / 'map-overlays'
OUT = ROOT / 'public' / 'art' / 'map'

# landmark file name (after "landmark-") -> code-name in src/data/mapArt.ts
LANDMARKS = {
    'giza': '01-giza', 'saqqara': '02-saqqara', 'fayoum': '03-fayoum', 'cairo': '04-cairo', 'tanta': '05-tanta',
    'alexandria': '06-alexandria', 'port-said': '07-port-said', 'suez': '08-suez', 'st-catherines': '09-st-catherine',
    'tarabin-camp': '10-tarabin', 'jaffa': '11-jaffa', 'jerusalem': '12-jerusalem', 'beirut': '13-beirut',
    'damascus': '14-damascus', 'amman': '15-amman', 'aleppo': '16-aleppo', 'konya': '17-konya',
    'constantinople': '18-constantinople', 'angora': '19-angora', 'baghdad': '20-baghdad', 'khanaqin': '21-khanaqin',
    'kermanshah': '22-kermanshah', 'hamadan': '23-hamadan', 'tehran': '24-tehran', 'tabriz': '25-tabriz',
    'kashan': '26-kashan', 'isfahan': '27-isfahan', 'kerman': '28-kerman', 'ajrud-fort': '29-ajrud',
    'ayun-musa': '30-ayun-musa', 'wadi-feiran': '31-wadi-feiran', 'bir-el-abd': '32-bir-el-abd', 'rutba': '33-rutba',
}
SHIPS = {'S1-passenger-steamer': 'S1-steamer', 'S2-cargo-steamer': 'S2-cargo', 'S3-nile-felucca': 'S3-felucca',
         'S4-arab-dhow': 'S4-dhow', 'S6-aegean-schooner': 'S6-schooner', 'S9-caspian-steamer': 'S9-steamer', 'S-wake': 'S-wake'}
# the "donkey cart" in the pack is a ploughman with his ox
PEOPLE = {'camel-guide': 'camel-guide', 'donkey-cart': 'plough', 'donkey-traveler': 'donkey-traveller', 'farmers': 'farmers',
          'fishermen': 'fishermen', 'grain-merchants': 'grain-merchants', 'guards': 'guards', 'horse-riders': 'horse-riders',
          'market-sellers': 'market-sellers', 'porters': 'porters', 'soldiers': 'soldiers', 'town-walkers': 'town-walkers'}


# the shrink for each set (from the pack's 768 px ships, 1024 px caravans, 512 px people); src/data/mapArt.ts OVERLAY_K
SHIP_K, CARAVAN_K, PEOPLE_K = 0.42, 0.42, 0.5


def clean(path: Path, gap: int) -> Image.Image:
    im = np.array(Image.open(path).convert('RGBA')).astype(np.float32)
    a = im[..., 3]
    a = np.where(a < 24, 0, a)
    solid = a >= 96
    lab, n = nd.label(solid, structure=np.ones((3, 3)))
    areas = nd.sum(solid, lab, range(1, n + 1))
    big = int(np.argmax(areas)) + 1
    H, W = solid.shape
    bad = set()
    for i, so in enumerate(nd.find_objects(lab), 1):
        if i == big:
            continue
        y0, y1, x0, x1 = so[0].start, so[0].stop, so[1].start, so[1].stop
        if y0 <= 2 or y1 >= H - 2:
            bad.add(i)                    # cut by the sheet's row above or below
        elif (x0 <= 2 or x1 >= W - 2) and areas[i - 1] < 0.08 * areas[big - 1]:
            bad.add(i)                    # a sliver of the neighbour at the side
    keep = lab == big
    for _ in range(6):
        near = nd.binary_dilation(keep, iterations=gap)
        ids = set(np.unique(lab[near & solid])) - {0} - bad
        nk = np.isin(lab, list(ids))
        if nk.sum() == keep.sum():
            break
        keep = nk
    a = np.where(nd.binary_dilation(keep, iterations=4), a, 0)
    im[..., 3] = a
    ys, xs = np.nonzero(a > 0)
    return Image.fromarray(im.clip(0, 255).astype(np.uint8), 'RGBA').crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))


def fit(im: Image.Image, max_w: int, max_h: int) -> Image.Image:
    k = min(1.0, max_w / im.width, max_h / im.height)
    return scale(im, k)


def scale(im: Image.Image, k: float) -> Image.Image:
    """one factor for a whole set (ships, caravans, people), so their sizes to one another stay as painted"""
    if k < 1:
        im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    return im


def save(im: Image.Image, dst: Path):
    dst.parent.mkdir(parents=True, exist_ok=True)
    im.save(dst, 'WEBP', quality=82, method=6, alpha_quality=90)
    return dst


def main():
    made = []
    for src, code in LANDMARKS.items():
        made.append(save(fit(clean(SRC / 'landmarks' / f'landmark-{src}.png', 14), 384, 320), OUT / f'{code}.webp'))
    for src, code in SHIPS.items():
        made.append(save(scale(clean(SRC / 'ships' / f'{src}.png', 40), SHIP_K), OUT / f'{code}.webp'))
    for p in sorted((SRC / 'caravans').glob('C*.png')):
        made.append(save(scale(clean(p, 40), CARAVAN_K), OUT / f'{p.stem.split("-")[0]}-caravan.webp'))
    for src, name in PEOPLE.items():
        made.append(save(scale(clean(SRC / 'people' / f'people-{src}.png', 40), PEOPLE_K), OUT / 'people' / f'{name}.webp'))
    # each picture's size, so the map can lay the pieces out before they have loaded (and the tests can check it)
    import json
    sizes = {str(p.relative_to(OUT)).replace('\\', '/'): list(Image.open(p).size) for p in made}
    (ROOT / 'src' / 'data' / 'mapOverlays.json').write_text(json.dumps({'k': {'ship': SHIP_K, 'caravan': CARAVAN_K, 'people': PEOPLE_K}, 'sizes': sizes}, separators=(',', ':')) + '\n')
    total = sum(p.stat().st_size for p in made)
    print(f'{len(made)} files, {total / 1e6:.2f} MB')
    if '--contact' in sys.argv:
        out = sys.argv[sys.argv.index('--contact') + 1]
        cell, cols = 200, 8
        rows = (len(made) + cols - 1) // cols
        sheet = Image.new('RGBA', (cols * cell, rows * cell), (226, 208, 168, 255))
        for i, p in enumerate(made):
            t = Image.open(p).convert('RGBA')
            t.thumbnail((cell - 10, cell - 10))
            sheet.alpha_composite(t, ((i % cols) * cell + (cell - t.width) // 2, (i // cols) * cell + (cell - t.height) // 2))
        sheet.convert('RGB').save(out)
        print('contact sheet', out)


if __name__ == '__main__':
    main()
