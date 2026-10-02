// Arran's voiced lines (id, text, file stem) as JSON, for tools/generate-arran-voice-kokoro.py
import { ARRAN_VOICE_LINES } from '../src/data/arranVoice';
process.stdout.write(JSON.stringify(ARRAN_VOICE_LINES.map((l) => ({ id: l.id, text: l.text, file: l.file }))));
