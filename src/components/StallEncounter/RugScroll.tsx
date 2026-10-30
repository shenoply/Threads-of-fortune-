// The rug tray as one strip the finger pages through: it follows the finger, carries on a little when
// let go and comes to rest on a card's edge (the browser's own scroll and snap on a phone; a mouse
// drags it the same way). A soft fade at either end says there are more rugs that way. A long press
// on a card opens the rug in the inspector.
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from 'react';

const HOLD_MS = 480;
const SLOP = 8;

/** press and hold: `onHold` after a short while, unless the finger moved (a swipe) or lifted first. The
 *  click that follows a hold is marked (data-held) so the card's tap does not also fire. */
export function longPress(onHold?: () => void) {
  if (!onHold) return {};
  let t = 0, x = 0, y = 0;
  const clear = () => { window.clearTimeout(t); t = 0; };
  return {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (e.button !== 0) return;
      x = e.clientX; y = e.clientY;
      const el = e.currentTarget;
      delete el.dataset.held;
      clear();
      t = window.setTimeout(() => { t = 0; el.dataset.held = '1'; try { navigator.vibrate?.(12); } catch { /* none */ } onHold(); }, HOLD_MS);
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => { if (t && Math.hypot(e.clientX - x, e.clientY - y) > SLOP) clear(); },
    onPointerUp: clear,
    onPointerCancel: clear,
    onPointerLeave: clear,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  };
}

export const RugScroll = forwardRef<HTMLDivElement, { count: number; children: ReactNode }>(function RugScroll({ count, children }, ref) {
  const el = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => el.current as HTMLDivElement);
  const [ends, setEnds] = useState({ l: false, r: false });
  const measure = useCallback(() => {
    const s = el.current;
    if (!s) return;
    const l = s.scrollLeft > 4, r = s.scrollLeft + s.clientWidth < s.scrollWidth - 4;
    setEnds((o) => (o.l === l && o.r === r ? o : { l, r }));
  }, []);
  useEffect(() => {
    measure();
    const s = el.current;
    if (!s) return;
    const ro = new ResizeObserver(measure);
    ro.observe(s);
    return () => ro.disconnect();
  }, [measure, count]);

  // a mouse has no swipe: drag the strip with it, then let it settle on the nearest card
  const drag = useRef<{ x: number; left: number; moved: boolean; vx: number; t: number; lx: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag.current = { x: e.clientX, left: el.current!.scrollLeft, moved: false, vx: 0, t: e.timeStamp, lx: e.clientX };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current, s = el.current;
    if (!d || !s) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) < SLOP) return;
    if (!d.moved) { d.moved = true; s.style.scrollSnapType = 'none'; s.setPointerCapture(e.pointerId); }
    s.scrollLeft = d.left - dx;
    const dt = Math.max(1, e.timeStamp - d.t);
    d.vx = 0.7 * ((e.clientX - d.lx) / dt) + 0.3 * d.vx; d.t = e.timeStamp; d.lx = e.clientX;
  };
  const end = () => {
    const d = drag.current, s = el.current;
    drag.current = null;
    if (!d?.moved || !s) return;
    const card = s.firstElementChild as HTMLElement | null;
    const step = card ? card.getBoundingClientRect().width + parseFloat(getComputedStyle(s).columnGap || '0') : s.clientWidth / 3;
    // a flick carries on a card or two, as a finger's would; a slow drag rests on the nearest card
    const carry = Math.max(-2, Math.min(2, Math.round(-d.vx * 2.2)));
    const to = (Math.round(s.scrollLeft / step) + carry) * step;
    s.scrollTo({ left: to, behavior: 'smooth' });
    window.setTimeout(() => { s.style.scrollSnapType = ''; }, 380);
    // the click at the end of a drag is not a tap on a card
    const swallow = (ev: Event) => { ev.stopPropagation(); ev.preventDefault(); };
    s.addEventListener('click', swallow, { capture: true, once: true });
    window.setTimeout(() => s.removeEventListener('click', swallow, { capture: true }), 0);
  };

  return (
    <div
      ref={el}
      className={`rugscroll${ends.l ? ' more-l' : ''}${ends.r ? ' more-r' : ''}`}
      onScroll={measure}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      data-testid="rugscroll"
      data-more={ends.r ? 'right' : ends.l ? 'left' : undefined}
    >
      {children}
    </div>
  );
});
