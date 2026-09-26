// After dropping recorded clips into public/voices/<speaker>/, run: node tools/build-voice-manifest.mjs
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const root = new URL('../public/voices/', import.meta.url).pathname;
const ids = [];
for (const sp of readdirSync(root)) {
  const dir = join(root, sp);
  if (!statSync(dir).isDirectory()) continue;
  for (const f of readdirSync(dir)) if (f.endsWith('.mp3')) ids.push(`${sp}/${f.replace(/\.mp3$/, '')}`);
}
writeFileSync(join(root, 'manifest.json'), JSON.stringify({ ids }, null, 0));
console.log(`${ids.length} clips listed in voices/manifest.json`);
