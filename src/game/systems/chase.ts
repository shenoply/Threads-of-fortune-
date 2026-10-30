// A chase on the road, played while you hold the button down. Two ways round:
//
//   pursue: a beaten band scatters and you ride after them. Each man runs at his own pace for the
//           broken ground; hold to spur on and your riders close, let go and the horses get their wind
//           back. Each one is either run down ("Your riders drag Hamid from his saddle") or reaches cover
//           ("Daoud gets into the rocks and is gone"). Riders can only take so many: one man each.
//   flee:   you turn and run with the loads. Hold to drive the animals on; they tire, a laden camel
//           sheds a bale when pushed too hard, and the riders behind fall away one by one as their
//           horses blow. Open enough of a lead and you are clear; let them close and they have you.
//
// Plain functions on plain data, stepped by the screen every frame, so the odds can be tested.
import { rngFrom } from './combat';

export type ChaseMode = 'pursue' | 'flee';
export interface Runner { name: string; gap: number; pace: number; state: 'running' | 'caught' | 'escaped' | 'dropped'; leader?: boolean }
export interface ChaseLine { t: number; text: string; kind: 'good' | 'bad' | 'note' }
export interface ChaseState {
  mode: ChaseMode; t: number; limit: number;
  /** your horses' or animals' wind, 0-100 */
  wind: number;
  /** your pace and theirs, in the same units (miles a day on the road) */
  mine: number; theirs: number;
  runners: Runner[];
  /** flee: your lead on the nearest rider, 0 (caught) to 100 (clear away) */
  lead: number;
  /** pursue: how many more your riders can take */
  hands: number;
  /** flee: loads dropped to lighten the animals */
  dropped: number;
  overloaded: boolean;
  log: ChaseLine[];
  over?: 'clear' | 'caught' | 'done';
  seed: string; tick: number;
}

const NAMES: Record<string, string[]> = {
  egypt: ['Hamid', 'Mahmoud', 'Sayed', 'Abdu', 'Mitwalli', 'Ragab', 'Hassanein', 'Shaaban', 'Fathi', 'Zaki', 'Daoud', 'Barakat', 'Hanafi', 'Tolba'],
  sinai: ['Salem', 'Suleiman', 'Eid', 'Musallam', 'Hamdan', 'Sabah', 'Awad', 'Khalaf', 'Odeh', 'Swelim', 'Farraj', 'Atiya'],
  levant: ['Daoud', 'Khalil', 'Yousef', 'Nimr', 'Saleh', 'Mustafa', 'Fares', 'Jaber', 'Hussein', 'Naji', 'Shukri', 'Wadie'],
  iraq: ['Jasim', 'Abbas', 'Kadhim', 'Hamza', 'Sattar', 'Mahdi', 'Falih', 'Rahim', 'Shakir', 'Hashim', 'Jabbar', 'Lafta'],
  zagros: ['Rostam', 'Karim', 'Bahram', 'Jafar', 'Aziz', 'Mirza', 'Qasem', 'Rahman', 'Hamid', 'Sohrab', 'Ahmad', 'Shirzad'],
};
export const regionOf = (bandId: string) => (/zagros/.test(bandId) ? 'zagros' : /iraq|smuggler/.test(bandId) ? 'iraq' : /sinai|desert/.test(bandId) ? 'sinai' : /palestine|syria|rebel/.test(bandId) ? 'levant' : 'egypt');

const pick = <T,>(xs: T[], r: number) => xs[Math.floor(r * xs.length) % xs.length];

export interface ChaseSetup {
  mode: ChaseMode; seed: string; bandId: string;
  /** men in the chase: those who scattered (pursue) or riders sent after you (flee) */
  men: number;
  mine: number; theirs: number;
  /** pursue: mounted men of yours who can each take one; you count as one */
  riders?: number;
  /** pursue: the band's leader running with them */
  leader?: string;
  overloaded?: boolean;
}

export function startChase(s: ChaseSetup): ChaseState {
  const rng = rngFrom(`${s.seed}:chase`);
  const pool = [...NAMES[regionOf(s.bandId)]];
  const runners: Runner[] = [];
  const n = Math.max(1, Math.min(10, s.men));
  for (let i = 0; i < n; i++) {
    const k = Math.floor(rng() * pool.length);
    const name = pool.splice(k, 1)[0] ?? `rider ${i + 1}`;
    // the mounts are not all alike: a few are quick, most are ordinary, one or two are spent already
    const pace = 0.82 + rng() * 0.36;
    runners.push({ name, pace, gap: s.mode === 'pursue' ? 16 + rng() * 26 : 0, state: 'running' });
  }
  if (s.mode === 'pursue' && s.leader) runners.unshift({ name: s.leader, pace: 1.12, gap: 34, state: 'running', leader: true });
  return {
    mode: s.mode, t: 0, limit: s.mode === 'pursue' ? 14 : 16, wind: 100, mine: s.mine, theirs: s.theirs, runners,
    lead: s.mode === 'flee' ? 22 : 0, hands: Math.max(1, (s.riders ?? 0) + 1), dropped: 0, overloaded: !!s.overloaded,
    log: [{ t: 0, kind: 'note', text: s.mode === 'pursue' ? 'They scatter for the broken ground. Hold to ride them down.' : `${n} ${n === 1 ? 'rider comes' : 'riders come'} after you. Hold to drive the animals on.` }],
    seed: s.seed, tick: 0,
  };
}

/** The pace your side makes, as a share of theirs: the meaning of "speed" in a chase. */
export const paceRatio = (c: Pick<ChaseState, 'mine' | 'theirs'>) => c.mine / Math.max(1, c.theirs);

/** One step of the chase: dt seconds, with the button held or not. */
export function stepChase(c0: ChaseState, dt: number, push: boolean): ChaseState {
  if (c0.over) return c0;
  const c: ChaseState = { ...c0, runners: c0.runners.map((r) => ({ ...r })), log: [...c0.log], t: c0.t + dt, tick: c0.tick + 1 };
  const rng = rngFrom(`${c.seed}:${c.tick}`);
  const say = (text: string, kind: ChaseLine['kind']) => c.log.push({ t: c.t, text, kind });
  // pushing spends the animals' wind; easing off gets it back. Blown animals cannot be pushed.
  const pushing = push && c.wind > 2;
  c.wind = Math.max(0, Math.min(100, c.wind + (pushing ? -15 : 11) * dt));
  if (push && c.wind <= 2 && c0.wind > 2) say(c.mode === 'pursue' ? 'Your horses are blown. Ease off and let them breathe.' : 'The animals are spent. Ease off or they will drop.', 'bad');
  const ratio = paceRatio(c);
  const myGo = ratio * (pushing ? 1.4 : 0.85);

  if (c.mode === 'pursue') {
    for (const r of c.runners) {
      if (r.state !== 'running') continue;
      // the gap opens by their pace and closes by yours (in % of the distance to cover)
      r.gap += (r.pace - myGo) * 12 * dt;
      if (r.gap <= 0) {
        if (c.hands > 0) {
          r.state = 'caught'; c.hands -= 1;
          say(r.leader ? `You ride down ${r.name} yourself and haul him off his horse.` : pick([`Your riders drag ${r.name} from his saddle.`, `${r.name}'s horse goes down and he is taken.`, `${r.name} throws up his hands and is tied.`, `You cut ${r.name} off at the wadi; he gives up.`], rng()), 'good');
        }
      } else if (r.gap >= 100) {
        r.state = 'escaped';
        say(r.leader ? `${r.name} is away over the ridge. He will be back.` : pick([`${r.name} gets into the rocks and is gone.`, `${r.name} escapes into the palms.`, `${r.name} crosses the canal and is lost to sight.`, `${r.name} outrides you and disappears into the dust.`], rng()), 'bad');
      }
    }
    // every rider has a man to hold: the rest are let go
    if (c.hands <= 0 && c.runners.some((r) => r.state === 'running')) {
      const rest = c.runners.filter((r) => r.state === 'running');
      for (const r of rest) r.state = 'escaped';
      say(`Every rider has a prisoner to hold. ${rest.map((r) => r.name).join(', ')} ${rest.length === 1 ? 'gets' : 'get'} away.`, 'note');
      c.over = 'done';
      return c;
    }
    if (c.runners.every((r) => r.state !== 'running') || c.t >= c.limit) {
      for (const r of c.runners) if (r.state === 'running') { r.state = 'escaped'; say(`${r.name} is still out there when the ground breaks up. You let him go.`, 'note'); }
      c.over = 'done';
    }
    return c;
  }

  // flee: the nearest rider's gap is your lead. Riders fall away as their horses blow.
  const chasing = c.runners.filter((r) => r.state === 'running');
  const best = chasing.reduce((a, r) => Math.max(a, r.pace), 0);
  c.lead += (myGo - best) * 8 * dt;
  // a laden caravan pushed hard sheds a load now and then, which lightens it
  if (pushing && c.overloaded && rng() < 0.9 * dt) {
    c.dropped += 1; c.mine *= 1.12;
    if (c.dropped >= 2) c.overloaded = false;
    say(pick(['A bale slips off the rear camel. You leave it.', 'A load comes loose and rolls into the ditch.', 'You cut a sack free to lighten the mule.'], rng()), 'bad');
  }
  for (const r of chasing) {
    // the further back, the sooner a rider gives it up
    if (rng() < (0.06 + c.t / 60 + Math.max(0, c.lead - 30) / 300) * dt * (1.4 - r.pace)) {
      r.state = 'dropped';
      say(pick([`${r.name} pulls up, his horse lathered.`, `${r.name} falls back and turns away.`, `${r.name}'s horse goes lame. One fewer behind you.`, `${r.name} gives up and waits for the others.`], rng()), 'good');
    }
  }
  if (c.lead >= 100 || c.runners.every((r) => r.state !== 'running')) { c.over = 'clear'; say('You are clear. Nobody is behind you now.', 'good'); }
  else if (c.lead <= 0) { c.over = 'caught'; say('They are alongside. A rifle comes up and you rein in.', 'bad'); }
  else if (c.t >= c.limit) { c.over = c.lead >= 50 ? 'clear' : 'caught'; say(c.over === 'clear' ? 'Night comes down and they lose you in it.' : 'They keep coming, and in the end they ride you down.', c.over === 'clear' ? 'good' : 'bad'); }
  return c;
}

/** run a chase to its end with a fixed habit (tests, odds): hold while the wind is above `above` */
export function simulate(c: ChaseState, above = 30): ChaseState {
  let s = c, holding = true;
  for (let i = 0; i < 2000 && !s.over; i++) {
    if (s.wind < 5) holding = false; else if (s.wind > above + 40) holding = true;
    s = stepChase(s, 0.05, holding);
  }
  return s;
}
