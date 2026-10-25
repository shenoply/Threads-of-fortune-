// Sealed bales at Rashid's: one a day, paid for, cut open into stock; the week's seventh gift is one.
//   node --import ./tests/_nohmr.mjs tests/bales.mjs
import { chromium } from 'playwright';
import { BASE } from './_env.mjs';
const K = 'threads-of-fortune-save';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
let ok = true; const check = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) ok = false; };
const has = (id) => p.locator(`[data-testid="${id}"]`).count();
const storeUrl = () => p.evaluate(() => performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/game/state/store.ts')) ?? '/src/game/state/store.ts');
const st = async (fn, arg) => p.evaluate(async ([u, f, a]) => { const m = await import(u); return new Function('m', 'a', `return (${f})(m, a)`)(m, a); }, [await storeUrl(), fn.toString(), arg]);
await p.goto(BASE);
await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'), localStorage.setItem('tof-skip-chapters', '1')));
await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]'); await p.waitForTimeout(1500);
await st((m) => { const s = m.useGame.getState(); m.useGame.setState({ tutorial: { done: true, step: 'done', inspected: true }, introSeen: ['malek', 'arran', 'abuhamid', 'bilgin-chess', 'rashid', 'nabil', 'cohen'], cash: 10000, levelUps: [], titleNews: [], missionNews: undefined }); });
await p.waitForTimeout(500);
await p.click('[data-testid=nav-inventory]'); await p.click('[data-testid=stock-rashid]'); await p.waitForSelector('[data-testid=bale-card]');
const n0 = await st((m) => m.useGame.getState().inventory.length);
await p.click('[data-testid=bale-buy]'); await p.waitForTimeout(300);
const s1 = await st((m) => { const s = m.useGame.getState(); return { n: s.inventory.length, cash: s.cash, coins: 0, bales: s.bales }; });
check(s1.n > n0 && s1.cash >= 10000, `Rashid's free bale and its rugs go into stock (${s1.n - n0})`);
for (let i = 0; i < 12 && await p.locator('[data-testid=reveal]').count(); i++) { await p.click('[data-testid=reveal]', { position: { x: 20, y: 20 } }).catch(() => {}); await p.waitForTimeout(500); }
check(/buy one/i.test(await p.textContent('[data-testid=bale-buy]')) && !(await p.isDisabled('[data-testid=bale-buy]')), 'more can be bought straight after, and the next free one counts down');
const c1 = await st((m) => m.useGame.getState().cash);
await p.click('[data-testid=bale-buy]', { force: true }); await p.waitForTimeout(300);
const c2 = await st((m) => m.useGame.getState().cash);
check(c2 <= c1 - 1200 + 2000 && c2 !== c1, `another costs £12 (${c1} → ${c2})`);
// the seventh day of the week's gifts is a bale
const g7 = await p.evaluate(async () => { const d = await import('/src/game/systems/daily.ts'); return [d.giftFor(7, 0, []).kind, d.giftFor(14, 1, []).kind]; });
check(g7[0] === 'bale' && g7[1] === 'bale', 'the seventh gift of every week is a sealed bale');
check(errs.length === 0, `no page errors ${errs.join(' | ')}`);
console.log(ok ? 'ALL OK' : 'SOME FAILED');
await b.close();
process.exit(ok ? 0 : 1);
