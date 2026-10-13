// Big news reaches the player even if they never open the paper: the morning an event begins (or the
// first morning you are back from the road after it began), a short card says what happened and what
// it means for your trade, with the paper one tap away. Each event is told once.
import { useGame } from '../../game/state/store';
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
  const seen = g.newsSeen ?? [];
  // only news that began during the game (what was already under way on day one is in the first paper)
  const fresh = freshNews(g.day, seen);
  if (!fresh.length || g.journey) return null;
  const shown = fresh.slice(0, 2);
  const done = () => useGame.setState({ newsSeen: [...seen, ...fresh.map((x) => x.e.id)] });
  return (
    <div className="overlay" onClick={done} data-testid="big-news">
      <div className="modal-card big-news" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="News">
        <small className="big-news__kicker">The news this morning</small>
        {shown.map(({ e, eve }) => {
          const means = whatItMeans(e);
          return (
            <div key={e.id} className="big-news__item">
              <h2>{eve ? `Tomorrow: ${e.name}` : e.name}</h2>
              <p>{e.text}</p>
              {means.length > 0 && <><b>For your trade</b><ul>{means.map((m) => <li key={m}>{m}</li>)}</ul></>}
            </div>
          );
        })}
        {fresh.length > shown.length && <p className="dim">And more in the paper.</p>}
        <div className="big-news__btns">
          <button className="btn" onClick={() => { done(); onRead(); }} data-testid="big-news-paper">Read the paper</button>
          <button className="btn primary" onClick={done} data-testid="big-news-ok">Noted</button>
        </div>
      </div>
    </div>
  );
}
