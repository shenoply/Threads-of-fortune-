// Road fights, as a short game of nerve: three rounds, each one an order given against what you can see
// the band doing. Read them right and they break; read them wrong and your own men waver.
//
//   Before:  the band's size, arms and leader; the ground you stand on and how the men are drawn up.
//   Rounds:  their leader shows his hand (a line of text and his men moving on the field); you answer with
//            Volley, Hold, Charge, Flank or Parley. Each answer beats some moves and loses to others.
//   Leader:  once their nerve is going you may call their leader out: three passes, strike when his guard opens.
//   After:   spoils, prisoners for the police post, bounties on named leaders, and men who rise in rank.
//
// All of it is plain functions on plain data (the store and the screens call these), so it can be tested
// and the odds worked out exactly, without a simulation.

import { TROOPS } from '../../data/caravan';

export type Temper = 'reckless' | 'cunning' | 'cautious';
/** what the band does in a round */
export type Move = 'rush' | 'snipe' | 'circle' | 'waver';
/** what you see them do: a cunning leader's feint looks like a rush with the leader hanging back */
export type Tell = Move | 'feint';
export type Order = 'volley' | 'hold' | 'charge' | 'flank' | 'parley';
export type GroundId = 'road' | 'ridge' | 'wadi' | 'walls' | 'camels' | 'bank';
export type Formation = 'line' | 'square' | 'wings';

export const ORDERS: Order[] = ['volley', 'hold', 'charge', 'flank', 'parley'];
export const ROUNDS = 3;

/** How each order fares against each move: 2 the right answer, 1 good, 0 even, -1 a mistake. */
export const SCORE: Record<Move, Record<Order, number>> = {
  rush: { volley: 2, hold: 1, charge: 0, flank: -1, parley: -1 },
  snipe: { volley: -1, hold: -1, charge: 1, flank: 2, parley: 0 },
  circle: { volley: 1, hold: 2, charge: -1, flank: 0, parley: -1 },
  waver: { volley: 0, hold: -1, charge: 2, flank: 1, parley: 1 },
};
export const moveOf = (t: Tell): Move => (t === 'feint' ? 'circle' : t);
/** the best answer to what you see */
export const bestOrder = (t: Tell): Order => (ORDERS.reduce((a, o) => (SCORE[moveOf(t)][o] > SCORE[moveOf(t)][a] ? o : a), 'volley' as Order));

// what each order is, not what it beats: reading the band is the game (the outcome lines teach it)
export const ORDER_INFO: Record<Order, { name: string; hint: string }> = {
  volley: { name: 'Volley', hint: 'Every rifle fires at once' },
  hold: { name: 'Hold', hint: 'Close up behind the loads and wait' },
  charge: { name: 'Charge', hint: 'Go in at them with everything' },
  flank: { name: 'Flank', hint: 'Send men round the side' },
  parley: { name: 'Parley', hint: 'Stand up and call out terms' },
};

/** What each move looks like from your side of the field. */
export const TELL_LINES: Record<Tell, string[]> = {
  rush: ['They come on at a gallop, the leader at their head.', 'The whole band breaks into a run straight at you, the leader in front.', 'They close in a rush, yelling, their leader out ahead.'],
  feint: ['They come on at a gallop, but the leader keeps back.', 'A few men run at you shouting. Their leader does not go with them.', 'Their front men charge, but the leader stays behind and looks to your side.'],
  snipe: ['They go to ground behind the rocks and start shooting.', 'They drop flat in the scrub and fire from cover.', 'Puffs of smoke from the stones: they mean to pick you off from where they lie.'],
  circle: ['Riders peel off to your left, keeping out of range.', 'Half the band slips away round your flank.', 'They spread out wide, working round the ends of your line.'],
  waver: ['Some of them look back over their shoulders.', 'They bunch together and argue. Nobody comes forward.', 'Two men edge back toward the horses. The rest hesitate.'],
};
/** What their leader does each round: how you learn his temper. */
export const TEMPER_LINES: Record<Temper, string[]> = {
  reckless: ['Their leader waves his rifle over his head and roars at his men.', 'Their leader rides up and down in the open, daring you to shoot.', 'Their leader shouts that you are women and cowards.'],
  cunning: ['Their leader says nothing. He is watching your left.', 'Their leader sends a boy running along his line with a message.', 'Their leader smiles, and points his men with his stick.'],
  cautious: ['Their leader keeps well back and calls his men to keep their heads down.', 'Their leader stays behind a rock and counts your rifles.', 'Their leader tells his men to wait. He is in no hurry.'],
};
export const TEMPER_WORD: Record<Temper, string> = { reckless: 'reckless', cunning: 'cunning', cautious: 'cautious' };

/** How each temper chooses its move; a band losing its nerve falters whatever its leader is like. */
const TEMPER_MOVES: Record<Temper, Record<Tell, number>> = {
  reckless: { rush: 0.55, feint: 0, snipe: 0.1, circle: 0.2, waver: 0.15 },
  cunning: { rush: 0.1, feint: 0.25, snipe: 0.3, circle: 0.25, waver: 0.1 },
  cautious: { rush: 0.1, feint: 0, snipe: 0.5, circle: 0.15, waver: 0.25 },
};
export function tellOdds(temper: Temper, morale: number): Record<Tell, number> {
  const w = { ...TEMPER_MOVES[temper] };
  if (morale < 45) w.waver += 0.45;
  const sum = Object.values(w).reduce((a, b) => a + b, 0);
  return Object.fromEntries(Object.entries(w).map(([k, v]) => [k, v / sum])) as Record<Tell, number>;
}

// ---------- the ground and the formation ----------
export interface Ground { id: GroundId; name: string; note: string; pow: number; def: number; favours: Order }
export const GROUNDS: Record<GroundId, Ground> = {
  road: { id: 'road', name: 'Stand on the road', note: 'Open ground, no help from it', pow: 1, def: 1, favours: 'charge' },
  ridge: { id: 'ridge', name: 'Take the ridge', note: 'Your rifles reach further: volleys tell', pow: 1.15, def: 0.95, favours: 'volley' },
  wadi: { id: 'wadi', name: 'Drop into the wadi', note: 'Hidden ground: good for getting round them', pow: 1, def: 0.85, favours: 'flank' },
  walls: { id: 'walls', name: 'Hold the well station walls', note: 'Stone walls: hard to shift you', pow: 0.95, def: 0.65, favours: 'hold' },
  camels: { id: 'camels', name: 'Kneel the camels as a wall', note: 'Fire over the loads; they will not get round you', pow: 1, def: 0.8, favours: 'hold' },
  bank: { id: 'bank', name: 'Line the canal bank', note: 'A ditch to fire from', pow: 1.05, def: 0.85, favours: 'volley' },
};
export const FORMATIONS: Record<Formation, { name: string; note: string; pow: number; def: number; favours?: Order }> = {
  line: { name: 'Line', note: 'Every rifle can fire', pow: 1.1, def: 1.1, favours: 'volley' },
  square: { name: 'Close square', note: 'Harder to break, slower to hit', pow: 0.9, def: 0.85, favours: 'hold' },
  wings: { name: 'Riders on the wings', note: 'Quick to go round or go in', pow: 1, def: 1, favours: 'flank' },
};

/** The ground on offer where the caravan stands. */
export function groundsAt(o: { terrain: string; nearWell: boolean; camels: number }): GroundId[] {
  const out: GroundId[] = ['road'];
  if (o.nearWell) out.push('walls');
  if (['hills', 'mountains', 'desert'].includes(o.terrain)) out.push('ridge');
  if (['desert', 'hills'].includes(o.terrain)) out.push('wadi');
  if (['road', 'fertile', 'river', 'canal', 'bridge', 'ford'].includes(o.terrain)) out.push('bank');
  if (o.camels >= 2) out.push('camels');
  return out.slice(0, 4);
}

// ---------- a fight ----------
export interface Setup {
  myPow: number; enPow: number; temper: Temper;
  /** you know his temper (a guide, a scout, a strong party, or you have fought him before) */
  known: boolean;
  /** a scout calls out a feint */
  scout: boolean;
  ground: GroundId; formation: Formation;
  /** a named sergeant steadies the men */
  sergeant: boolean;
  seed: string;
}
export interface RoundLog { round: number; tell: Tell; order: Order | 'duel'; score: number; myLoss: number; enLoss: number; text: string; yielded?: boolean }
export interface Fight {
  setup: Setup; round: number; my: number; en: number;
  /** what they are doing this round (shown before you choose) */
  tell: Tell; leaderLine: string; tellLine: string;
  log: RoundLog[];
  duel?: 'won' | 'lost';
  over?: Result;
}
export type Result = 'run' | 'yield' | 'withdraw' | 'draw' | 'pushed' | 'broken';
export const isWin = (r?: Result) => r === 'run' || r === 'yield' || r === 'withdraw';

export function hashSeed(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function rngFrom(seed: string) { let a = hashSeed(seed); return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pickW = <T extends string>(w: Record<T, number>, r: number): T => { let acc = 0; const ks = Object.keys(w) as T[]; for (const k of ks) { acc += w[k]; if (r < acc) return k; } return ks[ks.length - 1]; };
const pick = <T,>(xs: T[], r: number) => xs[Math.floor(r * xs.length) % xs.length];

export const powRatio = (s: Setup) => Math.max(0.4, Math.min(2.5, ((s.myPow * GROUNDS[s.ground].pow * FORMATIONS[s.formation].pow) / Math.max(1, s.enPow)) ** 0.75));
const defOf = (s: Setup) => GROUNDS[s.ground].def * FORMATIONS[s.formation].def;

/** The round's score with the ground and the formation counted: their favoured order does a little better. */
export function scoreOf(s: Setup, tell: Tell, order: Order) {
  let v = SCORE[moveOf(tell)][order];
  if (GROUNDS[s.ground].favours === order && v < 2) v += 0.5;
  if (FORMATIONS[s.formation].favours === order && v < 2) v += 0.5;
  return Math.min(2, v);
}
/** what one round costs each side in nerve (0-100 each) */
export function losses(s: Setup, tell: Tell, order: Order) {
  const v = scoreOf(s, tell, order), r = powRatio(s);
  const brawl = order === 'charge' && moveOf(tell) === 'rush' ? 1.6 : 1;
  const en = Math.max(4, Math.round((10 + 20 * v) * r * brawl));
  const my = Math.max(4, Math.round(((40 - 15 * v) / r) * defOf(s) * brawl * (s.sergeant ? 0.9 : 1)));
  return { v, en, my };
}
/** a parley lands on a faltering band whose nerve is down to this (a cautious leader gives in soonest) */
export const yieldsAt = (t: Temper) => (t === 'cautious' ? 65 : t === 'cunning' ? 50 : 40);

/** they are low enough on nerve that their leader can be called out */
export const duelOpen = (f: Fight) => !f.duel && f.en > 0 && f.en <= 40 && f.my > 0 && (!f.over || f.over === 'draw' || f.over === 'pushed' || f.over === 'withdraw');

function nextTell(f: Pick<Fight, 'setup' | 'round' | 'en'>): { tell: Tell; leaderLine: string; tellLine: string } {
  const rng = rngFrom(`${f.setup.seed}:${f.round}:${Math.round(f.en)}`);
  const tell = pickW(tellOdds(f.setup.temper, f.en), rng());
  return { tell, leaderLine: pick(TEMPER_LINES[f.setup.temper], rng()), tellLine: pick(TELL_LINES[tell], rng()) };
}

export function startFight(setup: Setup): Fight {
  const my = 100;
  const f = { setup, round: 1, my, en: 100, log: [] as RoundLog[] };
  return { ...f, ...nextTell(f) };
}

const OUTCOME_LINES: Record<Order, Record<'best' | 'good' | 'even' | 'bad', string>> = {
  volley: { best: 'Your volley catches them in the open. Men go down and the rest pull up short.', good: 'Your rifles crack together and they lose heart.', even: 'You trade shots. Nobody gains much.', bad: 'Your men waste their shots on rocks while the bullets come back at them.' },
  hold: { best: 'Your men close up behind the loads. The riders find no way in and sheer off.', good: 'The line holds. They come no closer.', even: 'You hold, they hold. The sun climbs.', bad: 'You wait, and they use the time. Your men grow nervous.' },
  charge: { best: 'Your men go in shouting and the band scatters before them.', good: 'You rush them out of the scrub and they give ground.', even: 'The two lines meet in a scrum of sticks and rifle butts.', bad: 'You charge into empty ground and they hit you from the side.' },
  flank: { best: 'Your men come round the rocks behind them. They jump up and run.', good: 'A few of your men get round the side. They have to shift.', even: 'Your flankers and theirs pass each other in the scrub.', bad: 'You split your men just as they come at you. It goes badly.' },
  parley: { best: 'You call out terms. They listen.', good: 'You call out terms. Some of them listen.', even: 'You call out terms. They shout back an insult and go on shooting.', bad: 'You stand up to talk and they come at you while you do.' },
};
const band = (v: number) => (v >= 2 ? 'best' : v >= 1 ? 'good' : v >= 0 ? 'even' : 'bad');

function finishIfDone(f: Fight): Fight {
  if (f.en <= 0) return { ...f, en: 0, over: 'run' };
  if (f.my <= 0) return { ...f, my: 0, over: 'broken' };
  if (f.round > ROUNDS) {
    const d = f.my - f.en;
    return { ...f, over: d > 20 && f.en < 35 ? 'withdraw' : d < -8 ? 'pushed' : 'draw' };
  }
  return { ...f, ...nextTell(f) };
}

/** One round: your order against what they are doing. */
export function playRound(f: Fight, order: Order): Fight {
  if (f.over) return f;
  const s = f.setup;
  const { v, en, my } = losses(s, f.tell, order);
  // terms they will take: a faltering band, low enough in nerve for its leader's temper
  if (order === 'parley' && moveOf(f.tell) === 'waver' && f.en - en <= yieldsAt(s.temper)) {
    const log: RoundLog = { round: f.round, tell: f.tell, order, score: 2, myLoss: 0, enLoss: f.en, text: 'You call out terms: their lives and their horses for their rifles. One by one they lay their arms down.', yielded: true };
    return { ...f, en: 0, log: [...f.log, log], round: f.round + 1, over: 'yield' };
  }
  const log: RoundLog = { round: f.round, tell: f.tell, order, score: v, myLoss: my, enLoss: en, text: OUTCOME_LINES[order][band(v)] };
  return finishIfDone({ ...f, my: f.my - my, en: f.en - en, log: [...f.log, log], round: f.round + 1 });
}

/** The duel's three passes are played on the screen; this takes how many you won. Two of three wins it. */
export function settleDuel(f: Fight, hits: number): Fight {
  const won = hits >= 2;
  const log: RoundLog = { round: f.round, tell: f.tell, order: 'duel', score: won ? 2 : -1, myLoss: won ? 0 : 30, enLoss: won ? f.en : -15, text: won ? 'Their leader goes down in the dust. His men throw down their rifles.' : 'Their leader beats you back to your own line, and his men cheer him.', yielded: won };
  if (won) return { ...f, duel: 'won', en: 0, log: [...f.log, log], over: 'yield' };
  const g: Fight = { ...f, over: undefined, duel: 'lost' as const, my: f.my - 30, en: Math.min(100, f.en + 15), log: [...f.log, log] };
  if (g.my <= 0) return { ...g, my: 0, over: 'broken' };
  // he showed his hand: the same round goes on with a fresh look at them
  return g.round > ROUNDS ? finishIfDone(g) : { ...g, ...nextTell(g) };
}
/** how wide his opening is in the duel (share of the sweep): your arms widen it, a cunning man narrows it */
export const duelWindow = (temper: Temper, arms: number) => Math.min(0.34, (temper === 'cunning' ? 0.16 : temper === 'reckless' ? 0.24 : 0.2) + arms * 0.03);

// ---------- odds ----------
/** Orders a commander gives: `read` is how often he picks the right answer to what he sees. */
export interface Policy { read: number; seesFeint: boolean }
export const PLAYER: Policy = { read: 0.8, seesFeint: false };
/** the sergeant handling it: sound but slower to read them than a careful master */
export const sergeantPolicy = (named: boolean, scout: boolean): Policy => ({ read: named ? 0.74 : 0.68, seesFeint: scout });

function policyOrders(p: Policy, tell: Tell, scout: boolean): [Order, number][] {
  const seen: Tell = tell === 'feint' && !(p.seesFeint || scout) ? 'rush' : tell;
  const best = bestOrder(seen);
  return ORDERS.map((o): [Order, number] => [o, o === best ? p.read : (1 - p.read) / (ORDERS.length - 1)]);
}

/** The chance to win, worked out exactly over every move they might make and every answer the policy gives. */
export function winOdds(setup: Setup, policy: Policy = PLAYER): number {
  const tempers: Temper[] = setup.known ? [setup.temper] : ['reckless', 'cunning', 'cautious'];
  let total = 0;
  for (const temper of tempers) {
    const s = { ...setup, temper };
    const go = (f: Fight): number => {
      if (f.over) return isWin(f.over) ? 1 : 0;
      let p = 0;
      for (const [tell, pt] of Object.entries(tellOdds(temper, f.en)) as [Tell, number][]) {
        if (!pt) continue;
        for (const [o, po] of policyOrders(policy, tell, s.scout)) p += pt * po * go(playRound({ ...f, tell }, o));
      }
      return p;
    };
    total += go(startFight(s));
  }
  return Math.round((total / tempers.length) * 100);
}

/** "Let the sergeant handle it": the whole fight played out by his orders, a little worse than your own. */
export function autoFight(setup: Setup, named: boolean): Fight {
  const pol = sergeantPolicy(named, setup.scout);
  const rng = rngFrom(`${setup.seed}:auto`);
  let f = startFight(setup);
  while (!f.over) {
    let r = rng(), o: Order = 'hold';
    for (const [k, p] of policyOrders(pol, f.tell, setup.scout)) { o = k; if ((r -= p) < 0) break; }
    f = playRound(f, o);
  }
  return f;
}

// ---------- the men: experience and rank ----------
/** Who a man becomes when he has seen enough: the village lad gets a rifle, the guard becomes a veteran. */
export const PROMOTE: Record<string, { to: string; xp: number }> = {
  fellah: { to: 'guard', xp: 4 },
  watchman: { to: 'sentinel', xp: 5 },
  reformed: { to: 'guard', xp: 5 },
  guard: { to: 'veteran', xp: 8 },
  sentinel: { to: 'veteran', xp: 8 },
  harbour: { to: 'veteran', xp: 8 },
  bedouin: { to: 'desertcaptain', xp: 8 },
};
export const SERGEANT_NAMES = ['Mansour', 'Hamdi', 'Abdel-Sattar', 'Ragab', 'Suleiman', 'Fathi'];
/** wins before one of your veterans takes charge of the men */
export const SERGEANT_AFTER = 3;

/** Experience after a fight, and any promotions it earns. Pure: returns the new troops and xp. */
export function promote(troops: Record<string, number>, xp: Record<string, number>, gain: number) {
  const t = { ...troops }, x = { ...xp };
  const ups: { from: string; to: string }[] = [];
  for (const [id, n] of Object.entries(troops)) {
    if (!n || !PROMOTE[id]) continue;
    x[id] = (x[id] ?? 0) + n * gain;
    while ((t[id] ?? 0) > 0 && x[id] >= PROMOTE[id].xp) {
      x[id] -= PROMOTE[id].xp;
      t[id]--; t[PROMOTE[id].to] = (t[PROMOTE[id].to] ?? 0) + 1;
      ups.push({ from: id, to: PROMOTE[id].to });
    }
    if (!t[id]) x[id] = 0;
  }
  return { troops: t, xp: x, ups };
}
export const promotionLine = (ups: { from: string; to: string }[]) => {
  if (!ups.length) return '';
  const by = new Map<string, number>();
  for (const u of ups) by.set(`${u.from}>${u.to}`, (by.get(`${u.from}>${u.to}`) ?? 0) + 1);
  return [...by].map(([k, n]) => { const [a, b] = k.split('>'); return `${n === 1 ? `One of your ${TROOPS[a].plural.toLowerCase()}` : `${n} of your ${TROOPS[a].plural.toLowerCase()}`} ${n === 1 ? 'has' : 'have'} earned ${n === 1 ? 'his' : 'their'} place: ${n === 1 ? `a ${TROOPS[b].name.toLowerCase()} now` : `${TROOPS[b].plural.toLowerCase()} now`}.`; }).join(' ').replace(/bedouin/g, 'Bedouin');
};

// ---------- named leaders and the police post ----------
export interface Leader {
  name: string; temper: Temper;
  /** in piastres, paid at a police post for the man himself */
  bounty: number;
  status: 'free' | 'held' | 'jailed';
  /** you have seen him fight: his temper is known */
  seen?: boolean;
  /** he got away from you, or was ransomed: he is back with a grudge */
  grudge?: boolean;
  /** the day his band robbed you: your score to settle */
  robbed?: number;
  /** jailed: his band keeps off its road until this day, then a new man leads it */
  clearUntil?: number;
  /** which leader of this band he is (a jailed man is replaced by the next) */
  gen: number;
}
export interface Prisoner { band: string; n: number; leader?: boolean; day: number }
export interface CombatState {
  wins: number; losses: number;
  xp: Record<string, number>;
  sergeant?: { name: string; fights: number };
  /** good rifles your men carry (bought at a guard yard, or taken from a beaten band) */
  rifles: number;
  /** rifles taken that nobody carries: sell them at a guard yard */
  spare: number;
  prisoners: Prisoner[];
  leaders: Record<string, Leader>;
}
export const combatStart = (): CombatState => ({ wins: 0, losses: 0, xp: {}, rifles: 0, spare: 0, prisoners: [], leaders: {} });

/** The bands on the map with a leader worth a poster, and the road each one watches. */
export const BAND_ROAD: Record<string, string> = {
  rb0: 'the Cairo to Suez road', rb1: 'the Suez to Sinai track', rb2: 'the Jaffa to Jerusalem road', rb3: 'the Jerusalem to Damascus road',
  rb4: 'the Damascus to Baghdad track', rb5: 'the Aleppo to Konya road', r0: 'the Sinai tracks', r1: 'the Syrian desert',
};
const LEADER_NAMES: Record<string, string[]> = {
  'egypt-rural-highway-robbers': ['Abdel-Al the Cudgel', 'Mahmoud Abu Shusha', 'Sayed the Lame', 'Khamis Abu Daif'],
  'sinai-transjordan-desert-raiders': ['Mutlaq ibn Hamad', 'Farhan the Grey', 'Sweilim Abu Rabia', 'Hamad al-Ghanim'],
  'palestine-road-thieves': ['Khalil Abu Rish', 'Daoud the Lean', 'Yusuf Abu Shanab', 'Salim the Fox'],
  'syria-1925-rebels': ['Commander Hamdi', 'Commander Shukri', 'Commander Ramadan'],
  'iraq-border-smuggler-brigands': ['Jassim al-Hadid', 'Abu Zaid the Smuggler', 'Ghazi the One-Eyed', 'Kadhim Abu Tabar'],
};
/** bands of the same kind start from different names */
const BAND_SLOT: Record<string, number> = { rb0: 0, rb1: 0, rb2: 0, rb3: 1, rb4: 0, rb5: 1, r0: 2, r1: 3 };
export function newLeader(partyId: string, threatId: string, strength: number, gen: number): Leader {
  const rng = rngFrom(`${partyId}#${gen}`);
  const names = LEADER_NAMES[threatId] ?? LEADER_NAMES['egypt-rural-highway-robbers'];
  const temper = pick<Temper>(['reckless', 'cunning', 'cautious'], rng());
  return { name: names[((BAND_SLOT[partyId] ?? hashSeed(partyId)) + gen) % names.length], temper, bounty: 100 + strength * 15 + Math.round(rng() * 6) * 10, status: 'free', gen };
}
/** piastres a police post pays for each ordinary prisoner */
export const PRISONER_BOUNTY = 25;
/** what his band will pay to have their leader back: more than the bounty, but he goes free */
export const ransomFor = (l: Leader) => Math.round(l.bounty * 1.6);
/** days a band keeps off its road after its leader is jailed */
export const CLEAR_DAYS = 25;
/** wins before weak bands step aside for you */
export const NAME_ON_ROAD = 5;
/** Price of a good rifle at a guard yard, and what a yard pays for one you took. */
export const RIFLE_PRICE = 120, RIFLE_SELL = 50;

/** Men down on each side over a fight: theirs from how hard each round hit them, yours one for each bad
 *  round (the cheapest man first: the village lads are in front), and one more if your line broke. */
export function casualties(log: RoundLog[], size: number, troops: Record<string, number>, result?: Result) {
  let kills = 0;
  const lost: Record<string, number> = {};
  const left = { ...troops };
  const fall = () => {
    const id = Object.keys(left).filter((k) => (left[k] ?? 0) > 0).sort((a, b) => (TROOPS[a]?.strength ?? 1) - (TROOPS[b]?.strength ?? 1))[0];
    if (id) { left[id]--; lost[id] = (lost[id] ?? 0) + 1; }
  };
  for (const r of log) {
    if (r.order !== 'duel' && !r.yielded) kills += Math.round(((size * Math.max(0, Math.min(100, r.enLoss))) / 100) * 0.45);
    if (r.myLoss >= 35) fall();
  }
  if (result === 'broken') fall();
  return { kills: Math.min(kills, Math.max(0, size - 1)), lost };
}

/** How each move reads in the recap after a fight. */
export const TELL_SHORT: Record<Tell, string> = { rush: 'They rushed you', feint: 'A feint, then round your side', snipe: 'They shot from cover', circle: 'They went round your side', waver: 'They faltered' };

/** A word from your sergeant before it starts (text only). */
export function sergeantWord(o: { temper: Temper; known: boolean; grudge?: boolean; ground: GroundId }): string {
  if (o.grudge) return 'It is the same man as before. He will want to pay us back. Let him try.';
  if (!o.known) return 'I do not know this one. Watch how he moves the first time, and we shall learn him.';
  if (o.temper === 'reckless') return o.ground === 'ridge' ? 'He will come straight up at us. Good. Let him come, and fire together.' : 'He will come straight at us. Let him come, and fire together.';
  if (o.temper === 'cunning') return 'That one is clever. Watch where he rides himself, not where his men go.';
  return 'He will sit in the rocks all day if we let him. We shall have to go round and fetch him out.';
}
