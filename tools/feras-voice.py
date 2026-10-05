#!/usr/bin/env python3
"""Dr Feras reads his own words for each illness and injury (src/game/systems/disease.ts, the `doctor`
line): a stock synthetic British voice (Kokoro bm_daniel), one MP3 per condition in public/audio/feras/.
  python3 tools/feras-voice.py --model <kokoro dir> [ids...]"""
import argparse, os, re, subprocess
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
ROOT = os.path.join(os.path.dirname(__file__), '..')
ap = argparse.ArgumentParser(); ap.add_argument('--model', required=True); ap.add_argument('ids', nargs='*'); a = ap.parse_args()
src = open(os.path.join(ROOT, 'src/game/systems/disease.ts')).read()
rows = re.findall(r'\{ id: "([a-z]+)".*?doctor: "((?:[^"\\]|\\.)*)"', src)
k = Kokoro(os.path.join(a.model, 'kokoro-v1.0.onnx'), os.path.join(a.model, 'voices-v1.0.bin'))
for cid, text in rows:
    if a.ids and cid not in a.ids: continue
    out = os.path.join(ROOT, 'public/audio/feras', f'{cid}.mp3')
    audio, sr = k.create(text.replace('\\u2019', '’'), voice='bm_daniel', speed=0.95, lang='en-gb')
    x = audio.astype(np.float32); idx = np.where(np.abs(x) > 0.004)[0]; x = x[max(0, idx[0] - 600): idx[-1] + 4800]
    sf.write('/tmp/feras.wav', x / (np.abs(x).max() or 1) * 0.89, sr)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', '/tmp/feras.wav', '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '56k', out], check=True)
    print(cid, round(len(x) / sr, 1), flush=True)
