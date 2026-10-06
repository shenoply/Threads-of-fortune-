import { useEffect, useRef, useState } from 'react';
import { useGame } from '../../game/state/store';
import { DISEASE, type Effects } from '../../game/systems/disease';
import { fedOf, waterOf } from '../../game/systems/malek';
import { planTrip } from '../../game/nav';
import './HealthStrip.css';

/** What a condition costs, in plain words. */
export function effectLine(e: Effects): string {
  const out: string[] = [];
  if (e.hours) out.push(`${Math.abs(e.hours)} fewer stall hours a day`);
  if (e.focus) out.push('shorter patience at the stall');
  if (e.trust) out.push('buyers trust you less');
  if (e.speed) out.push(`travel ${Math.abs(e.speed)}% slower`);
  if (e.carry) out.push(`carry ${Math.abs(e.carry)}% less`);
  if (e.sight) out.push('you misjudge rugs');
  if (e.fatigue) out.push('you tire faster');
  return out.length ? out.join(', ') : 'it wears you down';
}

export const wellness = (c: ReturnType<typeof useGame.getState>['condition']) => {
  const fatigue = c?.fatigue ?? 0, fed = fedOf(c), water = waterOf(c);
  return {
    fatigue, fed, water,
    tired: fatigue >= 85 ? 'bad' : fatigue >= 70 ? 'warn' : '',
    hungry: fed < 10 ? 'bad' : fed < 20 ? 'warn' : '',
    thirsty: water < 15 ? 'bad' : water < 25 ? 'warn' : '',
  };
};

function Meter({ label, pct, level }: { label: string; pct: number; level: string }) {
  return <span className={`hs-m ${level}`}><i style={{ width: `${Math.max(4, Math.min(100, pct))}%` }} /><b>{label}</b></span>;
}

/** One line under the header: how worn, hungry and thirsty he is, and what ails him. Shows only when something needs attention (always on the Me tab). */
export function HealthStrip({ always = false }: { always?: boolean }) {
  const c = useGame((s) => s.condition);
  const ills = useGame((s) => s.illnesses) ?? [];
  const day = useGame((s) => s.day);
  const at = useGame((s) => s.world.at);
  const needsOn = useGame((s) => !s.sim || s.sim.needs || !!s.ironman);
  const [open, setOpen] = useState(false);
  const seen = useRef(ills.length);
  useEffect(() => { if (ills.length > seen.current) setOpen(true); seen.current = ills.length; }, [ills.length]);
  const w = wellness(c);
  const notable = (needsOn && !!(w.tired || w.hungry || w.thirsty)) || ills.length > 0;
  if (!notable && !(always && (needsOn || ills.length))) return null;
  const tip = !needsOn ? '' : w.tired === 'bad' ? 'You are close to collapsing. Rest in a town.' : w.tired ? 'You are tired. Sleep in a town or at camp before you push on.' : w.hungry ? 'You are hungry. Eat at Malek’s grill or carry parcels.' : w.thirsty ? 'You are thirsty. Find a well or carry water.' : '';
  return (
    <div className="hs" data-testid="health-strip">
      <button className="hs-row" onClick={() => setOpen((o) => !o)} aria-expanded={open} data-testid="health-toggle">
        {needsOn && <Meter label="Tired" pct={w.fatigue} level={w.tired} />}
        {needsOn && <Meter label="Fed" pct={w.fed} level={w.hungry ? w.hungry : ''} />}
        {needsOn && <Meter label="Water" pct={w.water} level={w.thirsty} />}
        {ills.length > 0 && <span className="hs-ill" data-testid="ill-banner">{ills.length === 1 ? DISEASE(ills[0].id)?.name : `${ills.length} ailments`}</span>}
      </button>
      {(open || (!ills.length && tip && w.tired === 'bad')) && (
        <div className="hs-more">
          {tip && <p>{tip}</p>}
          {ills.map((il) => { const d = DISEASE(il.id); if (!d) return null; const left = Math.max(1, il.until - day); return (
            <p key={il.id}><b>{d.name}</b> · about {left} day{left === 1 ? '' : 's'} left. {d.symptom} <em>Costs you: {effectLine(d.effects)}.</em></p>
          ); })}
          {ills.length > 0 && <button className="hs-doc" onClick={() => planTrip('cairo')} data-testid="hs-feras">{at === 'cairo' ? 'Dr Feras is in Cairo: open the town' : 'See Dr Feras in Cairo'}</button>}
        </div>
      )}
    </div>
  );
}
