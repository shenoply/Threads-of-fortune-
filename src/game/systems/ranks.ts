// The season's tables: what each house in a city sold in rugs this season, your own sales among them.
// A season is 91 days from the opening day (spring, summer, autumn, winter). The named houses
// (data/rivals.ts) and the smaller shops sell a little every day; your sales are counted through
// recordCitySale() wherever a rug changes hands. Standing brings things with it:
//   top ten in a city   its auction houses waive their buyer's premium for you
//   top three           a hotel or consulate there may send an order through you on a Monday
//   first               a title at the season's end, kept, and dealers' prices a little lower there
// Passing a named house for the first time in a season brings one short notice and his answer:
// an aggressive man cuts his prices there for a few days, a cunning one talks you down, the others
// pay you a compliment. Randomness here is hashed from the day, so it never disturbs the store's dice.
import { RIVALS, RIVAL, RANK_CITY, RANK_CITIES, RANK_TABLE_OF, lesserShops, type Rival } from '../../data/rivals';
import { fmt, snap, snapDown } from '../economy/money';
import { dateFor } from '../economy/economy';
import type { GameState } from '../state/store';
import { inLawHouses } from './household';

export const SEASON_DAYS = 91;
/** days a cut in prices lasts */
export const UNDERCUT_DAYS = 4;
/** what a dealer's bid loses while a rival is undercutting you there */
export const UNDERCUT_BID = 0.9;
/** what dealers in a city you lead take off their prices for you */
export const FIRST_DISCOUNT = 0.95;

export interface RanksState {
  /** the season these tables are for (seasonOf) */
  season: number;
  /** city -> row id -> rugs sold this season, in piastres; 'you' is the player */
  tables: Record<string, Record<string, number>>;
  /** tables you have sold in (ever) */
  seen: string[];
  /** cities where a season ended with you first */
  firsts: string[];
  /** `${season}:${rivalId}`: houses already passed this season (one answer each) */
  reacted: string[];
  /** houses just passed, waiting for their answer */
  pending?: { rival: string; city: string }[];
  /** a rival cutting his prices in a city, until the day given */
  undercut?: Record<string, { by: string; until: number }>;
  /** how the last season ended */
  last?: { season: number; day: number; places: Record<string, number>; tops: Record<string, { label: string; value: number }[]> };
}

export interface Row { id: string; label: string; role?: string; rival?: Rival; value: number; target: number; you?: boolean }

export const seasonOf = (day: number) => Math.floor((Math.max(1, day) - 1) / SEASON_DAYS);
export const seasonEnd = (season: number) => (season + 1) * SEASON_DAYS;
export function seasonName(season: number) {
  const part = ['spring', 'summer', 'autumn', 'winter'][season % 4];
  const y = 1925 + Math.floor(season / 4);
  return `the ${part} season of ${part === 'winter' ? `${y}–${String((y + 1) % 100).padStart(2, '0')}` : y}`;
}
export const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
export const cityName = (id: string) => RANK_CITY[id]?.name ?? id;
/** the table a sale in this town counts in, if any */
export const tableOf = (cityId: string | null | undefined) => (!cityId ? undefined : RANK_CITY[cityId] ? cityId : RANK_TABLE_OF[cityId]);

const hash = (n: number, k: string) => {
  let h = 2166136261 ^ n;
  for (let i = 0; i < k.length; i++) h = Math.imul(h ^ k.charCodeAt(i), 16777619);
  h = Math.imul(h ^ (h >>> 15), 2246822507);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
};

export const freshRanks = (day: number): RanksState => ({ season: seasonOf(day), tables: {}, seen: [], firsts: [], reacted: [] });
const ranksOf = (s: { ranks?: RanksState; day: number }) => s.ranks ?? freshRanks(s.day);

/** A city's table, best first. Ties go against you, so a new season starts you at the bottom. */
export function standings(r: RanksState | undefined, city: string): Row[] {
  const t = r?.tables[city] ?? {};
  const rows: Row[] = [
    ...RIVALS.filter((x) => x.cities.includes(city)).map((x) => ({ id: x.id, label: x.name, role: x.role, rival: x, value: t[x.id] ?? 0, target: x.season })),
    ...lesserShops(city).map((x) => ({ id: x.id, label: x.label, value: t[x.id] ?? 0, target: x.season })),
    { id: 'you', label: 'You', value: t.you ?? 0, target: -1, you: true },
  ];
  return rows.sort((a, b) => b.value - a.value || b.target - a.target);
}
/** your place in a city's table this season (1 = first) */
export function placeIn(r: RanksState | undefined, city: string) {
  const rows = standings(r, city);
  return { place: rows.findIndex((x) => x.you) + 1, of: rows.length, value: r?.tables[city]?.you ?? 0 };
}
/** your best standing in a city: this season (once you have sold there) or how the last one ended */
export function standing(r: RanksState | undefined, city: string): number {
  if (!r) return 99;
  const now = (r.tables[city]?.you ?? 0) > 0 ? placeIn(r, city).place : 99;
  const was = r.last && r.last.season === r.season - 1 ? r.last.places[city] ?? 99 : 99;
  return Math.min(now, was);
}
/** top ten: the auction houses of the city waive their premium for you */
export const auctionWelcome = (s: { ranks?: RanksState }, city: string) => standing(s.ranks, tableOf(city) ?? city) <= 10;
/** cities where you lead now (with sales) or hold the title: dealers there sell to you a little cheaper */
export const firstCities = (s: { ranks?: RanksState }) => {
  const r = s.ranks;
  if (!r) return [];
  return [...new Set([...r.firsts, ...r.seen.filter((c) => (r.tables[c]?.you ?? 0) > 0 && placeIn(r, c).place === 1)])];
};
/** kept in step with the save by the store, for the pure price functions */
export const RANK_FX: { first: string[] } = { first: [] };
/** a dealer's bid while a rival is cutting his prices in that city */
export function undercutBid(s: { ranks?: RanksState; day: number }, cityId: string, bid: number) {
  const t = tableOf(cityId);
  const u = t ? s.ranks?.undercut?.[t] : undefined;
  return u && u.until >= s.day ? snapDown(bid * UNDERCUT_BID) : bid;
}

/** Count a sale of yours in the city where it was made (stall, dealer, a buyer in town, your shop's
 *  takings). Returns the patch: { ranks }, or {} when that town keeps no table. */
export function recordCitySale(s: { ranks?: RanksState; day: number }, cityId: string | null | undefined, amount: number): { ranks?: RanksState } {
  const city = tableOf(cityId);
  if (!city || !(amount > 0)) return {};
  const r = ranksOf(s);
  const before = standings(r, city);
  const youBefore = r.tables[city]?.you ?? 0;
  const ahead = new Set(before.filter((x) => x.rival && x.value >= youBefore).map((x) => x.id));
  const tables: RanksState['tables'] = { ...r.tables, [city]: { ...(r.tables[city] ?? {}), you: youBefore + Math.round(amount) } };
  const youNow = tables[city].you;
  const passed = [...ahead].filter((id) => (tables[city][id] ?? 0) < youNow && !r.reacted.includes(`${r.season}:${id}`));
  return {
    ranks: {
      ...r,
      tables,
      seen: r.seen.includes(city) ? r.seen : [...r.seen, city],
      reacted: passed.length ? [...r.reacted, ...passed.map((id) => `${r.season}:${id}`)].slice(-80) : r.reacted,
      pending: passed.length ? [...(r.pending ?? []), ...passed.map((id) => ({ rival: id, city }))] : r.pending,
    },
  };
}

/** what a house sells in a day */
function daySales(row: Row, day: number, undercutting: boolean) {
  const h = hash(day, row.id);
  const t = row.rival?.temper;
  const m = t === 'aggressive' ? 0.4 + 1.2 * h : t === 'steady' ? 0.85 + 0.3 * h : t === 'cunning' ? 0.6 + 0.8 * h : t === 'old' ? (h < 0.1 ? 0 : 0.9 + 0.2 * h) : 0.5 + h;
  return Math.round((row.target / SEASON_DAYS) * m * (undercutting ? 1.3 : 1));
}

const ANSWER: Record<Rival['temper'], (r: Rival, city: string) => string> = {
  aggressive: (r, c) => `You have sold more than ${r.name} in ${c} this season. ${r.she ? 'She' : 'He'} is cutting ${r.she ? 'her' : 'his'} prices there for a few days to win the buyers back.`,
  cunning: (r, c) => `You have sold more than ${r.name} in ${c} this season. ${r.she ? 'She' : 'He'} is telling the trade there that your rugs are not all they seem. Some of them listen.`,
  steady: (r, c) => `You have sold more than ${r.name} in ${c} this season. ${r.she ? 'She' : 'He'} sends ${r.she ? 'her' : 'his'} compliments, and means them.`,
  old: (r, c) => `You have sold more than ${r.name} in ${c} this season. ${r.she ? 'She' : 'He'} says you sell too cheap, but ${r.she ? 'she' : 'he'} knows your name now.`,
};

/** A house just passed answers: one notice for the first, a journal line for each. */
export function rankReaction(s: Pick<GameState, 'ranks' | 'day' | 'reputation' | 'journal' | 'jobNote'> & { household?: GameState['household'] }): Partial<GameState> {
  const r = s.ranks;
  if (!r?.pending?.length) return {};
  let rep = s.reputation;
  const undercut = { ...(r.undercut ?? {}) };
  const journal = [...s.journal];
  let note: string | undefined;
  for (const p of r.pending) {
    const rv = RIVAL[p.rival];
    if (!rv) continue;
    const c = cityName(p.city);
    // family: your father-in-law is proud of you, not angry
    if (inLawHouses(s.household).includes(rv.id)) {
      const text = `${rv.name} hears you have passed him in ${c}. "My son-in-law," he tells the souq, and buys the coffee.`;
      rep += 1;
      journal.push({ day: s.day, text, kind: 'stall' } as GameState['journal'][number]);
      note = note ?? text;
      continue;
    }
    const text = ANSWER[rv.temper](rv, c);
    if (rv.temper === 'aggressive') undercut[p.city] = { by: rv.id, until: s.day + UNDERCUT_DAYS };
    else if (rv.temper === 'cunning') rep = Math.max(0, rep - 1);
    else rep += 1;
    journal.push({ day: s.day, text, kind: 'stall' } as GameState['journal'][number]);
    note = note ?? text;
  }
  return { ranks: { ...r, pending: undefined, undercut }, reputation: rep, journal, ...(note && !s.jobNote ? { jobNote: note } : {}) };
}

const ORDERS: Record<string, string[]> = {
  cairo: ["Shepheard's Hotel", 'the Continental-Savoy', 'the Mena House Hotel', 'the French consulate'],
  alexandria: ['the San Stefano Hotel', 'the Windsor Palace Hotel', 'the Italian consulate', 'the Greek consulate'],
  portsaid: ['the Eastern Exchange Hotel', 'the French consulate', 'the Suez Canal Company'],
  jaffa: ['the British consulate', 'the French consulate'],
  jerusalem: ['the American Colony', 'the Italian consulate', 'the French consulate'],
  beirut: ['the Hotel Bassoul', 'the French High Commission', 'the Italian consulate'],
  damascus: ['the Hotel Victoria', 'the British consulate'],
  aleppo: ['the Baron Hotel', 'the British consulate', 'the French consulate'],
  baghdad: ['the Tigris Palace Hotel', 'the British Residency'],
  istanbul: ['the Pera Palace Hotel', 'the British embassy', 'the Italian embassy'],
  amman: ['the British Residency'],
};

/** The night's work on the tables: every house sells its day, a season may end, a Monday may bring
 *  an order, and a rival cutting prices in Cairo may take a stall buyer. `s` is the state with the
 *  rest of the night already applied; `day` the new day. */
export function ranksNight(s: GameState, day: number): { patch: Partial<GameState>; notes: string[] } {
  if (!s.started) return { patch: {}, notes: [] };
  let r = ranksOf(s);
  const notes: string[] = [];
  const patch: Partial<GameState> = {};
  // the day just ended: every house sells
  const tables: RanksState['tables'] = { ...r.tables };
  for (const c of RANK_CITIES) {
    const t = { ...(tables[c.id] ?? {}) };
    const cut = r.undercut?.[c.id];
    for (const row of standings(r, c.id)) if (!row.you) t[row.id] = (t[row.id] ?? 0) + daySales(row, s.day, !!cut && cut.until >= s.day && cut.by === row.id);
    tables[c.id] = t;
  }
  r = { ...r, tables };
  // the season ends: the final tables, a line in the journal, titles to the cities you led
  if (seasonOf(day) > r.season) {
    const places: Record<string, number> = {};
    const tops: Record<string, { label: string; value: number }[]> = {};
    const firsts = [...r.firsts];
    const lines: string[] = [];
    for (const c of RANK_CITIES) {
      const rows = standings(r, c.id);
      tops[c.id] = rows.slice(0, 3).map((x) => ({ label: x.label, value: x.value }));
      const mine = r.tables[c.id]?.you ?? 0;
      if (!(mine > 0)) continue;
      const p = rows.findIndex((x) => x.you) + 1;
      places[c.id] = p;
      if (p === 1) {
        if (!firsts.includes(c.id)) firsts.push(c.id);
        lines.push(`${c.name}: first of ${rows.length}, with ${fmt(mine)}. You are First Merchant of ${c.name}.`);
      } else lines.push(`${c.name}: ${ordinal(p)} of ${rows.length}, with ${fmt(mine)}. ${rows[0].label} was first.`);
    }
    const head = `The end of ${seasonName(r.season)}.`;
    if (lines.length) {
      notes.push(`${head} ${lines.join(' ')}`);
      patch.journal = [...(s.journal ?? []), { day, text: `${head} The rug trade's tables: ${lines.join(' ')}`, kind: 'stall' } as GameState['journal'][number]];
    }
    r = { ...r, season: seasonOf(day), tables: {}, firsts, reacted: [], last: { season: r.season, day, places, tops } };
  }
  // Monday: a hotel or consulate in a city where you stand in the top three sends an order
  if (dateFor(day).weekday === 'Monday') {
    for (const c of r.seen) {
      if (standing(r, c) > 3 || hash(day, `${c}:order`) >= 0.4) continue;
      const list = ORDERS[c] ?? ['a consulate'];
      const who = list[Math.floor(hash(day, `${c}:who`) * list.length)];
      const fee = snap(Math.max(300, Math.min(5000, (r.tables[c]?.you ?? 0) * 0.05)));
      const text = `An order from ${who}, who came to you as one of the first rug dealers of ${cityName(c)}. Your commission: ${fmt(fee)}.`;
      patch.cash = (s.cash ?? 0) + fee;
      patch.ledger = [...(s.ledger ?? []), { day, kind: 'bonus', label: `Order from ${who}`, amount: fee }];
      patch.journal = [...(patch.journal ?? s.journal ?? []), { day, text, kind: 'stall' } as GameState['journal'][number]];
      notes.push(text);
      break;
    }
  }
  // Monday: a father-in-law's house passes on an order it cannot fill
  if (dateFor(day).weekday === 'Monday') {
    for (const id of inLawHouses(s.household)) {
      const rv = RIVAL[id];
      if (!rv || hash(day, `${id}:inlaw`) >= 0.35) continue;
      const fee = snap(Math.max(250, Math.min(3000, rv.season * 0.004)));
      const text = `${rv.name} sends a customer's order through you, as family does: commission ${fmt(fee)}.`;
      patch.cash = (patch.cash ?? s.cash ?? 0) + fee;
      patch.ledger = [...(patch.ledger ?? s.ledger ?? []), { day, kind: 'bonus', label: `Order from ${rv.name}, your father-in-law`, amount: fee }];
      notes.push(text);
    }
  }
  // a rival cutting his prices in Cairo takes one of the stall's buyers now and then
  const cut = r.undercut?.cairo;
  if (cut && cut.until >= day && s.world.at === 'giza' && (s.queue?.length ?? 0) > 1 && hash(day, 'cut') < 0.5) {
    const keep = new Set(['cohen', 'malek', 'nabil', ...(s.appointments ?? []).map((a) => a.buyerId)]);
    const q = [...s.queue];
    for (let i = q.length - 1; i >= 0; i--) if (!keep.has(q[i])) { q.splice(i, 1); break; }
    if (q.length < s.queue.length) {
      patch.queue = q;
      if (s.arrivals) patch.arrivals = s.arrivals.slice(0, q.length);
      notes.push(`${RIVAL[cut.by]?.name ?? 'A rival'} is selling cheap in Cairo this week. One buyer fewer will come to your stall today.`);
    }
  }
  // leading Cairo: Rashid takes a little off his prices too
  if (firstCities({ ranks: r }).includes('cairo') && s.supplier?.offers) patch.supplier = { ...s.supplier, offers: s.supplier.offers.map((o) => ({ ...o, price: snap(o.price * FIRST_DISCOUNT) })) };
  if (r.undercut) r = { ...r, undercut: Object.fromEntries(Object.entries(r.undercut).filter(([, u]) => u.until >= day)) };
  patch.ranks = r;
  return { patch, notes };
}

/** For the paper in the days after a season ends: the final tables of Cairo and wherever you sold. */
export function seasonNews(s: { ranks?: RanksState }, day: number): string[] {
  const l = s.ranks?.last;
  if (!l || day < l.day || day - l.day > 3) return [];
  const cities = [...new Set(['cairo', ...Object.keys(l.places)])];
  return cities.map((c) => {
    const top = (l.tops[c] ?? []).map((x, i) => `${i + 1}. ${x.label === 'You' ? 'you' : x.label} ${fmt(x.value)}`).join('; ');
    const me = l.places[c] > 3 ? `; you were ${ordinal(l.places[c])}` : '';
    return `The rug trade in ${cityName(c)}, ${seasonName(l.season).replace(/^the /, '')}: ${top}${me}.`;
  });
}
