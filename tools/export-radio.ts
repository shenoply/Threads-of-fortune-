import { writeFileSync } from 'node:fs';
import { allSegments, loadArabic } from '../src/game/radio/bulletin';
await loadArabic();
const out = { en: allSegments('en'), ar: allSegments('ar') };
writeFileSync('/home/claude/radio/script.json', JSON.stringify(out, null, 1));
console.log('en', out.en.length, 'ar', out.ar.length);
