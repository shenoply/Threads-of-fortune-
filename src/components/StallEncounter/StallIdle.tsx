import { useState } from 'react';
import { Icon } from '../Icon';
import { AuctionBoard } from '../Auction/AuctionBoard';
import type { Target } from '../World/Campaign';
import { BUYERS } from '../../data/buyers';
import { useGame, arrivalAt, clock } from '../../game/state/store';
import { audio } from '../../game/audio/engine';
import { laneDay } from '../../game/economy/life';
import { StallUpgrades, affordableUpgrades } from '../Inventory/StallUpgrades';

/** The stall between customers: the road ahead, the next customer, and the auction calendar. */
export function StallIdle({ onGo }: { onGo: (t: Target) => void }) {
  const g = useGame();
  const [board, setBoard] = useState(false);
  const [improve, setImprove] = useState(false);
  const canBuy = affordableUpgrades(g);
  const h = g.world.hour;
  const left = Math.max(0, g.queue.length - g.visitIdx);
  const next = left ? arrivalAt(g, g.visitIdx) : null;
  const mins = next !== null ? Math.max(0, Math.round((next - h) * 60)) : 0;
  const midday = next !== null && next >= 15 && h < 15;
  const friday = next !== null && laneDay(g.day).late && h < 13;

  return (
    <div className="screen idle" data-testid="stall-idle">
      <div className="idle-scene" aria-hidden="true">
        <img src="art/stall-empty.webp" alt="" draggable={false} />
        <span className="idle-clock-chip">{clock(h)}</span>
      </div>
      <div className="idle-next" data-testid="idle-next">
        {g.held ? <p><b>{BUYERS[g.held.encounter.buyerId]?.name} is still waiting for you.</b></p> : next === null ? <p>No more customers today.</p> : friday ? <p>It is Friday. The lane is quiet until after the noon prayer. Customers come from <b>{clock(next)}</b>.</p> : midday ? <p>The lane is empty in the midday heat. Customers come back around <b>{clock(next)}</b>.</p> : mins === 0 ? <p><b>Someone is walking up to your stall.</b></p> : <p>Next customer <b>{clock(next)}</b> · in {mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`}</p>}
        {canBuy.length > 0 && <p className="idle-upgrade" data-testid="idle-upgrade-note">You can afford {canBuy[0].name.toLowerCase()} now: {canBuy[0].effect.split('.')[0].toLowerCase()}.</p>}
        {g.visitIdx > 0 && g.journal.some((j) => j.day === g.day && j.text.includes('found it empty')) && <p className="idle-missed">You missed a customer while you were away.</p>}
      </div>

      <button className="btn primary big" onClick={() => { audio.sfx('tap'); g.waitForCustomer(); }} data-testid="stall-wait">{g.held ? 'Go back to them' : next === null ? 'Close up for the evening' : mins === 0 ? 'Serve them' : `Wait for the customer (${clock(next)})`}</button>
      <div className="idle-row">
        <button className="btn" onClick={() => useGame.setState({ dayOver: true })} data-testid="stall-close-early"><Icon name="lock" /> Shut the stall</button>
        <button className="btn" onClick={() => setBoard(true)} data-testid="idle-auctions"><Icon name="calendar" /> Auctions</button>
      </div>
      <button className={`btn idle-improve ${canBuy.length ? 'has-new' : ''}`} onClick={() => { audio.sfx('tap'); setImprove(true); }} data-testid="idle-improve">
        <Icon name="star" /> Improve your stall{canBuy.length ? <b className="idle-badge">{canBuy.length}</b> : null}
      </button>
      {improve && (
        <div className="overlay" onClick={() => setImprove(false)}>
          <div className="modal-card big-card" onClick={(e) => e.stopPropagation()} data-testid="improve-sheet">
            <div className="big-card-head"><h2>Improve your stall</h2><button className="btn slim" onClick={() => setImprove(false)} data-testid="improve-close">Close</button></div>
            <p className="dim">Each one helps every sale from now on. The bigger stalls raise your rent.</p>
            <StallUpgrades />
          </div>
        </div>
      )}
      {board && <AuctionBoard onClose={() => setBoard(false)} onMap={() => { setBoard(false); onGo('map'); }} />}
    </div>
  );
}
