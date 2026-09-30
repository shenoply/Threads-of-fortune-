import { useState } from 'react';
import { useGame } from '../../game/state/store';
import { fmt } from '../../game/economy/money';
import { dateFor } from '../../game/economy/economy';
import { LENDERS, INSURERS, COVER_DAYS, RUIN_STEPS, overdue, premiumFor } from '../../game/systems/finance';
import { settlementById } from '../../game/systems/world';

/**
 * Money matters: what you owe and how late, the lenders in this town, and cargo cover from the
 * Lloyd's agent. Opened from a town's menu, or from the red "Debts" warning anywhere.
 */
export function FinancePanel({ onClose }: { onClose: () => void }) {
  const g = useGame();
  const [note, setNote] = useState('');
  const at = g.world.at;
  const loans = g.loans ?? [];
  const bills = g.bills ?? { due: 0, since: 0, warned: 0 };
  const owed = overdue(g.cash, bills.due, bills.due > 0 && g.day - bills.since >= 5, loans, g.day);
  const ruin = g.ruin ?? { stage: 0, since: 0 };
  const lendersHere = Object.values(LENDERS).filter((l) => at && l.towns.includes(at));
  const insurerHere = !!at && INSURERS.includes(at);
  const carried = g.inventory.filter((i) => !i.stored);
  const covered = (g.insurance?.until ?? 0) >= g.day;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal-card finance" onClick={(e) => e.stopPropagation()} data-testid="finance">
        <h2>Money matters</h2>
        {note && <p className="set-note" data-testid="finance-note">{note}</p>}

        <div className="section-label">WHAT YOU OWE</div>
        {owed <= 0 && loans.length === 0 && bills.due <= 0 && g.cash >= 0 && <p className="dim">Nothing. Your name is clean in the bazaar.</p>}
        {g.cash < 0 && <p className="fin-line warn">Your purse is empty: you owe the landlord {fmt(-g.cash)}.</p>}
        {bills.due > 0 && <p className={`fin-line ${g.day - bills.since >= 5 ? 'warn' : ''}`}>The month's bill: {fmt(bills.due)}{g.day - bills.since > 0 ? `, ${g.day - bills.since} days late` : ''}. It is paid from your cash when you have it.</p>}
        {loans.map((l) => (
          <div className={`fin-line loan ${g.day > l.due ? 'warn' : ''}`} key={l.id} data-testid={`loan-${l.lender}`}>
            <span><b>{LENDERS[l.lender].name}</b> · {fmt(l.owed)} by {dateFor(l.due).short}{g.day > l.due ? ` · ${g.day - l.due} days late` : ` · ${l.due - g.day} days left`}</span>
            {at && LENDERS[l.lender].towns.includes(at) && <button className="btn primary" onClick={() => setNote(g.repay(l.id))} data-testid={`repay-${l.lender}`}>Repay {fmt(l.owed)}</button>}
          </div>
        ))}
        {loans.length > 0 && !(at && loans.some((l) => LENDERS[l.lender].towns.includes(at))) && <p className="dim">Loans are repaid in Cairo or Alexandria, where the lenders keep their offices.</p>}
        {ruin.stage > 0 && (
          <p className="fin-line ruin" data-testid="ruin">
            {ruin.stage === 1
              ? `A lawyer has written: pay the ${fmt(owed)} that is overdue within ${Math.max(0, RUIN_STEPS.bailiff - (g.day - ruin.since))} days, or the bailiff comes to the stall.`
              : `The bailiff has been. Pay within ${Math.max(0, RUIN_STEPS.court - (g.day - ruin.since))} days or the Mixed Court will declare you bankrupt.`}
            {' '}Sell rugs, borrow, or cut your costs.
          </p>
        )}
        {(g.bankruptcies ?? 0) > 0 && <p className="dim">You have been declared bankrupt once. A second time ends your father's business for good.</p>}

        {lendersHere.length > 0 && <div className="section-label">LENDERS IN {settlementById(at!).name.toUpperCase()}</div>}
        {lendersHere.map((L) => {
          const max = L.max(g.reputation);
          const has = loans.some((l) => l.lender === L.id);
          return (
            <div className="fin-lender" key={L.id} data-testid={`lender-${L.id}`}>
              <b>{L.name}</b><small>{L.who}</small>
              <p>{L.blurb}</p>
              <p className="dim">Up to {fmt(max)} · repay {L.owedPer100 - 100}% more within {L.days} days{L.minRep ? ` · needs reputation ${L.minRep}` : ''}.</p>
              {!has && (
                <div className="save-row">
                  {[500, 1000, max].filter((v, i, a) => v <= max && a.indexOf(v) === i).map((v) => (
                    <button key={v} className="btn" onClick={() => setNote(g.borrow(L.id, v))} data-testid={`borrow-${L.id}-${v}`}>Borrow {fmt(v)}</button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {insurerHere && (
          <>
            <div className="section-label">CARGO INSURANCE</div>
            <p>The Lloyd's agent covers the rugs you carry against raiders and thieves for {COVER_DAYS} days: seven parts in ten of their worth, paid by the agent in the next town.</p>
            {covered ? <p className="fin-line ok" data-testid="insured">Covered until {dateFor(g.insurance!.until).short}.</p> : carried.length ? (
              <button className="btn primary" onClick={() => setNote(g.insure())} data-testid="insure">Insure {carried.length} packed rug{carried.length === 1 ? '' : 's'} · {fmt(premiumFor(g.inventory))}</button>
            ) : <p className="dim">You carry nothing to insure. Pack rugs for the road at your Giza stall first.</p>}
          </>
        )}
        {!insurerHere && covered && <p className="fin-line ok">Your cargo is insured until {dateFor(g.insurance!.until).short}.</p>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <button className="btn primary" onClick={onClose} data-testid="finance-close">Close</button>
        </div>
      </div>
    </div>
  );
}
