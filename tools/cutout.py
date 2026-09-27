"""Cut a subject out of a painting, for sprites like Saffron on the stall rug.

  pip install "rembg[cpu]" pillow
  python tools/cutout.py public/art/saffron.jpg public/art/saffron-stall.png --soften-right 46

Uses the BiRefNet model (downloaded on first run). A photo that crops the subject at an
edge leaves a straight line there; --soften-right/--soften-top fade that edge over N pixels
(of the 4x-upscaled working image). Edges that meet the scene's own edge need no softening.
"""
import argparse
from PIL import Image
from rembg import remove, new_session

p = argparse.ArgumentParser()
p.add_argument('src'); p.add_argument('dst')
p.add_argument('--soften-right', type=int, default=0)
p.add_argument('--soften-top', type=int, default=0)
a = p.parse_args()

im = Image.open(a.src).convert('RGB')
im = im.resize((im.width * 4, im.height * 4), Image.LANCZOS)
out = remove(im, session=new_session('birefnet-general')).convert('RGBA')
alpha = out.getchannel('A'); px = alpha.load(); w, h = out.size

def ease(k): return k * k * (3 - 2 * k)
for x in range(max(0, w - a.soften_right), w):
    k = ease((w - 1 - x) / a.soften_right)
    for y in range(h): px[x, y] = int(px[x, y] * k)
for y in range(min(h, a.soften_top)):
    k = ease(y / a.soften_top)
    for x in range(w): px[x, y] = int(px[x, y] * k)
out.putalpha(alpha)
out = out.crop(out.getbbox())
out = out.resize((out.width // 2, out.height // 2), Image.LANCZOS)
out.save(a.dst, optimize=True)
print(a.dst, out.size)
