import { useEffect, useRef, useState } from 'react';
import { Icon } from '../Icon';
import { Rumours } from '../Rumours/Rumours';
import { cityClosed, closedNote, dangerAt } from '../../game/economy/life';
import { fmt } from '../../game/economy/money';
import { drawWorld, onPaintedMap, paintedMap } from '../../game/systems/mapRender';
import { localAskPrice, localBid, localOffers, useGame } from '../../game/state/store';
import { NPCS, QUESTS } from '../../data/world';
import { RUGS } from '../../data/rugs';
import { settlementById, seaRoutesFrom } from '../../game/systems/world';
import { rugSrc } from '../RugViewer/rugArt';
import { Portrait } from './Portrait';
import { Dialogue } from './Dialogue';
import { TownSupplies, CaravanRoster } from './CaravanPanels';
import { StallOverhead } from './StallOverhead';
import { Venue, AudienceOverlay } from './Venue';
import { SailingTransition } from './SailingTransition';
import { venueFor } from '../../data/venues';
import { Cabaret } from './Cabaret';
import { VENUES_1925, venuesIn, venueOpen, venueArt, CLOSED_DOOR } from '../../data/entertainment';
import { CITY_WALKS } from '../../data/cityWalks';
import { Tip } from '../Tips/Tip';
import { Auction } from '../Auction/Auction';
import { housesIn, saleOn, nextSale, art, HOUSES } from '../../game/auction/sessions';
import { useAudioEnv, townEnv, townMusic } from '../../game/audio/useAudioEnv';
import { RugViewer, type RugPreview } from '../RugViewer/RugViewer';
import { auctionVenue } from '../../data/auctionVenues';
import { dateLabel } from '../Auction/Auction';
import { BOOKS, HAMMAMS, SKILLS } from '../../data/character';
import { PIECES, PIECE_ORDER, soldIn } from '../../data/wardrobe';
import { Wardrobe } from '../Wardrobe/Wardrobe';
import { BUYERS } from '../../data/buyers';
import { PortraitOrCameo } from '../People/Person';
import { personFor } from '../../data/people';
import { dateLine } from '../../game/economy/newspaper';
import { FinancePanel } from './Finance';
import { LibraryView } from '../ArranLab/Library';
import { CairoPlace } from './CairoPlaces';
import { LIBRARIES } from '../../game/systems/arranBooks';
import { LENDERS, INSURERS } from '../../game/systems/finance';

export type SetTab = 'town' | 'market' | 'animals' | 'guards';
export function SettlementPanel({ id, onClose, onStall, tab: initialTab = 'town' }: { id: string; onClose: () => void; onStall: () => void; tab?: SetTab }) {
  const g = useGame();
  const [tab, setTab] = useState<SetTab>(initialTab);
  // arriving in a town opens its menu first, Bannerlord-style: the town's picture and what there is
  // to do, each a big button into the part of the panel below that does it
  const [menu, setMenu] = useState(initialTab === 'town');
  const [finance, setFinance] = useState(false);
  const [library, setLibrary] = useState(false);
  const [cairoPlace, setCairoPlace] = useState<'chemist' | 'museum' | null>(null);
  const goTo = (t: SetTab, anchor?: string) => {
    setMenu(false); setTab(t);
    if (anchor) window.setTimeout(() => document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };
  const [wardrobe, setWardrobe] = useState(false);
  const st = settlementById(id);
  const [talkTo, setTalkTo] = useState<string | null>(null);
  const [inVenue, setInVenue] = useState(false);
  const [inCity, setInCity] = useState(false);
  const [inAuction, setInAuction] = useState<string | null>(null);
  const [houseWalk, setHouseWalk] = useState<string | null>(null);
  const [cabaret, setCabaret] = useState<string | null>(null);
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
  const [sailing, setSailing] = useState<{ to: string } | null>(null);
  const offers = localOffers(id, g.day, g.world.boughtLocal, g.world.friends, g.reputation);
  const hasMarket = st.sells.length > 0 || Object.keys(st.demand).length > 0;
  const ships = seaRoutesFrom(id);
  const quests = Object.entries(g.world.quests).filter(([, v]) => v !== 'done');
  const demandTraits = Object.entries(st.demand).filter(([, v]) => (v ?? 0) > 0).map(([k]) => k);
  const zoom = 3;

  // Re-check jobs and waiting visitors whenever this town's panel opens while you're actually
  // there — not just on arrival. A job's requirement (an extra pack animal, say) can be met
  // locally, after arriving short of it, and without this the job silently never becomes
  // collectible again until the player leaves and re-enters the town.
  useEffect(() => {
    if (g.world.at !== id) return;
    useGame.getState().checkJobs(id);
    // a waiting visitor's sale (or a job becoming collectible) fires here too, and otherwise only
    // shows as a toast that can come and go before the player looks up from what they were doing —
    // put it in the settlement panel's own note as well, where it stays until they dismiss it
    const jn = useGame.getState().jobNote;
    if (jn) setNote(jn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <div className={`overlay settlement${menu ? ' menu-open' : ''}`} role="dialog" aria-label={st.name} data-testid="settlement">
      {wardrobe && <Wardrobe onClose={() => setWardrobe(false)} />}
      <div className="set-head">
        {id === 'giza' ? <img className="thumb" src="art/world/giza-district.jpg" alt="" style={{ objectFit: 'cover', objectPosition: '55% 45%', width: '100%' }} /> : walk?.map ? <img className="thumb" src={walk.map} alt="" style={{ objectFit: 'cover', objectPosition: '50% 45%', width: '100%' }} /> : <MapThumb x={st.x} y={st.y} zoom={zoom} />}
        <div className="set-head-shade" />
        <div className="set-title">
          <small>{st.region.toUpperCase()} · {st.kind === 'home' ? 'YOUR STALL' : st.kind.toUpperCase()}</small>
          <h2>{st.name}</h2>
        </div>
        <button className="btn set-close door-btn leave slim" onClick={onClose} data-testid="leave-settlement">⟵ Leave</button>
        <button className="btn set-menu slim" onClick={() => setMenu(true)} data-testid="town-menu-open">☰ Town</button>
        <span className="set-cash" title="Your money" data-testid="set-cash"><Icon name="coin" />{fmt(g.cash)}</span>
      </div>
      {ships.length > 0 && (
        <div className="port-sail" id="sec-sail" data-testid="port-sail">
          <div className="section-label">SAIL FROM {st.name.toUpperCase()}</div>
          <div className="mkt">
            {ships.map((r) => (
              <div className="mkt-row" key={r.to}>
                <span><b>{settlementById(r.to).name}</b><small>{r.days} day{r.days > 1 ? 's' : ''} at sea, deck class</small></span>
                <button className="btn primary" disabled={g.cash < r.fare || !!sailing} onClick={() => setSailing({ to: r.to })} data-testid={`sail-${r.to}`}>Sail · {fmt(r.fare)}</button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="set-body">
        <div className="set-tabs" role="tablist">
          {([['town', 'Town'], ['market', 'Market'], ['animals', 'Animals'], ['guards', 'Guards']] as [SetTab, string][]).map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)} data-testid={`tab-${k}`}>{label}</button>
          ))}
        </div>
        {note && <p className="set-note" data-testid="set-note">{note}</p>}
        {tab !== 'town' && <div className="set-purse" data-testid="set-purse"><Icon name="coin" />You have <b>{fmt(g.cash)}</b></div>}
        {tab === 'town' && (<>
        <p className="set-blurb">{st.blurb}</p>
        {houses.length > 0 && (
          <div className="houses" id="sec-houses" data-testid="auction-houses">
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
            <div className="section-label" id="sec-people">PEOPLE</div>
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

        {(HAMMAMS[id] || PIECE_ORDER.some((pid) => soldIn(PIECES[pid], id)) || Object.values(BOOKS).some((b) => b.where.includes(id))) && (
          <>
            <div className="section-label">BATHS, TAILORS AND BOOKS</div>
            <div className="mkt">
              {HAMMAMS[id] && (
                <div className="mkt-row" data-testid="hammam">
                  <span className="svc-ico"><Icon name="tea" /></span>
                  <span><b>{HAMMAMS[id].name}</b><small>Wash off the road. Your clothes are {g.attire?.clean >= 70 ? 'clean' : g.attire?.clean >= 35 ? 'dusty' : 'filthy'} ({Math.round(g.attire?.clean ?? 100)}%). Clean clothes mean charisma.</small></span>
                  <button className="btn primary" disabled={g.cash < HAMMAMS[id].cost || (g.attire?.clean ?? 100) >= 100} onClick={() => setNote(g.bathe(id))} data-testid="bathe">Bathe {fmt(HAMMAMS[id].cost)}</button>
                </div>
              )}
              {(() => {
                const special = PIECE_ORDER.filter((pid) => PIECES[pid].where.includes(id));
                const all = PIECE_ORDER.filter((pid) => soldIn(PIECES[pid], id));
                return (
                  <div className="mkt-row" data-testid="tailor">
                    <span className="svc-ico"><Icon name="needle" /></span>
                    <span><b>Tailors and outfitters</b><small>{all.length} pieces for sale{special.length ? `, among them ${special.slice(0, 3).map((pid) => PIECES[pid].name.toLowerCase()).join(', ')}` : ''}. Try anything on before you pay.</small></span>
                    <button className="btn primary" onClick={() => setWardrobe(true)} data-testid="open-tailor">Try on</button>
                  </div>
                );
              })()}
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

        {venuesIn(id).length > 0 && (
          <>
            <div className="section-label" id="sec-venues">CABARETS AND THEATRES</div>
            {venuesIn(id).map((v) => {
              const open = venueOpen(v, g.day);
              const c = NPCS[v.contact];
              return (
                <div key={v.id} className={`court-card venue-card${open ? '' : ' locked'}`} data-testid={`venue-${v.id}`}>
                  <div className="venue-pic">
                    <img className="court-img" src={open ? venueArt(v, 'exterior') : CLOSED_DOOR} alt={v.name} />
                    {v.opens && !open && <span className="venue-badge"><Icon name="lock" /> {v.opens.label}</span>}
                    {v.since && open && <span className="venue-badge since">{v.since}</span>}
                  </div>
                  <div className="court-body">
                    <div className="court-who">
                      {open ? <Portrait id={c.id} look={c.look} accent={c.accent} size={54} /> : <span className="venue-shut"><Icon name="lock" /></span>}
                      <span><b>{v.name}</b><small>{open ? `${c.name} · ${c.role.split(',')[0]}` : `${v.kind} · ${v.street}`}</small></span>
                    </div>
                    <p>{v.history}</p>
                    {open
                      ? <button className="btn primary" onClick={() => setCabaret(v.id)} data-testid={`enter-${v.id}`}>Go in · a table is {fmt(v.ticket)}</button>
                      : <button className="btn" disabled data-testid={`enter-${v.id}`}>Shuttered · {v.opens?.label}</button>}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {venue && royal?.royal && (
          <>
            <div className="section-label" id="sec-court">ROYAL COURT</div>
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
            {g.inventory.filter((i) => !i.restoringUntil && !i.stored).length === 0 && (
              <p className="set-demand" id="sec-sell" data-testid="sell-none">You have no rugs with you to sell. Rugs are packed for the road at your Giza stall (Stock), and only packed rugs travel.</p>
            )}
            {g.inventory.filter((i) => !i.restoringUntil && !i.stored).length > 0 && (
              <div className="sell-box" id="sec-sell" data-testid="sell-box">
                <div className="section-label">SELL YOUR RUGS HERE</div>
                <div className="mkt">
                  {g.inventory.filter((i) => !i.restoringUntil && !i.stored).map((i) => {
                    const t = RUGS[i.typeId];
                    // matches the same-day-same-town cap sellLocal() applies, so the price on the
                    // button is the price you actually get, not the higher uncapped number
                    const askToday = localAskPrice(id, g.day, i.typeId, i.condition, g.world.friends, g.reputation);
                    const bid = askToday !== undefined ? Math.min(localBid(id, i, g.day), Math.max(0, askToday - 1)) : localBid(id, i, g.day);
                    return (
                      <div className="mkt-row" key={i.uid} data-testid={`sell-${t.id}`}>
                        <img src={rugSrc(t)} alt="" />
                        <span><b>{t.name}</b><small>{i.condition} · {i.provenance} · you paid {fmt(i.paid)}</small></span>
                        <button className="btn" onClick={() => { const b = g.sellLocal(i.uid, id); setNote(`Sold ${t.name} for ${fmt(b)}.`); }}>Sell {fmt(bid)}</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'town' && (<>
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
      {/* the way out, always in reach: the panel scrolls, so the button in the header goes off the top */}
      {!inCity && !inVenue && !inAuction && !houseWalk && !look && !wardrobe && !cabaret && (
        <div className="set-exit">
          <button className="btn door-btn leave" onClick={onClose} data-testid="leave-city">⟵ Leave {st.name} · back to the map</button>
        </div>
      )}
      {menu && !inCity && !inVenue && !inAuction && !houseWalk && !cabaret && !talkTo && !wardrobe && (() => {
        const people = st.people.filter((pid) => pid !== 'kassab' || g.missions?.rival);
        const venues = venuesIn(id);
        const pic = id === 'giza' ? 'art/world/giza-district.jpg' : walk?.map ?? (['alexandria', 'amman', 'baghdad', 'damascus', 'istanbul', 'jerusalem'].includes(id) ? `art/world/city-${id}.jpg` : null);
        const hh = Math.floor(g.world.hour), mm = Math.floor((g.world.hour % 1) * 60);
        const items: [string, string, string, () => void, string][] = [
          ...(id === 'giza' ? [['store', 'Open your stall', 'Serve the day\'s customers', () => { onClose(); onStall(); }, 'menu-stall'] as [string, string, string, () => void, string]] : []),
          ...(walk ? [['map', 'Walk the streets', walk.pois.filter((p) => p.kind === 'goto').map((p) => p.name).slice(0, 3).join(' · '), () => { setMenu(false); setInCity(true); }, 'menu-walk'] as [string, string, string, () => void, string]] : []),
          ...(hasMarket && id !== 'giza' ? [['tag', (() => { const n = g.inventory.filter((i) => !i.restoringUntil && !i.stored).length; return n ? `Sell your rugs · ${n}` : 'Sell your rugs'; })(), g.inventory.some((i) => !i.restoringUntil && !i.stored) ? 'Local dealers bid on what you carry' : 'None packed: pack rugs at Giza first', () => goTo('market', 'sec-sell'), 'menu-sell'] as [string, string, string, () => void, string]] : []),
          ['bag', 'The market', hasMarket && id !== 'giza' ? 'Buy rugs and food' : 'Buy food for the road', () => goTo('market'), 'menu-market'],
          ['camel', 'Animals', 'Camels, horses, donkeys and mules', () => goTo('animals'), 'menu-animals'],
          ['shield', 'Hire guards', 'Men for the road, and your roster', () => goTo('guards'), 'menu-guards'],
          ...(houses.length ? [['scale', `Auction houses · ${houses.length}`, houses.some((h) => saleOn(h.id, g.day)) ? 'A sale is on today' : `Next sale ${dateLabel(Math.min(...houses.map((h) => nextSale(h.id, g.day))))}`, () => goTo('town', 'sec-houses'), 'menu-houses'] as [string, string, string, () => void, string]] : []),
          ...(ships.length ? [['anchor', 'Sail from here', ships.map((r) => settlementById(r.to).name).join(' · '), () => goTo('town', 'sec-sail'), 'menu-sail'] as [string, string, string, () => void, string]] : []),
          ...(people.length ? [['people', 'People', people.map((pid) => NPCS[pid].name.split(' ')[0]).join(' · '), () => goTo('town', 'sec-people'), 'menu-people'] as [string, string, string, () => void, string]] : []),
          ...(venues.length ? [['star', 'Cabarets and theatres', venues.map((v) => v.name).slice(0, 3).join(' · '), () => goTo('town', 'sec-venues'), 'menu-venues'] as [string, string, string, () => void, string]] : []),
          ...(Object.values(LENDERS).some((l) => l.towns.includes(id)) || INSURERS.includes(id) ? [['coin', Object.values(LENDERS).some((l) => l.towns.includes(id)) ? 'Bank, loans and insurance' : 'Cargo insurance', (g.loans ?? []).length ? `You owe ${(g.loans ?? []).length} lender${(g.loans ?? []).length > 1 ? 's' : ''}` : Object.values(LENDERS).some((l) => l.towns.includes(id)) ? 'Borrow, repay, insure your cargo' : 'Cover the rugs you carry', () => setFinance(true), 'menu-finance'] as [string, string, string, () => void, string]] : []),
          ...(LIBRARIES[id] ? [['book', LIBRARIES[id].name, (() => { const w = Object.values(g.arranBooks ?? {}).some((b) => b && ['requested', 'located'].includes(b.phase)); return w ? 'Arran\'s book may be here' : 'Reference books and a copyist'; })(), () => setLibrary(true), 'menu-library'] as [string, string, string, () => void, string]] : []),
          ...(id === 'cairo' ? [['bag', 'A chemist in the Muski', 'Tonics over the counter; drugs only on prescription', () => setCairoPlace('chemist'), 'menu-chemist'] as [string, string, string, () => void, string]] : []),
          ...(id === 'cairo' && g.arranVisit?.permitStage ? [['scale', 'The museum store', g.arranVisit.permitStage === 'letter' ? 'Deliver Arran\'s letter to Hamza Effendi' : 'Hamza Effendi has given his permission', () => setCairoPlace('museum'), 'menu-museum'] as [string, string, string, () => void, string]] : []),
          ...(venue ? [['crown', venue.name, royal ? `The court of ${royal.name}` : 'The palace grounds', () => goTo('town', 'sec-court'), 'menu-court'] as [string, string, string, () => void, string]] : []),
        ];
        return (
          <div className="town-menu" role="dialog" aria-label={`${st.name}: what to do`} data-testid="town-menu">
            {pic ? <img className="tm-art" src={pic} alt="" draggable={false} /> : <div className="tm-art tm-map"><MapThumb x={st.x} y={st.y} zoom={zoom} /></div>}
            <div className="tm-shade" />
            <div className="tm-body">
              <div className="tm-title">
                <small>{st.region.toUpperCase()} · {st.kind === 'home' ? 'YOUR STALL' : st.kind.toUpperCase()}</small>
                <h2>{st.name}</h2>
                <span className="tm-when">{dateLine(g.day)} · {String(hh).padStart(2, '0')}:{String(mm).padStart(2, '0')}</span>
              </div>
              <p className="tm-blurb">{st.blurb}</p>
              {note && <p className="tm-note">{note}</p>}
              <div className="tm-list">
                {items.map(([icon, label, sub, act, tid]) => (
                  <button key={tid} className="tm-item" onClick={() => { act(); }} data-testid={tid}>
                    <Icon name={icon} /><span><b>{label}</b>{sub && <small>{sub}</small>}</span>
                  </button>
                ))}
                <button className="tm-item quiet" onClick={() => setMenu(false)} data-testid="menu-all"><Icon name="book" /><span><b>Everything in {st.name}</b><small>Baths, tailors, books, tasks and the rest</small></span></button>
                <button className="tm-item leave" onClick={onClose} data-testid="menu-leave"><Icon name="map" /><span><b>Leave {st.name}</b><small>Back to the map</small></span></button>
              </div>
            </div>
          </div>
        );
      })()}
      {finance && <FinancePanel onClose={() => setFinance(false)} />}
      {library && <LibraryView town={id} onClose={() => setLibrary(false)} />}
      {cairoPlace && <CairoPlace place={cairoPlace} onClose={() => setCairoPlace(null)} />}
      <Tip id="town" when={!menu && !inCity && !inVenue && !talkTo && !inAuction} />
      {look && <div className="venue-overlay"><RugViewer preview={look} onClose={() => setLook(null)} /></div>}
      {/* Walking the streets stays open underneath whatever shop or hall it leads to, so stepping back
          out of that door returns you to the same street, not all the way out to the town panel. */}
      {inCity && walk && (
        <div className="venue-overlay">
          <Venue def={walk} onLeave={() => setInCity(false)} onExitCity={() => { setInCity(false); onClose(); }} exitLabel={`Leave ${st.name}`} onAction={(a) => {
            if (a === 'palace') { if (venue?.map) setInVenue(true); else { setInCity(false); setTab('town'); } }
            else if (a.startsWith('venue:')) {
              const v = VENUES_1925[a.slice(6)];
              if (v && venueOpen(v, g.day)) setCabaret(v.id);
              else { setInCity(false); setTab('town'); setNote(`${v?.name ?? 'The hall'} is shuttered. A sign on the door says it opens in 1926.`); }
            }
            else if (a.startsWith('house:')) setHouseWalk(a.slice(6));
            else if (a.startsWith('npc:')) setTalkTo(a.slice(4));
            else { setInCity(false); setTab(a as SetTab); }
          }} />
        </div>
      )}
      {houseWalk && (
        <div className="venue-overlay">
          <Venue def={auctionVenue(houseWalk)} onLeave={() => setHouseWalk(null)} onExitCity={() => { setHouseWalk(null); setInCity(false); onClose(); }} exitLabel={`Leave ${st.name}`} onAction={(a) => { if (a === 'floor') setInAuction(houseWalk); }} />
        </div>
      )}
      {inAuction && <Auction houseId={inAuction} onClose={() => setInAuction(null)} />}
      {inVenue && venue && <div className="venue-overlay"><Venue id={venue.id} onLeave={() => setInVenue(false)} /></div>}
      {cabaret && <div className="venue-overlay"><Cabaret id={cabaret} onLeave={() => setCabaret(null)} /></div>}
      {audience && <AudienceOverlay onDone={() => setAudience(false)} />}
      {talkTo && <Dialogue npcId={talkTo} onClose={(m) => { setTalkTo(null); if (m) setNote(m); }} />}
      {sailing && (
        <SailingTransition
          from={st.name}
          to={settlementById(sailing.to).name}
          onArrive={() => {
            const dest = sailing.to;
            setSailing(null);
            const m = g.sail(dest, 'sea', id);
            setNote(m);
            if (m.startsWith('You sailed')) onClose();
          }}
        />
      )}
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
