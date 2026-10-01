// Malek, the rest: the shop on a device without WebGL (picture and buttons instead of the room),
// the room at desktop size, Malek coming to your stall as a rug customer, and Malek on the map.
//   PORT=5173 SHOTS=/tmp/malek node tests/malek2.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const PORT = process.env.PORT ?? '4173', S = process.env.SHOTS ?? '/tmp/malek';
mkdirSync(S, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const run = async (name, viewport, noGl, body) => {
  const ctx = await b.newContext({ viewport, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  if (noGl) await p.addInitScript(() => { const orig = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, ...a) { return /webgl/.test(t) ? null : orig.call(this, t, ...a); }; });
  const has = (id) => p.locator(`[data-testid="${id}"]`).count();
  const edit = (fn) => p.evaluate((src) => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); new Function('s', 'd', src)(d.state, d); localStorage.setItem(k, JSON.stringify(d)); }, fn);
  const reload = async () => { await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(800); };
  await p.goto(`http://localhost:${PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'))); await p.reload();
  await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
  await edit(`s.tutorial = { done: true, step: 'done', inspected: true }; s.introSeen = ['malek']; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; Object.assign(s.world, { at: 'giza', hour: 13 }); s.cash = 300; s.queue = []; s.visitIdx = 0; localStorage.setItem('tof-skip-chapters', '1');`);
  await reload();
  try { await body(p, { has, edit, reload }); } catch (e) { console.log(name, 'FAILED', e.message.split('\n')[0]); await p.screenshot({ path: `${S}/${name}-fail.png` }); }
  console.log(name, 'errors', JSON.stringify(errs));
  await ctx.close();
};
const toShop = async (p, has) => {
  await p.click('[data-testid=nav-stall]'); await p.waitForSelector('[data-testid=district]'); await p.waitForTimeout(400);
  if (await has('stall-sheet-close')) await p.click('[data-testid=stall-sheet-close]');
  await p.screenshot({ path: `${S}/district.png` });
  await p.locator('[data-testid=poi-malek]').scrollIntoViewIfNeeded(); await p.click('[data-testid=poi-malek]');
  await p.waitForSelector('[data-testid=malek-shop]', { timeout: 20000 }); await p.waitForTimeout(400);
};

await run('nogl', { width: 390, height: 844 }, true, async (p, { has }) => {
  await toShop(p, has);
  await p.click('[data-testid=malek-enter]'); await p.waitForTimeout(1200);
  console.log('nogl: fallback', await has('malek-fallback'), '| canvas', await p.locator('canvas[data-engine]').count() + await p.locator('[data-testid=malek-stage] canvas').count(), '| reset button', await has('malek-reset'));
  await p.click('[data-testid=malek-tab-menu]');
  await p.click('[data-testid=malek-buy-malek_tea]'); await p.click('[data-testid=malek-pay]'); await p.waitForTimeout(300);
  console.log('nogl: tea bought', await has('malek-result'));
  await p.screenshot({ path: `${S}/m-nogl.png` });
});

await run('desktop', { width: 1366, height: 800 }, false, async (p, { has }) => {
  await toShop(p, has);
  await p.screenshot({ path: `${S}/m-door-desktop.png` });
  await p.click('[data-testid=malek-enter]'); await p.waitForSelector('[data-testid=malek-stage] canvas', { timeout: 30000 }); await p.waitForTimeout(2500);
  const hots = await p.evaluate(() => ['malek', 'menu', 'tables', 'exit'].map((h) => { const e = document.querySelector(`[data-testid=malek-hot-${h}]`); const r = e.getBoundingClientRect(); return `${h} ${Math.round(r.x)},${Math.round(r.y)} op${e.style.opacity}`; }).join(' | '));
  console.log('desktop hotspots:', hots);
  await p.screenshot({ path: `${S}/m-room-desktop.png` });
});

await run('stall', { width: 390, height: 844 }, false, async (p, { has, edit, reload }) => {
  // Malek comes to the stall once you have been to his shop
  await edit(`s.malek = { stockDay: s.day, sold: {}, visits: 1, orders: [], said: [], story: { nextStage: 1, lastStoryDay: null, completed: [] } }; s.queue = ['malek']; s.arrivals = [13]; s.visitIdx = 0; s.world.hour = 12.9;`);
  await reload();
  await p.click('[data-testid=nav-stall]'); await p.waitForTimeout(800);
  if (await has('stall-wait')) await p.click('[data-testid=stall-wait]');
  await p.waitForTimeout(1500);
  const txt = await p.evaluate(() => document.body.innerText);
  console.log('stall: Malek arrived', /Malek/.test(txt), '|', (txt.match(/Now what\?[^\n]*|A stocky man[^\n]*/) ?? [''])[0].slice(0, 110));
  await p.screenshot({ path: `${S}/m-stall.png` });
});
await b.close();
