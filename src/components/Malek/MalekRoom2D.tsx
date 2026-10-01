// Malek's shop as a painted 2.5D room, like Arran's laboratory: the visit's painting fills the view
// (Malek is painted into it, at the grill, the bench, carrying a plate or counting coins), you drag to
// look across it, and the places you can use are marked on the painting. Smoke over a hot grill, lamp
// glow at closing, and the rug you sold him lying on his floor.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { MalekScene } from '../../game/systems/malek';

export type Hotspot = 'malek' | 'grill' | 'menu' | 'tables' | 'exit';
type Pt = [number, number];
/** where things are in each painting (percent across, percent down) */
const SPOTS: Record<MalekScene, Record<Hotspot, Pt> & { rug: Pt; smoke: Pt | null; lamps: Pt[] }> = {
  grilling: { malek: [33, 17], grill: [17, 50], menu: [40, 12], tables: [64, 50], exit: [89, 40], rug: [47, 66], smoke: [17, 40], lamps: [[72, 37], [66, 52], [80, 19]] },
  preparing: { malek: [66, 10], grill: [17, 49], menu: [40, 13], tables: [62, 57], exit: [88, 40], rug: [44, 64], smoke: [17, 42], lamps: [[80, 21]] },
  serving: { malek: [41, 14], grill: [18, 38], menu: [52, 15], tables: [62, 56], exit: [90, 46], rug: [32, 76], smoke: [22, 28], lamps: [[74, 44], [67, 55], [83, 22]] },
  closing: { malek: [60, 29], grill: [18, 50], menu: [40, 13], tables: [72, 44], exit: [88, 40], rug: [44, 66], smoke: null, lamps: [[72, 37], [68, 54], [80, 19]] },
};
export const SCENE_IMG: Record<MalekScene, string> = {
  preparing: 'art/malek/scene-preparing.webp',
  grilling: 'art/malek/scene-grilling.webp',
  serving: 'art/malek/scene-serving.webp',
  closing: 'art/malek/scene-closing.webp',
};
const LABEL: Record<Hotspot, string> = { malek: 'Malek', grill: 'The grill', menu: 'Menu', tables: 'Sit at a table', exit: 'Way out' };
const RATIO = 1280 / 853;

export function MalekRoom2D({ scene, onPick, rug, coldGrill }: { scene: MalekScene; onPick: (h: Hotspot) => void; rug?: string; coldGrill?: boolean }) {
  const vp = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [off, setOff] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const moved = useRef(false);
  const spots = SPOTS[scene];

  useLayoutEffect(() => {
    const el = vp.current; if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el); setBox({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);
  // the painting covers the view with a little to spare, so there is always something to look across
  const H = Math.max(box.h, box.w / RATIO) * 1.12;
  const W = H * RATIO;
  const clamp = (x: number, y: number) => ({ x: Math.min(0, Math.max(box.w - W, x)), y: Math.min(0, Math.max(box.h - H, y)) });
  const focus = (p: Pt) => clamp(box.w / 2 - (p[0] / 100) * W, box.h / 2 - (p[1] / 100) * H);
  // open on Malek; follow resizes
  useEffect(() => { if (box.w) setOff(focus(spots.malek)); }, [box.w, box.h, scene]); // eslint-disable-line react-hooks/exhaustive-deps

  // drag to look around (a deliberate drag only; taps go to the marks). Listeners are set once and
  // read the latest position and size from refs, so a drag runs smoothly from start to finish.
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
    // the click that ends a drag is not a tap on a mark; the next gesture starts clean
    const up = () => { if (!start) return; start = null; setDragging(false); window.setTimeout(() => { moved.current = false; }, 0); };
    el.addEventListener('pointerdown', down); window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    return () => { el.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
  }, []);

  const pick = (h: Hotspot) => { setOff(focus(spots[h])); onPick(h); };
  const at = (p: Pt) => ({ left: `${p[0]}%`, top: `${p[1]}%` });
  const night = scene === 'closing';
  return (
    <div className="mroom" ref={vp} data-testid="malek-room" data-scene={scene}>
      <div
        className={`mroom__world ${dragging ? 'is-dragging' : ''}`}
        style={{ width: W, height: H, transform: `translate(${off?.x ?? 0}px, ${off?.y ?? 0}px)` }}
        data-testid="malek-world"
      >
        <img className="mroom__img" src={SCENE_IMG[scene]} alt="Inside Malek's grill" draggable={false} />
        {rug && <img className="mroom__rug" src={rug} alt="Your rug, on his floor" style={at(spots.rug)} data-testid="malek-rug" draggable={false} />}
        {spots.smoke && !coldGrill && <span className="mroom__smoke" style={at(spots.smoke)} aria-hidden="true"><i /><i /><i /></span>}
        {spots.lamps.map((p, i) => <span key={i} className={`mroom__glow ${night ? 'is-night' : ''}`} style={at(p)} aria-hidden="true" />)}
        {(Object.keys(LABEL) as Hotspot[]).map((h) => (
          <button key={h} className={`mroom__spot mroom__spot--${h}`} style={at(spots[h])} onClick={() => { if (!moved.current) pick(h); }} data-testid={`malek-hot-${h}`}>
            <span>{h === 'grill' && coldGrill ? 'The grill (cold)' : LABEL[h]}</span>
          </button>
        ))}
      </div>
      <div className={`mroom__light ${night ? 'is-night' : ''}`} aria-hidden="true" />
    </div>
  );
}
