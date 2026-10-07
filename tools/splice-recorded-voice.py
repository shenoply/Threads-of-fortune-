#!/usr/bin/env python3
"""Put a real recorded voice into a character's audio sprite.

The hero's main lines were read aloud by Hassan himself (tools/voice-recordings/hassan/A-D.m4a, one
file per section of the recording script). clips.json says where each line sits in its file (found by
transcribing the takes and matching them to the script, then checked by ear-length). This cuts each
line out, cleans it (rumble filter, gentle fades, one gain per file so his own dynamics stay) and
writes it into voices/<speaker>.mp3 in place of the synthetic clip with the same id; every other
clip in the sprite is kept as it is. Run after the recording or the script changes:
    python3 tools/splice-recorded-voice.py seller tools/voice-recordings/hassan
    python3 tools/splice-recorded-voice.py rashid tools/voice-recordings/rashid --only-recorded   (one file per line; only these lines are voiced)
"""
import json, os, subprocess, sys
import numpy as np

ROOT = os.path.join(os.path.dirname(__file__), '..', 'public', 'voices')
SR = 22050
GAP = 0.6
ENC_DELAY = 1105 / SR
TARGET = -20.0  # LUFS, the level the synthetic voices were made at


def decode(path, sr=SR):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def loudness(path):
    out = subprocess.run(['ffmpeg', '-hide_banner', '-i', path, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    line = [l for l in out.splitlines() if l.strip().startswith('I:')][-1]
    return float(line.split()[1])


def highpass(x, f=80.0):
    # one-pole high-pass: takes out desk thumps and room rumble, leaves the voice alone
    a = np.exp(-2 * np.pi * f / SR)
    y = np.empty_like(x); prev_x = 0.0; prev_y = 0.0
    for i, v in enumerate(x):
        prev_y = a * (prev_y + v - prev_x); prev_x = v; y[i] = prev_y
    return y


def main():
    speaker, folder = sys.argv[1], sys.argv[2]
    man_path = os.path.join(ROOT, 'manifest.json')
    manifest = json.load(open(man_path))
    sprite = manifest['sprites'][speaker]
    old = decode(os.path.join(ROOT, os.path.basename(sprite['file'])))
    clips = json.load(open(os.path.join(folder, 'clips.json')))
    takes, gains = {}, {}
    # a take is either one section of a long recording (sec A, B... as .m4a) or a single line in its own
    # file (an ElevenLabs export, say: 'file' with no start/end, the whole file is the line)
    for c in clips:
        if 'file' in c:
            f = os.path.join(folder, c['file'])
            takes[c['file']] = decode(f)
            gains[c['file']] = 10 ** ((TARGET - loudness(f)) / 20)
    for sec in sorted({c['sec'] for c in clips if 'sec' in c} | {p['sec'] for c in clips for p in c.get('parts', [])}):
        f = os.path.join(folder, f'{sec}.m4a')
        takes[sec] = decode(f)
        gains[sec] = 10 ** ((TARGET - loudness(f)) / 20)
    real = {}
    fade = int(0.012 * SR)

    def cut(sec, start, end, pad=(0.12, 0.22)):
        x = takes[sec]
        a = max(0, int((start - pad[0]) * SR)); b = min(len(x), int((end + pad[1]) * SR))
        y = highpass(x[a:b]) * gains[sec]
        y[:fade] *= np.linspace(0, 1, fade); y[-fade:] *= np.linspace(1, 0, fade)
        return y

    for c in clips:
        if 'parts' in c:
            # a line put together from pieces he said elsewhere ("Let me show you" + a rug's name)
            gap = np.zeros(int(0.1 * SR), dtype=np.float32)
            pieces = []
            for k, p in enumerate(c['parts']):
                if k: pieces.append(gap)
                pieces.append(cut(p['sec'], p['start'], p['end'], p.get('pad', (0.12, 0.22))))
            y = np.concatenate(pieces)
        elif 'file' in c:
            # the whole file, its leading and trailing silence trimmed to a natural breath
            x = takes[c['file']]
            loud = np.where(np.abs(x) > 0.02)[0]
            a = max(0, loud[0] - int(0.08 * SR)) if len(loud) else 0
            b = min(len(x), loud[-1] + int(0.25 * SR)) if len(loud) else len(x)
            y = highpass(x[a:b]) * gains[c['file']]
            y[:fade] *= np.linspace(0, 1, fade); y[-fade:] *= np.linspace(1, 0, fade)
        else:
            y = cut(c['sec'], c['start'], c['end'])
        peak = np.abs(y).max()
        if peak > 0.95: y *= 0.95 / peak
        real[c['id']] = y.astype(np.float32)
    # the sprite again, clip by clip: the recorded take where there is one, the old clip otherwise
    # --only-recorded: drop every synthetic clip, so a character with a new voice speaks only in it (captions carry the rest)
    only = '--only-recorded' in sys.argv
    order = list(real) if only else list(sprite['clips'].keys()) + [k for k in real if k not in sprite['clips']]
    silence = np.zeros(int(GAP * SR), dtype=np.float32)
    parts, new, t = [silence], {}, GAP
    for cid in order:
        if cid in real:
            y = real[cid]
        else:
            s, d = sprite['clips'][cid]
            # decoding keeps the encoder delay, so a clip sits at its manifest time as written
            y = old[int(s * SR):int((s + d) * SR)]
        new[cid] = [round(t + ENC_DELAY, 3), round(len(y) / SR, 3)]
        parts += [y, silence]; t += (len(y) + len(silence)) / SR
    wav = f'/tmp/{speaker}-sprite.wav'
    from scipy.io import wavfile
    wavfile.write(wav, SR, np.concatenate(parts))
    out = os.path.join(ROOT, f'{speaker}.mp3')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-ar', str(SR), '-codec:a', 'libmp3lame', '-b:a', '32k', '-write_xing', '0', out], check=True)
    sprite['clips'] = new
    json.dump(manifest, open(man_path, 'w'), separators=(',', ':'))
    print(f'{speaker}: {len(real)} recorded lines spliced in, {len(new)} clips, {os.path.getsize(out) // 1024} KB')


if __name__ == '__main__':
    main()
