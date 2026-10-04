"""Record characters who have lines but no voice, with the open Kokoro TTS model, offline.

Reads public/voices/voice-script.csv (npx tsx tools/export-voice-script.ts), synthesises every line for
the chosen speakers, packs each speaker's lines into one MP3 "audio sprite" (32 kb/s mono 22.05 kHz,
the format the game's voice engine slices one line at a time), and adds the clip offsets to
public/voices/manifest.json. Stock synthetic voices, not clones of anyone.

  pip install kokoro-onnx soundfile imageio-ffmpeg
  # model files: https://github.com/thewh1teagle/kokoro-onnx/releases (kokoro-v1.0.onnx, voices-v1.0.bin)
  python3 tools/generate-voices-kokoro.py --model /tmp/kokoro nabil cohen
"""
import argparse, csv, json, os, subprocess, sys
import numpy as np
import soundfile as sf
import imageio_ffmpeg
from kokoro_onnx import Kokoro

ROOT = os.path.join(os.path.dirname(__file__), '..', 'public', 'voices')
# who sounds like whom: Kokoro voice, speed, language
CAST = {
    # Malek: his own voice, not a stock one: Kokoro's Spanish male timbre blended with a British male
    # (a Mediterranean colour nobody else in the game has), speaking English with an Egyptian accent put
    # into the pronunciation (tapped r, pure vowels, s/z for th) at a natural pace. The Arabic-model
    # reading ('piper:') was too slow and thick; plain am_adam sounded like everyone else. Not a clone.
    'malek': ('blend:em_alex=0.6,bm_daniel=0.4|egyptian', 1.04, 'en-us'),
    # Bilgin: the Turkish keeper of the coffee house in your lane (replaced Abu Hamid): warm, unhurried
    'abuhamid': ('blend:bm_lewis=0.6,am_puck=0.4', 0.94, 'en-gb'),
    'nabil': ('am_onyx', 0.92, 'en-us'),          # senior Cairo textile merchant: deep, unhurried
    'cohen': ('am_michael', 0.97, 'en-us'),       # Alexandrian wholesaler: measured, precise, nasal (FX below)
    'farid-nassar': ('am_eric', 1.0, 'en-us'),     # casino bookings manager
    'kemal-arslan': ('am_fenrir', 1.0, 'en-us'),   # bandleader
    'youssef-hanna': ('am_liam', 0.97, 'en-us'),   # theatre administrator
    'nadia-wahba': ('af_bella', 0.95, 'en-us'),    # cabaret proprietor, once its singer
    'salma-farid': ('af_sarah', 1.0, 'en-us'),     # front of house
}
SR = 22050
GAP = 0.6          # seconds of silence between lines: the engine fetches 0.3 s either side
ENC_DELAY = 1105 / SR  # LAME's encoder delay: where the first sample lands in the MP3 timeline


def _peak(f0, gain_db, q):
    # RBJ peaking EQ as a second-order section
    from scipy.signal import tf2sos
    A = 10 ** (gain_db / 40); w = 2 * np.pi * f0 / SR; al = np.sin(w) / (2 * q)
    b = [1 + al * A, -2 * np.cos(w), 1 - al * A]; a = [1 + al / A, -2 * np.cos(w), 1 - al / A]
    return tf2sos(b, a)


def nasal(x):
    """A pinched, nasal colour: less chest, a strong honk around 1 kHz, a little edge, no air."""
    from scipy.signal import butter, sosfilt
    sos = np.vstack([
        butter(2, 320, 'highpass', fs=SR, output='sos'),
        _peak(250, -6, 1.0),
        _peak(1050, 10, 1.6),
        _peak(2400, 4, 1.4),
        butter(2, 5200, 'lowpass', fs=SR, output='sos'),
    ])
    y = sosfilt(sos, x).astype(np.float32)
    return (y * (0.9 / max(1e-6, float(np.max(np.abs(y)))))).astype(np.float32)


# an Arabic speaker's English: rolled r, pure vowels, no "th" (gently: no swapped consonants)
ACCENT = [('ɚ', 'ɛr'), ('ɝ', 'ɛr'), ('ɹ', 'r'), ('oʊ', 'oː'), ('eɪ', 'eː'), ('ʌ', 'a'), ('æ', 'a'), ('ɑː', 'aː'), ('ɐ', 'a'), ('ð', 'z'), ('θ', 's'), ('ɪ', 'i')]
_piper = {}


def piper_say(model, k, text, speed, lang):
    from piper import PiperVoice, SynthesisConfig
    if model not in _piper:
        _piper[model] = PiperVoice.load(model)
    v = _piper[model]
    ph = k.tokenizer.phonemize(text, lang)
    for a, b in ACCENT:
        ph = ph.replace(a, b)
    ids = v.phonemes_to_ids([c for c in ph if c in v.config.phoneme_id_map])
    audio = v.phoneme_ids_to_audio(ids, SynthesisConfig(length_scale=speed, noise_scale=0.6, noise_w_scale=0.7)).astype(np.float32)
    sr = v.config.sample_rate
    # a heavier man: read the samples a little slower, down about a tone (and a touch slower, which suits him)
    n = int(len(audio) / 0.92)
    audio = np.interp(np.linspace(0, len(audio) - 1, n), np.arange(len(audio)), audio).astype(np.float32)
    return audio / max(1e-6, float(np.max(np.abs(audio)))) * 0.9, sr


# Egyptian English, put into the phonemes: a tapped r, pure vowels, no "th", full unstressed vowels
EGYPTIAN = [('ɚ', 'ɛɾ'), ('ɝ', 'ɛɾ'), ('ɹ', 'ɾ'), ('oʊ', 'oː'), ('eɪ', 'eː'), ('ʌ', 'a'), ('æ', 'a'), ('ɑː', 'aː'), ('ɐ', 'a'), ('ð', 'z'), ('θ', 's'), ('ɪ', 'i'), ('ʊ', 'u'), ('ᵻ', 'i'), ('ɾ', 'ɾ')]


def blend_say(k, spec, text, speed, lang):
    voices, _, accent = spec.partition('|')
    style = None
    for part in voices.split(','):
        name, w = part.split('=')
        v = k.get_voice_style(name) * float(w)
        style = v if style is None else style + v
    ph = k.tokenizer.phonemize(text, lang).replace('bˈɪldʒɪn', 'bɪlɡˈiːn')  # Bilgin: bil-GEEN, hard g
    if accent == 'egyptian':
        for a, b in EGYPTIAN:
            ph = ph.replace(a, b)
    return k.create(ph, voice=style, speed=speed, lang=lang, is_phonemes=True)


# a character's colour on top of the stock voice (same length, so the clip timings hold)
FX = {'cohen': nasal}


def trim(x, thr=0.004):
    idx = np.where(np.abs(x) > thr)[0]
    if not len(idx):
        return x[:1]
    a = max(0, idx[0] - int(0.03 * SR)); b = min(len(x), idx[-1] + int(0.08 * SR))
    return x[a:b]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--model', default='/tmp/kokoro')
    ap.add_argument('speakers', nargs='+')
    a = ap.parse_args()
    k = Kokoro(os.path.join(a.model, 'kokoro-v1.0.onnx'), os.path.join(a.model, 'voices-v1.0.bin'))
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    rows = list(csv.DictReader(open(os.path.join(ROOT, 'voice-script.csv'), encoding='utf-8')))
    man_path = os.path.join(ROOT, 'manifest.json')
    manifest = json.load(open(man_path))
    for sp in a.speakers:
        voice, speed, lang = CAST[sp]
        mine = [r for r in rows if r['speaker'] == sp and r['text'].strip()]
        chunks, clips, t = [], {}, 0.0
        silence = np.zeros(int(GAP * SR), dtype=np.float32)
        for i, r in enumerate(mine):
            cid = os.path.basename(r['file'])[:-4]
            if cid in clips:
                continue
            if voice.startswith('blend:'):
                audio, sr = blend_say(k, voice[6:], r['text'], speed, lang)
            elif voice.startswith('piper:'):
                audio, sr = piper_say(voice[6:], k, r['text'], speed, lang)
            else:
                audio, sr = k.create(r['text'], voice=voice, speed=speed, lang=lang)
            if sr != SR:  # Kokoro speaks at 24 kHz: resample to the sprite rate
                n = int(len(audio) * SR / sr)
                audio = np.interp(np.linspace(0, len(audio) - 1, n), np.arange(len(audio)), audio).astype(np.float32)
            if sp in FX:
                audio = FX[sp](audio)
            audio = trim(audio)
            clips[cid] = [round(t + ENC_DELAY, 3), round(len(audio) / SR, 3)]
            chunks += [audio, silence]
            t += (len(audio) + len(silence)) / SR
            if i % 50 == 0:
                print(f'{sp}: {i}/{len(mine)}', flush=True)
        wav = f'/tmp/{sp}-sprite.wav'
        sf.write(wav, np.concatenate([silence] + chunks), SR)
        # the first chunk of silence shifts every clip by GAP
        clips = {c: [round(s + GAP, 3), d] for c, (s, d) in clips.items()}
        out = os.path.join(ROOT, f'{sp}.mp3')
        subprocess.run([ff, '-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-ar', str(SR), '-codec:a', 'libmp3lame', '-b:a', '32k', '-write_xing', '0', out], check=True)
        manifest['sprites'][sp] = {'file': f'voices/{sp}.mp3', 'clips': clips}
        json.dump(manifest, open(man_path, 'w'), separators=(',', ':'))
        print(f'{sp}: {len(clips)} clips, {os.path.getsize(out) // 1024} KB', flush=True)


if __name__ == '__main__':
    sys.exit(main())
