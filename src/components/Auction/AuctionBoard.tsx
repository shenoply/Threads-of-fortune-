import { AUCTION_HOUSES } from '../../data/auctionHouses';
import { Icon } from '../Icon';
import { nextSale, saleEnd, art } from '../../game/auction/sessions';
import { dateLabel } from './Auction';
import { useGame } from '../../game/state/store';
import { settlementById, findPath, pathDays, railJourney, seaRoutesFrom, PX_PER_DAY } from '../../game/systems/world';
import { speedInfo } from '../../game/systems/caravan';

/** The quickest way from where you are to a town, in days (0 = you are there). */
function daysTo(at: string | null, x: number, y: number, city: string, pxPerDay: number): number | null {
  if (at === city) return 0;
  const st = settlementById(city);
  if (!st) return null;
  const ways: number[] = [];
  const walk = findPath({ x, y }, { x: st.x, y: st.y });
  if (walk) ways.push(pathDays(walk, pxPerDay));
  if (at) {
    const rail = railJourney(at, city);
    if (rail) ways.push(rail.days);
    for (const r of seaRoutesFrom(at)) if (r.to === city) ways.push(r.days);
  }
  return ways.length ? Math.min(...ways) : null;
}

/** Every sale coming up across the region: the ones you can still reach in time first, and how long the trip is. */
export function AuctionBoard({ onClose, onMap }: { onClose: () => void; onMap: () => void }) {
  const day = useGame((s) => s.day);
  const w = useGame((s) => s.world);
  const inv = useGame((s) => s.inventory);
  const pace = (() => { try { return speedInfo(w.party, inv).pxPerDay; } catch { return PX_PER_DAY; } })();
  const rows = AUCTION_HOUSES.map((h) => {
    const d = nextSale(h.id, day);
    const end = saleEnd(h.id, d);
    const trip = daysTo(w.at ?? null, w.x, w.y, h.city, pace);
    // the day you would walk in, counting from the hour it is now
    const arrive = trip == null ? null : day + Math.floor(w.hour / 24 + trip);
    return { h, d, end, trip, arrive, inTime: arrive != null && arrive <= end };
  })
    .sort((a, b) => Number(b.inTime) - Number(a.inTime) || a.d - b.d)
    .slice(0, 8);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal-card big-card auction-board" onClick={(e) => e.stopPropagation()} data-testid="auction-board">
        <div className="big-card-head"><h2><Icon name="scale" /> Auctions</h2><button className="btn door-btn leave slim" onClick={onClose} data-testid="board-close">⟵ Back</button></div>
        <p className="board-lead">Sit in to learn what rugs really fetch, or bid to buy stock cheap. A sale stays open for a few days, so you can travel to it.</p>
        <div className="board-rows">
          {rows.map(({ h, d, end, trip, arrive, inTime }) => {
            const on = d <= day;
            const when = on ? `ON NOW · until ${end === day ? 'tonight' : dateLabel(end)}` : `${d - day === 1 ? 'Tomorrow' : `${dateLabel(d)} · in ${d - day} days`} · until ${dateLabel(end)}`;
            const away = trip == null ? '' : trip < 1 ? 'A few hours away' : `${Math.ceil(trip)} day${Math.ceil(trip) === 1 ? '' : 's'} away`;
            const reach = trip === 0 ? 'You are in town' : !inTime ? (arrive == null ? 'No way to get there from here' : `Too far: you would arrive ${dateLabel(arrive)}, after it ends`) : `${away}: you arrive ${arrive! <= d ? 'in time for the first day' : arrive === day ? 'today' : dateLabel(arrive!)}`;
            return (
              <div key={h.id} className={`board-row ${on ? 'today' : ''} ${inTime ? '' : 'is-far'}`} data-testid={`board-row-${h.id}`} data-in-time={inTime}>
                <img src={art(h.venueMap)} alt="" />
                <span><b>{h.displayName}</b><small>{settlementById(h.city)?.name ?? h.city} · {h.tier === 'grand' ? 'Grand estate sale' : 'Dealers\' auction'}</small><small className="board-reach">{reach}</small></span>
                <em>{when}</em>
              </div>
            );
          })}
        </div>
        <button className="btn primary big" onClick={onMap} data-testid="board-map"><Icon name="map" /> Open the World map to travel</button>
      </div>
    </div>
  );
}
