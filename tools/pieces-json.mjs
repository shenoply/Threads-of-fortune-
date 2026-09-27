// Prints the wardrobe catalogue as JSON (for the Python tools).
import { build } from 'esbuild';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const out = join(mkdtempSync(join(tmpdir(), 'pj-')), 'w.mjs');
await build({ entryPoints: ['src/data/wardrobe.ts'], bundle: true, format: 'esm', outfile: out, logLevel: 'silent' });
const W = await import(pathToFileURL(out).href);
process.stdout.write(JSON.stringify({ pieces: W.PIECES, start: W.START_OUTFIT }));
