// Which buyers have a cut-out standing at the stall counter, so the scene can ask for the right file
// straight away instead of trying stall2, then stall, then the framed portrait one after another
// (three round trips on a phone before anyone appears). Keep in step with public/art/portraits.
const STALL2 = new Set(['antonios', 'benakis', 'hassan', 'hollister', 'kasparian', 'kassab', 'levy', 'mariam', 'martel', 'rustam', 'salem', 'shivakiar', 'wasif', 'whitcombe', 'yusuf']);
const STALL = new Set(['samira', 'nadia-wahba']);

/** The picture of this buyer at the counter: the redrawn cut-out, the older one, or the framed portrait. */
export function stallFigure(id: string): { src: string; framed: boolean } {
  if (STALL2.has(id)) return { src: `art/portraits/${id}-stall2.webp`, framed: false };
  if (STALL.has(id)) return { src: `art/portraits/${id}-stall.webp`, framed: false };
  return { src: `art/portraits/${id}.jpg`, framed: true };
}

const asked = new Set<string>();
/** Fetch the stall painting, the counter, the merchant and the next buyers before they are needed. */
export function preloadStall(buyerIds: string[]) {
  if (typeof Image === 'undefined') return;
  for (const src of ['art/stall2/stall-empty-patched.webp', 'art/counter-stall.webp', 'art/hero/hero-base-stall.webp', ...buyerIds.map((id) => stallFigure(id).src)]) {
    if (asked.has(src)) continue;
    asked.add(src);
    const im = new Image(); im.decoding = 'async'; im.src = src;
  }
}
