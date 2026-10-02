// Engine checks: runs thousands of simulated encounters without a browser.
import { startEncounter, presentRug, doAction, wtp, type Ctx } from '../src/game/systems/negotiation';
import { startingInventory } from '../src/game/economy/economy';
let fails = 0;
const check = (name: string, ok: boolean, d = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${d}`); };
const rel = () => ({ visits: 1, purchases: 0, spent: 0, affinity: 0, bad: 0, lastLines: [] as string[] });
// the starting stock changes over time: use whatever three rugs a new game starts with, plus one
// with no papers (the "pasha's house" question is only asked of a rug of uncertain provenance)
const inv = [...startingInventory()];
const [R0, R1, R2] = inv.map((i) => i.uid);
inv.push({ ...inv[0], uid: 'no-papers', provenance: 'Uncertain' });
const ctx = (r = rel()): Ctx => ({ inventory: inv, upgrades: [], reputation: 0, rel: r, rng: Math.random });

// 1. Embellishment caught at roughly Samira's notice rate
let caught = 0, N = 2000;
for (let i = 0; i < N; i++) {
  const e = startEncounter('samira', ctx(), [], false); e.saffronOn = undefined;
  presentRug(e, ctx(), 'no-papers');
  if (e.stage === 'objection') doAction(e, ctx(), 'obj_honest');
  doAction(e, ctx(), 'story');
  if (e.prompt?.kind === 'story') doAction(e, ctx(), 'story_embellish');
  if (e.embellishCaught) caught++;
}
check('Pasha claim caught about 45% of the time by Samira', Math.abs(caught / N - 0.45) < 0.05, `${(caught / N * 100).toFixed(1)}%`);

// 2. A sale is never overwritten by a walk-out, across random play
let overwritten = 0, sold = 0, walked = 0;
const ids = ['ask_room','ask_drawn','ask_budget','small_talk','story','craft','fit','durability','obj_honest','obj_facts','obj_concede','name_price','hold','halfway','accept_offer','sweetener','story_true','story_embellish','saffron_move','saffron_stay'] as const;
for (let i = 0; i < 4000; i++) {
  const buyer = ['samira','yusuf','mariam'][i % 3];
  const c = ctx();
  const e = startEncounter(buyer, c, [R0, R1, R2], false);
  presentRug(e, c, [R0, R1, R2][i % 3]);
  for (let k = 0; k < 30 && !e.outcome; k++) {
    const id = ids[Math.floor(Math.random() * ids.length)];
    const wasSold = false;
    doAction(e, c, id, 60 + Math.floor(Math.random() * 200));
    if (e.outcome === 'sold' && !e.salePrice) overwritten++;
    void wasSold;
  }
  if (e.outcome === 'sold') { sold++; if (!e.log.some((l) => l.speaker === 'buyer')) overwritten++; }
  if (e.outcome === 'walked') walked++;
  if (e.outcome === 'walked' && e.salePrice) overwritten++;
}
check('Sold encounters are never turned into walk-outs', overwritten === 0, `sold ${sold}, walked ${walked}`);
check('Random play produces both outcomes', sold > 200 && walked > 200);

// 3. Willingness to pay tracks interest and trust
const e = startEncounter('samira', ctx(), [], false);
presentRug(e, ctx(), 'start-ds');
const item = inv[0];
e.interest = 20; e.trust = 30; const lo = wtp(e, item);
e.interest = 90; e.trust = 80; const hi = wtp(e, item);
check('Higher interest and trust raise what a buyer will pay', hi > lo + 20, `${lo} → ${hi}`);

// 4. Mariam punishes holding firm more than Yusuf does
const trustDrop = (id: string) => { const c = ctx(); const x = startEncounter(id, c, [], false); presentRug(x, c, 'start-ds'); if (x.stage === 'objection') doAction(x, c, 'obj_honest'); x.askPrice = 400; x.buyerOffer = 50; x.patience = 200; const t0 = x.trust; doAction(x, c, 'hold'); return t0 - x.trust; };
check('Mariam dislikes hard selling more than Yusuf', trustDrop('mariam') > trustDrop('yusuf'), `${trustDrop('mariam')} vs ${trustDrop('yusuf')}`);
process.exit(fails ? 1 : 0);
