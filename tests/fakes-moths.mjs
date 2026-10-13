// Aniline dyes, faked age and summer moth (systems/fakes.ts, systems/moths.ts).
// A Cairo dealer's "late 19th c." Golden Palm that is new work aged by hand: a trained eye's hint on the
// market row and in the inspector; Arran's rub proves it; sold at the stall without a word, the buyer
// finds out and comes back for his money; the returned rug offers "Tell them it is new". Then June:
// the moth warning, the Stock panel, airing, one step of damage at most once a month.
//   PORT=5173 node tests/fakes-moths.mjs
import { chromium } from 'playwright';
import { PORT as __PORT, SHOTS as __SHOTS, fromTownMenu } from './_env.mjs';
const PORT = __PORT, S = __SHOTS;
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const has = (id) => p.locator(`[data-testid="${id}"]`).count();
const fails = [];
const check = (ok, what) => { console.log(ok ? 'ok  ' : 'FAIL', what); if (!ok) fails.push(what); };
const KEY = 'threads-of-fortune-save';
const st = async () => JSON.parse(await p.evaluate((k) => localStorage.getItem(k), KEY)).state;
const store = (fn, arg) => p.evaluate(async ([src, a]) => {
  const m = await import(performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/game/state/store.ts')) ?? '/src/game/state/store.ts');
  return new Function('useGame', 'a', `return (async () => { ${src} })()`)(m.useGame, a);
}, [fn, arg]);
// edit the save on about:blank (the game is not running, so nothing writes over it), then reload and Continue
const edit = async (src) => {
  const d = await p.evaluate((k) => localStorage.getItem(k), KEY);
  await p.goto('about:blank');
  await p.goto(`http://localhost:${PORT}/manifest.webmanifest`); // same origin, no game running
  await p.evaluate(([k, raw, code]) => { const d = JSON.parse(raw); new Function('s', 'd', code)(d.state, d); localStorage.setItem(k, JSON.stringify(d)); }, [KEY, d, src]);
  await p.goto(`http://localhost:${PORT}/`);
  await p.waitForSelector('[data-testid=continue]', { timeout: 15000 }); await p.click('[data-testid=continue]'); await p.waitForTimeout(1200);
};
const closeCards = async () => { for (const id of ['day-summary-ok', 'mission-ok', 'big-news-ok', 'level-ok', 'big-news-ok']) if (await has(id)) await p.click(`[data-testid=${id}]`).catch(() => {}); };

try {
  await p.goto(`http://localhost:${PORT}/`);
  await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'), localStorage.setItem('tof-skip-chapters', '1'), localStorage.setItem('tof-news', '1')));
  await p.reload();
  await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
  await p.waitForFunction((k) => { try { return JSON.parse(localStorage.getItem(k)).state.started === true; } catch { return false; } }, KEY, { timeout: 10000 });
  await p.waitForTimeout(800);

  // ---- 1. a Cairo dealer offers a faked Golden Palm (day 6, reputation 25: his back-room piece) ----
  await edit(`s.tutorial = { done: true, step: 'done', inspected: true }; s.missionNews = undefined; s.levelUps = []; s.titleNews = [];
    s.day = 6; s.reputation = 25; s.cash = 6000; s.world.at = 'cairo'; s.world.hour = 9; s.world.x = 214.3; s.world.y = 413.7;
    s.labUnlocked = ['fibre', 'dye']; s.arranTools = ['loupe']; s.inventory = s.inventory.slice(0, 2); s.queue = []; s.visitIdx = 0;
    s.lastSummary = undefined; s.journey = undefined;`);
  await closeCards();
  if (!(await has('town-menu')) && (await has('enter'))) await p.click('[data-testid=enter]');
  if (!(await has('town-menu')) && (await has('town-menu-open'))) await p.click('[data-testid=town-menu-open]');
  await fromTownMenu(p, 'market');
  await p.waitForSelector('[data-testid=buy-golden-palm]', { timeout: 8000 });
  await p.locator('[data-testid=buy-golden-palm]').evaluate((e) => e.scrollIntoView({ block: 'center' }));
  check(await has('offer-flaw-age') > 0, 'Cairo market row: a trained eye sees "Sold as old: is it?"');
  await p.screenshot({ path: `${S}/fakes-1-cairo-market.png` });
  await p.locator('[data-testid=buy-golden-palm] img').click();
  await p.waitForSelector('[data-testid=inspector]'); await p.click('[data-testid=tab-condition]'); await p.waitForTimeout(300);
  check(await has('clue-age') > 0, 'inspector Condition tab gives the clue');
  await p.screenshot({ path: `${S}/fakes-2-inspector-clue.png` });
  await p.click('[data-testid=inspector-close]');
  await p.locator('[data-testid=buy-golden-palm] button').click(); await p.waitForTimeout(400);
  let s = await st();
  const fake = s.inventory.find((i) => i.typeId === 'golden-palm');
  check(!!fake?.fakeAge, `bought rug carries the hidden fakeAge (${JSON.stringify({ fakeAge: fake?.fakeAge, dye: fake?.dye })})`);

  // ---- 2. Arran's colour rub proves it ----
  await edit(`s.world.at = 'giza'; s.world.hour = 9; s.inventory.forEach((i) => { i.stored = true; });`);
  await closeCards();
  await p.click('[data-testid=nav-stall]'); await p.waitForSelector('[data-testid=district]'); await p.waitForTimeout(400);
  if (await has('stall-sheet-close')) await p.click('[data-testid=stall-sheet-close]');
  await p.locator('[data-testid=poi-lab]').scrollIntoViewIfNeeded(); await p.click('[data-testid=poi-lab]');
  await p.waitForSelector('[data-testid=arran-door]', { timeout: 20000 }); await p.click('[data-testid=arran-enter]'); await p.waitForTimeout(700);
  await p.click(`[data-testid=arran-rug-${fake.uid}]`); await p.click(`[data-testid=arran-test-fastness-${fake.uid}]`);
  await p.waitForSelector('[data-testid=arran-confirm]'); await p.click('[data-testid=arran-confirm-pay]'); await p.waitForSelector('[data-testid=arran-finding]');
  const finding = await p.locator('[data-testid=arran-finding]').innerText();
  check(/stained to look old/i.test(finding), 'Arran: "stained to look old" on the rub');
  await p.screenshot({ path: `${S}/fakes-3-arran-rub.png` });
  s = await st();
  check(s.arranFindings.some((f) => f.subjectId === fake.uid && f.verdict === 'inconsistent'), 'finding is Inconsistent');

  // ---- 3. sold at the stall without a word; the buyer comes back ----
  await edit(`s.world.at = 'giza'; s.world.hour = 9; s.queue = ['samira', 'yusuf', 'samira']; s.visitIdx = 0; s.arrivals = [9, 9.5, 10]; s.stallShut = false;`);
  await closeCards();
  const sold = await store(`
    const g = () => useGame.getState();
    g().nextVisit();
    const enc0 = g().encounter; if (!enc0) return { err: 'no encounter' };
    g().present(a);
    if (g().encounter.prompt?.kind === 'saffron') g().act('saffron_stay');
    const acts = (await import('/src/game/systems/negotiation.ts')).getActions(g().encounter, { inventory: g().inventory, upgrades: g().upgrades, reputation: g().reputation, rel: { visits: 0, purchases: 0, spent: 0, affinity: 0, bad: 0, lastLines: [] }, rng: Math.random, skills: g().skills, findings: g().arranFindings, labUnlocked: g().labUnlocked, tools: g().arranTools }).map((x) => x.id);
    const r = Math.random; Math.random = () => 0.01;
    for (let i = 0; i < 6 && !g().encounter.outcome; i++) g().act(g().encounter.buyerOffer ? 'accept_offer' : 'name_price', 300);
    Math.random = r;
    return { buyer: enc0.buyerId, acts, outcome: g().encounter.outcome, price: g().encounter.salePrice, pending: g().fakeSales };`, fake.uid);
  console.log('stall sale:', JSON.stringify({ ...sold, pending: sold.pending?.map((f) => ({ due: f.due, kinds: f.kinds, knew: f.knew })) }));
  check(sold.acts?.includes('disclose'), 'stall offers "Tell them it is new" for a proven fake');
  check(sold.outcome === 'sold' && sold.pending?.length === 1 && sold.pending[0].knew, 'sold without telling: the buyer will find out (and you knew)');
  const before = await st();
  await store(`useGame.setState({ fakeSales: useGame.getState().fakeSales.map((f) => ({ ...f, due: useGame.getState().day + 1 })), encounter: null }); useGame.getState().endDay();`);
  await p.waitForSelector('[data-testid=day-summary]', { timeout: 8000 });
  const summary = await p.locator('[data-testid=day-summary]').innerText();
  check(/came back angry/.test(summary), 'morning card: the buyer came back angry');
  await p.screenshot({ path: `${S}/fakes-4-angry-return.png` });
  await p.click('[data-testid=day-summary-ok]');
  s = await st();
  const back = s.inventory.find((i) => i.uid === fake.uid);
  check(!!back?.flawKnown && s.cash < before.cash && s.reputation < before.reputation, `refund ${before.cash - s.cash}, reputation ${before.reputation} to ${s.reputation}, rug back with flawKnown`);
  check(s.journal.some((j) => /brought back the Golden Palm/.test(j.text)), 'journal tells the story');

  // the returned rug, shown to the next buyer: tell them the truth
  await store(`useGame.setState({ world: { ...useGame.getState().world, hour: 9 }, queue: ['yusuf', 'samira'], visitIdx: 0, arrivals: [9, 10] }); useGame.getState().nextVisit(); useGame.getState().present(a); if (useGame.getState().encounter.prompt?.kind === 'saffron') useGame.getState().act('saffron_stay');
    if (useGame.getState().encounter.stage !== 'presentation') useGame.setState({ encounter: { ...useGame.getState().encounter, stage: 'presentation' } });`, fake.uid);
  await p.click('[data-testid=nav-stall]').catch(() => {}); await p.waitForTimeout(800);
  check(await has('act-disclose') > 0, 'the disclosure button is on the stall');
  await p.screenshot({ path: `${S}/fakes-5-disclose-button.png` });
  if (await has('act-disclose')) { await p.click('[data-testid=act-disclose]'); await p.waitForTimeout(6000); }
  const dis = await store(`return { disclosed: useGame.getState().encounter?.disclosed, log: useGame.getState().encounter?.log.slice(-2).map((l) => l.text) };`);
  check((dis.disclosed ?? []).includes(`${fake.uid}:age`), `disclosed: ${JSON.stringify(dis.log)}`);
  await p.screenshot({ path: `${S}/fakes-6-disclosed.png` });

  // ---- 4. June: moths ----
  await edit(`s.encounter = null; s.day = 92; s.world.at = 'giza'; s.world.hour = 20; s.moths = undefined; s.upgrades = s.upgrades.filter((u) => u !== 'camphor');
    s.inventory = [
      { uid: 'm1', typeId: 'red-medina', condition: 'Good', restored: false, provenance: 'Likely', paid: 200, notes: [], stored: true },
      { uid: 'm2', typeId: 'anatolian-hearth', condition: 'Excellent', restored: false, provenance: 'Likely', paid: 700, notes: [], stored: false },
      { uid: 'm3', typeId: 'damascus-rose', condition: 'Good', restored: false, provenance: 'Likely', paid: 9000, notes: [], stored: true },
      { uid: 'm4', typeId: 'delta-house', condition: 'Good', restored: false, provenance: 'Likely', paid: 100, notes: [], stored: true },
      { uid: 'm5', typeId: 'cedar-caravan', condition: 'Good', restored: false, provenance: 'Likely', paid: 600, notes: [], stored: true },
    ]; s.lastSummary = undefined; s.fakeSales = [];`);
  await closeCards();
  await store(`useGame.setState({ stallShut: true }); useGame.getState().endDay();`);
  await p.waitForSelector('[data-testid=day-summary]', { timeout: 8000 });
  const warn = await p.locator('[data-testid=day-summary]').innerText();
  check(/Moths in the bales: air your stock/.test(warn), 'morning warning: "Moths in the bales: air your stock"');
  await p.screenshot({ path: `${S}/moths-1-warning.png` });
  await p.click('[data-testid=day-summary-ok]');
  await closeCards();
  await p.click('[data-testid=nav-inventory]'); await p.waitForSelector('[data-testid=moth-panel]', { timeout: 8000 });
  check(await has('moth-open') >= 3, 'Stock: rugs marked "Open to moth"');
  await p.screenshot({ path: `${S}/moths-2-stock.png` });
  await p.click('[data-testid=air-rugs]'); await p.waitForSelector('[data-testid=air-note]');
  console.log('  airing:', await p.locator('[data-testid=air-note]').innerText());
  check(await has('moth-aired') >= 5 && (await has('moth-open')) === 0, 'after airing every rug shows "Aired until"');
  await p.locator('[data-testid=moth-panel]').scrollIntoViewIfNeeded();
  await p.screenshot({ path: `${S}/moths-3-aired.png` });
  // airing protects: three nights with certain moth do nothing
  const aired = await store(`const r = Math.random; Math.random = () => 0.0001; for (let i = 0; i < 3; i++) useGame.getState().endDay(); Math.random = r;
    return useGame.getState().inventory.map((i) => i.condition);`);
  check(aired.join() === 'Good,Excellent,Good,Good,Good', `aired rugs untouched (${aired})`);
  // unprotected and past the warning: one step, once a month
  const hit = await store(`const g = () => useGame.getState(); useGame.setState({ inventory: g().inventory.map((i) => ({ ...i, airedUntil: undefined })), moths: { warned: g().day - 5 } });
    const r = Math.random; Math.random = () => 0.0001; g().endDay(); const one = g().inventory.map((i) => i.condition); const note = g().lastSummary.notes.find((n) => /Moths got into/.test(n));
    g().endDay(); g().endDay(); const three = g().inventory.map((i) => i.condition); Math.random = r;
    return { one, three, note };`);
  console.log('  moth:', JSON.stringify(hit));
  check(hit.one.join() !== aired.join() && hit.one.join() === hit.three.join(), 'moth takes one step, and not again the same month');
  await p.waitForTimeout(500);
  if (await has('day-summary')) await p.screenshot({ path: `${S}/moths-4-damage.png` });
  // camphor chest: rugs left at the stall are safe
  const chest = await store(`const g = () => useGame.getState(); useGame.setState({ upgrades: [...g().upgrades, 'camphor'], day: g().day + 31 });
    const m = await import('/src/game/systems/moths.ts'); return g().inventory.map((i) => m.mothGuard(i, g()));`);
  check(chest[0] === 'chest' && chest[1] === null, `camphor chest guards stored rugs only (${chest})`);
} catch (e) {
  console.log('ERROR', e.message);
  fails.push(e.message);
  await p.screenshot({ path: `${S}/fakes-error.png` }).catch(() => {});
}
console.log(fails.length ? `FAIL ${fails.length}` : 'PASS', 'page errors', JSON.stringify(errs));
await b.close();
process.exit(fails.length ? 1 : 0);
