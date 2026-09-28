#!/usr/bin/env python3
"""Put the hero and every buyer on the new stall the way the game will, and write a contact sheet.
Buyer pictures are cut off at their sides and bottom; the counter hides the bottom, the frame edge
hides the right side, and a pile of folded rugs, sized per buyer, hides the left side."""
from PIL import Image, ImageFilter, ImageEnhance
import numpy as np, glob, os, sys
OUT = sys.argv[1] if len(sys.argv) > 1 else '.'
FH, OV = 900, 790
PILE_H, CARVE = float(sys.argv[2]) if len(sys.argv) > 2 else 0.17, 0.07                      # frame height (crop of the 1536x1024 stall) and counter line
base = Image.open('public/art/stall2/stall-empty-patched.png').convert('RGBA')
full = Image.open('public/art/stall2/stall-pile-src.png').convert('RGBA')
pm = Image.open('public/art/stall2/pile-mask.png').convert('L').filter(ImageFilter.GaussianBlur(1.2))
pile = full.copy(); pile.putalpha(pm); bb = pm.getbbox(); pile = pile.crop(bb); PBOT = bb[3]
st = base.crop((0, 0, 1536, FH)); W, H = st.size
fg = st.crop((0, OV, W, H)); g = np.full((fg.size[1], W), 255, np.uint8); g[:10] = np.linspace(0, 255, 10)[:, None]; fg.putalpha(Image.fromarray(g))

def grade(im):
    a = im.split()[3]
    arr = np.asarray(ImageEnhance.Color(im.convert('RGB')).enhance(1.08)).astype(float) * np.array([1.04, 0.98, 0.88])
    o = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).convert('RGBA'); o.putalpha(a); return o

def shadow(c, fig, p, k=0.45):
    a = fig.split()[3].filter(ImageFilter.GaussianBlur(18)); sh = Image.new('RGBA', fig.size, (20, 8, 2, 0))
    sh.putalpha(a.point(lambda v: int(v * k))); c.alpha_composite(sh, (p[0] + 14, p[1] + 10))

hero = grade(Image.open('public/art/hero/hero-base-stall.png').convert('RGBA'))
hh = int(H * 0.72); hw = int(hero.width * hh / hero.height); hero = hero.resize((hw, hh), Image.LANCZOS)
hp = (0, OV + 60 - hh); herohead = hp[1] + int(33 * hh / 1024)

tiles = []
for f in sorted(glob.glob('public/art/portraits/*-stall.png')):
    b0 = Image.open(f).convert('RGBA'); a0 = np.asarray(b0)[..., 3]; h0, w0 = a0.shape
    bh = int(H * 0.74 * h0 / 983); bw = int(w0 * bh / h0); b = grade(b0).resize((bw, bh), Image.LANCZOS)
    headrow = int(np.argmax((a0 > 0).any(1)) * bh / h0)
    cut = int(np.argmax(a0[:, 0] > 0) * bh / h0)            # where his left side meets the picture edge
    bp = (W - bw, herohead + 25 - headrow)
    seam_top = bp[1] + cut
    # a small rug pile covers the lowest part of the seam
    ph = int(H * PILE_H); pw = int(pile.width * ph / pile.height)
    pile_top = PBOT - ph
    # above the pile, carve the straight cut into a soft curve so it reads as the edge of his sleeve
    if seam_top < pile_top + 20:
        a = np.asarray(b).copy(); span = max(pile_top + 20 - seam_top, 1); T = bw * CARVE
        ys = np.arange(bh); yy = ys + bp[1]
        k = np.clip((yy - seam_top) / span, 0, 1); trim = T * np.sin(np.pi / 2 * k); trim[yy > pile_top + 20] = T
        xs = np.arange(bw)[None, :]
        keep = np.clip(xs - trim[:, None] + 1, 0, 1)        # one-pixel soft edge
        a[..., 3] = (a[..., 3] * keep).astype(np.uint8); b = Image.fromarray(a)
    pl = pile.resize((pw, ph), Image.LANCZOS); pp = (bp[0] - int(pw * 0.6), PBOT - ph)
    out = st.copy()
    shadow(out, hero, hp); out.alpha_composite(hero, hp)
    shadow(out, b, bp); out.alpha_composite(b, bp)
    out.alpha_composite(fg, (0, OV))
    shadow(out, pl, pp, 0.35); out.alpha_composite(pl, pp)
    t = out.convert('RGB'); name = os.path.basename(f)[:-10]
    t.save(os.path.join(OUT, f'stall-{name}.jpg'), quality=86)
    tiles.append(t.crop((820, 200, 1536, 900)).resize((358, 350)))
cols = 5; sheet = Image.new('RGB', (358 * cols, 350 * ((len(tiles) + cols - 1) // cols)), 'black')
for i, t in enumerate(tiles): sheet.paste(t, ((i % cols) * 358, (i // cols) * 350))
sheet.save(os.path.join(OUT, 'all-buyers.jpg'), quality=82); print(len(tiles), 'buyers')
