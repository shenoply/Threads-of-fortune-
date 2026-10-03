import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../Icon';
import { useGame } from '../../game/state/store';
import { TROOPS } from '../../data/caravan';
import { strength } from '../../game/systems/caravan';
import { threatForParty, THREAT_LINES, THREAT_VOICE } from '../../data/travelThreats1925';
import { voice, quotes } from '../../game/audio/voice';
import type { Party } from '../../game/systems/world';
import { fmt } from '../../game/economy/money';
import { audio } from '../../game/audio/engine';
import { BattleField, BATTLE_ART, fieldFor, type Volley } from './BattleField';

type Stage = 'standoff' | 'demand' | 'battle' | 'result';
type Stance = 'charge' | 'hold';
interface Unit { id: string; name: string; img: string; str: number; n: number; start: number }

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/** Bandits on the road, Bannerlord-style: the map stops, both sides are weighed, and you talk, pay, run or fight. */
export function Ambush({ party, onDone, onTurnBack }: { party: Party; onDone: (msg: string) => void; onTurnBack: () => void }) {
  const g = useGame();
  const threat = useMemo(() => threatForParty(party, g.day), [party, g.day]);
  const lines = THREAT_LINES[threat.id] ?? THREAT_LINES['egypt-rural-highway-robbers'];
  const rebels = threat.kind === 'rebel_guerrilla';
  const mine = strength(g.world.party);
  const theirs = party.strength ?? 8;
  const size = party.size ?? 4;
  const guide = Object.entries(g.world.party.troops).some(([id, n]) => (n ?? 0) > 0 && (id === 'desertcaptain' || id === 'bedouin')) ? 1 : 0;
  const talkChance = Math.min(0.9, 0.35 + guide * 0.3 + Math.min(0.2, (g.skills?.speech ?? 0) / 500) + (rebels ? 0.2 : 0));
  const ratio = theirs / Math.max(1, mine);
  const tax = Math.max(20, Math.min(g.cash, Math.round(g.cash * (0.08 + 0.05 * Math.min(3, ratio)))));
  const canDeter = mine >= theirs * 1.5;
  const odds = Math.round((mine / (mine + theirs)) * 100);

  const [stage, setStage] = useState<Stage>('standoff');
  const [text, setText] = useState(lines.open);
  const [result, setResult] = useState('');
  const [spoils, setSpoils] = useState<{ cash: number; joiners: number } | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const settle = (o: Parameters<typeof g.ambushOutcome>[1]) => {
    setResult(g.ambushOutcome(party.id, o));
    setSpoils(o.cashGain ? { cash: o.cashGain, joiners: o.joiners ?? 0 } : null);
    setStage('result');
  };
  // the fight can end well below the fold on a phone (the battlefield picture is tall); once the
  // result is in, bring the Continue button on screen so the game never looks stuck
  useEffect(() => { if (stage === 'result') resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [stage]);
  // the leader speaks his demand aloud
  const leader = THREAT_VOICE[threat.id] ?? 'robberchief';
  useEffect(() => { voice.load().then(() => voice.preload([leader])); return () => voice.stop(); }, [leader]);
  // the battlefield pictures, fetched while they talk so a fight opens on a painted field
  const field = useMemo(() => fieldFor(threat.id, party.id, g.day), [threat.id, party.id, g.day]);
  useEffect(() => { for (const src of [field, ...BATTLE_ART]) new Image().src = src; }, [field]);
  useEffect(() => {
    if (stage !== 'demand') return;
    let live = true;
    voice.whenReady(leader).then(async () => { for (const q of quotes(lines.demand)) { if (!live) return; await voice.say(leader, q); } });
    return () => { live = false; voice.stop(); };
  }, [stage, leader, lines.demand]);

  // ---- battle state ----
  const myStart: Unit[] = useMemo(() => [
    { id: 'you', name: 'You', img: 'art/stall-seller.jpg', str: 2, n: 1, start: 1 },
    ...Object.entries(g.world.party.troops).filter(([, n]) => (n ?? 0) > 0).map(([id, n]) => ({ id, name: n > 1 ? TROOPS[id].plural : TROOPS[id].name, img: `art/troops/${id}.jpg`, str: TROOPS[id].strength, n, start: n })),
  ], []); // eslint-disable-line react-hooks/exhaustive-deps
  const [mySide, setMySide] = useState<Unit[]>(myStart);
  const [enemy, setEnemy] = useState({ n: size, str: theirs / size });
  const [stance, setStance] = useState<Stance>('hold');
  const [log, setLog] = useState<string[]>([]);
  const [round, setRound] = useState(0);
  const [volley, setVolley] = useState<Volley>();
  const acc = useRef({ e: 0, m: 0 });
  const over = useRef(false);

  const endBattle = (win: boolean, retreat = false) => {
    if (over.current) return;
    over.current = true;
    const troopsLost: Record<string, number> = {};
    for (const u of mySide) if (u.id !== 'you' && u.start > u.n) troopsLost[u.id] = u.start - u.n;
    const killed = size - enemy.n;
    const lostList = Object.entries(troopsLost).map(([id, n]) => `${n} ${n > 1 ? TROOPS[id].plural.toLowerCase() : TROOPS[id].name.toLowerCase()}`).join(', ');
    if (win) {
      audio.sfx('coins');
      const joiners = !rebels && Math.random() < 0.4 ? 1 + Math.floor(Math.random() * 2) : 0;
      settle({ cashGain: 10 + killed * 6, rep: 2, troopsLost, joiners, theyLeave: true, enemyLost: killed, text: `The ${threat.displayName.toLowerCase()} break and scatter. You pick up what they dropped.${lostList ? ` Lost: ${lostList}.` : ' None of your men fell.'}${joiners ? ` ${joiners} of the beaten men ask to ride with you.` : ''}` });
    } else if (retreat) {
      settle({ cashLoss: Math.round(g.cash * 0.2), rugsLost: 1, troopsLost, delayHours: 6, enemyLost: killed, text: `You pull your caravan back and run for it, leaving a bale and a purse behind.${lostList ? ` Lost: ${lostList}.` : ''}` });
    } else {
      audio.sfx('chest');
      settle({ cashLoss: Math.round(g.cash * 0.45), rugsLost: 2, troopsLost, rep: -1, enemyLost: killed, text: `${lines.strip}${lostList ? ` Lost: ${lostList}.` : ''}` });
    }
  };

  useEffect(() => {
    if (stage !== 'battle' || over.current) return;
    // the lines face each other for a moment before the first shots, then a volley every second and a half
    const t = setTimeout(() => {
      const standing = mySide.reduce((a, u) => a + u.n, 0);
      setVolley({ round: round + 1, mine: Math.max(1, Math.round(standing * (stance === 'charge' ? 0.6 : 0.45))), theirs: Math.max(1, Math.round(enemy.n * 0.5)) });
      const myPow = mySide.reduce((a, u) => a + u.n * u.str, 0);
      const enPow = enemy.n * enemy.str;
      const dealt = myPow * (stance === 'charge' ? 1.3 : 0.85) * rnd(0.7, 1.3) * 0.2;
      const taken = enPow * (stance === 'charge' ? 1.2 : 0.75) * rnd(0.7, 1.3) * 0.2;
      acc.current.e += dealt / enemy.str;
      acc.current.m += taken / 3.5;
      // no more than two men fall on a side in one exchange: a fight is watched, not settled in a flash
      const kills = Math.min(enemy.n, 2, Math.floor(acc.current.e));
      acc.current.e -= kills;
      let losses = Math.min(2, Math.floor(acc.current.m));
      acc.current.m -= losses;
      const next = mySide.map((u) => ({ ...u }));
      const hit: string[] = [];
      while (losses > 0) {
        const pool = next.filter((u) => u.id !== 'you' && u.n > 0);
        if (!pool.length) break;
        const u = pool[Math.floor(Math.random() * pool.length)];
        u.n -= 1; losses -= 1; hit.push(u.id);
      }
      const en = { ...enemy, n: enemy.n - kills };
      setMySide(next); setEnemy(en); setRound((r) => r + 1);
      const line = kills && hit.length ? `Your men drop ${kills}; you lose ${hit.length === 1 ? `a ${TROOPS[hit[0]].name.toLowerCase()}` : `${hit.length} men`}.`
        : kills ? `Your men drop ${kills} of them.` : hit.length ? `You lose ${hit.length === 1 ? `a ${TROOPS[hit[0]].name.toLowerCase()}` : `${hit.length} men`}.` : stance === 'charge' ? 'Shots, shouting, dust. Nobody falls.' : 'Your men hold behind the camels. Shots go wide.';
      setLog((l) => [line, ...l].slice(0, 4));
      audio.sfx('volley');
      const myLeft = next.reduce((a, u) => a + u.n * u.str, 0);
      // a fight lasts a few volleys at least, long enough to choose how to fight it
      if (en.n <= Math.ceil(size * 0.4) && round >= 2) endBattle(true);
      else if (myLeft <= 2 && en.n > 0 && next.every((u) => u.id === 'you' || u.n === 0) && round >= 4) endBattle(false);
      else if (round >= 14) endBattle(myLeft / (myStart.reduce((a, u) => a + u.start * u.str, 0)) > en.n / size);
    }, round === 0 ? 2200 : 1800);
    return () => clearTimeout(t);
  }, [stage, round, stance]); // eslint-disable-line react-hooks/exhaustive-deps

  const myPow = mySide.reduce((a, u) => a + u.n * u.str, 0);
  const enPow = Math.round(enemy.n * enemy.str);
  const share = Math.round((myPow / Math.max(1, myPow + enPow)) * 100);

  return (
    <div className="ambush" data-testid="road-encounter">
      <div className="amb-bg" style={{ backgroundImage: "url(art/troops/escort-road.jpg)" }} />
      <div className="amb-body">
        <div className="amb-head"><small>{rebels ? 'CHECKPOINT' : 'AMBUSH'} · {threat.regions[0]}</small><b>{threat.displayName}</b></div>
        {stage !== 'battle' && <div className="amb-sides">
          <div className="amb-side amb-me">
            <img className="amb-face" src="art/troops/escort-road.jpg" alt="" />
            <b>Your caravan</b>
            <span>Strength {myPow}</span>
            <div className="amb-units">
              {mySide.map((u) => (
                <span key={u.id} className={`amb-unit ${u.n === 0 ? 'dead' : ''}`} title={u.name}>
                  <img src={u.img} alt="" /><em>{u.n}</em>
                </span>
              ))}
            </div>
          </div>
          <div className="amb-vs">VS</div>
          <div className="amb-side amb-them">
            <img className="amb-face" src={threat.leaderImage} alt="" onError={(e) => { e.currentTarget.src = 'art/troops/reformed.jpg'; }} />
            <b>{threat.displayName}</b>
            <span>{enemy.n} men · strength {enPow}</span>
          </div>
        </div>}
        {stage === 'battle' && (
          <div className="amb-strip" data-testid="amb-strip">
            <div><b>Your caravan</b>{mySide.reduce((a, u) => a + u.n, 0)} men · strength {myPow}</div>
            <i>vs</i>
            <div><b>{threat.displayName}</b>{enemy.n} of {size} men · strength {enPow}</div>
          </div>
        )}
        <div className="amb-bar" aria-label={`Your share of the fighting strength: ${share}%`}><i style={{ width: `${share}%` }} /></div>

        {stage === 'standoff' && (
          <>
            <p className="amb-text">{text}</p>
            <div className="amb-opts">
              <button className="btn" onClick={() => { if (Math.random() < talkChance) settle({ rep: 1, theyLeave: true, text: lines.talkOk }); else { setText(lines.talkBad); setStage('demand'); } }} data-testid="amb-talk"><Icon name="talk" /> Talk your way through <small>{Math.round(talkChance * 100)}%{guide ? ', your guide helps' : ''}</small></button>
              {canDeter && <button className="btn" onClick={() => settle({ theyLeave: true, text: 'They count your guards, look at each other, and ride back the way they came.' })} data-testid="amb-deter"><Icon name="shield" /> Show them your guards <small>they are outnumbered</small></button>}
              <button className="btn" onClick={() => settle({ cashLoss: tax, theyLeave: true, text: rebels ? 'You make your contribution to the cause. The commander writes you a receipt.' : `You pay ${fmt(tax)} for the road.` })} data-testid="amb-pay"><Icon name="coin" /> {rebels ? 'Make a contribution' : 'Pay for the road'} <small>{fmt(tax)}</small></button>
              {!rebels && <button className="btn primary" onClick={() => { setStage('battle'); audio.sfx('chest'); }} data-testid="amb-fight"><Icon name="sword" /> Fight <small>{odds}% of the strength is yours</small></button>}
              <button className="btn" onClick={() => { if (Math.random() < (rebels ? 0.9 : 0.55)) { g.ambushOutcome(party.id, { delayHours: 6, text: 'You turn your animals around and lose half a day going round.' }); onTurnBack(); } else { setText('You turn back, but they are faster. They surround you and name their price.'); setStage('demand'); } }} data-testid="amb-turn"><Icon name="camel" /> Turn back <small>{rebels ? 'usually allowed' : 'they may chase you'}</small></button>
            </div>
          </>
        )}

        {stage === 'demand' && (
          <>
            <p className="amb-text">{text} {lines.demand}</p>
            <div className="amb-opts">
              <button className="btn" onClick={() => settle({ cashLoss: tax, theyLeave: true, text: `You pay ${fmt(tax)}. They let you go.` })} data-testid="amb-pay"><Icon name="coin" /> Pay <small>{fmt(tax)}</small></button>
              <button className="btn" onClick={() => { if (ratio >= 2) settle({ cashLoss: Math.round(g.cash * 0.5), rugsLost: 2, rep: -1, text: lines.strip }); else { setStage('battle'); audio.sfx('chest'); } }} data-testid="amb-refuse"><Icon name="hand" /> Refuse <small>{ratio >= 2 ? 'they are far stronger' : 'they will fight'}</small></button>
              {!rebels && <button className="btn primary" onClick={() => { setStage('battle'); audio.sfx('chest'); }} data-testid="amb-fight"><Icon name="sword" /> Fight <small>{odds}%</small></button>}
            </div>
          </>
        )}

        {(stage === 'battle' || (stage === 'result' && round > 0)) && (
          <BattleField bandId={threat.id} field={field} mySide={mySide} enemyN={enemy.n} enemyStart={size} party={g.world.party} charging={stage === 'battle' && stance === 'charge'} volley={stage === 'battle' ? volley : undefined} />
        )}

        {stage === 'battle' && (
          <>
            <div className="amb-log" data-testid="amb-log">{log.length ? log.map((l, i) => <p key={i} style={{ opacity: 1 - i * 0.22 }}>{l}</p>) : <p>The two lines face each other across the ground. Choose how to fight.</p>}</div>
            <div className="amb-opts row">
              <button className={`btn ${stance === 'charge' ? 'primary' : ''}`} onClick={() => setStance('charge')} data-testid="amb-charge"><Icon name="sword" /> Charge</button>
              <button className={`btn ${stance === 'hold' ? 'primary' : ''}`} onClick={() => setStance('hold')} data-testid="amb-hold"><Icon name="shield" /> Hold the line</button>
              <button className="btn" onClick={() => endBattle(false, true)} data-testid="amb-retreat"><Icon name="run" /> Retreat</button>
            </div>
          </>
        )}

        {stage === 'result' && (
          <div ref={resultRef}>
            <p className="amb-text" data-testid="encounter-result">{result}</p>
            {spoils && (spoils.cash > 0 || spoils.joiners > 0) && (
              <div className="amb-spoils" data-testid="amb-spoils">
                {spoils.cash > 0 && <span><Icon name="coin" /> +{fmt(spoils.cash)} spoils</span>}
                {spoils.joiners > 0 && <span><Icon name="people" /> +{spoils.joiners} {spoils.joiners > 1 ? 'men join' : 'man joins'} you</span>}
              </div>
            )}
            <button className="btn primary big" onClick={() => onDone(result)} data-testid="encounter-continue">Continue</button>
          </div>
        )}
      </div>
    </div>
  );
}
