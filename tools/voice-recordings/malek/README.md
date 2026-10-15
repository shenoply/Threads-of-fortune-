# Malek: ElevenLabs takes (TTS History, 6 Oct 2026)

Source: `ElevenLabs_Export_2026-10-15T10_25_12.zip` (SHA-256 cd069c4b...a35e), seven continuous batch takes, mono 44.1 kHz 128 kbps.
Each batch is a run of consecutive lines from the voice script, read in script order. They were split at pauses,
transcribed offline (Whisper tiny.en/small.en) and aligned to the line texts in order; the transcript was then
checked against the exact line text. Every file here is one line, cut from the original take (64 kbps) and listed in `clips.json`
(`source` = original export, `start`/`end` in seconds, `match` = similarity of the heard words to the script).

| Take (export time) | Lines |
|---|---|
| 18:49:43 and 18:49:52 | script rows 0-87 (two versions of the same batch) |
| 18:50:19 and 18:50:30 | script rows 88-147 (two versions) |
| 18:50:27 | script rows 148-203 (one version) |
| 18:51:51 and 18:51:57 | rows 204-209 plus the 60 price numbers (the numbers are cut from 18:51:51 only; 18:51:57 runs them together) |

Where two versions exist, the one whose words matched the script better was used; a tie keeps the earlier take.
Chosen by transcript, not by ear.

Spliced with `python3 tools/splice-recorded-voice.py malek tools/voice-recordings/malek` (no `--only-recorded`: lines not listed here keep their current audio).

Not replaced (kept as they were):
- 7 lines he recorded himself (his own voice notes, reworded in the script): `c04849de`, `e2cfe41b`, `24f5b24b`, `249caa15`, `98f27341`, `22e8a5c5`, `a6f607b2`. They are not in the ElevenLabs takes.
- `6937a54f`: in the sprite but no longer in the script, so there is no text to match.
- The empty lead-in halves of two split price lines (`32bb9ed3.a`, `b6a0d90f.a`) have no text and are not in the sprite.

Uncertain: `32bb9ed3.b` (". And I am being generous, which I never am."): both takes carry extra words around it ("Can I tell her?", "Yeah"), so only the middle phrase was cut.
Arabic phrases (`public/audio/malek/ar-*.mp3`) and the cutscene tracks are untouched.
