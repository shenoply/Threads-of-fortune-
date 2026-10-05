#!/usr/bin/env python3
"""Ready outfits: the PNG masters (white background, 1024 x 1536) -> transparent game WebPs.
  python3 tools/outfit-art.py <folder of masters> [--cut <folder of cutouts>]
The masters are named NN-<id>-full-body.png and NN-<id>-stall.png. The background is taken off with
rembg (isnet-general-use) and the result saved as public/art/hero/outfits/<id>-full.webp / -stall.webp."""
import glob, os, re, sys
from PIL import Image

def oid_of(name):
    m = re.match(r'\d\d-(.*)-(full-body|stall)$', name)
    oid, kind = m.group(1), m.group(2)
    if kind == 'stall' and oid.endswith('-stall-stall'): oid = oid[:-6]
    return oid, ('full' if kind == 'full-body' else 'stall')

def main():
    src = sys.argv[1]
    cut = sys.argv[sys.argv.index('--cut') + 1] if '--cut' in sys.argv else None
    os.makedirs('public/art/hero/outfits', exist_ok=True)
    sess = None
    for f in sorted(glob.glob(os.path.join(cut or src, '*.png'))):
        oid, kind = oid_of(os.path.basename(f)[:-4])
        out = f'public/art/hero/outfits/{oid}-{kind}.webp'
        if os.path.exists(out): continue
        if cut: im = Image.open(f)
        else:
            from rembg import remove, new_session
            sess = sess or new_session('isnet-general-use')
            im = remove(Image.open(f).convert('RGB'), session=sess, alpha_matting=True, alpha_matting_foreground_threshold=240, alpha_matting_background_threshold=20, alpha_matting_erode_size=8)
        im.convert('RGBA').resize((768, 1152), Image.LANCZOS).save(out, 'WEBP', quality=82, method=4)
        print(out, flush=True)

if __name__ == '__main__':
    main()
