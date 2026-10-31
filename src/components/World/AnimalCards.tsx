// Your animals by name: a card each with the breed's painting, and a small page when tapped. Nothing to
// tend: the name is yours to change if you like, the rest looks after itself.
import { useState } from 'react';
import { useGame, animalPrice } from '../../game/state/store';
import { BREEDS, ANIMAL_MARKETS, PRIZE_ANIMALS, PRIZE_EVERY, RACE_TOWNS, RACE_STAKE } from '../../data/animals';
import { settlementById } from '../../game/systems/world';
import { fmt } from '../../game/economy/money';
import { raceMerit, ageWords, animalWorth, dueWords, isFriend, isYoung, sortWord, TEMPER_LINE, FRIEND_MILES, kindOf, type NamedAnimal } from '../../game/systems/herd';

const STABLE_KINDS = new Set(['home', 'city', 'town', 'port']);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function Card({ a, day, on, onTap, flip }: { a: NamedAnimal; day: number; on: boolean; onTap: () => void; flip?: boolean }) {
  const friend = isFriend(a), young = isYoung(a, day);
  return (
    <button className={`anc${on ? ' on' : ''}`} onClick={onTap} aria-expanded={on} data-testid={`animal-card-${a.id}`}>
      <span className="anc-pic">
        <img src={`art/animals/${a.breed}.webp`} alt="" loading="lazy" className={flip ? 'flip' : ''} />
        {friend && <i className="anc-mark" data-testid="old-friend">Old friend</i>}
        {!friend && young && <i className="anc-mark young">Young</i>}
        {a.prize && <i className="anc-mark prize">Prize</i>}
      </span>
      <span className="anc-txt">
        <b>{a.name}</b>
        <small>{cap(sortWord(a, day))} · {ageWords(a, day).replace(' old', '')}</small>
        {a.due !== undefined && <small>{kindOf(a) === 'camel' ? 'In calf' : 'In foal'}</small>}
      </span>
    </button>
  );
}

function Page({ a, onClose }: { a: NamedAnimal; onClose: () => void }) {
  const g = useGame();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState(a.name);
  const [note, setNote] = useState('');
  const b = BREEDS[a.breed];
  const sid = g.world.at;
  const day = g.day;
  const friend = isFriend(a), young = isYoung(a, day);
  const canSell = !!sid && (!!ANIMAL_MARKETS[sid] || !!a.prize);
  const worth = animalWorth(a, day, Math.round((sid ? animalPrice(sid, a.breed) ?? b.price : b.price) * 0.6));
  const town = sid ? settlementById(sid) : undefined;
  const canStable = !!town && STABLE_KINDS.has(town.kind);
  const her = a.sex === 'f' ? 'her' : 'him', She = a.sex === 'f' ? 'She' : 'He';
  return (
    <div className="anp" data-testid="animal-page" ref={(el) => { if (el && !el.dataset.seen) { el.dataset.seen = '1'; el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } }}>
      <div className="anp-pic"><img src={`art/animals/${a.breed}.webp`} alt={b.name} /><i className="anp-ar">{b.arabic}</i></div>
      <div className="anp-head">
        {naming ? (
          <form className="anp-name" onSubmit={(e) => { e.preventDefault(); g.renameAnimal(a.id, name); setNaming(false); }}>
            <input value={name} maxLength={24} autoFocus onChange={(e) => setName(e.target.value)} aria-label="Name" data-testid="animal-name-input" />
            <button className="btn small primary" type="submit" data-testid="animal-name-save">Done</button>
          </form>
        ) : (
          <button className="anp-title" onClick={() => setNaming(true)} data-testid="animal-rename"><b>{a.name}</b><small>Tap to rename</small></button>
        )}
        <button className="btn small" onClick={onClose} data-testid="animal-page-close">Close</button>
      </div>
      <p className="anp-sort">{cap(withA(b.name.replace(/ (camel|horse|donkey|mule)$/i, '')))} {sortWord(a, day)}, {ageWords(a, day)}{a.prize ? `, from ${a.prize}` : ''}.</p>
      <ul className="anp-facts">
        <li>{TEMPER_LINE[a.temper].replace(/\bher\b/, her)}</li>
        <li>{a.miles < 1 ? `New to the caravan.` : `${Math.round(a.miles)} miles with you.`} {friend ? `An old friend: ${a.sex === 'f' ? 'she' : 'he'} carries a little more, and the men are fond of ${her}.` : `An old friend after ${FRIEND_MILES} miles.`}</li>
        {a.dam && <li>Born in your keeping{a.sire ? `, to ${a.dam} by ${a.sire}` : `, to ${a.dam}`}.</li>}
        {young && <li>{She} is not grown yet and carries {b.load ? 'little' : 'nothing'}. Young stock sells better each year until grown.</li>}
        {a.due !== undefined && <li>{kindOf(a) === 'camel' ? 'In calf' : 'In foal'}{a.dueBy ? ` to ${a.dueBy}` : ''}: due in {dueWords(a.due)}.</li>}
        {!young && b.load > 0 && <li>Carries {b.load} loads{friend ? ' and one more' : ''} · pace {b.ride.toFixed(2)}× · eats {b.food} a day.</li>}
      </ul>
      {(canSell || canStable) && (
        <div className="anp-acts">
          {canStable && <button className="btn" onClick={() => { setNote(g.stableNamed(a.id)); onClose(); }} data-testid="animal-stable">Leave {her} at the stable</button>}
          {canSell && <button className="btn" onClick={() => { setNote(g.sellAnimal(a.id)); onClose(); }} data-testid="animal-sell">Sell {her} · {fmt(worth)}</button>}
        </div>
      )}
      {note && <p className="dim small">{note}</p>}
    </div>
  );
}
const withA = (w: string) => `${/^[AEIOU]/i.test(w) ? 'an' : 'a'} ${w}`;

/** the animals with you, by name, and those waiting at stables */
export function AnimalCards() {
  const herd = useGame((s) => s.world.party.herd ?? []);
  const stables = useGame((s) => s.stableHerd ?? {});
  const day = useGame((s) => s.day);
  const [open, setOpen] = useState<string | null>(null);
  const sorted = [...herd].sort((x, y) => (BREEDS[y.breed]?.price ?? 0) - (BREEDS[x.breed]?.price ?? 0) || y.miles - x.miles);
  const page = sorted.find((a) => a.id === open);
  const away = Object.entries(stables).filter(([, l]) => l.length);
  return (
    <>
      <div className="anc-grid" data-testid="animal-cards">
        {/* two of a breed share a painting: the second faces the other way */}
        {sorted.map((a, i) => <Card key={a.id} a={a} day={day} flip={sorted.slice(0, i).filter((x) => x.breed === a.breed).length % 2 === 1} on={open === a.id} onTap={() => setOpen(open === a.id ? null : a.id)} />)}
      </div>
      {page && <Page key={page.id} a={page} onClose={() => setOpen(null)} />}
      {away.length > 0 && <p className="dim anc-away" data-testid="animals-away">At the stables: {away.map(([sid, l]) => `${l.map((a) => `${a.name}${a.due !== undefined ? ` (${kindOf(a) === 'camel' ? 'in calf' : 'in foal'})` : ''}`).join(', ')} in ${settlementById(sid)?.name ?? sid}`).join('; ')}.</p>}
    </>
  );
}

/** the town's prize animal, if it has one this season */
export function PrizeOfferCard({ sid, onNote }: { sid: string; onNote: (s: string) => void }) {
  const g = useGame();
  const o = PRIZE_ANIMALS[sid];
  const b = o ? BREEDS[o.breed] : undefined;
  if (!o || !b) return null;
  const last = g.prizeDay?.[sid];
  const gone = last !== undefined && g.day - last < PRIZE_EVERY;
  const price = Math.round(b.price * o.mult);
  return (
    <div className="prize" data-testid="prize-offer">
      <div className="section-label">A PRIZE {b.kind === 'camel' ? 'CAMEL' : 'HORSE'}</div>
      {gone ? <p className="set-demand">Nothing of that quality is for sale here until next season.</p> : (
        <div className="prize-card">
          <img src={`art/animals/${o.breed}.webp`} alt={b.name} />
          <span>
            <b>{b.name}, from {o.from}</b>
            <small>{o.line}</small>
            <small>A notable's groom will buy {o.sex === 'f' ? 'her' : 'him'} back at a good price in any town. Owning one is talked about.</small>
            <button className="btn primary" disabled={g.cash < price} onClick={() => onNote(g.buyPrize())} data-testid="buy-prize">Buy {o.sex === 'f' ? 'her' : 'him'} · {fmt(price)}</button>
          </span>
        </div>
      )}
    </div>
  );
}

/** the camel race at the Bedouin camp and the Giza fair: enter one of yours, for the stake */
export function CamelRace({ sid }: { sid: string }) {
  const g = useGame();
  const [res, setRes] = useState<{ text: string; place: number; field: { name: string; mine: boolean }[]; breed: string } | null>(null);
  const race = RACE_TOWNS[sid];
  if (!race) return null;
  const camels = (g.world.party.herd ?? []).filter((a) => BREEDS[a.breed]?.kind === 'camel').sort((x, y) => raceMerit(y, g.day) - raceMerit(x, g.day));
  const raced = g.raceWeek?.[sid] === Math.floor(g.day / 7);
  const word = (m: number) => (m >= 19.5 ? 'a real chance' : m >= 17.5 ? 'a fair chance' : m >= 15 ? 'an outside chance' : 'no hope, but a good day out');
  return (
    <div className="race" data-testid="camel-race">
      <div className="section-label">{race.name.toUpperCase()}</div>
      <p className="set-demand">{race.line} Stake {fmt(RACE_STAKE)}; the winner takes five times it, second twice, third gets it back.</p>
      {res && (
        <div className="race-res" data-testid="race-result">
          <img src={`art/animals/${res.breed}.webp`} alt="" />
          <span>
            <b>{res.text}</b>
            <ol>{res.field.map((f) => <li key={f.name} className={f.mine ? 'mine' : ''}>{f.name}</li>)}</ol>
          </span>
        </div>
      )}
      {!res && (raced ? <p className="set-demand">You have raced here this week. The next race is next week.</p>
        : !camels.length ? <p className="set-demand">You have no camel with you to enter.</p>
        : <div className="mkt">{camels.map((a) => (
            <div className="mkt-row" key={a.id}>
              <span><b>{a.name}</b><small>{BREEDS[a.breed].name} · {word(raceMerit(a, g.day))}</small></span>
              <button className="btn" disabled={g.cash < RACE_STAKE} onClick={() => { const r = g.enterRace(a.id); if (r) setRes({ ...r, breed: a.breed }); }} data-testid={`race-enter-${a.id}`}>Enter {a.sex === 'f' ? 'her' : 'him'}</button>
            </div>
          ))}</div>)}
    </div>
  );
}
