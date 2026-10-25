// The stall after dark, for a few seconds between the last customer and the morning: the lamp lit,
// Saffron asleep on the counter, the day's takings counted into the box coin by coin. No buttons; a
// tap passes it. Shown once a night, and only after a day with money in it.
import { useEffect, useRef, useState } from 'react';
import { useGame } from '../../game/state/store';
import { fmt } from '../../game/economy/money';
import { audio } from '../../game/audio/engine';
import { lookUps, sceneIdFor, sceneImg } from '../../game/stallScenes';
import './night.css';

const SHOWN = new Set<number>();
// test runs (the developer switch) skip it, as they skip the films
const skipAll = (() => { try { return localStorage.getItem('tof-skip-chapters') === '1' && localStorage.getItem('tof-night') !== '1'; } catch { return false; } })();
export const nightDue = (day: number) => !skipAll && !SHOWN.has(day);

/** The day out of a hundred: the profit against your own recent days, how many you sold, and the
 *  markup you held. A loss costs you points; a day like your best is near a hundred. */
export function dayScore(ledger: { day: number; kind: string; amount: number; cost?: number }[], day: number, sum: { sales: number; revenue: number; gross: number }) {
  const prior = ledger.filter((l) => l.kind === 'sale' && l.day < day && l.day >= day - 7);
  const days = new Set(prior.map((l) => l.day)).size || 1;
  const avg = prior.reduce((a, l) => a + (l.amount - (l.cost ?? 0)), 0) / days;
  const target = Math.max(600, avg * 1.25);
  const profit = sum.gross <= 0 ? 0 : 60 * Math.min(1, sum.gross / target);
  const count = Math.min(25, sum.sales * 6.5);
  const cost = sum.revenue - sum.gross;
  const markup = cost > 0 ? 15 * Math.min(1, Math.max(0, sum.gross / cost) / 0.75) : sum.gross > 0 ? 15 : 0;
  return Math.max(0, Math.min(100, Math.round(profit + count + markup - (sum.gross < 0 ? 15 : 0))));
}
export const scoreWord = (n: number) => (n >= 92 ? 'Masterful' : n >= 80 ? 'Excellent' : n >= 60 ? 'A good day' : n >= 40 ? 'Fair' : 'A poor day');

export function NightScene({ day, takings, score, onDone }: { day: number; takings: number; score: number; onDone: () => void }) {
  const scene = useGame((s) => sceneIdFor(lookUps(s)));
  const [shown, setShown] = useState(0);
  const [pts, setPts] = useState(-1);
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
    <div className="night-scene" onClick={finish} data-testid="night-scene" role="img" aria-label={`Night at the stall. The day's takings: ${fmt(takings)}`}>
      <img className="ns-stall" src={sceneImg(scene)} alt="" />
      <img className="ns-cat" src="art/stall2/props/cat-counter.webp" alt="" />
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
