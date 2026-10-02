"""Terrain for the travel map, traced from the painting (public/art/world/travel-map.jpg, 1536 x 1024).

Writes src/data/terrain.ts: one character per 5-unit map cell (177 x 118, the water mask's grid)
  d desert (default)   f fertile (river valleys, coastal plains)   h hills (slow)
  m mountains (impassable)   r road (fast, and the only way over mountains)
Water stays in landmask.ts. Mountains and hills are hand-traced polygons in painting pixels; fertile
ground is read from the painting's greens; roads are polylines between towns along historic routes.
Run: python3 tools/build-terrain.py [--overlay out.jpg]
"""
import re, sys, json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd

ROOT = __file__.rsplit('/tools/', 1)[0]
W, H, CELL = 177, 118, 5
PX = 1536 / 885          # painting pixels per map unit
K = PX * CELL            # painting pixels per cell

MOUNTAINS = {
    # Sinai and the Hejaz: the massif east of the Gulf; St Catherine's sits in its high valley
    'sinai': [(640, 700), (700, 705), (760, 712), (820, 708), (900, 712), (980, 730), (1040, 790), (1120, 830),
              (1170, 885), (1360, 885), (1536, 860), (1536, 1024), (640, 1024)],
    # Mount Lebanon and the Anti-Lebanon, the wall between Beirut and Damascus
    'lebanon': [(735, 285), (795, 292), (818, 335), (802, 392), (772, 445), (748, 500), (718, 560), (692, 585),
                (676, 556), (700, 482), (722, 420), (742, 352)],
    # the Taurus south of Konya
    'taurus-w': [(250, 198), (335, 188), (420, 198), (470, 228), (472, 290), (430, 322), (330, 330), (258, 302)],
    # the Pontic hills north of Ankara
    'pontic': [(450, 70), (560, 58), (700, 66), (742, 108), (690, 132), (560, 124), (470, 122)],
    # the eastern Taurus and Amanus, between Anatolia and Aleppo
    'taurus-e': [(662, 190), (720, 120), (800, 80), (900, 58), (1000, 58), (1050, 100), (1035, 190), (975, 238),
                 (930, 250), (880, 205), (820, 212), (760, 250), (702, 262)],
    # the Zagros and the snow range, top right
    'zagros': [(1090, 0), (1536, 0), (1536, 290), (1470, 262), (1405, 185), (1300, 128), (1200, 108), (1110, 96)],
}
HILLS = {
    # the broken country around the Tarabin camp and the Tih plateau
    'tih': [(650, 610), (760, 600), (900, 610), (1000, 640), (1010, 700), (900, 712), (760, 712), (650, 700)],
    # the Judaean and Moab uplands
    'judaea': [(690, 560), (760, 540), (830, 560), (840, 640), (760, 640), (700, 620)],
    # the Anatolian plateau's broken edge
    'anatolia': [(230, 120), (450, 130), (640, 140), (660, 190), (480, 220), (240, 195)],
}
# town positions in painting pixels (map units x PX)
def town(src, sid):
    m = re.search(r"id: '%s'[^}]*?x: ([\d.]+), y: ([\d.]+)" % sid, src)
    return (float(m.group(1)) * PX, float(m.group(2)) * PX)

# Roads: waypoints in painting pixels between named towns, after the 1920s routes
ROADS = [
    ('giza', [], 'saqqara'), ('saqqara', [], 'fayoum'), ('giza', [], 'fayoum'),
    ('cairo', [], 'tanta'), ('tanta', [(270, 660)], 'alexandria'),
    ('cairo', [(470, 760)], 'suez'), ('cairo', [(470, 690)], 'portsaid'),
    ('suez', [(660, 760), (760, 770)], 'sinai'),               # Wadi Feiran up to the monastery
    ('sinai', [(800, 740), (760, 705)], 'bedouin'),             # the camel track north over the Tih
    ('portsaid', [(650, 650)], 'bedouin'), ('suez', [(660, 720)], 'bedouin'),
    ('portsaid', [(640, 620), (610, 580)], 'jaffa'),            # the coast road by El Arish and Gaza
    ('jaffa', [], 'jerusalem'), ('bedouin', [(720, 630)], 'jerusalem'),
    ('jerusalem', [], 'amman'), ('amman', [(820, 550)], 'damascus'),
    ('jerusalem', [(760, 550), (800, 520)], 'damascus'),
    ('jaffa', [(640, 500)], 'beirut'),
    ('beirut', [(705, 470), (760, 485)], 'damascus'),          # over the Dahr el-Baidar pass
    ('damascus', [(870, 430), (890, 380)], 'aleppo'),          # by Homs and Hama
    ('aleppo', [(820, 290), (720, 275), (620, 268)], 'konya'), # through the Cilician Gates
    ('konya', [], 'ankara'), ('ankara', [(450, 140)], 'istanbul'), ('konya', [(400, 160)], 'istanbul'),
    ('damascus', [(1000, 580), (1200, 600), (1340, 520)], 'baghdad'),   # the desert motor track by Rutba
    ('aleppo', [(1000, 330), (1150, 390), (1300, 440)], 'baghdad'),     # down the Euphrates
]

def main():
    src = open(f'{ROOT}/src/data/world.ts').read()
    rows = re.findall(r'"([01]{177})"', open(f'{ROOT}/src/data/landmask.ts').read())
    water = np.array([[c == '1' for c in r] for r in rows])
    # fertile ground: share of green pixels per cell, smoothed
    im = np.asarray(Image.open(f'{ROOT}/public/art/world/travel-map.jpg').convert('RGB')).astype(float)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    green = ((g > r * 0.95) & (g > b * 1.1) & (g < 170)).astype(float)
    G = np.array([[green[int(y * K):int((y + 1) * K), int(x * K):int((x + 1) * K)].mean() for x in range(W)] for y in range(H)])
    T = np.full((H, W), 'd')
    T[nd.uniform_filter(G, 3) > 0.12] = 'f'
    def fill(polys, ch):
        mask = Image.new('L', (W, H), 0)
        dr = ImageDraw.Draw(mask)
        for pts in polys.values():
            dr.polygon([(x / K, y / K) for x, y in pts], fill=1)
        T[np.asarray(mask, bool)] = ch
    fill(HILLS, 'h')
    fill(MOUNTAINS, 'm')
    # roads, and the towns themselves, are always open ground
    lines = []
    road = Image.new('L', (W, H), 0)
    dr = ImageDraw.Draw(road)
    for a, via, b in ROADS:
        pts = [town(src, a), *via, town(src, b)]
        lines.append({'a': a, 'b': b, 'pts': [[round(x / PX, 1), round(y / PX, 1)] for x, y in pts]})
        dr.line([(x / K, y / K) for x, y in pts], fill=1, width=1)
    rd = np.asarray(road, bool) & ~water
    T[rd] = 'r'
    for sid in re.findall(r"id: '([a-z]+)'[^}]*?kind: '", src):
        x, y = town(src, sid)
        cx, cy = int(x / K), int(y / K)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if 0 <= cy + dy < H and 0 <= cx + dx < W and not water[cy + dy, cx + dx] and T[cy + dy, cx + dx] in 'mh':
                    T[cy + dy, cx + dx] = 'f'
    out = ['// Generated by tools/build-terrain.py from the painted travel map. Do not edit by hand.',
           '// d desert, f fertile, h hills, m mountains (impassable), r road. Water is in landmask.ts.',
           f'export const TERRAIN_ROWS: string[] = {json.dumps(["".join(row) for row in T])};',
           '/** Roads in map units, town to town. */',
           f'export const ROAD_LINES: {{ a: string; b: string; pts: [number, number][] }}[] = {json.dumps(lines)};', '']
    open(f'{ROOT}/src/data/terrain.ts', 'w').write('\n'.join(out))
    if '--overlay' in sys.argv:
        col = {'d': (255, 230, 120), 'f': (40, 200, 60), 'h': (230, 140, 40), 'm': (190, 30, 30), 'r': (255, 255, 255)}
        ov = np.zeros((H, W, 3), np.uint8)
        for c, v in col.items(): ov[T == c] = v
        ov[water] = (40, 80, 255)
        base = Image.open(f'{ROOT}/public/art/world/travel-map.jpg').convert('RGB')
        Image.blend(base, Image.fromarray(ov).resize(base.size, Image.NEAREST), 0.4).save(sys.argv[sys.argv.index('--overlay') + 1], quality=80)
    print({c: int((T == c).sum()) for c in 'dfhmr'})

main()
