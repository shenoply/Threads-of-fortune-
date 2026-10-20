// City sales tables with named rival merchants (src/game/systems/ranks.ts): the houses sell every day,
// you start a season at the bottom, a sale moves you up, passing a named house brings one answer only,
// the season's end gives the title to the city you led, and an older save gets the tables.
// Also the town table, the map chip and the Progress row.
//   PORT=5173 node tests/ranks.mjs
import { chromium } from 'playwright';
import { BASE, fromTownMenu } from './_env.mjs';
const K = 'threads-of-fortune-save';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
let ok = true; const check = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) ok = false; };
await p.goto(BASE);
await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'), localStorage.setItem('tof-skip-chapters', '1')));
await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]'); await p.waitForTimeout(1200);

const r = await p.evaluate(async () => {
  const url = (f) => performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes(f)) ?? f;
  const S = await import(url('/src/game/state/store.ts'));
  const R = await import(url('/src/game/systems/ranks.ts'));
  const { useGame } = S;
  const g = () => useGame.getState();
  const set = (x) => useGame.setState(x);
  const out = {};
  set({ started: true, tutorial: { done: true, step: 'done', inspected: true }, tipsSeen: [...(g().tipsSeen ?? []), 'first-hour', 'open-all'], levelUps: [], titleNews: [],
    missions: { alexandria: 'done', beasts: 'done', farid: 'done' }, day: 3, cash: 5000, reputation: 10, world: { ...g().world, at: 'giza', appraised: ['x'] } });
  // a few days: the houses sell, you have sold nothing and stand last
  g().endDay(); const d1 = JSON.parse(JSON.stringify(g().ranks.tables.cairo));
  g().endDay(); g().endDay();
  const d3 = g().ranks.tables.cairo;
  out.moved = Object.keys(d1).length >= 12 && Object.keys(d1).every((k) => d3[k] >= d1[k]) && d3['rival-boghos'] > d1['rival-boghos'];
  out.rows = R.standings(g().ranks, 'cairo').length;
  out.bottom = R.placeIn(g().ranks, 'cairo');
  out.allCities = R.standings(g().ranks, 'amman').length >= 10 && R.standings(g().ranks, 'istanbul').length >= 10;
  // a dealer sale in Cairo counts there and lifts you
  const rug = { uid: 'rk1', typeId: 'cairo-garden', condition: 'Good', restored: false, provenance: 'Likely', paid: 100, notes: [], stored: false };
  set({ inventory: [...g().inventory, rug], world: { ...g().world, at: 'cairo' } });
  const bid = g().sellLocal('rk1', 'cairo');
  out.sale = { bid, you: g().ranks.tables.cairo.you, place: R.placeIn(g().ranks, 'cairo'), seen: g().ranks.seen };
  // a town with no table of its own counts in the nearest (Giza's stall -> Cairo); one far off counts nowhere
  out.noTable = JSON.stringify(R.recordCitySale(g(), 'konya', 500)) === '{}';
  // passing Selim Haddad (aggressive): one notice, his prices cut in Cairo; passing him again: nothing more
  const t = { ...g().ranks.tables.cairo, you: 1000, 'rival-selim': 1500 };
  set({ ranks: { ...g().ranks, tables: { ...g().ranks.tables, cairo: t } }, jobNote: undefined });
  const j0 = g().journal.length;
  set(R.recordCitySale(g(), 'cairo', 1000));
  const said = g().journal.slice(j0).filter((j) => j.text.includes('Selim Haddad'));
  out.react1 = { lines: said.length, undercut: g().ranks.undercut?.cairo?.by, pending: g().ranks.pending ?? null, text: said[0]?.text };
  const bidCut = R.undercutBid(g(), 'cairo', 1000);
  set({ ranks: { ...g().ranks, tables: { ...g().ranks.tables, cairo: { ...g().ranks.tables.cairo, 'rival-selim': 5000 } } } });
  const j1 = g().journal.length;
  set(R.recordCitySale(g(), 'cairo', 4000));
  out.react2 = g().journal.slice(j1).filter((j) => j.text.includes('Selim Haddad')).length;
  out.bidCut = bidCut;
  // the season ends on day 91: you lead Cairo, so the title, and the tables start again
  const lead = Object.fromEntries(Object.keys(g().ranks.tables.cairo).map((k) => [k, 100]));
  lead.you = 9_000_000;
  set({ day: 91, ranks: { ...g().ranks, tables: { ...g().ranks.tables, cairo: lead } } });
  out.welcome = R.auctionWelcome(g(), 'cairo');
  g().endDay();
  await new Promise((res) => setTimeout(res, 50));
  out.end = { day: g().day, season: g().ranks.season, firsts: g().ranks.firsts, title: (g().titles ?? []).includes('first-cairo'), place: g().ranks.last?.places?.cairo,
    reset: !g().ranks.tables.cairo?.you, journal: g().journal.filter((j) => j.text.startsWith('The end of the spring season of 1925')).length, news: R.seasonNews(g(), g().day) };
  // new season: you are at the bottom of the table again, but keep the title and Cairo's prices
  out.newSeason = R.placeIn(g().ranks, 'cairo');
  out.firstFx = S.localOffers('cairo', g().day, [], [], 50).map((o) => o.price);
  return out;
});
console.log(JSON.stringify(r));
check(r.moved, 'rival houses sell every day');
check(r.rows >= 10 && r.rows <= 15 && r.allCities, `a city table has ten to fifteen rows (${r.rows})`);
check(r.bottom.place === r.bottom.of, `you start at the bottom (${r.bottom.place} of ${r.bottom.of})`);
check(r.sale.bid > 0 && r.sale.you === r.sale.bid && r.sale.place.place < r.bottom.of && r.sale.seen.includes('cairo'), `a dealer sale counts in Cairo and lifts you to ${r.sale.place.place}`);
check(r.noTable, 'a town without a table counts nowhere');
check(r.react1.lines === 1 && r.react1.undercut === 'rival-selim' && !r.react1.pending, `passing Selim Haddad brings one answer: ${r.react1.text}`);
check(r.bidCut === 900, 'while he cuts his prices Cairo dealers pay less');
check(r.react2 === 0, 'passing him again this season brings nothing more');
check(r.welcome, 'top ten: Cairo\'s auction houses welcome you');
check(r.end.day === 92 && r.end.season === 1 && r.end.firsts.includes('cairo') && r.end.title && r.end.place === 1 && r.end.reset && r.end.journal === 1, 'the season ends: First Merchant of Cairo, a journal line, new tables');
check(r.end.news.some((l) => /Cairo/.test(l) && /1\. you/.test(l)), `the paper prints the final table (${r.end.news[0]})`);
check(r.newSeason.place === r.newSeason.of, 'the new season starts you at the bottom again');

// the UI: town table, map chip, Progress row
await p.evaluate(async () => {
  const S = await import(performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/game/state/store.ts')));
  const g = S.useGame.getState();
  S.useGame.setState({ ranks: { ...g.ranks, tables: { ...g.ranks.tables, cairo: { you: 25000 } } }, lastSummary: undefined, jobNote: undefined, world: { ...g.world, at: 'cairo', x: 214.3, y: 413.7, hour: 8, parties: [] } });
});
for (const x of ['day-summary-ok', 'big-news-ok', 'mission-ok']) { const y = p.locator(`[data-testid=${x}]`); if (await y.count()) await y.first().click({ timeout: 1500 }).catch(() => {}); }
await p.locator('[data-testid=nav-map]').click({ timeout: 3000 }).catch(() => {});
await p.waitForTimeout(800);
if (await p.locator('[data-testid=district-world]').count()) { await p.keyboard.press('Escape'); await p.locator('[data-testid=district-world]').dispatchEvent('click'); await p.waitForTimeout(900); }
await p.screenshot({ path: '/dev/shm/tests-shots/ranks-map.png' });
const chip = p.locator('[data-testid=rank-chip-cairo]');
check((await chip.count()) === 1 && /^\d+(st|nd|rd|th)$/.test((await chip.innerText()).trim()), `the map shows your place by Cairo's name (${(await chip.count()) ? await chip.innerText() : 'none'})`);
await p.locator('[data-testid=place-cairo]').dispatchEvent('click'); await p.waitForTimeout(900);
await fromTownMenu(p, 'ranks');
const table = p.locator('[data-testid=rank-table]');
check((await table.count()) === 1 && (await p.locator('[data-testid=rank-you]').count()) === 1, 'the town menu leads to Cairo\'s table');
if (await table.count()) {
  const txt = await table.innerText();
  check(/Boghos Tavitian/.test(txt) && /Yanni Stavrou/.test(txt) && /Selim Haddad/.test(txt), 'the Cairo houses are named in it');
  const box = await table.boundingBox();
  check(box && box.width <= 412, `it fits the phone (${box?.width}px)`);
  await p.screenshot({ path: '/dev/shm/tests-shots/ranks-table.png' });
}
await p.locator('[data-testid=leave-settlement]').click({ timeout: 2000 }).catch(() => {});
await p.click('[data-testid=nav-ledger]', { timeout: 3000 }).catch(() => {});
await p.waitForTimeout(400);
await p.click('[data-testid=msub-collection]', { timeout: 3000 }).catch(() => {});
await p.waitForTimeout(400);
check((await p.locator('[data-testid=ranks-fold]').count()) === 1 && /Cairo/.test(await p.locator('[data-testid=ranks-fold]').innerText()), 'Progress has a row for the dealers\' tables');
check((await p.locator('.overlay.modal, [role=alertdialog]').count()) === 0, 'no pop-up');

// an older save (version 23) without tables gets them, starting at the bottom
const v23 = await p.evaluate((k) => localStorage.getItem(k), K);
await p.evaluate(([k, raw]) => {
  const d = JSON.parse(raw); d.version = 23; d.state.version = 23; delete d.state.ranks; d.state.day = 40;
  window.__tofEdit = true; localStorage.setItem(k, JSON.stringify(d)); window.__tofEdit = false;
  const w = Storage.prototype.setItem; const h = function (key, v) { if (key === k && !window.__tofEdit) return; return w.call(this, key, v); }; Storage.prototype.setItem = h; setTimeout(() => { Storage.prototype.setItem = w; }, 4000);
}, [K, v23]);
await p.reload(); await p.waitForTimeout(1500);
const mig = await p.evaluate(async () => { const m = await import(performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/game/state/store.ts'))); const s = m.useGame.getState(); return { ranks: s.ranks ?? null, version: m.SAVE_VERSION }; });
check(mig.version >= 24 && mig.ranks && mig.ranks.season === 0 && Object.keys(mig.ranks.tables).length === 0 && mig.ranks.seen.length === 0, `an old save gets fresh tables (${JSON.stringify(mig.ranks)})`);
check(errs.length === 0, `no page errors ${JSON.stringify(errs)}`);
console.log(ok ? 'PASS' : 'FAIL');
await b.close();
process.exit(ok ? 0 : 1);
