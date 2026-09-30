import { useState } from 'react';
import { useGame } from '../../game/state/store';
import { fmt } from '../../game/economy/money';
import { BOOKS, LIBRARIES, bookPhase, hasDuplicate, type BookId } from '../../game/systems/arranBooks';
import { settlementById } from '../../game/systems/world';
import { daysWord, foodFor, journey } from '../../game/systems/errands';
import { planTrip } from '../../game/nav';

/**
 * One of Arran's book errands, laid out so the whole route is readable: where, which institution,
 * how far and whether your food will last, the price and time of a copy, the opening hours, what you
 * carry, and the one next step. Travel goes through the map (a route preview), never a jump.
 */
const STEPS = ['Asked', 'Found', 'Copy carried', 'Given to Arran'];
const stepOf = { unknown: -1, requested: 0, located: 1, copy_acquired: 2, returned: 3 } as const;

export function ErrandCard({ id, onAsk, onReturn, onRead }: { id: BookId; onAsk: () => void; onReturn: () => void; onRead: () => void }) {
  const g = useGame();
  const [note, setNote] = useState('');
  const b = BOOKS[id];
  const lib = LIBRARIES[b.library];
  const town = settlementById(lib.town).name;
  const ph = bookPhase(g.arranBooks, id);
  const st = g.arranBooks?.[id];
  const carried = (g.papers ?? []).find((x) => x.id === st?.copyId);
  const j = journey(g.world.at, lib.town, g.world.party, g.inventory);
  const walk = j.walkDays ?? 0;
  const food = foodFor(walk, g.world.party, g.world.at, g.inventory);
  const step = ph === 'copy_acquired' && !carried ? 1 : stepOf[ph];
  const needTrip = ph === 'requested' || ph === 'located' || (ph === 'copy_acquired' && !carried);

  if (ph === 'returned') {
    return (
      <div className="arran-errand ph-returned" data-testid={`arran-errand-${id}`}>
        <div><b>{b.author}, <i>{b.title}</i></b><small>On his shelf. Unlocked: {b.unlockLabel.toLowerCase()}.</small></div>
        <button type="button" className="btn" onClick={onRead} data-testid={`arran-read-${id}`}>Read</button>
      </div>
    );
  }

  const facts = (
    <dl className="errand-facts">
      <dt>Where</dt><dd data-testid={`errand-where-${id}`}>{lib.name}, {town}</dd>
      <dt>Open</dt><dd>{lib.open[0]}:00 to {lib.open[1]}:00</dd>
      <dt>Journey</dt>
      <dd data-testid={`errand-journey-${id}`}>
        {j.ferry ? 'Across the river by the Nile ferry, about an hour and a half'
          : j.walkDays == null ? 'No road on foot: by sea or rail'
          : `About ${daysWord(walk)} each way on foot at your pace`}
        {j.rail ? `; by train ${daysWord(j.rail.days)} for ${fmt(j.rail.fare)}` : ''}
        {id === 'field_safety' ? '. The last stage crosses the Sinai passes: you choose how, with the risk shown.' : ''}
      </dd>
      {!j.ferry && walk > 0 && (
        <>
          <dt>Food</dt>
          <dd data-testid={`errand-food-${id}`}>
            {food.have} rations, {food.perDay} a day: {food.daysCovered} days. There and back on foot needs about {food.needRound}.
            {food.short > 0 ? ` You are ${food.short} short.` : ' Enough.'}
            {food.short > 0 && food.overload ? ' That much is more than you can carry on foot: it would slow you. A donkey or camel from the Giza market carries it.' : ''}
          </dd>
        </>
      )}
      <dt>A copy</dt>
      <dd>{b.copy.label}: {fmt(b.copy.price)}, {b.copy.minutes >= 60 ? `${b.copy.minutes / 60} hours` : `${b.copy.minutes} minutes`}{hasDuplicate(id) ? `. Or ${b.duplicate.label.toLowerCase()}: ${fmt(b.duplicate.price)}` : ''}</dd>
      <dt>Unlocks</dt><dd>{b.unlockLabel}</dd>
    </dl>
  );

  const buy = food.short > 0 && food.price != null && !j.ferry && (
    <button type="button" className="btn" disabled={g.cash < food.price} onClick={() => setNote(g.buyFood(food.short))} data-testid={`errand-buyfood-${id}`}>Buy {food.short} rations · {fmt(food.price)}</button>
  );

  return (
    <div className={`errand-card ph-${ph}`} data-testid={`arran-errand-${id}`}>
      <b>{b.author}, <i>{b.title}</i></b>
      {ph !== 'unknown' && (
        <ol className="errand-steps" aria-label="Progress">
          {STEPS.map((s, i) => <li key={s} className={i <= step ? 'done' : i === step + 1 ? 'next' : ''}>{s}</li>)}
        </ol>
      )}
      {facts}
      {note && <p className="arran-msg" data-testid={`errand-note-${id}`}>{note}</p>}
      <p className="errand-next" data-testid={`errand-next-${id}`}>
        <span>Next:</span>{' '}
        {ph === 'unknown' ? 'Offer to fetch it.'
          : ph === 'copy_acquired' && carried ? 'Give Arran the copy. It is in your Stock, under Papers.'
          : ph === 'copy_acquired' ? `Your copy is lost. The ${lib.name.replace(/^The /, '')} in ${town} can make another.`
          : ph === 'located' ? `Found on ${b.shelf}. Buy a copy at the ${lib.name.replace(/^The /, '')} in ${town}.`
          : `Travel to ${town} and search the catalogue at the ${lib.name.replace(/^The /, '')}.`}
      </p>
      <div className="arran-btns">
        {ph === 'unknown' && <button type="button" className="btn primary" onClick={onAsk} data-testid={`arran-ask-${id}`}>Offer to fetch it</button>}
        {ph === 'copy_acquired' && carried && <button type="button" className="btn primary" onClick={onReturn} data-testid={`arran-return-${id}`}>Give him the copy</button>}
        {needTrip && g.world.at !== lib.town && <button type="button" className="btn primary" onClick={() => planTrip(lib.town)} data-testid={`errand-travel-${id}`}>Travel to {town}</button>}
        {needTrip && buy}
      </div>
    </div>
  );
}
