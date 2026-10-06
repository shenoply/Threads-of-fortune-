#!/usr/bin/env python3
"""Dr Feras and Hassan at his desk (the introduction film's seated shot), his Handbook open at the case
he is explaining: the plate on the left page, the opening of the chapter on the right, printed with the
same page layouts as the book shot across the desk (tools/feras-desk.py), so all three views agree.

The pages are first cleared (the film's lungs atlas is painted out with the paper's own light), then the
new pages are printed on (multiply), then his hand goes back on top (cut out by its colour).

  python3 tools/feras-desk-both.py   ->  public/art/clinic/both/<id>.webp
"""
import importlib.util, os, re, subprocess
from io import BytesIO
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.join(os.path.dirname(__file__), '..')
spec = importlib.util.spec_from_file_location('desk', os.path.join(os.path.dirname(__file__), 'feras-desk.py'))
desk = importlib.util.module_from_spec(spec); spec.loader.exec_module(desk)

VIDEO = os.environ.get('FERAS_SOURCE', os.path.join(ROOT, 'tools/sources/feras-introduction-original.mp4'))
OUT = os.path.join(ROOT, 'public/art/clinic/both')
S = 2  # work at twice the film's size
# the printable part of each page in the 1280x720 frame at 7.5 s (TL, TR, BR, BL), a margin in from the paper
LEFT = [(356, 486), (519, 457), (607, 527), (432, 553)]
RIGHT = [(535, 455), (650, 443), (733, 510), (628, 526)]
# the whole paper of each page (for clearing the atlas), and a box round his hand and finger
PAPER_L = [(343, 484), (526, 451), (620, 532), (425, 561)]
PAPER_R = [(527, 451), (660, 436), (746, 515), (622, 532)]
HAND = [(388, 412), (470, 414), (506, 430), (526, 452), (541, 470), (541, 487), (528, 489), (510, 483), (490, 485), (462, 477), (440, 471), (398, 469)]


def frame():
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', '7.5', '-i', VIDEO, '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-'], capture_output=True, check=True).stdout
    im = Image.open(BytesIO(raw)).convert('RGB')
    return im.resize((im.width * S, im.height * S), Image.LANCZOS).filter(ImageFilter.UnsharpMask(1.2, 60, 2))


def sc(q): return [(x * S, y * S) for x, y in q]


def blank(base, quad):
    """the paper with nothing printed on it: a smooth fill of the page's own light, sampled at its edges"""
    a = np.asarray(base).astype(float)
    cx, cy = np.mean(quad, 0)
    pts = [(int(x + (cx - x) * 0.18), int(y + (cy - y) * 0.18)) for x, y in quad]
    def paper_at(x, y, r=26):
        # the paper's own colour near a corner: the brighter, less coloured pixels (not ink, not the atlas)
        px = a[max(0, y - r): y + r, max(0, x - r): x + r].reshape(-1, 3)
        lum = px.mean(1); keep = px[(lum >= np.percentile(lum, 70)) & (px[:, 1] / np.maximum(px[:, 0], 1) > 0.82)]
        return np.median(keep if len(keep) > 10 else px, 0)
    cols = [paper_at(x, y) for x, y in pts]
    n = 64; u = np.linspace(0, 1, n)[None, :, None]; v = np.linspace(0, 1, n)[:, None, None]
    sq = (1 - u) * (1 - v) * cols[0] + u * (1 - v) * cols[1] + u * v * cols[2] + (1 - u) * v * cols[3]
    tile = Image.fromarray(np.clip(sq, 0, 255).astype(np.uint8))
    return desk.warp(tile, quad, base.size)


def main():
    src = open(os.path.join(ROOT, 'src/game/systems/disease.ts')).read()
    rows = re.findall(r'\{ id: "([a-z]+)", name: "((?:[^"\\]|\\.)*)", kind: "(disease|injury)".*?cause: "((?:[^"\\]|\\.)*)", symptom: "((?:[^"\\]|\\.)*)", doctor: "((?:[^"\\]|\\.)*)"', src)
    order = [r for r in rows if r[2] == 'disease'] + [r for r in rows if r[2] == 'injury']
    base = frame()
    L, R, PL, PR, H = sc(LEFT), sc(RIGHT), sc(PAPER_L), sc(PAPER_R), sc(HAND)
    a = np.asarray(base).astype(float)
    lum = a.mean(2); gr = a[..., 1] / np.maximum(a[..., 0], 1)
    paperish = (lum > 205) & (gr > 0.83)
    hand = ~paperish & (np.asarray(desk.poly(H, base.size)) > 0)
    hm = Image.fromarray((hand * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(5)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(1.5))
    # the cleared book, once
    clean = base.copy()
    for pq in (PL, PR):
        clean.paste(blank(base, pq), (0, 0), desk.poly(pq, base.size).filter(ImageFilter.GaussianBlur(2)))
    clean.paste(base, (0, 0), hm)
    os.makedirs(OUT, exist_ok=True)
    for n, (cid, name, kind, cause, symptom, doctor) in enumerate(order, 1):
        img = clean.copy()
        for q, pg in [(L, desk.plate_page(n, cid, name)), (R, desk.text_page(n, name, kind, cause, symptom, doctor))]:
            ink = np.asarray(desk.warp(pg.filter(ImageFilter.GaussianBlur(0.8)), q, base.size)).astype(float)
            printed = Image.fromarray((np.asarray(img).astype(float) * (0.1 + 0.9 * ink / 255)).astype(np.uint8))
            img.paste(printed, (0, 0), desk.poly(q, base.size).filter(ImageFilter.GaussianBlur(1)))
        img.paste(base, (0, 0), hm)
        img.resize((1600, 900), Image.LANCZOS).save(os.path.join(OUT, f'{cid}.webp'), 'WEBP', quality=82)
        print(cid, flush=True)


if __name__ == '__main__':
    main()
