// The game's pictures were JPGs until 2026-10; they are WebP now, under the same names (public/art,
// masters in art-src/jpg-masters). A save, a save slot or a remembered list made before then can still
// name an "art/....jpg" picture (a buyer's portrait in a visit, a title picture kept on the phone): each
// time the game opens, before the save is read, such names in what this page keeps are turned into the
// WebP ones. Imported save files are written to storage and the page reloaded, so they pass through here too.
const OLD = /(art\/[A-Za-z0-9_\-/.]*?)\.jpg\b/g;

/** the same text with every "art/....jpg" picture named as its WebP copy */
export const webpPaths = (txt: string) => txt.replace(OLD, '$1.webp');

export function migrateArtPaths() {
  try {
    if (typeof localStorage === 'undefined') return;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !(k.startsWith('tof') || k.startsWith('threads-of-fortune'))) continue;
      const v = localStorage.getItem(k);
      if (!v || !v.includes('.jpg')) continue;
      const n = webpPaths(v);
      if (n !== v) localStorage.setItem(k, n);
    }
  } catch { /* storage unavailable or full: the old names then fail to load, and the drawn stand-ins show */ }
}
migrateArtPaths();
