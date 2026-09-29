import { useEffect, useRef } from 'react';

/** A brief, skippable crossing while a booked passage commits: the ship leaves the quay, crosses the
 *  water, and the destination coastline appears. Purely a presentation layer over one moment in time —
 *  onArrive is called exactly once, whether the animation finishes or the player skips it, and nothing
 *  about the booking (cost, date, food, arrival event) happens more than once because of it. */
export function SailingTransition({ from, to, onArrive }: { from: string; to: string; onArrive: () => void }) {
  const done = useRef(false);
  const finish = () => {
    if (done.current) return;
    done.current = true;
    onArrive();
  };
  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(finish, reduced ? 300 : 2200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="sailing-transition" role="status" aria-live="polite" data-testid="sailing-transition">
      <div className="sailing-transition__sea" />
      <div className="sailing-transition__ship" aria-hidden="true">⛵</div>
      <div className="sailing-transition__caption">Sailing from {from} to {to}</div>
      <button type="button" className="sailing-transition__skip" onClick={finish} data-testid="sailing-skip">Skip animation</button>
    </div>
  );
}
