// The sealed bale at Rashid's warehouse: one a day from the Port Said customs sheds, paid for
// before it is cut open. The card shows the bale itself (corded sacking under a lead seal) and
// says plainly what bales hold; cutting one open plays the unrolling reveal for what was inside.
import { useGame } from '../../game/state/store';
import { fmt } from '../../game/economy/money';
import { BALE_PRICE, baleFreeIn, type BaleResult } from '../../game/systems/bales';
import { RUGS } from '../../data/rugs';
import { rugSrc } from '../RugViewer/rugArt';
import { reveal } from '../Reveal/Reveal';
import { DRESSING_BY_ID } from '../../data/shops';
import { RECORD_BY_ID } from '../../data/records';
import type { RugItem } from '../../game/types';
import './bale.css';

/** show what came out of a bale, one thing at a time: each rug on its own card, a tap for the next */
export function showBale(result: BaleResult, items: RugItem[], from = 'Out of a sealed bale') {
  const ex = result.extra;
  const rugs = items.filter((it) => RUGS[it.typeId]);
  const total = rugs.length + (ex ? 1 : 0);
  let n = 0;
  const of = () => (total > 1 ? ` · ${++n} of ${total}` : '');
  rugs.forEach((it) => {
    const t = RUGS[it.typeId];
    const k = of();
    reveal({
      kicker: (result.grade === 'treasure' ? 'A treasure, out of a sealed bale' : from) + k,
      title: t.name,
      line: `${it.condition === 'Good' ? 'In good order' : it.condition === 'Dirty' ? 'Dusty from the shed: a wash will bring it up' : 'Worn: it wants mending'} · usually ${fmt(t.valueBand[0])}–${fmt(t.valueBand[1])}`,
      pic: rugSrc(t), picKind: 'rug', uid: it.uid, tier: t.tier ?? 1, more: n < total,
    });
  });
  if (ex?.kind === 'piece') {
    const d = DRESSING_BY_ID[ex.id];
    if (d) reveal({ kicker: 'Packed in with it' + of(), title: d.name, line: `${d.effect}. It is with your stall things: Dress your stall puts it out.`, pic: d.art, picKind: 'prop' });
  }
  if (ex?.kind === 'record') {
    const r = RECORD_BY_ID[ex.id];
    if (r) reveal({ kicker: 'Wrapped in paper at the bottom' + of(), title: `A record: ${r.title}`, line: `${r.performer} · ${r.company}. It goes with the others by the gramophone at the stall.` });
  }
  if (ex?.kind === 'coins') reveal({ kicker: 'At the bottom of the bale' + of(), title: fmt(ex.amount), amount: ex.amount, line: 'A purse of old Ottoman coins. The changer on the corner gave you this for them.' });
}

export function BaleCard({ toast }: { toast?: (m: string) => void }) {
  const g = useGame();
  const b = g.bales;
  // Rashid's free bale comes up every other dawn; more can be bought, as many as you like
  const left = baleFreeIn(b, g.day);
  const freeNow = left === 0;
  const cut = () => {
    const r = g.buyBale();
    if (!r.result || !r.items) { toast?.(r.msg); return; }
    showBale(r.result, r.items);
  };
  return (
    <div className={`bale-card ${freeNow ? 'free' : ''}`} data-testid="bale-card">
      <div className="bale-pic art" aria-hidden="true"><img src="art/bales/bale-sealed.webp" alt="" draggable={false} />{freeNow && <span className="bale-free">Free now</span>}</div>
      <div className="bale-body">
        <b>A sealed bale</b>
        {!freeNow && <span className="bale-when" data-testid="bale-timer">Next free bale {left === 1 ? 'tomorrow at dawn' : `in ${left} days`}</span>}
        <small>Unclaimed goods from the Port Said customs sheds, still corded under the lead seal. Most hold a rug or two of everyday stock; some a good trade rug; a few a city carpet; once in a long while, a treasure. Sometimes a curio, a gramophone record or a purse of old coins is packed in with them.</small>
        <button className="btn primary" disabled={!freeNow && g.cash < BALE_PRICE} onClick={cut} data-testid="bale-buy">
          {freeNow ? 'Cut open Rashid\'s free bale' : `Buy one and cut it open · ${fmt(BALE_PRICE)}`}
        </button>
        <small className="bale-next">{freeNow ? "Rashid's runner brings a bale up from the sheds every other dawn." : "Rashid's runner brings one free every other dawn; more can be bought."}</small>
        {(b?.opened ?? 0) > 0 && <small className="bale-count">{b!.opened} opened{b!.treasures ? ` · ${b!.treasures} treasure${b!.treasures > 1 ? 's' : ''}` : ''}</small>}
      </div>
    </div>
  );
}
