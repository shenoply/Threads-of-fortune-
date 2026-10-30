import { useState } from 'react';
import { useGame } from '../../game/state/store';
import { DISEASE, type Effects } from '../../game/systems/disease';
import { fedOf, waterOf } from '../../game/systems/malek';
import { planTrip, openClinic } from '../../game/nav';
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

/** Small drawn icons for the strip, in the line style of the period labels (stroke only, 16px). */
const HS_ICON: Record<string, JSX.Element> = {
  // a bed: headboard, mattress and pillow
  bed: <><path d="M2.5 4v9M2.5 10.5h11V13M13.5 10.5V8.5a1.5 1.5 0 0 0-1.5-1.5H7v3.5" /><rect x="3.6" y="7.4" width="2.6" height="2.2" rx="1" /></>,
  // a round loaf, scored
  bread: <><path d="M2 10.5c0-3 2.7-5 6-5s6 2 6 5c0 1-.6 1.6-1.5 1.6h-9C2.6 12.1 2 11.5 2 10.5Z" /><path d="M5.5 7.4l1 1.6M8 6.9v1.8M10.5 7.4l-1 1.6" /></>,
  // a qulla, the Egyptian clay water jar
  jar: <><path d="M6.3 2.5h3.4M6.8 2.5v2.1C4.6 5.6 3.6 7.5 3.6 9.6c0 2.4 2 4 4.4 4s4.4-1.6 4.4-4c0-2.1-1-4-3.2-5V2.5" /><path d="M4.4 8.6c2.2.7 5 .7 7.2 0" /></>,
  // a stoppered phial, for a disease
  phial: <><path d="M6.3 2h3.4M6.8 2v3.4L3.9 11.3a1.6 1.6 0 0 0 1.4 2.3h5.4a1.6 1.6 0 0 0 1.4-2.3L9.2 5.4V2" /><path d="M5 9.4h6" /></>,
  // a rolled bandage, for an injury
  bandage: <><path d="M3.2 9.6l6.4-6.4a2 2 0 0 1 2.8 2.8L6 12.4a2 2 0 0 1-2.8-2.8Z" /><path d="M6.4 6.4l3.2 3.2M7.6 7.6h.01M8.6 6.6h.01M6.6 8.6h.01" /></>,
};
const HsIcon = ({ n }: { n: string }) => <svg className="hs-ic" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{HS_ICON[n]}</svg>;

/** A labelled gauge: an icon, the word, and a ruled bar that only takes colour when it needs seeing to. */
function Meter({ label, pct, level, icon }: { label: string; pct: number; level: string; icon: string }) {
  const v = Math.max(0, Math.min(100, pct));
  return (
    <span className={`hs-m ${level}`} data-testid={`hs-${label.toLowerCase()}`} data-level={level || 'ok'}>
      <HsIcon n={icon} />
      <span className="hs-g"><b>{label}</b><i role="meter" aria-label={label} aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100}><em style={{ width: `${Math.max(4, v)}%` }} /></i></span>
    </span>
  );
}

/** One line under the header: how worn, hungry and thirsty he is, and what ails him. Shows only when something needs attention (always on the Me tab). */
export function HealthStrip({ always = false }: { always?: boolean }) {
  const c = useGame((s) => s.condition);
  const ills = useGame((s) => s.illnesses) ?? [];
  const day = useGame((s) => s.day);
  const at = useGame((s) => s.world.at);
  const needsOn = useGame((s) => !s.sim || s.sim.needs || !!s.ironman);
  const [open, setOpen] = useState(false);
  const w = wellness(c);
  const notable = (needsOn && !!(w.tired || w.hungry || w.thirsty)) || ills.length > 0;
  if (!notable && !(always && (needsOn || ills.length))) return null;
  const tip = !needsOn ? '' : w.tired === 'bad' ? 'You are close to collapsing. Rest in a town.' : w.tired ? 'You are tired. Sleep in a town or at camp before you push on.' : w.hungry ? 'You are hungry. Eat at Malek\'s grill or carry parcels.' : w.thirsty ? 'You are thirsty. Find a well or carry water.' : '';
  return (
    <div className={`hs ${always ? '' : 'hs-slim'}`} data-testid="health-strip">
      <button className="hs-row" onClick={() => setOpen((o) => !o)} aria-expanded={open} data-testid="health-toggle">
        {needsOn && (always || w.tired) && <Meter label="Tired" icon="bed" pct={w.fatigue} level={w.tired} />}
        {needsOn && (always || w.hungry) && <Meter label="Fed" icon="bread" pct={w.fed} level={w.hungry ? w.hungry : ''} />}
        {needsOn && (always || w.thirsty) && <Meter label="Water" icon="jar" pct={w.water} level={w.thirsty} />}
        {ills.length > 0 && <span className="hs-ill" data-testid="ill-banner"><HsIcon n={ills.every((il) => DISEASE(il.id)?.kind === 'injury') ? 'bandage' : 'phial'} /><span>{ills.length === 1 ? DISEASE(ills[0].id)?.name : `${ills.length} ailments`}</span></span>}
      </button>
      {open && (
        <div className="hs-more">
          {tip && <p>{tip}</p>}
          {ills.map((il) => { const d = DISEASE(il.id); if (!d) return null; const left = Math.max(1, il.until - day); return (
            <p key={il.id}><b>{d.name}</b> · about {left} day{left === 1 ? '' : 's'} left. {d.symptom} <em>Costs you: {effectLine(d.effects)}.</em></p>
          ); })}
          {ills.length > 0 && <button className="hs-doc" onClick={() => (at === 'cairo' ? openClinic() : planTrip('cairo'))} data-testid="hs-feras">{at === 'cairo' ? 'See Dr Feras now' : 'To Dr Feras'}</button>}
        </div>
      )}
    </div>
  );
}
