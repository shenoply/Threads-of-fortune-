import { useGame } from '../../game/state/store';
import { rankOf, RANKS } from '../../game/economy/progress';
import { MAIN_ORDER, MISSIONS, missionsDone } from '../../data/missions';
import { fmt } from '../../game/economy/money';

const UNLOCKS = ['', 'Fine households start coming to your stall (£6–£18 budgets). Rashid gives credit.', 'Rich collectors and famous names of 1925 come to you. Visitors ask for Exceptional rugs.', 'Royal courts receive you. The best auction houses know your name.', 'The Khan shop and the last warrants are within reach.'];

/** The road ahead: what the next rank asks for and what it opens. Always visible on the stall panel. */
export function RoadCard({ onMap }: { onMap?: () => void }) {
  const g = useGame();
  const r = rankOf(g);
  const next = r.next;
  if (!next) return null;
  const done = missionsDone(g.missions);
  const active = MAIN_ORDER.find((id) => g.missions?.[id] === 'active');
  const needMission = done < r.idx + 1;
  const rows = [
    { ok: !needMission, label: needMission ? `Story: ${active ? MISSIONS[active].title : 'the next mission'}` : 'Story mission done' },
    { ok: g.reputation >= next.rep, label: `Reputation ${Math.min(g.reputation, next.rep)} / ${next.rep}` },
    { ok: r.worth >= next.worth, label: `Net worth ${fmt(Math.min(r.worth, next.worth))} / ${fmt(next.worth)}` },
    ...(next.warrants ? [{ ok: g.court.warrants.length >= next.warrants, label: `Royal warrants ${g.court.warrants.length} / ${next.warrants}` }] : []),
  ];
  return (
    <div className="road-card" data-testid="road-card">
      <div className="rc-head"><small>YOUR ROAD · {RANKS[r.idx].name.toUpperCase()}</small><b>Next: {next.name}</b></div>
      <ul>{rows.map((x) => <li key={x.label} className={x.ok ? 'ok' : ''}><i>{x.ok ? '✓' : '○'}</i>{x.label}</li>)}</ul>
      <p className="rc-unlock">Opens: {UNLOCKS[r.idx + 1]}</p>
      {needMission && active && MISSIONS[active].target && onMap && <button className="btn" onClick={onMap}>Show {MISSIONS[active].title} on the map ⟶</button>}
    </div>
  );
}
