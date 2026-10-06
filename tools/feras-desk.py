#!/usr/bin/env python3
"""Dr Feras explaining a case, from his chair: his book open on the desk, his hand at its edge,
Hassan's arms across the desk, the clinic behind (art/clinic/feras-desk-pov.webp, blank pages).

For each illness or injury the left page gets the condition's teaching plate with its caption and the
right page the opening of its chapter (as Hassan sees them: the book is turned towards him), both warped into the pages' perspective and printed onto the
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
LEFT = [(490, 446), (822, 443), (880, 712), (442, 720)]
RIGHT = [(892, 441), (1205, 433), (1388, 703), (935, 716)]
# a generous outline round his hand and cuff; inside it, whatever is not paper is hand
HAND = [(1070, 745), (1420, 745), (1672, 941), (1070, 941)]
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


M = 70  # page margin in the canvas: nothing printed runs to the paper's edge


def wrap_px(d, text, f, width):
    """break a paragraph into lines that fit `width` pixels in font `f`"""
    out, cur = [], ''
    for w in text.split():
        t = (cur + ' ' + w).strip()
        if d.textlength(t, font=f) <= width or not cur: cur = t
        else: out.append(cur); cur = w
    if cur: out.append(cur)
    return out


def head_rule(d, left, mid, right, W):
    f = font(24)
    d.text((M, 18), left, font=f, fill=INK)
    centre(d, 18, mid, f)
    d.text((W - M - d.textlength(right, font=f), 18), right, font=f, fill=INK)
    d.line([(M, 56), (W - M, 56)], fill=INK, width=2)


def plate_page(n, cid, name):
    W, H = PAGE
    pg = Image.new('RGB', PAGE, (255, 255, 255)); d = ImageDraw.Draw(pg)
    head_rule(d, str(7 + (n - 1) * 2), f'PLATE {roman(n)}', '', W)
    art = Image.open(os.path.join(ROOT, f'public/art/clinic/plates/{cid}.webp')).convert('RGB')
    # the whole plate, never cropped, inside the margins, with room under it for the caption
    bw, bh = W - 2 * M, H - 90 - 110
    sc = min(bw / art.width, bh / art.height)
    w, h = round(art.width * sc), round(art.height * sc)
    x0, y0 = (W - w) // 2, 90 + (bh - h) // 2
    pg.paste(art.resize((w, h), Image.LANCZOS), (x0, y0))
    d.rectangle([x0 - 3, y0 - 3, x0 + w + 2, y0 + h + 2], outline=INK, width=2)
    cap = f'Plate {roman(n)}. — {name}.'; f = font(32)
    while d.textlength(cap, font=f) > W - 2 * M: f = font(f.size - 2)
    centre(d, y0 + h + 24, cap, f)
    return pg


def text_page(n, name, kind, cause, symptom, doctor):
    W, H = PAGE
    pg = Image.new('RGB', PAGE, (255, 255, 255)); d = ImageDraw.Draw(pg)
    head_rule(d, '', 'INJURIES' if kind == 'injury' else 'DISEASES OF EGYPT', str(8 + (n - 1) * 2), W)
    centre(d, 84, f'CHAPTER {roman(n)}', font(28))
    t = name.upper(); f = font(48)
    while d.textlength(t, font=f) > W - 2 * M: f = font(f.size - 2)
    centre(d, 124, t, f)
    d.line([(W / 2 - 50, 196), (W / 2 + 50, 196)], fill=INK, width=2)
    fb, fh = font(33), font(33)
    y, lh, width = 224, 43, W - 2 * M
    for head, body in [('Aetiology.', cause), ('Symptoms.', symptom), ('Treatment.', doctor)]:
        hw = d.textlength(head + ' — ', font=fh)
        first, *rest = wrap_px(d, body, fb, width - hw - 30) or ['']
        rest = wrap_px(d, ' '.join(rest), fb, width) if rest else []
        if y > H - 60: break
        d.text((M + 30, y), head, font=fh, fill=INK, stroke_width=1, stroke_fill=INK)
        d.text((M + 30 + d.textlength(head, font=fh), y), ' — ' + first, font=fb, fill=INK)
        y += lh
        for ln in rest:
            if y > H - 60: return pg
            d.text((M, y), ln, font=fb, fill=INK); y += lh
        y += 12
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
        # the book is turned round for Hassan to read: from Feras's side both pages are upside down, and the
        # plate (Hassan's left page) lies on Feras's right
        for q, pg in [(R, plate_page(n, cid, name).rotate(180)), (L, text_page(n, name, kind, cause, symptom, doctor).rotate(180))]:
            ink = np.asarray(warp(pg.filter(ImageFilter.GaussianBlur(0.6)), q, base.size)).astype(float)
            printed = Image.fromarray((np.asarray(img).astype(float) * (0.08 + 0.92 * ink / 255)).astype(np.uint8))
            img.paste(printed, (0, 0), poly(q, base.size).filter(ImageFilter.GaussianBlur(1)))
        img.paste(base, (0, 0), hm)
        img.save(os.path.join(OUT, f'{cid}.webp'), 'WEBP', quality=84)
        print(cid, flush=True)


if __name__ == '__main__':
    main()
