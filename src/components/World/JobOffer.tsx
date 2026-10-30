import { useGame } from '../../game/state/store';
import { audio } from '../../game/audio/engine';
import { waitsTurn } from '../../game/cardTurn';

/** A buyer or a job in town that wants one of your packed rugs: nothing is sold until you say yes. */
export function JobOffer() {
  const offer = useGame((s) => s.jobOffer);
  const at = useGame((s) => s.world.at);
  const accept = useGame((s) => s.acceptJobOffer);
  const decline = useGame((s) => s.declineJobOffer);
  // one card at a time: the frontier, a fall or a mission's scene come first (game/cardTurn.ts)
  const wait = useGame((s) => waitsTurn(s, 'job'));
  if (!offer || offer.city !== at || wait) return null;
  return (
    <div className="overlay" onClick={decline} data-testid="job-offer">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>{offer.title}</h2>
        <p>{offer.text}</p>
        <div className="save-row" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn primary" onClick={() => { audio.sfx('tap'); accept(); }} data-testid="job-offer-yes">{offer.yes}</button>
          <button className="btn" onClick={() => { audio.sfx('tap'); decline(); }} data-testid="job-offer-no">Not now</button>
        </div>
      </div>
    </div>
  );
}
