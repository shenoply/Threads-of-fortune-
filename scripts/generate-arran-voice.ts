// Generate Arran's voice clips from src/data/arranVoice.ts into public/audio/arran/.
// DEVELOPMENT ONLY. Run with Node 22+ (type stripping), from the repo root:
//
//   ARRAN_VOICE_CONSENT=confirmed node --env-file=.env.local scripts/generate-arran-voice.ts [--only=arran-greeting-01,...] [--force]
//
// .env.local (git-ignored) holds:
//   ELEVENLABS_API_KEY=...
//   ARRAN_ELEVENLABS_VOICE_ID=...
//
// ARRAN_VOICE_CONSENT=confirmed is a deliberate switch: set it only once the person whose voice is
// in the reference recording has agreed, in writing, to its use for this game's voice.
// Writes <id>.mp3, and <id>.ogg too if ffmpeg is installed, then rebuilds the manifest.
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { ARRAN_VOICE_LINES } from '../src/data/arranVoice.ts';
import { elevenLabs } from './voice-providers/elevenlabs.ts';
import type { VoiceGenerationProvider } from './voice-providers/types.ts';

const env = process.env;
if (env.ARRAN_VOICE_CONSENT !== 'confirmed') {
  console.error('Refusing to generate: set ARRAN_VOICE_CONSENT=confirmed only after the voice owner has given permission.');
  process.exit(1);
}
const key = env.ELEVENLABS_API_KEY, voiceId = env.ARRAN_ELEVENLABS_VOICE_ID;
if (!key || !voiceId) {
  console.error('Missing ELEVENLABS_API_KEY or ARRAN_ELEVENLABS_VOICE_ID (put them in .env.local).');
  process.exit(1);
}
const provider: VoiceGenerationProvider = elevenLabs(key);
const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith('--only='))?.slice(7).split(',');
const force = args.includes('--force');
let ffmpeg = true;
try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); } catch { ffmpeg = false; }

for (const line of ARRAN_VOICE_LINES) {
  if (only && !only.includes(line.id)) continue;
  const mp3 = `public/${line.file}.mp3`;
  if (existsSync(mp3) && !force) { console.log(`skip ${line.id} (exists)`); continue; }
  mkdirSync(dirname(mp3), { recursive: true });
  const blob = await provider.generateSpeech({ text: line.text, voiceId });
  writeFileSync(mp3, Buffer.from(await blob.arrayBuffer()));
  if (ffmpeg) execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', mp3, '-c:a', 'libvorbis', '-q:a', '4', `public/${line.file}.ogg`]);
  console.log(`wrote ${line.id}${ffmpeg ? ' (mp3 + ogg)' : ' (mp3)'}`);
}
execFileSync('node', ['tools/build-arran-voice-manifest.mjs'], { stdio: 'inherit' });
