// Bilgin's table in the Giza coffee house: a game of chess or tawla, for nothing or for a few piastres.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess, type Square } from 'chess.js';
import { useGame } from '../../game/state/store';
import { audio } from '../../game/audio/engine';
import { fmt } from '../../game/economy/money';
import { bestMove, type Strength } from '../../game/cafe/chessAI';
import { startBoard, plays, apply, choosePlay, winner, sameStep, pips, type Board, type Side, type Step } from '../../game/cafe/tawla';
import './cafe.css';

type Game = 'chess' | 'tawla';
const STAKES = [0, 5, 20, 50];
const MINUTES: Record<Game, number> = { chess: 45, tawla: 30 };
const tap = () => audio.sfx('tap');

export function CafeTable({ onClose }: { onClose: (note?: string) => void }) {
  const cash = useGame((g) => g.cash);
  const cafeGame = useGame((g) => g.cafeGame);
  const [game, setGame] = useState<Game | null>(null);
  const [stake, setStake] = useState(0);
  const [strength, setStrength] = useState<Strength>('fair');

  const finish = (result: 'win' | 'loss' | 'draw', mult = 1) => {
    const note = cafeGame(game!, result, stake * mult, MINUTES[game!]);
    onClose(note);
  };

  if (game === 'chess') return <ChessTable strength={strength} stake={stake} onEnd={finish} onQuit={() => onClose()} />;
  if (game === 'tawla') return <TawlaTable strength={strength} stake={stake} onEnd={finish} onQuit={() => onClose()} />;

  return (
    <div className="overlay cafe-overlay pick" data-testid="cafe-table" style={{ ['--cafe-bg' as string]: 'url(art/cafe/bilgin-chess.webp)' }}>
      <div className="overlay-head"><h2>Bilgin's table</h2><span className="sub">the back of the coffee house</span><button className="btn small close" onClick={() => onClose()}>✕</button></div>
      <div className="cafe-pick">
        <p className="cafe-say">"Sit, sit. The boy will bring tea. What will it be: the board of kings, or the dice?"</p>
        <div className="cafe-row">
          <span>Stake</span>
          {STAKES.map((v) => (
            <button key={v} className={`btn small${stake === v ? ' on' : ''}`} disabled={v > cash} onClick={() => { tap(); setStake(v); }} data-testid={`cafe-stake-${v}`}>{v ? fmt(v) : 'For tea'}</button>
          ))}
        </div>
        <div className="cafe-row">
          <span>Bilgin plays</span>
          {(['easy', 'fair', 'sharp'] as Strength[]).map((v) => (
            <button key={v} className={`btn small${strength === v ? ' on' : ''}`} onClick={() => { tap(); setStrength(v); }}>{v === 'easy' ? 'gently' : v === 'fair' ? 'properly' : 'to win'}</button>
          ))}
        </div>
        <div className="cafe-games">
          <button className="btn cafe-game" onClick={() => { tap(); setGame('chess'); }} data-testid="cafe-chess"><b>♞</b>Chess<small>about {MINUTES.chess} minutes</small></button>
          <button className="btn cafe-game" onClick={() => { tap(); setGame('tawla'); }} data-testid="cafe-tawla"><b>⚅</b>Tawla<small>about {MINUTES.tawla} minutes · a mars pays double</small></button>
        </div>
      </div>
    </div>
  );
}

interface TableProps { strength: Strength; stake: number; onEnd: (r: 'win' | 'loss' | 'draw', mult?: number) => void; onQuit: () => void }

function Head({ title, stake, onQuit, status }: { title: string; stake: number; onQuit: () => void; status: string }) {
  return (
    <div className="overlay-head">
      <h2>{title}</h2><span className="sub">{stake ? `for ${fmt(stake)}` : 'for tea'} · {status}</span>
      <button className="btn small close" onClick={onQuit} data-testid="cafe-quit" title={stake ? 'Leaving a game you have started gives up the stake' : 'Leave'}>✕</button>
    </div>
  );
}

function EndCard({ text, onDone }: { text: string; onDone: () => void }) {
  return (
    <div className="cafe-end" data-testid="cafe-end">
      <p>{text}</p>
      <button className="btn" onClick={onDone} data-testid="cafe-done">Get up from the table</button>
    </div>
  );
}

// ─── chess ───────────────────────────────────────────────────────────────────

const GLYPH: Record<string, string> = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const FILES = 'abcdefgh';

function ChessTable({ strength, stake, onEnd, onQuit }: TableProps) {
  const chess = useRef(new Chess());
  const [, bump] = useState(0);
  const [sel, setSel] = useState<Square | null>(null);
  const [last, setLast] = useState<{ from: string; to: string } | null>(null);
  const [thinking, setThinking] = useState(false);
  const [resign, setResign] = useState(false);
  const c = chess.current;
  const over = c.isGameOver() || resign;

  const result = (): ['win' | 'loss' | 'draw', string] => {
    if (resign) return ['loss', 'You tip your king over. Bilgin nods, gracious: "Another day, my friend."'];
    if (c.isCheckmate()) return c.turn() === 'b' ? ['win', 'Checkmate. Bilgin stares at the board, then laughs and slaps the table. "Well played! Again tomorrow."'] : ['loss', 'Checkmate. "The king must always have a door," says Bilgin, sweeping up the pieces.'];
    return ['draw', c.isStalemate() ? 'Stalemate. Bilgin shrugs: "Nobody wins, nobody pays. Like the government."' : 'A draw. You shake hands over the board.'];
  };

  useEffect(() => {
    if (c.turn() !== 'b' || c.isGameOver()) return;
    setThinking(true);
    const t = setTimeout(() => {
      const m = bestMove(c.fen(), strength);
      if (m) { const mv = c.move(m); setLast({ from: mv.from, to: mv.to }); audio.sfx(mv.captured ? 'coin' : 'tap'); }
      setThinking(false);
      bump((n) => n + 1);
    }, 450);
    return () => clearTimeout(t);
  });

  const targets = useMemo(() => (sel ? c.moves({ square: sel, verbose: true }).map((m) => m.to) : []), [sel, c, last]);

  const tapSq = (sq: Square) => {
    if (over || thinking || c.turn() !== 'w') return;
    const p = c.get(sq);
    if (sel && targets.includes(sq)) {
      const mv = c.move({ from: sel, to: sq, promotion: 'q' });
      setLast({ from: mv.from, to: mv.to });
      audio.sfx(mv.captured ? 'coin' : 'tap');
      setSel(null);
      bump((n) => n + 1);
      return;
    }
    setSel(p && p.color === 'w' && sel !== sq ? sq : null);
  };

  const board = c.board();
  const checkSq = c.inCheck() ? (() => { for (const row of board) for (const p of row) if (p && p.type === 'k' && p.color === c.turn()) return p.square; return null; })() : null;
  const status = over ? 'finished' : thinking ? 'Bilgin is thinking…' : c.inCheck() ? 'check!' : 'your move (white)';
  const [res, text]: ['win' | 'loss' | 'draw', string] = over ? result() : ['draw', ''];

  return (
    <div className="overlay cafe-overlay" data-testid="cafe-chess-board">
      <Head title="Chess with Bilgin" stake={stake} onQuit={() => (stake && c.history().length && !over ? onEnd('loss') : onQuit())} status={status} />
      <div className="cafe-body">
        <div className="chess-board">
          {board.map((row, r) => row.map((p, f) => {
            const sq = `${FILES[f]}${8 - r}` as Square;
            const cls = ['sq', (r + f) % 2 ? 'dark' : 'light', sel === sq && 'sel', targets.includes(sq) && (p ? 'cap' : 'dot'), last && (last.from === sq || last.to === sq) && 'last', checkSq === sq && 'check'].filter(Boolean).join(' ');
            return (
              <button key={sq} className={cls} onClick={() => tapSq(sq)} data-sq={sq} aria-label={sq}>
                {p && <span className={`pc ${p.color}`}>{GLYPH[p.type]}{'︎'}</span>}
                {f === 0 && <i className="rk">{8 - r}</i>}
                {r === 7 && <i className="fl">{FILES[f]}</i>}
              </button>
            );
          }))}
        </div>
        {!over && <div className="cafe-actions"><button className="btn small" onClick={() => setResign(true)} disabled={thinking} data-testid="cafe-resign">Resign</button></div>}
        {over && <EndCard text={text} onDone={() => onEnd(res)} />}
      </div>
    </div>
  );
}

// ─── tawla ───────────────────────────────────────────────────────────────────

const roll = (): [number, number] => [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
const PIPS = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

function TawlaTable({ strength, stake, onEnd, onQuit }: TableProps) {
  const [board, setBoard] = useState<Board>(startBoard);
  const [turn, setTurn] = useState<Side>(1);
  const [dice, setDice] = useState<[number, number] | null>(null);
  const [used, setUsed] = useState<number[]>([]); // dice already played this turn (values)
  const [seqs, setSeqs] = useState<{ steps: Step[]; board: Board }[]>([]);
  const [sel, setSel] = useState<number | 'bar' | null>(null);
  const [say, setSay] = useState('Roll for who starts.');
  const [opening, setOpening] = useState(true);
  const care = strength === 'easy' ? 0.15 : strength === 'fair' ? 0.6 : 3;
  const won = winner(board);

  // the opening roll: one die each, the higher plays both
  const openRoll = () => {
    let a: number, b: number;
    do { a = 1 + Math.floor(Math.random() * 6); b = 1 + Math.floor(Math.random() * 6); } while (a === b);
    audio.sfx('tap');
    setOpening(false);
    if (a > b) { setSay(`You throw ${a}, Bilgin ${b}. You start with ${a}-${b}.`); begin(1, [a, b], board); }
    else { setSay(`You throw ${a}, Bilgin ${b}. Bilgin starts.`); setTurn(-1); setDice([b, a]); }
  };

  const begin = (side: Side, d: [number, number], bd: Board) => {
    setTurn(side); setDice(d); setUsed([]); setSel(null);
    if (side === 1) {
      const all = plays(bd, 1, d);
      if (!all.length || !all[0].steps.length) { setSay(`${d[0]}-${d[1]}: you cannot move.`); setSeqs([]); setTimeout(() => begin(-1, roll(), bd), 1300); return; }
      setSeqs(all);
    }
  };

  // Bilgin's turn
  useEffect(() => {
    if (opening || turn !== -1 || !dice || won) return;
    const t = setTimeout(() => {
      const p = choosePlay(board, -1, dice, care);
      const nb = p ? p.board : board;
      const hit = p && nb.bar[1] > board.bar[1];
      setSay(p ? `Bilgin throws ${dice[0]}-${dice[1]}${hit ? ' and hits you. "Yalla, to the bar!"' : '.'}` : `Bilgin throws ${dice[0]}-${dice[1]} and cannot move.`);
      audio.sfx('tap');
      setBoard(nb);
      if (!winner(nb)) setTimeout(() => begin(1, roll(), nb), 300);
    }, 900);
    return () => clearTimeout(t);
  }, [turn, dice, opening]); // eslint-disable-line react-hooks/exhaustive-deps

  const nextSteps = seqs.map((q) => q.steps[0]).filter(Boolean);
  const fromOk = (f: number | 'bar') => nextSteps.some((s) => s.from === f);
  const dests = sel === null ? [] : nextSteps.filter((s) => s.from === sel);

  const play = (st: Step) => {
    const nb = apply(board, 1, st);
    const rest = seqs.filter((q) => sameStep(q.steps[0], st)).map((q) => ({ steps: q.steps.slice(1), board: q.board }));
    audio.sfx(nb.bar[-1] > board.bar[-1] ? 'coin' : 'tap');
    setBoard(nb); setUsed((u) => [...u, st.die]); setSel(null);
    if (winner(nb)) { setSeqs([]); return; }
    if (!rest.length || !rest[0].steps.length) { setSeqs([]); setTimeout(() => begin(-1, roll(), nb), 500); }
    else setSeqs(rest);
  };

  const tapPoint = (i: number | 'bar' | 'off') => {
    if (turn !== 1 || won) return;
    const d = dests.find((s) => s.to === i);
    if (d) { play(d); return; }
    if (i === 'off') return;
    if (fromOk(i)) {
      // one place to go: go there
      const only = nextSteps.filter((s) => s.from === i);
      const uniq = [...new Set(only.map((s) => s.to))];
      if (uniq.length === 1 && sel === i) { play(only[0]); return; }
      setSel(sel === i ? null : i);
    } else setSel(null);
  };

  const diceLeft = dice ? (dice[0] === dice[1] ? [dice[0], dice[0], dice[0], dice[0]] : [...dice]) : [];
  for (const u of used) { const k = diceLeft.indexOf(u); if (k >= 0) diceLeft.splice(k, 1); }

  const Point = ({ i, top }: { i: number; top: boolean }) => {
    const n = board.pts[i];
    const cnt = Math.abs(n);
    const isDest = dests.some((s) => s.to === i);
    return (
      <button className={`tw-pt ${top ? 'top' : 'bot'} ${i % 2 ? 'odd' : 'even'}${sel === i ? ' sel' : ''}${isDest ? ' dest' : ''}${turn === 1 && fromOk(i) ? ' can' : ''}`} onClick={() => tapPoint(i)} data-pt={i + 1}>
        <span className="tri" />
        <span className="stack">
          {Array.from({ length: Math.min(cnt, 5) }, (_, k) => <span key={k} className={`ck ${n > 0 ? 'you' : 'him'}`}>{k === 4 && cnt > 5 ? cnt : ''}</span>)}
        </span>
        <i className="num">{i + 1}</i>
      </button>
    );
  };
  const Bar = ({ side }: { side: Side }) => (
    <button className={`tw-bar${side === 1 && sel === 'bar' ? ' sel' : ''}${side === 1 && turn === 1 && fromOk('bar') ? ' can' : ''}`} onClick={() => side === 1 && tapPoint('bar')} data-testid={side === 1 ? 'tw-bar-you' : undefined}>
      {Array.from({ length: board.bar[side] }, (_, k) => <span key={k} className={`ck ${side === 1 ? 'you' : 'him'}`} />)}
    </button>
  );

  const offDest = dests.some((s) => s.to === 'off');
  const status = won ? 'finished' : opening ? 'opening roll' : turn === 1 ? 'your move' : 'Bilgin plays…';
  const endText = won ? (won.side === 1
    ? (won.mars ? 'Mars! Every one of yours is off before Bilgin bore off a single checker. He pays double, groaning.' : 'All fifteen home and off. Bilgin pushes the board away: "The dice love you today."')
    : (won.mars ? 'Mars. Bilgin bore everything off before you got one home. That costs double.' : 'Bilgin bears off his last checker and claps. "Tawla is mathematics, my friend. And luck. Mostly luck."')) : '';

  return (
    <div className="overlay cafe-overlay" data-testid="cafe-tawla-board">
      <Head title="Tawla with Bilgin" stake={stake} onQuit={() => (stake && !opening && !won ? onEnd('loss') : onQuit())} status={status} />
      <div className="cafe-body">
        <div className="tw-info"><span>Bilgin · {15 - board.off[-1]} left · {pips(board, -1)} pips</span></div>
        <div className="tw-board">
          <div className="tw-row">
            {[12, 13, 14, 15, 16, 17].map((i) => <Point key={i} i={i} top />)}
            <Bar side={-1} />
            {[18, 19, 20, 21, 22, 23].map((i) => <Point key={i} i={i} top />)}
          </div>
          <div className="tw-mid">
            {dice && !opening && <span className="tw-dice" data-testid="tw-dice">{(turn === 1 ? diceLeft : dice).map((d, k) => <b key={k}>{PIPS[d]}</b>)}</span>}
          </div>
          <div className="tw-row">
            {[11, 10, 9, 8, 7, 6].map((i) => <Point key={i} i={i} top={false} />)}
            <Bar side={1} />
            {[5, 4, 3, 2, 1, 0].map((i) => <Point key={i} i={i} top={false} />)}
          </div>
        </div>
        <div className="tw-info">
          <span>You · {15 - board.off[1]} left · {pips(board, 1)} pips</span>
          <button className={`btn small tw-off${offDest ? ' dest' : ''}`} disabled={!offDest} onClick={() => tapPoint('off')} data-testid="tw-off">Bear off ({board.off[1]})</button>
        </div>
        <p className="cafe-say" data-testid="tw-say">{say}{turn === 1 && !won && !opening && seqs.length > 0 ? (sel === null ? ' Tap a checker.' : ' Tap where it goes.') : ''}</p>
        {opening && <div className="cafe-actions"><button className="btn" onClick={openRoll} data-testid="tw-open">Throw a die</button></div>}
        {won && <EndCard text={endText} onDone={() => onEnd(won.side === 1 ? 'win' : 'loss', won.mars ? 2 : 1)} />}
      </div>
    </div>
  );
}
