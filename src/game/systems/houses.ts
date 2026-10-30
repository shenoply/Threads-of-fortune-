// The rival houses: four dealers of the trade who keep their own purse, stock and name, and act on the
// world around you. Each night every house sells its day (more or less as its temper and its season go),
// buys stock again while it has money, and now and then makes a move: buys up a line in a town, cuts its
// prices in your city, calls on one of your regular buyers, opens a shop, offers your boy or your agent
// more money, or tells the trade you lie about your rugs (only once you have been caught at it). You can
// answer each one, and a house that runs out of money goes under and sells off its stock.
// Shukri across the lane (laneRival.ts) keeps his own race and is shown with them.
// Randomness is hashed from the game's seed and the day, so it never disturbs the store's dice.
import { RIVAL } from '../../data/rivals';
import { SETTLEMENTS } from '../../data/world';
import { BUYERS } from '../../data/buyers';
import { RUGS } from '../../data/rugs';
import { fmt, snap } from '../economy/money';
import { dateFor } from '../economy/economy';
import type { GameState } from '../state/store';
import type { RugItem } from '../types';
import { inLawHouses } from './household';
import { tableOf, cityName, seasonOf, freshRanks } from './ranks';
import { boyName } from './shopBoy';
import { HOUSE_FX, type HouseCorner } from './houseFx';

export interface HouseDef {
  id: string;
  /** the house's row in the city tables (data/rivals.ts): name, temper, portrait */
  rival: string;
  /** what the trade calls him or her in a short line */
  short: string;
  home: string;
  /** towns the house buys in and might open a shop in */
  towns: string[];
  /** brings goods in past the customs house */
  smuggler?: boolean;
  /** one line on how the house trades */
  trade: string;
  purse: number;
  /** rugs the house likes to keep in its stores */
  stock: number;
}

export const HOUSES: HouseDef[] = [
  { id: 'selim', rival: 'rival-selim', short: 'Selim Tannous', home: 'cairo', towns: ['cairo', 'tanta', 'fayoum', 'alexandria'], purse: 9000, stock: 60,
    trade: 'Sells cheap and in quantity in the Muski, and buys his village rugs by the cartload in the Delta.' },
  { id: 'yanni', rival: 'rival-yanni', short: 'Yanni Stavrou', home: 'cairo', towns: ['cairo', 'portsaid', 'suez', 'jaffa'], purse: 14000, stock: 50, smuggler: true,
    trade: 'Brings Persian pieces in through Port Said. Not all of them pass through the customs house.' },
  { id: 'lucia', rival: 'rival-lucia', short: 'Signora Valenti', home: 'alexandria', towns: ['alexandria', 'cairo', 'beirut', 'jaffa'], purse: 18000, stock: 70,
    trade: 'Her late husband\'s firm. Furnishes hotels, shipping offices and the consulates.' },
  { id: 'shami', rival: 'rival-shami', short: 'Abu Nadim', home: 'damascus', towns: ['damascus', 'beirut', 'aleppo', 'amman', 'baghdad'], purse: 16000, stock: 80,
    trade: 'Three generations in the Hamidiyya. His caravans still come in from Baghdad.' },
];
export const HOUSE: Record<string, HouseDef> = Object.fromEntries(HOUSES.map((h) => [h.id, h]));

export type MoveKind = 'corner' | 'undercut' | 'court' | 'shop' | 'hire' | 'rumour';
export type CounterKind = 'undercut-back' | 'buy-out' | 'gift' | 'win-back' | 'match' | 'answer' | 'tip' | 'truce' | 'buy-stock';

export interface HouseState {
  /** money in hand, piastres; under nothing, the house is in debt */
  purse: number;
  /** rugs in its stores */
  stock: number;
  /** its name in the trade, 5..95 */
  rep: number;
  /** how it feels about you, -5..5 */
  mood: number;
  status: 'trading' | 'failing' | 'gone';
  /** the day it began failing, or went under */
  since?: number;
  /** a partnership with you, until the day given */
  truce?: number;
  /** the day you last proposed one */
  asked?: number;
  /** the day you last gave the police his name */
  tipped?: number;
  /** a shop opened in another town */
  shop?: string;
  /** contests with you: won by you, won by the house */
  wins?: number;
  losses?: number;
  last?: { day: number; text: string };
}
export interface HousesState {
  list: Record<string, HouseState>;
  corners: HouseCorner[];
  /** a house selling below cost in a city (the city table's undercut too): your buyers offer less */
  cut?: { by: string; city: string; until: number };
  /** regular buyers a house is calling on: they go over unless they buy from you again by `until` */
  courted: { buyer: string; by: string; day: number; until: number }[];
  /** buyers gone over to a house, until the day given */
  defected: Record<string, { by: string; until: number }>;
  /** your boy or an agent offered more money: he goes on `until` unless you match it */
  poach?: { by: string; who: 'boy' | 'agent'; shop?: string; until: number };
  /** a rumour about your rugs going round, until the day given */
  rumour?: { by: string; until: number };
  /** lies caught already answered by a rumour */
  liesSeen: number;
  /** a failed house's stock, offered to the trade */
  sale?: { by: string; until: number; rugs: { typeId: string; price: number }[] };
  /** the houses' moves, one plain line each, newest last */
  log: { day: number; by: string; text: string }[];
  lastMove: number;
  lastHire?: number;
}

const START_REP: Record<string, number> = { aggressive: 45, cunning: 50, steady: 60, old: 70 };
export function freshHouses(day = 1): HousesState {
  return {
    list: Object.fromEntries(HOUSES.map((d) => [d.id, { purse: d.purse, stock: d.stock, rep: START_REP[RIVAL[d.rival].temper], mood: 0, status: 'trading' as const }])),
    corners: [], courted: [], defected: {}, liesSeen: 0, log: [], lastMove: day,
  };
}
export const housesOf = (s: Pick<GameState, 'houses' | 'day'>): HousesState => s.houses ?? freshHouses(s.day);
export const houseName = (d: HouseDef) => RIVAL[d.rival].name;
const she = (d: HouseDef) => !!RIVAL[d.rival].she;
const him = (d: HouseDef) => (she(d) ? 'her' : 'him');
const his = (d: HouseDef) => (she(d) ? 'her' : 'his');
const townName = (id: string) => SETTLEMENTS.find((x) => x.id === id)?.name ?? id;
const short = (day: number) => dateFor(day).short;
/** a line of rugs by name: 'the Cairo Garden rugs' */
export const lineName = (typeId: string) => `${(RUGS[typeId]?.name ?? 'village').replace(/\s+rugs?$/i, '')} rugs`;

const hx = (seed: number, day: number, k: string) => {
  let h = 2166136261 ^ (day * 2654435761) ^ seed;
  for (let i = 0; i < k.length; i++) h = Math.imul(h ^ k.charCodeAt(i), 16777619);
  h = Math.imul(h ^ (h >>> 15), 2246822507);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
};

/** what the house makes of a rug, on average, for its stock counts */
const RUG_PRICE = 400;
const PURSE_CAP = 80000;
/** under this, a failing house goes under at once */
const BROKE = -5000;
/** days a house may fail before it goes under */
const FAIL_DAYS = 30;
export const CUT_DAYS = 5, CORNER_DAYS = 10, COURT_DAYS = 10, DEFECT_DAYS = 40, POACH_DAYS = 3, RUMOUR_DAYS = 7, TRUCE_DAYS = 90, SALE_DAYS = 14;
/** what a buyer at your stall offers while a house is cutting prices in Cairo, or a rumour goes round */
export const CUT_PAY = 0.93, RUMOUR_PAY = 0.95;
const KEEP = new Set(['cohen', 'malek', 'nabil']);

/** a house that will not move against you: a partner, or your wife's family */
export const friendly = (s: Pick<GameState, 'household' | 'day'>, d: HouseDef, st: HouseState) => (st.truce ?? 0) >= s.day || inLawHouses(s.household).includes(d.rival);

/** where the house stands against you this season: its sales in its home city's table and yours */
export function standingOf(s: Pick<GameState, 'ranks'>, d: HouseDef) {
  const city = tableOf(d.home) ?? d.home;
  const t = s.ranks?.tables[city] ?? {};
  const theirs = t[d.rival] ?? 0, yours = t.you ?? 0;
  return { city, theirs, yours, ahead: yours > theirs };
}

/** the lines a town's dealers sell every day (no rare pieces): the lines a house can buy up */
const linesOf = (town: string) => (SETTLEMENTS.find((x) => x.id === town)?.sells ?? []).filter((o) => o.chance === undefined && !o.minRep && RUGS[o.typeId]);
/** the going price for a line at a town's dealers before anyone buys it up */
export function lineAsk(town: string, typeId: string) {
  const o = linesOf(town).find((x) => x.typeId === typeId);
  return o ? snap(RUGS[typeId].dealerCost * o.factor) : snap(RUGS[typeId]?.dealerCost ?? 100);
}
/** buying a house out of a line: three of its rugs at the going price */
export const BUYOUT_RUGS = 3;
export const buyoutCost = (c: HouseCorner) => BUYOUT_RUGS * lineAsk(c.town, c.typeId);
/** answering a cut in prices: what selling under your own price costs you, from your sales in that city */
export const undercutBackCost = (s: Pick<GameState, 'ranks'>, city: string) => Math.max(300, Math.min(2000, snap((s.ranks?.tables[city]?.you ?? 0) * 0.02)));
export const GIFT = 100, WIN_BACK = 300, ANSWER = 150;
export const matchCost = (who: 'boy' | 'agent') => (who === 'boy' ? 50 : 300);
/** a partnership costs a share of the route's expenses: a twentieth of your purse, within bounds */
export const truceCost = (cash: number) => Math.max(500, Math.min(3000, snap(cash * 0.05)));

type Out = { H: HousesState; patch: Partial<GameState>; note?: string; text: string };
const log = (H: HousesState, day: number, by: string, text: string) => {
  H.log = [...H.log, { day, by, text }].slice(-40);
  H.list[by] = { ...H.list[by], last: { day, text } };
};

/** One move by one house, if it can make it now. `day` is the day it takes effect. */
function doMove(kind: MoveKind, d: HouseDef, s: GameState, H0: HousesState, day: number, seed: number): Out | null {
  const st = H0.list[d.id];
  if (!st || st.status === 'gone') return null;
  const name = houseName(d);
  const H: HousesState = { ...H0, list: { ...H0.list, [d.id]: { ...st } } };
  const me = H.list[d.id];
  const patch: Partial<GameState> = {};
  const hostile = kind === 'undercut' || kind === 'court' || kind === 'hire' || kind === 'rumour';
  if (hostile && friendly(s, d, st)) return null;
  if (kind === 'undercut') {
    const city = tableOf(d.home);
    if (!city || me.purse < 2000) return null;
    const mine = (s.ranks?.tables[city]?.you ?? 0) > 0 || city === 'cairo';
    const on = s.ranks?.undercut?.[city];
    if (!mine || (on && on.until >= day) || (H.cut && H.cut.until >= day)) return null;
    me.purse -= 1500;
    H.cut = { by: d.id, city, until: day + CUT_DAYS };
    const rk = s.ranks ?? freshRanks(s.day);
    patch.ranks = { ...rk, undercut: { ...(rk.undercut ?? {}), [city]: { by: d.rival, until: day + CUT_DAYS } } };
    const text = `${name} is selling below cost in ${cityName(city)} until ${short(day + CUT_DAYS)}. Dealers there pay you less, and your buyers offer less.`;
    return { H, patch, text, note: text };
  }
  if (kind === 'corner') {
    if (me.purse < 3000) return null;
    const towns = d.towns.filter((t) => linesOf(t).length && !H.corners.some((c) => c.town === t && c.until >= day));
    if (!towns.length) return null;
    // a house buys where you trade, when it can
    const yours = towns.filter((t) => Object.values(s.whereabouts ?? {}).includes(t) || s.shops?.[t] || s.world?.at === t);
    const pool = yours.length && hx(seed, day, `${d.id}:yours`) < 0.7 ? yours : towns;
    const town = pool[Math.floor(hx(seed, day, `${d.id}:town`) * pool.length)];
    const lines = linesOf(town);
    const typeId = lines[Math.floor(hx(seed, day, `${d.id}:line`) * lines.length)].typeId;
    me.purse -= 2500; me.stock += 6;
    H.corners = [...H.corners.filter((c) => c.until >= day), { by: d.id, town, typeId, until: day + CORNER_DAYS }];
    const text = `${name} has bought up the ${lineName(typeId)} in ${townName(town)}. The dealers there have fewer, and ask more, until ${short(day + CORNER_DAYS)}.`;
    return { H, patch, text, note: yours.includes(town) ? text : undefined };
  }
  if (kind === 'court') {
    if (me.purse < 1000 || !['cairo', 'alexandria'].includes(d.home)) return null;
    const busy = new Set([...H.courted.map((c) => c.buyer), ...Object.keys(H.defected)]);
    const regs = Object.entries(s.relationships ?? {}).filter(([id, r]) => (r.purchases ?? 0) >= 3 && (r.bad ?? 0) < 3 && !KEEP.has(id) && BUYERS[id] && !BUYERS[id].royal && !busy.has(id)).map(([id]) => id).sort();
    if (!regs.length) return null;
    const buyer = regs[Math.floor(hx(seed, day, `${d.id}:court`) * regs.length)];
    me.purse -= 600;
    H.courted = [...H.courted, { buyer, by: d.id, day, until: day + COURT_DAYS }];
    const b = BUYERS[buyer].name;
    const text = `${name} has been calling on ${b}, with coffee and a better price. Sell to ${b} again by ${short(day + COURT_DAYS)}, or send a gift, or ${b} may go over to ${him(d)}.`;
    return { H, patch, text, note: text };
  }
  if (kind === 'shop') {
    if (me.shop || me.purse < 20000) return null;
    const towns = d.towns.filter((t) => t !== d.home && !Object.values(H.list).some((x) => x.shop === t) && (s.shops?.[t] || Object.values(s.whereabouts ?? {}).includes(t)));
    if (!towns.length) return null;
    const town = towns[Math.floor(hx(seed, day, `${d.id}:shop`) * towns.length)];
    me.purse -= 12000; me.shop = town; me.rep = Math.min(95, me.rep + 4);
    const text = `${name} has opened a shop in ${townName(town)}. Its dealers have another buyer now, and pay you a little less.`;
    return { H, patch, text, note: text };
  }
  if (kind === 'hire') {
    if (me.purse < 2000 || (H.lastHire !== undefined && day - H.lastHire < 60) || H.poach) return null;
    const boy = s.shopBoy?.hired && (s.shopBoy.trust ?? 0) < 60;
    const agentShop = Object.entries(s.shops ?? {}).find(([, sh]) => sh.agent && !sh.childAgent)?.[0];
    if (!boy && !agentShop) return null;
    const who: 'boy' | 'agent' = boy && (!agentShop || hx(seed, day, `${d.id}:who`) < 0.5) ? 'boy' : 'agent';
    me.purse -= 300;
    H.poach = { by: d.id, who, shop: who === 'agent' ? agentShop : undefined, until: day + POACH_DAYS };
    H.lastHire = day;
    const man = who === 'boy' ? boyName(s.shopBoy) : `${s.shops![agentShop!].agent!.name}, your agent in ${townName(agentShop!)},`;
    const text = `${name} has offered ${man} more money to work for ${him(d)}. Pay ${fmt(matchCost(who))} to keep him by ${short(day + POACH_DAYS)}, or he goes.`;
    return { H, patch, text, note: text };
  }
  if (kind === 'rumour') {
    const caught = s.stats?.liesCaught ?? 0;
    if (caught <= H.liesSeen || (H.rumour && H.rumour.until >= day)) return null;
    H.liesSeen = caught;
    H.rumour = { by: d.id, until: day + RUMOUR_DAYS };
    patch.reputation = Math.max(0, (s.reputation ?? 0) - 1);
    const text = `${name} is telling the trade you were caught lying about a rug. Buyers offer a little less until ${short(day + RUMOUR_DAYS)}, unless you answer it. Reputation -1.`;
    return { H, patch, text, note: text };
  }
  return null;
}

const WEIGHTS: Record<string, [MoveKind, number][]> = {
  aggressive: [['undercut', 4], ['corner', 2], ['court', 1], ['hire', 1], ['shop', 1]],
  cunning: [['rumour', 5], ['court', 3], ['hire', 2], ['corner', 1], ['undercut', 1]],
  steady: [['corner', 3], ['shop', 3], ['court', 1]],
  old: [['corner', 3], ['court', 2], ['shop', 1], ['rumour', 1]],
};
const CHANCE: Record<string, number> = { aggressive: 0.06, cunning: 0.055, steady: 0.04, old: 0.04 };

/** A house goes under: its corners and cuts end, its shop shuts, its stock is offered to the trade. */
function goUnder(d: HouseDef, H: HousesState, day: number, seed: number) {
  const me = { ...H.list[d.id], status: 'gone' as const, since: day, shop: undefined, truce: undefined };
  H.list = { ...H.list, [d.id]: me };
  H.corners = H.corners.filter((c) => c.by !== d.id);
  if (H.cut?.by === d.id) H.cut = undefined;
  H.courted = H.courted.filter((c) => c.by !== d.id);
  H.defected = Object.fromEntries(Object.entries(H.defected).filter(([, x]) => x.by !== d.id));
  if (H.poach?.by === d.id) H.poach = undefined;
  if (H.rumour?.by === d.id) H.rumour = undefined;
  const lines = [...new Set(d.towns.flatMap((t) => linesOf(t).map((o) => o.typeId)))];
  const rugs = Array.from({ length: Math.min(5, lines.length) }, (_, i) => {
    const typeId = lines[Math.floor(hx(seed, day, `${d.id}:sale${i}`) * lines.length)];
    return { typeId, price: snap(RUGS[typeId].dealerCost * 0.7) };
  });
  H.sale = { by: d.id, until: day + SALE_DAYS, rugs };
  const text = `The house of ${houseName(d)} has failed. ${she(d) ? 'Her' : 'His'} creditors are selling the stock: five rugs at seven-tenths of the dealers' price, until ${short(day + SALE_DAYS)}.`;
  log(H, day, d.id, text);
  return text;
}

/** The night for the houses: each sells its day and buys stock again, money troubles come and go, one may
 *  make a move, and what was set going before comes due. `s` has the rest of the night applied; `day` is
 *  the new day. */
export function housesNight(s: GameState, day: number): { patch: Partial<GameState>; notes: string[] } {
  if (!s.started || s.playMode === 'sandbox') return { patch: {}, notes: [] };
  const seed = s.worldSeed ?? 0;
  let H: HousesState = { ...housesOf(s), list: { ...housesOf(s).list } };
  const notes: string[] = [];
  const patch: Partial<GameState> = {};
  const journal: GameState['journal'] = [];
  const say = (by: string, text: string, note?: boolean) => { log(H, day, by, text); journal.push({ day, text, kind: 'stall' }); if (note) notes.push(text); };
  // the day's trade
  for (const d of HOUSES) {
    const me = { ...H.list[d.id] };
    if (!me || me.status === 'gone') continue;
    const rv = RIVAL[d.rival];
    const base = rv.season / 91;
    const h = hx(seed, s.day, `${d.id}:day`);
    const m = rv.temper === 'aggressive' ? 0.4 + 1.2 * h : rv.temper === 'steady' ? 0.85 + 0.3 * h : rv.temper === 'cunning' ? 0.6 + 0.8 * h : h < 0.1 ? 0 : 0.9 + 0.2 * h;
    const form = 0.75 + 0.5 * hx(seed, seasonOf(s.day), `${d.id}:form`);
    const rev = base * m * form * (me.stock < 10 ? 0.5 : 1) * (0.7 + me.rep / 200) * (H.cut?.by === d.id ? 1.25 : 1) * (me.shop ? 1.15 : 1);
    me.purse = Math.min(PURSE_CAP, Math.round(me.purse + rev * 0.21 - base * (0.15 + (me.shop ? 0.03 : 0))));
    const sold = Math.round(rev / RUG_PRICE);
    me.stock = Math.min(Math.round(d.stock * 1.6), Math.max(0, me.stock - sold + (me.purse > 0 ? sold + (me.stock < d.stock ? 1 : 0) : 0)));
    // a house with money to spare spends it on its name
    if (me.purse > 50000 && day % 7 === 0) { me.purse -= 4000; me.rep = Math.min(95, me.rep + 1); }
    H.list[d.id] = me;
    if (me.status === 'trading' && me.purse < 0) {
      H.list[d.id] = { ...me, status: 'failing', since: day };
      say(d.id, `${houseName(d)} is said to be behind with ${his(d)} suppliers.`);
    } else if (me.status === 'failing' && me.purse >= 2000) {
      H.list[d.id] = { ...me, status: 'trading', since: undefined };
      say(d.id, `${houseName(d)} has paid ${his(d)} creditors, and is trading again.`);
    } else if (me.status === 'failing' && (me.purse < BROKE || day - (me.since ?? day) >= FAIL_DAYS)) {
      const text = goUnder(d, H, day, seed);
      journal.push({ day, text, kind: 'stall' });
      notes.push(text);
    }
  }
  // what was set going comes due
  H.corners = H.corners.filter((c) => c.until >= day);
  if (H.cut && H.cut.until < day) H.cut = undefined;
  if (H.rumour && H.rumour.until < day) H.rumour = undefined;
  if (H.sale && (H.sale.until < day || !H.sale.rugs.length)) H.sale = undefined;
  const courted: HousesState['courted'] = [];
  for (const c of H.courted) {
    const d = HOUSE[c.by], b = BUYERS[c.buyer]?.name ?? 'A buyer';
    const kept = (s.relationships?.[c.buyer]?.lastPurchaseDay ?? -1) >= c.day;
    if (kept) say(c.by, `${b} stayed with you, whatever ${houseName(d)} offered.`);
    else if (c.until < day) {
      H.defected = { ...H.defected, [c.buyer]: { by: c.by, until: day + DEFECT_DAYS } };
      H.list[c.by] = { ...H.list[c.by], losses: (H.list[c.by].losses ?? 0) + 1 };
      say(c.by, `${b} now buys from ${houseName(d)}, and will not come to your stall for a while.`, true);
    } else courted.push(c);
  }
  H.courted = courted;
  for (const [id, x] of Object.entries(H.defected)) if (x.until < day) {
    const { [id]: _gone, ...rest } = H.defected; void _gone;
    H.defected = rest;
    say(x.by, `${BUYERS[id]?.name ?? 'A buyer'} has fallen out with ${houseName(HOUSE[x.by])}, and may come to your stall again.`);
  }
  if (H.poach && H.poach.until < day) {
    const p = H.poach, d = HOUSE[p.by];
    H.poach = undefined;
    if (p.who === 'boy' && s.shopBoy?.hired) {
      patch.shopBoy = { ...s.shopBoy, hired: false, owed: 0 };
      say(p.by, `${boyName(s.shopBoy)} has gone to work for ${houseName(d)}.`, true);
      H.list[p.by] = { ...H.list[p.by], losses: (H.list[p.by].losses ?? 0) + 1 };
    } else if (p.who === 'agent' && p.shop && s.shops?.[p.shop]?.agent) {
      const nm = s.shops[p.shop].agent!.name;
      patch.shops = { ...s.shops, [p.shop]: { ...s.shops[p.shop], agent: undefined } };
      H.list[p.by] = { ...H.list[p.by], losses: (H.list[p.by].losses ?? 0) + 1 };
      say(p.by, `${nm} has left your shop in ${townName(p.shop)} to work for ${houseName(d)}. The shop needs a new agent.`, true);
    }
  }
  // one move a night at most, and two quiet nights between
  if (day >= 10 && day - H.lastMove >= 3) {
    const order = [...HOUSES].sort((a, b) => hx(seed, day, `o:${a.id}`) - hx(seed, day, `o:${b.id}`));
    for (const d of order) {
      const me = H.list[d.id];
      if (me.status !== 'trading') continue;
      const temper = RIVAL[d.rival].temper;
      if (hx(seed, day, `${d.id}:act`) >= CHANCE[temper] * (1 + Math.max(0, -me.mood) * 0.1)) continue;
      const w = WEIGHTS[temper];
      const total = w.reduce((a, [, n]) => a + n, 0);
      let roll = hx(seed, day, `${d.id}:kind`) * total;
      const first = w.find(([, n]) => (roll -= n) < 0)?.[0] ?? w[0][0];
      const tries = [first, ...w.map(([k]) => k).filter((k) => k !== first)];
      // hiring away a man is rare
      for (const k of tries) {
        if (k === 'hire' && hx(seed, day, `${d.id}:rare`) > 0.35) continue;
        const r = doMove(k, d, { ...s, ...patch } as GameState, H, day, seed);
        if (!r) continue;
        H = r.H; Object.assign(patch, r.patch);
        say(d.id, r.text, !!r.note);
        H.lastMove = day;
        break;
      }
      if (H.lastMove === day) break;
    }
  }
  // buyers gone over to a house do not come to your stall
  const away = new Set(Object.keys(H.defected));
  if (away.size && (s.queue ?? []).some((id) => away.has(id))) {
    const q = s.queue.filter((id) => !away.has(id));
    if (q.length) { patch.queue = q; if (s.arrivals) patch.arrivals = s.arrivals.slice(0, q.length); }
  }
  patch.houses = H;
  if (journal.length) patch.journal = [...(patch.journal ?? s.journal ?? []), ...journal];
  return { patch, notes };
}

/** For the tester's sheet and the tests: make a house move now, whatever the dice say. 'gone' sends it under. */
export function forceMove(s: GameState, id: string, kind: MoveKind | 'gone'): { patch: Partial<GameState>; text: string } {
  const d = HOUSE[id];
  if (!d) return { patch: {}, text: 'No such house.' };
  const seed = s.worldSeed ?? 0;
  const H0 = housesOf(s);
  if (kind === 'gone') {
    const H = { ...H0, list: { ...H0.list } };
    if (H.list[id].status === 'gone') return { patch: {}, text: `${houseName(d)} has already gone under.` };
    const text = goUnder(d, H, s.day, seed);
    return { patch: { houses: H, journal: [...s.journal, { day: s.day, text, kind: 'stall' }] }, text };
  }
  const st = H0.list[id];
  // the sheet clears the way: money enough, and no partnership in the way
  const H1: HousesState = { ...H0, list: { ...H0.list, [id]: { ...st, purse: Math.max(st.purse, 25000), truce: undefined, status: st.status === 'gone' ? 'gone' : 'trading' } }, lastHire: undefined, poach: undefined };
  if (kind === 'rumour') H1.liesSeen = Math.min(H1.liesSeen, (s.stats?.liesCaught ?? 0) - 1);
  const r = doMove(kind, d, s, H1, s.day, seed);
  if (!r) return { patch: {}, text: `${houseName(d)} cannot make that move now.` };
  log(r.H, s.day, id, r.text);
  r.H.lastMove = s.day;
  return { patch: { ...r.patch, houses: r.H, journal: [...s.journal, { day: s.day, text: r.text, kind: 'stall' }] }, text: r.text };
}

let uidN = 0;
const stockRug = (typeId: string, paid: number, note: string, day: number): RugItem => ({
  uid: `hs${day}x${Date.now().toString(36)}${uidN++}`, typeId, condition: 'Good', restored: false, provenance: RUGS[typeId].provenance, paid, notes: [note], stored: true,
});

/** Your answer to a house. Returns the patch and a plain line saying what happened. */
export function houseCounter(s: GameState, kind: CounterKind, id: string, arg?: string): { patch: Partial<GameState>; msg: string } {
  const H: HousesState = { ...housesOf(s), list: { ...housesOf(s).list } };
  const d = HOUSE[id];
  const day = s.day;
  if (!d) return { patch: {}, msg: '' };
  const name = houseName(d);
  const me = { ...H.list[id] };
  const spend = (cost: number, label: string) => ({ cash: s.cash - cost, ledger: [...s.ledger, { day, kind: 'expense' as const, label, amount: -cost }] });
  const done = (msg: string, extra: Partial<GameState> = {}) => {
    H.list[id] = me;
    log(H, day, id, msg);
    return { patch: { ...extra, houses: H, journal: [...(extra.journal ?? s.journal), { day, text: msg, kind: 'stall' }] }, msg };
  };
  const broke = (cost: number) => ({ patch: {}, msg: `You need ${fmt(cost)} for that.` });
  if (kind === 'undercut-back') {
    const c = H.cut;
    if (!c || c.by !== id || c.until < day) return { patch: {}, msg: `${name} is not cutting prices now.` };
    const cost = undercutBackCost(s, c.city);
    if (s.cash < cost) return broke(cost);
    H.cut = undefined;
    me.purse -= 2500; me.rep = Math.max(5, me.rep - 2); me.mood = Math.max(-5, me.mood - 1); me.wins = (me.wins ?? 0) + 1;
    const undercut = { ...(s.ranks?.undercut ?? {}) };
    if (undercut[c.city]?.by === d.rival) delete undercut[c.city];
    return done(`You cut your own prices in ${cityName(c.city)} to match ${name}'s, at a cost of ${fmt(cost)}. ${she(d) ? 'She' : 'He'} cannot keep it up, and stops.`, { ...spend(cost, `Selling under your price to answer ${name}`), ...(s.ranks ? { ranks: { ...s.ranks, undercut } } : {}) });
  }
  if (kind === 'buy-out') {
    const c = H.corners.find((x) => x.by === id && x.until >= day && (!arg || x.town === arg));
    if (!c) return { patch: {}, msg: `${name} has no line bought up now.` };
    const cost = buyoutCost(c);
    if (s.cash < cost) return broke(cost);
    H.corners = H.corners.filter((x) => x !== c);
    me.purse += cost; me.stock = Math.max(0, me.stock - BUYOUT_RUGS); me.mood = Math.max(-5, me.mood - 1); me.wins = (me.wins ?? 0) + 1;
    const each = lineAsk(c.town, c.typeId);
    const rugs = Array.from({ length: BUYOUT_RUGS }, () => stockRug(c.typeId, each, `Bought from ${name}, who had bought up the line in ${townName(c.town)}.`, day));
    return done(`You bought ${name} out of the ${lineName(c.typeId)} in ${townName(c.town)}: three of them for ${fmt(cost)}, sent to your store in Giza. The dealers there have them at the usual price again.`, {
      cash: s.cash - cost, inventory: [...s.inventory, ...rugs],
      ledger: [...s.ledger, { day, kind: 'purchase', label: `Three ${lineName(c.typeId)} from ${name}`, amount: -cost, cost }],
    });
  }
  if (kind === 'gift' || kind === 'win-back') {
    const buyer = arg ?? '';
    const b = BUYERS[buyer]?.name ?? 'the buyer';
    const cost = kind === 'gift' ? GIFT : WIN_BACK;
    if (kind === 'gift' && !H.courted.some((c) => c.buyer === buyer && c.by === id)) return { patch: {}, msg: `${name} is not calling on ${b}.` };
    if (kind === 'win-back' && H.defected[buyer]?.by !== id) return { patch: {}, msg: `${b} has not gone over to ${name}.` };
    if (s.cash < cost) return broke(cost);
    H.courted = H.courted.filter((c) => c.buyer !== buyer);
    if (kind === 'win-back') { const { [buyer]: _x, ...rest } = H.defected; void _x; H.defected = rest; }
    me.wins = (me.wins ?? 0) + 1;
    const rel = s.relationships[buyer];
    return done(kind === 'gift' ? `You sent ${b} a box of sweets from Groppi's with your card. ${b} stays with you.` : `You called on ${b} with a gift and an apology for whatever went wrong. ${b} will come to your stall again.`, {
      ...spend(cost, kind === 'gift' ? `A gift for ${b}` : `Winning ${b} back from ${name}`),
      ...(rel ? { relationships: { ...s.relationships, [buyer]: { ...rel, affinity: Math.min(100, rel.affinity + 5) } } } : {}),
    });
  }
  if (kind === 'match') {
    const p = H.poach;
    if (!p || p.by !== id) return { patch: {}, msg: `${name} is not after any of your men.` };
    const cost = matchCost(p.who);
    if (s.cash < cost) return broke(cost);
    H.poach = undefined;
    me.mood = Math.max(-5, me.mood - 1); me.wins = (me.wins ?? 0) + 1;
    const man = p.who === 'boy' ? boyName(s.shopBoy) : s.shops?.[p.shop!]?.agent?.name ?? 'your agent';
    return done(`You paid ${man} ${fmt(cost)} to stay. He tells ${name} no.`, {
      ...spend(cost, `A bonus to keep ${man}`),
      ...(p.who === 'boy' && s.shopBoy ? { shopBoy: { ...s.shopBoy, trust: Math.min(90, s.shopBoy.trust + 5) } } : {}),
    });
  }
  if (kind === 'answer') {
    const r = H.rumour;
    if (!r || r.by !== id) return { patch: {}, msg: `No rumour of ${name}'s is going round.` };
    if (s.cash < ANSWER) return broke(ANSWER);
    H.rumour = undefined;
    me.mood = Math.max(-5, me.mood - 1);
    return done(`You put a notice in the Courier offering any buyer a rug's papers and Arran's word on it, and spoke to the elders of the souq. The talk dies down. Reputation +1.`, { ...spend(ANSWER, 'A notice in the Courier'), reputation: s.reputation + 1 });
  }
  if (kind === 'tip') {
    if (!d.smuggler) return { patch: {}, msg: `The police would find nothing against ${name}.` };
    if (me.status === 'gone') return { patch: {}, msg: `${name} has gone already.` };
    if (me.tipped !== undefined && day - me.tipped < 120) return { patch: {}, msg: 'The police heard you the last time. They will not act on your word again so soon.' };
    me.tipped = day;
    const hit = hx(s.worldSeed ?? 0, day, `${id}:tip`) < 0.65;
    if (hit) {
      const fine = Math.round(Math.max(0, me.purse) * 0.4) + 3000;
      me.purse -= fine; me.stock = Math.round(me.stock * 0.7); me.rep = Math.max(5, me.rep - 12); me.mood = -5; me.wins = (me.wins ?? 0) + 1;
      return done(`The customs police searched ${name}'s stores at Port Said and found Persian carpets that had paid no duty. ${she(d) ? 'She' : 'He'} is fined ${fmt(fine)} and the goods are seized. ${she(d) ? 'She' : 'He'} will guess who told them.`);
    }
    me.mood = Math.max(-5, me.mood - 2); me.losses = (me.losses ?? 0) + 1;
    return done(`The police searched ${name}'s stores and found nothing out of order. ${she(d) ? 'She' : 'He'} knows who sent them. Reputation -2.`, { reputation: Math.max(0, s.reputation - 2) });
  }
  if (kind === 'truce') {
    if (me.status !== 'trading') return { patch: {}, msg: `${name} is in no state to make agreements.` };
    if ((me.truce ?? 0) >= day) return { patch: {}, msg: `You are partners with ${name} until ${short(me.truce!)}.` };
    if (me.asked !== undefined && day - me.asked < 14) return { patch: {}, msg: `${name} said no on ${short(me.asked)}. Ask again in a fortnight.` };
    const cost = truceCost(s.cash);
    if (s.cash < cost) return broke(cost);
    me.asked = day;
    const ahead = standingOf(s, d).ahead;
    const odds = 0.35 + 0.08 * me.mood + (ahead ? 0.25 : 0) + (me.purse < 5000 ? 0.15 : 0);
    if (hx(s.worldSeed ?? 0, day, `${id}:truce`) >= odds) {
      return done(`${name} hears you out, and says no. ${me.mood < 0 ? `${she(d) ? 'She' : 'He'} has not forgotten the last time.` : 'Perhaps another season.'}`);
    }
    me.truce = day + TRUCE_DAYS; me.mood = Math.min(5, me.mood + 2);
    H.corners = H.corners.filter((c) => c.by !== id);
    if (H.cut?.by === id) H.cut = undefined;
    H.courted = H.courted.filter((c) => c.by !== id);
    return done(`You and ${name} agree to share the road to ${townName(d.home)} until ${short(day + TRUCE_DAYS)}: your share of the costs is ${fmt(cost)}. ${she(d) ? 'She' : 'He'} will not work against you, and sends buyers your way; the dealers of ${townName(d.home)} pay you a little more.`, spend(cost, `Your share of the road, with ${name}`));
  }
  if (kind === 'buy-stock') {
    const sale = H.sale;
    const i = Number(arg ?? 0);
    if (!sale || sale.by !== id || sale.until < day || !sale.rugs[i]) return { patch: {}, msg: 'That stock has been sold.' };
    const r = sale.rugs[i];
    if (s.cash < r.price) return broke(r.price);
    H.sale = { ...sale, rugs: sale.rugs.filter((_, k) => k !== i) };
    const rug = stockRug(r.typeId, r.price, `From the stock of ${name}, after the house failed.`, day);
    const msg = `You bought a ${RUGS[r.typeId].name} from ${name}'s creditors for ${fmt(r.price)}. It goes to your store in Giza.`;
    H.list[id] = me;
    H.log = [...H.log, { day, by: id, text: msg }].slice(-40);
    return { patch: { houses: H, cash: s.cash - r.price, inventory: [...s.inventory, rug], ledger: [...s.ledger, { day, kind: 'purchase', label: `${RUGS[r.typeId].name} from ${name}'s stock`, amount: -r.price, cost: r.price }] }, msg };
  }
  return { patch: {}, msg: '' };
}

/** The houses' moves for the paper of a day (made the night before it). */
export function houseNews(s: Pick<GameState, 'houses'>, day: number): string[] {
  return (s.houses?.log ?? []).filter((l) => l.day === day).map((l) => l.text);
}

/** Houses that sit in an auction room in this city: grand sales in the towns they trade in, any sale at home. */
export function houseBidders(s: Pick<GameState, 'houses' | 'day' | 'household'>, city: string, tier: 'small' | 'grand') {
  const H = housesOf(s);
  return HOUSES.filter((d) => {
    const st = H.list[d.id];
    return st && st.status === 'trading' && st.purse > 3000 && !friendly(s, d, st) && (d.home === city || (tier === 'grand' && d.towns.includes(city)));
  }).map((d) => {
    const rv = RIVAL[d.rival];
    return {
      id: `house-${d.id}`, name: rv.name, who: `of the house of ${rv.name.split(' ').pop()}, bidding against you`, img: `art/portraits/small/${d.rival}.webp`,
      budget: snap(Math.min(25000, H.list[d.id].purse * 0.25)),
      aggression: rv.temper === 'aggressive' ? 0.75 : rv.temper === 'old' ? 0.65 : rv.temper === 'cunning' ? 0.6 : 0.5,
      wants: () => true,
    };
  });
}

/** Marks for the map: a house's shop, or its caravan buying up a line, town by town. */
export function houseMarks(s: Pick<GameState, 'houses' | 'day'>): Record<string, { by: string; kind: 'shop' | 'caravan' }[]> {
  const out: Record<string, { by: string; kind: 'shop' | 'caravan' }[]> = {};
  const H = s.houses;
  if (!H) return out;
  for (const d of HOUSES) { const t = H.list[d.id]?.shop; if (t && H.list[d.id].status !== 'gone') (out[t] ??= []).push({ by: d.id, kind: 'shop' }); }
  for (const c of H.corners) if (c.until >= s.day) (out[c.town] ??= []).push({ by: c.by, kind: 'caravan' });
  return out;
}

/** Keep the price functions in step with the save (the store calls this whenever the houses or the day change). */
export function syncHouseFx(s: Pick<GameState, 'houses' | 'day' | 'world' | 'household'>) {
  const H = s.houses;
  HOUSE_FX.corners = H?.corners ?? [];
  HOUSE_FX.shops = {};
  HOUSE_FX.partners = [];
  HOUSE_FX.gone = [];
  if (!H) { HOUSE_FX.pay = 1; return; }
  for (const d of HOUSES) {
    const st = H.list[d.id];
    if (!st) continue;
    if (st.status === 'gone') { HOUSE_FX.gone.push(d.rival); continue; }
    if (st.shop) HOUSE_FX.shops[st.shop] = d.id;
    if ((st.truce ?? 0) >= s.day) HOUSE_FX.partners.push(d.home);
  }
  const atCairo = ['giza', 'cairo'].includes(s.world?.at ?? '');
  const cut = H.cut && H.cut.until >= s.day && tableOf(s.world?.at ?? '') === H.cut.city;
  HOUSE_FX.pay = (cut || (H.cut?.city === 'cairo' && H.cut.until >= s.day && atCairo) ? CUT_PAY : 1) * (H.rumour && H.rumour.until >= s.day ? RUMOUR_PAY : 1);
}
