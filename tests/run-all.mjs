// Runs every browser test (tests/*.mjs) one after another, at most JOBS at once,
// each with a time limit, and prints a pass/fail summary.
//
//   node tests/run-all.mjs                 all tests
//   node tests/run-all.mjs malek opening   only tests whose name contains one of these words
//
// Environment:
//   PORT=5173      game server (dev server by default)
//   JOBS=2         tests run side by side (max 2 recommended: the game is heavy)
//   TIMEOUT=600    seconds per test (a few long tests get more, see LONG below)
//   LOGS=/dev/shm/tests-logs   one log per test
//   SHOTS=/dev/shm/tests-shots screenshots (each test writes into SHOTS/<name>)
//
// A test fails when it exits non-zero, runs out of time, or prints a line containing
// FAIL / FAILED (the convention every test here uses for a broken check). A failed test is run once
// more (RETRIES=1); one that passes the second time is listed as flaky.
// Each test runs with tests/_nohmr.mjs preloaded, which mutes Vite's hot updates (HMR=1 keeps them).
import { spawn } from 'node:child_process';
import { readdirSync, mkdirSync, createWriteStream, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const PORT = process.env.PORT ?? '5173';
const JOBS = Math.max(1, Math.min(+(process.env.JOBS ?? 2), 4));
const TIMEOUT = +(process.env.TIMEOUT ?? 600);
const LOGS = process.env.LOGS ?? '/dev/shm/tests-logs';
const SHOTS = process.env.SHOTS ?? '/dev/shm/tests-shots';
// tests that walk a long way through the game
const LONG = { arranroutes: 900, 'city-pois': 900, films: 900, firsthour: 900, docshot: 900 };
const SKIP = new Set(['_env.mjs', '_nohmr.mjs', 'run-all.mjs']);
const RETRIES = +(process.env.RETRIES ?? 1);
mkdirSync(LOGS, { recursive: true });

const filters = process.argv.slice(2);
const tests = readdirSync(here)
  .filter((f) => f.endsWith('.mjs') && !SKIP.has(f))
  .map((f) => f.replace(/\.mjs$/, ''))
  .filter((n) => !filters.length || filters.some((w) => n.includes(w)))
  .sort();

// is the game up?
try {
  const r = await fetch(`http://localhost:${PORT}/`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
} catch (e) {
  console.error(`Game not reachable on http://localhost:${PORT}/ (${e.message}). Start it with: npx vite --port ${PORT}`);
  process.exit(2);
}

const results = [];
const runOnce = (name, attempt) => new Promise((resolve) => {
  const limit = (LONG[name] ?? TIMEOUT) * 1000;
  const logPath = join(LOGS, attempt ? `${name}.retry${attempt}.log` : `${name}.log`);
  const log = createWriteStream(logPath);
  const shots = join(SHOTS, name); mkdirSync(shots, { recursive: true });
  const t0 = Date.now();
  const child = spawn(process.execPath, ['--import', join(here, '_nohmr.mjs'), join(here, `${name}.mjs`)], {
    cwd: root, env: { ...process.env, PORT, SHOTS: shots }, stdio: ['ignore', 'pipe', 'pipe'], detached: true, // own process group, so a timeout also ends its browser
  });
  child.stdout.pipe(log, { end: false }); child.stderr.pipe(log, { end: false });
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); } }, limit);
  child.on('close', (code) => {
    clearTimeout(timer);
    log.end(() => {
      const out = readFileSync(logPath, 'utf8');
      const failLines = out.split('\n').filter((l) => /\bFAIL(ED)?\b/.test(l));
      const secs = Math.round((Date.now() - t0) / 1000);
      const ok = !timedOut && code === 0 && !failLines.length;
      const why = timedOut ? `timed out after ${limit / 1000}s` : code !== 0 ? `exit ${code}: ${(out.trim().split('\n').find((l) => /Error|error:/.test(l)) ?? '').slice(0, 160)}` : failLines.slice(0, 3).map((l) => l.slice(0, 160)).join(' | ');
      resolve({ name, ok, secs, why });
    });
  });
});

const run = async (name) => {
  let r = await runOnce(name, 0); const firstWhy = r.why;
  for (let a = 1; !r.ok && a <= RETRIES; a++) r = await runOnce(name, a);
  if (r.ok && firstWhy) r.flaky = firstWhy;
  results.push(r);
  console.log(`${r.ok ? (r.flaky ? 'FLAKY' : 'PASS ') : 'FAIL '} ${name.padEnd(18)} ${String(r.secs).padStart(4)}s${r.ok ? (r.flaky ? '  passed on retry; first run: ' + r.flaky : '') : '  ' + r.why}`);
};

console.log(`Running ${tests.length} tests against http://localhost:${PORT}/ (${JOBS} at a time); logs in ${LOGS}`);
const queue = [...tests];
await Promise.all(Array.from({ length: JOBS }, async () => { while (queue.length) await run(queue.shift()); }));

const failed = results.filter((r) => !r.ok), flaky = results.filter((r) => r.ok && r.flaky);
console.log(`\n${results.length - failed.length} passed (${flaky.length} only on retry), ${failed.length} failed of ${results.length}`);
if (flaky.length) console.log('Flaky: ' + flaky.map((r) => r.name).join(', '));
if (failed.length) console.log('Failed: ' + failed.map((r) => r.name).join(', '));
process.exit(failed.length ? 1 : 0);
