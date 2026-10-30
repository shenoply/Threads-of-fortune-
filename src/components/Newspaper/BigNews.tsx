// Big news reaches the player even if they never open the paper: the morning an event begins (or the
// first morning you are back from the road after it began), a short card says what happened and what
// it means for your trade, with the paper one tap away. Each event is told once.
import { useEffect, useState } from 'react';
import { useGame } from '../../game/state/store';
import { waitsTurn, useHeld } from '../../game/cardTurn';
import { eventsOn, eventsStarting, type GameEvent } from '../../game/economy/life';
import { settlementById } from '../../game/systems/world';

const town = (sid: string) => { try { return settlementById(sid)?.name ?? sid; } catch { return sid; } };
const words = (t: string) => t.replace(/([A-Z])/g, ' $1').toLowerCase();
const pct = (m: number) => `${Math.round(Math.abs(m - 1) * 100)}%`;

/** what the event changes, in a trader's words */
export function whatItMeans(e: GameEvent): string[] {
  const out: string[] = [];
  if (e.budget && e.budget !== 1) out.push(e.budget > 1 ? `Buyers at your stall have more to spend (about ${pct(e.budget)}).` : `Buyers at your stall are keeping their money close (about ${pct(e.budget)} less).`);
  for (const [sid, m] of Object.entries(e.cityBid ?? {})) if (m !== 1) out.push(m > 1 ? `Dealers in ${town(sid)} pay more for rugs (about ${pct(m)}).` : `Dealers in ${town(sid)} pay less for rugs (about ${pct(m)}).`);
  for (const [sid, m] of Object.entries(e.cityBuy ?? {})) if (m !== 1) out.push(m > 1 ? `Rugs cost more to buy in ${town(sid)}.` : `Rugs are cheaper to buy in ${town(sid)}.`);
  for (const d of e.demand ?? []) out.push(`${town(d.sid)} wants ${d.traits.slice(0, 3).map(words).join(', ')} rugs: about ${pct(d.mult)} more for the right piece.`);
  for (const sid of e.closed ?? []) out.push(`The markets in ${town(sid)} are shut.`);
  for (const sid of e.danger ?? []) out.push(`Soldiers stop caravans at the gates of ${town(sid)}: travel with care.`);
  // the seasons (calendar1925.ts)
  if (e.footfall) out.push(e.footfall > 0 ? 'More buyers come by your stall.' : e.footfall <= -2 ? 'Hardly anyone comes by your stall.' : 'Fewer buyers come by your stall.');
  if (e.patience && e.patience !== 1) out.push(`Buyers at the stall haggle for less time (about ${pct(e.patience)}).`);
  const who: Record<string, string> = { foreign: 'foreign visitors and hotel buyers', coptic: 'Coptic buyers', cotton: 'cotton money', pious: 'buyers shopping for the feast' };
  for (const [g, m] of Object.entries(e.callers ?? {})) if (m && m !== 1) out.push(m > 1 ? `More ${who[g] ?? g} at your stall.` : `Fewer ${who[g] ?? g} at your stall.`);
  if (e.want) out.push(`Stall buyers pay about ${pct(e.want.mult)} more for ${e.want.label}.`);
  if (e.dust) out.push('Walking is slower in the sand around Giza and Cairo.', 'Sand gets into rugs left out. Rugs in your store are safe; on the road the khamsin kit covers the bales.');
  if (e.flood) out.push('The Giza ferry takes longer against the current, and walking in the Delta is slower. The railway is not affected.');
  for (const [sid, n] of Object.entries(e.sea ?? {})) out.push(`Ships from ${town(sid)} are held: ${n} extra day${n > 1 ? 's' : ''} at sea.`);
  if (e.advice) out.push(e.advice);
  return out;
}

/** The news not yet told, newest first: what began this morning (or while you were away), then a feast that falls tomorrow. */
export function freshNews(day: number, seen: string[]): { e: GameEvent; eve: boolean }[] {
  const now = eventsOn(day).filter((e) => e.from >= 1 && e.from <= day && !seen.includes(e.id) && !e.surprise).sort((a, b) => b.from - a.from).map((e) => ({ e, eve: false }));
  const eve = eventsStarting(day + 1).filter((e) => e.eve && !e.surprise && !seen.includes(e.id)).map((e) => ({ e, eve: true }));
  return [...now, ...eve];
}

export function BigNews({ onRead }: { onRead: () => void }) {
  const g = useGame();
  const [open, setOpen] = useState(false);
  const seen = g.newsSeen ?? [];
  // it says its piece at the top for a few seconds and goes; the paper keeps the story
  const freshIds = freshNews(g.day, seen).map((x) => x.e.id).join(',');
  // a card or a fight on screen comes first; the news waits its turn (game/cardTurn.ts)
  const hold = useHeld();
  const wait = hold || waitsTurn(g);
  useEffect(() => {
    if (!freshIds || open || g.journey || wait) return;
    const t = window.setTimeout(() => { const s = useGame.getState(); useGame.setState({ newsSeen: [...new Set([...(s.newsSeen ?? []), ...freshIds.split(',')])] }); }, 7000);
    return () => window.clearTimeout(t);
  }, [freshIds, open, g.journey, wait]);
  // only news that began during the game (what was already under way on day one is in the first paper)
  const fresh = freshNews(g.day, seen);
  // a strip, never a wall: it waits off the road and keeps out of the way until tapped
  if (!fresh.length || g.journey || wait) return null;
  const shown = fresh.slice(0, 2);
  const done = () => { setOpen(false); useGame.setState({ newsSeen: [...seen, ...fresh.map((x) => x.e.id)] }); };
  const head = fresh[0];
  return (
    <div className={`news-strip ${open ? 'open' : ''}`} data-testid="big-news" role="status">
      <div className="ns-row">
        {/* read once: opening it and closing it again puts the news away (the paper keeps it) */}
        <button className="ns-text" onClick={() => (open ? done() : setOpen(true))} aria-expanded={open} data-testid="big-news-more">
          <small>News</small><b>{head.eve ? `Tomorrow: ${head.e.name}` : head.e.name}{fresh.length > 1 ? ` +${fresh.length - 1}` : ''}</b>
        </button>
        <button className="ns-x" onClick={done} aria-label="Dismiss" data-testid="big-news-ok">×</button>
      </div>
      {open && (
        <div className="ns-more">
          {shown.map(({ e, eve }) => {
            const means = whatItMeans(e);
            return (
              <div key={e.id} className="big-news__item">
                <h3>{eve ? `Tomorrow: ${e.name}` : e.name}</h3>
                <p>{e.text}</p>
                {means.length > 0 && <ul>{means.map((m) => <li key={m}>{m}</li>)}</ul>}
              </div>
            );
          })}
          <button className="btn" onClick={() => { done(); onRead(); }} data-testid="big-news-paper">Read the paper</button>
        </div>
      )}
    </div>
  );
}
