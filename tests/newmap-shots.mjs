// The new travel map, for review: the whole map with its towns, Egypt and Sinai close in, and Persia, on a
// phone (412 x 915) and on the PC layout (1920 x 1080). Everything explored, every town known.
//   PORT=5173 OUT=/tmp/shots node tests/newmap-shots.mjs
import { chromium } from 'playwright';
import { PORT, SHOTS } from './_env.mjs';
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
  const shot = async (name, at) => {
    await p.evaluate(async (at) => {
      const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); const s = d.state;
      const W = await import('/src/game/systems/world.ts'); const { SETTLEMENTS } = await import('/src/data/world.ts');
      const t = SETTLEMENTS.find((x) => x.id === at);
      s.tutorial = { done: true, step: 'done', inspected: true }; s.guideSeen = true; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; s.tipsSeen = [...(s.tipsSeen ?? []), 'map', 'town', 'road'];
      s.world.fog = '1'.repeat(W.FOG_LEN); s.world.known = SETTLEMENTS.map((x) => x.id); s.world.at = at; s.world.x = t.x; s.world.y = t.y; s.world.hour = 10; s.world.parties = [];
      (window.__tofEdit = true, localStorage.setItem(k, JSON.stringify(d)), window.__tofEdit = false);
      const w = Storage.prototype.setItem; const h = function (key, v) { if (key === 'threads-of-fortune-save' && !window.__tofEdit) return; return w.call(this, key, v); }; Storage.prototype.setItem = h; setTimeout(() => { if (Storage.prototype.setItem === h) Storage.prototype.setItem = w; }, 4000);
    }, at);
    await p.reload(); if (await p.locator('[data-testid=continue]').count()) await p.click('[data-testid=continue]');
    await p.click('[data-testid=nav-map]'); await p.waitForTimeout(800);
    if (await p.locator('[data-testid=guide-skip]').count()) await p.click('[data-testid=guide-skip]');
    if (await p.locator('[data-testid=district-world]').count()) await p.click('[data-testid=district-world]');
    await p.waitForTimeout(2500);
    return name;
  };
  // the whole map: zoomed right out
  await shot('world', 'giza');
  for (let i = 0; i < 8; i++) { const z = p.locator('button[aria-label="Zoom out"]'); if (!(await z.count())) break; await z.first().click().catch(() => {}); await p.waitForTimeout(150); }
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${OUT}/${tag}-1-whole-map.png` });
  // Egypt and Sinai: the opening view from Giza, one step in
  await shot('egypt', 'suez');
  await p.screenshot({ path: `${OUT}/${tag}-2-egypt-sinai.png` });
  // Persia: from Tehran, zoomed out a step
  await shot('persia', 'kashan');
  const zo = p.locator('button[aria-label="Zoom out"]'); if (await zo.count()) { await zo.first().click().catch(() => {}); await p.waitForTimeout(1200); }
  await p.screenshot({ path: `${OUT}/${tag}-3-persia.png` });
  console.log(tag, 'errors', JSON.stringify(errs));
  if (errs.length) { console.log('FAIL page errors', tag); fails++; }
  await p.close();
}
await b.close();
process.exit(fails ? 1 : 0);
