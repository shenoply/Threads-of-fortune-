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
export interface ClashEnd { fight: { over?: Result; duel?: 'won' | 'lost' }; lost: Record<string, number>; kills: number; retreat?: boolean; auto?: boolean; hurt?: Record<string, number>; heroDown?: boolean; /** what the fight's moments cost on the side: loads let go, money paid them to ride off */ cost?: { loads?: number; paid?: number } }

const HEAD: Record<string, string> = { run: 'They break and run', yield: 'They lay down their arms', withdraw: 'They pull back', draw: 'Neither side gives way', pushed: 'You are pushed back', broken: 'Your line breaks' };
const GROUP_NAME: Record<string, string> = { all: 'Everyone', foot: 'Foot', rifles: 'Rifles', riders: 'Riders', hero: 'Hassan' };
const ORDER_NAME: Record<GOrder, string> = { hold: 'Hold', advance: 'Advance', charge: 'Charge', flank: 'Flank', move: 'Move', back: 'Fall back' };

/** the best ground the place offers: the camels knelt as a wall when there are camels, else the last listed */
export const bestGround = (info: ClashInfo): GroundId => (info.grounds.includes('camels') ? 'camels' : info.grounds[info.grounds.length - 1]);
/** the battle set up for this band on this ground, the men drawn up by themselves */
export function setupOf(info: ClashInfo, ground: GroundId = bestGround(info)) {
  const band = BAND_ART[info.bandId] ?? BAND_ART['egypt-rural-highway-robbers'];
  const formation: Formation = info.mountedMen ? 'wings' : 'line';
  return {
    me: { troops: info.troops, rifles: info.party.arms ?? 0, heroArmed: (info.party.arms ?? 0) > 0, sergeant: !!info.sergeant },
    band: { size: info.size, rifles: info.rifles, mounted: info.mounted, man: band.man, leader: band.leader, leaderName: info.leader?.name, strength: info.enPow, bandWord: info.bandName },
    ground, formation, temper: info.temper, seed: info.seed,
  };
}

/** A road fight. `direct`: straight onto the field on the best ground (the road encounter's Fight);
 *  otherwise the old screen first, to choose the ground. */
export function Clash({ info, onEnd, onBack, direct = false }: { info: ClashInfo; onEnd: (e: ClashEnd) => void; onBack: () => void; direct?: boolean }) {
  const [ground, setGround] = useState<GroundId>(bestGround(info));
  const setup = useMemo(() => setupOf(info, ground), [info, ground]);
  const odds = useMemo(() => battleOdds(setup, true), [setup]);
  const autoOdds = useMemo(() => battleOdds(setup, !!info.sergeant), [setup, info.sergeant]);
  const [fighting, setFighting] = useState(false);

  const auto = () => {
    const done = simulate(setup, !!info.sergeant);
    const L = losses(done);
    onEnd({ fight: { over: done.over }, lost: L.lost, kills: L.kills, auto: true, hurt: L.hurt, heroDown: L.heroDown });
  };

  if (fighting || direct) return <Fight info={info} setup={setup} onEnd={onEnd} />;

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

/** The few moments in a fight where the outcome turns: the field holds still and you choose. Each comes
 *  at most once a fight. */
type MomentId = 'contact' | 'charge-in' | 'leader' | 'rally' | 'finish' | 'flank' | 'powder' | 'terms' | 'bolt';
/** the painted still behind each moment (art/battle/moments/<name>.webp); hidden until the painting exists */
const MOMENT_ART: Record<MomentId, string> = { contact: 'volley', 'charge-in': 'charge', leader: 'duel', rally: 'waver', finish: 'surrender', flank: 'flank', powder: 'powder', terms: 'terms', bolt: 'bolt' };
interface Choice { id: string; label: string; note: string; primary?: boolean }

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
  const [speed, setSpeed] = useState(1.8);
  const [moment, setMoment] = useState<MomentId | null>(null);
  const momentsDone = useRef(new Set<MomentId>());
  // 'let them come closer': the rifles fire by themselves at the best moment
  const autoVolley = useRef(false);
  // what the moments cost besides the fight itself, carried to the account
  const cost = useRef<{ loads: number; paid: number }>({ loads: 0, paid: 0 });
  const volleys = useRef(0);
  // a careful volley: the next one aims better
  const aimBonus = useRef(false);
  const ended = useRef(false);
  // the big word over the field after a volley: how well it was timed and what it did
  const [shout, setShout] = useState<{ k: number; text: string; perfect: boolean } | null>(null);
  const [duel, setDuel] = useState(false);
  const seen = useRef({ shots: 0, cues: 0, ui: 0, shotSfx: 0, feed: 0 });
  const live = useRef({ paused, speed, duel, moment }); live.current = { paused, speed, duel, moment };

  const frame = (dt: number) => {
    const b = bRef.current; if (!b) return;
    const L = live.current;
    if (!L.paused && !L.duel && !L.moment && !b.over) {
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
        else if (c.kind === 'hero') { audio.sfx('hero-down'); buzz(70); }
        else if (c.kind === 'leader') { audio.sfx('leader-down'); buzz(30); }
        else if (c.kind === 'break') { audio.sfx('melee'); buzz(30); }
      }
    }
    if (autoVolley.current && !b.over && !L.moment) {
      const vr = volleyRange(b);
      if (vr.perfect || (vr.inRange && b.men.some((m) => m.side === 1 && m.state === 'up' && b.men.some((x) => x.side === 0 && Math.hypot(x.x - m.x, x.y - m.y) < 9)))) { autoVolley.current = false; loose(); }
    }
    if (performance.now() - seen.current.ui > 160) {
      seen.current.ui = performance.now();
      const nv = viewOf(b);
      setV(nv);
      if (!L.paused && !L.duel && !L.moment && !b.over) {
        const m = pickMoment(nv, b);
        if (m) { momentsDone.current.add(m); live.current.moment = m; setMoment(m); audio.sfx('bell'); buzz(20); }
      }
    }
  };
  const pickMoment = (nv: View, b: Battle): MomentId | null => {
    const done = momentsDone.current;
    // the turning points always come; of the side troubles, two a fight at most
    const side = ['flank', 'powder', 'terms', 'bolt'].filter((k) => done.has(k as MomentId)).length >= 2;
    const seedOf = (k: string) => { let h = 0; for (const ch of `${info.seed}:${k}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return (h % 1000) / 1000; };
    // their riders swing wide round your flank
    if (!side && !done.has('flank') && info.mounted && nv.t > 8 && b.men.some((m) => m.side === 1 && m.state === 'up' && !m.fleeing && m.mounted && (m.x < 18 || m.x > 82) && m.y > 40)) return 'flank';
    // the powder runs short after a hot fight
    if (!side && !done.has('powder') && nv.rifles > 0 && volleys.current >= 3 && nv.t > 25 && nv.them > 30) return 'powder';
    // their leader shouts an offer while both sides are hurting
    if (!side && !done.has('terms') && info.leader && nv.leaderUp && nv.t > 18 && nv.them < 60 && nv.them > 30 && nv.me < 75 && seedOf('terms') < 0.5) return 'terms';
    // a camel bolts with the loads in the din
    if (!side && !done.has('bolt') && info.camels > 0 && nv.t > 12 && nv.t < 60 && seedOf('bolt') < 0.35 && Math.floor(nv.t) === 12 + Math.floor(seedOf('boltT') * 20)) return 'bolt';
    if (!done.has('rally') && nv.me < 40 && nv.t > 5) return 'rally';
    if (!done.has('contact') && !done.has('charge-in') && nv.t > 2.5 && nv.rifles > 0 && nv.inRange && !nv.charging && !nv.melee && nv.loaded > 0) return 'contact';
    if (!done.has('charge-in') && !done.has('contact') && nv.t > 2.5 && nv.rifles === 0 && nv.inRange && !nv.charging) return 'charge-in';
    if (!done.has('leader') && info.leader && nv.leaderUp && nv.them < 70 && nv.t > 10 && !b.duel) return 'leader';
    if (!done.has('finish') && nv.them < 35 && nv.enemyLeft > 0) return 'finish';
    return null;
  };
  const shotOdds = Math.min(0.6, Math.max(0.2, 0.3 + (setup.me.heroArmed ? 0.15 : 0) + (info.scout ? 0.05 : 0)));
  const quarterOdds = () => { const b = bRef.current!; const ld = b.men.some((m) => m.leader && m.state !== 'up'); return Math.min(0.9, Math.max(0.2, 0.35 + (35 - b.morale[1]) / 60 + (ld ? 0.25 : 0))); };
  const choicesFor = (m: MomentId): { title: string; line: string; choices: Choice[] } => {
    const lead = info.leader?.name ?? 'Their leader';
    if (m === 'contact') return { title: 'They are in range', line: `${v.enemyLeft} men coming on. Your ${v.rifles === 1 ? 'rifle is' : `${v.rifles} rifles are`} loaded.`, choices: [
      { id: 'volley', label: 'Volley now', note: 'a sure hit at this range', primary: true },
      { id: 'closer', label: 'Let them come closer', note: 'a heavier volley, if the men hold their nerve' },
      { id: 'charge', label: 'Charge them', note: 'meet them before they can shoot' },
    ] };
    if (m === 'charge-in') return { title: 'They are coming on', line: 'You have no rifles to meet them with. Stand, or go at them.', choices: [
      { id: 'hold', label: 'Hold the line', note: info.grounds.includes('camels') ? 'behind the camels: let them come to you' : 'let them come to you', primary: true },
      { id: 'charge', label: 'Charge them', note: 'hit them first, before they settle' },
    ] };
    if (m === 'leader') return { title: `${lead} shows himself`, line: 'He rides out in front, shouting his men on.', choices: [
      { id: 'shot', label: 'Take the shot yourself', note: `about ${Math.round(shotOdds * 100)}% to bring him down; miss and he knows where you are`, primary: true },
      { id: 'duel', label: 'Call him out', note: 'single combat: beat him and the whole band yields' },
      { id: 'keep', label: 'Keep to the fight', note: 'leave him be' },
    ] };
    if (m === 'rally') return { title: 'Your men are wavering', line: 'They keep looking back at the loads.', choices: [
      { id: 'rally', label: 'Hassan goes to the front', note: 'their nerve comes back; you stand in the open', primary: true },
      { id: 'fallback', label: 'Fall back, leave them a bale', note: 'the fight ends; a load and some coin lost' },
      { id: 'keep', label: 'Hold on', note: 'and hope they do' },
    ] };
    if (m === 'flank') return { title: 'Riders on your flank', line: 'A knot of their horsemen has swung wide, round the end of your line, towards the loads.', choices: [
      { id: 'turn', label: 'Turn the line to face them', note: 'your rifles meet them; the front gets thinner', primary: true },
      ...(v.counts.riders > 0 ? [{ id: 'riders', label: 'Send your riders at them', note: 'horse against horse, away from the line' }] : []),
      { id: 'letgo', label: 'Let them have a load', note: 'they will ride off with one bale; the line holds' },
    ] };
    if (m === 'powder') return { title: 'The powder is running low', line: 'Your rifles have been at it hard. A few rounds a man are left in the pouches.', choices: [
      { id: 'count', label: 'Make every shot count', note: 'hold fire for close range: the next volley aims truer', primary: true },
      { id: 'charge', label: 'Close with them before it runs out', note: 'go in with the butt and the stick' },
      { id: 'hold', label: 'Pull in behind the camels', note: 'save it for when they come' },
    ] };
    if (m === 'terms') { const ask = Math.max(100, Math.round((info.stakes.cash || 200) * 0.6)); return { title: `${lead} calls out`, line: `"Enough! Give us ${fmt(ask)} for our trouble and we ride off. Nobody else dies today."`, choices: [
      { id: 'refuse', label: 'Refuse', note: 'your men cheer you; so do his', primary: true },
      { id: 'pay', label: `Pay ${fmt(ask)}`, note: 'the fight ends here, with everyone you have left' },
      { id: 'counter', label: 'Offer half', note: 'he may take it; he may take it as an insult' },
    ] }; }
    if (m === 'bolt') return { title: 'A camel bolts', line: 'A shot too close, and one of the loaded camels is off down the road with your bales swinging.', choices: [
      { id: 'chase', label: 'Send a man after it', note: 'one fewer in the line for a while', primary: true },
      { id: 'letbolt', label: 'Let it go', note: 'you may find it after, or you may not' },
    ] };
    return { title: 'They are breaking', line: 'Some are already running. The rest are looking for a way out.', choices: [
      { id: 'quarter', label: 'Offer them quarter', note: `about ${Math.round(quarterOdds() * 100)}% they lay down their arms: the most prisoners, no more blood`, primary: true },
      { id: 'charge', label: 'Charge and finish it', note: 'more of them fall; a little more risk' },
    ] };
  };
  const choose = (id: string) => {
    const b = bRef.current; if (!b) return;
    const lead = b.men.find((m) => m.leader && m.state === 'up');
    const me = b.men.find((m) => m.hero);
    setMoment(null); live.current.moment = null;
    if (id === 'volley') loose();
    else if (id === 'closer') { autoVolley.current = true; b.fire = 'hold'; say(b, 'Steady. Not yet… not yet…'); }
    else if (id === 'charge') charge();
    else if (id === 'hold') holdLine();
    else if (id === 'duel') setDuel(true);
    else if (id === 'shot' && lead) {
      if (b.rng() < shotOdds) { lead.state = 'down'; b.morale[1] -= 40; b.cues.push({ t: b.t, kind: 'leader' }); say(b, `Hassan fires. ${lead.name} pitches out of the saddle.`, true); audio.sfx('volley'); buzz(60); }
      else { b.morale[1] = Math.min(100, b.morale[1] + 5); if (me && b.rng() < 0.3) me.hp = Math.max(1, me.hp - 1); say(b, `Hassan fires and misses. ${lead.name} turns his men toward the shot.`); audio.sfx('shot'); }
    } else if (id === 'rally') { b.heroAt = 'front'; b.morale[0] = Math.min(100, b.morale[0] + 25); say(b, 'Hassan walks out in front of the camels. The men stop looking back.', true); buzz(30); }
    else if (id === 'fallback') { end(true); return; }
    else if (id === 'turn') { command(b, 'rifles', 'hold'); command(b, 'foot', 'hold'); b.morale[1] -= 10; b.morale[0] -= 4; say(b, 'The line wheels to face the riders. A ragged volley empties two saddles.', true); audio.sfx('volley'); }
    else if (id === 'riders') { command(b, 'riders', 'charge'); b.morale[1] -= 6; say(b, 'Your riders gallop out to meet them.', true); audio.sfx('melee'); }
    else if (id === 'letgo') { cost.current.loads += 1; b.morale[0] -= 3; say(b, 'They cut a bale loose and ride off with it. The line holds.'); }
    else if (id === 'count') { aimBonus.current = true; autoVolley.current = true; b.fire = 'hold'; say(b, '"Wait for them. Wait." The men hold their fire.'); }
    else if (id === 'refuse') { b.morale[0] = Math.min(100, b.morale[0] + 6); b.morale[1] = Math.min(100, b.morale[1] + 4); say(b, 'You shout back an answer his mother would not like. Your men laugh.', true); }
    else if (id === 'pay' || id === 'counter') {
      const ask = Math.max(100, Math.round((info.stakes.cash || 200) * 0.6));
      const half = id === 'counter';
      if (!half || b.rng() < 0.5 + (60 - b.morale[1]) / 100) {
        cost.current.paid += half ? Math.round(ask / 2) : ask;
        b.over = 'withdraw'; say(b, half ? `He spits, and takes it. ${fmt(Math.round(ask / 2))} changes hands, and they ride off.` : `${fmt(ask)} changes hands. They ride off without looking back.`, true);
      } else { b.morale[1] = Math.min(100, b.morale[1] + 8); say(b, '"Half? Half!" He takes it badly, and his men come on harder.'); }
    }
    else if (id === 'chase') { const man = b.men.find((x) => x.side === 0 && x.state === 'up' && !x.hero && !x.fleeing && x.group !== 'rifles') ?? b.men.find((x) => x.side === 0 && x.state === 'up' && !x.hero && !x.fleeing); if (man) { man.x = man.x < 50 ? 2 : 98; man.y = 99; } say(b, 'One of your lads sprints after the camel and catches it by the halter.'); }
    else if (id === 'letbolt') { if (b.rng() < 0.5) { cost.current.loads += 1; say(b, 'The camel is gone round the bend, and the bales with it.'); } else say(b, 'The camel stops at the first bush to eat it. The bales are safe.'); }
    else if (id === 'quarter') {
      if (b.rng() < quarterOdds()) { b.over = 'yield'; say(b, 'You call out an offer. One by one they throw down their arms.', true); audio.sfx('reward'); }
      else { b.morale[1] = Math.min(100, b.morale[1] + 6); say(b, 'They answer with a shot. The fight goes on.'); }
    }
    setV(viewOf(b));
  };
  const say = (b: Battle, text: string, big = false) => { b.feed.push({ t: b.t, text, side: 0, big }); };

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
    // a careful volley (the powder moment): the men hold until the best range and aim truer
    if (aimBonus.current) { for (const x of b.men) if (x.side === 0) x.aim *= 1.25; }
    const r = volley(b);
    if (aimBonus.current) { aimBonus.current = false; for (const x of b.men) if (x.side === 0) x.aim /= 1.25; }
    if (!r.fired) { audio.sfx('tap'); return; }
    volleys.current += 1;
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
    if (ended.current) return; ended.current = true;
    const b = bRef.current!; const L = losses(b);
    onEnd({ fight: { over: retreat ? 'pushed' : b.over, duel: b.duel }, lost: L.lost, kills: L.kills, retreat, hurt: L.hurt, heroDown: L.heroDown, cost: cost.current });
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

  // the fight over: the banner and the count stand a moment, then the account follows by itself
  useEffect(() => { if (!v.over) return; const id = window.setTimeout(() => end(), 2600); return () => window.clearTimeout(id); }, [v.over]); // eslint-disable-line react-hooks/exhaustive-deps
  // the banner goes up with its own short sting
  useEffect(() => { if (v.over) audio.fightResult(v.over === 'run' || v.over === 'yield' || v.over === 'withdraw' ? 'win' : v.over === 'draw' ? 'draw' : 'lose'); }, [v.over]);
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
        <div className={`fb-shake ${shout ? 'go' : ''}`} key={`shake-${shout?.k ?? 0}`}><FieldCanvas battle={bRef} bandId={info.bandId} field={info.field} camels={info.camels} wall={setup.ground === 'camels'} selected="none" onTap={() => {}} frame={frame} /></div>
        <ol className="fb-feed" data-testid="clash-feed">
          {v.feed.map((f, i) => <li key={`${f.t}-${i}`} className={`${f.side === 0 ? 'mine' : 'theirs'}${f.big ? ' big' : ''}`} style={{ opacity: Math.max(0.25, 1 - (v.t - f.t) / 9) }}>{f.text}</li>)}
        </ol>
        {!v.over && !duel && !moment && <p className={`fb-coach ${v.perfect && v.loaded && !v.charging ? 'now' : ''}`} data-testid="clash-coach">{coach(v, canDuel)}</p>}
        {shout && <div key={`shout-${shout.k}`} className={`fb-shout ${shout.perfect ? 'perfect' : ''}`}>{shout.text}</div>}
        {paused && !v.over && <div className="fb-paused">Paused</div>}
        {moment && !v.over && (() => { const c = choicesFor(moment); return (
          <div className="fb-moment" data-testid="fight-moment" data-moment={moment}>
            <img className="fb-moment-art" src={`art/battle/moments/${MOMENT_ART[moment]}.webp`} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            <small>THE FIELD HOLDS ITS BREATH</small>
            <b>{c.title}</b>
            <p>{c.line}</p>
            <div className="fb-choices">
              {c.choices.map((x) => <button key={x.id} className={`fb-choice ${x.primary ? 'primary' : ''}`} onClick={() => choose(x.id)} data-testid={`moment-${x.id}`}><b>{x.label}</b><small>{x.note}</small></button>)}
            </div>
          </div>
        ); })()}
        {v.over && <div className={`clash-banner ${v.over === 'run' || v.over === 'yield' || v.over === 'withdraw' ? 'win' : v.over === 'draw' ? 'draw' : 'loss'}`} data-testid="clash-banner">{HEAD[v.over]}</div>}
      </div>

      {!v.over && !duel && !moment && (
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
          <button className="btn primary big" onClick={() => end()} data-testid="clash-continue">See what you won</button>
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
      <img className="duel-art" src="art/battle/moments/duel.webp" alt="" />
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
