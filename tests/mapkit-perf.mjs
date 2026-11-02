// The travel map's decorations on a phone: frame times with them on and off, idle and while dragging the map, on a
// 412 x 915 screen with the CPU slowed four times (about a Pixel 7a), at a middle zoom over Anatolia and the Levant
// and close in over the Delta (where, with Map life on, the palms sway).
//   PORT=5173 node tests/mapkit-perf.mjs
import { chromium } from 'playwright';
import { openMap, view } from './mapkit-shots.mjs';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, hasTouch: true });
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
  const sx = 206, sy = 520;
  for (let k = 0; k < 4; k++) {
    await p.mouse.move(sx, sy); await p.mouse.down();
    for (let j = 1; j <= 24; j++) await p.mouse.move(sx + (k % 2 ? -1 : 1) * j * 9, sy + Math.sin(j / 4) * 30);
    await p.mouse.up();
  }
};
const setKit = (on) => p.evaluate(async (on) => { (await import('/src/game/mapKitPref.ts')).setMapKit(on); }, on);
const out = {};
for (const [name, at, steps] of [['middle', [660, 330], 2], ['close', [425, 585], 8]]) {
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await view(p, at, steps);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  for (const on of [true, false]) {
    await setKit(on); await p.waitForTimeout(1500);
    const k0 = await p.evaluate(() => ({ ...window.__mapKit }));
    const idle = await frames(3000);
    const dr = await frames(3500, drag);
    const k1 = await p.evaluate(() => ({ ...window.__mapKit }));
    const live = k1.liveFrames - k0.liveFrames ? +((k1.liveMs - k0.liveMs) / (k1.liveFrames - k0.liveFrames)).toFixed(2) : 0;
    const draw = k1.draws - k0.draws ? +((k1.drawMs - k0.drawMs) / (k1.draws - k0.draws)).toFixed(2) : 0;
    const build = k1.built - k0.built ? +((k1.buildMs - k0.buildMs) / (k1.built - k0.built)).toFixed(2) : 0;
    out[`${name} kit ${on ? 'on' : 'off'}`] = { idle, drag: dr, kitDrawMs: draw, tilesBuilt: k1.built - k0.built, msPerTile: build, liveMsPerFrame: live, liveItems: k1.liveItems };
    console.log(name, on ? 'on ' : 'off', JSON.stringify(out[`${name} kit ${on ? 'on' : 'off'}`]));
  }
}
console.log('errors', JSON.stringify(errs));
await b.close();
process.exit(errs.length ? 1 : 0);
