import { Book } from '../Book/Book';
import { auctionable } from '../../game/storyRugs';
import { useGame } from '../../game/state/store';
import { fmt } from '../../game/economy/money';
import { BUYERS, LISTED_BUYERS as BUYER_ORDER } from '../../data/buyers';
import { RUGS } from '../../data/rugs';
import { tierOf } from '../../game/systems/negotiation';
import type { Goal } from '../../game/types';
import { RUG_IDS, TIERS } from '../../data/rugs';
import { RASHID_POOL } from '../../data/suppliers';
import { SETTLEMENTS } from '../../data/world';
import { houseOfFortune, rankOf, RANKS, netWorth, liabilities, owedParts } from '../../game/economy/progress';
import { rugSrc } from '../RugViewer/rugArt';
import { LicenceCard } from './LicenceCard';
import { MILESTONES, MILESTONE_ORDER, MILESTONE_FROM_DAY, activeMilestone } from '../../data/milestones';
import { Fold } from '../Fold/Fold';
import { onWall } from '../../game/systems/shops';
import { settlementById } from '../../game/systems/world';

import { RanksFold } from '../World/RankTable';
import type { MissionState } from '../../data/missions';

/** Where a rug can be found, for the Register. */
export function sourcesOf(id: string) {
  const out: string[] = [];
  const r = RASHID_POOL.find((p) => p.typeId === id);
  if (r) out.push(`Rashid${r.minRep ? ` (rep ${r.minRep})` : ''}`);
  for (const st of SETTLEMENTS) for (const o of st.sells) if (o.typeId === id) out.push(`${st.name}${o.minRep ? ` (rep ${o.minRep})` : ''}${o.chance ? ', some days' : ''}`);
  if (auctionable(id)) out.push((RUGS[id]?.tier ?? 1) >= 3 ? 'the grand auctions' : 'auctions');
  return out.length ? out.join(' · ') : 'Only by chance on the road';
}

/** The top of Progress: rank, net worth and reputation, the next rank, and the goal in front of you. */
export function Standing({ compact = false }: { compact?: boolean } = {}) {
  const g = useGame();
  const { idx, rank, next, worth } = rankOf(g);
  if (compact) return (
    <div className="standing compact" data-testid="standing">
      <span><b data-testid="rank">{rank.name}</b> <small>rank {idx + 1} of {RANKS.length}</small></span>
      <span><small>worth</small> <b data-testid="net-worth" data-pt={worth}>{fmt(worth)}</b></span>
      <span><small>rep</small> <b>{g.reputation}</b></span>
    </div>
  );
  return (
    <div className="standing" data-testid="standing">
      <div className="rank-row">
        <div><small>RANK {idx + 1} OF {RANKS.length}</small><b data-testid="rank">{rank.name}</b></div>
        <div className="worth"><small>NET WORTH</small><b data-testid="net-worth" data-pt={worth}>{fmt(worth)}</b>{liabilities(g) > 0 && <small data-testid="net-worth-debts">after what you owe: {owedParts(g)}</small>}</div>
        <div className="worth"><small>REPUTATION</small><b>{g.reputation}</b></div>
      </div>
      <CurrentGoal />
    </div>
  );
}

export function Fortune() {
  const g = useGame();
  const house = houseOfFortune(g);
  const reg = g.register ?? [];
  const have = RUG_IDS.filter((id) => reg.includes(id)).length;
  return (
    <>
      <Book />
      <Fold id="pr-house" testid="fortune" title={house.done ? 'The House of Fortune stands.' : 'The House of Fortune'} gist={`${house.parts.filter((p) => p.done).length} of ${house.parts.length}`}>
        <div className="house">
          <small>{house.done ? 'Your name is over a door in Khan el-Khalili, and kings know it.' : 'The life\'s work of a carpet merchant. All four, at once.'}</small>
          {house.parts.map((p) => (
            <div key={p.id} className={`goal ${p.done ? 'done' : ''}`}><span className="tick">{p.done ? '✓' : ''}</span>{p.label}<span className="prog">{p.prog}</span></div>
          ))}
        </div>
      </Fold>

      <Ladder />

      <ShopsFold />
      <RanksFold />
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
  const met = BUYER_ORDER.filter((id) => (g.relationships[id]?.visits ?? 0) > 0).length;
  const bought = BUYER_ORDER.reduce((n, id) => n + (g.relationships[id]?.purchases ?? 0), 0);
  return (
    <div className="screen" data-testid="ledger">
      <p className="ledger-sub">Day {g.day}. Every piastre in and out.</p>
      <div className="tiles">
        <div className="tile"><small>CASH</small><b data-testid="ledger-cash" data-pt={g.cash}>{fmt(g.cash)}</b></div>
        <div className="tile"><small>STOCK AT COST</small><b>{fmt(stock)}</b></div>
        <div className="tile"><small>GROSS MARGIN</small><b className={margin > 0 ? 'pos' : ''}>{margin}%</b></div>
        <div className="tile"><small>EXPENSES</small><b className={expenses ? 'neg' : ''}>{fmt(expenses)}</b></div>
        {(() => {
          // everything owed, not only Rashid's stock credit: the month's bill, your father's debt (with
          // any instalment now due), loans, and a purse run below nothing
          const total = liabilities(g) + Math.max(0, -g.cash);
          const dueNow = (g.bills?.due ?? 0) + (g.family?.due ?? 0) + (g.loans ?? []).filter((l) => g.day > l.due).reduce((a, l) => a + l.owed, 0);
          return (
            <div className="tile" data-testid="ledger-owed" data-pt={total}>
              <small>WHAT YOU OWE</small>
              <b className={total ? 'neg' : ''}>{fmt(total)}</b>
              {total > 0 && <small>{owedParts(g)}{dueNow > 0 ? ` · ${fmt(dueNow)} due now` : ''}</small>}
            </div>
          );
        })()}
      </div>
      <LicenceCard />

      <Fold id="pr-book-customers" title="Customers" gist={`${met} met · ${bought} purchase${bought === 1 ? '' : 's'}`}>
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
      </Fold>

      <Fold id="pr-book-entries" title="Entries" gist={g.ledger.length ? `${g.ledger.length} · last: ${g.ledger[g.ledger.length - 1].label}` : 'None yet'}>
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
      </Fold>

      <Fold id="pr-book-journal" title="Journal" gist={g.journal.length ? g.journal[g.journal.length - 1].text : 'Nothing yet'}>
      <div className="journal">
        {[...g.journal].reverse().slice(0, 30).map((j, i) => (
          <p key={i}><span>Day {j.day}</span>{j.text}</p>
        ))}
      </div>
      </Fold>
    </div>
  );
}

/** The milestones from the second week on: what each asks, what it brings, and where you are on it. */
export function Ladder() {
  const g = useGame();
  const st = g as unknown as MissionState;
  const done = MILESTONE_ORDER.filter((id) => g.missions?.[id] === 'done').length;
  const now = activeMilestone(g.missions);
  return (
    <Fold id="pr-ladder" title="The business" attention={!!g.milestoneNews} gist={`${done}/${MILESTONE_ORDER.length} goals${now ? ` · now: ${MILESTONES[now].title}` : ''}`}>
      <div className="ladder" data-testid="ladder">
        {g.day < MILESTONE_FROM_DAY && !done && <small className="ladder-note">The first goal opens on day {MILESTONE_FROM_DAY}.</small>}
        {MILESTONE_ORDER.map((id, i) => {
          const m = MILESTONES[id];
          const state = g.missions?.[id];
          const [have, need] = m.progress(st);
          return (
            <div key={id} className={`rung ${state ?? 'later'}`} data-testid={`rung-${id}`} data-state={state ?? 'later'}>
              <span className="tick">{state === 'done' ? '✓' : i + 1}</span>
              <div>
                <b>{m.title}</b>
                {state === 'active' ? <small>{m.hint(st)}</small> : state === 'done' ? <small className="said">{m.speaker}: {m.reward.text}</small> : <small>{m.aim}</small>}
                <small className="opens">{state === 'done' ? 'Opened: ' : 'Reward: '}{m.opens}</small>
                {state === 'active' && <i className="bar"><em style={{ width: `${Math.round(Math.min(1, have / need) * 100)}%` }} /></i>}
              </div>
            </div>
          );
        })}
      </div>
    </Fold>
  );
}

/** The one goal in front of you now, in a line with its bar: the business goal when one is open,
 *  otherwise the first of today's goals not yet met. For the summaries on Me and Progress. */
export function CurrentGoal() {
  const g = useGame();
  const st = g as unknown as MissionState;
  const ms = activeMilestone(g.missions);
  if (ms) {
    const m = MILESTONES[ms];
    const [have, need] = m.progress(st);
    return (
      <div className="cur-goal" data-testid="current-goal">
        <small>GOAL {MILESTONE_ORDER.indexOf(ms) + 1} OF {MILESTONE_ORDER.length}</small>
        <b>{m.title}</b><span>{m.hint(st)}</span>
        <i className="bar"><em style={{ width: `${Math.round(Math.min(1, have / Math.max(1, need)) * 100)}%` }} /></i>
      </div>
    );
  }
  // the day's errands are in the gift chest at the top; nothing more to say here
  return null;
}

/** Your shops in other cities, in one folded row: who keeps each, what is on its wall, what it has sent. */
export function ShopsFold() {
  const g = useGame();
  const ids = Object.keys(g.shops ?? {});
  if (!ids.length) return null;
  const sent = ids.reduce((t, id) => t + (g.shops![id].takings ?? 0), 0);
  return (
    <Fold id="pr-shops" testid="shops-fold" className="shop-fold" title="Your shops" gist={`${ids.length} · ${ids.map((id) => settlementById(id).name).join(', ')}`}>
      {ids.map((id) => {
        const sh = g.shops![id];
        const wall = onWall(sh, g.day).length;
        return (
          <div className="shop-row" key={id} data-testid={`shop-row-${id}`}>
            <span><b>{settlementById(id).name}</b><small>{sh.khan ? 'The Khan el-Khalili: you keep it yourself' : sh.agent ? `${sh.agent.name} · ${wall ? `${wall} rug${wall > 1 ? 's' : ''} on the wall` : 'nothing to sell'}` : 'Nobody keeps it'}</small></span>
            <span>{sh.khan ? '' : <small>sent {fmt(sh.takings ?? 0)}{sh.last ? ` · last ${fmt(sh.last.sent)}` : ''}</small>}</span>
          </div>
        );
      })}
      {sent > 0 && <small className="dim">Sent to you so far: {fmt(sent)}. Takings come on Mondays.</small>}
    </Fold>
  );
}
