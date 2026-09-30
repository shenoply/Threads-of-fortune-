# Arran's voice: how it works

**Status:** the voice system is built, but no voice clips are recorded yet. Every line shows as a subtitle. Nothing is cloned or generated until the person in the reference recording has given permission.

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
