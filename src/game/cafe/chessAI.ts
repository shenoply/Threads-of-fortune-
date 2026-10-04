// Bilgin's chess: the rules are chess.js; his play is a small alpha-beta search over material and
// piece placement. Three strengths: how many half-moves he looks ahead, and how much he wavers.
import { Chess } from 'chess.js';

const VAL: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
// piece-square tables from white's side (row 0 = rank 8)
const PST: Record<string, number[]> = {
  p: [0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5, 0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0],
  n: [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30, -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30, -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50],
  b: [-20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,10,10,5,0,-10, -10,5,5,10,10,5,5,-10, -10,0,10,10,10,10,0,-10, -10,10,10,10,10,10,10,-10, -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20],
  r: [0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0],
  q: [-20,-10,-10,-5,-5,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,5,5,5,0,-10, -5,0,5,5,5,5,0,-5, 0,0,5,5,5,5,0,-5, -10,5,5,5,5,5,0,-10, -10,0,5,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20],
  k: [-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10, 20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20],
};

/** the position from white's side, in centipawns */
export function evaluate(c: Chess): number {
  let s = 0;
  const b = c.board();
  for (let r = 0; r < 8; r++)
    for (let f = 0; f < 8; f++) {
      const p = b[r][f];
      if (!p) continue;
      const i = p.color === 'w' ? r * 8 + f : (7 - r) * 8 + f;
      const v = VAL[p.type] + PST[p.type][i];
      s += p.color === 'w' ? v : -v;
    }
  return s;
}

const MATE = 100000;

function order(moves: string[]) {
  // captures, promotions and checks first: the search cuts off sooner
  const score = (m: string) => (m.includes('x') ? 3 : 0) + (m.includes('=') ? 4 : 0) + (m.includes('+') ? 1 : 0);
  return moves.sort((a, b) => score(b) - score(a));
}

function search(c: Chess, depth: number, alpha: number, beta: number, ply: number): number {
  // negamax: the score from the side to move
  if (c.isCheckmate()) return -MATE + ply;
  if (c.isDraw()) return 0;
  if (depth === 0) return (c.turn() === 'w' ? 1 : -1) * evaluate(c);
  for (const m of order(c.moves())) {
    c.move(m);
    const v = -search(c, depth - 1, -beta, -alpha, ply + 1);
    c.undo();
    if (v >= beta) return beta;
    if (v > alpha) alpha = v;
  }
  return alpha;
}

export type Strength = 'easy' | 'fair' | 'sharp';
const DEPTH: Record<Strength, number> = { easy: 1, fair: 2, sharp: 3 };
const WAVER: Record<Strength, number> = { easy: 120, fair: 35, sharp: 8 };

/** Bilgin's move (SAN) in this position */
export function bestMove(fen: string, strength: Strength, rnd = Math.random): string | null {
  const c = new Chess(fen);
  const moves = order(c.moves());
  if (!moves.length) return null;
  const depth = DEPTH[strength];
  const scored: { m: string; v: number }[] = [];
  let top = -MATE - 1;
  for (const m of moves) {
    c.move(m);
    // a move more than his wavering worse than the best so far can never be picked: no need to know by how much
    const floor = Math.max(-MATE - 1, top - WAVER[strength]);
    const v = -search(c, depth - 1, -MATE - 1, -floor, 1);
    c.undo();
    if (v > top) top = v;
    // a little human wavering: he does not always find the very best
    scored.push({ m, v: v + (rnd() - 0.5) * WAVER[strength] });
  }
  scored.sort((a, b) => b.v - a.v);
  return scored[0].m;
}
