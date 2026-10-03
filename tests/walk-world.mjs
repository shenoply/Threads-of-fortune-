// Play the travel map: walk from Giza to towns across the Nile and the Delta, and check every step the
// caravan takes is on open ground (never on a river, lake, the sea or mountains), crossing at bridges.
//   PORT=5173 SHOTS=/tmp/ww node tests/walk-world.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const PORT = process.env.PORT ?? '5173', S = process.env.SHOTS ?? '/tmp/ww';
mkdirSync(S, { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const has = (sel) => p.locator(sel).count();
const edit = (fn) => p.evaluate((src) => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); new Function('s', 'd', src)(d.state, d); localStorage.setItem(k, JSON.stringify(d)); }, fn);
await p.goto(`http://localhost:${PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
const bad = [];
for (const [from, fx, fy, to] of [['giza', 146.9, 443.7, 'cairo'], ['giza', 146.9, 443.7, 'tanta'], ['cairo', 214.3, 413.7, 'giza'], ['cairo', 214.3, 413.7, 'saqqara'], ['giza', 146.9, 443.7, 'portsaid']]) {
  await edit(`s.tutorial = { done: true, step: 'done', inspected: true }; s.guideSeen = true; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; localStorage.setItem('tof-skip-chapters', '1');
    Object.assign(s.world, { at: '${from}', x: ${fx}, y: ${fy}, hour: 7 }); s.cash = 0; s.journey = undefined; s.dayOver = false; s.world.known = [...new Set([...s.world.known, 'tanta', 'saqqara', 'fayoum', 'suez', 'portsaid'])];`);
  await p.reload(); if (await has('[data-testid=continue]')) await p.click('[data-testid=continue]');
  await p.click('[data-testid=nav-map]'); await p.waitForTimeout(700);
  if (await has('[data-testid=guide-skip]')) await p.click('[data-testid=guide-skip]');
  if (await has('[data-testid=stall-sheet-close]')) await p.click('[data-testid=stall-sheet-close]');
  if (await has('[data-testid=district-world]')) { await p.click('[data-testid=district-world]'); await p.waitForTimeout(900); }
  await p.locator(`[data-testid=place-${to}]`).dispatchEvent('click'); await p.waitForTimeout(600);
  await p.screenshot({ path: `${S}/${from}-${to}-plan.png` });
  if (!(await has('[data-testid=travel]'))) { console.log(from, '->', to, 'no walk offered'); continue; }
  await p.click('[data-testid=travel]'); await p.waitForTimeout(300);
  if (await has('[data-testid=speed-3]')) await p.click('[data-testid=speed-3]');
  const seen = [];
  for (let i = 0; i < 160; i++) {
    await p.waitForTimeout(150);
    const pt = await p.evaluate(() => { const m = document.querySelector('[data-testid=me]'); const st = JSON.parse(localStorage.getItem('threads-of-fortune-save')).state; return { x: +m?.dataset.x, y: +m?.dataset.y, at: st.world.at, wx: st.world.x, wy: st.world.y }; });
    seen.push(pt);
    if (pt.at === to) break;
    if (await has('[data-testid=nightfall]')) await p.click('[data-testid=march-on]');
  }
  const kinds = await p.evaluate(async (pts) => { const W = await import('/src/game/systems/world.ts'); return pts.map((q) => `${W.terrainAt({ x: q.wx, y: q.wy })}`); }, seen);
  const closed = kinds.filter((k) => ['river', 'lake', 'canal', 'water', 'mountains'].includes(k));
  const crossed = [...new Set(kinds.filter((k) => k === 'bridge' || k === 'ford'))];
  await p.screenshot({ path: `${S}/${from}-${to}-end.png` });
  const arrived = seen[seen.length - 1]?.at === to;
  console.log(`${from} -> ${to}: ${arrived ? 'arrived' : 'not there yet'} after ${seen.length} looks | crossed ${crossed.join(', ') || 'nothing'} | on closed ground ${closed.length}x`);
  if (closed.length) bad.push(`${from}-${to}`);
}
console.log(bad.length ? `FAIL ${bad}` : 'PASS', 'errors', JSON.stringify(errs.slice(0, 3)));
await b.close();
