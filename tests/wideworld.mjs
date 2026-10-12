import { chromium } from 'playwright';
import { PORT as __PORT, SHOTS as __SHOTS } from './_env.mjs';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 760 } });
await p.goto(`http://localhost:${__PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]'); await p.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.started === true; } catch { return false; } }, null, { timeout: 10000 }).catch(() => {}); /* day one is on disk before the save is edited */
await p.evaluate(() => { const k='threads-of-fortune-save'; const d=JSON.parse(localStorage.getItem(k)); d.state.tutorial={done:true,step:'done',inspected:true}; (window.__tofEdit = true, localStorage.setItem(k, JSON.stringify(d)), window.__tofEdit = false, (() => { /* hold the game's autosave off the edited save until the reload */ const w = Storage.prototype.setItem; if (w.__hold) return; const h = function (key, v) { if (key === 'threads-of-fortune-save' && !window.__tofEdit) return; return w.call(this, key, v); }; h.__hold = true; Storage.prototype.setItem = h; setTimeout(() => { if (Storage.prototype.setItem === h) Storage.prototype.setItem = w; }, 4000); })()); });
await p.reload(); await p.click('[data-testid=continue]'); await p.click('[data-testid=nav-map]'); await p.waitForTimeout(600);
if (await p.locator('[data-testid=district-world]').count()) await p.click('[data-testid=district-world]'); // the map opens on the Giza district
await p.waitForTimeout(600);
await p.screenshot({ path: `${__SHOTS}/ww1.png` });
// zoom in, but not so far over Giza that the map walks down into the district
for (let i=0;i<3 && (await p.locator('[data-testid=world-zoom-in]').count());i++) { await p.click('[data-testid=world-zoom-in]'); await p.waitForTimeout(150); }
await p.waitForTimeout(800);
console.log('zoomed into the district:', await p.locator('[data-testid=district]').count() > 0);
await p.screenshot({ path: `${__SHOTS}/ww2.png` });
await b.close();
