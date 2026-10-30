// Borders and money: papers at the Passport Office in Cairo, a train to Jerusalem stopped at the
// Kantara frontier (duty, a present for the clerk, or half the truth), and a Damascus market priced in
// Syrian pounds with the money-changer's cut.
//   PORT=5173 node tests/borders.mjs   (needs the dev server; screenshots go to $SHOTS)
import { chromium } from '/home/claude/threads-of-fortune-/node_modules/playwright/index.mjs';
import { BASE, SHOTS, fromTownMenu, visibleIds } from './_env.mjs';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
const KEY = 'threads-of-fortune-save';
const has = (id) => p.locator(`[data-testid="${id}"]`).count();
const state = () => p.evaluate((k) => JSON.parse(localStorage.getItem(k)).state, KEY);
let fails = 0;
const ok = (c, msg) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${msg}`); if (!c) fails++; };
const shot = (n) => p.screenshot({ path: `${SHOTS}/borders-${n}.png` });
async function edit(src) {
  await p.goto('about:blank'); await p.goto(BASE);
  await p.evaluate(([k, src]) => { const d = JSON.parse(localStorage.getItem(k)); new Function('s', src)(d.state); localStorage.setItem(k, JSON.stringify(d)); localStorage.setItem('tof-skip-chapters', '1'); }, [KEY, src]);
  await p.goto('about:blank'); await p.goto(BASE);
  await p.waitForSelector('[data-testid=continue]', { timeout: 15000 }); await p.click('[data-testid=continue]'); await p.waitForTimeout(900);
}
async function openMap() {
  for (const id of ['day-summary-ok', 'mission-ok']) if (await has(id)) await p.click(`[data-testid=${id}]`).catch(() => {});
  await p.click('[data-testid=nav-map]'); await p.waitForTimeout(700);
  if (await has('district-world')) { await p.click('[data-testid=district-world]'); await p.waitForTimeout(900); }
}

await p.goto(BASE);
await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'), localStorage.setItem('tof-night-rule', 'march')));
await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
await p.waitForFunction((k) => { try { return JSON.parse(localStorage.getItem(k)).state.started === true; } catch { return false; } }, KEY, { timeout: 10000 }).catch(() => {});

// in Cairo with two rugs packed and money to spend; no papers yet
await edit(`s.tutorial = { done: true, step: 'done', inspected: true }; s.missionNews = undefined; s.levelUps = []; s.titleNews = [];
  s.world.at = 'cairo'; s.world.x = 214.3; s.world.y = 413.7; s.world.hour = 8; s.world.parties = []; s.cash = 5000; s.dayOver = false;
  s.world.known = [...new Set([...s.world.known, 'jerusalem', 'damascus', 'jaffa'])];
  const base = s.inventory[0]; s.inventory = [0, 1].map((n) => ({ ...base, uid: 'bt' + n, paid: n ? 1200 : 800, stored: false, restoringUntil: undefined }));
  delete s.lastTown; delete s.passport; delete s.border; delete s.changer;`);
await openMap();
await p.locator('[data-testid=place-cairo]').dispatchEvent('click'); await p.waitForTimeout(800);
await fromTownMenu(p, 'all');
await p.locator('[data-testid=town-money]').scrollIntoViewIfNeeded().catch(() => {});
ok(await has('passport-office'), 'Cairo has the Passport Office');
await shot('1-cairo-office');
await p.click('[data-testid=buy-papers]'); await p.waitForTimeout(300);
ok((await state()).passport, 'papers bought');
console.log('  ', await p.locator('[data-testid=papers-note]').textContent());
await p.click('[data-testid=leave-settlement]').catch(() => {}); await p.waitForTimeout(500);

// the trip card shows the frontier and the money
await p.locator('[data-testid=place-jerusalem]').dispatchEvent('click'); await p.waitForTimeout(800);
const trip = await p.locator('[data-testid=trip-money]').textContent().catch(() => '');
console.log('   trip card:', trip);
ok(/Kantara/.test(trip) && /Money there/.test(trip), 'trip card names the frontier and the money');
await shot('2-trip-card');
await p.locator('[data-testid=train]').first().click(); await p.waitForTimeout(400);
for (let i = 0; i < 240 && !(await has('border-card')); i++) { if (await has('speed-4')) await p.click('[data-testid=speed-4]').catch(() => {}); await p.waitForTimeout(500); }
if (!(await has('border-card'))) { const s = await state(); console.log('   at', s.world.at, 'lastTown', s.lastTown, 'border', JSON.stringify(s.border), 'ids', await visibleIds(p)); await shot('3x-no-card'); }
ok(await has('border-card'), 'border card on reaching Palestine');
ok(await has('border-full') && await has('border-baksheesh') && await has('border-under'), 'duty, baksheesh and under-declare offered');
console.log('   ', (await p.locator('[data-testid=border-card]').innerText()).replace(/\n+/g, ' | '));
await shot('3-border-card');
const before = (await state()).cash;
await p.click('[data-testid=border-baksheesh]'); await p.waitForTimeout(500);
ok(await has('border-outcome'), 'an outcome is shown');
console.log('   outcome:', await p.locator('[data-testid=border-outcome]').textContent());
await shot('4-border-outcome');
const s1 = await state();
ok(s1.cash < before, `paid at the frontier: ${before - s1.cash} PT`);
ok(s1.journal.some((j) => /Crossed into Palestine/.test(j.text)), 'journal entry for the crossing');
await p.click('[data-testid=border-continue]'); await p.waitForTimeout(500);
ok(!(await has('border-card')) && (await state()).lastTown === 'jerusalem', 'on into Jerusalem');
// a reload does not ask again
await p.reload(); await p.waitForTimeout(1200);
ok(!(await has('border-card')), 'no second card after a reload');

// Damascus: prices in Syrian pounds, and the money-changer takes his cut on the first deal
await edit(`s.world.at = 'damascus'; s.world.x = 486.9; s.world.y = 291.0; s.lastTown = 'damascus'; s.inventory = s.inventory.slice(0, 1); s.world.hour = 9; s.dayOver = false; delete s.changer; delete s.border; s.cash = 5000;`);
await openMap();
await p.locator('[data-testid=place-damascus]').dispatchEvent('click'); await p.waitForTimeout(800);
await fromTownMenu(p, 'market');
await p.waitForTimeout(400);
const mkt = await p.locator('.set-body').innerText().catch(() => '');
ok(/£S\d/.test(mkt) && /\(£\d/.test(mkt), 'Damascus market priced in Syrian pounds with the Egyptian equivalent');
console.log('   ', (mkt.match(/.*£S.*/g) ?? []).slice(0, 3).join(' | '));
await shot('5-damascus-market');
const cash0 = (await state()).cash;
const sell = p.locator('.mkt-row button', { hasText: 'Sell £S' }).first();
const buy = p.locator('.mkt-row button.primary', { hasText: '£S' }).first();
if (await sell.count()) {
  await sell.click(); await p.waitForTimeout(500);
  console.log('   ', await p.locator('[data-testid=set-note]').textContent().catch(() => ''));
  const s2 = await state();
  const fee = s2.ledger.find((e) => /Money-changer in Damascus/.test(e.label));
  ok(!!fee, `money-changer paid on the first deal: ${fee ? -fee.amount : 0} PT (cash ${s2.cash - cash0})`);
  await buy.click().catch(() => {}); await p.waitForTimeout(400);
  ok((await state()).ledger.filter((e) => /Money-changer/.test(e.label)).length === 1, 'only once a visit');
} else ok(false, `no rug to sell in Damascus (${await visibleIds(p)})`);
await p.click('[data-testid=tab-town]').catch(() => {}); await p.waitForTimeout(300);
await p.locator('[data-testid=town-money]').scrollIntoViewIfNeeded().catch(() => {});
console.log('   town:', (await p.locator('[data-testid=town-money]').innerText().catch(() => '')).replace(/\n+/g, ' | '));
await shot('6-damascus-town');

// Turkey without papers: turned back at the frontier
await edit(`s.world.at = 'konya'; s.world.x = 305.4; s.world.y = 146.9; s.lastTown = 'aleppo'; delete s.passport; delete s.changer; s.world.hour = 9;
  s.border = { key: 'aleppo>konya:' + s.day, from: 'aleppo', to: 'konya', fromC: 'syria', toC: 'turkey', day: s.day, post: 'Meidan Ekbez, on the Baghdad Railway' };`);
if (!(await has('border-card'))) await openMap();
await p.waitForSelector('[data-testid=border-card]', { timeout: 5000 }).catch(() => {});
ok(await has('border-back') && !(await has('border-full')), 'Turkey turns back a man without papers');
await shot('7-turkey-refused');
await p.click('[data-testid=border-back]'); await p.waitForTimeout(300);
await p.click('[data-testid=border-continue]'); await p.waitForTimeout(600);
ok((await state()).world.at === 'aleppo', 'back in Aleppo');

await b.close();
console.log(fails ? `${fails} FAILED` : 'all passed');
process.exit(fails ? 1 : 0);
