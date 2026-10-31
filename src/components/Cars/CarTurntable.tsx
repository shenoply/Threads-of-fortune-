import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { CAR_BY_ID } from '../../data/cars';
import './cars.css';

export const CAR_FRAMES = 8;
export const carFrame = (id: string, n: number) => `art/cars/${id}-${String(n + 1).padStart(2, '0')}.webp`;
/** pixels of drag for one frame of turn */
const STEP_PX = 36;

/**
 * A car on a turntable: eight pictures taken round it, turned by a drag or swipe, the ◀ ▶ buttons or
 * the arrow keys, always resting on a whole frame. Until the pictures are drawn, a plain card with the
 * model's name stands in (the first frame is tried; if it fails, no broken picture is ever shown).
 */
export function CarTurntable({ id, compact = false }: { id: string; compact?: boolean }) {
  const m = CAR_BY_ID[id];
  const [frame, setFrame] = useState(0);
  const [missing, setMissing] = useState(false);
  const [ready, setReady] = useState(false);
  const drag = useRef<{ x: number; f: number; id: number } | null>(null);
  useEffect(() => { setFrame(0); setMissing(false); setReady(false); }, [id]);
  // once the first picture is there, fetch the rest so the turn does not flicker
  useEffect(() => {
    if (!ready) return;
    for (let i = 1; i < CAR_FRAMES; i++) { const im = new Image(); im.src = carFrame(id, i); }
  }, [ready, id]);
  const turn = (d: number) => setFrame((f) => (((f + d) % CAR_FRAMES) + CAR_FRAMES) % CAR_FRAMES);
  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (missing) return;
    drag.current = { x: e.clientX, f: frame, id: e.pointerId };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const steps = Math.round((d.x - e.clientX) / STEP_PX);
    setFrame((((d.f + steps) % CAR_FRAMES) + CAR_FRAMES) % CAR_FRAMES);
  };
  const up = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id === e.pointerId) drag.current = null;
  };
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    if (missing) return;
    if (e.key === 'ArrowLeft') { turn(-1); e.preventDefault(); }
    if (e.key === 'ArrowRight') { turn(1); e.preventDefault(); }
  };
  if (!m) return null;
  return (
    <div className={`car-turn${compact ? ' compact' : ''}${missing ? ' none' : ''}`} data-testid="car-turntable">
      <div
        className="car-turn-stage"
        tabIndex={missing ? -1 : 0}
        role={missing ? undefined : 'slider'}
        aria-label={missing ? undefined : `${m.name}, turn with the arrow keys`}
        aria-valuemin={missing ? undefined : 1}
        aria-valuemax={missing ? undefined : CAR_FRAMES}
        aria-valuenow={missing ? undefined : frame + 1}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onKeyDown={key}
      >
        {missing ? (
          <div className="car-turn-card" data-testid="car-placeholder">
            <b>{m.name}</b>
            <small>Pictures to come</small>
          </div>
        ) : (
          <img
            key={frame}
            src={carFrame(id, frame)}
            alt={`${m.name}, view ${frame + 1} of ${CAR_FRAMES}`}
            draggable={false}
            onLoad={() => setReady(true)}
            onError={() => setMissing(true)}
            data-testid="car-frame"
          />
        )}
      </div>
      {!missing && (
        <div className="car-turn-btns">
          <button className="btn small" onClick={() => turn(-1)} aria-label="Turn left" data-testid="car-turn-left">◀</button>
          <span className="car-turn-dots" aria-hidden="true">{Array.from({ length: CAR_FRAMES }, (_, i) => <i key={i} className={i === frame ? 'on' : ''} />)}</span>
          <button className="btn small" onClick={() => turn(1)} aria-label="Turn right" data-testid="car-turn-right">▶</button>
        </div>
      )}
    </div>
  );
}
