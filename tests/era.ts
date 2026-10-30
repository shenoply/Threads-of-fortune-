// The years 1926-30 (src/game/economy/era.ts): each era event's effect on the game's own numbers, the
// coffee-house talk before it, the journal line when it begins, and a year of trade through the slump
// against the year before it: harder, but a merchant who buys cheap comes through.
//   npx tsx tests/era.ts
const A = await import('../src/game/audio/engine');
for (const k of ['sfx', 'mood', 'music', 'ambience', 'ensure']) if (typeof (A.audio as unknown as Record<string, unknown>)[k] === 'function') (A.audio as unknown as Record<string, unknown>)[k] = () => false;
const { ERA_EVENTS, eraOn, eraFlag, timesOn, hintDay, eraSellMult } = await import('../src/game/economy/era');
const L = await import('../src/game/economy/life');
const { demandFor, supplyFor } = await import('../src/game/economy/market');
const { seasonCallers } = await import('../src/game/economy/seasons');
const { motorRoutesFrom } = await import('../src/game/systems/world');
const { setSeasonDay } = await import('../src/game/economy/calendar1925');
const { tightFrontier } = await import('../src/game/systems/customs');
const { offerPrice } = await import('../src/game/economy/economy');
const { RUGS } = await import('../src/data/rugs');
const { BUYER_ORDER } = await import('../src/data/buyers');
const { localOffersRaw } = await import('../src/game/state/store');
const S = await import('../src/game/state/store');
const { fmt } = await import('../src/game/economy/money');

let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fails++; };
const date = (day: number) => L.dateOfDay(day).toISOString().slice(0, 10);
const pct = (a: number, b: number) => `${b >= a ? '+' : ''}${Math.round((b / a - 1) * 100)}%`;

// ---- nothing changes in the first year before the new Shah ----
const first = Math.min(...ERA_EVENTS.map((e) => e.from));
ok(first >= L.dayOf(12, 12, 1925), `the first era event is ${date(first)}: the opening months play as before`);
ok(eraOn(L.dayOf(11, 1, 1925)).length === 0, 'no era effect in the first autumn');

// ---- every event: a story, a line for The times, and a measurable effect ----
const TOWNS = ['giza', 'cairo', 'alexandria', 'tanta', 'jerusalem', 'jaffa', 'beirut', 'damascus', 'baghdad', 'tehran', 'isfahan', 'kerman', 'istanbul'];
const SAMPLE = ['persian-kerman', 'persian-hamadan', 'persian-qashqai', 'cairo-garden', 'konya-prayer-rug', 'delta-house'];
type Snap = Record<string, number | string>;
function snap(day: number): Snap {
  setSeasonDay(day);
  const s: Snap = { budget: L.budgetMod(day), hollister: seasonCallers(day, 'hollister'), rustam: seasonCallers(day, 'rustam'), benakis: seasonCallers(day, 'benakis'), shivakiar: seasonCallers(day, 'shivakiar') };
  for (const id of SAMPLE) { s[`stall:${id}`] = demandFor(id, day); s[`rashid:${id}`] = supplyFor(id, day); }
  for (const t of TOWNS) {
    s[`bid:${t}`] = L.cityBidMod(day, t);
    for (const id of SAMPLE) { s[`bid:${t}:${id}`] = eraSellMult(day, id, t); s[`buy:${t}:${id}`] = L.cityBuyMod(day, t, id); }
    s[`shut:${t}`] = L.cityClosed(day, t) ? 1 : 0; s[`danger:${t}`] = L.dangerAt(day, t) ? 1 : 0;
    for (const e of L.eventDemand(day, t)) s[`want:${t}`] = e.mult;
  }
  for (const r of [...motorRoutesFrom('damascus'), ...motorRoutesFrom('baghdad')]) s[`motor:${r.to}`] = `${r.days}d ${r.fare}`;
  s.airmail = eraFlag(day, 'airmail') ? 1 : 0;
  s.frontierPersia = tightFrontier(day, 'persia') ? 1 : 0; s.frontierPal = tightFrontier(day, 'palestine') ? 1 : 0;
  s.lane = L.laneDay(day).extra;
  return s;
}
// a quiet day before each event to compare with: the eve, unless another era event starts or ends that day
for (const e of ERA_EVENTS) {
  const before = snap(e.from - 1), on = snap(e.from);
  const diffs = Object.keys(on).filter((k) => typeof on[k] === 'number' ? Math.abs((on[k] as number) - ((before[k] as number) ?? 1)) > 0.004 : on[k] !== before[k]);
  // the shifts this event itself makes (not the season's other events starting the same day)
  console.log(`\n  ${date(e.from)}  ${e.name}${e.to < 2200 ? ` (to ${date(e.to)})` : ' (to the end)'}${e.hint ? `, talk from ${date(hintDay(e))}` : ''}`);
  console.log(`    The times: ${e.times}`);
  for (const k of diffs.slice(0, 9)) console.log(`    ${k.padEnd(34)} ${typeof on[k] === 'number' ? `${(before[k] as number ?? 1).toFixed(2)} -> ${(on[k] as number).toFixed(2)}` : `${before[k]} -> ${on[k]}`}`);
  ok(!!e.article.headline && !!e.times && !!e.advice, `${e.id}: article, times line and advice`);
  ok(diffs.length > 0, `${e.id}: changes the game's numbers on its first day (${diffs.length} measures)`);
  if (e.hint) {
    const t = timesOn(hintDay(e));
    ok(t.talk.some((x) => x.id === e.id) && !timesOn(hintDay(e) - 1).talk.some((x) => x.id === e.id), `${e.id}: talk in the coffee houses ${e.hint.days} days ahead`);
  }
  ok(timesOn(e.from).now.some((x) => x.id === e.id) && !timesOn(e.from).talk.some((x) => x.id === e.id), `${e.id}: on The times from its first day, talk gone`);
}

// ---- specific effects that the brief asks for ----
const K = ERA_EVENTS.find((e) => e.id === 'era-kirkuk')!;
ok(L.cityBidMod(K.from, 'baghdad') > 1.15 * L.cityBidMod(K.from - 1, 'baghdad'), 'Kirkuk: Baghdad dealers pay much more');
ok(L.cityBuyMod(K.from, 'baghdad', 'cairo-garden') > L.cityBuyMod(K.from - 1, 'baghdad', 'cairo-garden'), 'Kirkuk: and prices in Baghdad are up');
ok(seasonCallers(K.from, 'rustam') > 1, 'Kirkuk: the Baghdad merchant comes to the stall more often');
setSeasonDay(L.dayOf(2, 1, 1927)); const n0 = motorRoutesFrom('damascus').find((r) => r.to === 'baghdad')!;
setSeasonDay(L.dayOf(4, 1, 1927)); const n1 = motorRoutesFrom('damascus').find((r) => r.to === 'baghdad')!;
ok(n1.days < n0.days && n1.fare < n0.fare, `Nairn: Damascus to Baghdad ${n0.days} -> ${n1.days} days, ${fmt(n0.fare)} -> ${fmt(n1.fare)}`);
setSeasonDay(L.dayOf(5, 1, 1928)); const p0 = motorRoutesFrom('baghdad').find((r) => r.to === 'tehran')!;
setSeasonDay(L.dayOf(7, 1, 1928)); const p1 = motorRoutesFrom('baghdad').find((r) => r.to === 'tehran')!;
ok(p1.days < p0.days, `the Shah's road: Baghdad to Tehran ${p0.days} -> ${p1.days} days`);
const R = ERA_EVENTS.find((e) => e.id === 'era-riots')!;
ok(L.cityClosed(R.from, 'jerusalem') && !!L.dangerAt(R.from, 'jaffa') && tightFrontier(R.from, 'palestine'), 'Palestine 1929: Jerusalem shut, soldiers at Jaffa, the frontier strict');
ok(L.cityBidMod(R.to + 10, 'jerusalem') < 0.9 && seasonCallers(R.to + 10, 'hollister') < 1, 'and after: Jerusalem pays less, the American buyer comes less');
const F = ERA_EVENTS.find((e) => e.id === 'era-fars')!;
ok(supplyFor('persian-qashqai', F.from) > supplyFor('persian-qashqai', F.from - 1) * 1.15 && demandFor('persian-qashqai', F.from) > demandFor('persian-qashqai', F.from - 1) * 1.15, 'Fars 1929: Qashqai rugs scarce: dearer to buy and to sell');
const sl = L.dayOf(5, 20, 1930), bo = L.dayOf(1, 15, 1929);
ok(seasonCallers(sl, 'hollister') < 0.3 && seasonCallers(bo, 'hollister') > 1.5, `the American collector: ${seasonCallers(bo, 'hollister').toFixed(2)} in the boom winter, ${seasonCallers(sl, 'hollister').toFixed(2)} in the slump`);
ok(L.budgetMod(sl) < 0.92, `the slump: stall purses ${pct(1, L.budgetMod(sl))} on an ordinary day in May 1930`);
const T = ERA_EVENTS.find((e) => e.id === 'era-tariff')!;
ok(L.cityBuyMod(T.from, 'kerman', 'persian-kerman') < 0.65, `the American tariff: a Kerman carpet in Kerman ${pct(1, L.cityBuyMod(T.from, 'kerman', 'persian-kerman'))}`);
const C = ERA_EVENTS.find((e) => e.id === 'era-cotton30')!;
ok(L.cityBidMod(C.from + 10, 'tanta') < 0.8 * L.cityBidMod(L.dayOf(9, 11, 1928), 'tanta'), `cotton at the bottom: Tanta at harvest time ${L.cityBidMod(L.dayOf(9, 11, 1928), 'tanta').toFixed(2)} in 1928, ${L.cityBidMod(C.from + 10, 'tanta').toFixed(2)} in 1930`);

// ---- bargains for the cash-rich: the town markets in 1930 against 1928 ----
let b28 = 0, b30 = 0;
for (const t of ['damascus', 'baghdad', 'tehran', 'kerman', 'alexandria', 'beirut']) {
  for (const o of localOffersRaw(t, L.dayOf(6, 10, 1928), [], [], 100)) b28 += o.price;
  for (const o of localOffersRaw(t, L.dayOf(6, 10, 1930), [], [], 100)) b30 += o.price;
}
console.log(`\n     six town markets, everything on offer: ${fmt(b28)} in June 1928, ${fmt(b30)} in June 1930 (${pct(b28, b30)})`);
ok(b30 < b28 * 0.9, 'the slump: stock in the towns is much cheaper for a merchant with cash');

// ---- a year at the stall through the slump, against the year before ----
// A model built on the game's own prices: each day at the Giza stall a few buyers come (the lane and who
// comes in the season); each sale is a rug bought from Rashid at today's price and sold at its middling value
// times the stall's mood (purses, fashion, the times). Bills on the first of the month: a bazaar stall at the
// third rank. The mix is what a merchant of the middle game carries.
const MIX: [string, number][] = [['delta-house', 2], ['red-medina', 2], ['persian-hamadan', 2], ['cairo-garden', 2], ['persian-heriz', 1], ['damascus-blue', 1], ['persian-sarouk', 1], ['persian-kerman', 1], ['konya-prayer-rug', 1], ['golden-palm', 1]];
const W = MIX.reduce((a, [, w]) => a + w, 0);
function year(from: number, days: number) {
  let cash = 30000, low = cash, sales = 0, gross = 0;
  for (let day = from; day < from + days; day++) {
    if (L.isFirstOfMonth(day)) cash -= L.billTotal(L.monthlyBill(['mat', 'bazaar'], 2, 6));
    const lane = L.laneDay(day);
    const pull = BUYER_ORDER.reduce((a, id) => a + seasonCallers(day, id), 0) / BUYER_ORDER.length;
    const buyers = Math.max(0, 4 + lane.extra) * pull;
    for (const [id, w] of MIX) {
      const n = buyers * 0.55 * w / W; // about one buyer in two buys
      const t = RUGS[id];
      const cost = offerPrice(id, 'Good') * supplyFor(id, day);
      const price = ((t.valueBand[0] + t.valueBand[1]) / 2) * demandFor(id, day) * Math.min(1.15, Math.max(0.8, L.budgetMod(day)));
      cash += n * (price - cost); sales += n; gross += n * (price - cost);
    }
    low = Math.min(low, cash);
  }
  return { cash, low, sales: Math.round(sales), gross: Math.round(gross) };
}
const boom = year(L.dayOf(11, 1, 1928), 365), slump = year(L.dayOf(12, 1, 1929), 365);
console.log(`     Nov 1928-Oct 1929: ${boom.sales} sales, margin ${fmt(boom.gross)}, purse ${fmt(30000)} -> ${fmt(Math.round(boom.cash))}`);
console.log(`     Dec 1929-Nov 1930: ${slump.sales} sales, margin ${fmt(slump.gross)} (${pct(boom.gross, slump.gross)}), purse ${fmt(30000)} -> ${fmt(Math.round(slump.cash))}, lowest ${fmt(Math.round(slump.low))}`);
ok(slump.gross < boom.gross * 0.85, 'the slump year is clearly harder than the boom year');
ok(slump.cash > 0 && slump.low > 0, 'but a merchant who keeps trading comes through it with money in the purse');
ok(slump.cash > 30000, 'and still ends the year ahead of where he began');

// ---- the night: talk in the morning notes and the journal; The times line when it begins ----
const { useGame } = S;
const g = () => useGame.getState();
g().newGame?.();
useGame.setState({ started: true, tutorial: { done: true, step: 'done', inspected: true }, levelUps: [], titleNews: [], sim: { illness: false, injuries: false, needs: false }, missions: { alexandria: 'done', beasts: 'done', farid: 'done' }, cash: 100000, reputation: 30 } as never);
useGame.setState({ day: hintDay(K) - 1, dayOver: false } as never);
g().endDay();
ok(g().journal.some((j) => j.kind === 'times' && /^Talk in the coffee houses: The drillers at Baba Gurgur/.test(j.text)), 'the talk of Kirkuk goes in the journal the night it starts');
useGame.setState({ day: K.from - 1, dayOver: false } as never);
g().endDay();
ok(g().journal.some((j) => j.kind === 'times' && j.text.startsWith('The times: Oil at Baba Gurgur')), 'and the oil strike itself when it comes');
const { paperFor } = await import('../src/game/economy/newspaper');
const paper = paperFor(K.from);
ok(paper.lead.headline === 'Oil Gushes at Kirkuk' && paper.times.now.some((x) => x.id === 'era-kirkuk'), `the Courier leads with it: "${paper.lead.headline}", and The times says so`);

console.log(fails ? `\n${fails} FAILED` : '\nall ok');
process.exit(fails ? 1 : 0);
