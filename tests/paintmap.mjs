import { chromium } from 'playwright';
import { PORT as __PORT, SHOTS as __SHOTS } from './_env.mjs';
const b = await chromium.launch();
const errors = [];
for (const [vw, vh, tag] of [[390, 760, 'phone'], [1280, 760, 'wide']]) {
  const p = await b.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: 2 });
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(`http://localhost:${__PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
  await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]'); await p.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.started === true; } catch { return false; } }, null, { timeout: 10000 }).catch(() => {}); /* day one is on disk before the save is edited */
  await p.evaluate(() => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); d.state.tutorial = { done: true, step: 'done', inspected: true }; d.state.guideSeen = true; d.state.world.fog = '1'.repeat(d.state.world.fog.length); (window.__tofEdit = true, localStorage.setItem(k, JSON.stringify(d)), window.__tofEdit = false, (() => { /* hold the game's autosave off the edited save until the reload */ const w = Storage.prototype.setItem; if (w.__hold) return; const h = function (key, v) { if (key === 'threads-of-fortune-save' && !window.__tofEdit) return; return w.call(this, key, v); }; h.__hold = true; Storage.prototype.setItem = h; setTimeout(() => { if (Storage.prototype.setItem === h) Storage.prototype.setItem = w; }, 4000); })()); });
  await p.reload(); await p.click('[data-testid=continue]'); await p.click('[data-testid=nav-map]'); await p.waitForTimeout(800);
  if (await p.locator('[data-testid=guide-skip]').count()) await p.locator('[data-testid=guide-skip]').first().click();
  if (await p.locator('[data-testid=district-world]').count()) await p.locator('[data-testid=district-world]').first().click();
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${__SHOTS}/pm-${tag}-1.png` });
  for (let i = 0; i < 6; i++) await p.click('button[aria-label="Zoom out"]').catch(() => {});
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${__SHOTS}/pm-${tag}-2.png` });
  await p.close();
}
console.log('errors', errors);
await b.close();
