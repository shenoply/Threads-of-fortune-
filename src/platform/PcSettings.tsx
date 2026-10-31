// Settings for the PC: the screen layout (Auto / Wide / Phone), the keyboard shortcuts, and in the desktop
// app a way out to the desktop. Shown only on a wide window or in the desktop app; the phone's Settings
// stay as they are.
import { SHORTCUTS, setLayoutPref, useLayoutPref, usePc, type LayoutPref } from './pc';
import { desktop, isDesktopApp } from './platform';

const CHOICES: [LayoutPref, string][] = [['auto', 'Auto'], ['pc', 'Wide'], ['phone', 'Phone']];

export function PcSettings() {
  const pc = usePc();
  const pref = useLayoutPref();
  if (!pc && !isDesktopApp && typeof window !== 'undefined' && window.innerWidth < 900) return null;
  return (
    <div className="pc-settings" data-testid="pc-settings">
      <h3 className="set-h">Screen</h3>
      <div className="pc-layout" role="radiogroup" aria-label="Screen layout">
        {CHOICES.map(([id, label]) => (
          <button key={id} className={`btn small${pref === id ? ' primary' : ''}`} role="radio" aria-checked={pref === id} onClick={() => setLayoutPref(id)} data-testid={`layout-${id}`}>{label}</button>
        ))}
      </div>
      <p className="dim">Auto uses the wide layout on a large screen with a mouse, and the phone layout otherwise.</p>
      {pc && (
        <>
          <h3 className="set-h">Keyboard and mouse</h3>
          <dl className="pc-keys" data-testid="pc-shortcuts">
            {SHORTCUTS.map(([k, what]) => <div key={k}><dt><kbd>{k}</kbd></dt><dd>{what}</dd></div>)}
          </dl>
        </>
      )}
      {desktop && <button className="btn" onClick={() => desktop?.quit()} data-testid="quit-desktop">Quit to desktop</button>}
    </div>
  );
}
