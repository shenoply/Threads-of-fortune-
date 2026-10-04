// Bilgin's two introduction films: the café one the first time you go in, the chess one the first time
// you sit down to play him. Each plays by itself once per save (kept across a reload), can be replayed,
// skipped and muted, keeps the dialogue (and its voice) from starting underneath, and falls back to
// its thumbnail and introduction when the video cannot play. With VIDEO=1 the videos are served from a
// stand-in clip, to check the video path itself.
//   PORT=5173 SHOTS=/tmp/bilgin node tests/bilgin-films.mjs
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
const PORT = process.env.PORT ?? '5173', S = process.env.SHOTS ?? '/tmp/bilgin';
mkdirSync(S, { recursive: true });
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const vp = process.env.DESKTOP ? { width: 1280, height: 800 } : { width: 390, height: 844 };
const p = await b.newPage({ viewport: vp, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
// the test browser has no H.264, so the stand-in is a WebM clip served at the .mp4 address
const stand = 'public/video/arran-intro.webm';
if (process.env.VIDEO && existsSync(stand)) {
  const body = readFileSync(stand);
  await p.route('**/video/bilgin-intro-*.mp4', (r) => r.fulfill({ status: 200, contentType: 'video/webm', body }));
}
const has = (id) => p.locator(`[data-testid="${id}"]`).count();
const seen = () => p.evaluate(() => JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.introSeen ?? []);
const district = async () => { await p.click('[data-testid=nav-stall]'); await p.waitForSelector('[data-testid=district]'); await p.waitForTimeout(300); if (await has('stall-sheet-close')) await p.click('[data-testid=stall-sheet-close]'); };
const coffee = async () => { await p.locator('[data-testid=poi-coffee]').scrollIntoViewIfNeeded(); await p.click('[data-testid=poi-coffee]'); await p.waitForTimeout(1500); };
const out = []; let ok = true;
const check = (cond, msg) => { out.push(`${cond ? 'ok  ' : 'FAIL'} ${msg}`); if (!cond) ok = false; };
try {
  await p.goto(`http://localhost:${PORT}/`);
  await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
  await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
  await p.evaluate(() => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); const s = d.state; s.tutorial = { done: true, step: 'done', inspected: true }; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; Object.assign(s.world, { at: 'giza', hour: 10 }); localStorage.setItem(k, JSON.stringify(d)); localStorage.setItem('tof-skip-chapters', '1'); });
  await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(800);

  // 1. the café film
  await district(); await coffee();
  await p.waitForSelector('[data-testid=film-abuhamid]', { timeout: 6000 });
  check(!(await has('dialogue')), 'no dialogue (or its voice) under the café film');
  await p.waitForTimeout(3500);
  const mode1 = await p.locator('[data-testid=film-abuhamid]').getAttribute('data-mode');
  const vstate = await p.evaluate(() => { const v = document.querySelector('[data-testid=film-video]'); return v ? { t: v.currentTime, muted: v.muted, vol: v.volume, paused: v.paused } : null; });
  const narr = await p.evaluate(() => { const a = document.querySelector('[data-testid=film-voice]'); return a ? !a.paused : false; });
  out.push(`café film mode: ${mode1}; video ${JSON.stringify(vstate)}; narrator playing: ${narr}; caption "${(await p.locator('[data-testid=film-caption]').textContent()).slice(0, 50)}"`);
  if (mode1 === 'video') check(vstate && vstate.t > 0.5 && !vstate.muted && vstate.vol > 0 && !narr, 'video plays with its own sound and no narrator over it');
  else check(narr, 'fallback: paintings with the narrator and captions');
  await p.screenshot({ path: `${S}/cafe-film.png` });
  await p.click('[data-testid=film-sound]');
  check((await p.locator('[data-testid=film-sound]').getAttribute('aria-pressed')) === 'true', 'sound off button');
  const mutedNow = await p.evaluate(() => { const m = document.querySelector('[data-testid=film-video]') ?? document.querySelector('[data-testid=film-voice]'); return m?.muted; });
  check(mutedNow === true, 'sound off mutes the film');
  await p.click('[data-testid=film-skip]'); await p.waitForTimeout(600);
  check(!(await has('film-abuhamid')) && (await has('cafe-room')) > 0, 'skip closes the film, the café room follows');
  await p.click('[data-testid=cafe-hot-bilgin]'); await p.waitForTimeout(500);
  check((await has('dialogue')) > 0, 'talking to Bilgin from the room');
  check((await seen()).includes('abuhamid'), 'café film marked seen');
  await p.screenshot({ path: `${S}/dialogue.png` });

  // 2. the chess film, the first time you sit down to play
  await p.click('text=Another time, Bilgin.'); await p.waitForTimeout(400);
  await p.click('[data-testid=cafe-hot-corner]'); await p.waitForTimeout(600);
  await p.click('[data-testid=cafe-play]');
  await p.waitForSelector('[data-testid=film-bilgin-chess]', { timeout: 6000 });
  await p.waitForTimeout(3000);
  const mode2 = await p.locator('[data-testid=film-bilgin-chess]').getAttribute('data-mode');
  const cap2 = await p.locator('[data-testid=film-caption]').textContent();
  out.push(`chess film mode: ${mode2}; caption "${cap2.slice(0, 60)}"`);
  if (mode2 !== 'video') check(/chess|Istanbul/.test(cap2), 'fallback: chess thumbnail with the introduction text');
  await p.screenshot({ path: `${S}/chess-film.png` });
  await p.click('[data-testid=film-skip]'); await p.waitForTimeout(600);
  check((await has('cafe-table')) > 0, 'after the chess film, Bilgin\'s table');
  check((await seen()).includes('bilgin-chess'), 'chess film marked seen');
  check((await has('bilgin-chess-film-again')) > 0, 'replay button at the table');
  await p.screenshot({ path: `${S}/table.png` });
  await p.click('[data-testid=bilgin-chess-film-again]'); await p.waitForTimeout(800);
  check((await has('film-bilgin-chess')) > 0, 'replay plays it again');
  await p.click('[data-testid=film-skip]'); await p.waitForTimeout(400);
  // the games still work
  await p.click('[data-testid=cafe-chess]'); await p.click('[data-sq=e2]'); await p.click('[data-sq=e4]');
  await p.waitForFunction(() => !document.querySelector('[data-sq=e7] .pc') || document.querySelectorAll('.chess-board .last').length === 2, null, { timeout: 8000 }).catch(() => {});
  check((await p.locator('.chess-board .pc.b').count()) === 16, 'chess still plays');
  await p.click('[data-testid=cafe-quit]'); await p.waitForTimeout(400);

  // 3. after a reload: neither film plays by itself again; both replay
  await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(800);
  await district(); await coffee();
  check(!(await has('film-abuhamid')) && (await has('cafe-room')) > 0, 'café film not again after reload');
  await p.click('[data-testid=cafe-hot-corner]'); await p.waitForTimeout(600);
  await p.click('[data-testid=cafe-play]'); await p.waitForTimeout(800);
  check(!(await has('film-bilgin-chess')) && (await has('cafe-table')) > 0, 'chess film not again after reload');
  await p.click('[data-testid=cafe-close]'); await p.waitForTimeout(300);
  await p.click('[data-testid=abuhamid-film-again]'); await p.waitForTimeout(800);
  check((await has('film-abuhamid')) > 0, 'café film replay button');
  await p.click('[data-testid=film-skip]'); await p.waitForTimeout(400);
  await p.click('[data-testid=cafe-hot-bilgin]'); await p.waitForTimeout(500);
  check((await p.locator('.dlg-who img').getAttribute('src')) === 'art/portraits/abuhamid.jpg', 'dialogue card uses the new portrait');
  console.log(out.join('\n'));
  console.log(ok && !errs.length ? 'PASS' : 'FAIL', 'errors', JSON.stringify(errs.slice(0, 3)));
} catch (e) { console.log(out.join('\n')); console.log('FAIL', e.message.split('\n')[0], JSON.stringify(errs.slice(0, 3))); }
await b.close();
