import { useGame } from '../../game/state/store';
import { OPENING, OPENING_TIP, openingStep, stepGo, stepLabel } from '../../game/opening';

type S = ReturnType<typeof useGame.getState>;

// The opening (game/opening.ts), shown as the objective line: one step at a time, ticking itself off.
export const FIRST_HOUR_TIP = OPENING_TIP;

/** The current opening step for the objective line; null once done or skipped. */
export function firstHourStep(g: S): { id: string; flash: string; text: string; btn: string; go: string; n: number; of: number; label: string } | null {
  const cur = openingStep(g);
  if (!cur) return null;
  const st = cur.step;
  const sg = stepGo(g, st);
  // Rashid's errand has no Go button until he has actually given it
  const btn = st.id === 'auction' && g.missions?.alexandria !== 'active' && g.world.at !== 'alexandria' ? '' : sg.btn;
  return { id: st.id, flash: sg.flash, text: st.text(g), btn, go: sg.go, n: cur.n + 1, of: OPENING.length, label: stepLabel(cur.n) };
}
