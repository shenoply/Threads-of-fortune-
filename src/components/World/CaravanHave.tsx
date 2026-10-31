// What a caravan tile stands for, in pictures: tap Animals and see your animals, Guards your men,
// Food your sacks, Load what the string carries. Under the tiles, in the page; tap again to fold it.
import { useGame } from '../../game/state/store';
import { AnimalCards } from './AnimalCards';
import { BREEDS } from '../../data/animals';
import { TROOPS, FOOD_PER_LOAD } from '../../data/caravan';
import { RUGS } from '../../data/rugs';
import { rugThumb } from '../RugViewer/rugArt';
import { carried, dailyFood, foodDaysLeft, speedInfo, strength } from '../../game/systems/caravan';

export type HaveKind = 'Food' | 'Pace' | 'Strength' | 'Animals' | 'Guards' | 'Load';

function Card({ img, name, n, line, fallback }: { img: string; name: string; n?: number; line: string; fallback?: string }) {
  return (
    <div className="cvh-card">
      <div className="cvh-pic">
        <img src={img} alt="" loading="lazy" onError={(e) => { if (fallback && !e.currentTarget.src.endsWith(fallback)) e.currentTarget.src = fallback; else e.currentTarget.style.visibility = 'hidden'; }} />
        {n !== undefined && <b className="cvh-n">×{n}</b>}
      </div>
      <span><b>{name}</b><small>{line}</small></span>
    </div>
  );
}

export function CaravanHave({ kind, onMore }: { kind: HaveKind; onMore: () => void }) {
  const g = useGame();
  const p = g.world.party;
  const animals = Object.entries(p.animals ?? {}).filter(([, n]) => (n ?? 0) > 0);
  const troops = Object.entries(p.troops ?? {}).filter(([, n]) => (n ?? 0) > 0);
  const rugs = carried(g.inventory);
  const sp = speedInfo(p, g.inventory);
  const showAnimals = kind === 'Animals' || kind === 'Pace';
  const showMen = kind === 'Guards' || kind === 'Strength';
  const showLoad = kind === 'Load';
  const empty = (showAnimals && !animals.length) || (showMen && !troops.length) || (showLoad && !rugs.length && !p.food);
  return (
    <section className="cv-have" data-testid={`cv-have-${kind.toLowerCase()}`}>
      <header>
        <b>{showAnimals ? 'Your animals' : showMen ? 'Your men' : kind === 'Food' ? 'Your food' : 'What the string carries'}</b>
        <small>
          {kind === 'Food' && `${p.food} rations · eats ${dailyFood(p)} a day · ${foodDaysLeft(p)} days left`}
          {kind === 'Pace' && `${sp.over ? 'Overloaded: slow. ' : ''}${sp.hungry ? 'Out of food: slow. ' : ''}The slowest walks for all.`}
          {showMen && `Strength ${strength(p)}`}
          {kind === 'Animals' && `${animals.reduce((a, [, n]) => a + (n ?? 0), 0)} head`}
          {showLoad && `${Math.round(sp.load * 10) / 10} of ${sp.cap} loads`}
        </small>
      </header>
      {empty && <p className="dim">{showAnimals ? 'No animals yet. Any town sells camels, mules and donkeys.' : showMen ? 'No guards yet. Hire them in any town.' : 'Nothing carried.'}</p>}
      {kind === 'Animals' && animals.length > 0 && <AnimalCards />}
      <div className="cvh-grid">
        {kind === 'Pace' && animals.map(([id, n]) => {
          const b = BREEDS[id];
          return <Card key={id} img={`art/animals/${id}.jpg`} name={b?.name ?? id} n={n} line={b ? `${b.load ? `carries ${b.load}` : 'ridden'} · eats ${b.food}/day` : ''} />;
        })}
        {showMen && troops.map(([id, n]) => {
          const t = TROOPS[id];
          return <Card key={id} img={`art/troops/${id}.jpg`} name={(n ?? 0) > 1 ? t?.plural ?? id : t?.name ?? id} n={n} line={t ? `strength ${t.strength} each · ${t.wage} pt a day` : ''} />;
        })}
        {kind === 'Food' && (
          <>
            <Card img="art/food/aish.webp" name="Bread and grain" n={p.food} line={`${Math.round((p.food / FOOD_PER_LOAD) * 10) / 10} loads on the animals`} />
            <Card img="art/food/adas.webp" name="A day's eating" n={dailyFood(p)} line="rations for every man and beast" />
          </>
        )}
        {showLoad && rugs.map((it) => {
          const t = RUGS[it.typeId];
          return t ? <Card key={it.uid} img={rugThumb(t)} name={t.name} line={it.condition ?? ''} /> : null;
        })}
        {showLoad && p.food > 0 && <Card img="art/food/aish.webp" name="Food" n={p.food} line={`${Math.round((p.food / FOOD_PER_LOAD) * 10) / 10} loads`} />}
      </div>
      <button className="btn small cvh-more" onClick={onMore} data-testid="cv-have-more">More below ↓</button>
    </section>
  );
}
