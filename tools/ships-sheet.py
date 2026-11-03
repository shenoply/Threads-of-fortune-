# The post-pass for the Blender ships (tools/blender-ships.py): each rendered heading gets its soft shadow
# on the water, a thin ink edge from its outline, a smoke plume (steamers, drifting away astern), a touch
# of blur and grain so it sits with the map painting, and is halved to 160 x 160. The 16 headings go side
# by side into one sheet per type: public/art/map/ships/<type>.webp (frame i = heading i x 22.5 degrees
# clockwise from east), with the PNG master in art-src/ships/<type>.png.
#
#   python3 tools/ships-sheet.py [render-dir] [--contact out.png]
import sys, os, json, math, random
from PIL import Image, ImageFilter, ImageChops, ImageDraw, ImageEnhance

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = [a for a in sys.argv[1:]]
contact = None
if '--contact' in args:
    i = args.index('--contact'); contact = args[i + 1]; del args[i:i + 2]
SRC = args[0] if args else os.path.join(ROOT, 'art-src/ships/render')
TYPES = [t for t in ['steamer', 'cargo', 'caspian', 'schooner', 'dhow', 'felucca'] if not os.environ.get('ONLY') or t in os.environ['ONLY'].split(',')]
N = 16
FR = 160
PAD = 10   # each 320 px render gets 10 px of room round it before halving (frame = 12.2 world units)
SMOKE = {'steamer': (40, 37, 36), 'cargo': (38, 35, 33), 'caspian': (58, 54, 50)}

def grain(size, amount, seed):
    rnd = random.Random(seed)
    g = Image.new('L', size)
    g.putdata([128 + int(rnd.gauss(0, amount)) for _ in range(size[0] * size[1])])
    return g

def plume(size, fr, col, seed):
    """soft puffs from the funnel top, drifting astern and rising, growing and fading"""
    rnd = random.Random(seed)
    lay = Image.new('RGBA', size, (0, 0, 0, 0))
    (fx, fy), (ax, ay) = fr['funnel'], fr['aft']
    dx, dy = ax - fx, ay - fy
    for k in range(16):
        t = k / 15
        # the line astern, bending upward as the smoke rises
        x = fx + dx * t * 1.15 + rnd.uniform(-2, 2)
        y = fy + dy * t * 1.15 - 26 * t * t + rnd.uniform(-2, 2)
        r = 6 + 17 * t
        a = int(200 * (1 - t) ** 1.2)
        puff = Image.new('RGBA', size, (0, 0, 0, 0))
        ImageDraw.Draw(puff).ellipse((x - r, y - r * 0.8, x + r, y + r * 0.8), fill=(*col, a))
        lay = Image.alpha_composite(lay, puff)
    return lay.filter(ImageFilter.GaussianBlur(3.5))

def frame(t, i, meta):
    ship = Image.open(os.path.join(SRC, f'{t}-{i:02d}.png')).convert('RGBA')
    sh = Image.open(os.path.join(SRC, f'{t}-{i:02d}-sh.png')).convert('RGBA')
    W, H = ship.size
    # painterly softening of the ship itself, and a little grain in its tones
    # (a median filter breaks the flat CG faces into soft dabs; tones a shade quieter, as in the painting)
    rgb = ImageEnhance.Color(ship.convert('RGB')).enhance(0.88)
    soft = Image.merge('RGBA', (*rgb.split(), ship.split()[3])).filter(ImageFilter.MedianFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
    r, g, b, a = soft.split()
    gr = grain(ship.size, 5, i * 31 + len(t))
    r, g, b = [ImageChops.add(c, gr, 1, -128) for c in (r, g, b)]
    soft = Image.merge('RGBA', (r, g, b, a))
    # its shadow on the water: soft, cool and faint
    sa = sh.split()[3].point(lambda v: int(v * 0.42)).filter(ImageFilter.GaussianBlur(3))
    shadow = Image.new('RGBA', ship.size, (18, 30, 40, 0)); shadow.putalpha(sa)
    # a thin warm ink edge round the outline
    al = ship.split()[3]
    edge = al.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(0.8)).point(lambda v: int(v * 0.7))
    ink = Image.new('RGBA', ship.size, (42, 28, 18, 0)); ink.putalpha(edge)
    out = Image.new('RGBA', ship.size, (0, 0, 0, 0))
    for lay in (shadow, ink, soft):
        out = Image.alpha_composite(out, lay)
    fr = meta['frames'][i]
    if t in SMOKE and fr.get('funnel'):
        out = Image.alpha_composite(out, plume(ship.size, fr, SMOKE[t], i + 7))
    big = Image.new('RGBA', (W + 2 * PAD, H + 2 * PAD), (0, 0, 0, 0)); big.paste(out, (PAD, PAD))
    return big.resize((FR, FR), Image.LANCZOS)

def main():
    sheets = {}
    os.makedirs(os.path.join(ROOT, 'public/art/map/ships'), exist_ok=True)
    for t in TYPES:
        meta = json.load(open(os.path.join(SRC, f'{t}.json')))
        sheet = Image.new('RGBA', (FR * N, FR), (0, 0, 0, 0))
        for i in range(N):
            f = frame(t, i, meta)
            # nothing may touch the frame's edge (a clipped mast or plume)
            bb = f.split()[3].point(lambda v: 255 if v > 8 else 0).getbbox()
            if bb and (bb[0] <= 0 or bb[1] <= 0 or bb[2] >= FR or bb[3] >= FR):
                print(f'warning: {t} heading {i} touches the frame edge {bb}')
            sheet.paste(f, (i * FR, 0))
        sheet.save(os.path.join(ROOT, f'art-src/ships/{t}.png'), optimize=True)
        dst = os.path.join(ROOT, f'public/art/map/ships/{t}.webp')
        sheet.save(dst, 'WEBP', quality=82, method=6, alpha_quality=90)
        sheets[t] = sheet
        print(f'{t}: {os.path.getsize(dst) // 1024} KB')
    if contact:
        # every type at every heading on the sea, full size and at about 40 px
        sea = (52, 116, 146)
        C = Image.new('RGB', (FR * N, (FR + 50) * len(TYPES)), sea)
        for k, t in enumerate(TYPES):
            s = sheets[t]
            C.paste(s, (0, k * (FR + 50)), s)
            for i in range(N):
                f = s.crop((i * FR, 0, (i + 1) * FR, FR)).resize((48, 48), Image.LANCZOS)
                C.paste(f, (i * FR + 56, k * (FR + 50) + FR), f)
        C.save(contact)

main()
