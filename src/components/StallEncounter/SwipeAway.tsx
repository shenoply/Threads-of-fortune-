// A card the finger can push aside: it follows a sideways drag, and once let go past a third of its
// width (or flicked) it slides out that way; short of that it eases back into place. Vertical drags are
// left to the page, so the talk under the picture still scrolls. The click that ends a drag is
// swallowed, so a swipe that starts on the buyer's name does not also open their card.
import { useRef, useState, type CSSProperties } from 'react';

export function useSwipeAway(onGone: () => void) {
  const st = useRef<{ x: number; y: number; t: number; dx: number; on: boolean; id: number; w: number } | null>(null);
  const [dx, setDx] = useState(0);
  const [phase, setPhase] = useState<'rest' | 'drag' | 'back' | 'out'>('rest');

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if ((e.target as HTMLElement).closest('[data-noswipe]')) return;
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
    s.dx = mx; setDx(mx);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLElement>) => {
    const s = st.current;
    st.current = null;
    if (!s?.on) return;
    const el = e.currentTarget;
    const swallow = (ev: Event) => { ev.stopPropagation(); ev.preventDefault(); };
    el.addEventListener('click', swallow, { capture: true, once: true });
    window.setTimeout(() => el.removeEventListener('click', swallow, { capture: true }), 0);
    const v = s.dx / Math.max(1, e.timeStamp - s.t);
    if (Math.abs(s.dx) > s.w / 3 || (Math.abs(s.dx) > 40 && Math.abs(v) > 0.6)) {
      setPhase('out'); setDx(Math.sign(s.dx) * (s.w + 40));
      window.setTimeout(() => { onGone(); setPhase('rest'); setDx(0); }, 220);
    } else {
      setPhase('back'); setDx(0);
      window.setTimeout(() => setPhase((p) => (p === 'back' ? 'rest' : p)), 260);
    }
  };
  const style: CSSProperties = phase === 'rest' ? {} : {
    transform: `translateX(${dx}px)`,
    opacity: Math.max(0.15, 1 - Math.abs(dx) / 320),
    transition: phase === 'drag' ? 'none' : phase === 'out' ? 'transform .22s ease-in, opacity .22s ease-in' : 'transform .26s cubic-bezier(.2,.7,.2,1), opacity .26s',
  };
  return {
    style,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  };
}
