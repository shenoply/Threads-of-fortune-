// The Steam demo: the same game, built with `npm run build:demo` (mode "demo", .env.demo sets VITE_DEMO=1).
// About an hour of play: the opening (the stall, Rashid, Giza and Cairo), Rashid's errand and the trip to
// Alexandria with its robbers, Shukri across the lane, and one story (the Mamluk carpet, in the Muski).
// Everything past Giza, Cairo and Alexandria is on the map, closed, with a short "in the full game" line.
// On the morning after day ten the closing card (components/Demo/DemoEnd.tsx) sums up and points to Steam.
//
// Saves: the same format and the same key as the full game. A game begun in the demo is marked `demo: true`;
// the full build ignores the mark, so a demo save (or a downloaded save file) simply carries on there.
// Nothing about the locks is saved: they come from this build flag alone.
//
// For testing on the live site: ?demo=1 turns demo mode on in this browser, ?demo=0 turns it off.
import type { GameState } from './state/store';

/** the store page, until the app ID is known */
export const STEAM_URL = 'https://store.steampowered.com/app/0000000/Threads_of_Fortune/';

const fromBuild = (() => { try { return (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_DEMO === '1'; } catch { return false; } })();
const fromUrl = (() => {
  try {
    if (typeof window === 'undefined') return false;
    const q = new URLSearchParams(window.location.search).get('demo');
    if (q === '1') localStorage.setItem('tof-demo', '1');
    if (q === '0') localStorage.removeItem('tof-demo');
    return localStorage.getItem('tof-demo') === '1';
  } catch { return false; }
})();

/** this is the demo build (or demo mode was asked for in the address) */
export let DEMO = fromBuild || fromUrl;
/** for the logic tests */
export function setDemo(on: boolean) { DEMO = on; }

/** the demo runs to the end of this day; the closing card comes the next morning */
export const DEMO_DAYS = 10;
/** the towns open in the demo */
export const DEMO_TOWNS = ['giza', 'cairo', 'alexandria'];
/** the one story the demo tells, and the day it may begin */
export const DEMO_STORY = 'forgery';
export const DEMO_STORY_DAY = 5;
/** the main missions the demo gives (the rest are in the full game) */
export const DEMO_MISSIONS = ['alexandria'];

/** the note on anything closed in the demo */
export const FULL_GAME = 'In the full game.';

export const demoTown = (id: string) => DEMO_TOWNS.includes(id);
/** the demo's days are over: time for the closing card */
export const demoOver = (s: Pick<GameState, 'started' | 'day'>) => DEMO && !!s.started && s.day > DEMO_DAYS;
