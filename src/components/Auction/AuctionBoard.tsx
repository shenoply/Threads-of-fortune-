import { AUCTION_HOUSES } from '../../data/auctionHouses';
import { Icon } from '../Icon';
import { nextSale, art } from '../../game/auction/sessions';
import { dateLabel } from './Auction';
import { useGame } from '../../game/state/store';
import { settlementById } from '../../game/systems/world';

/** Every sale coming up across the region, soonest first, and how to get there. */
export function AuctionBoard({ onClose, onMap }: { onClose: () => void; onMap: () => void }) {
  const day = useGame((s) => s.day);
  const rows = AUCTION_HOUSES.map((h) => ({ h, d: nextSale(h.id, day) })).sort((a, b) => a.d - b.d).slice(0, 8);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal-card big-card auction-board" onClick={(e) => e.stopPropagation()} data-testid="auction-board">
        <div className="big-card-head"><h2><Icon name="scale" /> Auctions</h2><button className="btn door-btn leave slim" onClick={onClose} data-testid="board-close">⟵ Back</button></div>
        <p className="board-lead">Sit in to learn what rugs really fetch, or bid to buy stock cheap. Travel to the town, then enter the auction house.</p>
        <div className="board-rows">
          {rows.map(({ h, d }) => (
            <div key={h.id} className={`board-row ${d === day ? 'today' : ''}`}>
              <img src={art(h.venueMap)} alt="" />
              <span><b>{h.displayName}</b><small>{settlementById(h.city)?.name ?? h.city} · {h.tier === 'grand' ? 'Grand estate sale' : 'Dealers\' auction'}</small></span>
              <em>{d === day ? 'TODAY' : d - day === 1 ? 'Tomorrow' : `${dateLabel(d)} · in ${d - day} days`}</em>
            </div>
          ))}
        </div>
        <button className="btn primary big" onClick={onMap} data-testid="board-map"><Icon name="map" /> Open the World map to travel</button>
      </div>
    </div>
  );
}
