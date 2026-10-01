// Arran on repeated entries: the same story situation (a book in your bag, Sinai ahead) does not greet
// you every time, and ordinary visits go round his cases, never the same scene twice running, even
// several times in one day.
//   PORT=5173 node tests/arran-rotation.mjs
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? '4173';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const has = (id) => p.locator(`[data-testid="${id}"]`).count();
const edit = (fn) => p.evaluate((src) => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); new Function('s', 'd', src)(d.state, d); localStorage.setItem(k, JSON.stringify(d)); }, fn);
const visit = async () => {
  await p.click('[data-testid=nav-stall]'); await p.waitForSelector('[data-testid=district]'); await p.waitForTimeout(200);
  if (await has('stall-sheet-close')) await p.click('[data-testid=stall-sheet-close]');
  await p.locator('[data-testid=poi-lab]').scrollIntoViewIfNeeded(); await p.click('[data-testid=poi-lab]');
  await p.waitForSelector('[data-testid=arran-door]'); await p.click('[data-testid=arran-enter]'); await p.waitForTimeout(400);
  const n = await p.locator('[data-testid=arran-scene]').getAttribute('data-scene').catch(() => '-');
  await p.click('[data-testid=arran-leave]'); await p.waitForTimeout(250);
  return n;
};
try {
  await p.goto(`http://localhost:${PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
  await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
  await edit(`s.tutorial = { done: true, step: 'done', inspected: true }; s.introSeen = ['arran']; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; localStorage.setItem('tof-skip-chapters', '1'); Object.assign(s.world, { at: 'giza', hour: 11 }); s.arranVisit = { visitCount: 3 }; s.arranBooks = { field_safety: { phase: 'requested' } };`);
  await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(800);
  const seen = [];
  for (let i = 0; i < 8; i++) seen.push(await visit());
  const repeats = seen.filter((n, i) => i && n === seen[i - 1]).length;
  console.log('eight entries, one day, Sinai pending:', seen.join(' '), '| back-to-back repeats', repeats, '| distinct', new Set(seen).size, '| Sinai scene shown', seen.filter((n) => n === '5').length, 'times');
} catch (e) { console.log('FAILED', e.message.split('\n')[0]); }
console.log('errors', JSON.stringify(errs));
await b.close();
