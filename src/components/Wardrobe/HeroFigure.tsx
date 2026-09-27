import { useEffect, useMemo, useState } from 'react';
import { PIECES, POSE_INFO, baseSrc, coverSrc, layerSrc, wornIds, type FitTable, type Outfit, type Pose } from '../../data/wardrobe';
import { FIT } from '../../data/wardrobeFit';
import './Wardrobe.css';

// Pictures that failed to load once are not asked for again this session.
const missing = new Set<string>();
const listeners = new Set<() => void>();
const markMissing = (src: string) => { if (!missing.has(src)) { missing.add(src); listeners.forEach((f) => f()); } };

function useMissing() {
  const [, bump] = useState(0);
  useEffect(() => { const f = () => bump((n) => n + 1); listeners.add(f); return () => { listeners.delete(f); }; }, []);
  return missing;
}

/** Until the painted base bodies exist, the hero is shown from the opening picture. */
const FALLBACK: Record<Pose, { src: string; pos: string; size: string }> = {
  wardrobe: { src: 'art/stall-seller.jpg', pos: '14% 60%', size: '260%' },
  stall: { src: 'art/hero/hero-body-reference.jpg', pos: '30% 30%', size: 'cover' },
  profile: { src: 'art/hero/hero-face-reference.jpg', pos: '40% 35%', size: 'cover' },
};

export interface HeroFigureProps {
  pose: Pose;
  outfit: Outfit;
  /** overrides for fitting; defaults to the saved table */
  fit?: FitTable;
  /** outline one layer (fit mode) */
  highlight?: string | null;
  className?: string;
  /** called with the ids of pieces that have no picture for this pose yet */
  onMissing?: (ids: string[]) => void;
}

/** The hero drawn as a stack: base body, then each worn piece in its z order. */
export function HeroFigure({ pose, outfit, fit = FIT, highlight, className = '', onMissing }: HeroFigureProps) {
  const miss = useMissing();
  const info = POSE_INFO[pose];
  const layers = useMemo(
    () => wornIds(outfit).map((id) => PIECES[id]).filter((p) => p.poses.includes(pose)).sort((a, b) => a.z - b.z),
    [outfit, pose],
  );
  const base = baseSrc(pose);
  const baseMissing = miss.has(base);
  const unpainted = layers.filter((p) => miss.has(layerSrc(pose, p.id))).map((p) => p.id);
  const key = unpainted.join(',');
  useEffect(() => { onMissing?.(unpainted); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  // a coat with sleeves hides the shirt under it outside its own outline
  const coat = outfit.outer && PIECES[outfit.outer]?.hidesUnder ? coverSrc(pose, outfit.outer) : null;
  const coatMask = useLoaded(coat);
  const layerImg = (p: (typeof layers)[number]) => {
    const src = layerSrc(pose, p.id);
    if (miss.has(src)) return null;
    const f = fit[`${pose}/${p.id}`];
    const style: React.CSSProperties = f ? { transform: `translate(${f.x}%, ${f.y}%) scale(${f.s})` } : {};
    if (p.slot === 'top' && coat && coatMask) {
      const m = `url(${coat})`;
      Object.assign(style, { WebkitMaskImage: m, maskImage: m, WebkitMaskSize: '100% 100%', maskSize: '100% 100%', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat' });
    }
    return <img key={p.id} className={`hero-layer ${highlight === p.id ? 'hl' : ''}`} src={src} alt="" style={style} onError={() => markMissing(src)} draggable={false} />;
  };

  return (
    <div className={`hero-fig pose-${pose} ${className}`} style={{ aspectRatio: `${info.w} / ${info.h}` }} data-testid={`hero-fig-${pose}`}>
      {!baseMissing && layers.filter((p) => p.z < 0).map((p) => layerImg(p))}
      {baseMissing ? (
        <div className="hero-fallback" style={{ backgroundImage: `url(${FALLBACK[pose].src})`, backgroundPosition: FALLBACK[pose].pos, backgroundSize: FALLBACK[pose].size }}>
          <span>Base picture not painted yet</span>
        </div>
      ) : (
        <img className="hero-layer" src={base} alt="" onError={() => markMissing(base)} draggable={false} />
      )}
      {!baseMissing && layers.filter((p) => p.z >= 0).map((p) => layerImg(p))}
    </div>
  );
}

/** True once an image has loaded (a mask is only applied when it exists: a missing mask would hide the layer). */
const loaded = new Set<string>();
function useLoaded(src: string | null) {
  const [, bump] = useState(0);
  useEffect(() => {
    if (!src || loaded.has(src) || missing.has(src)) return;
    const im = new Image();
    im.onload = () => { loaded.add(src); bump((n) => n + 1); };
    im.onerror = () => markMissing(src);
    im.src = src;
  }, [src]);
  return !!src && loaded.has(src);
}

/**
 * True once the base body and a picture for every worn piece that shows in this pose have loaded;
 * false if any is missing. Game screens use this to show the dressed hero only when he is complete,
 * and fall back to the painted scene otherwise (never the hero in his undershirt).
 */
export function usePoseReady(pose: Pose, outfit: Outfit): boolean | null {
  const srcs = [baseSrc(pose), ...wornIds(outfit).map((id) => PIECES[id]).filter((p) => p.poses.includes(pose)).map((p) => layerSrc(pose, p.id))];
  const key = srcs.join('|');
  const [state, setState] = useState<{ key: string; ok: boolean | null }>({ key: '', ok: null });
  useEffect(() => {
    if (srcs.some((x) => missing.has(x))) { setState({ key, ok: false }); return; }
    let live = true, left = srcs.length, failed = false;
    for (const src of srcs) {
      const im = new Image();
      im.onload = () => { if (--left === 0 && live) setState({ key, ok: !failed }); };
      im.onerror = () => { failed = true; markMissing(src); if (--left === 0 && live) setState({ key, ok: false }); };
      im.src = src;
    }
    return () => { live = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return state.key === key ? state.ok : null;
}

/** Small round portrait for the character sheet: dressed when every piece is painted, his face otherwise. */
export function HeroBadge({ outfit, size = 72 }: { outfit: Outfit; size?: number }) {
  const ready = usePoseReady('profile', outfit);
  return (
    <div className="hero-badge" style={{ width: size, height: size }}>
      {ready ? <HeroFigure pose="profile" outfit={outfit} /> : <img src="art/hero/hero-face-reference.jpg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '45% 30%' }} />}
    </div>
  );
}
