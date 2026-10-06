// Starting a new game: the three ways to play side by side, each saying plainly what it changes, and,
// when a game is already going, one clear question about keeping it before anything is replaced.
// Choosing starts the game at once: nobody is sent back to the menu to press Play again.
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { slotLabel, type SlotInfo } from '../../game/state/slots';
import '../Sandbox/sandbox.css';

import { SimOptions } from './SimOptions';
import { FULL_SIM, type SimSettings } from '../../game/state/store';
export type Mode = 'campaign' | 'ironman' | 'sandbox';

export const MODES: { id: Mode; title: string; line: string; points: string[] }[] = [
  { id: 'campaign', title: 'Campaign', line: 'Hassan’s story, from a borrowed corner in Giza.',
    points: ['A guided start teaches the trade one step at a time; other cities open as you go.', 'Then the story missions: Rashid’s errands, your father’s rug, the House of Fortune.', 'Saves itself as you play. Save slots and save files work as usual.'] },
  { id: 'ironman', title: '☠ Ironman campaign', line: 'The same story, with one life.',
    points: ['If Hassan dies, from sickness, a wound or a fight, the run is over for good.', 'It saves itself after everything you do, and autosave cannot be turned off.', 'No save slots, no save files, no loading: a death cannot be undone.'] },
  { id: 'sandbox', title: 'Sandbox', line: 'Free trade, at your own pace.',
    points: ['No guided start: every city is open from the first day.', 'Play as Hassan, or as yourself (your own face on Hassan’s body).', 'Same trade, roads, dangers and saving as the campaign. The story missions still come to you if you want them.'] },
];

interface Props {
  /** a game is in progress: ask about keeping it first */
  current?: { day: number } | null;
  slots: (SlotInfo | null)[];
  first?: Mode;
  onStart: (mode: Mode, keepInSlot: number | null, sim: SimSettings) => void;
  onClose: () => void;
}

export function ModeChooser({ current, slots, first, onStart, onClose }: Props) {
  const [mode, setMode] = useState<Mode | null>(first ?? null);
  const [asking, setAsking] = useState(false);
  const [sim, setSim] = useState<SimSettings>(FULL_SIM);
  const m = MODES.find((x) => x.id === mode);
  const empty = slots.findIndex((s) => !s) + 1; // 0 when every slot is taken
  const choose = (id: Mode) => { setMode(id); if (current) setAsking(true); };
  return createPortal(
    <div className="sbx-back" role="dialog" aria-modal="true" aria-label="Start a new game" data-testid="mode-chooser" onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div className="sbx-card wide">
        {!asking ? (
          <>
            <h2>Start a new game</h2>
            <div className="mode-list">
              <SimOptions value={sim} onChange={setSim} />
              <small className="sbx-dim">Applies to the campaign and the sandbox. Ironman always uses the full simulation. You can change it later in Settings.</small>
              {MODES.map((x) => (
                <div key={x.id} className={`mode-card ${mode === x.id ? 'on' : ''}`} data-testid={`mode-${x.id}`} ref={(el) => { if (el && first === x.id) el.scrollIntoView({ block: 'nearest' }); }}>
                  <b>{x.title}</b>
                  <small>{x.line}</small>
                  <ul>{x.points.map((p) => <li key={p}>{p}</li>)}</ul>
                  <button className={`btn ${x.id === 'campaign' ? 'primary' : ''}`} onClick={() => (current ? choose(x.id) : onStart(x.id, null, sim))} data-testid={`start-${x.id}`}>
                    {x.id === 'campaign' ? 'Play the campaign' : x.id === 'ironman' ? 'Play Ironman' : 'Play the sandbox'}
                  </button>
                </div>
              ))}
            </div>
            <button className="ghost-btn" onClick={onClose} data-testid="mode-close">Back</button>
          </>
        ) : (
          <div data-testid="mode-keep">
            <h2>{m?.title}: keep your current game?</h2>
            <p className="sbx-dim">You are on day {current?.day} of a game. Starting {mode === 'ironman' ? 'an Ironman campaign' : mode === 'sandbox' ? 'a sandbox game' : 'the campaign afresh'} replaces it in this browser.</p>
            <div className="mode-keep-btns">
              {empty > 0 ? (
                <button className="btn primary" onClick={() => onStart(mode!, empty, sim)} data-testid="keep-and-start">Keep it in save slot {empty}, then start</button>
              ) : (
                slots.map((s, i) => (
                  <button key={i} className="btn" onClick={() => { if (window.confirm(`Slot ${i + 1} already holds: ${s ? slotLabel(s) : ''}. Replace it with your current game?`)) onStart(mode!, i + 1, sim); }} data-testid={`keep-in-${i + 1}`}>
                    Keep it in slot {i + 1} <small>(replaces {s ? `day ${s.day}` : 'it'})</small>
                  </button>
                ))
              )}
              <button className="btn danger" onClick={() => { if (window.confirm('Start without keeping your current game? It will be gone for good.')) onStart(mode!, null, sim); }} data-testid="start-without-keeping">Start without keeping it</button>
              <button className="ghost-btn" onClick={() => setAsking(false)} data-testid="mode-back">Back</button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
