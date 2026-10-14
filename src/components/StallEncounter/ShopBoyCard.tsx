import { useState } from 'react';
import './stallhelp.css';
import { useGame } from '../../game/state/store';
import { isOpen } from '../../game/unlocks';
import { fmt } from '../../game/economy/money';
import { RUGS } from '../../data/rugs';
import { BOY, BOY_PCTS, boyPrice, plainRugs, takeChance, trustWord } from '../../game/systems/shopBoy';
import { fireBoy, hireBoy, setBoy } from '../../game/systems/stallHelpActions';
import { BOY_OFFERED } from '../../game/systems/stallNight';
import '../Tips/once.css';

/** tipsSeen mark: the boy's card has been used once since Haj Mahmoud's offer */
const BOY_CARD_USED = 'boy-card-used';

/** The boy who minds the stall while you are away: hire him, tell him what to do, let him go. */
export function ShopBoyCard() {
  const g = useGame();
  const b = g.shopBoy;
  const [open, setOpen] = useState(false);
  if (!g.tutorial.done) return null;
  // the boy comes into it when Haj Mahmoud first offers him (game/unlocks.ts)
  if (!isOpen(g, 'boy')) return null;
  if (!b?.hired) {
    // Haj Mahmoud has offered his nephew on a morning card: the card stands out until it is first used
    const seen = g.tipsSeen ?? [];
    const fresh = !b && seen.includes(BOY_OFFERED) && !seen.includes(BOY_CARD_USED);
    return (
      <div className={`boy-card${fresh ? ' once-mark' : ''}`} data-testid="boy-card" data-fresh={fresh ? '1' : undefined} onClickCapture={fresh ? () => g.seeTip(BOY_CARD_USED) : undefined}>
        <div className="boy-head">
          <i className="boy-face" aria-hidden="true">S</i>
          <span><b>A boy to mind the stall</b><small>{b ? `${BOY.name} is back at his uncle's shop. He would come back.` : `${BOY.who}, will sit at your stall when you are away.`} {BOY.wage} piastres a day.</small></span>
          <button className="btn small" onClick={() => hireBoy()} data-testid="boy-hire">{b ? 'Take him back' : `Hire ${BOY.name}`}</button>
        </div>
      </div>
    );
  }
  const rugs = plainRugs(g);
  const pct = b.pct;
  const step = (d: number) => { const i = BOY_PCTS.indexOf(pct); const n = BOY_PCTS[Math.max(0, Math.min(BOY_PCTS.length - 1, (i < 0 ? 2 : i) + d))]; setBoy({ pct: n }); };
  const odds = takeChance(pct);
  const recent = b.sales.slice(-3).reverse();
  return (
    <div className="boy-card" data-testid="boy-card">
      <div className="boy-head">
        <i className="boy-face" aria-hidden="true">S</i>
        <span><b>{BOY.name} minds the stall</b><small>{b.mode === 'sell' ? 'Sells plain rugs at your price' : 'Keeps buyers waiting for you'} · {trustWord(b.trust)}{b.owed ? ` · owed ${b.owed} day${b.owed > 1 ? 's' : ''}` : ''}</small></span>
        <button className="btn small" onClick={() => setOpen((o) => !o)} aria-expanded={open} data-testid="boy-toggle">{open ? 'Close' : 'Orders'}</button>
      </div>
      {open && (
        <>
          <div className="boy-seg" role="group" aria-label="What he does">
            <button className={`btn small ${b.mode === 'wait' ? 'on' : ''}`} onClick={() => setBoy({ mode: 'wait' })} data-testid="boy-mode-wait">Keep them waiting</button>
            <button className={`btn small ${b.mode === 'sell' ? 'on' : ''}`} onClick={() => setBoy({ mode: 'sell' })} data-testid="boy-mode-sell">Sell plain rugs</button>
          </div>
          <p><small>{b.mode === 'wait' ? `Buyers wait about ${BOY.wait} hours longer for you. He sells nothing.` : 'He sells only Common rugs left at the stall (not packed for the road), to buyers who want one. Better buyers wait for you.'}</small></p>
          {b.mode === 'sell' && (
            <>
              <div className="boy-pct">
                <span>His price: <b data-testid="boy-pct">{Math.round(pct * 100)}%</b> of worth<br /><small>{odds >= 0.45 ? 'Most buyers will take it' : odds >= 0.25 ? 'Some buyers will take it' : 'Few buyers will take it'}</small></span>
                <button className="btn small" onClick={() => step(-1)} disabled={pct <= BOY_PCTS[0]} aria-label="Lower" data-testid="boy-pct-down">−</button>
                <button className="btn small" onClick={() => step(1)} disabled={pct >= BOY_PCTS[BOY_PCTS.length - 1]} aria-label="Higher" data-testid="boy-pct-up">+</button>
              </div>
              {rugs.length ? (
                <ul className="boy-list" data-testid="boy-rugs">
                  {rugs.slice(0, 4).map((i) => <li key={i.uid}><span>{RUGS[i.typeId].name}</span><b>{fmt(boyPrice(i, pct))}</b></li>)}
                  {rugs.length > 4 && <li><small>and {rugs.length - 4} more</small></li>}
                </ul>
              ) : <p><small>No plain rugs at the stall for him to sell. Leave some unpacked in Stock.</small></p>}
            </>
          )}
          {recent.length > 0 && (
            <ul className="boy-list" data-testid="boy-sales">
              {recent.map((x, i) => <li key={i}><span>Day {x.day}: {RUGS[x.typeId]?.name}</span><b>{fmt(x.price)}</b></li>)}
            </ul>
          )}
          <div className="boy-foot"><button className="btn small" onClick={() => fireBoy()} data-testid="boy-fire">Let him go</button></div>
        </>
      )}
    </div>
  );
}
