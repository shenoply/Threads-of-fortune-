// Cohen's orders: first visit (measurements, deadline, promise), Saturday rule, the checks on each rug,
// a hand rub vs Arran's rub, a pair that does not match, delivery of a matching pair, a missed date,
// and a real stall visit for the composition and the pinned side task.   PORT=5173 node tests/cohen.mjs
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? '4173';
const S = process.env.SHOTS ?? '/tmp';
const W = +(process.env.W ?? 390), H = +(process.env.H ?? 844), tag = process.env.TAG ?? 'phone';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const has = (id) => p.locator(`[data-testid="${id}"]`).count();
const state = async () => JSON.parse(await p.evaluate(() => localStorage.getItem('threads-of-fortune-save'))).state;
try {
  await p.goto(`http://localhost:${PORT}/`);
  const r = await p.evaluate(async () => {
    const N = await import('/src/game/systems/negotiation.ts');
    const C = await import('/src/game/systems/cohen.ts');
    const { dateFor } = await import('/src/game/economy/economy.ts');
    let seed = 3; const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const rug = (uid, typeId, extra = {}) => ({ uid, typeId, condition: 'Good', restored: false, provenance: 'Likely', paid: 200, notes: [], ...extra });
    const inv = [rug('a', 'red-medina'), rug('b', 'delta-house'), rug('c', 'canal-ferry-rug'), rug('d', 'tanta-courtyard'), rug('e', 'red-medina', { condition: 'Worn' }), rug('f', 'date-palm-runner')];
    const ctx = (cohen, day = 3, findings = []) => ({ inventory: inv, upgrades: [], reputation: 5, rel: { visits: 0, purchases: 0, spent: 0, affinity: 0, bad: 0, lastLines: [] }, rng, cohen, findings, day });
    const ids = (e, c) => N.getActions(e, c).map((a) => a.id);
    const out = {};
    out.dates = { day1: dateFor(1).long, day5: dateFor(5).weekday, dueFrom5: C.dueFor(5, (d) => dateFor(d).weekday), dueWeekday: dateFor(C.dueFor(5, (d) => dateFor(d).weekday)).weekday };
    out.saturday = { onSat: C.cohenDue(undefined, 5, dateFor(5).weekday, 5, 0), onSun: C.cohenDue(undefined, 6, dateFor(6).weekday, 5, 0), fewSales: C.cohenDue(undefined, 6, 'Sunday', 1, 0) };
    // first visit
    let c = ctx(undefined); let e = N.startEncounter('cohen', c, [], false);
    out.first = { greeting: e.log.find((l) => l.speaker === 'buyer')?.text, actions: ids(e, c) };
    N.doAction(e, c, 'c_measure'); N.doAction(e, c, 'c_deadline'); N.doAction(e, c, 'c_accept');
    out.promised = { dueDay: e.cohenAccepted?.dueDay, due: dateFor(e.cohenAccepted.dueDay).short, said: e.log.at(-1).text };
    // second visit with the order open
    const order = { id: 'o1', placedDay: 3, dueDay: e.cohenAccepted.dueDay, pricePer: 450, status: 'accepted' };
    const mem = { visits: 1, trust: 50, ordersDone: 0, ordersMissed: 0, order };
    c = ctx(mem, 6, [{ id: 'a:fastness', subjectId: 'a', service: 'fastness', verdict: 'consistent' }]); e = N.startEncounter('cohen', c, [], false);
    N.presentRug(e, c, 'e');
    out.worn = e.log.filter((l) => l.speaker !== 'seller').slice(-2).map((l) => l.text);
    N.presentRug(e, c, 'f');
    out.runner = e.log.at(-1).text;
    N.presentRug(e, c, 'a');
    out.withReport = { checks: e.log.at(-2).text, actions: ids(e, c) };
    N.doAction(e, c, 'c_keep');
    out.keep = e.log.filter((l) => l.speaker === 'buyer').at(-1).text;
    N.presentRug(e, c, 'c');
    out.noReport = { actions: ids(e, c) };
    N.doAction(e, c, 'c_rub');
    out.handRub = e.log.at(-2).text;
    N.doAction(e, c, 'c_deliver');
    out.mismatch = { outcome: e.outcome ?? 'still here', said: e.log.at(-1).text };
    N.presentRug(e, c, 'b'); N.doAction(e, c, 'c_rub');
    out.b = { actions: ids(e, c) };
    N.doAction(e, c, 'c_deliver');
    out.delivered = { outcome: e.outcome, price: e.salePrice, pair: [e.presented, e.packageUid], delivered: e.cohenDelivered };
    // a bleeding rug on a hand rub: caught six times in ten, fixed per rug
    out.manual = ['k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7', 'k8'].map((u) => C.manualRub({ uid: u, typeId: 'village-kilim-canal' })).join(',');
    // complaint next time
    c = ctx({ ...mem, complaint: 'Delta House', order: { ...order, status: 'done' } }, 12); e = N.startEncounter('cohen', c, [], false);
    out.complaint = { line: e.log.find((l) => l.text.includes('ran in the hotel'))?.text, trust: e.trust };
    return out;
  });
  for (const [k, v] of Object.entries(r)) console.log(k.padEnd(12), JSON.stringify(v));

  // a real visit at the stall
  await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'))); await p.reload();
  await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
  await p.evaluate(() => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); const s = d.state; s.tutorial = { done: true, step: 'done', inspected: true }; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; Object.assign(s.world, { at: 'giza', hour: 9 }); s.totalSales = 4; s.queue = ['cohen']; s.visitIdx = 0; s.inventory.unshift({ uid: 'p1', typeId: 'red-medina', condition: 'Good', restored: false, provenance: 'Likely', paid: 200, notes: [] }, { uid: 'p2', typeId: 'delta-house', condition: 'Good', restored: false, provenance: 'Likely', paid: 200, notes: [] }); localStorage.setItem(k, JSON.stringify(d)); localStorage.setItem('tof-skip-chapters', '1'); });
  await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(800);
  await p.click('[data-testid=nav-stall]'); await p.waitForTimeout(700);
  if (await has('stall-wait')) await p.click('[data-testid=stall-wait]');
  await p.waitForSelector('[data-buyer=cohen]', { timeout: 15000 }); await p.waitForTimeout(2500);
  await p.screenshot({ path: `${S}/cohen-${tag}-arrive.png` });
  console.log('first actions:', (await p.locator('[data-testid^=act-]').evaluateAll((els) => els.map((e) => e.dataset.testid))).join(' '));
  await p.click('[data-testid=act-c_measure]'); await p.waitForTimeout(400);
  await p.click('[data-testid=act-c_accept]'); await p.waitForTimeout(400);
  await p.screenshot({ path: `${S}/cohen-${tag}-promise.png` });
  await p.locator('[data-testid="rug-red-medina"]').first().click(); await p.waitForTimeout(600);
  await p.screenshot({ path: `${S}/cohen-${tag}-check.png` });
  await p.click('[data-testid=act-c_leave]').catch(() => {}); await p.waitForTimeout(500);
  if (await has('next-visit')) await p.click('[data-testid=next-visit]');
  await p.waitForTimeout(800);
  let st = await state();
  console.log('order saved:', JSON.stringify(st.cohen?.order), '| trust', st.cohen?.trust);
  await p.click('[data-testid=nav-map]').catch(() => {}); await p.waitForTimeout(600);
  console.log('side task:', await p.locator('[data-testid=side-task-cohen]').textContent().catch(() => 'none'));
  await p.screenshot({ path: `${S}/cohen-${tag}-sidetask.png` });
  // miss the date: move the due day into the past, close the day
  await p.evaluate(() => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); d.state.cohen.order.dueDay = d.state.day - 1; d.state.dayOver = false; localStorage.setItem(k, JSON.stringify(d)); });
  await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(800);
  await p.evaluate(async () => { const m = await import('/src/game/state/store.ts'); m.useGame.getState().endDay(); });
  await p.waitForTimeout(500);
  st = await state();
  console.log('after the day closes with the date passed:', JSON.stringify(st.cohen?.order?.status), '| trust', st.cohen?.trust, '| missed', st.cohen?.ordersMissed);
  console.log('errors', errs);
} catch (e) { console.log('FAIL', e.message.split('\n')[0]); await p.screenshot({ path: `${S}/cohen-${tag}-fail.png` }); }
await b.close();
