// Dress your stall: the stall starts with the father's things (clock, photograph, books) and nothing
// else; a piece bought on the Dress your stall screen stands in the spot chosen, at once; it stays there
// from day to day and after a reload; nothing on the shelves changes by itself; owned pieces swap for
// nothing and can be put away; an older save (version 24) keeps every dressing piece it bought, each
// put in its spot. Saffron never sits on a spot that holds a piece.
//   PORT=5221 node --import ./tests/_nohmr.mjs tests/stall-dress.mjs
import { chromium } from 'playwright';
import { BASE, SHOTS, visibleIds } from './_env.mjs';
const K = 'threads-of-fortune-save';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
let ok = true; const check = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) ok = false; };
const has = (id) => p.locator(`[data-testid="${id}"]`).count();
const storeUrl = () => p.evaluate(() => performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/game/state/store.ts')) ?? '/src/game/state/store.ts');
const st = async (fn, arg) => p.evaluate(async ([u, f, a]) => { const m = await import(u); return new Function('m', 'a', `return (${f})(m, a)`)(m, a); }, [await storeUrl(), fn.toString(), arg]);
const pieces = () => p.evaluate(() => [...document.querySelectorAll('[data-testid^="stall-piece-"]')].map((e) => e.dataset.testid.slice(12)).sort());
const close = async () => { for (const okId of ['big-news-ok', 'day-summary-ok', 'mission-ok']) { const x = p.locator(`[data-testid=${okId}]`); if (await x.count()) await x.first().click({ timeout: 1000 }).catch(() => {}); } };
// hold the game's autosave off an edited save until the reload has read it
const hold = () => p.evaluate((k) => { const w = Storage.prototype.setItem; Storage.prototype.setItem = function (key, v) { if (key === k && !window.__tofEdit) return; return w.call(this, key, v); }; setTimeout(() => { Storage.prototype.setItem = w; }, 4000); }, K);
const toStall = async () => {
  await p.click('[data-testid=nav-stall]').catch(() => {});
  await p.waitForSelector('[data-testid=stall-wait], [data-testid=scene]', { timeout: 15000 }).catch(() => {});
  if (await has('stall-wait')) await p.click('[data-testid=stall-wait]');
  await p.waitForSelector('[data-testid=scene]', { timeout: 15000 }).catch(async () => console.log('no scene:', await visibleIds(p)));
  await p.waitForTimeout(800);
};

await p.goto(BASE);
await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'), localStorage.setItem('tof-skip-chapters', '1')));
await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
await p.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.started === true; } catch { return false; } }, null, { timeout: 10000 }).catch(() => {});
await p.evaluate((k) => { const d = JSON.parse(localStorage.getItem(k)); const s = d.state; s.tutorial = { done: true, step: 'done', inspected: true }; s.introSeen = ['malek', 'arran', 'abuhamid', 'bilgin-chess', 'rashid', 'nabil', 'cohen']; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; s.cash = 10000; window.__tofEdit = true; localStorage.setItem(k, JSON.stringify(d)); window.__tofEdit = false; }, K);
await hold();
await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(1000);
await toStall();

// 1. the father's things, and nothing else
const start = await pieces();
check(JSON.stringify(start) === JSON.stringify(['prop-books', 'prop-clock', 'prop-photo']), `a new stall has the clock, the photograph and the books (${start})`);

// 2. buy the astrolabe for the top shelf on the Dress your stall screen: a pale preview first, then it stands there
await p.evaluate(() => window.dispatchEvent(new Event('tof:open-upgrades'))); await p.waitForTimeout(600);
await p.click('[data-testid=dress-open]'); await p.waitForTimeout(600);
check((await has('dress-screen')) === 1, 'the Improve sheet opens Dress your stall');
await p.click('[data-testid=spot-top-right]'); await p.waitForTimeout(300);
const strip = await p.locator('[data-testid=dress-strip] [data-testid^=piece-]').evaluateAll((es) => es.map((e) => e.dataset.testid.slice(6)));
check(strip.includes('prop-astrolabe') && strip.includes('prop-incense') && strip.length === 2, `the top shelf's right end offers its own pieces (${strip})`);
await p.click('[data-testid=piece-prop-astrolabe]'); await p.waitForTimeout(300);
const pv = await p.locator('[data-testid=dress-on-prop-astrolabe]').getAttribute('class').catch(() => '');
check(/preview/.test(pv ?? ''), 'tapping a piece shows it in place, pale until bought');
const cash0 = await st((m) => m.useGame.getState().cash);
await p.screenshot({ path: `${SHOTS}/stall-dress-preview.png` });
await p.click('[data-testid=dress-buy]'); await p.waitForTimeout(300);
const after = await st((m) => ({ cash: m.useGame.getState().cash, spots: m.useGame.getState().stallSpots, owned: m.useGame.getState().dressing }));
check(cash0 - after.cash === 2500 && after.spots?.['top-right'] === 'prop-astrolabe' && after.owned.includes('prop-astrolabe'), `bought for £25 and placed on the top shelf, right (${JSON.stringify(after.spots)})`);
check(!/preview/.test((await p.locator('[data-testid=dress-on-prop-astrolabe]').getAttribute('class').catch(() => 'preview')) ?? ''), 'once bought it is drawn solid');
await p.click('[data-testid=dress-close]'); await p.waitForTimeout(200);
await p.click('[data-testid=improve-close]').catch(() => {}); await p.waitForTimeout(400);
const nowP = await pieces();
check(nowP.includes('prop-astrolabe') && nowP.length === 4, `the stall shows it at once (${nowP})`);

// 3. nothing changes by itself from day to day; Saffron never takes the top shelf while it holds the astrolabe
const day0 = await st((m) => m.useGame.getState().day);
let same = true; const poses = new Set();
for (let d = day0 + 1; d <= day0 + 8; d++) {
  await st((m, d) => m.useGame.setState({ day: d, newsSeen: [] }), d); await p.waitForTimeout(150);
  const now = await pieces();
  if (JSON.stringify(now) !== JSON.stringify(nowP)) { same = false; console.log('day', d, now); }
  const pose = await p.locator('[data-testid=saffron]').getAttribute('data-pose').catch(() => null);
  if (pose) poses.add(pose);
}
check(same, 'over eight days the shelves stay exactly as dressed');
check(!poses.has('cat-topshelf'), `Saffron moves about (${[...poses]}) but not onto the astrolabe's shelf`);
await st((m, d) => m.useGame.setState({ day: d }), day0); await p.waitForTimeout(200); await close();

// a real night and morning too
await st((m) => { const g = m.useGame.getState(); g.endDay(); }); await p.waitForTimeout(800); await close();
const spotsNext = await st((m) => ({ day: m.useGame.getState().day, spots: m.useGame.getState().stallSpots }));
check(spotsNext.spots?.['top-right'] === 'prop-astrolabe' && spotsNext.spots?.['top-left'] === 'prop-clock', `the next morning it is all where it was (day ${spotsNext.day})`);

// 4. after a reload
await p.waitForTimeout(1200);
await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(1000); await close();
const reloaded = await st((m) => ({ spots: m.useGame.getState().stallSpots, owned: m.useGame.getState().dressing, v: m.SAVE_VERSION }));
check(reloaded.spots?.['top-right'] === 'prop-astrolabe' && reloaded.owned?.includes('prop-astrolabe') && reloaded.v === 25, 'it is still there after a reload (save 25)');

// 5. swap between owned pieces for nothing, and put one away
const sw = await st((m) => {
  const g = () => m.useGame.getState();
  const out = {};
  out.buyMsg = g().buyDressing('prop-incense');
  out.afterBuy = g().stallSpots['top-right'];
  const c = g().cash;
  out.swapMsg = g().placeDressing('top-right', 'prop-astrolabe');
  out.afterSwap = g().stallSpots['top-right']; out.swapCost = c - g().cash;
  out.wrongSpot = g().placeDressing('top-left', 'prop-astrolabe'); out.leftStill = g().stallSpots['top-left'];
  out.notOwned = g().placeDressing('mid-mid', 'prop-camera'); out.midStill = g().stallSpots['mid-mid'] ?? '';
  return out;
});
check(sw.afterBuy === 'prop-incense' && sw.afterSwap === 'prop-astrolabe' && sw.swapCost === 0, `owned pieces swap for nothing (${sw.swapMsg})`);
check(sw.leftStill === 'prop-clock' && !sw.midStill, 'a piece goes only in its own spot, and only once owned');
await toStall();
await p.evaluate(() => window.dispatchEvent(new Event('tof:open-upgrades'))); await p.waitForTimeout(500);
await p.click('[data-testid=dress-open]'); await p.waitForTimeout(400);
await p.click('[data-testid=spot-top-left]'); await p.waitForTimeout(200);
await p.click('[data-testid=dress-remove]'); await p.waitForTimeout(200);
check((await st((m) => m.useGame.getState().stallSpots['top-left'])) === '', 'the clock can be put away');
await p.click('[data-testid=piece-prop-clock]'); await p.waitForTimeout(200);
await p.click('[data-testid=dress-place]'); await p.waitForTimeout(200);
check((await st((m) => m.useGame.getState().stallSpots['top-left'])) === 'prop-clock', "and put back, free (it is your father's)");
await p.click('[data-testid=spot-table]'); await p.waitForTimeout(200);
await p.click('[data-testid=piece-tray]'); await p.waitForTimeout(300);
check((await has('dress-on-tray')) === 1, 'a piece not yet painted shows its icon at its spot');
await p.click('[data-testid=dress-close]'); await p.click('[data-testid=improve-close]').catch(() => {});

// 6. an older save keeps every dressing piece it bought, each put out in its spot
const raw = await p.evaluate((k) => localStorage.getItem(k), K);
await p.evaluate(([k, raw]) => {
  const d = JSON.parse(raw); d.version = 24; d.state.version = 24;
  delete d.state.stallSpots; d.state.dressing = ['bench', 'kilims', 'copper', 'tray', 'scale'];
  window.__tofEdit = true; localStorage.setItem(k, JSON.stringify(d)); window.__tofEdit = false;
}, [K, raw]);
await hold();
await p.reload(); await p.waitForTimeout(1200);
if (await has('continue')) await p.click('[data-testid=continue]');
await p.waitForTimeout(1000); await close();
const mig = await st((m) => { const s = m.useGame.getState(); return { spots: s.stallSpots, owned: s.dressing }; });
console.log(JSON.stringify(mig));
check(mig.owned.length === 5 && ['bench', 'kilims', 'copper', 'tray', 'scale'].every((x) => mig.owned.includes(x)), 'the old save keeps all it bought');
check(mig.spots.seat === 'bench' && mig.spots.floor === 'kilims' && mig.spots['bottom-right'] === 'copper' && mig.spots.table === 'tray' && mig.spots['top-left'] === 'prop-clock', 'each in its spot, with the father\'s things kept where nothing was bought');
await toStall();
const migP = await pieces();
check(migP.includes('copper'), `the copper ware stands on the bottom shelf (${migP})`);

check(errs.length === 0, `no page errors ${errs.slice(0, 3).join(' | ')}`);
await b.close();
console.log(ok ? 'ALL OK' : 'SOME FAILED');
process.exit(ok ? 0 : 1);
