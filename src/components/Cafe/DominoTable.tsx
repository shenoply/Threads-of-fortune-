// A hand of dominoes with a coffee-house regular (data/dominoRegulars.ts): the block game, double-six,
// seven tiles each. Sit down, pick a stake, play the hand on his table, get up. The rules are in
// game/cafe/dominoes.ts; what a win brings is in the store's dominoGame.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useGame } from '../../game/state/store';
import { audio } from '../../game/audio/engine';
import { fmt } from '../../game/economy/money';
import { REGULARS } from '../../data/dominoRegulars';
import { friendWord } from '../../game/cafe/regularTalk';
import { deal, legal, play, knock, chooseMove, handPips, handScore, rngFrom, seedOf, sameTile, ends, type Hand, type Laid, type Tile, type End } from '../../game/cafe/dominoes';
import { Head } from './TableHead';
import './cafe.css';
import './dominoes.css';

const STAKES = [0, 2, 5, 10];
const TABLE_BG = { ['--table-bg' as string]: 'url(art/cafe/cafe-birdseye-v2.webp)' } as React.CSSProperties;
const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// ─── drawing a tile ─────────────────────────────────────────────────────────
// pips on a 3 x 3 grid in each half, as on a die
const FACE: Record<number, number[]> = { 0: [], 1: [4], 2: [2, 6], 3: [2, 4, 6], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
function Pips({ n, x, y, s }: { n: number; x: number; y: number; s: number }) {
  return <>{FACE[n].map((k) => <circle key={k} cx={x + s * (0.25 + (k % 3) * 0.25)} cy={y + s * (0.25 + Math.floor(k / 3) * 0.25)} r={s * 0.085} className="dm-pip" />)}</>;
}
/** one tile at (x, y), w x h, a on the left (or top), b on the right (or bottom) */
function TileG({ a, b, x, y, v, cls }: { a: number; b: number; x: number; y: number; v?: boolean; cls?: string }) {
  const w = v ? 1 : 2, h = v ? 2 : 1;
  return (
    <g className={`dm-tile ${cls ?? ''}`}>
      <rect x={x + 0.05} y={y + 0.05} width={w - 0.1} height={h - 0.1} rx={0.12} className="dm-face" />
      {v ? <line x1={x + 0.14} x2={x + 0.86} y1={y + 1} y2={y + 1} className="dm-mid" /> : <line x1={x + 1} x2={x + 1} y1={y + 0.14} y2={y + 0.86} className="dm-mid" />}
      <circle cx={x + w / 2} cy={y + h / 2} r={0.05} className="dm-pin" />
      <Pips n={a} x={x} y={y} s={1} />
      <Pips n={b} x={v ? x : x + 1} y={v ? y + 1 : y} s={1} />
    </g>
  );
}

// ─── laying out the line: from the first tile, the right arm runs right and turns down, the left arm
// runs left and turns up, so the line snakes across the table and the tiles already down never move ──
// half the table's width, in tile halves: as many as fit at a comfortable size on this screen
const UNIT = 36;
const halfFor = (w: number) => Math.max(3.2, Math.min(3.6, w / (2 * UNIT) - 1.4));
interface Spot { x: number; y: number; v: boolean; a: number; b: number }
type Arm = { x: number; y: number; dir: 1 | -1 };
function stepArm(h: Arm, near: number, far: number, turn: 1 | -1, HALF: number): { spot: Spot; next: Arm } {
  // dir 1 heads right, -1 left; turn 1 turns down at the edge, -1 up
  if (h.dir === 1 && h.x + 2 > HALF || h.dir === -1 && h.x - 2 < -HALF) {
    const x = h.dir === 1 ? h.x : h.x - 1;
    const y = turn === 1 ? h.y - 0.5 : h.y - 1.5;
    const spot = turn === 1 ? { x, y, v: true, a: near, b: far } : { x, y, v: true, a: far, b: near };
    return { spot, next: { x: h.x, y: h.y + turn, dir: h.dir === 1 ? -1 : 1 } };
  }
  const x = h.dir === 1 ? h.x : h.x - 2;
  const spot = h.dir === 1 ? { x, y: h.y - 0.5, v: false, a: near, b: far } : { x, y: h.y - 0.5, v: false, a: far, b: near };
  return { spot, next: { x: h.dir === 1 ? h.x + 2 : h.x - 2, y: h.y, dir: h.dir } };
}
function layout(line: Laid[], HALF: number): { spots: (Spot & { n: number; by: Laid['by'] })[]; heads: { L: Arm; R: Arm } } {
  const out: (Spot & { n: number; by: Laid['by'] })[] = [];
  if (!line.length) return { spots: out, heads: { L: { x: -1, y: 0, dir: -1 }, R: { x: -1, y: 0, dir: 1 } } };
  const c = line.findIndex((t) => t.n === 0);
  const first = line[c];
  out.push({ x: -1, y: -0.5, v: false, a: first.a, b: first.b, n: first.n, by: first.by });
  let R: Arm = { x: 1, y: 0, dir: 1 };
  for (let i = c + 1; i < line.length; i++) { const r = stepArm(R, line[i].a, line[i].b, 1, HALF); out.push({ ...r.spot, n: line[i].n, by: line[i].by }); R = r.next; }
  let L: Arm = { x: -1, y: 0, dir: -1 };
  for (let i = c - 1; i >= 0; i--) { const r = stepArm(L, line[i].b, line[i].a, -1, HALF); out.push({ ...r.spot, n: line[i].n, by: line[i].by }); L = r.next; }
  return { spots: out, heads: { L, R } };
}

// ─── the table ──────────────────────────────────────────────────────────────
export function DominoTable({ regId, onClose }: { regId: string; onClose: (note?: string) => void }) {
  const reg = REGULARS[regId];
  const cash = useGame((g) => g.cash);
  const rec = useGame((g) => g.dominoes?.[regId]);
  const day = useGame((g) => g.day);
  const dominoGame = useGame((g) => g.dominoGame);
  const staked = rec?.stakeDay === day;
  const played = (rec?.won ?? 0) + (rec?.lost ?? 0) + (rec?.drawn ?? 0);
  const [stake, setStake] = useState(0);
  const [hand, setHand] = useState<Hand | null>(null);
  const [sel, setSel] = useState<Tile | null>(null);
  const [say, setSay] = useState('');
  const [fresh, setFresh] = useState(-1);
  const rnd = useRef<() => number>(() => 0.5);

  const sit = () => {
    rnd.current = rngFrom(seedOf(`${regId}:${day}:${played}`));
    const h = deal(rnd.current);
    audio.sfx('dice');
    setHand(h); setSel(null); setFresh(-1);
    setSay(h.turn === 'you' ? 'You hold the heaviest double. You lead.' : `${reg.name} holds the heaviest double. He leads.`);
  };

  // his turn: a moment to think, then a tile or a knock
  useEffect(() => {
    if (!hand || hand.over || hand.turn !== 'him') return;
    const t = window.setTimeout(() => {
      const m = chooseMove(hand, 'him');
      if (m) {
        const nh = play(hand, 'him', m);
        audio.sfx('piece');
        setFresh(nh.laid - 1);
        setSay(`${reg.name} lays the ${m.tile[0]}-${m.tile[1]}.`);
        setHand(nh);
      } else {
        audio.sfx('tap');
        setSay(`${reg.name} knocks on the table: nothing fits.`);
        setHand(knock(hand, 'him'));
      }
    }, reduced() ? 150 : 750);
    return () => window.clearTimeout(t);
  }, [hand, reg.name]);

  const mine = useMemo(() => (hand && hand.turn === 'you' && !hand.over ? legal(hand, 'you') : []), [hand]);
  const canPlay = (t: Tile) => mine.some((m) => sameTile(m.tile, t));
  const endsFor = (t: Tile): End[] => (hand ? [...new Set(mine.filter((m) => sameTile(m.tile, t)).map((m) => m.end))] : []);

  const lay = (t: Tile, end: End) => {
    if (!hand) return;
    const nh = play(hand, 'you', { tile: t, end });
    audio.sfx('piece');
    setFresh(nh.laid - 1); setSel(null);
    setSay(nh.over ? '' : `You lay the ${t[0]}-${t[1]}.`);
    setHand(nh);
  };
  const tapTile = (t: Tile) => {
    if (!hand || hand.turn !== 'you' || hand.over || !canPlay(t)) return;
    const es = endsFor(t);
    if (es.length === 1) lay(t, es[0]);
    else { audio.sfx('tap'); setSel(sel && sameTile(sel, t) ? null : t); }
  };
  const doKnock = () => { if (!hand) return; audio.sfx('tap'); setSay('You knock on the table.'); setHand(knock(hand, 'you')); };

  const over = hand?.over;
  const result: 'win' | 'loss' | 'draw' = !over ? 'draw' : over.winner === 'you' ? 'win' : over.winner === 'him' ? 'loss' : 'draw';
  const endText = !over ? '' : over.winner === 'you'
    ? `${over.blocked ? `Blocked. Your hand is lighter: ${over.you} to his ${over.him}.` : 'Your last tile goes down.'} ${reg.loses} You score ${handScore(hand!)}.`
    : over.winner === 'him'
      ? `${over.blocked ? `Blocked. His hand is lighter: ${over.him} to your ${over.you}.` : `${reg.name} lays his last tile.`} ${reg.wins}`
      : `Blocked, and both hands count ${over.you}. Nobody wins.`;
  // the hand is settled the moment it ends (stake, record, what he tells you), so the card can say it all
  // and getting up is a quiet return to the room or the street
  const [told, setTold] = useState('');
  const settled = useRef(false);
  useEffect(() => {
    if (!over || settled.current) return;
    settled.current = true;
    if (result === 'win') audio.sfx('coin');
    setTold(dominoGame(regId, result, stake));
  }, [over]); // eslint-disable-line react-hooks/exhaustive-deps
  const finish = () => onClose();
  const quit = () => {
    // leaving a staked hand once it has started gives up the stake
    if (hand && !over && stake && hand.laid > 0) dominoGame(regId, 'loss', stake);
    onClose();
  };

  // the table's width sets how far the line runs before it turns
  const felt = useRef<HTMLDivElement>(null);
  const [HALF, setHalf] = useState(4.5);
  useEffect(() => {
    const el = felt.current;
    if (!el) return;
    const fit = () => setHalf(Math.round(halfFor(el.clientWidth - 16) * 2) / 2);
    fit();
    const ro = new ResizeObserver(fit); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const { spots, heads } = useMemo(() => layout(hand?.line ?? [], HALF), [hand, HALF]);
  // where the chosen tile could go, when it fits both ends
  const ghosts = useMemo(() => {
    if (!hand || !sel) return [];
    const e = ends(hand)!;
    return endsFor(sel).map((end) => {
      const near = end === 'L' ? e[0] : e[1];
      const far = sel[0] === near ? sel[1] : sel[0];
      return { end, spot: stepArm(end === 'L' ? heads.L : heads.R, near, far, end === 'L' ? -1 : 1, HALF).spot };
    });
  }, [hand, sel, heads, HALF]); // eslint-disable-line react-hooks/exhaustive-deps
  // the table's height follows the line: never less than five rows' worth
  const ys = [...spots, ...ghosts.map((g) => g.spot)].flatMap((s) => [s.y, s.y + (s.v ? 2 : 1)]);
  const top = Math.min(-2.5, ...ys) - 0.4, bot = Math.max(2.5, ...ys) + 0.4;
  const vb = `${-HALF - 1.4} ${top} ${HALF * 2 + 2.8} ${bot - top}`;

  const youSeat = hand ? { label: 'You', main: `${hand.you.length} tile${hand.you.length === 1 ? '' : 's'}`, sub: `${handPips(hand.you)} pips in your hand` } : { label: 'You', main: '–', sub: 'seven tiles each' };
  const himSeat = { label: reg.name, main: hand ? `${hand.him.length} tile${hand.him.length === 1 ? '' : 's'}` : '–', sub: `won ${rec?.won ?? 0} · lost ${rec?.lost ?? 0} · ${friendWord(rec?.friend ?? 0)}` };
  const turn = !hand || over ? null : hand.turn;
  const need = hand && !over && hand.turn === 'you';
  const stuck = need && !mine.length;
  const status = !hand ? '' : over ? '' : hand.turn === 'him' ? `${reg.name} is looking at his tiles…` : stuck ? 'Nothing fits either end. Knock.' : sel ? 'It fits both ends: tap the end it goes on.' : hand.line.length ? 'Your turn: tap a tile that glows.' : 'Your lead: tap the glowing tile.';

  return (
    <div className="overlay cafe-overlay at-dominoes" data-testid="domino-table" style={TABLE_BG}>
      <Head title={`Dominoes with ${reg.name}`} stake={stake} onQuit={quit} turn={turn} you={youSeat} him={himSeat} />
      <div className="dm-body">
        <p className="dm-rules" data-testid="domino-rules"><b>Match an open end.</b> First to lay his last tile wins. Tap a glowing tile; nothing fits, knock.</p>
        <div className="dm-him" aria-label={`${reg.name}'s tiles`} data-testid="domino-him">
          {Array.from({ length: hand ? hand.him.length : 7 }, (_, k) => <span key={k} className="dm-back" />)}
        </div>
        <div className="dm-felt" ref={felt}>
          <svg className="dm-line" viewBox={vb} preserveAspectRatio="xMidYMid meet" data-testid="domino-line" data-count={hand?.line.length ?? 0} data-ends={hand && ends(hand) ? ends(hand)!.join('-') : ''}>
            {spots.map((s) => <TileG key={s.n} a={s.a} b={s.b} x={s.x} y={s.y} v={s.v} cls={`${s.n === fresh ? (s.by === 'him' ? 'is-new him' : 'is-new') : ''}`} />)}
            {/* the two open ends, marked where the next tile would touch */}
            {hand && !over && spots.length > 0 && !ghosts.length && ([['L', heads.L], ['R', heads.R]] as const).map(([k, a]) => <circle key={k} cx={a.x} cy={a.y} r={0.13} className="dm-endmark" />)}
            {ghosts.map((g) => (
              <g key={g.end} className="dm-ghost" onClick={() => sel && lay(sel, g.end)} data-testid={`domino-end-${g.end}`} role="button" aria-label={g.end === 'L' ? 'Lay it on the left end' : 'Lay it on the right end'}>
                <rect x={g.spot.x - 0.15} y={g.spot.y - 0.15} width={(g.spot.v ? 1 : 2) + 0.3} height={(g.spot.v ? 2 : 1) + 0.3} rx={0.2} className="dm-ghost__hit" />
                <rect x={g.spot.x + 0.04} y={g.spot.y + 0.04} width={(g.spot.v ? 1 : 2) - 0.08} height={(g.spot.v ? 2 : 1) - 0.08} rx={0.12} className="dm-ghost__box" />
              </g>
            ))}
          </svg>
          {!hand && (
            <div className="dm-sit" data-testid="domino-sit">
              <p className="dm-who"><b>{reg.name}</b>, {reg.who}. {reg.place}.</p>
              <p className="cafe-say">{reg.hello}</p>
              <div className="cafe-row">
                <span>Stake</span>
                {STAKES.map((v) => (
                  <button key={v} className={`btn small${stake === v ? ' on' : ''}`} disabled={v > cash || (v > 0 && staked)} onClick={() => { audio.sfx('tap'); setStake(v); }} data-testid={`domino-stake-${v}`}>{v ? fmt(v) : 'For tea'}</button>
                ))}
              </div>
              {staked && <p className="cafe-say small" data-testid="domino-staked">"One hand for money a day. The rest for tea."</p>}
              <button className="btn primary dm-go" onClick={sit} data-testid="domino-deal">Shuffle and deal</button>
            </div>
          )}
          {over && (
            <div className="dm-endwrap">
              <div className="cafe-end" data-testid="cafe-end">
                <p>{endText}</p>
                {told && <p className="dm-told" data-testid="domino-told">{told}</p>}
                <button className="btn" onClick={finish} data-testid="cafe-done">Get up from the table</button>
              </div>
            </div>
          )}
        </div>
        {hand && !over && <p className="cafe-say dm-say" data-testid="domino-say">{say ? `${say} ` : ''}{status}</p>}
        {hand && (
          <div className="dm-hand" data-testid="domino-hand">
            {hand.you.map((t) => {
              const can = need && canPlay(t);
              const on = sel && sameTile(sel, t);
              return (
                <button key={`${t[0]}-${t[1]}`} className={`dm-mine${can ? ' can' : ''}${on ? ' sel' : ''}`} disabled={!need} onClick={() => tapTile(t)} data-tile={`${t[0]}-${t[1]}`} data-can={can ? '1' : '0'} aria-label={`Tile ${t[0]}-${t[1]}${can ? ', plays' : ''}`}>
                  <svg viewBox="0 0 1 2"><TileG a={t[0]} b={t[1]} x={0} y={0} v /></svg>
                </button>
              );
            })}
            {stuck && <button className="btn dm-knock" onClick={doKnock} data-testid="domino-knock">Knock</button>}
          </div>
        )}
      </div>
    </div>
  );
}
