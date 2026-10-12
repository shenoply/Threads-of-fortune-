import { createPortal } from 'react-dom';
import { useGame, forceSave } from '../../game/state/store';
import { dateFor } from '../../game/economy/economy';
import { fmt } from '../../game/economy/money';
import { netWorth, RANKS, rankOf } from '../../game/economy/progress';
import { MISSIONS } from '../../data/missions';
import './HouseEnding.css';

/** The end of the story: the House of Fortune is finished. A printed card, the numbers of a career, and
 *  the choice to go on trading or leave for the menu. Shown while missionNews is 'house-done'. */
export function HouseEnding({ onMenu }: { onMenu?: () => void }) {
  const g = useGame();
  const m = MISSIONS.house;
  const keep = () => g.clearMissionNews();
  const menu = () => {
    g.clearMissionNews();
    if (onMenu) onMenu();
    else { forceSave(); window.location.reload(); } // the title screen, with the game saved to continue
  };
  const rows: [string, string][] = [
    ['Days in trade', `${g.day}`],
    ['Rugs sold', `${g.totalSales}`],
    ['Reputation', `${g.reputation}`],
    ['Royal warrants', `${g.court.warrants.length}`],
    ['Net worth', fmt(netWorth(g))],
    ['Rank', (rankOf(g).rank ?? RANKS[0]).name],
  ];
  return createPortal(
    <div className="house-end" role="dialog" aria-label="The House of Fortune" data-testid="house-ending">
      <div className="he-card">
        <small className="he-kicker">Khan el-Khalili · {dateFor(g.day).long}</small>
        <h2>The House of Fortune</h2>
        <p className="he-sub">A shop of your own, five royal warrants, every rug in the Register and a fortune of £5,000.</p>
        <hr />
        <p className="he-story">{m.reward.text}</p>
        <dl className="he-stats">
          {rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
        </dl>
        <p className="he-note">The story is finished. The lane is still open: buyers will keep coming to your door.</p>
        <div className="he-btns">
          <button className="btn primary" onClick={keep} data-testid="house-keep">Keep trading</button>
          <button className="btn" onClick={menu} data-testid="house-menu">Main menu</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
