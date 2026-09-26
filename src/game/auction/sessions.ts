// Auction houses in play: when each house holds a sale, what it sells, and who sits in the room.
// Everything is seeded by house and day, so a sale cannot be rerolled by leaving and coming back.
import { AUCTION_HOUSES } from '../../data/auctionHouses';
import type { AuctionHouse, RugTier } from './types';
import { RUGS, RUG_IDS, CONDITION_FACTOR } from '../../data/rugs';
import type { Condition, Provenance } from '../types';
import { suggestedIncrement } from './auctionSystem';
import { ladderUp, snapDown } from '../economy/money';

export const HOUSES: Record<string, AuctionHouse> = Object.fromEntries(AUCTION_HOUSES.map((h) => [h.id, h]));
export const housesIn = (city: string) => AUCTION_HOUSES.filter((h) => h.city === city).sort((a, b) => (a.tier === 'small' ? -1 : 1) - (b.tier === 'small' ? -1 : 1));
export const art = (p: string) => p.replace(/^\//, '');

const rnd = (n: number) => Math.abs(Math.sin(n * 91.345 + 3.7) * 47453.5453) % 1;
const hashId = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 100003, 7);

// ---------- Schedule ----------
const scheduleCache: Record<string, number[]> = {};
/** Sale days for a house: a first sale early in the game, then every cadenceMin–cadenceMax days. */
export function saleDays(houseId: string): number[] {
  if (scheduleCache[houseId]) return scheduleCache[houseId];
  const h = HOUSES[houseId];
  const seed = hashId(houseId);
  const out: number[] = [];
  let d = 2 + Math.floor(rnd(seed) * h.cadenceMinDays);
  for (let i = 0; d < 700; i++) {
    out.push(d);
    d += h.cadenceMinDays + Math.floor(rnd(seed + i * 7.3 + 1) * (h.cadenceMaxDays - h.cadenceMinDays + 1));
  }
  return (scheduleCache[houseId] = out);
}
export const saleOn = (houseId: string, day: number) => saleDays(houseId).includes(day);
export const nextSale = (houseId: string, day: number) => saleDays(houseId).find((d) => d >= day) ?? day;

// ---------- Lots ----------
export interface Lot {
  key: string;
  bundle: boolean;
  typeIds: string[];
  conditions: Condition[];
  provenance: Provenance[];
  /** what it is really worth at Giza prices */
  value: number;
  estimate: [number, number];
  reserve: number;
  opening: number;
  reoffered?: number;
}
export interface Reoffer { houseId: string; typeId: string; condition: Condition; provenance: Provenance; reserve: number; times: number }

const TIER_NUM: Record<RugTier, number> = { COMMON: 1, FINE: 2, EXCEPTIONAL: 3, LEGENDARY: 4, ARTIFACT: 4 };
const snap5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);
const mid = (id: string) => (RUGS[id].valueBand[0] + RUGS[id].valueBand[1]) / 2;
const worth = (id: string, c: Condition, p: Provenance) => mid(id) * CONDITION_FACTOR[c] * (p === 'Documented' ? 1.1 : p === 'Uncertain' ? 0.92 : p === 'Disputed' ? 0.8 : 1);

function pickTier(h: AuctionHouse, r: number): { tier: number; artifact: boolean } {
  const entries = Object.entries(h.tierWeights).filter(([, w]) => (w ?? 0) > 0) as [RugTier, number][];
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let x = r * total;
  for (const [t, w] of entries) { if ((x -= w) <= 0) return { tier: TIER_NUM[t], artifact: t === 'ARTIFACT' }; }
  return { tier: TIER_NUM[entries[0][0]], artifact: false };
}

/** The catalogue for a house's sale on a given day. */
export function catalogue(houseId: string, day: number, reoffers: Reoffer[] = []): Lot[] {
  const h = HOUSES[houseId];
  const seed = hashId(houseId) + day * 13;
  const small = h.tier === 'small';
  const n = h.lotMin + Math.floor(rnd(seed) * (h.lotMax - h.lotMin + 1));
  const conds: Condition[] = small ? ['Good', 'Good', 'Worn', 'Worn', 'Dirty', 'Damaged'] : ['Excellent', 'Good', 'Good', 'Good', 'Worn', 'Dirty'];
  const provs: Provenance[] = small ? ['Likely', 'Uncertain', 'Uncertain', 'Disputed'] : ['Documented', 'Documented', 'Likely', 'Uncertain'];
  const lots: Lot[] = [];
  const priceLot = (key: string, typeIds: string[], cs: Condition[], ps: Provenance[], bundle: boolean, reserveOverride?: number, reoffered?: number): Lot => {
    const value = Math.round(typeIds.reduce((s, id, j) => s + worth(id, cs[j], ps[j]), 0));
    const estimate: [number, number] = [snap5(value * 0.8), snap5(value * 1.2)];
    const reserve = reserveOverride ?? snap5(value * (small ? 0.5 : 0.7));
    // the opening call sits on the price ladder, so the auctioneer can say every price that follows
    const opening = snapDown(Math.min(reserve, value * (small ? 0.4 : 0.55)));
    return { key, bundle, typeIds, conditions: cs, provenance: ps, value, estimate, reserve, opening, reoffered };
  };
  // last time's unsold lots come back first, cheaper
  reoffers.filter((r) => r.houseId === houseId).slice(0, 2).forEach((r, i) => lots.push(priceLot(`${houseId}-${day}-re${i}`, [r.typeId], [r.condition], [r.provenance], false, r.reserve, r.times)));
  for (let i = lots.length; i < n; i++) {
    const s = seed + i * 11.7;
    // small rooms sell bundles of leftovers now and then
    if (small && rnd(s + 5) < 0.18) {
      const commons = RUG_IDS.filter((id) => (RUGS[id].tier ?? 1) === 1);
      const k = 2 + Math.floor(rnd(s + 6) * 3);
      const ids = Array.from({ length: k }, (_, j) => commons[Math.floor(rnd(s + 7 + j * 2.3) * commons.length)]);
      const cs = ids.map((_, j) => conds[Math.floor(rnd(s + 9 + j * 3.1) * conds.length)]);
      lots.push(priceLot(`${houseId}-${day}-${i}`, ids, cs, ids.map(() => 'Uncertain' as Provenance), true));
      continue;
    }
    const { tier, artifact } = pickTier(h, rnd(s + 1));
    const pool = RUG_IDS.filter((id) => (RUGS[id].tier ?? 1) === tier);
    const id = pool[Math.floor(rnd(s + 2) * pool.length)];
    const c = artifact ? 'Excellent' : conds[Math.floor(rnd(s + 3) * conds.length)];
    const p = artifact ? 'Documented' : provs[Math.floor(rnd(s + 4) * provs.length)];
    lots.push(priceLot(`${houseId}-${day}-${i}`, [id], [c], [p], false));
  }
  // cheaper lots first, the best pieces at the end of the sale
  return lots.sort((a, b) => a.value - b.value);
}

// ---------- The room ----------
export interface RoomBidder { id: string; name: string; who: string; img?: string; budget: number; aggression: number; wants: (l: Lot) => boolean }

const tierOfLot = (l: Lot) => Math.max(...l.typeIds.map((id) => RUGS[id].tier ?? 1));
const has = (l: Lot, t: string) => l.typeIds.some((id) => RUGS[id].traits.includes(t as never));
const from = (l: Lot, re: RegExp) => l.typeIds.some((id) => re.test(RUGS[id].origin));

interface Seat { id: string; name: string; who: string; img?: string; budget: [number, number]; aggression: number; wants: (l: Lot) => boolean; houses: 'small' | 'grand' | 'any'; cities?: string[] }
const SEATS: Seat[] = [
  // the regulars of the grand sales
  { id: 'greek', name: 'Mr Karamanlis', who: 'a dealer from Smyrna', img: 'art/portraits/bidder-greek.jpg', budget: [2000, 9000], aggression: 0.66, wants: (l) => l.bundle || tierOfLot(l) === 2, houses: 'any', cities: ['alexandria', 'istanbul', 'cairo', 'jerusalem'] },
  { id: 'lady', name: 'Emine Hanım', who: 'collecting for her Istanbul house', img: 'art/portraits/bidder-lady.jpg', budget: [5000, 22000], aggression: 0.74, wants: (l) => tierOfLot(l) >= 3 || from(l, /Istanbul|Anatolia|Konya|Turk/i), houses: 'grand', cities: ['istanbul', 'cairo', 'alexandria', 'damascus'] },
  { id: 'american', name: 'Mr Burke', who: 'buying for a museum in Boston', img: 'art/portraits/bidder-american.jpg', budget: [4000, 30000], aggression: 0.82, wants: (l) => l.provenance[0] === 'Documented' || has(l, 'antique') || has(l, 'rare'), houses: 'grand' },
  // your own customers, bidding at home
  { id: 'benakis', name: 'Mr Benakis', who: 'the cotton broker', img: 'art/portraits/benakis.jpg', budget: [1000, 7000], aggression: 0.7, wants: (l) => has(l, 'ornate') || has(l, 'silk'), houses: 'grand', cities: ['alexandria'] },
  { id: 'levy', name: 'Madame Lévy', who: 'buying for her store', img: 'art/portraits/levy.jpg', budget: [700, 2500], aggression: 0.55, wants: (l) => tierOfLot(l) === 2, houses: 'small', cities: ['alexandria'] },
  { id: 'hollister', name: 'Mr Hollister', who: 'the American collector', img: 'art/portraits/hollister.jpg', budget: [3000, 25000], aggression: 0.8, wants: (l) => has(l, 'antique') || has(l, 'rare'), houses: 'grand', cities: ['jerusalem'] },
  { id: 'martel', name: 'the Comte de Martel', who: 'of the French High Commission', img: 'art/portraits/martel.jpg', budget: [2500, 9000], aggression: 0.6, wants: (l) => l.provenance[0] === 'Documented', houses: 'grand', cities: ['damascus'] },
  { id: 'rustam', name: 'Rustam Isfahani', who: 'the Persian merchant', img: 'art/portraits/rustam.jpg', budget: [2500, 12000], aggression: 0.72, wants: (l) => has(l, 'fineWeave') || from(l, /Persia|Baghdad|Isfahan/i), houses: 'any', cities: ['baghdad', 'istanbul'] },
  { id: 'shivakiar', name: 'Princess Shivakiar\'s steward', who: 'bidding for the Princess', img: 'art/portraits/shivakiar.jpg', budget: [12000, 45000], aggression: 0.7, wants: (l) => tierOfLot(l) >= 4 || has(l, 'silk'), houses: 'grand', cities: ['cairo'] },
  { id: 'wasif', name: 'Wasif Bey Ghali', who: 'the lawyer', img: 'art/portraits/wasif.jpg', budget: [2200, 8000], aggression: 0.6, wants: (l) => l.provenance[0] === 'Documented' && has(l, 'antique'), houses: 'grand', cities: ['cairo'] },
  { id: 'salem', name: 'Sheikh Salem', who: 'the Tarabin notable', img: 'art/portraits/salem.jpg', budget: [300, 1800], aggression: 0.5, wants: (l) => has(l, 'hardwearing') || has(l, 'flatweave'), houses: 'small', cities: ['amman', 'cairo'] },
  // the small-room crowd
  { id: 'khan', name: 'A Khan dealer', who: 'buying stock to resell', budget: [400, 2600], aggression: 0.6, wants: (l) => l.bundle || l.conditions[0] === 'Dirty' || l.conditions[0] === 'Worn', houses: 'small' },
  { id: 'hotel', name: 'A hotel manager', who: 'refurnishing forty rooms', budget: [600, 3500], aggression: 0.5, wants: (l) => has(l, 'hardwearing'), houses: 'small' },
  { id: 'villager', name: 'A village merchant', who: 'up from the provinces', budget: [150, 900], aggression: 0.45, wants: (l) => tierOfLot(l) === 1, houses: 'small' },
  { id: 'pasha', name: 'A pasha\'s agent', who: 'furnishing a new house', budget: [1500, 9000], aggression: 0.55, wants: (l) => has(l, 'ornate'), houses: 'grand' },
];

/** Selim Kassab's purse grows with yours: he always has a little more than you. */
export const selimBudget = (cash: number, rep: number) => Math.max(400, Math.round(cash * 1.15 * (1 + Math.min(rep, 100) / 180)));

/** Who sits in the room for this sale. */
export function roomFor(houseId: string, day: number, you: { cash: number; rep: number; rival: boolean }): RoomBidder[] {
  const h = HOUSES[houseId];
  const seed = hashId(houseId) + day * 5;
  const fits = SEATS.filter((s) => (s.houses === 'any' || s.houses === h.tier) && (!s.cities || s.cities.includes(h.city)));
  const home = fits.filter((s) => s.cities?.length && s.cities.length <= 2);
  const rest = fits.filter((s) => !home.includes(s)).sort((a, b) => rnd(seed + a.id.length * 3.3 + b.id.charCodeAt(0)) - 0.5);
  const chosen = [...home.slice(0, 2), ...rest].slice(0, h.tier === 'grand' ? 4 : 3);
  const out: RoomBidder[] = chosen.map((s, i) => ({ id: s.id, name: s.name, who: s.who, img: s.img, budget: Math.round(s.budget[0] + (s.budget[1] - s.budget[0]) * rnd(seed + i * 4.1)), aggression: s.aggression, wants: s.wants }));
  if (you.rival) out.push({ id: 'selim', name: 'Selim Kassab', who: 'your rival from the next stall', img: 'art/portraits/kassab.jpg', budget: selimBudget(you.cash, you.rep), aggression: 0.7, wants: () => true });
  return out;
}

/** How far a bidder will go on this lot. */
export function ceilingFor(b: RoomBidder, l: Lot, roll: number) {
  const keen = b.wants(l);
  const interest = keen ? 1 + b.aggression * 0.22 : 0.72 + b.aggression * 0.12;
  const jitter = 0.9 + roll * 0.2;
  return Math.round(Math.min(b.budget, l.value * interest * jitter));
}
/** Bids climb the merchant's price ladder, so every called price has a recording. Small rooms move a step at a time. */
export const increment = (bid: number, tier: 'small' | 'grand') => (ladderUp(bid) - bid) || suggestedIncrement(bid, tier);

/** Grand sales in the next few days, for the rumour board. */
export function upcomingGrandSales(day: number, within = 4) {
  return AUCTION_HOUSES.filter((h) => h.tier === 'grand').map((h) => ({ h, d: nextSale(h.id, day) })).filter((x) => x.d - day <= within).sort((a, b) => a.d - b.d);
}
