import { memo, useState } from 'react';
import { PersonCameo, PortraitOrCameo } from '../People/Person';
import { personFor } from '../../data/people';
import { faceSrc, type Person } from '../../game/systems/population';

const LOOK: Record<string, 'fez' | 'scarf' | 'turban' | 'hat' | 'keffiyeh' | 'cowl' | 'bare'> = { egypt: 'fez', levant: 'fez', anatolia: 'fez', iraq: 'keffiyeh', persia: 'turban', bedouin: 'keffiyeh', armenian: 'bare', greek: 'hat', copt: 'fez', british: 'hat', french: 'hat', italian: 'hat', german: 'hat', swiss: 'hat', belgian: 'hat', american: 'hat', russian: 'bare', maltese: 'hat', jewish: 'bare', shami: 'fez', albanian: 'fez', circassian: 'fez', indian: 'turban' };
const ACCENTS = ['#7a3b2a', '#2f4a6b', '#5d6b2f', '#6b4a2f', '#4a2f5d', '#2f5d55', '#7a5a22'];

/** A person's face: their picture (their own, or one from the portrait pool), else a drawn cameo in
 *  the dress of their people. */
export const FolkFace = memo(function FolkFace({ p, size = 56, card }: { p: Person; size?: number; /** a framed portrait card instead of a round medallion */ card?: boolean }) {
  const [bad, setBad] = useState(false);
  const [tried, setTried] = useState(false);
  if (p.npc) return card ? <span className="cameo-wrap card npc" style={{ width: size, height: size }}><PortraitOrCameo id={p.npc} spec={personFor(p.npc)} size={size} /></span> : <PortraitOrCameo id={p.npc} spec={personFor(p.npc)} size={size} />;
  const src = faceSrc(p);
  const look = p.sex === 'f' ? 'scarf' : LOOK[p.culture] ?? 'bare';
  const accent = ACCENTS[(p.house ?? p.id).length % ACCENTS.length];
  if (!src || bad) return <span className={`cameo-wrap${card ? ' card' : ''}`} style={{ width: size, height: size }}><PersonCameo spec={personFor(p.id, look, accent)} size={size} /></span>;
  // a portrait painted for the game has a small copy for lists (art/portraits/small/<id>.webp)
  // and so does each face of the portrait pool (art/people/small/<id>.webp)
  const small = size <= 180 && /^art\/(portraits|people)\/[^/]+\.jpg$/.test(src) && !tried ? src.replace(/^art\/(portraits|people)\/(.+)\.jpg$/, 'art/$1/small/$2.webp') : src;
  return <img className={`folk-face${card ? ' card' : ''}`} src={small} alt="" width={size} height={size} style={{ width: size, height: size }} onError={() => (small !== src ? setTried(true) : setBad(true))} loading="lazy" />;
});
