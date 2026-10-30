import { Tip } from '../Tips/Tip';
import { useState } from 'react';
import { useGame, FAMILY_GRACE } from '../../game/state/store';
import { fmt } from '../../game/economy/money';
import { dateFor } from '../../game/economy/economy';
import { LENDERS, INSURERS, COVER_DAYS, RUIN_STEPS, overdue, premiumFor, ruinRisk, rugValue } from '../../game/systems/finance';
import { settlementById } from '../../game/systems/world';
import { count } from '../../game/text';

/** "within 3 days", "within 1 day", or "today" when no time is left */
const within = (n: number) => (n <= 0 ? 'today' : `within ${count(n, 'day')}`);

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
  const owed = overdue(g.cash, bills.due, bills.due > 0 && g.day - bills.since >= 5, loans, g.day, (g.family?.due ?? 0) > 0 && g.day - (g.family?.since ?? 0) >= FAMILY_GRACE ? g.family!.due : 0);
  const ruin = g.ruin ?? { stage: 0, since: 0 };
  const lendersHere = Object.values(LENDERS).filter((l) => at && l.towns.includes(at));
  const insurerHere = !!at && INSURERS.includes(at);
  const carried = g.inventory.filter((i) => !i.stored);
  const covered = (g.insurance?.until ?? 0) >= g.day;
  // the stock credit has its own due date even though it never joins the overdue total below (that's
  // reserved for what a lawyer can act on); shown separately so it doesn't look like a debt with no clock.
  const stockLate = g.supplier.debt > 0 && g.day > g.supplier.debtDue;
  // everything you owe anyone, due or not, so there is one number to measure the trouble by before
  // the line-by-line detail underneath it.
  const totalOwed = Math.max(0, -g.cash) + bills.due + loans.reduce((s, l) => s + l.owed, 0) + (g.family?.left ?? 0) + g.supplier.debt;
  const nothingOwed = totalOwed <= 0;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal-card finance" onClick={(e) => e.stopPropagation()} data-testid="finance">
        <h2>Debts and loans</h2>
        <Tip id="loans" card />
        {note && <p className="set-note" data-testid="finance-note">{note}</p>}

        {ruin.stage > 0 && (() => {
          const risk = ruinRisk(ruin, g.day);
          return (
            <div className="fin-line ruin" data-testid="ruin">
              <b>{ruin.stage === 1 ? 'A lawyer has written.' : 'The bailiff has been.'}</b>{' '}
              {ruin.stage === 1
                ? `Pay the ${fmt(owed)} that is overdue ${within(RUIN_STEPS.bailiff - (g.day - ruin.since))}, or the bailiff comes to the stall.`
                : `Pay the ${fmt(owed)} that is overdue ${within(RUIN_STEPS.court - (g.day - ruin.since))}, or the Mixed Court will declare you bankrupt.`}
              {totalOwed > owed ? ` In all you owe ${fmt(totalOwed)}.` : ''}
              {' '}Sell rugs, borrow, or cut your costs.
              {(g.bankruptcies ?? 0) > 0 && <><br /><b>A second bankruptcy ends your father&rsquo;s business for good.</b></>}
              <div className="ruin-meter" data-testid="ruin-risk"><i style={{ width: `${risk}%` }} /></div>
            </div>
          );
        })()}

        <div className="section-label">WHAT YOU OWE</div>
        {nothingOwed ? <p className="dim">Nothing. Your name is clean in the bazaar.</p> : (
          <p className={`fin-line ${owed > 0 ? 'warn' : ''}`} data-testid="fin-total">
            <b>{fmt(totalOwed)} in total</b>{owed > 0 ? ` · ${fmt(owed)} of that is overdue now` : ' · none of it is overdue yet'}.
          </p>
        )}
        {(g.family?.left ?? 0) > 0 && (
          <div className={`fin-line loan ${g.family!.due > 0 ? 'warn' : ''}`} data-testid="fin-family">
            <span>Your father's debt to Uncle Rashid: {fmt(g.family!.left)} left{g.family!.due > 0 ? `, ${fmt(g.family!.due)} of it due now` : ''}. {(g.family!.restUntil ?? 0) > g.day ? `After the court, Rashid has stretched it: no instalment before ${dateFor(g.family!.restUntil!).short}.` : 'An instalment falls due on the first of each month.'}</span>
            {g.family!.due > 0 && <button className="btn primary" disabled={g.cash < g.family!.due} title={g.cash < g.family!.due ? `You have ${fmt(g.cash)}.` : undefined} onClick={() => { const d = g.family!.due; g.payFamily(d); setNote(`Rashid takes the ${fmt(d)} and writes it in your father's book.`); }} data-testid="pay-family">Pay {fmt(g.family!.due)}</button>}
          </div>
        )}
        {g.supplier.debt > 0 && (
          <div className={`fin-line loan ${stockLate ? 'warn' : ''}`} data-testid="fin-credit">
            <span>Rashid's credit for stock: {fmt(g.supplier.debt)}, {stockLate ? `overdue since ${dateFor(g.supplier.debtDue).short}` : `due ${dateFor(g.supplier.debtDue).short}`}. It does not go to a lawyer, but he stops trusting you with more until it's settled.</span>
            <button className={`btn ${stockLate ? 'primary' : ''}`} disabled={g.cash <= 0} onClick={() => { const d = Math.min(g.cash, g.supplier.debt); g.payDebt(); setNote(`You send Rashid ${fmt(d)}.`); }} data-testid="pay-credit">Pay {fmt(Math.min(Math.max(0, g.cash), g.supplier.debt) || g.supplier.debt)}</button>
          </div>
        )}
        {g.cash < 0 && <p className="fin-line warn">Your purse is empty: you owe the landlord {fmt(-g.cash)}.</p>}
        {bills.due > 0 && (
          <div className={`fin-line loan ${g.day - bills.since >= 5 ? 'warn' : ''}`} data-testid="fin-bill">
            <span>The month's bill: {fmt(bills.due)}{g.day - bills.since > 0 ? `, ${count(g.day - bills.since, 'day')} late` : ''}. It is paid from your cash at night when you have it.</span>
            <button className="btn primary" disabled={g.cash < bills.due} title={g.cash < bills.due ? `You have ${fmt(g.cash)}.` : undefined} onClick={() => setNote(g.payBills())} data-testid="pay-bill">Pay {fmt(bills.due)}</button>
          </div>
        )}
        {loans.map((l) => (
          <div className={`fin-line loan ${g.day > l.due ? 'warn' : ''}`} key={l.id} data-testid={`loan-${l.lender}`}>
            <span><b>{LENDERS[l.lender].name}</b> · {fmt(l.owed)} by {dateFor(l.due).short}{g.day > l.due ? ` · ${count(g.day - l.due, 'day')} late` : l.due === g.day ? ' · due today' : ` · ${count(l.due - g.day, 'day')} left`}</span>
            <button className={`btn ${g.day > l.due || (at && LENDERS[l.lender].towns.includes(at)) ? 'primary' : ''}`} disabled={g.cash < l.owed} title={g.cash < l.owed ? `You have ${fmt(g.cash)}.` : undefined} onClick={() => setNote(g.repay(l.id))} data-testid={`repay-${l.lender}`}>{at && LENDERS[l.lender].towns.includes(at) ? 'Repay' : 'Send'} {fmt(l.owed)}</button>
          </div>
        ))}
        {loans.length > 0 && !(at && loans.some((l) => LENDERS[l.lender].towns.includes(at))) && <p className="dim">The lenders keep their offices in Cairo and Alexandria. From elsewhere the money goes by postal order.</p>}
        {(g.bankruptcies ?? 0) > 0 && <p className="dim">You have been declared bankrupt once. A second time ends your father's business for good.</p>}

        {lendersHere.length > 0 && <div className="section-label">LENDERS IN {settlementById(at!).name.toUpperCase()}</div>}
        {lendersHere.map((L) => {
          const max = L.max(g.reputation);
          const has = loans.some((l) => l.lender === L.id);
          // the same checks the lender makes, shown before you ask rather than after
          const stock = g.inventory.reduce((a, i) => a + rugValue(i), 0);
          const shut = g.reputation < L.minRep ? `They lend from reputation ${L.minRep}. Yours is ${g.reputation}.`
            : (g.bankruptcies ?? 0) > 0 && L.id === 'misr' ? 'The bank has your name on its list of bankrupts and will not lend to you.' : '';
          return (
            <div className="fin-lender" key={L.id} data-testid={`lender-${L.id}`}>
              <b>{L.name}</b><small>{L.who}</small>
              <p>{L.blurb}</p>
              <p className="dim">Up to {fmt(max)} · repay {L.owedPer100 - 100}% more within {L.days} days{L.minRep ? ` · needs reputation ${L.minRep}` : ''}.</p>
              {!has && shut && <p className="fin-line warn" data-testid={`borrow-${L.id}-why`}>{shut}</p>}
              {has && <p className="dim" data-testid={`borrow-${L.id}-owed`}>You owe {L.name.split(' ')[0] === 'Stavros' ? 'Stavros' : 'the bank'} already. Repay that before you borrow again.</p>}
              {!has && (
                <div className="save-row">
                  {[500, 1000, max].filter((v, i, a) => v <= max && a.indexOf(v) === i).map((v) => {
                    const short = L.id === 'misr' && stock < v;
                    return (
                      <button key={v} className="btn" disabled={!!shut || short} title={shut || (short ? `They want stock worth ${fmt(v)}. Yours is worth ${fmt(stock)}.` : undefined)} onClick={() => setNote(g.borrow(L.id, v))} data-testid={`borrow-${L.id}-${v}`}>Borrow {fmt(v)}</button>
                    );
                  })}
                </div>
              )}
              {!has && !shut && L.id === 'misr' && stock < 500 && <p className="dim">The bank wants stock worth at least the loan. Yours is worth {fmt(stock)}.</p>}
            </div>
          );
        })}

        {insurerHere && (
          <>
            <div className="section-label">CARGO INSURANCE</div>
            <p>The Lloyd's agent covers the rugs you carry against raiders and thieves for {COVER_DAYS} days: seven parts in ten of their worth, paid by the agent in Cairo, Alexandria or Port Said.</p>
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
