import { useGame } from '../../game/state/store';
import { Icon } from '../Icon';
import { fmt } from '../../game/economy/money';
import { speedInfo, strength, foodDaysLeft, animalCount, troopCount, wages, dailyFood } from '../../game/systems/caravan';
import { milesPx } from '../../game/systems/mapRender';
import { CaravanRoster, TownSupplies } from './CaravanPanels';
import { settlementById } from '../../game/systems/world';
import type { Target } from './Campaign';

/** Miles a day for a pace in map units a day. */
export const milesPerDay = (pxPerDay: number) => Math.round((pxPerDay * 100) / milesPx(1));

/** Your caravan at a glance: food, pace, strength, animals and guards, and where to buy more. */
export function CaravanScreen({ onGo }: { onGo: (t: Target) => void }) {
  const g = useGame();
  const p = g.world.party;
  const sp = speedInfo(p, g.inventory);
  const food = foodDaysLeft(p);
  const town = g.world.at ? settlementById(g.world.at) : null;
  const tiles: { icon: string; label: string; value: string; warn?: boolean }[] = [
    { icon: 'bag', label: 'Food', value: `${food} day${food === 1 ? '' : 's'}`, warn: food < 3 },
    { icon: 'run', label: 'Pace', value: `${milesPerDay(sp.pxPerDay)} mi/day`, warn: sp.over || sp.hungry },
    { icon: 'shield', label: 'Strength', value: String(strength(p)) },
    { icon: 'camel', label: 'Animals', value: String(animalCount(p)) },
    { icon: 'sword', label: 'Guards', value: String(troopCount(p)), warn: troopCount(p) === 0 },
    { icon: 'scale', label: 'Load', value: `${Math.round(sp.load)}/${sp.cap}`, warn: sp.over },
  ];
  return (
    <div className="screen caravan-screen" data-testid="caravan-screen">
      <div className="screen-head"><div>
        <div className="eyebrow">YOUR CARAVAN</div>
        <h2>{town ? `In ${town.name}` : 'On the road'}</h2>
        <p>Wages {fmt(wages(p))} a day · eats {dailyFood(p)} rations a day{sp.over ? ' · overloaded' : ''}{sp.hungry ? ' · out of food' : ''}</p>
      </div></div>
      <div className="cv-tiles">
        {tiles.map((t) => (
          <div key={t.label} className={`cv-tile ${t.warn ? 'warn' : ''}`}>
            <Icon name={t.icon} />
            <small>{t.label}</small>
            <b>{t.value}</b>
          </div>
        ))}
      </div>
      {town ? (
        <TownSupplies />
      ) : (
        <p className="set-demand">You can buy food, animals and guards in any town or village.</p>
      )}
      {g.world.at === 'giza' && (
        <div className="cv-go">
          <button className="btn" onClick={() => onGo('animals')} data-testid="cv-animals"><Icon name="camel" /> Animal market</button>
          <button className="btn" onClick={() => onGo('guards')} data-testid="cv-guards"><Icon name="sword" /> Hire guards</button>
        </div>
      )}
      <CaravanRoster />
    </div>
  );
}
