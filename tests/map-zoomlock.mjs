// The ships stay locked to the painting while the map zooms: a wheel zoom and a two-finger pinch on a phone, with
// every frame checked. Each canvas notes the camera it was last drawn with (data-cam); after each frame the page
// works out where a few map points show on the painting (its drawn camera and the CSS transform it is shown under)
// and where the life canvas drew them. They must agree to a pixel in every frame. A strip of frames (the
// screencast) goes to OUT for review.
//   PORT=5199 OUT=/tmp/strip node --import ./tests/_nohmr.mjs tests/map-zoomlock.mjs
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { PORT, SHOTS } from './_env.mjs';
const OUT = process.env.OUT ?? SHOTS;
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch();
let fails = 0;
const ok = (c, what) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${what}`); if (!c) fails++; };
const p = await b.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, hasTouch: true, isMobile: true });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(`http://localhost:${PORT}/`);
await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'), localStorage.setItem('tof-skip-chapters', '1')));
await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
await p.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.started === true; } catch { return false; } }, null, { timeout: 10000 }).catch(() => {});
await p.evaluate(async () => {
  const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); const s = d.state;
  const W = await import('/src/game/systems/world.ts'); const { SETTLEMENTS } = await import('/src/data/world.ts');
  const t = SETTLEMENTS.find((x) => x.id === 'portsaid');
  s.tutorial = { done: true, step: 'done', inspected: true }; s.guideSeen = true; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; s.tipsSeen = [...(s.tipsSeen ?? []), 'map', 'town', 'road', 'world'];
  s.world.fog = '1'.repeat(W.FOG_LEN); s.world.known = SETTLEMENTS.map((x) => x.id); s.world.at = 'portsaid'; s.world.x = t.x; s.world.y = t.y; s.world.hour = 10; s.world.parties = [];
  (window.__tofEdit = true, localStorage.setItem(k, JSON.stringify(d)), window.__tofEdit = false);
  const w = Storage.prototype.setItem; const h = function (key, v) { if (key === 'threads-of-fortune-save' && !window.__tofEdit) return; return w.call(this, key, v); }; Storage.prototype.setItem = h; setTimeout(() => { if (Storage.prototype.setItem === h) Storage.prototype.setItem = w; }, 4000);
});
await p.reload(); if (await p.locator('[data-testid=continue]').count()) await p.click('[data-testid=continue]');
await p.click('[data-testid=nav-map]'); await p.waitForTimeout(800);
if (await p.locator('[data-testid=guide-skip]').count()) await p.click('[data-testid=guide-skip]');
if (await p.locator('[data-testid=district-world]').count()) await p.click('[data-testid=district-world]');
await p.waitForTimeout(3000);

// after every frame: the worst disagreement, in CSS px, between where the painting shows a few map points and
// where the life canvas put them
await p.evaluate(() => {
  const rec = (window.__lock = { on: false, rows: [] });
  const cssCam = () => {
    const c = document.querySelector('.world-canvas'), L = document.querySelector('[data-testid=map-life]');
    if (!c?.dataset.cam || !L?.dataset.cam) return null;
    const [dx, dy, ds, M] = c.dataset.cam.split(',').map(Number);
    const [lx, ly, ls] = L.dataset.cam.split(',').map(Number);
    const cs = getComputedStyle(c), m = new DOMMatrix(cs.transform === 'none' ? undefined : cs.transform);
    const [ox, oy] = cs.transformOrigin.split(' ').map(parseFloat);
    const wr = L.getBoundingClientRect(), cr = { left: c.offsetLeft, top: c.offsetTop };
    // a canvas point (CSS px inside the canvas box) to the screen, through its transform about its origin
    const show = (x, y) => { const q = m.transformPoint(new DOMPoint(x - ox, y - oy)); return { x: cr.left + q.x + ox, y: cr.top + q.y + oy }; };
    let worst = 0;
    for (const [fx, fy] of [[0.2, 0.2], [0.8, 0.3], [0.5, 0.5], [0.3, 0.8], [0.8, 0.85]]) {
      // a map point under that spot of the life canvas
      const mx = (fx * wr.width - lx) / ls, my = (fy * wr.height - ly) / ls;
      const a = show(mx * ds + dx + M, my * ds + dy + M);
      worst = Math.max(worst, Math.hypot(a.x - fx * wr.width, a.y - fy * wr.height));
    }
    return { worst, ls, ds };
  };
  const tick = () => { requestAnimationFrame(() => { setTimeout(() => { if (rec.on) { const c = cssCam(); if (c) rec.rows.push({ t: performance.now(), ...c }); } tick(); }, 0); }); };
  tick();
});
const cdp = await p.context().newCDPSession(p);
const frames = [];
cdp.on('Page.screencastFrame', async (f) => { frames.push(f.data); await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
const run = async (name, act) => {
  frames.length = 0;
  await p.evaluate(() => { window.__lock.rows = []; window.__lock.on = true; });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 70, maxWidth: 412, maxHeight: 915, everyNthFrame: 1 });
  await act();
  await p.waitForTimeout(900);
  await cdp.send('Page.stopScreencast');
  const rows = await p.evaluate(() => { window.__lock.on = false; return window.__lock.rows; });
  const bad = rows.filter((r) => r.worst > 1.5);
  ok(rows.length > 20 && !bad.length, `${name}: ships locked to the painting in every frame (${rows.length} frames, worst ${Math.max(0, ...rows.map((r) => r.worst)).toFixed(1)} px, ${bad.length} off)`);
  const keep = frames.filter((_, i) => i % Math.max(1, Math.floor(frames.length / 12)) === 0).slice(0, 12);
  keep.forEach((d, i) => writeFileSync(`${OUT}/${name}-${String(i).padStart(2, '0')}.jpg`, Buffer.from(d, 'base64')));
  return rows;
};
const box = await p.locator('[data-testid=world-map]').boundingBox();
const cx = box.x + box.width / 2, cy = box.y + box.height * 0.45;
// the wheel (as on a PC): eight notches in, eight out, about one a frame or two
await run('wheel', () => p.evaluate(([cx, cy]) => new Promise((res) => {
  const el = document.querySelector('[data-testid=world-map]');
  let i = 0;
  const f = () => { el.dispatchEvent(new WheelEvent('wheel', { deltaY: i < 8 ? -100 : 100, clientX: cx, clientY: cy, bubbles: true, cancelable: true })); if (++i < 16) setTimeout(f, 45); else res(); };
  f();
}), [cx, cy]));
// a pinch out and back in, a finger move a frame, then the fingers lift
await run('pinch', () => p.evaluate(([cx, cy]) => new Promise((res) => {
  const el = document.querySelector('[data-testid=world-map]');
  const fire = (t, id, x, y) => el.dispatchEvent(new PointerEvent(t, { pointerId: id, clientX: x, clientY: y, bubbles: true, pointerType: 'touch', isPrimary: id === 21 }));
  let i = 0; const N = 60;
  const d = (k) => 40 + 110 * Math.sin((Math.PI * k) / N);
  fire('pointerdown', 21, cx - d(0), cy); fire('pointerdown', 22, cx + d(0), cy);
  const f = () => { i++; fire('pointermove', 21, cx - d(i), cy - i * 0.6); fire('pointermove', 22, cx + d(i), cy - i * 0.6); if (i < N * 0.75) requestAnimationFrame(f); else { fire('pointerup', 21, cx - d(i), cy); fire('pointerup', 22, cx + d(i), cy); res(); } };
  requestAnimationFrame(f);
}), [cx, cy]));
ok(!errs.length, `no page errors ${JSON.stringify(errs)}`);
await b.close();
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
