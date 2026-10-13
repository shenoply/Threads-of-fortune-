// The station's departures board: every town the railway reaches from here, how long the train takes
// and what the tickets cost for your whole party. Buying a ticket sets off at once by train.
import { createPortal } from 'react-dom';
import { useGame } from '../../game/state/store';
import { fmt } from '../../game/economy/money';
import { settlementById, railJourney } from '../../game/systems/world';
import { SETTLEMENTS } from '../../data/world';
import { partySize } from '../../game/systems/caravan';
import { travelTo } from '../../game/nav';
import { Icon } from '../Icon';

const hours = (days: number) => {
  const h = days * 24;
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 24) { const whole = Math.floor(h), half = h - whole >= 0.25 && h - whole < 0.75; return `${whole}${half ? '½' : ''} h`; }
  const d = Math.floor(h / 24), rest = Math.round(h - d * 24);
  return rest ? `${d} d ${rest} h` : `${d} d`;
};

export function StationBoard({ from, name, onClose, onLeft }: { from: string; name: string; onClose: () => void; onLeft: () => void }) {
  const g = useGame();
  const party = { people: partySize(g.world.party), animals: g.world.party.animals ?? {} };
  const rows = SETTLEMENTS
    .filter((s) => s.id !== from)
    .map((s) => ({ s, r: railJourney(from, s.id, party) }))
    .filter((x): x is { s: typeof x.s; r: NonNullable<typeof x.r> } => !!x.r)
    .sort((a, b) => a.r.days - b.r.days);
  return createPortal(
    <div className="overlay" onClick={onClose} data-testid="station-board">
      <div className="modal-card station-board" role="dialog" aria-label={`${name}: departures`} onClick={(e) => e.stopPropagation()}>
        <div className="sb-head">
          <h2>{name}</h2>
          <button className="btn small" onClick={onClose} aria-label="Close" data-testid="station-close"><Icon name="x" /></button>
        </div>
        <p className="dim">Third class, for {party.people === 1 ? 'you' : `your party of ${party.people}`}{Object.values(party.animals).some((n) => n) ? ', with freight for the animals' : ''}.</p>
        {rows.length === 0 ? <p>No trains run from here.</p> : (
          <ul className="sb-list">
            {rows.map(({ s, r }) => {
              const short = g.cash < r.fare;
              return (
                <li key={s.id} className="sb-row" data-testid={`dep-${s.id}`}>
                  <span className="sb-to"><b>{s.name}</b><small>{r.stops.length > 2 ? `by ${r.stops.slice(1, -1).map((x) => settlementById(x)?.name ?? x).join(', ')}` : 'direct'}</small></span>
                  <span className="sb-time">{hours(r.days)}</span>
                  <button className="btn small primary" disabled={short} onClick={() => { onLeft(); travelTo(s.id, 'train'); }} data-testid={`ticket-${s.id}`}>{fmt(r.fare)}</button>
                </li>
              );
            })}
          </ul>
        )}
        {rows.some(({ r }) => g.cash < r.fare) && <p className="dim small">Greyed fares are more than you have.</p>}
      </div>
    </div>,
    document.body,
  );
}
