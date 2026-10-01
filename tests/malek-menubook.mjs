// Malek's menu book: it opens over the shop (cover swings away), the dishes are there at once with
// their pictures, Arabic names and prices, pages turn with the arrows, ordering still goes through
// the confirm sheet, and Close returns to the room. Phone and desktop.
//   PORT=5173 SHOTS=/tmp/malek node tests/malek-menubook.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const PORT = process.env.PORT ?? '4173', S = process.env.SHOTS ?? '/tmp/malek';
mkdirSync(S, { recursive: true });
const b = await chromium.launch();
for (const [tag, viewport] of [['phone', { width: 390, height: 844 }], ['desktop', { width: 1366, height: 800 }]]) {
  const p = await b.newPage({ viewport, deviceScaleFactor: tag === 'phone' ? 2 : 1 });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const bad = []; p.on('response', (r) => { if (r.status() >= 400 && /art\/malek\/menu/.test(r.url())) bad.push(r.url()); });
  const has = (id) => p.locator(`[data-testid="${id}"]`).count();
  const edit = (fn) => p.evaluate((src) => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); new Function('s', 'd', src)(d.state, d); localStorage.setItem(k, JSON.stringify(d)); }, fn);
  try {
    await p.goto(`http://localhost:${PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
    await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
    await edit(`s.tutorial = { done: true, step: 'done', inspected: true }; s.introSeen = ['malek']; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; localStorage.setItem('tof-skip-chapters', '1');
      Object.assign(s.world, { at: 'giza', hour: 13 }); s.cash = 300; s.queue = []; s.visitIdx = 0;
      s.malek = { stockDay: s.day, sold: {}, visits: 1, firstDay: 1, lastVisitDay: s.day, orders: [], said: [], tab: 2, story: { nextStage: 6, lastStoryDay: 1, completed: [1,2,3,4,5] } };`);
    await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(800);
    await p.click('[data-testid=nav-stall]'); await p.waitForSelector('[data-testid=district]'); await p.waitForTimeout(300);
    if (await has('stall-sheet-close')) await p.click('[data-testid=stall-sheet-close]');
    await p.locator('[data-testid=poi-malek]').scrollIntoViewIfNeeded(); await p.click('[data-testid=poi-malek]');
    await p.waitForSelector('[data-testid=malek-door]'); await p.click('[data-testid=malek-enter]'); await p.waitForSelector('[data-testid=malek-room]');
    await p.click('[data-testid=malek-tab-menu]'); await p.waitForTimeout(250);
    await p.screenshot({ path: `${S}/book-${tag}-cover.png` });
    await p.waitForTimeout(1500);
    await p.screenshot({ path: `${S}/book-${tag}-p1.png` });
    const dishes = await p.locator('[data-testid^=malek-item-]').count();
    await p.click('[data-testid=malek-page-next]'); await p.waitForTimeout(700);
    await p.screenshot({ path: `${S}/book-${tag}-p2.png` });
    const pics = await p.evaluate(() => [...document.querySelectorAll('.mbook__pic')].filter((i) => i.complete && i.naturalWidth > 0).length);
    await p.click('[data-testid=malek-buy-malek_kofta]'); await p.waitForSelector('[data-testid=malek-confirm]');
    const confirmOnTop = await p.evaluate(() => { const c = document.querySelector('[data-testid=malek-confirm]').getBoundingClientRect(); const el = document.elementFromPoint(c.x + c.width / 2, c.bottom - 20); return !!el?.closest('[data-testid=malek-confirm]'); });
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    await p.click('[data-testid=malek-menu-close]'); await p.waitForTimeout(200);
    console.log(`${tag}: dishes ${dishes} | pictures loaded ${pics} | confirm above the book ${confirmOnTop} | closed: ${(await has('malek-menu')) === 0} | missing art ${bad.length} | errors ${JSON.stringify(errs)}`);
  } catch (e) { console.log(tag, 'FAILED', e.message.split('\n')[0]); await p.screenshot({ path: `${S}/book-${tag}-fail.png` }); }
  await p.close();
}
await b.close();
