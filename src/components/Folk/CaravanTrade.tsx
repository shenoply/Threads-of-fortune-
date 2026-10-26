import { useState } from 'react';
import { useGame } from '../../game/state/store';
import { RUGS, PERSIAN_RUG_IDS } from '../../data/rugs';
import { fmt, snap } from '../../game/economy/money';
import { rugThumb } from '../RugViewer/rugArt';
import { audio } from '../../game/audio/engine';
import type { Person } from '../../game/systems/population';

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
/** what this caravan has in its bales today: Persian rugs on the Persian roads, village work elsewhere */
function offerOf(partyId: string, p: Person, day: number) {
  const persian = /carpet/i.test(p.goods ?? '');
  const pool = persian ? PERSIAN_RUG_IDS.filter((id) => (RUGS[id].tier ?? 1) <= 2) : /wool/i.test(p.goods ?? '') ? ['anatolian-hearth', 'aleppo-courtyard', 'cedar-caravan', 'village-kilim-canal'] : ['nile-reed', 'fayoum-hearth', 'delta-house', 'date-palm-runner'];
  return pool[hash(`${partyId}:${day}`) % pool.length];
}

/** Buying off the camels: he names a price, you may try him lower; a greedy or proud man gives less,
 *  a friend more, and press him too far and the price stands. */
export function CaravanTrade({ partyId, p, onDone }: { partyId: string; p: Person; onDone: (msg: string) => void }) {
  const g = useGame();
  const typeId = offerOf(partyId, p, g.day);
  const t = RUGS[typeId];
  const rel = g.folk?.rel[p.id] ?? 0;
  const start = snap(t.dealerCost * 0.92 * (rel >= 60 ? 0.85 : rel >= 30 ? 0.92 : 1) * (p.traits.includes('greedy') ? 1.1 : p.traits.includes('generous') ? 0.95 : 1));
  const floor = snap(t.dealerCost * 0.62);
  const [price, setPrice] = useState(start);
  const [tries, setTries] = useState(0);
  const [fixed, setFixed] = useState(false);
  const [line, setLine] = useState(`"${t.name}, from the bales. For you, ${fmt(start)}."`);
  const haggle = () => {
    const chance = 0.6 + rel / 200 - (p.traits.includes('greedy') ? 0.15 : 0) - (p.traits.includes('proud') ? 0.1 : 0) + (p.traits.includes('cheerful') ? 0.08 : 0) - tries * 0.18;
    setTries((n) => n + 1);
    if (Math.random() < chance && price > floor) {
      const next = Math.max(floor, snap(price * 0.88));
      setPrice(next);
      setLine(p.traits.includes('cheerful') ? `${p.short} laughs and slaps his knee. "You will ruin me. ${fmt(next)}, and you pour the tea."` : `${p.short} sighs and looks at the sky. "${fmt(next)}. Not a piastre less."`);
      audio.sfx('tap');
    } else {
      setFixed(true);
      useGame.getState().folkAdjust(p.id, -1);
      setLine(p.traits.includes('proud') ? `${p.short} stands up. "I named a fair price. It is still ${fmt(price)}, if you want it."` : `${p.short} shakes his head. "${fmt(price)}. That is the price."`);
      audio.sfx('chest');
    }
  };
  return (
    <div className="caravan-trade" data-testid="caravan-trade">
      <img src={rugThumb(t)} alt="" />
      <div>
        <b>{t.name}</b>
        <small>{t.origin} · worth {fmt(t.valueBand[0])}–{fmt(t.valueBand[1])} in Giza</small>
        <p>{line}</p>
        <div className="ct-btns">
          <button className="btn primary" disabled={g.cash < price} onClick={() => onDone(useGame.getState().caravanBuy(partyId, typeId, price))} data-testid="ct-buy">Buy · {fmt(price)}</button>
          {!fixed && price > floor && <button className="btn" onClick={haggle} data-testid="ct-haggle">Offer less</button>}
          <button className="ghost-btn" onClick={() => onDone(`You thank ${p.short} and leave the bales tied.`)} data-testid="ct-leave">Not today</button>
        </div>
      </div>
    </div>
  );
}
