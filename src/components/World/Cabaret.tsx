import { useEffect, useState } from 'react';
import { Icon } from '../Icon';
import { clock, useGame } from '../../game/state/store';
import { BUYERS } from '../../data/buyers';
import { NPCS } from '../../data/world';
import { VENUES_1925, venueArt, venueOpen, type Venue1925 } from '../../data/entertainment';
import { fmt } from '../../game/economy/money';
import { Dialogue } from './Dialogue';
import { Portrait } from './Portrait';
import { audio } from '../../game/audio/engine';

/**
 * An evening at a cabaret, music hall or club: the empty room on arrival, the contact at their
 * desk, and, for the price of a table, the performance. The show picture fades in over the empty
 * one; both are whole paintings, nothing is cut out of either.
 */
export function Cabaret({ id, onLeave }: { id: string; onLeave: () => void }) {
  const g = useGame();
  const v: Venue1925 = VENUES_1925[id];
  const contact = NPCS[v.contact];
  const [talk, setTalk] = useState(false);
  const [note, setNote] = useState('');
  const state = g.venues?.[id];
  const showing = state?.showDay === g.day; // a table paid for tonight
  const open = venueOpen(v, g.day);
  const bill = v.performers.filter((p) => BUYERS[p]).map((p) => BUYERS[p].name);
  useEffect(() => { for (const w of ['interior', 'show'] as const) new Image().src = venueArt(v, w); }, [v]);
  useEffect(() => { g.visitVenue(id); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const table = () => {
    const m = g.takeTable(id);
    setNote(m);
    if (m.startsWith('You take a table')) audio.sfx('coins');
  };

  return (
    <div className="cabaret" data-testid="cabaret" data-venue={id}>
      <div className="cab-room">
        <img className="cab-bg" src={venueArt(v, 'interior')} alt={`${v.name}, the room before the doors open`} />
        <img className={`cab-bg cab-show${showing ? ' on' : ''}`} src={venueArt(v, 'show')} alt="" aria-hidden={!showing} />
        <div className="cab-head">
          <small>{v.kind.toUpperCase()} · {v.street}</small>
          <b>{v.name}</b>
          {v.since && <em>{v.since}</em>}
        </div>
        {showing && (
          <p className="cab-caption" data-testid="cab-caption">
            {v.evening} Tonight: {state?.onBill ?? v.company}.
          </p>
        )}
      </div>
      <div className="cab-body">
        <div className="cab-who">
          <Portrait id={contact.id} look={contact.look} accent={contact.accent} size={56} />
          <span><b>{contact.name}</b><small>{contact.role}</small></span>
        </div>
        <p className="cab-history">{v.history}{bill.length ? ` On the bill this season: ${bill.join(', ')}.` : ''}</p>
        {note && <p className="cab-note" data-testid="cab-note">{note}</p>}
        <div className="cab-doors">
          <button className="btn primary" onClick={table} disabled={!open || showing} data-testid="cab-table">
            <Icon name="coin" /> {showing ? 'Your table is taken' : `Take a table · ${fmt(v.ticket)}`}
          </button>
          {!showing && open && (
            <small className="cab-table-hint" data-testid="cab-table-time">
              The evening runs until {clock(Math.min(23.9, Math.max(g.world.hour, 20) + 2))} — the rest of today is gone once you sit down.
            </small>
          )}
          <button className="btn" onClick={() => setTalk(true)} data-testid="cab-talk"><Icon name="talk" /> Speak to {contact.name.split(' ')[0]}</button>
          <button className="btn door-btn leave" onClick={onLeave} data-testid="cab-leave">⟵ Back to the town</button>
        </div>
      </div>
      {talk && <Dialogue npcId={contact.id} onClose={(m) => { setTalk(false); if (m) setNote(m); }} />}
    </div>
  );
}
