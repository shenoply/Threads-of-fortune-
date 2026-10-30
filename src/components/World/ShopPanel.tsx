import { sceneSmall } from '../../game/stallScenes';
import { useState } from 'react';
import { useGame, keptBack } from '../../game/state/store';
import { fmt } from '../../game/economy/money';
import { RUGS } from '../../data/rugs';
import { SHOP_CITIES, AGENTS, RASHIDS_MAN, RAIL_DAYS, honestyWord, skillWord, wageWord } from '../../data/shops';
import { onWall, shopPrice, railFee, weekAccount } from '../../game/systems/shops';
import { settlementById } from '../../game/systems/world';
import { UPGRADES } from '../../data/suppliers';
import { dateFor } from '../../game/economy/economy';

/** The town menu's line for a shop of your own: owned, for sale, or what stands in the way. */
export function shopTileSub(g: ReturnType<typeof useGame.getState>, sid: string): string {
  const c = SHOP_CITIES[sid];
  const sh = g.shops?.[sid];
  if (sid === 'cairo') return sh?.khan ? 'Your shop in the Khan el-Khalili' : `In the Khan el-Khalili · ${fmt(c.cost)}, under Improve at your stall`;
  if (!sh) return g.reputation < c.rep ? `${fmt(c.cost)} · needs reputation ${c.rep}` : `A lease ${c.place} · ${fmt(c.cost)}`;
  if (!sh.agent) return 'Yours · nobody keeps it: hire a man';
  const n = onWall(sh, g.day).length;
  return `${sh.agent.name} · ${n ? `${n} rug${n > 1 ? 's' : ''} on the wall` : 'nothing of yours to sell'}`;
}

/** A shop of your own in a city: buy the lease, take on a man to keep it, leave him rugs, look over his book. */
export function ShopPanel({ sid, onClose }: { sid: string; onClose: () => void }) {
  const g = useGame();
  const [note, setNote] = useState('');
  const c = SHOP_CITIES[sid];
  const st = settlementById(sid);
  const sh = g.shops?.[sid];
  const say = (m: string) => { if (m) setNote(m); };
  const carried = g.inventory.filter((i) => !i.stored && !i.restoringUntil && !keptBack(g, i));
  const candidates = [...(sid === 'alexandria' && !sh?.noNahhas ? [RASHIDS_MAN] : []), ...(AGENTS[sid] ?? [])].filter((a) => a.id !== sh?.agent?.id);
  const wall = onWall(sh, g.day);
  const coming = (sh?.stock ?? []).filter((r) => (r.arrives ?? 0) > g.day);
  // rugs kept at the Giza stall, to send here by rail as freight (one wire for the lot)
  const atStall = g.inventory.filter((i) => i.stored && !i.restoringUntil && !keptBack(g, i));
  const here = g.world.at ?? 'giza';
  const [pick, setPick] = useState<string[]>([]);
  const chosen = pick.filter((u) => atStall.some((r) => r.uid === u));
  const egypt = st.region === 'Egypt';
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal-card big-card shop-card" onClick={(e) => e.stopPropagation()} data-testid="shop-panel">
        <div className="big-card-head"><h2>{sh ? `Your shop in ${st.name}` : 'A shop of your own'}</h2><button className="btn slim" onClick={onClose} data-testid="shop-close">Close</button></div>
        <ShopPicture sid={sid} owned={!!sh} />
        {note && <p className="wire-reply" data-testid="shop-note">{note}</p>}

        {sid === 'cairo' ? (
          <p className="dim">{sh?.khan
            ? 'Your shop in the Khan el-Khalili. You keep it yourself: richer buyers find you there.'
            : `The shop in the Khan el-Khalili is taken from Improve at your stall in Giza: ${fmt(UPGRADES.find((u) => u.id === 'khan')!.cost)}, reputation ${UPGRADES.find((u) => u.id === 'khan')!.rep}, after the bazaar stall.`}</p>
        ) : !sh ? (
          <>
            <p className="dim">A narrow shop {c.place}, with a shutter, a wall for rugs and a room behind. You hire a man to keep it; he sells what you leave with him and writes to you every Monday with the week's takings.</p>
            <p className="dim small" data-testid="shop-how"><b>How it works:</b> you take the lease here, in {st.name}. After that the shop trades without you; come back only to leave rugs on its wall. On the map, a shop sign on a city's pin shows where shops can be had: outlined when you can buy, faint when you need more reputation, gold when it is yours.</p>
            <div className="mkt">
              <div className="mkt-row">
                <span><b>The lease and fittings</b><small>{g.reputation < c.rep ? `The landlords want reputation ${c.rep} (yours is ${g.reputation})` : 'Yours for as long as you trade'}</small></span>
                <button className="btn primary" disabled={g.cash < c.cost || g.reputation < c.rep} onClick={() => say(g.buyShop(sid))} data-testid="shop-buy">{fmt(c.cost)}</button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="section-label">WHO KEEPS IT</div>
            {sh.agent ? (
              <div className="mkt">
                <div className="mkt-row">
                  <span><b>{sh.agent.name}</b><small>{skillWord(sh.agent.skill)} · {wageWord(sh.agent)}{sh.last ? ` · last week: ${sh.last.sold} sold, ${fmt(sh.last.sent)} sent` : ''}</small></span>
                  <button className="btn small" onClick={() => say(g.checkBooks(sid))} data-testid="shop-books">Look over his book</button>
                </div>
                {sh.last && <p className="dim small" data-testid="shop-week">Week to {dateFor(sh.last.day).short}: {weekAccount(sh.last)}</p>}
                <div className="mkt-row">
                  <span><small>Sent you so far: {fmt(sh.takings ?? 0)}{sh.wages ? `, less ${fmt(sh.wages)} in retainers` : ''}</small></span>
                  <button className="btn small" onClick={() => say(g.dismissAgent(sid))} data-testid="shop-dismiss">Let him go</button>
                </div>
              </div>
            ) : <p className="dim">Nobody keeps the shop. Until you take a man on, it sells nothing.</p>}
            {(!sh.agent || candidates.length > 0) && (
              <>
                <div className="section-label">{sh.agent ? 'OTHERS WHO WANT THE PLACE' : 'MEN WHO WANT THE PLACE'}</div>
                <div className="mkt">
                  {candidates.map((a) => (
                    <div className="mkt-row" key={a.id}>
                      <span><b>{a.name}</b><small>{skillWord(a.skill)}; {a.id === RASHIDS_MAN.id ? "Rashid's man" : honestyWord(a.honesty)} · {wageWord(a)}</small></span>
                      <button className="btn small" onClick={() => say(g.hireAgent(sid, a.id))} data-testid={`shop-hire-${a.id}`}>Take on</button>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="section-label">ON THE WALL · {wall.length}</div>
            <div className="mkt">
              {!wall.length && <p className="dim small">Nothing of yours. An empty shop earns nothing.</p>}
              {wall.map((r) => (
                <div className="mkt-row" key={r.uid}>
                  <span><b>{RUGS[r.typeId].name}</b><small>{r.condition}{sh.agent ? ` · he hopes for about ${fmt(shopPrice(sid, r, sh.agent.skill))}` : ''}</small></span>
                  <button className="btn small" onClick={() => say(g.takeStock(sid, r.uid))} data-testid={`shop-take-${r.uid}`}>Take back</button>
                </div>
              ))}
              {coming.map((r) => (
                <div className="mkt-row" key={r.uid}><span><b>{RUGS[r.typeId].name}</b><small>On the train: arrives {dateFor(r.arrives ?? g.day).short}</small></span></div>
              ))}
            </div>

            <div className="section-label">LEAVE RUGS YOU CARRY</div>
            <div className="mkt">
              {!carried.length && <p className="dim small">You carry no rugs. Rugs kept at your Giza stall can be sent here by rail: see below.</p>}
              {carried.map((r) => (
                <div className="mkt-row" key={r.uid}>
                  <span><b>{RUGS[r.typeId].name}</b><small>{r.condition} · paid {fmt(r.paid)}</small></span>
                  <button className="btn small primary" onClick={() => say(g.leaveStock(sid, r.uid))} data-testid={`shop-leave-${r.uid}`}>Leave here</button>
                </div>
              ))}
            </div>

            <div className="section-label">SEND FROM YOUR STALL BY RAIL</div>
            <p className="dim small">The boy at Giza puts rugs kept at the stall on the train as freight: {fmt(railFee(sid, 'giza', 1))} a rug{here === 'giza' ? '' : ', and one wire for the lot'}. They reach {st.name} in {egypt ? RAIL_DAYS.egypt : RAIL_DAYS.abroad} days. A wall of six or more sells best.</p>
            <div className="mkt" data-testid="shop-rail">
              {!atStall.length && <p className="dim small">No rugs are kept at the stall.</p>}
              {atStall.map((r) => {
                const on = chosen.includes(r.uid);
                return (
                  <div className="mkt-row" key={r.uid}>
                    <span><b>{RUGS[r.typeId].name}</b><small>{r.condition} · paid {fmt(r.paid)}{sh.agent ? ` · he would hope for about ${fmt(shopPrice(sid, r, sh.agent.skill))}` : ''}</small></span>
                    <button className={`btn small ${on ? 'primary' : ''}`} onClick={() => setPick(on ? chosen.filter((u) => u !== r.uid) : [...chosen, r.uid])} data-testid={`shop-pick-${r.uid}`}>{on ? 'Chosen' : 'Choose'}</button>
                  </div>
                );
              })}
              {atStall.length > 0 && (
                <div className="mkt-row">
                  <span><small>{chosen.length ? `${chosen.length} rug${chosen.length > 1 ? 's' : ''} chosen` : 'Choose the rugs to send'}</small></span>
                  <button className="btn small primary" disabled={!chosen.length || g.cash < railFee(sid, here, chosen.length)} onClick={() => { say(g.railStock(sid, chosen)); setPick([]); }} data-testid="shop-rail-send">Send · {fmt(railFee(sid, here, Math.max(1, chosen.length)))}</button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** The inside of the shop (art/shops/<city>.webp): the dearer the city, the bigger and finer the room.
 *  Shown dimmed with "for sale" before it is yours; nothing at all until the picture exists. */
function ShopPicture({ sid, owned }: { sid: string; owned: boolean }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return (
    <div className={`shop-pic${owned ? '' : ' for-sale'}`} data-testid="shop-pic">
      <img src={sceneSmall(sid)} alt="" draggable={false} onError={() => setOk(false)} />
      {!owned && <span className="shop-pic__tag">For lease</span>}
    </div>
  );
}
