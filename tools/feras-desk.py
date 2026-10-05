#!/usr/bin/env python3
"""Dr Feras explaining a case, from his chair: his book open on the desk, his finger on the page,
Hassan's arms across the desk, the clinic behind (art/clinic/feras-desk-pov.webp, blank pages).

For each illness or injury the left page gets the condition's teaching plate with its caption and the
right page the opening of its chapter, both warped into the pages' perspective and printed onto the
paper (multiply, so the paper's light and the hand's shadow stay), and his hand is laid back on top.

  python3 tools/feras-desk.py   ->  public/art/clinic/desk/<id>.webp
"""
import os, re, textwrap
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.join(os.path.dirname(__file__), '..')
BASE = os.path.join(ROOT, 'public/art/clinic/feras-desk-pov.webp')
OUT = os.path.join(ROOT, 'public/art/clinic/desk')
FONT = '/usr/share/fonts/truetype/google-fonts/Lora-Variable.ttf'
W0 = 1672  # the width the quads below were measured at
# printable area of each page (TL, TR, BR, BL), inside the margins
LEFT = [(478, 445), (815, 442), (808, 728), (428, 738)]
RIGHT = [(885, 440), (1205, 436), (1385, 712), (880, 724)]
# a generous outline round his hand and cuff; inside it, whatever is not paper is hand
HAND = [(688, 560), (800, 572), (880, 605), (960, 650), (1012, 718), (1600, 840), (1672, 941), (900, 941), (760, 805), (700, 725), (688, 600)]
PAGE = (800, 1000)
INK = (38, 24, 12)


def coeffs(dst, src):
    A, B = [], []
    for (x, y), (u, v) in zip(dst, src):
        A += [[x, y, 1, 0, 0, 0, -u * x, -u * y], [0, 0, 0, x, y, 1, -v * x, -v * y]]
        B += [u, v]
    return np.linalg.solve(np.array(A, float), np.array(B, float)).tolist()


def warp(img, quad, size):
    w, h = img.size
    return img.transform(size, Image.PERSPECTIVE, coeffs(quad, [(0, 0), (w, 0), (w, h), (0, h)]), Image.BICUBIC, fillcolor=(255, 255, 255))


def poly(quad, size):
    m = Image.new('L', size, 0); ImageDraw.Draw(m).polygon(quad, fill=255); return m


ROMAN = [(40, 'XL'), (10, 'X'), (9, 'IX'), (5, 'V'), (4, 'IV'), (1, 'I')]
def roman(n):
    s = ''
    for v, r in ROMAN:
        while n >= v: s += r; n -= v
    return s


def font(n): return ImageFont.truetype(FONT, n)


def centre(d, y, s, f, W=PAGE[0]):
    d.text(((W - d.textlength(s, font=f)) / 2, y), s, font=f, fill=INK)


def plate_page(n, cid, name):
    W, H = PAGE
    pg = Image.new('RGB', PAGE, (255, 255, 255)); d = ImageDraw.Draw(pg)
    d.text((20, 10), str(7 + (n - 1) * 2), font=font(26), fill=INK)
    centre(d, 10, 'PLATE ' + roman(n), font(26))
    d.line([(20, 50), (W - 20, 50)], fill=INK, width=2)
    art = Image.open(os.path.join(ROOT, f'public/art/clinic/plates/{cid}.webp')).convert('RGB')
    h = 780; w = round(art.width * h / art.height)
    if w > W - 60: w = W - 60; h = round(art.height * w / art.width)
    x0, y0 = (W - w) // 2, 80
    pg.paste(art.resize((w, h), Image.LANCZOS), (x0, y0))
    d.rectangle([x0 - 2, y0 - 2, x0 + w + 1, y0 + h + 1], outline=INK, width=2)
    cap = f'Plate {roman(n)}. — {name}.'; f = font(32)
    while d.textlength(cap, font=f) > W - 60: f = font(f.size - 2)
    centre(d, y0 + h + 22, cap, f)
    return pg


def text_page(n, name, kind, cause, symptom, doctor):
    W, H = PAGE
    pg = Image.new('RGB', PAGE, (255, 255, 255)); d = ImageDraw.Draw(pg)
    run = 'INJURIES' if kind == 'injury' else 'DISEASES OF EGYPT'
    centre(d, 10, run, font(24)); d.text((W - 60, 10), str(8 + (n - 1) * 2), font=font(26), fill=INK)
    d.line([(20, 50), (W - 20, 50)], fill=INK, width=2)
    centre(d, 78, f'CHAPTER {roman(n)}', font(30))
    t = name.upper(); f = font(46)
    while d.textlength(t, font=f) > W - 60: f = font(f.size - 2)
    centre(d, 120, t, f)
    d.line([(W / 2 - 50, 186), (W / 2 + 50, 186)], fill=INK, width=2)
    y = 212; fb = font(36)
    for head, body in [('Aetiology.', cause), ('Symptoms.', symptom), ('Treatment.', doctor)]:
        lines = textwrap.wrap(f'{head} — {body}', width=34)
        for i, ln in enumerate(lines):
            if y > H - 50: return pg
            if i == 0:
                d.text((70, y), head, font=font(36), fill=INK, stroke_width=1, stroke_fill=INK)
                d.text((70 + d.textlength(head + ' ', font=fb), y), ln[len(head) + 1:], font=fb, fill=INK)
            else:
                d.text((30, y), ln, font=fb, fill=INK)
            y += 48
        y += 10
    return pg


def main():
    src = open(os.path.join(ROOT, 'src/game/systems/disease.ts')).read()
    rows = re.findall(r'\{ id: "([a-z]+)", name: "((?:[^"\\]|\\.)*)", kind: "(disease|injury)".*?cause: "((?:[^"\\]|\\.)*)", symptom: "((?:[^"\\]|\\.)*)", doctor: "((?:[^"\\]|\\.)*)"', src)
    order = [r for r in rows if r[2] == 'disease'] + [r for r in rows if r[2] == 'injury']
    base = Image.open(BASE).convert('RGB')
    k = base.width / W0
    sc = lambda q: [(x * k, y * k) for x, y in q]
    L, R, Hq = sc(LEFT), sc(RIGHT), sc(HAND)
    a = np.asarray(base).astype(float)
    # hand: inside the outline, pixels darker / redder than the paper around them
    lum = a.mean(2); paper = np.asarray(Image.fromarray(lum.astype(np.uint8)).filter(ImageFilter.MaxFilter(31)).filter(ImageFilter.GaussianBlur(25))).astype(float)
    red = a[..., 0] - a[..., 2]
    # skin is far redder than the paper (green/red under .78; paper and its shadow sit at .84 and up)
    hand = ((a[..., 1] / np.maximum(a[..., 0], 1) < 0.70) | ((lum > 238) & (a[..., 2] > 225) & (np.arange(a.shape[1])[None, :] > 905 * k) & (np.arange(a.shape[0])[:, None] > 735 * k))) & (np.asarray(poly(Hq, base.size)) > 0)
    hm = Image.fromarray((hand * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(5)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(1.2))
    os.makedirs(OUT, exist_ok=True)
    for n, (cid, name, kind, cause, symptom, doctor) in enumerate(order, 1):
        img = base.copy()
        for q, pg in [(L, plate_page(n, cid, name)), (R, text_page(n, name, kind, cause, symptom, doctor))]:
            ink = np.asarray(warp(pg.filter(ImageFilter.GaussianBlur(0.6)), q, base.size)).astype(float)
            printed = Image.fromarray((np.asarray(img).astype(float) * (0.08 + 0.92 * ink / 255)).astype(np.uint8))
            img.paste(printed, (0, 0), poly(q, base.size).filter(ImageFilter.GaussianBlur(1)))
        img.paste(base, (0, 0), hm)
        img.resize((1280, round(1280 * base.height / base.width)), Image.LANCZOS).save(os.path.join(OUT, f'{cid}.webp'), 'WEBP', quality=82)
        print(cid, flush=True)


if __name__ == '__main__':
    main()
