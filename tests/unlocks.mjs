// Systems open one at a time (src/game/unlocks.ts). A fresh game on day one shows no Caravan screen (dimmed
// tab), no guard yard, animal market or Arran's laboratory in Giza, and a Cairo without its sale rooms, bank,
// telegraph, cabarets, Passport Office or clinic. Each comes into view at its moment with one short line
// (no card): the guard yard when the opening asks for a guard, Arran when a rug is in doubt, the rest of the
// towns when Rashid's errand is done (auction house, cabarets in the evening, the bank when money is short).
// Skipping the opening, the test switch, and an older save already under way see everything.
//   PORT=5182 node tests/unlocks.mjs
import { chromium } from 'playwright';
import { BASE, SHOTS } from './_env.mjs';
const K = 'threads-of-fortune-save';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
p.on('dialog', (d) => d.accept());
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
let ok = true; const check = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) ok = false; };
const has = (sel) => p.locator(sel).count();
const st = () => p.evaluate((k) => JSON.parse(localStorage.getItem(k)).state, K);

async function fresh(skipFlag = false) {
  await p.goto('about:blank'); await p.goto(BASE);
  await p.evaluate((sk) => { localStorage.clear(); localStorage.setItem('tof-intro-seen-v2', '1'); localStorage.setItem('tof-films-once', '1'); localStorage.setItem('tof-fullscreen', 'off'); if (sk) localStorage.setItem('tof-skip-chapters', '1'); }, skipFlag);
  await p.reload();
  await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
  await p.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.started === true; } catch { return false; } }, null, { timeout: 10000 }).catch(() => {});
  await p.waitForTimeout(1200);
}
// change the save on disk and come back to it (the running game is kept from writing over it first)
async function edit(fn, version) {
  const raw = await p.evaluate((k) => localStorage.getItem(k), K);
  await p.goto('about:blank'); await p.goto(BASE);
  await p.evaluate(([k, r, f, v]) => { const d = JSON.parse(r); new Function('s', f)(d.state); if (v) d.version = v; localStorage.setItem(k, JSON.stringify(d)); }, [K, raw, fn, version]);
  await p.reload();
  await p.waitForSelector('[data-testid=continue], [data-testid=nav-map]', { timeout: 60000 }).catch(() => {});
  if (await has('[data-testid=continue]')) await p.click('[data-testid=continue]');
  await p.waitForSelector('[data-testid=nav-map]', { timeout: 60000 }).catch(() => {});
  await p.waitForTimeout(1200);
}
const UNTUT = `s.tutorial = { done: true, step: 'done', inspected: true }; s.introSeen = ['malek','arran','abuhamid','bilgin-chess','rashid','nabil','cohen','alexandria']; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; s.guideSeen = true; s.totalSales = 1; s.ledger.push({ day: s.day, kind: 'purchase', label: 'Bought a rug from Rashid', amount: -75 });`;
const IN_CAIRO = (h = 10) => `s.world.at = 'cairo'; s.world.x = 214.3; s.world.y = 413.7; s.world.hour = ${h}; s.journey = undefined;`;
// every tile of the town menu, the ones behind "More in …" too
async function townTiles() {
  await p.click('[data-testid=nav-map]').catch(() => {}); await p.waitForTimeout(800);
  if (await has('[data-testid=guide-skip]')) await p.click('[data-testid=guide-skip]');
  if (await has('[data-testid=enter]')) await p.locator('[data-testid=enter]').first().dispatchEvent('click');
  await p.waitForTimeout(500);
  if (!(await has('[data-testid=town-menu]')) && (await has('[data-testid=town-menu-open]'))) await p.click('[data-testid=town-menu-open]');
  await p.waitForSelector('[data-testid=town-menu]', { timeout: 15000 }).catch(() => {});
  if (await has('[data-testid=menu-more]')) { await p.click('[data-testid=menu-more]'); await p.waitForTimeout(200); }
  return p.evaluate(() => [...document.querySelectorAll('[data-testid=town-menu] [data-testid^=menu-]')].map((e) => e.dataset.testid));
}
async function gizaPlaces() {
  await p.click('[data-testid=nav-map]').catch(() => {}); await p.waitForTimeout(900);
  if (await has('[data-testid=guide-skip]')) await p.click('[data-testid=guide-skip]');
  return p.evaluate(() => [...document.querySelectorAll('.district-places [data-testid^=poi-]')].map((e) => e.dataset.testid));
}
const note = async () => (await p.locator('[data-testid=unlock-note]').innerText().catch(() => '')).trim();
const LATER = ['menu-guards', 'menu-animals', 'menu-houses', 'menu-finance', 'menu-telegraph', 'menu-venues', 'menu-passport', 'menu-clinic', 'menu-chemist', 'menu-library', 'menu-court'];

// 1. a fresh game, day one
await fresh();
check((await p.locator('[data-testid=nav-caravan]').getAttribute('data-later')) === '1', 'day one: the Caravan tab stands dimmed');
check((await has('[data-testid=nav-caravan]')) === 1 && (await p.locator('nav.nav button').count()) === 6, 'all six bottom tabs are still there');
const s1 = await st();
check(!(s1.tipsSeen ?? []).some((t) => t.startsWith('open-')), `nothing marked open on day one (${(s1.tipsSeen ?? []).join(',')})`);

// first sale and Rashid done, standing in Giza: no lab, no guard yard
await edit(UNTUT);
const g1 = await gizaPlaces();
check(g1.length > 0 && !g1.includes('poi-lab') && !g1.includes('poi-guards') && !g1.includes('poi-animals'), `Giza on the first days: no lab, guard yard or animal market (${g1.join(' ')})`);
await p.click('[data-testid=nav-caravan]'); await p.waitForTimeout(300);
check((await has('[data-testid=caravan-screen], .caravan-screen')) === 0, 'tapping the dimmed Caravan tab does not open it');
check(/caravan: opens/i.test(await p.locator('.toast').first().innerText().catch(() => '')), 'and one short line says when it opens');

// 2. the opening asks for a guard: the guard yard, the animal market and the Caravan tab open, with a line
await edit(`s.world.at = 'giza'; s.world.x = 146.9; s.world.y = 443.7; s.ledger.push({ day: s.day, kind: 'expense', label: "Malek's: kofta", amount: -3 }); s.world.rumours = [...(s.world.rumours||[]), 'Khan el-Khalili pays a third more than Giza for a good rug. Go with a guard.'];`);
const n2 = await note();
check(/guard yard/i.test(n2), `the guard step brings a short notice: "${n2}"`);
check((await has('.overlay [data-testid=unlock-note], [role=dialog] [data-testid=unlock-note]')) === 0, 'the notice is not a card');
check((await p.locator('[data-testid=nav-caravan]').getAttribute('data-later')) === null, 'the Caravan tab is lit');
check((await st()).tipsSeen.includes('open-caravan'), 'and it is kept open in the save');
const g2 = await gizaPlaces();
check(g2.includes('poi-guards') && g2.includes('poi-animals'), 'the guard yard and animal market are on the Giza plan');

// Cairo while the opening still runs (the ferry step): the main places only, the guard yard among them
await edit(IN_CAIRO());
const c1 = await townTiles();
check(c1.includes('menu-market') && c1.includes('menu-station'), `early Cairo keeps the market and station (${c1.length} tiles)`);
const leak = c1.filter((t) => LATER.includes(t) && t !== 'menu-guards' && t !== 'menu-animals');
check(leak.length === 0, `early Cairo hides the later systems${leak.length ? `: ${leak.join(' ')}` : ''}`);
await p.screenshot({ path: `${SHOTS}/unlocks-cairo-early.png` });

// 3. a rug in doubt: Arran's laboratory
await edit(`s.inventory[0].flawKnown = true; s.inventory[0].dye = 'aniline'; s.world.at = 'giza'; s.world.x = 146.9; s.world.y = 443.7;`);
const n3 = await note();
check(/Arran/.test(n3), `a doubtful rug brings Arran: "${n3}"`);
check((await gizaPlaces()).includes('poi-lab'), 'his laboratory is on the plan');

// 4. Rashid's errand done, an evening in Cairo, money short: the towns open, a line at a time
await edit(`s.missions = { ...(s.missions||{}), alexandria: 'done' }; s.onboard = { ...(s.onboard||{}), bandits: true, auction: true }; s.world.party.troops = { watchman: 1 }; s.cash = 30; ${IN_CAIRO(19)}`);
const lines = [];
for (let i = 0; i < 6; i++) { const t = await note(); if (!t) break; if (!lines.includes(t)) lines.push(t); await p.locator('[data-testid=unlock-note]').click().catch(() => {}); await p.waitForTimeout(250); }
check(lines.some((l) => /errand is done/i.test(l)), 'the end of the opening says the towns are open');
check(lines.some((l) => /auction house/i.test(l)), 'Cairo\'s auction house has its own line');
check(lines.some((l) => /cabarets/i.test(l)), 'so do the cabarets, of an evening');
check(lines.some((l) => /moneylender/i.test(l)), 'and the bank, with money short');
const c4 = await townTiles();
const miss4 = ['menu-houses', 'menu-finance', 'menu-telegraph', 'menu-venues', 'menu-passport', 'menu-clinic', 'menu-library', 'menu-guards'].filter((t) => !c4.includes(t));
check(miss4.length === 0, `Cairo now shows them all${miss4.length ? ` (missing ${miss4.join(' ')})` : ''}`);
await p.screenshot({ path: `${SHOTS}/unlocks-cairo-open.png` });

// 5. Skip the opening: everything at once, no notices
await fresh();
await edit(UNTUT);
if (await has('[data-testid=first-hour-skip]')) await p.click('[data-testid=first-hour-skip]');
await p.waitForTimeout(600);
check(!(await note()), 'Skip brings no notices');
await edit(IN_CAIRO());
const s5 = await st();
check((s5.tipsSeen ?? []).includes('first-hour'), 'the opening was skipped');
const c5 = await townTiles();
const miss5 = LATER.filter((t) => t !== 'menu-court' && t !== 'menu-chemist' && !c5.includes(t));
check(miss5.length === 0, `after Skip, Cairo shows everything${miss5.length ? ` (missing ${miss5.join(' ')})` : ''}`);
check((await p.locator('[data-testid=nav-caravan]').getAttribute('data-later')) === null, 'and the Caravan tab is lit');
check(!(await note()), 'and none in Cairo either');

// 6. the test switch (tof-skip-chapters): everything from the start
await fresh(true);
check((await p.locator('[data-testid=nav-caravan]').getAttribute('data-later')) === null, 'the test switch: Caravan lit on day one');
await edit(UNTUT);
check((await gizaPlaces()).includes('poi-lab'), 'and Arran\'s laboratory is on the plan');

// 7. an older save under way (made before this change): migrated to see everything
await fresh();
await edit(`${UNTUT} s.day = 5; s.tipsSeen = (s.tipsSeen||[]).filter((t) => t !== 'first-hour' && !t.startsWith('open-')); s.missions = { ...(s.missions||{}), alexandria: 'done' }; s.world.party.troops = { watchman: 1 }; ${IN_CAIRO()}`, 22);
const s7 = await st();
check((s7.tipsSeen ?? []).includes('open-all'), `an older save under way is marked open-all (v${s7.version ?? '?'})`);
const c7 = await townTiles();
check(LATER.filter((t) => t !== 'menu-court' && t !== 'menu-chemist').every((t) => c7.includes(t)), 'and sees every place in Cairo');
// one on its first day keeps only what it has met
await fresh();
await edit(`s.tipsSeen = (s.tipsSeen||[]).filter((t) => !t.startsWith('open-'));`, 22);
check(!(await st()).tipsSeen.includes('open-all'), 'an older save on its first day starts the step by step way');

console.log(ok && !errs.length ? 'PASS' : 'FAIL', errs.slice(0, 3));
await b.close();
process.exit(ok && !errs.length ? 0 : 1);
