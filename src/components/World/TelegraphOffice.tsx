import { useState } from 'react';
import '../StallEncounter/stallhelp.css';
import { useGame } from '../../game/state/store';
import { fmt } from '../../game/economy/money';
import { RUGS } from '../../data/rugs';
import { settlementById } from '../../game/systems/world';
import { TELEGRAPH_TOWNS, telegramFee } from '../../game/systems/post';
import { askPrices, wireRashid } from '../../game/systems/stallHelpActions';
import { RAIL_FEE, RAIL_DAYS } from '../../data/shops';

/** The telegraph counter in a town: wire Rashid to put a rug in your stock at Giza, or ask another
 *  town's dealers their prices (reply paid; the answer is dated, prices move). */
export function TelegraphOffice({ id, onClose }: { id: string; onClose: () => void }) {
  const g = useGame();
  const [note, setNote] = useState('');
  const rashidFee = telegramFee(id, 'giza');
  const towns = TELEGRAPH_TOWNS.filter((t) => t !== id && settlementById(t).sells.length > 0);
  const offers = g.supplier.offers.slice(0, 6);
  // your shops in other cities, and the rugs kept at the Giza stall that the boy could put on a train
  const shopIds = Object.keys(g.shops ?? {}).filter((sid) => !g.shops![sid].khan);
  const atStall = g.inventory.filter((i) => i.stored && !i.restoringUntil);
  const [railTo, setRailTo] = useState(shopIds[0] ?? '');
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal-card wire-card" onClick={(e) => e.stopPropagation()} data-testid="telegraph">
        <h2>Telegraph office</h2>
        <p className="dim">{settlementById(id).name}. A short wire costs {fmt(telegramFee(id, 'cairo'))} inside Egypt, {fmt(telegramFee(id, 'damascus'))} abroad{id === 'cairo' || id === 'alexandria' || id === 'portsaid' ? '' : ' (you are abroad: every wire is the dearer rate)'}.</p>
        {note && <div className="wire-reply" data-testid="wire-reply">{note}</div>}

        <div className="section-label">WIRE RASHID</div>
        <p className="dim small">He buys from today's stock and puts it at your stall in Giza. You pay here by money order, with the wire ({fmt(rashidFee)}).</p>
        <div className="mkt">
          {offers.length === 0 && <p className="dim">Rashid has nothing today.</p>}
          {offers.map((o) => (
            <div className="mkt-row" key={o.uid}>
              <span><b>{RUGS[o.typeId].name}</b><small>{o.condition} · {fmt(o.price)}</small></span>
              <button className="btn small" disabled={g.cash < o.price + rashidFee} onClick={() => setNote(wireRashid(o.uid))} data-testid={`wire-rashid-${o.typeId}`}>Wire · {fmt(o.price + rashidFee)}</button>
            </div>
          ))}
        </div>

        <div className="section-label">ASK A DEALER'S PRICES</div>
        <p className="dim small">Reply paid. They answer within the hour with what they sell today and what they would pay for the rugs you hold.</p>
        <div className="wire-towns">
          {towns.map((t) => (
            <button key={t} className="btn small" disabled={g.cash < telegramFee(id, t) * 2} onClick={() => setNote(askPrices(t))} data-testid={`wire-ask-${t}`}>{settlementById(t).name} · {fmt(telegramFee(id, t) * 2)}</button>
          ))}
        </div>
        {shopIds.length > 0 && (
          <>
            <div className="section-label">SEND A RUG TO YOUR SHOP</div>
            <p className="dim small">The boy at your stall puts a rug kept there on the train: {fmt(RAIL_FEE.egypt)} freight inside Egypt ({RAIL_DAYS.egypt} days), {fmt(RAIL_FEE.abroad)} abroad ({RAIL_DAYS.abroad} days), with the wire.</p>
            {shopIds.length > 1 && (
              <div className="wire-towns">
                {shopIds.map((sid) => <button key={sid} className={`btn small ${railTo === sid ? 'primary' : ''}`} onClick={() => setRailTo(sid)} data-testid={`rail-to-${sid}`}>{settlementById(sid).name}</button>)}
              </div>
            )}
            <div className="mkt">
              {!atStall.length && <p className="dim">No rugs are kept at the stall.</p>}
              {railTo && atStall.map((r) => (
                <div className="mkt-row" key={r.uid}>
                  <span><b>{RUGS[r.typeId].name}</b><small>{r.condition} · to {settlementById(railTo).name}</small></span>
                  <button className="btn small" onClick={() => setNote(g.railStock(railTo, r.uid))} data-testid={`rail-${r.uid}`}>Send · {fmt((settlementById(railTo).region === 'Egypt' ? RAIL_FEE.egypt : RAIL_FEE.abroad) + telegramFee(id, 'giza'))}</button>
                </div>
              ))}
            </div>
          </>
        )}
        <p className="dim small">Replies are kept under Progress, Post.</p>
        <button className="btn primary" onClick={onClose} data-testid="telegraph-close">Leave the office</button>
      </div>
    </div>
  );
}
