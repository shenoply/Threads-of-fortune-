#!/usr/bin/env python3
"""Dr Feras explaining a case: his book open on the desk, seen at an angle, his finger on the plate.

The desk, the open book and his pointing hand come from the approved clinic introduction (the atlas
shot, 7.5 s in; Hassan's bruised face is outside this crop). For each illness or injury the left page
gets that condition's teaching plate and the right page the opening of its chapter, both warped into
the pages' perspective and printed onto the paper (multiply), and his hand is laid back on top.

  python3 tools/feras-desk.py   ->  public/art/clinic/desk/<id>.webp
"""
import os, re, subprocess, textwrap
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.join(os.path.dirname(__file__), '..')
VIDEO = os.path.join(ROOT, 'public/video/clinic/feras-introduction.mp4')
OUT = os.path.join(ROOT, 'public/art/clinic/desk')
FONT = '/usr/share/fonts/truetype/google-fonts/Lora-Variable.ttf'
SCALE = 2                      # the crop is upscaled 2x
CROP = (300, 380, 800, 620)    # in the 1280 x 720 frame
# page corners in the upscaled crop (TL, TR, BR, BL)
LEFT = [(100, 184), (452, 147), (615, 305), (250, 343)]
RIGHT = [(458, 147), (655, 122), (880, 268), (625, 305)]
# his hand and pointing finger, kept from the original frame
HAND = [(205, 60), (330, 88), (420, 125), (462, 170), (478, 212), (452, 216), (420, 198), (330, 202), (258, 198), (205, 178)]


def frame():
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', '7.5', '-i', VIDEO, '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-'], capture_output=True, check=True).stdout
    from io import BytesIO
    im = Image.open(BytesIO(raw)).convert('RGB').crop(CROP)
    return im.resize((im.width * SCALE, im.height * SCALE), Image.LANCZOS).filter(ImageFilter.UnsharpMask(1.2, 60, 2))


def coeffs(dst, src):
    """perspective coefficients mapping output quad `dst` back onto rectangle corners `src`"""
    A, B = [], []
    for (x, y), (u, v) in zip(dst, src):
        A += [[x, y, 1, 0, 0, 0, -u * x, -u * y], [0, 0, 0, x, y, 1, -v * x, -v * y]]
        B += [u, v]
    return np.linalg.solve(np.array(A, float), np.array(B, float)).tolist()


def warp(img, quad, size):
    w, h = img.size
    return img.transform(size, Image.PERSPECTIVE, coeffs(quad, [(0, 0), (w, 0), (w, h), (0, h)]), Image.BICUBIC)


def quad_mask(quad, size):
    m = Image.new('L', size, 0); ImageDraw.Draw(m).polygon(quad, fill=255); return m


def paper(base, quad):
    """the page as blank paper: the lighting across it, without what was printed on it"""
    a = np.asarray(base).astype(float)
    pts = [(int(x + (cx - x) * 0.12), int(y + (cy - y) * 0.12)) for (x, y) in quad for (cx, cy) in [tuple(np.mean(quad, 0))]]
    cols = [a[max(0, y - 3): y + 4, max(0, x - 3): x + 4].reshape(-1, 3).mean(0) for x, y in pts]
    # bilinear blend of the four corner colours over a unit square, warped onto the page
    n = 64; u = np.linspace(0, 1, n)[None, :, None]; v = np.linspace(0, 1, n)[:, None, None]
    sq = (1 - u) * (1 - v) * cols[0] + u * (1 - v) * cols[1] + u * v * cols[2] + (1 - u) * v * cols[3]
    tile = Image.fromarray(np.clip(sq, 0, 255).astype(np.uint8))
    return warp(tile, quad, base.size)


def multiply(a, b):
    return Image.fromarray((np.asarray(a).astype(float) * np.asarray(b).astype(float) / 255).astype(np.uint8))


def chapter_text(n, name, cause, symptom):
    # a short page with large type: it is seen from across the desk and nearly edge-on
    W, H = 480, 420
    page = Image.new('RGB', (W, H), (255, 255, 255)); d = ImageDraw.Draw(page)
    ink = (40, 24, 10)
    f_s = ImageFont.truetype(FONT, 26); f_b = ImageFont.truetype(FONT, 30)
    def centre(y, s, f):
        w = d.textlength(s, font=f); d.text(((W - w) / 2, y), s, font=f, fill=ink)
    centre(26, f'CHAPTER {roman(n)}', f_s)
    title = name.upper(); fs = ImageFont.truetype(FONT, 44)
    while d.textlength(title, font=fs) > W - 50: fs = ImageFont.truetype(FONT, fs.size - 2)
    centre(62, title, fs)
    d.line([(W / 2 - 46, 122), (W / 2 + 46, 122)], fill=ink, width=3)
    y = 140
    for i, ln in enumerate(textwrap.wrap(f'Symptoms. — {symptom}', width=30)[:4]):
        d.text((36 if i else 58, y), ln, font=f_b, fill=ink); y += 38
    y += 8
    while y < H - 24:
        d.line([(36, y + 12), (W - 36 - (90 if (y // 26) % 4 == 3 else 0), y + 12)], fill=(120, 100, 80), width=6); y += 26
    return page


ROMAN = [(40, 'XL'), (10, 'X'), (9, 'IX'), (5, 'V'), (4, 'IV'), (1, 'I')]
def roman(n):
    s = ''
    for v, r in ROMAN:
        while n >= v: s += r; n -= v
    return s


def main():
    src = open(os.path.join(ROOT, 'src/game/systems/disease.ts')).read()
    rows = re.findall(r'\{ id: "([a-z]+)", name: "((?:[^"\\]|\\.)*)", kind: "(disease|injury)".*?cause: "((?:[^"\\]|\\.)*)", symptom: "((?:[^"\\]|\\.)*)"', src)
    order = [r for r in rows if r[2] == 'disease'] + [r for r in rows if r[2] == 'injury']
    base = frame()
    os.makedirs(OUT, exist_ok=True)
    hand = quad_mask(HAND, base.size).filter(ImageFilter.GaussianBlur(2))
    for n, (cid, name, kind, cause, symptom) in enumerate(order, 1):
        img = base.copy()
        for quad, art in [(LEFT, Image.open(os.path.join(ROOT, f'public/art/clinic/plates/{cid}.webp')).convert('RGB')), (RIGHT, chapter_text(n, name, cause, symptom))]:
            if quad is LEFT:
                # the plate sits inside the page's margins
                # the subject of the plate, cut wider than tall: the page is seen nearly edge-on, so a
                # portrait plate would be squashed flat
                w, h = art.size; cw, ch = int(w * .92), int(w * .92 / 1.25); y0 = max(0, int((h - ch) * .45))
                art = art.crop(((w - cw) // 2, y0, (w + cw) // 2, y0 + ch))
                pad = Image.new('RGB', (int(art.width * 1.14), int(art.height * 1.12)), (255, 255, 255)); pad.paste(art, ((pad.width - art.width) // 2, (pad.height - art.height) // 2)); art = pad
            blank = paper(base, quad)
            printed = multiply(blank, warp(art.filter(ImageFilter.GaussianBlur(0.5)), quad, base.size))
            img.paste(printed, (0, 0), quad_mask(quad, base.size).filter(ImageFilter.GaussianBlur(1)))
        img.paste(base, (0, 0), hand)
        img.save(os.path.join(OUT, f'{cid}.webp'), 'WEBP', quality=80)
        print(cid, flush=True)


if __name__ == '__main__':
    main()
