// Your men as people: the full page on each kind of guard you can hire, and sitting down to talk with
// the ones you have (they also stop you on the road when the food or their patience runs low).
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../../game/state/store';
import { TROOPS } from '../../data/caravan';
import { TROOP_LORE } from '../../data/troopLore';
import { fmt } from '../../game/economy/money';
import { foodDaysLeft, morale as moraleOf, troopCount, wages, troopCap } from '../../game/systems/caravan';

export function TroopPage({ id, onClose, onHire, hireLabel, hireDisabled }: { id: string; onClose: () => void; onHire?: () => void; hireLabel?: string; hireDisabled?: boolean }) {
  const t = TROOPS[id];
  const lore = TROOP_LORE[id];
  if (!t) return null;
  return createPortal(
    <div className="overlay troop-page" data-testid={`troop-page-${id}`}>
      <div className="overlay-head"><h2>{t.name}</h2><span className="sub">{t.plural.toLowerCase()}</span><button className="btn small close" onClick={onClose} data-testid="troop-page-close">✕</button></div>
      <div className="troop-page__body">
        <img className="troop-page__pic" src={`art/troops/${id}.jpg`} alt={t.name} />
        {lore && <p className="troop-page__says">{lore.says}</p>}
        <div className="troop-page__stats">
          <span><small>Strength</small><b>{t.strength}</b></span>
          <span><small>Wage</small><b>{fmt(t.wage)}<i>/day</i></b></span>
          <span><small>To hire</small><b>{t.cost ? fmt(t.cost) : 'Free'}</b></span>
          <span><small>Eats</small><b>1<i> ration/day</i></b></span>
          {t.scout ? <span><small>Scouting</small><b>+{t.scout}</b></span> : null}
          {t.mounted ? <span><small>Mount</small><b>Own</b></span> : null}
        </div>
        <p>{lore?.who ?? t.blurb}</p>
        {lore && (
          <div className="troop-page__lists">
            <div><h3>Good for</h3><ul>{lore.good.map((g) => <li key={g}>{g}</li>)}</ul></div>
            <div><h3>Watch out</h3><ul>{lore.weak.map((g) => <li key={g}>{g}</li>)}</ul></div>
          </div>
        )}
        <p className="dim">Every man is paid each morning and eats a ration a day. Unpaid or hungry men lose patience, and when it runs out one of them walks.</p>
        {onHire && <button className="btn primary troop-page__hire" disabled={hireDisabled} onClick={onHire} data-testid="troop-page-hire">{hireLabel ?? 'Hire'}</button>}
      </div>
    </div>,
    document.body,
  );
}

/** what one of your men says, given how things stand */
export function menMood(food: number, mor: number, cashShort: boolean) {
  if (food < 2) return { tone: 'warn', line: food < 1 ? '"Effendi, the sacks are empty. Men do not walk far on nothing."' : '"Effendi, the bread will not last two days. We should find a village."' };
  if (cashShort) return { tone: 'warn', line: '"Forgive me, effendi. The men ask if there will be money in the morning."' };
  if (mor <= 40) return { tone: 'warn', line: '"The men are grumbling. A little kindness now would go a long way."' };
  if (mor <= 60) return { tone: 'ok', line: '"The road is long, but we are with you. A word from you would not hurt."' };
  return { tone: 'good', line: '"All is well, effendi. The men are in good spirits."' };
}

export function MenTalk({ onClose, stopped }: { onClose: () => void; stopped?: boolean }) {
  const g = useGame();
  const p = g.world.party;
  const [note, setNote] = useState('');
  const men = troopCount(p);
  const mood = menMood(foodDaysLeft(p), moraleOf(p), g.cash < wages(p));
  const head = Object.entries(p.troops).filter(([, n]) => n > 0).sort((a, b) => (TROOPS[b[0]]?.strength ?? 0) - (TROOPS[a[0]]?.strength ?? 0))[0]?.[0];
  const act = (how: 'rations' | 'bonus' | 'rest' | 'listen') => setNote(g.talkToMen(how));
  return createPortal(
    <div className="overlay men-talk" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} data-testid="men-talk">
        <div className="men-talk__who">
          {head && <img src={`art/troops/${head}.jpg`} alt="" />}
          <div><h2>{stopped ? 'Your men stop you' : 'Your men'}</h2><small>{men} {men === 1 ? 'man' : 'men'} · patience {moraleOf(p)}/100 · food for {foodDaysLeft(p)} {foodDaysLeft(p) === 1 ? "day" : "days"} · wages {fmt(wages(p))}/day</small></div>
        </div>
        <p className={`men-talk__line ${mood.tone}`} data-testid="men-line">{mood.line}</p>
        {note ? <p className="men-talk__note" data-testid="men-note">{note}</p> : (
          <div className="men-talk__opts">
            <button className="btn" onClick={() => act('rations')} disabled={p.food < men} data-testid="men-rations">Share out extra rations <small>−{men} food · patience +10</small></button>
            <button className="btn" onClick={() => act('bonus')} disabled={g.cash < Math.max(5, wages(p))} data-testid="men-bonus">Pay a bonus <small>−{fmt(Math.max(5, wages(p)))} · patience +14</small></button>
            <button className="btn" onClick={() => act('rest')} data-testid="men-rest">Rest half a day <small>6 hours · patience +8</small></button>
            <button className="btn" onClick={() => act('listen')} data-testid="men-listen">Sit and listen <small>patience +3</small></button>
          </div>
        )}
        <button className="btn primary" onClick={onClose} data-testid="men-close">{note ? 'Back on the road' : stopped ? 'Carry on' : 'Close'}</button>
      </div>
    </div>,
    document.body,
  );
}

export const capLine = (men: number, reputation: number) => `${men} of ${troopCap(reputation)} men you can lead`;
