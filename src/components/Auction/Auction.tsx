import { useEffect, useMemo, useRef, useState } from 'react';
import { AUCTIONEER, type AuctionCall } from '../../data/auctioneer';
import { voice } from '../../game/audio/voice';
import { useGame } from '../../game/state/store';
import { HOUSES, art, catalogue, roomFor, ceilingFor, increment, saleOn, nextSale, type Lot, type RoomBidder } from '../../game/auction/sessions';
import { canAffordBid, totalAuctionCost } from '../../game/auction/auctionSystem';
import { AUCTION_UI_RULES } from '../../game/auction/uiContract';
import type { AuctionHouse } from '../../game/auction/types';
import { RUGS } from '../../data/rugs';
import { fmt } from '../../game/economy/money';
import { levelOf } from '../../data/character';
import { rugSrc } from '../RugViewer/rugArt';
import { audio } from '../../game/audio/engine';
import { dateOfDay } from '../../game/economy/life';
import { Tip } from '../Tips/Tip';
import { RugViewer, type RugPreview } from '../RugViewer/RugViewer';
import { useAudioEnv } from '../../game/audio/useAudioEnv';
import { Atmosphere } from '../Atmosphere/Atmosphere';

const r01 = (s: string) => Math.abs(Math.sin([...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 1000003, 7) * 12.9898) * 43758.5453) % 1;
const lotTitle = (l: Lot) => (l.bundle ? `A bundle of ${l.typeIds.length} rugs` : RUGS[l.typeIds[0]].name);
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const dateLabel = (day: number) => { const d = dateOfDay(day); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]}`; };

/** What your eye tells you about a lot. */
function appraise(l: Lot, appr: number) {
  if (l.bundle) return appr >= 8 ? `${l.typeIds.length} rugs, worth ${fmt(l.value * 0.85)}–${fmt(l.value * 1.15)} in all.` : appr >= 4 ? `${l.typeIds.length} rugs, mostly village work.` : 'Roped and sealed. Hard to judge.';
  const spread = appr >= 12 ? 0.08 : appr >= 7 ? 0.18 : appr >= 3 ? 0.3 : 0.45;
  return `Your eye says ${fmt(l.value * (1 - spread))}–${fmt(l.value * (1 + spread))}.`;
}

export function Auction({ houseId, onClose }: { houseId: string; onClose: () => void }) {
  const g = useGame();
  const h = HOUSES[houseId];
  const day = g.day;
  // the catalogue and the room are fixed when you sit down
  const [lots] = useState(() => catalogue(houseId, day, g.reoffers ?? []));
  const [room] = useState(() => roomFor(houseId, day, { cash: g.cash, rep: g.reputation, rival: !!g.missions?.rival }));
  const [seated, setSeated] = useState(false);
  const [results, setResults] = useState<{ title: string; text: string; you: boolean }[]>([]);
  const firstOpen = lots.findIndex((l) => !(g.lotsSold ?? []).includes(l.key));
  const [idx, setIdx] = useState(firstOpen < 0 ? lots.length : firstOpen);
  const appr = levelOf(g.skills?.appraisal ?? 0);
  const [look, setLook] = useState<RugPreview | null>(null);
  useAudioEnv(h.tier === 'grand' ? 'auction-grand' : 'auction-small', h.tier === 'grand' ? 'auction-grand' : 'auction-small');

  if (!saleOn(houseId, day)) {
    const nd = nextSale(houseId, day);
    return (
      <div className="auction-overlay" data-testid="auction">
        <img className="auction-bg" src={art(h.floorPov)} alt="" />
        <div className="auction-shade" />
        <div className="auction-body">
          <div className="auction-head"><div><small>{h.district.toUpperCase()}</small><b>{h.displayName}</b></div><button className="btn door-btn leave slim" onClick={onClose} data-testid="auction-leave">⟵ Leave the sale room</button></div>
          <p className="auction-note" data-testid="auction-closed">The chairs are stacked and the room is empty. The next sale is on {dateLabel(nd)} (day {nd}).</p>
        </div>
      </div>
    );
  }

  if (!seated) {
    return (
      <div className="auction-overlay" data-testid="auction">
        <img className="auction-bg" src={art(h.floorPov)} alt="" />
        <div className="auction-shade" />
        <div className="auction-body">
          <div className="auction-head">
            <div><small>{h.tier === 'grand' ? 'GRAND ESTATE SALE' : 'DEALERS\' AUCTION'} · {h.district.toUpperCase()}</small><b>{h.displayName}</b></div>
            <button className="btn door-btn leave slim" onClick={onClose} data-testid="auction-leave">⟵ Leave the sale room</button>
          </div>
          <p className="auction-note">Anyone may sit and watch. Every sale you see teaches you what rugs really fetch.{h.buyerPremiumPct ? ` Winning bids pay a ${Math.round(h.buyerPremiumPct * 100)}% buyer's premium.` : ''} You have {fmt(g.cash)}.</p>
          <div className="section-label">THE CATALOGUE · {lots.length} LOTS</div>
          <div className="auction-lots">
            {lots.map((l, i) => {
              const done = (g.lotsSold ?? []).includes(l.key);
              return (
                <div key={l.key} className={`auction-lot ${done ? 'sold' : ''}`} data-testid={`lot-${i}`}>
                  {l.bundle ? <span className="lot-img bale" /> : <img src={rugSrc(RUGS[l.typeIds[0]])} alt="" className="lookable" onClick={() => setLook({ typeId: l.typeIds[0], condition: l.conditions[0], provenance: l.provenance[0] })} />}
                  <span><b>Lot {i + 1}: {lotTitle(l)}</b><small>{l.bundle ? 'Mixed village rugs' : `${l.conditions[0]} · ${l.provenance[0]} provenance`}{l.reoffered ? ' · offered again' : ''}</small><small>Estimate {fmt(l.estimate[0])}–{fmt(l.estimate[1])}{done ? ' · sold' : ''}</small></span>
                </div>
              );
            })}
          </div>
          <div className="auction-sticky">
            <button className="btn primary big" disabled={idx >= lots.length} onClick={() => { setSeated(true); g.practise('appraisal', 2); useGame.setState({ satDay: g.day }); }} data-testid="auction-sit">{idx >= lots.length ? 'The sale is over for today' : idx > 0 ? `Sit down again (lot ${idx + 1})` : 'Take a seat'}</button>
          </div>
          <Tip id="auction" />
          {look && <div className="venue-overlay"><RugViewer preview={look} onClose={() => setLook(null)} /></div>}
        </div>
      </div>
    );
  }

  const lot = lots[idx];
  return (
    <div className="auction-overlay floor" data-testid="auction">
      <img className="auction-bg pov" src={art(h.floorPov)} alt="" />
      <Atmosphere indoor />
      <div className="auction-shade light" />
      {lot ? (
        <Floor key={lot.key} h={h} houseId={houseId} lot={lot} n={idx} total={lots.length} room={room} appr={appr}
          onLeave={onClose}
          onDone={(text, you) => setResults((r) => [...r, { title: lotTitle(lot), text, you }])}
          onNext={() => setIdx((i) => i + 1)} />
      ) : (
        <div className="auction-body" data-testid="auction-recap">
          <div className="auction-head"><div><small>SALE RECAP</small><b>{h.displayName}</b></div><button className="btn door-btn leave slim" onClick={onClose} data-testid="auction-leave">⟵ Leave the sale room</button></div>
          <p className="auction-note">The hammer falls for the last time. You watched {results.length} lot{results.length === 1 ? '' : 's'} sell and know the market a little better.</p>
          <div className="recap">{results.map((r, i) => <p key={i} className={r.you ? 'you' : ''}><b>{r.title}.</b> {r.text}</p>)}</div>
          <button className="btn primary big" onClick={onClose}>Leave the sale room</button>
        </div>
      )}
    </div>
  );
}

type Going = 0 | 1 | 2;
/** The pause after each call before the room moves on, in ms: your window to bid. */
const GAP = 800;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function Floor({ h, houseId, lot, n, total, room, appr, onLeave, onDone, onNext }: {
  h: AuctionHouse; houseId: string; lot: Lot; n: number; total: number; room: RoomBidder[]; appr: number;
  onLeave: () => void; onDone: (text: string, you: boolean) => void; onNext: () => void;
}) {
  const g = useGame();
  const ceilings = useMemo(() => Object.fromEntries(room.map((b) => [b.id, ceilingFor(b, lot, r01(lot.key + b.id))])), [room, lot]);
  const [price, setPrice] = useState(lot.opening);
  const [leader, setLeader] = useState<string | null>(null);
  const [going, setGoing] = useState<Going>(0);
  const intro = `Lot ${n + 1}: ${lotTitle(lot)}${lot.bundle ? ', sold as one' : `, ${lot.conditions[0].toLowerCase()} condition`}.`;
  const [line, setLine] = useState('');
  const [who, setWho] = useState(intro);
  const [over, setOver] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [inspect, setInspect] = useState(false);
  const [look, setLook] = useState(false);
  const timer = useRef<number>();
  const gen = useRef(0);
  const alive = useRef(true);
  const chain = useRef<Promise<void>>(Promise.resolve());
  const pickLine = (k: AuctionCall, p?: number) => {
    const arr = AUCTIONEER[k];
    const tpl = arr[Math.floor(Math.random() * arr.length)];
    return p !== undefined ? tpl.replace('{price}', fmt(p)) : tpl;
  };
  /** Queue a call. The auctioneer never talks over himself: each line waits for the one before to finish. */
  const speak = (text: string, whoText: string, after?: () => void) => {
    chain.current = chain.current.then(async () => {
      if (!alive.current) return;
      setLine(text); setWho(whoText);
      const t0 = performance.now();
      // never wait on audio that cannot play (a suspended sound device, a missing clip)
      // wait for him to finish when he can be heard; otherwise give the caption time to be read
      const heard = voice.audible('auctioneer', text);
      try { await Promise.race([voice.say('auctioneer', text), sleep(heard ? 9000 : 500 + text.length * 40)]); } catch { /* keep the sale going */ }
      if (performance.now() - t0 < 250) await sleep(500 + text.length * 40); // no recording: time to read it
      after?.();
    }).catch(() => {});
  };
  /** Run the next move once he has finished speaking and paused, unless the player has acted since. */
  const next = (fn: () => void, pause = GAP) => {
    const my = gen.current;
    chain.current.then(() => {
      if (my !== gen.current || !alive.current) return;
      timer.current = window.setTimeout(() => { if (my === gen.current && alive.current) fn(); }, pause);
    });
  };
  useEffect(() => {
    alive.current = true;
    chain.current = Promise.race([voice.whenReady('auctioneer'), sleep(3000)]).catch(() => {});
    speak(pickLine('open', lot.opening), intro);
    next(() => step(null, lot.opening, 0), GAP + 500);
    return () => { alive.current = false; voice.stop(); window.clearTimeout(timer.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const intel = !lot.bundle ? g.intel?.[lot.typeIds[0]] : undefined;
  const t = RUGS[lot.typeIds[0]];
  const nextBid = leader ? price + increment(price, h.tier) : price;
  const cost = totalAuctionCost(nextBid, h.buyerPremiumPct);
  const canBid = canAffordBid(g.cash, nextBid, h.buyerPremiumPct);
  const nameOf = (id: string | null) => (id === 'you' ? 'you' : room.find((b) => b.id === id)?.name ?? '');

  const finish = (winner: string | null, at: number) => {
    gen.current++;
    window.clearTimeout(timer.current);
    const bought = winner !== null && at >= lot.reserve ? winner : null;
    const msg = g.lotResult(houseId, lot, bought, at, bought && bought !== 'you' ? nameOf(bought) : undefined);
    const text = bought === 'you' ? msg : bought ? `Sold to ${nameOf(bought)} for ${fmt(at)}.` : winner ? `Bought in at ${fmt(at)}: the reserve was not met.` : 'No bids. Bought in.';
    g.passTime(8);
    speak(bought ? pickLine('sold', at) : pickLine('noSale'), bought ? `Sold to ${bought === 'you' ? 'you' : nameOf(bought)}.` : winner ? 'The reserve was not met.' : 'Nobody bid.', () => {
      audio.sfx('gavel');
      if (bought && h.tier === 'grand' && at >= 5000) setTimeout(() => audio.sfx('applause'), 500);
      if (!alive.current) return;
      setOver(text);
      onDone(text, bought === 'you');
      setBusy(false);
    });
  };

  /** One pass around the room at the next price. Returns who raised, if anyone. */
  const roomRaise = (current: string | null, nextPrice: number): RoomBidder | null => {
    const keen = room.filter((b) => b.id !== current && ceilings[b.id] >= nextPrice).sort((a, b) => b.aggression - a.aggression);
    for (const b of keen) {
      const urgency = b.wants(lot) ? 0.5 + b.aggression * 0.45 : 0.25 + b.aggression * 0.35;
      if (Math.random() < urgency) return b;
    }
    return null;
  };

  const step = (curLeader: string | null, curPrice: number, curGoing: Going) => {
    // early on the room jumps several steps at a time; near the value it slows to one step
    const jump = curPrice < lot.value * 0.6 ? 3 : curPrice < lot.value * 0.85 ? 2 : 1;
    let np = curPrice;
    if (curLeader) for (let j = 0; j < jump; j++) np += increment(np, h.tier);
    const b = roomRaise(curLeader, np);
    if (b) {
      setPrice(np); setLeader(b.id); setGoing(0);
      speak(pickLine(b.id === 'selim' ? 'selimBid' : 'roomBid', np), b.id === 'selim' ? 'Selim Kassab raises his hand and smiles at you.' : `${b.name} raises a hand.`);
      setBusy(false);
      next(() => step(b.id, np, 0));
      return;
    }
    if (curGoing >= 2) { finish(curLeader, curPrice); return; }
    const ng = (curGoing + 1) as Going;
    setGoing(ng);
    speak(pickLine(curLeader ? (ng === 1 ? 'once' : 'twice') : ng === 1 ? 'nobodyOnce' : 'nobodyTwice', curPrice), curLeader ? `The bid is with ${curLeader === 'you' ? 'you' : nameOf(curLeader)}.` : 'No bids yet.');
    if (curLeader !== 'you') setBusy(false);
    next(() => step(curLeader, curPrice, ng), curLeader === 'you' ? 500 : GAP);
  };

  const bid = () => {
    if (!canBid || busy || over) return;
    gen.current++;
    window.clearTimeout(timer.current);
    setBusy(true); audio.sfx('tap');
    setPrice(nextBid); setLeader('you'); setGoing(0);
    const at = nextBid;
    speak(pickLine('youBid', at), 'You raise your hand.');
    next(() => step('you', at, 0), 500);
  };
  const hold = () => {
    if (busy || over) return;
    gen.current++;
    window.clearTimeout(timer.current);
    setBusy(true);
    const L = leader, P = price, G = going;
    next(() => step(L, P, G), 200);
  };
  const skip = () => {
    if (over || busy) return;
    if (leader === 'you') return;
    gen.current++;
    window.clearTimeout(timer.current);
    // let the room finish the lot without you
    let L = leader, P = price, G: Going = going;
    for (let i = 0; i < 80; i++) {
      const np = L ? P + increment(P, h.tier) : P;
      const b = roomRaise(L, np);
      if (b) { L = b.id; P = np; G = 0; continue; }
      if (G >= 2) break;
      G = (G + 1) as Going;
    }
    setPrice(P); setLeader(L); finish(L, P);
  };

  return (
    <div className="floor-body">
      <div className="floor-top">
        <span><small>{h.displayName}</small><b>Lot {n + 1} of {total}</b></span>
        <span className="floor-cash" data-testid="floor-cash">{fmt(g.cash)}</span>
        <button className="btn door-btn leave slim" onClick={onLeave} data-testid="auction-leave">⟵ Leave</button>
      </div>
      <div className="floor-scene">
        <p className="floor-call" data-testid="floor-call">{line ? `“${line}”` : "…"}</p>
        <p className="floor-who">{who}</p>
        <div className="floor-rug">{lot.bundle ? <span className="lot-img bale big" /> : <img src={rugSrc(t)} alt={t.name} className="lookable" onClick={() => setLook(true)} />}</div>
        {look && !lot.bundle && <div className="venue-overlay"><RugViewer preview={{ typeId: lot.typeIds[0], condition: lot.conditions[0], provenance: lot.provenance[0] }} onClose={() => setLook(false)} /></div>}
        <div className="floor-room">
          {room.map((b) => (
            <span key={b.id} className={`bidder ${leader === b.id ? 'lead' : ''} ${ceilings[b.id] < nextBid && leader !== b.id ? 'out' : ''}`}>
              <i className="bidder-face" style={b.img ? { backgroundImage: `url(${b.img})` } : undefined}>{b.img ? '' : b.name.replace(/^An? /, '')[0]}</i>
              <b>{b.name}</b>
            </span>
          ))}
        </div>
      </div>
      <div className="floor-lot">
        <b>{lotTitle(lot)}</b>
        <small>{lot.bundle ? 'Mixed village rugs, sold as one lot' : `${t.origin.split(',')[0]} · ${lot.conditions[0]} · ${lot.provenance[0]} provenance`}</small>
        <small>Estimate {fmt(lot.estimate[0])}–{fmt(lot.estimate[1])}{intel ? ` · seen selling for about ${fmt(intel.movingAveragePt ?? 0)} (${intel.observations}×)` : ''}</small>
        {inspect && <small className="floor-eye" data-testid="floor-eye">{appraise(lot, appr)}{!lot.bundle && appr >= 6 ? ` Look for: ${t.traits.slice(0, 3).join(', ')}.` : ''}</small>}
      </div>
      <div className="floor-price">
        <span><small>{leader === 'you' ? 'YOUR BID' : leader ? nameOf(leader).toUpperCase() : 'OPENING'}</small><b data-testid="bid-price">{fmt(price)}</b></span>
        {!over && <span><small>NEXT BID</small><b>{fmt(nextBid)}</b>{cost > nextBid && <small>{fmt(cost)} with premium</small>}</span>}
      </div>
      {over ? (
        <div className="bid-over"><p data-testid="bid-result">{over}</p><button className="btn primary big" onClick={onNext} data-testid="next-lot">{n + 1 < total ? 'Next lot' : 'The end of the sale'}</button></div>
      ) : (
        <>
          {!canBid && leader !== 'you' && <p className="floor-poor">{AUCTION_UI_RULES.unaffordableCopy}</p>}
          <div className="floor-btns">
            <button className="btn" onClick={() => { if (!inspect) g.practise('appraisal', 1); setInspect(!inspect); }} data-testid="bid-inspect">Inspect</button>
            <button className="btn primary" disabled={!canBid || busy || leader === 'you'} onClick={bid} data-testid="bid-raise">{leader === 'you' ? 'Your bid' : `Bid ${fmt(nextBid)}`}</button>
            <button className="btn" disabled={busy || leader === 'you'} onClick={hold} data-testid="bid-hold">{going ? 'Let it go' : 'Watch'}</button>
            <button className="btn" disabled={busy || leader === 'you'} onClick={skip} data-testid="bid-pass">Skip lot</button>
          </div>
        </>
      )}
    </div>
  );
}
