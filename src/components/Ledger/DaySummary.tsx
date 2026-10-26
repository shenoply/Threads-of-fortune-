import { useDailyWaiting } from '../Daily/Daily';
import { useGame } from '../../game/state/store';
import { fmt } from '../../game/economy/money';
import { dateFor } from '../../game/economy/economy';
import { useState } from 'react';
import { NightScene, dayScore, nightDue, scoreWord } from '../Night/NightScene';
import { WeekTables } from '../World/RankTable';

/** What happened overnight after "Next day": the bills, Rashid, the men, how you slept. Shown once
 *  as a small card in the morning and put away when read. Nights on the road are not shown here:
 *  their notes already appear on the map as you travel. */
/** the morning's reason to look: today's errands are new, and the gift may be waiting */
function DailyTeaser() {
  const w = useDailyWaiting();
  return <p className="daily-teaser" data-testid="daily-teaser"><b>Three new errands today.</b>{w.gift ? ` Your gift is waiting in the chest at the top${w.run > 0 ? ` (${w.run + 1} days in a row)` : ''}.` : ''}</p>;
}

export function DaySummary() {
  const sum = useGame((s) => s.lastSummary);
  const dismiss = useGame((s) => s.dismissSummary);
  const [nightSeen, setNightSeen] = useState(0);
  if (!sum || sum.seen) return null;
  // first the stall after dark with the day's money counted, then the morning's card
  if (sum.revenue > 0 && nightDue(sum.day) && nightSeen !== sum.day + 1) return <NightScene day={sum.day} takings={sum.revenue} score={dayScore(useGame.getState().ledger, sum.day, sum)} onDone={() => setNightSeen(sum.day + 1)} />;
  const notes = sum.notes.filter((n) => n.trim());
  const traded = sum.sales > 0 || sum.revenue > 0;
  // a quiet night with nothing to report needs no card
  const monday = dateFor(sum.day + 1).weekday === 'Monday' && Object.keys(useGame.getState().ranks?.week?.now ?? {}).length > 0;
  if (!notes.length && !traded && !monday) return null;
  const net = sum.gross - sum.expenses;
  // the evening strip closed the books before the night's wages and bread: say so, so the two agree
  const night = (sum.wages ?? 0) + (sum.food ?? 0);
  const atClose = net + night;
  const nightParts = [sum.wages ? `${fmt(sum.wages)} in wages` : '', sum.food ? `${fmt(sum.food)} for bread` : ''].filter(Boolean).join(' and ');
  return (
    <div className="overlay" onClick={dismiss} data-testid="day-summary">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>{dateFor(sum.day + 1).long}</h2>
        {traded && (
          <p>
            <b className="ds-score" data-testid="summary-score">{dayScore(useGame.getState().ledger, sum.day, sum)}/100 · {scoreWord(dayScore(useGame.getState().ledger, sum.day, sum))}.</b>{' '}
            Yesterday: {sum.sales} {sum.sales === 1 ? 'sale' : 'sales'}, {fmt(sum.revenue)} taken
            {night > 0
              ? <>, {atClose >= 0 ? `${fmt(atClose)} to the good` : `${fmt(-atClose)} down`} at the close. The night cost {nightParts}: {net >= 0 ? `${fmt(net)} to the good` : `${fmt(-net)} down`} in all.</>
              : <>, {net >= 0 ? `${fmt(net)} to the good` : `${fmt(-net)} down`} after costs.</>}
          </p>
        )}
        {notes.length > 0 && (
          <ul style={{ margin: '0 0 14px', paddingLeft: 18, color: 'var(--text)', fontSize: 15.5, lineHeight: 1.4 }}>
            {notes.map((n, i) => <li key={i} style={{ marginBottom: 6 }}>{n}</li>)}
          </ul>
        )}
        {monday && <WeekTables />}
        <DailyTeaser />
        <button className="btn primary" onClick={dismiss} data-testid="day-summary-ok">Open the day</button>
      </div>
    </div>
  );
}
