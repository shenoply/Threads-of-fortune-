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

export function NightScene({ day, takings, onDone }: { day: number; takings: number; onDone: () => void }) {
  const scene = useGame((s) => sceneIdFor(lookUps(s)));
  const [shown, setShown] = useState(0);
  const done = useRef(false);
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
      if (k < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    const end = window.setTimeout(finish, 5200);
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
      </div>
      <span className="ns-hint">Tap to go on</span>
    </div>
  );
}
