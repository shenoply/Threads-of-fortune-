# Arran's voice: how it works

**Status:** all 65 lines are recorded in Arran's voice (see "Current recordings" below).

**Consent:** on 30 Sep 2026 the project owner confirmed that Arran approved cloning his voice for this game only. The cloned voice and its clips may be used for Arran's lines in Threads of Fortune and nothing else.

**Reference audio:** `voice-src/arran_reference_0-40s.wav` is kept locally and git-ignored.
- 40 s, 24 kHz, mono.
- Continuous speech over a steady background hum, with speech about 10 dB above it. The clone script turns on ElevenLabs noise removal.
- A cleaner 1–3 minute recording made in a quiet room would give a steadier voice.

## Pieces
- `src/data/arranVoice.ts` holds each line's id, exact subtitle text, file path, mood and contexts, plus optional weight, cooldown, once and preload flags. It is plain data, so Node scripts can import it directly.
- `src/game/audio/arranVoice.ts` is the player.
  - `playArranVoice(context | { id })` picks a line (weighted, avoiding the last three and anything on cooldown), shows the subtitle and plays the clip at master × dialogue volume.
  - One Arran clip plays at a time, and a new one stops any other character's voice.
  - `stopArranVoice()` stops him. `preloadArranVoice()` fetches only the lines marked `preload` (greetings, inspection, warnings).
- `public/audio/arran/<folder>/<line-id>.ogg|.mp3` are the recordings. `public/audio/arran/manifest.json` lists which lines have one; the game never requests a file that isn't listed.
- `src/components/ArranLab/ArranVoiceUI.tsx` has the subtitle bar, the mood-to-portrait mapping and the linen study scene.
- `src/game/systems/arranVisits.ts` decides what Arran is doing when you walk in. It changes once per game day, and the mummy study comes first once the conservator has given permission.
- The settings screen has Master, Music, "Effects and ambience" and Dialogue sliders, saved in the game.

## Where each line plays
| Moment | Context |
| --- | --- |
| Step inside the lab | `greeting` |
| Tap Arran's portrait | `lab`, or `rug-inspection` while a rug is chosen, or the Matthews line while that book is wanted |
| Choose a rug | `rug-inspection` |
| A result that matches how the rug is sold | `reaction` |
| A result that doesn't | `discovery` |
| He needs to cut a sample | `warning` |
| Open the board | `lab` |
| Ask for Matthews / hand back a book | `books` |
| Linen study | the three `mummy` lines, in order |

## Add a line
1. Add an entry to `ARRAN_VOICE_LINES`, with a new id and `file: audio/arran/<folder>/<id>`.
2. Record or generate `<id>.ogg` and `<id>.mp3` into that folder.
3. Run `node tools/build-arran-voice-manifest.mjs`.

Until step 3, the line is a subtitle only.

## Clone the voice (once the owner has agreed)
1. In the environment settings, allow `api.elevenlabs.io` under Network access, and add `ELEVENLABS_API_KEY` as an environment variable. Instant cloning needs at least the Starter plan.
2. Put the reference WAV in `voice-src/` (git ignores it).
3. Run:
   ```
   ARRAN_VOICE_CONSENT=confirmed node scripts/clone-arran-voice.ts
   ```
   It prints the new voice ID. Save that as `ARRAN_ELEVENLABS_VOICE_ID`.

## Generate clips (development only, and only with the voice owner's permission)
1. Create `.env.local` (git ignores it):
   ```
   ELEVENLABS_API_KEY=...
   ARRAN_ELEVENLABS_VOICE_ID=...
   ```
2. Run:
   ```
   ARRAN_VOICE_CONSENT=confirmed node --env-file=.env.local scripts/generate-arran-voice.ts
   ```
   Add `--only=id1,id2` to generate some lines, or `--force` to regenerate existing ones.

The script writes an MP3 (and an OGG if `ffmpeg` is installed), then rebuilds the manifest. Provider code lives only in `scripts/voice-providers/`. Another provider (Cartesia, PlayHT, Resemble, a local model) only needs to implement `VoiceGenerationProvider`. Never put a key in `src/`, `public/` or a `VITE_*` variable.

## The reference recording
The reference is in the Arran Drive folder: `arran_reference_0-40s.wav` is the master and the MP3 is a copy. It is not in the repo, on purpose.

A professional clone needs much more clean speech than 40 seconds: at least 30 minutes, ideally 1–3 hours, recorded in a quiet room with one close microphone. It should be natural reading in his normal voice, including some calm explaining and some livelier moments. Instant cloning works from a minute or two but drifts more between lines.

## Current recordings (Arran's voice, converted)

Arran's 65 lines are in **Arran's own voice**. They started as the period-RP stock recordings
(Kokoro, 0.6 `bm_george` + 0.4 `bm_fable`, speed 0.94, RP phonemes), and each was then put through
**FreeVC** voice conversion (Coqui TTS model `voice_conversion_models/multilingual/vctk/freevc24`,
MIT licence) with the owner-approved reference `arran_reference_0-40s.wav` as the target speaker.
The accent and timing come from the stock take; the voice itself is Arran's. The reference was
cleaned first with ffmpeg `highpass=f=80,afftdn=nf=-30,loudnorm`, and the output is normalised to
-18 LUFS, 48 kHz mono, 64 kbps MP3. No paid service or API key is needed.

To redo or add a line: record or generate the stock RP take, then
`tts --model_name voice_conversion_models/multilingual/vctk/freevc24 --source_wav <take.wav> --target_wav <reference.wav> --out_path <out.wav>`
(pip install coqui-tts), then encode as above. A longer, cleaner reference recording will bring
the voice closer to Arran.
