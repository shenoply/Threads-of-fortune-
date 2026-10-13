import './RugFlags.css';
import { useState } from 'react';
import type { RugItem } from '../../game/types';
import { useGame } from '../../game/state/store';
import { eyeOf, flawNotes } from '../../game/systems/fakes';
import { AIR_COST, AIR_DAYS, GUARD_WORDS, airedUntilWord, mothAppetite, mothGuard, mothSeason, mothStatus, onDisplay } from '../../game/systems/moths';
import { fmt } from '../../game/economy/money';

/** What you know of a rug's dyes and age, and (in summer) whether moth can reach it. */
export function RugFlags({ item, moth = true }: { item: RugItem; moth?: boolean }) {
  const g = useGame();
  const flaws = flawNotes(item, eyeOf(g));
  // only the season is needed here (mothStatus walks the whole stock, once per row)
  const season = moth && mothSeason(g.day);
  const guard = season && mothAppetite(item) > 0 ? mothGuard(item, g, g.day, onDisplay(g)) : undefined;
  if (!flaws.length && guard === undefined) return null;
  return (
    <div className="rug-flags" data-testid="rug-flags">
      {flaws.map((f) => (
        <span key={f.kind} className={`rug-flag ${f.know}`} data-testid={`flaw-${f.kind}-${f.know}`}>{f.text}</span>
      ))}
      {guard === null && <span className="rug-flag moth-open" data-testid="moth-open">Open to moth</span>}
      {guard && <span className="rug-flag moth-safe" data-testid={`moth-${guard}`}>{GUARD_WORDS[guard]}{guard === 'aired' ? ` until ${airedUntilWord(item.airedUntil ?? g.day)}` : ''}</span>}
    </div>
  );
}

/** The summer warning in Stock, with the airing button. */
export function MothPanel() {
  const g = useGame();
  const [note, setNote] = useState('');
  const st = mothStatus(g);
  if (!g.inventory.length || (!st.season && !st.soon && !note)) return null;
  const open = st.open.length;
  return (
    <div className={`moth-panel ${open ? '' : 'calm'}`} data-testid="moth-panel">
      <p>
        {st.season
          ? open ? <><b>Moth season.</b> {open === 1 ? 'One rug is' : `${open} rugs are`} open to moth. Air and beat them, or keep them in a camphor-wood chest at the stall.</>
            : <><b>Moth season.</b> Your rugs are safe for now.</>
          : <><b>Moth comes with June.</b> Air your stock, or buy a camphor-wood chest, before the heat.</>}
      </p>
      <button className="btn" disabled={!g.world.at || g.cash < AIR_COST} onClick={() => setNote(g.airRugs())} data-testid="air-rugs">
        Air and beat the rugs · 1 h · {fmt(AIR_COST)}
      </button>
      <div className="dim" style={{ fontSize: 13, marginTop: 4 }}>Hang them in the sun and beat them: safe for {AIR_DAYS} days.</div>
      {note && <p role="status" data-testid="air-note" style={{ marginTop: 6 }}><small>{note}</small></p>}
    </div>
  );
}

/** A trained eye's hint on a rug still on a dealer's pile or in an auction catalogue. */
export function OfferFlags({ typeId, flaw }: { typeId: string; flaw: Pick<RugItem, 'dye' | 'fakeAge'> }) {
  const g = useGame();
  const flaws = flawNotes({ uid: 'offer', typeId, ...flaw } as RugItem, eyeOf(g));
  if (!flaws.length) return null;
  return <span className="rug-flags">{flaws.map((f) => <span key={f.kind} className={`rug-flag ${f.know}`} data-testid={`offer-flaw-${f.kind}`}>{f.text}</span>)}</span>;
}
