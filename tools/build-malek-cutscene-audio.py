"""Sound for Malek's story cutscene (docs/handoff/MALEK_VIDEO_AND_AUDIO_FOR_CLAUDE.md). The two clips
are silent; this builds one effects track per clip, timed to what is on screen (frame-checked at
8 fps), plus a bed for the reward still and Nabil's one line.

Sources, nothing borrowed from outside the project:
  - footsteps, the charcoal fire and the market murmur: clips already in the game's sound library
    (public/audio/fx, public/audio/amb; ESC-50 recordings under CC0 / CC BY, credited in
    public/audio/CREDITS.txt; which clips are used is printed below and kept in CUTSCENE_SOURCES)
  - coins, cloth, wood rattle and the orangutan's grunt: synthesised here, for this project
  - Nabil's line: the game's own Nabil voice (Kokoro am_onyx, a stock synthetic voice, not a clone)

  python3 tools/build-malek-cutscene-audio.py [--model /tmp/kokoro]
Writes public/audio/malek/cutscene-01.mp3, cutscene-02.mp3, cutscene-reward.mp3, cutscene-nabil.mp3.
"""
import argparse, os, subprocess, json
import numpy as np
import imageio_ffmpeg
from scipy.signal import butter, sosfilt

SR = 44100
ROOT = os.path.join(os.path.dirname(__file__), '..')
PUB = os.path.join(ROOT, 'public')
OUT = os.path.join(PUB, 'audio', 'malek')
FF = imageio_ffmpeg.get_ffmpeg_exe()
rng = np.random.default_rng(1925)
CUTSCENE_SOURCES = {}


def load(rel):
    raw = subprocess.run([FF, '-loglevel', 'error', '-i', os.path.join(PUB, rel), '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], 'bandpass', fs=SR, output='sos'), x)


def lp(x, f, order=2):
    return sosfilt(butter(order, f, 'lowpass', fs=SR, output='sos'), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, 'highpass', fs=SR, output='sos'), x)


def env(n, attack, decay):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(attack, 1e-4)) * np.exp(-t / decay)


# ---------- recorded: single footsteps cut from the library's footstep clips ----------
def steps_from_library():
    bank = json.load(open(os.path.join(PUB, 'audio', 'soundbank.json')))
    out = []
    for c in bank['fx']['footsteps']:
        x = load(c['file'])
        e = np.convolve(np.abs(x), np.ones(441) / 441, 'same')
        thr = max(0.02, np.percentile(e, 97) * 0.5)
        i, last = 0, -SR
        while i < len(e):
            if e[i] > thr and i - last > int(0.25 * SR):
                a = max(0, i - int(0.01 * SR)); b = min(len(x), a + int(0.2 * SR))
                s = x[a:b] * env(b - a, 0.002, 0.07)
                if np.max(np.abs(s)) > 0.05:
                    out.append(s / np.max(np.abs(s)))
                last = i; i += int(0.25 * SR)
            i += 1
        CUTSCENE_SOURCES.setdefault('footsteps', []).append(c['src'])
    return out


def bed(rel, n, level, key):
    x = load(rel)
    CUTSCENE_SOURCES.setdefault(key, []).append(rel)
    reps = int(np.ceil(n / len(x))) + 1
    y = np.tile(x, reps)[:n]
    return y / (np.max(np.abs(y)) + 1e-6) * level


# ---------- synthesised for this project ----------
def coins(dur=0.7, n=7):
    out = np.zeros(int(dur * SR))
    for _ in range(n):
        t0 = int(rng.uniform(0, dur - 0.25) * SR); m = int(0.25 * SR)
        tt = np.arange(m) / SR
        f = rng.uniform(2300, 3300)
        s = sum(np.sin(2 * np.pi * f * r * tt + rng.uniform(0, 6)) * a for r, a in ((1, 1), (1.73, 0.6), (2.41, 0.4), (3.07, 0.25)))
        s *= env(m, 0.0005, rng.uniform(0.04, 0.11)) * rng.uniform(0.4, 1)
        out[t0:t0 + m] += s
    out += bp(rng.normal(0, 1, len(out)), 1500, 6000) * 0.04 * env(len(out), 0.02, 0.3)  # the pouch
    return out / np.max(np.abs(out))


def rustle(dur, bursts=6):
    n = int(dur * SR); out = np.zeros(n)
    for _ in range(bursts):
        t0 = int(rng.uniform(0, max(0.01, dur - 0.18)) * SR); m = int(rng.uniform(0.08, 0.18) * SR)
        out[t0:t0 + m] += bp(rng.normal(0, 1, m), 900, 5500) * np.hanning(m) * rng.uniform(0.4, 1)
    return out / (np.max(np.abs(out)) + 1e-6)


def wood(n=3):
    """a stool knocked about: short hollow knocks, not crashes"""
    out = np.zeros(int(0.6 * SR))
    for k in range(n):
        t0 = int((k * 0.12 + rng.uniform(0, 0.05)) * SR); m = int(0.12 * SR); tt = np.arange(m) / SR
        f = rng.uniform(260, 520)
        s = (np.sin(2 * np.pi * f * tt) + 0.5 * np.sin(2 * np.pi * f * 2.3 * tt)) * env(m, 0.0008, 0.03)
        s += bp(rng.normal(0, 1, m), 800, 3000) * env(m, 0.0005, 0.01) * 0.6
        out[t0:t0 + m] += s * rng.uniform(0.5, 1)
    return out / np.max(np.abs(out))


def grunt(dur=0.55, f0=88, pleased=False):
    """a big ape's low, throaty grunt: a rough pulse train through open-vowel formants, falling in pitch"""
    n = int(dur * SR); t = np.arange(n) / SR
    f = f0 * (1.15 - 0.3 * t / dur) * (1 + 0.04 * rng.normal(0, 1, n).cumsum() / np.sqrt(np.arange(1, n + 1)))
    ph = np.cumsum(f) / SR
    src = (ph % 1 < 0.12).astype(float) - 0.12  # pulses
    src += 0.35 * rng.normal(0, 1, n) * (0.5 + 0.5 * np.sin(2 * np.pi * 23 * t))  # roughness
    v = sum(bp(src, a, b) * g for a, b, g in ((260, 520, 1.0), (650, 1100, 0.55), (1700, 2500, 0.15)))
    shape = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** (0.6 if not pleased else 1.2)
    v *= shape
    v = lp(v, 2600)
    return v / np.max(np.abs(v)) * (0.6 if pleased else 1)


def place(track, s, at, gain):
    i = int(at * SR)
    if i >= len(track):
        return
    m = min(len(s), len(track) - i)
    track[i:i + m] += s[:m] * gain


def enclosed(s):
    """a step through the doorway: duller, with a little room"""
    y = lp(s, 2500)
    d = int(0.045 * SR)
    y2 = np.concatenate([y, np.zeros(d)]); y2[d:] += y * 0.35
    return y2


def finish(track, name, fade=0.35):
    f = int(fade * SR); track[-f:] *= np.linspace(1, 0, f)
    track[: int(0.02 * SR)] *= np.linspace(0, 1, int(0.02 * SR))
    peak = np.max(np.abs(track)); track = track / peak * 0.89 if peak > 0.89 else track
    wav = f'/tmp/{name}.f32'
    track.astype(np.float32).tofile(wav)
    subprocess.run([FF, '-y', '-loglevel', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', wav, '-b:a', '96k', os.path.join(OUT, f'{name}.mp3')], check=True)
    os.unlink(wav)
    print(name, round(len(track) / SR, 2), 's')


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--model', default='/tmp/kokoro'); a = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    steps = steps_from_library()
    pick = lambda: steps[rng.integers(len(steps))]

    # ---- clip 1: 5.0625 s in the lane: the coins, the turn, the walk in ----
    n1 = int(5.45 * SR)
    t1 = bed('audio/amb/market.mp3', n1, 0.10, 'market') + bed('audio/fx/crackling_fire-0.mp3', n1, 0.06, 'fire')
    place(t1, coins(), 0.30, 0.42)                       # the pouch changes hands, 0.3-1.0 s
    place(t1, rustle(0.6, 4), 0.25, 0.10)
    place(t1, rustle(0.5, 3), 1.05, 0.10)                # the turn
    for k, at in enumerate([1.15, 1.6, 1.9, 2.2, 2.5, 2.8, 3.1, 3.4]):   # the short man, quick light steps
        s = pick(); place(t1, enclosed(s) if at > 3.0 else s, at, 0.30)
    for walker, (start, gap, g) in enumerate([(2.0, 0.42, 0.34), (2.15, 0.45, 0.30), (2.3, 0.4, 0.28)]):
        at = start + rng.uniform(0, 0.05)
        while at < 5.1:                                  # the three men, heavier, staggered
            s = pick(); place(t1, enclosed(s) if at > 3.6 else lp(s, 4000), at, g)
            at += gap + rng.uniform(-0.03, 0.03)
    place(t1, rustle(1.2, 5), 3.5, 0.07)                 # shoulders through the doorway
    finish(t1, 'cutscene-01')

    # ---- clip 2: 3.5625 s inside: the orangutan, the scramble, the street ----
    n2 = int(4.1 * SR)
    t2 = bed('audio/fx/crackling_fire-1.mp3', n2, 0.08, 'fire') + bed('audio/amb/market.mp3', n2, 0.035, 'market')
    place(t2, grunt(0.5, 92), 0.18, 0.55)                # the first swing
    place(t2, grunt(0.7, 80), 1.15, 0.75)                # arms up, 1.25-1.5 s
    place(t2, wood(2), 0.45, 0.22)                       # a stool goes one way
    place(t2, wood(3), 2.2, 0.26)                        # and the table rattles
    place(t2, rustle(2.0, 9), 0.4, 0.13)
    at = 0.6
    while at < 3.45:                                     # fast, ragged feet to the door
        place(t2, pick(), at, 0.24 + 0.1 * rng.random())
        at += rng.uniform(0.11, 0.2)
    # the room settles: lower the commotion at the end, keep the fire
    s0 = int(3.3 * SR); t2[s0:] = t2[s0:] * np.linspace(1, 0.45, len(t2) - s0)
    finish(t2, 'cutscene-02', fade=0.5)

    # ---- the reward still: the grill, a wrap of bread, a pleased grunt ----
    n3 = int(7.0 * SR)
    t3 = bed('audio/fx/crackling_fire-0.mp3', n3, 0.10, 'fire') + bed('audio/amb/market.mp3', n3, 0.03, 'market')
    place(t3, rustle(0.7, 5), 1.2, 0.12)                 # paper and bread
    place(t3, grunt(0.45, 105, pleased=True), 3.2, 0.32)
    finish(t3, 'cutscene-reward', fade=1.5)

    # ---- Nabil's line (clip 1), in his own game voice ----
    from kokoro_onnx import Kokoro
    k = Kokoro(os.path.join(a.model, 'kokoro-v1.0.onnx'), os.path.join(a.model, 'voices-v1.0.bin'))
    audio, sr = k.create('There he is. Follow me.', voice='am_onyx', speed=0.92, lang='en-us')
    tmp = '/tmp/nabil-line.f32'; audio.astype(np.float32).tofile(tmp)
    subprocess.run([FF, '-y', '-loglevel', 'error', '-f', 'f32le', '-ar', str(sr), '-ac', '1', '-i', tmp, '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,loudnorm=I=-18:TP=-2', '-b:a', '64k', os.path.join(OUT, 'cutscene-nabil.mp3')], check=True)
    print('cutscene-nabil', round(len(audio) / sr, 2), 's')
    print('library clips used:', json.dumps({k: sorted(set(v)) for k, v in CUTSCENE_SOURCES.items()}))


if __name__ == '__main__':
    main()
