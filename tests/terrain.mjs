// Terrain on the travel map: mountains are closed except by roads; walks show the ground they cross.
// PORT=5173 node tests/terrain.mjs
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? 4173, SHOTS = process.env.SHOTS;
let fails = 0;
const check = (name, ok, d = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${d}`); };
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 760 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(`http://localhost:${PORT}/`);
await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1')));
await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
await p.evaluate(() => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); d.state.tutorial = { done: true, step: 'done', inspected: true }; d.state.world.fog = '1'.repeat(177 * 118); Object.assign(d.state.world, { at: 'beirut', x: 381.4, y: 266.2 }); d.state.world.known = [...new Set([...(d.state.world.known ?? []), 'beirut', 'damascus'])]; localStorage.setItem(k, JSON.stringify(d)); });
await p.reload(); await p.click('[data-testid=continue]'); await p.click('[data-testid=nav-map]'); await p.waitForTimeout(800);
for (let i = 0; i < 4; i++) { await p.click('button[aria-label="Zoom out"]').catch(() => {}); }
await p.waitForTimeout(600);
// screen transform from two town markers
const centre = async (id) => { const r = await p.locator(`[data-testid=place-${id}]`).boundingBox(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; };
const T = await p.evaluate(async () => { const w = await import('/src/game/systems/world.ts'); return Object.fromEntries((await import('/src/data/world.ts')).SETTLEMENTS.map((x) => [x.id, x])); });
const ids = await p.$$eval('[data-testid^=place-]', (els) => els.map((e) => e.dataset.testid.slice(6))); console.log('towns shown', ids.join(' '));
const [A, B] = [await centre('beirut'), await centre('damascus')];
const s = (B.x - A.x) / (T.damascus.x - T.beirut.x);
const toScreen = (x, y) => ({ x: A.x + (x - T.beirut.x) * s, y: A.y + (y - T.beirut.y) * s });
const card = () => p.locator('.wc-main').first().innerText().catch(() => '');
// 1. Mount Lebanon, between Beirut and Damascus (painting 770,400)
let q = toScreen(770 / 1.7356, 400 / 1.7356);
await p.mouse.move(q.x, q.y); await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(500);
let txt = await card();
check('Tapping Mount Lebanon says mountains cannot be crossed', /No caravan can cross these mountains/.test(txt), JSON.stringify(txt.slice(0, 90)));
if (SHOTS) await p.screenshot({ path: `${SHOTS}/terrain-mountain.png` });
// 2. engine: Beirut to Damascus keeps to the pass road; Giza to Sinai is reachable; nothing crosses closed ground
const eng = await p.evaluate(async () => {
  const w = await import('/src/game/systems/world.ts');
  const { SETTLEMENTS } = await import('/src/data/world.ts');
  const out = { unreachable: [], crossing: 0, bd: null };
  for (const a of SETTLEMENTS) for (const c of SETTLEMENTS) {
    if (a.id >= c.id) continue;
    const path = w.findPath(a, c);
    if (!path) { out.unreachable.push(`${a.id}-${c.id}`); continue; }
    // the first and last steps leave and enter a town drawn on the shore; a road may clip a cell corner in a pass
    for (let i = 2; i < path.length - 1; i++) {
      let run = 0;
      for (let t = 0; t <= 1; t += 0.02) {
        run = w.isBlockedPx({ x: path[i - 1].x + (path[i].x - path[i - 1].x) * t, y: path[i - 1].y + (path[i].y - path[i - 1].y) * t }) ? run + 1 : 0;
        if (run === 4) { out.crossing++; out.where = `${a.id}-${c.id}`; }
      }
    }
  }
  const bd = w.findPath(w.settlementById('beirut'), w.settlementById('damascus'));
  out.bd = w.pathGround(bd);
  return out;
});
const islands = new Set(['istanbul']);
check('Every town on the mainland can be reached overland', eng.unreachable.filter((x) => !x.split('-').some((t) => islands.has(t))).length === 0, eng.unreachable.join(' '));
check('No walking path cuts over mountains or water', eng.crossing === 0, `${eng.crossing} ${eng.where ?? ''}`);
check('Beirut to Damascus keeps mostly to the road', (eng.bd.road ?? 0) > 0.6, JSON.stringify(eng.bd));
// 3. plan a walk to Damascus: card names the ground
await p.click('[data-testid=place-damascus]'); await p.waitForTimeout(400);
txt = await card();
check('The walk card says what ground the way crosses', /(mostly|much of it|partly) (road|farmland|open desert|hills)/.test(txt), JSON.stringify(txt.slice(0, 120)));
if (SHOTS) await p.screenshot({ path: `${SHOTS}/terrain-plan.png` });
check('No page errors', errs.length === 0, errs.join(' | '));
await b.close();
process.exit(fails ? 1 : 0);
