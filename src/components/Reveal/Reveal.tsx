// Opening something good. A rolled carpet lies on a dark floor in a pool of lamplight; it unrolls
// across the screen with the sound of heavy cloth, and on it a brass-edged plaque rises with what
// you got: money counts up in gold, coin by coin, and ends on the bells. About two seconds; a tap
// jumps to the end, another closes it. A rug new to the Carpet Register skips all that and is shown
// flat at once (`instant`). Nothing in the game waits on it.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { audio } from '../../game/audio/engine';
import { fmt } from '../../game/economy/money';
import './reveal.css';

export interface RevealItem {
  kicker: string; title: string; line?: string; pic?: string; picKind?: 'rug' | 'photo' | 'icon';
  /** no unrolling: the thing is shown at once, laid flat */ instant?: boolean;
  /** money: the title counts up to it */ amount?: number;
}

let push: ((it: RevealItem) => void) | null = null;
const waiting: RevealItem[] = [];
/** show a reveal (queued if one is already up) */
export function reveal(it: RevealItem) {
  // automated runs (the test suite) are not stopped by it, unless a test asks to see it
  if (typeof navigator !== 'undefined' && navigator.webdriver && !(window as { __tofReveal?: boolean }).__tofReveal) return;
  if (push) push(it); else waiting.push(it);
}

const WRAP = 'art/rugs/baghdad-night.jpg';
const ROLL_MS = 380, OPEN_MS = 1100, COUNT_MS = 900;

/** money counting up from nothing, a coin's tick as it goes */
function CountUp({ to, run }: { to: number; run: boolean }) {
  const [v, setV] = useState(run ? 0 : to);
  const raf = useRef(0);
  useEffect(() => {
    if (!run) { setV(to); return; }
    const t0 = performance.now() + 520; // once the plaque is up
    let lastTick = 0;
    const step = (now: number) => {
      const k = Math.max(0, Math.min(1, (now - t0) / COUNT_MS));
      const e = 1 - Math.pow(1 - k, 3);
      setV(Math.round(to * e));
      if (k > 0 && now - lastTick > 95 && k < 0.92) { lastTick = now; audio.sfx('coin'); }
      if (k < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [to, run]);
  return <>{fmt(v)}</>;
}

export function RevealHost() {
  const [queue, setQueue] = useState<RevealItem[]>([]);
  const [stage, setStage] = useState<'roll' | 'open' | 'done'>('roll');
  useEffect(() => {
    push = (it) => setQueue((q) => [...q, it]);
    if (waiting.length) setQueue((q) => [...q, ...waiting.splice(0)]);
    return () => { push = null; };
  }, []);
  const cur = queue[0];
  useEffect(() => {
    if (!cur) return;
    if (cur.instant) { setStage('done'); audio.sfx('reward'); return; }
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setStage('done'); audio.sfx('prize'); return; }
    setStage('roll');
    const t1 = window.setTimeout(() => { setStage('open'); audio.sfx('unfold'); }, ROLL_MS);
    // the bells land as the plaque settles (and as money finishes counting)
    const t2 = window.setTimeout(() => audio.sfx('prize'), ROLL_MS + (cur.amount ? 520 + COUNT_MS : 650));
    const t3 = window.setTimeout(() => setStage('done'), ROLL_MS + OPEN_MS + (cur.amount ? 450 : 0));
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [cur]);
  if (!cur) return null;
  const tap = () => {
    if (stage !== 'done') { audio.sfx('prize'); setStage('done'); return; }
    setQueue((q) => q.slice(1));
  };
  const counting = !!cur.amount && stage === 'open';
  return createPortal(
    <div className={`reveal ${stage} ${cur.instant ? 'instant' : 'unroll'}`} onClick={tap} role="dialog" aria-label={`${cur.kicker}: ${cur.title}`} data-testid="reveal">
      <div className="reveal-stage">
        <div className="reveal-rays" aria-hidden="true" />
        {!cur.instant && (
          <div className="rv-rug" aria-hidden="true">
            <span className="rv-rug-flat" style={{ backgroundImage: `url(${WRAP})` }} />
            <span className="rv-rug-roll" style={{ backgroundImage: `url(${WRAP})` }} />
          </div>
        )}
        <div className="reveal-card">
          {cur.pic && <span className={`reveal-pic ${cur.picKind ?? 'photo'}`}><img src={cur.pic} alt="" /></span>}
          <small>{cur.kicker}</small>
          <b className={cur.amount ? 'rv-money' : ''}>{cur.amount ? <CountUp to={cur.amount} run={counting} /> : cur.title}</b>
          {cur.line && <span>{cur.line}</span>}
          <em>{stage === 'done' ? 'Tap to close' : 'Tap to skip'}</em>
        </div>
      </div>
    </div>,
    document.body,
  );
}
