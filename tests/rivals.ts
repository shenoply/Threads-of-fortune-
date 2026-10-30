// The rival houses (systems/houses.ts): every move a house can make, every answer you can give, a house
// going under and its stock sold, the price effects in the towns and at the stall, the save migration,
// and 200 days left to run on their own without the economy running away.
//   npx tsx tests/rivals.ts
const A = await import('../src/game/audio/engine');
for (const k of ['sfx', 'mood', 'music', 'ambience', 'ensure']) if (typeof (A.audio as unknown as Record<string, unknown>)[k] === 'function') (A.audio as unknown as Record<string, unknown>)[k] = () => false;
const S = await import('../src/game/state/store');
const H = await import('../src/game/systems/houses');
const FX = await import('../src/game/systems/houseFx');
const R = await import('../src/game/systems/ranks');
const N = await import('../src/game/systems/negotiation');
const { skipDays } = await import('../src/game/testerHook');
const { useGame } = S;
const g = () => useGame.getState();
const set = (x: Partial<ReturnType<typeof g>>) => useGame.setState(x);

let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fails++; };
const fresh = (over: Partial<ReturnType<typeof g>> = {}) => {
  g().reset();
  set({ started: true, tutorial: { done: true, step: 'done', inspected: true }, levelUps: [], titleNews: [], sim: { illness: false, injuries: false, needs: false },
    missions: { alexandria: 'done', beasts: 'done', farid: 'done' }, day: 40, cash: 100000, reputation: 30, worldSeed: 12345, ...over } as never);
};
const hs = () => H.housesOf(g());
const force = (id: string, kind: Parameters<typeof H.forceMove>[2]) => { const r = H.forceMove(g(), id, kind); set(r.patch); return r.text; };
const act = (k: Parameters<typeof H.houseCounter>[1], id: string, arg?: string) => g().houseAct(k, id, arg);

// ---- the houses ----
ok(H.HOUSES.length >= 4 && H.HOUSES.length <= 6, `${H.HOUSES.length} rival houses, and Shukri across the lane`);
ok(new Set(H.HOUSES.map((d) => d.rival)).size === H.HOUSES.length, 'each house its own face and name');
ok(H.HOUSES.some((d) => d.smuggler), 'one of them smuggles');

// ---- undercut, and cutting back ----
fresh({ world: { ...g().world, at: 'giza' } as never });
let t = force('selim', 'undercut');
ok(!!hs().cut && hs().cut!.city === 'cairo' && g().ranks?.undercut?.cairo?.by === 'rival-selim', `Selim cuts his prices in Cairo: "${t}"`);
ok(FX.HOUSE_FX.pay === H.CUT_PAY, `buyers at the Giza stall offer less (${FX.HOUSE_FX.pay})`);
ok(R.undercutBid(g(), 'cairo', 1000) < 1000, 'and the Cairo dealers bid less');
let c0 = g().cash; const sp0 = hs().list.selim.purse;
t = act('undercut-back', 'selim');
ok(!hs().cut && !g().ranks?.undercut?.cairo && g().cash < c0 && hs().list.selim.purse < sp0, `you cut back, it costs you and him, and he stops: "${t}"`);
ok(FX.HOUSE_FX.pay === 1, 'buyers offer as usual again');

// ---- a line bought up, and buying him out ----
fresh();
t = force('lucia', 'corner');
const corner = hs().corners[0];
ok(!!corner, `Signora Valenti buys up a line: "${t}"`);
const plain = H.lineAsk(corner.town, corner.typeId);
const offers = S.localOffersRaw(corner.town, g().day, [], [], 30);
const o = offers.find((x) => x.typeId === corner.typeId)!;
ok(!!o && o.price > plain, `the line costs more at ${corner.town} (${o?.price} against ${plain})`);
FX.HOUSE_FX.corners = [];
const before = S.localOffersRaw(corner.town, g().day, [], [], 30).find((x) => x.typeId === corner.typeId)!;
H.syncHouseFx(g());
ok(o.left < before.left || before.left === 1, `and the dealer has fewer (${o.left} against ${before.left})`);
c0 = g().cash; const inv0 = g().inventory.length;
t = act('buy-out', 'lucia', corner.town);
ok(hs().corners.length === 0 && g().inventory.length === inv0 + 3 && g().cash === c0 - H.buyoutCost(corner) && g().inventory.slice(-3).every((r) => r.stored), `you buy her out of the line: three rugs to the store: "${t}"`);
ok(S.localOffersRaw(corner.town, g().day, [], [], 30).find((x) => x.typeId === corner.typeId)!.price <= before.price, 'and the price is back to usual');

// ---- a regular courted: kept with a gift, or lost and won back ----
fresh({ relationships: { ...g().relationships, benakis: { visits: 5, purchases: 4, spent: 4000, affinity: 30, bad: 0, lastLines: [], lastPurchaseDay: 30 } } } as never);
t = force('selim', 'court');
ok(hs().courted.length === 1 && hs().courted[0].buyer === 'benakis', `Selim calls on your regular: "${t}"`);
t = act('gift', 'selim', 'benakis');
ok(hs().courted.length === 0 && !hs().defected.benakis, `a gift keeps him: "${t}"`);
force('selim', 'court');
const until = hs().courted[0].until;
set({ day: until, dayOver: false });
skipDays(1);
ok(!!hs().defected.benakis, `left alone, he goes over to Selim`);
set({ queue: ['benakis', 'samira'] });
skipDays(1);
ok(!g().queue.includes('benakis'), `and stops coming to your stall (queue: ${g().queue.join(', ')})`);
t = act('win-back', 'selim', 'benakis');
ok(!hs().defected.benakis, `you win him back: "${t}"`);
// a sale to him while he is courted keeps him too
force('selim', 'court');
set({ relationships: { ...g().relationships, benakis: { ...g().relationships.benakis, lastPurchaseDay: g().day } } });
skipDays(1);
ok(!hs().courted.length && !hs().defected.benakis, 'a sale to him while courted keeps him');

// ---- a shop opened ----
fresh({ whereabouts: { 39: 'cairo' } } as never);
t = force('lucia', 'shop');
ok(hs().list.lucia.shop === 'cairo' && FX.HOUSE_FX.shops.cairo === 'lucia', `Signora Valenti opens a shop where you trade: "${t}"`);
ok(Object.keys(H.houseMarks(g())).includes('cairo'), 'and it shows on the map');
const rug = { uid: 'x1', typeId: 'cairo-garden', condition: 'Good' as const, restored: false, provenance: 'Likely' as const, paid: 100, notes: [], stored: false };
const withShop = S.localBid('cairo', rug, g().day);
FX.HOUSE_FX.shops = {};
const noShop = S.localBid('cairo', rug, g().day);
H.syncHouseFx(g());
ok(withShop < noShop, `Cairo dealers pay you less beside her shop (${withShop} against ${noShop})`);

// ---- the boy hired away; matched, or lost ----
fresh({ shopBoy: { hired: true, since: 30, trust: 10, mode: 'wait', pct: 0.9, owed: 0, report: [], sales: [], short: 0, days: 10 } } as never);
t = force('yanni', 'hire');
ok(hs().poach?.who === 'boy', `Yanni offers your boy more: "${t}"`);
t = act('match', 'yanni');
ok(!hs().poach && g().shopBoy!.hired, `you pay him to stay: "${t}"`);
force('yanni', 'hire');
set({ day: hs().poach!.until, dayOver: false });
skipDays(1);
ok(!g().shopBoy!.hired, 'left unmatched, the boy goes');
// an agent
fresh({ shops: { alexandria: { since: 1, paid: 0, stock: [], agent: { id: 'a1', name: 'Elias Shalhoub', honesty: 0.8, skill: 0.6, wage: 30, since: 1 } } } } as never);
t = force('selim', 'hire');
ok(hs().poach?.who === 'agent', `or your agent: "${t}"`);
set({ day: hs().poach!.until, dayOver: false });
skipDays(1);
ok(!g().shops!.alexandria.agent, 'and the agent goes if you let him');

// ---- a rumour after a lie caught, and answering it ----
fresh({ stats: { liesCaught: 1 } } as never);
const rep0 = g().reputation;
t = force('yanni', 'rumour');
ok(!!hs().rumour && g().reputation === rep0 - 1 && FX.HOUSE_FX.pay === H.RUMOUR_PAY, `Yanni spreads a rumour: "${t}"`);
// the rumour bears on what a buyer offers
const enc = N.startEncounter('samira', { reputation: 30, upgrades: [], inventory: [], rng: () => 0.5, day: 40, rel: { visits: 0, purchases: 0, spent: 0, affinity: 0, bad: 0, lastLines: [] } } as never, [], false);
const w1 = N.wtp({ ...enc, interest: 60, day: 40 } as never, rug as never);
t = act('answer', 'yanni');
const w2 = N.wtp({ ...enc, interest: 60, day: 40 } as never, rug as never);
ok(!hs().rumour && w2 > w1, `answered in the Courier, offers come back (${w1} -> ${w2}): "${t}"`);
// no lie caught, no rumour
fresh({ stats: { liesCaught: 0 } } as never);
set({ houses: { ...H.freshHouses(40), liesSeen: 0 } });
const nat = (() => { for (let i = 0; i < 60; i++) skipDays(1); return hs().log.some((l) => /caught lying/.test(l.text)); })();
ok(!nat, 'an honest merchant is never rumoured about');

// ---- the police, a partnership ----
fresh();
const yp = hs().list.yanni.purse;
t = act('tip', 'yanni');
const tipped = hs().list.yanni;
ok(tipped.tipped === g().day && (tipped.purse < yp || g().reputation < 30), `the customs police are told about Yanni: "${t}"`);
ok(/not act on your word again/.test(act('tip', 'yanni')), 'and will not act again soon');
ok(/find nothing/.test(act('tip', 'lucia')), 'an honest house cannot be informed on');
// a truce: try on successive days until one says yes
fresh();
let tr = '', tries = 0;
for (let d = 40; d < 200 && !(hs().list.shami.truce! >= g().day); d += 15) { set({ day: d }); tr = act('truce', 'shami'); tries++; }
ok((hs().list.shami.truce ?? 0) >= g().day, `Abu Nadim agrees to share the road (after ${tries} asking): "${tr}"`);
ok(FX.HOUSE_FX.partners.includes('damascus'), 'the dealers of Damascus pay you a little more');
ok(H.forceMove(g(), 'shami', 'court').text.includes('cannot'), 'and he will not move against you');

// ---- a house goes under; its stock sold ----
fresh();
t = force('selim', 'gone');
ok(hs().list.selim.status === 'gone' && !!hs().sale && hs().sale!.rugs.length > 0, `Selim's house fails: "${t}"`);
ok(!R.standings(g().ranks, 'cairo').some((r) => r.id === 'rival-selim'), 'and leaves the Cairo table');
const n0 = g().inventory.length; c0 = g().cash; const price = hs().sale!.rugs[0].price;
t = act('buy-stock', 'selim', '0');
ok(g().inventory.length === n0 + 1 && g().cash === c0 - price, `you buy from his creditors: "${t}"`);
// a house can fail by itself: a purse in debt for long enough
fresh();
set({ houses: { ...hs(), list: { ...hs().list, yanni: { ...hs().list.yanni, purse: -100, stock: 0 } } } });
skipDays(1);
ok(hs().list.yanni.status === 'failing', 'a house in debt starts failing');
set({ houses: { ...hs(), list: { ...hs().list, yanni: { ...hs().list.yanni, purse: -9000 } } } });
skipDays(1);
ok(hs().list.yanni.status === 'gone', 'and goes under when it is deep enough in');

// ---- auctions: a house bids against you ----
fresh();
const bid = H.houseBidders(g(), 'cairo', 'grand');
ok(bid.length >= 1 && bid.every((b) => b.budget > 0), `${bid.map((b) => b.name).join(', ')} sit in a Cairo estate sale`);

// ---- save migration ----
const old = { started: true, day: 120 } as Record<string, unknown>;
const mig = (useGame as unknown as { persist: { getOptions: () => { migrate: (p: unknown, v: number) => Record<string, unknown> } } }).persist.getOptions().migrate(old, 29);
ok(!!(mig.houses as { list?: object })?.list && Object.keys((mig.houses as { list: object }).list).length === H.HOUSES.length, 'an older save gets the houses');

// ---- 200 days on their own ----
fresh({ day: 10, cash: 5000, world: { ...g().world, at: 'giza' } as never });
const cash0 = g().cash;
let maxPurse = 0, moves = 0, maxMult = 1, sane = true;
for (let i = 0; i < 200; i++) {
  skipDays(1);
  const h = hs();
  for (const st of Object.values(h.list)) { maxPurse = Math.max(maxPurse, st.purse); if (!(Number.isFinite(st.purse) && st.stock >= 0 && st.rep >= 0 && st.rep <= 100)) sane = false; }
  moves = h.log.length;
  maxMult = Math.max(maxMult, ...h.corners.map((c) => FX.houseAsk(c.town, c.typeId, g().day)));
}
const h = hs();
console.log('   after 200 days:', Object.entries(h.list).map(([id, st]) => `${id} ${st.status} purse ${st.purse} stock ${st.stock} rep ${st.rep}`).join('; '));
console.log('   the talk:', h.log.slice(-6).map((l) => l.text.slice(0, 70)).join(' | '));
ok(sane, 'every purse, stock and name stays a number in bounds');
ok(maxPurse <= 80000, `no purse runs away (top ${maxPurse})`);
ok(moves >= 5 && moves <= 40, `the houses moved, but not every day (${h.log.length} lines kept)`);
ok(maxMult <= FX.CORNER_PRICE, 'prices rise a quarter at most');
ok(Number.isFinite(g().cash) && Math.abs(g().cash - cash0) < 200000, `your purse is still a purse (${cash0} -> ${g().cash})`);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
