// The bands on the roads over the years: a beaten band takes on men again, slowly, to its usual
// strength; now and then one grows past it; a broken band or a leaderless one may scatter, and some
// weeks later a new band gathers on the same road. A leader who got away from you may come back at
// the head of the new one, remembering everything (his record in combat.leaders is kept), or another
// man leads it. A score left alone long enough cools. Run once a night from the store's rollover.
// Randomness is hashed from the game's seed and the day, so it never disturbs the store's dice.
import type { Party } from './world';
import { bandStrength, musterBand } from './world';
import { BAND_ROAD, type Leader } from './combat';

/** a band gone from the map, and the day another gathers in its place */
export interface Scattered { id: string; back: number; returns?: boolean }

/** days without a meeting before a feud cools */
export const FEUD_COOLS = 120;
const MAX_MEN = 16;

const mix = (seed: number, day: number, salt: string) => {
  let h = Math.imul(2166136261 ^ seed, 16777619);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ day, 16777619);
  for (let i = 0; i < salt.length; i++) h = Math.imul(h ^ salt.charCodeAt(i), 16777619);
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const rngOf = (seed: number, day: number, salt: string) => { let k = 0; return () => mix(seed, day, `${salt}:${k++}`); };

export function bandsNight(parties: Party[], scattered: Scattered[], leaders: Record<string, Leader>, day: number, seed: number):
  { parties: Party[]; scattered: Scattered[]; leaders?: Record<string, Leader>; notes: string[] } | null {
  const notes: string[] = [];
  let changed = false;
  let lead: Record<string, Leader> | undefined;
  const out: Party[] = [];
  const gone: Scattered[] = scattered.filter((x) => x.back > day);
  for (const p0 of parties) {
    if (p0.kind !== 'raiders' || !BAND_ROAD[p0.id]) { out.push(p0); continue; }
    let p = p0;
    const r = (salt: string) => mix(seed, day, `${p0.id}:${salt}`);
    const size = p.size ?? 4;
    const full = p.full ?? size;
    // the man leading it now, as far as you know him: a jailed leader whose time is up has been replaced
    // by someone you have not met (combat.ts leaderOf)
    const rec = leaders[p.id];
    const replaced = rec?.status === 'jailed' && day >= (rec.clearUntil ?? 0);
    const known = replaced ? undefined : rec;
    if (p.full === undefined) p = { ...p, full };
    // a feud cools when nobody feeds it
    if (p.vendetta) {
      if (p.feudSince === undefined) p = { ...p, feudSince: day };
      else if (day - p.feudSince >= FEUD_COOLS) {
        p = { ...p, vendetta: false, feudSince: undefined };
        if (known?.seen) notes.push(`Nothing has been heard of ${known.name} on ${BAND_ROAD[p.id]} for months. He seems to have stopped looking for you.`);
      }
    }
    // scatter: a band beaten down to a man or two, or one whose leader is in jail, may break up; any band, rarely
    const jailed = !!known && known.status !== 'free';
    const odds = size <= 2 ? 1 / 25 : jailed ? 1 / 60 : 1 / 900;
    if (!p.vendetta && r('scatter') < odds) {
      const back = day + 40 + Math.floor(r('back') * 80);
      // a free leader you have met gets away: half the time he is the one who gathers the next band
      const returns = !!known && known.status === 'free' && r('returns') < 0.5;
      if (known && known.status === 'free' && !returns) {
        // his time is over: the next band has a new man (combat.ts leaderOf makes the next of the line)
        lead = { ...(lead ?? leaders), [p.id]: { ...known, status: 'jailed', clearUntil: day } };
      }
      gone.push({ id: p.id, back, ...(returns ? { returns: true } : {}) });
      if (known?.seen) notes.push(`Word from ${BAND_ROAD[p.id]}: ${known.name}'s band has broken up. The road is quiet for now.`);
      changed = true;
      continue;
    }
    // men come back to a beaten band, one at a time; a strong one now and then takes on more
    if (size < full && r('recruit') < 1 / 10) p = { ...p, size: size + 1, strength: bandStrength(size + 1) };
    else if (size >= full && size < Math.min(MAX_MEN, full + 4) && r('grow') < 1 / 150) p = { ...p, size: size + 1, strength: bandStrength(size + 1) };
    // and a big band loses a man now and then, to a quarrel, a wife, a village
    else if (size > full && r('drift') < 1 / 150) p = { ...p, size: size - 1, strength: bandStrength(size - 1) };
    if (p !== p0) changed = true;
    out.push(p);
  }
  // a new band gathers where an old one scattered
  for (const sc of scattered) {
    if (sc.back > day || out.some((x) => x.id === sc.id)) continue;
    const fresh = musterBand(sc.id, rngOf(seed, day, `muster:${sc.id}`));
    changed = true;
    if (!fresh) continue;
    const rec = (lead ?? leaders)[sc.id];
    const known = rec?.status === 'free' ? rec : undefined;
    const p: Party = { ...fresh, full: fresh.size };
    if (sc.returns && known) {
      // the man who got away: a grudge brings him looking for you again
      if (known.grudge && !known.robbed) { p.vendetta = true; p.feudSince = day; }
      if (known.seen) notes.push(`${known.name} is back on ${BAND_ROAD[sc.id]}, at the head of a new band.`);
    } else if (known?.seen) notes.push(`A new band has gathered on ${BAND_ROAD[sc.id]}.`);
    out.push(p);
  }
  if (!changed) return null;
  return { parties: out, scattered: gone, ...(lead ? { leaders: lead } : {}), notes };
}
