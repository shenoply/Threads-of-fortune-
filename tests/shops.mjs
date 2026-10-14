// Shops in other cities and the stall's dressing: buy a shop in Jaffa, take on an agent, leave him rugs,
// let the Mondays come and the takings arrive (ledger, short notice, his letter); an empty shop sends
// nothing and says so; a dishonest man's book is found short; a dressing piece costs what it says and
// helps every sale; the town menu has the tile; an older save (version 23) gets its Alexandria and Cairo
// shops and loads.
//   PORT=5201 node --import ./tests/_nohmr.mjs tests/shops.mjs
import { chromium } from 'playwright';
import { BASE, tapPlace, fromTownMenu, visibleIds } from './_env.mjs';
const K = 'threads-of-fortune-save';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
let ok = true; const check = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) ok = false; };
await p.goto(BASE);
await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'), localStorage.setItem('tof-skip-chapters', '1')));
await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]'); await p.waitForTimeout(1200);

const storeUrl = () => p.evaluate(() => performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/game/state/store.ts')));
const r = await p.evaluate(async () => {
  const url = (f) => performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes(f)) ?? f;
  const S = await import(url('/src/game/state/store.ts'));
  const SH = await import(url('/src/game/systems/shops.ts'));
  const N = await import(url('/src/game/systems/negotiation.ts'));
  const E = await import(url('/src/game/economy/economy.ts'));
  const { useGame } = S;
  const g = () => useGame.getState();
  const set = (x) => useGame.setState(x);
  const out = {};
  const rug = (uid, typeId = 'cairo-garden') => ({ uid, typeId, condition: 'Good', restored: false, provenance: 'Likely', paid: 300, notes: [], stored: false });
  // a merchant past the opening, standing in Jaffa with three rugs packed
  let d = 20; while (E.dateFor(d + 1).weekday !== 'Monday') d++;
  set({ started: true, tutorial: { done: true, step: 'done', inspected: true }, levelUps: [], titleNews: [], sim: { illness: false, injuries: false, needs: false },
    missions: { alexandria: 'done', beasts: 'done', farid: 'done' }, day: d, cash: 100000, reputation: 30,
    inventory: [rug('j1'), rug('j2', 'nile-reed'), rug('j3', 'delta-house')], world: { ...g().world, at: 'jaffa', hour: 10 } });
  out.cashBefore = g().cash;
  out.buy = g().buyShop('jaffa');
  out.cost = out.cashBefore - g().cash;
  out.keys = Object.keys(g().shops ?? {});
  out.hire = g().hireAgent('jaffa', 'haddad');
  for (const u of ['j1', 'j2', 'j3']) g().leaveStock('jaffa', u);
  out.wall = g().shops.jaffa.stock.length;
  out.invLeft = g().inventory.filter((i) => ['j1', 'j2', 'j3'].includes(i.uid)).length;
  // the Mondays: takings arrive (up to six weeks, in case of a run of slow ones)
  let takings = null, letter = null, notice = null;
  for (let w = 0; w < 6 && !takings; w++) {
    set({ day: d + 7 * w, cash: Math.max(g().cash, 50000), world: { ...g().world, at: 'giza' } });
    useGame.subscribe((s) => { if (s.jobNote && /^Takings from/.test(s.jobNote)) notice = s.jobNote; });
    g().endDay();
    const today = g().day;
    takings = g().ledger.find((l) => l.day === today && l.label === 'Takings from Jaffa') ?? null;
    letter = (g().post?.letters ?? []).filter((l) => l.day === today && /Jaffa/.test(l.title)).pop() ?? null;
    out.monday = E.dateFor(today).weekday;
  }
  out.takings = takings; out.letter = letter?.body ?? null; out.notice = notice;
  out.wage = g().ledger.some((l) => /^Wage: Elias Haddad/.test(l.label));
  out.journal = g().journal.some((j) => j.kind === 'shop' && /sold/.test(j.text));
  // an empty shop sends nothing, and the agent says so
  const empty = SH.shopsWeek({ amman: { since: 1, paid: 30000, stock: [], agent: { id: 'twal', name: 'Odeh Twal', honesty: 0.9, skill: 0.4, wage: 70, since: 1 } } }, 30, 1000, () => 0.5);
  out.empty = { in: empty.cashIn, out: empty.cashOut, letter: empty.letters[0]?.body, notice: empty.notice.length };
  // a sharp man keeps some back; looking over his book finds it, and he pays half back
  let i = 0; const seq = [0.1, 0.1, 0.1, 0.1, 0.1, 0.1];
  const sharp = SH.shopsWeek({ jaffa: { since: 1, paid: 35000, stock: [rug('s1'), rug('s2')], agent: { id: 'levy', name: 'Nissim Levy', honesty: 0.5, skill: 0.8, wage: 170, since: 1 } } }, 30, 1000, () => seq[i++ % seq.length]);
  out.skimmed = sharp.shops.jaffa.skimmed ?? 0;
  const book = SH.lookOverBook(sharp.shops.jaffa, 31);
  out.book = { refund: book.refund, text: book.text, after: book.shop.skimmed };
  // the real store: the same thing through checkBooks, in person
  set({ world: { ...g().world, at: 'jaffa' }, shops: { ...g().shops, jaffa: { ...g().shops.jaffa, skimmed: 400, booksDay: undefined } } });
  const c0 = g().cash; out.checkMsg = g().checkBooks('jaffa'); out.refund = g().cash - c0;
  // dressing: a bench costs £9 and gives every buyer six more patience; kilims four more interest
  const ctx = (dressing) => ({ inventory: [], upgrades: [], dressing, reputation: 10, rel: { visits: 0, purchases: 0, spent: 0, affinity: 0, bad: 0, lastLines: [] }, rng: () => 0.5 });
  const plain = N.startEncounter('samira', ctx([]), [], false);
  const c1 = g().cash; out.dressMsg = g().buyDressing('bench'); out.dressCost = c1 - g().cash;
  g().buyDressing('kilims');
  out.owned = g().dressing;
  const dressed = N.startEncounter('samira', ctx(g().dressing), [], false);
  out.fx = { patience: dressed.patience - plain.patience, interest: dressed.interest - plain.interest };
  out.netWorthCounts = (await import(url('/src/game/economy/progress.ts'))).netWorth(g()) > (await import(url('/src/game/economy/progress.ts'))).netWorth({ ...g(), shops: {} });
  return out;
});
console.log(JSON.stringify(r, null, 1));
check(r.cost === 35000 && r.keys.includes('jaffa'), `the Jaffa shop costs £350 and is kept under shops (${r.cost})`);
check(r.wall === 3 && r.invLeft === 0, 'three rugs left on the wall, gone from what you carry');
check(r.monday === 'Monday' && r.takings && r.takings.amount > 0, `takings arrive on a Monday (${JSON.stringify(r.takings)})`);
check(r.notice && /^Takings from Jaffa: £/.test(r.notice), `the short notice says so (${r.notice})`);
check(r.letter && /Elias Haddad/.test(r.letter) && /sold/.test(r.letter), 'his weekly letter comes by post');
check(r.wage && r.journal, 'his wage is in the ledger and the week in the journal');
check(r.empty.in === 0 && r.empty.notice === 0 && /nothing of yours/.test(r.empty.letter ?? ''), 'an empty shop sends nothing, and he says so');
check(r.skimmed > 0 && r.book.refund === Math.round(r.skimmed / 2) && r.book.after === 0 && /missing/.test(r.book.text), 'a sharp agent skims; his book shows it');
check(r.refund === 200 && /missing/.test(r.checkMsg), 'looking over the book in person gets half back');
check(r.dressCost === 900 && r.owned.includes('bench') && r.owned.includes('kilims'), 'a dressing piece costs its price');
check(r.fx.patience === 6 && r.fx.interest >= 3, `dressing helps every buyer (${JSON.stringify(r.fx)})`);
check(r.netWorthCounts, 'shops and their stock count in net worth');

// the town menu: the shop tile opens the shop
await p.keyboard.press('Escape').catch(() => {});
for (const okId of ['day-summary-ok', 'big-news-ok', 'mission-ok']) { const x = p.locator(`[data-testid=${okId}]`); if (await x.count()) await x.first().click({ timeout: 1500 }).catch(() => {}); }
await p.evaluate(async (u) => { const m = await import(u); const s = m.useGame.getState(); const st = (await import('/src/game/systems/world.ts')).settlementById('jaffa'); m.useGame.setState({ world: { ...s.world, at: 'jaffa', x: st.x, y: st.y, known: [...new Set([...s.world.known, 'jaffa'])] }, encounter: null }); }, await storeUrl());
await p.locator('[data-testid=nav-map]').click({ timeout: 3000 }).catch(() => {});
await p.waitForTimeout(800);
if (await p.locator('[data-testid=district-world]').count()) { await p.click('[data-testid=district-world]').catch(() => {}); await p.waitForTimeout(800); }
if (!(await p.locator('[data-testid=place-jaffa]').count())) console.log('on screen:', await visibleIds(p));
await tapPlace(p, 'jaffa').catch(() => {});
await p.waitForTimeout(800);
await fromTownMenu(p, 'myshop');
await p.waitForTimeout(400);
check((await p.locator('[data-testid=shop-panel]').count()) === 1, 'the town menu opens the shop');
check((await p.locator('[data-testid=shop-panel]').innerText().catch(() => '')).includes('Elias Haddad'), 'the shop panel names his agent');
await p.click('[data-testid=shop-close]').catch(() => {});

// an older save (version 23) with the Alexandria agent and the Khan shop: both become shops
const raw = await p.evaluate((k) => localStorage.getItem(k), K);
await p.evaluate(([k, raw]) => {
  const d = JSON.parse(raw); d.version = 23; d.state.version = 23;
  delete d.state.shops; delete d.state.dressing;
  d.state.missions = { ...d.state.missions, 'ms-agent': 'done' };
  d.state.upgrades = [...new Set([...(d.state.upgrades ?? []), 'mat', 'bazaar', 'khan'])];
  window.__tofEdit = true; localStorage.setItem(k, JSON.stringify(d)); window.__tofEdit = false;
  const w = Storage.prototype.setItem; Storage.prototype.setItem = function (key, v) { if (key === k && !window.__tofEdit) return; return w.call(this, key, v); }; setTimeout(() => { Storage.prototype.setItem = w; }, 4000);
}, [K, raw]);
await p.reload(); await p.waitForTimeout(1500);
if (await p.locator('[data-testid=continue]').count()) await p.click('[data-testid=continue]');
await p.waitForTimeout(1200);
const mig = await p.evaluate(async (u) => { const m = await import(u); const s = m.useGame.getState(); return { version: m.SAVE_VERSION, keys: Object.keys(s.shops ?? {}), alex: s.shops?.alexandria?.agent?.name ?? null, gift: !!s.shops?.alexandria?.gift, cairo: !!s.shops?.cairo?.khan, dressing: s.dressing, day: s.day }; }, await storeUrl());
console.log(JSON.stringify(mig));
check(mig.version === 24 && mig.alex === 'Ibrahim Nahhas' && mig.gift && mig.cairo && Array.isArray(mig.dressing), 'an old save loads with its Alexandria and Cairo shops');
for (const okId of ['day-summary-ok', 'big-news-ok', 'mission-ok']) { const x = p.locator(`[data-testid=${okId}]`); if (await x.count()) await x.first().click({ timeout: 1500 }).catch(() => {}); }
await p.locator('[data-testid=nav-map]').click({ timeout: 3000 }).catch(() => {});
await p.waitForTimeout(1000);
check((await p.locator('[data-testid=shop-mark-cairo]').count()) === 1, 'the map marks your shop in Cairo');
check(errs.length === 0, `no page errors ${JSON.stringify(errs)}`);
console.log(ok ? 'PASS' : 'FAIL');
await b.close();
process.exit(ok ? 0 : 1);
