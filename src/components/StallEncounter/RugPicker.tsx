// Every rug you can show this buyer, in one list: sort by what it usually sells for, by name or by
// condition, see what you paid, and put any of them on the table. The counter only has room for three.
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { RUGS } from '../../data/rugs';
import { fmt, snap } from '../../game/economy/money';
import { perceivedValue } from '../../game/systems/negotiation';
import { rugSrc } from '../RugViewer/rugArt';
import type { RugItem } from '../../game/types';

/** what a rug of this kind, in this state, usually sells for at the stall (before your haggling) */
export const typicalSale = (it: RugItem) => {
  const t = RUGS[it.typeId];
  return t ? snap(perceivedValue(t, it)) : 0;
};
/** names that tell repeats apart: the second Fayoum Hearth you hold is "Fayoum Hearth 2" (by stock order) */
export function rugNames(inventory: RugItem[]): Record<string, string> {
  const count: Record<string, number> = {}, seen: Record<string, number> = {}, out: Record<string, string> = {};
  for (const i of inventory) count[i.typeId] = (count[i.typeId] ?? 0) + 1;
  for (const i of inventory) {
    const name = RUGS[i.typeId]?.name ?? i.typeId;
    seen[i.typeId] = (seen[i.typeId] ?? 0) + 1;
    out[i.uid] = count[i.typeId] > 1 ? `${name} ${seen[i.typeId]}` : name;
  }
  return out;
}
const TIER = ['', 'Common', 'Fine', 'Exceptional', 'Legendary'];
const COND = ['Excellent', 'Good', 'Worn', 'Dirty', 'Damaged'];
type Sort = 'high' | 'low' | 'name' | 'condition';

export function RugPicker({ rugs, names, presented, onPick, onClose }: { rugs: RugItem[]; names: Record<string, string>; presented?: string; onPick: (uid: string) => void; onClose: () => void }) {
  const [sort, setSort] = useState<Sort>('high');
  const list = useMemo(() => {
    const r = [...rugs];
    if (sort === 'high') r.sort((a, b) => typicalSale(b) - typicalSale(a));
    if (sort === 'low') r.sort((a, b) => typicalSale(a) - typicalSale(b));
    if (sort === 'name') r.sort((a, b) => (names[a.uid] ?? '').localeCompare(names[b.uid] ?? '', undefined, { numeric: true }));
    if (sort === 'condition') r.sort((a, b) => COND.indexOf(a.condition) - COND.indexOf(b.condition));
    return r;
  }, [rugs, sort, names]);
  const total = rugs.reduce((n, it) => n + typicalSale(it), 0);
  return createPortal(
    <div className="rugpick" role="dialog" aria-label="All your rugs" data-testid="rug-picker" onClick={onClose}>
      <div className="rugpick__sheet" onClick={(e) => e.stopPropagation()}>
        <header className="rugpick__head">
          <div>
            <h3>All your rugs · {rugs.length}</h3>
            <p>Usually sell for about {fmt(total)} together. Tap one to put it on the table.</p>
          </div>
          <button className="btn small" onClick={onClose} data-testid="rug-picker-close">Close</button>
        </header>
        <div className="rugpick__sort" role="radiogroup" aria-label="Sort by">
          {([['high', 'Value: high'], ['low', 'Value: low'], ['name', 'Name'], ['condition', 'Condition']] as [Sort, string][]).map(([k, label]) => (
            <button key={k} className={`btn small ${sort === k ? 'primary' : ''}`} role="radio" aria-checked={sort === k} onClick={() => setSort(k)} data-testid={`rug-sort-${k}`}>{label}</button>
          ))}
        </div>
        <ul className="rugpick__list">
          {list.map((it) => {
            const t = RUGS[it.typeId];
            return (
              <li key={it.uid}>
                <button className={`rugpick__row ${presented === it.uid ? 'is-on' : ''}`} onClick={() => onPick(it.uid)} data-testid={`rug-pick-${it.uid}`}>
                  <img src={rugSrc(t)} alt="" />
                  <span className="rugpick__txt">
                    <b>{names[it.uid] ?? t.name}</b>
                    <small>{TIER[t.tier ?? 1]} · {it.condition} · {t.origin.split(',')[0].replace('Said to be ', '')}</small>
                  </span>
                  <span className="rugpick__val">
                    <b data-testid="rug-value">≈ {fmt(typicalSale(it))}</b>
                    <small>paid {fmt(it.paid)}</small>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="rugpick__note">"≈" is what a rug like this, in this condition and with this provenance, usually fetches before haggling. A keen buyer pays more; a hard one less.</p>
      </div>
    </div>,
    document.body,
  );
}
