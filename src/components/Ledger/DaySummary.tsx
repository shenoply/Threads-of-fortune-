import { useDailyWaiting } from '../Daily/Daily';
import { useGame, FAMILY_INSTALMENT } from '../../game/state/store';
import { fmt } from '../../game/economy/money';
import { dateFor } from '../../game/economy/economy';
import { useEffect, useState } from 'react';
import { audio } from '../../game/audio/engine';
import { NightScene, dayScore, nightDue, scoreWhy, scoreWord } from '../Night/NightScene';
import { WeekTables, SeasonEnd } from '../World/RankTable';
import { aheadLine, withinReach } from '../../game/tomorrow';
import { EARLY_OFF } from '../../game/firstWeek';
import { SwipeAway } from '../Touch/SwipeAway';

/** What happened overnight after "Next day": the bills, Rashid, the men, how you slept. Shown once
 *  as a small card in the morning and put away when read. Nights on the road are not shown here:
 *  their notes already appear on the map as you travel. */
/** the morning's reason to look: today's errands are new, and the gift may be waiting */
function DailyTeaser() {
  const w = useDailyWaiting();
  return <p className="daily-teaser" data-testid="daily-teaser"><b>Three new errands today.</b>{w.gift ? ` Rashid's runner came at dawn, and your gift is waiting under Today at the top${w.run > 0 ? ` (${w.run + 1} days in a row)` : ''}.` : ''}</p>;
}

/** Rashid's first ten pounds, settled on the day just ended (paid early from his counter, or sent on
 *  the night it fell due): his answer, written into the morning card rather than put over play */
const PAID_SCENE: Record<string, { title: string; text: string }> = {
  early: { title: 'The first instalment, paid early', text: `Rashid counts the coins twice, then a third time. "Before the day. Your father never once paid me before the day." He takes ${fmt(EARLY_OFF)} off the debt, as he said he would, and writes your name in his book in his best hand.` },
  onTime: { title: 'The first instalment, paid on the day', text: 'The runner brings back Rashid\'s book with the line ruled off. Under it, in his small hand: "On the day. Good." From Rashid, that is a great deal.' },
  late: { title: 'The first instalment, paid at last', text: 'A week late and dearer for it, but paid. Rashid rules off the line and says nothing about last week. That is his way of forgiving.' },
};
function RashidPaid({ day }: { day: number }) {
  const f = useGame((s) => s.family?.first);
  const trust = useGame((s) => s.supplier.trust);
  const titled = useGame((s) => (s.titles ?? []).includes('firstpaid'));
  if (!f || f.done !== day || !f.how || !PAID_SCENE[f.how]) return null;
  const sc = PAID_SCENE[f.how];
  return (
    <div className="ds-rashid" data-testid="rashid-paid">
      <img src="art/portraits/rashid.webp" alt="" />
      <div>
        <small>Uncle Rashid's book</small>
        <b>{sc.title}</b>
        <p>{sc.text}</p>
        <span>His trust in you: {trust} of 100.{titled ? ' A new title: Paid on the Nail.' : ''}</span>
      </div>
    </div>
  );
}

/** one line on the day ahead: whatever is really coming (a payment, a favour, a buyer, a sale, a letter) */
function Ahead() {
  const line = useGame((s) => aheadLine(s, FAMILY_INSTALMENT));
  if (!line) return null;
  return <p className="ds-ahead" data-testid="ds-ahead"><b>Ahead</b> {line}</p>;
}

/** from about day 20: a few things the purse could buy, now or nearly */
function WithinReach() {
  const g = useGame();
  const list = withinReach(g);
  const cash = g.cash;
  if (!list.length) return null;
  return (
    <div className="ds-reach" data-testid="ds-reach">
      <small>Within reach</small>
      <ul>
        {list.map((r) => (
          <li key={r.id} data-testid={`reach-${r.kind}`}>
            <b>{r.title}</b> <em>{fmt(r.cost)}{r.ready ? '' : ` · ${fmt(r.cost - cash)} to find`}</em>
            <span>{r.line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DaySummary() {
  const sum = useGame((s) => s.lastSummary);
  const dismiss = useGame((s) => s.dismissSummary);
  const [nightSeen, setNightSeen] = useState(0);
  // a theft in the night: the morning starts quiet
  const robbed = !!sum && !sum.seen && sum.notes.some((n) => /thief/i.test(n)) && !sum.notes.some((n) => /watched/i.test(n));
  useEffect(() => { if (robbed) audio.mood('night-theft', 'sorrow', 45); }, [robbed]);
  if (!sum || sum.seen) return null;
  // first the stall after dark with the day's money counted, then the morning's card
  if (sum.revenue > 0 && nightDue(sum.day) && nightSeen !== sum.day + 1) return <NightScene day={sum.day} takings={sum.revenue} score={dayScore(useGame.getState().ledger, sum.day, sum)} onDone={() => setNightSeen(sum.day + 1)} />;
  const st = useGame.getState();
  const paidScene = !!st.family?.first && st.family.first.done === sum.day && !!PAID_SCENE[st.family.first.how ?? ''];
  // the season's end has its own section below: its long line is not repeated in the list
  const seasonOver = st.ranks?.last?.day === sum.day + 1;
  // the scene tells the payment: the plain note of it is not needed as well
  const notes = sum.notes.filter((n) => n.trim() && !(paidScene && /^You sent Uncle Rashid his /.test(n)) && !(seasonOver && /^The end of the .* season/.test(n)));
  const traded = sum.sales > 0 || sum.revenue > 0;
  // a quiet night with nothing to report needs no card
  const monday = dateFor(sum.day + 1).weekday === 'Monday' && Object.keys(st.ranks?.week?.now ?? {}).length > 0;
  if (!notes.length && !traded && !monday && !paidScene && !seasonOver && !aheadLine(st, FAMILY_INSTALMENT)) return null;
  const net = sum.gross - sum.expenses;
  // the evening strip closed the books before the night's wages and bread: say so, so the two agree
  const night = (sum.wages ?? 0) + (sum.food ?? 0);
  const atClose = net + night;
  const nightParts = [sum.wages ? `${fmt(sum.wages)} in wages` : '', sum.food ? `${fmt(sum.food)} for bread` : ''].filter(Boolean).join(' and ');
  return (
    <div className="overlay" ref={(el) => { if (el && !el.dataset.t) el.dataset.t = String(performance.now()); }}
      // a tap that ended the night (or landed as it faded) is not a tap to put the morning's news away unread
      onClick={(e) => { if (performance.now() - Number(e.currentTarget.dataset.t ?? 0) > 800) dismiss(); }} data-testid="day-summary">
      <SwipeAway className="modal-card" onClick={(e) => e.stopPropagation()} onGone={dismiss}>
        <h2>{dateFor(sum.day + 1).long}</h2>
        {traded && (
          <p>
            <b className="ds-score" data-testid="summary-score">{dayScore(useGame.getState().ledger, sum.day, sum)}/100 · {scoreWord(dayScore(useGame.getState().ledger, sum.day, sum))}.</b>{' '}
            <small className="ds-why" data-testid="summary-why" style={{ display: 'block', margin: '2px 0 4px', color: 'var(--text-dim)' }}>{scoreWhy(useGame.getState().ledger, sum.day, sum)}</small>{' '}
            Yesterday: {sum.sales} {sum.sales === 1 ? 'sale' : 'sales'}, {fmt(sum.revenue)} taken
            {night > 0
              ? <>, {atClose >= 0 ? `${fmt(atClose)} to the good` : `${fmt(-atClose)} down`} at the close. The night cost {nightParts}: {net >= 0 ? `${fmt(net)} to the good` : `${fmt(-net)} down`} in all.</>
              : <>, {net >= 0 ? `${fmt(net)} to the good` : `${fmt(-net)} down`} after costs.</>}
          </p>
        )}
        <RashidPaid day={sum.day} />
        {notes.some((n) => /thief/i.test(n)) && <img className="ds-scene" src={notes.some((n) => /watched/i.test(n)) ? 'art/events/watchman.webp' : 'art/events/thief-night.webp'} alt="" data-testid="night-event-art" />}
        {notes.length > 0 && (
          <ul style={{ margin: '0 0 14px', paddingLeft: 18, color: 'var(--text)', fontSize: 15.5, lineHeight: 1.4 }}>
            {notes.map((n, i) => <li key={i} style={{ marginBottom: 6 }}>{n}</li>)}
          </ul>
        )}
        {seasonOver && <SeasonEnd day={sum.day + 1} />}
        {monday && !seasonOver && <WeekTables />}
        <Ahead />
        <WithinReach />
        <DailyTeaser />
        <button className="btn primary ds-ok" onClick={dismiss} data-testid="day-summary-ok">Open the day</button>
      </SwipeAway>
    </div>
  );
}
