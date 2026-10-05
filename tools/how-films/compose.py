#!/usr/bin/env python3
"""Step 2 of the "How it plays" films: turn the captured steps (tools/how-films/capture.mjs) into a
narrated film per feature.

Each step is one sharp screenshot, held for as long as the narrator takes to say its line (a stock
synthetic British voice, Kokoro bf_emma, the same narrator as the first-meeting films), with a very
slow push-in, a gold ring where the finger taps at the end, and a soft cross-fade into the next screen.
No live screen recording, so nothing half-loaded and nothing jerky.

Writes public/video/how/<id>.mp4 (with sound), <id>-loop.mp4 (a short silent moving thumbnail),
<id>.webp (poster), and src/data/howFilms.ts (titles, lengths and the caption for each line).
  python3 tools/how-films/compose.py --shots <dir> --model <kokoro dir> [ids...]
"""
import argparse, json, os, subprocess
import numpy as np
import soundfile as sf
from PIL import Image, ImageDraw, ImageFilter
from kokoro_onnx import Kokoro

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
OUT = os.path.join(ROOT, 'public', 'video', 'how')
ORDER = ['stall', 'district', 'rashid', 'inspect', 'travel', 'caravan', 'cafe', 'news']
W, H = 540, 1168          # output frame: the 390 x 844 phone screen at about 1.4x
FPS = 24
SR = 24000
VOICE, SPEED, LANG = 'bf_emma', 0.95, 'en-gb'
LEAD, TAIL, FADE, RING = 0.45, 1.0, 0.45, 0.9   # seconds: before the line, after it, cross-fade, tap ring
MIN_STEP = 3.4
FIX = {'bˈɪldʒɪn': 'bɪlɡˈiːn'}  # Bilgin, Turkish: bil-GEEN


def say(k, text):
    ph = k.tokenizer.phonemize(text, LANG)
    for a, b in FIX.items():
        ph = ph.replace(a, b)
    audio, sr = k.create(ph, voice=VOICE, speed=SPEED, lang=LANG, is_phonemes=True)
    assert sr == SR
    a = audio.astype(np.float32)
    idx = np.where(np.abs(a) > 0.004)[0]
    return a[max(0, idx[0] - 600): idx[-1] + 2400] if len(idx) else a


def ring(img, x, y, t):
    """A finger tap: a dot that presses in, and a ring that blooms out. t runs 0..1."""
    d = ImageDraw.Draw(img, 'RGBA')
    press = min(1, t / 0.25)
    r0 = 26
    a = int(200 * (1 - max(0, t - 0.55) / 0.45)) if t > 0.55 else 200
    d.ellipse([x - r0 * press, y - r0 * press, x + r0 * press, y + r0 * press], fill=(255, 227, 138, int(0.55 * a)), outline=(255, 240, 190, a), width=4)
    if t > 0.25:
        u = (t - 0.25) / 0.75
        r = r0 + 46 * u
        d.ellipse([x - r, y - r, x + r, y + r], outline=(255, 227, 138, int(230 * (1 - u))), width=5)


def frame_of(shot, t, dur, focus):
    """The screenshot with a slow push-in toward `focus` (output px)."""
    # a gentle push-in as the screen arrives, then it holds still (still frames cost almost nothing)
    u = min(1, t / 1.6); z = 1.0 + 0.03 * (1 - (1 - u) ** 3)
    fx, fy = focus
    cw, ch = W / z, H / z
    x0 = min(max(fx - cw / 2, 0), W - cw); y0 = min(max(fy - ch / 2, 0), H - ch)
    return shot.resize((W, H), Image.BICUBIC, box=(x0 * shot.width / W, y0 * shot.height / H, (x0 + cw) * shot.width / W, (y0 + ch) * shot.height / H)), (x0, y0, z)


def build(k, shots_dir, fid):
    meta = json.load(open(os.path.join(shots_dir, fid, 'steps.json')))
    steps = meta['steps']
    voices = [say(k, s['say']) for s in steps]
    durs = [max(MIN_STEP, LEAD + len(v) / SR + TAIL + (RING if s['tap'] else 0)) for s, v in zip(steps, voices)]
    starts = np.cumsum([0] + durs[:-1]).tolist()
    total = sum(durs)
    # narration track
    audio = np.zeros(int((total + 0.5) * SR), dtype=np.float32)
    cues = []
    for s0, v, st in zip(starts, voices, steps):
        a = int((s0 + LEAD) * SR)
        audio[a:a + len(v)] += v
        cues.append({'start': round(s0 + LEAD, 2), 'end': round(s0 + LEAD + len(v) / SR, 2), 'text': st['say']})
    peak = np.abs(audio).max() or 1
    audio *= 0.89 / peak
    wav = f'/tmp/how-{fid}.wav'
    sf.write(wav, audio, SR)
    shots = [Image.open(s['shot']).convert('RGB') for s in steps]
    taps = [([s['tap'][0] * W / 390, s['tap'][1] * H / 844] if s['tap'] else None) for s in steps]
    focus = [t if t else [W / 2, H * 0.42] for t in taps]
    out = os.path.join(OUT, f'{fid}.mp4')
    ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-i', wav,
                           '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-tune', 'stillimage', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '80k', '-ac', '1',
                           '-shortest', '-movflags', '+faststart', out], stdin=subprocess.PIPE)
    n = int(total * FPS)
    for f in range(n):
        t = f / FPS
        i = max(j for j in range(len(steps)) if starts[j] <= t + 1e-9)
        lt = t - starts[i]
        img, (x0, y0, z) = frame_of(shots[i], lt, durs[i], focus[i])
        if taps[i] and lt > durs[i] - RING:
            u = (lt - (durs[i] - RING)) / RING
            tx, ty = (taps[i][0] - x0) * z, (taps[i][1] - y0) * z
            img = img.copy(); ring(img, tx, ty, u)
        # cross-fade from the screen before
        if i > 0 and lt < FADE:
            prev, _ = frame_of(shots[i - 1], durs[i - 1], durs[i - 1], focus[i - 1])
            img = Image.blend(prev, img, lt / FADE)
        ff.stdin.write(img.tobytes())
    ff.stdin.close(); ff.wait()
    # poster: the second screen (the feature itself), and a light moving thumbnail for the tile
    shots[min(1, len(shots) - 1)].resize((W // 2, H // 2), Image.LANCZOS).save(os.path.join(OUT, f'{fid}.webp'), 'WEBP', quality=72)
    # (from the second screen: every film opens on the same Giza map)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{starts[1] if len(starts) > 1 else 0:.2f}', '-i', out, '-an', '-vf', f"setpts=PTS/1.6,crop={W}:{W}:0:{int(H * 0.08)},scale=240:240:flags=lanczos,fps=15",
                    '-t', '16', '-c:v', 'libx264', '-preset', 'medium', '-crf', '30', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', os.path.join(OUT, f'{fid}-loop.mp4')], check=True)
    print(f'{fid}: {len(steps)} steps, {total:.1f} s, {os.path.getsize(out) // 1024} KB', flush=True)
    return {'id': fid, 'title': meta['title'], 'length': round(total, 2), 'cues': cues}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--shots', required=True)
    ap.add_argument('--model', required=True)
    ap.add_argument('ids', nargs='*')
    a = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    k = Kokoro(os.path.join(a.model, 'kokoro-v1.0.onnx'), os.path.join(a.model, 'voices-v1.0.bin'))
    ts = os.path.join(ROOT, 'src', 'data', 'howFilms.ts')
    films = {}
    if os.path.exists(ts):
        src = open(ts).read(); s0 = src.find('= {')
        if s0 >= 0: films = json.loads(src[s0 + 2: src.rindex('}') + 1])
    for fid in (a.ids or ORDER):
        if os.path.exists(os.path.join(a.shots, fid, 'steps.json')):
            films[fid] = build(k, a.shots, fid)
    films = {f: films[f] for f in ORDER if f in films}
    with open(ts, 'w') as f:
        f.write('// Generated by tools/how-films/compose.py: each "How it plays" film, its length, and the narrator\'s lines\n')
        f.write('// with when each is said (seconds into public/video/how/<id>.mp4). Stock synthetic voice.\n')
        f.write('export interface HowCue { start: number; end: number; text: string }\n')
        f.write('export interface HowFilm { id: string; title: string; length: number; cues: HowCue[] }\n')
        f.write('export const HOW_FILMS: Record<string, HowFilm> = ')
        f.write(json.dumps(films, indent=1, ensure_ascii=False))
        f.write(';\n')


if __name__ == '__main__':
    main()
