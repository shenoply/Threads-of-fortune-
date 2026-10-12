// Big news reaches the player even if they never open the paper: the morning an event begins (or the
// first morning you are back from the road after it began), a short card says what happened and what
// it means for your trade, with the paper one tap away. Each event is told once.
import { useGame } from '../../game/state/store';
import { eventsOn, type GameEvent } from '../../game/economy/life';
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
  if (e.advice) out.push(e.advice);
  return out;
}

export function BigNews({ onRead }: { onRead: () => void }) {
  const g = useGame();
  const seen = g.newsSeen ?? [];
  // only news that began during the game (what was already under way on day one is in the first paper)
  const fresh = eventsOn(g.day).filter((e) => e.from >= 1 && e.from <= g.day && !seen.includes(e.id) && !e.surprise);
  if (!fresh.length || g.journey) return null;
  const shown = fresh.slice(0, 2);
  const done = () => useGame.setState({ newsSeen: [...seen, ...fresh.map((e) => e.id)] });
  return (
    <div className="overlay" onClick={done} data-testid="big-news">
      <div className="modal-card big-news" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="News">
        <small className="big-news__kicker">The news this morning</small>
        {shown.map((e) => {
          const means = whatItMeans(e);
          return (
            <div key={e.id} className="big-news__item">
              <h2>{e.name}</h2>
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
