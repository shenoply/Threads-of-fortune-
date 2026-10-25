// The ledger as a merchant keeps it: the purse at the top with the line of its fortunes day by day,
// then the book open at one day's page. Tap a day on the line, or a tab, or swipe the page, to turn
// to it. Sales are written as what the rug cost and what it fetched, and the difference in the
// margin, green or red. Nothing here is a table: it reads like a book you want to turn the pages of.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useGame } from '../../game/state/store';
import { fmt } from '../../game/economy/money';
import { liabilities, owedParts } from '../../game/economy/progress';
import { audio } from '../../game/audio/engine';
import type { LedgerEntry } from '../../game/types';
import './pursebook.css';

type Kind = 'all' | 'sale' | 'stock' | 'cost';
const KIND_OF = (l: LedgerEntry): Exclude<Kind, 'all'> =>
  l.kind === 'sale' || (l.kind === 'bonus' && l.amount > 0) ? 'sale' : l.kind === 'purchase' ? 'stock' : 'cost';
const MARK: Record<Exclude<Kind, 'all'>, string> = { sale: '✦', stock: '◆', cost: '·' };
const FILTERS: [Kind, string][] = [['all', 'Everything'], ['sale', 'Sales'], ['stock', 'Stock'], ['cost', 'Costs']];

export function PurseBook() {
  const g = useGame();
  const stock = g.inventory.reduce((s, i) => s + i.paid, 0);
  const owed = liabilities(g) + Math.max(0, -g.cash);
  const dueNow = (g.bills?.due ?? 0) + (g.family?.due ?? 0) + (g.loans ?? []).filter((l) => g.day > l.due).reduce((a, l) => a + l.owed, 0);

  // the purse at the close of each day, read back from today's cash through the book
  const days = useMemo(() => {
    const byDay = new Map<number, LedgerEntry[]>();
    for (const l of g.ledger) { const a = byDay.get(l.day) ?? []; a.push(l); byDay.set(l.day, a); }
    const first = Math.max(1, g.day - 13);
    const out: { day: number; lines: LedgerEntry[]; net: number; close: number }[] = [];
    let cash = g.cash;
    for (let d = g.day; d >= first; d--) {
      const lines = byDay.get(d) ?? [];
      const net = lines.reduce((a, l) => a + l.amount, 0);
      out.unshift({ day: d, lines, net, close: cash });
      cash -= net;
    }
    return out;
  }, [g.ledger, g.cash, g.day]);

  const [pick, setPick] = useState(g.day);
  const [kind, setKind] = useState<Kind>('all');
  const page = days.find((d) => d.day === pick) ?? days[days.length - 1];
  const idx = days.indexOf(page);
  const turn = (to: number) => { const d = days[to]; if (!d || d.day === pick) return; audio.sfx('page'); setPick(d.day); };

  const lines = [...page.lines].reverse().filter((l) => kind === 'all' || KIND_OF(l) === kind);
  const sales = page.lines.filter((l) => l.kind === 'sale');
  const profit = sales.reduce((a, l) => a + l.amount - (l.cost ?? 0), 0);
  const best = sales.reduce<LedgerEntry | null>((b, l) => (!b || l.amount - (l.cost ?? 0) > b.amount - (b.cost ?? 0) ? l : b), null);

  // the line of the purse: drawn by hand-ish, the chosen day marked
  const W = 320, H = 84, P = 8;
  const vals = days.map((d) => d.close);
  const lo = Math.min(0, ...vals), hi = Math.max(1, ...vals);
  const X = (i: number) => P + (i / Math.max(1, days.length - 1)) * (W - P * 2);
  const Y = (v: number) => H - P - ((v - lo) / Math.max(1, hi - lo)) * (H - P * 2);
  const path = days.map((d, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(d.close).toFixed(1)}`).join(' ');
  const area = `${path} L${X(days.length - 1)},${H - P} L${X(0)},${H - P} Z`;
  const trend = days.length > 1 ? days[days.length - 1].close - days[0].close : 0;

  const swipe = useRef<number | null>(null);
  const tabs = useRef<HTMLElement>(null);
  // keep the open day's tab in view
  useEffect(() => { tabs.current?.querySelector<HTMLElement>('.on')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }); }, [page.day]);

  return (
    <div className="pursebook">
      <section className={`pb-purse ${g.cash < 300 ? 'thin' : ''}`}>
        <small>IN YOUR PURSE</small>
        <b data-testid="ledger-cash" data-pt={g.cash}>{fmt(g.cash)}</b>
        <p>
          <span>{fmt(stock)} in rugs on the shelf</span>
          {owed > 0
            ? <span className="owe" data-testid="ledger-owed" data-pt={owed}>you owe {fmt(owed)}{dueNow > 0 ? `, ${fmt(dueNow)} of it due now` : ''}<small>{owedParts(g)}</small></span>
            : <span className="free" data-testid="ledger-owed" data-pt={0}>you owe no one</span>}
        </p>
        <svg className="pb-line" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-label="Your purse over the last days">
          <defs>
            <linearGradient id="pbfill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={trend >= 0 ? '#e7bd6e' : '#c0553f'} stopOpacity=".35" /><stop offset="1" stopColor="#000" stopOpacity="0" /></linearGradient>
          </defs>
          {lo < 0 && <line x1={P} x2={W - P} y1={Y(0)} y2={Y(0)} className="zero" />}
          <path d={area} fill="url(#pbfill)" />
          <path d={path} className={`trace ${trend >= 0 ? 'up' : 'down'}`} />
          {days.map((d, i) => (
            <g key={d.day} onClick={() => turn(i)} className={`pt ${d.day === page.day ? 'on' : ''}`}>
              <rect x={X(i) - 11} y={0} width={22} height={H} fill="transparent" />
              <circle cx={X(i)} cy={Y(d.close)} r={d.day === page.day ? 4.5 : d.lines.length ? 2.4 : 1.4} />
            </g>
          ))}
        </svg>
        <div className="pb-trend">{days.length > 1 ? <>{trend >= 0 ? 'Up' : 'Down'} <b className={trend >= 0 ? 'pos' : 'neg'}>{fmt(Math.abs(trend))}</b> since day {days[0].day}</> : 'Your first day'}</div>
      </section>

      <nav className="pb-tabs" aria-label="Days" ref={tabs}>
        {days.filter((d) => d.lines.length || d.day === g.day).map((d) => (
          <button key={d.day} className={`${d.day === page.day ? 'on' : ''} ${d.net > 0 ? 'up' : d.net < 0 ? 'down' : ''}`} onClick={() => turn(days.indexOf(d))} data-testid={`ledger-day-${d.day}`}>
            <small>{d.day === g.day ? 'Today' : `Day ${d.day}`}</small>
            <b>{d.net > 0 ? '+' : d.net < 0 ? '−' : ''}{fmt(Math.abs(d.net))}</b>
          </button>
        ))}
      </nav>

      <article className="pb-page" key={page.day}
        onTouchStart={(e) => { swipe.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => { const s = swipe.current; swipe.current = null; if (s == null) return; const dx = e.changedTouches[0].clientX - s; if (Math.abs(dx) > 50) turn(idx + (dx < 0 ? 1 : -1)); }}>
        <header>
          <button className="pb-turn" onClick={() => turn(idx - 1)} disabled={idx <= 0} aria-label="Day before">‹</button>
          <div>
            <h3>{page.day === g.day ? 'Today' : `Day ${page.day}`}</h3>
            <small>{sales.length ? `${sales.length} sold · ${profit >= 0 ? 'made' : 'lost'} ${fmt(Math.abs(profit))} on them` : page.lines.length ? 'Nothing sold' : 'A blank page'}</small>
          </div>
          <button className="pb-turn" onClick={() => turn(idx + 1)} disabled={idx >= days.length - 1} aria-label="Day after">›</button>
        </header>
        {best && best.amount - (best.cost ?? 0) > 0 && sales.length > 1 && (
          <p className="pb-best">Best of the day: <b>{best.label.replace(/^Sold:?\s*/, '')}</b>, {fmt(best.amount - (best.cost ?? 0))} clear</p>
        )}
        <div className="pb-filter">
          {FILTERS.map(([k, t]) => <button key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{t}</button>)}
        </div>
        <ol className="pb-lines">
          {lines.length === 0 && <li className="pb-empty">{page.lines.length ? 'Nothing of that kind this day.' : page.day === g.day ? 'Nothing written yet today. Your first sale goes here.' : 'Nothing written this day.'}</li>}
          {lines.map((l, i) => {
            const k = KIND_OF(l);
            const gain = l.kind === 'sale' && l.cost !== undefined ? l.amount - l.cost : null;
            return (
              <li key={i} className={`pb-l ${k}`} style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}>
                <i>{MARK[k]}</i>
                <span className="what">
                  {l.label}
                  {l.kind === 'sale' && l.cost !== undefined && <small>cost {fmt(l.cost)} · fetched {fmt(l.amount)}</small>}
                </span>
                {gain !== null
                  ? <b className={`gain ${gain >= 0 ? 'pos' : 'neg'}`}>{gain >= 0 ? '+' : '−'}{fmt(Math.abs(gain))}</b>
                  : <b className={l.amount > 0 ? 'pos' : l.amount < 0 ? 'neg' : ''}>{l.amount > 0 ? '+' : l.amount < 0 ? '−' : ''}{fmt(Math.abs(l.amount))}</b>}
              </li>
            );
          })}
        </ol>
        <footer>Closed the day with <b>{fmt(page.close)}</b></footer>
      </article>
    </div>
  );
}
