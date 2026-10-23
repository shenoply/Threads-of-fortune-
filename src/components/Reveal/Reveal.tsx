// Opening something good: a parcel in striped cloth, tied with cord, that shakes, comes untied and
// opens, letting out a spray of coloured wool and light, with what was in it rising on a card. About
// two seconds; a tap jumps to the end, another closes it. Shown over the screen for gifts and for a
// rug new to the Carpet Register; nothing in the game waits on it.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { audio } from '../../game/audio/engine';
import './reveal.css';

export interface RevealItem { kicker: string; title: string; line?: string; pic?: string; picKind?: 'rug' | 'photo' | 'icon'; /** no parcel: the thing is shown at once, laid flat */ instant?: boolean }

let push: ((it: RevealItem) => void) | null = null;
const waiting: RevealItem[] = [];
/** show a reveal (queued if one is already up) */
export function reveal(it: RevealItem) {
  // automated runs (the test suite) are not stopped by it, unless a test asks to see it
  if (typeof navigator !== 'undefined' && navigator.webdriver && !(window as { __tofReveal?: boolean }).__tofReveal) return;
  if (push) push(it); else waiting.push(it);
}

const THREADS = ['#c4482f', '#e3a53a', '#3d5f9c', '#3a9a8f', '#7a4f86', '#e8d9b5', '#8a9a48'];

export function RevealHost() {
  const [queue, setQueue] = useState<RevealItem[]>([]);
  const [stage, setStage] = useState<'shake' | 'open' | 'done'>('shake');
  useEffect(() => {
    push = (it) => setQueue((q) => [...q, it]);
    if (waiting.length) setQueue((q) => [...q, ...waiting.splice(0)]);
    return () => { push = null; };
  }, []);
  const cur = queue[0];
  useEffect(() => {
    if (!cur) return;
    if (cur.instant) { setStage('done'); audio.sfx('reward'); return; }
    setStage('shake');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    audio.sfx('unwrap');
    const t1 = window.setTimeout(() => { setStage('open'); audio.sfx('reward'); }, reduce ? 0 : 750);
    const t2 = window.setTimeout(() => setStage('done'), reduce ? 50 : 1700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [cur]);
  if (!cur) return null;
  const tap = () => {
    if (stage !== 'done') { if (stage === 'shake') audio.sfx('reward'); setStage('done'); return; }
    setQueue((q) => q.slice(1));
  };
  return createPortal(
    <div className={`reveal ${stage} ${cur.instant ? 'instant' : ''}`} onClick={tap} role="dialog" aria-label={`${cur.kicker}: ${cur.title}`} data-testid="reveal">
      <div className="reveal-stage">
        <div className="reveal-rays" aria-hidden="true" />
        <div className="reveal-threads" aria-hidden="true">
          {Array.from({ length: 22 }, (_, i) => (
            <i key={i} style={{ ['--a' as string]: `${(i / 22) * 360 + (i % 3) * 7}deg`, ['--d' as string]: `${90 + (i % 5) * 28}px`, ['--c' as string]: THREADS[i % THREADS.length], animationDelay: `${(i % 4) * 0.035}s` }} />
          ))}
        </div>
        <div className="reveal-parcel" aria-hidden="true">
          <span className="rp-flap rp-n" /><span className="rp-flap rp-e" /><span className="rp-flap rp-s" /><span className="rp-flap rp-w" />
          <span className="rp-cord rp-h" /><span className="rp-cord rp-v" /><span className="rp-knot" />
        </div>
        <div className="reveal-card">
          {cur.pic && <span className={`reveal-pic ${cur.picKind ?? 'photo'}`}><img src={cur.pic} alt="" /></span>}
          <small>{cur.kicker}</small>
          <b>{cur.title}</b>
          {cur.line && <span>{cur.line}</span>}
          <em>{stage === 'done' ? 'Tap to close' : 'Tap to skip'}</em>
        </div>
      </div>
    </div>,
    document.body,
  );
}
