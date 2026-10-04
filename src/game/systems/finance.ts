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
  /** pounds in piastres the lender will go to */
  max: (rep: number) => number;
  /** what you owe back on the due date, per 100 borrowed */
  owedPer100: number;
  days: number;
  minRep: number;
  blurb: string;
}

export const LENDERS: Record<Lender['id'], Lender> = {
  khan: {
    id: 'khan', name: 'Stavros the moneylender', who: 'A Greek moneylender behind the Khan el-Khalili',
    towns: ['cairo', 'alexandria'], max: (rep) => 1000 + rep * 50, owedPer100: 125, days: 30, minRep: 0,
    blurb: 'Money in your hand today, no questions, no papers. A quarter more to pay back in thirty days, and his nephews to see you if you do not.',
  },
  misr: {
    id: 'misr', name: 'Banque Misr', who: 'The new Egyptian bank of Talaat Harb, founded 1920',
    towns: ['cairo', 'alexandria'], max: (rep) => 2000 + rep * 150, owedPer100: 106, days: 90, minRep: 12,
    blurb: 'An Egyptian bank for Egyptian merchants. Six per cent over ninety days, but they want a name in the bazaar and stock worth at least the loan.',
  },
};

export interface Loan { id: string; lender: Lender['id']; principal: number; owed: number; taken: number; due: number; late?: boolean }

/** A rug's worth for a lender, an insurer or a bailiff: the middle of its market band, by condition. */
export const rugValue = (i: RugItem) => {
  const t = RUGS[i.typeId];
  return t ? Math.round(((t.valueBand[0] + t.valueBand[1]) / 2) * CONDITION_FACTOR[i.condition]) : 0;
};

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

/** What you owe that is already overdue: an empty purse, the landlord's late bill, loans past due. */
export function overdue(cash: number, billsDue: number, billsLate: boolean, loans: Loan[], day: number) {
  return Math.max(0, -cash) + (billsLate ? billsDue : 0) + loans.filter((l) => day > l.due).reduce((s, l) => s + l.owed, 0);
}

/** How close to the court and bankruptcy you are right now, 0-100: 0 at the lawyer's first letter,
 *  100 the moment the court would declare you bankrupt (the full creditors' road is RUIN_STEPS.court
 *  days from that first letter, bailiff included). 0 if you owe nothing overdue. */
export function ruinRisk(ruin: Ruin, day: number): number {
  if (ruin.stage === 0) return 0;
  const late = day - ruin.since;
  return Math.max(0, Math.min(100, Math.round((late / RUIN_STEPS.court) * 100)));
}
