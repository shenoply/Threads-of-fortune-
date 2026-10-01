// Nabil al-Khatib: scripted haggles on the real negotiation functions (first meeting, honest
// disclosure of a repair, bluffing until he leaves, a refusal, a token price move, a two-rug
// package, a second visit that remembers), then a real stall visit for composition and memory.
//   PORT=5173 node tests/nabil.mjs
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? '4173';
const S = process.env.SHOTS ?? '/tmp';
const W = +(process.env.W ?? 390), H = +(process.env.H ?? 844), tag = process.env.TAG ?? 'phone';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const has = (id) => p.locator(`[data-testid="${id}"]`).count();
try {
  await p.goto(`http://localhost:${PORT}/`);
  const r = await p.evaluate(async () => {
    const N = await import('/src/game/systems/negotiation.ts');
    const { RUGS } = await import('/src/data/rugs.ts');
    const { nabilAssessment } = await import('/src/game/systems/nabil.ts');
    let seed = 7; const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const rug = (uid, typeId, extra = {}) => ({ uid, typeId, condition: 'Good', restored: false, provenance: RUGS[typeId].provenance, paid: 500, notes: [], ...extra });
    const repaired = rug('r1', 'sapphire-night', { restored: true });
    const clean = rug('r2', 'damascus-blue');
    const second = rug('r3', 'golden-palm');
    const ctx = (inv, nabil) => ({ inventory: inv, upgrades: [], reputation: 20, rel: { visits: 0, purchases: 0, spent: 0, affinity: 0, bad: 0, lastLines: [] }, rng, nabil });
    const said = (e) => e.log.filter((l) => l.speaker === 'buyer' || l.speaker === 'narrator').map((l) => l.text);
    const out = {};
    // ceiling follows evidence and honesty
    const t = RUGS['sapphire-night'];
    out.ceiling = { hidden: nabilAssessment(t, repaired, { repairDisclosed: false, repeatedPitchCount: 0 }), told: nabilAssessment(t, repaired, { repairDisclosed: true, repeatedPitchCount: 0 }), clean: nabilAssessment(t, { ...repaired, restored: false }, { repairDisclosed: false, repeatedPitchCount: 0 }) };
    // 1. first meeting, honest disclosure of the repair, a fair price
    let c = ctx([repaired, clean, second]); let e = N.startEncounter('nabil', c, [], false);
    out.greeting = e.log.map((l) => l.text).slice(0, 2);
    N.doAction(e, c, 'ask_drawn'); N.presentRug(e, c, 'r1');
    out.objection = e.objection?.id + ': ' + e.objection?.text;
    const beforeTrust = e.trust; N.doAction(e, c, 'obj_honest');
    out.honest = { trustUp: e.trust - beforeTrust, disclosed: e.nabilDisclosed };
    N.doAction(e, c, 'craft');
    const w = N.wtp(e, repaired);
    N.doAction(e, c, 'name_price', Math.round(w * 1.15));
    out.counter = { offer: e.buyerOffer, reason: said(e).filter((x) => x.startsWith("Nabil's reason")).pop() };
    // package appears once he has named a figure and trusts you
    out.packageAction = N.getActions(e, c).map((a) => a.id + ' ' + a.label).find((x) => x.startsWith('nabil_package'));
    N.doAction(e, c, 'nabil_package');
    out.packageSale = { outcome: e.outcome, price: e.salePrice, second: e.packageUid };
    // 2. bluffing: facts instead of the repair, repeated pitch, token price change → he leaves
    c = ctx([repaired, clean]); e = N.startEncounter('nabil', c, [], false);
    N.doAction(e, c, 'ask_drawn'); N.presentRug(e, c, 'r1');
    N.doAction(e, c, 'obj_facts'); N.doAction(e, c, 'craft'); N.doAction(e, c, 'craft'); if (!e.outcome) N.doAction(e, c, 'craft');
    out.bluff = { pitches: e.nabilPitches, outcome: e.outcome ?? 'still here', angry: e.nabilAngry, last: e.log.at(-1).text };
    // 3. token price change
    c = ctx([clean]); e = N.startEncounter('nabil', c, [], false);
    N.doAction(e, c, 'ask_drawn'); N.presentRug(e, c, 'r2'); if (e.stage === 'objection') N.doAction(e, c, 'obj_honest'); N.doAction(e, c, 'craft');
    const w2 = N.wtp(e, clean); N.doAction(e, c, 'name_price', Math.round(w2 * 1.2)); const offer1 = e.buyerOffer;
    N.doAction(e, c, 'name_price', Math.round(w2 * 1.2) - 5);
    out.token = { pitches: e.nabilPitches, line: said(e).find((x) => x.includes('different hat')) ? 'called out' : 'not noticed', offerKept: e.buyerOffer === offer1 || e.buyerOffer };
    // 4. refusal: decline his final figure, no punishment beyond the walk
    N.doAction(e, c, 'hold'); N.doAction(e, c, 'hold'); N.doAction(e, c, 'hold'); N.doAction(e, c, 'hold');
    out.refusal = { outcome: e.outcome ?? 'still bargaining', angry: !!e.nabilAngry, trust: e.trust };
    // 5. second visit remembers: trust carried, seen rug recognised
    const mem = { visits: 1, trust: 58, seenRugIds: ['r2:Good'], disclosedFaultIds: [], brokenPromiseIds: [] };
    c = ctx([clean], mem); e = N.startEncounter('nabil', c, [], false);
    out.second = { startTrust: e.trust };
    N.doAction(e, c, 'ask_drawn'); N.presentRug(e, c, 'r2');
    out.second.recognised = e.log.some((l) => l.text.includes('I have seen this piece'));
    // the same rug, changed, is new to him
    c = ctx([{ ...clean, condition: 'Excellent' }], mem); e = N.startEncounter('nabil', c, [], false); N.doAction(e, c, 'ask_drawn'); N.presentRug(e, c, 'r2');
    out.second.changedIsNew = !e.log.some((l) => l.text.includes('I have seen this piece'));
    return out;
  });
  for (const [k, v] of Object.entries(r)) console.log(k.padEnd(14), JSON.stringify(v));
  // a real visit at the stall: composition and memory
  await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
  await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
  await p.evaluate(() => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); const s = d.state; s.tutorial = { done: true, step: 'done', inspected: true }; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; Object.assign(s.world, { at: 'giza', hour: 9 }); s.reputation = 20; s.queue = ['nabil', 'samira']; s.visitIdx = 0; s.inventory.unshift({ uid: 'r1', typeId: 'sapphire-night', condition: 'Good', restored: true, provenance: 'Documented', paid: 5000, notes: [] }); localStorage.setItem(k, JSON.stringify(d)); localStorage.setItem('tof-skip-chapters', '1'); });
  await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(800);
  await p.click('[data-testid=nav-stall]'); await p.waitForTimeout(700);
  if (await has('stall-wait')) await p.click('[data-testid=stall-wait]');
  await p.waitForSelector('[data-testid=arrival-card]', { timeout: 15000 }); await p.waitForTimeout(600);
  await p.screenshot({ path: `${S}/nabil-${tag}-card.png` });
  await p.click('[data-testid=arrival-ok]');
  await p.waitForSelector('[data-buyer=nabil]', { timeout: 15000 }); await p.waitForTimeout(2500);
  await p.screenshot({ path: `${S}/nabil-${tag}-arrive.png` });
  const box = await p.evaluate(() => { const f = document.querySelector('[data-buyer=nabil]').getBoundingClientRect(); const hero = document.querySelector('.hero-figure, [data-testid=hero-figure]')?.getBoundingClientRect(); return { nabil: [Math.round(f.top), Math.round(f.bottom), Math.round(f.height)], hero: hero ? [Math.round(hero.top), Math.round(hero.bottom), Math.round(hero.height)] : null }; });
  console.log('stall boxes (top, bottom, height):', JSON.stringify(box));
  // show the repaired rug and leave without a deal
  await p.locator('[data-testid="rug-sapphire-night"]').first().click().catch(() => {}); await p.waitForTimeout(600);
  await p.screenshot({ path: `${S}/nabil-${tag}-rug.png` });
  for (let i = 0; i < 8 && !(await has('next-visit')); i++) {
    const ids = await p.locator('[data-testid^=act-]').evaluateAll((els) => els.filter((e) => !e.disabled).map((e) => e.dataset.testid));
    const pickId = ids.find((x) => x === 'act-obj_honest') ?? ids.find((x) => x === 'act-craft') ?? ids.find((x) => x === 'act-hold') ?? ids.find((x) => x === 'act-name_price') ?? ids[0];
    if (!pickId) break;
    await p.click(`[data-testid=${pickId}]`); await p.waitForTimeout(500);
    if (pickId === 'act-name_price' && (await has('offer-price'))) { await p.click('[data-testid=offer-price]'); await p.waitForTimeout(500); }
  }
  await p.screenshot({ path: `${S}/nabil-${tag}-deal.png` });
  const log = await p.evaluate(() => [...document.querySelectorAll('.band .speech, .log-line, [data-testid=dialogue-line]')].map((e) => e.textContent).slice(-3));
  if (await has('next-visit')) await p.click('[data-testid=next-visit]');
  await p.waitForTimeout(800);
  const st = JSON.parse(await p.evaluate(() => localStorage.getItem('threads-of-fortune-save'))).state;
  console.log('memory after the visit:', JSON.stringify(st.nabil), '| last lines', JSON.stringify(log));
  console.log('errors', errs);
} catch (e) { console.log('FAIL', e.message.split('\n')[0]); await p.screenshot({ path: `${S}/nabil-${tag}-fail.png` }); }
await b.close();
