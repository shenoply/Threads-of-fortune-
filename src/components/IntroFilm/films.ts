// The first-meeting films: who has one, what is on screen, and where it plays. Malek's and Arran's
// are their own videos; the others are the game's paintings with a slow pan, under the same documentary narrator
// (src/data/introFilms.ts).
import { INTRO_FILMS } from '../../data/introFilms';

export type FilmId = 'malek' | 'arran' | 'abuhamid' | 'rashid' | 'nabil' | 'cohen';
/** one painting on screen: `cover` fills the frame, `contain` sits over a blurred copy of itself;
 *  the pan goes from `from` to `to` ([scale, x%, y%] of the focus point) */
export interface Still { src: string; fit: 'cover' | 'contain'; from: [number, number, number]; to: [number, number, number] }
export interface Film {
  title: string;
  /** who it introduces, for the shelf of films you have seen */
  name: string;
  video?: { mp4: string; webm?: string; poster: string; last: string };
  /** after the video ends: their main paintings, panned until the narration finishes (never a frozen frame) */
  after?: Still[];
  stills?: Still[];
}
export const FILMS: Record<FilmId, Film> = {
  malek: {
    // stills for now, not the video: it predates his own recorded voice, so it stays on the shelf
    // until a cut matches his real voice (the clip itself is kept at video/malek-intro.mp4 in case)
    title: "Malek's grill · Giza, 1925", name: 'Malek',
    stills: [
      // Malek at his grill (about 33% across, 44% down the painting): the camera closes in on him
      { src: 'art/malek/scene-grilling.webp', fit: 'cover', from: [1.05, 34, 45], to: [2.1, 34, 43] },
      { src: 'art/portraits/malek.jpg', fit: 'contain', from: [1, 50, 45], to: [1.12, 50, 35] },
    ],
  },
  arran: {
    title: "Arran's textile laboratory · Giza, 1925", name: 'Arran Embleton',
    video: { mp4: 'video/arran-intro.mp4', webm: 'video/arran-intro.webm', poster: 'video/arran-intro-poster.webp', last: 'video/arran-intro-last.webp' },
    after: [
      // Arran at his microscope (painted in at 47% across): the camera closes in on him
      { src: 'art/arran/stations/lab-microscope.webp', fit: 'cover', from: [1.05, 47, 50], to: [1.8, 47, 36] },
      { src: 'art/arran/11-lab-inspect.webp', fit: 'contain', from: [1, 50, 30], to: [1.12, 50, 25] },
    ],
  },
  abuhamid: {
    title: "Bilgin's coffee house · Giza", name: 'Bilgin',
    stills: [
      { src: 'art/world/giza-district.jpg', fit: 'cover', from: [1, 50, 50], to: [2.2, 55, 30] },
      // Bilgin at his brazier, then at his own table, then the chess corner
      { src: 'art/cafe/bilgin-cafe-working.webp', fit: 'cover', from: [1.15, 60, 50], to: [1.35, 42, 40] },
      { src: 'art/cafe/bilgin-profile.webp', fit: 'cover', from: [1.3, 40, 35], to: [1.1, 45, 45] },
      { src: 'art/cafe/bilgin-chess.webp', fit: 'cover', from: [1.05, 55, 55], to: [1.3, 62, 50] },
    ],
  },
  rashid: {
    title: 'Uncle Rashid · the khan, Cairo', name: 'Uncle Rashid',
    stills: [
      { src: 'art/cities/cairo-1925-map.webp', fit: 'cover', from: [1, 50, 50], to: [1.6, 55, 45] },
      { src: 'art/portraits/rashid.jpg', fit: 'contain', from: [1, 50, 45], to: [1.15, 50, 35] },
    ],
  },
  nabil: {
    title: 'Nabil al-Khatib · Cairo', name: 'Nabil al-Khatib',
    stills: [
      { src: 'art/cities/cairo-1925-map.webp', fit: 'cover', from: [1.4, 45, 50], to: [1, 50, 50] },
      { src: 'art/portraits/nabil-stall2.webp', fit: 'contain', from: [1, 50, 40], to: [1.1, 50, 30] },
      { src: 'art/portraits/nabil.jpg', fit: 'contain', from: [1, 50, 45], to: [1.12, 50, 40] },
    ],
  },
  cohen: {
    title: 'Cohen · Alexandria and Cairo', name: 'Cohen',
    stills: [
      { src: 'art/world/city-alexandria.jpg', fit: 'cover', from: [1, 50, 50], to: [1.4, 40, 55] },
      { src: 'art/portraits/cohen-stall2.webp', fit: 'contain', from: [1, 50, 40], to: [1.1, 50, 30] },
      { src: 'art/portraits/cohen.jpg', fit: 'contain', from: [1, 50, 45], to: [1.12, 50, 40] },
    ],
  },
};
export const filmReady = (id: FilmId) => !!INTRO_FILMS[id] && (!!FILMS[id].video || !!FILMS[id].stills?.length);
/** the buyers whose film plays when they first come to your stall */
export const STALL_FILMS: FilmId[] = ['nabil', 'cohen'];
export const FILM_ORDER: FilmId[] = ['rashid', 'abuhamid', 'arran', 'malek', 'nabil', 'cohen'];
/** A film plays by itself the first time you go in; after that it is yours to replay ("Watch the
 *  film again" at the place, and the Films shelf on the Customers screen). Setting this true makes
 *  the place films play on every entry again (it was on while the game was being updated). */
export const FILMS_EVERY_ENTRY = false;
const PLACE_FILMS: FilmId[] = ['malek', 'arran', 'abuhamid', 'rashid'];
/** should this film play by itself now? (the tests set tof-films-once to see each film once) */
export function filmDue(id: FilmId, seen: string[] | undefined): boolean {
  if (!filmReady(id)) return false;
  let once = false;
  try { once = localStorage.getItem('tof-films-once') === '1'; } catch { /* no storage */ }
  if (FILMS_EVERY_ENTRY && !once && PLACE_FILMS.includes(id)) return true;
  return !(seen ?? []).includes(id);
}
