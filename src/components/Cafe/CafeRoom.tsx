// Inside Bilgin's coffee house, as a painted 2.5D room like Malek's grill: two views of the same room
// (his counter and brazier; the chess corner at the back), drag to look across, tap a mark to act.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import '../Malek/MalekShop.css';
import './cafe.css';

type View = 'counter' | 'corner';
type Pt = [number, number];
interface Spot { id: string; label: string; at: Pt; main?: boolean }
const IMG: Record<View, string> = { counter: 'art/cafe/bilgin-cafe-working.webp', corner: 'art/cafe/bilgin-chess.webp' };
const RATIO = 1280 / 853;
/** where things are in each painting (percent across, percent down) */
const SPOTS: Record<View, Spot[]> = {
  counter: [
    { id: 'bilgin', label: 'Talk to Bilgin', at: [44, 74], main: true },
    { id: 'corner', label: 'The chess corner', at: [86, 70] },
    { id: 'out', label: 'Way out', at: [80, 32] },
  ],
  corner: [
    { id: 'play', label: 'Play Bilgin', at: [62, 80], main: true },
    { id: 'bilgin', label: 'Talk to Bilgin', at: [44, 52] },
    { id: 'counter', label: 'Back to the counter', at: [12, 46] },
    { id: 'out', label: 'Way out', at: [30, 20] },
  ],
};

export function CafeRoom({ onTalk, onPlay, onLeave, onFilm, note, onNote }: { onTalk: () => void; onPlay: () => void; onLeave: () => void; onFilm?: () => void; note?: string; onNote?: () => void }) {
  const [view, setView] = useState<View>('counter');
  const vp = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [off, setOff] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const moved = useRef(false);

  useLayoutEffect(() => {
    const el = vp.current; if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el); setBox({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);
  const H = Math.max(box.h, box.w / RATIO) * 1.08;
  const W = H * RATIO;
  const clamp = (x: number, y: number) => ({ x: Math.min(0, Math.max(box.w - W, x)), y: Math.min(0, Math.max(box.h - H, y)) });
  const focus = (p: Pt) => clamp(box.w / 2 - (p[0] / 100) * W, box.h / 2 - (p[1] / 100) * H);
  const main = SPOTS[view].find((s) => s.main)!;
  useEffect(() => { if (box.w) setOff(focus([view === 'corner' ? 53 : main.at[0], 50])); }, [box.w, box.h, view]); // eslint-disable-line react-hooks/exhaustive-deps

  const offRef = useRef(off); offRef.current = off;
  const clampRef = useRef(clamp); clampRef.current = clamp;
  useEffect(() => {
    const el = vp.current; if (!el) return;
    let start: { x: number; y: number; ox: number; oy: number } | null = null;
    const down = (e: PointerEvent) => {
      moved.current = false;
      if ((e.target as HTMLElement).closest('button')) return;
      start = { x: e.clientX, y: e.clientY, ox: offRef.current?.x ?? 0, oy: offRef.current?.y ?? 0 };
    };
    const move = (e: PointerEvent) => {
      if (!start) return;
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (!moved.current && Math.hypot(dx, dy) < 6) return;
      moved.current = true; setDragging(true);
      setOff(clampRef.current(start.ox + dx, start.oy + dy));
    };
    const up = () => { if (!start) return; start = null; setDragging(false); window.setTimeout(() => { moved.current = false; }, 0); };
    el.addEventListener('pointerdown', down); window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    return () => { el.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
  }, []);

  const pick = (s: Spot) => {
    if (moved.current) return;
    if (s.id === 'bilgin') onTalk();
    else if (s.id === 'play') onPlay();
    else if (s.id === 'corner' || s.id === 'counter') setView(s.id);
    else if (s.id === 'out') onLeave();
  };

  return (
    <div className="cafe-room" data-testid="cafe-room" data-view={view}>
      <div className="mroom" ref={vp}>
        <div className={`mroom__world ${dragging ? 'is-dragging' : ''}`} style={{ width: W, height: H, transform: `translate(${off?.x ?? 0}px, ${off?.y ?? 0}px)` }}>
          <img className="mroom__img" src={IMG[view]} alt={view === 'counter' ? "Bilgin at his counter" : 'The chess corner'} draggable={false} />
          <span className="mroom__glow" style={{ left: '12%', top: '78%' }} aria-hidden="true" />
          {SPOTS[view].map((s) => (
            <button key={s.id} className={`mroom__spot${s.main ? ' mroom__spot--malek' : ''}`} style={{ left: `${s.at[0]}%`, top: `${s.at[1]}%` }} onClick={() => pick(s)} data-testid={s.id === 'play' ? 'cafe-play' : `cafe-hot-${s.id}`}>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
        <div className="mroom__light" aria-hidden="true" />
      </div>
      <div className="cafe-room__head">
        <b>Bilgin's coffee house</b>
        <button className="btn small" onClick={() => setView(view === 'counter' ? 'corner' : 'counter')} data-testid="cafe-room-view">{view === 'counter' ? '♞ Chess corner' : '☕ Counter'}</button>
        {onFilm && <button className="btn small" onClick={onFilm} data-testid="abuhamid-film-again">▶ Film</button>}
        <button className="btn small" onClick={onLeave} data-testid="cafe-room-leave">✕</button>
      </div>
      {note && <div className="cafe-room__note" data-testid="cafe-room-note"><p>{note}</p><button className="btn small" onClick={onNote}>OK</button></div>}
    </div>
  );
}
