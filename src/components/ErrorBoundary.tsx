// If a screen fails to draw (a damaged save, a bug), the player gets a card with ways out instead of a
// blank page: reload, keep a copy of the save as a file, go back to the game a backup file replaced,
// or start again. Nothing here deletes a save without first keeping a copy of it.
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { SAVE_KEY, BEFORE_LOAD_KEY, CRASHED_KEY, blockSaves, readKey, writeKey } from '../game/state/saveGuard';
import { SLOT_COUNT, readSlots, saveToSlot } from '../game/state/slots';
import './SaveGuard.css';

interface State { error: Error | null; note: string; downloaded: boolean }

function download(raw: string, name: string) {
  const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Put the save that is showing somewhere safe before it is replaced: a free slot, else a spare key. */
function keepCurrent(): string {
  const raw = readKey(SAVE_KEY);
  if (!raw) return '';
  let ironman = false;
  try { ironman = !!JSON.parse(raw)?.state?.ironman; } catch { /* unreadable: still keep it */ }
  const free = readSlots().findIndex((s) => !s) + 1;
  if (!ironman && free > 0 && free <= SLOT_COUNT && saveToSlot(free, raw)) return `was kept in save slot ${free}.`;
  return writeKey(CRASHED_KEY, raw) ? 'was kept in this browser.' : '';
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, note: '', downloaded: false };
  static getDerivedStateFromError(error: Error): Partial<State> { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Threads of Fortune stopped:', error, info.componentStack); }

  render() {
    if (!this.state.error) return this.props.children;
    const save = readKey(SAVE_KEY);
    const before = readKey(BEFORE_LOAD_KEY);
    const day = (() => { try { return JSON.parse(save ?? '')?.state?.day as number | undefined; } catch { return undefined; } })();
    const reload = () => window.location.reload();
    const downloadSave = () => {
      if (!save) { this.setState({ note: 'There is no save in this browser to keep.' }); return; }
      download(save, `threads-of-fortune-day-${day ?? 'save'}.json`);
      this.setState({ downloaded: true, note: 'Your save was downloaded as a file.' });
    };
    const goBack = () => {
      if (!before) return;
      if (!window.confirm('Go back to the game you had before you opened a backup file? The game that just stopped will be kept.')) return;
      const kept = keepCurrent();
      blockSaves();
      if (!writeKey(SAVE_KEY, before)) { this.setState({ note: 'The browser would not let the game be changed. Make a backup file first, then try again.' }); return; }
      try { localStorage.removeItem(BEFORE_LOAD_KEY); } catch { /* storage blocked */ }
      if (kept) window.alert(`The game that stopped ${kept}`);
      reload();
    };
    const startNew = () => {
      if (!window.confirm('Start a new game? The game that stopped will be kept first, if there is room.')) return;
      const kept = save ? keepCurrent() : '';
      if (save && !kept && !this.state.downloaded) { this.setState({ note: 'There is no room in this browser to keep the game that stopped. Tap Download my save first, then Start a new game again.' }); return; }
      blockSaves();
      try { localStorage.removeItem(SAVE_KEY); } catch { /* storage blocked */ }
      if (kept) window.alert(`The game that stopped ${kept}`);
      reload();
    };
    return (
      <div className="crash-screen" role="alertdialog" aria-modal="true" aria-label="Something went wrong" data-testid="crash">
        <div className="crash-card">
          <h2>Something went wrong</h2>
          <p>The game stopped while drawing this screen. Your save in this browser has not been touched{day ? ` (day ${day})` : ''}.</p>
          <p className="crash-dim">Try reloading first. If it stops again, keep a copy of your save as a file before anything else.</p>
          <div className="crash-btns">
            <button className="btn primary" onClick={reload} data-testid="crash-reload">Reload</button>
            {save && <button className="btn" onClick={downloadSave} data-testid="crash-download">Download my save</button>}
            {before && <button className="btn" onClick={goBack} data-testid="crash-previous">Go back to my previous game</button>}
            <button className="btn" onClick={startNew} data-testid="crash-new">Start a new game</button>
          </div>
          {this.state.note && <p className="crash-note" role="status">{this.state.note}</p>}
          <small className="crash-dim">{String(this.state.error.message || this.state.error).slice(0, 160)}</small>
        </div>
      </div>
    );
  }
}
