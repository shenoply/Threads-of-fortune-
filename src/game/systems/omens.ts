// Bad luck you can see coming. A thief works the lane at night now and then; Hajj Mahmoud hears of it a
// day ahead. Pay a watchman for the night, or keep a guard at the stall, and he goes away with nothing.
// Ignore the warning and one of your rugs is gone in the morning. Hashed from the day, so it never
// touches the store's dice.
import { RUGS } from '../../data/rugs';
import { fmt } from '../economy/money';
import type { GameState } from '../state/store';

export const WATCH_COST = 10;

export interface Omen {
  kind: 'thief';
  /** the night it strikes: the night after this day */
  night: number;
  /** a watchman paid for that night */
  guarded?: boolean;
  /** the warning came while you were away from Giza: nobody told you */
  away?: boolean;
}

const h = (day: number, salt: string) => {
  let x = day * 2246822519;
  for (let i = 0; i < salt.length; i++) x = Math.imul(x ^ salt.charCodeAt(i), 0x01000193) >>> 0;
  return (x % 10000) / 10000;
};

/** the rugs a thief can reach tonight: everything at the stall when you are home, what you left when away */
const reachable = (s: GameState) => s.inventory.filter((i) => (s.world.at === 'giza' || i.stored) && !i.reservedFor && (RUGS[i.typeId]?.tier ?? 1) < 4);

/** the omen that is live today, if any */
export const omenToday = (s: Pick<GameState, 'omen' | 'day'>) => (s.omen && s.omen.night === s.day ? s.omen : undefined);

export function omensNight(s: GameState, day: number): { patch: Partial<GameState>; notes: string[] } {
  if (!s.started || s.playMode === 'sandbox') return { patch: {}, notes: [] };
  const notes: string[] = [];
  const patch: Partial<GameState> = {};
  const o = s.omen;
  // the night that was warned of has passed
  if (o && o.night === day - 1) {
    const guard = o.guarded || (s.world.at === 'giza' && Object.values(s.world.party.troops ?? {}).some((n) => (n ?? 0) > 0));
    const can = reachable(s);
    if (guard || !can.length) notes.push(guard ? 'The thief came to the lane in the night and went away with nothing. Your stall was watched.' : 'A thief worked the lane in the night. There was nothing at your stall to take.');
    else {
      const sorted = [...can].sort((a, b) => a.paid - b.paid);
      const gone = sorted[Math.floor(sorted.length / 2)];
      patch.inventory = s.inventory.filter((i) => i.uid !== gone.uid);
      patch.journal = [...(s.journal ?? []), { day, text: `A thief took the ${RUGS[gone.typeId]?.name ?? 'rug'} from the stall in the night (it cost you ${fmt(gone.paid)}).`, kind: 'loss' }];
      notes.push(o.away || s.world.at !== 'giza'
        ? `While you were away, a thief took the ${RUGS[gone.typeId]?.name ?? 'rug'} from the rugs you left at your stall.`
        : `A thief took the ${RUGS[gone.typeId]?.name ?? 'rug'} from your stall in the night. You were warned.`);
    }
    patch.omen = undefined;
    return { patch, notes };
  }
  // a new warning, about once a fortnight, after the first week
  if (!o && day >= 8 && h(day, 'thief') < 1 / 14 && reachable(s).length) {
    patch.omen = { kind: 'thief', night: day, ...(s.world.at !== 'giza' ? { away: true } : {}) };
    notes.push(`Hajj Mahmoud says a thief has been working the lane at night. Tonight it may be your stall. A watchman costs ${fmt(WATCH_COST)}.`);
  }
  return { patch, notes };
}
