// A card the finger can push aside: it follows a sideways drag, and once let go past a third of its
// width (or flicked) it slides out that way; short of that it eases back into place. Vertical drags are
// left to the page (the card is touch-action: pan-y), so whatever lies under it still scrolls. The click
// that ends a drag is swallowed, so a swipe that starts on a name does not also open a card. Every card
// that uses it keeps its own tap or × to close.
//
// The card moves by the `translate` property, not `transform`, so a toast centred with a transform, or
// one that rises in on a keyframe, keeps its own place while it is pushed.
import { useEffect, useRef, useState, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import { buzz, reducedMotion } from '../../game/feel';

/** `resetKey`: what the card shows; when it changes (the notice timed out under the finger and the next
 *  one came), the new card starts in its place */
export function useSwipeAway(onGone: () => void, enabled = true, resetKey?: unknown) {
  const st = useRef<{ x: number; y: number; t: number; dx: number; on: boolean; id: number; w: number } | null>(null);
  const [dx, setDx] = useState(0);
  const [phase, setPhase] = useState<'rest' | 'drag' | 'back' | 'out'>('rest');
  const gone = useRef(onGone);
  gone.current = onGone;
  useEffect(() => { st.current = null; setPhase('rest'); setDx(0); }, [resetKey]);

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (!enabled) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const tg = e.target as HTMLElement;
    if (tg.closest('[data-noswipe], input, select, textarea, .rugscroll')) return;
    st.current = { x: e.clientX, y: e.clientY, t: e.timeStamp, dx: 0, on: false, id: e.pointerId, w: e.currentTarget.getBoundingClientRect().width || 300 };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const s = st.current;
    if (!s || e.pointerId !== s.id) return;
    const mx = e.clientX - s.x, my = e.clientY - s.y;
    if (!s.on) {
      if (Math.abs(my) > 10 && Math.abs(my) > Math.abs(mx)) { st.current = null; return; }
      if (Math.abs(mx) < 10) return;
      s.on = true; setPhase('drag');
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* gone */ }
    }
    e.stopPropagation();
    s.dx = mx; setDx(mx);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLElement>) => {
    const s = st.current;
    st.current = null;
    if (!s?.on) return;
    e.stopPropagation();
    const el = e.currentTarget;
    const swallow = (ev: Event) => { ev.stopPropagation(); ev.preventDefault(); };
    el.addEventListener('click', swallow, { capture: true, once: true });
    window.setTimeout(() => el.removeEventListener('click', swallow, { capture: true }), 0);
    const v = s.dx / Math.max(1, e.timeStamp - s.t);
    if (e.type !== 'pointercancel' && (Math.abs(s.dx) > s.w / 3 || (Math.abs(s.dx) > 40 && Math.abs(v) > 0.6))) {
      buzz(8);
      if (reducedMotion()) { setPhase('rest'); setDx(0); gone.current(); return; }
      setPhase('out'); setDx(Math.sign(s.dx) * (s.w + 40));
      window.setTimeout(() => { gone.current(); setPhase('rest'); setDx(0); }, 220);
    } else {
      setPhase('back'); setDx(0);
      window.setTimeout(() => setPhase((p) => (p === 'back' ? 'rest' : p)), 260);
    }
  };
  const quiet = reducedMotion();
  const style: CSSProperties = phase === 'rest' ? {} : {
    translate: `${dx}px 0`,
    opacity: Math.max(0.15, 1 - Math.abs(dx) / 320),
    transition: phase === 'drag' || quiet ? 'none' : phase === 'out' ? 'translate .22s ease-in, opacity .22s ease-in' : 'translate .26s cubic-bezier(.2,.7,.2,1), opacity .26s',
  };
  return {
    style,
    dragging: phase !== 'rest',
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  };
}

/** A block that can be swiped away, with its own tap or × kept by whoever uses it. */
export function SwipeAway({ onGone, enabled = true, className, style, children, ...rest }: { onGone: () => void; enabled?: boolean; children?: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  const sw = useSwipeAway(onGone, enabled);
  return (
    <div {...rest} className={`swipe-away${className ? ` ${className}` : ''}`} style={{ ...style, ...sw.style }} {...sw.handlers}>
      {children}
    </div>
  );
}

/** For a component's own root element: spread these on it to make it swipe away. */
export function swipeProps(sw: ReturnType<typeof useSwipeAway>, style?: CSSProperties) {
  return { style: { ...style, ...sw.style }, ...sw.handlers, 'data-swipe': '' } as const;
}
