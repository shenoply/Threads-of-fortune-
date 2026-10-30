// The world's people: a town's notables and its souq master, talk that knows you, how they feel about
// you moving, a caravan master on the road who haggles, and the encyclopedia linking it all.
//   node --import ./tests/_nohmr.mjs tests/folk.mjs
import { chromium } from 'playwright';
import { BASE, SHOTS } from './_env.mjs';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
let ok = true; const check = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) ok = false; };
const has = (sel) => p.locator(sel).count();
const storeUrl = () => p.evaluate(() => performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/game/state/store.ts')) ?? '/src/game/state/store.ts');
const st = async (fn, arg) => p.evaluate(async ([u, f, a]) => { const m = await import(u); return new Function('m', 'a', `return (${f})(m, a)`)(m, a); }, [await storeUrl(), fn.toString(), arg]);
await p.goto(BASE);
await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'), localStorage.setItem('tof-skip-chapters', '1')));
await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]'); await p.waitForTimeout(1500);
await st((m) => { const s = m.useGame.getState(); const missions = { ...s.missions }; for (const k of ['alexandria', 'beasts']) missions[k] = 'done'; m.useGame.setState({ tutorial: { done: true, step: 'done', inspected: true }, cash: 20000, levelUps: [], titleNews: [], missionNews: undefined, missions, introSeen: ['malek', 'arran', 'abuhamid', 'bilgin-chess', 'rashid', 'nabil', 'cohen', 'alexandria', 'damascus'], tipsSeen: [...(s.tipsSeen ?? []), 'open-all'] }); });
// in Damascus
await st((m) => { const s = m.useGame.getState(); m.useGame.setState({ passport: { day: 0 }, lastTown: 'damascus', border: undefined, world: { ...s.world, at: 'damascus', x: 486.9, y: 291, hour: 10, known: [...new Set([...s.world.known, 'damascus'])] } }); });
await p.evaluate(() => window.dispatchEvent(new CustomEvent('tof:go', { detail: { view: 'world', panel: 'damascus', tab: 'town' } }))); await p.waitForTimeout(1200);
await p.screenshot({ path: `${SHOTS}/folk-town.png` });
if (!(await p.locator('[data-testid=menu-notables]').isVisible().catch(() => false)) && await has('[data-testid=menu-more]')) { await p.click('[data-testid=menu-more]'); await p.waitForTimeout(300); }
check(await has('[data-testid=menu-notables]'), 'the town menu has its notables'); await p.click('[data-testid=menu-notables]'); await p.waitForTimeout(600);
await p.locator('[data-testid=notables]').scrollIntoViewIfNeeded().catch(() => {});
check(await has('[data-testid=notables]'), 'Damascus has its notables');
const rows = await p.locator('[data-testid=notables] .folk-row').count();
check(rows >= 4, `${rows} notables, the souq master among them`);
await p.locator('[data-testid=notables] .folk-row').first().click();
await p.waitForSelector('[data-testid=folk-card]');
const greet1 = await p.textContent('[data-testid=folk-greet]');
check(greet1.length > 20, `a greeting for a stranger: ${greet1.slice(0, 80)}`);
await p.click('[data-testid=folk-family]'); await p.waitForTimeout(200);
await p.click('[data-testid=folk-gossip]'); await p.waitForTimeout(200);
await p.screenshot({ path: `${SHOTS}/folk-talk.png` });
const r1 = await st((m) => { const f = m.useGame.getState().folk; return { met: Object.keys(f.met).length, rel: Object.values(f.rel)[0], heard: f.heard.length }; });
check(r1.met === 1 && r1.rel > 0 && r1.heard > 0, `met, he warms to you, and you have heard of others (${JSON.stringify(r1)})`);
// a link opens the encyclopedia at that person
await p.locator('.folk-mentions .ency-link').first().click();
await p.waitForSelector('[data-testid=ency-person]'); await p.waitForTimeout(500);
await p.screenshot({ path: `${SHOTS}/folk-ency-person.png` });
check(await has('[data-testid=ency-person]'), 'a name in talk opens his page in the encyclopedia');
await p.locator('[data-testid=ency-person] .ency-link').first().click(); await p.waitForTimeout(200);
check(await has('[data-testid=ency-place], [data-testid=ency-house], [data-testid=ency-person]'), 'and his page links on');
await p.click('[data-testid=ency-close]'); await p.click('[data-testid=folk-bye]').catch(() => {});
// the encyclopedia from the top bar, any time: everyone listed from the start, and each family's standing
check(await has('[data-testid=set-ency]'), 'an encyclopedia button in the town tabs (People also opens it from Me)');
await p.screenshot({ path: `${SHOTS}/folk-hud.png` });
await p.click('[data-testid=set-ency]'); await p.waitForSelector('[data-testid=ency-people]');
// it opens on the people you have met (one so far); Everyone lists the whole world
check((await p.locator('[data-testid=ency-who-met].on').count()) === 1 && (await p.locator('[data-testid=ency-people] .ency-card').count()) === 1, 'it opens on the people you have met');
await p.click('[data-testid=ency-who-all]'); await p.waitForTimeout(200);
const everyone = await p.evaluate(async () => Object.keys((await import('/src/game/systems/population.ts')).world().people).length);
const counted = await p.textContent('[data-testid=ency-people] .ency-count');
const cards = await p.locator('[data-testid=ency-people] .ency-card').count();
check(counted.startsWith(`${everyone} people`) && cards >= 20 && await has('[data-testid=ency-more]'), `every person is listed from the start as portrait cards, a page at a time (${counted}, ${cards} shown)`);
await p.click('[data-testid=ency-more]'); await p.waitForTimeout(200);
check((await p.locator('[data-testid=ency-people] .ency-card').count()) > cards, 'and more come with a tap');
await p.click('[data-testid=ency-tab-houses]'); await p.waitForSelector('[data-testid=ency-houses]');
check(await has('[data-testid=ency-rank-grand]') && await has('[data-testid=ency-rank-trade]'), 'families grouped by standing, great houses first');
await p.selectOption('[data-testid=ency-town]', 'cairo'); await p.waitForTimeout(200);
await p.screenshot({ path: `${SHOTS}/folk-ency-families.png` });
await p.locator('[data-testid=ency-houses] .ency-house').first().click(); await p.waitForSelector('[data-testid=ency-house]');
const tree = await p.textContent('[data-testid=ency-house]');
check(await has('[data-testid=ency-ladder] .on') && /Head of the house/.test(tree) && /1st of \d+ families in Cairo/.test(tree), 'a family page: its rank, its place in the town, and the family from the head down');
await p.screenshot({ path: `${SHOTS}/folk-ency-house.png`, fullPage: true });
await p.click('[data-testid=ency-close]');
// the souq master in the market
if (await has('[data-testid=tab-market]')) { await p.click('[data-testid=tab-market]'); await p.waitForTimeout(400); }
check(await has('[data-testid=souq-card]'), 'the souq master greets you at the market');
await p.screenshot({ path: `${SHOTS}/folk-souq.png` });
// a caravan on the road: its master, and a haggle
await st((m) => { const s = m.useGame.getState(); const parties = s.world.parties.map((q) => (q.id === 'p0' ? { ...q, x: s.world.x + 3, y: s.world.y + 2, speed: 0, cooldownUntil: 0 } : q)); m.useGame.setState({ world: { ...s.world, at: null, parties } }); });
await p.keyboard.press('Escape').catch(() => {}); await p.waitForTimeout(300);
if (await has('[data-testid=settlement]')) { const x = p.locator('[data-testid=settlement] .close, [data-testid=set-close]'); if (await x.count()) await x.first().click(); }
await p.waitForTimeout(500);
for (const el of await p.locator('[data-party=p0]').all()) { await el.dispatchEvent('pointerup').catch(() => {}); await p.waitForTimeout(200); await el.dispatchEvent('pointerup').catch(() => {}); if (await has('[data-testid=folk-card]')) break; }
check(await has('[data-testid=folk-card]'), 'stopping a caravan: you meet its master');
if (await has('[data-testid=enc-trade]')) {
  await p.click('[data-testid=enc-trade]'); await p.waitForSelector('[data-testid=caravan-trade]');
  const pr0 = await p.textContent('[data-testid=ct-buy]');
  if (await has('[data-testid=ct-haggle]')) await p.click('[data-testid=ct-haggle]');
  await p.waitForTimeout(200); await p.screenshot({ path: `${SHOTS}/folk-caravan.png` });
  const pr1 = await p.textContent('[data-testid=ct-buy]');
  const inv0 = await st((m) => m.useGame.getState().inventory.length);
  await p.click('[data-testid=ct-buy]'); await p.waitForTimeout(300);
  const inv1 = await st((m) => m.useGame.getState().inventory.length);
  check(inv1 === inv0 + 1, `haggled (${pr0} → ${pr1}) and bought off the camels`);
}
// a father who likes you speaks of a daughter of age, and her family joins the matches you could make
const match = await p.evaluate(async () => {
  const pop = await import('/src/game/systems/population.ts');
  const u = performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/game/state/store.ts')) ?? '/src/game/state/store.ts';
  const m = await import(u);
  const s = m.useGame.getState();
  const d = pop.eligibleDaughters(s.day).find((x) => pop.world().people[x.father].role !== 'kin');
  const fa = d.father;
  const f = s.folk ?? { rel: {}, met: {}, talked: {}, heard: [], log: [] };
  m.useGame.setState({ folk: { ...f, rel: { ...f.rel, [fa]: 12 }, met: { ...f.met, [fa]: 1 } } });
  const said = m.useGame.getState().folkTalk(fa, 'family');
  const h = m.useGame.getState().household;
  const hm = await import(performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/game/systems/household.ts')) ?? '/src/game/systems/household.ts'); // the copy the page loaded (its brides are registered there)
  return { said: said.text, known: h?.known ?? [], id: pop.folkBrideId(d.id), bride: !!hm.BRIDES[pop.folkBrideId(d.id)], n: pop.eligibleDaughters(s.day).length };
});
check(match.known.includes(match.id) && match.bride && /age to marry/.test(match.said), `a father speaks of his daughter, and her family would receive you (${match.n} daughters of age in the world): ${match.said.slice(-110)}`);
check(errs.length === 0, `no page errors ${errs.join(' | ')}`);
console.log(ok ? 'ALL OK' : 'SOME FAILED');
await b.close();
process.exit(ok ? 0 : 1);
