import { useState } from 'react';
import { Icon } from '../Icon';
import { fmt } from '../../game/economy/money';
import { useGame } from '../../game/state/store';
import { settlementById } from '../../game/systems/world';
import { RUGS } from '../../data/rugs';
import { BUYERS } from '../../data/buyers';
import { ALL_EVENTS, isFirstOfMonth, eventsOn } from '../../game/economy/life';

// The merchant's diary: a month view of 1925–26 with where you were, what happened, and what is coming.
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const dateOf = (day: number) => new Date(Date.UTC(1925, 2, 9 + day));
const dayOf = (d: Date) => Math.round((d.getTime() - Date.UTC(1925, 2, 9)) / 86400000);

export function timeOfDay(hour: number) {
  const h = Math.floor(hour) % 24, m = Math.floor((hour % 1) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

type Mark = { icon: string; cls: string; label: string };

export function Calendar({ onClose, onPaper }: { onClose: () => void; onPaper?: (day: number) => void }) {
  const g = useGame();
  const today = dateOf(g.day);
  // months counted from January 1925, so 14 is March 1926
  const [month, setMonth] = useState((today.getUTCFullYear() - 1925) * 12 + today.getUTCMonth());
  const [sel, setSel] = useState(g.day);

  const where = (day: number): string | undefined => {
    const w = g.whereabouts ?? {};
    if (day === g.day) return g.world.at ?? 'road';
    if (w[day]) return w[day];
    if (day > g.day) return undefined;
    for (let d = day; d >= 1; d--) if (w[d] && w[d] !== 'road') return w[d];
    return 'giza';
  };

  const marksFor = (day: number): Mark[] => {
    const m: Mark[] = [];
    const j = g.journal.filter((e) => e.day === day);
    const sales = j.filter((e) => e.text.startsWith('Sold ')).length;
    if (sales) m.push({ icon: '◆', cls: 'sale', label: `${sales} sale${sales > 1 ? 's' : ''}` });
    if (j.some((e) => e.kind === 'royal')) m.push({ icon: '♛', cls: 'royal', label: 'Royal audience' });
    if (where(day) === 'road') m.push({ icon: '⤳', cls: 'road', label: 'On the road' });
    if (j.some((e) => e.kind === 'arrive')) m.push({ icon: '⌂', cls: 'arrive', label: 'Arrived' });
    if (day === g.supplier.debtDue && g.supplier.debt > 0) m.push({ icon: '!', cls: 'due', label: `Pay Rashid ${fmt(g.supplier.debt)}` });
    for (const it of g.inventory) if (it.restoringUntil === day) m.push({ icon: '✚', cls: 'ready', label: `${RUGS[it.typeId].name} back from restoration` });
    for (const o of g.supplier.offers) if (o.leavesAfterDay === day) m.push({ icon: '⌛', cls: 'due', label: `Last day for Rashid's ${RUGS[o.typeId].name}` });
    for (const [id, last] of Object.entries(g.court.last)) if (last + 7 === day) m.push({ icon: '♛', cls: 'royal soon', label: `${BUYERS[id].name} will receive you again` });
    if (isFirstOfMonth(day) && day > 1) m.push({ icon: '£', cls: 'due', label: day > g.day ? 'Monthly bill falls due' : 'Monthly bill' });
    for (const e of ALL_EVENTS) if ((!e.surprise || e.from <= g.day) && (day === e.from || (day === g.day && day > e.from && day <= e.to))) m.push({ icon: e.surprise ? '✦' : '☾', cls: 'event', label: `${e.name}${day === e.from ? ' begins' : ''}` });
    for (const c of g.commissions) if (!c.done && c.until === day) m.push({ icon: '!', cls: 'due', label: `Last day: ${c.label}` });
    return m;
  };

  const first = new Date(Date.UTC(1925, month, 1));
  const daysIn = new Date(Date.UTC(1925, month + 1, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7; // weeks start on Monday
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysIn }, (_, i) => i + 1)];
  const placeName = (w?: string) => (!w ? '' : w === 'road' ? 'On the road' : settlementById(w)?.name ?? w);
  const selDate = dateOf(sel);
  const selEntries = g.journal.filter((e) => e.day === sel);
  const selMarks = marksFor(sel);
  const hereNow = g.world.at ? settlementById(g.world.at).name : 'On the road';

  return (
    <div className="cal-wrap" role="dialog" aria-label="Calendar" data-testid="calendar">
      <div className="cal">
        <div className="cal-head">
          <div>
            <small>TODAY · DAY {g.day}</small>
            <b>{today.getUTCDate()} {MONTHS[today.getUTCMonth()]} {today.getUTCFullYear()} · {timeOfDay(g.world.hour)}</b>
            <span>{hereNow}{g.world.at === 'giza' ? (g.dayOver ? ' · the stall is closed for the day' : ` · ${Math.max(0, g.queue.length - g.visitIdx)} buyer(s) still expected today`) : g.world.at ? ' · away from your stall' : ' · the stall is closed while you travel'}</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {onPaper && <button className="btn" onClick={() => onPaper(g.day)} data-testid="calendar-paper"><Icon name="news" /> Today's paper</button>}
            <button className="btn" onClick={onClose} data-testid="calendar-close">Close</button>
          </div>
        </div>
        <div className="cal-month">
          <button className="ghost-btn" onClick={() => setMonth((m) => Math.max(2, m - 1))} disabled={month <= 2} aria-label="Previous month">‹</button>
          <b>{MONTHS[month % 12]} {1925 + Math.floor(month / 12)}</b>
          <button className="ghost-btn" onClick={() => setMonth((m) => Math.min(17, m + 1))} disabled={month >= 17} aria-label="Next month">›</button>
        </div>
        <div className="cal-grid">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <i key={i}>{d}</i>)}
          {cells.map((c, i) => {
            if (!c) return <span key={i} className="cal-empty" />;
            const day = dayOf(new Date(Date.UTC(1925, month, c)));
            const valid = day >= 1;
            const ms = valid ? marksFor(day) : [];
            const w = valid ? where(day) : undefined;
            return (
              <button key={i} disabled={!valid} className={`cal-day ${day === g.day ? 'today' : ''} ${day < g.day ? 'past' : ''} ${day === sel ? 'sel' : ''} ${w === 'road' ? 'road' : ''}`} onClick={() => setSel(day)}>
                <em>{c}</em>
                {valid && day <= g.day && w && w !== 'road' && <small>{placeName(w).slice(0, 7)}</small>}
                <span className="cal-marks">{ms.slice(0, 3).map((mk, k) => <b key={k} className={mk.cls}>{mk.icon}</b>)}</span>
              </button>
            );
          })}
        </div>
        <div className="cal-detail">
          <b>{selDate.getUTCDate()} {MONTHS[selDate.getUTCMonth()]} {selDate.getUTCFullYear()} · Day {sel}{sel === g.day ? ' · today' : sel > g.day ? ' · ahead' : ''}</b>
          {sel <= g.day && <p className="cal-where">{placeName(where(sel))}{onPaper && <button className="ghost-btn cal-paper" onClick={() => onPaper(sel)} data-testid="cal-read-paper">Read the Courier for this day</button>}</p>}
          {selMarks.filter((m) => m.cls.includes('due') || m.cls.includes('ready') || m.cls.includes('soon')).map((m) => <p key={m.label} className={`cal-note ${m.cls}`}>{m.icon} {m.label}</p>)}
          {[...eventsOn(sel)].filter((e) => !e.surprise || e.from <= g.day).sort((a, b) => (a.to - a.from) - (b.to - b.from)).map((e) => <p key={e.id} className="cal-event" data-testid={`cal-event-${e.id}`}><b>☾ {e.name}</b> {e.text}</p>)}
          {selEntries.length ? selEntries.map((e, k) => <p key={k}>{e.text}</p>) : sel <= g.day ? <p className="dim">Nothing written in the diary.</p> : <p className="dim">Nothing planned yet.</p>}
        </div>
        <div className="cal-key"><span><b className="sale">◆</b> sale</span><span><b className="road">⤳</b> travelling</span><span><b className="arrive">⌂</b> arrived</span><span><b className="royal">♛</b> court</span><span><b className="due">!</b> due</span><span><b className="event">☾</b> event</span></div>
      </div>
    </div>
  );
}
