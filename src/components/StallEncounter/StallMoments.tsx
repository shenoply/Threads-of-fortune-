import { useEffect, useRef, useState } from 'react';
import { audio } from '../../game/audio/engine';
import type { Encounter } from '../../game/systems/negotiation';
import { useGame } from '../../game/state/store';
import type { StallScene } from '../../game/stallScenes';

// Three small things on the stall, rendered in Blender (tools/blender-moments.py, tools/moments-sheet.py)
// and played from one strip of frames each with a CSS steps() animation:
//   tea    when tea is offered, the pot pours a glass; the glass stays on the counter by the buyer
//   coins  when a sale is agreed, a few coins are put down on the counter in front of you
//   lamp   in the evening a small brass lantern hangs lit over your end of the counter
// All are pictures only: they take no taps, and stand clear of the carpet, the people, the cat, the
// gramophone and the radio. With reduced motion each shows its last (or first) frame and does not move.
// Sizes and places are in % of the stage (the 3:2 painting), worked out from each render's camera.

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

interface Strip { src: string; n: number; fps: number; /** frame aspect, w / h */ ar: number }
const TEA: Strip = { src: 'art/stall2/moments/tea.webp', n: 28, fps: 12, ar: 208 / 256 };
const COINS: Strip = { src: 'art/stall2/moments/coins.webp', n: 22, fps: 24, ar: 160 / 128 };
const LAMP: Strip = { src: 'art/stall2/moments/lamp.webp', n: 8, fps: 7, ar: 96 / 256 };
/** the frames (at 24 a second) on which a coin lands: a soft chink for the last two (the sale's own coins sound covers the first) */
const CHINKS = [11, 14];

/** where the lantern's chain is hung from in each painting: [x, top] in % of the stage */
const LAMP_AT: Record<string, [number, number]> = { 'giza-borrowed': [31, 9], 'giza-mat': [31, 4], 'giza-bazaar': [31, 17], cairo: [31, 0] };
export const isEvening = (hour: number) => { const h = ((hour % 24) + 24) % 24; return h >= 17 || h < 6; };

/** 'play' the first time `on` comes true while this is shown, 'rest' if it was already true (back at the
 *  stall, a reload), 'off' while it is false; a new key (the next buyer) starts again */
function useOnce(on: boolean, key: string): 'off' | 'play' | 'rest' {
  const seen = useRef<{ key: string; was: boolean } | null>(null);
  const [st, setSt] = useState<'off' | 'play' | 'rest'>(on ? 'rest' : 'off');
  useEffect(() => {
    const first = !seen.current || seen.current.key !== key;
    if (first) { seen.current = { key, was: on }; setSt(on ? 'rest' : 'off'); return; }
    if (on && !seen.current!.was) setSt(reduced() ? 'rest' : 'play');
    if (!on) setSt('off');
    seen.current!.was = on;
  }, [on, key]);
  return st;
}

function Sprite({ strip, state, loop, style, testid }: { strip: Strip; state: 'play' | 'rest' | 'still'; loop?: boolean; style: React.CSSProperties; testid: string }) {
  const anim = state === 'play'
    ? `tof-moment ${(strip.n / strip.fps).toFixed(2)}s steps(${strip.n}, jump-none) ${loop ? 'infinite' : 'forwards'}`
    : 'none';
  return (
    <span
      className="stall-moment"
      data-testid={testid}
      data-state={state}
      aria-hidden="true"
      style={{ ...style, backgroundImage: `url(${strip.src})`, backgroundSize: `${strip.n * 100}% 100%`, backgroundPositionX: state === 'rest' ? '100%' : '0%', animation: anim }}
    />
  );
}

/** k: drawn a little larger than life on a phone's small picture, so the glass and the coins still read */
export function StallMoments({ enc, sc, k = 1 }: { enc: Encounter | null; sc: StallScene; k?: number }) {
  const hour = useGame((s) => s.world.hour);
  const key = enc?.id ?? '';
  const tea = useOnce(!!enc?.teaUsed, key);
  const sold = useOnce(enc?.outcome === 'sold', key);
  useEffect(() => {
    if (sold !== 'play') return;
    const ids = CHINKS.map((f) => window.setTimeout(() => audio.sfx('coin'), (f / 24) * 1000));
    return () => ids.forEach((t) => clearTimeout(t));
  }, [sold]);
  const c = sc.contact;
  // the glass on the counter top between the record player and the buyer; frame 15% of the stage wide,
  // the glass 66% across it and its foot 91% down it
  const teaW = 15 * k, teaH = (teaW * 1.5) / TEA.ar, gx = 72, gy = c + 4.8;
  // the coins in front of your hands, left of the carpet; the frame 8.5% wide, the counter 82% down it
  const coinW = 8.5 * k, coinH = (coinW * 1.5) / COINS.ar, cx = 28.5, cy = c + 4.2;
  const [lx, lt] = LAMP_AT[sc.id] ?? [31, 0];
  const lampW = 7.5 * Math.min(k, 1.15), lampH = (lampW * 1.5) / LAMP.ar;
  const evening = isEvening(hour);
  const still = reduced();
  return (
    <>
      {evening && (
        <>
          <span className={`stall-lamp-glow${still ? '' : ' flicker'}`} aria-hidden="true" data-testid="moment-lamp-glow" style={{ left: `${lx - 9}%`, top: `${lt + lampH * 0.887 - 13.5}%`, width: '18%' }} />
          <Sprite strip={LAMP} state={still ? 'still' : 'play'} loop testid="moment-lamp" style={{ left: `${lx - lampW / 2}%`, top: `${lt}%`, width: `${lampW}%`, height: `${lampH}%`, zIndex: 2 }} />
        </>
      )}
      {tea !== 'off' && <Sprite strip={TEA} state={tea} testid="moment-tea" style={{ left: `${gx - 0.66 * teaW}%`, top: `${gy - 0.9125 * teaH}%`, width: `${teaW}%`, height: `${teaH}%` }} />}
      {sold !== 'off' && <Sprite strip={COINS} state={sold} testid="moment-coins" style={{ left: `${cx - 0.494 * coinW}%`, top: `${cy - 0.82 * coinH}%`, width: `${coinW}%`, height: `${coinH}%` }} />}
    </>
  );
}
