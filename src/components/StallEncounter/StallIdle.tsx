import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../Icon';
import { AuctionBoard } from '../Auction/AuctionBoard';
import type { Target } from '../World/Campaign';
import { BUYERS } from '../../data/buyers';
import { useGame, arrivalAt, clock } from '../../game/state/store';
import { audio } from '../../game/audio/engine';
import { laneDay } from '../../game/economy/life';
import { affordableUpgrades, openUpgrades } from '../Inventory/StallUpgrades';
import { openMalek } from '../../game/nav';
import { fedOf, shopOpen as malekOpen } from '../../game/systems/malek';

/** The stall between customers: the road ahead, the next customer, and the auction calendar. */
export function StallIdle({ onGo }: { onGo: (t: Target) => void }) {
  const g = useGame();
  const [board, setBoard] = useState(false);
  const [tidy, setTidy] = useState(false);
  const canBuy = affordableUpgrades(g);
  const h = g.world.hour;
  const left = Math.max(0, g.queue.length - g.visitIdx);
  const next = left ? arrivalAt(g, g.visitIdx) : null;
  const mins = next !== null ? Math.max(0, Math.round((next - h) * 60)) : 0;
  const midday = next !== null && next >= 15 && h < 15;
  const friday = next !== null && laneDay(g.day).late && h < 13;
  // Malek's grill is two minutes away: a meal word for the hour, and a nudge when you are hungry
  const malekHere = g.world.at === 'giza' && malekOpen(h);
  const meal = h < 11 ? 'Breakfast' : h < 17 ? 'Lunch' : 'Supper';
  const hungry = fedOf(g.condition) < 20;

  return (
    <div className="screen idle" data-testid="stall-idle">
      <div className="idle-scene" aria-hidden="true">
        <img src="art/stall-empty.webp" alt="" draggable={false} />
        <span className="idle-clock-chip">{clock(h)}</span>
      </div>
      <div className="idle-next" data-testid="idle-next">
        {g.held ? <p><b>{BUYERS[g.held.encounter.buyerId]?.name} is still waiting for you.</b></p> : next === null ? <p>No more customers today.</p> : friday ? <p>It is Friday. The lane is quiet until after the noon prayer. Customers come from <b>{clock(next)}</b>.</p> : midday ? <p>The lane is empty in the midday heat. Customers come back around <b>{clock(next)}</b>.</p> : mins === 0 ? <p><b>Someone is walking up to your stall.</b></p> : <p>Next customer <b>{clock(next)}</b> · in {mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`}</p>}
        {malekHere && hungry && !(next !== null && mins >= 60) && (
          <p className="idle-hungry" data-testid="idle-hungry">You are hungry, and a hungry seller gives discounts. <button className="btn small" onClick={() => openMalek()} data-testid="idle-malek-hungry">{meal} at Malek's</button></p>
        )}
      </div>
      <button className="btn primary big" onClick={() => { audio.sfx('tap'); g.waitForCustomer(); }} data-testid="stall-wait">{g.held ? 'Go back to them' : next === null ? 'Close up for the evening' : mins === 0 ? 'Serve them' : `Wait for the customer (${clock(next)})`}</button>
      <div className="idle-next idle-next--after">
        {!g.held && next !== null && mins >= 60 && (
          <div className="idle-wait" data-testid="idle-wait">
            <p>While you wait (be back by {clock(next)}):</p>
            <div className="idle-wait__row">
              {malekHere && <button className="btn small" onClick={() => openMalek()} data-testid="idle-wait-malek"><Icon name="tea" /> {meal} at Malek's{hungry ? ' (you are hungry)' : ''}</button>}
              <button className="btn small" onClick={() => onGo('supplier')} data-testid="idle-wait-supplier"><Icon name="bag" /> Stock up at Rashid's</button>
              {g.world.at === 'giza' && <button className="btn small" onClick={() => onGo('district')} data-testid="idle-wait-district"><Icon name="map" /> Walk Giza (Arran's lab)</button>}
              <button className="btn small" onClick={() => onGo('paper')} data-testid="idle-wait-paper"><Icon name="book" /> Read the paper</button>
            </div>
          </div>
        )}
        {g.visitIdx > 0 && g.journal.some((j) => j.day === g.day && j.text.includes('found it empty')) && <p className="idle-missed">You missed a customer while you were away.</p>}
      </div>

      {/* the other things to do at the stall, small and side by side, so the one big button stands out */}
      <div className="idle-more">
        <button className="btn small" onClick={() => setBoard(true)} data-testid="idle-auctions"><Icon name="calendar" /> Auctions</button>
        <button className={`btn small idle-improve ${canBuy.length ? 'has-new' : ''}`} onClick={() => { audio.sfx('tap'); openUpgrades(); }} data-testid="idle-improve" title={canBuy.length ? `You can afford: ${canBuy[0].name}` : undefined}>
          <Icon name="star" /> Improve{canBuy.length ? <b className="idle-badge">{canBuy.length}</b> : null}
        </button>
        <button className="btn small idle-tidy" onClick={() => { audio.sfx('tap'); setTidy(true); }} data-testid="idle-tidy">Tidy up</button>
        <button className="btn small" onClick={() => useGame.setState({ dayOver: true })} data-testid="stall-close-early"><Icon name="lock" /> Shut the stall</button>
      </div>
      {tidy && <TidyFilm onClose={() => setTidy(false)} />}
      {board && <AuctionBoard onClose={() => setBoard(false)} onMap={() => { setBoard(false); onGo('map'); }} />}
    </div>
  );
}

/** The tidying film, over the whole screen (not inside the stall sheet, which clipped it to a black
 *  box), with its first frame showing while it loads; if the phone will not play it with sound it
 *  plays silent, and if it will not play at all it closes rather than leaving a black screen. */
function TidyFilm({ onClose }: { onClose: () => void }) {
  const v = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const el = v.current; if (!el) return;
    el.play().catch(() => { el.muted = true; el.play().catch(onClose); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return createPortal(
    <div className="tidy-film" role="dialog" aria-label="Tidying the stall" onClick={onClose} data-testid="tidy-film">
      <video ref={v} src="video/stall-tidy.mp4" poster="video/stall-tidy-poster.webp" playsInline preload="auto" onPlaying={() => setReady(true)} onEnded={onClose} onError={onClose} />
      <small>{ready ? 'Tap to close' : 'Loading…'}</small>
    </div>,
    document.body,
  );
}
