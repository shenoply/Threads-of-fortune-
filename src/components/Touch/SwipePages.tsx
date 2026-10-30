// Pages turned with a sideways swipe: the page leans a little after the finger, and once let go past
// a short distance (or flicked) the next or the previous page comes; short of that it settles back.
// Up and down is left to the page's own scroll (touch-action: pan-y). The arrows, tabs or buttons the
// panel already has stay as they were; this only adds the swipe.
import { useRef, useState, type CSSProperties } from 'react';
import { buzz, reducedMotion } from '../../game/feel';

export function useSwipePages(go: { prev?: (() => void) | null; next?: (() => void) | null }, enabled = true) {
  const st = useRef<{ x: number; y: number; t: number; dx: number; on: boolean; id: number } | null>(null);
  const [dx, setDx] = useState(0);
  const [phase, setPhase] = useState<'rest' | 'drag' | 'back'>('rest');
  const cb = useRef(go);
  cb.current = go;

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (!enabled || (e.pointerType === 'mouse')) return;
    const tg = e.target as HTMLElement;
    if (tg.closest('[data-noswipe], input, select, textarea, .rugscroll, [data-swipe], .swipe-away')) return;
    st.current = { x: e.clientX, y: e.clientY, t: e.timeStamp, dx: 0, on: false, id: e.pointerId };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const s = st.current;
    if (!s || e.pointerId !== s.id) return;
    const mx = e.clientX - s.x, my = e.clientY - s.y;
    if (!s.on) {
      if (Math.abs(my) > 10 && Math.abs(my) > Math.abs(mx)) { st.current = null; return; }
      if (Math.abs(mx) < 12) return;
      s.on = true; setPhase('drag');
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* gone */ }
    }
    s.dx = mx;
    // the page leans after the finger, less and less the further it goes; harder still where there is no page
    const has = mx < 0 ? !!cb.current.next : !!cb.current.prev;
    const lean = Math.sign(mx) * Math.min(56, Math.abs(mx) * (has ? 0.35 : 0.12));
    setDx(lean);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLElement>) => {
    const s = st.current;
    st.current = null;
    if (!s?.on) return;
    const el = e.currentTarget;
    const swallow = (ev: Event) => { ev.stopPropagation(); ev.preventDefault(); };
    el.addEventListener('click', swallow, { capture: true, once: true });
    window.setTimeout(() => el.removeEventListener('click', swallow, { capture: true }), 0);
    const v = Math.abs(s.dx) / Math.max(1, e.timeStamp - s.t);
    const far = Math.abs(s.dx) > 70 || (Math.abs(s.dx) > 36 && v > 0.5);
    const f = s.dx < 0 ? cb.current.next : cb.current.prev;
    setPhase('back'); setDx(0);
    window.setTimeout(() => setPhase((p) => (p === 'back' ? 'rest' : p)), 240);
    if (e.type !== 'pointercancel' && far && f) { buzz(8); f(); }
  };
  const style: CSSProperties = phase === 'rest' || reducedMotion() ? {} : {
    translate: `${dx}px 0`,
    transition: phase === 'drag' ? 'none' : 'translate .24s cubic-bezier(.2,.7,.2,1)',
  };
  return { style, handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp }, 'data-pages': '' as const };
}

/** spread on the element that holds the pages */
export function pageProps(sp: ReturnType<typeof useSwipePages>, style?: CSSProperties) {
  return { style: { ...style, ...sp.style }, ...sp.handlers, 'data-pages': '' } as const;
}
