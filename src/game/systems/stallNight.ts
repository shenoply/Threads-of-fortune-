// The shop boy, the post and the market inspector, hooked into the store's day rollover and the
// return to Giza in one place, so the store itself only calls these three functions.
// Pure logic: no store import.
import type { GameState } from '../state/store';
import { boyMinds, boyNight, BOY } from './shopBoy';
import { postNight } from './post';
import { licenceNight } from './inspector';
import { BOY_OFFER } from '../../data/tips';

/** tipsSeen marks: a buyer gave up waiting at the empty stall; Haj Mahmoud has offered Sami */
export const AWAY_MISSED = 'away-missed';
export const BOY_OFFERED = 'boy-offer';

interface Ctx { arrivalAt: (s: GameState, i: number) => number; patience: number; rng: () => number }

/** Before the night's books are drawn up: if you were away, the boy deals with the rest of the day's
 *  customers; then he is paid. Returns the state to close the day on, lines for the morning, and the
 *  fields the rollover's own patch does not carry. */
export function nightBefore(s: GameState, c: Ctx): { s: GameState; notes: string[]; extra: Partial<GameState> } {
  const notes: string[] = [];
  if (!s.shopBoy) return { s, notes, extra: {} };
  const away = s.world.at !== 'giza';
  let st = s;
  if (away && !st.encounter) {
    const r = boyMinds(st, 24, { arrivalAt: (i) => c.arrivalAt(st, i), patience: c.patience, final: true, rng: c.rng });
    if (r) { st = { ...st, ...r.patch }; notes.push(...r.lines); }
  }
  const w = boyNight(st);
  if (w) {
    st = { ...st, ...w.patch };
    notes.push(...w.lines);
    if (away && w.lines.length && st.shopBoy) st = { ...st, shopBoy: { ...st.shopBoy, report: [...st.shopBoy.report, ...w.lines] } };
  }
  return { s: st, notes, extra: { shopBoy: st.shopBoy, totalSales: st.totalSales } };
}

/** After the rollover's patch is built: the boy's fields, the post, and the licence and inspector. */
export function nightAfter(s: GameState, patch: Partial<GameState>, notes: string[], extra: Partial<GameState>, rng: () => number, quiet: boolean) {
  Object.assign(patch, extra);
  const day = patch.day ?? s.day + 1;
  Object.assign(patch, postNight(s, patch, notes, day, rng));
  Object.assign(patch, licenceNight({ ...s, shopBoy: patch.shopBoy ?? s.shopBoy }, patch, notes, day, (patch.world ?? s.world).at, rng, quiet));
  // once: the morning after a buyer first gave up at your empty stall, a neighbour offers a boy to mind it
  const seen = patch.tipsSeen ?? s.tipsSeen ?? [];
  // (only on a night at Giza: the nights on the road and in other towns have no morning card)
  if (!s.shopBoy && !patch.shopBoy && (patch.world ?? s.world).at === 'giza' && seen.includes(AWAY_MISSED) && !seen.includes(BOY_OFFERED)) {
    notes.push(BOY_OFFER);
    patch.tipsSeen = [...seen, BOY_OFFERED];
  }
}

/** Back at the stall after time away: the boy deals with whoever came while you were gone, and what he
 *  did is put on a morning card. `busy`: a sale is open or the stall is shut, so he only reports. */
export function boyOnReturn(s: GameState, c: Ctx & { busy: boolean }): Partial<GameState> | null {
  if (!s.shopBoy) return null;
  let patch: Partial<GameState> = {};
  let st = s;
  if (s.shopBoy.hired && !c.busy) {
    const r = boyMinds(st, st.world.hour, { arrivalAt: (i) => c.arrivalAt(s, i), patience: c.patience, final: false, rng: c.rng });
    if (r) { patch = { ...r.patch }; st = { ...st, ...r.patch }; }
  }
  const report = st.shopBoy?.report ?? [];
  if (!report.length) return Object.keys(patch).length ? patch : null;
  return { ...patch, shopBoy: { ...st.shopBoy!, report: [] }, lastSummary: { day: s.day - 1, sales: 0, revenue: 0, gross: 0, expenses: 0, notes: report.slice(-8), seen: false } };
}
export { BOY };
