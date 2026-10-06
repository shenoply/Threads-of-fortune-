import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../Icon';
import { useGame, takeRobArt } from '../../game/state/store';
import { TROOPS } from '../../data/caravan';
import { strength } from '../../game/systems/caravan';
import { BREEDS, withArticle } from '../../data/animals';
import { threatForParty, THREAT_LINES, THREAT_VOICE } from '../../data/travelThreats1925';
import { voice, quotes } from '../../game/audio/voice';
import type { Party } from '../../game/systems/world';
import { fmt } from '../../game/economy/money';
import { audio } from '../../game/audio/engine';
import { BATTLE_ART, BAND_ART, fieldFor } from './BattleField';
import { TacticalBattle } from './TacticalBattle';
import { lookFor } from '../../game/heroLook';
import { newBattle, MOUNTED_TROOPS, RIFLE_TROOPS, type Battle, type Outcome, type Roster } from '../../game/systems/tactics';

type Stage = 'standoff' | 'demand' | 'battle' | 'result';
interface Unit { id: string; name: string; img: string; str: number; n: number; start: number }

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/** What a beaten band is likely to have been riding, by who they are - a village robber on a donkey
 *  is not mounted the same as a Sinai raider. Falls back to the common Egyptian donkey. */
const BAND_MOUNT: Record<string, string> = {
  'egypt-rural-highway-robbers': 'baladi_d',
  'sinai-transjordan-desert-raiders': 'bishari',
  'palestine-road-thieves': 'baladi_d',
  'iraq-border-smuggler-brigands': 'maghrabi',
};

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
  const talkChance = Math.min(0.9, 0.35 + guide * 0.3 + Math.min(0.2, (g.skills?.speech ?? 0) / 500) + (rebels ? 0.2 : 0) + (g.cash < 20 && !g.inventory.some((i) => !i.stored) ? 0.25 : 0)); // a man with nothing to take is easier to wave through
  const ratio = theirs / Math.max(1, mine);
  // your name in their book (robbed once with nothing to pay): the price is doubled until you pay in full
  const marked = (g.banditMark ?? 0) > 0;
  const tax = Math.max(20, Math.min(g.cash, Math.round(g.cash * (0.08 + 0.05 * Math.min(3, ratio))))) * (marked ? 2 : 1);
  const token = !rebels && (g.chiefTokenUntil ?? 0) >= g.day;
  const canDeter = mine >= theirs * 1.5;
  // what they ask, against what you have: short of it, they take what there is and something in kind
  const short = g.cash < tax;
  const carried = g.inventory.filter((i) => !i.stored);
  // not enough to pay: they take what there is, and then one of ten things happens (store: robBroke)
  const payInKind = () => {
    const purse = g.cash > 0 ? `You turn out your purse: ${fmt(g.cash)} is all there is.` : 'Your purse is empty.';
    const fate = useGame.getState().robBroke();
    setRobArt(takeRobArt());
    settle({ cashLoss: g.cash, theyLeave: true, text: `${purse} ${fate}` });
  };
  const payFull = (text: string) => { if (marked) useGame.setState({ banditMark: 0 }); settle({ cashLoss: tax, theyLeave: true, text: marked ? `${text} They cross your name out of their book.` : text }); };
  const payLabel = short ? (g.cash > 0 ? `${fmt(g.cash)} is all you have` : 'you have no money') : '';
  const odds = Math.round((mine / (mine + theirs)) * 100);

  const [stage, setStage] = useState<Stage>('standoff');
  const [text, setText] = useState(lines.open);
  const [result, setResult] = useState('');
  const [robArt, setRobArt] = useState<string | null>(null);
  const [spoils, setSpoils] = useState<{ cash: number; joiners: number; animal?: string } | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const settle = (o: Parameters<typeof g.ambushOutcome>[1]) => {
    setResult(g.ambushOutcome(party.id, o));
    setSpoils(o.cashGain || o.animalsGained ? { cash: o.cashGain ?? 0, joiners: o.joiners ?? 0, animal: o.animalsGained ? BREEDS[o.animalsGained.id].name : undefined } : null);
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

  // ---- the fight: a tactical battle on the painted ground (see systems/tactics.ts) ----
  const mySide: Unit[] = useMemo(() => [
    { id: 'you', name: 'You', img: lookFor(g.heroLook) ?? 'art/stall-seller.jpg', str: 2, n: 1, start: 1 },
    ...Object.entries(g.world.party.troops).filter(([, n]) => (n ?? 0) > 0).map(([id, n]) => ({ id, name: n > 1 ? TROOPS[id].plural : TROOPS[id].name, img: `art/troops/${id}.jpg`, str: TROOPS[id].strength, n: n ?? 0, start: n ?? 0 })),
  ], []); // eslint-disable-line react-hooks/exhaustive-deps
  const enemy = { n: size, str: theirs / size };
  const [tb, setTb] = useState<Battle | null>(null);
  const fight = () => {
    audio.sfx('chest');
    const fieldId = /battle-(\w+)\.webp/.exec(field)?.[1] ?? 'road';
    const art = BAND_ART[threat.id] ?? BAND_ART['egypt-rural-highway-robbers'];
    const mine: Roster[] = Object.entries(g.world.party.troops).filter(([, n]) => (n ?? 0) > 0).map(([id, n]) => ({
      id, name: TROOPS[id].name, plural: TROOPS[id].plural, n: n ?? 0, per: TROOPS[id].strength,
      kind: MOUNTED_TROOPS.includes(id) ? 'mounted' : RIFLE_TROOPS.includes(id) ? 'rifle' : 'melee', img: `art/battle/${id}.webp`,
    }));
    const mounted = /raider|smuggler/.test(art.man) ? 0.6 : 0;
    const melee = /robber|thief/.test(art.man) ? 0.4 : /rebel/.test(art.man) ? 0.25 : 0.2;
    setTb(newBattle({
      field: fieldId, seed: `${party.id}${g.day}`, mine, enemyMen: size, enemyStrength: theirs,
      band: { man: art.man, leader: art.leader, mounted, melee }, bandName: threat.displayName.replace(/^The /, ''),
      heroImg: lookFor(g.heroLook) ?? undefined,
      cmd: Math.min(1, (g.skills?.speech ?? 0) / 100 + guide * 0.2), scouted: guide > 0 || Object.keys(g.world.party.troops).some((id) => (TROOPS[id].scout ?? 0) > 0 && (g.world.party.troops[id] ?? 0) > 0),
    }));
    setStage('battle');
  };
  const finish = (o: Outcome, retreat: boolean) => {
    const killed = o.enemyKilled;
    const lostList = Object.entries(o.troopsLost).map(([id, n]) => `${n} ${n > 1 ? TROOPS[id].plural.toLowerCase() : TROOPS[id].name.toLowerCase()}`).join(', ');
    const troopsLost = o.troopsLost;
    const st = useGame.getState();
    if (o.heroDown && st.ironman && Math.random() < 0.6) st.dieNow('Cut down at the head of the caravan. Hassan\'s men carried him back to Giza, but too late.');
    if (o.result === 'win' && !retreat) {
      audio.sfx('coins');
      const joiners = !rebels && Math.random() < 0.4 ? 1 + Math.floor(Math.random() * 2) : 0;
      const mountId = BAND_MOUNT[threat.id] ?? 'baladi_d';
      const animalsGained = !rebels && Math.random() < Math.min(0.5, 0.12 + killed * 0.12) ? { id: mountId, n: 1 } : undefined;
      const wound = o.heroHurt && Math.random() < 0.2 ? ` ${useGame.getState().hurt('fight')}` : '';
      settle({
        cashGain: 10 + killed * 6, rep: 2, troopsLost, joiners, theyLeave: true, enemyLost: killed, animalsGained,
        text: `The ${threat.displayName.toLowerCase()} break and scatter. You pick up what they dropped.${lostList ? ` Lost: ${lostList}.` : ' None of your men fell.'}${joiners ? ` ${joiners} of the beaten men ask to ride with you.` : ''}${animalsGained ? ` One of their ${BREEDS[animalsGained.id].name.toLowerCase()}s is left behind.` : ''}${wound}`,
      });
    } else if (retreat) {
      const wound = Math.random() < 0.25 ? ` ${useGame.getState().hurt('fight')}` : '';
      settle({ cashLoss: Math.round(g.cash * 0.2), rugsLost: 1, troopsLost, delayHours: 6, enemyLost: killed, text: `You pull your caravan back and run for it, leaving a bale and a purse behind.${lostList ? ` Lost: ${lostList}.` : ''}${wound}` });
    } else if (o.result === 'draw') {
      settle({ delayHours: 6, troopsLost, theyLeave: true, enemyLost: killed, text: `Neither side will give way, and as the light fails both pull back. You lose half a day.${lostList ? ` Lost: ${lostList}.` : ''}` });
    } else {
      audio.sfx('chest');
      if (g.ironman && Math.random() < 0.12) useGame.getState().dieNow('Cut down by raiders on the road. Hassan\'s men carried him back to Giza, but too late.');
      const wound = o.heroDown || Math.random() < 0.7 ? ` ${useGame.getState().hurt('fight')}` : '';
      settle({ cashLoss: Math.round(g.cash * 0.45), rugsLost: 2, troopsLost, rep: -1, enemyLost: killed, text: `${lines.strip}${lostList ? ` Lost: ${lostList}.` : ''}${wound}` });
    }
  };


  const myPow = mySide.reduce((a, u) => a + u.n * u.str, 0);
  const enPow = Math.round(enemy.n * enemy.str);
  const share = Math.round((myPow / Math.max(1, myPow + enPow)) * 100);

  return (
    <div className="ambush" data-testid="road-encounter">
      {stage === 'battle' && tb && <TacticalBattle battle={tb} title={threat.displayName} fieldArt={field} onEnd={(o, retreat) => finish(o, retreat)} />}
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
        <div className="amb-bar" aria-label={`Your share of the fighting strength: ${share}%`}><i style={{ width: `${share}%` }} /></div>

        {stage === 'standoff' && (
          <>
            <p className="amb-text">{text}</p>
            <div className="amb-opts">
              <button className="btn" onClick={() => { if (Math.random() < talkChance) settle({ rep: 1, theyLeave: true, text: lines.talkOk }); else { setText(lines.talkBad); setStage('demand'); } }} data-testid="amb-talk"><Icon name="talk" /> Talk your way through <small>{Math.round(talkChance * 100)}%{guide ? ', your guide helps' : ''}</small></button>
              {token && <button className="btn primary" onClick={() => settle({ theyLeave: true, text: 'You hold up the chief\'s knotted cord. They look at it, look at each other, and ride off without a word.' })} data-testid="amb-token"><Icon name="shield" /> Show the chief's cord <small>they will let you pass</small></button>}
              {canDeter && <button className="btn" onClick={() => settle({ theyLeave: true, text: 'They count your guards, look at each other, and ride back the way they came.' })} data-testid="amb-deter"><Icon name="shield" /> Show them your guards <small>they are outnumbered</small></button>}
              {short
                ? <button className="btn" onClick={payInKind} data-testid="amb-pay"><Icon name="coin" /> Let them take what you have <small>{payLabel}; something else will have to do</small></button>
                : <button className="btn" onClick={() => payFull(rebels ? 'You make your contribution to the cause. The commander writes you a receipt.' : `You pay ${fmt(tax)} for the road.`)} data-testid="amb-pay"><Icon name="coin" /> {rebels ? 'Make a contribution' : 'Pay for the road'} <small>{fmt(tax)}</small></button>}
              {!rebels && <button className="btn primary" onClick={() => { fight(); }} data-testid="amb-fight"><Icon name="sword" /> Fight <small>{odds}% of the strength is yours</small></button>}
              <button className="btn" onClick={() => { if (Math.random() < (rebels ? 0.9 : 0.55)) { g.ambushOutcome(party.id, { delayHours: 6, text: 'You turn your animals around and lose half a day going round.' }); onTurnBack(); } else { setText('You turn back, but they are faster. They surround you and name their price.'); setStage('demand'); } }} data-testid="amb-turn"><Icon name="camel" /> Turn back <small>{rebels ? 'usually allowed' : 'they may chase you'}</small></button>
            </div>
          </>
        )}

        {stage === 'demand' && (
          <>
            <p className="amb-text">{text} {lines.demand}</p>
            <div className="amb-opts">
              {short
                ? <button className="btn" onClick={payInKind} data-testid="amb-pay"><Icon name="coin" /> Let them take what you have <small>{payLabel}; something else will have to do</small></button>
                : <button className="btn" onClick={() => payFull(`You pay ${fmt(tax)}. They let you go.`)} data-testid="amb-pay"><Icon name="coin" /> Pay <small>{fmt(tax)}</small></button>}
              <button className="btn" onClick={() => { if (ratio >= 2) settle({ cashLoss: Math.round(g.cash * 0.5), rugsLost: 2, rep: -1, text: lines.strip }); else { fight(); } }} data-testid="amb-refuse"><Icon name="hand" /> Refuse <small>{ratio >= 2 ? 'they are far stronger' : 'they will fight'}</small></button>
              {!rebels && <button className="btn primary" onClick={() => { fight(); }} data-testid="amb-fight"><Icon name="sword" /> Fight <small>{odds}%</small></button>}
            </div>
          </>
        )}

        {stage === 'result' && (
          <div ref={resultRef}>
            {robArt && <img className="amb-rob-art" src={`art/events/${robArt}.webp`} alt="" data-testid="rob-art" />}
            <p className="amb-text" data-testid="encounter-result">{result}</p>
            {spoils && (spoils.cash > 0 || spoils.joiners > 0 || spoils.animal) && (
              <div className="amb-spoils" data-testid="amb-spoils">
                {spoils.cash > 0 && <span><Icon name="coin" /> +{fmt(spoils.cash)} spoils</span>}
                {spoils.animal && <span><Icon name="camel" /> +1 {spoils.animal}</span>}
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
