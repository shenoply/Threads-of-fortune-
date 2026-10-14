import { useEffect, useRef, useState } from 'react';
import { useGame } from '../../game/state/store';
import { isOpen, newlyOpen, type Sys } from '../../game/unlocks';
import './once.css';

/** is this part of the game in view yet (game/unlocks.ts)? */
export const useOpen = (k: Sys) => useGame((s) => isOpen(s, k));

/** Watches the game for a system whose moment has come, marks it open, and says so in one short line at
 *  the foot of the screen: no card, nothing to press, gone after a few seconds (or a tap). Two at once
 *  come one after the other. */
export function UnlockNotice() {
  const [line, setLine] = useState('');
  const queue = useRef<string[]>([]);
  const timer = useRef<number>();
  const next = () => {
    const m = queue.current.shift() ?? '';
    setLine(m);
    window.clearTimeout(timer.current);
    timer.current = m ? window.setTimeout(next, Math.max(5000, m.length * 70)) : undefined;
  };
  useEffect(() => {
    const check = () => {
      const s = useGame.getState();
      const fresh = newlyOpen(s);
      if (!fresh.length) return;
      useGame.setState({ tipsSeen: [...new Set([...(s.tipsSeen ?? []), ...fresh.map((f) => f.mark)])] });
      const lines = fresh.map((f) => f.line).filter(Boolean);
      if (!lines.length) return;
      queue.current.push(...lines);
      if (!timer.current) next();
    };
    check();
    const off = useGame.subscribe(check);
    return () => { off(); window.clearTimeout(timer.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!line) return null;
  return (
    <div className="toast unlock-note" role="status" data-testid="unlock-note" onClick={next}>{line}</div>
  );
}
