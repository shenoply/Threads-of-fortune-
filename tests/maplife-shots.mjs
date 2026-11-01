// The living travel map, for review: the whole map (cartouche and scale), a closer view with ships, a
// caravan and the compass, the dividers measuring a walk, and the trade lens, on a phone (412 x 915) and
// on the PC layout (1920 x 1080). Everything explored, every town known.
//   PORT=5199 OUT=/tmp/shots node --import ./tests/_nohmr.mjs tests/maplife-shots.mjs
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
  // 1: the whole map
  await open('giza');
  await zoom('out', 8);
  await p.screenshot({ path: `${OUT}/${tag}-1-whole-map.png` });
  // 2: Port Said, one step out: the mail steamer and the cargo boat off the Delta, the Sinai caravan, the compass
  await open('portsaid');
  await zoom('out', 1);
  await p.screenshot({ path: `${OUT}/${tag}-2-ships-compass.png` });
  // 3: the dividers, Cairo to Jerusalem
  await open('cairo');
  await zoom('out', 2);
  await p.click('[data-testid=dividers-btn]');
  await tapPlace(p, 'cairo'); await p.waitForTimeout(200); await tapPlace(p, 'jerusalem'); await p.waitForTimeout(800);
  console.log(tag, 'dividers:', (await p.locator('[data-testid=divider-chip]').textContent())?.trim());
  await p.screenshot({ path: `${OUT}/${tag}-3-dividers.png` });
  // 4: the trade lens
  await p.click('[data-testid=divider-close]');
  await p.click('[data-testid=lens-btn]'); await p.waitForTimeout(800);
  console.log(tag, 'lens:', (await p.locator('[data-testid=lens-chip]').textContent())?.trim(), await p.locator('.lens-coin').count(), 'coins');
  await p.screenshot({ path: `${OUT}/${tag}-4-trade-lens.png` });
  console.log(tag, 'errors', JSON.stringify(errs));
  if (errs.length) { console.log('FAIL page errors', tag); fails++; }
  await p.close();
}
await b.close();
process.exit(fails ? 1 : 0);
