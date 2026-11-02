// The travel map's decorations, for review: the whole map, the Delta close in, Lebanon and Anatolia, the Zagros and
// the Caspian shore, on a phone (412 x 915) and on the PC layout (1920 x 1080), with the decorations on (and the
// Delta again with them off, for comparison). Everything explored, every town known.
//   PORT=5173 OUT=/tmp/shots node tests/mapkit-shots.mjs
import { chromium } from 'playwright';
import { PORT, SHOTS } from './_env.mjs';
const OUT = process.env.OUT ?? SHOTS;
const ONLY = process.env.ONLY;
let fails = 0;
// the map point to centre on and how far in (0 right out, then that many steps in from right out; 99 all the way)
const VIEWS = [['1-whole-map', [1000, 607], 0], ['2-delta-close', [425, 585], 8], ['3-lebanon-anatolia', [660, 330], 2], ['4-zagros-caspian', [1300, 330], 2], ['5-lebanon-close', [700, 445], 8]];
export async function openMap(p, tag) {
  await p.goto(`http://localhost:${PORT}/`);
  await p.evaluate((pc) => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'), localStorage.setItem('tof-skip-chapters', '1'), pc && localStorage.setItem('tof-layout', 'pc')), tag === 'pc');
  await p.reload();
  await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
  await p.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.started === true; } catch { return false; } }, null, { timeout: 10000 }).catch(() => {});
  await p.evaluate(async () => {
    const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); const s = d.state;
    const W = await import('/src/game/systems/world.ts'); const { SETTLEMENTS } = await import('/src/data/world.ts');
    s.tutorial = { done: true, step: 'done', inspected: true }; s.guideSeen = true; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; s.tipsSeen = [...(s.tipsSeen ?? []), 'map', 'town', 'road'];
    s.world.fog = '1'.repeat(W.FOG_LEN); s.world.known = SETTLEMENTS.map((x) => x.id); s.world.hour = 10; s.world.parties = [];
    (window.__tofEdit = true, localStorage.setItem(k, JSON.stringify(d)), window.__tofEdit = false);
    const w = Storage.prototype.setItem; const h = function (key, v) { if (key === 'threads-of-fortune-save' && !window.__tofEdit) return; return w.call(this, key, v); }; Storage.prototype.setItem = h; setTimeout(() => { if (Storage.prototype.setItem === h) Storage.prototype.setItem = w; }, 4000);
  });
  await p.reload(); if (await p.locator('[data-testid=continue]').count()) await p.click('[data-testid=continue]');
  await p.click('[data-testid=nav-map]'); await p.waitForTimeout(800);
  if (await p.locator('[data-testid=guide-skip]').count()) await p.click('[data-testid=guide-skip]');
  if (await p.locator('[data-testid=district-world]').count()) await p.click('[data-testid=district-world]');
  await p.waitForTimeout(2000);
}
/** the camera: scale and pan, read from the map layer */
const cam = (p) => p.evaluate(() => { const el = document.querySelector('[data-testid=world-inner]'); const m = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(el.style.transform); return { s: parseFloat(el.style.width) / 2000, x: +m[1], y: +m[2] }; });
/** a drag on the map: touch on a touch screen (through the DevTools protocol), the mouse elsewhere */
export async function dragBy(p, sx, sy, dx, dy, steps = 8) {
  const touch = await p.evaluate(() => matchMedia('(pointer: coarse)').matches);
  if (!touch) {
    await p.mouse.move(sx, sy); await p.mouse.down();
    for (let j = 1; j <= steps; j++) await p.mouse.move(sx + dx * (j / steps), sy + dy * (j / steps));
    await p.mouse.up(); return;
  }
  const cdp = p.__cdp ??= await p.context().newCDPSession(p);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: sx, y: sy }] });
  for (let j = 1; j <= steps; j++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: sx + dx * (j / steps), y: sy + dy * (j / steps) }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
async function centre(p, mx, my) {
  const box = await p.locator('[data-testid=world-inner]').evaluate((el) => { const r = el.parentElement.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  for (let k = 0; k < 3; k++) {
    const c = await cam(p);
    const dx = box.w / 2 - (mx * c.s + c.x), dy = box.h / 2 - (my * c.s + c.y);
    if (Math.abs(dx) < 4 && Math.abs(dy) < 4) break;
    // in short strokes from the middle (a long drag would leave the map); slow, so it does not fling
    const sx = box.x + box.w / 2, sy = box.y + box.h / 2;
    const n = Math.ceil(Math.max(Math.abs(dx) / (box.w * 0.35), Math.abs(dy) / (box.h * 0.35), 1));
    for (let i = 0; i < n; i++) { await dragBy(p, sx, sy, dx / n, dy / n); await p.waitForTimeout(120); }
    await p.waitForTimeout(400);
  }
}
export async function view(p, [mx, my], steps) {
  for (let i = 0; i < 10; i++) { const z = p.locator('button[aria-label="Zoom out"]'); if (!(await z.count()) || await z.first().isDisabled()) break; await z.first().click().catch(() => {}); await p.waitForTimeout(350); }
  // over the place first, then in (zooming right in over Giza would walk down into the district)
  await p.waitForTimeout(400);
  await centre(p, mx, my);
  for (let i = 0; i < steps; i++) { const z = p.locator('[data-testid=world-zoom-in]'); if (!(await z.count()) || await z.first().isDisabled()) break; await z.first().click().catch(() => {}); await p.waitForTimeout(350); }
  await p.waitForTimeout(500);
  await centre(p, mx, my);
  await p.waitForTimeout(1200);
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const b = await chromium.launch();
  for (const [vw, vh, tag, dpr] of [[412, 915, 'phone', 2.625], [1920, 1080, 'pc', 1]]) {
    if (ONLY && ONLY !== tag) continue;
    const p = await b.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: dpr, hasTouch: tag === 'phone', isMobile: tag === 'phone' });
    const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await openMap(p, tag);
    for (const [name, at, steps] of VIEWS) {
      await view(p, at, steps);
      await p.screenshot({ path: `${OUT}/${tag}-${name}.png` });
      if (name === '2-delta-close' || name === '3-lebanon-anatolia') {
        await p.evaluate(async () => { (await import('/src/game/mapKitPref.ts')).setMapKit(false); });
        await p.waitForTimeout(900);
        await p.screenshot({ path: `${OUT}/${tag}-${name}-off.png` });
        await p.evaluate(async () => { (await import('/src/game/mapKitPref.ts')).setMapKit(true); });
        await p.waitForTimeout(600);
      }
    }
    const k = await p.evaluate(() => window.__mapKit);
    console.log(tag, 'kit', JSON.stringify(k), 'errors', JSON.stringify(errs));
    if (errs.length) { console.log('FAIL page errors', tag); fails++; }
    if (!k || !k.draws) { console.log('FAIL the decorations were never drawn', tag); fails++; }
    await p.close();
  }
  await b.close();
  process.exit(fails ? 1 : 0);
}
