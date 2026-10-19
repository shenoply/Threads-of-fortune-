// Winter over Egypt and the Levant: most days stay bright, some are grey, and now and then it rains.
// Fixed by the date (the same day always has the same sky), drawn over the painting; nothing to tap.
import { useGame } from '../../game/state/store';

const month = (day: number) => new Date(Date.UTC(1925, 2, 9 + day)).getUTCMonth();
const roll = (day: number, salt: number) => { let h = (day * 2654435761 + salt * 97) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13; return (h >>> 0) / 4294967296; };

export type Sky = 'clear' | 'grey' | 'rain';
/** The sky over the coast and the Delta: grey days and rain only from December to February. */
export function skyOn(day: number, at: string | null | undefined): Sky {
  const m = month(day);
  if (!(m === 11 || m === 0 || m === 1)) return 'clear';
  // the desert towns hardly see rain; the coast and the hills see the most
  const wet = ['alexandria', 'portsaid', 'jaffa', 'jerusalem', 'beirut', 'aleppo', 'istanbul', 'ankara', 'tabriz', 'tehran', 'hamadan', 'kermanshah'].includes(at ?? '') ? 2 : 1;
  const r = roll(day, 7);
  if (r < 0.06 * wet) return 'rain';
  if (r < 0.3 * wet) return 'grey';
  return 'clear';
}

export function Weather() {
  const sky = useGame((s) => skyOn(s.day, s.world.at));
  if (sky === 'clear') return null;
  return (
    <div className={`weather ${sky}`} aria-hidden="true" data-testid="weather" data-sky={sky}>
      {sky === 'rain' && <i />}
    </div>
  );
}
