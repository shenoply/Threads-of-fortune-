// "The times": the years 1926-30 change the trade (game/economy/era.ts). One short block saying what has
// changed and why it matters to a rug merchant, and the coffee-house talk of what is coming, so a player
// can buy ahead or move stock. On the Today sheet and in the Courier.
import { timesOn, type Times } from '../../game/economy/era';
import './era.css';

const ago = (since: number, day: number) => (since === day ? 'today' : day - since === 1 ? 'since yesterday' : day - since < 14 ? `${day - since} days` : day - since < 60 ? `${Math.round((day - since) / 7)} weeks` : `${Math.round((day - since) / 30)} months`);
const soon = (n: number) => (n <= 3 ? 'any day now' : n <= 10 ? 'within days' : n <= 21 ? 'in a few weeks' : 'within the month or so');

/** the block; nothing at all on days with no shift and no talk (the first year mostly) */
export function TheTimes({ day, kind, times }: { day: number; kind: 'today' | 'paper'; times?: Times }) {
  const t = times ?? timesOn(day);
  if (!t.now.length && !t.talk.length) return null;
  if (kind === 'paper') {
    return (
      <section className="paper-box era-paper" data-testid="paper-times">
        <h4 className="box-h">The times</h4>
        {t.now.slice(0, 4).map((x) => <p key={x.id}><b>{x.name}.</b> {x.text}</p>)}
        {t.talk.slice(0, 2).map((x) => <p key={x.id} className="era-talk"><i>{x.text}</i></p>)}
      </section>
    );
  }
  return (
    <section className="era-today" data-testid="today-times">
      <h3>The times</h3>
      <ul>
        {/* what is coming first: it is what a merchant can still act on */}
        {t.talk.slice(0, 2).map((x) => (
          <li key={x.id} className="era-talk" data-testid={`talk-${x.id}`}>
            <span className="era-ic" aria-hidden>☕</span>
            <div><b>Coming {soon(x.inDays)}</b><p>{x.text}</p></div>
          </li>
        ))}
        {t.now.slice(0, 4).map((x) => (
          <li key={x.id} data-testid={`times-${x.id}`}>
            <span className="era-ic" aria-hidden>{x.icon ?? '•'}</span>
            <div><b>{x.name}</b> <small>{ago(x.since, day)}</small><p>{x.text}</p></div>
          </li>
        ))}
      </ul>
    </section>
  );
}
