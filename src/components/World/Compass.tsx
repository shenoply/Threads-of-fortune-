// The compass in the bottom-left corner of the travel map: brass rose, blued needle, brass rim (the Blender
// paintings in public/art/map, K-compass-*; drawn in ink when a file is missing). The needle settles on north
// with a damped swing; on the road it swings to the way you are heading; when a town is chosen it points
// there for a moment. A tap brings the map back to you. The needle is turned straight in the DOM by its own
// small frame loop, which rests once the needle does.
import { useEffect, useRef, useState } from 'react';
import { COMPASS, itemFile, onArtFiles } from '../../data/mapArt';
import { Needle } from '../../game/systems/compass';

/** where the needle should point now (radians, 0 = north, clockwise) */
export type CompassAim = () => number;

function useArt(code: keyof typeof COMPASS) {
  const [src, setSrc] = useState(() => itemFile(COMPASS[code]));
  useEffect(() => onArtFiles(() => setSrc(itemFile(COMPASS[code]))), [code]);
  return src;
}

export function Compass({ aim, onTap }: { aim: CompassAim; onTap: () => void }) {
  const box = useRef<HTMLButtonElement>(null);
  const needleEl = useRef<HTMLSpanElement>(null);
  const aimRef = useRef(aim);
  aimRef.current = aim;
  const base = useArt('base'), needle = useArt('needle'), rim = useArt('rim');
  // the needle's own loop: it reads its aim each frame and writes only when the needle has moved
  useEffect(() => {
    const n = new Needle();
    n.a = n.target = aimRef.current();
    let raf = 0, last = performance.now(), shown = NaN;
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      n.setTarget(aimRef.current());
      if (!n.settled) n.step(dt);
      else n.a = n.target;
      const deg = (n.shown * 180) / Math.PI;
      if (Math.abs(deg - shown) > 0.05 && needleEl.current) {
        shown = deg;
        needleEl.current.style.transform = `rotate(${deg.toFixed(2)}deg)`;
        box.current?.setAttribute('data-angle', deg.toFixed(1));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  // clear of the date-and-speed bar along the foot of the map, whatever its height
  useEffect(() => {
    const el = box.current, wrap = el?.closest('.world-map') as HTMLElement | null;
    const bar = wrap?.querySelector<HTMLElement>('.bl-bar');
    if (!el || !wrap || !bar) return;
    const place = () => { el.style.bottom = `${Math.max(8, wrap.clientHeight - bar.offsetTop + 10)}px`; };
    const ro = new ResizeObserver(place);
    ro.observe(bar); ro.observe(wrap);
    place();
    return () => ro.disconnect();
  }, []);
  return (
    <button type="button" ref={box} className="map-compass" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}
      onClick={onTap} aria-label="Compass. Tap to find your caravan" title="Back to your caravan" data-testid="map-compass" data-angle="0">
      {base ? <img src={base} alt="" draggable={false} /> : <RoseInk />}
      <span ref={needleEl} className="mc-needle" data-testid="compass-needle">{needle ? <img src={needle} alt="" draggable={false} /> : <NeedleInk />}</span>
      {rim ? <img src={rim} alt="" draggable={false} /> : <RimInk />}
    </button>
  );
}

// ---------- the ink placeholders, on the paintings' 1024 square ----------
function RoseInk() {
  const pts = Array.from({ length: 16 }, (_, i) => i);
  return (
    <svg viewBox="0 0 1024 1024" aria-hidden="true">
      <circle cx="512" cy="512" r="440" fill="#ecdcb4" />
      <circle cx="512" cy="512" r="400" fill="none" stroke="#4a3421" strokeWidth="5" />
      <circle cx="512" cy="512" r="240" fill="none" stroke="#4a3421" strokeWidth="3" opacity="0.6" />
      {pts.map((i) => {
        const L = i % 4 === 0 ? 370 : i % 2 === 0 ? 260 : 180, w = i % 4 === 0 ? 40 : 26;
        return (
          <g key={i} transform={`rotate(${i * 22.5} 512 512)`}>
            <path d={`M512 ${512 - L} L${512 + w} 512 L512 512 Z`} fill={i % 4 === 0 ? '#8c6a3a' : '#b49464'} />
            <path d={`M512 ${512 - L} L${512 - w} 512 L512 512 Z`} fill="#f2e6c8" stroke="#4a3421" strokeWidth="2" />
          </g>
        );
      })}
    </svg>
  );
}
function NeedleInk() {
  return (
    <svg viewBox="0 0 1024 1024" aria-hidden="true">
      <path d="M512 150 L540 512 L484 512 Z" fill="#8e2a1c" />
      <path d="M512 874 L540 512 L484 512 Z" fill="#2c3a4e" />
      <circle cx="512" cy="512" r="22" fill="#c9a964" stroke="#4a3421" strokeWidth="4" />
    </svg>
  );
}
function RimInk() {
  return (
    <svg viewBox="0 0 1024 1024" aria-hidden="true">
      <circle cx="512" cy="512" r="465" fill="none" stroke="#b08a4a" strokeWidth="44" />
      <circle cx="512" cy="512" r="488" fill="none" stroke="#4a3421" strokeWidth="4" />
      <circle cx="512" cy="512" r="442" fill="none" stroke="#4a3421" strokeWidth="3" />
    </svg>
  );
}
