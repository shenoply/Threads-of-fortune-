// How hard is Malek? Many haggles on the real negotiation code, played three ways:
//   naive   - show the first rug, name a price, take his offer
//   good    - ask about the shop and what draws him, show the best rug for him, argue durability and fit, a fair price
//   return  - the good way, on a rug he came back for
// His purse is rolled per visit (tight, usual, flush), so what he pays swings widely.
// He should rarely buy from a naive seller, sometimes from a good one, and more easily on a return.
//   npx tsx tests/malek-haggle.ts
import * as N from '../src/game/systems/negotiation';
import { RUGS } from '../src/data/rugs';
import type { RugItem } from '../src/game/types';

let seed = 11;
const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const tier1 = Object.values(RUGS).filter((t) => (t.tier ?? 1) === 1);
const rug = (i: number, typeId: string): RugItem => ({ uid: `r${i}`, typeId, condition: 'Good', restored: false, provenance: RUGS[typeId].provenance, paid: 150, notes: [] });
const ctxFor = (inv: RugItem[]) => ({ inventory: inv, upgrades: [], reputation: 10, rel: { visits: 1, purchases: 0, spent: 0, affinity: 0, bad: 0, lastLines: [] }, rng, findings: [], day: 5 }) as unknown as Parameters<typeof N.startEncounter>[1];

function play(style: 'naive' | 'good' | 'return') {
  // a stall of four Common rugs, a different mix each time
  const pick = [...tier1].sort(() => rng() - 0.5).slice(0, 4);
  const inv = pick.map((t, i) => rug(i, t.id));
  const c = ctxFor(inv);
  const e = N.startEncounter('malek', c, inv.slice(0, 3).map((i) => i.uid), false);
  let item = inv[0];
  if (style !== 'naive') {
    for (const a of ['ask_room', 'ask_drawn'] as const) if (!e.outcome) N.doAction(e, c, a);
    // the rug that fits him best
    let best = -1;
    for (const it of inv) { const f = N.fitScore(N.prefsFor(e), RUGS[it.typeId], it); if (f > best) { best = f; item = it; } }
  }
  if (style === 'return') { e.malekReturn = item.uid; e.interest = Math.min(100, e.interest + 25); }
  if (!e.outcome) N.presentRug(e, c, item.uid);
  if (style !== 'naive') for (const a of ['durability', 'fit'] as const) if (!e.outcome && !e.objection) N.doAction(e, c, a);
  if (!e.outcome && e.objection) N.doAction(e, c, 'obj_honest');
  for (let k = 0; k < 4 && !e.outcome; k++) {
    if (e.buyerOffer) { N.doAction(e, c, 'accept_offer'); break; }
    N.doAction(e, c, 'name_price', Math.round(N.wtp(e, item) * (style === 'naive' ? 1.15 : 0.98) / 5) * 5);
  }
  return { sold: e.outcome === 'sold', unsure: !!e.malekUnsure, interest: e.interest, trust: e.trust, fit: e.presentedFit, purse: e.malekPurse, price: e.salePrice ?? 0 };
}

const want = { naive: [0, 5], good: [15, 45], return: [70, 100] } as const;
let fails = 0;
for (const style of ['naive', 'good', 'return'] as const) {
  const runs = Array.from({ length: 300 }, () => play(style));
  const sold = runs.filter((r) => r.sold).length, unsure = runs.filter((r) => r.unsure).length;
  const pct = Math.round((sold / runs.length) * 100);
  if (pct < want[style][0] || pct > want[style][1]) { fails++; console.log(`FAIL ${style}: sold ${pct}%, wanted ${want[style][0]}-${want[style][1]}%`); }
  const avg = (k: 'interest' | 'trust' | 'fit') => Math.round(runs.reduce((s, r) => s + r[k], 0) / runs.length);
  console.log(`${style.padEnd(6)} sold ${Math.round((sold / runs.length) * 100)}% · agreed a price but not convinced ${Math.round((unsure / runs.length) * 100)}% · avg interest ${avg('interest')} trust ${avg('trust')} fit ${avg('fit')}`);
  if (style === 'naive') continue;
  // his purse: what he pays swings from very little to a lot
  const by = (p: string) => runs.filter((r) => r.sold && r.purse === p).map((r) => r.price);
  const spread = ['tight', 'usual', 'flush'].map((p) => { const v = by(p); return `${p} ${v.length ? `${Math.min(...v)}-${Math.max(...v)}pt (avg ${Math.round(v.reduce((a, b) => a + b, 0) / v.length)})` : 'none'}`; });
  console.log(`       paid: ${spread.join(' · ')}`);
  const lo = by('tight'), hi = by('flush');
  if (lo.length && hi.length && Math.max(...lo) >= Math.min(...hi) * 1.5) { fails++; console.log(`FAIL ${style}: a tight purse paid as much as a flush one`); }
}
console.log(fails ? `${fails} FAILED` : 'all passed');
process.exit(fails ? 1 : 0);
