// The radio: "Skip to the news" jumps past the greeting and the date to the first news item; tapping a
// line plays from there; the stall's own radio gets a "News" button while it reads the greeting.
//   PORT=5173 node tests/radio-skip.mjs
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? '4173';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const has = (id) => p.locator(`[data-testid="${id}"]`).count();
const edit = (fn) => p.evaluate((src) => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); new Function('s', 'd', src)(d.state, d); localStorage.setItem(k, JSON.stringify(d)); }, fn);
const onLine = () => p.locator('.radio-captions p.on').textContent().catch(() => '');
try {
  await p.goto(`http://localhost:${PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
  await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
  await edit(`s.tutorial = { done: true, step: 'done', inspected: true }; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; localStorage.setItem('tof-skip-chapters', '1'); Object.assign(s.world, { at: 'giza', hour: 10 }); s.queue = ['yusuf']; s.arrivals = [10.05]; s.visitIdx = 0;`);
  await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(800);
  await p.click('[data-testid=radio-btn]'); await p.waitForTimeout(400);
  console.log('before playing: skip button', await has('radio-skip-news'));
  await p.click('[data-testid=radio-power]'); await p.waitForTimeout(2500);
  console.log('playing, at:', (await onLine()).slice(0, 60), '| skip shown', await has('radio-skip-news'));
  await p.click('[data-testid=radio-skip-news]'); await p.waitForTimeout(2500);
  console.log('after skip, at:', (await onLine()).slice(0, 80), '| skip gone', (await has('radio-skip-news')) === 0);
  const n = await p.locator('[data-testid^=radio-line-]').count();
  await p.click(`[data-testid=radio-line-${n - 1}]`); await p.waitForTimeout(2500);
  console.log('tapped the last line, at:', (await onLine()).slice(0, 60));
  await p.click('[data-testid=radio-close]'); await p.waitForTimeout(300);
  // the stall's radio
  await p.click('[data-testid=nav-stall]'); await p.waitForTimeout(800);
  if (await has('stall-wait')) await p.click('[data-testid=stall-wait]'); await p.waitForTimeout(1500);
  await p.locator('[data-testid=stall-radio]').evaluate((e) => e.click()); await p.waitForTimeout(1500);
  console.log('stall radio: News button', await has('stall-radio-skip'));
  await p.locator('[data-testid=stall-radio-skip]').evaluate((e) => e.click()); await p.waitForTimeout(2000);
  console.log('   after News: button gone', (await has('stall-radio-skip')) === 0, '| radio still on', await p.locator('[data-testid=stall-radio].on').count());
} catch (e) { console.log('FAILED', e.message.split('\n').slice(0, 6).join(' / ')); await p.screenshot({ path: '/tmp/radio-fail.png' }); }
console.log('errors', JSON.stringify(errs));
await b.close();
