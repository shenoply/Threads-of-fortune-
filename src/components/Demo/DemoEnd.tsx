// The Steam demo's closing card (game/demo.ts): on the morning after its tenth day, what the merchant
// has done, what waits in the full game, and the way to the store page. A full-screen card like the
// night's summary, not a pop-up. "A little longer" puts it aside until the next morning.
import { useState } from 'react';
import { useGame } from '../../game/state/store';
import { useShallow } from 'zustand/react/shallow';
import { DEMO_DAYS, STEAM_URL, demoOver } from '../../game/demo';
import { dateFor } from '../../game/economy/economy';
import { demoDone } from '../../game/demoEnd';
import './demo.css';

const AHEAD = [
  'Rashid\'s next errands, and your father\'s debt to clear',
  'The roads to Jaffa, Damascus and Baghdad, and over the Zagros into Persia',
  'Five years of trade, 1925 to 1930: the good seasons, and the crash',
  'Rival houses in every city, and the auction rooms of Cairo and Alexandria',
  'Five stories that remember what you chose',
  'Carpets woven to your own design at Kerdasa',
  'A household of your own, and a family to keep',
];

export function DemoEnd({ onSave }: { onSave?: () => void }) {
  const g = useGame(useShallow((s) => ({ started: s.started, day: s.day })));
  const [asideDay, setAsideDay] = useState(0);
  if (!demoOver(g) || asideDay === g.day) return null;
  const s = useGame.getState();
  const done = demoDone(s);
  return (
    <div className="demo-end" data-testid="demo-end" role="region" aria-label="The end of the demo">
      <div className="de-bg" style={{ backgroundImage: 'url(art/title/caravan.webp)' }} />
      <div className="de-card">
        <div className="de-eye">GIZA · {dateFor(DEMO_DAYS + 1).long.toUpperCase()}</div>
        <h1>Ten days in the trade</h1>
        <p className="de-lead">Ten days ago you came to your father's corner with three rugs and his debts. This is where they have brought you.</p>
        <ul className="de-done" data-testid="demo-done">{done.map((t) => <li key={t}>{t}</li>)}</ul>
        <h2>In the full game</h2>
        <ul className="de-ahead">{AHEAD.map((t) => <li key={t}>{t}</li>)}</ul>
        <p className="de-carry" data-testid="demo-carry">Your merchant carries over. The full game picks up this save on this morning, as you left it.</p>
        <div className="de-btns">
          <a className="btn primary de-wish" href={STEAM_URL} target="_blank" rel="noopener noreferrer" data-testid="demo-wishlist">Wishlist on Steam</a>
          {onSave && <button className="btn" onClick={onSave} data-testid="demo-save">Keep a copy of your save</button>}
          <button className="btn" onClick={() => setAsideDay(g.day)} data-testid="demo-aside">Look around a little longer</button>
        </div>
      </div>
    </div>
  );
}
