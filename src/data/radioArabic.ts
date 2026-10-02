// Everything Radio Giza needs to read in Arabic, in one module that loads only when the Arabic
// channel is first tuned (about 700 KB the game no longer downloads and parses at startup).
import AR0 from './radio/ar-wires-0.json';
import AR1 from './radio/ar-wires-1.json';
import AR2 from './radio/ar-wires-2.json';
import AR3 from './radio/ar-wires-3.json';
export { CITY_AR, AR_EVENTS, AR_WEATHER, AR_KHAMSIN, AR_FIXED } from './radioAr1';
export { AR_SURPRISES, AR_FILLER } from './radioAr2';
/** The day's lead story from the wires, in Arabic, fully vocalized for the reader. */
export const AR_WIRES: Record<string, string> = { ...AR0, ...AR1, ...AR2, ...AR3 };
