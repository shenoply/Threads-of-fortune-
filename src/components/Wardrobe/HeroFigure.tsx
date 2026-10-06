import { useState } from 'react';
import { fullSrc, stallSrc } from '../../data/wardrobe';
import { useGame } from '../../game/state/store';
import { lookFor } from '../../game/heroLook';
import './Wardrobe.css';

/** Until an outfit's picture loads (or if it is missing), the hero is shown from the reference art. */
const FALLBACK = { wardrobe: 'art/hero/outfits/classic-stall-full.webp', stall: 'art/hero/outfits/classic-stall-stall.webp' };

/** The hero in one of the ready outfits: full length for the wardrobe, waist up for the stall. */
export function HeroFigure({ pose, outfitId, className = '' }: { pose: 'wardrobe' | 'stall'; outfitId: string; className?: string }) {
  const mine = useGame((g) => lookFor(g.heroLook, pose === 'stall' ? 'stall' : 'full'));
  const src = mine ?? (pose === 'stall' ? stallSrc(outfitId) : fullSrc(outfitId));
  const [bad, setBad] = useState<string | null>(null);
  return (
    <div className={`hero-fig ${className}`} data-pose={pose} data-outfit={outfitId} data-look={mine ? 'custom' : 'hassan'}>
      <img src={bad === src ? FALLBACK[pose] : src} alt="" draggable={false} onError={() => setBad(src)} />
    </div>
  );
}

/** Small round portrait for the character sheet: his head and shoulders from the stall picture. */
export function HeroBadge({ outfitId, size = 72 }: { outfitId: string; size?: number }) {
  const mine = useGame((g) => lookFor(g.heroLook, 'portrait'));
  if (mine) return <div className="hero-badge" style={{ width: size, height: size }}><img src={mine} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>;
  return (
    <div className="hero-badge" style={{ width: size, height: size }}>
      <img src={stallSrc(outfitId)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 0%', transform: 'scale(1.9)', transformOrigin: '50% 8%' }} />
    </div>
  );
}
