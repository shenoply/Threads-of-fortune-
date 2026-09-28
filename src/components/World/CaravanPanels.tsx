import { useState } from 'react';
import { fmt } from '../../game/economy/money';
import { useGame } from '../../game/state/store';
import { TROOPS, MARKETS, YARD_ART } from '../../data/caravan';
import { BREEDS, ANIMAL_MARKETS, type Breed } from '../../data/animals';
import { animalPrice } from '../../game/state/store';
import { recruitPool, speedInfo, partySize, strength, wages, dailyFood, foodDaysLeft, animalCount } from '../../game/systems/caravan';
import { AnimalPlate } from './AnimalPlate';
import { Icon } from '../Icon';

/** One-line caravan status used on the map and in towns. */
export function CaravanStrip() {
  const g = useGame();
  const p = g.world.party;
  const sp = speedInfo(p, g.inventory);
  return (
    <div className="cstrip" data-testid="caravan-strip">
      <span title="People in your caravan"><Icon name="people" />{partySize(p)}</span>
      <span title="Animals: camels, horses, donkeys and mules"><Icon name="camel" />{animalCount(p)}</span>
      <span className={foodDaysLeft(p) < 2 ? 'warn' : ''} title="Days of food"><Icon name="bag" />{foodDaysLeft(p)}d</span>
      <span className={sp.over ? 'warn' : ''} title="Load / capacity"><Icon name="scale" />{Math.round(sp.load * 10) / 10}/{sp.cap}</span>
      <span title="Travel speed"><Icon name="sun" />{sp.mult.toFixed(1)}×</span>
      <span title="Fighting strength"><Icon name="shield" />{strength(p)}</span>
    </div>
  );
}

/** Food, animals and volunteers for the settlement you are in. */
export type SupplyPart = 'food' | 'animals' | 'recruits';
export function TownSupplies({ show = ['food', 'animals', 'recruits'] }: { show?: SupplyPart[] }) {
  const g = useGame();
  const [note, setNote] = useState('');
  const sid = g.world.at;
  if (!sid) return null;
  const m = MARKETS[sid];
  if (!m) return null;
  const p = g.world.party;
  const pool = recruitPool(sid, g.day, g.world.hired);
  return (
    <div data-testid="town-supplies">
      {note && <p className="set-note" data-testid="supply-note">{note}</p>}
      {show.includes('food') && (<>
      <div className="section-label">PROVISIONS</div>
      <div className="mkt">
        <div className="mkt-row">
          <span><b>Bread, dates and water</b><small>{fmt(m.food)} a ration · you have {p.food}, the caravan eats {dailyFood(p)} a day</small></span>
          <button className="btn" onClick={() => setNote(g.buyFood(5))} disabled={g.cash < Math.ceil(5 * m.food)} data-testid="buy-food-5">+5</button>
          <button className="btn primary" onClick={() => setNote(g.buyFood(dailyFood(p) * 5))} disabled={g.cash < Math.ceil(dailyFood(p) * 5 * m.food)} data-testid="buy-food-days">5 days</button>
        </div>
      </div>
      </>)}
      {show.includes('animals') && <BreedMarket sid={sid} onNote={setNote} />}
      {show.includes('recruits') && pool.length === 0 && (
        <>
          <div className="section-label">HIRE GUARDS</div>
          <p className="set-demand">Nobody here hires out as a guard. Try Giza's guard yard, Cairo, Alexandria or the Bedouin camp.</p>
        </>
      )}
      {show.includes('recruits') && pool.length > 0 && (
        <>
          {YARD_ART[sid] && <img className="yard-hero" src={`art/troops/${YARD_ART[sid]}.jpg`} alt="" />}
          <div className="section-label">HIRE GUARDS</div>
          <p className="set-demand">Guards fight off raiders on the road. Each is paid every morning and eats a ration a day; unpaid men go home.</p>
          <div className="mkt">
            {pool.map((r) => {
              const t = TROOPS[r.troop];
              return (
                <div className="mkt-row troop-row" key={r.key} data-testid={`recruit-${r.troop}`}>
                  <img className="troop-pic" src={`art/troops/${r.troop}.jpg`} alt={t.name} />
                  <span><b>{r.available} {r.available === 1 ? t.name.toLowerCase() : t.plural.toLowerCase()}</b><small>{t.blurb} Strength {t.strength}, wage {fmt(t.wage)} a day{t.scout ? ', scouts ahead' : ''}.</small></span>
                  <button className="btn primary" disabled={!r.available || g.cash < t.cost} onClick={() => setNote(g.recruit(r.troop, r.key, 1))} data-testid={`hire-${r.troop}`}>Hire {t.cost ? fmt(t.cost) : "free"}</button>
                </div>
              );
            })}
            {pool.every((r) => !r.available) && <p className="set-demand">Nobody else wants work today. Come back tomorrow.</p>}
          </div>
        </>
      )}
    </div>
  );
}

/** Your men, animals and supplies, with the option to send people home. */
export function CaravanRoster() {
  const g = useGame();
  const p = g.world.party;
  const sp = speedInfo(p, g.inventory);
  const troops = Object.entries(p.troops).filter(([, n]) => n > 0);
  return (
    <div data-testid="caravan-roster">
      <div className="section-label">YOUR CARAVAN</div>
      <CaravanStrip />
      <Herd />
      <p className="set-demand" style={{ marginTop: 6 }}>
        Wages {fmt(wages(p))} a day · food {dailyFood(p)} rations a day · {sp.over ? 'overloaded, moving slowly' : `carrying ${Math.round(sp.load)} of ${sp.cap} loads`}
        {sp.hungry ? ' · out of food' : ''}
      </p>
      {troops.length === 0 ? (
        <p className="set-demand">No guards. Raiders will come looking for you. Hire men in villages, towns and the Bedouin camp.</p>
      ) : (
        <div className="mkt">
          {troops.map(([id, n]) => (
            <div className="mkt-row" key={id}>
              <img className="troop-pic small" src={`art/troops/${id}.jpg`} alt={TROOPS[id].name} />
              <span><b>{n} {n === 1 ? TROOPS[id].name.toLowerCase() : TROOPS[id].plural.toLowerCase()}</b><small>Strength {TROOPS[id].strength} each · {fmt(TROOPS[id].wage)} a day each</small></span>
              <button className="btn" onClick={() => g.dismiss(id, 1)} data-testid={`dismiss-${id}`}>Send one home</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, v, max }: { label: string; v: number; max: number }) {
  return (
    <span className="bstat">
      <i>{label}</i>
      <b><em style={{ width: `${Math.min(100, (v / max) * 100)}%` }} /></b>
    </span>
  );
}

/** The painted breed portrait from art/animals/<id>.jpg; the drawn plate stands in if it fails to load. */
function BreedImage({ breed, size, tall = 1.2 }: { breed: Breed; size: number; tall?: number }) {
  const [photo, setPhoto] = useState(true);
  return photo ? (
    <span className="bphoto" style={{ width: size, height: size * tall }}>
      <img src={`art/animals/${breed.id}.jpg`} alt={`${breed.name}, painted`} onError={() => setPhoto(false)} data-testid={`breed-photo-${breed.id}`} />
      <i className="bphoto-ar">{breed.arabic}</i>
    </span>
  ) : (
    <AnimalPlate breed={breed} size={size} />
  );
}

export function BreedCard({ breed, price, have, onBuy, onSell, cash }: { breed: Breed; price?: number; have: number; onBuy?: () => void; onSell?: () => void; cash: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="breed" data-testid={`breed-${breed.id}`}>
      <div className="breed-top">
        <BreedImage breed={breed} size={112} />
        <div className="breed-info">
          <b>{breed.name}</b>
          <small className="breed-role">{breed.role}</small>
          <small className="breed-origin">{breed.origin}</small>
          <div className="bstats">
            <Stat label="Load" v={breed.load} max={10} />
            <Stat label="Pace" v={breed.ride - 0.8} max={1.1} />
            <Stat label="Feed" v={breed.food} max={2} />
          </div>
        </div>
      </div>
      <div className="breed-foot">
        <button className="linkish" onClick={() => setOpen(!open)} data-testid={`notes-${breed.id}`}>{open ? 'Hide notes' : 'Field notes'}</button>
        <span className="breed-have">{have ? `You own ${have}` : ''}</span>
        {have > 0 && onSell && <button className="btn" onClick={onSell} data-testid={`sell-${breed.id}`}>Sell {fmt(Math.round((price ?? breed.price) * 0.6))}</button>}
        {price && onBuy && <button className="btn primary" disabled={cash < price} onClick={onBuy} data-testid={`buy-${breed.id}`}>Buy {fmt(price)}</button>}
      </div>
      {open && (
        <ul className="breed-notes">
          <li>Carries {breed.load} loads as a pack animal, {Math.round(breed.load * 0.4 * 10) / 10} when ridden. Eats {breed.food} ration{breed.food === 1 ? '' : 's'} a day.</li>
          {breed.notes.map((n) => <li key={n}>{n}</li>)}
        </ul>
      )}
    </div>
  );
}

function BreedMarket({ sid, onNote }: { sid: string; onNote: (s: string) => void }) {
  const g = useGame();
  const p = g.world.party;
  const sold = (ANIMAL_MARKETS[sid] ?? []).map(([id]) => id);
  const owned = Object.entries(p.animals ?? {}).filter(([id, n]) => n > 0 && BREEDS[id] && !sold.includes(id)).map(([id]) => id);
  if (!sold.length && !owned.length) return null;
  return (
    <>
      <div className="section-label">ANIMAL MARKET</div>
      {!sold.length && <p className="set-demand">No animals for sale here, but a dealer will buy yours.</p>}
      <div className="breeds">
        {[...sold, ...owned].map((id) => (
          <BreedCard key={id} breed={BREEDS[id]} price={animalPrice(sid, id)} have={p.animals[id] ?? 0} cash={g.cash} onBuy={() => { onNote(g.trade(id, 1)); g.checkJobs(sid); }} onSell={() => onNote(g.trade(id, -1))} />
        ))}
      </div>
    </>
  );
}

/** The animals you own, with what each is doing. */
export function Herd() {
  const g = useGame();
  const p = g.world.party;
  const own = Object.entries(p.animals ?? {}).filter(([id, n]) => n > 0 && BREEDS[id]);
  const sp = speedInfo(p, g.inventory);
  if (!own.length) return <p className="set-demand">No animals. Everyone walks and carries what they can.</p>;
  return (
    <div className="herd" data-testid="herd">
      {own.map(([id, n]) => (
        <div className="herd-item" key={id}>
          <BreedImage breed={BREEDS[id]} size={58} tall={1.15} />
          <span><b>{n}× {BREEDS[id].name}</b><small>load {BREEDS[id].load} · pace {BREEDS[id].ride.toFixed(2)}×</small></span>
        </div>
      ))}
      <p className="set-demand">The caravan moves at the pace of its slowest member: {sp.slowest}.</p>
    </div>
  );
}
