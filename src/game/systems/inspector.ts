// The market inspector and the trading licence. The old muhtasib was gone by 1925; his work (true
// weights and measures, licences to trade in the market) was done by an inspector of the markets office
// with a ledger and a brass standard metre. A stallholder took out a trading licence each year; the
// licence year here runs to 30 April. The inspector calls now and then, more often once a licence has
// run out. A merchant with a good name gets a warning where another gets a fine; one the lane talks
// about for tall stories gets his measuring rod checked more closely.
//
// Pure logic: no store import (the store imports this file).
import type { GameState } from '../state/store';
import type { LedgerEntry } from '../types';
import { stallKey, laneDay } from '../economy/life';
import { dateFor } from '../economy/economy';
import { fmt } from '../economy/money';
import { post, type PostState } from './post';

export interface LicenceState {
  /** the last day the licence is good for */
  until: number;
  checks: number;
  lastCheck?: number;
  /** stories got away with, and stories caught out (stats.liesOk, liesCaught), when he last checked */
  lies: number;
  caught?: number;
  fines: number;
  /** short-measure offences found */
  short: number;
}
/** a year's trading licence, by the kind of pitch: a street corner pays least */
export const LICENCE_FEE: Record<string, number> = { corner: 40, mat: 60, bazaar: 100, khan: 150 };
/** trading without a licence */
export const LAPSED_FINE = 50;
/** a measuring rod found short */
export const SHORT_FINE = 30;
/** a name this good gets a warning for a first offence */
export const LENIENT_REP = 15;
/** day 52 is 30 April 1925; a licence year runs from 1 May */
export const FIRST_UNTIL = 52;
export const YEAR = 365;
/** renewal opens this many days before the licence runs out */
export const RENEW_FROM = 14;
/** about one call in three weeks, one in four days once the licence has run out */
const CALL_CHANCE = 1 / 21, LAPSED_CHANCE = 0.25;

export const licenceFee = (up: string[]) => LICENCE_FEE[stallKey(up)] ?? 40;
/** an older save gets a licence good to the next 30 April */
export function licenceOf(s: Pick<GameState, 'licence' | 'day'>): LicenceState {
  if (s.licence) return s.licence;
  let until = FIRST_UNTIL;
  while (until < s.day) until += YEAR;
  return { until, checks: 0, lies: 0, fines: 0, short: 0 };
}
export const lapsed = (l: LicenceState, day: number) => day > l.until;
export const canRenew = (l: LicenceState, day: number) => day >= l.until - RENEW_FROM;
/** where the office is: Giza for a pitch in Giza, Cairo for the shop in the Khan */
export const officeTown = (up: string[]) => (stallKey(up) === 'khan' ? 'cairo' : 'giza');
const officeName = (up: string[]) => (stallKey(up) === 'khan' ? 'the Cairo markets office' : 'the Giza markets office');
const short = (d: number) => dateFor(d).long.replace(/ \d{4}$/, '');

/** Paying for the coming licence year. */
export function renew(s: Pick<GameState, 'licence' | 'day' | 'cash' | 'ledger' | 'upgrades'>): { ok: true; patch: Partial<GameState>; msg: string } | { ok: false; msg: string } {
  const l = licenceOf(s);
  const fee = licenceFee(s.upgrades);
  if (!canRenew(l, s.day)) return { ok: false, msg: `Your licence is good until ${short(l.until)}. The office takes renewals from ${short(l.until - RENEW_FROM)}.` };
  if (s.cash < fee) return { ok: false, msg: `The licence costs ${fmt(fee)}. You have ${fmt(s.cash)}.` };
  let until = l.until + YEAR;
  while (until < s.day) until += YEAR;
  const ledger: LedgerEntry[] = [...s.ledger, { day: s.day, kind: 'expense', label: `Trading licence to ${dateFor(until).short}`, amount: -fee }];
  return { ok: true, patch: { cash: s.cash - fee, ledger, licence: { ...l, until } }, msg: `The clerk at ${officeName(s.upgrades)} takes ${fmt(fee)}, stamps your licence and writes it up to ${dateFor(until).short}.` };
}

type Night = Pick<GameState, 'licence' | 'post' | 'upgrades' | 'stats' | 'tutorial' | 'shopBoy'>;

/** The night's licence business, after the rollover: a reminder by letter, the licence running out,
 *  and in the morning, now and then, the inspector. `at`: where you wake up. */
export function licenceNight(s: Night, patch: Partial<GameState>, notes: string[], day: number, at: string | null, rng: () => number, quiet: boolean): Partial<GameState> {
  const l0 = licenceOf({ licence: s.licence, day: day - 1 });
  let l = { ...l0 };
  let p: PostState | undefined = patch.post ?? s.post;
  let cash = patch.cash ?? 0;
  let ledger = patch.ledger ?? [];
  let journal = patch.journal ?? [];
  let rep = patch.reputation ?? 0;
  const fee = licenceFee(patch.upgrades ?? s.upgrades);
  const office = officeName(patch.upgrades ?? s.upgrades);
  if (day === l.until - 7) p = post(p, { day, sent: day, kind: 'letter', from: office.replace(/^the /, 'The '), title: 'Your trading licence', body: `Your licence to trade runs to ${short(l.until)}. Renew it at ${office} before then: ${fmt(fee)} for the year. Trading without one is a fine of ${fmt(LAPSED_FINE)}.` });
  if (day === l.until) notes.push(`Your trading licence runs out tonight. Renew it at ${office} (${fmt(fee)}): open the Ledger.`);
  if (day === l.until + 1) { const t = `Your trading licence has run out. If the market inspector calls, it is a fine of ${fmt(LAPSED_FINE)}.`; notes.push(t); journal = [...journal, { day, text: t, kind: 'due' }]; }

  const home = at === officeTown(patch.upgrades ?? s.upgrades) || at === 'giza';
  const boy = !!s.shopBoy?.hired;
  const off = laneDay(day).late; // nobody inspects on a Friday
  if (!quiet && s.tutorial.done && day >= 6 && !off && (home || boy) && rng() < (lapsed(l, day) ? LAPSED_CHANCE : CALL_CHANCE)) {
    const told = s.stats?.liesOk ?? 0, caught = s.stats?.liesCaught ?? 0;
    const newOk = Math.max(0, told - l.lies), newCaught = Math.max(0, caught - (l.caught ?? 0));
    const good = rep >= LENIENT_REP;
    const parts: string[] = [`The market inspector from ${office} called this morning${home ? '' : ' while you were away; Sami showed him the stall'}.`];
    let fine = 0, knock = 0;
    if (lapsed(l, day)) {
      fine += LAPSED_FINE + fee;
      knock += good ? 1 : 2;
      let until = l.until + YEAR; while (until < day) until += YEAR;
      l = { ...l, until, fines: l.fines + 1 };
      parts.push(`The licence had run out. He wrote a fine of ${fmt(LAPSED_FINE)} and renewed it on the spot for ${fmt(fee)}, to ${dateFor(until).short}.`);
    } else parts.push(`The licence was in order.`);
    // talk in the lane about tall stories brings the brass metre out for a closer look
    const pShort = Math.min(0.5, newOk * 0.04 + newCaught * 0.15);
    if (rng() < pShort * (good ? 0.5 : 1)) {
      l = { ...l, short: l.short + 1 };
      if (good && l.short === 1) { knock += 1; parts.push(`He has heard talk in the lane about your stories, so he laid his brass metre against your measuring rod. It was two fingers short. Your name spared you a fine: a warning in his book, and a new rod.`); }
      else { fine += SHORT_FINE; knock += 2; parts.push(`He has heard talk in the lane about your stories, so he laid his brass metre against your measuring rod. It was two fingers short: a fine of ${fmt(SHORT_FINE)}, and the lane saw it.`); }
    } else parts.push(good ? 'Your measuring rod was true. He stamped his book and stayed for a glass of tea.' : 'Your measuring rod was true against his brass metre. He stamped his book and moved on.');
    if (fine) {
      ledger = [...ledger, { day, kind: 'expense', label: lapsed(l0, day) ? `Market inspector: fine and licence` : `Market inspector: fine`, amount: -fine }];
      cash -= fine;
    }
    rep = Math.max(0, rep - knock);
    l = { ...l, checks: l.checks + 1, lastCheck: day, lies: told, caught };
    const text = parts.join(' ');
    notes.push(text);
    journal = [...journal, { day, text, kind: fine ? 'due' : 'stall' }];
  }
  const out: Partial<GameState> = { licence: l };
  if (p !== (patch.post ?? s.post)) out.post = p;
  if (patch.cash !== undefined && cash !== patch.cash) { out.cash = cash; out.ledger = ledger; }
  if (patch.journal && journal !== patch.journal) out.journal = journal;
  if (patch.reputation !== undefined && rep !== patch.reputation) out.reputation = rep;
  return out;
}
