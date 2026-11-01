// The Blender ships on the travel map, for review: the eastern Mediterranean off the Delta, and the Gulf of
// Aqaba and Red Sea below Sinai, each at two zooms, on a phone (412 x 915) and the PC layout (1920 x 1080).
//   PORT=5203 OUT=/tmp/shots node --import ./tests/_nohmr.mjs tests/ship-shots.mjs
import { chromium } from 'playwright';
import { PORT, SHOTS, tapPlace } from './_env.mjs';
const OUT = process.env.OUT ?? SHOTS;
const b = await chromium.launch();
let fails = 0;
for (const [vw, vh, tag, dpr] of [[412, 915, 'phone', 2.625], [1920, 1080, 'pc', 1]]) {
  const p = await b.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: dpr, hasTouch: tag === 'phone', isMobile: tag === 'phone' });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/`);
  await p.evaluate((pc) => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'), localStorage.setItem('tof-skip-chapters', '1'), pc && localStorage.setItem('tof-layout', 'pc')), tag === 'pc');
  await p.reload();
  await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
  await p.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.started === true; } catch { return false; } }, null, { timeout: 10000 }).catch(() => {});
  const open = async (at) => {
    await p.evaluate(async (at) => {
      const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); const s = d.state;
      const W = await import('/src/game/systems/world.ts'); const { SETTLEMENTS } = await import('/src/data/world.ts');
      const t = SETTLEMENTS.find((x) => x.id === at), g = SETTLEMENTS.find((x) => x.id === 'giza'), c = SETTLEMENTS.find((x) => x.id === 'cairo'), a = SETTLEMENTS.find((x) => x.id === 'alexandria');
      s.tutorial = { done: true, step: 'done', inspected: true }; s.guideSeen = true; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; s.tipsSeen = [...(s.tipsSeen ?? []), 'map', 'town', 'road', 'world'];
      s.world.fog = '1'.repeat(W.FOG_LEN); s.world.known = SETTLEMENTS.map((x) => x.id); s.world.at = at; s.world.x = t.x; s.world.y = t.y; s.world.hour = 10; s.world.parties = [];
      // a few ways already travelled, inked on the map
      const way = (A, B) => { const q = W.findPath(A, B) ?? [A, B]; return q.flatMap((p) => [Math.round(p.x * 2) / 2, Math.round(p.y * 2) / 2]); };
      s.inked = [way(g, c), way(c, a), way(g, t)];
      s.inventory = s.inventory.map((r) => ({ ...r, stored: false, restoringUntil: undefined }));
      (window.__tofEdit = true, localStorage.setItem(k, JSON.stringify(d)), window.__tofEdit = false);
      const w = Storage.prototype.setItem; const h = function (key, v) { if (key === 'threads-of-fortune-save' && !window.__tofEdit) return; return w.call(this, key, v); }; Storage.prototype.setItem = h; setTimeout(() => { if (Storage.prototype.setItem === h) Storage.prototype.setItem = w; }, 4000);
    }, at);
    await p.reload(); if (await p.locator('[data-testid=continue]').count()) await p.click('[data-testid=continue]');
    await p.click('[data-testid=nav-map]'); await p.waitForTimeout(800);
    if (await p.locator('[data-testid=guide-skip]').count()) await p.click('[data-testid=guide-skip]');
    if (await p.locator('[data-testid=district-world]').count()) await p.click('[data-testid=district-world]');
    await p.waitForTimeout(2500);
  };
  const zoom = async (dir, n) => { for (let i = 0; i < n; i++) { const z = p.locator(`button[aria-label="Zoom ${dir}"]`); if (!(await z.count())) break; await z.first().click().catch(() => {}); await p.waitForTimeout(150); } await p.waitForTimeout(1500); };
  for (const [at, outs, name] of [['portsaid', 1, 'med'], ['portsaid', 0, 'med-close'], ['sinai', 2, 'redsea'], ['sinai', 1, 'redsea-close']]) {
    await open(at);
    if (outs) await zoom('out', outs);
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `${OUT}/${tag}-ships-${name}.png` });
  }
  const sheets = await p.evaluate(() => performance.getEntriesByType('resource').filter((e) => e.name.includes('/art/map/ships/')).map((e) => e.name.split('/').pop()));
  console.log(tag, 'sheets loaded:', sheets.join(', '));
  console.log(tag, 'errors', JSON.stringify(errs));
  if (errs.length) { console.log('FAIL page errors', tag); fails++; }
  await p.close();
}
await b.close();
process.exit(fails ? 1 : 0);
