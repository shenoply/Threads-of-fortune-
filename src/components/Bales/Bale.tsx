// The sealed bale at Rashid's warehouse: one a day from the Port Said customs sheds, paid for
// before it is cut open. The card shows the bale itself (corded sacking under a lead seal) and
// says plainly what bales hold; cutting one open plays the unrolling reveal for what was inside.
import { useGame } from '../../game/state/store';
import { fmt } from '../../game/economy/money';
import { BALE_PRICE, type BaleResult } from '../../game/systems/bales';
import { RUGS } from '../../data/rugs';
import { rugSrc } from '../RugViewer/rugArt';
import { reveal } from '../Reveal/Reveal';
import type { RugItem } from '../../game/types';
import './bale.css';

/** show what came out of a bale, one rug at a time */
export function showBale(result: BaleResult, items: RugItem[], from = 'Out of a sealed bale') {
  items.forEach((it) => {
    const t = RUGS[it.typeId];
    if (!t) return;
    reveal({
      kicker: result.grade === 'treasure' ? 'A treasure, out of a sealed bale' : from,
      title: t.name,
      line: `${it.condition === 'Good' ? 'In good order' : it.condition === 'Dirty' ? 'Dusty from the shed: a wash will bring it up' : 'Worn: it wants mending'} · usually ${fmt(t.valueBand[0])}–${fmt(t.valueBand[1])}`,
      pic: rugSrc(t), picKind: 'rug',
    });
  });
}

export function BaleCard({ toast }: { toast?: (m: string) => void }) {
  const g = useGame();
  const b = g.bales;
  const today = b?.lastDay === g.day;
  const cut = () => {
    const r = g.buyBale();
    if (!r.result || !r.items) { toast?.(r.msg); return; }
    showBale(r.result, r.items);
  };
  return (
    <div className={`bale-card ${today ? 'gone' : ''}`} data-testid="bale-card">
      <div className="bale-pic" aria-hidden="true"><i className="cord h" /><i className="cord v" /><i className="seal" /></div>
      <div className="bale-body">
        <b>A sealed bale</b>
        <small>Unclaimed goods from the Port Said customs sheds, still corded under the lead seal. Most hold a rug or two of everyday stock; some a good trade rug; a few a city carpet; once in a long while, a treasure.</small>
        <button className="btn primary" disabled={today || g.cash < BALE_PRICE} onClick={cut} data-testid="bale-buy">
          {today ? 'Tomorrow’s comes in the morning' : `Buy and cut it open · ${fmt(BALE_PRICE)}`}
        </button>
        {(b?.opened ?? 0) > 0 && <small className="bale-count">{b!.opened} opened{b!.treasures ? ` · ${b!.treasures} treasure${b!.treasures > 1 ? 's' : ''}` : ''}</small>}
      </div>
    </div>
  );
}
