// Malek's first-visit film: plays the first time his shop is open to you (video, then the last frame
// held under the narration, captions), Skip or Continue leaves it seen, it does not play again on its
// own, and "Watch the film again" replays it.
//   PORT=5173 SHOTS=/tmp/malek node tests/introfilm.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const PORT = process.env.PORT ?? '4173', S = process.env.SHOTS ?? '/tmp/malek';
mkdirSync(S, { recursive: true });
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const has = (id) => p.locator(`[data-testid="${id}"]`).count();
const edit = (fn) => p.evaluate((src) => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); new Function('s', 'd', src)(d.state, d); localStorage.setItem(k, JSON.stringify(d)); }, fn);
const reload = async () => { await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(800); };
const toShop = async () => {
  await p.click('[data-testid=nav-stall]'); await p.waitForSelector('[data-testid=district]'); await p.waitForTimeout(300);
  if (await has('stall-sheet-close')) await p.click('[data-testid=stall-sheet-close]');
  await p.locator('[data-testid=poi-malek]').scrollIntoViewIfNeeded(); await p.click('[data-testid=poi-malek]');
  await p.waitForSelector('[data-testid=malek-shop], [data-testid=film-malek]', { timeout: 20000 }); await p.waitForTimeout(500);
};
try {
  await p.goto(`http://localhost:${PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'))); await p.reload();
  await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
  await edit(`s.tutorial = { done: true, step: 'done', inspected: true }; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; Object.assign(s.world, { at: 'giza', hour: 6 }); localStorage.setItem('tof-skip-chapters', '1');`);
  await reload();
  await toShop();
  console.log('06:00 (closed): film?', await has('film-malek'), '| closed card', await has('malek-closed'));
  await p.click('[data-testid=malek-leave]');
  await edit(`s.world.hour = 12;`); await reload();
  await toShop();
  console.log('12:00 first open visit: film', await has('film-malek'), '| play button needed', await has('film-play'));
  await p.waitForTimeout(3500);
  console.log('   at 3.5 s: video playing', await p.evaluate(() => { const v = document.querySelector('[data-testid=film-video]'); return v && !v.paused && v.currentTime > 1; }), '| caption:', await p.locator('[data-testid=film-caption]').textContent());
  await p.screenshot({ path: `${S}/film-playing.png` });
  await p.waitForTimeout(8000);
  console.log('   at 11.5 s: last frame held', await p.locator('.film__still').count(), '| caption:', await p.locator('[data-testid=film-caption]').textContent());
  await p.screenshot({ path: `${S}/film-held.png` });
  await p.click('[data-testid=film-skip]'); await p.waitForTimeout(500);
  console.log('   skipped: door shown', await has('malek-door'), '| introSeen', JSON.stringify(await p.evaluate(() => JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.introSeen)));
  await p.click('[data-testid=malek-leave]'); await p.waitForTimeout(300);
  await reload(); await toShop();
  console.log('second visit after reload: film', await has('film-malek'), '| door', await has('malek-door'));
  await p.click('[data-testid=malek-film-again]'); await p.waitForTimeout(500);
  console.log('watch again: film', await has('film-malek'));
  await p.click('[data-testid=film-skip]'); await p.waitForTimeout(300);
  console.log('   back to the door', await has('malek-door'));
} catch (e) { console.log('FAILED', e.message.split('\n')[0]); await p.screenshot({ path: `${S}/film-fail.png` }); }
console.log('errors', JSON.stringify(errs));
await b.close();
