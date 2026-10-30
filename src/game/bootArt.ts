// The pictures the loading screen waits for, kept free of imports so vite.config can read it too
// (it writes them into index.html as preload hints, so they download alongside the code instead of
// after it has started).

/** Fetched once the title is up (main.tsx), and first on Play: the district's small copy and the stall screens of day one. */
export const BOOT_ART = [
  'art/world/giza-district-small.webp', 'art/stalls/giza-borrowed-768.webp', 'art/stalls/giza-borrowed.webp',
  'art/stalls/giza-borrowed-fg.webp', 'art/hero/outfits/classic-stall-stall.webp',
];
/** The full district painting (half a megabyte): the small copy stands in for it until it is in, so it
 *  follows as soon as the title is up rather than holding the title back. */
export const BOOT_LATER = ['art/world/giza-district.jpg'];
/** On a first visit (nothing on the phone yet) the title shows one of its own three paintings, the
 *  lightest of the title pictures; once the game is kept on the phone any of them can come up. */
export const COLD_TITLES = ['art/title/caravan.webp', 'art/title/ambush.webp', 'art/title/bandit.webp'];
