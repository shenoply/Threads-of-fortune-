import { fmt } from '../../game/economy/money';
import { stallName, useGame } from '../../game/state/store';
import { UPGRADES, type Upgrade } from '../../data/suppliers';

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
    </>
  );
}
