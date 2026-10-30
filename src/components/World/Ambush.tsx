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
import { BAND_ROAD, nemesisLine } from '../../game/systems/combat';
import { audio } from '../../game/audio/engine';
import { buzz } from '../../game/feel';
import { BATTLE_ART, fieldFor } from './BattleField';
import { Clash, setupOf, type ClashEnd, type ClashInfo } from './Clash';
import { forecast, forecastWhy, simulate, losses as battleLosses } from '../../game/systems/battle';
import { PRISONER_BOUNTY, ransomFor, roadToll } from '../../game/systems/combat';
import { heroFace } from '../../game/heroLook';
import { groundsAt, isWin, type GroundId } from '../../game/systems/combat';
import { terrainAt, dist } from '../../game/systems/world';
import { ROAD_WELLS, SETTLEMENTS } from '../../data/world';
import { Chase } from './Chase';
import { speedInfo } from '../../game/systems/caravan';
import { setHold } from '../../game/cardTurn';
import type { ChaseSetup, ChaseState } from '../../game/systems/chase';

type Stage = 'standoff' | 'demand' | 'battle' | 'result' | 'chase';
interface Unit { id: string; name: string; img: string; str: number; n: number; start: number }

/** a name mid-sentence: lower case, but places and peoples keep their capital ("2 Giza watchmen", "the Syrian rebel band") */
const midName = (s: string) => s.toLowerCase().replace(/\b(syrian|giza|cairo|bedouin|arnaut|egyptian|alexandria|zagros|persian)\b/g, (w) => w[0].toUpperCase() + w.slice(1));

const NUM_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
/** The band's opening line with its head count as on the card ("Three men ..." for a band of eight reads "Eight men ..."). */
const withBandSize = (text: string, n: number) =>
  text.replace(/^(One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Eleven|Twelve) (men|riders)\b/, (_m, _w, who: string) => `${NUM_WORDS[n] ?? n} ${n === 1 ? (who === 'men' ? 'man' : 'rider') : who}`);

/** What a beaten band is likely to have been riding, by who they are - a village robber on a donkey
 *  is not mounted the same as a Sinai raider. Falls back to the common Egyptian donkey. */
const BAND_MOUNT: Record<string, string> = {
  'egypt-rural-highway-robbers': 'baladi_d',
  'sinai-transjordan-desert-raiders': 'bishari',
  'palestine-road-thieves': 'baladi_d',
  'iraq-border-smuggler-brigands': 'maghrabi',
  'zagros-tribal-raiders': 'baladi_h',
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
  // a band listens to a strong caravan and laughs at a weak one
  const force = mine >= theirs * 1.5 ? 0.2 : mine >= theirs ? 0.1 : mine * 2 < theirs ? -0.2 : -0.08;
  const talkChance = Math.max(0.08, Math.min(0.9, 0.35 + force + guide * 0.3 + Math.min(0.2, (g.skills?.speech ?? 0) / 500) + (rebels ? 0.2 : 0) + (g.cash < 20 && !g.inventory.some((i) => !i.stored) ? 0.25 : 0))); // a man with nothing to take is easier to wave through
  const ratio = theirs / Math.max(1, mine);
  // your name in their book (robbed once with nothing to pay): the price is doubled until you pay in full
  const marked = (g.banditMark ?? 0) > 0;
  // the band's going rate for the road, by its ground and its size, never a share of a merchant's fortune (systems/combat.ts)
  const tax = roadToll(threat.id, size, g.cash, { ratio }) * (marked ? 2 : 1);
  // what they take by force: more than the toll, and still only what a band can carry off
  const robbed = (mult: number, share: number) => Math.min(g.cash, roadToll(threat.id, size, g.cash, { ratio, mult, share }));
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
  const [text, setText] = useState(() => withBandSize(party.id === 'cousins' ? 'Six riders across the road. In front, a man with Selim\'s jaw and Selim\'s gold tooth: his cousin Mahmoud. "Our cousin had to leave Cairo because of you. Someone has to pay for his ticket."' : lines.open, size));
  const [result, setResult] = useState('');
  const [robArt, setRobArt] = useState<string | null>(null);
  // their leader threw down his arms: the picture of it over the account
  const [yielded, setYielded] = useState(false);
  const [spoils, setSpoils] = useState<{ cash: number; joiners: number; animal?: string } | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  // Selim's cousins (the cousins mission): how it went is what the mission remembers; then they go home
  const cousinsDone = (how: 'won' | 'paid' | 'lost' | 'passed') => {
    if (party.id !== 'cousins') return;
    const told = { won: 'Mahmoud Kassab and his cousins are scattered across the Suez road. By evening every coffee house in Suez knows it.', paid: 'You pay Mahmoud Kassab off. He counts it twice and spits. It is cheaper than a fight, and the lane will hear that too.', lost: 'Mahmoud Kassab takes what he came for, and rides off laughing. But he has had his revenge, and the feud is done with.', passed: 'You talk your way past Mahmoud Kassab. He lets you go with a look that says the matter is closed.' }[how];
    const st = useGame.getState();
    useGame.setState({ cousins: how, missionTold: { ...(st.missionTold ?? {}), ambush: told } });
    window.setTimeout(() => { const w = useGame.getState().world; useGame.setState({ world: { ...w, parties: w.parties.filter((p) => p.id !== 'cousins') } }); }, 0);
  };
  const settle = (o: Parameters<typeof g.ambushOutcome>[1]) => {
    audio.encounterOver();
    cousinsDone(o.cashLoss ? 'paid' : 'passed');
    setResult(g.ambushOutcome(party.id, o));
    setSpoils(o.cashGain || o.animalsGained ? { cash: o.cashGain ?? 0, joiners: o.joiners ?? 0, animal: o.animalsGained ? BREEDS[o.animalsGained.id].name : undefined } : null);
    setStage('result');
  };
  // the fight can end well below the fold on a phone (the battlefield picture is tall); once the
  // result is in, bring the Continue button on screen so the game never looks stuck
  useEffect(() => { if (stage === 'result') resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [stage]);
  // the score follows the encounter: tense at the standoff, the fight's own music, quiet after a loss or a burial
  const grim = stage === 'result' && /bury|breaks|give ground|Injury|is gone|knocked/i.test(result ?? '');
  useEffect(() => {
    const m = stage === 'battle' || stage === 'chase' ? 'battle' : stage === 'result' ? (grim ? 'sorrow' : null) : 'danger';
    if (m) audio.pushEnv('encounter', 'road', m); else audio.popEnv('encounter');
  }, [stage, grim]);
  // however it closes (ridden on, paid, talked through, run from, turned back) the encounter's music
  // goes and the calm track comes back, even with the band still about on the map
  useEffect(() => () => audio.encounterOver(), []);
  // the leader speaks his demand aloud
  const speaker = THREAT_VOICE[threat.id] ?? 'robberchief';
  useEffect(() => { voice.load().then(() => voice.preload([speaker])); return () => voice.stop(); }, [speaker]);
  // a buzz on the phone as they ride out at you (feel.ts)
  useEffect(() => { buzz(25); }, []);
  // level-ups and other notices wait until the encounter is over (game/cardTurn.ts)
  useEffect(() => { setHold('fight', true); return () => setHold('fight', false); }, []);
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
    { id: 'you', name: 'You', img: heroFace(g), str: heroStr, n: 1, start: 1 },
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
      leader, leaderImg: threat.leaderImage, heroImg: heroFace(g), heroArt: 'hero',
      temper, known: !!leader?.seen || close, scout: scouted, grounds, camels,
      mountedMen: Object.entries(g.world.party.troops).some(([id, n]) => (n ?? 0) > 0 && TROOPS[id].mounted),
      sergeant: combat.sergeant?.name, arms: g.world.party.arms ?? 0, armsLine, seed: `${party.id}:${g.day}:${combat.wins + combat.losses}`,
      mySide: mySide.map((u) => ({ id: u.id, n: u.n, start: u.start })), troops: { ...g.world.party.troops }, party: g.world.party,
      rifles, mounted,
      // a big band takes more when it wins: loads by its size, and a share of the purse
      stakes: { loads: Math.max(1, Math.min(carried.length || 1, size >= 12 ? 3 : size >= 7 ? 2 : 1)), cash: robbed(size >= 12 ? 1.8 : 1.5, size >= 12 ? 0.45 : 0.35) },
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // one honest forecast, from the same battle the field runs: never certain, and what it usually costs
  const fc = useMemo(() => (rebels ? null : forecast(setupOf(clashInfo))), [clashInfo, rebels]);
  const winPct = fc?.pct ?? null;
  const fcWhy = useMemo(() => (rebels ? '' : forecastWhy(setupOf(clashInfo))), [clashInfo, rebels]);
  const [clashSpoils, setClashSpoils] = useState<ClashSpoils | null>(null);
  // ---- the chase (Chase.tsx, systems/chase.ts): running from them, or riding after a beaten band ----
  const [chase, setChase] = useState<ChaseSetup | null>(null);
  const [fled, setFled] = useState<{ size: number; leader?: string; chased?: boolean } | null>(null);
  const mountedBand = /raiders|smuggler/.test(threat.id);
  const theirPace = mountedBand ? party.speed ?? 30 : 14;
  const run = () => {
    const sp = speedInfo(g.world.party, g.inventory);
    audio.sfx('unfold');
    // the quickest of them come after you; on foot, all of them try
    setChase({ mode: 'flee', seed: `${party.id}:${g.day}:flee`, bandId: threat.id, men: mountedBand ? Math.max(2, Math.ceil(size * 0.6)) : Math.max(2, Math.ceil(size / 2)), mine: sp.pxPerDay, theirs: theirPace, overloaded: sp.over || carried.length > 2 });
    setStage('chase');
  };
  const pursue = () => {
    if (!fled) return;
    const riders = Object.entries(g.world.party.troops).reduce((a, [id, n]) => a + (TROOPS[id]?.mounted ? n ?? 0 : 0), 0);
    const sp = speedInfo(g.world.party, g.inventory);
    // mounted men ride light; without them you follow on what you have
    setChase({ mode: 'pursue', seed: `${party.id}:${g.day}:pursue`, bandId: threat.id, men: fled.size, mine: riders > 0 ? 32 : Math.max(16, sp.pxPerDay * 1.2), theirs: theirPace, riders, leader: fled.leader });
    setFled({ ...fled, chased: true });
    setStage('chase');
  };
  const chaseEnd = (c: ChaseState) => {
    const mode = chase?.mode;
    setChase(null);
    if (mode === 'flee') {
      if (c.over === 'clear') {
        const msg = `You turn the animals and run for it, and they cannot keep up.${c.dropped ? ` ${c.dropped === 1 ? 'One load' : `${c.dropped} loads`} left in the road to do it.` : ''}`;
        g.ambushOutcome(party.id, { text: msg, rugsLost: Math.min(c.dropped, carried.length) });
        onTurnBack(msg);
      } else {
        setText(`They run you down.${c.dropped ? ` You lost ${c.dropped === 1 ? 'a load' : `${c.dropped} loads`} on the way for nothing.` : ''} They surround you and name their price.`);
        if (c.dropped) useGame.getState().ambushOutcome(party.id, { text: 'Loads dropped in the chase.', rugsLost: Math.min(c.dropped, carried.length) });
        setStage('demand');
      }
      return;
    }
    audio.encounterOver();
    const caught = c.runners.filter((r) => r.state === 'caught');
    const lead = caught.some((r) => r.leader);
    const n = caught.filter((r) => !r.leader).length;
    const note = useGame.getState().chaseCaught(party.id, n, lead);
    const esc = c.runners.filter((r) => r.state === 'escaped').map((r) => r.name);
    setResult((r) => `${r} ${caught.length ? `You ride after them and take ${caught.map((x) => x.name).join(', ')}.` : 'You ride after them, but they are gone.'}${esc.length ? ` ${esc.join(', ')} got away.` : ''}`);
    if (note) setClashSpoils((sp) => (sp ? { ...sp, prisoners: sp.prisoners + n, leader: sp.leader ?? (lead ? fled?.leader : undefined) } : sp));
    setStage('result');
  };
  const [recruitNote, setRecruitNote] = useState('');
  const fight = () => {
    audio.sfx('chest');
    audio.fightStart();
    setStage('battle');
  };
  // settle it quickly: the men fight it out without you giving the orders, at the odds shown
  const quick = () => {
    audio.sfx('chest');
    // no field to watch: the volley and the scuffle are heard, then the account
    audio.sfx('volley');
    window.setTimeout(() => audio.sfx('melee'), 450);
    const b = simulate(setupOf(clashInfo), true);
    const L = battleLosses(b);
    finish({ fight: { over: b.over }, lost: L.lost, kills: L.kills, auto: true, hurt: L.hurt, heroDown: L.heroDown });
  };
  // prisoners go to the police without a trip to a town menu: paid when you ride on. Their leader is a
  // choice: the law's bounty, or his band's ransom (he goes free and may come back)
  const [leaderChoice, setLeaderChoice] = useState<'bounty' | 'ransom' | null>(null);
  const [paidNote, setPaidNote] = useState('');
  const settlePrisoners = (choice: 'bounty' | 'ransom') => {
    const note = useGame.getState().policePost(choice);
    setPaidNote(note);
    setLeaderChoice(choice);
    return note;
  };
  const rideOn = () => {
    let r = result;
    if (combatOf(useGame.getState()).prisoners.length > 0) r = `${r} ${useGame.getState().policePost('bounty')}`;
    onDone(r);
  };
  const finish = ({ fight: f, lost, kills, retreat, auto, hurt, heroDown, cost }: ClashEnd) => {
    const lostList = Object.entries(lost).map(([id, n]) => `${n} ${midName(n > 1 ? TROOPS[id].plural : TROOPS[id].name)}`).join(', ');
    const hurtN = Object.values(hurt ?? {}).reduce((a, n) => a + n, 0);
    const lostLine = (lostList ? ` Killed: ${lostList}.` : '') + (hurtN ? ` ${hurtN === 1 ? 'One man is' : `${hurtN} men are`} wounded and will mend.` : '');
    const st = useGame.getState();
    const res = f.over ?? 'draw';
    setYielded(res === 'yield' && !retreat);
    // the field battle stings at its own banner; settled quickly, the sting comes with the account
    if (auto) window.setTimeout(() => audio.fightResult(retreat ? 'lose' : isWin(res) ? 'win' : res === 'draw' ? 'draw' : 'lose'), 700);
    audio.encounterOver();
    const by = auto ? (combat.sergeant ? `Sergeant ${combat.sergeant.name} takes charge. ` : 'Your oldest hand takes charge. ') : '';
    const who = leader?.name ?? 'Their leader';
    const band = midName(threat.displayName);
    let base = '';
    let extra: ClashSpoils | null = null;
    const paid = cost?.paid ?? 0, letGo = cost?.loads ?? 0;
    // the dead and wounded by name, chosen before the counts drop
    const menLine = party.id === 'opening-bandits' ? '' : st.menFight({ lost, hurt, kills, where: BAND_ROAD[party.id] });
    const withMen = (t: string) => (menLine ? `${t} ${menLine}` : t);
    cousinsDone(retreat ? 'lost' : paid ? 'paid' : isWin(res) ? 'won' : res === 'draw' ? 'passed' : 'lost');
    const sideLine = letGo ? ` ${letGo === 1 ? 'One bale was' : `${letGo} bales were`} lost in the fighting.` : '';
    if (paid && res === 'withdraw') {
      // he will remember that you paid
      if (leader) { const c0 = combatOf(useGame.getState()); const l = c0.leaders[party.id]; if (l) useGame.setState({ combat: { ...c0, leaders: { ...c0.leaders, [party.id]: { ...l, past: [...(l.past ?? []), 'bought-off' as const].slice(-6) } } } }); }
      // bought off mid-fight: they ride away with the money, nothing to take from them
      base = st.ambushOutcome(party.id, { cashLoss: Math.min(paid, g.cash), rugsLost: letGo || undefined, troopsLost: lost, theyLeave: true, enemyLost: kills, text: `${by}${who} counts the money twice and leads his men away. It cost ${fmt(paid)}, and nobody else died for it.${sideLine}${lostLine}` });
      setResult(withMen(base)); setClashSpoils(null); setSpoils(null); setStage('result');
      return;
    }
    if (retreat) {
      const wound = Math.random() < 0.25 ? ` ${st.hurt('fight')}` : '';
      base = st.ambushOutcome(party.id, { cashLoss: robbed(0.8, 0.2), rugsLost: 1 + letGo, troopsLost: lost, delayHours: 6, enemyLost: kills, text: `You pull your caravan back and run for it, leaving a bale and some coin behind.${sideLine}${lostLine}${wound}` });
    } else if (isWin(res)) {
      audio.sfx('coins');
      const winWound = heroDown ? ` ${st.hurt('fight')}` : '';
      const head = res === 'yield' ? `${by}${who} throws down his rifle, and his men follow.` : res === 'run' ? `${by}The ${band} break and run.` : `${by}They pull back out of range and ride off. Not a clean win, but the road is yours.`;
      base = st.ambushOutcome(party.id, { rep: res === 'yield' ? 3 : res === 'run' ? 2 : 1, rugsLost: letGo || undefined, troopsLost: lost, theyLeave: true, enemyLost: kills, text: `${head}${sideLine}${lostList ? lostLine : ` None of your men were killed.${hurtN ? lostLine : ''}`}${winWound}` });
      extra = useGame.getState().clashAfter(party.id, { result: res, kills, size, rebels });
      // those who ran can be ridden after
      const left = Math.max(0, size - (extra?.prisoners ?? 0));
      // a band that breaks scatters: the wounded and the slow are counted as fallen, the rest ride off
      const scattered = res === 'yield' ? 0 : Math.min(left, Math.max(Math.ceil(size / 3), size - kills - (extra?.prisoners ?? 0)));
      if (scattered > 0 && !rebels) setFled({ size: Math.min(8, scattered), leader: extra?.leader ? undefined : leader?.name });
    } else if (res === 'draw') {
      base = st.ambushOutcome(party.id, { delayHours: 6, rugsLost: letGo || undefined, troopsLost: lost, theyLeave: true, enemyLost: kills, text: `${by}Neither side will give way, and in the end both pull back. You lose half a day.${sideLine}${lostLine}` });
      extra = useGame.getState().clashAfter(party.id, { result: res, kills, size, rebels });
    } else {
      // beaten: it costs men, a bale or a day, never the game
      audio.sfx('chest');
      const broken = res === 'broken';
      const wound = heroDown || broken || f.duel === 'lost' || Math.random() < 0.3 ? ` ${st.hurt('fight')}` : '';
      const out = broken && f.duel === 'lost' ? ` ${useGame.getState().knockedOut('beaten by raiders')}` : '';
      const loss = Math.round(clashInfo.stakes.cash * (broken ? 1.2 : 1));
      base = st.ambushOutcome(party.id, { cashLoss: loss, rugsLost: clashInfo.stakes.loads + letGo, troopsLost: lost, rep: -1, delayHours: broken ? 10 : 5, enemyLost: kills, text: `${by}${broken ? 'Your line breaks.' : 'Your men give ground and they get in among the loads.'} ${lines.strip}${takenLine(loss)}${lostLine}${wound}${out}` });
      extra = useGame.getState().clashAfter(party.id, { result: res, kills, size, rebels });
    }
    setResult(withMen(extra?.text ? `${base} ${extra.text}` : base));
    setClashSpoils(extra);
    setSpoils(null);
    setStage('result');
  };

  // one measure of strength everywhere: the map label, the party bar and this card all use strength()
  const myPow = mine;
  const enPow = theirs;
  const share = winPct ?? odds;
  // the chance itself, plainly: the same simulation the fight runs on (never a bare share of strength)
  const fightNote = !fc ? '' : `${fc.pct}% · ${fc.word} · ${fc.cost}`;

  return (
    <div className="ambush" data-testid="road-encounter">
      {stage === 'battle' && <Clash info={clashInfo} onEnd={finish} onBack={() => setStage('standoff')} direct />}
      <div className="amb-bg" style={{ backgroundImage: "url(art/troops/escort-road.jpg)" }} />
      <div className="amb-body">
        <div className="amb-head"><small>{rebels ? 'CHECKPOINT' : 'AMBUSH'} · {place}</small><b>{threat.displayName}</b></div>
        {(stage === 'standoff' || stage === 'demand') && !rebels && <img className="amb-rob-art amb-scene" src="art/battle/moments/ambush.webp" alt="" data-testid="amb-scene" />}
        {stage !== 'battle' && stage !== 'chase' && <div className="amb-sides">
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
            {leader && <span className="amb-leader" data-testid="amb-leader">Led by {leader.name}{leader.robbed ? ', who robbed you' : ''}{leader.meets ? ` · ${leader.meets === 1 ? 'you have met once before' : `you have met ${leader.meets} times`}` : ''}</span>}
            {leader && nemesisLine(leader) && <p className="amb-nemesis" data-testid="amb-nemesis">{leader.name}: {nemesisLine(leader)}</p>}
          </div>
        </div>}
        <div className="amb-bar" aria-label={`Your share of the fighting strength: ${share}%`}><i style={{ width: `${share}%` }} /></div>

        {stage === 'chase' && chase && <Chase setup={chase} onEnd={chaseEnd} />}
        {stage === 'standoff' && (
          <>
            <p className="amb-text">{text}</p>
            {fcWhy && <p className="amb-why" data-testid="amb-why">{fcWhy}</p>}
            <div className="amb-opts">
              <button className="btn" onClick={() => { if (Math.random() < talkChance) settle({ rep: 1, theyLeave: true, text: lines.talkOk }); else { setText(lines.talkBad); setStage('demand'); } }} data-testid="amb-talk"><Icon name="talk" /> Talk your way through <small>{Math.round(talkChance * 100)}%{guide ? ', your guide helps' : ''}</small></button>
              {token && <button className="btn primary" onClick={() => settle({ theyLeave: true, text: 'You hold up the chief\'s knotted cord. They look at it, look at each other, and ride off without a word.' })} data-testid="amb-token"><Icon name="shield" /> Show the chief's cord <small>they will let you pass</small></button>}
              {canDeter && <button className="btn" onClick={() => settle({ theyLeave: true, text: 'They count your guards, look at each other, and ride back the way they came.' })} data-testid="amb-deter"><Icon name="shield" /> Show them your guards <small>they are outnumbered</small></button>}
              {short
                ? <button className="btn" onClick={payInKind} data-testid="amb-pay"><Icon name="coin" /> Let them take what you have <small>{payLabel}; something else will have to do</small></button>
                : <button className="btn" onClick={() => payFull(rebels ? 'You make your contribution to the cause. The commander writes you a receipt.' : `You pay ${fmt(tax)} for the road.`)} data-testid="amb-pay"><Icon name="coin" /> {rebels ? 'Make a contribution' : 'Pay for the road'} <small>{fmt(tax)}</small></button>}
              {!rebels && <button className={`btn ${winPct != null && winPct >= 50 ? 'primary' : ''}`} onClick={() => { fight(); }} data-testid="amb-fight"><Icon name="sword" /> Lead the fight <small>{fightNote}</small></button>}
              {!rebels && <button className="btn" onClick={quick} data-testid="amb-quick"><Icon name="people" /> Settle it quickly <small>{combat.sergeant ? `Sergeant ${combat.sergeant.name}` : 'your oldest hand'} fights it out at the same odds</small></button>}
              <button className="btn" onClick={() => { if (!rebels) { run(); return; } if (Math.random() < 0.9) { const msg = rebels ? 'You turn your animals around and go back the way you came. The commander watches you go.' : 'You turn your animals around and go back the way you came. The riders watch from the ridge and let you go.'; g.ambushOutcome(party.id, { text: msg }); onTurnBack(msg); } else { setText('You turn back, but they are faster. They surround you and name their price.'); setStage('demand'); } }} data-testid="amb-turn"><Icon name="camel" /> {rebels ? 'Turn back' : 'Run for it'} <small>{rebels ? 'usually allowed' : theirPace > speedInfo(g.world.party, g.inventory).pxPerDay * 1.1 ? 'they are faster: they will chase you' : 'you can outpace them'}</small></button>
            </div>
          </>
        )}

        {stage === 'demand' && (
          <>
            <p className="amb-text">{text} {lines.demand}</p>
            {fcWhy && <p className="amb-why" data-testid="amb-why">{fcWhy}</p>}
            <div className="amb-opts">
              {short
                ? <button className="btn" onClick={payInKind} data-testid="amb-pay"><Icon name="coin" /> Let them take what you have <small>{payLabel}; something else will have to do</small></button>
                : <button className="btn" onClick={() => payFull(`You pay ${fmt(tax)}. They let you go.`)} data-testid="amb-pay"><Icon name="coin" /> Pay <small>{fmt(tax)}</small></button>}
              <button className="btn" onClick={() => { if (ratio >= 2) { const loss = robbed(2, 0.5); settle({ cashLoss: loss, rugsLost: 2, rep: -1, text: `${lines.strip}${takenLine(loss)}` }); } else { fight(); } }} data-testid="amb-refuse"><Icon name="hand" /> Refuse <small>{ratio >= 2 ? 'they are far stronger' : 'they will fight'}</small></button>
              {!rebels && <button className={`btn ${winPct != null && winPct >= 50 ? 'primary' : ''}`} onClick={() => { fight(); }} data-testid="amb-fight"><Icon name="sword" /> Fight <small>{fightNote}</small></button>}
            </div>
          </>
        )}

        {stage === 'result' && (
          <div ref={resultRef}>
            {robArt && <img className="amb-rob-art" src={`art/events/${robArt}.webp`} alt="" data-testid="rob-art" />}
            {!robArt && yielded && <img className="amb-rob-art" src="art/battle/moments/surrender.webp" alt="" data-testid="surrender-art" />}
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
                {clashSpoils.prisoners > 0 && <span data-testid="spoils-prisoners"><Icon name="people" /> {clashSpoils.prisoners} {clashSpoils.prisoners > 1 ? 'prisoners' : 'prisoner'} · +{fmt(clashSpoils.prisoners * PRISONER_BOUNTY)}</span>}
              </div>
            )}
            {clashSpoils && clashSpoils.leader && !leaderChoice && (() => { const l = leader; const bounty = l?.bounty ?? 0; const men = clashSpoils.prisoners * PRISONER_BOUNTY; return (
              <div className="amb-choice" data-testid="leader-choice">
                <p className="amb-note">{clashSpoils.leader} sits tied by the camels, and says nothing.</p>
                <button className="btn primary" onClick={() => settlePrisoners('bounty')} data-testid="leader-bounty"><Icon name="shield" /> Hand him to the police <small>{fmt(bounty + men)} · his road goes quiet for weeks</small></button>
                {l && <button className="btn" onClick={() => settlePrisoners('ransom')} data-testid="leader-ransom"><Icon name="coin" /> Let his band ransom him <small>{fmt(ransomFor(l) + men)} · he goes free, and remembers you</small></button>}
              </div>
            ); })()}
            {clashSpoils && clashSpoils.prisoners > 0 && !clashSpoils.leader && !paidNote && <p className="amb-note" data-testid="prisoner-note">The police post pays the bounty when you ride on.</p>}
            {paidNote && <p className="amb-note" data-testid="paid-note">{paidNote}</p>}
            {clashSpoils && clashSpoils.willing > 0 && !recruitNote && !paidNote && (
              <button className="btn amb-recruit" disabled={troopRoom(g) < 1} onClick={() => setRecruitNote(useGame.getState().recruitPrisoners(clashSpoils.willing))} data-testid="amb-recruit">
                <Icon name="people" /> Take on the willing <small>{troopRoom(g) < 1 ? 'you lead as many men as your name allows' : `${clashSpoils.willing} of the prisoners will ride for you`}</small>
              </button>
            )}
            {recruitNote && <p className="amb-note" data-testid="recruit-note">{recruitNote}</p>}
            {fled && !fled.chased && fled.size > 0 && (
              <button className="btn amb-recruit" onClick={pursue} data-testid="amb-pursue">
                <Icon name="run" /> Ride after them <small>{fled.size} {fled.size === 1 ? 'man is' : 'men are'} running{fled.leader ? `, ${fled.leader} with them` : ''}</small>
              </button>
            )}
            <button className="btn primary big" disabled={!!clashSpoils?.leader && !leaderChoice} onClick={rideOn} data-testid="encounter-continue">{clashSpoils?.leader && !leaderChoice ? 'Decide about him first' : 'Ride on'}</button>
          </div>
        )}
      </div>
    </div>
  );
}
