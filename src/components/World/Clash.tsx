import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../Icon';
import { BattleField, type FieldUnit } from './BattleField';
import type { PartyState } from '../../game/systems/caravan';
import { audio } from '../../game/audio/engine';
import { buzz } from '../../game/feel';
import { fmt } from '../../game/economy/money';
import {
  FORMATIONS, GROUNDS, ORDERS, ORDER_INFO, ROUNDS, TELL_SHORT, TEMPER_WORD, autoFight, bestOrder, duelOpen, duelWindow, isWin, playRound, sergeantPolicy,
  sergeantWord, settleDuel, startFight, winOdds, casualties, rngFrom,
  type Fight, type Formation, type GroundId, type Leader, type Order, type Setup, type Temper,
} from '../../game/systems/combat';
import './Clash.css';

export interface ClashInfo {
  bandId: string; bandName: string; place: string; field: string;
  size: number; enPow: number; myPow: number;
  leader?: Leader; leaderImg: string; heroImg: string; heroArt: string;
  temper: Temper; known: boolean; scout: boolean;
  grounds: GroundId[]; camels: number; mountedMen: boolean;
  sergeant?: string; arms: number; armsLine: string; seed: string;
  mySide: FieldUnit[]; troops: Record<string, number>; party: PartyState;
}
export interface ClashEnd { fight: Fight; lost: Record<string, number>; kills: number; retreat?: boolean; auto?: boolean }

const HEAD: Record<string, string> = { run: 'They break and run', yield: 'They lay down their arms', withdraw: 'They pull back', draw: 'Neither side gives way', pushed: 'You are pushed back', broken: 'Your line breaks' };

/** A road fight in three rounds: choose the ground, then answer what you see them do. */
export function Clash({ info, onEnd, onBack }: { info: ClashInfo; onEnd: (e: ClashEnd) => void; onBack: () => void }) {
  const [ground, setGround] = useState<GroundId>(info.grounds.includes('camels') ? 'camels' : info.grounds[info.grounds.length - 1]);
  const [formation, setFormation] = useState<Formation>('line');
  const setup: Setup = useMemo(() => ({
    myPow: info.myPow, enPow: info.enPow, temper: info.temper, known: info.known, scout: info.scout, ground, formation, sergeant: !!info.sergeant, seed: info.seed,
  }), [info, ground, formation]);
  const odds = useMemo(() => winOdds(setup), [setup]);
  const autoOdds = useMemo(() => winOdds(setup, sergeantPolicy(!!info.sergeant, info.scout)), [setup, info.sergeant, info.scout]);

  const [f, setF] = useState<Fight | null>(null);
  const [phase, setPhase] = useState<'prep' | 'read' | 'resolve' | 'duel' | 'over'>('prep');
  const [act, setAct] = useState<Order | undefined>();
  const [volley, setVolley] = useState<{ round: number; mine: number; theirs: number } | undefined>();
  const [shownLog, setShownLog] = useState(0);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  const later = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)); };

  // men down so far, drawn on the field
  const cas = useMemo(() => (f ? casualties(f.log.slice(0, shownLog), info.size, info.troops, f.over) : { kills: 0, lost: {} as Record<string, number> }), [f, shownLog, info]);
  const units = info.mySide.map((u) => ({ ...u, n: Math.max(0, u.n - (cas.lost[u.id] ?? 0)) }));
  const enemyN = Math.max(1, info.size - cas.kills);

  const begin = () => { audio.sfx('chest'); buzz(25); setF(startFight(setup)); setPhase('read'); setAct(undefined); setVolley(undefined); };
  const auto = () => {
    const done = autoFight(setup, !!info.sergeant);
    const c = casualties(done.log, info.size, info.troops, done.over);
    onEnd({ fight: done, lost: c.lost, kills: c.kills, auto: true });
  };

  const order = (o: Order) => {
    if (!f || phase !== 'read') return;
    const next = playRound(f, o);
    setAct(o);
    const rd = next.log[next.log.length - 1];
    // what the field shows: rifles flash for a volley, and for their shots from cover or as they come in
    const myRifles = info.mySide.reduce((a, u) => a + u.n, 0);
    const v = o === 'volley' ? { round: f.round, mine: myRifles, theirs: f.tell === 'snipe' ? 2 : 1 } : f.tell === 'snipe' || f.tell === 'rush' ? { round: f.round, mine: o === 'hold' ? 2 : 0, theirs: Math.min(6, info.size) } : undefined;
    setVolley(v);
    audio.sfx(o === 'volley' || v ? 'volley' : o === 'charge' || o === 'flank' ? 'melee' : 'tap');
    setF(next);
    setPhase('resolve');
    // the fallen go down a moment after the shots
    later(650, () => setShownLog(next.log.length));
    if (rd && rd.score >= 2) later(700, () => buzz(30));
  };
  const nextRound = () => {
    if (!f) return;
    setAct(undefined); setVolley(undefined);
    setPhase(f.over ? 'over' : 'read');
  };

  // ---------- before: the band, the ground, the men ----------
  if (phase === 'prep' || !f) {
    const L = info.leader;
    return (
      <div className="clash clash-prep" data-testid="clash-prep">
        <div className="clash-bg" style={{ backgroundImage: `url(${info.field})` }} />
        <div className="clash-body">
          <div className="clash-head"><small>BEFORE THE FIGHT · {info.place}</small><b>{info.bandName}</b></div>
          <div className="clash-band" data-testid="clash-band">
            <img src={info.leaderImg} alt="" onError={(e) => { e.currentTarget.src = 'art/troops/reformed.jpg'; }} />
            <div>
              <b>{L ? L.name : 'Their leader'}</b>
              <span>{info.armsLine}</span>
              <span data-testid="clash-temper">{info.known ? <>Known to be <em>{TEMPER_WORD[info.temper]}</em></> : 'His temper: not known. Watch how he moves.'}</span>
              {L && <span className="clash-bounty">Wanted · {fmt(L.bounty)}{L.robbed ? ' · he robbed you' : L.grudge ? ' · he has a grudge' : ''}</span>}
            </div>
          </div>
          {info.sergeant && <p className="clash-sarge" data-testid="clash-sergeant"><b>Sergeant {info.sergeant}:</b> "{sergeantWord({ temper: info.temper, known: info.known, grudge: L?.grudge, ground })}"</p>}
          <div className="clash-label">Your ground</div>
          <div className="clash-chips" role="radiogroup">
            {info.grounds.map((id) => (
              <button key={id} className={`clash-chip ${ground === id ? 'on' : ''}`} onClick={() => setGround(id)} data-testid={`ground-${id}`} role="radio" aria-checked={ground === id}>
                <b>{GROUNDS[id].name}</b><small>{GROUNDS[id].note}</small>
              </button>
            ))}
          </div>
          <div className="clash-label">Draw up the men</div>
          <div className="clash-seg" role="radiogroup">
            {(Object.keys(FORMATIONS) as Formation[]).filter((k) => k !== 'wings' || info.mountedMen).map((k) => (
              <button key={k} className={formation === k ? 'on' : ''} onClick={() => setFormation(k)} data-testid={`form-${k}`} role="radio" aria-checked={formation === k}>
                <b>{FORMATIONS[k].name}</b><small>{FORMATIONS[k].note}</small>
              </button>
            ))}
          </div>
          <div className="clash-odds" data-testid="clash-odds"><span>Your chance, reading them well</span><b>{odds}%</b></div>
          <div className="clash-go">
            <button className="btn primary big" onClick={begin} data-testid="clash-begin"><Icon name="sword" /> Give the order</button>
            <button className="btn" onClick={auto} data-testid="clash-auto"><Icon name="people" /> Let the sergeant handle it <small>{autoOdds}%{info.sergeant ? '' : ' · your oldest hand takes charge'}</small></button>
            <button className="ghost-btn" onClick={onBack} data-testid="clash-back">Back</button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- the rounds ----------
  const last = f.log[f.log.length - 1];
  const showRound = Math.min(phase === 'resolve' ? (last?.round ?? f.round) : f.round, ROUNDS);
  const myM = Math.max(0, Math.round(f.my)), enM = Math.max(0, Math.round(f.en));
  const scoutSees = info.scout && f.tell === 'feint' && phase === 'read';
  const canDuel = duelOpen(f) && !!info.leader && phase !== 'resolve';
  return (
    <div className={`clash clash-fight phase-${phase}`} data-testid="clash" data-round={showRound} data-tell={phase === 'read' ? f.tell : ''} data-best={phase === 'read' ? bestOrder(f.tell) : ''}>
      <div className="clash-bars">
        <div className="clash-title"><small>{phase === 'over' ? 'THE FIGHT IS OVER' : `ROUND ${showRound} OF ${ROUNDS}`}</small><b>{info.leader?.name ?? info.bandName}</b></div>
        <div className="clash-bar cb-me" title="Your men's nerve"><span>Your men</span><i><u style={{ width: `${myM}%` }} /></i><em data-testid="morale-me">{myM}</em></div>
        <div className="clash-bar cb-them" title="Their nerve"><span>Their nerve</span><i><u style={{ width: `${enM}%` }} /></i><em data-testid="morale-them">{enM}</em></div>
      </div>
      <div className="clash-field">
        <BattleField bandId={info.bandId} field={info.field} mySide={units} enemyN={enemyN} enemyStart={info.size} party={info.party}
          charging={false} volley={volley ?? (phase === 'read' && f.tell === 'snipe' ? { round: 100 + f.round, mine: 0, theirs: 3 } : undefined)} cue={phase === 'over' ? (f.over === 'run' || f.over === 'withdraw' ? 'flee' : undefined) : phase === 'resolve' && last ? last.tell : phase === 'read' ? f.tell : undefined} act={phase === 'resolve' ? act : undefined}
          wall={ground === 'camels'} leaderOut={phase === 'duel'} heroArt={info.heroArt} />
        {phase === 'over' && <div className={`clash-banner ${isWin(f.over) ? 'win' : f.over === 'draw' ? 'draw' : 'loss'}`} data-testid="clash-banner">{HEAD[f.over ?? 'draw']}</div>}
      </div>

      {phase === 'read' && (
        <div className="clash-tell" data-testid="clash-tell">
          <p className="lead-line">{f.leaderLine}</p>
          <p className="tell-line">{f.tellLine}</p>
          {scoutSees && <p className="scout-line" data-testid="scout-warns">Your guide: "Their leader is not with them. It is a trick: watch your side."</p>}
        </div>
      )}
      {phase === 'resolve' && last && (
        <div className={`clash-tell clash-res s${Math.max(-1, Math.floor(last.score))}`} data-testid="clash-outcome">
          <p className="tell-line">{last.text}</p>
          <p className="deltas"><span>Their nerve −{Math.max(0, Math.min(100, Math.round(last.enLoss)))}</span><span>Your men −{Math.max(0, Math.round(last.myLoss))}</span></p>
        </div>
      )}

      {phase === 'read' && (
        <div className="clash-orders" data-testid="clash-orders">
          {canDuel && <button className="btn primary clash-duel-btn" onClick={() => setPhase('duel')} data-testid="order-duel"><Icon name="sword" /> Call out their leader <small>their nerve is going: beat him and they yield</small></button>}
          {ORDERS.map((o) => (
            <button key={o} className={`btn clash-order${o === 'parley' ? ' wide' : ''}`} onClick={() => order(o)} data-testid={`order-${o}`}>
              <b>{ORDER_INFO[o].name}</b><small>{ORDER_INFO[o].hint}</small>
            </button>
          ))}
          <button className="ghost-btn clash-retreat" onClick={() => { const c = casualties(f.log, info.size, info.troops); onEnd({ fight: f, lost: c.lost, kills: c.kills, retreat: true }); }} data-testid="clash-retreat">Fall back and leave them a bale</button>
        </div>
      )}
      {phase === 'resolve' && (
        <div className="clash-orders">
          <button className="btn primary big" onClick={nextRound} data-testid="clash-next">{f.over ? 'See how it ended' : `Round ${f.round}`}</button>
        </div>
      )}
      {phase === 'duel' && (
        <Duel info={info} round={f.log.length} onDone={(hits) => { const g = settleDuel(f, hits); setF(g); setShownLog(g.log.length); setPhase(g.over ? 'over' : 'read'); }} />
      )}
      {phase === 'over' && (
        <div className="clash-over" data-testid="clash-over">
          <ol className="clash-recap">
            {f.log.map((r, i) => (
              <li key={i} className={r.score >= 1 ? 'good' : r.score < 0 ? 'bad' : ''}>
                {r.order === 'duel' ? <><b>The leader</b> {r.score > 0 ? 'beaten in single combat' : 'beat you back'}</> : <><b>{TELL_SHORT[r.tell]}</b> · {ORDER_INFO[r.order].name}{r.yielded ? ': they yield' : r.score >= 2 ? ': the right answer' : r.score >= 1 ? ': good' : r.score < 0 ? ': a mistake' : ''}</>}
              </li>
            ))}
          </ol>
          {canDuel && <button className="btn" onClick={() => setPhase('duel')} data-testid="order-duel">Call out their leader before they go</button>}
          <button className="btn primary big" onClick={() => onEnd({ fight: f, lost: cas.lost, kills: cas.kills })} data-testid="clash-continue">Continue</button>
        </div>
      )}
    </div>
  );
}

const HIT_LINES = ['You catch him on the shoulder and he staggers.', 'Your stick cracks across his wrist. His rifle drops.', 'You get inside his guard and put him on his back.'];
const MISS_LINES = ['He turns your blow and hits you hard in the ribs.', 'You swing too soon. He laughs and cuffs you across the face.', 'He steps aside and you go sprawling.'];

/** Single combat with their leader: a bar sweeps across his guard; strike when it is in the opening. */
function Duel({ info, round, onDone }: { info: ClashInfo; round: number; onDone: (hits: number) => void }) {
  const [view, setView] = useState({ ex: 0, hits: 0, misses: 0, wait: false, flash: null as 'hit' | 'miss' | null, line: 'He steps out in front of his men. You go to meet him. Strike when his guard opens.' });
  const w = duelWindow(info.temper, info.arms);
  const spot = useMemo(() => { const rng = rngFrom(`${info.seed}:duel:${round}`); return [0, 1, 2].map(() => 0.18 + rng() * (0.64 - w)); }, [info.seed, round, w]);
  // the duel runs on one animation loop: the sweep, the pause after each pass, and his blow if you never strike
  const st = useRef({ ex: 0, hits: 0, misses: 0, wait: false, start: performance.now(), until: 0, done: false });
  const marker = useRef<HTMLSpanElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const done = useRef(onDone); done.current = onDone;
  const period = (ex: number) => [1300, 1150, 1000][ex] ?? 1000;
  const posAt = (now: number) => { const s = st.current; const t = ((now - s.start) / period(s.ex)) % 2; return t < 1 ? t : 2 - t; };
  const resolve = (hit: boolean) => {
    const s = st.current;
    if (s.wait || s.done) return;
    s.wait = true; s.until = performance.now() + 1100;
    if (hit) s.hits++; else s.misses++;
    setView({ ex: s.ex, hits: s.hits, misses: s.misses, wait: true, flash: hit ? 'hit' : 'miss', line: hit ? HIT_LINES[s.ex] : MISS_LINES[s.ex] });
    audio.sfx(hit ? 'melee' : 'chest'); buzz(hit ? 30 : 60);
  };
  useEffect(() => {
    let id = 0;
    const tick = () => {
      const s = st.current, now = performance.now();
      if (s.done) return;
      if (s.wait && now >= s.until) {
        if (s.hits >= 2 || s.misses >= 2 || s.ex >= 2) { s.done = true; done.current(s.hits); return; }
        s.ex++; s.wait = false; s.start = now;
        setView((v) => ({ ...v, ex: s.ex, wait: false, flash: null }));
      }
      const p = posAt(now);
      if (marker.current) marker.current.style.left = `${p * 100}%`;
      if (box.current) box.current.dataset.open = !s.wait && p >= spot[s.ex] && p <= spot[s.ex] + w ? '1' : '0';
      // too slow: after three sweeps he strikes first
      if (!s.wait && now - s.start > period(s.ex) * 6) resolve(false);
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const strike = () => { const p = posAt(performance.now()); resolve(p >= spot[st.current.ex] && p <= spot[st.current.ex] + w); };
  return (
    <div className="clash-duelbox" data-testid="duel" data-open="0" data-exchange={view.ex + 1} ref={box}>
      <div className="duel-faces">
        <img className={view.flash === 'miss' ? 'shake' : ''} src={info.heroImg} alt="" />
        <span className="duel-score" data-testid="duel-score">{view.hits} – {view.misses}</span>
        <img className={view.flash === 'hit' ? 'shake' : ''} src={info.leaderImg} alt="" onError={(e) => { e.currentTarget.src = 'art/troops/reformed.jpg'; }} />
      </div>
      <p className="duel-line" data-testid="duel-line">{view.line}</p>
      <div className="duel-track" aria-hidden>
        <i className="duel-gap" style={{ left: `${spot[view.ex] * 100}%`, width: `${w * 100}%` }} />
        <span className="duel-mark" ref={marker} />
      </div>
      <small className="duel-ex">Pass {view.ex + 1} of 3 · win two</small>
      <button className="btn primary big" disabled={view.wait} onPointerDown={strike} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); strike(); } }} data-testid="duel-strike">Strike</button>
    </div>
  );
}
