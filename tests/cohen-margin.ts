// Cohen and his margin: asking more a rug. A stranger is refused, then he walks if pushed again; a
// seller who has delivered to him and has his business trust gets a little more, once. His wealth
// never makes him overpay, and nothing about him but the record of orders changes the answer.
//   npx tsx tests/cohen-margin.ts
import * as N from '../src/game/systems/negotiation';
import { RUGS } from '../src/data/rugs';
import { COHEN_START, ORDER_PRICE_PER } from '../src/game/systems/cohen';
import type { RugItem } from '../src/game/types';

let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fails++; };
const rng = () => 0.5;
const inv: RugItem[] = Object.values(RUGS).slice(0, 3).map((t, i) => ({ uid: `r${i}`, typeId: t.id, condition: 'Good', restored: false, provenance: t.provenance, paid: 150, notes: [] }));
const ctxFor = (cohen: typeof COHEN_START) => ({ inventory: inv, upgrades: [], reputation: 10, rel: { visits: 1, purchases: 0, spent: 0, affinity: 0, bad: 0, lastLines: [] }, rng, findings: [], day: 3, cohen }) as unknown as Parameters<typeof N.startEncounter>[1];
const said = (e: N.Encounter) => e.log.filter((l) => l.speaker === 'buyer').pop()?.text ?? '';
const acts = (e: N.Encounter, c: ReturnType<typeof ctxFor>) => N.getActions(e, c).map((a) => a.id);

// a stranger
let c = ctxFor({ ...COHEN_START });
let e = N.startEncounter('cohen', c, inv.map((i) => i.uid), false);
ok(!acts(e, c).includes('c_more'), 'no price talk before the measurements');
N.doAction(e, c, 'c_measure');
ok(acts(e, c).includes('c_more'), 'after them, "Ask more a rug"');
N.doAction(e, c, 'c_more');
ok(/earn twice and I earn nothing/.test(said(e)) && !e.outcome && e.cohenPrice == null, `refused: "${said(e).slice(0, 60)}"`);
N.doAction(e, c, 'c_more');
ok(e.outcome === 'walked' && /margin is too thin/.test(said(e)), `pushed again, he walks: "${said(e)}"`);

// a seller who delivered and has his trust
c = ctxFor({ ...COHEN_START, trust: 70, ordersDone: 1 });
e = N.startEncounter('cohen', c, inv.map((i) => i.uid), false);
N.doAction(e, c, 'c_measure'); N.doAction(e, c, 'c_more');
ok(e.cohenPrice === ORDER_PRICE_PER + 25 && /repeat order is a business/.test(said(e)), `earned: ${e.cohenPrice}pt a rug`);
ok(!acts(e, c).includes('c_more'), 'only once');
N.doAction(e, c, 'c_accept');
ok(e.cohenAccepted?.pricePer === ORDER_PRICE_PER + 25, 'the promise carries the raised price');
console.log(fails ? `${fails} FAILED` : 'all passed');
process.exit(fails ? 1 : 0);
