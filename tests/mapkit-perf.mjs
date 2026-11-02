// The travel map's decorations on a phone: frame times with them on and off, idle and while dragging the map, on a
// 412 x 915 screen with the CPU slowed four times (about a Pixel 7a), at a middle zoom over Anatolia and the Levant
// and close in over the Delta (where, with Map life on, the palms sway).
//   PORT=5173 node tests/mapkit-perf.mjs
import { chromium } from 'playwright';
import { openMap, view, dragBy } from './mapkit-shots.mjs';
const b = await chromium.launch();
// TOUCH=0: drag with the mouse instead of touch events (the DevTools touch events are slow to dispatch under throttling)
const touch = process.env.TOUCH !== '0';
const p = await b.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, hasTouch: touch, isMobile: touch });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await openMap(p, 'phone');
const cdp = await p.context().newCDPSession(p);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
/** rAF intervals over `ms`, while `act` runs */
async function frames(ms, act) {
  await p.evaluate((ms) => { window.__ft = []; let last = performance.now(); const end = last + ms; const f = (t) => { window.__ft.push(t - last); last = t; if (t < end) requestAnimationFrame(f); }; requestAnimationFrame(f); }, ms);
  if (act) await act(); else await p.waitForTimeout(ms);
  await p.waitForTimeout(200);
  const ft = (await p.evaluate(() => window.__ft)).slice(2).sort((a, c) => a - c);
  const avg = ft.reduce((a, c) => a + c, 0) / ft.length;
  return { avg: +avg.toFixed(1), p95: +ft[Math.floor(ft.length * 0.95)].toFixed(1), worst: +ft[ft.length - 1].toFixed(1), n: ft.length };
}
const drag = async () => {
  for (let k = 0; k < 4; k++) await dragBy(p, 206, 520, (k % 2 ? -1 : 1) * 200, 40, 24);
};
const setKit = (on) => p.evaluate(async (on) => { (await import('/src/game/mapKitPref.ts')).setMapKit(on); }, on);
const out = {};
for (const [name, at, steps] of [['middle', [660, 330], 2], ['close', [425, 585], 8]]) {
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await view(p, at, steps);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  for (const on of [true, false]) {
    await setKit(on); await p.waitForTimeout(4000);
    const k0 = await p.evaluate(() => ({ ...window.__mapKit }));
    const idle = await frames(3000);
    const kd = await p.evaluate(() => window.__mapKit.draws);
    const dr = await frames(3500, drag);
    const k1 = await p.evaluate(() => ({ ...window.__mapKit }));
    dr.mapRedraws = k1.draws - kd;
    const live = k1.liveFrames - k0.liveFrames ? +((k1.liveMs - k0.liveMs) / (k1.liveFrames - k0.liveFrames)).toFixed(2) : 0;
    const draw = k1.draws - k0.draws ? +((k1.drawMs - k0.drawMs) / (k1.draws - k0.draws)).toFixed(2) : 0;
    const build = k1.built - k0.built ? +((k1.buildMs - k0.buildMs) / (k1.built - k0.built)).toFixed(2) : 0;
    out[`${name} kit ${on ? 'on' : 'off'}`] = { idle, drag: dr, kitDrawMs: draw, tilesBuilt: k1.built - k0.built, msPerTile: build, liveMsPerFrame: live, liveItems: k1.liveItems };
    const st = await p.evaluate(() => ({ s: parseFloat(document.querySelector('[data-testid=world-inner]').style.width) / 2000, life: document.querySelector('[data-testid=map-life]')?.dataset.on }));
    out[`${name} kit ${on ? 'on' : 'off'}`].scale = +st.s.toFixed(2); out[`${name} kit ${on ? 'on' : 'off'}`].life = st.life;
    console.log(name, on ? 'on ' : 'off', JSON.stringify(out[`${name} kit ${on ? 'on' : 'off'}`]));
  }
}
console.log('errors', JSON.stringify(errs));
await b.close();
process.exit(errs.length ? 1 : 0);
