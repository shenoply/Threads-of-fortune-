import { useGame } from '../../game/state/store';
import { rumoursOn, monthlyBill, billTotal, stallKey } from '../../game/economy/life';
import { rankOf } from '../../game/economy/progress';
import { fmt } from '../../game/economy/money';
import { Tip } from '../Tips/Tip';

/** What the bazaar is saying today: demand, gluts, collectors and the events of the year. */
export function Rumours({ max = 5, compact = false }: { max?: number; compact?: boolean }) {
  const g = useGame();
  const list = rumoursOn(g.day).slice(0, max);
  if (!list.length) return null;
  return (
    <div className={`rumours ${compact ? 'compact' : ''}`} data-testid="rumours">
      <div className="section-label">WORD IN THE BAZAAR</div>
      {list.map((r) => (
        <p key={r.id} className={`rumour ${r.kind}`}><i>{r.kind === 'event' ? '☾' : r.kind === 'glut' ? '▼' : r.kind === 'buyer' ? '✦' : '▲'}</i><span>{r.text}{r.kind !== 'event' && r.until > g.day ? <small> · {r.until - g.day + 1} days</small> : null}</span></p>
      ))}
      {!compact && <Tip id="rumours" />}
    </div>
  );
}

/** The month's bill, as it stands. */
export function BillCard() {
  const g = useGame();
  const lines = monthlyBill(g.upgrades, rankOf(g).idx, g.inventory.filter((i) => i.stored).length);
  const due = g.bills?.due ?? 0;
  return (
    <div className="billcard" data-testid="billcard">
      <div className="section-label">THE MONTH'S BILL · DUE ON THE 1ST</div>
      {due > 0 && <p className="bill-owed">Overdue: {fmt(due)}. It is paid automatically as soon as you have the cash.</p>}
      {lines.map((l) => <p key={l.label} className="bill-line"><span>{l.label}</span><b>{fmt(l.amount)}</b></p>)}
      <p className="bill-line total"><span>Next bill ({stallKey(g.upgrades) === 'corner' ? 'borrowed corner' : 'your stall'})</span><b>{fmt(billTotal(lines))}</b></p>
      <Tip id="bills" />
    </div>
  );
}
