// The view behind the stall: the sky, the pyramids and the lane through the opening, lit by the hour
// and the day's weather (pale pink at dawn, bright at noon, orange in the evening, dark blue with stars
// at night; a khamsin's yellow-brown, a grey winter day, rain). It lies over the painting inside the
// stage, cut to the open part of the stall (OPENING, in % of the 1536x1024 canvas, so it scales with
// the stage at any size), under the shelves, the people and the counter. Nothing to tap.
import { useGame } from '../../game/state/store';
import { dustToday } from '../../game/economy/seasons';
import { skyOn } from './Weather';
import './sky.css';

/** The opening of stall-empty-patched.webp: the wide gap between the left shelf post and the right
 *  pillar (under the awning's edge, down to the stall floor), and the narrow gap between the right
 *  pillars. Measured where the painted sky starts under the awning, column by column. */
export const OPENING = 'polygon(54.3% 8.6%, 58% 7.5%, 62% 6.5%, 66% 7%, 70% 9.2%, 74% 10.8%, 77% 12%, 80.2% 12.9%, 80.2% 68%, 88.6% 68%, 88.6% 13.2%, 92.3% 13.6%, 92.3% 68%, 54.3% 68%)';

/** The land through the opening, under the sky: the two pyramids' outline (their apexes and slopes as
 *  painted), the palms and the lane below them, and the strip of palms in the narrow gap. At night it
 *  is darkened against a sky lifted towards the horizon, so the pyramids stand out as silhouettes. */
export const LAND = 'polygon(54.3% 31%, 62.95% 20.6%, 69.3% 29.4%, 72.4% 25.2%, 80.2% 35%, 80.2% 68%, 88.6% 68%, 88.6% 38%, 92.3% 38%, 92.3% 68%, 54.3% 68%)';

/** the sky part of the main opening (above LAND), where the stars come out */
const SKY = 'polygon(54.3% 8.6%, 58% 7.5%, 62% 6.5%, 66% 7%, 70% 9.2%, 74% 10.8%, 77% 12%, 80.2% 12.9%, 80.2% 35%, 72.4% 25.2%, 69.3% 29.4%, 62.95% 20.6%, 54.3% 31%)';

type C3 = [number, number, number];
type C4 = [number, number, number, number];
interface SkyKey { h: number; shade: C3; top: C4; low: C4; glow: C4; stars: number }

const NIGHT: Omit<SkyKey, 'h'> = { shade: [34, 44, 100], top: [6, 10, 36, 0.6], low: [18, 26, 66, 0.3], glow: [0, 0, 0, 0], stars: 1 };
const KEYS: SkyKey[] = [
  { h: 0, ...NIGHT },
  { h: 4.8, ...NIGHT },
  { h: 5.8, shade: [120, 100, 150], top: [60, 50, 110, 0.4], low: [230, 150, 150, 0.22], glow: [255, 180, 190, 0.04], stars: 0.3 },
  { h: 6.6, shade: [245, 200, 210], top: [255, 205, 222, 0.4], low: [255, 226, 210, 0.32], glow: [255, 220, 225, 0.1], stars: 0 },
  { h: 8, shade: [255, 242, 232], top: [255, 240, 235, 0.14], low: [255, 240, 222, 0.08], glow: [255, 245, 235, 0.08], stars: 0 },
  { h: 11, shade: [255, 255, 255], top: [255, 255, 255, 0], low: [255, 255, 255, 0], glow: [255, 252, 240, 0.18], stars: 0 },
  { h: 14.5, shade: [255, 255, 255], top: [255, 255, 255, 0], low: [255, 255, 255, 0], glow: [255, 252, 240, 0.18], stars: 0 },
  { h: 16.5, shade: [255, 228, 195], top: [255, 205, 155, 0.12], low: [255, 212, 150, 0.1], glow: [255, 220, 170, 0.08], stars: 0 },
  { h: 18.2, shade: [255, 150, 92], top: [190, 80, 70, 0.32], low: [255, 150, 60, 0.38], glow: [255, 160, 80, 0.12], stars: 0 },
  { h: 19.5, shade: [96, 80, 132], top: [30, 24, 80, 0.48], low: [150, 70, 70, 0.26], glow: [0, 0, 0, 0], stars: 0.4 },
  { h: 21, ...NIGHT },
  { h: 24, ...NIGHT },
];

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mixA = <T extends number[]>(a: T, b: T, t: number) => a.map((v, i) => mix(v, b[i], t)) as T;
const rgb = ([r, g, b]: number[]) => `rgb(${r | 0},${g | 0},${b | 0})`;
const rgba = ([r, g, b, a]: number[]) => `rgba(${r | 0},${g | 0},${b | 0},${a.toFixed(3)})`;

/** The sky through the opening at this hour (fractions of a day blend between the keys). */
export function skyAt(hour: number): Omit<SkyKey, 'h'> {
  const h = ((hour % 24) + 24) % 24;
  const i = Math.max(0, KEYS.findIndex((k) => k.h > h) - 1);
  const a = KEYS[i], b = KEYS[i + 1] ?? a;
  const t = b.h > a.h ? (h - a.h) / (b.h - a.h) : 0;
  return { shade: mixA(a.shade, b.shade, t), top: mixA(a.top, b.top, t), low: mixA(a.low, b.low, t), glow: mixA(a.glow, b.glow, t), stars: mix(a.stars, b.stars, t) };
}

export type SkyWeather = 'clear' | 'khamsin' | 'grey' | 'rain';

/** the day's weather over the stall: a khamsin blowing over the town, or a winter sky */
export function stallWeather(s: { day: number; world: { at: string | null } }): SkyWeather {
  const e = dustToday(s.day);
  if (e && s.world.at && e.dust?.includes(s.world.at)) return 'khamsin';
  return skyOn(s.day, s.world.at);
}

export function StallSky({ hour, weather }: { hour?: number; weather?: SkyWeather }) {
  const gameHour = useGame((s) => s.world.hour);
  const gameWeather = useGame(stallWeather);
  const h = hour ?? gameHour;
  const w = weather ?? gameWeather;
  const k = skyAt(h);
  const overcast = w !== 'clear';
  // every layer is cut to the opening by itself: a clip-path on a common parent would make it an
  // isolated group, and the multiply / screen / saturation blends would then mix with nothing
  const cut = { clipPath: OPENING, WebkitClipPath: OPENING };
  const low = (f: number) => rgba([...k.low.slice(0, 3), k.low[3] * f]);
  return (
    <div className="stall-sky" aria-hidden="true" data-testid="stall-sky" data-weather={w} data-hour={h.toFixed(1)}>
      <i className="sky-shade" style={{ ...cut, background: rgb(k.shade) }} />
      <i className="sky-wash" style={{ ...cut, background: `linear-gradient(180deg, ${rgba(k.top)} 8%, ${low(1)} 38%, ${low(0.5)} 52%, ${low(0.35)} 68%)` }} />
      {k.glow[3] > 0.01 && !overcast && <i className="sky-glow" style={{ ...cut, background: `linear-gradient(180deg, ${rgba(k.glow)} 10%, ${rgba([...k.glow.slice(0, 3), k.glow[3] * 0.6])} 45%, transparent 68%)` }} />}
      {k.stars > 0.02 && <>
        <i className="sky-night" style={{ ...cut, opacity: k.stars * (overcast ? 0.4 : 1) }} />
        <i className="sky-land" style={{ clipPath: LAND, WebkitClipPath: LAND, opacity: k.stars }} />
      </>}
      {overcast && <>
        <i className={`sky-wx-shade ${w}`} style={cut} />
        <i className={`sky-wx-grey ${w}`} style={cut} />
        <i className={`sky-wx-wash ${w}`} style={cut} />
      </>}
      {k.stars > 0.02 && w !== 'khamsin' && w !== 'rain' && <i className="sky-stars" style={{ clipPath: SKY, WebkitClipPath: SKY, opacity: k.stars * (w === 'grey' ? 0.15 : 1) }} />}
      {w === 'rain' && <i className="sky-rain-cut" style={cut}><b className="sky-rain" /></i>}
    </div>
  );
}
