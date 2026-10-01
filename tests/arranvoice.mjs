// Arran's voice: greeting on entry, a different line on each tap, subtitles always, one clip at a
// time, dialogue volume and mute, inspection and mummy lines, leaving mid-line, missing files.
// No recordings exist in the repo: the test serves a generated test tone (not anyone's voice) for
// the clip files through request interception.   PORT=5173 node tests/arranvoice.mjs
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? '4173';
const S = process.env.SHOTS ?? '/tmp';
const W = +(process.env.W ?? 390), H = +(process.env.H ?? 844), tag = process.env.TAG ?? 'phone';
// a 2.5 s 440 Hz tone as WAV
const tone = (() => { const sr = 8000, n = sr * 2.5, b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40); for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.sin(i / sr * 2 * Math.PI * 440) * 3000), 44 + i * 2); return b; })();
const b = await chromium.launch({ args: ['--autoplay-policy=user-gesture-required'] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const warns = []; p.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') warns.push(m.text().slice(0, 80)); });
let manifestHits = 0;
const ids = await (async () => { const src = (await import('node:fs')).readFileSync('src/data/arranVoice.ts', 'utf8'); return [...src.matchAll(/id: '(arran-[a-z0-9-]+)'/g)].map((m) => m[1]); })();
await p.route('**/audio/arran/manifest.json', (r) => { manifestHits++; r.fulfill({ contentType: 'application/json', body: JSON.stringify({ lines: Object.fromEntries(ids.filter((i) => i !== 'arran-lab-explain-03').map((i) => [i, ['mp3']])) }) }); });
await p.route('**/audio/arran/**/*.mp3', (r) => (r.request().url().includes('arran-lab-explain-03') ? r.fulfill({ status: 404, body: '' }) : r.fulfill({ contentType: 'audio/wav', body: tone })));
const has = (id) => p.locator(`[data-testid="${id}"]`).count();
const edit = (fn) => p.evaluate((src) => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); new Function('s', 'd', src)(d.state, d); localStorage.setItem(k, JSON.stringify(d)); }, fn);
const reload = async () => { await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(700); };
const V = () => p.evaluate(() => ({ playing: window.__arranVoice.playing(), vol: window.__arranVoice.volume(), src: (window.__arranVoice.src() || '').split('/').pop() }));
const sub = async () => ({ line: await p.locator('[data-testid=arran-subtitle]').last().getAttribute('data-line').catch(() => null), text: await p.locator('[data-testid=arran-subtitle]').last().textContent().catch(() => null) });
const toLab = async () => {
  await p.click('[data-testid=nav-stall]'); await p.waitForSelector('[data-testid=district]'); await p.waitForTimeout(300);
  if (await has('stall-sheet-close')) await p.click('[data-testid=stall-sheet-close]');
  await p.locator('[data-testid=poi-lab]').scrollIntoViewIfNeeded(); await p.click('[data-testid=poi-lab]');
  await p.waitForSelector('[data-testid=arran-door]', { timeout: 20000 });
};
try {
  await p.goto(`http://localhost:${PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
  await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
  await edit(`s.tutorial = { done: true, step: 'done', inspected: true }; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; Object.assign(s.world, { at: 'giza', hour: 9 }); s.cash = 800; s.queue = []; s.visitIdx = 0; s.inventory = s.inventory.slice(0, 3); s.inventory[1].condition = 'Worn'; delete s.volumes; delete s.arranVisit; d.version = 16; localStorage.setItem('tof-skip-chapters', '1');`);
  await reload();
  const st0 = JSON.parse(await p.evaluate(() => localStorage.getItem('threads-of-fortune-save')));
  console.log('migrated to', st0.version, '| volumes', JSON.stringify(st0.state.volumes), '| manifest requests before the lab:', manifestHits);
  await toLab(); await p.click('[data-testid=arran-enter]'); await p.waitForTimeout(600);
  console.log('1-4 enter: subtitle', JSON.stringify(await sub()), '| audio', JSON.stringify(await V()), '| activity', await p.locator('[data-testid=arran-activity]').getAttribute('data-activity'));
  await p.screenshot({ path: `${S}/voice-${tag}-greeting.png` });
  const seen = [];
  for (let i = 0; i < 4; i++) { await p.click('[data-testid=arran-talk]'); await p.waitForTimeout(250); seen.push((await sub()).line); }
  console.log('5-6 taps:', seen.join(' '), '| consecutive repeats:', seen.some((x, i) => i && x === seen[i - 1]));
  // rapid taps: one clip only
  const count = await p.evaluate(async () => { let max = 0; const els = new Set(); const orig = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { els.add(this); return orig.call(this); }; const btn = document.querySelector('[data-testid=arran-talk]'); for (let i = 0; i < 12; i++) { btn.click(); await new Promise((r) => setTimeout(r, 30)); max = Math.max(max, [...els].filter((e) => !e.paused).length); } await new Promise((r) => setTimeout(r, 400)); max = Math.max(max, [...els].filter((e) => !e.paused).length); HTMLMediaElement.prototype.play = orig; return max; });
  console.log('15 rapid taps: most clips playing at once =', count);
  // volume mid-line, music untouched
  await p.click('[data-testid=arran-talk]'); await p.waitForTimeout(300);
  await p.evaluate(async () => { const m = await import('/src/game/state/store.ts'); m.useGame.getState().setVolume('dialogue', 0.3); });
  console.log('7-8 dialogue 30% mid-line:', JSON.stringify(await V()), '| engine volumes', JSON.stringify(await p.evaluate(() => window.__tofAudio.volumes)));
  // dialogue off: subtitles only
  await p.evaluate(async () => { const m = await import('/src/game/state/store.ts'); m.useGame.getState().setSetting('dialogue', false); });
  console.log('   switch off mid-line: audio', JSON.stringify(await V()));
  await p.click('[data-testid=arran-talk]'); await p.waitForTimeout(400);
  console.log('9-10 dialogue off, tap: subtitle', (await sub()).line, '| audio', JSON.stringify(await V()));
  await p.evaluate(async () => { const m = await import('/src/game/state/store.ts'); m.useGame.getState().setSetting('dialogue', true); m.useGame.getState().setVolume('dialogue', 0.8); m.useGame.getState().setVolume('master', 0.5); });
  // inspection: hand him a rug
  const worn = st0.state.inventory[1].uid;
  await p.click(`[data-testid=arran-rug-${worn}]`); await p.waitForTimeout(400);
  console.log('11-12 rug handed over:', (await sub()).line, JSON.stringify(await V()), '(volume should be 0.4 = master 0.5 × dialogue 0.8)');
  await p.screenshot({ path: `${S}/voice-${tag}-inspect.png` });
  // missing file: line listed... this one 404s
  await p.evaluate(async () => { const m = await import('/src/game/audio/arranVoice.ts'); m.playArranVoice({ id: 'arran-lab-explain-03' }); });
  await p.waitForTimeout(500);
  console.log('   404 clip: subtitle', (await sub()).line, '| audio', JSON.stringify(await V()));
  // leaving mid-line
  await p.click('[data-testid=arran-talk]'); await p.waitForTimeout(200);
  await p.click('[data-testid=arran-leave]'); await p.waitForTimeout(300);
  console.log('   left mid-line: audio', JSON.stringify(await V()), '| subtitle on screen', await has('arran-subtitle'));
  // same day re-entry keeps the activity
  await toLab(); await p.click('[data-testid=arran-enter]'); await p.waitForTimeout(300);
  console.log('   same-day re-entry activity:', await p.locator('[data-testid=arran-activity]').getAttribute('data-activity'));
  await p.click('[data-testid=arran-leave]');
  // mummy scene: the conservator's permission
  await edit(`s.arranVisit = { ...(s.arranVisit || { visitCount: 1 }), permitDay: s.day, lastActivityDay: -1 };`); await reload();
  await toLab(); await p.click('[data-testid=arran-enter]'); await p.waitForSelector('[data-testid=mummy-study]'); await p.waitForTimeout(400);
  await p.click('[data-testid=mummy-next]'); await p.waitForTimeout(500);
  console.log('13-14 mummy scene:', (await sub()).line, JSON.stringify(await V()));
  await p.screenshot({ path: `${S}/voice-${tag}-mummy.png` });
  for (let i = 0; i < 6; i++) await p.click('[data-testid=mummy-next]').catch(() => {});
  await p.waitForTimeout(300);
  const st2 = JSON.parse(await p.evaluate(() => localStorage.getItem('threads-of-fortune-save'))).state;
  console.log('   mummy seen:', st2.arranVisit.mummyIntroductionSeen, '| replay link:', await has('arran-mummy-open'), '| scene closed:', !(await has('mummy-study')));
  await p.click('[data-testid=arran-leave]'); await p.waitForTimeout(300);
  await p.click('[data-testid=settings-btn]'); await p.waitForTimeout(300);
  await p.locator('[data-testid=vol-dialogue]').fill('40'); await p.locator('[data-testid=vol-music]').fill('70');
  await p.keyboard.press('Escape'); await p.click('.overlay', { position: { x: 5, y: 5 } }).catch(() => {});
  await reload();
  console.log('   after reload: volumes', JSON.stringify(JSON.parse(await p.evaluate(() => localStorage.getItem('threads-of-fortune-save'))).state.volumes), '| engine', JSON.stringify(await p.evaluate(() => window.__tofAudio.volumes)));
  await p.click('[data-testid=settings-btn]'); await p.waitForTimeout(300);
  await p.screenshot({ path: `${S}/voice-${tag}-settings.png` });
  console.log('errors', errs, '| console warnings', warns.filter((w) => /arran/i.test(w)));
} catch (e) { console.log('FAIL', e.message.split('\n')[0]); await p.screenshot({ path: `${S}/voice-${tag}-fail.png` }); }
await b.close();
