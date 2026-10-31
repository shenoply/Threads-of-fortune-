// Starting a new game: the three ways to play side by side, each saying plainly what it changes, and,
// when a game is already going, one clear question about keeping it before anything is replaced.
// Choosing starts the game at once: nobody is sent back to the menu to press Play again.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { slotLabel, type SlotInfo } from '../../game/state/slots';
import '../Sandbox/sandbox.css';
import { DEMO } from '../../game/demo';
import './ModeChooser.css';
import '../SaveGuard.css';

import { SimOptions } from './SimOptions';
import { FULL_SIM, type SimSettings } from '../../game/state/store';
export type Mode = 'campaign' | 'ironman' | 'sandbox';

export const MODES: { id: Mode; title: string; line: string; points: string[] }[] = [
  { id: 'campaign', title: 'Campaign', line: 'Hassan\'s story, from a borrowed corner in Giza.',
    points: ['A guided start teaches the trade one step at a time; other cities open as you go.', 'Then the story missions: Rashid\'s errands, your father\'s rug, the House of Fortune.', 'Saves itself as you play. Save slots and save files work as usual.'] },
  { id: 'ironman', title: '☠ One-life campaign', line: 'The same story, with one life.',
    points: ['If Hassan dies, from sickness, a wound or a fight, the run is over for good.', 'It saves itself after everything you do, and autosave cannot be turned off.', 'No save slots, no save files, no loading: a death cannot be undone.'] },
  { id: 'sandbox', title: 'Sandbox', line: 'Free trade, at your own pace.',
    points: ['No guided start: every city is open from the first day.', 'Play as Hassan, or as yourself (your own face on Hassan\'s body).', 'Same trade, roads, dangers and saving as the campaign. The story missions still come to you if you want them.'] },
];

interface Props {
  /** a game is in progress: ask about keeping it first */
  current?: { day: number; ironman?: boolean } | null;
  slots: (SlotInfo | null)[];
  first?: Mode;
  /** starts the game; returns a message instead when it cannot (the current game could not be kept) */
  onStart: (mode: Mode, keepInSlot: number | null, sim: SimSettings) => string | void;
  /** download the current game as a backup file */
  onBackup?: () => void;
  onClose: () => void;
}

export function ModeChooser({ current, slots, first, onStart: start, onBackup, onClose }: Props) {
  const [mode, setMode] = useState<Mode | null>(first ?? null);
  const [asking, setAsking] = useState(false);
  const [sim, setSim] = useState<SimSettings>(FULL_SIM);
  // why the game did not start (the current one could not be kept): shown here, nothing is replaced
  const [err, setErr] = useState('');
  const onStart = (md: Mode, keep: number | null, sv: SimSettings) => { setErr(''); const e = start(md, keep, sv); if (e) setErr(e); };
  const iron = !!current?.ironman;
  const m = MODES.find((x) => x.id === mode);
  const empty = slots.findIndex((s) => !s) + 1; // 0 when every slot is taken
  const choose = (id: Mode) => { setMode(id); setErr(''); if (current) setAsking(true); };
  const dialog = useRef<HTMLDivElement>(null);
  // focus the dialog so Escape reaches its onKeyDown straight away
  useEffect(() => { dialog.current?.focus({ preventScroll: true }); }, []);
  const primary: Mode = mode ?? 'campaign';
  const label = (id: Mode) => (id === 'campaign' ? 'Play the campaign' : id === 'ironman' ? 'Play one life' : 'Play the sandbox');
  return createPortal(
    <div className="sbx-back" role="dialog" aria-modal="true" aria-label="Start a new game" data-testid="mode-chooser" tabIndex={-1} ref={dialog} onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}>
      <div className="sbx-card wide mc-card">
        {!asking ? (
          <>
            <h2>Start a new game</h2>
            <div className="mode-list mc-list">
              {MODES.map((x) => (
                <div key={x.id} className={`mode-card mc-mode ${mode === x.id ? 'on' : ''}`} data-testid={`mode-${x.id}`}>
                  <b>{x.title}</b>
                  <small>{x.line}</small>
                  <details className="mc-more" open={first === x.id}>
                    <summary>What changes?</summary>
                    <ul>{x.points.map((p) => <li key={p}>{p}</li>)}</ul>
                  </details>
                  {DEMO && x.id === 'sandbox' ? <button className="btn" disabled data-testid="start-sandbox-later">In the full game</button> : (
                  <button className={`btn ${x.id === primary ? 'primary' : ''}`} onClick={() => (current ? choose(x.id) : onStart(x.id, null, sim))} data-testid={`start-${x.id}`}>
                    {label(x.id)}
                  </button>)}
                </div>
              ))}
              <details className="mc-sim">
                <summary>More options</summary>
                <SimOptions value={sim} onChange={setSim} />
                <small className="sbx-dim">Applies to the campaign and the sandbox. A one-life game always uses the full simulation. You can change it later in Settings.</small>
              </details>
            </div>
            <button className="ghost-btn" onClick={onClose} data-testid="mode-close">Back</button>
          </>
        ) : (
          <div data-testid="mode-keep">
            <h2>{m?.title}: keep your current game?</h2>
            <p className="sbx-dim">You are on day {current?.day} of {iron ? 'a one-life run' : 'a game'}. Starting {mode === 'ironman' ? 'a one-life campaign' : mode === 'sandbox' ? 'a sandbox game' : 'the campaign afresh'} replaces it in this browser.</p>
            {iron && <p className="sbx-dim" data-testid="mode-keep-iron">A one-life run has one life and one save, so it cannot be kept in a save slot: a copy could be loaded after a death. Starting a new game ends this run for good.</p>}
            {err && (
              <p className="mc-error" role="alert" data-testid="mode-keep-error">
                {err}
                {onBackup && <><br /><button className="btn" onClick={onBackup} data-testid="mode-keep-backup">Make a backup file</button></>}
              </p>
            )}
            <div className="mode-keep-btns">
              {iron ? null : empty > 0 ? (
                <button className="btn primary" onClick={() => onStart(mode!, empty, sim)} data-testid="keep-and-start">Keep it in save slot {empty}, then start</button>
              ) : (
                slots.map((s, i) => (
                  <button key={i} className="btn" onClick={() => { if (window.confirm(`Slot ${i + 1} already holds: ${s ? slotLabel(s) : ''}. Replace it with your current game?`)) onStart(mode!, i + 1, sim); }} data-testid={`keep-in-${i + 1}`}>
                    Keep it in slot {i + 1} <small>(replaces {s ? `day ${s.day}` : 'it'})</small>
                  </button>
                ))
              )}
              <button className="btn danger" onClick={() => { if (window.confirm(iron ? 'Start a new game? This one-life run ends for good.' : 'Start without keeping your current game? It will be gone for good.')) onStart(mode!, null, sim); }} data-testid="start-without-keeping">Start without keeping it</button>
              <button className="ghost-btn" onClick={() => setAsking(false)} data-testid="mode-back">Back</button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
