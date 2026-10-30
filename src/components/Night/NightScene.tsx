// The stall after dark, for a few seconds between the last customer and the morning: the lamp lit,
// Saffron asleep on the counter, the day's takings counted into the box coin by coin. No buttons; a
// tap passes it. Shown once a night, and only after a day with money in it.
import { useEffect, useRef, useState } from 'react';
import { useGame } from '../../game/state/store';
import { fmt, snap } from '../../game/economy/money';
import { audio } from '../../game/audio/engine';
import { lookUps, sceneIdFor, sceneImg } from '../../game/stallScenes';
import './night.css';

const SHOWN = new Set<number>();
// test runs (the developer switch) skip it, as they skip the films
const skipAll = (() => { try { return localStorage.getItem('tof-skip-chapters') === '1' && localStorage.getItem('tof-night') !== '1'; } catch { return false; } })();
export const nightDue = (day: number) => !skipAll && !SHOWN.has(day);

type LedgerRow = { day: number; kind: string; amount: number; cost?: number };
type DaySum = { sales: number; revenue: number; gross: number };

/** What a fair day's profit is by now: a little more each week of trade, and never less than your
 *  own recent days. A single big day (the opening, with your father's good rugs) does not make it. */
function dayTarget(ledger: LedgerRow[], day: number) {
  const prior = ledger.filter((l) => l.kind === 'sale' && l.day < day && l.day >= day - 7);
  const days = Math.max(3, new Set(prior.map((l) => l.day)).size);
  const avg = prior.reduce((a, l) => a + (l.amount - (l.cost ?? 0)), 0) / days;
  return Math.max(900 + Math.min(day - 1, 60) * 40, avg);
}

/** The day out of a hundred: the profit against a fair day's (on a curve, so a thin day still counts
 *  for something and an easy day is not perfect), how many you sold (four or more for full marks), and
 *  the markup you held. A loss costs points. "Masterful" needs a day well beyond the usual. */
export function dayScore(ledger: LedgerRow[], day: number, sum: DaySum) {
  const target = dayTarget(ledger, day);
  const profit = sum.gross <= 0 ? 0 : 55 * Math.sqrt(Math.min(1.4, sum.gross / target) / 1.4);
  const count = Math.min(20, sum.sales * 5);
  const cost = sum.revenue - sum.gross;
  const markup = cost > 0 ? 15 * Math.min(1, Math.max(0, sum.gross / cost) / 0.75) : sum.gross > 0 ? 15 : 0;
  return Math.max(0, Math.min(100, Math.round(5 + profit + count + markup - (sum.gross < 0 ? 15 : 0))));
}
/** The score in one plain line: what it was weighed against. */
export function scoreWhy(ledger: LedgerRow[], day: number, sum: DaySum) {
  const target = dayTarget(ledger, day);
  const cost = sum.revenue - sum.gross;
  const mk = cost > 0 ? `, ${Math.round((sum.gross / cost) * 100)}% over cost` : '';
  return `Profit ${fmt(Math.max(0, sum.gross))} against a fair day's ${fmt(snap(target))}, ${sum.sales} ${sum.sales === 1 ? 'sale' : 'sales'}${mk}.`;
}
export const scoreWord = (n: number) => (n >= 92 ? 'Masterful' : n >= 80 ? 'Excellent' : n >= 60 ? 'A good day' : n >= 40 ? 'Fair' : 'A poor day');

export function NightScene({ day, takings, score, onDone }: { day: number; takings: number; score: number; onDone: () => void }) {
  const scene = useGame((s) => sceneIdFor(lookUps(s)));
  const [shown, setShown] = useState(0);
  const [pts, setPts] = useState(-1);
  const [painted, setPainted] = useState(true);
  const done = useRef(false);
  const scored = useRef(false);
  const finish = () => { if (done.current) return; done.current = true; SHOWN.add(day); onDone(); };
  useEffect(() => {
    const t0 = performance.now(), dur = 2200;
    let id = 0, last = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0 - 700) / dur);
      if (k > 0) {
        const v = Math.round(takings * (1 - Math.pow(1 - k, 2.2)));
        setShown(v);
        if (now - last > 260 && k < 1) { audio.sfx('coin'); last = now; }
      }
      // then the day's mark, counted up after the money
      const k2 = Math.min(1, (now - t0 - 700 - dur - 250) / 900);
      if (k2 > 0) setPts(Math.round(score * (1 - Math.pow(1 - k2, 2))));
      if (k2 >= 1 && !scored.current) { scored.current = true; audio.sfx(score >= 80 ? 'reward' : score >= 40 ? 'bell' : 'chest'); }
      if (k2 < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    const end = window.setTimeout(finish, 6600);
    return () => { cancelAnimationFrame(id); window.clearTimeout(end); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={`night-scene${painted ? ' painted' : ''}`} onClick={finish} data-testid="night-scene" role="img" aria-label={`Night at the stall. The day's takings: ${fmt(takings)}`}>
      {/* the painted night stall: lamp lit, Saffron asleep on the counter; the day's own stall if it will not load */}
      <img className="ns-stall" src={painted ? 'art/stalls/night-stall.webp' : sceneImg(scene)} alt="" onError={() => setPainted(false)} />
      <div className="ns-dark" />
      <div className="ns-lamp" />
      <div className="ns-count">
        <small>THE DAY'S TAKINGS</small>
        <b>{fmt(shown)}</b>
        {pts >= 0 && (
          <div className={`ns-score ${score >= 80 ? 'hi' : score < 40 ? 'lo' : ''}`} data-testid="day-score">
            <span><em>{pts}</em><small>/100</small></span>
            <i>{pts === score ? scoreWord(score) : ''}</i>
          </div>
        )}
      </div>
      <span className="ns-hint">Tap to go on</span>
    </div>
  );
}
