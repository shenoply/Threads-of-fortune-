// The tester's sheet (src/components/Admin/AdminSheet.tsx): opened from Settings, one fold per feature;
// each section's main button sets the game up and lands on the feature's own screen, writes a line in
// the journal, and nothing on the page throws. Also: no sideways scroll on a Pixel 7a, the button is
// off in Ironman, and "Back to day one" starts a new game.
//   PORT=5224 node --import ./tests/_nohmr.mjs tests/admin.mjs
import { chromium } from 'playwright';
import { BASE, SHOTS, visibleIds } from './_env.mjs';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
p.on('dialog', (d) => d.accept());
p.setDefaultTimeout(8000);
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
let ok = true; const check = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) ok = false; };
const has = async (id) => (await p.locator(id.startsWith('[') ? id : `[data-testid="${id}"]`).count()) > 0;
const G = (fn, arg) => p.evaluate(async ([f, a]) => { const { useGame } = await import(performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/game/state/store.ts')) ?? '/src/game/state/store.ts'); const g = new Proxy({}, { get: (_, k) => useGame.getState()[k] }); return new Function('g', 'set', 'a', f)(g, useGame.setState, a); }, [fn, arg]);
const waitId = (id, ms = 8000) => p.waitForSelector(`[data-testid="${id}"]`, { timeout: ms }).then(() => true).catch(() => false);
const clearCards = async () => { for (const id of ['day-summary-ok', 'mission-ok', 'big-news-ok']) { const x = p.locator(`[data-testid=${id}]`); if (await x.count()) await x.first().click({ timeout: 1500 }).catch(() => {}); } };
/** reload the saved game, as a tester would come back to it: clears whatever screen the last step left */
const fresh = async () => { await p.reload(); if (await waitId('continue', 15000)) await p.click('[data-testid=continue]'); await waitId('nav-map', 15000); await p.waitForTimeout(600); await clearCards(); };
const openSheet = async () => {
  await clearCards();
  await p.locator('[data-testid=settings-btn]').click();
  await p.locator('[data-testid=admin-open]').scrollIntoViewIfNeeded();
  await p.click('[data-testid=admin-open]');
  return waitId('admin-sheet', 5000);
};
const openSec = async (sec) => {
  const d = p.locator(`[data-testid=adm-sec-${sec}]`);
  if (!(await d.evaluate((e) => e.open))) await p.click(`[data-testid=adm-row-${sec}]`);
  await p.locator(`[data-testid=adm-sec-${sec}]`).scrollIntoViewIfNeeded();
};
/** open the sheet, open the section, press the button; wait for the sheet to close or the result to show */
const press = async (sec, btn, settle = 1500) => {
  if (!(await has('admin-sheet'))) await openSheet();
  await openSec(sec);
  await p.click(`[data-testid=${btn}]`);
  for (let i = 0; i < 40; i++) {
    await p.waitForTimeout(150);
    if (!(await has('admin-sheet'))) break;
    const r = await p.locator(`[data-testid=adm-res-${sec}]`).innerText({ timeout: 300 }).catch(() => '');
    if (r && r !== '…') break;
  }
  await p.waitForTimeout(settle);
};
const journalHas = (txt) => G(`return g.journal.some((j) => j.text.startsWith("Tester's sheet: ") && j.text.includes(a));`, txt);

await p.goto(BASE);
await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'), localStorage.setItem('tof-fullscreen', 'off')));
await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
await p.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.started === true; } catch { return false; } }, null, { timeout: 10000 }).catch(() => {});
await p.waitForTimeout(1200);

// the sheet from Settings
check(await openSheet(), 'Settings opens the tester\'s sheet');
check((await p.locator('[data-testid^=adm-sec-]').count()) >= 15, `one fold per feature (${await p.locator('[data-testid^=adm-sec-]').count()})`);
await p.screenshot({ path: `${SHOTS}/admin-top.png` });
const w = await p.evaluate(() => document.documentElement.scrollWidth);
check(w <= 412, `no sideways scroll at 412 wide (${w})`);

// 1. money
const c0 = await G('return g.cash;');
await press('money', 'adm-cash500');
check((await G('return g.cash;')) === c0 + 50000 && /£500 added/.test(await p.locator('[data-testid=adm-res-money]').innerText()), '+£500: the purse and the result line');
check(await journalHas('+£500'), 'and the journal says so');
await openSec('time'); await openSec('week');
const tall = await p.evaluate(() => { const b = [...document.querySelectorAll('.adm-btn')].filter((e) => e.offsetParent); return Math.min(...b.map((e) => e.getBoundingClientRect().height)); });
check(tall >= 48, `big buttons (${tall}px at the least)`);
await p.locator('[data-testid=adm-sec-week]').scrollIntoViewIfNeeded();
await p.screenshot({ path: `${SHOTS}/admin-scrolled.png` });

// 2. time and weather
await press('time', 'adm-hour-12');
check(!(await has('admin-sheet')) && (await G('return g.world.hour;')) === 12, 'noon: the sheet closes and the clock reads 12');
const d0 = await G('return g.day;');
await press('time', 'adm-rain', 500);
const sky = await waitId('weather', 12000);
const rain = await G('return { day: g.day, at: g.world.at };');
check(rain.day > d0 && sky && (await has('[data-testid=weather][data-sky=rain]')), `a rain day: day ${rain.day}, rain over the stall (${await visibleIds(p)})`);
await p.screenshot({ path: `${SHOTS}/admin-rain.png` });
await fresh();
// 3. the first week (a new game: the instalment is a few days off)
await press('week', 'adm-week-again');
check(/again/.test(await p.locator('[data-testid=adm-res-week]').innerText()), 'the instalment put back');
await press('week', 'adm-week-show');
check(await waitId('family-week'), 'the first week: Rashid\'s page with his £10');
await press('week', 'adm-week-pay');
check((await G('return g.family.first.done;')) > 0, 'paid: the instalment is settled');

// 4. goals
await G(`set({ day: 8 }); g.endDay();`); await clearCards();
const ms0 = await G(`return Object.values(g.missions).filter((x, i) => Object.keys(g.missions)[i].startsWith('ms-') && x === 'done').length;`);
await press('goals', 'adm-goal-done');
const ms1 = await G(`return Object.values(g.missions).filter((x, i) => Object.keys(g.missions)[i].startsWith('ms-') && x === 'done').length;`);
check(ms1 === ms0 + 1 && (await waitId('ladder')), `a goal completed (${ms0} -> ${ms1}) and the ladder on Progress`);
await fresh();

// 5. unlocks
await press('unlocks', 'adm-open-all');
check(await G(`return g.tipsSeen.includes('open-all');`), 'everything opened');

// 6. stall dressing
await press('dress', 'adm-dress');
check(await waitId('dress-screen'), 'the Dress your stall screen opens'); await p.click('[data-testid=dress-close]').catch(() => {});
await fresh();

// 7. shops
await press('shops', 'adm-shop', 2000);
const sh = await G(`const s = g.shops?.alexandria; return s ? { agent: s.agent?.name, n: s.stock.length, at: g.world.at } : null;`);
check(sh && sh.agent && sh.n >= 3 && sh.at === 'alexandria', `a shop in Alexandria with an agent and three rugs (${JSON.stringify(sh)})`);
check(await waitId('shop-panel'), 'and its panel open');
await fresh();
await press('shops', 'adm-monday');
check(await journalHas('Go to Monday. Monday'), `the days pass to a Monday (${await p.locator('[data-testid=toast]').innerText().catch(() => '')})`);
await fresh();

// 8. city tables
await press('ranks', 'adm-ranks-1');
const place = await G(`return g.ranks?.tables?.cairo?.you ?? 0;`);
check(place > 0 && (await waitId('ranks-fold')), 'first in Cairo, with the table on Progress');
await fresh();

// 9. road fight
await press('fight', 'adm-fight-even', 500);
check(await waitId('road-encounter', 10000), `a band stops you on the road outside Cairo (${await visibleIds(p)})`);
await p.screenshot({ path: `${SHOTS}/admin-fight.png` });
await fresh();

// 10. road stories
await press('road', 'adm-road-dust-devil', 500);
let flash = '';
for (let i = 0; i < 60 && !/dust devil/i.test(flash); i++) { await p.waitForTimeout(250); flash = (await has('road-flash')) ? ((await p.locator('[data-testid=road-flash]').first().textContent({ timeout: 1000 }).catch(() => '')) || '') : ''; }
check(/dust devil/i.test(flash), `walking to Suez, the dust devil comes (${flash.slice(0, 60)})`);
await fresh();

// 11. mini-games
await press('games', 'adm-dom-giza', 500);
check(await waitId('domino-table', 15000), `dominoes with Tawfiq (${await visibleIds(p)})`);
await fresh();
await press('games', 'adm-knots', 500);
check(await waitId('knotcount', 15000), `a knot count at Arran's (${await visibleIds(p)})`);
await fresh();

// 12. family
await press('family', 'adm-fam-married');
check((await G(`return g.household?.stage;`)) === 'married' && (await waitId('household')), 'married, with the Household fold on Me');
await press('family', 'adm-fam-child');
check((await G(`return g.household.children.length;`)) === 1, 'a child is born');
await press('family', 'adm-fam-grow');
await press('family', 'adm-fam-heir');
check((await G(`return g.household.children[0].ageDays >= 18 * 365 - 1;`)) && (await waitId('household')), 'grown to eighteen: an heir');
await fresh();

// 13. Persia
await press('persia', 'adm-persia-open');
check(/Persia is open/.test(await p.locator('[data-testid=adm-res-persia]').innerText()), 'shops in three cities and a visa: Persia opens');
await press('persia', 'adm-persia-kermanshah', 2000);
check((await G('return g.world.at;')) === 'kermanshah', 'in Kermanshah');
await fresh();

// 14. travel
await openSheet(); await openSec('travel');
await p.selectOption('[data-testid=adm-town]', 'damascus');
await press('travel', 'adm-teleport', 2000);
check((await G('return g.world.at;')) === 'damascus' && ((await has('town-menu')) || (await has('settlement'))), `in Damascus with its town on screen (${await visibleIds(p)})`);
await fresh();

// 15. Ironman: the button is off
await G(`set({ ironman: true });`);
await p.click('[data-testid=settings-btn]'); await p.locator('[data-testid=admin-open]').scrollIntoViewIfNeeded();
check(await p.locator('[data-testid=admin-open]').isDisabled(), 'not in an Ironman game');
await p.click('[data-testid=settings-close]');
await G(`set({ ironman: false });`);

// 16. save: back to day one
const tl = await G(`return g.journal.filter((j) => j.text.startsWith("Tester's sheet: ")).length;`);
check(tl >= 15, `every use in the journal (${tl} lines)`);
await press('save', 'adm-save-copy');
check(/Copied|copy it/.test(await p.locator('[data-testid=adm-res-save]').innerText()), 'the save copied (or shown to copy)');
await press('save', 'adm-save-reset');
check(await waitId('begin-day-one', 10000), 'back to day one: the first morning\'s card');

console.log(errs.length ? `FAIL page errors ${JSON.stringify(errs)}` : 'no page errors');
console.log(ok && !errs.length ? 'PASS' : 'FAIL');
await b.close();
process.exit(ok && !errs.length ? 0 : 1);
