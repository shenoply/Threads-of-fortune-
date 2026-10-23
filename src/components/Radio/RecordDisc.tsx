// A 78 rpm shellac record: black grooves, and the paper label in the middle with its title, the
// company and its colour. Painted labels (art/records/label-<id>.webp) are used when they exist;
// until then the label is drawn here. A record not yet found shows as a plain dark disc.
import { useState } from 'react';
import type { RecordDisc as Rec } from '../../data/records';

const SCRIPT_LINE: Record<Rec['script'], string> = {
  arabic: 'أسطوانة', turkish: 'Plak', french: 'Disque', greek: 'Δίσκος', albanian: 'Disk', persian: 'صفحه',
};

export function RecordDisc({ rec, owned, spinning, size = 96 }: { rec: Rec; owned: boolean; spinning?: boolean; size?: number }) {
  const [art, setArt] = useState(true);
  return (
    <span className={`rec-disc ${owned ? '' : 'missing'} ${spinning ? 'spin' : ''}`} style={{ width: size, height: size, ['--d' as string]: `${size}px` }} aria-hidden="true">
      <i className="rec-grooves" />
      {owned && (
        <span className="rec-label" style={{ background: rec.paper, color: rec.ink }}>
          {art ? <img src={`art/records/label-${rec.id}.webp`} alt="" onError={() => setArt(false)} draggable={false} /> : null}
          {!art && (
            <>
              <small className="rec-co" style={{ fontSize: Math.max(4, size * 0.045) }}>{rec.company.split(',')[0]}</small>
              <b className="rec-title">{rec.title}</b>
              <small className="rec-script" style={{ fontSize: Math.max(4, size * 0.05) }}>{SCRIPT_LINE[rec.script]}</small>
            </>
          )}
          <i className="rec-hole" />
        </span>
      )}
      {!owned && <span className="rec-label blank"><i className="rec-hole" /></span>}
    </span>
  );
}
