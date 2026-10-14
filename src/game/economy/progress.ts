import { fmt } from './money';
// The long game: net worth, merchant rank, the Carpet Register and the House of Fortune.
import { RUGS, RUG_IDS, CONDITION_FACTOR } from '../../data/rugs';
import { UPGRADES } from '../../data/suppliers';
import { BUYERS } from '../../data/buyers';
import type { RugItem } from '../types';
import { missionsDone, MAIN_ORDER, MISSIONS } from '../../data/missions';

interface S { cash: number; reputation: number; inventory: RugItem[]; upgrades: string[]; supplier: { debt: number }; court: { warrants: string[] }; register?: string[]; missions?: Record<string, string>;
  loans?: { owed: number }[]; family?: { left: number }; bills?: { due: number };
  /** shops in other cities (systems/shops.ts): their leases and the rugs on their walls */
  shops?: Record<string, { paid?: number; khan?: boolean; stock?: RugItem[] }> }

const PROPERTY: Record<string, number> = { khan: 60000 };
export const ROYAL_IDS = Object.values(BUYERS).filter((b) => b.royal).map((b) => b.id);

/** What the rugs would fetch at market, in their present condition. */
export const stockValue = (inv: RugItem[]) =>
  inv.reduce((s, i) => { const t = RUGS[i.typeId]; return s + ((t.valueBand[0] + t.valueBand[1]) / 2) * CONDITION_FACTOR[i.condition]; }, 0);

/** Everything you owe, each counted once: Rashid's credit, lenders' loans (with their interest),
 *  what is left of your father's debt (the instalment now due is part of it) and unpaid bills. */
export function liabilities(s: Pick<S, 'supplier' | 'loans' | 'family' | 'bills'>) {
  return s.supplier.debt + (s.loans ?? []).reduce((a, l) => a + l.owed, 0) + Math.max(0, s.family?.left ?? 0) + Math.max(0, s.bills?.due ?? 0);
}
/** what the "owed" figure is made of, in words: "your father's debt £100 · Rashid £20" */
export function owedParts(s: Pick<S, 'supplier' | 'loans' | 'family' | 'bills'>): string {
  const parts: [string, number][] = [["Rashid", s.supplier.debt], ['loans', (s.loans ?? []).reduce((a, l) => a + l.owed, 0)], ["your father's debt", Math.max(0, s.family?.left ?? 0)], ['bills', Math.max(0, s.bills?.due ?? 0)]];
  return parts.filter(([, v]) => v > 0).map(([k, v]) => `${k} ${fmt(v)}`).join(' · ');
}
export function netWorth(s: S) {
  const property = s.upgrades.reduce((a, u) => a + (PROPERTY[u] ?? 0), 0);
  const shops = Object.values(s.shops ?? {}).reduce((a, sh) => a + (sh.khan ? 0 : sh.paid ?? 0) + stockValue(sh.stock ?? []), 0);
  return Math.round(s.cash + stockValue(s.inventory) + property + shops - liabilities(s));
}

export const HOUSE_TARGET = 500000; // £5,000: a rich man's fortune in 1925

export const RANKS = [
  { id: 'stall', name: 'Stall keeper', worth: 0, rep: 0, warrants: 0, note: 'A borrowed corner and a cat.' },
  { id: 'bazaar', name: 'Bazaar merchant', worth: 6000, rep: 10, warrants: 0, note: 'Net worth £60 and reputation 10.' },
  { id: 'khan', name: 'Khan dealer', worth: 17500, rep: 25, warrants: 0, note: 'Net worth £175 and reputation 25.' },
  { id: 'levant', name: 'Merchant of the Levant', worth: 30000, rep: 40, warrants: 1, note: 'Net worth £300, reputation 40 and one royal warrant.' },
  { id: 'kings', name: 'Purveyor to Kings', worth: 90000, rep: 55, warrants: 3, note: 'Net worth £900, reputation 55 and three royal warrants.' },
] as const;

export function rankOf(s: S) {
  const w = netWorth(s);
  let natural = 0;
  RANKS.forEach((r, i) => { if (w >= r.worth && s.reputation >= r.rep && s.court.warrants.length >= r.warrants) natural = i; });
  const mDone = missionsDone(s.missions);
  const idx = Math.min(natural, mDone); // each finished main mission lets the rank rise one more step
  const next = RANKS[idx + 1] as (typeof RANKS)[number] | undefined;
  // reputation, net worth and warrants can all clear the next rank's bar while the story itself still
  // holds it back (Selim still has a stall, say) — that reads as a stuck progress bar unless callers
  // can say which of the three is actually the one still missing
  const blockedByStory = next ? natural > mDone : false;
  const blockingMission = blockedByStory ? MISSIONS[MAIN_ORDER[mDone]] : undefined;
  // the other direction: every main mission up to here is finished, but net worth or reputation has
  // not caught up yet. Without calling this out by name, "Stall keeper" after finishing a mission
  // just reads as broken — the general reputation note says the numbers, but not that money is the
  // one thing actually holding the title back right now.
  const blockedByWorth = next ? mDone > natural : false;
  return { idx, rank: RANKS[idx], next, worth: w, blockedByStory, blockingMission, blockedByWorth };
}

/** The four conditions of the ultimate goal. */
export function houseOfFortune(s: S) {
  const reg = s.register ?? [];
  const parts = [
    { id: 'shop', label: 'Own a shop in Khan el-Khalili', done: s.upgrades.includes('khan'), prog: s.upgrades.includes('khan') ? 'bought' : `${fmtShort(UPGRADES.find((u) => u.id === 'khan')!.cost)}, reputation 60` },
    { id: 'warrants', label: 'Hold all five royal warrants', done: ROYAL_IDS.every((id) => s.court.warrants.includes(id)), prog: `${s.court.warrants.length}/${ROYAL_IDS.length}` },
    { id: 'register', label: 'Complete the Carpet Register, Baghdad Night included', done: RUG_IDS.every((id) => reg.includes(id)), prog: `${RUG_IDS.filter((id) => reg.includes(id)).length}/${RUG_IDS.length}` },
    { id: 'worth', label: 'Reach a net worth of £5,000', done: netWorth(s) >= HOUSE_TARGET, prog: `${Math.max(0, Math.min(100, Math.floor((netWorth(s) / HOUSE_TARGET) * 100)))}%` },
  ];
  return { parts, done: parts.every((p) => p.done) };
}

const fmtShort = (pt: number) => `£${(pt / 100).toLocaleString('en-GB')}`;

/** How much progress there is: levels, titles and Register entries. Lights the Merchant tab when something new happened. */
export const progressScore = (g: { skills?: Record<string, number | undefined>; titles?: string[]; register?: string[] }) =>
  Object.values(g.skills ?? {}).reduce((a: number, xp) => a + Math.floor(Math.sqrt((xp ?? 0) / 12)), 0) + (g.titles?.length ?? 0) * 10 + (g.register?.length ?? 0);
