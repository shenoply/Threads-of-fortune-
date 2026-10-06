import { useGame } from '../../game/state/store';
import { OPENING, OPENING_TIP, openingStep } from '../../game/opening';

type S = ReturnType<typeof useGame.getState>;

// The opening (game/opening.ts), shown as the objective line: one step at a time, ticking itself off.
export const FIRST_HOUR_TIP = OPENING_TIP;

/** The current opening step for the objective line; null once done or skipped. */
export function firstHourStep(g: S): { id: string; text: string; btn: string; go: string; n: number; of: number } | null {
  const cur = openingStep(g);
  if (!cur) return null;
  const st = cur.step;
  // Rashid's errand has no Go button until he has actually given it
  const btn = st.id === 'auction' && g.missions?.alexandria !== 'active' && g.world.at !== 'alexandria' ? '' : st.btn;
  return { id: st.id, text: st.text(g), btn, go: st.go, n: cur.n + 1, of: OPENING.length };
}
