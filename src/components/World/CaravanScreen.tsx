import { useState } from 'react';
import { useGame } from '../../game/state/store';
import { FOOD_PER_LOAD } from '../../data/caravan';
import { Icon } from '../Icon';
import { fmt } from '../../game/economy/money';
import { speedInfo, strength, foodDaysLeft, animalCount, troopCount, wages, dailyFood, carried, strengthCap, animalCap, troopCap } from '../../game/systems/caravan';
import { BREEDS } from '../../data/animals';
import { milesPx } from '../../game/systems/mapRender';
import { CaravanRoster, TownSupplies } from './CaravanPanels';
import { CaravanHave, type HaveKind } from './CaravanHave';
import { OwnCarRow } from '../Cars/MotorGarage';
import { settlementById } from '../../game/systems/world';
import type { Target } from './Campaign';

/** Miles a day for a pace in map units a day. */
export const milesPerDay = (pxPerDay: number) => Math.round((pxPerDay * 100) / milesPx(1));

/** Your caravan at a glance: food, pace, strength, animals and guards, and where to buy more. */
export function CaravanScreen({ onGo }: { onGo: (t: Target) => void }) {
  const g = useGame();
  const [note, setNote] = useState('');
  const [have, setHave] = useState<HaveKind | null>(null);
  const p = g.world.party;
  const sp = speedInfo(p, g.inventory);
  const food = foodDaysLeft(p);
  const town = g.world.at ? settlementById(g.world.at) : null;
  // each tile is a way into its own part of the page
  const tiles: { icon: string; label: string; value: string; max?: number; warn?: boolean; to: string }[] = [
    { icon: 'bag', label: 'Food', value: `${food} day${food === 1 ? '' : 's'}`, warn: food < 3, to: 'cv-food' },
    { icon: 'run', label: 'Pace', value: `${milesPerDay(sp.pxPerDay)} mi/day`, warn: sp.over || sp.hungry, to: sp.over ? 'cv-over' : 'cv-string' },
    { icon: 'shield', label: 'Strength', value: String(strength(p)), max: strengthCap(p, g.reputation), to: 'cv-men' },
    { icon: 'camel', label: 'Animals', value: String(animalCount(p)), max: animalCap(p), to: 'cv-string' },
    { icon: 'sword', label: 'Guards', value: String(troopCount(p)), max: troopCap(g.reputation), warn: troopCount(p) === 0, to: 'cv-men' },
    { icon: 'scale', label: 'Load', value: `${Math.round(sp.load)}/${sp.cap}`, warn: sp.over, to: sp.over ? 'cv-over' : 'cv-string' },
  ];
  const jump = (id: string) => {
    const el = document.getElementById(id) ?? document.getElementById('cv-men');
    if (el instanceof HTMLDetailsElement) el.open = true;
    el?.scrollIntoView({ block: 'start' });
  };
  return (
    <div className="screen caravan-screen" data-testid="caravan-screen">
      <div className="screen-head"><div>
        <div className="eyebrow">YOUR CARAVAN</div>
        <h2>{town ? `In ${town.name}` : 'On the road'}</h2>
        <p>Wages {fmt(wages(p))} a day · eats {dailyFood(p)} ration{dailyFood(p) === 1 ? "" : "s"} a day{sp.over ? ' · overloaded' : ''}{sp.hungry ? ' · out of food' : ''}</p>
      </div></div>
      <div className="cv-tiles">
        {tiles.map((t) => (
          <button key={t.label} className={`cv-tile ${t.warn ? 'warn' : ''}${have === t.label ? ' on' : ''}`} onClick={() => setHave((h) => (h === t.label ? null : t.label as HaveKind))} aria-expanded={have === t.label} data-testid={`cv-tile-${t.label.toLowerCase()}`}>
            <Icon name={t.icon} />
            <small>{t.label}</small>
            <b>{t.value}{t.max !== undefined && <small className="cv-max"> / {t.max}</small>}</b>
          </button>
        ))}
      </div>
      {have && <CaravanHave kind={have} onMore={() => jump(tiles.find((t) => t.label === have)?.to ?? 'cv-men')} />}
      {/* your men first: who walks with you matters more than the shop below */}
      <CaravanRoster />
      <OwnCarRow />
      {sp.over && (
        <div className="cv-over" id="cv-over" data-testid="cv-over">
          <p><b>Overloaded:</b> {Math.round(sp.load * 10) / 10} loads, and the caravan can carry {sp.cap}. You move slowly until you lighten it.</p>
          <small>{carried(g.inventory).length} rug{carried(g.inventory).length === 1 ? '' : 's'} carried · food {Math.round((p.food / FOOD_PER_LOAD) * 10) / 10} loads ({p.food} rations)</small>
          <div className="cv-over-acts">
            {p.food >= 5 && <button className="btn" onClick={() => setNote(g.dropFood(5))} data-testid="drop-food-5">Leave 5 rations</button>}
            {p.food > dailyFood(p) * 3 && <button className="btn" onClick={() => setNote(g.dropFood(p.food - dailyFood(p) * 3))} data-testid="drop-food-keep3">Keep 3 days of food</button>}
            {g.world.at === 'giza' && <button className="btn" onClick={() => window.dispatchEvent(new Event('tof:open-stock'))} data-testid="cv-leave-rugs">Leave rugs at the stall</button>}
          </div>
          {note && <p className="dim small" data-testid="cv-over-note">{note}</p>}
          {!town && <p className="dim small">An animal from any town or village carries more; rugs can be left at the Giza stall or at a shop of your own.</p>}
        </div>
      )}
      {town ? (
        <TownSupplies fold />
      ) : (
        <>
          <p className="set-demand" id="cv-food" data-testid="cv-food">You can buy food, animals and guards in any town or village.</p>
          {food <= 0 && animalCount(p) > 0 && (
            <div className="cv-butcher" data-testid="cv-butcher">
              <p className="set-demand warn">The sacks are empty out here. As a last resort, you can butcher a pack animal for meat: you lose it for good.</p>
              {Object.entries(p.animals).filter(([, n]) => n > 0).map(([id, n]) => (
                <div className="mkt-row" key={id}>
                  <span><b>{BREEDS[id]?.name ?? id}</b><small>{n} in your string</small></span>
                  <button className="btn" onClick={() => g.butcherAnimal(id)} data-testid={`butcher-${id}`}>Butcher</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
