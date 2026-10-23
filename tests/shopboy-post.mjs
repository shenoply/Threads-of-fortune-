// The shop boy, letters and telegrams, and the market inspector.
//   1. the rules on their own (boy's sales and mischief, Cohen's letter, a visitor's letter, the
//      licence reminder, the inspector's fine and his leniency)
//   2. in the game, on a phone: hire Sami, go to Cairo for a day, come back to his sales; a letter
//      arriving; a telegram from Cairo; the licence running out and the inspector calling.
//   PORT=5173 node tests/shopboy-post.mjs
import { chromium } from '/home/claude/threads-of-fortune-/node_modules/playwright/index.mjs';
import { PORT, SHOTS as S, tapPlace, fromTownMenu } from './_env.mjs';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const has = (id) => p.locator(`[data-testid="${id}"]`).count();
let fails = 0;
const ok = (cond, label, extra = '') => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${label}${extra ? `: ${extra}` : ''}`); if (!cond) fails++; };
const store = () => p.evaluate(() => performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/game/state/store.ts')) ?? '/src/game/state/store.ts');
const run = async (fn, arg) => p.evaluate(async ([src, url, a]) => { const m = await import(url); return new Function('m', 'a', `return (async () => { ${src} })()`)(m, a); }, [fn, await store(), arg]);
const shot = (n) => p.screenshot({ path: `${S}/shopboy-${n}.png` });
const closeCards = async () => { for (let i = 0; i < 4; i++) { let hit = false; for (const id of ['day-summary-ok', 'big-news-ok', 'mission-ok', 'news-ok', 'level-ok', 'title-ok']) { if (await has(id)) { await p.click(`[data-testid=${id}]`).catch(() => {}); hit = true; await p.waitForTimeout(250); } } if (!hit) break; } };

try {
  await p.goto(`http://localhost:${PORT}/`);
  // ---------- 1. the rules ----------
  const r = await p.evaluate(async () => {
    const B = await import('/src/game/systems/shopBoy.ts');
    const P = await import('/src/game/systems/post.ts');
    const I = await import('/src/game/systems/inspector.ts');
    let seed = 7; const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const rug = (uid, typeId, extra = {}) => ({ uid, typeId, condition: 'Good', restored: false, provenance: 'Likely', paid: 100, notes: [], stored: true, ...extra });
    const out = {};
    const base = { day: 10, queue: ['samira', 'yusuf', 'cohen', 'mariam'], visitIdx: 0, arrivals: [9, 10, 11, 16], cash: 100, ledger: [], journal: [], dayStats: { sales: 0, revenue: 0, gross: 0, expenses: 0 }, totalSales: 5,
      inventory: [rug('a', 'nile-reed'), rug('b', 'village-kilim-canal'), rug('c', 'desert-star'), rug('d', 'delta-house', { stored: false }), rug('start-fh', 'fayoum-hearth', { paid: 0 })] };
    out.plain = B.plainRugs(base).map((i) => i.uid).join(',');
    out.chance = [0.7, 0.9, 1.1, 1.3].map((x) => B.takeChance(x).toFixed(2)).join(' ');
    let sold = 0, down = 0, short = 0, trials = 400;
    for (let i = 0; i < trials; i++) {
      const s = { ...base, shopBoy: { ...B.hireBoy(undefined, 1), pct: 0.8 } };
      const m = B.boyMinds(s, 24, { arrivalAt: (k) => s.arrivals[k], patience: 5, final: true, rng });
      sold += m.patch.dayStats.sales; down += m.patch.shopBoy.sales.filter((x) => x.how).length; short += m.patch.shopBoy.short;
    }
    let downT = 0;
    for (let i = 0; i < trials; i++) { const s = { ...base, shopBoy: { ...B.hireBoy(undefined, 1), pct: 0.8, trust: 90 } }; const m = B.boyMinds(s, 24, { arrivalAt: (k) => s.arrivals[k], patience: 5, final: true, rng }); downT += m.patch.shopBoy.sales.filter((x) => x.how).length; }
    out.boy = { salesPerDay: (sold / trials).toFixed(2), slipsNew: (down / trials).toFixed(2), slipsTrusted: (downT / trials).toFixed(2), shortPerDay: (short / trials).toFixed(2) };
    const one = B.boyMinds({ ...base, shopBoy: { ...B.hireBoy(undefined, 1), pct: 0.8 } }, 24, { arrivalAt: (k) => base.arrivals[k], patience: 5, final: true, rng: () => 0.2 });
    out.line = one.lines[0];
    out.waiting = B.boyMinds({ ...base, shopBoy: { ...B.hireBoy(undefined, 1), mode: 'wait' } }, 12, { arrivalAt: (k) => base.arrivals[k], patience: 5, final: false, rng })?.patch?.visitIdx ?? 0;
    const wage = B.boyNight({ shopBoy: B.hireBoy(undefined, 1), cash: 1, ledger: [], day: 3 });
    out.unpaid = wage.lines[0];
    // Cohen writes first, then calls on the day he named
    const notes = [];
    const night = { post: undefined, visits: [], cohen: undefined, queue: ['samira', 'cohen'], arrivals: [9, 10], jobsDone: [], reputation: 0, day: 9 };
    const o1 = P.postNight(night, { queue: ['samira', 'cohen'], day: 10 }, notes, 10, () => 0.1);
    out.cohenLetter = { queue: o1.queue, call: o1.post.cohenCall, arrives: o1.post.letters[0].day, body: o1.post.letters[0].body };
    const n2 = []; const o2 = P.postNight({ ...night, post: o1.post, queue: ['samira'] }, { queue: ['samira'], day: o1.post.cohenCall }, n2, o1.post.cohenCall, () => 0.1);
    out.cohenCalls = { queue: o2.queue, note: n2.join(' | ') };
    const n3 = ['A Greek hotelier is in Alexandria until 18 Mar 1925.'];
    const o3 = P.postNight({ ...night, queue: [] }, { queue: [], visits: [{ id: 'v1', who: 'A Greek hotelier', city: 'alexandria', until: 15, tier: 1, mult: 1.6, rep: 2, text: 'A Greek hotelier is refitting his rooms.' }], day: 10 }, n3, 10, () => 0.5);
    out.visit = { heard: o3.visits[0].heard, until: o3.visits[0].until, noteGone: !n3.some((x) => x.includes('is in Alexandria')) };
    out.fees = [P.telegramFee('cairo', 'giza'), P.telegramFee('cairo', 'damascus'), P.telegramFee('jerusalem', 'giza')].join(',');
    // the licence: a reminder letter a week before, lapsing, the inspector
    const lic = (day, extra = {}) => { const ns = []; const patch = { cash: 500, ledger: [], journal: [], reputation: 5, upgrades: [], ...extra.patch }; const o = I.licenceNight({ licence: undefined, post: undefined, upgrades: [], stats: {}, tutorial: { done: true }, shopBoy: undefined, ...extra.s }, patch, ns, day, 'giza', extra.rng ?? (() => 0.99), false); return { o, ns }; };
    out.remind = lic(45).o.post?.letters?.[0]?.body;
    out.lapse = lic(53, { s: { licence: { until: 52, checks: 0, lies: 0, fines: 0, short: 0 } } }).ns.join(' | ');
    const fine = lic(54, { s: { licence: { until: 52, checks: 0, lies: 0, fines: 0, short: 0 } }, rng: () => 0.01 });
    out.fine = { cash: fine.o.cash, rep: fine.o.reputation, until: fine.o.licence.until, note: fine.ns.join(' | ') };
    const liar = lic(30, { s: { licence: { until: 52, checks: 0, lies: 0, fines: 0, short: 0 }, stats: { liesOk: 4, liesCaught: 2 } }, rng: () => 0.01 });
    out.short = { cash: liar.o.cash, rep: liar.o.reputation, note: liar.ns.join(' ') };
    const kind = lic(30, { s: { licence: { until: 52, checks: 0, lies: 0, fines: 0, short: 0 }, stats: { liesOk: 4, liesCaught: 2 } }, patch: { reputation: 30 }, rng: () => 0.01 });
    out.lenient = { cash: kind.o.cash, rep: kind.o.reputation };
    out.renewEarly = I.renew({ licence: { until: 52, checks: 0, lies: 0, fines: 0, short: 0 }, day: 20, cash: 500, ledger: [], upgrades: [] }).msg;
    const rn = I.renew({ licence: { until: 52, checks: 0, lies: 0, fines: 0, short: 0 }, day: 45, cash: 500, ledger: [], upgrades: [] });
    out.renew = { until: rn.patch.licence.until, cash: rn.patch.cash };
    return out;
  });
  for (const [k, v] of Object.entries(r)) console.log('   ', k.padEnd(12), JSON.stringify(v));
  ok(r.plain === 'a,b', 'boy sells only Common rugs left at the stall, never your father\'s', r.plain);
  ok(+r.boy.salesPerDay > 1 && +r.boy.salesPerDay < 3.2, 'boy sells a rug or two on an away day at 80%', r.boy.salesPerDay);
  ok(+r.boy.slipsTrusted < +r.boy.slipsNew, 'a trusted boy is talked down less often');
  ok(r.cohenLetter.queue.length === 1 && r.cohenLetter.arrives > 10 && r.cohenLetter.call > r.cohenLetter.arrives, 'Cohen writes first, then calls', JSON.stringify(r.cohenLetter));
  ok(r.cohenCalls.queue?.includes('cohen'), 'Cohen comes on the day his letter named');
  ok(r.visit.heard > 10 && r.visit.until > 15 && r.visit.noteGone, 'a visitor is heard of by letter, a day or more later');
  ok(/runs to/.test(r.remind ?? ''), 'licence reminder by letter a week before');
  ok(r.fine.cash === 410 && r.fine.until > 52, 'lapsed licence: fine and renewal on the spot', JSON.stringify(r.fine));
  ok(r.short.cash === 470 && (r.lenient.cash ?? 500) === 500, 'short measure: a fine, a warning for a good name');

  // ---------- 2. in the game ----------
  await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
  await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
  await p.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.started === true; } catch { return false; } }, null, { timeout: 10000 }).catch(() => {});
  // the save is edited on a blank page, so the game cannot write over it before the reload
  const saved = await p.evaluate(() => localStorage.getItem('threads-of-fortune-save'));
  await p.goto('about:blank');
  await p.goto(`http://localhost:${PORT}/`);
  await p.evaluate((raw) => {
    const d = JSON.parse(raw); const s = d.state;
    s.tutorial = { done: true, step: 'done', inspected: true }; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; s.newsSeen = ['x'];
    s.sim = { illness: false, injuries: false, needs: false };
    Object.assign(s.world, { at: 'giza', hour: 8 });
    s.day = 12; s.cash = 800; s.totalSales = 5; s.reputation = 4;
    const rug = (uid, typeId) => ({ uid, typeId, condition: 'Good', restored: false, provenance: 'Likely', paid: 100, notes: [], stored: true });
    s.inventory = [...s.inventory, rug('b1', 'nile-reed'), rug('b2', 'village-kilim-canal'), rug('b3', 'delta-house'), rug('b4', 'red-medina'), rug('b5', 'tanta-courtyard')];
    s.queue = ['samira', 'yusuf', 'mariam', 'hassan']; s.arrivals = [9, 10.5, 15.5, 17.5]; s.visitIdx = 0;
    s.lastSummary = undefined;
    localStorage.setItem('threads-of-fortune-save', JSON.stringify(d)); localStorage.setItem('tof-skip-chapters', '1'); localStorage.setItem('tof-news', '1');
  }, saved);
  await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(900);
  await closeCards();
  await p.click('[data-testid=nav-stall]'); await p.waitForTimeout(1200);
  await p.evaluate(() => { if (!document.querySelector('[data-testid=idle-auctions]')) document.querySelector('[data-testid=idle-more-toggle]')?.click(); }); await p.waitForTimeout(150); await p.locator('[data-testid=boy-card]').scrollIntoViewIfNeeded();
  await shot('1-card');
  await p.click('[data-testid=boy-hire]'); await p.waitForTimeout(200);
  await p.click('[data-testid=boy-toggle]'); await p.click('[data-testid=boy-mode-sell]'); await p.click('[data-testid=boy-pct-down]');
  await p.locator('[data-testid=boy-card]').scrollIntoViewIfNeeded();
  await shot('2-orders');
  ok((await p.locator('[data-testid=boy-pct]').textContent()) === '80%', 'price set to 80%');
  // a day in Cairo: the ferry over, a night there, the ferry back in the afternoon
  const trip = await run(`
    const g = () => m.useGame.getState();
    g().ferry('cairo');
    g().worldTick((24 - g().world.hour + 13) / 24);
    const away = { day: g().day, at: g().world.at, sold: g().shopBoy.sales.length };
    g().ferry('giza');
    return { away, back: g().world.at, hour: g().world.hour, card: g().lastSummary, boy: g().shopBoy.sales, cash: g().cash };
  `);
  console.log('    trip', JSON.stringify({ away: trip.away, hour: trip.hour, sales: trip.boy.length }));
  await p.waitForTimeout(600);
  ok(!!(await has('day-summary')), 'his report is on the card when you get back');
  await shot('3-back');
  const card = await p.locator('[data-testid=day-summary]').innerText().catch(() => '');
  ok(/Sami sold the/.test(card), 'Sami sold something while you were away', card.split('\n').find((l) => /Sami/.test(l)));
  await closeCards();

  // a letter: Cohen writes before he calls
  let letter = null;
  for (let i = 0; i < 8 && !letter; i++) {
    letter = await run(`const g = () => m.useGame.getState(); if (g().world.at !== 'giza') g().ferry('giza'); m.useGame.setState({ totalSales: 6, cohen: undefined }); g().endDay(); return (g().post?.letters ?? []).find((l) => l.from.startsWith('Cohen') && l.day <= g().day) ?? null;`);
  }
  ok(!!letter, 'Cohen\'s letter arrived', letter?.body);
  await p.waitForTimeout(500);
  await shot('4-letter-morning');
  await closeCards();
  // the post list, under Progress
  await p.click('[data-testid=nav-ledger]'); await p.waitForTimeout(500);
  await p.click('[data-testid=msub-post]'); await p.waitForTimeout(400);
  await shot('5-post');
  ok(await has('post-letter') > 0, 'the Post list under Progress shows the letter');

  // a telegram from Cairo
  await run(`const g = () => m.useGame.getState(); g().ferry('cairo'); m.useGame.setState({ cash: 900 });`);
  await p.waitForTimeout(500);
  await p.click('[data-testid=nav-map]').catch(() => {}); await p.waitForTimeout(800);
  if (!(await has('settlement'))) { await tapPlace(p, 'cairo'); await p.waitForTimeout(800); }
  await fromTownMenu(p, 'telegraph');
  await p.waitForSelector('[data-testid=telegraph]', { timeout: 4000 }).catch(() => {});
  ok(await has('telegraph') > 0, 'telegraph office in Cairo');
  await p.click('[data-testid=wire-ask-alexandria]'); await p.waitForTimeout(300);
  const reply = await p.locator('[data-testid=wire-reply]').textContent().catch(() => '');
  ok(/as of/.test(reply), 'price telegram is dated', reply);
  const before = await run(`return m.useGame.getState().inventory.length`);
  const wireBtn = p.locator('[data-testid^=wire-rashid-]').first();
  if (await wireBtn.count()) { await wireBtn.click(); await p.waitForTimeout(300); }
  const after = await run(`const g = m.useGame.getState(); return { n: g.inventory.length, stored: g.inventory[g.inventory.length - 1].stored }`);
  ok(after.n === before + 1 && after.stored, 'wired Rashid: the rug is in stock at the stall');
  await shot('6-telegraph');
  await p.click('[data-testid=telegraph-close]');
  await p.click('[data-testid=leave-settlement]').catch(() => {});

  // the licence: a reminder, running out, the inspector
  const lic = await run(`
    const g = () => m.useGame.getState();
    g().ferry('giza');
    m.useGame.setState({ day: 44, licence: undefined, cash: 900, reputation: 4 });
    g().endDay();
    return { day: g().day, letter: (g().post?.letters ?? []).find((l) => l.title === 'Your trading licence') };
  `);
  ok(!!lic.letter, 'licence reminder letter', lic.letter?.body);
  await p.waitForTimeout(400); await shot('7-licence-letter'); await closeCards();
  let insp = null;
  await run(`m.useGame.setState({ day: 52 }); m.useGame.getState().endDay();`);
  await p.waitForTimeout(400); await shot('8-lapsed'); await closeCards();
  for (let i = 0; i < 16 && !insp; i++) {
    insp = await run(`const g = () => m.useGame.getState(); if (g().world.at !== 'giza') g().ferry('giza'); g().endDay(); const j = g().journal.filter((x) => x.text.includes('market inspector')); return j.length ? { text: j[j.length - 1].text, licence: g().licence } : null;`);
  }
  ok(!!insp && /fine/.test(insp.text), 'the inspector called and fined the lapsed licence', insp?.text);
  await p.waitForTimeout(400); await shot('9-inspector'); await closeCards();
  // the licence in the ledger
  await p.click('[data-testid=nav-ledger]').catch(() => {}); await p.waitForTimeout(500);
  await p.click('[data-testid=msub-book]').catch(() => {});
  await p.waitForTimeout(500);
  if (await has('licence-card')) { await p.locator('[data-testid=licence-card]').scrollIntoViewIfNeeded(); await shot('10-ledger'); ok(true, 'licence shown in the Ledger', await p.locator('[data-testid=licence-card]').innerText()); }
  else ok(false, 'licence shown in the Ledger');
} catch (e) { console.log('ERROR', e.message); fails++; await shot('error'); }
ok(errs.length === 0, 'no page errors', errs.join(' | '));
console.log(fails ? `${fails} failed` : 'all passed', `· shots in ${S}/shopboy-*.png`);
await b.close();
process.exit(fails ? 1 : 0);
