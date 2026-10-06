// Tactical road fights. A small grid, squads instead of single men, morale that spreads and breaks,
// cover and high ground, flanking, a commander order each turn, and a visible enemy plan.
// The same rules run the player's fight and the "let the men fight it out" simulation.
//
// Ideas borrowed: Bannerlord (squad orders, side morale, send-in-the-troops auto-resolve), Battle Brothers
// (morale cascades, height and cover), Into the Breach (the enemy's next move is shown), Total War
// (flank and rear hits, routs decide most fights), Wartales (who spots the ambush moves first).
// All numbers are game balance, not history.

export const COLS = 6;
export const ROWS = 9;
export type Side = 'me' | 'en';
export type Kind = 'rifle' | 'melee' | 'mounted' | 'leader' | 'hero';
export type CellType = 'open' | 'cover' | 'rock' | 'water' | 'high';
export type Style = 'aggressive' | 'steady';

export interface Squad {
  id: string; side: Side; troop: string; name: string; img: string; kind: Kind;
  n: number; start: number; per: number; hp: number; maxHp: number;
  x: number; y: number; morale: number;
  moved: boolean; acted: boolean; held: boolean; hit: boolean;
  gone?: 'dead' | 'routed';
}
export interface Battle {
  field: string; cells: CellType[];
  squads: Squad[];
  turn: number; maxTurns: number;
  /** who moves first: the side that spotted the other */
  initiative: Side;
  /** this turn's commander order has been used */
  commanded: boolean;
  focus?: string; holdLine: boolean;
  /** Hassan's skill in command, 0 to 1 */
  cmd: number;
  leaderDown: Partial<Record<Side, boolean>>;
  log: string[];
  over?: { result: 'win' | 'loss' | 'draw' };
  heroDown: boolean;
  /** auto-play of the player's side is handicapped: a careful commander does better */
  autoMine: boolean;
}
export interface Step { b: Battle; text: string; fx?: { kind: 'shot' | 'melee' | 'rout' | 'kill' | 'rally' | 'order'; from?: string; to?: string; at?: [number, number] } }
export type Order =
  | { t: 'hold' }
  | { t: 'move'; to: [number, number] }
  | { t: 'shoot'; target: string; to?: [number, number] }
  | { t: 'charge'; target: string; to: [number, number] }
  | { t: 'rally' }
  | { t: 'focus'; target: string }
  | { t: 'holdline' };

let rnd: () => number = Math.random;
export const setTacticsRng = (f: () => number) => { rnd = f; };
const between = (a: number, b: number) => a + rnd() * (b - a);

const idx = (x: number, y: number) => y * COLS + x;
const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < COLS && y < ROWS;
export const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
export const cellAt = (b: Battle, x: number, y: number): CellType => b.cells[idx(x, y)] ?? 'open';
export const live = (b: Battle, side?: Side) => b.squads.filter((s) => !s.gone && (!side || s.side === side));
export const squadAt = (b: Battle, x: number, y: number) => live(b).find((s) => s.x === x && s.y === y);
export const byId = (b: Battle, id: string) => b.squads.find((s) => s.id === id);

const SPEED: Record<Kind, number> = { melee: 2, rifle: 2, hero: 2, leader: 1, mounted: 4 };
export const RANGE: Record<Kind, number> = { rifle: 4, hero: 3, leader: 3, melee: 0, mounted: 0 };
export const KIND_LABEL: Record<Kind, string> = { rifle: 'Riflemen', melee: 'Spearmen', mounted: 'Riders', leader: 'Leader', hero: 'Commander' };
const speedOf = (b: Battle, s: Squad) => Math.max(1, SPEED[s.kind] - (s.kind === 'mounted' && /dunes|ford/.test(b.field) ? 1 : 0));

// ---------- ground ----------
function mulberry(seed: number) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const GROUND: Record<string, Partial<Record<CellType, number>>> = {
  road: { cover: 4 }, dunes: { cover: 2 }, oasis: { cover: 5, water: 2 }, pass: { cover: 4, rock: 4 }, nile: { cover: 6, water: 3 },
  ford: { water: 9, cover: 2 }, hills: { cover: 3, high: 4 }, basalt: { cover: 5, rock: 3 }, ruins: { cover: 7 }, mountain: { rock: 5, cover: 3, high: 2 },
};
export function makeGround(field: string, seed: string): CellType[] {
  let h = 7; for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const r = mulberry(h);
  const cells: CellType[] = Array(COLS * ROWS).fill('open');
  const spec = GROUND[field] ?? GROUND.road;
  const place = (type: CellType, count: number, y0: number, y1: number) => {
    for (let i = 0, tries = 0; i < count && tries < 80; tries++) {
      const x = Math.floor(r() * COLS), y = y0 + Math.floor(r() * (y1 - y0 + 1));
      if (cells[idx(x, y)] !== 'open') continue;
      cells[idx(x, y)] = type; i++;
    }
  };
  if (field === 'ford') { for (let y = 3; y <= 5; y++) for (let x = 0; x < COLS; x++) if (r() < 0.7) cells[idx(x, y)] = 'water'; }
  else place('water', spec.water ?? 0, 3, 5);
  place('rock', spec.rock ?? 0, 2, 6);
  place('high', spec.high ?? 0, 2, 6);
  // cover: a few near the middle, and one or two near each line so both sides have somewhere to fight from
  const cov = spec.cover ?? 0;
  place('cover', Math.ceil(cov * 0.6), 3, 5);
  place('cover', Math.floor(cov * 0.2), 1, 2);
  place('cover', Math.max(0, cov - Math.ceil(cov * 0.6) - Math.floor(cov * 0.2)), 6, 7);
  return cells;
}

// ---------- movement ----------
/** Cells a squad can reach this turn, with the move points spent. Other squads and rocks block. */
export function reach(b: Battle, s: Squad): Map<string, number> {
  const out = new Map<string, number>([[`${s.x},${s.y}`, 0]]);
  const q: [number, number, number][] = [[s.x, s.y, 0]];
  const max = speedOf(b, s);
  while (q.length) {
    q.sort((a, c) => a[2] - c[2]);
    const [x, y, c] = q.shift()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (!inside(nx, ny)) continue;
      const t = cellAt(b, nx, ny);
      if (t === 'rock' || squadAt(b, nx, ny)) continue;
      const nc = c + (t === 'water' ? 2 : 1);
      if (nc > max) continue;
      const k = `${nx},${ny}`;
      if ((out.get(k) ?? 99) <= nc) continue;
      out.set(k, nc); q.push([nx, ny, nc]);
    }
  }
  return out;
}
const adjacent = (a: { x: number; y: number }, c: { x: number; y: number }) => dist(a, c) === 1;
export function chargeCells(b: Battle, s: Squad, t: Squad): [number, number][] {
  const r = reach(b, s);
  return [...r.keys()].map((k) => k.split(',').map(Number) as [number, number]).filter(([x, y]) => adjacent({ x, y }, t));
}

// ---------- combat numbers ----------
const strengthNow = (s: Squad) => s.hp;
function flanked(b: Battle, t: Squad, attacker: Squad) {
  return live(b, attacker.side).some((o) => o.id !== attacker.id && adjacent(o, t));
}
export function shootPower(b: Battle, a: Squad, t: Squad, preview = false): number {
  const k = a.kind === 'rifle' ? 0.3 : a.kind === 'hero' ? 0.2 : a.kind === 'leader' ? 0.16 : 0;
  let m = strengthNow(a) * k;
  if (a.moved) m *= 0.75;
  if (a.held) m *= 1.2;
  if (cellAt(b, a.x, a.y) === 'high') m *= 1.2;
  const tc = cellAt(b, t.x, t.y);
  if (tc === 'cover') m *= 0.6; else if (tc === 'high') m *= 0.8;
  if (dist(a, t) > 2) m *= 0.85;
  if (a.morale < 50) m *= 0.8;
  if (b.focus === t.id && a.side === 'me') m *= 1.3;
  if (a.side === 'me' && b.autoMine) m *= 0.92;
  if (t.held) m *= 0.8;
  if (t.side === 'me' && b.holdLine && tc === 'cover') m *= 0.75;
  return preview ? m : m * between(0.75, 1.25);
}
export function meleePower(b: Battle, a: Squad, t: Squad, charged: boolean, preview = false): number {
  const base = a.kind === 'mounted' ? 0.5 : a.kind === 'melee' ? 0.45 : a.kind === 'leader' ? 0.3 : a.kind === 'rifle' ? 0.18 : 0.12;
  let m = strengthNow(a) * base;
  if (charged) m *= a.kind === 'mounted' ? 1.6 : 1.3;
  if (cellAt(b, t.x, t.y) === 'cover') m *= 0.85;
  if (flanked(b, t, a)) m *= 1.25;
  if (a.morale < 50) m *= 0.8;
  if (a.side === 'me' && b.autoMine) m *= 0.92;
  if (t.held) m *= 0.8;
  return preview ? m : m * between(0.75, 1.25);
}
/** Chance-free summary for the tap target: the men expected to fall, rounded */
export function expectedKills(b: Battle, a: Squad, t: Squad, melee: boolean) {
  const d = melee ? meleePower(b, a, t, true, true) : shootPower(b, a, t, true);
  return Math.min(t.n, Math.round((d / t.per) * 10) / 10);
}

// ---------- applying things ----------
const clone = (b: Battle): Battle => structuredClone(b);
/** verb agreement: a lone leader or Hassan, against a squad of men */
const V = (s: Squad, plural: string, single: string) => (s.kind === 'leader' || s.kind === 'hero' ? single : plural);
function lose(b: Battle, s: Squad, dmg: number, how: 'shot' | 'melee', notes: string[]) {
  const before = s.n;
  s.hp = Math.max(0, s.hp - dmg);
  s.n = Math.ceil(s.hp / s.per - 1e-9);
  s.hit = true;
  const lost = before - s.n;
  s.morale -= (dmg / s.maxHp) * (how === 'melee' ? 90 : 70);
  if (s.hp <= 0) {
    s.gone = 'dead';
    notes.push(`${s.name} ${s.kind === 'leader' || s.kind === 'hero' ? 'is' : 'are'} wiped out.`);
    shake(b, s, s.kind === 'leader' || s.kind === 'hero' ? 28 : 12, notes);
    if (s.kind === 'leader' || s.kind === 'hero') b.leaderDown[s.side] = true;
    if (s.kind === 'hero') b.heroDown = true;
    return lost;
  }
  if (s.morale <= 20) rout(b, s, notes);
  return lost;
}
/** the neighbours of a squad that breaks or dies lose heart */
function shake(b: Battle, from: Squad, amount: number, _notes: string[]) {
  for (const o of live(b, from.side)) if (o.id !== from.id && (amount >= 25 || dist(o, from) <= 2)) o.morale -= amount * (amount >= 25 ? 1 : 0.8);
}
function rout(b: Battle, s: Squad, notes: string[]) {
  if (s.gone) return;
  s.gone = 'routed';
  notes.push(`${s.name} ${V(s, 'break', 'breaks')} and ${V(s, 'run', 'runs')}.`);
  shake(b, s, 10, notes);
}
function settleMorale(b: Battle, notes: string[]) {
  // chain: a rout can push neighbours over the edge in the same moment
  for (let i = 0; i < 4; i++) {
    let any = false;
    for (const s of live(b)) if (s.morale <= 20) { rout(b, s, notes); any = true; }
    if (!any) break;
  }
}
function checkOver(b: Battle) {
  if (b.over) return;
  const en = live(b, 'en'), me = live(b, 'me');
  const enHp = en.reduce((a, s) => a + s.hp, 0), enMax = b.squads.filter((s) => s.side === 'en').reduce((a, s) => a + s.maxHp, 0);
  const frac = enMax ? enHp / enMax : 0;
  if (!en.length || frac <= 0.35 || (b.leaderDown.en && frac <= 0.6)) { b.over = { result: 'win' }; return; }
  if (b.heroDown || !me.some((s) => s.kind !== 'hero')) { b.over = { result: 'loss' }; return; }
}

/** Run one order for one squad. Returns the new battle and a line for the log. */
export function act(b0: Battle, id: string, o: Order): Step {
  const b = clone(b0);
  const s = byId(b, id)!;
  const notes: string[] = [];
  let fx: Step['fx'];
  const t = 'target' in o ? byId(b, o.target) : undefined;
  if (o.t === 'move' || ((o.t === 'shoot') && o.to)) {
    const to = o.t === 'move' ? o.to : o.to!;
    if (to[0] !== s.x || to[1] !== s.y) { s.x = to[0]; s.y = to[1]; s.moved = true; s.held = false; }
  }
  if (o.t === 'move') {
    notes.push(`${s.name} ${V(s, 'move', 'moves')}.`);
    if (cellAt(b, s.x, s.y) === 'cover') notes[0] = `${s.name} ${V(s, 'take', 'takes')} cover.`;
  } else if (o.t === 'hold') {
    s.held = true; s.acted = true;
    notes.push(`${s.name} ${V(s, 'hold', 'holds')} and ${V(s, 'steady', 'steadies')} ${V(s, 'their', 'his')} aim.`);
  } else if (o.t === 'shoot' && t) {
    const d = shootPower(b, s, t);
    const before = t.n;
    lose(b, t, d, 'shot', notes);
    const killed = before - t.n;
    notes.unshift(`${s.name} ${V(s, 'fire', 'fires')} on ${t.name}: ${killed ? `${killed} down` : 'no one falls, but they flinch'}.`);
    s.acted = true; s.held = false; fx = { kind: 'shot', from: s.id, to: t.id };
  } else if (o.t === 'charge' && t) {
    const moved = dist(s, { x: o.to[0], y: o.to[1] });
    s.x = o.to[0]; s.y = o.to[1]; s.moved = true; s.held = false;
    const d = meleePower(b, s, t, moved >= 2 || s.kind === 'mounted');
    const before = t.n;
    const fl = flanked(b, t, s);
    lose(b, t, d, 'melee', notes);
    if (fl && !t.gone) t.morale -= 8;
    const killed = before - t.n;
    // the defender strikes back
    if (!t.gone) {
      const back = meleePower(b, t, s, false) * (t.kind === 'rifle' ? 0.5 : t.kind === 'hero' ? 0.4 : 0.8);
      const sb = s.n;
      lose(b, s, back, 'melee', notes);
      notes.unshift(`${s.name} ${s.kind === 'mounted' ? V(s, 'ride down', 'rides down') : V(s, 'charge', 'charges')} ${t.name}${fl ? ' from the flank' : ''}: ${killed} down, ${sb - s.n} lost in return.`);
    } else notes.unshift(`${s.name} ${s.kind === 'mounted' ? V(s, 'ride down', 'rides down') : V(s, 'charge', 'charges')} ${t.name}: ${killed} down.`);
    s.acted = true; fx = { kind: 'melee', from: s.id, to: t.id };
  } else if (o.t === 'rally') {
    const power = s.kind === 'hero' ? 20 + 12 * b.cmd : 10;
    for (const a of live(b, s.side)) if (dist(a, s) <= 3 && a.id !== s.id) a.morale = Math.min(100, a.morale + power);
    s.acted = true; b.commanded = s.kind === 'hero' ? true : b.commanded;
    notes.push(s.kind === 'hero' ? 'Hassan shouts the men together. They steady.' : `${s.name} ${V(s, 'rally', 'rallies')} ${V(s, 'their', 'his')} men.`);
    fx = { kind: 'rally', at: [s.x, s.y] };
  } else if (o.t === 'focus' && t) {
    b.focus = t.id; s.acted = true; b.commanded = true;
    notes.push(`Hassan points: every rifle on ${t.name}.`);
    fx = { kind: 'order', to: t.id };
  } else if (o.t === 'holdline') {
    b.holdLine = true; s.acted = true; b.commanded = true;
    notes.push('Hassan calls the line to hold. Men in cover dig in.');
    fx = { kind: 'order' };
  }
  settleMorale(b, notes);
  checkOver(b);
  b.log = [...notes.reverse(), ...b.log].slice(0, 12);
  return { b, text: notes.join(' ') || '', fx };
}

// ---------- AI (the enemy, the plan preview, and the player's side in simulation) ----------
function targetScore(b: Battle, s: Squad, t: Squad) {
  let sc = (1 - t.hp / t.maxHp) * 40 - dist(s, t) * 2 + (t.kind === 'rifle' ? 15 : 0) + (t.kind === 'hero' ? 10 : 0) + (t.kind === 'leader' ? 30 : 0);
  if (cellAt(b, t.x, t.y) === 'cover') sc -= 18;
  if (t.morale < 40) sc += 10; // a wavering squad about to break
  if (b.focus === t.id) sc += 25;
  return sc;
}
function bestCellToward(b: Battle, s: Squad, goal: Squad, keep: number, r: Map<string, number>): [number, number] | null {
  let best: [number, number] | null = null, bs = -1e9;
  for (const [k] of r) {
    const [x, y] = k.split(',').map(Number);
    if ((x !== s.x || y !== s.y) && squadAt(b, x, y)) continue;
    const d = dist({ x, y }, goal);
    let sc = -Math.abs(d - keep) * 3 - (d < keep ? 4 : 0);
    const c = cellAt(b, x, y);
    if (c === 'cover') sc += 3.5; if (c === 'high') sc += 3; if (c === 'water') sc -= 2;
    if (x === s.x && y === s.y) sc -= 0.2;
    if (sc > bs) { bs = sc; best = [x, y]; }
  }
  return best;
}
export function choose(b: Battle, s: Squad, style: Style): Order {
  const foes = live(b, s.side === 'me' ? 'en' : 'me').filter((f) => s.side === 'en' || f.kind !== 'hero' || true);
  if (!foes.length) return { t: 'hold' };
  const nearest = [...foes].sort((a, c) => dist(s, a) - dist(s, c))[0];
  const r = reach(b, s);
  const front = s.side === 'en' ? 0 : ROWS - 1;
  // shaky squads fall back toward their own edge
  if (s.morale < 32 && s.kind !== 'leader' && s.kind !== 'hero') {
    let best: [number, number] | null = null, bd = -1;
    for (const [k] of r) { const [x, y] = k.split(',').map(Number); const d = dist({ x, y }, nearest) + Math.abs(y - front) * -0.2; if (d > bd && !(squadAt(b, x, y) && (x !== s.x || y !== s.y))) { bd = d; best = [x, y]; } }
    return best && (best[0] !== s.x || best[1] !== s.y) ? { t: 'move', to: best } : { t: 'hold' };
  }
  if (s.kind === 'hero') {
    // the commander stays at the back, rallies when it helps, shoots what comes close
    const wavering = live(b, 'me').filter((a) => a.id !== s.id && a.morale < 55 && dist(a, s) <= 3).length;
    if (wavering >= 1 && !b.commanded) return { t: 'rally' };
    const targets = foes.filter((f) => dist(s, f) <= RANGE.hero);
    if (targets.length) return { t: 'shoot', target: [...targets].sort((a, c) => targetScore(b, s, c) - targetScore(b, s, a))[0].id };
    return { t: 'hold' };
  }
  if (s.kind === 'leader') {
    const weak = live(b, s.side).filter((a) => a.id !== s.id && a.morale < 60 && dist(a, s) <= 3).length;
    if (weak && !s.held) return { t: 'rally' };
    const inRange = foes.filter((f) => dist(s, f) <= RANGE.leader);
    if (inRange.length) return { t: 'shoot', target: [...inRange].sort((a, c) => targetScore(b, s, c) - targetScore(b, s, a))[0].id };
    return { t: 'hold' };
  }
  if (s.kind === 'rifle') {
    const range = RANGE.rifle;
    const here = foes.filter((f) => dist(s, f) <= range);
    // a better firing position that keeps a target in range: cover first
    if (here.length && cellAt(b, s.x, s.y) !== 'cover' && style === 'steady') {
      for (const [k] of r) {
        const [x, y] = k.split(',').map(Number);
        if (cellAt(b, x, y) === 'cover' && !squadAt(b, x, y)) {
          const ts = foes.filter((f) => dist({ x, y }, f) <= range);
          if (ts.length) return { t: 'shoot', to: [x, y], target: [...ts].sort((a, c) => targetScore(b, s, c) - targetScore(b, s, a))[0].id };
        }
      }
    }
    if (here.length) return { t: 'shoot', target: [...here].sort((a, c) => targetScore(b, s, c) - targetScore(b, s, a))[0].id };
    // enemy squads that close to melee are met by a volley as they come; otherwise advance to firing range
    const to = bestCellToward(b, s, nearest, style === 'steady' ? range - 1 : range - 2, r);
    if (to && (to[0] !== s.x || to[1] !== s.y)) {
      const ts = foes.filter((f) => dist({ x: to[0], y: to[1] }, f) <= range);
      if (ts.length) return { t: 'shoot', to, target: [...ts].sort((a, c) => targetScore(b, s, c) - targetScore(b, s, a))[0].id };
      return { t: 'move', to };
    }
    return { t: 'hold' };
  }
  // melee and mounted: pick the charge that does the most good
  let bestCharge: { t: Squad; to: [number, number]; sc: number } | null = null;
  for (const f of foes) {
        for (const to of chargeCells(b, s, f)) {
      let sc = targetScore(b, s, f);
      // coming in from the side or the back
      const behind = s.side === 'me' ? to[1] < f.y : to[1] > f.y;
      if (behind) sc += 14;
      if (live(b, s.side).some((o) => o.id !== s.id && adjacent(o, f))) sc += 10;
      if (cellAt(b, to[0], to[1]) === 'cover') sc += 4;
      // do not throw a small squad on a big one
      const odds = s.hp / Math.max(1, f.hp);
      if (odds < (style === 'steady' ? 0.7 : 0.45)) sc -= 40;
      if (f.kind === 'melee' && s.kind === 'mounted') sc -= 10; // spears stop horses
      if (f.kind === 'hero' && foes.some((o) => o.kind !== 'hero')) sc -= 30; // the commander is a last resort, not a first target
      if (!bestCharge || sc > bestCharge.sc) bestCharge = { t: f, to, sc };
    }
  }
  if (bestCharge && bestCharge.sc > -5) return { t: 'charge', target: bestCharge.t.id, to: bestCharge.to };
  const close = dist(s, nearest) <= 5;
  if (style === 'steady' && close && cellAt(b, s.x, s.y) === 'cover') return { t: 'hold' };
  const to = bestCellToward(b, s, nearest, style === 'steady' && close ? 3 : 1, r);
  return to && (to[0] !== s.x || to[1] !== s.y) ? { t: 'move', to } : { t: 'hold' };
}

/** Run every squad of a side, one after the other, with the next squad choosing after the last one acted. */
export function sidePhase(b0: Battle, side: Side, style: Style): Step[] {
  const steps: Step[] = [];
  let b = b0;
  const order = live(b, side).map((s) => s.id).sort((a, c) => {
    const A = byId(b, a)!, C = byId(b, c)!;
    const rank = (s: Squad) => (s.kind === 'rifle' ? 0 : s.kind === 'melee' || s.kind === 'mounted' ? 1 : 2);
    return rank(A) - rank(C);
  });
  for (const id of order) {
    const s = byId(b, id);
    if (!s || s.gone || b.over) continue;
    let o = choose(b, s, style);
    // a move that is also a shot: do the move, then the shot
    if (o.t === 'shoot' && o.to) { const mv = act(b, id, { t: 'move', to: o.to }); b = mv.b; }
    if (o.t === 'shoot' && o.to) o = { t: 'shoot', target: o.target };
    const st = act(b, id, o);
    steps.push(st); b = st.b;
  }
  return steps;
}
/** What the enemy is about to do, drawn on the map: an intent per squad, without changing anything. */
export function intents(b: Battle): { id: string; kind: Order['t']; from: [number, number]; to?: [number, number]; target?: string }[] {
  const out: { id: string; kind: Order['t']; from: [number, number]; to?: [number, number]; target?: string }[] = [];
  let probe = clone(b);
  for (const s of live(probe, 'en')) {
    const o = choose(probe, s, 'steady');
    const to = 'to' in o && o.to ? o.to : undefined;
    out.push({ id: s.id, kind: o.t, from: [s.x, s.y], to, target: 'target' in o ? o.target : undefined });
    // place it where it would stand so squads behind it plan around it
    if (to) { const sq = byId(probe, s.id)!; sq.x = to[0]; sq.y = to[1]; }
  }
  probe = probe; // (kept for clarity: the probe is discarded)
  return out;
}

/** End of the player's turn and the enemy's: morale recovers, orders reset. */
export function newTurn(b0: Battle): Battle {
  const b = clone(b0);
  b.turn += 1;
  b.commanded = false; b.focus = undefined; b.holdLine = false;
  for (const s of live(b)) {
    if (!s.hit) s.morale = Math.min(100, s.morale + (s.held ? 7 : 3));
    s.moved = false; s.acted = false; s.hit = false;
    // the long way round: several of their squads next to you
    const around = live(b, s.side === 'me' ? 'en' : 'me').filter((o) => adjacent(o, s)).length;
    if (around >= 2) s.morale -= 6;
  }
  const notes: string[] = [];
  settleMorale(b, notes);
  checkOver(b);
  if (!b.over && b.turn > b.maxTurns) {
    const mine = live(b, 'me').reduce((a, s) => a + s.hp, 0), theirs = live(b, 'en').reduce((a, s) => a + s.hp, 0);
    b.over = { result: mine > theirs * 1.15 ? 'win' : theirs > mine * 1.15 ? 'loss' : 'draw' };
  }
  if (notes.length) b.log = [...notes, ...b.log].slice(0, 12);
  return b;
}

// ---------- starting a fight ----------
export interface Roster { id: string; name: string; plural: string; n: number; per: number; kind: Kind; img: string }
export interface BandSpec { man: string; leader: string; mounted: number; melee: number }
export const MOUNTED_TROOPS = ['bedouin', 'desertcaptain', 'arnaut', 'reformed'];
export const RIFLE_TROOPS = ['guard', 'veteran', 'sentinel', 'harbour'];

export function newBattle(o: { field: string; seed: string; mine: Roster[]; enemyMen: number; enemyStrength: number; band: BandSpec; bandName: string; cmd: number; scouted: boolean; maxTurns?: number; heroImg?: string }): Battle {
  const cells = makeGround(o.field, o.seed);
  const squads: Squad[] = [];
  // my squads fill the two bottom rows, riders on the wings
  const slots: [number, number][] = [[2, 8], [3, 8], [1, 8], [4, 8], [0, 8], [5, 8], [1, 7], [4, 7], [2, 7], [3, 7], [0, 7], [5, 7]];
  const free = (x: number, y: number) => cells[idx(x, y)] !== 'rock' && !squads.some((s) => s.x === x && s.y === y);
  const put = (s: Squad, prefer: [number, number][]) => { const p = prefer.find(([x, y]) => free(x, y)) ?? [[0, 8]].find(([x, y]) => free(x, y)) ?? [5, 8]; s.x = p[0]; s.y = p[1]; squads.push(s); };
  const mk = (p: Partial<Squad> & Pick<Squad, 'id' | 'side' | 'troop' | 'name' | 'img' | 'kind' | 'n' | 'per'>): Squad => ({ start: p.n, hp: p.n * p.per, maxHp: p.n * p.per, x: 0, y: 0, morale: 80, moved: false, acted: false, held: false, hit: false, ...p });
  // Hassan: weak, behind the line, the one who gives orders
  put(mk({ id: 'hero', side: 'me', troop: 'you', name: 'Hassan', img: o.heroImg ?? 'art/battle/hero.webp', kind: 'hero', n: 1, per: 8, morale: 100 }), [[2, 8], [3, 8]]);
  let wing = 0;
  for (const r of o.mine.filter((m) => m.n > 0)) {
    const mounted = r.kind === 'mounted';
    // big groups are split so one volley doesn't decide the fight
    const parts = Math.ceil(r.n / 4);
    for (let i = 0; i < parts; i++) {
      const n = Math.floor(r.n / parts) + (i < r.n % parts ? 1 : 0);
      if (n < 1) continue;
      const prefer: [number, number][] = mounted ? [[wing % 2 ? 5 : 0, 7], [wing % 2 ? 4 : 1, 7], ...slots] : [...slots].reverse().filter(([, y]) => y === 7).concat(slots);
      wing += mounted ? 1 : 0;
      put(mk({ id: `${r.id}${i}`, side: 'me', troop: r.id, name: parts > 1 ? `${r.plural} ${String.fromCharCode(65 + i)}` : r.plural, img: r.img, kind: r.kind, n, per: r.per }), prefer);
    }
  }
  // the band: a leader and squads of up to three
  const per = o.enemyStrength / Math.max(1, o.enemyMen);
  const leader = mk({ id: 'e-lead', side: 'en', troop: 'leader', name: 'The leader', img: `art/battle/${o.band.leader}.webp`, kind: 'leader', n: 1, per: per * 1.8, morale: 90 });
  put(leader, [[2, 0], [3, 0], [1, 0]]);
  let left = Math.max(0, o.enemyMen - 1), i = 0;
  const front: [number, number][] = [[1, 1], [4, 1], [2, 1], [3, 1], [0, 1], [5, 1], [0, 2], [5, 2], [2, 2], [3, 2]];
  while (left > 0) {
    const n = Math.min(3, left); left -= n;
    const r = rnd();
    const kind: Kind = r < o.band.mounted ? 'mounted' : r < o.band.mounted + o.band.melee ? 'melee' : 'rifle';
    put(mk({ id: `e${i}`, side: 'en', troop: o.band.man, name: `${o.bandName} ${String.fromCharCode(65 + i)}`, img: `art/battle/${o.band.man}.webp`, kind, n, per }), front);
    i++;
  }
  const b: Battle = { field: o.field, cells, squads, turn: 1, maxTurns: o.maxTurns ?? 12, initiative: o.scouted ? 'me' : 'en', commanded: false, holdLine: false, cmd: o.cmd, leaderDown: {}, log: [], heroDown: false, autoMine: false };
  b.log = [o.scouted ? 'Your scouts saw them first. You have the first move.' : 'They were waiting. They move first.'];
  return b;
}

// ---------- result ----------
export interface Outcome { result: 'win' | 'loss' | 'draw'; troopsLost: Record<string, number>; enemyKilled: number; heroDown: boolean; heroHurt: boolean }
export function outcome(b: Battle): Outcome {
  const troopsLost: Record<string, number> = {};
  for (const s of b.squads.filter((q) => q.side === 'me' && q.kind !== 'hero')) {
    // men who ran are not all lost: some come back
    const lost = s.gone === 'routed' ? Math.round(s.n * 0.4) + (s.start - s.n) : s.start - s.n;
    if (lost > 0) troopsLost[s.troop] = (troopsLost[s.troop] ?? 0) + lost;
  }
  const enemyKilled = b.squads.filter((q) => q.side === 'en' && q.kind !== 'leader').reduce((a, s) => a + (s.start - s.n) + (s.gone === 'routed' ? Math.round(s.n * 0.5) : 0), 0);
  const hero = byId(b, 'hero');
  return { result: b.over?.result ?? 'draw', troopsLost, enemyKilled, heroDown: b.heroDown, heroHurt: !!hero && (hero.hp < hero.maxHp || hero.morale < 50) };
}

/** Run a whole fight with an AI on both sides (the "let the men fight it out" button, and the balance test). */
export function simulate(b0: Battle, myStyle: Style, enemyStyle: Style = 'steady'): { b: Battle; steps: Step[] } {
  let b = clone(b0); b.autoMine = true;
  const steps: Step[] = [];
  for (let guard = 0; guard < 40 && !b.over; guard++) {
    const first: Side = b.initiative === 'me' || b.turn > 1 ? 'me' : 'en';
    const phases: [Side, Style][] = first === 'me' ? [['me', myStyle], ['en', enemyStyle]] : [['en', enemyStyle], ['me', myStyle]];
    for (const [side, style] of phases) {
      if (b.over) break;
      const ss = sidePhase(b, side, style); steps.push(...ss); if (ss.length) b = ss[ss.length - 1].b;
    }
    if (!b.over) b = newTurn(b);
  }
  return { b, steps };
}
