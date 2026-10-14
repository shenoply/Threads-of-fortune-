import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../Icon';
import { useGame, takeRobArt, troopRoom, leaderOf, combatOf, type ClashSpoils } from '../../game/state/store';
import { TROOPS } from '../../data/caravan';
import { strength, animalCount } from '../../game/systems/caravan';
import { BREEDS, withArticle } from '../../data/animals';
import { threatForParty, THREAT_LINES, THREAT_VOICE, ambushPlace } from '../../data/travelThreats1925';
import { voice, quotes } from '../../game/audio/voice';
import type { Party } from '../../game/systems/world';
import { fmt } from '../../game/economy/money';
import { audio } from '../../game/audio/engine';
import { buzz } from '../../game/feel';
import { BATTLE_ART, fieldFor } from './BattleField';
import { Clash, type ClashEnd, type ClashInfo } from './Clash';
import { lookFor } from '../../game/heroLook';
import { groundsAt, winOdds, isWin, type GroundId } from '../../game/systems/combat';
import { terrainAt, dist } from '../../game/systems/world';
import { ROAD_WELLS, SETTLEMENTS } from '../../data/world';

type Stage = 'standoff' | 'demand' | 'battle' | 'result';
interface Unit { id: string; name: string; img: string; str: number; n: number; start: number }

/** a name mid-sentence: lower case, but places and peoples keep their capital ("2 Giza watchmen", "the Syrian rebel band") */
const midName = (s: string) => s.toLowerCase().replace(/\b(syrian|giza|cairo|bedouin|arnaut|egyptian|alexandria)\b/g, (w) => w[0].toUpperCase() + w.slice(1));

/** What a beaten band is likely to have been riding, by who they are - a village robber on a donkey
 *  is not mounted the same as a Sinai raider. Falls back to the common Egyptian donkey. */
const BAND_MOUNT: Record<string, string> = {
  'egypt-rural-highway-robbers': 'baladi_d',
  'sinai-transjordan-desert-raiders': 'bishari',
  'palestine-road-thieves': 'baladi_d',
  'iraq-border-smuggler-brigands': 'maghrabi',
};

/** Bandits on the road, Bannerlord-style: the map stops, both sides are weighed, and you talk, pay, run or fight. */
export function Ambush({ party, onDone, onTurnBack }: { party: Party; onDone: (msg: string) => void; onTurnBack: (msg: string) => void }) {
  const g = useGame();
  const threat = useMemo(() => threatForParty(party, g.day), [party, g.day]);
  const lines = THREAT_LINES[threat.id] ?? THREAT_LINES['egypt-rural-highway-robbers'];
  // where this happens: the caravan's own position on the map (on the train too), not the band's home ground
  const place = useMemo(() => ambushPlace(g.world.x, g.world.y), [party.id]); // eslint-disable-line react-hooks/exhaustive-deps
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
  /** what a robbery took from the purse, in money, so the words match the ledger */
  const takenLine = (loss: number) => (loss > 0 ? ` ${fmt(loss)} of your ${fmt(g.cash)} is gone.` : ' There was nothing in your purse to take.');

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
  const speaker = THREAT_VOICE[threat.id] ?? 'robberchief';
  useEffect(() => { voice.load().then(() => voice.preload([speaker])); return () => voice.stop(); }, [speaker]);
  // a buzz on the phone as they ride out at you (feel.ts)
  useEffect(() => { buzz(25); }, []);
  // the battlefield pictures, fetched while they talk so a fight opens on a painted field
  const field = useMemo(() => fieldFor(threat.id, party.id, g.day), [threat.id, party.id, g.day]);
  useEffect(() => { for (const src of [field, ...BATTLE_ART]) new Image().src = src; }, [field]);
  useEffect(() => {
    if (stage !== 'demand') return;
    let live = true;
    voice.whenReady(speaker).then(async () => { for (const q of quotes(lines.demand)) { if (!live) return; await voice.say(speaker, q); } });
    return () => { live = false; voice.stop(); };
  }, [stage, speaker, lines.demand]);

  // ---- the fight: three rounds of orders on the painted ground (Clash.tsx, systems/combat.ts) ----
  // your own share of the strength is what strength() gives you without your men: you, and any arms you carry
  const heroStr = strength({ ...g.world.party, troops: {} });
  const mySide: Unit[] = useMemo(() => [
    { id: 'you', name: 'You', img: lookFor(g.heroLook) ?? 'art/stall-seller.jpg', str: heroStr, n: 1, start: 1 },
    ...Object.entries(g.world.party.troops).filter(([, n]) => (n ?? 0) > 0).map(([id, n]) => ({ id, name: n > 1 ? TROOPS[id].plural : TROOPS[id].name, img: `art/troops/${id}.jpg`, str: TROOPS[id].strength, n: n ?? 0, start: n ?? 0 })),
  ], []); // eslint-disable-line react-hooks/exhaustive-deps
  const enemy = { n: size, str: theirs / size };
  // the man who leads them: a name on a poster for the bands that watch the roads
  const leader = useMemo(() => leaderOf(g, party.id), [party.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const combat = combatOf(g);
  const men = Object.values(g.world.party.troops).reduce((a, n) => a + (n ?? 0), 0);
  const scouted = guide > 0 || Object.entries(g.world.party.troops).some(([id, n]) => (n ?? 0) > 0 && (TROOPS[id].scout ?? 0) > 0);
  const clashInfo: ClashInfo = useMemo(() => {
    const temper = leader?.temper ?? (['reckless', 'cunning', 'cautious'] as const)[(party.id.charCodeAt(party.id.length - 1) + g.day) % 3];
    const rifles = threat.id === 'egypt-rural-highway-robbers' ? Math.max(1, Math.round(size / 4)) : threat.id === 'palestine-road-thieves' ? Math.max(1, Math.round(size / 3)) : Math.max(1, size - 1);
    const mounted = /raiders|smuggler/.test(threat.id);
    // a guide or scout sees exactly what they carry and knows the man; a strong party gets a good look at them
    const close = scouted || mine >= theirs * 1.5;
    const armsLine = `${size} men · ${close ? `${rifles} ${rifles === 1 ? 'rifle' : 'rifles'}` : rifles > size / 2 ? 'most with rifles' : 'a rifle or two'}${mounted ? ' · mounted' : ' · on foot'}${leader?.grudge ? ' · out for revenge' : ''}`;
    const camels = Object.entries(g.world.party.animals ?? {}).reduce((a, [id, n]) => a + (BREEDS[id]?.kind === 'camel' ? n : 0), 0);
    const here = { x: g.world.x, y: g.world.y };
    const nearWell = [...ROAD_WELLS, ...SETTLEMENTS.filter((x) => x.kind === 'oasis' || x.kind === 'camp')].some((w) => dist(w, here) < 30);
    const grounds: GroundId[] = groundsAt({ terrain: terrainAt(here), nearWell, camels });
    // good rifles count for one more each, up to the men to carry them; a named sergeant steadies the line
    const myPow = mine + Math.min(combat.rifles, men) + (combat.sergeant ? 2 : 0);
    return {
      bandId: threat.id, bandName: threat.displayName, place, field, size, enPow: theirs + (leader?.grudge ? 2 : 0), myPow,
      leader, leaderImg: threat.leaderImage, heroImg: lookFor(g.heroLook) ?? 'art/stall-seller.jpg', heroArt: (g.world.party.arms ?? 0) > 0 ? 'hero-armed' : 'hero',
      temper, known: !!leader?.seen || close, scout: scouted, grounds, camels,
      mountedMen: Object.entries(g.world.party.troops).some(([id, n]) => (n ?? 0) > 0 && TROOPS[id].mounted),
      sergeant: combat.sergeant?.name, arms: g.world.party.arms ?? 0, armsLine, seed: `${party.id}:${g.day}:${combat.wins + combat.losses}`,
      mySide: mySide.map((u) => ({ id: u.id, n: u.n, start: u.start })), troops: { ...g.world.party.troops }, party: g.world.party,
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // the chance shown on the Fight button: on the ground and in the order the men would take by themselves
  const winPct = useMemo(() => (rebels ? null : winOdds({ myPow: clashInfo.myPow, enPow: clashInfo.enPow, temper: clashInfo.temper, known: clashInfo.known, scout: clashInfo.scout, ground: clashInfo.grounds.includes('camels') ? 'camels' : clashInfo.grounds[clashInfo.grounds.length - 1], formation: 'line', sergeant: !!clashInfo.sergeant, seed: clashInfo.seed })), [clashInfo, rebels]);
  const [clashSpoils, setClashSpoils] = useState<ClashSpoils | null>(null);
  const [recruitNote, setRecruitNote] = useState('');
  const fight = () => {
    audio.sfx('chest');
    setStage('battle');
  };
  const finish = ({ fight: f, lost, kills, retreat, auto }: ClashEnd) => {
    const lostList = Object.entries(lost).map(([id, n]) => `${n} ${midName(n > 1 ? TROOPS[id].plural : TROOPS[id].name)}`).join(', ');
    const lostLine = lostList ? ` Lost: ${lostList}.` : '';
    const st = useGame.getState();
    const res = f.over ?? 'draw';
    const by = auto ? (combat.sergeant ? `Sergeant ${combat.sergeant.name} takes charge. ` : 'Your oldest hand takes charge. ') : '';
    const who = leader?.name ?? 'Their leader';
    const band = midName(threat.displayName);
    let base = '';
    let extra: ClashSpoils | null = null;
    if (retreat) {
      const wound = Math.random() < 0.25 ? ` ${st.hurt('fight')}` : '';
      base = st.ambushOutcome(party.id, { cashLoss: Math.round(g.cash * 0.15), rugsLost: 1, troopsLost: lost, delayHours: 6, enemyLost: kills, text: `You pull your caravan back and run for it, leaving a bale and some coin behind.${lostLine}${wound}` });
    } else if (isWin(res)) {
      audio.sfx('coins');
      const head = res === 'yield' ? `${by}${who} throws down his rifle, and his men follow.` : res === 'run' ? `${by}The ${band} break and run.` : `${by}They pull back out of range and ride off. Not a clean win, but the road is yours.`;
      base = st.ambushOutcome(party.id, { rep: res === 'yield' ? 3 : res === 'run' ? 2 : 1, troopsLost: lost, theyLeave: true, enemyLost: kills, text: `${head}${lostList ? lostLine : ' None of your men fell.'}` });
      extra = useGame.getState().clashAfter(party.id, { result: res, kills, size, rebels });
    } else if (res === 'draw') {
      base = st.ambushOutcome(party.id, { delayHours: 6, troopsLost: lost, theyLeave: true, enemyLost: kills, text: `${by}Neither side will give way, and in the end both pull back. You lose half a day.${lostLine}` });
      extra = useGame.getState().clashAfter(party.id, { result: res, kills, size, rebels });
    } else {
      // beaten: it costs men, a bale or a day, never the game
      audio.sfx('chest');
      const broken = res === 'broken';
      const wound = broken || f.duel === 'lost' || Math.random() < 0.4 ? ` ${st.hurt('fight')}` : '';
      const out = broken && f.duel === 'lost' ? ` ${useGame.getState().knockedOut('beaten by raiders')}` : '';
      const loss = Math.round(g.cash * (broken ? 0.3 : 0.15));
      base = st.ambushOutcome(party.id, { cashLoss: loss, rugsLost: 1, troopsLost: lost, rep: -1, delayHours: broken ? 10 : 5, enemyLost: kills, text: `${by}${broken ? 'Your line breaks.' : 'Your men give ground and they get in among the loads.'} ${lines.strip}${takenLine(loss)}${lostLine}${wound}${out}` });
      extra = useGame.getState().clashAfter(party.id, { result: res, kills, size, rebels });
    }
    setResult(extra?.text ? `${base} ${extra.text}` : base);
    setClashSpoils(extra);
    setSpoils(null);
    setStage('result');
  };

  // one measure of strength everywhere: the map label, the party bar and this card all use strength()
  const myPow = mine;
  const enPow = theirs;
  const share = odds;
  // the chance itself, plainly: the same simulation the fight runs on (never a bare share of strength)
  const fightNote = winPct == null ? '' : `about ${winPct}% to win${winPct < 35 ? ': poor odds' : ''}`;

  return (
    <div className="ambush" data-testid="road-encounter">
      {stage === 'battle' && <Clash info={clashInfo} onEnd={finish} onBack={() => setStage('standoff')} />}
      <div className="amb-bg" style={{ backgroundImage: "url(art/troops/escort-road.jpg)" }} />
      <div className="amb-body">
        <div className="amb-head"><small>{rebels ? 'CHECKPOINT' : 'AMBUSH'} · {place}</small><b>{threat.displayName}</b></div>
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
            {leader && <span className="amb-leader" data-testid="amb-leader">Led by {leader.name}{leader.robbed ? ', who robbed you' : ''}</span>}
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
              {!rebels && <button className={`btn ${winPct != null && winPct >= 50 ? 'primary' : ''}`} onClick={() => { fight(); }} data-testid="amb-fight"><Icon name="sword" /> Fight <small>{fightNote}</small></button>}
              <button className="btn" onClick={() => { if (Math.random() < (rebels ? 0.9 : 0.55)) { const msg = rebels ? 'You turn your animals around and go back the way you came. The commander watches you go.' : 'You turn your animals around and go back the way you came. The riders watch from the ridge and let you go.'; g.ambushOutcome(party.id, { text: msg }); onTurnBack(msg); } else { setText('You turn back, but they are faster. They surround you and name their price.'); setStage('demand'); } }} data-testid="amb-turn"><Icon name="camel" /> Turn back <small>{rebels ? 'usually allowed' : 'they may chase you'}</small></button>
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
              <button className="btn" onClick={() => { if (ratio >= 2) { const loss = Math.round(g.cash * 0.5); settle({ cashLoss: loss, rugsLost: 2, rep: -1, text: `${lines.strip}${takenLine(loss)}` }); } else { fight(); } }} data-testid="amb-refuse"><Icon name="hand" /> Refuse <small>{ratio >= 2 ? 'they are far stronger' : 'they will fight'}</small></button>
              {!rebels && <button className={`btn ${winPct != null && winPct >= 50 ? 'primary' : ''}`} onClick={() => { fight(); }} data-testid="amb-fight"><Icon name="sword" /> Fight <small>{fightNote}</small></button>}
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
            {clashSpoils && (clashSpoils.cash > 0 || clashSpoils.rifles > 0 || clashSpoils.animals || clashSpoils.bale || clashSpoils.prisoners > 0 || clashSpoils.leader) && (
              <div className="amb-spoils" data-testid="clash-spoils">
                {clashSpoils.cash > 0 && <span><Icon name="coin" /> +{fmt(clashSpoils.cash)}</span>}
                {clashSpoils.animals && <span><Icon name="camel" /> +{clashSpoils.animals.n} {BREEDS[clashSpoils.animals.id].name}{clashSpoils.animals.n > 1 ? 's' : ''}</span>}
                {clashSpoils.rifles > 0 && <span><Icon name="sword" /> +{clashSpoils.rifles} {clashSpoils.rifles > 1 ? 'rifles' : 'rifle'}</span>}
                {clashSpoils.bale && <span className={clashSpoils.rare ? 'rare' : ''}><Icon name="bag" /> {clashSpoils.bale}</span>}
                {clashSpoils.leader && <span className="rare" data-testid="spoils-leader"><Icon name="people" /> {clashSpoils.leader} taken</span>}
                {clashSpoils.prisoners > 0 && <span data-testid="spoils-prisoners"><Icon name="people" /> {clashSpoils.prisoners} {clashSpoils.prisoners > 1 ? 'prisoners' : 'prisoner'}</span>}
              </div>
            )}
            {clashSpoils && (clashSpoils.prisoners > 0 || clashSpoils.leader) && <p className="amb-note" data-testid="prisoner-note">Hand prisoners to the police post in the next town (in a town's menu, under More) for the bounty.</p>}
            {clashSpoils && clashSpoils.willing > 0 && !recruitNote && (
              <button className="btn amb-recruit" disabled={troopRoom(g) < 1} onClick={() => setRecruitNote(useGame.getState().recruitPrisoners(clashSpoils.willing))} data-testid="amb-recruit">
                <Icon name="people" /> Take on the willing <small>{troopRoom(g) < 1 ? 'you lead as many men as your name allows' : `${clashSpoils.willing} of the prisoners will ride for you`}</small>
              </button>
            )}
            {recruitNote && <p className="amb-note" data-testid="recruit-note">{recruitNote}</p>}
            <button className="btn primary big" onClick={() => onDone(result)} data-testid="encounter-continue">Continue</button>
          </div>
        )}
      </div>
    </div>
  );
}
