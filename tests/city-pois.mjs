// Every place in every walkable city can be reached along the streets: walk to it and its screen opens.
//   PORT=5173 node tests/city-pois.mjs
import { chromium } from 'playwright';
import { PORT as __PORT, SHOTS as __SHOTS } from './_env.mjs';
const PORT = __PORT;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const has = (sel) => p.locator(sel).count();
await p.goto(`http://localhost:${PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]'); await p.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.started === true; } catch { return false; } }, null, { timeout: 10000 }).catch(() => {}); /* day one is on disk before the save is edited */
const pos = { cairo: [214.3, 413.7], alexandria: [86.4, 387.2], jerusalem: [403.3, 341.1], damascus: [486.9, 291], istanbul: [167.1, 49], amman: [452.3, 339.9], baghdad: [823.9, 266.2] };
const bad = [];
const enter = async (c, x, y) => {
  await p.evaluate(([c, x, y]) => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); d.state.tutorial = { done: true, step: 'done', inspected: true }; d.state.guideSeen = true; d.state.missionNews = undefined; d.state.levelUps = []; d.state.titleNews = []; localStorage.setItem('tof-skip-chapters', '1'); d.state.world.hour = 10; Object.assign(d.state.world, { at: c, x, y }); delete d.state.venueWalk; (window.__tofEdit = true, localStorage.setItem(k, JSON.stringify(d)), window.__tofEdit = false, (() => { /* hold the game's autosave off the edited save until the reload */ const w = Storage.prototype.setItem; if (w.__hold) return; const h = function (key, v) { if (key === 'threads-of-fortune-save' && !window.__tofEdit) return; return w.call(this, key, v); }; h.__hold = true; Storage.prototype.setItem = h; setTimeout(() => { if (Storage.prototype.setItem === h) Storage.prototype.setItem = w; }, 4000); })()); }, [c, x, y]);
  await p.reload(); if (await has('[data-testid=continue]')) await p.click('[data-testid=continue]');
  await p.click('[data-testid=nav-map]'); await p.waitForTimeout(600);
  if (await has('[data-testid=guide-skip]')) await p.click('[data-testid=guide-skip]');
  if (await has('[data-testid=enter]')) await p.click('[data-testid=enter]');
  await p.waitForTimeout(500);
  if (await has('[data-testid=menu-walk]')) await p.click('[data-testid=menu-walk]');
  else if (await has('[data-testid=walk-city]')) await p.locator('[data-testid=walk-city]').click({ force: true });
  await p.waitForTimeout(800);
};
for (const [c, [x, y]] of Object.entries(pos)) {
  await enter(c, x, y);
  const ids = await p.locator('[data-testid^=vpoi-]').evaluateAll((els) => els.map((e) => e.dataset.testid.slice(5)));
  if (!ids.length) { await p.screenshot({ path: __SHOTS + '/cp-' + c + '.png' }); console.log(c, 'no places shown'); }
  for (const id of ids) {
    const before = await p.locator('canvas.district-canvas').count();
    const btn = p.locator(`[data-testid=vpoi-${id}]`);
    if (!(await btn.count())) { await enter(c, x, y); }
    await p.locator(`[data-testid=vpoi-${id}]`).click({ force: true });
    let done = false;
    for (let t = 0; t < 40 && !done; t++) {
      await p.waitForTimeout(250);
      // arriving opens something: the venue closes, a note, or another screen
      done = (await p.locator('canvas.district-canvas').count()) < before || (await has('.venue-note, [data-testid=venue-note], [role=dialog]')) > 0;
    }
    const pos2 = await p.evaluate(() => document.querySelector('[data-testid=venue]')?.getAttribute('data-pos') ?? '');
    if (!done) bad.push(`${c}:${id}`);
    console.log(c.padEnd(10), id.padEnd(14), done ? 'reached' : 'NOT REACHED', pos2);
    if (done) { await enter(c, x, y); }
  }
}
console.log(bad.length ? `FAIL ${bad.join(' ')}` : 'PASS', 'errors', JSON.stringify(errs.slice(0, 3)));
await b.close();
