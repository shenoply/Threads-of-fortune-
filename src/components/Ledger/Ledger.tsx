import { useGame } from '../../game/state/store';
import { fmt } from '../../game/economy/money';
import { BUYERS, LISTED_BUYERS as BUYER_ORDER } from '../../data/buyers';
import { RUGS } from '../../data/rugs';
import { tierOf } from '../../game/systems/negotiation';
import type { Goal } from '../../game/types';
import { useState } from 'react';
import { RUG_IDS, TIERS } from '../../data/rugs';
import { RASHID_POOL } from '../../data/suppliers';
import { SETTLEMENTS } from '../../data/world';
import { houseOfFortune, rankOf, RANKS, netWorth } from '../../game/economy/progress';
import { rugSrc } from '../RugViewer/rugArt';

/** Where a rug can be found, for the Register. */
function sourcesOf(id: string) {
  const out: string[] = [];
  const r = RASHID_POOL.find((p) => p.typeId === id);
  if (r) out.push(`Rashid${r.minRep ? ` (rep ${r.minRep})` : ''}`);
  for (const st of SETTLEMENTS) for (const o of st.sells) if (o.typeId === id) out.push(`${st.name}${o.minRep ? ` (rep ${o.minRep})` : ''}${o.chance ? ', some days' : ''}`);
  return out.length ? out.join(' · ') : 'Only by chance on the road';
}

export function Fortune() {
  const g = useGame();
  const [open, setOpen] = useState(false);
  const { idx, rank, next, worth } = rankOf(g);
  const house = houseOfFortune(g);
  const reg = g.register ?? [];
  const have = RUG_IDS.filter((id) => reg.includes(id)).length;
  return (
    <>
      <div className="section-label">YOUR STANDING</div>
      <div className="fortune" data-testid="fortune">
        <div className="rank-row">
          <div><small>RANK {idx + 1} OF {RANKS.length}</small><b data-testid="rank">{rank.name}</b></div>
          <div className="worth"><small>NET WORTH</small><b data-testid="net-worth" data-pt={worth}>{fmt(worth)}</b></div>
        </div>
        {next && (
          <div className="rank-next">
            <span>Next: <b>{next.name}</b> · {next.note}</span>
            <i className="bar"><em style={{ width: `${Math.min(100, (netWorth(g) / next.worth) * 100)}%` }} /></i>
          </div>
        )}
        <div className="house">
          <b>{house.done ? 'The House of Fortune stands.' : 'The House of Fortune'}</b>
          <small>{house.done ? 'Your name is over a door in Khan el-Khalili, and kings know it.' : 'The life\'s work of a carpet merchant. All four, at once.'}</small>
          {house.parts.map((p) => (
            <div key={p.id} className={`goal ${p.done ? 'done' : ''}`}><span className="tick">{p.done ? '✓' : ''}</span>{p.label}<span className="prog">{p.prog}</span></div>
          ))}
        </div>
      </div>

      <div className="section-label reg-head">
        <span>CARPET REGISTER · {have}/{RUG_IDS.length}</span>
        <button className="ghost-btn" onClick={() => setOpen((o) => !o)} data-testid="register-toggle">{open ? 'Close' : 'Open'}</button>
      </div>
      {open && (
        <div className="register" data-testid="register">
          {[1, 2, 3, 4].map((tier) => (
            <div key={tier} className="reg-tier">
              <div className="reg-tier-head"><b>{['', 'I', 'II', 'III', 'IV'][tier]} · {TIERS[tier].name}</b><small>{TIERS[tier].note}</small></div>
              <div className="reg-grid">
                {RUG_IDS.filter((id) => (RUGS[id].tier ?? 1) === tier).map((id) => {
                  const t = RUGS[id];
                  const got = reg.includes(id);
                  return (
                    <div key={id} className={`reg-card ${got ? 'got' : ''} ${tier === 4 ? 'treasure' : ''}`} data-testid={`reg-${id}`}>
                      <div className="reg-img">{got ? <img src={rugSrc(t)} alt="" /> : <span>?</span>}</div>
                      <b>{got || tier < 4 ? t.name : 'Unknown treasure'}</b>
                      <small>{got ? `${t.origin.split(',')[0]} · ${fmt(t.valueBand[0])}–${fmt(t.valueBand[1])}` : tier < 4 ? sourcesOf(id) : t.origin.split(',').slice(-1)[0].trim()}</small>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export function goalProgress(g: ReturnType<typeof useGame.getState>, goal: Goal): [number, boolean] {
  // Today's sales/gross-profit goals are read straight from the ledger rather than from dayStats,
  // which only a stall negotiation ever updated: a rug a visitor bought off your packed stock, or one
  // a job or a dialogue quest sold for you, posts a ledger 'sale' line exactly like a stall sale does,
  // so the goal it is meant to track should count it too, not just quietly fail to move.
  if (goal.kind === 'sales' || goal.kind === 'gross') {
    const todaysSales = g.ledger.filter((l) => l.kind === 'sale' && l.day === g.day);
    if (goal.kind === 'sales') return [todaysSales.length, todaysSales.length >= goal.target];
    const gross = todaysSales.reduce((s, l) => s + l.amount - (l.cost ?? 0), 0);
    return [gross, gross >= goal.target];
  }
  if (goal.kind === 'commission') {
    // a commission offered mid-day (not the one the morning's goal list was built from) carries a
    // "(by day N)" deadline in its display label that the commission record itself never has, so
    // matching on the label verbatim never found it done — key is the plain label both agree on.
    const key = goal.key ?? goal.label;
    const done = g.commissions.some((c) => c.label === key && c.done);
    return [done ? 1 : 0, done];
  }
  return [g.supplier.debt, g.supplier.debt === 0];
}

export function Ledger() {
  const g = useGame();
  const sales = g.ledger.filter((l) => l.kind === 'sale');
  const revenue = sales.reduce((s, l) => s + l.amount, 0);
  const cogs = sales.reduce((s, l) => s + (l.cost ?? 0), 0);
  const expenses = g.ledger.filter((l) => l.kind === 'expense' || l.kind === 'restoration').reduce((s, l) => s - l.amount, 0);
  const margin = revenue ? Math.round(((revenue - cogs) / revenue) * 100) : 0;
  const stock = g.inventory.reduce((s, i) => s + i.paid, 0);
  return (
    <div className="screen" data-testid="ledger">
      <div className="screen-head">
        <div>
          <div className="eyebrow">THE BOOK</div>
          <h2>Ledger</h2>
          <p>Day {g.day}. Every piastre in and out.</p>
        </div>
      </div>
      <div className="tiles">
        <div className="tile"><small>CASH</small><b data-testid="ledger-cash" data-pt={g.cash}>{fmt(g.cash)}</b></div>
        <div className="tile"><small>STOCK AT COST</small><b>{fmt(stock)}</b></div>
        <div className="tile"><small>GROSS MARGIN</small><b className={margin > 0 ? 'pos' : ''}>{margin}%</b></div>
        <div className="tile"><small>EXPENSES</small><b className={expenses ? 'neg' : ''}>{fmt(expenses)}</b></div>
        <div className="tile"><small>RASHID DEBT</small><b className={g.supplier.debt ? 'neg' : ''}>{fmt(g.supplier.debt)}</b></div>
        <div className="tile"><small>REPUTATION</small><b>{g.reputation}</b></div>
      </div>


      <div className="section-label">TODAY'S GOALS</div>
      <div className="goals">
        {g.goals.map((goal) => {
          const [p, done] = goalProgress(g, goal);
          return (
            <div className={`goal ${done ? 'done' : ''}`} key={goal.id}>
              <span className="tick">{done ? '✓' : ''}</span>
              {goal.label}
              <span className="prog">{goal.kind === 'payRashid' ? `${fmt(p)} owed` : goal.kind === 'gross' ? `${fmt(Math.min(p, goal.target))}/${fmt(goal.target)}` : `${Math.min(p, goal.target)}/${goal.target}`}</span>
            </div>
          );
        })}
      </div>

      <div className="section-label">CUSTOMERS</div>
      <div className="people">
        {BUYER_ORDER.map((id) => {
          const r = g.relationships[id] ?? { visits: 0, purchases: 0, spent: 0, affinity: 0, bad: 0, lastLines: [] };
          const b = BUYERS[id];
          const t = tierOf(r);
          return (
            <div className="person" key={id} data-testid={`person-${id}`}>
              <b>{b.name}</b> <span className="tier" data-testid={`tier-${id}`}>{t.name}</span>
              <div className="meta">{b.role}</div>
              <div className="meta">
                {r.visits} visit{r.visits === 1 ? '' : 's'} · {r.purchases} purchase{r.purchases === 1 ? '' : 's'} · {fmt(r.spent)} spent
                {r.lastRug ? ` · last: ${RUGS[r.lastRug]?.name}` : ''}
                {r.bad ? ` · ${r.bad} bad visit${r.bad > 1 ? 's' : ''}` : ''}
              </div>
            </div>
          );
        })}
      </div>

      <div className="section-label">ENTRIES</div>
      <div className="ledger-table-wrap">
        <table className="ledger">
          <thead>
            <tr><th>Day</th><th>Entry</th><th style={{ textAlign: 'right' }}>Cost</th><th style={{ textAlign: 'right' }}>Amount</th></tr>
          </thead>
          <tbody>
            {g.ledger.length === 0 && (
              <tr><td colSpan={4} style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>No entries yet. Your first sale goes here.</td></tr>
            )}
            {[...g.ledger].reverse().map((l, i) => (
              <tr key={i}>
                <td>{l.day}</td>
                <td>{l.label}</td>
                <td className="num">{l.cost !== undefined ? fmt(l.cost) : ''}</td>
                <td className={`num ${l.amount > 0 ? 'pos' : l.amount < 0 ? 'neg' : ''}`}>{l.amount > 0 ? '+' : l.amount < 0 ? '−' : ''}{fmt(Math.abs(l.amount))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section-label">JOURNAL</div>
      <div className="journal">
        {[...g.journal].reverse().slice(0, 30).map((j, i) => (
          <p key={i}><span>Day {j.day}</span>{j.text}</p>
        ))}
      </div>
    </div>
  );
}
