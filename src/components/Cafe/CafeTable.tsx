// Bilgin's table in the Giza coffee house: a game of chess or tawla, for nothing or for a few piastres.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess, type Square } from 'chess.js';
import { useGame } from '../../game/state/store';
import { audio, DEFAULT_VOLUMES, type Volumes } from '../../game/audio/engine';
import { fmt } from '../../game/economy/money';
import { bestMove, type Strength } from '../../game/cafe/chessAI';
import { startBoard, plays, apply, choosePlay, winner, sameStep, pips, type Board, type Side, type Step } from '../../game/cafe/tawla';
import './cafe.css';

type Game = 'chess' | 'tawla';
const STAKES = [0, 5, 20, 50];
const MINUTES: Record<Game, number> = { chess: 45, tawla: 30 };
const tap = () => audio.sfx('tap');
const TABLE_BG = { ['--table-bg' as string]: 'url(art/cafe/cafe-birdseye-v2.webp)' } as React.CSSProperties;

export function CafeTable({ onClose, onFilm, only }: { onClose: (note?: string) => void; onFilm?: () => void; only?: Game }) {
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
    <div className="overlay cafe-overlay pick" data-testid="cafe-table" style={{ ['--cafe-bg' as string]: 'url(art/cafe/cafe-birdseye-v2.webp)' }}>
      <div className="overlay-head"><h2>Bilgin's table</h2><span className="sub">the back of the coffee house</span><button className="btn small close" onClick={() => onClose()} data-testid="cafe-close">✕</button></div>
      <div className="cafe-pick">
        {onFilm && <button className="btn small cafe-film" onClick={onFilm} data-testid="bilgin-chess-film-again">▶ Bilgin's chess story</button>}
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
        <div className={`cafe-games${only ? ' one' : ''}`}>
          {only !== 'tawla' && <button className="btn cafe-game" onClick={() => { tap(); setGame('chess'); }} data-testid="cafe-chess"><b>♞</b>Chess<small>about {MINUTES.chess} minutes</small></button>}
          {only !== 'chess' && <button className="btn cafe-game" onClick={() => { tap(); setGame('tawla'); }} data-testid="cafe-tawla"><b>⚅</b>Tawla<small>about {MINUTES.tawla} minutes · a mars pays double</small></button>}
        </div>
      </div>
    </div>
  );
}

interface TableProps { strength: Strength; stake: number; onEnd: (r: 'win' | 'loss' | 'draw', mult?: number) => void; onQuit: () => void }

interface Seat { label: string; main: React.ReactNode; sub?: string }

/** the sound at the table: the same sliders as Settings, a tap away from the right-hand corner */
function SoundPanel({ onClose }: { onClose: () => void }) {
  const vols = useGame((g) => g.volumes ?? DEFAULT_VOLUMES);
  const setVolume = useGame((g) => g.setVolume);
  return (
    <div className="cafe-sound" role="dialog" aria-label="Sound" data-testid="cafe-sound-panel">
      <div className="cafe-sound__head"><b>Sound</b><button className="btn small" onClick={onClose} aria-label="Close sound">✕</button></div>
      {([['master', 'Master'], ['music', 'Music'], ['sfx', 'Effects'], ['dialogue', 'Voices']] as [keyof Volumes, string][]).map(([k, l]) => (
        <label className="vol-row" key={k}>
          <span>{l}</span>
          <input type="range" min={0} max={100} step={5} value={Math.round(vols[k] * 100)} onChange={(e) => setVolume(k, Number(e.target.value) / 100)} aria-label={`${l} volume`} data-testid={`cafe-vol-${k}`} />
          <b>{Math.round(vols[k] * 100)}</b>
        </label>
      ))}
    </div>
  );
}

/** the top of a game: title and stake, sound and leave on the right, then a clear scoreboard */
function Head({ title, stake, onQuit, you, him, turn }: { title: string; stake: number; onQuit: () => void; you: Seat; him: Seat; turn: 'you' | 'him' | null }) {
  const [sound, setSound] = useState(false);
  return (
    <div className="cafe-head">
      <div className="cafe-head__top">
        <h2>{title}</h2>
        <span className="cafe-head__stake">{stake ? `for ${fmt(stake)}` : 'for tea'}</span>
        <button className="btn small cafe-head__btn" onClick={() => setSound((v) => !v)} aria-label="Sound" aria-pressed={sound} data-testid="cafe-sound">🔊</button>
        <button className="btn small cafe-head__btn" onClick={onQuit} data-testid="cafe-quit" aria-label="Leave the table" title={stake ? 'Leaving a game you have started gives up the stake' : 'Leave'}>✕</button>
      </div>
      <div className="cafe-scores" data-testid="cafe-score">
        {[['you', you], ['him', him]].map(([k, sd]) => {
          const x = sd as Seat;
          return (
            <div key={k as string} className={`cafe-side ${k}${turn === k ? ' on' : ''}`}>
              <span className="cafe-side__who">{x.label}{turn === k && <i> · to play</i>}</span>
              <b className="cafe-side__main">{x.main}</b>
              {x.sub && <small className="cafe-side__sub">{x.sub}</small>}
            </div>
          );
        })}
      </div>
      {sound && <SoundPanel onClose={() => setSound(false)} />}
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
const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** material on the board, as a plain-English score line that never needs scrolling to see */
function materialScore(c: Chess): string {
  let w = 0, b = 0;
  for (const row of c.board()) for (const p of row) if (p) (p.color === 'w' ? (w += VALUE[p.type]) : (b += VALUE[p.type]));
  const d = w - b;
  return d === 0 ? 'material even' : d > 0 ? `you're up ${d}` : `Bilgin's up ${-d}`;
}

const START: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };
/** the pieces each side has taken, as glyphs, and the material balance */
function taken(c: Chess) {
  const left: Record<'w' | 'b', Record<string, number>> = { w: {}, b: {} };
  for (const row of c.board()) for (const p of row) if (p) left[p.color][p.type] = (left[p.color][p.type] ?? 0) + 1;
  const lost = (col: 'w' | 'b') => (['q', 'r', 'b', 'n', 'p'] as const).flatMap((t) => Array(Math.max(0, START[t] - (left[col][t] ?? 0))).fill(GLYPH[t])).join('');
  return { byYou: lost('b'), byHim: lost('w') };
}

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
      if (m) { const mv = c.move(m); setLast({ from: mv.from, to: mv.to }); audio.sfx(mv.captured ? 'coin' : 'piece'); }
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
      audio.sfx(mv.captured ? 'coin' : 'piece');
      setSel(null);
      bump((n) => n + 1);
      return;
    }
    setSel(p && p.color === 'w' && sel !== sq ? sq : null);
  };

  const board = c.board();
  const checkSq = c.inCheck() ? (() => { for (const row of board) for (const p of row) if (p && p.type === 'k' && p.color === c.turn()) return p.square; return null; })() : null;
  const status = over ? 'Finished.' : thinking ? 'Bilgin is thinking…' : c.inCheck() ? 'Check! Get your king out of danger.' : sel ? 'Tap where it goes.' : 'Your move: tap a white piece.';
  const [res, text]: ['win' | 'loss' | 'draw', string] = over ? result() : ['draw', ''];
  const cap = taken(c);

  return (
    <div className="overlay cafe-overlay at-chess" data-testid="cafe-chess-board" style={TABLE_BG}>
      <Head title="Chess with Bilgin" stake={stake} onQuit={() => (stake && c.history().length && !over ? onEnd('loss') : onQuit())}
        turn={over ? null : c.turn() === 'w' ? 'you' : 'him'}
        you={{ label: 'You · white', main: cap.byYou || '–', sub: c.history().length ? materialScore(c) : 'pieces you have taken' }}
        him={{ label: 'Bilgin · black', main: cap.byHim || '–', sub: thinking ? 'thinking…' : 'pieces he has taken' }} />
      <div className="cafe-body chess-body">
        <img className="table-blur" src="art/cafe/chess-table.webp" alt="" aria-hidden="true" />
        <div className="chess-table">
        <img className="chess-table__img" src="art/cafe/chess-table.webp" alt="" aria-hidden="true" draggable={false} />
        <div className="chess-board at-table">
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
        </div>
        {!over && <div className="cafe-actions"><p className="cafe-say" data-testid="chess-say">{status}</p><button className="btn small" onClick={() => setResign(true)} disabled={thinking} data-testid="cafe-resign">Resign</button></div>}
        {over && <EndCard text={text} onDone={() => onEnd(res)} />}
      </div>
    </div>
  );
}

// ─── tawla ───────────────────────────────────────────────────────────────────

const roll = (): [number, number] => [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
// a real ivory die: the pips sit on a 3 x 3 grid
const FACE: Record<number, number[]> = { 1: [4], 2: [2, 6], 3: [2, 4, 6], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const rnd = (seed: number) => { const x = Math.sin(seed * 9301 + 49297) * 233280; return x - Math.floor(x); };

/** thrown from the roller's side of the board: it tumbles (faces flicking), bounces and settles a little askew */
function Die({ n, seed, k, from, used }: { n: number; seed: number; k: number; from: 1 | -1; used: boolean }) {
  const [face, setFace] = useState(() => 1 + Math.floor(rnd(seed) * 6));
  useEffect(() => {
    if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) { setFace(n); return; }
    let i = 0;
    const t = window.setInterval(() => { i++; if (i >= 7) { setFace(n); window.clearInterval(t); } else setFace(1 + Math.floor(Math.random() * 6)); }, 75);
    return () => window.clearInterval(t);
  }, [n]);
  const style = {
    ['--r' as string]: `${Math.round((rnd(seed + 1) - 0.5) * 40)}deg`,
    ['--fx' as string]: `${Math.round((rnd(seed + 2) - 0.5) * 120)}%`,
    ['--fy' as string]: `${from === 1 ? 320 : -320}%`,
    ['--dy' as string]: `${Math.round((rnd(seed + 3) - 0.5) * 18)}%`,
    animationDelay: `${k * 70}ms`,
  } as React.CSSProperties;
  return (
    <span className={`die${used ? ' used' : ''}`} style={style} data-die={n} aria-label={`${n}`}>
      {Array.from({ length: 9 }, (_, i) => <i key={i} className={FACE[face].includes(i) ? 'pip' : ''} />)}
    </span>
  );
}

function TawlaTable({ strength, stake, onEnd, onQuit }: TableProps) {
  const [board, setBoard] = useState<Board>(startBoard);
  const [turn, setTurn] = useState<Side>(1);
  const [dice, setDice] = useState<[number, number] | null>(null);
  const [rollId, setRollId] = useState(0); // bumped on every throw, so the throw animation replays even on a repeat roll
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
    audio.sfx('dice');
    setOpening(false);
    if (a > b) { setSay(`You throw ${a}, Bilgin ${b}. You start with ${a}-${b}.`); begin(1, [a, b], board); }
    else { setSay(`You throw ${a}, Bilgin ${b}. Bilgin starts.`); setTurn(-1); setDice([b, a]); setRollId((n) => n + 1); }
  };

  const begin = (side: Side, d: [number, number], bd: Board) => {
    setTurn(side); setDice(d); setRollId((n) => n + 1); setUsed([]); setSel(null);
    if (side === 1) {
      const all = plays(bd, 1, d);
      if (!all.length || !all[0].steps.length) { setSay(`${d[0]}-${d[1]}: you cannot move.`); setSeqs([]); setTimeout(() => { audio.sfx('dice'); begin(-1, roll(), bd); }, 1300); return; }
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
      audio.sfx(p ? (hit ? 'coin' : 'piece') : 'tap');
      setBoard(nb);
      if (!winner(nb)) setTimeout(() => { audio.sfx('dice'); begin(1, roll(), nb); }, 300);
    }, 900);
    return () => clearTimeout(t);
  }, [turn, dice, opening]); // eslint-disable-line react-hooks/exhaustive-deps

  const nextSteps = seqs.map((q) => q.steps[0]).filter(Boolean);
  const fromOk = (f: number | 'bar') => nextSteps.some((s) => s.from === f);
  const dests = sel === null ? [] : nextSteps.filter((s) => s.from === sel);

  const play = (st: Step) => {
    const nb = apply(board, 1, st);
    const rest = seqs.filter((q) => sameStep(q.steps[0], st)).map((q) => ({ steps: q.steps.slice(1), board: q.board }));
    audio.sfx(nb.bar[-1] > board.bar[-1] ? 'coin' : 'piece');
    setBoard(nb); setUsed((u) => [...u, st.die]); setSel(null);
    if (winner(nb)) { setSeqs([]); return; }
    if (!rest.length || !rest[0].steps.length) { setSeqs([]); setTimeout(() => { audio.sfx('dice'); begin(-1, roll(), nb); }, 500); }
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
  // every die thrown, the ones still to play first, the played ones after (dimmed)
  const allDice = dice ? [...diceLeft, ...(dice[0] === dice[1] ? [dice[0], dice[0], dice[0], dice[0]] : [...dice]).slice(diceLeft.length)] : [];
  const usedCount = allDice.length - diceLeft.length;

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
  const endText = won ? (won.side === 1
    ? (won.mars ? 'Mars! Every one of yours is off before Bilgin bore off a single checker. He pays double, groaning.' : 'All fifteen home and off. Bilgin pushes the board away: "The dice love you today."')
    : (won.mars ? 'Mars. Bilgin bore everything off before you got one home. That costs double.' : 'Bilgin bears off his last checker and claps. "Tawla is mathematics, my friend. And luck. Mostly luck."')) : '';

  return (
    <div className="overlay cafe-overlay at-tawla" data-testid="cafe-tawla-board" style={TABLE_BG}>
      <Head title="Tawla with Bilgin" stake={stake} onQuit={() => (stake && !opening && !won ? onEnd('loss') : onQuit())}
        turn={won || opening ? null : turn === 1 ? 'you' : 'him'}
        you={{ label: 'You · white', main: `${board.off[1]} / 15 off`, sub: `${pips(board, 1)} pips to go` }}
        him={{ label: 'Bilgin · dark', main: `${board.off[-1]} / 15 off`, sub: `${pips(board, -1)} pips to go` }} />
      <div className="cafe-body tawla-body">
        <img className="table-blur" src="art/cafe/tawla-table.webp" alt="" aria-hidden="true" />
        <div className="tawla-table">
        <img className="chess-table__img" src="art/cafe/tawla-table.webp" alt="" aria-hidden="true" draggable={false} />
        <div className="tw-board at-table">
          <div className="tw-row">
            {[12, 13, 14, 15, 16, 17].map((i) => <Point key={i} i={i} top />)}
            <Bar side={-1} />
            {[18, 19, 20, 21, 22, 23].map((i) => <Point key={i} i={i} top />)}
          </div>
          <div className="tw-mid">
            {dice && !opening && (
              <span className={`tw-dice ${turn === 1 ? 'mine' : 'his'}`} key={rollId} data-testid="tw-dice">
                {allDice.map((d, k) => <Die key={k} n={d} seed={rollId * 7 + k} k={k} from={turn === 1 ? 1 : -1} used={turn === 1 && k >= allDice.length - usedCount} />)}
              </span>
            )}
          </div>
          <div className="tw-row">
            {[11, 10, 9, 8, 7, 6].map((i) => <Point key={i} i={i} top={false} />)}
            <Bar side={1} />
            {[5, 4, 3, 2, 1, 0].map((i) => <Point key={i} i={i} top={false} />)}
          </div>
        </div>
        <div className="tw-info tw-info--you">
          <button className={`btn small tw-off${offDest ? ' dest' : ''}`} disabled={!offDest} onClick={() => tapPoint('off')} data-testid="tw-off">Bear off ({board.off[1]})</button>
        </div>
        </div>
        <p className="cafe-say" data-testid="tw-say">{say}{turn === 1 && !won && !opening && seqs.length > 0 ? (sel === null ? ' Tap a checker.' : ' Tap where it goes.') : ''}</p>
        {opening && <div className="cafe-actions"><button className="btn" onClick={openRoll} data-testid="tw-open">Throw a die</button></div>}
        {won && <EndCard text={endText} onDone={() => onEnd(won.side === 1 ? 'win' : 'loss', won.mars ? 2 : 1)} />}
      </div>
    </div>
  );
}
