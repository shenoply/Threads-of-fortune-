// The rival houses in Progress: each house's face, temper, purse and name, where it stands against you this
// season, its latest move, and your answers to whatever it is doing to you now. Shukri's race across the
// lane comes first. Answers are plain buttons; what happened is said in a line under the house.
import { useState } from 'react';
import { useGame } from '../../game/state/store';
import { fmt } from '../../game/economy/money';
import { dateFor } from '../../game/economy/economy';
import { RIVAL } from '../../data/rivals';
import { RIVAL_MARK } from '../../data/epithets';
import { BUYERS } from '../../data/buyers';
import { RUGS } from '../../data/rugs';
import { SETTLEMENTS } from '../../data/world';
import { UPGRADES } from '../../data/suppliers';
import { HOUSES, housesOf, standingOf, friendly, buyoutCost, undercutBackCost, truceCost, matchCost, GIFT, WIN_BACK, ANSWER, type HouseDef, type CounterKind } from '../../game/systems/houses';
import { rivalOf, rivalProgress, yourStall, RIVAL_NAME, STALL_STEPS } from '../../game/systems/laneRival';
import { cityName } from '../../game/systems/ranks';
import { boyName } from '../../game/systems/shopBoy';
import { TraitMarks } from '../Epithet/Epithet';
import { Fold } from '../Fold/Fold';
import './rivals.css';

const town = (id: string) => SETTLEMENTS.find((x) => x.id === id)?.name ?? id;
const short = (d: number) => dateFor(d).short;
const purseWord = (p: number) => (p < 0 ? 'in debt' : p < 5000 ? 'thin' : p < 25000 ? 'comfortable' : 'deep');
const STALL = ['a borrowed corner', 'a mat', 'a canopy', 'a shop in the Khan'];

function Face({ src, alt }: { src: string; alt: string }) {
  const [gone, setGone] = useState(false);
  return <span className="rv-face">{gone ? <b>{alt.replace(/^(Signora|Abu)\s*/, '').charAt(0)}</b> : <img src={src} alt="" loading="lazy" onError={() => setGone(true)} />}</span>;
}

/** Shukri across the lane: his stall against yours, and what he did last */
function LaneCard() {
  const g = useGame();
  const r = rivalOf(g);
  const you = yourStall(g.upgrades);
  const next = r.stall < 3 ? UPGRADES.find((u) => u.id === STALL_STEPS[r.stall]) : undefined;
  return (
    <div className="rv-card rv-lane" data-testid="rival-lane">
      <div className="rv-top">
        <Face src="art/portraits/small/shukri.webp" alt={RIVAL_NAME} />
        <div className="rv-name"><b>{RIVAL_NAME}</b><small>Across the lane in Giza · {r.stall > you ? 'ahead of you' : r.stall === you ? 'level with you' : 'behind you'}</small></div>
      </div>
      <p className="rv-line">He has {STALL[r.stall]}{r.second ? ', and a second shop in the Muski' : ''}; you have {STALL[you]}.{next ? ` Saving for ${next.name.toLowerCase()}:` : ''}</p>
      {next && <div className="rv-bar" aria-label={`${Math.round(rivalProgress(r) * 100)}% of the way`}><i style={{ width: `${Math.round(rivalProgress(r) * 100)}%` }} /></div>}
      {r.last && <p className="rv-last"><small>{short(r.last.day)}</small> {r.last.text}</p>}
    </div>
  );
}

function HouseCard({ d }: { d: HouseDef }) {
  const g = useGame();
  const H = housesOf(g);
  const st = H.list[d.id];
  const [msg, setMsg] = useState('');
  if (!st) return null;
  const rv = RIVAL[d.rival];
  const act = (k: CounterKind, arg?: string) => setMsg(g.houseAct(k, d.id, arg));
  const gone = st.status === 'gone';
  const sd = standingOf(g, d);
  const day = g.day;
  const cut = H.cut && H.cut.by === d.id && H.cut.until >= day ? H.cut : undefined;
  const corners = H.corners.filter((c) => c.by === d.id && c.until >= day);
  const courted = H.courted.filter((c) => c.by === d.id);
  const defected = Object.entries(H.defected).filter(([, x]) => x.by === d.id);
  const poach = H.poach?.by === d.id ? H.poach : undefined;
  const rumour = H.rumour?.by === d.id && H.rumour.until >= day ? H.rumour : undefined;
  const sale = H.sale?.by === d.id && H.sale.until >= day ? H.sale : undefined;
  const partner = (st.truce ?? 0) >= day;
  const family = friendly(g, d, st) && !partner;
  const Btn = ({ k, arg, label, cost, id }: { k: CounterKind; arg?: string; label: string; cost?: number; id: string }) => (
    <button className="btn small rv-act" disabled={cost !== undefined && g.cash < cost} onClick={() => act(k, arg)} data-testid={`rv-${id}-${d.id}`}>{label}{cost !== undefined ? ` · ${fmt(cost)}` : ''}</button>
  );
  return (
    <div className={`rv-card ${gone ? 'rv-gone' : ''} ${st.status === 'failing' ? 'rv-failing' : ''}`} data-testid={`rival-house-${d.id}`}>
      <div className="rv-top">
        <Face src={`art/portraits/small/${d.rival}.webp`} alt={rv.name} />
        <div className="rv-name">
          <b>{rv.name} <TraitMarks marks={[RIVAL_MARK[rv.temper]]} size={18} testid={`rv-mark-${d.id}`} /></b>
          <small>{RIVAL_MARK[rv.temper].label} · {town(d.home)}{st.shop && !gone ? `, a shop in ${town(st.shop)}` : ''}</small>
        </div>
        <span className={`rv-stand ${gone ? '' : sd.ahead ? 'you' : 'them'}`} data-testid={`rv-stand-${d.id}`}>{gone ? 'Gone' : sd.ahead ? 'Behind you' : 'Ahead'}</span>
      </div>
      <p className="rv-line">{d.trade}</p>
      {!gone && (
        <div className="rv-facts">
          <span><small>PURSE</small>{purseWord(st.purse)}</span>
          <span><small>STOCK</small>{st.stock} rugs</span>
          <span><small>NAME</small><i className="rv-rep"><i style={{ width: `${st.rep}%` }} /></i></span>
          <span><small>{cityName(sd.city).toUpperCase()}</small>{fmt(sd.theirs)} <em>to your {fmt(sd.yours)}</em></span>
        </div>
      )}
      {gone && <p className="rv-line">The house failed on {short(st.since ?? day)} and has left the trade.</p>}
      {st.status === 'failing' && <p className="rv-warn">Behind with {rv.she ? 'her' : 'his'} suppliers since {short(st.since ?? day)}.</p>}
      {partner && <p className="rv-good" data-testid={`rv-partner-${d.id}`}>Partners on the road to {town(d.home)} until {short(st.truce!)}.</p>}
      {family && <p className="rv-good">Your wife's family. {rv.she ? 'She' : 'He'} will not work against you.</p>}
      {st.last && <p className="rv-last" data-testid={`rv-last-${d.id}`}><small>{short(st.last.day)}</small> {st.last.text}</p>}
      <div className="rv-acts">
        {cut && <><p className="rv-now">Cutting prices in {cityName(cut.city)} until {short(cut.until)}.</p><Btn k="undercut-back" label="Cut yours to match" cost={undercutBackCost(g, cut.city)} id="undercut" /></>}
        {corners.map((c) => <div key={c.town + c.typeId}><p className="rv-now">Buying up {RUGS[c.typeId]?.name} in {town(c.town)} until {short(c.until)}.</p><Btn k="buy-out" arg={c.town} label={`Buy ${rv.she ? 'her' : 'him'} out of the line`} cost={buyoutCost(c)} id="buyout" /></div>)}
        {courted.map((c) => <div key={c.buyer}><p className="rv-now">Calling on {BUYERS[c.buyer]?.name}, until {short(c.until)}.</p><Btn k="gift" arg={c.buyer} label="Send a gift" cost={GIFT} id="gift" /></div>)}
        {defected.map(([id, x]) => <div key={id}><p className="rv-now">{BUYERS[id]?.name} buys from {rv.she ? 'her' : 'him'} now, until {short(x.until)}.</p><Btn k="win-back" arg={id} label="Win them back" cost={WIN_BACK} id="winback" /></div>)}
        {poach && <><p className="rv-now">Offering {poach.who === 'boy' ? boyName(g.shopBoy) : `your agent in ${town(poach.shop ?? '')}`} more money, until {short(poach.until)}.</p><Btn k="match" label="Pay him to stay" cost={matchCost(poach.who)} id="match" /></>}
        {rumour && <><p className="rv-now">Telling the trade you lie about your rugs, until {short(rumour.until)}.</p><Btn k="answer" label="Answer it in the Courier" cost={ANSWER} id="answer" /></>}
        {sale && <div className="rv-sale" data-testid={`rv-sale-${d.id}`}><p className="rv-now">The creditors are selling the stock until {short(sale.until)}.</p>{sale.rugs.map((r, i) => <Btn key={i} k="buy-stock" arg={String(i)} label={RUGS[r.typeId]?.name ?? 'A rug'} cost={r.price} id={`stock${i}`} />)}</div>}
        {!gone && !partner && !family && st.status === 'trading' && <Btn k="truce" label="Propose sharing a road" cost={truceCost(g.cash)} id="truce" />}
        {!gone && d.smuggler && <Btn k="tip" label="Tell the customs police" id="tip" />}
      </div>
      {msg && msg !== st.last?.text && <p className="rv-msg" role="status" data-testid={`rv-msg-${d.id}`}>{msg}</p>}
    </div>
  );
}

/** Progress: the rival houses, Shukri first */
export function RivalsFold() {
  const g = useGame();
  const H = housesOf(g);
  const last = H.log[H.log.length - 1];
  const pressing = !!(H.cut && H.cut.until >= g.day) || H.courted.length > 0 || !!H.poach || !!(H.rumour && H.rumour.until >= g.day) || !!(H.sale && H.sale.until >= g.day);
  return (
    <Fold id="pr-rivals" title="Rival houses" gist={last ? last.text : `${HOUSES.length} houses and the lane`} attention={pressing} testid="rivals-fold" className="rv-fold">
      <div className="rv-list" data-testid="rivals">
        <LaneCard />
        {HOUSES.map((d) => <HouseCard key={d.id} d={d} />)}
      </div>
      {H.log.length > 1 && (
        <details className="rv-log" data-testid="rivals-log">
          <summary>The trade's talk</summary>
          <ul>{[...H.log].reverse().slice(0, 12).map((l, i) => <li key={i}><small>{short(l.day)}</small> {l.text}</li>)}</ul>
        </details>
      )}
    </Fold>
  );
}
