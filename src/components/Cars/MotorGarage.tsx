import { useState } from 'react';
import { useGame } from '../../game/state/store';
import { CARS_ON, CAR_BY_ID, CAR_FREIGHT, GARAGE_TOWNS, RESALE, carsSoldIn, roadsLine, type CarModel } from '../../data/cars';
import { SEA_ROUTES } from '../../data/world';
import { settlementById } from '../../game/systems/world';
import { fmt } from '../../game/economy/money';
import { CarTurntable } from './CarTurntable';
import './cars.css';

const garageArt = (city: string) => `art/garages/garage-${city}.jpg`;
const specLine = (m: CarModel) => `${m.seats} seats, you included · ${m.luggage} rug${m.luggage === 1 ? '' : 's'} · about ${fmt(m.perHour)} an hour in petrol`;

/** The garage's header picture, if it has been drawn; nothing at all if not. */
function GarageArt({ city }: { city: string }) {
  const [gone, setGone] = useState(false);
  if (gone) return null;
  return <img className="garage-art" src={garageArt(city)} alt="" onError={() => setGone(true)} data-testid="garage-art" />;
}

/** Where your car stands, in a line, in every town; here, what you can do with it. */
export function CarWhere({ id, onNote }: { id: string; onNote: (t: string) => void }) {
  if (!CARS_ON) return null;
  const car = useGame((s) => s.car);
  const cash = useGame((s) => s.cash);
  const shipCar = useGame((s) => s.shipCar);
  if (!car) return null;
  const m = CAR_BY_ID[car.model];
  if (!m) return null;
  const here = car.at === id;
  const ports = here ? SEA_ROUTES.filter((r) => r.a === id || r.b === id).map((r) => (r.a === id ? r.b : r.a)) : [];
  return (
    <div className="car-where" data-testid="car-where">
      <span>{here ? <>Your <b>{m.name}</b> stands here. Tap a town on the map to drive.</> : <>Your <b>{m.name}</b> is in {settlementById(car.at).name}.</>}</span>
      {ports.length > 0 && (
        <span className="car-ship">
          {ports.map((to) => (
            <button key={to} className="btn small" disabled={cash < CAR_FREIGHT} onClick={() => onNote(shipCar(to))} data-testid={`car-ship-${to}`}>Ship it to {settlementById(to).name} · {fmt(CAR_FREIGHT)}</button>
          ))}
        </span>
      )}
    </div>
  );
}

/** The motor garage in Cairo, Jaffa, Beirut or Baghdad: its cars, each with a page of its own. */
export function MotorGarage({ id, onNote }: { id: string; onNote: (t: string) => void }) {
  const cash = useGame((s) => s.cash);
  const car = useGame((s) => s.car);
  const buyCar = useGame((s) => s.buyCar);
  const sellCar = useGame((s) => s.sellCar);
  const [open, setOpen] = useState<string | null>(null);
  if (!GARAGE_TOWNS.includes(id)) return null;
  const models = carsSoldIn(id);
  const own = car ? CAR_BY_ID[car.model] : undefined;
  return (
    <div className="garage" id="sec-garage" data-testid="motor-garage">
      <div className="section-label">MOTOR GARAGE</div>
      <GarageArt city={id} />
      <p className="set-demand">Motor cars run only on the roads that take them: through Egypt to Suez, Palestine, the coast to Beirut, over the Lebanon to Damascus, and up the Persian road. The car stays where you leave it.</p>
      {own && car && car.at === id && (
        <div className="garage-own" data-testid="garage-own">
          <span><b>Your {own.name}</b><small>The garage will give you {fmt(Math.round(own.price * RESALE))} for it.</small></span>
          <button className="btn small" onClick={() => onNote(sellCar())} data-testid="car-sell">Sell · {fmt(Math.round(own.price * RESALE))}</button>
        </div>
      )}
      <div className="garage-list">
        {models.map((m) => {
          const shown = open === m.id;
          return (
            <div key={m.id} className={`garage-car${shown ? ' open' : ''}`} data-testid={`garage-${m.id}`}>
              <button className="garage-row" onClick={() => setOpen(shown ? null : m.id)} aria-expanded={shown} data-testid={`garage-open-${m.id}`}>
                <span><b>{m.name}</b><small>{specLine(m)}</small></span>
                <em>{fmt(m.price)}</em>
              </button>
              {shown && (
                <div className="garage-page" data-testid="garage-page">
                  <CarTurntable id={m.id} />
                  <p>{m.blurb}</p>
                  <dl className="garage-specs">
                    <dt>Price</dt><dd>{fmt(m.price)}</dd>
                    <dt>Seats</dt><dd>{m.seats}, you included</dd>
                    <dt>Rugs carried</dt><dd>{m.luggage}</dd>
                    <dt>Pace</dt><dd>{m.speed === 1 ? 'A light tourer\'s' : m.speed > 1 ? `A little quicker than a light tourer` : 'Slow: a little over half a tourer\'s pace'}</dd>
                    <dt>Running</dt><dd>About {fmt(m.perHour)} an hour in petrol and oil</dd>
                    <dt>Roads</dt><dd>{roadsLine(m)}</dd>
                    {m.rested && <><dt>Comfort</dt><dd>You arrive rested{m.rep ? '; owning one lifts your name once' : ''}</dd></>}
                  </dl>
                  <button className="btn primary" disabled={!!car || cash < m.price} onClick={() => { onNote(buyCar(m.id)); setOpen(null); }} data-testid={`car-buy-${m.id}`}>
                    {car ? 'You own a car already: one at a time' : cash < m.price ? `${fmt(m.price)} · you have ${fmt(cash)}` : `Buy · ${fmt(m.price)}`}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** "Your motor car" on the caravan page: the model, where it is, drives made, and selling it. */
export function OwnCarRow() {
  if (!CARS_ON) return null;
  const car = useGame((s) => s.car);
  const at = useGame((s) => s.world.at);
  const sellCar = useGame((s) => s.sellCar);
  const [look, setLook] = useState(false);
  const [note, setNote] = useState('');
  if (!car) return null;
  const m = CAR_BY_ID[car.model];
  if (!m) return null;
  const canSell = at === car.at && GARAGE_TOWNS.includes(car.at);
  return (
    <div className="own-car" data-testid="own-car">
      <div className="section-label">YOUR MOTOR CAR</div>
      <div className="garage-own">
        <span>
          <b>{m.name}</b>
          <small>In {settlementById(car.at).name} · {car.trips} drive{car.trips === 1 ? '' : 's'} · {specLine(m)}</small>
        </span>
        <button className="btn small" onClick={() => setLook(!look)} aria-expanded={look} data-testid="own-car-look">{look ? 'Close' : 'Look'}</button>
        <button className="btn small" disabled={!canSell} onClick={() => setNote(sellCar())} title={canSell ? undefined : 'Sell it at a motor garage where it stands'} data-testid="own-car-sell">Sell · {fmt(Math.round(m.price * RESALE))}</button>
      </div>
      {!canSell && <p className="dim small">To sell it, be with it in a town with a motor garage (Cairo, Jaffa, Beirut or Baghdad).</p>}
      {look && <CarTurntable id={m.id} compact />}
      {note && <p className="dim small" data-testid="own-car-note">{note}</p>}
    </div>
  );
}
