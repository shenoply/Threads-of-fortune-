// The repainted travel map on a Pixel 7a (412 x 915, 2.6 device pixels a CSS pixel), for review: the whole map, the
// Delta at the middle zoom, and close in at Giza and Cairo, the Levant, Persia and two of the stitched sections' seams
// (the Euphrates between tiles 2 and 5; the Nile where tile 4 meets whole.png); with TAG=before|after in the names, so two
// builds can be set side by side. Everything explored and known.
//   PORT=5199 OUT=/tmp/shots TAG=after node --import ./tests/_nohmr.mjs tests/map-repaint-shots.mjs
import { chromium } from 'playwright';
import { PORT, SHOTS } from './_env.mjs';
const OUT = process.env.OUT ?? SHOTS, TAG = process.env.TAG ?? 'now';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, hasTouch: true, isMobile: true });
// a Pixel 7a reports 8 GB: it gets the 4800-wide painting
await p.addInitScript(() => { try { Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 }); } catch { /* */ } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(`http://localhost:${PORT}/`);
await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'), localStorage.setItem('tof-skip-chapters', '1')));
await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
await p.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.started === true; } catch { return false; } }, null, { timeout: 10000 }).catch(() => {});
const open = async (at) => {
  await p.evaluate(async (at) => {
    const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); const s = d.state;
    const W = await import('/src/game/systems/world.ts'); const { SETTLEMENTS } = await import('/src/data/world.ts');
    const t = SETTLEMENTS.find((x) => x.id === at);
    s.tutorial = { done: true, step: 'done', inspected: true }; s.guideSeen = true; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; s.tipsSeen = [...(s.tipsSeen ?? []), 'map', 'town', 'road', 'world'];
    s.world.fog = '1'.repeat(W.FOG_LEN); s.world.known = SETTLEMENTS.map((x) => x.id); s.world.at = at; s.world.x = t.x; s.world.y = t.y; s.world.hour = 10; s.world.parties = [];
    (window.__tofEdit = true, localStorage.setItem(k, JSON.stringify(d)), window.__tofEdit = false);
    const w = Storage.prototype.setItem; const h = function (key, v) { if (key === 'threads-of-fortune-save' && !window.__tofEdit) return; return w.call(this, key, v); }; Storage.prototype.setItem = h; setTimeout(() => { if (Storage.prototype.setItem === h) Storage.prototype.setItem = w; }, 4000);
  }, at);
  await p.reload(); if (await p.locator('[data-testid=continue]').count()) await p.click('[data-testid=continue]');
  await p.click('[data-testid=nav-map]'); await p.waitForTimeout(800);
  if (await p.locator('[data-testid=guide-skip]').count()) await p.click('[data-testid=guide-skip]');
  if (await p.locator('[data-testid=district-world]').count()) await p.click('[data-testid=district-world]');
  await p.waitForTimeout(3000);
};
const zoom = async (dir, n) => { for (let i = 0; i < n; i++) { const z = p.locator(dir === 'in' ? '[data-testid=world-zoom-in]' : 'button[aria-label="Zoom out"]'); if (!(await z.count())) break; await z.first().click({ timeout: 8000 }).catch((e) => console.log("zoom click:", e.message.split("\n")[0])); await p.waitForTimeout(200); } await p.waitForTimeout(2500); };
/** centre the map on a map point, keeping the zoom (a drag by the difference) */
const centre = async (mx, my) => {
  await p.evaluate(([mx, my]) => {
    const el = document.querySelector('[data-testid=world-map]'), inner = document.querySelector('[data-testid=world-inner]');
    const r = el.getBoundingClientRect(), ir = inner.getBoundingClientRect();
    const s = ir.width / 2000, sx = ir.left + mx * s, sy = ir.top + my * s;
    const dx = r.left + r.width / 2 - sx, dy = r.top + r.height / 2 - sy;
    const fire = (t, x, y) => el.dispatchEvent(new PointerEvent(t, { pointerId: 5, clientX: x, clientY: y, bubbles: true, pointerType: 'touch' }));
    const x0 = r.left + r.width / 2, y0 = r.top + r.height / 2;
    // held still a moment before the finger lifts, so the drag does not fling on
    fire('pointerdown', x0, y0); for (let i = 1; i <= 20; i++) fire('pointermove', x0 + (dx * i) / 20, y0 + (dy * i) / 20);
    return new Promise((res) => setTimeout(() => { fire('pointerup', x0 + dx, y0 + dy); res(); }, 200));
  }, [mx, my]);
  await p.waitForTimeout(5500);
};
const shot = async (name) => { await p.screenshot({ path: `${OUT}/${TAG}-${name}.png` }); console.log(`${OUT}/${TAG}-${name}.png`, await p.locator('[data-testid=world-inner]').getAttribute('data-zoom')); };

await open('giza');
await zoom('out', 8);
await shot('1-whole-map');
await zoom('in', 2);
await centre(430, 565);
await shot('2-middle-delta');
// (from Cairo: zooming in past the closest view while you are at Giza walks down into the district)
await open('cairo');
await zoom('in', 8);
await centre(428, 592);
await shot('3-close-giza-cairo');
await centre(655, 520);
await shot('4-close-levant');
await centre(1395, 430);
await shot('5-close-persia');
await centre(882, 392);
await shot('6-seam-euphrates');
await centre(462, 800);
await shot('7-seam-nile');
console.log('errors', JSON.stringify(errs));
await b.close();
