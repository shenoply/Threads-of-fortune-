import { useEffect, useState } from 'react';
import { useGame } from '../../game/state/store';
import { playArranVoice, stopArranVoice, useSubtitle } from '../../game/audio/arranVoice';
import type { ArranVoiceMood } from '../../data/arranVoice';

/** The subtitle for whatever Arran is saying: speaker label and the exact words, audio or not. */
export function ArranSubtitle({ className = '' }: { className?: string }) {
  const a = useSubtitle((s) => s.active);
  if (!a || a.npcId !== 'arran') return null;
  return (
    <div className={`arran-sub ${className}`} role="status" aria-live="polite" data-testid="arran-subtitle" data-line={a.voiceLineId}>
      <b>{a.speaker.toUpperCase()}</b>
      <span>{a.text}</span>
    </div>
  );
}

/** Which lab-coat portrait fits a mood: close work for the serious ones, explaining for the rest. */
export const labPortraitFor = (mood?: ArranVoiceMood) =>
  mood && ['analytical', 'warning', 'concerned', 'secretive', 'irritated'].includes(mood) ? '11-lab-inspect' : '12-lab-explain';

const BEATS: { who: 'narrator' | 'arran' | 'conservator'; text?: string; line?: string }[] = [
  { who: 'narrator', text: 'The conservator from the museum store, Hamza Effendi, has brought one thread in a folded paper: a strand of linen that came away from a damaged wrapping in storage. The mummy itself lies on a padded board under a sheet, anonymous, its name lost long ago.' },
  { who: 'arran', line: 'arran-mummy-01' },
  { who: 'conservator', text: '"The museum allows the thread, and the thread only. Nothing is cut, nothing is lifted."' },
  { who: 'arran', line: 'arran-mummy-02' },
  { who: 'narrator', text: 'Under the lens the fibre shows the nodes of flax, fine and even. That it is linen, and well spun, is all the lens can say: not the date, not the name, not the dynasty.' },
  { who: 'arran', line: 'arran-mummy-03' },
  { who: 'narrator', text: 'The thread goes back into its envelope with the conservator. Arran writes one page in his notebook, and signs it with the conservator\'s name beside his own.' },
];

/**
 * The linen study: a special research scene, reached by the conservator's permission and never a
 * random event. The full painting, the conversation below it, one beat per tap so each voiced
 * line starts from a user action.
 */
export function MummyStudy({ onClose }: { onClose: () => void }) {
  const g = useGame();
  const [i, setI] = useState(0);
  const beat = BEATS[i];
  useEffect(() => () => stopArranVoice(), []);
  const advance = () => {
    const n = i + 1;
    if (n >= BEATS.length) { g.arranMummySeen(); stopArranVoice(); onClose(); return; }
    setI(n);
    const b = BEATS[n];
    if (b.who === 'arran' && b.line) playArranVoice({ id: b.line });
    else stopArranVoice();
  };
  const sub = useSubtitle((s) => s.active);
  return (
    <div className="mummy-study" role="dialog" aria-label="The linen study" data-testid="mummy-study">
      <div className="mummy-study__scene">
        <img src="art/arran/17-arran-mummy-study.webp" alt="Arran in his laboratory coat examining a single linen thread through a loupe, beside an Egyptian conservator and a wrapped mummy on a padded board" draggable={false} />
        <ArranSubtitle className="on-scene" />
      </div>
      <div className="mummy-study__panel">
        <small>With the museum conservator's permission · detached linen only</small>
        {beat.who === 'narrator' && <p>{beat.text}</p>}
        {beat.who === 'conservator' && <p><b>Hamza Effendi:</b> {beat.text}</p>}
        {beat.who === 'arran' && <p className="dim">{sub?.voiceLineId === beat.line ? 'Arran speaks.' : 'Arran is quiet, looking.'}</p>}
        <div className="arran-btns">
          <button type="button" className="btn primary" onClick={advance} data-testid="mummy-next">{i === BEATS.length - 1 ? 'Leave them to their work' : 'Continue'}</button>
          {i === 0 && <button type="button" className="btn" onClick={() => { stopArranVoice(); onClose(); }} data-testid="mummy-later">Not now</button>}
        </div>
      </div>
    </div>
  );
}
