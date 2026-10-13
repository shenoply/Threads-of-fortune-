import { useState } from 'react';
import '../StallEncounter/stallhelp.css';
import { useGame } from '../../game/state/store';
import { fmt } from '../../game/economy/money';
import { dateFor } from '../../game/economy/economy';
import { settlementById } from '../../game/systems/world';
import { canRenew, lapsed, licenceFee, licenceOf, officeTown, LAPSED_FINE } from '../../game/systems/inspector';
import { renewLicence } from '../../game/systems/stallHelpActions';

/** Your trading licence in the Ledger: good until when, what it costs, and renewal at the office. */
export function LicenceCard() {
  const g = useGame();
  const [note, setNote] = useState('');
  const l = licenceOf(g);
  const fee = licenceFee(g.upgrades);
  const town = officeTown(g.upgrades);
  const out = lapsed(l, g.day);
  const left = l.until - g.day;
  return (
    <div className={`licence-card ${out ? 'lapsed' : ''}`} data-testid="licence-card">
      <p>
        <b>Trading licence</b>{' '}
        {out ? <>ran out on {dateFor(l.until).short}. Trading without one is a {fmt(LAPSED_FINE)} fine.</> : <>good until <b data-testid="licence-until">{dateFor(l.until).short}</b>{left <= 14 ? ` (${left === 0 ? 'last day' : `${left} day${left > 1 ? 's' : ''} left`})` : ''}.</>}
        {' '}<small className="dim">{fmt(fee)} a year at the {settlementById(town).name} markets office.{l.checks ? ` Inspected ${l.checks} time${l.checks > 1 ? 's' : ''}${l.fines + l.short ? `, ${l.fines + l.short} offence${l.fines + l.short > 1 ? 's' : ''}` : ''}.` : ''}</small>
      </p>
      {note && <p className="set-note" data-testid="licence-note">{note}</p>}
      {canRenew(l, g.day) && <button className="btn small" disabled={g.world.at !== town || g.cash < fee} onClick={() => setNote(renewLicence())} data-testid="licence-renew">{g.world.at === town ? `Renew · ${fmt(fee)}` : `Renew in ${settlementById(town).name}`}</button>}
    </div>
  );
}
