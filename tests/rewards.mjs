// The small rewards (src/game/rewards.ts, feel.ts): a sale floats its price, a lot won at auction says so,
// Rashid's instalment and a goal reached get a seal, reputation up ticks a star. All in a layer that
// takes no taps, gone by themselves. Also with reduced motion (RM=1): the price shows its full sum at once.
//   PORT=5173 node tests/rewards.mjs
import { chromium } from 'playwright';
import { BASE, SHOTS as O } from './_env.mjs';
let ok = true; const check = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) ok = false; };
const RM = process.env.RM === '1';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, ...(RM ? { reducedMotion: 'reduce' } : {}) });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(BASE, { timeout: 90000 });
await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'), localStorage.setItem('tof-skip-chapters', '1')));
await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]'); await p.waitForTimeout(1500);
await p.evaluate(async () => {
  const url = (f) => performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes(f)) ?? f;
  const S = await import(url('/src/game/state/store.ts'));
  window.__g = S.useGame;
});
const fx = () => p.evaluate(() => [...document.querySelectorAll('#ff-layer > *')].map((e) => e.className + ':' + e.textContent));
const shot = async (name, ms = 250) => { await p.waitForTimeout(ms); const f = await fx(); console.log(name, JSON.stringify(f)); await p.screenshot({ path: `${O}/rewards-${name}.png` }); await p.waitForTimeout(2000); return f; };
const has = (f, cls, re) => f.some((x) => x.split(':')[0].includes(cls) && re.test(x.split(':').slice(1).join(':')));
// 1. a dealer sale (small)
await p.evaluate(() => { const g = window.__g.getState(); window.__g.getState().sellLocal(g.inventory[0].uid, 'giza'); });
const f1 = await shot('dealer');
check(has(f1, 'ff-sale', /^\+£/), 'a dealer sale floats its price');
check(await p.evaluate(() => getComputedStyle(document.getElementById('ff-layer')).pointerEvents === 'none'), 'the layer takes no taps');
check(!(await fx()).length, 'and is gone after a moment');
// 2. a lot won at auction
await p.evaluate(() => { const g = window.__g.getState(); window.__g.setState({ cash: g.cash - 900, ledger: [...g.ledger, { day: g.day, kind: 'purchase', label: 'Auction: test lot', amount: -900, cost: 900 }] }); });
check(has(await shot('auction'), 'ff-won', /^Won · £9$/), 'a lot won at auction says so');
// 3. Rashid paid early
await p.evaluate(() => { window.__g.setState({ cash: 3000 }); window.__g.getState().payFamily(1000); });
check(has(await shot('paid', 200), 'ff-stamp', /^Paid$/), "Rashid's instalment paid: a seal");
// 4. a goal reached
await p.evaluate(() => { const g = window.__g.getState(); window.__g.setState({ tutorial: { done: true, step: 'done', inspected: true }, day: 8, missions: { ...g.missions, alexandria: 'done', beasts: 'done', farid: 'active' } }); });
await p.waitForTimeout(300);
await p.evaluate(() => { const g = window.__g.getState(); window.__g.setState({ missions: { ...g.missions, 'ms-corner': 'active' }, upgrades: ['mat', 'display', 'tea'] }); });
{ const f = await shot('goal', 260); check(has(f, 'ff-stamp', /^Goal$/), 'a goal reached: a seal'); check(has(f, 'ff-star', /★/), 'reputation up: a star'); }
// 5. a big sale + rep up
await p.evaluate(() => { const g = window.__g.getState(); window.__g.setState({ reputation: g.reputation + 1, cash: g.cash + 1200, ledger: [...g.ledger, { day: g.day, kind: 'sale', label: 'Big rug to someone', amount: 1200, cost: 300 }] }); });
{ const f = await shot('big', 400); check(has(f, 'ff-big', RM ? /^\+£12$/ : /^\+£/), 'a big sale gets the brass label'); }
check(!errs.length, `no page errors ${JSON.stringify(errs)}`);
console.log(ok ? 'ALL OK' : 'SOME FAILED');
await b.close();
process.exit(ok ? 0 : 1);
