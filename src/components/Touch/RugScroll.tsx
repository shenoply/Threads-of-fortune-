// The rug tray as one strip the finger pages through: it follows the finger, carries on a little when
// let go and comes to rest on a card's edge (the browser's own scroll and snap on a phone; a mouse
// drags it the same way). A soft fade at either end says there are more rugs that way. A long press
// on a card opens the rug in the inspector.
//
// Shared (src/components/Touch): the stall's tray, the stock rows, the market and dealer rows and the
// title badges all page the same way. A small tick on the phone when the strip comes to rest on a new item.
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from 'react';
import { buzz } from '../../game/feel';

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
      // a held Buy or Haggle button is a button, not a look at the rug
      const ctl = (e.target as HTMLElement).closest('button, input, select, textarea, a, [data-nohold]');
      if (ctl && ctl !== el) return;
      delete el.dataset.held;
      clear();
      t = window.setTimeout(() => {
        t = 0; el.dataset.held = '1'; buzz(12); onHold();
        // the click that ends the hold is not a tap on the card
        const swallow = (ev: Event) => { if (el.dataset.held) { ev.stopPropagation(); ev.preventDefault(); delete el.dataset.held; } };
        el.addEventListener('click', swallow, { capture: true, once: true });
        window.setTimeout(() => { el.removeEventListener('click', swallow, { capture: true }); delete el.dataset.held; }, 900);
      }, HOLD_MS);
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => { if (t && Math.hypot(e.clientX - x, e.clientY - y) > SLOP) clear(); },
    onPointerUp: clear,
    onPointerCancel: clear,
    onPointerLeave: clear,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    'data-hold': '',
  };
}

export const RugScroll = forwardRef<HTMLDivElement, { count: number; children: ReactNode; className?: string; testid?: string; label?: string }>(function RugScroll({ count, children, className, testid = 'rugscroll', label }, ref) {
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

  // a tick when a finger's swipe comes to rest on a new item
  const rest = useRef(0);
  const touched = useRef(false);
  const settle = () => {
    const s = el.current;
    if (!s) return;
    const card = s.firstElementChild as HTMLElement | null;
    const step = card ? card.getBoundingClientRect().width : s.clientWidth;
    const i = Math.round(s.scrollLeft / Math.max(1, step));
    if (i !== rest.current && touched.current) buzz(8);
    rest.current = i; touched.current = false;
  };
  useEffect(() => {
    const s = el.current;
    if (!s) return;
    const on = () => { touched.current = true; };
    s.addEventListener('touchstart', on, { passive: true });
    s.addEventListener('scrollend', settle);
    return () => { s.removeEventListener('touchstart', on); s.removeEventListener('scrollend', settle); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    touched.current = true;
    window.setTimeout(() => { s.style.scrollSnapType = ''; }, 380);
    // the click at the end of a drag is not a tap on a card
    const swallow = (ev: Event) => { ev.stopPropagation(); ev.preventDefault(); };
    s.addEventListener('click', swallow, { capture: true, once: true });
    window.setTimeout(() => s.removeEventListener('click', swallow, { capture: true }), 0);
  };

  return (
    <div
      ref={el}
      className={`rugscroll${className ? ` ${className}` : ''}${ends.l ? ' more-l' : ''}${ends.r ? ' more-r' : ''}`}
      onScroll={measure}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      data-testid={testid}
      role={label ? 'list' : undefined}
      aria-label={label}
      data-more={ends.r ? 'right' : ends.l ? 'left' : undefined}
    >
      {children}
    </div>
  );
});
