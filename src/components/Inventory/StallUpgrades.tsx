import { fmt } from '../../game/economy/money';
import { stallName, useGame } from '../../game/state/store';
import { UPGRADES, type Upgrade } from '../../data/suppliers';
import { useState } from 'react';
import { DRESSING, dressingArt, type DressingPiece } from '../../data/shops';
import { Icon } from '../Icon';
import { Fold } from '../Fold/Fold';

/** a dressing piece's picture, or its icon while the picture does not exist yet */
function DressPic({ d }: { d: DressingPiece }) {
  const [art, setArt] = useState(true);
  return <span className="dress-pic" aria-hidden="true">{art ? <img src={dressingArt(d.id)} alt="" loading="lazy" onError={() => setArt(false)} style={{ objectFit: 'contain' }} /> : <Icon name={d.icon} />}</span>;
}

/** Pieces to dress the Giza stall: each a small, lasting help with every buyer. */
export function StallDressing() {
  const g = useGame();
  const own = g.dressing ?? [];
  const [note, setNote] = useState('');
  return (
    <>
      <Fold id="dress-stall" testid="dressing-fold" title="Dress the stall" gist={`${own.length} of ${DRESSING.length} · lamps, kilims, a bench…`}>
      {note && <p className="dim small" data-testid="dressing-note">{note}</p>}
      <div className="dress-list" data-testid="stall-dressing">
        {DRESSING.map((d) => {
          const owned = own.includes(d.id);
          return (
            <div className={`upgrade ${!owned && g.cash >= d.cost ? 'can-buy' : ''}`} key={d.id}>
              <DressPic d={d} />
              <div className="u-main"><b>{d.name}</b><span>{d.effect}</span></div>
              {owned ? <span className="owned">Owned</span>
                : <button className={`btn ${g.cash >= d.cost ? 'primary' : ''}`} disabled={g.cash < d.cost} onClick={() => setNote(g.buyDressing(d.id))} data-testid={`dress-${d.id}`}>{fmt(d.cost)}</button>}
            </div>
          );
        })}
      </div>
      </Fold>
    </>
  );
}

/** Which upgrades you could buy right now: reputation met, the one before owned, and the cash in hand. */
export function upgradeState(u: Upgrade, g: { upgrades: string[]; reputation: number; cash: number }) {
  if (g.upgrades.includes(u.id)) return 'owned' as const;
  if (u.rep && g.reputation < u.rep) return 'rep' as const;
  if (u.after && !g.upgrades.includes(u.after)) return 'after' as const;
  return g.cash >= u.cost ? 'buy' as const : 'short' as const;
}
export const affordableUpgrades = (g: { upgrades: string[]; reputation: number; cash: number }) => UPGRADES.filter((u) => upgradeState(u, g) === 'buy');

/** The stall's upgrades: what each does, what it costs, and what stands in the way. Shown in Stock and from the stall. */
export function StallUpgrades() {
  const g = useGame();
  return (
    <>
      <div className="upgrades" data-testid="stall-upgrades">
        {UPGRADES.map((u) => {
          const st = upgradeState(u, g);
          return (
            <div className={`upgrade ${st === 'buy' ? 'can-buy' : ''}`} key={u.id}>
              <div className="u-main">
                <b>{u.name}</b>
                <span>{u.effect}</span>
              </div>
              {st === 'owned' ? (
                <span className="owned">Owned</span>
              ) : st === 'rep' ? (
                <span className="owned" style={{ color: 'var(--text-dim)' }}>Reputation {u.rep}</span>
              ) : st === 'after' ? (
                <span className="owned" style={{ color: 'var(--text-dim)' }}>Needs {UPGRADES.find((x) => x.id === u.after)?.name.toLowerCase() ?? 'the one before'}</span>
              ) : (
                <button className={`btn ${st === 'buy' ? 'primary' : ''}`} disabled={st !== 'buy'} onClick={() => g.buyUpgrade(u.id)} data-testid={`upgrade-${u.id}`}>
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
      <StallDressing />
    </>
  );
}

/** Open the upgrades sheet from anywhere (the stall, Stock, the reminder chip): the app owns the sheet. */
export const OPEN_UPGRADES = 'tof:open-upgrades';
export const openUpgrades = () => window.dispatchEvent(new Event(OPEN_UPGRADES));

export function UpgradesSheet({ onClose }: { onClose: () => void }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal-card big-card" onClick={(e) => e.stopPropagation()} data-testid="improve-sheet">
        <div className="big-card-head"><h2>Improve your stall</h2><button className="btn slim" onClick={onClose} data-testid="improve-close">Close</button></div>
        <p className="dim">Each one helps every sale from now on. The bigger stalls raise your rent.</p>
        <StallUpgrades />
      </div>
    </div>
  );
}

const DISMISS_KEY = 'tof-upgrade-nudge-dismissed';
/** A reminder under the objective when an upgrade you have not bought becomes affordable. */
export function UpgradeNudge() {
  const g = useGame();
  let dismissed: string[] = [];
  try { dismissed = JSON.parse(localStorage.getItem(DISMISS_KEY) ?? '[]'); } catch { /* private mode */ }
  const u = affordableUpgrades(g).find((x) => !dismissed.includes(x.id));
  if (!u) return null;
  return (
    <div className="upgrade-nudge" data-testid="upgrade-nudge">
      <button className="side-task upgrade-nudge__go" onClick={openUpgrades} data-testid="upgrade-nudge-open">
        <span aria-hidden="true">★</span>Stall upgrade ready: {u.name} · {fmt(u.cost)}
      </button>
      <button className="upgrade-nudge__x" aria-label="Not now" onClick={() => { try { localStorage.setItem(DISMISS_KEY, JSON.stringify([...dismissed, u.id])); } catch { /* private mode */ } useGame.setState({}); }} data-testid="upgrade-nudge-dismiss">×</button>
    </div>
  );
}
