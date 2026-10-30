// The Persian road (save 24): Persia on the map from the start, greyed and shut with its reason; the
// Persian visa at the consulate in Baghdad; shops in three cities and the visa open it; the train to
// Khanaqin and the walk over the frontier to Kermanshah (customs at Qasr-i Shirin, money in krans);
// Persian rugs cheap where they are woven and dear in Cairo; an older save migrates.
//   PORT=5173 node tests/persia.mjs   (needs the dev server; screenshots go to $SHOTS)
import { chromium } from '/home/claude/threads-of-fortune-/node_modules/playwright/index.mjs';
import { BASE, SHOTS, visibleIds } from './_env.mjs';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
const KEY = 'threads-of-fortune-save';
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
const has = (id) => p.locator(`[data-testid="${id}"]`).count();
const state = () => p.evaluate((k) => JSON.parse(localStorage.getItem(k)).state, KEY);
let fails = 0;
const ok = (c, msg) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${msg}`); if (!c) fails++; };
const shot = (n) => p.screenshot({ path: `${SHOTS}/persia-${n}.png` });
/** a module the page has loaded (its own copy, so the store is the game's store) */
const mod = (name, fn, arg) => p.evaluate(async ([name, src, a]) => {
  const url = performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes(`/src/${name}`)) ?? `/src/${name}`;
  const store = await import(performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/game/state/store.ts')) ?? '/src/game/state/store.ts');
  const m = await import(url);
  return new Function('m', 'store', 'a', src)(m, store, a);
}, [name, fn, arg]);
async function edit(src) {
  await p.goto('about:blank'); await p.goto(BASE);
  await p.evaluate(([k, src]) => { const d = JSON.parse(localStorage.getItem(k)); new Function('s', src)(d.state); localStorage.setItem(k, JSON.stringify(d)); localStorage.setItem('tof-skip-chapters', '1'); }, [KEY, src]);
  await p.goto('about:blank'); await p.goto(BASE);
  await p.waitForSelector('[data-testid=continue]', { timeout: 15000 }); await p.click('[data-testid=continue]'); await p.waitForTimeout(900);
}
async function openMap() {
  for (const id of ['day-summary-ok', 'mission-ok', 'big-news-ok']) if (await has(id)) await p.click(`[data-testid=${id}]`).catch(() => {});
  await p.click('[data-testid=nav-map]'); await p.waitForTimeout(700);
  if (await has('district-world')) { await p.click('[data-testid=district-world]'); await p.waitForTimeout(900); }
}
async function leaveTown() {
  for (const id of ['menu-leave', 'leave-settlement']) if (await has(id)) { await p.click(`[data-testid=${id}]`).catch(() => {}); await p.waitForTimeout(400); }
}
/** run the clock at full speed until the caravan stands in `town` (or a border card is up) */
async function travelTo(town, max = 160) {
  for (let i = 0; i < max; i++) {
    const s = await state();
    if (s.world.at === town || (await has('border-card'))) return true;
    if (await has('speed-4')) await p.click('[data-testid=speed-4]').catch(() => {});
    for (const id of ['night-march', 'road-ev-ok', 'day-summary-ok']) if (await has(id)) await p.click(`[data-testid=${id}]`).catch(() => {});
    await p.waitForTimeout(500);
  }
  return false;
}

await p.goto(BASE);
await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'), localStorage.setItem('tof-night-rule', 'march')));
await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
await p.waitForFunction((k) => { try { return JSON.parse(localStorage.getItem(k)).state.started === true; } catch { return false; } }, KEY, { timeout: 10000 }).catch(() => {});

// a new game: Persia is on the map, greyed, and shut
const s0 = await state();
ok(['khanaqin', 'kermanshah', 'tehran', 'kerman'].every((id) => s0.world.known.includes(id)), 'the Persian road is on the map from the start');
ok(s0.world.fog.length === 253 * 118, `the fog covers the map with Persia (${s0.world.fog.length})`);

// in Baghdad with a passport, money and one rug packed; no shops, no Persian visa
await edit(`s.tutorial = { done: true, step: 'done', inspected: true }; s.missionNews = undefined; s.levelUps = []; s.titleNews = [];
  s.world.at = 'baghdad'; s.world.x = 823.9; s.world.y = 266.2; s.world.hour = 7; s.world.parties = []; s.cash = 50000; s.dayOver = false;
  s.passport = { day: s.day }; s.lastTown = 'baghdad'; delete s.persianVisa; delete s.shops; s.upgrades = (s.upgrades || []).filter((u) => u !== 'khan');
  s.world.party.food = 60;
  const base = s.inventory[0]; s.inventory = [0, 1, 2].map((n) => ({ ...base, uid: 'pz' + n, paid: 1000, stored: false, restoringUntil: undefined }));
  delete s.border; delete s.changer;`);
await openMap();
ok(await mod('game/opening.ts', 'return m.cityLocked(store.useGame.getState(), "kermanshah") && m.cityLocked(store.useGame.getState(), "kerman") && !m.cityLocked(store.useGame.getState(), "khanaqin")'), 'Persian towns locked; Khanaqin (Iraq) open');
const cls = await p.locator('[data-testid=place-kermanshah]').getAttribute('class');
ok(/\blocked\b/.test(cls ?? ''), 'Kermanshah is greyed on the map');
await p.locator('[data-testid=place-tehran]').dispatchEvent('click'); await p.waitForTimeout(500);
const why = await p.locator('[data-testid=lock-card]').textContent().catch(() => '');
console.log('   ', why);
ok(/shop of your own in Baghdad/.test(why) && /two other cities/.test(why) && /Persian visa/.test(why), 'a tap on Tehran says what opens Persia, as a list');
ok(!(await has('travel')), 'and no trip is planned');
await shot('1-locked');

// the Persian consulate in Baghdad
await p.locator('[data-testid=place-baghdad]').dispatchEvent('click'); await p.waitForTimeout(800);
if (!(await has('settlement')) && (await has('enter'))) { await p.click('[data-testid=enter]'); await p.waitForTimeout(800); }
if (!(await has('menu-consulate')) && (await has('menu-more'))) { await p.click('[data-testid=menu-more]'); await p.waitForTimeout(300); }
ok(await has('menu-consulate'), 'Baghdad has the Persian consulate on its town menu');
await p.click('[data-testid=menu-consulate]').catch(() => {}); await p.waitForTimeout(500);
await p.locator('[data-testid=persian-consulate]').scrollIntoViewIfNeeded().catch(() => {});
await shot('2-consulate');
await p.click('[data-testid=buy-visa]').catch(() => {}); await p.waitForTimeout(400);
console.log('   ', await p.locator('[data-testid=papers-note]').textContent().catch(() => ''));
const s1 = await state();
ok(!!s1.persianVisa && s1.ledger.some((l) => /Persian visa/.test(l.label)), 'a Persian visa bought at the consulate');
ok(await mod('game/opening.ts', 'return m.cityLocked(store.useGame.getState(), "kermanshah")'), 'a visa alone does not open Persia');
console.log('   ', await mod('game/opening.ts', 'return m.lockedWhy(store.useGame.getState(), "kermanshah")'));

// shops in Baghdad and two other cities (the Khan shop counts as Cairo): open
await mod('game/opening.ts', 'store.useGame.setState({ shops: { baghdad: { since: 1 }, damascus: { since: 1 } }, upgrades: [...store.useGame.getState().upgrades, "khan"] }); return 1');
ok(!(await mod('game/opening.ts', 'return m.cityLocked(store.useGame.getState(), "kermanshah") || m.cityLocked(store.useGame.getState(), "kerman")')), 'shops in Baghdad, Damascus and Cairo with the visa: Persia opens');
await leaveTown();
// the trip card from Baghdad: the motor lorry up the Persian road, the frontier and the money
await p.locator('[data-testid=place-kermanshah]').dispatchEvent('click'); await p.waitForTimeout(800);
const trip = await p.locator('[data-testid=trip-money]').textContent().catch(() => '');
console.log('   trip card:', trip, '|', await p.locator('[data-testid=motor]').textContent().catch(() => ''));
ok(/Qasr-i Shirin/.test(trip) && /Krans/.test(trip), 'the trip card names the Persian post and the money');
ok(/Motor lorry/.test(await p.locator('[data-testid=motor]').textContent().catch(() => '')), 'a motor lorry runs from Baghdad up the Persian road');
await shot('2b-trip');
await p.click('[data-testid=plan-cancel]').catch(() => {}); await p.waitForTimeout(300);

// the train to the railhead at Khanaqin
await p.locator('[data-testid=place-khanaqin]').dispatchEvent('click'); await p.waitForTimeout(800);
if (await has('train')) await p.locator('[data-testid=train]').first().click();
else await p.locator('[data-testid=travel]').first().click().catch(() => {});
ok(await travelTo('khanaqin'), 'reached Khanaqin');
const s2 = await state();
ok(s2.world.at === 'khanaqin' && !s2.border, 'in Khanaqin, still in Iraq: no frontier yet');
await shot('3-khanaqin');
await leaveTown();

// over the frontier on foot to Kermanshah
await p.locator('[data-testid=place-kermanshah]').dispatchEvent('click'); await p.waitForTimeout(800);
if (await has('travel')) await p.locator('[data-testid=travel]').first().click().catch(() => {});
ok(await travelTo('kermanshah', 200), 'walked to Kermanshah');
await p.waitForSelector('[data-testid=border-card]', { timeout: 5000 }).catch(() => {});
ok(await has('border-card'), 'the border card at the Persian frontier');
console.log('   ', (await p.locator('[data-testid=border-card]').innerText().catch(() => '')).replace(/\n+/g, ' | '));
await shot('4-border');
const cash0 = (await state()).cash;
await p.click('[data-testid=border-full]').catch(() => p.click('[data-testid=border-none]'));
await p.waitForTimeout(400);
await p.click('[data-testid=border-continue]').catch(() => {}); await p.waitForTimeout(600);
// the post stands on the road: the caravan goes on from it to Kermanshah (a band in the passes may stop it)
for (let i = 0; i < 160 && (await state()).world.at !== 'kermanshah'; i++) {
  for (const id of ['amb-quick', 'amb-fight', 'clash-continue', 'leader-bounty', 'encounter-continue', 'road-flash-act', 'night-march', 'road-ev-ok', 'day-summary-ok']) if (await has(id)) await p.click(`[data-testid=${id}]`, { timeout: 2000 }).catch(() => {});
  if (await has('speed-4')) await p.click('[data-testid=speed-4]', { timeout: 2000 }).catch(() => {});
  await p.waitForTimeout(500);
}
const s3 = await state();
ok(s3.world.at === 'kermanshah', `in Kermanshah (${s3.world.at}, ${s3.inventory.filter((i) => !i.stored).length} rugs carried)`);
ok(s3.journal.some((j) => /Crossed into Persia at Persian post at Qasr-i Shirin|Crossed into Persia/.test(j.text)), 'journal: crossed into Persia');
ok(s3.ledger.some((l) => /Customs duty at Persian post at Qasr-i Shirin|Customs duty/.test(l.label)) && s3.cash < cash0, `customs paid at the frontier: ${cash0 - s3.cash} PT`);
await shot('5-kermanshah');

// Persian rugs: cheap where they are woven, dear in Cairo; prices in krans
const pr = await mod('game/state/store.ts', `
  const day = store.useGame.getState().day;
  const at = (sid, id) => m.localAskPrice(sid, day, id, 'Good', []);
  const item = (id) => ({ uid: 'x', typeId: id, condition: 'Good', restored: false, provenance: 'Likely', paid: 0, notes: [] });
  return { senneh: at('kermanshah', 'persian-senneh'), tabriz: at('tabriz', 'persian-tabriz'), kashan: at('kashan', 'persian-kashan'),
    cairoSenneh: m.localBid('cairo', item('persian-senneh'), day), cairoTabriz: m.localBid('cairo', item('persian-tabriz'), day),
    istanbulKashan: m.localBid('istanbul', item('persian-kashan'), day), alexHeriz: m.localBid('alexandria', item('persian-heriz'), day), tabrizHeriz: at('tabriz', 'persian-heriz') };`);
console.log('   ', JSON.stringify(pr));
ok(pr.cairoSenneh > pr.senneh * 2.5, `a Senneh: ${pr.senneh} PT in Kermanshah, ${pr.cairoSenneh} PT from a Cairo dealer`);
ok(pr.cairoTabriz > pr.tabriz * 2.5, `a Tabriz: ${pr.tabriz} PT in Tabriz, ${pr.cairoTabriz} PT in Cairo`);
ok(pr.istanbulKashan > pr.kashan * 2.5 && pr.alexHeriz > pr.tabrizHeriz * 2.5, 'Kashans dear in Constantinople, Heriz dear in Alexandria');
const money = await mod('game/economy/currency.ts', 'return [m.moneyLine("kermanshah", 100), m.localMoney(500, "kermanshah", 100)]');
console.log('   ', money.join(' | '));
ok(/Krans and tomans/.test(money[0]) && /tomans/.test(money[1]), 'money in krans and tomans');

// an older save (23) migrates: the road on the map, the fog grown, no visa
await edit(`s.world.known = s.world.known.filter((id) => !['khanaqin','kermanshah','hamadan','tehran','tabriz','kashan','isfahan','kerman'].includes(id));
  s.world.fog = '1'.repeat(177 * 118); s.world.at = 'baghdad'; s.world.x = 823.9; s.world.y = 266.2; s.world.parties = []; delete s.persianVisa; delete s.shops; delete s.border; delete s.journey; s.lastTown = 'baghdad';`);
await p.evaluate((k) => { const d = JSON.parse(localStorage.getItem(k)); d.version = 23; localStorage.setItem(k, JSON.stringify(d)); }, KEY);
await p.reload(); await p.waitForTimeout(500);
if (await has('continue')) await p.click('[data-testid=continue]');
await p.waitForTimeout(1500);
const live = await mod('game/state/store.ts', 'const s = store.useGame.getState(); return { known: s.world.known, fog: s.world.fog.length, explored: s.world.fog.slice(0, 177), bands: s.world.parties.map((x) => x.id), visa: !!s.persianVisa };');
ok(live.known.includes('tehran') && live.known.includes('khanaqin'), 'migrated: Persia on the map');
ok(live.fog === 253 * 118 && live.explored === '1'.repeat(177), 'migrated: fog widened, explored country kept');
ok(live.bands.includes('rb6') && live.bands.includes('rb7'), 'migrated: the Zagros raiders ride the passes');
ok(!live.visa, 'migrated: no visa');
await openMap();
await shot('6-migrated');

ok(!errs.length, `no page errors ${errs.join(' / ')}`);
if (fails) console.log('   on screen:', await visibleIds(p));
await b.close();
console.log(fails ? `${fails} FAILED` : 'all passed');
process.exit(fails ? 1 : 0);
