"""Malek's Arabic phrases, spoken in Egyptian Arabic by an offline stock voice (Piper ar_JO "kareem",
not a clone of anyone), from hand-written Egyptian phonemes, because the voice's own reader gives
formal Arabic ("baʕdain" where Cairo says "baʕdiːn"). Lowered a little in pitch for a heavier man.

  python3 tools/generate-malek-arabic.py /path/to/ar_JO-kareem-medium.onnx

The voice model is a download (sherpa-onnx's GitHub release "tts-models", vits-piper-ar_JO-kareem-medium),
kept out of the repo. Writes public/audio/malek/ar-<id>.mp3. The ids and the text on screen are in
src/data/malekArabic.ts; keep the two lists in step.
"""
import subprocess, sys, wave, os, tempfile
from piper import PiperVoice, SynthesisConfig
import imageio_ffmpeg

# id -> (Egyptian phonemes, length scale: >1 is slower)
PHRASES = {
    'aah-wbaadein': ('ʔˈaːh, wi baʕdˈiːn?', 1.0),
    # الِّي خِلَق عَلَّق: Cairo says the ق as a glottal stop, and خِلَق like "khileq"
    'elli-khalaq': ('ʔˈilli χilˈaʔ, ʕallˈaʔ.', 1.0),
    'ha': ('hˈaː?', 0.95),
    'ha-2': ('hˈaː, hˈaː?', 0.95),
    'ba': ('bˈaː!', 0.95),
    'ba-2': ('bˈaːh.', 1.0),
    'tamalli-maak': ('timˈalli maʕˈaːk.', 1.0),
    'meen-aal': ('mˈiːn ʔˈaːl?', 0.95),
    'meen-aal-2': ('mˈiːn ʔˈaːl, mˈiːn?', 0.95),
    'taa': ('tˤˈaʕ!', 0.95),
    'taa-2': ('tˤˈaʕ, tˤˈaʕ.', 1.0),
    'how': ('hˈaːw?', 0.95),
    'how-2': ('hˈaːw? hˈaːw?', 0.95),
}

def main(model):
    v = PiperVoice.load(model)
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    out = os.path.join(os.path.dirname(__file__), '..', 'public', 'audio', 'malek')
    os.makedirs(out, exist_ok=True)
    rate = v.config.sample_rate
    for pid, (ph, ls) in PHRASES.items():
        ids = v.phonemes_to_ids(list(ph))
        audio = v.phoneme_ids_to_audio(ids, SynthesisConfig(length_scale=ls, noise_scale=0.6, noise_w_scale=0.7))
        pcm = (audio.clip(-1, 1) * 32767).astype('int16').tobytes()
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as t:
            with wave.open(t.name, 'wb') as w:
                w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(pcm)
            # a heavier, older voice: down about a tone, tempo kept; a little room
            af = f'asetrate={rate}*0.89,aresample=44100,atempo=1.12,aecho=0.8:0.5:40:0.12,loudnorm=I=-18:TP=-2'
            subprocess.run([ff, '-y', '-loglevel', 'error', '-i', t.name, '-af', af, '-ac', '1', '-b:a', '64k', os.path.join(out, f'ar-{pid}.mp3')], check=True)
            os.unlink(t.name)
        print(pid, ph)

if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else '/tmp/piper/vits-piper-ar_JO-kareem-medium/ar_JO-kareem-medium.onnx')
