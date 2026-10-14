import { useState } from 'react';
import { isOpen } from '../../game/unlocks';
import { createPortal } from 'react-dom';
import { useGame } from '../../game/state/store';
import { fmt } from '../../game/economy/money';
import { CHANGER_CUT, COUNTRY_NAME, COUNTRY_RULE, countryOf, currencyAt, localMoneyLong, moneyLine } from '../../game/economy/currency';
import { DUTY, PAPERS_FEE, PAPERS_TOWN, buyPapers, carried, crossBorder, finishBorder, hasPapers, installBorders, oddsWord, papersFine, postFor, quote, refusesWithoutPapers, type DeclareChoice } from '../../game/systems/customs';
import { settlementById } from '../../game/systems/world';
import '../ArranLab/ArranLab.css';
import './BorderCard.css';
import { OnceLine } from '../Tips/OnceLine';

installBorders();

/**
 * The frontier post: papers, then the rugs you carry. Shown over the town you have just reached,
 * until you go on (or are turned back, when `onDone` gets the town you are sent back to).
 */
export function BorderCard({ onDone }: { onDone: (town: string) => void }) {
  const g = useGame();
  const b = g.border;
  const [busy, setBusy] = useState(false);
  if (!b) return null;
  const papers = hasPapers(g);
  const q = quote(g, b.toC);
  const { rugs, value } = carried(g);
  const toName = settlementById(b.to).name;
  const refused = !papers && refusesWithoutPapers(b.toC);
  const fine = papers ? 0 : papersFine(b.toC);
  const go = (c: DeclareChoice | 'none' | 'back') => { if (busy) return; setBusy(true); crossBorder(c); setBusy(false); };
  const pct = Math.round(DUTY[b.toC] * 100);
  const choices: { id: DeclareChoice; label: string; sub: string; cost: number; risk: string }[] = q.duty ? [
    { id: 'full', label: 'Declare every rug', sub: `${pct} per cent of what you paid.`, cost: q.duty, risk: 'none' },
    { id: 'baksheesh', label: 'A present for the clerk', sub: `If he refuses: the duty, a fine of ${fmt(q.refusedFine)}, and talk.`, cost: q.bribe, risk: `odds he takes it: ${oddsWord(q.bribeOdds)}` },
    { id: 'under', label: 'Declare half their worth', sub: `If they search: the duty, a fine of ${fmt(q.caughtFine)}, and your name in their books.`, cost: q.under, risk: `odds of a search: ${q.caughtOdds >= 0.5 ? 'high' : q.caughtOdds >= 0.3 ? 'real' : 'low'}` },
  ] : [];
  return createPortal(
    <div className="pass-card border-card" role="dialog" aria-label="The frontier" data-testid="border-card">
      <div className="pass-card__body">
        <small className="border-card__kicker">{COUNTRY_NAME[b.fromC].toUpperCase()} → {COUNTRY_NAME[b.toC].toUpperCase()}</small>
        <h2>{b.post.replace(/^the /, '').replace(/^./, (c) => c.toUpperCase())}</h2>
        {!b.result ? (
          <>
            <p>The frontier of {COUNTRY_RULE[b.toC]}. Beyond it lies the road to {toName}.</p>
            <p className="small" data-testid="border-papers">
              <b>Papers:</b> {papers ? 'your passport and visas are in order.' : refused
                ? `the Turkish Republic admits no one without a passport and visa. Get them at the Passport Office in Cairo (${fmt(PAPERS_FEE)}).`
                : `you have none. They will fine you ${fmt(fine)} and write ${b.toC === 'egypt' ? 'down your name' : 'a pass for this crossing'}. Papers cost ${fmt(PAPERS_FEE)} in Cairo.`}
            </p>
            <p className="small" data-testid="border-money"><b>Money there:</b> {moneyLine(b.to, g.day)}.</p>
            {refused ? (
              <button type="button" className="btn primary" onClick={() => go('back')} data-testid="border-back">Turn back to {settlementById(b.from).name}</button>
            ) : rugs.length === 0 ? (
              <>
                <p className="small">You carry no rugs to declare.</p>
                <button type="button" className="btn primary" onClick={() => go('none')} data-testid="border-none">Show your papers{fine ? ` · fine ${fmt(fine)}` : ''}</button>
              </>
            ) : (
              <>
                <p className="small" data-testid="border-rugs"><b>Customs:</b> {rugs.length} rug{rugs.length > 1 ? 's' : ''}, {fmt(value)} by your receipts. Duty here is {pct} per cent.</p>
                <div className="pass-choices">
                  {choices.map((c) => (
                    <button key={c.id} type="button" className="pass-choice" disabled={busy} onClick={() => go(c.id)} data-testid={`border-${c.id}`}>
                      <b>{c.label} · {localMoneyLong(c.cost, b.to, g.day)}</b>
                      <small>{c.sub}</small>
                      <span className="pass-choice__facts"><i>{c.risk === 'none' ? 'No risk' : c.risk[0].toUpperCase() + c.risk.slice(1)}</i>{fine > 0 && <i>Plus the fine: {fmt(fine)}</i>}</span>
                    </button>
                  ))}
                </div>
                {g.cash < q.duty + fine && <p className="dim small">You are short of cash: whatever you cannot pay, they take in rugs.</p>}
              </>
            )}
          </>
        ) : (
          <>
            <p className="pass-outcome" data-testid="border-outcome" data-kind={b.result.kind}>{b.result.text}</p>
            {b.result.lines.length > 0 && <ul className="dim small">{b.result.lines.map((l) => <li key={l}>{l}</li>)}</ul>}
            <button type="button" className="btn primary" onClick={() => { const t = finishBorder(); if (t) onDone(t); }} data-testid="border-continue">{b.result.kind === 'back' ? `Back to ${settlementById(b.from).name}` : `On to ${toName}`}</button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** the trip card: the frontier and the money, when the trip leaves the country */
export function TripMoney({ from, to }: { from: string | null | undefined; to: string | undefined }) {
  const g = useGame();
  if (!to) return null;
  const fc = countryOf(from ?? g.lastTown), tc = countryOf(to);
  const money = currencyAt(to, g.day) !== currencyAt(from ?? g.lastTown, g.day) || (tc && fc && tc !== fc);
  if (!money) return null;
  const crossing = !!fc && !!tc && fc !== tc;
  return (
    <span className="trip-money" data-testid="trip-money">
      {crossing && <>Frontier at {postFor((from ?? g.lastTown)!, to).replace(/^the /, '')}: papers and customs ({Math.round(DUTY[tc!] * 100)}% on rugs). </>}
      Money there: {moneyLine(to, g.day)}.
    </span>
  );
}

/** the trip card, before you set off: no papers for the country ahead. `onOffice` takes you to the
 *  Passport Office (shown in Cairo, and across the river in Giza). Rashid says his piece the first time. */
export function TripPapers({ from, to, onOffice }: { from: string | null | undefined; to: string | undefined; onOffice?: () => void }) {
  const g = useGame();
  const fc = countryOf(from ?? g.lastTown), tc = countryOf(to);
  const need = !!fc && !!tc && fc !== tc && tc !== 'egypt' && !hasPapers(g);
  if (!need) return null;
  const near = g.world.at === PAPERS_TOWN || g.world.at === 'giza';
  return (
    <>
      <span className="warn trip-papers" data-testid="trip-papers">
        You need papers to cross into {COUNTRY_NAME[tc!]}: the Passport Office in Cairo, £E{fmt(PAPERS_FEE).slice(1)}.{refusesWithoutPapers(tc!) ? ' The Turks turn back anyone without them.' : ` Without them, a fine of ${fmt(papersFine(tc!))} at the post.`}
        {near && onOffice && <button type="button" className="btn small" onClick={onOffice} data-testid="trip-papers-go">{g.world.at === PAPERS_TOWN ? 'Passport Office' : 'Go to Cairo'}</button>}
      </span>
      <OnceLine id="papers" />
    </>
  );
}

/** the town panel: what money is used here, the money-changer, and in Cairo the Passport Office */
export function TownMoney({ id }: { id: string }) {
  const g = useGame();
  const [note, setNote] = useState('');
  const c = currencyAt(id, g.day);
  const paid = g.changer?.town === id ? g.changer : undefined;
  return (
    <div className="town-money" data-testid="town-money">
      <p className="small"><b>Money here:</b> {moneyLine(id, g.day)}.{c !== 'egp' && <> {localMoneyLong(100, id, g.day).replace(/\s*\(.*\)$/, '')} to the Egyptian pound.</>}</p>
      {c !== 'egp' && (
        <p className="small" data-testid="money-changer"><b>Money-changer:</b> {paid ? `paid ${fmt(paid.fee)} on this visit.` : `keeps ${Math.round(CHANGER_CUT[c] * 1000) / 10} per cent of your first deal here.`}</p>
      )}
      {id === PAPERS_TOWN && isOpen(g, 'abroad') && (
        <div className="mkt-row" id="sec-passport" data-testid="passport-office">
          <span><b>Passport Office</b><small>Ministry of the Interior. A passport, with visas for Palestine, Syria, Turkey and Iraq.</small></span>
          {hasPapers(g)
            ? <span className="dim small" style={{ flex: 'none' }}>In order</span>
            : <button className="btn primary" disabled={g.cash < PAPERS_FEE} onClick={() => setNote(buyPapers())} data-testid="buy-papers">Apply · {fmt(PAPERS_FEE)}</button>}
        </div>
      )}
      {note && <p className="small set-note" data-testid="papers-note">{note}</p>}
    </div>
  );
}
