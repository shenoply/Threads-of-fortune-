import { useState } from 'react';
import { PersonCameo, PortraitOrCameo } from '../People/Person';
import { personFor } from '../../data/people';
import { faceSrc, type Person } from '../../game/systems/population';

const LOOK: Record<string, 'fez' | 'scarf' | 'turban' | 'hat' | 'keffiyeh' | 'cowl' | 'bare'> = { egypt: 'fez', levant: 'fez', anatolia: 'fez', iraq: 'keffiyeh', persia: 'turban', bedouin: 'keffiyeh', armenian: 'bare', greek: 'hat' };
const ACCENTS = ['#7a3b2a', '#2f4a6b', '#5d6b2f', '#6b4a2f', '#4a2f5d', '#2f5d55', '#7a5a22'];

/** A person's face: their picture (their own, or one from the portrait pool), else a drawn cameo in
 *  the dress of their people. */
export function FolkFace({ p, size = 56 }: { p: Person; size?: number }) {
  const [bad, setBad] = useState(false);
  if (p.npc) return <PortraitOrCameo id={p.npc} spec={personFor(p.npc)} size={size} />;
  const src = faceSrc(p);
  const look = p.sex === 'f' ? 'scarf' : LOOK[p.culture] ?? 'bare';
  const accent = ACCENTS[(p.house ?? p.id).length % ACCENTS.length];
  if (!src || bad) return <span className="cameo-wrap" style={{ width: size, height: size }}><PersonCameo spec={personFor(p.id, look, accent)} size={size} /></span>;
  return <img className="folk-face" src={src} alt="" width={size} height={size} style={{ width: size, height: size }} onError={() => setBad(true)} loading="lazy" />;
}
