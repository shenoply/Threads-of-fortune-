import { useEffect, useState } from 'react';
import { useGame } from '../../game/state/store';
import { audio } from '../../game/audio/engine';
import { foodDaysLeft } from '../../game/systems/caravan';
import { dateLine } from '../../game/economy/newspaper';
import { settlementById } from '../../game/systems/world';

/**
 * A night halt in the open, full screen: the fire (or no fire, with nothing to cook), the crickets,
 * and the choice to sleep until dawn or break camp. Camping is always the player's choice: the road
 * only offers it, at nightfall or when halted after dark.
 */
export function CampScreen({ dest, onClose, onResume }: { dest?: string; onClose: () => void; onResume: (dest: string) => void }) {
  const g = useGame();
  const w = g.world;
  const [dawn, setDawn] = useState(false);
  const [notes, setNotes] = useState<string[]>([]);
  // fed when the fire was lit: supper is eaten from what you carry, so "cold" is decided on arrival
  const [fed] = useState(() => foodDaysLeft(w.party) >= 1);
  const destName = dest ? settlementById(dest).name : '';

  // the fire crackles over the crickets; a cold camp has only the night; at dawn the open road again
  useEffect(() => {
    audio.pushEnv('camp-halt', dawn ? 'road' : fed ? 'camp' : 'road', dawn ? undefined : fed ? 'camp' : undefined);
    return () => audio.popEnv('camp-halt');
  }, [dawn, fed]);

  const sleep = () => {
    const h = useGame.getState().world.hour;
    const hours = h < 6 ? 6 - h : 30 - h;
    const out = useGame.getState().travelStep({ x: w.x, y: w.y }, hours / 24, true);
    setNotes(out.filter((n) => !n.startsWith('Day ')).slice(-3));
    setDawn(true);
    audio.sfx('tap');
  };

  const hh = Math.floor(w.hour), mm = Math.floor((w.hour % 1) * 60);
  const food = foodDaysLeft(w.party);
  return (
    <div className={`camp-screen ${dawn ? 'dawn' : ''}`} role="dialog" aria-label="Camp for the night" data-testid="camp-screen">
      <img className="camp-art" src={`art/events/camp-${fed ? 'night' : 'cold'}.webp`} alt={fed ? 'Your camp: the camel couched by a small fire under the stars' : 'A cold camp: no fire, the camel a dark shape under the moon'} draggable={false} />
      <div className="camp-panel">
        <small className="camp-when">{dateLine(g.day)} · {String(hh).padStart(2, '0')}:{String(mm).padStart(2, '0')}</small>
        {!dawn ? (
          <>
            <h2>{fed ? 'Camp for the night' : 'A cold camp'}</h2>
            <p>
              {fed
                ? `You couch the camel, gather tamarisk twigs and light a small fire. Bread, dates and sweet tea. Food left: ${food} day${food === 1 ? '' : 's'}.`
                : 'Nothing to cook, and no fire worth lighting. You wrap yourself in your coat and listen to the dogs a long way off. Buy food in the next town.'}
            </p>
            <div className="camp-btns">
              <button className="btn primary" onClick={sleep} data-testid="camp-sleep">Sleep until dawn</button>
              <button className="btn" onClick={() => (dest ? onResume(dest) : onClose())} data-testid="camp-break">{dest ? `Break camp, on to ${destName}` : 'Break camp'}</button>
            </div>
          </>
        ) : (
          <>
            <h2>Dawn</h2>
            <p>{notes.length ? notes.join(' ') : 'You wake stiff and cold. The fire is ash; the camel is already chewing.'}</p>
            <div className="camp-btns">
              {dest && <button className="btn primary" onClick={() => onResume(dest)} data-testid="camp-resume">On to {destName}</button>}
              <button className={`btn ${dest ? '' : 'primary'}`} onClick={onClose} data-testid="camp-done">Break camp</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * The standing order "camp every night": the night passes on its own in a few seconds, the camp full
 * screen with its fire and crickets, and the walk goes on at dawn. A tap offers to stop and ask again.
 */
export function NightPasses({ fed, onDawn, onWake }: { fed: boolean; onDawn: () => void; onWake: () => void }) {
  useEffect(() => {
    audio.pushEnv('camp-night', fed ? 'camp' : 'road', fed ? 'camp' : undefined);
    const t = window.setTimeout(onDawn, 2800);
    return () => { window.clearTimeout(t); audio.popEnv('camp-night'); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="camp-screen night-passes" role="status" aria-label="The night passes in camp" data-testid="night-passes">
      <img className="camp-art" src={`art/events/camp-${fed ? 'night' : 'cold'}.webp`} alt="" draggable={false} />
      <div className="camp-panel">
        <h2>{fed ? 'You camp for the night' : 'A cold camp for the night'}</h2>
        <p>{fed ? 'Supper by the fire, a few hours of sleep. You set off again at dawn.' : 'No food, no fire. You sleep badly and set off again at dawn.'}</p>
        <div className="camp-btns">
          <button className="btn" onClick={onWake} data-testid="night-wake">Stop camping every night: ask me</button>
        </div>
      </div>
    </div>
  );
}
