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

export function Inventory({ onRashid }: { onRashid?: () => void } = {}) {
  const g = useGame();
  const [view, setView] = useState<string | null>(null);
  return (
    <div className="screen" data-testid="inventory">
      <div className="screen-head">
        <div>
          <div className="eyebrow">STOCK AND STALL</div>
          <h2>Inventory</h2>
          <p>{g.inventory.length} rug{g.inventory.length === 1 ? '' : 's'}, {g.inventory.filter((i) => !i.stored).length} packed for the road. Rugs left at the stall do not slow the caravan.</p>
        </div>
        {onRashid && <button className="btn primary" onClick={onRashid} data-testid="stock-rashid">Buy from Rashid</button>}
      </div>
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
                    <span className="cond restoring" data-testid="restoring">At the restorer until day {i.restoringUntil}</span>
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
                    <span className="cond">{i.stored ? 'At your stall in Giza' : 'With the caravan'}</span>
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
      <div className="section-label">STALL UPGRADES</div>
      <div className="upgrades">
        {UPGRADES.map((u) => {
          const owned = g.upgrades.includes(u.id);
          return (
            <div className="upgrade" key={u.id}>
              <div className="u-main">
                <b>{u.name}</b>
                <span>{u.effect}</span>
              </div>
              {owned ? (
                <span className="owned">Owned</span>
              ) : u.rep && g.reputation < u.rep ? (
                <span className="owned" style={{ color: 'var(--text-dim)' }}>Reputation {u.rep}</span>
              ) : u.after && !g.upgrades.includes(u.after) ? (
                <span className="owned" style={{ color: 'var(--text-dim)' }}>Needs rug mat</span>
              ) : (
                <button className="btn" disabled={g.cash < u.cost} onClick={() => g.buyUpgrade(u.id)} data-testid={`upgrade-${u.id}`}>
                  {fmt(u.cost)}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 10 }}>
        Your stall: {stallName(g.upgrades)}. Growing it raises the rent.
      </p>
      {view && <RugViewer uid={view} onClose={() => setView(null)} />}
    </div>
  );
}
