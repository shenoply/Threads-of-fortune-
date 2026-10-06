import type { SimSettings } from '../../game/state/store';
import { FULL_SIM } from '../../game/state/store';
import './SimOptions.css';

export const RELAXED_SIM: SimSettings = { illness: false, injuries: false, needs: false };
const same = (a: SimSettings, b: SimSettings) => a.illness === b.illness && a.injuries === b.injuries && a.needs === b.needs;

const ROWS: { key: keyof SimSettings; title: string; line: string }[] = [
  { key: 'needs', title: 'Food, water and tiredness', line: 'You tire, get hungry and thirsty, and can pass out. Off: you never need to eat, drink or rest.' },
  { key: 'illness', title: 'Illness', line: 'Fevers, dysentery, pneumonia and the rest, and Dr Feras. Off: you stay well.' },
  { key: 'injuries', title: 'Injuries', line: 'Wounds from fights, beatings and accidents. Off: fights cost you goods, not health.' },
];

/** How much of the simulation to play with. Ironman always uses all of it. */
export function SimOptions({ value, onChange, locked }: { value: SimSettings; onChange: (v: SimSettings) => void; locked?: boolean }) {
  const preset = same(value, FULL_SIM) ? 'full' : same(value, RELAXED_SIM) ? 'relaxed' : 'custom';
  return (
    <div className="sim-opts" data-testid="sim-options">
      <b className="sim-h">How real should it be?</b>
      <div className="sim-presets" role="group" aria-label="Simulation level">
        <button className={`sim-p ${preset === 'relaxed' ? 'on' : ''}`} disabled={locked} onClick={() => onChange(RELAXED_SIM)} data-testid="sim-relaxed">Relaxed<small>Trade and story</small></button>
        <button className={`sim-p ${preset === 'full' ? 'on' : ''}`} disabled={locked} onClick={() => onChange(FULL_SIM)} data-testid="sim-full">Full<small>Everything</small></button>
      </div>
      {ROWS.map((r) => (
        <label key={r.key} className="sim-row">
          <input type="checkbox" checked={locked ? true : value[r.key]} disabled={locked} onChange={(e) => onChange({ ...value, [r.key]: e.target.checked })} data-testid={`sim-${r.key}`} />
          <span><b>{r.title}</b><small>{r.line}</small></span>
        </label>
      ))}
      {locked && <small className="sim-note">Ironman always uses the full simulation.</small>}
    </div>
  );
}
