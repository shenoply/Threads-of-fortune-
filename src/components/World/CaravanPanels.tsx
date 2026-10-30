import { memo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { nextToGo } from '../../game/systems/men';
import { fmt } from '../../game/economy/money';
import { localMoney } from '../../game/economy/currency';
import { useGame, combatOf, stableOwed, STABLE_FEE } from '../../game/state/store';
import { settlementById } from '../../game/systems/world';
import { PROMOTE, RIFLE_PRICE, RIFLE_SELL } from '../../game/systems/combat';
import { TROOPS, MARKETS, YARD_ART } from '../../data/caravan';
import { BREEDS, ANIMAL_MARKETS, type Breed } from '../../data/animals';
import { animalPrice } from '../../game/state/store';
import { recruitPool, speedInfo, partySize, strength, wages, dailyFood, foodDaysLeft, animalCount, morale as moraleOf } from '../../game/systems/caravan';
import { AnimalPlate } from './AnimalPlate';
import { TroopPage, MenTalk, capLine } from './Troops';
import { troopCount, troopCap, animalCap, strengthCap } from '../../game/systems/caravan';
import { Icon } from '../Icon';
import { provisionsAt, stapleAt, provisionPrice } from '../../data/provisions';
import { LIVESTOCK_BY_ID, flockCount, flockOf, livestockAt, livestockPrice } from '../../data/livestock';
import './provisions.css';

/** One-line caravan status used on the map and in towns. */
// plain numbers from the store, and memo: the map re-renders many times a second on the road, the strip only when a figure moves
export const CaravanStrip = memo(function CaravanStrip() {
  const v = useGame(useShallow((g) => {
    const p = g.world.party;
    const sp = speedInfo(p, g.inventory);
    return { size: partySize(p), animals: animalCount(p), animalCap: animalCap(p), food: foodDaysLeft(p), over: !!sp.over, load: Math.round(sp.load * 10) / 10, cap: sp.cap, mult: sp.mult.toFixed(1), strength: strength(p), strengthCap: strengthCap(p, g.reputation) };
  }));
  return (
    <div className="cstrip" data-testid="caravan-strip">
      <span title="People in your caravan"><Icon name="people" />{v.size}</span>
      <span title="Animals: camels, horses, donkeys and mules (most you can lead)"><Icon name="camel" />{v.animals}<small className="cs-max">/{v.animalCap}</small></span>
      <span className={v.food < 2 ? 'warn' : ''} title="Days of food"><Icon name="bag" />{v.food}d</span>
      <span className={v.over ? 'warn' : ''} title="Load / capacity"><Icon name="scale" />{v.load}/{v.cap}</span>
      <span title="Travel speed"><Icon name="sun" />{v.mult}×</span>
      <span title="Fighting strength (most your name lets you lead)"><Icon name="shield" />{v.strength}<small className="cs-max">/{v.strengthCap}</small></span>
    </div>
  );
});

/** Food, animals and volunteers for the settlement you are in. */
export type SupplyPart = 'food' | 'animals' | 'recruits';
/** a part of the town's supplies, folded to one line on the Caravan tab (remembered open or shut) */
function Part({ fold, id, title, children }: { fold?: boolean; id: string; title: React.ReactNode; children: React.ReactNode }) {
  const key = `tof-cv-${id}`;
  if (!fold) return <>{children}</>;
  let open = false; try { open = localStorage.getItem(key) === '1'; } catch { /* private mode */ }
  return (
    <details className="cv-part" open={open} onToggle={(e) => { try { localStorage.setItem(key, (e.currentTarget as HTMLDetailsElement).open ? '1' : '0'); } catch { /* private mode */ } }} data-testid={`cv-part-${id}`}>
      <summary><span>{title}</span></summary>
      {children}
    </details>
  );
}

export function TownSupplies({ show = ['food', 'animals', 'recruits'], fold = false }: { show?: SupplyPart[]; fold?: boolean }) {
  const g = useGame();
  const [note, setNote] = useState('');
  const sid = g.world.at;
  if (!sid) return null;
  const m = MARKETS[sid];
  if (!m) return null;
  const p = g.world.party;
  const pool = recruitPool(sid, g.day, g.world.hired);
  const [page, setPage] = useState<string | null>(null);
  const full = troopCount(p) >= troopCap(g.reputation);
  const pageRow = page ? pool.find((r) => r.troop === page) : undefined;
  return (
    <div data-testid="town-supplies">
      {page && <TroopPage id={page} onClose={() => setPage(null)} onHire={pageRow ? () => setNote(g.recruit(pageRow.troop, pageRow.key, 1)) : undefined} hireDisabled={!pageRow?.available || g.cash < TROOPS[page].cost || full} hireLabel={full ? 'Your caravan is full' : `Hire one · ${TROOPS[page].cost ? fmt(TROOPS[page].cost) : 'free'}`} />}
      {note && <p className="set-note" data-testid="supply-note">{note}</p>}
      {show.includes('food') && (<>
      <div className="section-label" id="cv-food">PROVISIONS</div>
      <p className="set-demand prov-sum" data-testid="food-summary">You have {p.food} ration{p.food === 1 ? '' : 's'}, the caravan eats {dailyFood(p)} a day ({foodDaysLeft(p)} day{foodDaysLeft(p) === 1 ? '' : 's'}).</p>
      <div className="mkt prov">
        {provisionsAt(sid).map((it) => {
          const staple = it.id === stapleAt(sid)?.id;
          const each = provisionPrice(it, 1, m.food);
          const gives = it.rations ? `${localMoney(each, sid, g.day)} a ration` : `${localMoney(each, sid, g.day)}, cheers the men`;
          const buy = (n: number, testid?: string, label = `+${n}`, primary = false) => (
            <button className={primary ? 'btn primary' : 'btn'} onClick={() => setNote(g.buyProvision(it.id, n))} disabled={g.cash < provisionPrice(it, n, m.food)} data-testid={testid ?? `buy-prov-${it.id}-${n}`}>{label}</button>
          );
          return (
            <div className="mkt-row prov-row" key={it.id} data-testid={`prov-${it.id}`}>
              <img className="prov-pic" src={`art/food/${it.id}-128.webp`} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              <span><b>{it.name}</b><small>{it.line} {gives}.</small></span>
              {staple ? (<>
                {buy(5, 'buy-food-5')}
                {buy(dailyFood(p) * 5, 'buy-food-days', '5 days', true)}
              </>) : (<>
                {buy(1)}
                {it.rations > 0 && buy(5)}
              </>)}
            </div>
          );
        })}
      </div>
      {livestockAt(sid).length > 0 && (<>
        <div className="section-label">FOR THE POT · LIVESTOCK</div>
        <p className="set-demand">They walk with you and graze as they go. Milk and eggs come each morning, and when the sacks run out one is slaughtered.{flockCount(p) ? ` With you: ${flockOf(p).map(([id, n]) => `${n} ${n === 1 ? LIVESTOCK_BY_ID[id].name.toLowerCase() : LIVESTOCK_BY_ID[id].plural}`).join(', ')}.` : ''}</p>
        <div className="mkt prov">
          {livestockAt(sid).map((l) => {
            const price = livestockPrice(l, m.food);
            const have = p.flock?.[l.id] ?? 0;
            return (
              <div className="mkt-row prov-row" key={l.id} data-testid={`stock-${l.id}`}>
                <img className="prov-pic" src={`art/animals/${l.id}.jpg`} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                <span><b>{l.name}{have ? ` · ${have} with you` : ''}</b><small>{l.line} {l.meat} rations of meat{l.daily ? `, ${l.daily >= 1 ? 'a ration' : 'half a ration'} a day of ${l.id.startsWith('hens') ? 'eggs' : 'milk'}` : ''}{l.pace < 0.99 ? '; slows the caravan' : ''}.</small></span>
                <button className="btn" onClick={() => setNote(g.buyLivestock(l.id))} disabled={g.cash < price} data-testid={`buy-${l.id}`}>{localMoney(price, sid, g.day)}</button>
                {have > 0 && <button className="btn" onClick={() => setNote(g.slaughterLivestock(l.id))} data-testid={`pot-${l.id}`}>To the pot</button>}
              </div>
            );
          })}
        </div>
      </>)}
      </>)}
      {show.includes('animals') && <Part fold={fold} id="animals" title={<><b>Animals</b> · {animalCount(p)} of {animalCap(p)} in your string</>}><BreedMarket sid={sid} onNote={setNote} /><Stable sid={sid} onNote={setNote} /></Part>}
      {show.includes('recruits') && <Part fold={fold} id="guards" title={<><b>Guards</b> · {troopCount(p)} of {troopCap(g.reputation)} with you{pool.length ? ` · ${pool.reduce((n, r) => n + r.available, 0)} for hire here` : ''}</>}>
      {pool.length === 0 && (
        <>
          <div className="section-label">HIRE GUARDS</div>
          <p className="set-demand">Nobody here hires out as a guard. Try Giza's guard yard, Cairo, Alexandria or the Bedouin camp.</p>
        </>
      )}
      {pool.length > 0 && (
        <>
          <div className="section-label" id="sec-hire">HIRE GUARDS</div>
          <p className="set-demand">Guards fight off raiders on the road. Each is paid every morning and eats a ration a day; unpaid men go home. Tap a man to read about his kind. <b data-testid="troop-cap">{capLine(troopCount(p), g.reputation)}.</b></p>
          <div className="mkt">
            {pool.map((r) => {
              const t = TROOPS[r.troop];
              return (
                <div className="mkt-row troop-row" key={r.key} data-testid={`recruit-${r.troop}`}>
                  <img className="troop-pic tappable" src={`art/troops/${r.troop}.jpg`} alt={t.name} onClick={() => setPage(r.troop)} data-testid={`troop-info-${r.troop}`} />
                  <span className="troop-name-btn" onClick={() => setPage(r.troop)}><b>{r.available} {r.available === 1 ? t.name : t.plural}</b><small>{t.blurb} Strength {t.strength}, wage {fmt(t.wage)} a day{t.scout ? ', scouts ahead' : ''}.</small></span>
                  <button className="btn primary" disabled={!r.available || g.cash < t.cost || full} onClick={() => setNote(g.recruit(r.troop, r.key, 1))} data-testid={`hire-${r.troop}`}>Hire {t.cost ? fmt(t.cost) : "free"}</button>
                </div>
              );
            })}
            {pool.every((r) => !r.available) && <p className="set-demand">Nobody else wants work today. Come back tomorrow.</p>}
          </div>
          {YARD_ART[sid] && <RifleRack onNote={setNote} />}
          {YARD_ART[sid] && !fold && <img className="yard-hero" src={`art/troops/${YARD_ART[sid]}.jpg`} alt="" />}
        </>
      )}
      </Part>}
    </div>
  );
}

/** A guard yard's rifles: better ones for your men, and a buyer for the ones you took on the road. */
function RifleRack({ onNote }: { onNote: (s: string) => void }) {
  const g = useGame();
  const c = combatOf(g);
  const men = troopCount(g.world.party);
  return (
    <>
      <div className="section-label">RIFLES</div>
      <div className="mkt">
        <div className="mkt-row rifle-row" data-testid="rifle-buy-row">
          <span><b>A good rifle for one of your men</b><small>A Lee-Enfield and a belt of cartridges. Each rifle makes one man count for more in a fight. Your men carry {c.rifles} of them{men ? `, for ${men} ${men === 1 ? 'man' : 'men'}` : ''}.</small></span>
          <button className="btn primary" disabled={g.cash < RIFLE_PRICE || c.rifles >= men} onClick={() => onNote(g.buyRifle())} data-testid="buy-rifle">{c.rifles >= men && men > 0 ? 'Every man has one' : `Buy · ${fmt(RIFLE_PRICE)}`}</button>
        </div>
        {c.spare > 0 && (
          <div className="mkt-row rifle-row" data-testid="rifle-sell-row">
            <span><b>{c.spare} {c.spare === 1 ? 'rifle' : 'rifles'} taken on the road</b><small>Old pieces, but the yard will buy them.</small></span>
            <button className="btn" onClick={() => onNote(g.sellRifles())} data-testid="sell-rifles">Sell · {fmt(c.spare * RIFLE_SELL)}</button>
          </div>
        )}
      </div>
    </>
  );
}

/** Your men, animals and supplies, with the option to send people home. */
export function CaravanRoster() {
  const g = useGame();
  const p = g.world.party;
  const sp = speedInfo(p, g.inventory);
  const troops = Object.entries(p.troops).filter(([, n]) => n > 0);
  const [page, setPage] = useState<string | null>(null);
  const [talk, setTalk] = useState(false);
  return (
    <div data-testid="caravan-roster">
      {page && <TroopPage id={page} onClose={() => setPage(null)} />}
      {talk && <MenTalk onClose={() => setTalk(false)} />}
      <div className="section-label" id="cv-men">YOUR MEN</div>
      {troops.length === 0 ? (
        <p className="set-demand">No guards. Raiders will come looking for you. Hire men in villages, towns and the Bedouin camp.</p>
      ) : (
        <div className="mkt">
          <div className="mkt-row" data-testid="caravan-morale">
            <span style={{ flex: 1 }}>
              <b>Men's patience</b>
              <small>{moraleOf(p) <= 25 ? 'Close to someone walking' : moraleOf(p) <= 50 ? 'Grumbling: keep them fed and paid' : 'Steady'}</small>
            </span>
            <Stat label="" v={moraleOf(p)} max={100} />
            <button className="btn" onClick={() => setTalk(true)} data-testid="talk-to-men">Talk to your men</button>
          </div>
          <p className="set-demand" data-testid="troop-cap-roster">{capLine(troopCount(p), g.reputation)}. A bigger name brings more men who will follow you.</p>
          {troops.map(([id, n]) => (
            <div className="mkt-row" key={id}>
              <img className="troop-pic small tappable" src={`art/troops/${id}.jpg`} alt={TROOPS[id].name} onClick={() => setPage(id)} data-testid={`roster-info-${id}`} />
              <span className="troop-name-btn" onClick={() => setPage(id)}><b>{n} {n === 1 ? TROOPS[id].name : TROOPS[id].plural}</b><small>Strength {TROOPS[id].strength} each · {fmt(TROOPS[id].wage)} a day each{PROMOTE[id] ? ` · road experience ${Math.floor(combatOf(g).xp[id] ?? 0)} of ${PROMOTE[id].xp}: then one becomes a ${((n: string) => (/^(Cairo|Giza|Bedouin|Arnaut|Alexandria)\b/.test(n) ? n : n[0].toLowerCase() + n.slice(1)))(TROOPS[PROMOTE[id].to].name)}` : ''}{id === 'veteran' && combatOf(g).sergeant ? ` · Sergeant ${combatOf(g).sergeant!.name} leads them` : ''}</small></span>
              <button className="btn" onClick={() => g.dismiss(id, 1)} data-testid={`dismiss-${id}`}>{(() => { const m = nextToGo(g.combat?.men ?? [], id); return m ? `Send ${m.name.split(' ')[0]} home` : 'Send one home'; })()}</button>
            </div>
          ))}
        </div>
      )}
      <div className="section-label" id="cv-string">YOUR STRING AND LOAD</div>
      <CaravanStrip />
      <Herd />
      <p className="set-demand" style={{ marginTop: 6 }}>
        Wages {fmt(wages(p))} a day · food {dailyFood(p)} ration{dailyFood(p) === 1 ? '' : 's'} a day · {sp.over ? 'overloaded, moving slowly' : `carrying ${Math.round(sp.load)} of ${sp.cap} loads`}
        {sp.hungry ? ' · out of food' : ''}
      </p>
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
      <p className="set-demand" data-testid="animal-cap">You lead {animalCount(p)} of {animalCap(p)} animals: two for each person in the caravan.</p>
      <div className="breeds">
        {[...sold, ...owned].map((id) => (
          <BreedCard key={id} breed={BREEDS[id]} price={animalPrice(sid, id)} have={p.animals[id] ?? 0} cash={animalCount(p) >= animalCap(p) ? 0 : g.cash} onBuy={() => { onNote(g.trade(id, 1)); g.checkJobs(sid); }} onSell={() => onNote(g.trade(id, -1))} />
        ))}
      </div>
    </>
  );
}

/** The town's stable: leave animals you do not need on this road, fed and watered for a small fee a
 *  day, and take them back the next time you pass. One lot per town. */
const STABLE_KINDS = new Set(['home', 'city', 'town', 'port']);
function Stable({ sid, onNote }: { sid: string; onNote: (s: string) => void }) {
  const g = useGame();
  const st = settlementById(sid);
  if (!st || !STABLE_KINDS.has(st.kind)) return null;
  const p = g.world.party;
  const own = Object.entries(p.animals ?? {}).filter(([id, n]) => n > 0 && BREEDS[id]);
  const lot = g.stabled?.[sid];
  const kept = lot ? Object.entries(lot.animals).filter(([, n]) => n > 0) : [];
  const elsewhere = Object.entries(g.stabled ?? {}).filter(([t]) => t !== sid);
  if (!own.length && !kept.length && !elsewhere.length) return null;
  const owed = lot ? stableOwed(lot, g.day) : 0;
  const n = kept.reduce((a, [, k]) => a + k, 0);
  return (
    <div data-testid="stable">
      <div className="section-label">THE STABLE</div>
      <p className="set-demand">Leave an animal here and the keeper feeds and waters it: {fmt(STABLE_FEE.camel)} a day for a camel or horse, {fmt(STABLE_FEE.donkey)} for a donkey or mule. You pay when you take it back.</p>
      {kept.length > 0 && (
        <div className="mkt-row stable-row" data-testid="stable-kept">
          <span><b>Here: {kept.map(([id, k]) => `${k} ${BREEDS[id].name}${k > 1 ? 's' : ''}`).join(', ')}</b><small>{g.day - lot!.since === 0 ? 'Left today' : `In for ${g.day - lot!.since} day${g.day - lot!.since === 1 ? '' : 's'}`}{owed ? `, ${fmt(owed)} owed` : ''}.</small></span>
          <button className="btn primary" disabled={g.cash < owed} onClick={() => onNote(g.fetchStabled())} data-testid="stable-fetch">Take {n > 1 ? 'them' : 'it'} back{owed ? ` · ${fmt(owed)}` : ''}</button>
        </div>
      )}
      {own.map(([id, k]) => (
        <div className="mkt-row stable-row" key={id} data-testid={`stable-own-${id}`}>
          <span><b>{k}× {BREEDS[id].name} with you</b><small>{fmt(STABLE_FEE[BREEDS[id].kind] ?? 2)} a day here.</small></span>
          <button className="btn" onClick={() => onNote(g.stableAnimal(id))} data-testid={`stable-leave-${id}`}>Leave one here</button>
        </div>
      ))}
      {elsewhere.length > 0 && <p className="set-demand" data-testid="stable-elsewhere">At other stables: {elsewhere.map(([t, l]) => `${Object.values(l.animals).reduce((a, k) => a + k, 0)} in ${settlementById(t)?.name ?? t} (${fmt(stableOwed(l, g.day))} owed)`).join('; ')}.</p>}
    </div>
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
      <p className="set-demand">The caravan moves at the pace of its slowest member: {Object.values(BREEDS).find((b) => b.name.toLowerCase() === sp.slowest)?.name ?? sp.slowest}.</p>
    </div>
  );
}
