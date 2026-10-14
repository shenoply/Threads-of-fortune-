// The first week: Uncle Rashid's first instalment of your father's debt, due on day 7.
// The day-one card says it; the objective line carries a short countdown that ticks down each night;
// paying it at Rashid's clears it (before the day, with £1 off); missing it adds £2 to the debt, costs
// his trust and gives one more week, once; an older save already past the first days is never asked.
//   PORT=5181 node tests/first-week.mjs
import { chromium } from 'playwright';
import { PORT, SHOTS, visibleIds } from './_env.mjs';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
p.on('dialog', (d) => d.accept());
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const out = []; let ok = true; const check = (c, m) => { console.log(`${c ? "ok  " : "FAIL"} ${m}`); if (!c) ok = false; };
const K = 'threads-of-fortune-save';
const chip = async () => (await p.locator('[data-testid=week-due]').first().innerText({ timeout: 3000 }).catch(() => '')).replace(/\s+/g, ' ').trim();
const G = (fn, arg) => p.evaluate(async ([f, a]) => { const { useGame } = await import(performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/game/state/store.ts')) ?? '/src/game/state/store.ts'); const g = new Proxy({}, { get: (_, k) => useGame.getState()[k] }); return new Function('g', 'set', 'a', f)(g, useGame.setState, a); }, [fn, arg]);
const clearCards = async () => { for (const id of ['day-summary-ok', 'mission-ok', 'big-news-ok']) { const x = p.locator(`[data-testid=${id}]`); if (await x.count()) await x.first().click({ timeout: 1500 }).catch(() => {}); } };

await p.goto(`http://localhost:${PORT}/`);
await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'), localStorage.setItem('tof-fullscreen', 'off'))); await p.reload();
await p.click('[data-testid=skip-to-day]');
// 1. day one: Rashid's word on the card, and the countdown in the objective line
const word = await p.locator('[data-testid=dayone-debt]').innerText().catch(() => '');
check(/Uncle Rashid/.test(word) && /£10\b/.test(word) && /Monday 16 March/.test(word), `the day-one card gives Rashid's word: "${word}"`);
await p.screenshot({ path: `${SHOTS}/first-week-1-card.png` });
await p.click('[data-testid=begin-day-one]');
await p.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.started === true; } catch { return false; } }, null, { timeout: 10000 }).catch(() => {});
await p.waitForTimeout(1200);
// the lesson hides the objective line; past it, the line shows the opening step and the countdown
await G(`set({ tutorial: { done: true, step: 'done', inspected: true }, levelUps: [], titleNews: [], missionNews: undefined, introSeen: ['malek','arran','abuhamid','bilgin-chess','rashid','nabil','cohen'] });`);
await p.waitForTimeout(600);
const c1 = await chip();
check(c1 === 'Rashid £10 · 6 days', `day one: the countdown reads "${c1}" (${await visibleIds(p)})`);
const oneLine = await p.evaluate(() => { const r = document.querySelector('.objective-bar .ob-row'); const d = document.querySelector('[data-testid=week-due]'); return r && d ? { row: Math.round(r.getBoundingClientRect().height), chip: Math.round(d.getBoundingClientRect().height), same: Math.abs(r.getBoundingClientRect().top - d.getBoundingClientRect().top) < 20, w: document.documentElement.scrollWidth } : null; });
check(!!oneLine && oneLine.row <= 48 && oneLine.same && oneLine.w <= 390, `the objective bar stays one thin line on a phone: ${JSON.stringify(oneLine)}`);
check((await p.locator('[data-testid=first-hour]').innerText().catch(() => '')).toLowerCase().includes('of 8'), 'the countdown rides on the opening step, not a second objective');
const j1 = await G(`return g.journal.some((j) => /Uncle Rashid sends word/.test(j.text));`);
check(j1, 'the journal keeps Rashid\'s word');
await p.screenshot({ path: `${SHOTS}/first-week-2-bar.png` });

// 2. the countdown ticks down with each night
await G(`g.endDay();`); await p.waitForTimeout(500); await clearCards(); await p.waitForTimeout(300);
const c2 = await chip();
check(c2 === 'Rashid £10 · 5 days', `day two: "${c2}"`);
await G(`set({ day: 6 });`); await p.waitForTimeout(300);
const c6 = await chip();
check(c6 === 'Rashid £10 · 1 day' && (await p.locator('[data-testid=week-due].near').count()) > 0, `the day before: "${c6}", marked`);
await G(`set({ day: 2 });`);

// 3. paying it at Rashid's clears it, before the day with £1 off
await G(`set({ cash: 1500 });`); await p.waitForTimeout(300);
await p.locator('[data-testid=week-due]').first().click(); await p.waitForTimeout(1800);
const terms = await p.locator('[data-testid=family-week]').innerText().catch(() => '');
check(/Rashid wants £10 by Monday 16 March\. /.test(terms), `Rashid's page states the terms: "${terms}"`);
await p.screenshot({ path: `${SHOTS}/first-week-3-rashid.png` });
await p.locator('[data-testid=pay-week]').click(); await p.waitForTimeout(500);
const paid = await G(`return { f: g.family, cash: g.cash, trust: g.supplier.trust };`);
check(paid.f.first.done === 2 && paid.f.first.how === 'early' && paid.f.left === 10000 - 1000 - 100 && paid.cash === 500, `paid early: £1 off the debt (${JSON.stringify(paid.f)})`);
check(!(await p.locator('[data-testid=week-due]').count()), 'the countdown is gone once paid');
const after = await G(`g.endDay(); g.endDay(); return { left: g.family.left, first: g.family.first };`);
check(after.left === 8900 && after.first.done === 2, 'nights after paying change nothing');

// 4. missed: the consequence once, then one more week
await G(`set({ day: 7, cash: 300, family: { left: 10000, due: 0, since: 0, paid: 0, first: { sum: 1000, by: 7, paid: 0 } }, supplier: { ...g.supplier, trust: 20 }, ruin: { stage: 0, since: 0 } });`);
const m1 = await G(`g.endDay(); return { f: g.family, trust: g.supplier.trust, cash: g.cash, notes: g.lastSummary.notes.filter((n) => /Rashid/.test(n)), line: g.supplier.lastLine, ruin: g.ruin.stage };`);
check(m1.f.left === 10200 && m1.trust === 10 && m1.f.first.second && m1.f.first.by === 14 && m1.f.first.sum === 1200 && !m1.f.first.done, `missed: £2 on the debt, trust 20 → ${m1.trust}, one more week (${JSON.stringify(m1.f.first)})`);
check(m1.notes.some((n) => /One more week: £12 by Monday 23 March\.$/.test(n)), `the morning says so: ${JSON.stringify(m1.notes)}`);
check(m1.line === 'Pay me what you owe first. Then we talk about owing me more.', 'Rashid answers with a recorded line');
check(m1.ruin === 0 && m1.cash === 300, 'no lawyer, nothing seized, the purse untouched: never the end in week one');
await clearCards(); await p.waitForTimeout(400);
const c8 = await chip();
check(c8 === 'Rashid £12 · 6 days', `the second chance shows in the line: "${c8}"`);
const m2 = await G(`g.endDay(); g.endDay(); return { left: g.family.left, trust: g.supplier.trust, first: g.family.first };`);
check(m2.left === 10200 && m2.trust === 10 && m2.first.by === 14, 'the consequence applied once only');
// the second week runs out too: it goes into the book as overdue
const m3 = await G(`set({ day: 14, cash: 0 }); g.endDay(); return { f: g.family, trust: g.supplier.trust, ended: !!g.ended };`);
check(m3.f.first.how === 'rolled' && m3.f.due === 1200 && m3.trust === 5 && !m3.ended, `missed again: £12 overdue in his book (${JSON.stringify(m3.f)})`);
await G(`set({ day: 7, cash: 2000, family: { left: 10000, due: 0, since: 0, paid: 0, first: { sum: 1000, by: 7, paid: 400 } }, supplier: { ...g.supplier, trust: 20 } });`);
const ot = await G(`g.endDay(); return { f: g.family, cash: g.cash, trust: g.supplier.trust };`);
check(ot.f.first.how === 'onTime' && ot.f.left === 9400 && ot.trust === 22, `on the night itself the rest is taken from the purse (${JSON.stringify(ot.f)})`);

// 5. an older save already past the first days is never asked
await p.evaluate((k) => { const d = JSON.parse(localStorage.getItem(k)); d.version = 22; d.state.day = 12; d.state.family = { left: 10000, due: 0, since: 0, paid: 0 }; const w = Storage.prototype.setItem; Storage.prototype.setItem = function (key, v) { if (key === k) return; return w.call(this, key, v); }; w.call(localStorage, k, JSON.stringify(d)); }, K);
await p.reload(); if (await p.locator('[data-testid=continue]').count()) await p.click('[data-testid=continue]'); await p.waitForTimeout(1200);
const old = await G(`return { f: g.family, day: g.day };`);
check(old.day === 12 && old.f.first?.done === 12 && old.f.first?.how === 'old' && old.f.left === 10000, `an old save on day 12 has it settled (${JSON.stringify(old.f.first)})`);
const old2 = await G(`g.endDay(); return { left: g.family.left, trust: g.supplier.trust, how: g.family.first.how };`);
check(old2.left === 10000 && old2.how === 'old', 'and nothing fails at its next night');
check(!(await p.locator('[data-testid=week-due]').count()), 'no countdown on an old save');


console.log(errs.length ? `FAIL page errors ${JSON.stringify(errs)}` : 'no page errors');
console.log(ok && !errs.length ? 'PASS' : 'FAIL');
await b.close();
process.exit(ok && !errs.length ? 0 : 1);
