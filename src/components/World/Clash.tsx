import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../Icon';
import type { FieldUnit } from './BattleField';
import { FieldCanvas } from './FieldBattle';
import type { PartyState } from '../../game/systems/caravan';
import { TROOPS } from '../../data/caravan';
import { BAND_ART } from './BattleField';
import { audio } from '../../game/audio/engine';
import { buzz } from '../../game/feel';
import { fmt } from '../../game/economy/money';
import { FORMATIONS, GROUNDS, TEMPER_WORD, duelWindow, sergeantWord, rngFrom, type Formation, type GroundId, type Leader, type Result, type Temper } from '../../game/systems/combat';
import { battleOdds, command, losses, simulate, startBattle, step, volley, volleyRange, LIMIT, type Battle, type GOrder, type Group } from '../../game/systems/battle';
import './Clash.css';

export interface ClashInfo {
  bandId: string; bandName: string; place: string; field: string;
  size: number; enPow: number; myPow: number;
  leader?: Leader; leaderImg: string; heroImg: string; heroArt: string;
  temper: Temper; known: boolean; scout: boolean;
  grounds: GroundId[]; camels: number; mountedMen: boolean;
  sergeant?: string; arms: number; armsLine: string; seed: string;
  mySide: FieldUnit[]; troops: Record<string, number>; party: PartyState;
  /** the band's rifles and whether they ride */
  rifles: number; mounted: boolean;
  /** what a lost fight costs: loads taken and coin */
  stakes: { loads: number; cash: number };
}
export interface ClashEnd { fight: { over?: Result; duel?: 'won' | 'lost' }; lost: Record<string, number>; kills: number; retreat?: boolean; auto?: boolean; hurt?: Record<string, number>; heroDown?: boolean }

const HEAD: Record<string, string> = { run: 'They break and run', yield: 'They lay down their arms', withdraw: 'They pull back', draw: 'Neither side gives way', pushed: 'You are pushed back', broken: 'Your line breaks' };
const GROUP_NAME: Record<string, string> = { all: 'Everyone', foot: 'Foot', rifles: 'Rifles', riders: 'Riders', hero: 'Hassan' };
const ORDER_NAME: Record<GOrder, string> = { hold: 'Hold', advance: 'Advance', charge: 'Charge', flank: 'Flank', move: 'Move', back: 'Fall back' };

/** A road fight: choose the ground and draw up the men, then fight it out on the field. */
export function Clash({ info, onEnd, onBack }: { info: ClashInfo; onEnd: (e: ClashEnd) => void; onBack: () => void }) {
  const [ground, setGround] = useState<GroundId>(info.grounds.includes('camels') ? 'camels' : info.grounds[info.grounds.length - 1]);
  // the men draw up by themselves: riders out on the wings when you have them, a line otherwise
  const [formation] = useState<Formation>(info.mountedMen ? 'wings' : 'line');
  const band = BAND_ART[info.bandId] ?? BAND_ART['egypt-rural-highway-robbers'];
  const setup = useMemo(() => ({
    me: { troops: info.troops, rifles: info.party.arms ?? 0, heroArmed: (info.party.arms ?? 0) > 0, sergeant: !!info.sergeant },
    band: { size: info.size, rifles: info.rifles, mounted: info.mounted, man: band.man, leader: band.leader, leaderName: info.leader?.name, strength: info.enPow, bandWord: info.bandName },
    ground, formation, temper: info.temper, seed: info.seed,
  }), [info, ground, formation, band]);
  const odds = useMemo(() => battleOdds(setup, true), [setup]);
  const autoOdds = useMemo(() => battleOdds(setup, !!info.sergeant), [setup, info.sergeant]);
  const [fighting, setFighting] = useState(false);

  const auto = () => {
    const done = simulate(setup, !!info.sergeant);
    const L = losses(done);
    onEnd({ fight: { over: done.over }, lost: L.lost, kills: L.kills, auto: true, hurt: L.hurt, heroDown: L.heroDown });
  };

  if (fighting) return <Fight info={info} setup={setup} onEnd={onEnd} />;

  const L = info.leader;
  const mine = Object.entries(info.troops).filter(([, n]) => (n ?? 0) > 0);
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
        <div className="clash-forces" data-testid="clash-forces">
          <span><b>Your side</b> Hassan{mine.map(([id, n]) => `, ${n} ${(n ?? 0) > 1 ? TROOPS[id]?.plural.toLowerCase() : TROOPS[id]?.name.toLowerCase()}`).join('')}{(info.party.arms ?? 0) > 0 ? ` · ${info.party.arms} spare rifle${info.party.arms === 1 ? '' : 's'}` : ''}</span>
        </div>
        <div className="clash-stakes" data-testid="clash-stakes">
          <div className="win"><b>If you win</b><span>{L ? `${fmt(L.bounty)} on his head, ` : ''}their arms and purse, prisoners for the police post, and your men grow harder</span></div>
          <div className="lose"><b>If you lose</b><span>{info.stakes.loads === 1 ? 'A load' : `${info.stakes.loads} loads`} and about {fmt(info.stakes.cash)} taken. Men who fall may not get up. Hassan may be hurt.</span></div>
        </div>
        {info.sergeant && <p className="clash-sarge" data-testid="clash-sergeant"><b>Sergeant {info.sergeant}:</b> "{sergeantWord({ temper: info.temper, known: info.known, grudge: L?.grudge, ground })}"</p>}
        <div className="clash-label">Your ground</div>
        <div className="clash-chips" role="radiogroup">
          {info.grounds.map((id) => (
            <button key={id} className={`clash-chip ${ground === id ? 'on' : ''}`} onClick={() => setGround(id)} data-testid={`ground-${id}`} role="radio" aria-checked={ground === id}>
              <b>{GROUNDS[id].name}</b><small>{GROUND_NOTE[id] ?? GROUNDS[id].note}</small>
            </button>
          ))}
        </div>
        <div className="clash-odds" data-testid="clash-odds"><span>Your chance, fought well</span><b>{odds}%</b></div>
        <div className="clash-go">
          <button className="btn primary big" onClick={() => { audio.sfx('chest'); buzz(25); setFighting(true); }} data-testid="clash-begin"><Icon name="sword" /> Lead the fight</button>
          <button className="btn" onClick={auto} data-testid="clash-auto"><Icon name="people" /> Let the sergeant handle it <small>{autoOdds}%{info.sergeant ? '' : ' · your oldest hand takes charge'}</small></button>
          <button className="ghost-btn" onClick={onBack} data-testid="clash-back">Back</button>
        </div>
      </div>
    </div>
  );
}

const GROUND_NOTE: Partial<Record<GroundId, string>> = {
  walls: 'Stone walls: men who stay behind them are hard to hit',
  camels: 'Fire over the loads: men who stay put are half as easy to hit',
  ridge: 'Your rifles reach a quarter further',
  bank: 'A ditch to fire from: a little cover, a little more reach',
  wadi: 'Hidden ground: riders get round them unseen',
  road: 'Open ground, no help from it',
};
const FORM_NOTE: Record<Formation, string> = {
  line: 'Wide: every rifle has a clear shot',
  square: 'Tight: holds against riders, harder to hit',
  wings: 'Riders start out on both flanks',
};

interface View { t: number; me: number; them: number; counts: Record<string, number>; enemyLeft: number; downN: number; feed: { t: number; text: string; side: number; big?: boolean }[]; fire: 'free' | 'hold'; heroAt: 'back' | 'front'; loaded: number; rifles: number; inRange: boolean; perfect: boolean; leaderUp: boolean; over?: Result; orders: Record<Group, GOrder>; charging: boolean; melee: boolean }

function viewOf(b: Battle): View {
  const counts: Record<string, number> = { foot: 0, rifles: 0, riders: 0 };
  let loaded = 0, inRange = false;
  for (const m of b.men) {
    if (m.side === 0 && m.state === 'up' && !m.fleeing && !m.hero) { counts[m.group]++; if (m.rifle && m.group === 'rifles' && m.load <= 0) loaded++; }
  }
  const enemy = b.men.filter((m) => m.side === 1 && m.state === 'up' && !m.fleeing);
  const vr = volleyRange(b);
  inRange = vr.inRange;
  const mine = b.men.filter((m) => m.side === 0 && m.state === 'up' && !m.fleeing);
  const melee = enemy.some((e) => mine.some((m) => Math.hypot(e.x - m.x, e.y - m.y) < 5));
  return {
    t: b.t, me: Math.round(b.morale[0]), them: Math.round(b.morale[1]), counts, enemyLeft: enemy.length, downN: b.men.filter((m) => m.side === 1 && (m.state === 'down' || m.state === 'dead')).length,
    feed: b.feed.slice(-3), fire: b.fire, heroAt: b.heroAt, loaded, rifles: counts.rifles, inRange, perfect: vr.perfect, melee,
    charging: b.orders[0].foot.o === 'charge' || b.orders[0].rifles.o === 'charge',
    leaderUp: b.men.some((m) => m.leader && m.state === 'up' && !m.fleeing), over: b.over,
    orders: { foot: b.orders[0].foot.o, rifles: b.orders[0].rifles.o, riders: b.orders[0].riders.o },
  };
}

/** One plain line over the field: what is happening and what to do about it. */
function coach(v: View, canDuel: boolean) {
  if (canDuel) return 'Their nerve is going. Call out their leader!';
  if (v.charging) return v.them < 30 ? 'They are breaking! Keep at them.' : v.me < 35 ? 'Your men are wavering. Hold the line?' : 'In among them!';
  if (v.them < 40) return 'They are wavering: charge them now!';
  if (v.melee) return 'They are on you! Charge, or volley the next ones in.';
  if (v.rifles === 0) return v.inRange ? 'Let them come… then charge.' : 'They are coming. Charge when they are close.';
  if (!v.loaded) return 'Reloading…';
  if (v.perfect) return 'NOW! Volley!';
  if (v.inRange) return 'Steady… let them come closer.';
  return 'They are coming. Wait for the gold, then volley.';
}

/** The fight itself: the field fills the screen, the orders sit under the thumb. */
function Fight({ info, setup, onEnd }: { info: ClashInfo; setup: Parameters<typeof startBattle>[0]; onEnd: (e: ClashEnd) => void }) {
  const bRef = useRef<Battle | null>(null);
  if (!bRef.current) { bRef.current = startBattle(setup); bRef.current.fire = 'hold'; (window as unknown as { __tofBattle?: Battle }).__tofBattle = bRef.current; }
  const [v, setV] = useState<View>(() => viewOf(bRef.current!));
  const [sel, setSel] = useState<'all' | Group | 'hero'>('all');
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1.4);
  // the big word over the field after a volley: how well it was timed and what it did
  const [shout, setShout] = useState<{ k: number; text: string; perfect: boolean } | null>(null);
  const [duel, setDuel] = useState(false);
  const seen = useRef({ shots: 0, cues: 0, ui: 0, shotSfx: 0, feed: 0 });
  const live = useRef({ paused, speed, duel }); live.current = { paused, speed, duel };

  const frame = (dt: number) => {
    const b = bRef.current; if (!b) return;
    const L = live.current;
    if (!L.paused && !L.duel && !b.over) {
      let left = dt * ((window as unknown as { __tofBattleSpeed?: number }).__tofBattleSpeed ?? L.speed);
      while (left > 0) { const d = Math.min(0.05, left); step(b, d); left -= d; }
      // sounds: rifles as they fire (never a din), and the big moments
      const now = performance.now();
      if (b.shots.length && b.shots[b.shots.length - 1].t > seen.current.shots) {
        seen.current.shots = b.shots[b.shots.length - 1].t;
        if (now - seen.current.shotSfx > 220) { audio.sfx('shot'); seen.current.shotSfx = now; }
      }
      while (seen.current.cues < b.cues.length) {
        const c = b.cues[seen.current.cues++];
        if (c.kind === 'volley') { audio.sfx('volley'); buzz(40); }
        else if (c.kind === 'charge') audio.sfx('melee');
        else if (c.kind === 'hero') buzz(70);
        else if (c.kind === 'leader' || c.kind === 'break') buzz(30);
      }
    }
    if (performance.now() - seen.current.ui > 160) { seen.current.ui = performance.now(); setV(viewOf(b)); }
  };

  const give = (o: GOrder) => {
    const b = bRef.current; if (!b || b.over) return;
    if (sel === 'hero') return;
    command(b, sel, o);
    audio.sfx(o === 'charge' ? 'melee' : 'tap'); buzz(12);
    setV(viewOf(b));
  };
  const tapGround = (x: number, y: number) => {
    const b = bRef.current; if (!b || b.over) return;
    if (sel === 'hero') { b.heroAt = y < 80 ? 'front' : 'back'; setV(viewOf(b)); return; }
    command(b, sel, 'move', { x, y });
    audio.sfx('tap');
  };
  const fireToggle = () => { const b = bRef.current; if (!b) return; b.fire = b.fire === 'free' ? 'hold' : 'free'; audio.sfx('tap'); setV(viewOf(b)); };
  const loose = () => {
    const b = bRef.current; if (!b || b.over) return;
    const r = volley(b);
    if (!r.fired) { audio.sfx('tap'); return; }
    buzz(r.quality === 'perfect' ? 70 : 40);
    setShout({ k: Date.now(), perfect: r.quality === 'perfect', text: r.quality === 'perfect' ? (r.hits ? `Perfect! ${r.hits} down` : 'Perfect! They falter') : r.hits ? `${r.hits} down` : r.quality === 'far' ? 'Too far' : 'Missed' });
    window.setTimeout(() => setShout((x) => (x && Date.now() - x.k > 1200 ? null : x)), 1300);
    setV(viewOf(b));
  };
  // one order for everyone: charge (riders sweep round their flank, Hassan leads), or hold the line again
  const charge = () => {
    const b = bRef.current; if (!b || b.over) return;
    command(b, 'foot', 'charge'); command(b, 'rifles', 'charge');
    command(b, 'riders', b.men.some((m) => m.side === 0 && m.group === 'riders' && m.y > 55) ? 'flank' : 'charge');
    b.fire = 'free'; // Hassan stays by the camels, steadying the men near him
    audio.sfx('melee'); buzz(30); setV(viewOf(b));
  };
  const holdLine = () => {
    const b = bRef.current; if (!b || b.over) return;
    command(b, 'all', 'hold'); b.heroAt = 'back'; b.fire = 'hold';
    audio.sfx('tap'); buzz(12); setV(viewOf(b));
  };
  const hero = (at: 'back' | 'front') => { const b = bRef.current; if (!b) return; b.heroAt = at; audio.sfx('tap'); setV(viewOf(b)); };
  const end = (retreat = false) => {
    const b = bRef.current!; const L = losses(b);
    onEnd({ fight: { over: retreat ? 'pushed' : b.over, duel: b.duel }, lost: L.lost, kills: L.kills, retreat, hurt: L.hurt, heroDown: L.heroDown });
  };
  // the duel: their leader against Hassan, the fight held while it lasts
  const duelDone = (hits: number) => {
    const b = bRef.current!; setDuel(false);
    const lead = b.men.find((m) => m.leader); const me = b.men.find((m) => m.hero);
    if (hits >= 2 && lead) {
      lead.state = 'down'; b.duel = 'won'; b.morale[1] -= 45;
      b.feed.push({ t: b.t, text: `Hassan puts ${lead.name} on his back in front of his men.`, side: 0, big: true });
    } else if (me) {
      me.hp = Math.max(1, me.hp - 1); b.duel = 'lost'; b.morale[0] -= 15; b.morale[1] = Math.min(100, b.morale[1] + 10);
      b.feed.push({ t: b.t, text: `${lead?.name ?? 'Their leader'} beats Hassan back. His men cheer.`, side: 1, big: true });
    }
    setV(viewOf(b));
  };

  const groups = (['rifles', 'foot', 'riders'] as Group[]).filter((g) => (info.mySide.some((u) => u.id !== 'you') ? bRef.current!.men.some((m) => m.side === 0 && m.group === g && !m.hero) : false));
  const canDuel = !v.over && v.leaderUp && v.them < 50 && !bRef.current!.duel && !!info.leader;
  const meName = GROUP_NAME[sel];
  const cur = sel === 'all' || sel === 'hero' ? undefined : v.orders[sel];
  const hasRifles = v.counts.rifles > 0;
  const left = Math.max(0, Math.ceil(LIMIT - v.t));
  const L = v.over ? losses(bRef.current!) : null;
  return (
    <div className={`clash clash-fight fb ${v.over ? 'phase-over' : ''}`} data-testid="clash" data-over={v.over ?? ''} data-t={v.t.toFixed(1)}>
      <div className="clash-bars">
        <div className="clash-title"><small>{v.over ? 'THE FIGHT IS OVER' : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`}</small><b>{info.leader?.name ?? info.bandName}</b>
          {!v.over && <span className="fb-time">
            <button className={`fb-mini ${paused ? 'on' : ''}`} onClick={() => setPaused((p) => !p)} aria-label={paused ? 'Resume' : 'Pause'} data-testid="clash-pause">{paused ? '▶' : 'II'}</button>
            <button className={`fb-mini ${speed > 2 ? 'on' : ''}`} onClick={() => setSpeed((s) => (s > 2 ? 1.4 : 2.4))} aria-label="Speed" data-testid="clash-speed">{speed > 2 ? '»' : '›'}</button>
          </span>}
        </div>
        <div className="clash-bar cb-me" title="Your men's nerve"><span>Your men · {v.counts.foot + v.counts.rifles + v.counts.riders + 1}</span><i><u style={{ width: `${Math.min(100, v.me)}%` }} /></i><em data-testid="morale-me">{v.me}</em></div>
        <div className="clash-bar cb-them" title="Their nerve"><span>Their nerve · {v.downN} down</span><i><u style={{ width: `${Math.min(100, v.them)}%` }} /></i><em data-testid="morale-them">{v.them}</em></div>
      </div>
      <div className="clash-field fb-field">
        <div className={`fb-shake ${shout ? 'go' : ''}`} key={shout?.k ?? 0}><FieldCanvas battle={bRef} bandId={info.bandId} field={info.field} camels={info.camels} wall={setup.ground === 'camels'} selected="none" onTap={() => {}} frame={frame} /></div>
        <ol className="fb-feed" data-testid="clash-feed">
          {v.feed.map((f, i) => <li key={`${f.t}-${i}`} className={`${f.side === 0 ? 'mine' : 'theirs'}${f.big ? ' big' : ''}`} style={{ opacity: Math.max(0.25, 1 - (v.t - f.t) / 9) }}>{f.text}</li>)}
        </ol>
        {!v.over && !duel && <p className={`fb-coach ${v.perfect && v.loaded && !v.charging ? 'now' : ''}`} data-testid="clash-coach">{coach(v, canDuel)}</p>}
        {shout && <div key={shout.k} className={`fb-shout ${shout.perfect ? 'perfect' : ''}`}>{shout.text}</div>}
        {paused && !v.over && <div className="fb-paused">Paused</div>}
        {v.over && <div className={`clash-banner ${v.over === 'run' || v.over === 'yield' || v.over === 'withdraw' ? 'win' : v.over === 'draw' ? 'draw' : 'loss'}`} data-testid="clash-banner">{HEAD[v.over]}</div>}
      </div>

      {!v.over && !duel && (
        <div className="fb-orders simple" data-testid="clash-orders">
          {canDuel && <button className="btn primary fb-duel" onClick={() => setDuel(true)} data-testid="order-duel"><b>Call out their leader</b><small>beat him and the whole band yields</small></button>}
          <div className="fb-big">
            {v.rifles > 0 && (
              <button className={`fb-btn volley ${v.loaded && v.perfect ? 'perfect' : ''} ${v.loaded ? '' : 'loading'}`} onClick={loose} disabled={!v.loaded || v.charging} data-testid="volley" style={{ ['--load' as string]: `${Math.round((v.loaded / Math.max(1, v.rifles)) * 100)}%` }}>
                <b>Volley</b><small>{v.charging ? 'in the charge' : !v.loaded ? 'reloading' : v.perfect ? 'NOW' : v.inRange ? 'closer…' : 'wait'}</small>
              </button>
            )}
            {v.charging
              ? <button className="fb-btn hold" onClick={holdLine} data-testid="ord-hold"><b>Hold</b><small>back to the line</small></button>
              : <button className={`fb-btn charge ${v.them < 40 || v.melee ? 'urge' : ''}`} onClick={charge} data-testid="ord-charge"><b>Charge</b><small>{v.counts.riders ? 'riders round the flank' : 'everyone in'}</small></button>}
          </div>
          <button className="ghost-btn clash-retreat" onClick={() => end(true)} data-testid="clash-retreat">Fall back and leave them a bale</button>
        </div>
      )}
      {duel && <Duel info={info} round={Math.round(v.t)} onDone={duelDone} />}
      {v.over && L && (
        <div className="clash-over" data-testid="clash-over">
          <p className="fb-recap">{L.kills ? `${L.kills} of them down${L.taken ? `, ${L.taken} taken alive` : ''}.` : 'None of them fell.'} {Object.keys(L.lost).length ? `You lost ${Object.entries(L.lost).map(([id, n]) => `${n} ${n > 1 ? TROOPS[id]?.plural.toLowerCase() : TROOPS[id]?.name.toLowerCase()}`).join(', ')}.` : 'None of your men were killed.'}{Object.keys(L.hurt).length ? ` ${Object.values(L.hurt).reduce((a, n) => a + n, 0)} wounded will mend.` : ''}{L.heroDown ? ' Hassan is hurt.' : ''}</p>
          <button className="btn primary big" onClick={() => end()} data-testid="clash-continue">Continue</button>
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
