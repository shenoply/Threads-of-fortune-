// Today's three errands on the stall itself, so they are goals while you sell and not a list found
// afterwards in the chest: one line each, a tick when done, and the pay taken with a tap (the coins).
import { useEffect, useRef } from 'react';
import { useGame } from '../../game/state/store';
import { rankOf } from '../../game/economy/progress';
import { fmt } from '../../game/economy/money';
import { ALL_THREE, errandsFor } from '../../game/systems/daily';
import { audio } from '../../game/audio/engine';
import { Icon } from '../Icon';

export function ErrandStrip({ compact = false }: { compact?: boolean }) {
  const g = useGame();
  const rk = rankOf(g).idx;
  const errs = errandsFor(g.day, g.ledger, rk);
  const paid = g.daily?.paid ?? [];
  const isPaid = (id: string) => paid.includes(`${g.day}:${id}`);
  const allDone = errs.every((e) => e.done);
  // a soft coin as an errand ticks over while you watch (not for the ones already done when it opened)
  const seen = useRef<{ day: number; n: number } | null>(null);
  const n = errs.filter((e) => e.done).length;
  useEffect(() => {
    if (seen.current && seen.current.day === g.day && n > seen.current.n) audio.sfx('coin');
    seen.current = { day: g.day, n };
  }, [n, g.day]);
  if (!g.started || !g.tutorial.done) return null;
  // after the sale, only while something is still open or waiting to be collected
  if (compact && errs.every((e) => isPaid(e.id)) && (!allDone || isPaid('all'))) return null;
  const collect = (id: string) => { if (g.payErrand(id)) audio.sfx('coins'); };
  return (
    <ul className="errand-strip" data-testid="errand-strip">
      {!compact && <small>Today's errands</small>}
      {errs.map((e) => (
        <li key={e.id} className={`${e.done ? 'done' : ''} ${isPaid(e.id) ? 'paid' : ''}`} data-testid={`strip-${e.id}`}>
          <i aria-hidden="true">{e.done ? <Icon name="check" /> : null}</i>
          <span>{e.text}</span>
          {e.done && !isPaid(e.id)
            ? <button className="btn primary small" onClick={() => collect(e.id)} data-testid={`strip-pay-${e.id}`}>Collect {fmt(e.reward)}</button>
            : <em>{isPaid(e.id) ? 'paid' : `${e.progress} · ${fmt(e.reward)}`}</em>}
        </li>
      ))}
      {allDone && !isPaid('all') && (
        <li className="done" data-testid="strip-all">
          <i aria-hidden="true"><Icon name="star" /></i>
          <span>All three done</span>
          <button className="btn primary small" onClick={() => collect('all')} data-testid="strip-pay-all">Collect {fmt(ALL_THREE(rk, g.day))}</button>
        </li>
      )}
    </ul>
  );
}
