// Hassan's own words at the weavery and over his own carpets. Read aloud by the player himself
// (tools/voice-recordings/hassan, section G of the script); until a line is recorded it shows as text.
export const WEAVERY_LINES = {
  commission: [
    'Weave it exactly as I drew it. Not one knot of your own.',
    'This one is mine, from the first thread. Take care of it.',
    'My father would have laughed at this drawing. Then he would have bought it.',
  ],
  collect: [
    'There it is. My own carpet. Nobody else in Cairo has this one.',
    'Unroll it slowly. I want to see it come off the loom.',
    'Every knot as I drew it. Good work, my friend.',
  ],
  frame: [
    'This one is not for sale. It stays on my wall.',
    'Let them look. Let them ask who made it.',
  ],
  admired: [
    'You like it? I drew it myself. It is not for sale.',
    'That one? My own design. Perhaps I will weave you another.',
  ],
  sellOwn: [
    'You are buying a piece of me. Look after it.',
    'My own design. You will not find another like it.',
  ],
} as const;
export type WeaveryMoment = keyof typeof WEAVERY_LINES;
export const weaveryLine = (m: WeaveryMoment) => { const l = WEAVERY_LINES[m]; return l[Math.floor(Math.random() * l.length)]; };
