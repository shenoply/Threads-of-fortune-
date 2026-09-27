#!/usr/bin/env python3
"""Prepare hero wardrobe pictures from ChatGPT for the game.

  python3 tools/layer-prep.py <pose> <image> [<image> ...]
      pose: wardrobe | stall | profile
      A file named hero-base-<pose>.* becomes the base body; anything else is a clothing
      layer named after the file (qeleshe.png -> public/art/hero/<pose>/qeleshe.png).

What it does to each image:
  1. If it has no real transparency (ChatGPT often paints a black, white or checkered
     "transparent" background), cuts the subject out with rembg; without rembg installed,
     falls back to removing a flat light background connected to the edges.
  2. Fits it onto the pose's canvas (1024x1536 or 1024x1024) without stretching.
  3. Saves an optimised PNG in the right folder.

Needs Pillow, numpy and scipy; rembg for dark or busy backgrounds:
  pip install pillow numpy scipy "rembg[cpu]" --break-system-packages
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

CANVAS = {'wardrobe': (1024, 1536), 'stall': (1024, 1536), 'profile': (1024, 1024)}
ROOT = Path(__file__).resolve().parent.parent / 'public' / 'art' / 'hero'


def has_real_alpha(im: Image.Image) -> bool:
    if im.mode != 'RGBA':
        return False
    a = np.asarray(im.getchannel('A'))
    return (a < 250).mean() > 0.02


def strip_background(im: Image.Image) -> Image.Image:
    """Make the light, low-colour background that touches the border transparent."""
    rgb = np.asarray(im.convert('RGB')).astype(np.int16)
    mx, mn = rgb.max(axis=2), rgb.min(axis=2)
    light_flat = (mn > 175) & ((mx - mn) < 22)  # white, off-white, checkerboard greys
    labels, _ = ndimage.label(light_flat)
    edge = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    bg = np.isin(labels, edge[edge > 0])
    # soften the cut by one pixel so edges do not look stamped out
    grown = ndimage.binary_dilation(bg, iterations=1) & ~bg
    alpha = np.full(bg.shape, 255, np.uint8)
    alpha[bg] = 0
    alpha[grown] = 128
    out = im.convert('RGBA')
    out.putalpha(Image.fromarray(alpha))
    return out


_session = None


def cut_out(im: Image.Image) -> Image.Image:
    """Cut the subject out of any background with rembg (isnet model, alpha matting)."""
    global _session
    try:
        from rembg import new_session, remove
    except ImportError:
        return strip_background(im)
    if _session is None:
        _session = new_session('isnet-general-use')
    return remove(im.convert('RGB'), session=_session, alpha_matting=True,
                  alpha_matting_foreground_threshold=240, alpha_matting_background_threshold=15,
                  alpha_matting_erode_size=8).convert('RGBA')


def fit_canvas(im: Image.Image, size) -> Image.Image:
    if im.size == size:
        return im
    w, h = size
    scale = min(w / im.width, h / im.height)
    resized = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    canvas = Image.new('RGBA', size, (0, 0, 0, 0))
    canvas.paste(resized, ((w - resized.width) // 2, (h - resized.height) // 2), resized)
    return canvas


def main():
    if len(sys.argv) < 3 or sys.argv[1] not in CANVAS:
        print(__doc__)
        sys.exit(1)
    pose, files = sys.argv[1], sys.argv[2:]
    for f in files:
        src = Path(f)
        im = Image.open(src).convert('RGBA')
        cleaned = not has_real_alpha(im)
        if cleaned:
            im = cut_out(im)
        im = fit_canvas(im, CANVAS[pose])
        if src.stem.startswith('hero-base'):
            dest = ROOT / f'hero-base-{pose}.png'
        else:
            dest = ROOT / pose / f'{src.stem}.png'
        dest.parent.mkdir(parents=True, exist_ok=True)
        im.save(dest, optimize=True)
        print(f'{src.name} -> {dest.relative_to(ROOT.parent.parent.parent)}{"  (background removed)" if cleaned else ""}')


if __name__ == '__main__':
    main()
