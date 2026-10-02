// Headless economy simulation: three player styles over 60 game days.
// Bundle: npx esbuild tests/sim/economy.ts --bundle --platform=node --format=esm --outfile=tests/sim/.sim.mjs && node tests/sim/.sim.mjs
// Uses the real data modules. The store (src/game/state/store.ts) pulls in the audio engine, so the few store
// formulas the sim needs are replicated here with the store line they come from (line numbers as of this writing).
import { readFileSync } from 'node:fs';
import { RUGS, CONDITION_FACTOR } from '../../src/data/rugs';
import { BUYERS, BUYER_ORDER, BUYER_UNLOCK, BUYER_TIERS, CELEB_IDS, CELEB_INFO, celebUnlock } from '../../src/data/buyers';
import { rashidStock, startingInventory } from '../../src/game/economy/economy';
import { monthlyBill, billTotal, isFirstOfMonth, budgetMod, cityBuyMod, cityClosed } from '../../src/game/economy/life';
import { rankOf, netWorth, stockValue } from '../../src/game/economy/progress';
import { JOBS, openJobs, newVisit, type Visit } from '../../src/data/jobs';
import { TROOPS, MARKETS } from '../../src/data/caravan';
import { BREEDS, ANIMAL_MARKETS } from '../../src/data/animals';
import { fitScore, prefsFor, perceivedValue } from '../../src/game/systems/negotiation';
import { railJourney, settlementById } from '../../src/game/systems/world';
import { UPGRADES, restoreCost, RESTORATION, rashidCredit, RASHID_PROFILE } from '../../src/data/suppliers';
import { MISSIONS } from '../../src/data/missions';
import { snap, snapDown } from '../../src/game/economy/money';
import type { RugItem, Condition } from '../../src/game/types';

// ---- constants read from the store source so a tuning edit there is picked up without importing it ----
const STORE = readFileSync(new URL('../../src/game/state/store.ts', import.meta.url), 'utf8');
// SIM_<NAME> environment variables override for quick what-if runs (tuning only)
const num = (re: RegExp, dflt: number, env?: string) => { if (env && process.env[`SIM_${env}`]) return Number(process.env[`SIM_${env}`]); const m = STORE.match(re); return m ? Number(m[1]) : dflt; };
const FAMILY_LEFT = num(/FAMILY_START = \{ left: (\d+)/, 10000, 'FAMILY'); // store.ts:43
const FAMILY_INSTALMENT = num(/FAMILY_INSTALMENT = (\d+)/, 600, 'INSTALMENT'); // store.ts:44
const START_CASH = num(/cash: (\d+),\s*\n\s*reputation: 0/, 120); // store.ts:316
const QUEUE_BASE = num(/queue = queue\.slice\(0, (\d+) \+/, 3); // store.ts:684
const QUEUE_EXTRA_P = num(/\(rng\(\) < (0\.\d+) \? 1 : 0\)\);/, 0.3); // store.ts:684

// ---- seeded rng ----
function mulberry(a: number) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---- replicated store formulas ----
const rankNeeded = (id: string) => { const t = BUYER_TIERS[id]?.[0] ?? 1; return t >= 3 ? 2 : t === 2 ? 1 : 0; }; // store.ts:42
const tierOfRug = (i: RugItem) => RUGS[i.typeId]?.tier ?? 1;
const midValue = (typeId: string, c: Condition) => { const t = RUGS[typeId]; return ((t.valueBand[0] + t.valueBand[1]) / 2) * CONDITION_FACTOR[c]; };
function localOffers(sid: string, day: number, rep: number) { // store.ts:263
  const st = settlementById(sid);
  if (cityClosed(day, sid)) return [];
  return st.sells.filter((o, i) => (o.minRep ?? 0) <= rep && (o.chance === undefined || Math.abs(Math.sin((day * 17 + i * 101 + sid.length * 7) * 78.233)) % 1 < o.chance)).map((o, i) => {
    const h = Math.abs(Math.sin((day * 31 + i * 7 + sid.length * 13) * 12.9898)) % 1;
    const condition: Condition = h < 0.2 ? 'Dirty' : h < 0.32 ? 'Worn' : 'Good';
    const t = RUGS[o.typeId];
    const price = snap(t.dealerCost * o.factor * CONDITION_FACTOR[condition] * cityBuyMod(day, sid));
    return { typeId: o.typeId, condition, price, qty: (t.tier ?? 1) === 1 ? 3 : (t.tier ?? 1) === 2 ? 2 : 1 };
  });
}
const animalPrice = (sid: string, breed: string) => { const e = ANIMAL_MARKETS[sid]?.find(([id]) => id === breed); return e ? snap(BREEDS[breed].price * e[1]) : undefined; }; // store.ts:289

// ---- styles ----
interface Style {
  name: string;
  priceK: number; // share of wtp the player gets on average
  argBoost: number; // interest won by arguments and the objection
  travel: boolean;
  haggleRashid: boolean;
  credit: boolean;
  stockTarget: number; // rugs kept at the stall
  minMargin: number; // expected margin over price before buying
  localBuy: boolean; // buys cheap stock in other towns
  pMul?: number; // how often a talk ends in a sale, against a good player
}
const STYLES: Style[] = [
  // sensitivity check: a clumsy stall keeper (lower prices, more walk-outs)
  { name: 'stall-weak', priceK: 0.8, argBoost: 2, travel: false, haggleRashid: false, credit: false, stockTarget: 4, minMargin: 1.3, localBuy: false, pMul: 0.75 },
  { name: 'stall-only', priceK: 0.85, argBoost: 6, travel: false, haggleRashid: false, credit: false, stockTarget: 5, minMargin: 1.3, localBuy: false },
  { name: 'balanced', priceK: 0.88, argBoost: 9, travel: true, haggleRashid: true, credit: false, stockTarget: 6, minMargin: 1.3, localBuy: true },
  { name: 'aggressive', priceK: 0.92, argBoost: 12, travel: true, haggleRashid: true, credit: true, stockTarget: 9, minMargin: 1.2, localBuy: true },
];

interface Rel { visits: number; purchases: number; affinity: number; lastPurchaseDay?: number }
interface S {
  day: number; cash: number; reputation: number; inventory: RugItem[]; upgrades: string[];
  supplier: { debt: number; debtDue: number; trust: number }; court: { warrants: string[] }; missions: Record<string, string>;
  family: { left: number; due: number; since: number; paid: number; late: number };
  bills: { due: number; since: number };
  rel: Record<string, Rel>; jobsDone: string[]; visits: Visit[];
  animals: Record<string, number>; troops: Record<string, number>;
  stats: { stallSales: number; visitorSales: number; jobSales: number; jobCash: number; errandCash: number; travelDays: number; fares: number; wages: number; bestDay: number };
  cash22?: number; early: number[]; firstAnimalDay?: number; firstGuardDay?: number; rank1Day?: number; minCash: number; instalmentOk: boolean[];
  log: string[];
}
let uid = 0;
const item = (typeId: string, condition: Condition, paid: number, stored = true): RugItem => ({ uid: `u${uid++}`, typeId, condition, restored: false, provenance: RUGS[typeId].provenance, paid, notes: [], stored });

function newState(): S {
  return {
    day: 1, cash: START_CASH, reputation: 0, inventory: startingInventory().map((i) => ({ ...i })), upgrades: [],
    supplier: { debt: 0, debtDue: 0, trust: 20 }, court: { warrants: [] }, missions: {},
    family: { left: FAMILY_LEFT, due: 0, since: 0, paid: 0, late: 0 }, bills: { due: 0, since: 0 },
    rel: {}, jobsDone: [], visits: [], animals: {}, troops: {},
    stats: { stallSales: 0, visitorSales: 0, jobSales: 0, jobCash: 0, errandCash: 0, travelDays: 0, fares: 0, wages: 0, bestDay: 0 },
    minCash: START_CASH, instalmentOk: [], log: [], early: [],
  };
}
const rank = (s: S) => rankOf(s as never).idx;
const animalN = (s: S) => Object.values(s.animals).reduce((a, n) => a + n, 0);
const troopN = (s: S) => Object.values(s.troops).reduce((a, n) => a + n, 0);
const wagesOf = (s: S) => Object.entries(s.troops).reduce((a, [id, n]) => a + TROOPS[id].wage * n, 0);
const foodOf = (s: S) => Math.max(1, Math.round(1 + troopN(s) + Math.ceil(Object.entries(s.animals).reduce((a, [id, n]) => a + BREEDS[id].food * n, 0))));

/** Money that falls due on the next first of the month, and how many days away it is. */
function nextDue(s: S) {
  let d = s.day + 1; while (!isFirstOfMonth(d)) d++;
  const bill = billTotal(monthlyBill(s.upgrades, rank(s), s.inventory.filter((i) => i.stored).length));
  return { days: d - s.day, amount: bill + Math.min(FAMILY_INSTALMENT, s.family.left) + s.bills.due + s.family.due };
}

// ---- end of day: store.ts rollover (~line 528-610) ----
function rollover(s: S, at: string) {
  // rations bought in town at the market price, wages paid or men leave
  const food = Math.ceil(foodOf(s) * (MARKETS[at]?.food ?? 1.5));
  s.cash -= food;
  const pay = wagesOf(s);
  if (pay > 0) { if (s.cash >= pay) { s.cash -= pay; s.stats.wages += pay; } else s.troops = {}; }
  s.day += 1;
  if (isFirstOfMonth(s.day)) {
    const lines = monthlyBill(s.upgrades, rank(s), s.inventory.filter((i) => i.stored).length);
    s.bills = { due: s.bills.due + billTotal(lines), since: s.bills.due > 0 ? s.bills.since : s.day };
  }
  if (s.bills.due > 0) {
    if (s.cash >= s.bills.due) { s.cash -= s.bills.due; s.bills = { due: 0, since: 0 }; }
    else if (s.day - s.bills.since === 5) { s.bills.due = Math.round(s.bills.due * 1.1); s.reputation = Math.max(0, s.reputation - 3); }
  }
  let firstNow = false;
  if (isFirstOfMonth(s.day) && s.family.left > 0) {
    const inst = Math.min(FAMILY_INSTALMENT, s.family.left - s.family.due);
    if (inst > 0) { s.family.due += inst; s.family.since = s.family.due > inst ? s.family.since : s.day; firstNow = true; }
  }
  if (s.family.due > 0) {
    if (s.cash >= s.family.due) {
      s.cash -= s.family.due; s.family.left -= s.family.due; s.family.paid += s.family.due; s.family.due = 0;
      if (firstNow) s.instalmentOk.push(true);
    } else {
      if (firstNow) s.instalmentOk.push(false);
      if (s.day - s.family.since === 4) { s.supplier.trust = Math.max(0, s.supplier.trust - 10); s.family.late++; }
    }
  }
  if (s.supplier.debt > 0 && s.day > s.supplier.debtDue) { s.supplier.trust = Math.max(0, s.supplier.trust - 20); s.supplier.debtDue = s.day + 2; s.reputation = Math.max(0, s.reputation - 2); }
  s.inventory = s.inventory.map((i) => (i.restoringUntil && s.day >= i.restoringUntil ? { ...i, condition: i.restoreTo ?? 'Good', restored: true, restoringUntil: undefined, restoreTo: undefined } : i));
  // visitors (store.ts ~708)
  s.visits = s.visits.filter((v) => v.until >= s.day);
  if (s.visits.length < 2 && (s.visits.length === 0 || s.day % 2 === 0)) {
    const tierOf = { FINE: 2, EXCEPTIONAL: 3, LEGENDARY: 4 } as const;
    const celebs = CELEB_IDS.filter((id) => celebUnlock(id) <= s.reputation + 6).map((id) => ({ id, name: BUYERS[id].name, city: CELEB_INFO[id as keyof typeof CELEB_INFO].city, tier: tierOf[CELEB_INFO[id as keyof typeof CELEB_INFO].prestige], portrait: '' }));
    s.visits.push(newVisit(s.day, rank(s), RNG, celebs));
  }
  // main missions: the next one opens the day after the last one closes (store.ts ~697)
  const order = ['alexandria', 'beasts', 'farid'];
  const next = order.find((id) => s.missions[id] !== 'done');
  if (next && !s.missions[next]) s.missions[next] = 'active';
  s.minCash = Math.min(s.minCash, s.cash);
  const r = rank(s);
  if (r >= 1 && !s.rank1Day) s.rank1Day = s.day;
}

let RNG = mulberry(1);

// ---- a buyer at the stall ----
function encounter(s: S, st: Style, buyerId: string, soldToday: number) {
  const b = BUYERS[buyerId];
  const rel = (s.rel[buyerId] ??= { visits: 0, purchases: 0, affinity: 0 });
  rel.visits++;
  const tier = rel.purchases >= 4 && rel.affinity >= 40 ? 3 : rel.purchases >= 2 ? 2 : rel.purchases >= 1 || rel.visits >= 3 ? 1 : 0;
  const needIdx = rel.purchases % (b.needs.length + 1);
  const prefs = prefsFor({ buyerId, needIdx });
  const [minT] = BUYER_TIERS[buyerId] ?? [1, 1];
  const minTier = b.royal ? 3 : minT;
  const avail = s.inventory.filter((i) => !i.restoringUntil && i.stored);
  if (minTier >= 2 && Math.max(0, ...avail.map(tierOfRug)) < minTier) return; // mocked, leaves (negotiation.ts:268)
  const i0 = Math.min(100, b.interest + Math.min(10, Math.floor(s.reputation / 2)));
  const trust = Math.min(100, b.trust + tier * 8 + Math.round(rel.affinity / 5) + (s.upgrades.includes('mat') ? 6 : 0));
  const cap = prefs.budget[1] * (1 + tier * 0.06) * (s.upgrades.includes('bazaar') ? 1.08 : 1) * budgetMod(s.day);
  let best: { it: RugItem; price: number; fit: number; p: number; score: number } | undefined;
  for (const it of avail) {
    const t = RUGS[it.typeId];
    let fit = fitScore(prefs, t, it);
    if ((t.tier ?? 1) < minTier) fit = Math.min(25, fit);
    const interest = Math.min(100, 0.4 * i0 + 0.6 * fit + (s.upgrades.includes('display') ? 8 : 0) + st.argBoost);
    const factor = 0.72 + 0.45 * (interest / 100) + 0.15 * ((trust - 50) / 50); // negotiation.ts:152
    const wtp = Math.min(cap, perceivedValue(t, it) * factor);
    const k = (t.tier ?? 1) === 1 && !st.pMul ? Math.max(0.85, st.priceK) : st.priceK; // quickPrice floor for Common rugs (negotiation.ts:162)
    const price = snapDown(wtp * k);
    const p = (fit < 40 ? 0.35 : fit < 65 ? 0.75 : 0.92) * (st.pMul ?? 1); // chance the talk ends in a sale
    const score = p * (price - it.paid);
    if (price > it.paid && (!best || score > best.score)) best = { it, price, fit, p, score };
  }
  if (!best) { rel.affinity -= 4; return; }
  if (RNG() > best.p + (s.upgrades.includes('tea') ? 0.04 : 0)) { rel.affinity -= 4; return; }
  const t = RUGS[best.it.typeId];
  s.cash += best.price;
  s.inventory = s.inventory.filter((i) => i !== best!.it);
  s.reputation += 1 + (best.fit >= 80 ? 1 : 0) - (best.fit < 40 ? 1 : 0) + ((t.tier ?? 1) === 4 ? 3 : (t.tier ?? 1) === 3 ? 1 : 0); // store.ts:472
  rel.purchases++; rel.lastPurchaseDay = s.day;
  rel.affinity = Math.min(100, rel.affinity + (best.fit >= 65 ? 15 : best.fit < 40 ? -5 : 6));
  s.stats.stallSales++;
  return best.price;
}

function queueFor(s: S) { // store.ts:667-684
  if (s.day === 1) return ['samira', 'yusuf', 'mariam'];
  const r = rank(s);
  let q = BUYER_ORDER.filter((id) => (BUYER_UNLOCK[id] ?? 0) <= s.reputation && r >= rankNeeded(id)).filter((id) => (s.rel[id]?.lastPurchaseDay === s.day - 1 ? RNG() < 0.3 : RNG() < 0.85));
  if (!q.length) q = [BUYER_ORDER[Math.floor(RNG() * BUYER_ORDER.length)]];
  const grand = BUYER_ORDER.filter((id) => (BUYER_UNLOCK[id] ?? 0) > s.reputation && (BUYER_UNLOCK[id] ?? 0) >= 15 && !q.includes(id));
  if (grand.length && RNG() < 0.18) q.push(grand[Math.floor(RNG() * grand.length)]);
  q.sort(() => RNG() - 0.5);
  return q.slice(0, QUEUE_BASE + (s.upgrades.includes('bazaar') ? 1 : 0) + (s.upgrades.includes('khan') ? 1 : 0) + (RNG() < QUEUE_EXTRA_P ? 1 : 0));
}

// ---- buying ----
const expectedSale = (typeId: string, c: Condition, k: number) => midValue(typeId, 'Good') * k * (c === 'Good' || c === 'Excellent' ? CONDITION_FACTOR[c] : 1);
const restoreFee = (typeId: string, c: Condition) => (RESTORATION[c] ? restoreCost(midValue(typeId, 'Good') / 1, c) : 0);

function reserveFor(s: S) {
  const due = nextDue(s);
  // a steady player saves for the first of the month over the last week before it
  return due.days <= 7 ? due.amount * (1 - (due.days - 1) / 7) : 0;
}

function buyRashid(s: S, st: Style) {
  const commonOnly = s.missions.alexandria !== 'done';
  const offers = rashidStock(s.day, RNG, s.reputation, commonOnly);
  const credit = st.credit && !commonOnly ? rashidCredit(s.supplier.trust, s.reputation) : 0;
  const cand = offers.flatMap((o) => Array.from({ length: o.qty ?? 1 }, () => o))
    .map((o) => ({ o, value: expectedSale(o.typeId, o.condition, 0.85) - restoreFee(o.typeId, o.condition) }))
    .filter((x) => x.value >= x.o.price * st.minMargin)
    .sort((a, b) => b.value / b.o.price - a.value / a.o.price);
  const haggled = new Set<string>();
  for (const { o } of cand) {
    if (s.inventory.filter((i) => i.stored).length >= st.stockTarget) break;
    let price = o.price;
    if (st.haggleRashid && !haggled.has(o.uid)) {
      haggled.add(o.uid);
      if (RNG() < 0.35 + s.supplier.trust / 200) price = snap(o.price * 0.85); else s.supplier.trust = Math.max(0, s.supplier.trust - 3);
    }
    const reserve = reserveFor(s);
    if (s.cash - price >= reserve) { s.cash -= price; }
    else if (credit && s.supplier.trust >= 20 && s.supplier.debt + price <= credit) {
      if (s.supplier.debt === 0) s.supplier.debtDue = s.day + RASHID_PROFILE.creditDays;
      s.supplier.debt += price;
    } else continue;
    s.inventory.push(item(o.typeId, o.condition, price));
  }
}
function restoreAll(s: S) {
  for (const i of s.inventory) {
    const r = RESTORATION[i.condition];
    if (!r || i.restoringUntil) continue;
    const fee = restoreFee(i.typeId, i.condition);
    if (s.cash - fee < reserveFor(s)) continue;
    s.cash -= fee; i.paid += fee; i.restoringUntil = s.day + r.days; i.restoreTo = r.to;
  }
}
function payDebts(s: S) {
  if (s.supplier.debt > 0) { const a = Math.min(s.supplier.debt, Math.max(0, s.cash - 50)); s.cash -= a; s.supplier.debt -= a; }
}
function buyUpgrades(s: S, st: Style) {
  const spare = s.cash - reserveFor(s) - 150;
  for (const id of st.name === 'stall-only' ? ['tea', 'display', 'mat'] : ['display', 'tea', 'mat', 'bazaar']) {
    const u = UPGRADES.find((x) => x.id === id)!;
    if (s.upgrades.includes(id) || s.reputation < (u.rep ?? 0) || (u.after && !s.upgrades.includes(u.after))) continue;
    if (spare - u.cost < (u.cost >= 300 ? 200 : 0)) continue;
    s.cash -= u.cost; s.upgrades.push(id);
    return;
  }
}

// ---- travel ----
interface Leg { to: string; days: number; fare: number }
function leg(from: string, to: string, s: S): Leg {
  const r = railJourney(from, to);
  if (r) return { to, days: r.days, fare: r.fare };
  const A = settlementById(from), B = settlementById(to);
  const pace = animalN(s) > 0 ? 1.1 : 1;
  return { to, days: (Math.hypot(A.x - B.x, A.y - B.y) * 1.2) / (24 * pace), fare: 0 };
}

/** What the player does on arriving in a town. */
function arrive(s: S, st: Style, sid: string) {
  // a visitor first (store.ts checkJobs ~958)
  const v = s.visits.find((x) => x.city === sid && x.until >= s.day);
  if (v) {
    const rug = s.inventory.filter((i) => !i.stored && tierOfRug(i) >= v.tier).sort((a, b) => tierOfRug(a) - tierOfRug(b) || midValue(b.typeId, b.condition) - midValue(a.typeId, a.condition))[0];
    if (rug) {
      s.cash += snap(midValue(rug.typeId, rug.condition) * v.mult); s.reputation += v.rep;
      s.inventory = s.inventory.filter((i) => i !== rug); s.visits = s.visits.filter((x) => x !== v); s.stats.visitorSales++;
    }
  }
  if (!v || !s.visits.includes(v)) {
    const job = openJobs(s.jobsDone, s.reputation).find((j) => j.target === sid);
    if (job) {
      const packed = job.need?.packedTier ? s.inventory.filter((i) => !i.stored && tierOfRug(i) >= job.need!.packedTier!).sort((a, b) => tierOfRug(a) - tierOfRug(b))[0] : undefined;
      const ok = !(job.need?.packedTier && !packed) && !(job.need?.animals && animalN(s) < job.need.animals) && !(job.need?.guards && troopN(s) === 0) && !(job.reward.fee && s.cash < job.reward.fee);
      if (ok) {
        s.cash += (job.reward.cash ?? 0) - (job.reward.fee ?? 0); s.stats.jobCash += job.reward.cash ?? 0;
        if (packed && job.reward.sellPacked) { s.cash += snap(midValue(packed.typeId, packed.condition) * job.reward.sellPacked); s.inventory = s.inventory.filter((i) => i !== packed); s.stats.jobSales++; }
        for (const typeId of job.reward.rugs ?? []) s.inventory.push(item(typeId, 'Good', 0, false));
        s.reputation += job.reward.rep ?? 0; s.jobsDone.push(job.id);
        if (job.id === 'tanta-bale' && s.missions.beasts === 'active') { const m = MISSIONS.beasts; s.missions.beasts = 'done'; s.cash += m.reward.cash; s.reputation += m.reward.rep; s.supplier.trust += m.reward.trust; }
      }
    }
  }
  // local market: the Alexandria errand, and cheap stock to carry home
  const offers = localOffers(sid, s.day, s.reputation);
  if (s.missions.alexandria === 'active' && sid === 'alexandria' && offers.length) {
    const o = offers.sort((a, b) => a.price - b.price)[0];
    if (s.cash >= o.price) {
      s.cash -= o.price; s.inventory.push(item(o.typeId, o.condition, o.price, false));
      const m = MISSIONS.alexandria; s.missions.alexandria = 'done'; s.cash += m.reward.cash; s.reputation += m.reward.rep; s.supplier.trust += m.reward.trust;
    }
  }
  if (st.localBuy) {
    for (const o of offers) {
      for (let q = 0; q < o.qty; q++) {
        const value = expectedSale(o.typeId, o.condition, 0.85) - restoreFee(o.typeId, o.condition);
        if (value < o.price * 1.4 || s.cash - o.price < reserveFor(s) + 80) break;
        if (s.inventory.filter((i) => !i.stored).length >= 2 + animalN(s) * 3 + troopN(s)) break; // carrying capacity (caravan.ts capacity, roughly)
        s.cash -= o.price; s.inventory.push(item(o.typeId, o.condition, o.price, false));
      }
    }
  }
}

function travel(s: S, st: Style, stops: string[]) {
  let at = 'giza', hours = 0;
  for (const to of [...stops, 'giza']) {
    const l = leg(at, to, s);
    s.cash -= l.fare; s.stats.fares += l.fare;
    hours += l.days * 24 + 2;
    while (hours >= 24) { hours -= 24; rollover(s, at); s.stats.travelDays++; }
    at = to;
    if (to !== 'giza') arrive(s, st, to);
  }
  // back at the stall: unpack
  s.inventory.forEach((i) => (i.stored = true));
  // the rest of the day is lost to the road unless we came home early
  if (hours > 6) { rollover(s, 'giza'); s.stats.travelDays++; }
}

/** Choose a trip, or none. Scripted like a sensible player: missions first, then jobs, then visitors. */
function planTrip(s: S, st: Style): string[] | null {
  if (!st.travel) return null;
  const spare = s.cash - reserveFor(s);
  const pack = (n: number, minTier = 1) => { // take the rugs that fetch most away from the stall
    const cands = s.inventory.filter((i) => i.stored && !i.restoringUntil && tierOfRug(i) >= minTier).sort((a, b) => midValue(b.typeId, b.condition) - midValue(a.typeId, a.condition));
    cands.slice(0, n).forEach((i) => (i.stored = false));
    return cands.length > 0;
  };
  const jobs = openJobs(s.jobsDone, s.reputation);
  const jobOpen = (id: string) => jobs.some((j) => j.id === id);
  // 1. Rashid's Alexandria errand, as soon as we can pay the fare and a rug
  if (s.missions.alexandria === 'active' && spare > 200) { pack(2); if (jobOpen('cecil-hotel')) pack(1, 2); return ['alexandria']; }
  if (s.missions.alexandria !== 'done') return null;
  // 2. Two donkeys, then Tanta (the bale) and back by Fayoum (the harvest hire)
  const donkey = animalPrice('giza', 'baladi_d') ?? 300;
  if (animalN(s) < 2 && (jobOpen('tanta-bale') || jobOpen('fayoum-mules')) && spare > donkey * (2 - animalN(s)) + 150) {
    while (animalN(s) < 2) { s.cash -= donkey; s.animals.baladi_d = (s.animals.baladi_d ?? 0) + 1; }
    s.firstAnimalDay ??= s.day;
  }
  if (animalN(s) >= 2 && (jobOpen('tanta-bale') || jobOpen('fayoum-mules'))) { pack(3); return [jobOpen('tanta-bale') ? 'tanta' : null, jobOpen('fayoum-mules') ? 'fayoum' : null].filter(Boolean) as string[]; }
  // 3. The pilgrims to Suez with a watchman
  const watch = TROOPS.watchman;
  if (jobOpen('suez-pilgrims') && spare > watch.cost + watch.wage * 5 + 100) {
    s.cash -= watch.cost; s.troops.watchman = 1; s.firstGuardDay ??= s.day;
    pack(2);
    return ['suez'];
  }
  // 4. A visitor worth the journey
  const k = 0.88;
  for (const v of s.visits) {
    if (!['cairo', 'alexandria', 'tanta', 'fayoum', 'portsaid', 'suez', 'saqqara'].includes(v.city)) continue;
    const l = leg('giza', v.city, s);
    if (s.day + Math.ceil(l.days) > v.until) continue;
    const rug = s.inventory.filter((i) => i.stored && !i.restoringUntil && tierOfRug(i) >= v.tier).sort((a, b) => midValue(b.typeId, b.condition) - midValue(a.typeId, a.condition))[0];
    if (!rug) continue;
    const gain = midValue(rug.typeId, rug.condition) * (v.mult - k);
    const lost = Math.ceil(l.days * 2 + 0.2) * 70; // a stall day is worth about this much profit
    if (gain > l.fare * 2 + lost) { rug.stored = false; pack(1); const extra = v.city !== 'portsaid' && jobOpen('portsaid-officer') && v.city === 'cairo' ? [] : []; return [v.city, ...extra]; }
  }
  // 5. Port Said officer / Hotel Ptolemy when there is a spare rug and nothing else to do
  if (jobOpen('cecil-hotel') && s.inventory.some((i) => i.stored && tierOfRug(i) >= 2) && spare > 150) { pack(1, 2); pack(1); return ['alexandria']; }
  if (jobOpen('portsaid-officer') && spare > 150 && st.name === 'aggressive') { pack(2); return ['portsaid']; }
  return null;
}

// ---- one run ----
interface Week { day: number; cash: number; net: number; familyPaid: number; rank: number; rep: number; sold: number; stock: number }
function run(st: Style, seed: number) {
  RNG = mulberry(seed);
  const s = newState();
  const weeks: Week[] = [];
  const snapWeek = () => weeks.push({ day: s.day, cash: s.cash, net: netWorth(s as never), familyPaid: s.family.paid, rank: rank(s), rep: s.reputation, sold: s.stats.stallSales + s.stats.visitorSales + s.stats.jobSales, stock: Math.round(stockValue(s.inventory)) });
  let nextWeek = 8;
  while (s.day <= 60) {
    if (s.day >= nextWeek) { snapWeek(); nextWeek += 7; }
    if (s.day === 22 && s.cash22 === undefined) s.cash22 = s.cash;
    while (s.early.length < Math.min(s.day, 10)) s.early.push(s.cash); // morning cash, days 1-10
    payDebts(s);
    // the troops go home once their job is done (a thrifty player)
    if (troopN(s) && !openJobs(s.jobsDone, s.reputation).some((j) => j.id === 'suez-pilgrims')) s.troops = {};
    const trip = s.day > 1 ? planTrip(s, st) : null;
    if (trip && trip.length) { travel(s, st, trip); continue; }
    s.inventory.forEach((i) => (i.stored = true));
    restoreAll(s);
    buyRashid(s, st);
    buyUpgrades(s, st);
    const q = queueFor(s);
    let sold = 0, rev = 0;
    for (const id of q) { const p = encounter(s, st, id, sold); if (p) { sold++; rev += p; } }
    s.stats.bestDay = Math.max(s.stats.bestDay, rev);
    rollover(s, 'giza');
  }
  return { s, weeks };
}

// ---- report ----
const N = Number(process.env.SEEDS ?? 40);
const med = (xs: number[]) => { const a = [...xs].sort((x, y) => x - y); return a[Math.floor(a.length / 2)]; };
const pct = (xs: boolean[]) => `${Math.round((100 * xs.filter(Boolean).length) / Math.max(1, xs.length))}%`;
const L = (pt: number) => (pt / 100).toFixed(pt >= 10000 || pt <= -10000 ? 0 : 1);
console.log(`Constants: start cash ${START_CASH}pt, family ${FAMILY_LEFT}pt @ ${FAMILY_INSTALMENT}pt/month, queue ${QUEUE_BASE}+${QUEUE_EXTRA_P}. ${N} seeds per style. Money in £ (medians).`);
for (const st of STYLES) {
  const runs = Array.from({ length: N }, (_, i) => run(st, 1000 + i * 7919));
  console.log(`\n== ${st.name} ==`);
  console.log('wk  day  cash   net   famPaid rank rep  sold  stock');
  const nW = runs[0].weeks.length;
  for (let w = 0; w < nW; w++) {
    const col = (f: (x: Week) => number) => med(runs.map((r) => f(r.weeks[w])));
    console.log(`${String(w + 1).padStart(2)}  ${String(runs[0].weeks[w].day).padStart(3)}  ${L(col((x) => x.cash)).padStart(5)} ${L(col((x) => x.net)).padStart(6)} ${L(col((x) => x.familyPaid)).padStart(6)}  ${col((x) => x.rank)}   ${String(col((x) => x.rep)).padStart(3)}  ${String(col((x) => x.sold)).padStart(4)} ${L(col((x) => x.stock)).padStart(6)}`);
  }
  const f = (g: (s: S) => number | undefined) => { const xs = runs.map((r) => g(r.s)).filter((x): x is number => x !== undefined); return xs.length ? `${med(xs)} (${xs.length}/${N})` : 'never'; };
  const A = runs.map((r) => r.s);
  console.log(`morning cash days 1-10: ${Array.from({ length: 10 }, (_, d) => L(med(A.map((s) => s.early[d] ?? 0)))).join(' ')}`);
  console.log(`day 61: cash £${L(med(A.map((s) => s.cash)))}, net £${L(med(A.map((s) => netWorth(s as never))))}, min cash £${L(med(A.map((s) => s.minCash)))}`);
  const c22 = A.map((s) => s.cash22 ?? s.cash).sort((a, b) => a - b);
  console.log(`cash on the morning of day 22 (before stocking): p10 £${L(c22[Math.floor(N * 0.1)])}, median £${L(c22[Math.floor(N / 2)])}; due on 1 Apr £${L(billTotal(monthlyBill([], 0, 3)) + FAMILY_INSTALMENT)} (+storage)`);
  console.log(`1 Apr instalment paid on time: ${pct(A.map((s) => s.instalmentOk[0] ?? false))}; 1 May: ${pct(A.map((s) => s.instalmentOk[1] ?? false))}; late instalments (median): ${med(A.map((s) => s.family.late))}`);
  console.log(`rank 1 day: ${f((s) => s.rank1Day)}; first animals day: ${f((s) => s.firstAnimalDay)}; first guard day: ${f((s) => s.firstGuardDay)}`);
  console.log(`sales: stall ${med(A.map((s) => s.stats.stallSales))}, visitor ${med(A.map((s) => s.stats.visitorSales))}, job ${med(A.map((s) => s.stats.jobSales))}; job cash £${L(med(A.map((s) => s.stats.jobCash)))}; travel days ${med(A.map((s) => s.stats.travelDays))}, fares £${L(med(A.map((s) => s.stats.fares)))}, wages £${L(med(A.map((s) => s.stats.wages)))}`);
  console.log(`upgrades (most common): ${med(A.map((s) => s.upgrades.length))} — e.g. ${A[0].upgrades.join(', ') || 'none'}; jobs done e.g. ${A[0].jobsDone.join(', ') || 'none'}`);
}
