import { useEffect, useRef } from 'react';

/** The crossing in three paintings: the quay, open water, the coast ahead. */
// the ship sits right of centre on the quay, centred at sea, left of the town on arrival: each frame
// keeps its ship in view when a phone crops the sides
const FRAMES = [['depart', '64%'], ['sea', '50%'], ['arrive', '46%']].map(([f, x]) => ({ src: `art/drafts/voyage-${f}.webp`, x }));
const FRAME_MS = 1000;

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
    // three frames, each held a moment and faded into the next (CSS), then arrival
    const t = setTimeout(finish, reduced ? 300 : FRAME_MS * FRAMES.length);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="sailing-transition" role="status" aria-live="polite" data-testid="sailing-transition">
      {FRAMES.map(({ src, x }, i) => (
        <img key={src} className="sailing-transition__frame" src={src} alt="" aria-hidden="true" draggable={false} style={{ animationDelay: `${i * FRAME_MS}ms`, zIndex: i, objectPosition: `${x} 55%` }} />
      ))}
      <div className="sailing-transition__caption">Sailing from {from} to {to}</div>
      <button type="button" className="sailing-transition__skip" onClick={finish} data-testid="sailing-skip">Skip animation</button>
    </div>
  );
}
