// List which of Arran's lines have recordings, so the game only requests files that exist.
// After adding or regenerating clips under public/audio/arran/<folder>/<line-id>.{ogg,mp3}, run:
//   node tools/build-arran-voice-manifest.mjs
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const root = new URL('../public/audio/arran/', import.meta.url).pathname;
const lines = {};
for (const dir of readdirSync(root)) {
  const p = join(root, dir);
  if (!statSync(p).isDirectory()) continue;
  for (const f of readdirSync(p)) {
    const m = f.match(/^(arran-[a-z0-9-]+)\.(ogg|mp3)$/);
    if (m) (lines[m[1]] ??= []).push(m[2]);
  }
}
writeFileSync(join(root, 'manifest.json'), JSON.stringify({ lines }, null, 1) + '\n');
console.log(`${Object.keys(lines).length} Arran lines have recordings`);
