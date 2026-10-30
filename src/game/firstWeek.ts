// The first week: Uncle Rashid wants the first instalment of your father's debt by day 7.
// Pay before the day and he takes something off; miss it and the debt grows, his trust drops and he
// gives you one more week. Never the end of the game. The store applies it (payFamily, the nightly
// rollover); this file holds the sums and the words.
import { fmt } from './economy/money';
import { dateFor } from './economy/economy';

/** saved on family.first: the sum asked, the day it is due, what has been paid towards it, and how it ended */
export interface FirstWeek {
  sum: number;
  by: number;
  paid: number;
  /** a second chance after the first day was missed */
  second?: boolean;
  /** the day it was settled (paid, or put into the book as overdue) */
  done?: number;
  how?: 'early' | 'onTime' | 'late' | 'rolled' | 'old';
}

/** £10: about what a careful stall keeper clears in his first week (tests/sim/economy.ts has the weakest
 *  style at some £14 on the morning of day 7), so it can be done, but not while buying every rug offered */
export const FIRST_SUM = 1000;
export const FIRST_BY = 7;
/** paid in full before the day: Rashid takes £1 off the debt */
export const EARLY_OFF = 100;
export const EARLY_TRUST = 5;
/** missed: £2 added to the debt for his trouble, trust down, one more week */
export const LATE_FEE = 200;
export const LATE_TRUST = 10;
export const SECOND_DAYS = 7;

export const firstWeekStart = (): FirstWeek => ({ sum: FIRST_SUM, by: FIRST_BY, paid: 0 });

type Fam = { left: number; first?: FirstWeek } | undefined;
export const firstOpen = <T extends Fam>(f: T): f is T & { left: number; first: FirstWeek } => !!f?.first && !f.first.done && f.first.paid < f.first.sum;
/** what is still wanted, and in how many days */
export function firstDue(f: Fam, day: number): { owed: number; days: number; by: number; second: boolean } | null {
  if (!firstOpen(f)) return null;
  const w = f.first;
  return { owed: w.sum - w.paid, days: Math.max(0, w.by - day), by: w.by, second: !!w.second };
}

/** "Monday 16 March" */
export const dueDate = (by: number) => dateFor(by).long.replace(/ \d{4}$/, '').replace(',', '');

/** the countdown under the objective's label: "Rashid £10 · 6 days" */
export function countdown(owed: number, days: number) {
  return `Rashid ${fmt(owed)} · ${days === 0 ? 'today' : days === 1 ? '1 day' : `${days} days`}`;
}

/** Rashid's word on the first morning, as the day-one card and the journal give it */
export const FIRST_WORD = `Uncle Rashid sends word: he wants the first ${fmt(FIRST_SUM)} of your father's ${fmt(10000)} debt by ${dueDate(FIRST_BY)}. Pay before then and he takes ${fmt(EARLY_OFF)} off. Sell rugs at your stall to raise it.`;
