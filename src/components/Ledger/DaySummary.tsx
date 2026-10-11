import { useGame } from '../../game/state/store';
import { fmt } from '../../game/economy/money';
import { dateFor } from '../../game/economy/economy';

/** What happened overnight after "Next day": the bills, Rashid, the men, how you slept. Shown once
 *  as a small card in the morning and put away when read. Nights on the road are not shown here:
 *  their notes already appear on the map as you travel. */
export function DaySummary() {
  const sum = useGame((s) => s.lastSummary);
  const dismiss = useGame((s) => s.dismissSummary);
  if (!sum || sum.seen) return null;
  const notes = sum.notes.filter((n) => n.trim());
  const traded = sum.sales > 0 || sum.revenue > 0;
  // a quiet night with nothing to report needs no card
  if (!notes.length && !traded) return null;
  const net = sum.gross - sum.expenses;
  return (
    <div className="overlay" onClick={dismiss} data-testid="day-summary">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>{dateFor(sum.day + 1).long}</h2>
        {traded && (
          <p>
            Yesterday: {sum.sales} {sum.sales === 1 ? 'sale' : 'sales'}, {fmt(sum.revenue)} taken, {net >= 0 ? `${fmt(net)} to the good` : `${fmt(-net)} down`} after costs.
          </p>
        )}
        {notes.length > 0 && (
          <ul style={{ margin: '0 0 14px', paddingLeft: 18, color: 'var(--text)', fontSize: 15.5, lineHeight: 1.4 }}>
            {notes.map((n, i) => <li key={i} style={{ marginBottom: 6 }}>{n}</li>)}
          </ul>
        )}
        <button className="btn primary" onClick={dismiss} data-testid="day-summary-ok">Open the day</button>
      </div>
    </div>
  );
}
