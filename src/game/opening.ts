// The opening: a new merchant's first days, one step at a time, each teaching one thing and each
// ticking itself off from what the player has actually done. Until it is finished (or skipped) only
// Giza, Cairo and, later, Alexandria are open on the map, so nothing pulls a newcomer off the path.
import type { GameState } from './state/store';

export const OPENING_TIP = 'first-hour'; // the old first-hour hint's id: dismissing either skips both
type S = GameState;

export interface OpeningStep {
  id: string;
  text: (s: S) => string;
  btn: string;
  /** where the button takes you: 'stall', a chapter target, or a district place */
  go: string;
  done: (s: S) => boolean;
}

const been = (s: S, id: string) => s.world.at === id || Object.values(s.whereabouts ?? {}).includes(id);
const troops = (s: S) => Object.values(s.world.party.troops ?? {}).reduce((a, n) => a + (n ?? 0), 0);
/** the line Bilgin gives (data/world.ts, node 'sellmore'): hearing it finishes his step */
export const BILGIN_TIP = 'Khan el-Khalili pays a third more';

export const OPENING: OpeningStep[] = [
  { id: 'stall', text: () => 'Walk to your stall in the Giza lane and serve your first customer.', btn: 'Go to your stall', go: 'stall', done: (s) => s.tutorial.done },
  { id: 'rashid', text: () => 'Your shelves are thin. Buy a rug from Uncle Rashid.', btn: 'Go to Rashid', go: 'supplier', done: (s) => s.ledger.some((l) => l.label.includes('from Rashid')) },
  { id: 'profit', text: () => 'Sell again, and ask more than you paid Rashid. That difference is your living.', btn: 'Go to your stall', go: 'stall', done: (s) => (s.totalSales ?? 0) >= 2 },
  { id: 'malek', text: () => 'On your feet since dawn and nothing eaten: a hungry seller gives discounts. Eat at Malek\'s grill.', btn: 'To Malek\'s', go: 'district', done: (s) => s.ledger.some((l) => l.label.startsWith("Malek's")) || !!s.condition?.wellFed },
  { id: 'bilgin', text: () => 'Bilgin hears everything on the lane. Ask him where a new man can sell for more.', btn: 'To Bilgin\'s', go: 'district', done: (s) => (s.world.rumours ?? []).some((r) => r.includes(BILGIN_TIP)) },
  { id: 'guards', text: () => 'The roads beyond Cairo are not safe. Hire a guard at the Giza guard yard.', btn: 'To the guard yard', go: 'guards', done: (s) => troops(s) > 0 },
  { id: 'cairo', text: () => 'Take the ferry across the Nile to Cairo.', btn: 'To the ferry', go: 'cairo', done: (s) => been(s, 'cairo') },
  { id: 'bandits', text: () => 'Set out for Alexandria with your guard. The train through Tanta is quickest.', btn: 'Plan the trip', go: 'alexandria', done: (s) => !!s.onboard?.bandits || been(s, 'alexandria') },
  { id: 'auction', text: (s) => (s.world.at === 'alexandria' ? 'Buy one rug in Alexandria for Rashid: bid at the Attarine warehouse auction (every few days), or buy in the market.' : 'Rashid\'s errand: buy one rug in Alexandria, at auction or in the market.'), btn: 'Show Alexandria', go: 'alexandria', done: (s) => s.missions?.alexandria === 'done' || !!s.onboard?.auction },
];

// test runs (and anyone who set the old developer switch) start with the opening skipped
const devSkip = (() => { try { return typeof localStorage !== 'undefined' && localStorage.getItem('tof-skip-chapters') === '1'; } catch { return false; } })();
export const openingSkipped = (s: S) => devSkip || (s.tipsSeen ?? []).includes(OPENING_TIP);
/** the step in hand, or null once the opening is finished or skipped */
export function openingStep(s: S): { step: OpeningStep; n: number } | null {
  if (!s.started || openingSkipped(s)) return null;
  const n = OPENING.findIndex((st) => !st.done(s));
  return n < 0 ? null : { step: OPENING[n], n };
}
export const openingDone = (s: S) => openingStep(s) === null;

/** During the opening only Giza and Cairo are open, and Alexandria from the moment you set out for it. */
export function cityLocked(s: S, id: string): boolean {
  const cur = openingStep(s);
  if (!cur) return false;
  if (id === 'giza' || id === 'cairo') return false;
  if (id === 'alexandria') return cur.n < OPENING.findIndex((x) => x.id === 'bandits');
  return true;
}
export function lockedWhy(s: S, id: string): string {
  if (id === 'alexandria') return 'Alexandria opens once you have a guard and have reached Cairo.';
  return 'Opens once the opening is done (Rashid\'s errand in Alexandria). You can skip the opening in the objective bar.';
}
