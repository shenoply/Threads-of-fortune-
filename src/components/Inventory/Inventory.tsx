import { CONDITION_FACTOR } from '../../data/rugs';
import { useState } from 'react';
import { BillCard } from '../Rumours/Rumours';
import { fmt } from '../../game/economy/money';
import { restorePrice, stallName, useGame } from '../../game/state/store';
import { RUGS } from '../../data/rugs';
import { RESTORATION, UPGRADES } from '../../data/suppliers';
import { rugSrc } from '../RugViewer/rugArt';
import { RugViewer } from '../RugViewer/RugViewer';
import { CaravanRoster } from '../World/CaravanPanels';
import { StallUpgrades, affordableUpgrades, openUpgrades } from './StallUpgrades';
import { settlementById } from '../../game/systems/world';
import { malekItem } from '../../data/malekMenu';
import { fedOf, parcelWeight, parcelsWeight, waterOf } from '../../game/systems/malek';

export function Inventory({ onRashid }: { onRashid?: () => void } = {}) {
  const g = useGame();
  const [view, setView] = useState<string | null>(null);
  return (
    <div className="screen" data-testid="inventory">
      <div className="screen-head">
        <div>
          <div className="eyebrow">STOCK AND STALL</div>
          <h2>Inventory</h2>
          <p>{g.inventory.length} rug{g.inventory.length === 1 ? '' : 's'}, {g.inventory.filter((i) => !i.stored).length} packed for the road. Rugs left at the stall do not slow the caravan. Packing and unpacking can only be done at the Giza stall.</p>
        </div>
        <div className="stock-head-btns">
          {onRashid && <button className="btn primary" onClick={onRashid} data-testid="stock-rashid">Buy from Rashid</button>}
          <button className="btn" onClick={openUpgrades} data-testid="stock-upgrades">Improve your stall{affordableUpgrades(g).length ? ` · ${affordableUpgrades(g).length}` : ''}</button>
        </div>
      </div>
      {(g.papers ?? []).length > 0 && (
        <div className="inv-papers" data-testid="inv-papers">
          <div className="section-label">PAPERS YOU CARRY</div>
          {(g.papers ?? []).map((pp) => (
            <p key={pp.id} data-testid={`inv-paper-${pp.bookId}`}><b>{pp.kind === 'copy' ? 'Copy' : 'Duplicate'}:</b> {pp.title} <small>from {settlementById(pp.from).name}, for Arran in Giza</small></p>
          ))}
        </div>
      )}
      <ParcelList />
      <div className="inv-list">
        {g.inventory.map((i) => {
          const t = RUGS[i.typeId];
          const r = RESTORATION[i.condition];
          return (
            <div className="inv-item" key={i.uid} data-testid={`inv-${t.id}`} data-uid={i.uid}>
              <button className="img" onClick={() => setView(i.uid)} style={{ padding: 0, border: 0 }} aria-label={`Inspect ${t.name}`}>
                <img src={rugSrc(t)} alt="" style={i.condition === 'Dirty' ? { filter: 'sepia(0.5) brightness(0.75)' } : undefined} />
              </button>
              <div>
                <h3>{t.name}</h3>
                <div className="meta">
                  {i.restoringUntil ? (
                    <span className="cond restoring" data-testid="restoring">{i.condition === 'Dirty' ? `Drying in the courtyard until day ${i.restoringUntil}` : `At the restorer until day ${i.restoringUntil}`}</span>
                  ) : (
                    <span className={`cond ${i.condition}`} data-testid="condition">{i.condition}{i.restored ? ' · restored' : ''}</span>
                  )}{' '}
                  · {t.origin.split(',')[0]} · paid {fmt(i.paid)}
                  <br />
                  Provenance: {i.provenance}
                  {g.intel?.[i.typeId] && <><br /><span className="intel" data-testid="intel">Seen at auction: about {fmt(Math.round((g.intel[i.typeId].movingAveragePt ?? 0) * CONDITION_FACTOR[i.condition]))} in this condition ({g.intel[i.typeId].observations} sale{g.intel[i.typeId].observations === 1 ? '' : 's'})</span></>}
                </div>
                {i.notes.slice(-1).map((n) => (
                  <div className="note" key={n}>{n}</div>
                ))}
                <div className="btns">
                  <button className="btn" onClick={() => setView(i.uid)}>Inspect</button>
                  {g.world.at === 'giza' ? (
                    <button className="btn" onClick={() => g.toggleStored(i.uid)} data-testid="toggle-stored">{i.stored ? 'Pack for the road' : 'Leave at the stall'}</button>
                  ) : (
                    <span className="cond">{i.stored ? 'At your stall in Giza · return there to pack it for the road' : 'With the caravan'}</span>
                  )}
                  {r && !i.restoringUntil && (
                    <button className="btn" disabled={g.cash < r.cost} onClick={() => g.restore(i.uid)} data-testid="restore" title={r.label}>
                      {i.condition === 'Dirty' ? 'Wash' : i.condition === 'Worn' ? 'Re-fringe' : 'Reweave'} · {fmt(restorePrice(i))} · {r.days}d
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <CaravanRoster />

      <BillCard />
      <div className="section-label" id="sec-upgrades">STALL UPGRADES</div>
      <StallUpgrades />
      {view && <RugViewer uid={view} onClose={() => setView(null)} />}
    </div>
  );
}

/** Food parcels from Malek's: eaten one serving at a time, here or on the road (no time passes). */
function ParcelList() {
  const g = useGame();
  const [note, setNote] = useState('');
  const ps = g.parcels ?? [];
  if (!ps.length) return null;
  const c = g.condition;
  return (
    <div className="inv-papers" data-testid="inv-parcels">
      <div className="section-label">FOOD FOR THE ROAD · {parcelsWeight(ps)} kg</div>
      <p><small>Fed {fedOf(c)}/100 · Water {waterOf(c)}/100 · Fatigue {c?.fatigue ?? 0}. Fed at nightfall, your own ration stays in the sack. Salted food costs water.</small></p>
      {ps.map((p) => {
        const it = malekItem(p.item);
        return (
          <p key={p.uid} data-testid={`inv-parcel-${p.item}`}>
            <b>{it.name}</b> · {p.servings} serving{p.servings === 1 ? '' : 's'} · {parcelWeight(p)} kg · good until day {p.spoilsDay}{' '}
            <button className="btn small" onClick={() => { const r = useGame.getState().eatParcel(p.uid); setNote(r.report ? `${r.msg} Fed +${r.report.fed.gain}${r.report.fed.wasted ? ` (${r.report.fed.wasted} wasted)` : ''}, fatigue −${r.report.rest.gain}, water ${r.report.water.gain}.` : r.msg); }} data-testid={`inv-eat-${p.uid}`}>Eat a serving</button>
          </p>
        );
      })}
      {note && <p role="status" data-testid="inv-parcel-note"><small>{note}</small></p>}
    </div>
  );
}
