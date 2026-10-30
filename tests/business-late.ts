// The late business: freight from the stall to a shop (several rugs, one wire), bankruptcy that does what
// it says (trade debts cancelled, stock and shop walls taken, the father's debt stretched, the rugs left
// counted right), the season's end with a purse for the first three, paying the month's bill, the badge.
//   npx tsx tests/business-late.ts
// no browser: the sound engine is silenced (it would look for an AudioContext)
const A = await import('../src/game/audio/engine');
for (const k of ['sfx', 'mood', 'music', 'ambience', 'ensure']) if (typeof (A.audio as unknown as Record<string, unknown>)[k] === 'function') (A.audio as unknown as Record<string, unknown>)[k] = () => false;
const S = await import('../src/game/state/store');
const R = await import('../src/game/systems/ranks');
const E = await import('../src/game/economy/economy');
const P = await import('../src/game/systems/post');
const { useGame } = S;
const g = () => useGame.getState();
const set = (x: Partial<ReturnType<typeof g>>) => useGame.setState(x);

let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fails++; };
let n = 0;
const rug = (typeId = 'cairo-garden', extra = {}) => ({ uid: `t${n++}`, typeId, condition: 'Good' as const, restored: false, provenance: 'Likely' as const, paid: 500, notes: [], stored: false, ...extra });
const fresh = (over: Partial<ReturnType<typeof g>> = {}) => {
  g().newGame?.();
  set({ started: true, tutorial: { done: true, step: 'done', inspected: true }, levelUps: [], titleNews: [], sim: { illness: false, injuries: false, needs: false },
    missions: { alexandria: 'done', beasts: 'done', farid: 'done' }, day: 40, cash: 100000, reputation: 30, ...over } as never);
};

// ---- freight: six rugs from the stall to Jaffa, one wire ----
fresh();
const stored = Array.from({ length: 6 }, () => rug('cairo-garden', { stored: true }));
set({ inventory: stored, shops: { jaffa: { since: 1, paid: 17000, stock: [] } }, world: { ...g().world, at: 'cairo', hour: 10 } });
const c0 = g().cash;
const msg = g().railStock('jaffa', stored.map((r) => r.uid));
ok(g().shops!.jaffa.stock.length === 6 && g().inventory.length === 0, `six rugs go by rail in one consignment: "${msg}"`);
ok(c0 - g().cash === 6 * 80 + P.telegramFee('cairo', 'giza'), `freight £0.80 a rug abroad and one wire (${c0 - g().cash})`);
// from the shop itself (Jaffa has no telegraph office): your agent wires the boy
set({ inventory: [rug('cairo-garden', { stored: true })], world: { ...g().world, at: 'jaffa' } });
ok(/train/.test(g().railStock('jaffa', g().inventory[0].uid)), 'and from the shop itself');

// ---- bankruptcy ----
fresh();
let d = 40;
while (E.dateFor(d + 1).weekday === 'Monday' || E.dateFor(d + 1).short.startsWith('1 ')) d++;
set({
  day: d, cash: 0, inventory: [rug('cairo-garden'), rug('nile-reed'), rug('delta-house'), rug('cairo-garden'), rug('nile-reed')],
  supplier: { ...g().supplier, debt: 2000, debtDue: d - 10 },
  loans: [{ id: 'l1', lender: 'khan', principal: 1000, owed: 1250, taken: d - 40, due: d - 10 }],
  bills: { due: 3000, since: d - 20, warned: 1 },
  family: { left: 6500, due: 2500, since: d - 20, paid: 3500 },
  shops: { jaffa: { since: 1, paid: 17000, stock: [rug('cairo-garden'), rug('cairo-garden')], agent: { id: 'haddad', name: 'Elias Shalhoub', honesty: 0.8, skill: 0.6, wage: 30, share: 0.12, since: 1 } } },
  ruin: { stage: 2, since: d - 30 }, bankruptcies: 0, world: { ...g().world, at: 'giza', hour: 19 },
} as never);
g().endDay();
const bk = [...g().journal].reverse().find((j) => /Mixed Court declares you bankrupt/.test(j.text))?.text ?? '';
console.log('   ', bk);
ok(!!bk, 'the court declares you bankrupt');
ok(/cancels the debts of your trade/.test(bk) && /Rashid's credit for stock \(£20\)/.test(bk) && /Stavros/.test(bk) && /unpaid bill/.test(bk), 'the text names the debts cancelled');
ok(g().supplier.debt === 0 && !(g().loans ?? []).length && (g().bills?.due ?? 0) === 0, 'and they are cancelled');
ok(g().inventory.length === 3 && /except the three poorest rugs/.test(bk), `three of five rugs are left, and it says so (${g().inventory.length})`);
ok(g().shops!.jaffa.stock.length === 0 && /walls of your shop in Jaffa/.test(bk), 'the shop wall is taken, and it says so');
ok(g().family!.left === 6500 && g().family!.due === 0 && (g().family!.restUntil ?? 0) > g().day, `the father's debt stands, nothing due (${g().family!.left})`);
ok(/£65 is still owed/.test(bk) && /nothing is due before/.test(bk), 'and it says so');
// the next first of the month brings no instalment while the debt is stretched
let day = g().day;
while (!E.dateFor(day).short.startsWith('1 ')) day++;
set({ day: day - 1, world: { ...g().world, at: 'giza', hour: 19 } });
g().endDay();
ok(g().family!.due === 0, `no instalment on ${E.dateFor(g().day).short}`);

// one rug: "you keep the one you had", never "three poor rugs"
fresh();
set({ day: d, cash: 0, inventory: [rug('nile-reed')], bills: { due: 3000, since: d - 20, warned: 1 }, family: { left: 0, due: 0, since: 0, paid: 10000 }, ruin: { stage: 2, since: d - 30 }, bankruptcies: 0, world: { ...g().world, at: 'giza', hour: 19 } } as never);
g().endDay();
const bk1 = [...g().journal].reverse().find((j) => /Mixed Court declares you bankrupt/.test(j.text))?.text ?? '';
ok(/keep the one you had/.test(bk1) && !/three poor/.test(bk1) && !/father's debt/.test(bk1), `one rug, and no father's debt left: "${bk1.slice(0, 160)}…"`);

// ---- the season's end: places, a purse for the first three, the season to come ----
fresh();
const end = R.seasonEnd(0);
set({ day: end, cash: 5000, reputation: 30, ranks: { season: 0, tables: { cairo: { you: 50_000_000 } }, seen: ['cairo'], firsts: [], reacted: [] }, world: { ...g().world, at: 'giza', hour: 19 } } as never);
const rep0 = g().reputation;
g().endDay();
const last = g().ranks!.last!;
ok(last.places.cairo === 1 && last.prizes?.cairo?.cash === R.SEASON_PRIZE[1].cash, `first in Cairo: a purse of ${R.SEASON_PRIZE[1].cash}`);
ok(g().ledger.some((l) => /season's purse/.test(l.label) && l.amount === R.SEASON_PRIZE[1].cash), 'the purse is in the ledger');
ok(g().reputation >= rep0 + R.SEASON_PRIZE[1].rep - 1, `and the name: reputation ${rep0} -> ${g().reputation}`);
ok(/summer season/.test(R.seasonAhead(last.season + 1)), `the season to come: "${R.seasonAhead(last.season + 1).slice(0, 60)}…"`);

// ---- paying the month's bill now ----
fresh();
set({ cash: 5000, bills: { due: 1200, since: 38, warned: 0 } });
const pb = g().payBills();
ok(g().cash === 3800 && g().bills!.due === 0, `the bill is paid now: "${pb}"`);

// ---- the post badge ----
ok(P.badgeText(29) === '9+' && P.badgeText(3) === '3', 'the badge never shows more than 9+');

console.log(fails ? `FAILED ${fails}` : 'PASS');
process.exit(fails ? 1 : 0);
