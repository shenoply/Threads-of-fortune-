// The household (src/game/systems/household.ts):
//   1. the rules on their own: what a call on a family is worth, the first child 300-400 days after
//      the wedding, children growing, the heir, the wife minding the stall
//   2. in the game, on a phone: families approached once the name allows, courtship to the contract
//      and the feast, contentment falling while away and rising at home, a letter, a birth, a child
//      named and grown, the Household fold on the Me tab, the heir taking over after a death
//   3. an old save (version 23) loads with an empty household
//   PORT=5205 node --import ./tests/_nohmr.mjs tests/family.mjs
import { chromium } from '/home/claude/threads-of-fortune-/node_modules/playwright/index.mjs';
import { PORT, SHOTS } from './_env.mjs';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
let fails = 0;
const ok = (cond, label, extra = '') => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${label}${extra ? `: ${extra}` : ''}`); if (!cond) fails++; };
const G = (fn, arg) => p.evaluate(async ([f, a]) => { const { useGame } = await import(performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/game/state/store.ts')) ?? '/src/game/state/store.ts'); const g = new Proxy({}, { get: (_, k) => useGame.getState()[k] }); return new Function('g', 'set', 'a', f)(g, useGame.setState, a); }, [fn, arg]);
const clearCards = async () => { for (const id of ['day-summary-ok', 'mission-ok', 'big-news-ok', 'news-ok']) { const x = p.locator(`[data-testid=${id}]`); if (await x.count()) await x.first().click({ timeout: 1500 }).catch(() => {}); } };

try {
  await p.goto(`http://localhost:${PORT}/`);
  // ---------- 1. the rules ----------
  const r = await p.evaluate(async () => {
    const H = await import('/src/game/systems/household.ts');
    const B = await import('/src/game/systems/shopBoy.ts');
    let seed = 11; const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const out = {};
    const who = { reputation: 30, wardrobe: undefined, attire: { owned: [], worn: 'galabiya', clean: 100 }, skills: {}, stats: {} };
    out.honest = H.visitGain({ ...who, manner: { honesty: 40, firmness: 0, kindness: 0, charm: 0 } }, 'nadia').gain;
    out.fox = H.visitGain({ ...who, manner: { honesty: -40, firmness: 0, kindness: 0, charm: 0 } }, 'nadia').gain;
    out.dusty = H.visitGain({ ...who, attire: { ...who.attire, clean: 20 }, manner: { honesty: 0, firmness: 0, kindness: 0, charm: 0 } }, 'layla').gain;
    out.clean = H.visitGain({ ...who, manner: { honesty: 0, firmness: 0, kindness: 0, charm: 0 } }, 'layla').gain;
    // a married household, night after night at home: when does the first child come?
    const firsts = [];
    for (let t = 0; t < 30; t++) {
      let s = { started: true, tutorial: { done: true }, reputation: 30, upgrades: ['bazaar'], cash: 0, ledger: [], inventory: [], post: undefined, world: { at: 'giza' }, day: 100,
        household: { stage: 'married', suitors: {}, children: [], pace: 1, spouse: { id: 'amira', married: 100, content: 70, role: 'home', lastHome: 100 }, birthIn: 300 + Math.floor(rng() * 100) } };
      for (let d = 101; d < 600; d++) {
        const notes = []; const o = H.householdNight(s, { day: d }, notes, d, rng);
        s = { ...s, ...o, day: d };
        if (s.household.children.length) { firsts.push(d - 100); break; }
      }
    }
    out.first = [Math.min(...firsts), Math.max(...firsts)];
    // children grow: a son at 5 years 364 days, then a year at twelve times the pace
    let s = { started: true, tutorial: { done: true }, reputation: 30, upgrades: ['bazaar'], cash: 0, ledger: [], inventory: [], world: { at: 'giza' }, day: 3000,
      household: { stage: 'married', suitors: {}, pace: 12, spouse: { id: 'nadia', married: 1, content: 70, role: 'home', lastHome: 3000 },
        children: [{ id: 'c1', sex: 'son', name: 'Ahmad', born: 1, ageDays: 6 * 365 - 5, traits: { learning: 5, trade: 5, craft: 5 }, path: undefined }] } };
    const n1 = []; s = { ...s, ...H.householdNight(s, { day: 3001 }, n1, 3001, rng) };
    out.six = { age: H.ageOf(s.household.children[0]), note: n1.find((n) => /six/.test(n)) };
    s.household.children[0].path = 'shop';
    for (let d = 3002; d < 3002 + 365; d++) s = { ...s, ...H.householdNight(s, { day: d }, [], d, rng) };
    out.grownBy = { age: H.ageOf(s.household.children[0]), trade: s.household.children[0].traits.trade };
    // the heir: the eldest grown child
    const hh = { stage: 'married', suitors: {}, pace: 1, children: [
      { id: 'a', sex: 'daughter', name: 'Fatma', born: 10, ageDays: 19 * 365, traits: {} },
      { id: 'b', sex: 'son', name: 'Ahmad', born: 400, ageDays: 18 * 365, traits: {} },
      { id: 'c', sex: 'son', name: 'Taha', born: 900, ageDays: 16 * 365, traits: {} }] };
    out.heir = H.heirOf(hh)?.name;
    out.noHeir = H.heirOf({ ...hh, children: [hh.children[2]] })?.name ?? null;
    // your wife at the stall: she sells at the full worth, nothing goes short
    const rug = (uid, typeId) => ({ uid, typeId, condition: 'Good', restored: false, provenance: 'Likely', paid: 100, notes: [], stored: true });
    const base = { day: 10, queue: ['samira', 'yusuf', 'mariam', 'samira'], visitIdx: 0, arrivals: [9, 10, 11, 12], cash: 100, ledger: [], journal: [], dayStats: { sales: 0, revenue: 0, gross: 0, expenses: 0 }, totalSales: 0,
      inventory: [rug('a', 'nile-reed'), rug('b', 'village-kilim-canal')], shopBoy: { hired: true, since: 0, trust: 100, mode: 'sell', pct: 1, owed: 0, report: [], sales: [], short: 0, days: 0 } };
    const m = B.boyMinds(base, 24, { arrivalAt: (k) => base.arrivals[k], patience: 3, final: true, rng: () => 0.1, name: 'Nadia' });
    out.wife = m?.lines?.[0] ?? '';
    out.minds = H.spouseMinds({ household: { ...H.HOUSEHOLD_START, spouse: { id: 'nadia', married: 1, content: 70, role: 'stall', lastHome: 1 } }, shopBoy: undefined });
    out.mindsUnhappy = H.spouseMinds({ household: { ...H.HOUSEHOLD_START, spouse: { id: 'nadia', married: 1, content: 10, role: 'stall', lastHome: 1 } }, shopBoy: undefined });
    return out;
  });
  console.log('   ', JSON.stringify(r));
  ok(r.honest > r.fox, 'the schoolteacher thinks more of an honest merchant than a fox', `${r.honest} vs ${r.fox}`);
  ok(r.clean > r.dusty, 'the silk merchant notices road dust', `${r.clean} vs ${r.dusty}`);
  ok(r.first[0] >= 300 && r.first[1] <= 400, 'the first child comes 300 to 400 days after the wedding', r.first.join('-'));
  ok(r.six.age === 6 && !!r.six.note, 'a child of six: a note to choose school, the stall or the loom', r.six.note);
  ok(r.grownBy.age >= 17 && r.grownBy.trade > 30, 'a year at twelve times the pace: twelve years older, the trade learned at the stall', JSON.stringify(r.grownBy));
  ok(r.heir === 'Fatma' && r.noHeir === null, 'the heir is the eldest grown child; none while all are young', `${r.heir} / ${r.noHeir}`);
  ok(/^Nadia sold/.test(r.wife) && r.minds === 'Nadia' && r.mindsUnhappy === null, 'your wife minds the stall in her own name, unless she is unhappy', r.wife);

  // ---------- 2. in the game ----------
  await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'), localStorage.setItem('tof-fullscreen', 'off'))); await p.reload();
  await p.click('[data-testid=skip-to-day]');
  await p.click('[data-testid=begin-day-one]');
  await p.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.started === true; } catch { return false; } }, null, { timeout: 10000 }).catch(() => {});
  await p.waitForTimeout(1000);
  await G(`set({ tutorial: { done: true, step: 'done', inspected: true }, levelUps: [], titleNews: [], missionNews: undefined, introSeen: ['malek','arran','abuhamid','bilgin-chess','rashid','nabil','cohen'] });`);
  const early = await G(`g.endDay(); return g.household.stage;`);
  ok(early === 'none', 'no match proposed to a new stallholder', early);
  const offered = await G(`set({ reputation: 30, upgrades: ['mat', 'bazaar'], cash: 30000, manner: { ...g.manner, honesty: 30 } }); g.endDay(); return { stage: g.household.stage, note: g.lastSummary.notes.find((n) => /Uncle Rashid takes you aside/.test(n)) };`);
  ok(offered.stage === 'offered' && !!offered.note, 'with a canopy and a name, Rashid says the families would listen (morning card)', offered.stage);
  await clearCards();
  const court = await G(`
    const out = [];
    out.push(g.householdAct({ kind: 'visit', bride: 'nadia' }));
    set({ world: { ...g.world, at: 'cairo', hour: 9 } });
    out.push(g.householdAct({ kind: 'ask', bride: 'nadia' }));
    for (let i = 0; i < 6 && (g.household.suitors.nadia?.favour ?? 0) < 50; i++) { out.push(g.householdAct({ kind: 'visit', bride: 'nadia' })); out.push(g.householdAct({ kind: 'visit', bride: 'nadia' })); set({ day: g.day + 1, world: { ...g.world, hour: 9 } }); }
    out.push(g.householdAct({ kind: 'gift', bride: 'nadia' }));
    const cash0 = g.cash;
    out.push(g.householdAct({ kind: 'ask', bride: 'nadia' }));
    const mahr = cash0 - g.cash;
    out.push(g.householdAct({ kind: 'feast' }));
    const st1 = g.household.stage;
    set({ day: g.day + 7, world: { ...g.world, hour: 9 } });
    const rep0 = g.reputation;
    out.push(g.householdAct({ kind: 'feast' }));
    return { out, mahr, st1, stage: g.household.stage, spouse: g.household.spouse, rep: g.reputation - rep0, friends: g.world.friends, birthIn: g.household.birthIn };
  `);
  console.log('   ', court.out.join('\n     '));
  ok(/lives in Cairo/.test(court.out[0]), 'a family is called on in its own town');
  ok(/too soon/.test(court.out[1]), 'asking at once: too soon');
  ok(court.out.some((x) => /twice in a day/.test(x)), 'one call a day');
  ok(court.mahr === 3500 && court.st1 === 'betrothed', 'the contract and the mahr (£35); the feast waits a week', `${court.mahr} ${court.st1}`);
  ok(court.stage === 'married' && court.spouse?.id === 'nadia' && court.rep === 5 && court.friends.includes('cairo'), 'the feast in Cairo: married, reputation +5, Cairo dealers count you a friend', JSON.stringify({ rep: court.rep, friends: court.friends }));
  ok(court.birthIn >= 300 && court.birthIn < 400, 'the first child is due in 300 to 400 days', court.birthIn);

  // contentment: away in Damascus for three weeks, then home
  const away = await G(`
    set({ world: { ...g.world, at: 'damascus' } });
    const c0 = g.household.spouse.content;
    for (let i = 0; i < 21; i++) g.endDay();
    const c1 = g.household.spouse.content;
    const letters = (g.post?.letters ?? []).filter((l) => /Giza/.test(l.from));
    set({ world: { ...g.world, at: 'giza' } });
    for (let i = 0; i < 3; i++) g.endDay();
    const c2 = g.household.spouse.content;
    const msg = g.householdAct({ kind: 'present' });
    const c3 = g.household.spouse.content;
    const ev = g.householdAct({ kind: 'evening' });
    return { c0, c1, c2, c3, c4: g.household.spouse.content, letters: letters.map((l) => l.title + ': ' + l.body), msg, ev };
  `);
  console.log('   ', JSON.stringify(away));
  ok(away.c1 < away.c0 - 5, 'three weeks away: she is less content', `${away.c0} -> ${away.c1}`);
  ok(away.letters.length >= 1, 'she writes while you are away', away.letters[0]);
  ok(away.c2 > away.c1 && away.c3 > away.c2 && away.c4 > away.c3, 'home again, a present and an evening at home: content rises', `${away.c1} -> ${away.c2} -> ${away.c3} -> ${away.c4}`);

  // a birth, a name, a child growing up
  const kid = await G(`
    set({ household: { ...g.household, birthIn: 1 } });
    g.endDay();
    const c = g.household.children[0];
    const note = g.lastSummary.notes.find((n) => /has had a/.test(n));
    const named = g.householdAct({ kind: 'name', child: c.id, name: c.sex === 'son' ? 'Ahmad' : 'Fatma' });
    set({ household: { ...g.household, children: g.household.children.map((x) => ({ ...x, ageDays: 6 * 365 - 1 })) } });
    g.endDay();
    const six = g.lastSummary.notes.find((n) => /is six/.test(n));
    const path = g.householdAct({ kind: 'path', child: c.id, path: 'shop' });
    set({ household: { ...g.household, children: g.household.children.map((x) => ({ ...x, ageDays: 18 * 365 - 1 })) } });
    g.endDay();
    const k = g.household.children[0];
    return { born: !!c, sex: c.sex, note, named, six, path, age: Math.floor(k.ageDays / 365), name: k.name, trade: k.traits.trade, grown: g.lastSummary.notes.find((n) => /is grown/.test(n)) };
  `);
  console.log('   ', JSON.stringify(kid));
  ok(kid.born && !!kid.note, 'a child is born, and the morning card says so', kid.note);
  ok(kid.name && kid.six && kid.age === 18 && kid.grown, 'named, six (school, stall or loom), and grown at eighteen', `${kid.name} ${kid.age}`);

  // the Household fold on the Me tab
  await clearCards();
  await G(`set({ household: { ...g.household, children: [...g.household.children, { id: 'cx', sex: 'daughter', born: g.day, ageDays: 0, traits: { learning: 5, trade: 5, craft: 5 } }] } });`);
  await p.locator('[data-testid=nav-hero]').first().click({ timeout: 4000 }).catch(() => {});
  await p.waitForTimeout(700);
  const row = p.locator('[data-testid=fold-row-me-household]');
  ok((await row.count()) > 0, 'the Household fold is on the Me tab');
  const isOpen = await p.locator('[data-testid=fold-me-household]').evaluate((e) => e.open).catch(() => false);
  if (!isOpen) await row.click();
  await p.waitForTimeout(400);
  await p.locator('[data-testid=household]').scrollIntoViewIfNeeded().catch(() => {});
  const ui = await p.evaluate(() => ({
    spouse: !!document.querySelector('[data-testid=hh-spouse]'), initial: document.querySelector('[data-testid=hh-spouse] .hh-pt b')?.textContent,
    kids: document.querySelectorAll('[data-testid^=child-]').length, nameBtns: document.querySelectorAll('[data-testid^=name-cx-]').length,
    w: document.documentElement.scrollWidth,
  }));
  ok(ui.spouse && ui.initial === 'N' && ui.kids === 2 && ui.nameBtns === 4, 'the fold shows her framed initial, both children, and names to choose for the baby', JSON.stringify(ui));
  ok(ui.w <= 412, 'no sideways scroll on the phone', ui.w);
  await p.locator('[data-testid=name-cx-Zeinab]').click();
  await p.waitForTimeout(300);
  ok((await G(`return g.household.children.find((c) => c.id === 'cx').name;`)) === 'Zeinab', 'a name chosen from the list');
  await p.screenshot({ path: `${SHOTS}/family-household.png` });

  // the heir: Hassan dies, the eldest grown child carries on
  const rep0 = await G(`return g.reputation;`);
  await G(`g.dieNow('Hassan died of a fever in Damascus.');`);
  await p.waitForTimeout(500);
  ok((await p.locator('[data-testid=ending-heir]').count()) > 0, 'the end card offers to carry on as the heir');
  await p.screenshot({ path: `${SHOTS}/family-heir.png` });
  await p.locator('[data-testid=ending-heir]').click();
  await p.waitForTimeout(400);
  const heir = await G(`return { ended: g.ended, merchant: g.household.merchant, rep: g.reputation, kids: g.household.children.length, mother: g.household.mother, stage: g.household.stage };`);
  ok(!heir.ended && heir.merchant?.name === kid.name && heir.merchant.gen === 2 && heir.rep === Math.round(rep0 * 0.6) && heir.mother === 'nadia', 'the heir takes the house on with part of the name', JSON.stringify(heir));

  // ---------- 3. an old save ----------
  await p.evaluate(() => { const raw = JSON.parse(localStorage.getItem('threads-of-fortune-save')); delete raw.state.household; raw.version = 23; raw.state.version = 23; localStorage.setItem('threads-of-fortune-save', JSON.stringify(raw)); });
  await p.reload(); await p.waitForTimeout(1500);
  const mig = await p.evaluate(() => { const raw = JSON.parse(localStorage.getItem('threads-of-fortune-save')); return { v: raw.version, h: raw.state.household }; });
  const live = await G(`return g.household;`);
  ok(live?.stage === 'none' && Array.isArray(live.children) && live.pace === 1, 'a version 23 save loads with an empty household', JSON.stringify({ v: mig.v, live }));
} catch (e) {
  console.log('FAIL exception', e.message); fails++;
}
ok(!errs.length, 'no page errors', errs.slice(0, 3).join(' | '));
await b.close();
console.log(fails ? `${fails} FAILED` : 'all passed');
process.exit(fails ? 1 : 0);
