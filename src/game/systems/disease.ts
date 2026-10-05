// Illness for a 33-year-old male merchant, 1925. Every figure is an ESTIMATE from general
// medical-history sources (pre-antibiotic case fatality is well documented; incidence for a Cairo
// trader is a judgement scaled down from rural Egyptian data). Keep `estimate` until a dated source is attached.
export type Tier = 'common' | 'less' | 'rare' | 'extreme';
export interface Disease {
  id: string; name: string; tier: Tier;
  /** chance of catching it in a year of ordinary Cairo life (exposure multipliers scale it) */
  annual: number;
  /** chance a case ends in death with 1925 nursing care and no antibiotics */
  fatality: number;
  /** days it lasts */
  days: [number, number];
  /** extra fatigue each day while ill */
  fatigue: number;
  symptom: string;
  estimate: true;
}
export const DISEASES: Disease[] = [
  { id: 'bacillary', name: 'Bacillary dysentery', tier: 'common', annual: 0.15, fatality: 0.02, days: [3, 8], fatigue: 12, symptom: 'Cramps and a fever. You are never far from a bush.', estimate: true },
  { id: 'bronchitis', name: 'Acute bronchitis', tier: 'common', annual: 0.2, fatality: 0.003, days: [5, 12], fatigue: 6, symptom: 'A rattling cough that interrupts every sentence.', estimate: true },
  { id: 'trachoma', name: 'Trachoma', tier: 'common', annual: 0.25, fatality: 0, days: [30, 120], fatigue: 2, symptom: 'Red, gritty eyes. Rugs are harder to judge.', estimate: true },
  { id: 'bilharzia', name: 'Bilharzia', tier: 'common', annual: 0.05, fatality: 0.001, days: [60, 240], fatigue: 3, symptom: 'A dull, steady tiredness you cannot sleep off.', estimate: true },
  { id: 'amoebic', name: 'Amoebic dysentery', tier: 'less', annual: 0.045, fatality: 0.04, days: [10, 30], fatigue: 8, symptom: 'It comes and goes, and each return is worse.', estimate: true },
  { id: 'hookworm', name: 'Hookworm', tier: 'less', annual: 0.03, fatality: 0, days: [60, 200], fatigue: 3, symptom: 'Pale, breathless and heavy-legged.', estimate: true },
  { id: 'malaria', name: 'Malaria', tier: 'less', annual: 0.01, fatality: 0.01, days: [7, 21], fatigue: 10, symptom: 'Shaking cold, then fever, every second day.', estimate: true },
  { id: 'pneumonia', name: 'Pneumonia', tier: 'less', annual: 0.015, fatality: 0.25, days: [8, 14], fatigue: 18, symptom: 'A high fever and a chest like a locked door.', estimate: true },
  { id: 'typhoid', name: 'Typhoid fever', tier: 'rare', annual: 0.006, fatality: 0.12, days: [21, 35], fatigue: 14, symptom: 'A fever that climbs each evening for weeks.', estimate: true },
  { id: 'smallpox', name: 'Smallpox', tier: 'rare', annual: 0.002, fatality: 0.03, days: [18, 28], fatigue: 16, symptom: 'Fever, then pustules. The lane stays away.', estimate: true },
  { id: 'typhus', name: 'Typhus', tier: 'extreme', annual: 0.0005, fatality: 0.15, days: [14, 21], fatigue: 16, symptom: 'Lice, fever and a grey rash.', estimate: true },
  { id: 'plague', name: 'Plague', tier: 'extreme', annual: 0.0003, fatality: 0.6, days: [7, 14], fatigue: 20, symptom: 'Swollen glands and a fever that burns.', estimate: true },
];
export const DISEASE = (id: string) => DISEASES.find((d) => d.id === id);

export interface Illness { id: string; since: number; until: number; peaked?: boolean }
export interface ExposureCtx { day: number; onRoad: boolean; thirsty: boolean; fatigue: number }

const GUT = ['bacillary', 'amoebic', 'typhoid'];
const month = (day: number) => new Date(Date.UTC(1925, 2, 9 + day)).getUTCMonth(); // 0 = January

/** how much the day's circumstances scale a disease's yearly chance */
export function exposure(id: string, c: ExposureCtx): number {
  const m = month(c.day), summer = m >= 4 && m <= 9, winter = m === 11 || m <= 1;
  let x = 1;
  if (GUT.includes(id)) { if (c.onRoad) x *= 2.5; if (c.thirsty) x *= 1.5; if (summer) x *= 1.5; }
  if (id === 'malaria') { x *= summer ? 2.5 : 0.3; if (c.onRoad) x *= 3; }
  if (id === 'bilharzia' || id === 'hookworm') { if (c.onRoad) x *= 3; }
  if (id === 'bronchitis' || id === 'pneumonia') { if (winter) x *= 2.5; if (c.onRoad && winter) x *= 1.5; }
  if (id === 'trachoma' && c.onRoad) x *= 1.5;
  if (c.fatigue >= 70) x *= 1.5; // a worn-out man falls ill more easily
  return x;
}

/** annual chance -> the chance on one day, so a year of the same exposure gives that annual chance */
export const dailyHazard = (annual: number) => 1 - Math.pow(1 - Math.min(0.95, annual), 1 / 365);

export interface IllnessStep { illnesses: Illness[]; fatigueAdd: number; notes: string[]; died?: { id: string } }

/** One night. `deadly`: a fatal case really kills (Ironman); otherwise the man pulls through, much weaker. */
export function stepIllness(list: Illness[] | undefined, c: ExposureCtx, o: { risk?: number; deadly?: boolean; rand?: () => number; resting?: boolean } = {}): IllnessStep {
  const rand = o.rand ?? Math.random;
  const risk = o.risk ?? 1;
  const notes: string[] = [];
  let fatigueAdd = 0;
  const out: Illness[] = [];
  let died: { id: string } | undefined;
  for (const il of list ?? []) {
    const d = DISEASE(il.id); if (!d) continue;
    fatigueAdd += d.fatigue;
    if (c.day >= il.until) {
      // the crisis: nursing in a town helps, the road and exhaustion do not
      const care = o.resting ? 0.8 : 1.3;
      const p = Math.min(0.9, d.fatality * care * (c.fatigue >= 80 ? 1.3 : 1));
      if (d.fatality > 0 && rand() < p) {
        if (o.deadly) { died = { id: d.id }; break; }
        notes.push(`${d.name}: you came close to dying and pulled through. You are very weak.`);
        fatigueAdd += 40;
      } else notes.push(`${d.name} has run its course. You are on your feet again.`);
      continue;
    }
    out.push(il);
  }
  if (!died) {
    const have = new Set(out.map((i) => i.id));
    for (const d of DISEASES) {
      if (have.has(d.id)) continue;
      if (rand() < dailyHazard(d.annual * exposure(d.id, c) * risk)) {
        const len = d.days[0] + Math.floor(rand() * (d.days[1] - d.days[0] + 1));
        out.push({ id: d.id, since: c.day, until: c.day + len });
        notes.push(`You have fallen ill: ${d.name.toLowerCase()}. ${d.symptom}`);
      }
    }
  }
  return { illnesses: out, fatigueAdd, notes, died };
}
