// Dominoes, the block game, two players, double-six: as the regulars play it in the coffee houses of Cairo,
// Damascus or Baghdad. Seven tiles each, the other fourteen stay face down and are never drawn. The highest
// double leads (else the highest tile); each player in turn lays a tile matching one open end or knocks.
// The first to lay his last tile wins the hand; if neither can play, the lighter hand wins.

export type Tile = [number, number];
export type End = 'L' | 'R';
export type Who = 'you' | 'him';
/** a tile on the table, in line order from the left end: a is its left-hand number, b its right-hand */
export interface Laid { a: number; b: number; by: Who; n: number }
export interface Hand {
  you: Tile[];
  him: Tile[];
  /** the face-down tiles nobody plays */
  yard: number;
  line: Laid[];
  turn: Who;
  /** knocks in a row: two means the game is blocked */
  knocks: number;
  /** tiles laid so far, to number them */
  laid: number;
  over?: { winner: Who | null; blocked: boolean; you: number; him: number };
}

export const pipsOf = (t: Tile) => t[0] + t[1];
export const handPips = (ts: Tile[]) => ts.reduce((s, t) => s + pipsOf(t), 0);
export const sameTile = (x: Tile, y: Tile) => (x[0] === y[0] && x[1] === y[1]) || (x[0] === y[1] && x[1] === y[0]);
export const isDouble = (t: Tile) => t[0] === t[1];

/** a small seeded random (mulberry32), so a game can be played again exactly in a test */
export function rngFrom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function seedOf(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function fullSet(): Tile[] {
  const out: Tile[] = [];
  for (let i = 0; i <= 6; i++) for (let j = i; j <= 6; j++) out.push([i, j]);
  return out;
}

const sortHand = (ts: Tile[]) => ts.slice().sort((x, y) => (x[0] - y[0]) || (x[1] - y[1]));

/** shuffle and deal seven each; whoever holds the highest double (else the heaviest tile) leads */
export function deal(rnd: () => number): Hand {
  const set = fullSet();
  for (let i = set.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [set[i], set[j]] = [set[j], set[i]]; }
  const you = sortHand(set.slice(0, 7)), him = sortHand(set.slice(7, 14));
  const rank = (t: Tile) => (isDouble(t) ? 100 + t[0] : pipsOf(t) * 2 + Math.max(t[0], t[1]) / 10);
  const best = (ts: Tile[]) => Math.max(...ts.map(rank));
  return { you, him, yard: 14, line: [], turn: best(you) >= best(him) ? 'you' : 'him', knocks: 0, laid: 0 };
}

export const ends = (h: Pick<Hand, 'line'>): [number, number] | null => (h.line.length ? [h.line[0].a, h.line[h.line.length - 1].b] : null);

/** the ends a tile could go on (the first tile goes anywhere: 'R') */
export function fits(h: Pick<Hand, 'line'>, t: Tile): End[] {
  const e = ends(h);
  if (!e) return ['R'];
  const out: End[] = [];
  if (t[0] === e[0] || t[1] === e[0]) out.push('L');
  if (t[0] === e[1] || t[1] === e[1]) out.push('R');
  // the same number at both ends: one place is enough
  if (out.length === 2 && e[0] === e[1]) return ['R'];
  return out;
}

export interface Move { tile: Tile; end: End }
export function legal(h: Hand, who: Who): Move[] {
  const out: Move[] = [];
  for (const t of h[who]) for (const end of fits(h, t)) out.push({ tile: t, end });
  // the lead: the highest double if one is held (as the table expects), else anything
  if (!h.line.length) {
    const dbl = h[who].filter(isDouble).sort((x, y) => y[0] - x[0])[0];
    if (dbl) return [{ tile: dbl, end: 'R' }];
  }
  return out;
}

export function play(h: Hand, who: Who, m: Move): Hand {
  const hand = h[who];
  const k = hand.findIndex((t) => sameTile(t, m.tile));
  if (k < 0) throw new Error('not in hand');
  const e = ends(h);
  let laid: Laid;
  const [x, y] = m.tile;
  if (!e) laid = { a: x, b: y, by: who, n: h.laid };
  else if (m.end === 'L') laid = y === e[0] ? { a: x, b: y, by: who, n: h.laid } : { a: y, b: x, by: who, n: h.laid };
  else laid = x === e[1] ? { a: x, b: y, by: who, n: h.laid } : { a: y, b: x, by: who, n: h.laid };
  const line = m.end === 'L' && e ? [laid, ...h.line] : [...h.line, laid];
  const rest = hand.filter((_, i) => i !== k);
  const nh: Hand = { ...h, [who]: rest, line, laid: h.laid + 1, knocks: 0, turn: who === 'you' ? 'him' : 'you' };
  return settle(nh, who);
}

/** no tile goes: knock on the table and the turn passes */
export function knock(h: Hand, who: Who): Hand {
  return settle({ ...h, knocks: h.knocks + 1, turn: who === 'you' ? 'him' : 'you' }, who);
}

function settle(h: Hand, last: Who): Hand {
  const you = handPips(h.you), him = handPips(h.him);
  if (!h[last].length) return { ...h, over: { winner: last, blocked: false, you, him } };
  if (h.knocks >= 2 || (!legal(h, 'you').length && !legal(h, 'him').length)) {
    return { ...h, over: { winner: you < him ? 'you' : him < you ? 'him' : null, blocked: true, you, him } };
  }
  return h;
}

/** points for the hand: the winner scores what is left in the loser's hand */
export const handScore = (h: Hand) => (!h.over || !h.over.winner ? 0 : h.over.winner === 'you' ? h.over.him : h.over.you);

/**
 * The regular's play: the heaviest tile that goes, weighed a little by what it leaves him. A tile that
 * keeps a number he holds at the open ends is better (he will not have to knock); one that leaves an
 * end he cannot follow, worse. Doubles go early, as every coffee-house player knows they are hard to place.
 */
export function chooseMove(h: Hand, who: Who = 'him'): Move | null {
  const ms = legal(h, who);
  if (!ms.length) return null;
  let best: Move | null = null, bestV = -Infinity;
  for (const m of ms) {
    const after = play({ ...h, over: undefined }, who, m);
    if (after.over?.winner === who) return m;
    const mine = after[who];
    const e = ends(after)!;
    const follow = mine.filter((t) => t[0] === e[0] || t[1] === e[0] || t[0] === e[1] || t[1] === e[1]).length;
    let v = pipsOf(m.tile) + (isDouble(m.tile) ? 3 : 0) + Math.min(follow, 3) * 2.5 - (follow === 0 && mine.length ? 6 : 0);
    // the same number on both ends is strong when he holds several of it
    if (e[0] === e[1]) v += mine.filter((t) => t[0] === e[0] || t[1] === e[0]).length * 1.5;
    if (v > bestV) { bestV = v; best = m; }
  }
  return best;
}
