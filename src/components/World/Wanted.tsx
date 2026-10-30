import { useState } from 'react';
import { useGame, wantedList, combatOf } from '../../game/state/store';
import { fmt } from '../../game/economy/money';
import { PRISONER_BOUNTY, TEMPER_WORD, ransomFor } from '../../game/systems/combat';
import { dateFor } from '../../game/economy/economy';
import { CHIEF_MARK } from '../../data/epithets';
import { TraitMarks } from '../Epithet/Epithet';
import './Clash.css';

/** The police post in a town: the posters on its wall, and a desk for any prisoners you bring in. */
export function WantedCard({ town, onClose }: { town: string; onClose: () => void }) {
  const g = useGame();
  const [note, setNote] = useState('');
  const c = combatOf(g);
  const list = wantedList(g);
  const men = c.prisoners.reduce((a, p) => a + p.n, 0);
  const held = c.prisoners.filter((p) => p.leader).map((p) => c.leaders[p.band]).filter(Boolean);
  const bounty = men * PRISONER_BOUNTY + held.reduce((a, l) => a + l.bounty, 0);
  const ransom = men * PRISONER_BOUNTY + held.reduce((a, l) => a + ransomFor(l), 0);
  return (
    <div className="overlay wanted-overlay" onClick={onClose}>
      <div className="modal-card wanted-card" onClick={(e) => e.stopPropagation()} data-testid="wanted-card" role="dialog" aria-label={`Police post, ${town}`}>
        <h2>Police post</h2>
        {note && <p className="set-note" data-testid="wanted-note">{note}</p>}
        {(men > 0 || held.length > 0) && (
          <div className="wanted-desk" data-testid="wanted-prisoners">
            <p>You bring in {men ? `${men} ${men === 1 ? 'prisoner' : 'prisoners'}` : ''}{men && held.length ? ' and ' : ''}{held.map((l) => l.name).join(' and ')}.</p>
            <button className="btn primary" onClick={() => setNote(useGame.getState().policePost('bounty'))} data-testid="hand-bounty">Hand them over <small>bounty {fmt(bounty)}{held.length ? ' · the road goes quiet' : ''}</small></button>
            {held.length > 0 && <button className="btn" onClick={() => setNote(useGame.getState().policePost('ransom'))} data-testid="hand-ransom">Let his band buy him back <small>{fmt(ransom)} · he goes free, and will remember you</small></button>}
          </div>
        )}
        <div className="section-label">WANTED</div>
        <ul className="wanted-list" data-testid="wanted-list">
          {list.map(({ id, road, leader: l }) => (
            <li key={id} className={`${l.status} ${l.robbed ? 'robbed' : ''}`} data-testid={`wanted-${id}`}>
              <b>{l.name}{l.seen && <> <TraitMarks marks={[CHIEF_MARK[l.temper]]} size={20} testid={`chief-mark-${id}`} /></>}</b>
              <span>{road}{l.seen ? ` · ${TEMPER_WORD[l.temper]}` : ''}</span>
              <em>{l.status === 'jailed' ? `In the cells. The road is quiet until ${dateFor(l.clearUntil ?? g.day).short}` : l.status === 'held' ? 'Your prisoner' : `${fmt(l.bounty)} reward${l.robbed ? ' · robbed you' : l.grudge ? ' · has a grudge against you' : ''}`}</em>
            </li>
          ))}
        </ul>
        <button className="btn primary" onClick={onClose} data-testid="wanted-close">Close</button>
      </div>
    </div>
  );
}
