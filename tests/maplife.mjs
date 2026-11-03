// The living travel map in the browser: the compass (north at rest, towards a chosen town for a moment, the
// heading on the road, a tap finds you), an inked journey kept in the save, the dividers, the trade lens,
// the Map life setting, and frame times on a phone with the CPU slowed four times (a Pixel 7a or so).
//   PORT=5199 node --import ./tests/_nohmr.mjs tests/maplife.mjs
import { chromium } from 'playwright';
import { PORT, tapPlace } from './_env.mjs';
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
// a save as it would come from before this map: version 33, no inked lines
await p.evaluate(async () => {
  const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); const s = d.state;
  const W = await import('/src/game/systems/world.ts'); const { SETTLEMENTS } = await import('/src/data/world.ts');
  const g = SETTLEMENTS.find((x) => x.id === 'giza');
  d.version = 33; delete s.inked;
  s.tutorial = { done: true, step: 'done', inspected: true }; s.guideSeen = true; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; s.tipsSeen = [...(s.tipsSeen ?? []), 'map', 'town', 'road', 'world'];
  s.world.fog = '1'.repeat(W.FOG_LEN); s.world.known = SETTLEMENTS.map((x) => x.id); s.world.at = 'giza'; s.world.x = g.x; s.world.y = g.y; s.world.hour = 9; s.world.parties = [];
  s.world.party.food = 40;
  s.inventory = s.inventory.map((r) => ({ ...r, stored: false, restoringUntil: undefined }));
  (window.__tofEdit = true, localStorage.setItem(k, JSON.stringify(d)), window.__tofEdit = false);
  const w = Storage.prototype.setItem; const h = function (key, v) { if (key === 'threads-of-fortune-save' && !window.__tofEdit) return; return w.call(this, key, v); }; Storage.prototype.setItem = h; setTimeout(() => { if (Storage.prototype.setItem === h) Storage.prototype.setItem = w; }, 4000);
});
await p.reload(); if (await p.locator('[data-testid=continue]').count()) await p.click('[data-testid=continue]');
await p.click('[data-testid=nav-map]'); await p.waitForTimeout(800);
if (await p.locator('[data-testid=guide-skip]').count()) await p.click('[data-testid=guide-skip]');
if (await p.locator('[data-testid=district-world]').count()) await p.click('[data-testid=district-world]');
await p.waitForTimeout(2500);
const saved = () => p.evaluate(() => JSON.parse(localStorage.getItem('threads-of-fortune-save')));
{
  await p.waitForTimeout(4500); // the old save's hold on writes lets go
  const sv = await saved();
  ok(sv.version === 34 && Array.isArray(sv.state.inked) && sv.state.inked.length === 0, `the version 33 save opens as 34 with no inked lines (version ${sv.version}, inked ${JSON.stringify(sv.state.inked)})`);
}

// ---- the Blender ships: the six sprite sheets come in with the map, small ----
{
  const got = await p.evaluate(() => performance.getEntriesByType('resource').filter((e) => e.name.includes('/art/map/ships/')).map((e) => ({ n: e.name.split('/').pop(), kb: Math.round((e.encodedBodySize || e.transferSize) / 1024) })));
  const names = new Set(got.map((g) => g.n));
  ok(['steamer', 'cargo', 'felucca', 'dhow', 'schooner', 'caspian'].every((t) => names.has(`${t}.webp`)), `the six ship sheets are loaded with the map (${[...names].join(', ')})`);
  ok(got.every((g) => g.kb < 300), `each sheet is small (${got.map((g) => `${g.n} ${g.kb} KB`).join(', ')})`);
}

// ---- the compass ----
const angle = () => p.locator('[data-testid=map-compass]').getAttribute('data-angle').then(Number);
const off = (a, b) => { const d = Math.abs(((a - b) % 360 + 540) % 360 - 180); return d; };
ok(await p.locator('[data-testid=map-compass]').count() === 1, 'the compass is on the map');
ok((await p.locator('[data-testid=map-compass] > img').first().getAttribute('src'))?.includes('K-compass-base'), 'drawn from the Blender painting');
const box = await p.locator('[data-testid=map-compass]').boundingBox(), bar = await p.locator('[data-testid=bl-bar]').boundingBox();
ok(box && bar && box.x < 30 && box.y + box.height <= bar.y, `bottom left, clear of the date bar (compass foot ${Math.round(box.y + box.height)}, bar top ${Math.round(bar.y)})`);
ok(off(await angle(), 0) < 2, `at rest it points north (${await angle()})`);
// a town chosen: towards it for a moment, then back to north
await tapPlace(p, 'fayoum');
const want = await p.evaluate(async () => { const { SETTLEMENTS } = await import('/src/data/world.ts'); const a = SETTLEMENTS.find((x) => x.id === 'giza'), b = SETTLEMENTS.find((x) => x.id === 'fayoum'); return ((Math.atan2(b.x - a.x, -(b.y - a.y)) * 180) / Math.PI + 360) % 360; });
let near = 999;
for (let i = 0; i < 25; i++) { near = Math.min(near, off(await angle(), want)); await p.waitForTimeout(100); }
ok(near < 6, `a town chosen, it swings to it (within ${near.toFixed(1)} degrees of ${want.toFixed(0)})`);
await p.waitForTimeout(4500);
ok(off(await angle(), 0) < 3, `and a moment later settles back on north (${await angle()})`);
if (await p.locator('[data-testid=plan-cancel]').count()) await p.click('[data-testid=plan-cancel]');
// a tap brings the map back to you
await p.mouse.move(200, 500); await p.touchscreen.tap(1, 1).catch(() => {});
await p.evaluate(() => { const el = document.querySelector('[data-testid=world-map]'); const r = el.getBoundingClientRect(); const fire = (t, x, y) => el.dispatchEvent(new PointerEvent(t, { pointerId: 7, clientX: x, clientY: y, bubbles: true, pointerType: 'touch' })); fire('pointerdown', r.left + 300, r.top + 500); for (let i = 1; i <= 10; i++) fire('pointermove', r.left + 300 - i * 25, r.top + 500 - i * 30); fire('pointerup', r.left + 50, r.top + 200); });
await p.waitForTimeout(1500);
const meAt = async () => { const m = await p.locator('[data-testid=me]').boundingBox(), w = await p.locator('[data-testid=world-map]').boundingBox(); return { dx: Math.abs(m.x + m.width / 2 - (w.x + w.width / 2)), dy: Math.abs(m.y + m.height / 2 - (w.y + w.height / 2)) }; };
const before = await meAt();
await p.click('[data-testid=map-compass]'); await p.waitForTimeout(800);
const after = await meAt();
ok(before.dx + before.dy > 80 && after.dx + after.dy < 60, `a tap on the compass centres the map on you (${Math.round(before.dx + before.dy)} px off, then ${Math.round(after.dx + after.dy)})`);

// ---- a journey: the compass takes the heading, the way is inked ----
await tapPlace(p, 'fayoum'); await p.waitForTimeout(500);
if (await p.locator('[data-testid=food-go]').count()) await p.click('[data-testid=food-go]');
if (await p.locator('[data-testid=travel]').count()) await p.click('[data-testid=travel]');
if (await p.locator('[data-testid=food-go]').count()) await p.click('[data-testid=food-go]');
await p.waitForTimeout(2500);
const moving = await p.locator('[data-testid=stop]').count();
ok(moving > 0, 'on the road to the Fayoum');
const head = await p.evaluate(async () => { const { SETTLEMENTS } = await import('/src/data/world.ts'); const a = SETTLEMENTS.find((x) => x.id === 'giza'), b = SETTLEMENTS.find((x) => x.id === 'fayoum'); return ((Math.atan2(b.x - a.x, -(b.y - a.y)) * 180) / Math.PI + 360) % 360; });
ok(off(await angle(), head) < 50, `on the road the needle takes the heading (${await angle()}, the way to the Fayoum lies at ${head.toFixed(0)})`);
ok(await p.locator('[data-testid=route-trail]').count() === 1, 'the way behind draws in as you go');
if (await p.locator('[data-testid=speed-4]').count()) await p.click('[data-testid=speed-4]');
for (let i = 0; i < 60 && (await p.locator('[data-testid=stop]').count()); i++) {
  for (const k of ['march-on', 'reroute-keep', 'road-flash-act']) if (await p.locator(`[data-testid=${k}]`).count()) await p.click(`[data-testid=${k}]`).catch(() => {});
  const ch = p.locator('[data-testid^=road-choice-]'); if (await ch.count()) await ch.first().click().catch(() => {});
  await p.waitForTimeout(1000);
}
await p.waitForTimeout(1500);
{
  const sv = await saved();
  const at = sv.state.world.at;
  const ink = sv.state.inked ?? [];
  ok(at === 'fayoum', `arrived in the Fayoum (${at})`);
  ok(ink.length === 1 && ink[0].length >= 4, `the way travelled is inked and saved (${ink.length} line, ${ink[0]?.length / 2} points)`);
  ok(await p.locator('[data-testid=inked]').count() === 1, 'and drawn on the map');
}
// close whatever arrival opened (an offer, the town screen)
for (let i = 0; i < 3; i++) for (const k of ['job-offer-no', 'day-summary-ok', 'mission-ok', 'big-news-ok', 'level-up-ok']) if (await p.locator(`[data-testid=${k}]`).count()) { await p.click(`[data-testid=${k}]`).catch(() => {}); await p.waitForTimeout(300); }
for (const k of ['town-menu-close', 'settle-close', 'panel-close']) if (await p.locator(`[data-testid=${k}]`).count()) await p.click(`[data-testid=${k}]`).catch(() => {});
await p.keyboard.press('Escape').catch(() => {});
if (!(await p.locator('[data-testid=dividers-btn]').count())) { await p.click('[data-testid=nav-map]').catch(() => {}); await p.waitForTimeout(800); }
if (!(await p.locator('[data-testid=dividers-btn]').isVisible().catch(() => false))) { const back = p.locator('[data-testid=menu-leave], [data-testid=town-leave], [data-testid=settlement-close]'); if (await back.count()) await back.first().click().catch(() => {}); await p.waitForTimeout(800); }

// ---- the dividers ----
await p.click('[data-testid=dividers-btn]');
ok((await p.locator('[data-testid=divider-chip]').textContent()).includes('tap the first place'), 'the dividers ask for the first place');
await tapPlace(p, 'cairo'); await p.waitForTimeout(200);
ok((await p.locator('[data-testid=divider-chip]').textContent()).includes('From Cairo'), 'then the second');
await tapPlace(p, 'damascus'); await p.waitForTimeout(500);
const chip = (await p.locator('[data-testid=divider-chip]').textContent()).trim();
const miles = await p.evaluate(async () => { const W = await import('/src/game/systems/world.ts'); const { SETTLEMENTS } = await import('/src/data/world.ts'); const a = SETTLEMENTS.find((x) => x.id === 'cairo'), b = SETTLEMENTS.find((x) => x.id === 'damascus'); const q = W.findPath(a, b); return Math.round((W.pathLength(q) / 77.3) * 100); });
ok(/Cairo to Damascus · about \d+ days on foot · \d+ miles/.test(chip) && chip.includes(`${miles} miles`), `walking days by the game's own pathfinding: "${chip}"`);
ok(await p.locator('[data-testid=divider-line]').count() === 1, 'the measured way is drawn');
ok(await p.locator('[data-testid=plan-walk]').count() === 0 && !(await p.locator('[data-testid=stop]').count()), 'measuring plans no trip and sets nobody walking');
await p.click('[data-testid=divider-close]');
ok(!(await p.locator('[data-testid=divider-chip]').count()) && !(await p.locator('[data-testid=divider-line]').count()), 'put away, the line and chip go');

// ---- the trade lens ----
ok(!(await p.locator('.lens-coin').count()), 'the trade lens is off to begin with');
await p.click('[data-testid=lens-btn]'); await p.waitForTimeout(400);
const coins = await p.locator('.lens-coin').evaluateAll((els) => els.map((e) => ({ id: e.dataset.testid.slice(5), k: Number(e.dataset.k), sum: Number(e.dataset.sum), d: parseFloat(getComputedStyle(e).width) })));
const lensText = (await p.locator('[data-testid=lens-chip]').textContent()).trim();
const top = coins.slice().sort((a, b) => b.sum - a.sum)[0];
ok(coins.length >= 10, `a coin beside each known town that buys (${coins.length})`);
ok(top && top.k === 1 && coins.every((c) => c.d <= top.d + 0.01), `the town that pays best has the biggest coin (${top?.id})`);
const bestName = await p.evaluate(async (id) => { const { SETTLEMENTS } = await import('/src/data/world.ts'); return SETTLEMENTS.find((x) => x.id === id).name; }, top.id);
ok(lensText.includes(`Best: ${bestName}`), `the chip names it: "${lensText}"`);
const want2 = await p.evaluate(async (id) => { const S = await import('/src/game/state/store.ts'); const st = S.useGame.getState(); return st.inventory.filter((i) => !i.stored && !i.restoringUntil).reduce((a, r) => a + S.localBid(id, r, st.day), 0); }, top.id);
ok(Math.abs(want2 - top.sum) <= 1, `priced by the dealers' own bids (${top.sum} against ${Math.round(want2)})`);
await p.click('[data-testid=lens-close]');
ok(!(await p.locator('.lens-coin').count()), 'closed, the coins go');

// ---- frame times on a slowed phone ----
await p.click('button[aria-label="Zoom out"]'); await p.waitForTimeout(800);
const cdp = await p.context().newCDPSession(p);
const measure = async () => {
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await p.evaluate(() => { const m = window.__mapLife; m.frames = 0; m.ms = 0; m.worst = 0; });
const frames = await p.evaluate(() => new Promise((res) => { const t = []; let last = performance.now(); const f = (now) => { t.push(now - last); last = now; if (t.length < 240) requestAnimationFrame(f); else res(t); }; requestAnimationFrame(f); }));
const life = await p.evaluate(() => ({ ...window.__mapLife }));
// and a pan across the map while the life runs
const pan = await p.evaluate(() => new Promise((res) => { const el = document.querySelector('[data-testid=world-map]'); const r = el.getBoundingClientRect(); const fire = (t, x, y) => el.dispatchEvent(new PointerEvent(t, { pointerId: 9, clientX: x, clientY: y, bubbles: true, pointerType: 'touch' })); const t = []; let i = 0, last = performance.now(); fire('pointerdown', r.left + 300, r.top + 400); const f = (now) => { t.push(now - last); last = now; fire('pointermove', r.left + 300 - i * 4, r.top + 400 - i * 2); if (++i < 90) requestAnimationFrame(f); else { fire('pointerup', r.left + 300 - i * 4, r.top + 400 - i * 2); res(t); } }; requestAnimationFrame(f); }));
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
return { frames, life, pan };
};
const { frames, life, pan } = await measure();
const stat = (t) => { const s = t.slice(5).sort((a, b) => a - b); return { avg: s.reduce((a, b) => a + b, 0) / s.length, p95: s[Math.floor(s.length * 0.95)], max: s[s.length - 1] }; };
const fs = stat(frames), ps = stat(pan);
console.log(`     4x CPU, idle map: frame avg ${fs.avg.toFixed(1)} ms, p95 ${fs.p95.toFixed(1)} ms, max ${fs.max.toFixed(1)} ms; life drawing avg ${(life.ms / Math.max(1, life.frames)).toFixed(2)} ms over ${life.frames} draws, worst ${life.worst.toFixed(1)} ms`);
console.log(`     4x CPU, dragging the map: frame avg ${ps.avg.toFixed(1)} ms, p95 ${ps.p95.toFixed(1)} ms, max ${ps.max.toFixed(1)} ms`);
ok(life.frames > 0 && life.ms / life.frames < 6, 'the life canvas costs a few milliseconds a draw on a slowed phone');
ok(fs.p95 < 40, 'the idle map keeps above 25 frames a second on a slowed phone');

// ---- Map life in Settings ----
ok(await p.locator('[data-testid=map-life]').getAttribute('data-on') === '1', 'Map life is on by default');
await p.click('[data-testid=settings-btn]'); await p.waitForTimeout(400);
ok(await p.locator('[data-testid=toggle-map-life]').getAttribute('aria-checked') === 'true', 'Settings has a Map life switch, on');
await p.click('[data-testid=toggle-map-life]');
await p.click('[data-testid=settings-close]'); await p.waitForTimeout(400);
ok(await p.locator('[data-testid=map-life]').getAttribute('data-on') === '0', 'switched off, the map stands still');
ok(await p.evaluate(() => localStorage.getItem('tof-map-life')) === '0', 'and stays off on this device');
{
  const m = await measure(); const a = stat(m.frames), b2 = stat(m.pan);
  console.log(`     Map life off, for comparison: idle frame avg ${a.avg.toFixed(1)} ms, p95 ${a.p95.toFixed(1)} ms; dragging avg ${b2.avg.toFixed(1)} ms, p95 ${b2.p95.toFixed(1)} ms, max ${b2.max.toFixed(1)} ms`);
}
await p.evaluate(() => localStorage.setItem('tof-map-life', '1'));

ok(!errs.length, `no page errors ${JSON.stringify(errs)}`);
await b.close();
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
