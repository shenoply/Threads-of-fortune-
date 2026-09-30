# Arran Voice Integration — Claude Handoff

## Source files
- `arran_voice_reference_0-40s.mp3` — lightweight reference copy for voice/TTS tooling.
- `arran_reference_0-40s.wav` — lossless reference copy for analysis/training where accepted.
- Original source video remains in the Arran Drive folder as `Video from Hassan Abdo`.

## Recommended implementation for Threads of Fortune
Use the Arran recording as a voice reference only where the speaker has authorised reproduction/synthesis of the voice.

### Best production architecture
1. Generate Arran dialogue audio outside the game build with a voice-cloning/TTS provider.
2. Export approved lines as `.ogg` (preferred for browser game delivery) or `.mp3`.
3. Store files under `public/audio/arran/`.
4. Keep dialogue metadata in TypeScript/JSON and map each line to a file.
5. Pre-generate routine dialogue; do not call a TTS API every time a common line plays.
6. Use live TTS only for genuinely dynamic dialogue if latency/cost/network dependency is acceptable.

### Providers Claude can integrate in code
Claude itself is not the voice engine. It can write the integration code for a TTS/voice-cloning provider such as:
- ElevenLabs
- Resemble AI
- PlayHT
- Cartesia
- another provider chosen by the developer

Use only a provider/account whose terms allow the intended voice use and only with the speaker's permission for cloning.

### Suggested game structure
```ts
type ArranVoiceLine = {
  id: string;
  text: string;
  file: string;
  mood: 'neutral' | 'analytical' | 'amused' | 'concerned' | 'secretive' | 'excited' | 'irritated';
  context: string[];
  cooldown?: number;
};
```

Example assets:
```text
public/audio/arran/greeting-01.ogg
public/audio/arran/greeting-02.ogg
public/audio/arran/lab-explain-01.ogg
public/audio/arran/warning-01.ogg
public/audio/arran/discovery-01.ogg
public/audio/arran/mummy-study-01.ogg
```

### First prototype
Implement only six voiced situations first:
1. Greeting
2. Rug/fibre inspection
3. Laboratory explanation
4. Warning
5. Discovery
6. Mummy examination

Add subtitles and a separate Dialogue volume slider. Prevent overlapping speech and consecutive repetition of the same line.

### Important
Do not caricature or exaggerate Arran's accent. Match cadence, pronunciation and delivery from the authentic reference sample.
