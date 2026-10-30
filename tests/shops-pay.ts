// Shops pay when stocked: an agent is paid mostly by commission, takes no retainer for an empty wall,
// and a shop in a good city kept at six middle-grade rugs clears its lease within a season (13 weeks).
// The same rug and condition carry one price on a wall, hidden faults or not. Prints the numbers.
//   npx tsx tests/shops-pay.ts
import { shopsWeek, shopPrice, weekAccount, type ShopState, type ShopRug } from '../src/game/systems/shops';
import { SHOP_CITIES, AGENTS } from '../src/data/shops';
import { RUGS } from '../src/data/rugs';
import { fmt } from '../src/game/economy/money';

let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fails++; };
const mulberry = (seed: number) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const mid = Object.values(RUGS).filter((t) => (t.tier ?? 1) === 2).map((t) => t.id);
let n = 0;
const rug = (typeId: string, extra: Partial<ShopRug> = {}): ShopRug => ({ uid: `r${n++}`, typeId, condition: 'Good', restored: false, provenance: 'Likely', paid: 0, notes: [], ...extra });

function season(sid: string, agentId: string, seeds = 20) {
  const a = AGENTS[sid].find((x) => x.id === agentId)!;
  let net = 0, gross = 0, pay = 0;
  for (let sd = 1; sd <= seeds; sd++) {
    const rng = mulberry(sd * 97 + sid.length);
    let sh: ShopState = { since: 1, paid: SHOP_CITIES[sid].cost, stock: [], agent: { ...a, since: 1 } };
    for (let w = 0; w < 13; w++) {
      while (sh.stock.length < 6) sh = { ...sh, stock: [...sh.stock, rug(mid[Math.floor(rng() * mid.length)])] };
      const wk = shopsWeek({ [sid]: sh }, 8 + w * 7, 100000, rng);
      sh = wk.shops[sid];
      net += wk.cashIn - wk.cashOut; gross += sh.last?.gross ?? 0; pay += sh.last?.pay ?? 0;
    }
  }
  return { net: net / seeds, gross: gross / seeds, pay: pay / seeds, lease: SHOP_CITIES[sid].cost };
}

for (const [sid, ag] of [['alexandria', 'shawqi'], ['damascus', 'qabbani'], ['jaffa', 'haddad'], ['istanbul', 'balian'], ['amman', 'twal']] as const) {
  const r = season(sid, ag);
  console.log(`${sid.padEnd(11)} lease ${fmt(r.lease).padStart(8)} · a week: sales ${fmt(r.gross / 13)}, agent ${fmt(r.pay / 13)}, to you ${fmt(r.net / 13)} · season to you ${fmt(r.net)}`);
  if (['alexandria', 'damascus', 'istanbul'].includes(sid)) ok(r.net >= r.lease, `${sid}: a stocked shop clears its lease in a season (${fmt(r.net)} against ${fmt(r.lease)})`);
  ok(r.pay < r.gross * 0.25, `${sid}: the agent's pay is a small part of the sales`);
}

// an empty wall: no takings, no retainer
const shaw = AGENTS.alexandria[0];
const empty = shopsWeek({ alexandria: { since: 1, paid: 35000, stock: [], agent: { ...shaw, since: 1 } } }, 15, 1000, () => 0.5);
ok(empty.cashIn === 0 && empty.cashOut === 0 && !empty.ledger.length, 'an empty wall costs nothing: no retainer');
ok(/no retainer/.test(empty.letters[0]?.body ?? ''), `and he says so: "${empty.letters[0]?.body.slice(0, 90)}…"`);
// an old save: a man taken on at the old weekly wage is paid on today's terms
const old = shopsWeek({ alexandria: { since: 1, paid: 80000, stock: [rug('cairo-garden')], agent: { ...shaw, wage: 120, share: undefined, since: 1 } } }, 15, 1000, () => 0.99);
ok(old.cashOut === shaw.wage, `an old save's agent takes today's retainer (${fmt(old.cashOut)})`);
// the letter and the account line
const full = shopsWeek({ alexandria: { since: 1, paid: 35000, stock: [rug('cairo-garden'), rug('cairo-garden'), rug('cairo-garden')], agent: { ...shaw, since: 1 } } }, 15, 1000, () => 0.01);
const last = full.shops.alexandria.last!;
ok(last.net === full.cashIn - full.cashOut && last.left === 3 - last.sold, `the week's account: ${weekAccount(last)}`);
ok(/The week's account: Sales £/.test(full.letters[0].body), 'his Monday letter ends with the account');
// one price for one kind of rug on one wall
const plain = rug('jaffa-citrus' in RUGS ? 'jaffa-citrus' : mid[0], { condition: 'Dirty' });
const faked = { ...plain, uid: 'x', fakeAge: true } as ShopRug;
ok(shopPrice('jaffa', plain, 0.8) === shopPrice('jaffa', faked, 0.8), `the same rug, the same price (${fmt(shopPrice('jaffa', plain, 0.8))})`);

console.log(fails ? `FAILED ${fails}` : 'PASS');
process.exit(fails ? 1 : 0);
