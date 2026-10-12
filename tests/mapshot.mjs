import { chromium } from 'playwright';
import { PORT as __PORT, SHOTS as __SHOTS } from './_env.mjs';
const b = await chromium.launch();
for (const [vw, vh, tag] of [[390, 760, 'phone'], [1280, 760, 'wide']]) {
  const p = await b.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: 2 });
  const errs=[]; p.on('pageerror', e=>errs.push(e.message));
  await p.goto(`http://localhost:${__PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
  await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]'); await p.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.started === true; } catch { return false; } }, null, { timeout: 10000 }).catch(() => {}); /* day one is on disk before the save is edited */
  await p.evaluate(() => { const k='threads-of-fortune-save'; const d=JSON.parse(localStorage.getItem(k)); d.state.tutorial={done:true,step:'done',inspected:true}; d.state.world.fog='1'.repeat(177*113); (window.__tofEdit = true, localStorage.setItem(k, JSON.stringify(d)), window.__tofEdit = false, (() => { /* hold the game's autosave off the edited save until the reload */ const w = Storage.prototype.setItem; if (w.__hold) return; const h = function (key, v) { if (key === 'threads-of-fortune-save' && !window.__tofEdit) return; return w.call(this, key, v); }; h.__hold = true; Storage.prototype.setItem = h; setTimeout(() => { if (Storage.prototype.setItem === h) Storage.prototype.setItem = w; }, 4000); })()); });
  await p.reload(); await p.click('[data-testid=continue]'); await p.click('[data-testid=nav-map]'); await p.waitForTimeout(600);
  if (await p.locator('[data-testid=district-world]').count()) await p.click('[data-testid=district-world]'); // the map opens on the Giza district
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${__SHOTS}/m-${tag}-1.png` });
  await p.click('button[aria-label="Zoom out"]'); await p.click('button[aria-label="Zoom out"]'); await p.waitForTimeout(500);
  await p.screenshot({ path: `${__SHOTS}/m-${tag}-0.png` });
  // zooming in all the way over Giza walks down into the district: stop at the closest world view
  for (let i=0;i<5 && (await p.locator('[data-testid=world-zoom-in]').count());i++) { await p.click('[data-testid=world-zoom-in]'); await p.waitForTimeout(150); }
  await p.waitForTimeout(700);
  const inDistrict = await p.locator('[data-testid=district]').count() > 0;
  await p.screenshot({ path: `${__SHOTS}/m-${tag}-2.png` });
  console.log(tag, 'zoomed into the district:', inDistrict, errs);
  if (errs.length) console.log('FAIL page errors', tag);
  await p.close();
}
await b.close();
