import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../Icon';
import {
  COLS, ROWS, KIND_LABEL, RANGE, act, byId, cellAt, chargeCells, choose, dist, squadAt, expectedKills, intents, live, newTurn, outcome, reach, sidePhase, simulate,
  type Battle, type Outcome, type Order, type Squad, type Step, type Style,
} from '../../game/systems/tactics';
import './TacticalBattle.css';

const CELL_GLYPH: Record<string, string> = { cover: '▥', rock: '◆', water: '≈', high: '▲' };
const CELL_NAME: Record<string, string> = { cover: 'Cover: shots against men here are weaker', rock: 'Rocks: nobody can enter', water: 'Water or mud: slow going', high: 'High ground: shoot further, take less' };

interface Props {
  battle: Battle;
  title: string;
  fieldArt: string;
  onEnd: (o: Outcome, retreat: boolean) => void;
}

/** The fight as a map: your squads at the bottom, theirs at the top, painted ground behind, full screen. */
export function TacticalBattle({ battle, title, fieldArt, onEnd }: Props) {
  const [b, setB] = useState<Battle>(battle);
  const [sel, setSel] = useState<string | null>('hero');
  const [mode, setMode] = useState<'act' | 'focus'>('act');
  const [busy, setBusy] = useState(false);
  const [auto, setAuto] = useState<Style | null>(null);
  const [sheet, setSheet] = useState(false);
  const [flash, setFlash] = useState<{ id: string; kind: string; k: number } | null>(null);
  const [confirmRetreat, setConfirmRetreat] = useState(false);
  // scouts saw them first: place your squads before the first shot
  const [deploying, setDeploying] = useState(battle.initiative === 'me');
  const [odds, setOdds] = useState<number | null>(null);
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const timer = useRef<number | undefined>(undefined);
  const autoTimer = useRef<number | undefined>(undefined);
  const bRef = useRef(b); bRef.current = b;
  const autoRef = useRef<Style | null>(null); autoRef.current = auto;

  useEffect(() => {
    const f = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', f); return () => window.removeEventListener('resize', f);
  }, []);
  useEffect(() => () => { window.clearTimeout(timer.current); window.clearTimeout(autoTimer.current); }, []);

  const wide = size.w >= 900 && size.w > size.h * 1.1;
  const TOP = 56, LOG = 44, PANEL = wide ? 0 : 226, SIDE = wide ? 330 : 0;
  const availW = size.w - SIDE, availH = size.h - TOP - LOG - PANEL - 8;
  const cell = Math.max(34, Math.floor(Math.min((availW * 0.98) / COLS, availH / ROWS)));
  const gw = cell * COLS, gh = cell * ROWS;

  // ---- playing back a list of steps, one at a time, so you can follow what happened ----
  const play = useCallback((steps: Step[], then: () => void, gap = 650) => {
    setBusy(true);
    let i = 0;
    const next = () => {
      if (i >= steps.length) { setBusy(false); then(); return; }
      const s = steps[i++];
      setB(s.b);
      if (s.fx?.to) setFlash({ id: s.fx.to, kind: s.fx.kind, k: i });
      timer.current = window.setTimeout(next, s.fx ? gap : s.text ? Math.min(gap, 300) : 40);
    };
    next();
  }, []);

  const afterPhase = useCallback((side: 'me' | 'en') => {
    const cur = bRef.current;
    if (cur.over) return;
    if (side === 'en') { setB(newTurn(cur)); setMode('act'); setSel('hero'); }
  }, []);

  const enemyPhase = useCallback(() => {
    const steps = sidePhase(bRef.current, 'en', 'steady');
    play(steps, () => afterPhase('en'), autoRef.current ? 200 : 560);
  }, [play, afterPhase]);

  // they were waiting: the enemy opens (once)
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return; started.current = true;
    if (battle.initiative === 'en') timer.current = window.setTimeout(enemyPhase, 700);
  }, [battle.initiative, enemyPhase]);

  // ---- the player's side in simulation: one whole turn at a time ----
  useEffect(() => {
    if (!auto || busy || b.over) return;
    autoTimer.current = window.setTimeout(() => {
      const cur = { ...bRef.current, autoMine: true };
      const mine = sidePhase(cur, 'me', auto);
      play(mine, () => {
        const c2 = bRef.current;
        if (c2.over) return;
        enemyPhase();
      }, 220);
    }, 250);
    return () => window.clearTimeout(autoTimer.current);
  }, [auto, busy, b.turn, b.over]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!deploying) return;
    const t = window.setTimeout(() => setOdds(simulatedOdds(bRef.current, 'steady', 30)), 150);
    return () => window.clearTimeout(t);
  }, [deploying, b.squads.map((q) => `${q.id}${q.x}${q.y}`).join()]); // eslint-disable-line react-hooks/exhaustive-deps

  // finishing the fight
  const done = b.over;
  const res = useMemo(() => outcome(b), [b]);

  // ---- what the selected squad can do ----
  const s: Squad | undefined = sel ? byId(b, sel) : undefined;
  const mineTurn = !busy && !auto && !done && !deploying;
  const canAct = !!s && s.side === 'me' && !s.gone && !s.acted && mineTurn;
  const moves = useMemo(() => {
    if (!canAct || !s || s.moved || mode === 'focus') return new Map<string, number>();
    const m = reach(b, s); m.delete(`${s.x},${s.y}`); return m;
  }, [b, s, canAct, mode]);
  const foes = live(b, 'en');
  const shootable = useMemo(() => {
    if (!canAct || !s) return [] as Squad[];
    if (mode === 'focus') return foes;
    if (s.kind === 'rifle' || s.kind === 'hero' || s.kind === 'leader') return foes.filter((f) => dist(s, f) <= RANGE[s.kind]);
    return [];
  }, [b, s, canAct, mode]); // eslint-disable-line react-hooks/exhaustive-deps
  const chargeable = useMemo(() => {
    if (!canAct || !s || mode === 'focus' || (s.kind !== 'melee' && s.kind !== 'mounted')) return [] as { f: Squad; cells: [number, number][] }[];
    return foes.map((f) => ({ f, cells: s.moved ? (dist(s, f) === 1 ? [[s.x, s.y] as [number, number]] : []) : chargeCells(b, s, f) })).filter((c) => c.cells.length);
  }, [b, s, canAct, mode]); // eslint-disable-line react-hooks/exhaustive-deps
  const plan = useMemo(() => (mineTurn ? intents(b) : []), [b, mineTurn]);

  const run = (id: string, o: Order) => {
    const st = act(b, id, o);
    setB(st.b);
    if (st.fx?.to) setFlash({ id: st.fx.to, kind: st.fx.kind, k: Math.random() });
    if (st.fx?.kind === 'rally' || st.fx?.kind === 'order') setFlash({ id, kind: st.fx.kind, k: Math.random() });
    setMode('act');
  };
  const pickCharge = (sq: Squad, f: Squad, cells: [number, number][]): [number, number] => {
    // from the flank or behind, from cover, the nearest first
    const score = ([x, y]: [number, number]) => (sq.side === 'me' ? (y < f.y ? 6 : 0) : (y > f.y ? 6 : 0)) + (cellAt(b, x, y) === 'cover' ? 3 : 0) + (cellAt(b, x, y) === 'high' ? 3 : 0) - dist(sq, { x, y }) * 0.3 + (live(b, 'me').some((o) => o.id !== sq.id && dist(o, { x, y }) === 1 && dist(o, f) === 1) ? 0 : 0);
    return [...cells].sort((a, c) => score(c) - score(a))[0];
  };
  const deployCells = useMemo(() => {
    const m = new Set<string>();
    if (!deploying) return m;
    for (let y = ROWS - 3; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (cellAt(b, x, y) !== 'rock' && !squadAt(b, x, y)) m.add(`${x},${y}`);
    return m;
  }, [b, deploying]);
  const tapCell = (x: number, y: number) => {
    if (deploying) {
      const q = sel ? byId(b, sel) : undefined;
      if (q && q.side === 'me' && deployCells.has(`${x},${y}`)) setB({ ...b, squads: b.squads.map((o) => (o.id === q.id ? { ...o, x, y } : o)) });
      return;
    }
    if (!canAct || !s) return;
    if (moves.has(`${x},${y}`)) run(s.id, { t: 'move', to: [x, y] });
  };
  const tapSquad = (q: Squad) => {
    if (busy || auto) return;
    if (deploying && q.side === 'me' && sel && sel !== q.id) {
      const a = byId(b, sel)!;
      if (a.side === 'me' && Math.min(a.y, q.y) >= ROWS - 3) { setB({ ...b, squads: b.squads.map((o) => (o.id === a.id ? { ...o, x: q.x, y: q.y } : o.id === q.id ? { ...o, x: a.x, y: a.y } : o)) }); setSel(q.id); return; }
    }
    if (q.side === 'me') { setSel(q.id); setMode('act'); return; }
    if (!canAct || !s) { setSel(q.id); return; }
    if (mode === 'focus') { run(s.id, { t: 'focus', target: q.id }); return; }
    if (shootable.some((f) => f.id === q.id)) { run(s.id, { t: 'shoot', target: q.id }); return; }
    const ch = chargeable.find((c) => c.f.id === q.id);
    if (ch) { run(s.id, { t: 'charge', target: q.id, to: pickCharge(s, q, ch.cells) }); return; }
    setSel(q.id);
  };

  const endTurn = () => { if (busy || done) return; setSel(null); enemyPhase(); };
  const startAuto = (style: Style) => { setSheet(false); setAuto(style); setSel(null); };
  const instant = (style: Style) => {
    setSheet(false);
    const r = simulate(bRef.current, style);
    setB(r.b);
  };

  // ---- drawing ----
  const px = (x: number) => x * cell;
  const center = (x: number, y: number): [number, number] => [x * cell + cell / 2, y * cell + cell / 2];
  const mySt = live(b, 'me'), enSt = live(b, 'en');
  const frac = (side: 'me' | 'en') => { const all = b.squads.filter((q) => q.side === side); const max = all.reduce((a, q) => a + q.maxHp, 0); return max ? live(b, side).reduce((a, q) => a + q.hp, 0) / max : 0; };
  const avgMorale = (list: Squad[]) => (list.length ? Math.round(list.reduce((a, q) => a + Math.max(0, q.morale), 0) / list.length) : 0);
  const hint = deploying ? 'Your scouts saw them first. Tap a squad, then a green square to place it. Put riflemen in cover, riders on the wings, and keep Hassan at the back.' : !s ? 'Tap one of your squads.' : s.side === 'en' ? `${s.name}: ${s.n} of ${s.start}, morale ${Math.max(0, Math.round(s.morale))}.` :
    s.acted ? `${s.name} have acted.` :
    mode === 'focus' ? 'Tap the enemy squad every rifle should fire on.' :
    s.kind === 'hero' ? 'Give an order, or tap a green square to move, or an enemy in range to fire.' :
    s.kind === 'rifle' ? 'Tap a green square to move. Tap an enemy in range to fire.' :
    'Tap a green square to move. Tap an enemy to charge it.';
  const intentLines = plan.filter((p) => p.target || p.to).map((p) => {
    const f = byId(b, p.id)!;
    const goal = p.target ? byId(b, p.target) : undefined;
    const from = center(f.x, f.y);
    const to = goal ? center(goal.x, goal.y) : center(p.to![0], p.to![1]);
    return { id: p.id, kind: p.kind, from, to, aim: !!goal };
  });

  return (
    <div className="tac" data-testid="tactical-battle">
      <div className="tac-bg" style={{ backgroundImage: `url(${fieldArt})` }} />
      <div className="tac-shade" />

      <header className="tac-top" style={{ height: TOP }}>
        <div className="tac-title"><small>TURN {Math.min(b.turn, b.maxTurns)} OF {b.maxTurns}</small><b>{title}</b></div>
        <div className="tac-bars">
          <div title="Your caravan: men left and morale"><span>You</span><i><u style={{ width: `${frac('me') * 100}%` }} /></i><em className="mor" style={{ opacity: 0.4 + avgMorale(mySt) / 170 }}>{avgMorale(mySt)}</em></div>
          <div title="Their band: men left and morale"><span>Them</span><i className="foe"><u style={{ width: `${frac('en') * 100}%` }} /></i><em className="mor" style={{ opacity: 0.4 + avgMorale(enSt) / 170 }}>{avgMorale(enSt)}</em></div>
        </div>
      </header>

      <div className="tac-stage" style={{ top: TOP, height: availH + LOG, width: availW }}>
        <div className="tac-grid" style={{ width: gw, height: gh }} data-testid="tac-grid">
          {Array.from({ length: COLS * ROWS }, (_, i) => {
            const x = i % COLS, y = Math.floor(i / COLS), t = cellAt(b, x, y);
            const can = moves.has(`${x},${y}`) || deployCells.has(`${x},${y}`);
            return (
              <div key={i} className={`tc ${t} ${can ? 'go' : ''} ${y <= 2 ? 'theirs' : y >= 6 ? 'ours' : ''}`} style={{ left: px(x), top: px(y), width: cell, height: cell }} onClick={() => tapCell(x, y)} title={CELL_NAME[t] ?? ''}>
                {t !== 'open' && <span>{CELL_GLYPH[t]}</span>}
              </div>
            );
          })}

          <svg className="tac-intent" width={gw} height={gh} aria-hidden>
            <defs><marker id="ar" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#ff7a5c" /></marker></defs>
            {intentLines.map((l) => <line key={l.id} x1={l.from[0]} y1={l.from[1]} x2={l.to[0]} y2={l.to[1]} stroke="#ff7a5c" strokeWidth={l.aim ? 2.5 : 2} strokeDasharray={l.aim ? '' : '5 5'} opacity={0.75} markerEnd="url(#ar)" />)}
          </svg>

          {b.squads.filter((q) => !q.gone).map((q) => {
            const isSel = sel === q.id;
            const shootT = shootable.some((f) => f.id === q.id);
            const chargeT = chargeable.some((c) => c.f.id === q.id);
            const fl = flash?.id === q.id ? flash : null;
            const kills = s && q.side === 'en' && canAct && (shootT || chargeT) && mode === 'act' ? expectedKills(b, s, q, chargeT && !shootT) : null;
            return (
              <button key={q.id} className={`tk s-${q.side} k-${q.kind} ${isSel ? 'sel' : ''} ${q.acted ? 'done' : ''} ${shootT ? 'tgt shoot' : ''} ${chargeT ? 'tgt charge' : ''} ${mode === 'focus' && q.side === 'en' ? 'tgt shoot' : ''} ${fl ? `fx-${fl.kind}` : ''}`}
                style={{ transform: `translate(${px(q.x)}px, ${px(q.y)}px)`, width: cell, height: cell }} onClick={() => tapSquad(q)} aria-label={`${q.name}, ${q.n} men`} data-testid={`tk-${q.id}`}>
                <img src={q.img} alt="" draggable={false} style={{ width: cell * 0.78, height: cell * 0.78 }} onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                <em className="n">{q.n}</em>
                {q.held && <em className="hold" title="Steady">⛨</em>}
                {kills != null && <em className="exp" title="Men expected to fall">≈{kills}</em>}
                <i className="m"><u style={{ width: `${Math.max(0, Math.min(100, q.morale))}%`, background: q.morale > 55 ? '#8fd16a' : q.morale > 30 ? '#e8c05a' : '#e0553c' }} /></i>
              </button>
            );
          })}
        </div>
        <div className="tac-log" style={{ height: LOG }} data-testid="tac-log">{b.log[0] ?? ''}<br /><small>{b.log[1] ?? ''}</small></div>
      </div>

      <aside className={`tac-panel ${wide ? 'side' : 'bottom'}`} style={wide ? { width: SIDE, top: TOP } : { height: PANEL }}>
        <div className="tac-info">
          {s && <img src={s.img} alt="" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />}
          <div>
            <b>{s ? s.name : 'Choose a squad'}</b>
            <small>{s ? `${KIND_LABEL[s.kind]} · ${s.n} of ${s.start} men · morale ${Math.max(0, Math.round(s.morale))}${cellAt(b, s.x, s.y) !== 'open' ? ` · on ${cellAt(b, s.x, s.y)}` : ''}` : ''}</small>
          </div>
        </div>
        <p className="tac-hint">{done ? '' : busy ? 'Their turn…' : auto ? 'The men are fighting it out.' : hint}</p>

        {done ? (
          <div className="tac-end" data-testid="tac-result">
            <h3>{done.result === 'win' ? 'The band breaks' : done.result === 'loss' ? 'Your line breaks' : 'Neither side gives way'}</h3>
            <p>{done.result === 'win' ? 'They scatter and leave the road.' : done.result === 'loss' ? 'You are driven back and they take what they want.' : 'The day ends; both sides pull back.'}</p>
            <button className="btn primary big" onClick={() => onEnd(res, false)} data-testid="tac-continue">Continue</button>
          </div>
        ) : deploying ? (
          <div className="tac-main" style={{ marginTop: 'auto', flexDirection: 'column' }}>
            {odds != null && <div className="tac-odds" data-testid="tac-odds">If your men fought it out from here: about <b>{odds}%</b> to win</div>}
            <button className="btn primary" onClick={() => { setDeploying(false); setSel('hero'); }} data-testid="tac-begin">Begin the fight</button>
          </div>
        ) : (
          <>
            <div className="tac-orders">
              {s?.kind === 'hero' && (
                <>
                  <button className="btn" disabled={!canAct || b.commanded} onClick={() => run('hero', { t: 'rally' })} data-testid="ord-rally"><Icon name="people" /> Rally <small>+morale nearby</small></button>
                  <button className="btn" disabled={!canAct || b.commanded} onClick={() => setMode(mode === 'focus' ? 'act' : 'focus')} data-testid="ord-focus"><Icon name="sword" /> Focus <small>one target</small></button>
                  <button className="btn" disabled={!canAct || b.commanded} onClick={() => run('hero', { t: 'holdline' })} data-testid="ord-holdline"><Icon name="shield" /> Hold line <small>cover digs in</small></button>
                </>
              )}
              {s && s.side === 'me' && s.kind !== 'hero' && (
                <>
                  <button className="btn" disabled={!canAct} onClick={() => run(s.id, { t: 'hold' })} data-testid="ord-hold"><Icon name="shield" /> Hold <small>steady aim, harder to hit</small></button>
                </>
              )}
            </div>
            <div className="tac-main">
              {!auto ? <button className="btn primary" disabled={busy} onClick={endTurn} data-testid="tac-endturn">End turn</button> : <button className="btn primary" onClick={() => { window.clearTimeout(autoTimer.current); setAuto(null); }} data-testid="tac-takecommand">Take command</button>}
              <button className="btn" disabled={busy || !!auto} onClick={() => setSheet(true)} data-testid="tac-auto"><Icon name="people" /> Fight it out</button>
              <button className="btn" disabled={busy && !auto} onClick={() => setConfirmRetreat(true)} data-testid="tac-retreat"><Icon name="run" /> Retreat</button>
            </div>
          </>
        )}
      </aside>

      {sheet && (
        <div className="tac-sheet" onClick={() => setSheet(false)}>
          <div className="tac-sheet-card" onClick={(e) => e.stopPropagation()}>
            <h3>Let the men fight it out</h3>
            <p>Your squads act on their own under your chosen doctrine. A careful commander does a little better than this, but you can take command back at any turn.</p>
            <button className="btn primary" onClick={() => startAuto('steady')} data-testid="auto-steady"><Icon name="shield" /> Steady <small>fire from cover, charge only when it's safe</small></button>
            <button className="btn" onClick={() => startAuto('aggressive')} data-testid="auto-aggressive"><Icon name="sword" /> Aggressive <small>advance and charge at once</small></button>
            <button className="btn" onClick={() => instant('steady')} data-testid="auto-instant">Skip to the result <small>steady doctrine</small></button>
            <button className="ghost-btn" onClick={() => setSheet(false)}>Cancel</button>
          </div>
        </div>
      )}
      {confirmRetreat && (
        <div className="tac-sheet" onClick={() => setConfirmRetreat(false)}>
          <div className="tac-sheet-card" onClick={(e) => e.stopPropagation()}>
            <h3>Sound the retreat?</h3>
            <p>You will leave goods and some coin behind, and may take a wound running.</p>
            <button className="btn primary" onClick={() => { window.clearTimeout(timer.current); onEnd(outcome(b), true); }} data-testid="tac-retreat-yes"><Icon name="run" /> Run</button>
            <button className="ghost-btn" onClick={() => setConfirmRetreat(false)}>Keep fighting</button>
          </div>
        </div>
      )}
    </div>
  );
}

// kept for the pre-fight screen: the odds of a plain simulation
export function simulatedOdds(b: Battle, style: Style = 'steady', runs = 24): number {
  let w = 0;
  for (let i = 0; i < runs; i++) if (simulate(b, style).b.over?.result === 'win') w++;
  return Math.round((w / runs) * 100);
}
void choose;
