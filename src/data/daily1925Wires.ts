// The researched wires for April 1925 onwards and the Egypt items: ~240K of JSON, loaded after the
// title is up (see loadWires in daily1925.ts) so it is not part of the opening download.
import EGYPT from './egypt1925_research.json';
import Q2 from './world/1925-04_06.json';
import Q3 from './world/1925-07_09.json';
import Q4 from './world/1925-10_12.json';
import Q5 from './world/1926-01_03.json';

export const QUARTERS = [Q2, Q3, Q4, Q5] as Record<string, unknown>[];
export const EGYPT_ITEMS = EGYPT as { date: string; head: string; body: string; src: string; approx?: boolean }[];
