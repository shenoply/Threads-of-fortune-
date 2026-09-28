#!/usr/bin/env python3
"""The new full buyer cut-outs (<id>-stall2.png) on the new stall, the way the game will show them.
The counter is drawn in front of everyone; each buyer stands at the right with his head level with
the hero's and the counter crossing him at CUT of his height."""
from PIL import Image, ImageFilter, ImageEnhance
import numpy as np, glob, os, sys
OUT = sys.argv[1] if len(sys.argv) > 1 else '.'
CUT = float(sys.argv[2]) if len(sys.argv) > 2 else 0.64
FH, OV = 900, 768   # OV: the counter's BACK edge; anyone behind the counter disappears there
# where each buyer's hips are, as a share of his picture's height (measured by eye on the cut-outs);
# the counter crosses every buyer there, so all of them stand at the same height behind it
HIP = {'antonios': .7, 'benakis': .68, 'hassan': .66, 'hollister': .74, 'kasparian': .72, 'kassab': .72,
       'levy': .68, 'mariam': .71, 'martel': .76, 'rustam': .77, 'salem': .69, 'shivakiar': .70,
       'wasif': .78, 'whitcombe': .78, 'yusuf': .76}
base = Image.open('public/art/stall2/stall-empty-patched.png').convert('RGBA')
st = base.crop((0, 0, 1536, FH)); W, H = st.size
fg = st.crop((0, OV, W, H)); g = np.full((fg.size[1], W), 255, np.uint8); g[:10] = np.linspace(0, 255, 10)[:, None]; fg.putalpha(Image.fromarray(g))

def grade(im):
    a = im.split()[3]
    arr = np.asarray(ImageEnhance.Color(im.convert('RGB')).enhance(1.06)).astype(float) * np.array([1.03, 0.99, 0.9])
    o = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).convert('RGBA'); o.putalpha(a); return o

def settle(fig, cut_y):
    # darken the figure a little just above the counter, where the counter shades it
    a = np.asarray(fig).astype(float); h = a.shape[0]
    y = np.arange(h)[:, None]; d = np.clip(1 - (cut_y - y) / (h * 0.10), 0, 1) * 0.28
    a[..., :3] *= (1 - d)[..., None]; return Image.fromarray(a.astype(np.uint8))

def contact(c, x0, x1):
    # a soft shadow cast on the counter top by the person leaning behind it
    sh = Image.new('L', c.size, 0); d = np.zeros((c.size[1], c.size[0]), float)
    d[OV:OV + 34, max(x0, 0):min(x1, c.size[0])] = np.linspace(0.5, 0, 34)[:, None]
    sh = Image.fromarray((d * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(10))
    dark = Image.new('RGBA', c.size, (25, 8, 3, 0)); dark.putalpha(sh); c.alpha_composite(dark)

def hand_shadow(c, fig, p):
    # the shadow his forearms and hands cast on the counter cloth, down and to the right
    a = fig.split()[3]; low = Image.new('L', fig.size, 0)
    cut = max(OV - p[1], 0); low.paste(a.crop((0, cut, fig.width, fig.height)), (0, cut))
    low = low.filter(ImageFilter.GaussianBlur(9)).point(lambda v: int(v * 0.5))
    sh = Image.new('RGBA', fig.size, (25, 8, 3, 0)); sh.putalpha(low); c.alpha_composite(sh, (p[0] + 12, p[1] + 14))

def shadow(c, fig, p, k=0.45):
    a = fig.split()[3].filter(ImageFilter.GaussianBlur(18)); sh = Image.new('RGBA', fig.size, (20, 8, 2, 0))
    sh.putalpha(a.point(lambda v: int(v * k))); c.alpha_composite(sh, (p[0] + 14, p[1] + 10))

hero = grade(Image.open('public/art/hero/hero-base-stall.png').convert('RGBA'))
hh = int(H * 0.72); hw = int(hero.width * hh / hero.height); hero = hero.resize((hw, hh), Image.LANCZOS)
hp = (0, OV + 82 - hh); herohead = hp[1] + int(33 * hh / 1024)
# the hero in his stall pose, leaning over the counter: the bottom of his torso sits just under the
# counter's back edge, and he is drawn IN FRONT of the counter so his forearms and hands rest on it
HT_TOP, HT_BOT = 0.108, 0.837
hb = Image.open('public/art/hero/hero-base-stall.png').convert('RGBA')
hs = (OV + 6 - (herohead + 20)) / ((HT_BOT - HT_TOP) * hb.height)
hero = grade(hb).resize((int(hb.width * hs), int(hb.height * hs)), Image.LANCZOS)
hleft = np.where(np.asarray(hero)[..., 3].max(0) > 100)[0].min()
hp = (20 - hleft, OV + 6 - int(HT_BOT * hero.height))

tiles, report = [], []
for f in sorted(glob.glob('public/art/portraits/*-stall2.png')):
    name = os.path.basename(f)[:-11]
    CUT = HIP.get(name, 0.72)
    b0 = Image.open(f).convert('RGBA'); a0 = np.asarray(b0)[..., 3] > 128; h0, w0 = a0.shape
    ys = np.where(a0.any(1))[0]; top = ys.min()
    # scale so from the top of his head to the counter line matches the hero
    s = (OV - (herohead + 20)) / ((CUT - top / h0) * h0)
    bw, bh = int(w0 * s), int(h0 * s); b = grade(b0).resize((bw, bh), Image.LANCZOS)
    by = OV - int(CUT * bh); b = settle(b, int(CUT * bh))
    cols = np.where(a0[: int(CUT * h0)].any(0))[0]            # his width above the counter
    right = int(cols.max() * s)
    bx = min(W - bw + int(bw * 0.04), W - 30 - right) if not a0[: int(CUT * h0), -1].any() else W - bw
    bp = (bx, by)
    # where his sleeve runs off the picture's left edge above the counter, round the cut off
    col0 = a0[: int(CUT * h0), 0]
    if col0.any():
        t0 = int(np.argmax(col0) * s); span = max(int(CUT * bh) - t0, 1); T = bw * 0.06
        a = np.asarray(b).copy(); yy = np.arange(bh)
        k = np.clip((yy - t0) / span, 0, 1); trim = T * np.sin(np.pi / 2 * k)
        keep = np.clip(np.arange(bw)[None, :] - trim[:, None] + 1, 0, 1)
        a[..., 3] = (a[..., 3] * keep).astype(np.uint8); b = Image.fromarray(a)
    left_touch = a0[: int(CUT * h0), 0].any() and bx > 0
    out = st.copy()
    shadow(out, b, bp); out.alpha_composite(b, bp)
    out.alpha_composite(fg, (0, OV))
    hand_shadow(out, hero, hp); out.alpha_composite(hero, hp)
    cols_b = np.where(np.asarray(b)[max(OV - bp[1] - 40, 0):OV - bp[1], :, 3].max(0) > 100)[0]
    if len(cols_b): contact(out, bp[0] + cols_b.min(), bp[0] + cols_b.max())
    t = out.convert('RGB'); t.save(os.path.join(OUT, f'stall2-{name}.jpg'), quality=86)
    tiles.append(t.crop((760, 120, 1536, 900)).resize((310, 312)))
    report.append(f'{name}: left edge {"rounded off" if left_touch else "clear"}')
cols_ = 5; sheet = Image.new('RGB', (310 * cols_, 312 * ((len(tiles) + cols_ - 1) // cols_)), 'black')
for i, t in enumerate(tiles): sheet.paste(t, ((i % cols_) * 310, (i // cols_) * 312))
sheet.save(os.path.join(OUT, 'all-buyers2.jpg'), quality=82); print('\n'.join(report))
