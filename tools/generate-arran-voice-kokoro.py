"""Arran's 65 lines in a posher voice, offline: 1920s Received Pronunciation put into Kokoro's British
phonemes (the old "a" of that/back, a tapped r between vowels as in "ve-ry", a short final -y, cloth
and off said "clawth" and "orf"), a little slower and more deliberate, in a blend of two stock British
male voices. A generic synthetic voice: not a clone of anyone, no reference audio
(docs/ARRAN_VOICE.md).

  npx tsx tools/export-arran-lines.ts > /tmp/arran-lines.json
  python3 tools/generate-arran-voice-kokoro.py --model /tmp/kokoro /tmp/arran-lines.json
  node tools/build-arran-voice-manifest.mjs
"""
import argparse, json, os, re, subprocess, sys
import numpy as np
import imageio_ffmpeg
from kokoro_onnx import Kokoro

ROOT = os.path.join(os.path.dirname(__file__), '..', 'public')
VOICE = {'bm_george': 0.6, 'bm_fable': 0.4}
SPEED, LANG = 0.94, 'en-gb'
# Arran is said ARR-un (the phonemizer reads ar-RAN)
FIX = {'ɐɹˈan': 'ˈaɹən'}
VOWELS = 'aæɑɒɔəɛɜɪiʊuʌeoɐː'


def posh(ph: str) -> str:
    for a, b in FIX.items():
        ph = ph.replace(a, b)
    # the old RP TRAP vowel: "that", "back" with æ, not the modern flat a (leave the a of aɪ / aʊ alone)
    ph = re.sub(r'a(?![ɪʊː])', 'æ', ph)
    # a tapped r between vowels: "ve-ry", "inte-resting"
    ph = re.sub(rf'(?<=[{VOWELS}ˈˌ])ɹ(?=[ˈˌ]?[{VOWELS}])', 'ɾ', ph)
    # a short final -y: "very" ending in ɪ
    ph = re.sub(r'i(?=[\s,.?!;:]|$)', 'ɪ', ph)
    # cloth, off, lost, cross: the old long vowel
    ph = re.sub(r'ɒ(?=[fθs])', 'ɔː', ph)
    return ph


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--model', default='/tmp/kokoro'); ap.add_argument('lines'); a = ap.parse_args()
    k = Kokoro(os.path.join(a.model, 'kokoro-v1.0.onnx'), os.path.join(a.model, 'voices-v1.0.bin'))
    style = sum(k.get_voice_style(n) * w for n, w in VOICE.items())
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    lines = json.load(open(a.lines))
    for i, l in enumerate(lines):
        ph = posh(k.tokenizer.phonemize(l['text'], LANG))
        audio, sr = k.create(ph, voice=style, speed=SPEED, lang=LANG, is_phonemes=True)
        out = os.path.join(ROOT, l['file'] + '.mp3')
        os.makedirs(os.path.dirname(out), exist_ok=True)
        tmp = '/tmp/arran-line.f32'
        audio.astype(np.float32).tofile(tmp)
        subprocess.run([ff, '-y', '-loglevel', 'error', '-f', 'f32le', '-ar', str(sr), '-ac', '1', '-i', tmp, '-af', 'loudnorm=I=-18:TP=-2', '-b:a', '64k', out], check=True)
        if i % 10 == 0:
            print(f'{i}/{len(lines)} {l["id"]}: {ph[:70]}', flush=True)
    print(f'{len(lines)} lines')


if __name__ == '__main__':
    sys.exit(main())
