import { useEffect, useState } from 'react';
import { fullSrc, stallSrc } from '../../data/wardrobe';
import { useGame } from '../../game/state/store';
import { composeHero, headOf, lookFor } from '../../game/heroLook';
import './Wardrobe.css';

/** Until an outfit's picture loads (or if it is missing), the hero is shown from the reference art. */
const FALLBACK = { wardrobe: 'art/hero/outfits/classic-stall-full.webp', stall: 'art/hero/outfits/classic-stall-stall.webp' };

/** The hero in one of the ready outfits: full length for the wardrobe, waist up for the stall. */
export function HeroFigure({ pose, outfitId, className = '' }: { pose: 'wardrobe' | 'stall'; outfitId: string; className?: string }) {
  const head = useGame((g) => headOf(g.heroLook));
  const own = pose === 'stall' ? stallSrc(outfitId) : fullSrc(outfitId);
  const [composed, setComposed] = useState<{ key: string; url: string } | null>(null);
  const key = head ? `${own}|${head.length}|${head.slice(-30)}` : '';
  useEffect(() => {
    if (!head) return;
    let live = true;
    composeHero(own, head, pose === 'stall' ? 'stall' : 'full').then((url) => { if (live) setComposed({ key, url }); }).catch(() => {});
    return () => { live = false; };
  }, [head, own, pose, key]);
  const mine = head && composed?.key === key ? composed.url : null;
  const src = mine ?? own;
  const [bad, setBad] = useState<string | null>(null);
  return (
    <div className={`hero-fig ${className}`} data-pose={pose} data-outfit={outfitId} data-look={mine ? 'custom' : 'hassan'}>
      <img src={bad === src ? FALLBACK[pose] : src} alt="" draggable={false} onError={() => setBad(src)} />
    </div>
  );
}

/** Small round portrait for the character sheet: his head and shoulders from the stall picture. */
export function HeroBadge({ outfitId, size = 72 }: { outfitId: string; size?: number }) {
  const mine = useGame((g) => lookFor(g.heroLook));
  if (mine) return <div className="hero-badge" style={{ width: size, height: size }}><img src={mine} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>;
  return (
    <div className="hero-badge" style={{ width: size, height: size }}>
      <img src={stallSrc(outfitId)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 0%', transform: 'scale(1.9)', transformOrigin: '50% 8%' }} />
    </div>
  );
}
