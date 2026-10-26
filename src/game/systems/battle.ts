// Road battles fought out on the field, man by man, in the manner of a mounted-and-blade fight:
// every man is on the ground, shoots, reloads, closes, falls or runs. You give orders to groups
// (your foot, your rifles, your riders) and Hassan, and the band's leader plays his own temper.
//
//   Groups:  foot (sticks and knives), rifles (men who can shoot), riders (mounted men).
//   Orders:  hold, advance, charge, flank (riders), move here (tap the ground). Rifles may hold their fire and
//            then loose one volley together: closer and all at once, it breaks men's nerve.
//   Ground:  cover behind camels or walls halves the fire that reaches you; a ridge or bank reaches further.
//   Nerve:   each side has a nerve that every fallen man drains. Low nerve and men slip away; very low and the
//            side runs. Their leader down costs them dear; Hassan down costs you as much.
//
// Plain functions on plain data with a seeded random source, so a fight can be run without a screen (the
// odds, and the sergeant handling it) and tested.

import { TROOPS } from '../../data/caravan';
import { rngFrom, type Formation, type GroundId, type Result, type Temper } from './combat';

export type Side = 0 | 1;
export type Group = 'foot' | 'rifles' | 'riders';
export type GOrder = 'hold' | 'advance' | 'charge' | 'flank' | 'move' | 'back';
export type ManState = 'up' | 'down' | 'dead' | 'fled';

export interface Man {
  id: number; side: Side; group: Group; kind: string; name: string;
  x: number; y: number; face: number;
  hp: number; maxHp: number; melee: number; aim: number; speed: number; reloadT: number; rifle: boolean; mounted: boolean;
  state: ManState; hero?: boolean; leader?: boolean;
  /** seconds until he can fire again, or strike again */
  load: number; swing: number;
  /** running from the field */
  fleeing?: boolean;
  /** he moved this tick (rifles cannot fire on the move, a charge hits harder) */
  moving: number;
  /** flank route: a waypoint to reach before going in */
  via?: { x: number; y: number };
  /** start position in the line, kept by the group when it holds or moves together */
  slotX: number; slotY: number;
}
export interface Shot { t: number; x: number; y: number; x2: number; y2: number; hit: boolean; side: Side }
export interface Feed { t: number; text: string; side: Side; big?: boolean }
export interface GroupOrder { o: GOrder; x?: number; y?: number }
export interface Battle {
  t: number; men: Man[]; morale: [number, number]; start: [number, number];
  orders: [Record<Group, GroupOrder>, Record<Group, GroupOrder>];
  /** your rifles' fire: at will, or held for a volley */
  fire: 'free' | 'hold';
  /** Hassan: with the camels (safe, steadies the men near him) or with the men in front */
  heroAt: 'back' | 'front';
  shots: Shot[]; feed: Feed[];
  ground: GroundId; formation: Formation; temper: Temper;
  over?: Result; duel?: 'won' | 'lost';
  /** shocks this fight: a volley that tells, a charge in the flank, their leader down */
  lastLoss: [number, number];
  rng: () => number;
  /** things the screen plays: a volley, a charge going in */
  cues: { t: number; kind: 'volley' | 'charge' | 'leader' | 'hero' | 'break' }[];
  flankHit: Set<string>;
}

export interface BandSpec { size: number; rifles: number; mounted: boolean; man: string; leader: string; leaderName?: string; strength: number; bandWord: string }
export interface SideSpec { troops: Record<string, number>; rifles: number; heroArmed: boolean; sergeant: boolean }

const W = 100, H = 100;
export const LIMIT = 150; // seconds; past this both sides pull back
const RANGE = 50;
const MELEE = 3.2;

// how each kind of man fights
const KIND: Record<string, { melee: number; aim: number; hp: number; rifle: boolean }> = {
  fellah: { melee: 0.32, aim: 0.16, hp: 1, rifle: false },
  watchman: { melee: 0.42, aim: 0.18, hp: 1, rifle: false },
  guard: { melee: 0.5, aim: 0.34, hp: 1, rifle: true },
  sentinel: { melee: 0.5, aim: 0.32, hp: 1, rifle: true },
  harbour: { melee: 0.5, aim: 0.32, hp: 1, rifle: true },
  veteran: { melee: 0.66, aim: 0.44, hp: 2, rifle: true },
  bedouin: { melee: 0.55, aim: 0.28, hp: 1, rifle: true },
  desertcaptain: { melee: 0.7, aim: 0.36, hp: 2, rifle: true },
  arnaut: { melee: 0.85, aim: 0.38, hp: 2, rifle: true },
  reformed: { melee: 0.5, aim: 0.24, hp: 1, rifle: true },
  robber: { melee: 0.4, aim: 0.2, hp: 1, rifle: false },
  thief: { melee: 0.44, aim: 0.22, hp: 1, rifle: false },
  raider: { melee: 0.54, aim: 0.24, hp: 1, rifle: false },
  smuggler: { melee: 0.48, aim: 0.24, hp: 1, rifle: false },
  rebel: { melee: 0.58, aim: 0.3, hp: 1, rifle: false },
};
const WORD: Record<string, string> = { robber: 'robber', thief: 'thief', raider: 'raider', smuggler: 'smuggler', rebel: 'rebel' };

const groundCover = (g: GroundId) => (g === 'walls' ? 0.45 : g === 'camels' ? 0.55 : g === 'bank' ? 0.75 : 1);
const groundReach = (g: GroundId) => (g === 'ridge' ? 1.25 : g === 'bank' ? 1.1 : 1);

/** Lay out your caravan and their band, as they stand when the shooting starts. */
export function startBattle(o: { me: SideSpec; band: BandSpec; ground: GroundId; formation: Formation; temper: Temper; seed: string }): Battle {
  const rng = rngFrom(`${o.seed}:battle`);
  const men: Man[] = [];
  let id = 0;
  const add = (m: Omit<Man, 'id' | 'load' | 'swing' | 'moving' | 'face' | 'state' | 'slotX' | 'slotY'>) => {
    men.push({ ...m, id: id++, load: rng() * 1.5, swing: 0, moving: 0, face: m.side === 0 ? -Math.PI / 2 : Math.PI / 2, state: 'up', slotX: m.x, slotY: m.y });
  };
  // ---- your side: who carries what ----
  let spare = o.me.rifles; // bought rifles go to the men with sticks first
  const mineList: { kind: string; group: Group; rifle: boolean; mounted: boolean }[] = [];
  for (const [k, n] of Object.entries(o.me.troops)) {
    const t = TROOPS[k]; if (!t || !n) continue;
    for (let i = 0; i < n; i++) {
      const base = KIND[k] ?? KIND.fellah;
      let rifle = base.rifle;
      if (!rifle && spare > 0) { rifle = true; spare--; }
      mineList.push({ kind: k, group: t.mounted ? 'riders' : rifle ? 'rifles' : 'foot', rifle, mounted: !!t.mounted });
    }
  }
  const sq = o.formation === 'square';
  const wings = o.formation === 'wings';
  const lineOf = (list: typeof mineList, y: number, spread: number) => list.forEach((m, i) => {
    const n = list.length; const x = W / 2 + (i - (n - 1) / 2) * Math.min(spread, 80 / Math.max(1, n - 1 || 1));
    const base = KIND[m.kind] ?? KIND.fellah;
    add({ side: 0, group: m.group, kind: m.kind, name: TROOPS[m.kind]?.name.toLowerCase() ?? 'man', x, y: y + (rng() - 0.5) * 2, hp: base.hp, maxHp: base.hp, melee: base.melee, aim: m.rifle ? Math.max(base.aim, 0.2) : 0, speed: m.mounted ? 7 : 4, reloadT: m.kind === 'veteran' ? 2.4 : 2.8, rifle: m.rifle, mounted: m.mounted });
  });
  const rifles = mineList.filter((m) => m.group === 'rifles');
  const foot = mineList.filter((m) => m.group === 'foot');
  const riders = mineList.filter((m) => m.group === 'riders');
  lineOf(rifles, sq ? 74 : 72.5, sq ? 6 : 15);
  lineOf(foot, sq ? 78 : 78, sq ? 6 : 13);
  if (wings) {
    riders.forEach((m, i) => { const base = KIND[m.kind]; const left = i % 2 === 0; const x = left ? 12 + (i >> 1) * 5 : 88 - (i >> 1) * 5; add({ side: 0, group: 'riders', kind: m.kind, name: TROOPS[m.kind].name.toLowerCase(), x, y: 70, hp: base.hp, maxHp: base.hp, melee: base.melee, aim: base.aim, speed: 7, reloadT: 3.2, rifle: true, mounted: true }); });
  } else lineOf(riders, 83, sq ? 7 : 14);
  // Hassan, with the camels
  add({ side: 0, group: 'foot', kind: 'hero', name: 'Hassan', x: W / 2, y: 87, hp: 3, maxHp: 3, melee: 0.58, aim: o.me.heroArmed ? 0.3 : 0, speed: 4.3, reloadT: 3, rifle: o.me.heroArmed, mounted: false, hero: true });
  // ---- their band ----
  const b = o.band;
  const nRiders = b.mounted ? Math.max(1, Math.round((b.size - 1) * 0.6)) : 0;
  const nRifles = Math.min(b.size - 1 - nRiders, b.rifles);
  const nFoot = Math.max(0, b.size - 1 - nRiders - nRifles);
  const base = KIND[b.man] ?? KIND.robber;
  const st = Math.max(0.85, Math.min(1.25, b.strength / Math.max(1, b.size) / 2)); // stronger bands fight better
  const theirs = (n: number, group: Group, y: number, spread: number) => { for (let i = 0; i < n; i++) {
    const x = W / 2 + (i - (n - 1) / 2) * Math.min(spread, 84 / Math.max(1, n - 1 || 1));
    add({ side: 1, group, kind: b.man, name: WORD[b.man] ?? 'raider', x, y: y + (rng() - 0.5) * 3, hp: 1, maxHp: 1, melee: Math.min(0.85, base.melee * st), aim: group === 'foot' ? 0 : Math.min(0.42, (base.aim + 0.06) * st), speed: group === 'riders' ? 7 : 4.2, reloadT: 3.6, rifle: group !== 'foot', mounted: group === 'riders' });
  } };
  theirs(nFoot, 'foot', 20, 13);
  theirs(nRifles, 'rifles', 14, 15);
  theirs(nRiders, 'riders', 10, 14);
  add({ side: 1, group: nRiders ? 'riders' : 'rifles', kind: b.leader, name: b.leaderName ?? 'their leader', x: W / 2, y: 5, hp: 2, maxHp: 2, melee: Math.min(0.9, base.melee * st + 0.2), aim: 0.32, speed: nRiders ? 7 : 4.2, reloadT: 3, rifle: true, mounted: !!nRiders, leader: true });
  const start: [number, number] = [100 + (o.me.sergeant ? 10 : 0), 100];
  const hold: Record<Group, GroupOrder> = { foot: { o: 'hold' }, rifles: { o: 'hold' }, riders: { o: 'hold' } };
  return {
    t: 0, men, morale: [...start], start, orders: [{ ...hold }, enemyPlan(o.temper, 0)], fire: 'free', heroAt: 'back',
    shots: [], feed: [], ground: o.ground, formation: o.formation, temper: o.temper, lastLoss: [-9, -9], rng, cues: [], flankHit: new Set(),
  };
}

/** What their leader has his groups do, by his temper and how it is going. */
function enemyPlan(temper: Temper, t: number, b?: Battle): Record<Group, GroupOrder> {
  const myNerve = b ? b.morale[0] : 100, theirNerve = b ? b.morale[1] : 100;
  const close = b ? b.men.some((m) => m.side === 0 && m.state === 'up' && m.y < 52) : false;
  if (temper === 'reckless') return { foot: { o: 'charge' }, riders: { o: t > 1 ? 'charge' : 'hold' }, rifles: { o: 'advance' } };
  if (temper === 'cunning') {
    const go = close || myNerve < 70 || t > 16;
    return { foot: { o: go ? 'charge' : 'advance' }, riders: { o: t > 3 ? 'flank' : 'hold' }, rifles: { o: 'advance' } };
  }
  const go = close || myNerve < 55 || theirNerve > myNerve + 25 || t > 28;
  return { foot: { o: go ? 'charge' : 'hold' }, riders: { o: go ? 'charge' : 'hold' }, rifles: { o: go ? 'advance' : 'hold' } };
}

const up = (m: Man) => m.state === 'up' && !m.fleeing;
const d2 = (a: { x: number; y: number }, b: { x: number; y: number }) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

function nearest(b: Battle, m: Man, pred?: (e: Man) => boolean) {
  let best: Man | undefined, bd = Infinity;
  for (const e of b.men) { if (e.side === m.side || !up(e) || (pred && !pred(e))) continue; const d = d2(m, e); if (d < bd) { bd = d; best = e; } }
  return best ? { e: best, d: Math.sqrt(bd) } : undefined;
}

function say(b: Battle, side: Side, text: string, big?: boolean) {
  b.feed.push({ t: b.t, text, side, big });
  if (b.feed.length > 30) b.feed.splice(0, b.feed.length - 30);
}
const theName = (m: Man) => (m.hero ? 'Hassan' : m.leader ? m.name : m.side === 0 ? `your ${m.name}` : `a ${m.name}`);
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

function fall(b: Battle, v: Man, by: Man, how: 'shot' | 'cut') {
  v.hp -= 1;
  if (v.hp > 0) {
    if (v.hero) say(b, 1, `Hassan is hit, but stays on his feet.`, true);
    else if (v.leader) say(b, 0, `${cap(v.name)} is hit and staggers.`, true);
    return;
  }
  v.state = b.rng() < (v.hero || v.leader ? 1 : 0.55) ? 'down' : 'dead';
  const s = v.side;
  b.lastLoss[s] = b.t;
  const per = (s === 0 ? 70 : 80) / Math.max(s === 0 ? 5 : 3, b.men.filter((m) => m.side === s && !m.hero).length);
  b.morale[s] -= per;
  b.morale[1 - s as Side] = Math.min(b.start[1 - s as Side], b.morale[1 - s as Side] + per * 0.25);
  const verb = how === 'shot' ? (v.state === 'dead' ? 'shoots dead' : 'shoots down') : v.state === 'dead' ? 'cuts down' : 'knocks down';
  if (v.leader) { b.morale[1] -= 32; b.cues.push({ t: b.t, kind: 'leader' }); say(b, 0, `${cap(theName(by))} ${verb} ${v.name}! Their men falter.`, true); return; }
  if (v.hero) { b.morale[0] -= 25; b.cues.push({ t: b.t, kind: 'hero' }); say(b, 1, `Hassan goes down! Your men waver.`, true); return; }
  say(b, by.side, `${cap(theName(by))} ${verb} ${theName(v)}.`);
}

/** Give a group an order (your side). 'move' takes the spot tapped on the field. */
export function command(b: Battle, g: Group | 'all', o: GOrder, at?: { x: number; y: number }) {
  const gs: Group[] = g === 'all' ? ['foot', 'rifles', 'riders'] : [g];
  for (const k of gs) {
    if (o === 'flank' && k !== 'riders') { b.orders[0][k] = { o: 'charge' }; continue; }
    b.orders[0][k] = at ? { o, x: at.x, y: at.y } : { o };
    // set the flank route: wide of their line on the open side
    if (o === 'flank') for (const m of b.men) if (m.side === 0 && m.group === 'riders') m.via = { x: m.x < W / 2 ? 6 : 94, y: 30 };
    if (o === 'move' && at) {
      const mine = b.men.filter((m) => m.side === 0 && m.group === k && up(m) && !m.hero);
      const cx = mine.reduce((a, m) => a + m.slotX, 0) / Math.max(1, mine.length);
      const cy = mine.reduce((a, m) => a + m.slotY, 0) / Math.max(1, mine.length);
      for (const m of mine) { m.slotX = Math.max(3, Math.min(97, at.x + (m.slotX - cx) * 0.9)); m.slotY = Math.max(5, Math.min(95, at.y + (m.slotY - cy))); }
    }
  }
  if (o === 'charge' && gs.length) b.cues.push({ t: b.t, kind: 'charge' });
}

/** Rifles holding their fire loose one volley together: the closer they are, the more it tells. */
/** How close the nearest of them is to your rifles: the volley tells best when they are close but not yet on you. */
export function volleyRange(b: Battle) {
  let best = Infinity;
  for (const m of b.men) {
    if (m.side !== 0 || !up(m) || !m.rifle || m.hero || m.group !== 'rifles') continue;
    const t = nearest(b, m); if (t && t.d < best) best = t.d;
  }
  const reach = RANGE * groundReach(b.ground);
  // perfect: within about half your reach and not yet at bayonet length
  const perfect = best <= reach * 0.6 && best > MELEE * 1.5;
  return { d: best, reach, perfect, inRange: best <= reach * 1.1 };
}
export type VolleyResult = { fired: number; hits: number; quality: 'perfect' | 'good' | 'far' | 'none' };
export function volley(b: Battle): VolleyResult {
  let hits = 0, fired = 0;
  const vr = volleyRange(b);
  const quality: VolleyResult['quality'] = !vr.inRange ? 'none' : vr.perfect ? 'perfect' : vr.d <= vr.reach * 0.85 ? 'good' : 'far';
  const bonus = quality === 'perfect' ? 2.1 : quality === 'good' ? 1.5 : 1;
  for (const m of b.men) {
    if (m.side !== 0 || !up(m) || !m.rifle || m.load > 0 || m.hero) continue;
    const t = nearest(b, m); if (!t) continue;
    const reach = RANGE * groundReach(b.ground) * 1.1;
    if (t.d > reach) continue;
    fired++;
    const hit = shoot(b, m, t.e, t.d, reach, bonus);
    if (hit) hits++;
  }
  if (fired) {
    b.cues.push({ t: b.t, kind: 'volley' });
    b.morale[1] -= hits * (quality === 'perfect' ? 8 : 5) + fired * (quality === 'perfect' ? 2 : 0.8);
    say(b, 0, quality === 'perfect' ? `A perfect volley! ${hits === 1 ? 'One of them drops' : hits ? `${hits} of them drop` : 'They duck and falter'}.` : hits ? `Volley! ${hits === 1 ? 'One of them drops' : `${hits} of them drop`}.` : 'Volley! The smoke clears; it went high.', true);
  }
  return { fired, hits, quality: fired ? quality : 'none' };
}

function shoot(b: Battle, m: Man, e: Man, d: number, reach: number, bonus = 1) {
  m.load = m.reloadT * (0.85 + b.rng() * 0.3);
  m.face = Math.atan2(e.y - m.y, e.x - m.x);
  const still = e.moving > 0.2 ? (e.mounted ? 0.7 : 0.85) : 1;
  const cover = e.side === 0 && e.y > 66 && e.moving < 0.2 ? groundCover(b.ground) : e.side === 1 && b.temper === 'cautious' && e.group === 'rifles' && e.moving < 0.2 ? 0.7 : 1;
  const sq = e.side === 0 && b.formation === 'square' ? 1.1 : 1;
  const shaken = 0.6 + 0.4 * Math.max(0, Math.min(1, b.morale[m.side] / 100));
  const p = m.aim * bonus * still * cover * sq * shaken * Math.max(0.15, 1.25 - d / reach);
  const hit = b.rng() < p;
  b.shots.push({ t: b.t, x: m.x, y: m.y, x2: e.x + (hit ? 0 : (b.rng() - 0.5) * 6), y2: e.y + (hit ? 0 : (b.rng() - 0.5) * 6), hit, side: m.side });
  if (b.shots.length > 60) b.shots.splice(0, b.shots.length - 60);
  if (hit) fall(b, e, m, 'shot');
  return hit;
}

/** One step of the fight, dt seconds. */
export function step(b: Battle, dt: number) {
  if (b.over) return b;
  b.t += dt;
  if (Math.floor(b.t) !== Math.floor(b.t - dt)) b.orders[1] = enemyPlan(b.temper, b.t, b);
  const heroUp = b.men.find((m) => m.hero && m.state === 'up');
  for (const m of b.men) {
    if (m.state !== 'up') continue;
    m.load = Math.max(0, m.load - dt); m.swing = Math.max(0, m.swing - dt); m.moving = Math.max(0, m.moving - dt);
    // ---- running away ----
    const nerve = b.morale[m.side] + (m.side === 0 && heroUp && !m.hero && d2(m, heroUp) < 25 * 25 ? 12 : 0);
    if (!m.fleeing && !m.hero && !m.leader && nerve < 28 && b.rng() < ((28 - nerve) / 70) * dt) {
      m.fleeing = true;
      if (b.rng() < 0.5) say(b, m.side, `${cap(theName(m))} throws down his ${m.rifle ? 'rifle' : 'stick'} and runs.`);
    }
    if (m.fleeing) {
      const ty = m.side === 0 ? H + 8 : -8;
      moveTo(m, m.x + (m.x < 50 ? -4 : 4), ty, m.speed * 1.15, dt);
      if (m.y < -5 || m.y > H + 5) m.state = 'fled';
      continue;
    }
    const ord = m.hero ? { o: (b.heroAt === 'front' ? 'follow' : 'stay') as string } : b.orders[m.side][m.group];
    const foe = nearest(b, m);
    if (!foe) continue;
    // ---- in reach of a blade: fight ----
    if (foe.d < MELEE) {
      if (m.swing <= 0) strike(b, m, foe.e);
      m.face = Math.atan2(foe.e.y - m.y, foe.e.x - m.x);
      continue;
    }
    // ---- shoot, if he has a rifle, is loaded, still, and the fire is not held ----
    const reach = RANGE * (m.side === 0 ? groundReach(b.ground) : 1);
    const holding = m.side === 0 && b.fire === 'hold' && !m.hero && m.group === 'rifles';
    const wantsMove = ord.o === 'charge' || ord.o === 'flank' || (ord.o === 'advance' && foe.d > reach * 0.7) || ord.o === 'move' || ord.o === 'back' || (m.hero && ord.o === 'follow');
    if (m.rifle && m.load <= 0 && foe.d < reach && !holding && (!wantsMove || m.mounted || ord.o === 'advance') && !(ord.o === 'charge' && foe.d < 14)) {
      shoot(b, m, foe.e, foe.d, reach);
      if (!m.mounted) continue;
    }
    // ---- move ----
    if (m.hero) {
      if (ord.o === 'follow') {
        const lead = b.men.filter((x) => x.side === 0 && up(x) && !x.hero && x.group === 'foot');
        const pool = lead.length ? lead : b.men.filter((x) => x.side === 0 && up(x) && !x.hero);
        if (pool.length) { const cx = pool.reduce((a, x) => a + x.x, 0) / pool.length, cy = Math.min(...pool.map((x) => x.y)); moveTo(m, cx, cy + 3, m.speed, dt); }
        if (foe.d < 12) moveTo(m, foe.e.x, foe.e.y, m.speed, dt);
      } else moveTo(m, m.slotX, m.slotY, m.speed, dt);
      continue;
    }
    switch (ord.o) {
      case 'hold': if (foe.d < (m.side === 1 ? 9 : 6)) moveTo(m, foe.e.x, foe.e.y, m.speed, dt); else moveTo(m, m.slotX, m.slotY, m.speed * 0.6, dt); break;
      case 'advance': if (foe.d > reach * 0.65) moveTo(m, m.x + (foe.e.x - m.x) * 0.15, foe.e.y, m.speed * 0.6, dt); else if (foe.d < 9) moveTo(m, foe.e.x, foe.e.y, m.speed, dt); break;
      case 'charge': moveTo(m, foe.e.x, foe.e.y, m.speed * (m.mounted ? 1.2 : 1.3), dt); break;
      case 'flank': {
        if (m.via && d2(m, m.via) > 16) { moveTo(m, m.via.x, m.via.y, m.speed * 1.2, dt); break; }
        m.via = undefined;
        // go for their rifles and their leader, from the side
        const tgt = nearest(b, m, (e) => e.leader || e.group === 'rifles') ?? foe;
        moveTo(m, tgt.e.x, tgt.e.y, m.speed * 1.3, dt); break;
      }
      case 'move': if (foe.d < 6) moveTo(m, foe.e.x, foe.e.y, m.speed, dt); else moveTo(m, m.slotX, m.slotY, m.speed, dt); break;
      case 'back': moveTo(m, m.x, Math.min(92, m.y + 20), m.speed, dt); break;
    }
  }
  // nerve comes back to a side that has not lost a man for a while
  for (const s of [0, 1] as Side[]) {
    if (b.t - b.lastLoss[s] > 3 && b.morale[s] < b.start[s] * 0.9) b.morale[s] += (s === 0 && heroUp ? 1.6 : 1) * dt;
    if (b.morale[s] < 0) b.morale[s] = 0;
  }
  // nerve cannot climb back past what the men still standing can carry, and a band cut down to a
  // handful gives it up: the last of them run (and their leader with them) rather than wait to be taken
  for (const s2 of [0, 1] as Side[]) {
    const all = b.men.filter((m) => m.side === s2 && !m.hero);
    const standing = all.filter((m) => m.state === 'up' && !m.fleeing).length;
    const cap = b.start[s2] * (0.3 + 0.7 * (standing / Math.max(1, all.length)));
    if (b.morale[s2] > cap) b.morale[s2] = cap;
    if (s2 === 1 && all.length >= 3 && standing <= Math.max(1, Math.floor(all.length * 0.25)) && b.morale[1] > 7) b.morale[1] = 7;
  }
  // a side whose nerve is gone runs together
  for (const s of [0, 1] as Side[]) if (b.morale[s] < 8) for (const m of b.men) if (m.side === s && m.state === 'up' && !m.fleeing && !(m.hero && s === 0)) { if (!m.fleeing && m.leader) say(b, 0, `${cap(m.name)} turns his horse and goes.`, true); m.fleeing = true; }
  if (b.morale[1] < 8 && !b.cues.some((c) => c.kind === 'break')) { b.cues.push({ t: b.t, kind: 'break' }); say(b, 0, 'They break and run!', true); }
  // ---- the end ----
  const left = (s: Side) => b.men.filter((m) => m.side === s && up(m) && !(s === 0 && m.hero && b.morale[0] < 8)).length;
  const mine = left(0), theirs = left(1);
  if (!theirs) {
    const leader = b.men.find((m) => m.leader);
    b.over = leader && leader.state === 'down' ? 'yield' : 'run';
  } else if (!mine) b.over = b.men.some((m) => m.hero && m.state === 'down') || b.morale[0] < 8 ? 'broken' : 'pushed';
  else if (b.t >= LIMIT) b.over = b.morale[0] > b.morale[1] + 10 ? 'withdraw' : b.morale[1] > b.morale[0] + 10 ? 'pushed' : 'draw';
  return b;
}

function strike(b: Battle, m: Man, e: Man) {
  m.swing = 1.2 + b.rng() * 0.5;
  let p = 0.32 + (m.melee - e.melee) * 0.8;
  if (m.moving > 0.3) p += 0.08; // a charge hits harder
  if (m.mounted && !e.mounted) p += 0.08;
  if (e.side === 0 && b.formation === 'square' && !e.mounted) p -= m.mounted ? 0.25 : 0.1;
  // from the side or behind: he never saw it coming
  const behind = Math.cos(e.face - Math.atan2(m.y - e.y, m.x - e.x)) < -0.2;
  if (behind) {
    p += 0.18;
    const key = `${m.side}:${m.group}`;
    if (!b.flankHit.has(key) && m.group !== 'foot') { b.flankHit.add(key); b.morale[e.side] -= 10; say(b, m.side, m.side === 0 ? 'Your riders crash into them from the side!' : 'They are in among you from the side!', true); }
  }
  if (e.fleeing) p += 0.25;
  if (b.rng() < Math.max(0.12, Math.min(0.9, p))) fall(b, e, m, 'cut');
}

function moveTo(m: Man, x: number, y: number, speed: number, dt: number) {
  const dx = x - m.x, dy = y - m.y, d = Math.hypot(dx, dy);
  if (d < 0.6) return;
  const s = Math.min(d, speed * dt);
  m.x += (dx / d) * s; m.y += (dy / d) * s;
  m.face = Math.atan2(dy, dx);
  m.moving = 0.4;
}

/** The sergeant's way of fighting (and your oldest hand's, less well): used for "let him handle it" and the odds. */
export function sergeantStep(b: Battle, sergeant: boolean) {
  const enemyClose = b.men.some((m) => m.side === 1 && up(m) && m.y > 50);
  if (sergeant) {
    if (b.t > 4 && b.orders[0].riders.o === 'hold') command(b, 'riders', 'flank');
    if (enemyClose && b.orders[0].foot.o === 'hold') command(b, 'foot', 'charge');
    if (b.morale[1] < 45 && b.orders[0].rifles.o !== 'charge') command(b, 'all', 'charge');
  } else {
    if (b.t > 2 && b.orders[0].riders.o === 'hold') command(b, 'riders', 'charge');
    if (b.t > 6 && b.orders[0].foot.o === 'hold') command(b, 'foot', 'charge');
  }
}

/** Run a whole fight without a screen. */
export function simulate(o: Parameters<typeof startBattle>[0], sergeant: boolean, dt = 0.2) {
  const b = startBattle(o);
  while (!b.over) { sergeantStep(b, sergeant); step(b, dt); }
  return b;
}

/** Your chance, as the sergeant would fight it: a few whole fights run on different dice. */
export function battleOdds(o: Parameters<typeof startBattle>[0], sergeant: boolean, runs = 14) {
  let wins = 0;
  for (let i = 0; i < runs; i++) { const r = simulate({ ...o, seed: `${o.seed}:odds${i}` }, sergeant, 0.25).over; if (r === 'run' || r === 'yield' || r === 'withdraw') wins++; }
  return Math.round((wins / runs) * 100);
}

/** The honest forecast shown before a fight: how often it is won when the men fight it out by themselves,
 *  never shown as certain either way, and what it usually costs in men. */
export function forecast(o: Parameters<typeof startBattle>[0], runs = 24): { pct: number; deaths: number; word: string; cost: string } {
  let wins = 0, dead = 0;
  for (let i = 0; i < runs; i++) {
    const b = simulate({ ...o, seed: `${o.seed}:fc${i}` }, true, 0.25);
    if (b.over === 'run' || b.over === 'yield' || b.over === 'withdraw') wins++;
    dead += Object.values(losses(b).lost).reduce((a, n) => a + n, 0);
  }
  const pct = Math.max(5, Math.min(95, Math.round((wins / runs) * 100)));
  const deaths = dead / runs;
  const word = pct >= 85 ? 'strong favourite' : pct >= 65 ? 'good odds' : pct >= 45 ? 'even fight' : pct >= 25 ? 'poor odds' : 'long odds';
  const cost = deaths < 0.25 ? 'likely no men lost' : deaths < 0.8 ? 'you may lose a man' : deaths < 1.8 ? 'expect to lose a man or two' : `expect to lose ${Math.round(deaths)} men`;
  return { pct, deaths, word, cost };
}

/** Who fell on your side, by troop: the dead are lost; the wounded mend if you hold the field. */
export function losses(b: Battle) {
  const won = b.over === 'run' || b.over === 'yield' || b.over === 'withdraw';
  const lost: Record<string, number> = {}, hurt: Record<string, number> = {};
  for (const m of b.men) {
    if (m.side !== 0 || m.hero) continue;
    if (m.state === 'dead' || (m.state === 'down' && !won && b.rng() < 0.5)) lost[m.kind] = (lost[m.kind] ?? 0) + 1;
    else if (m.state === 'down') hurt[m.kind] = (hurt[m.kind] ?? 0) + 1;
    else if (m.state === 'fled' && !won && b.rng() < 0.2) lost[m.kind] = (lost[m.kind] ?? 0) + 1;
  }
  const kills = b.men.filter((m) => m.side === 1 && (m.state === 'dead' || m.state === 'down')).length;
  const taken = b.men.filter((m) => m.side === 1 && m.state === 'down' && !m.leader).length;
  const heroDown = b.men.some((m) => m.hero && m.state === 'down');
  const leaderDown = b.men.some((m) => m.leader && m.state === 'down');
  return { lost, hurt, kills, taken, heroDown, leaderDown, won };
}
