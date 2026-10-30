// The milestone ladder (data/milestones.ts): nothing before day 7, then one goal at a time, each reached
// once, its reward paid once, a short notice with nothing to tap, the next one the following morning.
// Also: the goal takes the objective line when the main mission only waits on reputation, the ladder is
// on the Progress tab, and an older save has the goals it already met ticked quietly.
//   PORT=5173 node tests/goals-ladder.mjs
import { chromium } from 'playwright';
import { BASE } from './_env.mjs';
const K = 'threads-of-fortune-save';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
let ok = true; const check = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) ok = false; };
await p.goto(BASE);
await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'), localStorage.setItem('tof-skip-chapters', '1')));
await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]'); await p.waitForTimeout(1200);

const r = await p.evaluate(async () => {
  const url = (f) => performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes(f)) ?? f;
  const S = await import(url('/src/game/state/store.ts'));
  const M = await import(url('/src/data/milestones.ts'));
  const { useGame } = S;
  const g = () => useGame.getState();
  const set = (x) => useGame.setState(x);
  const out = { steps: {} };
  const count = (id) => g().journal.filter((j) => j.text.startsWith(`Goal reached: ${M.MILESTONES[id].title}.`)).length;
  // a merchant in his first week, past the opening, with the story under way
  set({ started: true, tutorial: { done: true, step: 'done', inspected: true }, tipsSeen: [...(g().tipsSeen ?? []), 'first-hour'], levelUps: [], titleNews: [],
    missions: { alexandria: 'done', beasts: 'done', farid: 'active' }, day: 4, cash: 2000, reputation: 5, upgrades: [], register: ['desert-star', 'cairo-garden', 'fayoum-hearth'],
    world: { ...g().world, at: 'giza', appraised: [] } });
  g().endDay();
  out.beforeDay7 = { day: g().day, active: M.activeMilestone(g().missions) ?? null };
  set({ day: 6 }); g().endDay();
  out.day7 = { day: g().day, active: M.activeMilestone(g().missions) ?? null };
  const step = (id, meet, extra) => {
    // the goal is held back while its condition is set up (buying the pieces costs money; paying the
    // debt raises Rashid's trust on its own), then opened again: what changes then is the reward alone
    const was = g().missions[id];
    set({ missions: { ...g().missions, [id]: undefined } });
    meet();
    const heldBack = g().missions[id] === undefined;
    const before = { cash: g().cash, rep: g().reputation, trust: g().supplier.trust };
    set({ missions: { ...g().missions, [id]: 'active' } });
    const after = { cash: g().cash, rep: g().reputation, trust: g().supplier.trust };
    const news = g().milestoneNews;
    // the next goal opens the following morning, not at once
    const nextBeforeMorning = M.activeMilestone(g().missions) ?? null;
    set({ day: g().day }); set({ cash: g().cash }); // more state changes: it must not pay twice
    const m = M.MILESTONES[id];
    out.steps[id] = { was, heldBack, state: g().missions[id], times: count(id), news, d: { cash: after.cash - before.cash, rep: after.rep - before.rep, trust: after.trust - before.trust },
      want: { cash: m.reward.cash, rep: m.reward.rep, trust: Math.min(100, before.trust + m.reward.trust) - before.trust }, ...(extra ? extra() : {}) };
    out.steps[id].nextBeforeMorning = nextBeforeMorning;
    g().endDay();
    out.steps[id].nextAfterMorning = M.activeMilestone(g().missions) ?? null;
  };
  // 1. a proper corner: mat, display pole, tea (bought for real)
  set({ reputation: 8, cash: 5000 });
  step('ms-corner', () => { g().buyUpgrade('mat'); g().buyUpgrade('display'); g().buyUpgrade('tea'); });
  // 2. buyers who come back: one more buyer a day afterwards
  const avgQueue = (n) => { let t = 0; for (let i = 0; i < n; i++) { set({ cash: 5000, day: 8 + (i % 5) }); g().endDay(); t += g().queue.filter((id) => !['cohen', 'malek', 'nabil'].includes(id)).length; } return t / n; };
  set({ reputation: 40 });
  const missionsNow = g().missions;
  set({ missions: { ...missionsNow, 'ms-regulars': undefined } });
  const qBefore = avgQueue(14);
  set({ missions: missionsNow, reputation: 12 });
  const rel = { ...g().relationships };
  for (const id of Object.keys(rel).slice(0, 3)) rel[id] = { ...rel[id], purchases: 2 };
  step('ms-regulars', () => set({ relationships: rel }), () => {
    const m2 = g().missions;
    set({ reputation: 40 }); const q = avgQueue(14); set({ missions: m2, reputation: 14 });
    return { qBefore, qAfter: q };
  });
  // 3. a special order delivered
  step('ms-order', () => set({ commissions: [...g().commissions, { buyerId: 'samira', label: 'A quieter rug for Samira\'s sister', bonus: 300, done: true }] }), () => ({ title: (g().titles ?? []).includes('orders') }));
  // 4. ten kinds in the Register: Cairo dealers bid more
  const rug = { uid: 'lb1', typeId: 'delta-house', condition: 'Good', restored: false, provenance: 'Likely', paid: 100, notes: [], stored: false };
  const bid0 = S.localBid('cairo', rug, g().day);
  const ten = ['desert-star', 'cairo-garden', 'fayoum-hearth', 'nile-reed', 'village-kilim-canal', 'canal-ferry-rug', 'delta-house', 'jerusalem-stone', 'anatolian-hearth', 'cedar-caravan'];
  step('ms-name', () => set({ register: ten }), () => ({ fx: S.MS_FX.cairoDealers, bid0, bid1: S.localBid('cairo', rug, g().day) }));
  // 5. a caravan abroad: rug sales made in Jerusalem are counted, one real dealer sale among them
  set({ world: { ...g().world, at: 'jerusalem' }, inventory: [...g().inventory, { ...rug, uid: 'ab1' }] });
  const got = g().sellLocal('ab1', 'jerusalem');
  const counted = g().stats.abroadSold ?? 0;
  set({ world: { ...g().world, at: 'giza' } });
  set({ ledger: [...g().ledger, { day: g().day, kind: 'sale', label: 'at home', amount: 5000, cost: 100 }] });
  const homeIgnored = (g().stats.abroadSold ?? 0) === counted;
  set({ world: { ...g().world, at: 'jerusalem' } });
  step('ms-abroad', () => set({ ledger: [...g().ledger, { day: g().day, kind: 'sale', label: 'Rug to a visitor', amount: 2500, cost: 900 }] }), () => ({ got, counted, homeIgnored, title: (g().titles ?? []).includes('border') }));
  set({ world: { ...g().world, at: 'giza' } });
  // 6. an agent in Alexandria: net worth £70; he pays on Mondays
  step('ms-agent', () => set({ cash: 20000 }));
  let agentPaid = 0;
  for (let i = 0; i < 8; i++) { set({ cash: Math.max(g().cash, 20000) }); g().endDay(); agentPaid += g().ledger.filter((l) => l.day === g().day && /agent in Alexandria/.test(l.label)).reduce((a, l) => a + l.amount, 0); }
  out.agentPaid = agentPaid;
  // 7. the father's debt paid off
  step('ms-debt', () => { set({ cash: 30000 }); g().payFamily(20000); }, () => ({ title: (g().titles ?? []).includes('nodebt'), left: g().family.left }));
  out.allDone = M.milestonesDone(g().missions);
  out.rank = (await import(url('/src/game/economy/progress.ts'))).rankOf(g()).idx;
  return out;
});
console.log(JSON.stringify(r, null, 1));
check(r.beforeDay7.active === null, 'no goal in the first week');
check(r.day7.day === 7 && r.day7.active === 'ms-corner', 'the first goal opens on the morning of day 7');
const order = ['ms-corner', 'ms-regulars', 'ms-order', 'ms-name', 'ms-abroad', 'ms-agent', 'ms-debt'];
order.forEach((id, i) => {
  const s = r.steps[id];
  check(s && s.was === 'active' && s.state === 'done' && s.times === 1, `${id}: reached once`);
  check(s && s.d.cash === s.want.cash && s.d.rep === s.want.rep && s.d.trust === s.want.trust, `${id}: reward paid (${JSON.stringify(s?.d)} vs ${JSON.stringify(s?.want)})`);
  check(s && s.news === id, `${id}: notice raised`);
  check(s && s.nextBeforeMorning === null && s.nextAfterMorning === (order[i + 1] ?? null), `${id}: next goal opens the next morning`);
});
// buying the corner pieces cost money; the reward itself is trust and reputation
check(r.steps['ms-regulars'].qAfter > r.steps['ms-regulars'].qBefore + 0.5, `one more buyer a day (${r.steps['ms-regulars'].qBefore.toFixed(2)} -> ${r.steps['ms-regulars'].qAfter.toFixed(2)})`);
check(r.steps['ms-order'].title, 'title for the special order');
check(r.steps['ms-name'].fx && r.steps['ms-name'].bid1 > r.steps['ms-name'].bid0, `Cairo dealers bid more (${r.steps['ms-name'].bid0} -> ${r.steps['ms-name'].bid1})`);
check(r.steps['ms-abroad'].got > 0 && r.steps['ms-abroad'].counted === r.steps['ms-abroad'].got && r.steps['ms-abroad'].homeIgnored, 'sales abroad are counted, sales at home are not');
check(r.steps['ms-abroad'].title && r.steps['ms-debt'].title && r.steps['ms-debt'].left === 0, 'titles for abroad and the debt');
check(r.agentPaid === 250, `the agent pays £2.50 on a Monday (${r.agentPaid} in eight days)`);
check(r.allDone === 7, 'all seven goals done');

// the notice: no modal, gone by itself
const modals = () => p.locator('.overlay, [aria-modal=true]').count();
const m0 = await modals();
await p.evaluate(async () => { const m = await import(performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/game/state/store.ts'))); m.useGame.setState({ milestoneNews: 'ms-corner' }); });
await p.waitForTimeout(400);
check((await p.locator('[data-testid=milestone-notice]').count()) === 1, 'the notice shows');
check((await modals()) === m0 && (await p.locator('.overlay [data-testid=milestone-notice]').count()) === 0, 'no modal with it');
await p.waitForTimeout(7000);
check((await p.locator('[data-testid=milestone-notice]').count()) === 0, 'the notice goes by itself');

// the objective line and the Progress tab, on a save on day 20, warrant mission waiting on reputation
const save = await p.evaluate((k) => localStorage.getItem(k), K);
const fresh = (patch) => p.evaluate(([k, raw, patch]) => { const d = JSON.parse(raw); Object.assign(d.state, patch); window.__tofEdit = true; localStorage.setItem(k, JSON.stringify(d)); const w = Storage.prototype.setItem; const h = function (key, v) { if (key === k && !window.__tofEdit) return; return w.call(this, key, v); }; window.__tofEdit = false; Storage.prototype.setItem = h; setTimeout(() => { Storage.prototype.setItem = w; }, 4000); }, [K, save, patch]);
await fresh({ day: 20, missions: { alexandria: 'done', beasts: 'done', farid: 'done', rival: 'done', ambush: 'done', auction: 'done', warrant: 'active', 'ms-corner': 'done', 'ms-regulars': 'done', 'ms-order': 'active' }, reputation: 9, commissions: [], milestoneNews: undefined, missionNews: undefined, lastSummary: undefined, world: { ...JSON.parse(save).state.world, at: 'giza' } });
await p.reload(); if (await p.locator('[data-testid=continue]').count()) await p.click('[data-testid=continue]');
await p.waitForTimeout(2500);
for (const ok2 of ['day-summary-ok', 'big-news-ok', 'mission-ok']) { const x = p.locator(`[data-testid=${ok2}]`); if (await x.count()) await x.first().click({ timeout: 1500 }).catch(() => {}); }
await p.locator('[data-testid=nav-map]').click({ timeout: 3000 }).catch(() => {});
await p.waitForTimeout(800);
const bar = p.locator('[data-testid=milestone-bar]');
check((await bar.count()) === 1, 'the goal takes the objective line while the warrant waits on reputation');
if (await bar.count()) {
  const h = await bar.boundingBox();
  check(h && h.height < 60, `the line stays thin (${h?.height}px)`);
  check(/goal 3\/7/i.test(await bar.innerText()), 'it says which goal of seven');
  await p.click('[data-testid=milestone-expand]'); await p.waitForTimeout(300);
  check(/Reward:/.test(await bar.innerText()) && /Main mission: By royal appointment/.test(await bar.innerText()), 'tap shows the detail, reward and the main mission');
}
await p.click('[data-testid=nav-hero]').catch(() => {}); await p.click('[data-testid=nav-ledger]', { timeout: 3000 }).catch(() => {});
await p.waitForTimeout(400);
await p.click('[data-testid=msub-collection]', { timeout: 3000 }).catch(() => {});
await p.waitForTimeout(400);
check((await p.locator('[data-testid=ladder] .rung').count()) === 7, 'the whole ladder is on the Progress tab');
check((await p.locator('[data-testid=rung-ms-order]').getAttribute('data-state')) === 'active' && (await p.locator('[data-testid=rung-ms-corner]').getAttribute('data-state')) === 'done', 'done, current and later goals marked');

// an older save (version 22, day 30) has the goals it already met ticked quietly, in order
const v22 = await p.evaluate((k) => localStorage.getItem(k), K);
await p.evaluate(([k, raw]) => {
  const d = JSON.parse(raw); d.version = 22; d.state.version = 22;
  const rel = d.state.relationships; Object.keys(rel).slice(0, 3).forEach((id) => { rel[id].purchases = 3; });
  const ms = { ...d.state.missions }; for (const id of Object.keys(ms)) if (id.startsWith('ms-')) delete ms[id];
  Object.assign(d.state, { day: 30, upgrades: ['mat', 'display', 'tea'], missions: ms, commissions: [], cohen: undefined });
  window.__tofEdit = true; localStorage.setItem(k, JSON.stringify(d)); window.__tofEdit = false;
  const w = Storage.prototype.setItem; const h = function (key, v) { if (key === k && !window.__tofEdit) return; return w.call(this, key, v); }; Storage.prototype.setItem = h; setTimeout(() => { Storage.prototype.setItem = w; }, 4000);
}, [K, v22]);
await p.reload(); await p.waitForTimeout(1500);
const mig = await p.evaluate(async () => { const m = await import(performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/game/state/store.ts'))); const s = m.useGame.getState(); return { corner: s.missions['ms-corner'], regulars: s.missions['ms-regulars'], order: s.missions['ms-order'] ?? null, news: s.milestoneNews ?? null, version: m.SAVE_VERSION }; });
console.log(JSON.stringify(mig));
check(mig.corner === 'done' && mig.regulars === 'done' && mig.order === null && mig.news === null, 'an old save gets the goals it already met, quietly, and stops at the first one not met');
check(errs.length === 0, `no page errors ${JSON.stringify(errs)}`);
console.log(ok ? 'PASS' : 'FAIL');
await b.close();
process.exit(ok ? 0 : 1);
