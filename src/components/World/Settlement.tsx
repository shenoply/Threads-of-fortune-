import { useEffect, useRef, useState } from 'react';
import { Icon } from '../Icon';
import { Rumours } from '../Rumours/Rumours';
import { cityClosed, closedNote, dangerAt } from '../../game/economy/life';
import { fmt } from '../../game/economy/money';
import { drawWorld, onPaintedMap, paintedMap } from '../../game/systems/mapRender';
import { localBid, localOffers, useGame } from '../../game/state/store';
import { NPCS, QUESTS } from '../../data/world';
import { RUGS } from '../../data/rugs';
import { settlementById, seaRoutesFrom } from '../../game/systems/world';
import { rugSrc } from '../RugViewer/rugArt';
import { Portrait } from './Portrait';
import { Dialogue } from './Dialogue';
import { TownSupplies, CaravanRoster } from './CaravanPanels';
import { StallOverhead } from './StallOverhead';
import { Venue, AudienceOverlay } from './Venue';
import { venueFor } from '../../data/venues';
import { CITY_WALKS } from '../../data/cityWalks';
import { Tip } from '../Tips/Tip';
import { Auction } from '../Auction/Auction';
import { housesIn, saleOn, nextSale, art, HOUSES } from '../../game/auction/sessions';
import { useAudioEnv, townEnv, townMusic } from '../../game/audio/useAudioEnv';
import { RugViewer, type RugPreview } from '../RugViewer/RugViewer';
import { auctionVenue } from '../../data/auctionVenues';
import { dateLabel } from '../Auction/Auction';
import { ATTIRE, BOOKS, HAMMAMS, SKILLS } from '../../data/character';
import { BUYERS } from '../../data/buyers';
import { PortraitOrCameo } from '../People/Person';
import { personFor } from '../../data/people';

export type SetTab = 'town' | 'market' | 'animals' | 'guards';
export function SettlementPanel({ id, onClose, onStall, tab: initialTab = 'town' }: { id: string; onClose: () => void; onStall: () => void; tab?: SetTab }) {
  const g = useGame();
  const [tab, setTab] = useState<SetTab>(initialTab);
  const st = settlementById(id);
  const [talkTo, setTalkTo] = useState<string | null>(null);
  const [inVenue, setInVenue] = useState(false);
  const [inCity, setInCity] = useState(false);
  const [inAuction, setInAuction] = useState<string | null>(null);
  const [houseWalk, setHouseWalk] = useState<string | null>(null);
  const houses = housesIn(id);
  const [look, setLook] = useState<RugPreview | null>(null);
  // what the player hears: the town, or the palace or sale-house grounds they are walking
  const hwTier = houseWalk ? HOUSES[houseWalk].tier : null;
  useAudioEnv(inVenue ? 'palace' : hwTier ? (hwTier === 'grand' ? 'auction-grand' : 'auction-small') : townEnv(id), inVenue ? 'palace' : hwTier ? (hwTier === 'grand' ? 'auction-grand' : 'auction-small') : townMusic(id));
  const walk = CITY_WALKS[id];
  const [audience, setAudience] = useState(false);
  const venue = venueFor(id);
  const royal = venue?.royal ? BUYERS[venue.royal] : undefined;
  const [note, setNote] = useState('');
  const offers = localOffers(id, g.day, g.world.boughtLocal, g.world.friends, g.reputation);
  const hasMarket = st.sells.length > 0 || Object.keys(st.demand).length > 0;
  const ships = seaRoutesFrom(id);
  const quests = Object.entries(g.world.quests).filter(([, v]) => v !== 'done');
  const demandTraits = Object.entries(st.demand).filter(([, v]) => (v ?? 0) > 0).map(([k]) => k);
  const zoom = 3;

  return (
    <div className="overlay settlement" role="dialog" aria-label={st.name} data-testid="settlement">
      <div className="set-head">
        {id === 'giza' ? <img className="thumb" src="art/world/giza-district.jpg" alt="" style={{ objectFit: 'cover', objectPosition: '55% 45%', width: '100%' }} /> : walk?.map ? <img className="thumb" src={walk.map} alt="" style={{ objectFit: 'cover', objectPosition: '50% 45%', width: '100%' }} /> : <MapThumb x={st.x} y={st.y} zoom={zoom} />}
        <div className="set-head-shade" />
        <div className="set-title">
          <small>{st.region.toUpperCase()} · {st.kind === 'home' ? 'YOUR STALL' : st.kind.toUpperCase()}</small>
          <h2>{st.name}</h2>
        </div>
        <button className="btn set-close door-btn leave slim" onClick={onClose} data-testid="leave-settlement">⟵ Leave</button>
      </div>
      <div className="set-body">
        <div className="set-tabs" role="tablist">
          {([['town', 'Town'], ['market', 'Market'], ['animals', 'Animals'], ['guards', 'Guards']] as [SetTab, string][]).map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)} data-testid={`tab-${k}`}>{label}</button>
          ))}
        </div>
        {note && <p className="set-note" data-testid="set-note">{note}</p>}
        {tab === 'town' && (<>
        <p className="set-blurb">{st.blurb}</p>
        {houses.length > 0 && (
          <div className="houses" data-testid="auction-houses">
            <div className="section-label">AUCTION HOUSES</div>
            {houses.map((h) => {
              const on = saleOn(h.id, g.day);
              const nd = nextSale(h.id, g.day + (on ? 0 : 0));
              return (
                <button key={h.id} className={`house-card ${on ? 'on' : ''} ${!Object.keys(g.world.walks ?? {}).some((k) => k.startsWith('auction-')) ? 'feature-new' : ''}`} onClick={() => setHouseWalk(h.id)} data-testid={`house-${h.id}`}>
                  <img src={art(h.venueMap)} alt="" />
                  <span><b>{h.displayName}</b><small>{h.tier === 'grand' ? 'Grand estate sale' : 'Dealers\' auction'} · {h.district}</small><small className="when">{on ? 'Sale today. Anyone may attend.' : `Next sale ${dateLabel(nd)} (day ${nd})`}</small></span>
                  <em className="enter-pill">Enter ⟶</em>
                </button>
              );
            })}
          </div>
        )}
        {walk && (
          <button className="city-walk" onClick={() => setInCity(true)} data-testid="walk-city">
            <img src={walk.map} alt="" />
            <span><b>Walk the streets of {st.name}</b><small>{walk.pois.filter((p) => p.kind === 'goto').map((p) => p.name).slice(0, 4).join(' · ')}</small></span>
          </button>
        )}

        {id === 'giza' && (
          <button className="btn primary big" onClick={() => { onClose(); onStall(); }} data-testid="open-stall-world">Open your stall</button>
        )}

        {st.people.filter((pid) => pid !== 'kassab' || g.missions?.rival).length > 0 && (
          <>
            <div className="section-label">PEOPLE</div>
            <div className="people-list">
              {st.people.filter((pid) => pid !== 'kassab' || g.missions?.rival).map((pid) => {
                const n = NPCS[pid];
                return (
                  <button key={pid} className="npc" onClick={() => setTalkTo(pid)} data-testid={`npc-${pid}`}>
                    <Portrait id={n.id} look={n.look} accent={n.accent} size={52} />
                    <span>
                      <b>{n.name}</b>
                      <small>{n.role}</small>
                    </span>
                    <span className="talk">Talk</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {(HAMMAMS[id] || Object.values(ATTIRE).some((a) => a.where.includes(id)) || Object.values(BOOKS).some((b) => b.where.includes(id))) && (
          <>
            <div className="section-label">BATHS, TAILORS AND BOOKS</div>
            <div className="mkt">
              {HAMMAMS[id] && (
                <div className="mkt-row" data-testid="hammam">
                  <span className="svc-ico"><Icon name="tea" /></span>
                  <span><b>{HAMMAMS[id].name}</b><small>Wash off the road. Your clothes are {g.attire?.clean >= 70 ? 'clean' : g.attire?.clean >= 35 ? 'dusty' : 'filthy'} ({g.attire?.clean ?? 100}%). Clean clothes mean charisma.</small></span>
                  <button className="btn primary" disabled={g.cash < HAMMAMS[id].cost || (g.attire?.clean ?? 100) >= 100} onClick={() => setNote(g.bathe(id))} data-testid="bathe">Bathe {fmt(HAMMAMS[id].cost)}</button>
                </div>
              )}
              {Object.values(ATTIRE).filter((a) => a.where.includes(id)).map((a) => (
                <div className="mkt-row" key={a.id} data-testid={`tailor-${a.id}`}>
                  <span className="svc-ico"><Icon name="needle" /></span>
                  <span><b>{a.name}</b><small>Charisma +{a.charisma}. {a.note}</small></span>
                  {g.attire?.owned.includes(a.id)
                    ? <button className="btn" disabled={g.attire.worn === a.id} onClick={() => g.wear(a.id)}>{g.attire.worn === a.id ? 'Wearing' : 'Wear'}</button>
                    : <button className="btn primary" disabled={g.cash < a.cost} onClick={() => setNote(g.buyAttire(a.id))} data-testid={`buy-attire-${a.id}`}>Buy {fmt(a.cost)}</button>}
                </div>
              ))}
              {Object.values(BOOKS).filter((b) => b.where.includes(id)).map((b) => (
                <div className="mkt-row" key={b.id} data-testid={`book-${b.id}`}>
                  <span className="svc-ico"><Icon name="book" /></span>
                  <span><b>{b.title}</b><small>{b.author}. {b.note} Teaches {SKILLS[b.skill].name}.</small></span>
                  <button className="btn primary" disabled={g.books?.includes(b.id) || g.cash < b.cost} onClick={() => setNote(g.readBook(b.id))}>{g.books?.includes(b.id) ? 'Read' : `Buy and read ${fmt(b.cost)}`}</button>
                </div>
              ))}
            </div>
          </>
        )}

        {venue && royal?.royal && (
          <>
            <div className="section-label">ROYAL COURT</div>
            <div className="court-card" data-testid="court-card">
              {venue.exterior || venue.map ? <img className="court-img" src={venue.exterior ?? venue.map} alt={venue.name} /> : null}
              <div className="court-body">
                <div className="court-who">
                  <PortraitOrCameo id={royal.id} spec={personFor(royal.id)} size={54} />
                  <span><b>{venue.name}</b><small>{royal.name} · {royal.role.split(',')[0]}</small></span>
                </div>
                <p>{venue.history}</p>
                <p className="court-req">
                  {g.court.warrants.includes(royal.id) ? `✓ ${royal.royal.warrant}. ` : ''}
                  {g.reputation >= royal.royal.minRep ? 'Your reputation will get you an audience.' : `An audience needs reputation ${royal.royal.minRep}. You have ${g.reputation}.`} Bring your finest rugs packed for the road.
                </p>
                {venue.map ? (
                  <button className="btn primary" onClick={() => setInVenue(true)} data-testid="visit-palace">Visit {venue.name}</button>
                ) : (
                  <button className="btn primary" onClick={() => { const m = g.startAudience(royal.id); if (m) setNote(m); else setAudience(true); }} data-testid="request-audience">Request an audience</button>
                )}
              </div>
            </div>
          </>
        )}

        {id === 'giza' && <StallOverhead onOpen={() => { onClose(); onStall(); }} />}
        </>)}

        {tab === 'market' && <TownSupplies show={['food']} />}
        {tab === 'animals' && <TownSupplies show={['animals']} />}
        {tab === 'guards' && <><TownSupplies show={['recruits']} /><CaravanRoster /></>}

        {tab === 'market' && hasMarket && id !== 'giza' && (
          <>
            {cityClosed(g.day, id) && <p className="set-note" data-testid="market-closed">{closedNote(g.day, id)}</p>}
            {!cityClosed(g.day, id) && dangerAt(g.day, id) && <p className="set-note">{dangerAt(g.day, id)!.name}: soldiers at every gate. Caravans pay an inspection fee to get in.</p>}
            <Rumours max={3} compact />
            <div className="section-label">LOCAL MARKET</div>
            {demandTraits.length > 0 && <p className="set-demand">Dealers here pay more for: {demandTraits.map((d) => <span key={d} className="value-chip">{d.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>)}</p>}
            {offers.length > 0 && (
              <div className="mkt">
                {offers.map((o) => {
                  const t = RUGS[o.typeId];
                  return (
                    <div className="mkt-row" key={o.key} data-testid={`buy-${o.typeId}`}>
                      <img src={rugSrc(t)} alt="" className="lookable" onClick={() => setLook({ typeId: o.typeId, condition: o.condition, price: o.price })} style={o.condition === 'Dirty' ? { filter: 'sepia(0.5) brightness(0.75)' } : undefined} />
                      <span><b>{t.name}{o.left > 1 && <span className="qty"> ×{o.left}</span>}</b><small>{t.tier === 4 ? 'A treasure · ' : ''}{o.condition} · Giza buyers value it at {fmt(t.valueBand[0])}–{fmt(t.valueBand[1])}</small></span>
                      <button className="btn primary" disabled={g.cash < o.price} onClick={() => setNote(g.buyLocal(id, o.key))}>Buy {fmt(o.price)}</button>
                    </div>
                  );
                })}
              </div>
            )}
            {(() => {
              const locked = settlementById(id).sells.filter((o) => (o.minRep ?? 0) > g.reputation);
              if (!locked.length) return null;
              const need = Math.min(...locked.map((o) => o.minRep ?? 0));
              return <p className="set-demand dim" data-testid="locked-stock">The dealers here keep {locked.length === 1 ? 'one better piece' : `${locked.length} better pieces`} in the back for merchants with a name. Come back with reputation {need}.</p>;
            })()}
            {g.inventory.filter((i) => !i.restoringUntil && !i.stored).length > 0 && (
              <details className="sell-box">
                <summary>Sell to a local dealer</summary>
                <div className="mkt">
                  {g.inventory.filter((i) => !i.restoringUntil && !i.stored).map((i) => {
                    const t = RUGS[i.typeId];
                    const bid = localBid(id, i, g.day);
                    return (
                      <div className="mkt-row" key={i.uid} data-testid={`sell-${t.id}`}>
                        <img src={rugSrc(t)} alt="" />
                        <span><b>{t.name}</b><small>{i.condition} · {i.provenance} · you paid {fmt(i.paid)}</small></span>
                        <button className="btn" onClick={() => { const b = g.sellLocal(i.uid, id); setNote(`Sold ${t.name} for ${fmt(b)}.`); }}>Sell {fmt(bid)}</button>
                      </div>
                    );
                  })}
                </div>
              </details>
            )}
          </>
        )}

        {tab === 'town' && (<>
        {ships.length > 0 && (
          <>
            <div className="section-label">HARBOUR</div>
            <div className="mkt">
              {ships.map((r) => (
                <div className="mkt-row" key={r.to}>
                  <span><b>{settlementById(r.to).name}</b><small>{r.days} day{r.days > 1 ? 's' : ''} at sea, deck class</small></span>
                  <button className="btn" disabled={g.cash < r.fare} onClick={() => { const m = g.sail(r.to); setNote(m); onClose(); }} data-testid={`sail-${r.to}`}>Sail · {fmt(r.fare)}</button>
                </div>
              ))}
            </div>
          </>
        )}

        {id !== 'giza' && (
          <button
            className="btn"
            style={{ marginTop: 8 }}
            data-testid="wait-morning"
            onClick={() => {
              const h = g.world.hour;
              const hours = h < 7 ? 7 - h : 31 - h;
              const notes = g.travelStep({ x: st.x, y: st.y }, hours / 24, true);
              g.arriveAt(id);
              setNote(`You rest until morning. ${notes.filter((n) => !n.startsWith('Day ')).slice(-2).join(' ')}`.trim());
            }}
          >
            Rest until morning
          </button>
        )}

        {quests.length > 0 && (
          <>
            <div className="section-label">YOUR TASKS</div>
            {quests.map(([qid, v]) => (
              <p key={qid} className="set-quest"><b>{QUESTS[qid].title}</b>{v === 'ready' ? ' · ready to claim' : ''}<br />{QUESTS[qid].desc}</p>
            ))}
          </>
        )}
        </>)}
      </div>
      <Tip id="town" when={!inCity && !inVenue && !talkTo && !inAuction} />
      {look && <div className="venue-overlay"><RugViewer preview={look} onClose={() => setLook(null)} /></div>}
      {houseWalk && (
        <div className="venue-overlay">
          <Venue def={auctionVenue(houseWalk)} onLeave={() => setHouseWalk(null)} onAction={(a) => { if (a === 'floor') setInAuction(houseWalk); }} />
        </div>
      )}
      {inAuction && <Auction houseId={inAuction} onClose={() => setInAuction(null)} />}
      {inCity && walk && (
        <div className="venue-overlay">
          <Venue def={walk} onLeave={() => setInCity(false)} onAction={(a) => {
            setInCity(false);
            if (a === 'palace') { if (venue?.map) setInVenue(true); else setTab('town'); }
            else if (a.startsWith('house:')) setHouseWalk(a.slice(6));
            else if (a.startsWith('npc:')) { setTab('town'); setTalkTo(a.slice(4)); }
            else setTab(a as SetTab);
          }} />
        </div>
      )}
      {inVenue && venue && <div className="venue-overlay"><Venue id={venue.id} onLeave={() => setInVenue(false)} /></div>}
      {audience && <AudienceOverlay onDone={() => setAudience(false)} />}
      {talkTo && <Dialogue npcId={talkTo} onClose={(m) => { setTalkTo(null); if (m) setNote(m); }} />}
    </div>
  );
}

/** A close-up of the atlas around a place, used as the header of a settlement. */
function MapThumb({ x, y, zoom }: { x: number; y: number; zoom: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [artTick, setArtTick] = useState(0);
  useEffect(() => { paintedMap(); return onPaintedMap(() => setArtTick((t) => t + 1)); }, []);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const w = c.clientWidth || 390, h = c.clientHeight || 160;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = w * dpr;
    c.height = h * dpr;
    const s = zoom * 2.2;
    drawWorld(c.getContext('2d')!, { w, h, s, tx: w * 0.62 - x * s, ty: h / 2 - y * s, dpr }, { labels: true });
  }, [x, y, zoom, artTick]);
  return <canvas ref={ref} className="thumb" />;
}
