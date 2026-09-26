import { useGame } from '../../game/state/store';
import { Icon } from '../Icon';
import type { Target } from '../World/Campaign';

type S = ReturnType<typeof useGame.getState>;
interface Step { id: string; text: (s: S) => string; btn: string; go: Target | 'stall'; done: (s: S) => boolean }

// The first hour, one step at a time. Each step ticks itself off from what you have actually done.
const STEPS: Step[] = [
  { id: 'stall', text: () => 'Open your stall in the Giza lane and serve your first customer.', btn: 'Open the stall', go: 'stall', done: (s) => s.tutorial.done },
  { id: 'rashid', text: () => 'Your shelves are thin. Buy a rug from Uncle Rashid.', btn: 'Go to Rashid', go: 'supplier', done: (s) => s.ledger.some((l) => l.label.includes('from Rashid')) },
  { id: 'map', text: () => 'Zoom out from the lane until Giza is a dot on the map.', btn: 'Show the map', go: 'map', done: (s) => !!s.onboard?.map },
  { id: 'cairo', text: () => 'Cross the Nile to Cairo. The ferry takes an hour and a half.', btn: 'To the ferry', go: 'cairo', done: (s) => s.world.at === 'cairo' || Object.values(s.whereabouts ?? {}).includes('cairo') },
  { id: 'alexandria', text: (s) => (s.missions?.alexandria === 'active' ? (s.world.at === 'alexandria' ? 'You are in Alexandria. Buy one rug in the market for Rashid.' : 'Rashid\'s errand: go to Alexandria and buy one rug there.') : 'Rashid has an errand for you in Alexandria. He will ask in a day or so.'), btn: 'Show Alexandria', go: 'alexandria', done: (s) => s.missions?.alexandria === 'done' },
];

export const FIRST_HOUR_TIP = 'first-hour';

/** A one-line guide for a new merchant. Never blocks anything; close it and it stays closed. */
export function FirstHour({ onGo, onStall }: { onGo: (t: Target) => void; onStall: () => void }) {
  const g = useGame();
  if (!g.started || (g.tipsSeen ?? []).includes(FIRST_HOUR_TIP)) return null;
  const i = STEPS.findIndex((st) => !st.done(g));
  if (i < 0) return null;
  const step = STEPS[i];
  const canGo = step.id !== 'alexandria' || g.missions?.alexandria === 'active';
  return (
    <div className="first-hour" role="note" data-testid="first-hour" data-step={step.id}>
      <small>{i + 1}/{STEPS.length}</small>
      <span>{step.text(g)}</span>
      {canGo && <button className="fh-go" onClick={() => (step.go === 'stall' ? onStall() : onGo(step.go))} data-testid="first-hour-go">{step.btn}</button>}
      <button className="fh-x" onClick={() => g.seeTip(FIRST_HOUR_TIP)} aria-label="Hide these hints" data-testid="first-hour-hide"><Icon name="x" /></button>
    </div>
  );
}

/** The current first-hour step, for the single objective line; null once done or dismissed. */
export function firstHourStep(g: S): { id: string; text: string; btn: string; go: Target | 'stall' } | null {
  if (!g.started || (g.tipsSeen ?? []).includes(FIRST_HOUR_TIP)) return null;
  const st = STEPS.find((x) => !x.done(g));
  if (!st) return null;
  return { id: st.id, text: st.text(g), btn: st.btn, go: st.go };
}
