// Create Malek's cloned voice at ElevenLabs from his reference recording (instant voice cloning).
// DEVELOPMENT ONLY, and only once Malek has agreed to his voice being cloned for the game.
//
//   1. Put the reference recording(s) (his voice note, any format ffmpeg reads: m4a/wav/mp3) at
//      voice-src/malek_reference.<ext> (voice-src/ is git-ignored: the recording never enters the
//      public repo). More clean speech gives a steadier clone: add further files and they are all
//      sent together (ElevenLabs instant cloning accepts several samples; 1-3 minutes total is best).
//   2. MALEK_VOICE_CONSENT=confirmed node --env-file=.env.local scripts/clone-malek-voice.ts
//      (or with ELEVENLABS_API_KEY set in the environment instead of .env.local)
//   3. Put the printed voice id in MALEK_ELEVENLABS_VOICE_ID, then run scripts/generate-malek-voice.ts
import { readdirSync, readFileSync } from 'node:fs';

if (process.env.MALEK_VOICE_CONSENT !== 'confirmed') {
  console.error('Refusing to clone: set MALEK_VOICE_CONSENT=confirmed only after the voice owner has agreed.');
  process.exit(1);
}
const key = process.env.ELEVENLABS_API_KEY;
if (!key) { console.error('Missing ELEVENLABS_API_KEY.'); process.exit(1); }
const files = readdirSync('voice-src').filter((f) => /malek.*\.(wav|mp3|m4a)$/i.test(f));
if (!files.length) { console.error('No malek_* samples in voice-src/.'); process.exit(1); }

const form = new FormData();
form.append('name', "Malek al-Giza (Threads of Fortune)");
form.append('description', "Egyptian grill owner, Giza, 1925. Dry, pessimistic, Egyptian-accented English. From the owner-approved reference recording.");
form.append('remove_background_noise', 'true');
for (const f of files) form.append('files', new Blob([readFileSync(`voice-src/${f}`)]), f);
const r = await fetch('https://api.elevenlabs.io/v1/voices/add', { method: 'POST', headers: { 'xi-api-key': key }, body: form });
const j = await r.json().catch(() => ({}));
if (!r.ok) { console.error(`ElevenLabs ${r.status}:`, JSON.stringify(j).slice(0, 400)); process.exit(1); }
console.log(`Voice created from ${files.length} sample(s). MALEK_ELEVENLABS_VOICE_ID=${(j as { voice_id?: string }).voice_id}`);
