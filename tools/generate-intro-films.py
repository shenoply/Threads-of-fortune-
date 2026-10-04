"""First-meeting films (Malek, Arran, Bilgin, Rashid, Nabil, Cohen): record the documentary narration offline
with Kokoro (a stock synthetic British voice, bf_emma: not a clone of anyone, and unlike the voice the
game uses for Arran himself), and write the caption timings.

  python3 tools/generate-intro-films.py --model /tmp/kokoro malek arran

Writes public/audio/intro/<who>.mp3 and src/data/introFilms.ts (each film's lines: what is said, what
the caption shows, and when each starts, in seconds). The films are public/video/<who>-intro.mp4.
"""
import argparse, json, os, subprocess
import numpy as np
import soundfile as sf
import imageio_ffmpeg
from kokoro_onnx import Kokoro

ROOT = os.path.join(os.path.dirname(__file__), '..')
# The lore, as a narrator would tell it: (spoken, caption). Fiction: the people and places are invented.
FILMS = {
    'malek': [
        ('Giza, nineteen twenty-five. Behind the bazaar, a charcoal grill, run by one man.', 'Giza, 1925. Behind the bazaar, a charcoal grill, run by one man.'),
        ('Malek. Boo Rayan to his son, Al-Mallem to the lane: the boss. No partners, no patience, and four tables.', None),
        ('He expects the worst of everyone. And yet the kofta is the best in the lane.', None),
        ('Whatever lives in his storeroom, he has never said.', None),
    ],
    'abuhamid': [
        ('At the end of your lane, under a vine, there is a coffee house. Its keeper is Bilgin.', None),
        ('He has poured coffee for your father, for the drivers of pashas, and for every rumour in Giza.', None),
        ('Ask him for the news, the roads north, or men who can hold a rifle. He will tell you slowly, and laugh at his own jokes.', None),
        ('Half of what a merchant needs to know in this town is said first at his tables.', None),
    ],
    'bilgin-chess': [
        ('Before the coffee house, Bilgin played chess for money and for honour, in the cafés of Istanbul.', None),
        ('They called him a champion. He says only that he lost less often than the others.', None),
        ('Now he plays in the back corner, slowly, smiling, and he sees three moves further than he lets on.', None),
    ],
    'rashid': [
        ('Uncle Rashid. A wholesaler in the old khan of Cairo, who sold rugs to your father for thirty years.', None),
        ('He is loud, he is old, and he will roast you every single day.', None),
        ('He sells you your stock, and on credit when your purse is thin. Pay him on the day, or hear about it for a month.', None),
        ('He would never admit that he is fond of you. He is.', None),
    ],
    'nabil': [
        ('Nabil al-Khatib. One of the wealthiest textile merchants in Cairo, with a warehouse behind the Muski.', None),
        ('He built his fortune on a list of importers and an exact eye for knots, dyes and repairs.', None),
        ('He pays well for what he can defend, and walks away from what he cannot. Flattery and hurry only cost you.', None),
        ('Tell him the truth about a rug. He will find it out anyway.', None),
    ],
    'cohen': [
        ('Cohen. Born in Alexandria, a very rich textile wholesaler with an office in Cairo.', None),
        ('He furnishes hotel corridors and steamship cabins, and he counts every piastre of his margin.', None),
        ('He does not like you. He believes you undercut him on a hotel contract, and he has not forgotten it.', None),
        ('But he comes with orders. Keep your promise, and the numbers will keep bringing him back.', None),
    ],
    'arran': [
        ('Arran Embleton. A British textile chemist in Giza, with a microscope, a balance, and strong opinions about wool.', None),
        ('He tells you what a rug is really made of: the fibre, the dye, and whether the colour runs.', None),
        ('His signed reports travel with the rug. A buyer who doubts you will believe him.', None),
        ('Bring him the books he needs, and he can test more.', None),
    ],
}
# a woman's voice, so the narrator never sounds like Arran (bm_george) or any other man in the game
VOICE, SPEED, LANG = 'bf_emma', 0.92, 'en-gb'
# names the phonemizer gets wrong: what it produces -> how the name is said
# (Arran, like the Scottish isle: ARR-un, stress on the first syllable, as in "Aaron")
FIX_PHONEMES = {'ɐɹˈan': 'ˈaɹən', 'bˈɪldʒɪn': 'bɪlɡˈiːn'}  # Bilgin, Turkish: bil-GEEN, hard g
SR = 24000
LEAD, GAP = 0.8, 0.55


def trim(x, thr=0.004):
    idx = np.where(np.abs(x) > thr)[0]
    if not len(idx):
        return x
    a = max(0, idx[0] - int(0.03 * SR)); b = min(len(x), idx[-1] + int(0.1 * SR))
    return x[a:b]


def record(k, who):
    parts, cues, t = [np.zeros(int(LEAD * SR), dtype=np.float32)], [], LEAD
    for spoken, shown in FILMS[who]:
        ph = k.tokenizer.phonemize(spoken, LANG)
        for wrong, right in FIX_PHONEMES.items():
            ph = ph.replace(wrong, right)
        audio, sr = k.create(ph, voice=VOICE, speed=SPEED, lang=LANG, is_phonemes=True)
        assert sr == SR, sr
        audio = trim(audio.astype(np.float32))
        cues.append({'start': round(t, 2), 'end': round(t + len(audio) / SR, 2), 'text': shown or spoken})
        parts += [audio, np.zeros(int(GAP * SR), dtype=np.float32)]
        t += len(audio) / SR + GAP
    wav = f'/tmp/{who}-intro.wav'
    sf.write(wav, np.concatenate(parts), SR)
    out = os.path.join(ROOT, 'public', 'audio', 'intro', f'{who}.mp3')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), '-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-ar', '24000', '-codec:a', 'libmp3lame', '-b:a', '64k', out], check=True)
    print(f'{who}: {len(cues)} lines, {round(t, 1)} s, {os.path.getsize(out) // 1024} KB')
    return {'length': round(t, 2), 'cues': cues}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--model', default='/tmp/kokoro')
    ap.add_argument('who', nargs='+', choices=list(FILMS))
    a = ap.parse_args()
    k = Kokoro(os.path.join(a.model, 'kokoro-v1.0.onnx'), os.path.join(a.model, 'voices-v1.0.bin'))
    ts = os.path.join(ROOT, 'src', 'data', 'introFilms.ts')
    # keep the films not re-recorded this time
    films = {}
    if os.path.exists(ts):
        src = open(ts).read()
        start = src.find('= {')
        if start >= 0:
            films = json.loads(src[start + 2:src.rindex('}') + 1])
    films.update({who: record(k, who) for who in a.who})
    films = {w: films[w] for w in FILMS if w in films}
    with open(ts, 'w') as f:
        f.write('// Generated by tools/generate-intro-films.py: the narration of each first-visit film, the caption\n')
        f.write('// for each line, and when it starts (seconds into public/audio/intro/<who>.mp3). Stock synthetic voice.\n')
        f.write('export interface IntroCue { start: number; end: number; text: string }\n')
        f.write('export const INTRO_FILMS: Record<string, { length: number; cues: IntroCue[] }> = ')
        f.write(json.dumps(films, indent=2, ensure_ascii=False))
        f.write(';\n')


if __name__ == '__main__':
    main()
