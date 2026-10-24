// A 78 rpm shellac record: the painted disc (art/records/disc.webp) with its paper label in the middle
// (art/records/label-<id>.webp). A record not yet found shows as a plain paper sleeve. If a picture is
// missing the disc and label are drawn instead.
import { useState } from 'react';
import type { RecordDisc as Rec } from '../../data/records';

export function RecordDisc({ rec, owned, spinning, size = 96 }: { rec: Rec; owned: boolean; spinning?: boolean; size?: number }) {
  const [label, setLabel] = useState(true);
  const [disc, setDisc] = useState(true);
  if (!owned) {
    return (
      <span className="rec-disc sleeve" style={{ width: size, height: size }} aria-hidden="true">
        <img src="art/records/sleeve.webp" alt="" draggable={false} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
      </span>
    );
  }
  return (
    <span className={`rec-disc ${disc ? 'painted' : ''} ${spinning ? 'spin' : ''}`} style={{ width: size, height: size }} aria-hidden="true">
      {disc ? <img className="rec-base" src="art/records/disc.webp" alt="" draggable={false} onError={() => setDisc(false)} /> : <i className="rec-grooves" />}
      <span className="rec-label" style={{ background: label ? 'transparent' : rec.paper, color: rec.ink }}>
        {label ? <img src={`art/records/label-${rec.id}.webp`} alt="" onError={() => setLabel(false)} draggable={false} /> : <b className="rec-title" style={{ fontSize: Math.max(5, size * 0.07) }}>{rec.title}</b>}
        {!label && <i className="rec-hole" />}
      </span>
    </span>
  );
}
