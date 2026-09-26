import { useEffect, useRef, useState } from 'react';
import { fmt } from '../../game/economy/money';
import { useGame } from '../../game/state/store';
import { CITIES } from '../../data/cities';
import { Icon } from '../Icon';

const MW = 885, MH = 567;

/** Illustrated route map. Pan by dragging, zoom with buttons, wheel or pinch. Other cities open after Giza. */
export function TradeMap() {
  const g = useGame();
  const wrap = useRef<HTMLDivElement>(null);
  const [z, setZ] = useState(1);
  const [p, setP] = useState({ x: 0, y: 0 });
  const [sel, setSel] = useState('giza');
  const [base, setBase] = useState(1);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; z: number } | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const fit = () => {
      const b = Math.max(el.clientWidth / MW, el.clientHeight / MH);
      setBase(b);
      // start centred on Giza
      const gz = CITIES[0];
      setP({ x: el.clientWidth / 2 - (gz.x / 100) * MW * b, y: el.clientHeight / 2 - (gz.y / 100) * MH * b });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const clampP = (np: { x: number; y: number }, zz: number) => {
    const el = wrap.current!;
    const w = MW * base * zz, h = MH * base * zz;
    return { x: Math.min(0, Math.max(el.clientWidth - w, np.x)), y: Math.min(0, Math.max(el.clientHeight - h, np.y)) };
  };
  const zoomTo = (nz: number) => {
    const el = wrap.current!;
    nz = Math.max(1, Math.min(3, nz));
    const cx = el.clientWidth / 2, cy = el.clientHeight / 2;
    const k = nz / z;
    setP(clampP({ x: cx - (cx - p.x) * k, y: cy - (cy - p.y) * k }, nz));
    setZ(nz);
  };

  const city = CITIES.find((c) => c.id === sel)!;
  const s = base * z;
  return (
    <div className="screen" data-testid="map">
      <div className="screen-head">
        <div>
          <div className="eyebrow">THE ROAD AHEAD</div>
          <h2>Trade Routes</h2>
          <p>Build a name in Giza first. The old roads open as your reputation grows.</p>
        </div>
      </div>
      <div
        className="mapwrap"
        ref={wrap}
        onWheel={(e) => zoomTo(z * (e.deltaY < 0 ? 1.15 : 0.87))}
        onPointerDown={(e) => {
          pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pts.current.size === 2) {
            const [a, b] = [...pts.current.values()];
            pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), z };
          } else drag.current = { x: e.clientX, y: e.clientY, px: p.x, py: p.y };
        }}
        onPointerMove={(e) => {
          if (!pts.current.has(e.pointerId)) return;
          pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pinch.current && pts.current.size === 2) {
            const [a, b] = [...pts.current.values()];
            zoomTo(pinch.current.z * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.d));
          } else if (drag.current) setP(clampP({ x: drag.current.px + e.clientX - drag.current.x, y: drag.current.py + e.clientY - drag.current.y }, z));
        }}
        onPointerUp={(e) => {
          pts.current.delete(e.pointerId);
          if (pts.current.size < 2) pinch.current = null;
          drag.current = null;
        }}
        onPointerLeave={() => { drag.current = null; }}
        data-testid="mapwrap"
      >
        <div className="mapinner" style={{ transform: `translate(${p.x}px, ${p.y}px)` }} data-testid="mapinner" data-zoom={z.toFixed(2)}>
          <img src="art/map-levant.jpg" alt="Illustrated map of Egypt and the Levant" style={{ width: MW * s, height: MH * s }} draggable={false} />
          {CITIES.map((c) => {
            const here = c.id === 'giza';
            return (
              <button
                key={c.id}
                className={`pin ${here ? 'here' : ''} ${sel === c.id ? 'sel' : ''}`}
                style={{ left: (c.x / 100) * MW * s, top: (c.y / 100) * MH * s }}
                onClick={(e) => { e.stopPropagation(); setSel(c.id); }}
                onPointerDown={(e) => e.stopPropagation()}
                data-testid={`pin-${c.id}`}
              >
                <span className="dot"><Icon name={here ? 'pin' : 'lock'} /></span>
                <span className="lbl">{c.name}</span>
              </button>
            );
          })}
        </div>
        <div className="map-tools">
          <button onClick={() => zoomTo(z + 0.5)} aria-label="Zoom in" data-testid="map-zoom-in">+</button>
          <button onClick={() => zoomTo(z - 0.5)} aria-label="Zoom out">−</button>
        </div>
      </div>
      <div className="city-card" data-testid="city-card">
        <h3>{city.name}</h3>
        <p>{city.blurb} Demand: {city.demand}.</p>
        {city.unlock ? (
          <div className="req">
            <span className={g.totalSales >= city.unlock.sales ? 'met' : ''}>{Math.min(g.totalSales, city.unlock.sales)}/{city.unlock.sales} sales</span>
            <span className={g.reputation >= city.unlock.reputation ? 'met' : ''}>Reputation {Math.min(g.reputation, city.unlock.reputation)}/{city.unlock.reputation}</span>
            <span className={g.cash >= city.unlock.travel ? 'met' : ''}>Travel {fmt(city.unlock.travel)}</span>
            <span>Opens in a later build</span>
          </div>
        ) : (
          <div className="req"><span className="met">You are here</span></div>
        )}
      </div>
    </div>
  );
}
