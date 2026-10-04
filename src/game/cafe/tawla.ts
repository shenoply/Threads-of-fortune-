// Tawla (backgammon, as it is played in every Cairo coffee house): the rules and Bilgin's play.
// pts[i] > 0 are your checkers, < 0 Bilgin's. You move from point 24 (index 23) down to 1 (index 0)
// and bear off below it; Bilgin moves the other way. Your home is indexes 0-5, his 18-23.

export type Side = 1 | -1;
export interface Board { pts: number[]; bar: Record<Side, number>; off: Record<Side, number> }
/** from: a point index, or 'bar'; to: a point index, or 'off' */
export interface Step { from: number | 'bar'; to: number | 'off'; die: number }

export function startBoard(): Board {
  const pts = new Array(24).fill(0);
  pts[23] = 2; pts[12] = 5; pts[7] = 3; pts[5] = 5;
  pts[0] = -2; pts[11] = -5; pts[16] = -3; pts[18] = -5;
  return { pts, bar: { 1: 0, [-1]: 0 }, off: { 1: 0, [-1]: 0 } };
}

export const clone = (b: Board): Board => ({ pts: b.pts.slice(), bar: { ...b.bar }, off: { ...b.off } });

/** a point index in this side's own frame (its home is 0-5, it moves downwards) */
const own = (i: number, s: Side) => (s === 1 ? i : 23 - i);
const abs = own; // the mapping is its own inverse

function allHome(b: Board, s: Side) {
  if (b.bar[s]) return false;
  for (let i = 0; i < 24; i++) if (b.pts[i] * s > 0 && own(i, s) > 5) return false;
  return true;
}

/** the single steps this side could make with one die */
export function stepsFor(b: Board, s: Side, die: number): Step[] {
  const out: Step[] = [];
  const open = (i: number) => b.pts[i] * s >= -1;
  if (b.bar[s]) {
    const to = abs(24 - die, s);
    if (open(to)) out.push({ from: 'bar', to, die });
    return out;
  }
  const home = allHome(b, s);
  for (let i = 0; i < 24; i++) {
    if (b.pts[i] * s <= 0) continue;
    const k = own(i, s), t = k - die;
    if (t >= 0) { const to = abs(t, s); if (open(to)) out.push({ from: i, to, die }); }
    else if (home) {
      // bearing off: exactly, or with a bigger die when nothing stands further back
      let further = false;
      for (let j = k + 1; j <= 5; j++) if (b.pts[abs(j, s)] * s > 0) { further = true; break; }
      if (t === -1 || !further) out.push({ from: i, to: 'off', die });
    }
  }
  return out;
}

export function apply(b: Board, s: Side, st: Step): Board {
  const n = clone(b);
  if (st.from === 'bar') n.bar[s]--; else n.pts[st.from] -= s;
  if (st.to === 'off') n.off[s]++;
  else {
    if (n.pts[st.to] === -s) { n.pts[st.to] = 0; n.bar[(-s) as Side]++; } // a blot is hit
    n.pts[st.to] += s;
  }
  return n;
}

/**
 * Every legal way to play this roll: as many dice as can be used must be used, and if only one of two
 * can be, the bigger one where possible. Each is the steps in order and the board after.
 */
export function plays(b: Board, s: Side, dice: [number, number]): { steps: Step[]; board: Board }[] {
  const seqs: { steps: Step[]; board: Board }[] = [];
  const rec = (bd: Board, left: number[], steps: Step[]) => {
    let moved = false;
    const tried = new Set<number>();
    for (let k = 0; k < left.length; k++) {
      const die = left[k];
      if (tried.has(die)) continue;
      tried.add(die);
      for (const st of stepsFor(bd, s, die)) {
        moved = true;
        rec(apply(bd, s, st), [...left.slice(0, k), ...left.slice(k + 1)], [...steps, st]);
      }
    }
    if (!moved) seqs.push({ steps, board: bd });
  };
  rec(b, dice[0] === dice[1] ? [dice[0], dice[0], dice[0], dice[0]] : [dice[0], dice[1]], []);
  const most = Math.max(0, ...seqs.map((q) => q.steps.length));
  let ok = seqs.filter((q) => q.steps.length === most);
  if (most === 1 && dice[0] !== dice[1]) {
    const big = Math.max(...dice);
    if (ok.some((q) => q.steps[0].die === big)) ok = ok.filter((q) => q.steps[0].die === big);
  }
  return ok;
}

export const sameStep = (a: Step, b: Step) => a.from === b.from && a.to === b.to && a.die === b.die;

/** how far this side still has to go (lower is better) */
export function pips(b: Board, s: Side) {
  let n = b.bar[s] * 25;
  for (let i = 0; i < 24; i++) if (b.pts[i] * s > 0) n += (own(i, s) + 1) * b.pts[i] * s;
  return n;
}

/** how good this board is for side s */
export function judge(b: Board, s: Side): number {
  const o = (-s) as Side;
  let v = (pips(b, o) - pips(b, s)) * 1.0 + (b.off[s] - b.off[o]) * 8 + b.bar[o] * 14 - b.bar[s] * 14;
  // the furthest-back enemy checker: blots in front of it can be hit
  let enemyBack = -1;
  for (let i = 0; i < 24; i++) if (b.pts[i] * o > 0) enemyBack = Math.max(enemyBack, own(i, o));
  if (b.bar[o]) enemyBack = 24;
  for (let i = 0; i < 24; i++) {
    const c = b.pts[i] * s;
    const k = own(i, s);
    if (c >= 2) v += k <= 5 ? 6 : k <= 9 ? 3 : 1.5; // made points, the home board most
    if (c === 1) {
      const enemyK = 23 - k; // where the blot is in the enemy's frame
      if (enemyK < enemyBack) v -= 5 + (k <= 5 ? 2 : 0) + Math.max(0, 12 - Math.abs(enemyBack - enemyK)) * 0.6;
    }
  }
  return v;
}

/** Bilgin's choice of play for this roll */
export function choosePlay(b: Board, s: Side, dice: [number, number], care = 1, rnd = Math.random) {
  const all = plays(b, s, dice);
  if (!all.length || !all[0].steps.length) return null;
  let best = all[0], bv = -Infinity;
  for (const p of all) {
    const v = judge(p.board, s) + (rnd() - 0.5) * 6 / care;
    if (v > bv) { bv = v; best = p; }
  }
  return best;
}

/** who has won, and is it a mars (gammon: the loser bore nothing off) */
export function winner(b: Board): { side: Side; mars: boolean } | null {
  if (b.off[1] === 15) return { side: 1, mars: b.off[-1] === 0 };
  if (b.off[-1] === 15) return { side: -1, mars: b.off[1] === 0 };
  return null;
}
