// Opening something good. A rolled carpet lies on a dark floor in a pool of lamplight; it unrolls
// across the screen with the sound of heavy cloth, and on it a brass-edged plaque rises with what
// you got: money counts up in gold, coin by coin, and ends on the bells. About two seconds; a tap
// jumps to the end, another closes it. A rug new to the Carpet Register skips all that and is shown
// flat at once (`instant`). Nothing in the game waits on it.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { audio } from '../../game/audio/engine';
import { fmt } from '../../game/economy/money';
import { RugViewer } from '../RugViewer/RugViewer';
import { RUGS, RUG_IDS } from '../../data/rugs';
import { rugSrc } from '../RugViewer/rugArt';
import { useGame, SET_REWARD } from '../../game/state/store';
import './reveal.css';

export interface RevealItem {
  kicker: string; title: string; line?: string; pic?: string; picKind?: 'rug' | 'photo' | 'icon' | 'prop';
  /** no unrolling: the thing is shown at once, laid flat */ instant?: boolean;
  /** money: the title counts up to it */ amount?: number;
  /** a rug now in your stock: a button opens it in the inspector to turn over and look at */ uid?: string;
  /** the rug's tier: its name in the tier's colour */ tier?: 1 | 2 | 3 | 4;
  /** the sun behind it: something new to your collection */ sun?: boolean;
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
  const [look, setLook] = useState<string | null>(null);
  useEffect(() => {
    push = (it) => setQueue((q) => [...q, it]);
    if (waiting.length) setQueue((q) => [...q, ...waiting.splice(0)]);
    // a carpet new to the Register: the sun behind it, its tier in colour, how far the collection has come
    const TIER = ['', 'Everyday rug', 'Trade rug', 'City carpet', 'Treasure'];
    const SET = ['', 'everyday rugs', 'trade rugs', 'city carpets', 'treasures'];
    const onNew = (e: Event) => {
      const { ids, sets } = (e as CustomEvent<{ ids: string[]; sets: number[] }>).detail;
      const reg = useGame.getState().register ?? [];
      const have = RUG_IDS.filter((id) => reg.includes(id)).length;
      for (const id of ids) {
        const t = RUGS[id]; if (!t) continue;
        reveal({ kicker: 'New to your collection', title: t.name, tier: t.tier ?? 1, sun: true, instant: true, pic: rugSrc(t), picKind: 'rug', line: `${TIER[t.tier ?? 1]} · worth ${fmt(t.valueBand[0])}–${fmt(t.valueBand[1])} · ${have} of ${RUG_IDS.length} collected` });
      }
      for (const tier of sets) reveal({ kicker: 'A full set', title: `Every one of the ${SET[tier]}`, sun: true, tier: tier as 1 | 2 | 3 | 4, amount: SET_REWARD[tier].cash, line: `+${SET_REWARD[tier].rep} reputation. The trade talks of your Register.` });
    };
    window.addEventListener('tof:new-carpet', onNew);
    return () => { push = null; window.removeEventListener('tof:new-carpet', onNew); };
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
  if (look) return createPortal(<div className="venue-overlay reveal-look"><RugViewer uid={look} onClose={() => setLook(null)} /></div>, document.body);
  if (!cur) return null;
  const tap = () => {
    if (stage !== 'done') { audio.sfx('prize'); setStage('done'); return; }
    setQueue((q) => q.slice(1));
  };
  const counting = !!cur.amount && stage === 'open';
  return createPortal(
    <div className={`reveal ${stage} ${cur.instant ? 'instant' : 'unroll'}${cur.sun ? ' sun' : ''}${cur.tier ? ` tier-${cur.tier}` : ''}`} onClick={tap} role="dialog" aria-label={`${cur.kicker}: ${cur.title}`} data-testid="reveal">
      <div className="reveal-stage">
        <div className="reveal-rays" aria-hidden="true" />
        {cur.sun && <div className="reveal-sun" aria-hidden="true" />}
        {!cur.instant && (
          <div className="rv-rug" aria-hidden="true">
            <span className="rv-rug-flat" style={{ backgroundImage: `url(${WRAP})` }} />
            <span className="rv-rug-roll" style={{ backgroundImage: `url(${WRAP})` }} />
          </div>
        )}
        <div className="reveal-card">
          {cur.pic && <span className={`reveal-pic ${cur.picKind ?? 'photo'}`}><img src={cur.pic} alt="" /></span>}
          <small>{cur.kicker}</small>
          <b className={`${cur.amount ? 'rv-money' : ''}${cur.tier ? ` t-tier-${cur.tier}` : ''}`}>{cur.amount ? <CountUp to={cur.amount} run={counting} /> : cur.title}</b>
          {cur.line && <span>{cur.line}</span>}
          {cur.uid && stage === 'done' && (
            <button className="btn rv-look" onClick={(e) => { e.stopPropagation(); audio.sfx('tap'); setLook(cur.uid!); setQueue((q) => q.slice(1)); }} data-testid="reveal-look">Look at it</button>
          )}
          <em>{stage === 'done' ? 'Tap to close' : 'Tap to skip'}</em>
        </div>
      </div>
    </div>,
    document.body,
  );
}
