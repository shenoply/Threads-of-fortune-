import { useState } from 'react';
import { useGame } from '../../game/state/store';
import { fmt } from '../../game/economy/money';
import { dateFor } from '../../game/economy/economy';
import { standings, placeIn, seasonEnd, seasonName, seasonAhead, SEASON_PRIZE, ordinal, cityName, tableOf, standing, firstCities, type RanksState } from '../../game/systems/ranks';
import { RIVAL } from '../../data/rivals';
import { Fold } from '../Fold/Fold';
import './rankTable.css';

/** a rival's portrait, or his initial on a medallion until the picture has loaded */
function Medallion({ id, name }: { id: string; name: string }) {
  const [ok, setOk] = useState(false);
  const [gone, setGone] = useState(false);
  const letter = name.replace(/^(Signora|Hajj|Haj|Abu|Abdel-|Hüsnü Bey)\s*/, '').charAt(0);
  return (
    <span className="rk-med" aria-hidden="true">
      {!ok && <b>{letter}</b>}
      {!gone && <img src={`art/portraits/small/${id}.webp`} alt="" loading="lazy" style={ok ? undefined : { opacity: 0 }} onLoad={() => setOk(true)} onError={() => setGone(true)} />}
    </span>
  );
}

/** the town's short tile line: your place this season, if you have sold here */
export function rankLine(r: RanksState | undefined, town: string) {
  const c = tableOf(town);
  if (!c || !r?.seen.includes(c)) return undefined;
  const { place, of, value } = placeIn(r, c);
  return value > 0 ? `You are ${ordinal(place)} of ${of} this season` : `Nothing sold here yet this season`;
}
/** the chip on the map beside a city's name */
export function rankChip(r: RanksState | undefined, city: string) {
  if (!r?.seen.includes(city) || !((r.tables[city]?.you ?? 0) > 0)) return undefined;
  return ordinal(placeIn(r, city).place);
}

/** The town's table: every house's rug sales this season, yours among them, and what standing brings. */
/** `inFold`: drawn inside Progress's fold, with its own test ids (the town page has the plain ones) */
export function RankTable({ town, inFold = false }: { town: string; inFold?: boolean }) {
  const g = useGame();
  const city = tableOf(town);
  if (!city) return null;
  const r = g.ranks;
  const rows = standings(r, city);
  const end = seasonEnd(r?.season ?? 0);
  const best = standing(r, city);
  const cut = r?.undercut?.[city];
  const first = firstCities(g).includes(city);
  return (
    <div className="rank-table" id={inFold ? undefined : 'sec-ranks'} data-testid={inFold ? 'fold-rank-table' : 'rank-table'}>
      <div className="section-label">THE RUG TRADE OF {cityName(city).toUpperCase()}</div>
      <small className="rk-when">Sales in {seasonName(r?.season ?? 0)}, to {dateFor(end).short}{town !== city ? `. Your stall's sales count in ${cityName(city)}` : ''}.</small>
      <ol className="rk-rows">
        {rows.map((x, i) => (
          <li key={x.id} className={x.you ? 'rk-you' : x.rival ? 'rk-named' : ''} data-testid={`${inFold ? 'fold-' : ''}${x.you ? 'rank-you' : `rank-row-${x.id}`}`}>
            <span className="rk-n">{i + 1}</span>
            {x.rival ? <Medallion id={x.id} name={x.label} /> : <span className="rk-med rk-plain" aria-hidden="true" />}
            <span className="rk-who"><b>{x.you ? 'You' : x.label}</b>{x.role && <small>{x.role}</small>}</span>
            <span className="rk-v">{fmt(x.value)}</span>
          </li>
        ))}
      </ol>
      {cut && cut.until >= g.day && <p className="rk-note">{RIVAL[cut.by]?.name ?? 'A rival'} is cutting prices here until {dateFor(cut.until).short}. Dealers pay you less.</p>}
      <ul className="rk-perks">
        <li className={best <= 10 ? 'on' : ''}>Top ten: the auction houses here waive their premium for you.</li>
        <li className={best <= 3 ? 'on' : ''}>Top three: hotels and consulates may send you an order on a Monday, and at the season's end the dealers send a purse ({fmt(SEASON_PRIZE[3].cash)} to {fmt(SEASON_PRIZE[1].cash)}).</li>
        <li className={first ? 'on' : ''}>First at a season's end: the title First Merchant of {cityName(city)}, and dealers here sell to you a little cheaper.</li>
      </ul>
    </div>
  );
}

/** Progress: one row per city you have sold in. */
export function RanksFold() {
  const g = useGame();
  const r = g.ranks ?? { season: 0, tables: {}, seen: [], firsts: [], reacted: [] };
  const seen = r.seen.length ? r.seen : ['cairo'];
  const [pick, setPick] = useState<string | null>(null);
  const city = pick && seen.includes(pick) ? pick : seen[0];
  const parts = seen.map((c) => ({ c, ...placeIn(r, c) }));
  const gist = parts.filter((p) => p.value > 0).map((p) => `${cityName(p.c)} ${ordinal(p.place)}`).join(' · ') || 'No sales yet this season';
  return (
    <Fold id="pr-ranks" title="Among the dealers" gist={gist} testid="ranks-fold">
      <div className="rk-sum" data-testid="ranks-summary">
        <small>{seasonName(r.season).replace(/^the /, '').replace(/^./, (x) => x.toUpperCase())}, to {dateFor(seasonEnd(r.season)).short}</small>
        {parts.map((p) => (
          <div key={p.c} className="rk-sum-row"><b>{cityName(p.c)}</b><span>{p.value > 0 ? `${ordinal(p.place)} of ${p.of}` : 'not yet'}</span><span>{fmt(p.value)}</span></div>
        ))}
        {r.firsts.length > 0 && <small>First Merchant of {r.firsts.map(cityName).join(', ')}.</small>}
      </div>
      {seen.length > 1 && (
        <div className="wire-towns" data-testid="ranks-cities">
          {seen.map((c) => <button key={c} className={`btn small ${c === city ? 'primary' : ''}`} onClick={() => setPick(c)} data-testid={`ranks-city-${c}`}>{cityName(c)}</button>)}
        </div>
      )}
      <RankTable town={city} inFold />
    </Fold>
  );
}

/** Monday morning: where you stand on the tables after the week, with the week's movement. Part of the
 *  morning card, not a pop-up of its own. */
export function WeekTables() {
  const r = useGame((s) => s.ranks);
  if (!r?.week) return null;
  const cities = Object.keys(r.week.now).sort((a, b) => r.week!.now[a] - r.week!.now[b]).slice(0, 2);
  if (!cities.length) return null;
  return (
    <div className="wk-tables" data-testid="week-tables">
      <small className="wk-head">THE WEEK ON THE TABLES</small>
      {cities.map((c) => {
        const rows = standings(r, c);
        const at = rows.findIndex((x) => x.you);
        const was = r.week!.prev[c];
        const move = was ? was - (at + 1) : 0;
        const show = rows.slice(0, 3).concat(at >= 3 ? [rows[at]] : []);
        return (
          <div key={c} className="wk-city">
            <b className="wk-name">{cityName(c)} <em className={move > 0 ? 'up' : move < 0 ? 'down' : ''}>{ordinal(at + 1)} of {rows.length}{move > 0 ? ` ▲${move}` : move < 0 ? ` ▼${-move}` : was ? ' · held' : ''}</em></b>
            <ol>
              {show.map((x) => <li key={x.id} className={x.you ? 'you' : ''}><span>{rows.indexOf(x) + 1}</span><span>{x.you ? 'You' : x.label}</span><span>{fmt(x.value)}</span></li>)}
            </ol>
          </div>
        );
      })}
      <button className="ghost-btn" onClick={() => window.dispatchEvent(new CustomEvent('tof:open-tables'))} data-testid="week-tables-all">All the tables ›</button>
    </div>
  );
}

/** The morning after a season ends: where you finished in each city's table, the purse for a place in
 *  the first three, and what the season coming brings. For the morning card (`day` is the new day). */
export function SeasonEnd({ day }: { day: number }) {
  const l = useGame((s) => s.ranks?.last);
  if (!l || l.day !== day) return null;
  const cities = Object.keys(l.places).sort((a, b) => l.places[a] - l.places[b]);
  const purse = Object.values(l.prizes ?? {}).reduce((a, x) => a + x.cash, 0);
  const name = Object.values(l.prizes ?? {}).reduce((a, x) => a + x.rep, 0);
  return (
    <div className="wk-tables season-end" data-testid="season-end">
      <small className="wk-head">THE END OF {seasonName(l.season).replace(/^the /, '').toUpperCase()}</small>
      {!cities.length && <p className="season-end-line">You sold in none of the cities that keep a table this season.</p>}
      {cities.length > 0 && (
        <div className="wk-city">
          <ol>
            {cities.map((c) => {
              const top = l.tops[c]?.[0];
              const pz = l.prizes?.[c];
              return (
                <li key={c} className={l.places[c] <= 3 ? 'you' : ''} data-testid={`season-end-${c}`}>
                  <span>{l.places[c]}</span>
                  <span>{cityName(c)}{l.places[c] === 1 ? ': First Merchant' : top ? ` · first, ${top.label}` : ''}</span>
                  <span>{pz ? `+${fmt(pz.cash)}` : ordinal(l.places[c])}</span>
                </li>
              );
            })}
          </ol>
        </div>
      )}
      {purse > 0 && <p className="season-end-line" data-testid="season-end-prize">The dealers send a purse of <b>{fmt(purse)}</b> for a place among the first three, and your name stands higher (reputation +{name}).</p>}
      <p className="season-end-line" data-testid="season-end-next">{seasonAhead(l.season + 1)} Every table starts again from nothing.</p>
    </div>
  );
}

/** a short line for the stall: your place in Cairo's table, a tap away from the full tables */
export function TablesLink() {
  const r = useGame((s) => s.ranks);
  const c = r?.seen.find((x) => (r.tables[x]?.you ?? 0) > 0 && x === 'cairo') ?? r?.seen.find((x) => (r?.tables[x]?.you ?? 0) > 0);
  if (!r || !c) return null;
  const { place, of } = placeIn(r, c);
  return <button className="tables-link" onClick={() => window.dispatchEvent(new CustomEvent('tof:open-tables'))} data-testid="tables-link"><span>{cityName(c)} rug trade</span><b>{ordinal(place)} of {of}</b><i>›</i></button>;
}
