import { useEffect, useRef, useState } from 'react';
import { useGame } from '../../game/state/store';
import { isOpen, newlyOpen, type Sys } from '../../game/unlocks';
import { waitsTurn, useHeld } from '../../game/cardTurn';
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
    timer.current = m ? window.setTimeout(next, Math.min(4000, Math.max(2600, m.length * 45))) : undefined;
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
  // a card or a fight on screen: the line waits, and its few seconds start once the screen is clear
  const busy = useGame((s) => waitsTurn(s));
  const hold = useHeld();
  const wait = busy || hold;
  useEffect(() => {
    if (!line) return;
    window.clearTimeout(timer.current);
    // (a marker, not a timer: keeps a fresh line queued instead of shown over the card)
    if (wait) { timer.current = -1; return; }
    timer.current = window.setTimeout(next, Math.min(4000, Math.max(2600, line.length * 45)));
  }, [wait, line]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!line || wait) return null;
  return (
    <div className="toast unlock-note" role="status" data-testid="unlock-note" onClick={next}>{line}</div>
  );
}
