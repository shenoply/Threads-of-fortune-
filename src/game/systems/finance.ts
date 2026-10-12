// Money trouble and the ways out of it: loans from a Khan moneylender or the Banque Misr, cargo
// insurance from the Lloyd's agents, and the creditors' road from a warning letter to the court.
// Everything here is pure: the store calls these from the day's rollover and from the actions.
import type { RugItem } from '../types';
import { RUGS, CONDITION_FACTOR } from '../../data/rugs';

export interface Lender {
  id: 'khan' | 'misr';
  name: string;
  who: string;
  towns: string[];
  /** pounds in piastres the lender will go to: grows with your name and with what you are worth */
  max: (rep: number, worth?: number) => number;
  /** what you owe back on the due date, per 100 borrowed */
  owedPer100: number;
  days: number;
  minRep: number;
  blurb: string;
}

/** What the merchant is worth to a lender (cash and stock, less what he owes): kept up to date by the
 *  store, so a lender's limit grows with the business without every caller passing it in. */
export const LEND_CTX = { worth: 0 };
export const setLendWorth = (w: number) => { LEND_CTX.worth = Math.max(0, Math.round(w)); };
/** the larger of the name-based limit and the share of net worth, to a ceiling, in whole pounds */
const lendCap = (byName: number, byWorth: number, ceiling: number) => Math.min(ceiling, Math.max(byName, Math.floor(byWorth / 100) * 100));

export const LENDERS: Record<Lender['id'], Lender> = {
  khan: {
    id: 'khan', name: 'Stavros the moneylender', who: 'A Greek moneylender, with a back room behind the Khan el-Khalili in Cairo and another near the Alexandria docks',
    towns: ['cairo', 'alexandria'], max: (rep, worth = LEND_CTX.worth) => lendCap(1000 + rep * 50, worth * 0.25, 200000), owedPer100: 125, days: 30, minRep: 0,
    blurb: 'Money in your hand today, no questions, no papers. A quarter more to pay back in thirty days, and his nephews to see you if you do not.',
  },
  misr: {
    id: 'misr', name: 'Banque Misr', who: 'The new Egyptian bank of Talaat Harb, founded 1920',
    towns: ['cairo', 'alexandria'], max: (rep, worth = LEND_CTX.worth) => lendCap(2000 + rep * 150, worth * 0.5, 500000), owedPer100: 106, days: 90, minRep: 12,
    blurb: 'An Egyptian bank for Egyptian merchants. Six per cent over ninety days, but they want a name in the bazaar and stock worth at least the loan.',
  },
};

export interface Loan { id: string; lender: Lender['id']; principal: number; owed: number; taken: number; due: number; late?: boolean }

/** A rug's worth for a lender, an insurer or a bailiff: the middle of its market band, by condition. */
export const rugValue = (i: RugItem) => {
  const t = RUGS[i.typeId];
  return t ? Math.round(((t.valueBand[0] + t.valueBand[1]) / 2) * CONDITION_FACTOR[i.condition]) : 0;
};
/** cash and stock at lender's value, less loans, the landlord's bill and Rashid's credit */
export const netWorth = (s: { cash: number; inventory: RugItem[]; loans?: Loan[]; bills?: { due: number }; supplier?: { debt: number } }) =>
  s.cash + s.inventory.reduce((a, i) => a + rugValue(i), 0) - (s.loans ?? []).reduce((a, l) => a + l.owed, 0) - (s.bills?.due ?? 0) - (s.supplier?.debt ?? 0);

// ---- insurance ----
export const INSURERS = ['alexandria', 'portsaid', 'cairo'];
export const COVER_DAYS = 20;
/** the premium on what you carry: one part in twenty */
export const premiumFor = (inv: RugItem[]) => Math.max(10, Math.round(inv.filter((i) => !i.stored).reduce((s, i) => s + rugValue(i), 0) * 0.05));
/** what the insurer pays for rugs lost on the road while covered: seven parts in ten */
export const claimFor = (lost: RugItem[]) => Math.round(lost.reduce((s, i) => s + rugValue(i), 0) * 0.7);

// ---- the creditors' road ----
export interface Ruin { stage: 0 | 1 | 2 | 3; since: number; graceUntil?: number }
export const RUIN_STEPS = { bailiff: 10, court: 20 } as const;
/** small sums (a day's bread on credit) never bring a lawyer: only debts past £2 */
export const RUIN_THRESHOLD = 200;
/** after the court, a month's grace to find your feet before any creditor can start again */
export const RUIN_GRACE = 30;

/** What you owe that is already overdue: an empty purse, the landlord's late bill, loans past due, and
 *  an instalment of your father's debt that Rashid has waited for too long (familyLate: that sum). */
export function overdue(cash: number, billsDue: number, billsLate: boolean, loans: Loan[], day: number, familyLate = 0) {
  return Math.max(0, -cash) + (billsLate ? billsDue : 0) + loans.filter((l) => day > l.due).reduce((s, l) => s + l.owed, 0) + Math.max(0, familyLate);
}

/** How close to the court and bankruptcy you are right now, 0-100: 0 at the lawyer's first letter,
 *  100 the moment the court would declare you bankrupt (the full creditors' road is RUIN_STEPS.court
 *  days from that first letter, bailiff included). 0 if you owe nothing overdue. */
export function ruinRisk(ruin: Ruin, day: number): number {
  if (ruin.stage === 0) return 0;
  const late = day - ruin.since;
  return Math.max(0, Math.min(100, Math.round((late / RUIN_STEPS.court) * 100)));
}
