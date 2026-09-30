// Create Arran's cloned voice at ElevenLabs from the reference recording (instant voice cloning).
// DEVELOPMENT ONLY, and only once the person in the recording has agreed to their voice being cloned.
//
//   1. Put the reference WAV (Drive: Arran/arran_reference_0-40s.wav) at voice-src/arran_reference_0-40s.wav
//      (voice-src/ is git-ignored: the recording never enters the public repo)
//   2. ARRAN_VOICE_CONSENT=confirmed node --env-file=.env.local scripts/clone-arran-voice.ts
//      (or with ELEVENLABS_API_KEY set in the environment instead of .env.local)
//   3. Put the printed voice id in ARRAN_ELEVENLABS_VOICE_ID, then run scripts/generate-arran-voice.ts
//
// More clean speech gives a steadier voice: add further WAV/MP3 files to voice-src/ and they are sent too
// (ElevenLabs instant cloning accepts several samples; 1 to 3 minutes in total works best).
import { readdirSync, readFileSync } from 'node:fs';

if (process.env.ARRAN_VOICE_CONSENT !== 'confirmed') {
  console.error('Refusing to clone: set ARRAN_VOICE_CONSENT=confirmed only after the voice owner has agreed.');
  process.exit(1);
}
const key = process.env.ELEVENLABS_API_KEY;
if (!key) { console.error('Missing ELEVENLABS_API_KEY.'); process.exit(1); }
const files = readdirSync('voice-src').filter((f) => /\.(wav|mp3|m4a)$/i.test(f));
if (!files.length) { console.error('No samples in voice-src/.'); process.exit(1); }

const form = new FormData();
form.append('name', 'Arran Embleton (Threads of Fortune)');
form.append('description', 'Educated textile chemist, 1925 Giza. Calm, observant, understated, dry. From the owner-approved reference recording.');
form.append('remove_background_noise', 'true');
for (const f of files) form.append('files', new Blob([readFileSync(`voice-src/${f}`)]), f);
const r = await fetch('https://api.elevenlabs.io/v1/voices/add', { method: 'POST', headers: { 'xi-api-key': key }, body: form });
const j = await r.json().catch(() => ({}));
if (!r.ok) { console.error(`ElevenLabs ${r.status}:`, JSON.stringify(j).slice(0, 400)); process.exit(1); }
console.log(`Voice created from ${files.length} sample(s). ARRAN_ELEVENLABS_VOICE_ID=${(j as { voice_id?: string }).voice_id}`);
