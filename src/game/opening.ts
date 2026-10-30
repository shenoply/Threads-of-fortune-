// The opening: a new merchant's first days, one step at a time, each teaching one thing and each
// ticking itself off from what the player has actually done. Until it is finished (or skipped) only
// Giza, Cairo and, later, Alexandria are open on the map, so nothing pulls a newcomer off the path.
import type { GameState } from './state/store';
import { isPersian } from '../data/persiaMap';
import { persiaOpen, persiaWhy, shopTowns } from './unlocks';
import { fmt as fmtP } from './economy/money';

export const OPENING_TIP = 'first-hour'; // the old first-hour hint's id: dismissing either skips both
/** Settings' "Skip the lessons" and "Show the lessons again", kept in tipsSeen */
export const LESSONS_OFF = 'lessons-off';
export const LESSONS_ON = 'lessons-on';
type S = GameState;

export interface OpeningStep {
  id: string;
  text: (s: S) => string;
  btn: string;
  /** where the button takes you: 'stall', a chapter target, or a district place */
  go: string;
  done: (s: S) => boolean;
}

// Where you have been, from records that are never overwritten: the journal keeps every arrival and
// ferry crossing. (whereabouts keeps one place a day, so a second trip the same day used to wipe the first.)
const NAMES: Record<string, string> = { cairo: 'Cairo', alexandria: 'Alexandria' };
const been = (s: S, id: string) => s.world.at === id || Object.values(s.whereabouts ?? {}).includes(id)
  || (s.journal ?? []).some((j) => j.text === `Arrived in ${NAMES[id] ?? id}.` || (id === 'cairo' && j.text === 'Took the Nile ferry to Cairo.'))
  || (s.ledger ?? []).some((l) => l.label === `Nile ferry to ${NAMES[id] ?? id}` || l.label.endsWith(` in ${NAMES[id] ?? id}`));
const troops = (s: S) => Object.values(s.world.party.troops ?? {}).reduce((a, n) => a + (n ?? 0), 0);
/** the line Bilgin gives (data/world.ts, node 'sellmore'): hearing it finishes his step */
export const BILGIN_TIP = 'Khan el-Khalili pays a third more';

const sales = (s: S) => s.totalSales ?? s.ledger.filter((l) => l.kind === 'sale').length;
/** Rashid's first instalment still open: what he wants and how much is in the purse */
const owing = (s: S) => { const f = s.family?.first; return f && !f.done && f.paid < f.sum ? f.sum - f.paid : 0; };

// Day one is the stall and Rashid's debt, one thing at a time: the first sale (the lesson at the stall),
// a rug from Rashid, a second sale, his ten pounds paid, and the rest of the day at the stall. Rashid's
// errand (a guard, Cairo, the train, a rug bought in Alexandria) begins the next morning.
// Malek's grill and Bilgin's tip were steps once; they are there to find, not to be sent to.
export const DAY_ONE = 5;
/** what Rashid's errand costs, about: a guard, the ferry and the train, and the cheapest rug in Alexandria */
export const ERRAND_PURSE = 350;
export const OPENING: OpeningStep[] = [
  { id: 'stall', text: () => 'Sell your first rug.', btn: 'Go to your stall', go: 'stall', done: (s) => s.tutorial.done },
  { id: 'rashid', text: () => 'Buy a rug from Uncle Rashid to sell on.', btn: 'Go to Rashid', go: 'supplier', done: (s) => s.ledger.some((l) => l.label.includes('from Rashid')) },
  { id: 'sell2', text: () => 'Sell another rug at your stall.', btn: 'Go to your stall', go: 'stall', done: (s) => sales(s) >= 2 || s.day >= 2 },
  {
    id: 'pay',
    text: (s) => { const o = owing(s); return o && s.cash < o ? `Sell more. Rashid wants ${fmtP(o)}, and you have ${fmtP(s.cash)}.` : `Pay Rashid his ${fmtP(o || 1000)} at the warehouse.`; },
    btn: 'Go to Rashid', go: 'supplier',
    done: (s) => !owing(s) || s.day >= 3,
  },
  { id: 'night', text: () => 'Sell what you can until the stall shuts for the night.', btn: 'Go to your stall', go: 'stall', done: (s) => s.day >= 2 },
  { id: 'guards', text: (s) => (s.cash < ERRAND_PURSE ? `Sell rugs first. The errand needs about ${fmtP(ERRAND_PURSE)}, and you have ${fmtP(s.cash)}.` : 'Hire a guard at the guard yard for the road.'), btn: 'To the guard yard', go: 'guards', done: (s) => troops(s) > 0 },
  { id: 'cairo', text: () => 'Take the ferry to Cairo.', btn: 'To the ferry', go: 'cairo', done: (s) => been(s, 'cairo') },
  { id: 'bandits', text: () => 'Take the train to Alexandria: 3½ hours.', btn: 'Plan the trip', go: 'alexandria', done: (s) => !!s.onboard?.bandits || been(s, 'alexandria') },
  // any rug bought in Alexandria, whether or not Rashid has given his errand yet (it counts for that too)
  { id: 'auction', text: () => 'Buy one rug in Alexandria.', btn: 'Show Alexandria', go: 'alexandria', done: (s) => s.missions?.alexandria === 'done' || !!s.onboard?.auction || s.ledger.some((l) => l.kind === 'purchase' && l.label.endsWith(' in Alexandria')) },
];
/** the button for a step as things stand: the pay step sends you to the stall while the purse is short */
export function stepGo(s: S, st: OpeningStep): { btn: string; go: string; flash: string } {
  if (st.id === 'pay' && owing(s) > s.cash) return { btn: 'Go to your stall', go: 'stall', flash: 'stall' };
  if (st.id === 'guards' && s.cash < ERRAND_PURSE) return { btn: 'Go to your stall', go: 'stall', flash: 'stall' };
  return { btn: st.btn, go: st.go, flash: st.id };
}
/** the eyebrow over the step: "Day one · 2 of 5", then "Rashid's errand · 1 of 4" */
export function stepLabel(n: number): string {
  return n < DAY_ONE ? `Day one · ${n + 1} of ${DAY_ONE}` : `Rashid's errand · ${n - DAY_ONE + 1} of ${OPENING.length - DAY_ONE}`;
}
/** A step stays done once a later one is: you cannot have reached Alexandria without the guard and the
 *  ferry, even if the guard has since gone home. So the opening never steps backwards. */
function stepsDone(s: S): boolean[] {
  const d = OPENING.map((st) => st.done(s));
  for (let i = d.length - 2; i >= 0; i--) d[i] = d[i] || d[i + 1];
  return d;
}

// test runs (and anyone who set the old developer switch) start with the opening skipped
const devSkip = (() => { try { return typeof localStorage !== 'undefined' && localStorage.getItem('tof-skip-chapters') === '1'; } catch { return false; } })();
/** no hints: the player asked for none, or Sandbox (which skips the lessons unless asked for them) */
export const lessonsOff = (s: S) => (s.tipsSeen ?? []).includes(LESSONS_OFF) || (s.playMode === 'sandbox' && !(s.tipsSeen ?? []).includes(LESSONS_ON));
export const openingSkipped = (s: S) => devSkip || s.playMode === 'sandbox' || (s.tipsSeen ?? []).includes(OPENING_TIP);
/** the step in hand, or null once the opening is finished or skipped */
export function openingStep(s: S): { step: OpeningStep; n: number } | null {
  if (!s.started || openingSkipped(s)) return null;
  const n = stepsDone(s).findIndex((x) => !x);
  return n < 0 ? null : { step: OPENING[n], n };
}
export const openingDone = (s: S) => openingStep(s) === null;

/** During the opening only Giza and Cairo are open, and Alexandria from the moment you set out for it. */
export function cityLocked(s: S, id: string): boolean {
  // Persia, whatever the opening: shops in three cities and a Persian visa (unlocks.ts)
  if (isPersian(id) && !persiaOpen(s)) return true;
  const cur = openingStep(s);
  if (!cur) return false;
  if (id === 'giza' || id === 'cairo') return false;
  if (id === 'alexandria') return cur.n < OPENING.findIndex((x) => x.id === 'bandits');
  return true;
}
export function lockedWhy(s: S, id: string): string {
  if (isPersian(id) && !persiaOpen(s)) return persiaWhy(s);
  if (id === 'alexandria') return 'Alexandria opens once you have a guard and have reached Cairo.';
  return 'Opens once the opening is done (Rashid\'s errand in Alexandria). You can skip the opening in the objective bar.';
}

/** What opens a closed place, as a list to tick off: shown when a locked town (or Persia's ground) is
 *  tapped on the map. `opening` says the opening can be skipped to open it now. */
export interface LockNeeds { title: string; line: string; items: { text: string; done: boolean }[]; opening?: boolean }
export function lockNeeds(s: S, id: string | null, name: string): LockNeeds {
  if (!id || isPersian(id)) {
    const shops = shopTowns(s);
    const others = shops.filter((t) => t !== 'baghdad').length;
    return {
      title: `${id ? name : 'Persia'} is closed to you`,
      line: 'The road over the Zagros is open to a merchant the Persian consulate will vouch for.',
      items: [
        { text: 'A shop of your own in Baghdad', done: shops.includes('baghdad') },
        { text: `Shops in two other cities (${Math.min(others, 2)} of 2)`, done: others >= 2 },
        { text: 'A Persian visa from the consulate in Baghdad', done: !!s.persianVisa },
      ],
    };
  }
  const cur = openingStep(s);
  if (id === 'alexandria') return {
    title: 'Alexandria is closed to you', line: 'Not yet: Rashid wants you ready for the road first.', opening: true,
    items: [
      { text: 'Hire a guard at the guard yard', done: troops(s) > 0 },
      { text: 'Take the ferry to Cairo', done: been(s, 'cairo') },
    ],
  };
  return {
    title: `${name} is closed to you`, line: 'The rest of the map opens once your first days are behind you.', opening: !!cur,
    items: OPENING.map((st, i) => ({ text: st.text(s), done: !!cur && i < cur.n })).filter((_, i) => !cur || i >= Math.max(0, cur.n - 1)).slice(0, 4),
  };
}
