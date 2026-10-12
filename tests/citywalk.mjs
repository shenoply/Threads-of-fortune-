import { chromium } from 'playwright';
import { PORT as __PORT, SHOTS as __SHOTS } from './_env.mjs';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 });
const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto(`http://localhost:${__PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]'); await p.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.started === true; } catch { return false; } }, null, { timeout: 10000 }).catch(() => {}); /* day one is on disk before the save is edited */
const pos = { alexandria: [86.4, 387.2], jerusalem: [403.3, 341.1], damascus: [486.9, 291], istanbul: [167.1, 49], amman: [452.3, 339.9], baghdad: [823.9, 266.2] };
for (const [c, [x, y]] of Object.entries(pos)) {
  await p.evaluate(([c, x, y]) => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); d.state.tutorial = { done: true, step: 'done', inspected: true }; d.state.guideSeen = true; d.state.introSeen = [...new Set([...(d.state.introSeen ?? []), 'alexandria'])]; /* no Alexandria arrival film */ Object.assign(d.state.world, { at: c, x, y }); (window.__tofEdit = true, localStorage.setItem(k, JSON.stringify(d)), window.__tofEdit = false, (() => { /* hold the game's autosave off the edited save until the reload */ const w = Storage.prototype.setItem; if (w.__hold) return; const h = function (key, v) { if (key === 'threads-of-fortune-save' && !window.__tofEdit) return; return w.call(this, key, v); }; h.__hold = true; Storage.prototype.setItem = h; setTimeout(() => { if (Storage.prototype.setItem === h) Storage.prototype.setItem = w; }, 4000); })()); }, [c, x, y]);
  await p.reload(); await p.click('[data-testid=continue]'); await p.click('[data-testid=nav-map]'); await p.waitForTimeout(500);
  if (await p.locator('[data-testid=guide-skip]').count()) await p.click('[data-testid=guide-skip]');
  if (await p.locator('[data-testid=enter]').count()) await p.click('[data-testid=enter]');
  await p.waitForTimeout(400);
  // the town menu opens full screen on arrival; "Walk the streets" is its walk tile
  await p.waitForSelector('[data-testid=town-menu], [data-testid=walk-city]', { timeout: 8000 }).catch(() => {});
  const has = (await p.locator('[data-testid=menu-walk]').count()) + (await p.locator('[data-testid=walk-city]').count());
  if (c === 'damascus') await p.screenshot({ path: `${__SHOTS}/cw-${c}-town.png` });
  if (await p.locator('[data-testid=menu-walk]').count()) await p.click('[data-testid=menu-walk]'); else await p.click('[data-testid=walk-city]');
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${__SHOTS}/cw-${c}.png` });
  const mk = p.locator('[data-testid=vpoi-souq], [data-testid=vpoi-hamidiyya], [data-testid=vpoi-bazaar]').first();
  await mk.click(); await p.waitForTimeout(4500);
  const tab = await p.locator('[role=tab][aria-selected=true]').textContent().catch(() => '?');
  console.log(c, 'walk button', has, 'after market walk tab =', tab);
  if (!has) console.log('FAIL', c, 'has no way to walk the streets');
}
console.log('errors', errors);
if (errors.length) console.log('FAIL page errors');
await b.close();
