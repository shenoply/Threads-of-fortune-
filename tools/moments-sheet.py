#!/usr/bin/env python3
"""The stall's small moments (tools/blender-moments.py) made to sit in the painting, and packed as sprite sheets.

  python3 tools/moments-sheet.py <render-dir>

For each frame: a light painterly pass (a slight softening, a matte warm grade, a fixed grain so it does
not shimmer, and a soft dark outline like the painted props), steam over the tea, a halo round the lamp's
flame. Each moment becomes one horizontal strip, public/art/stall2/moments/<name>.webp, played with a CSS
steps() animation (Scene.tsx, StallMoments). The rendered frames are kept in art-src/moments/render.
"""
import math, random, shutil, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public' / 'art' / 'stall2' / 'moments'
KEEP = ROOT / 'art-src' / 'moments' / 'render'
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else KEEP

# where the steam leaves the glass, in the tea frame's pixels (from the camera in blender-moments.py)
TEA_RIM = (137, 182)


def premul_blur(im, r):
    a = np.asarray(im).astype(np.float32) / 255
    p = a.copy(); p[..., :3] *= p[..., 3:4]
    out = np.stack([np.asarray(Image.fromarray((p[..., c] * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(np.float32) / 255 for c in range(4)], -1)
    al = out[..., 3:4]
    out[..., :3] = np.where(al > 1e-4, out[..., :3] / np.maximum(al, 1e-4), 0)
    return Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8), 'RGBA')


def paint(im, grain):
    # the counter's shadow catcher leaves a faint alpha over the whole frame: drop the faintest, and
    # give the shadow one warm dark colour so the grade and grain below never lighten it
    a = np.asarray(im).astype(np.float32)
    a[..., 3] = np.where(a[..., 3] < 14, 0, a[..., 3])
    shade = a[..., :3].max(-1) < 34
    a[..., :3] = np.where(shade[..., None], np.array([30, 19, 10], np.float32), a[..., :3])
    im = premul_blur(Image.fromarray(a.astype(np.uint8), 'RGBA'), 0.55)
    a = np.asarray(im).astype(np.float32)
    rgb, al = a[..., :3], a[..., 3]
    shade = rgb.max(-1) < 40
    # matte and warm: less contrast and saturation, a little lift in the darks
    lum = rgb @ np.array([0.3, 0.59, 0.11], np.float32)
    rgb = lum[..., None] + (rgb - lum[..., None]) * 0.86
    rgb = 128 + (rgb - 128) * 0.9 + 6
    rgb *= np.array([1.03, 1.0, 0.94], np.float32)
    rgb += grain[..., None] * (al[..., None] > 0)
    a[..., :3] = np.where(shade[..., None], a[..., :3], np.clip(rgb, 0, 255))
    body = Image.fromarray(a.astype(np.uint8), 'RGBA')
    # a soft dark outline round the solid parts (not round the cast shadow)
    solid = Image.fromarray(((al > 190) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(0.9))
    line = Image.new('RGBA', im.size, (46, 28, 14, 0)); line.putalpha(solid.point(lambda v: int(v * 0.42)))
    line.alpha_composite(body)
    return line


def steam(im, i, frames):
    k = min(1.0, max(0.0, (i - 11) / 5)) * max(0.0, 1 - max(0, i - 22) / 5)
    if k <= 0:
        return im
    lay = Image.new('L', im.size, 0); d = ImageDraw.Draw(lay)
    x0, y0 = TEA_RIM
    for w in range(3):
        ph = i * 0.55 + w * 2.1
        pts = []
        for s in range(14):
            t = s / 13
            x = x0 + (w - 1) * 3 + math.sin(ph + t * 4.2) * (2 + 7 * t) + 5 * t * (w - 1)
            y = y0 - 4 - t * 58 - (i % 3) * 0.6
            pts.append((x, y))
        for s in range(len(pts) - 1):
            t = s / 13
            d.line([pts[s], pts[s + 1]], fill=int(150 * (1 - t) ** 1.3 * (0.6 + 0.4 * math.sin(t * 3 + w))), width=3)
    lay = lay.filter(ImageFilter.GaussianBlur(2.2)).point(lambda v: int(v * k * 0.75))
    mist = Image.new('RGBA', im.size, (250, 244, 232, 0)); mist.putalpha(lay)
    out = im.copy(); out.alpha_composite(mist)
    return out


def halo(im):
    a = np.asarray(im).astype(np.float32)
    bright = ((a[..., :3].mean(-1) > 215) & (a[..., 3] > 100)).astype(np.float32) * 255
    g = np.asarray(Image.fromarray(bright.astype(np.uint8)).filter(ImageFilter.GaussianBlur(9))).astype(np.float32)
    g = np.clip(g * 2.2, 0, 160)
    glow = Image.new('RGBA', im.size, (255, 176, 92, 0)); glow.putalpha(Image.fromarray(g.astype(np.uint8)))
    glow.alpha_composite(im)
    return glow


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    KEEP.mkdir(parents=True, exist_ok=True)
    for name in ('tea', 'coins', 'lamp'):
        files = sorted(SRC.glob(f'{name}-*.png'))
        if not files:
            print('no frames for', name); continue
        if SRC.resolve() != KEEP.resolve():
            for f in files: shutil.copy(f, KEEP / f.name)
        w, h = Image.open(files[0]).size
        rnd = np.random.default_rng(7)
        grain = rnd.normal(0, 4.5, (h, w)).astype(np.float32)
        sheet = Image.new('RGBA', (w * len(files), h), (0, 0, 0, 0))
        for i, f in enumerate(files):
            im = paint(Image.open(f).convert('RGBA'), grain)
            if name == 'tea': im = steam(im, i, len(files))
            if name == 'lamp': im = halo(im)
            sheet.paste(im, (i * w, 0))
        dst = OUT / f'{name}.webp'
        sheet.save(dst, 'WEBP', quality=76, alpha_quality=90, method=6)
        print(f'{dst.relative_to(ROOT)}: {len(files)} frames of {w}x{h}, {dst.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
