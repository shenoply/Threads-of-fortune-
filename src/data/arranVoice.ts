// Arran Embleton's spoken lines. Each line has a fixed id, its exact subtitle text, and the file it
// will be recorded to. Recordings are produced outside the game (scripts/generate-arran-voice.ts)
// and listed in public/audio/arran/manifest.json by tools/build-arran-voice-manifest.mjs; a line
// with no recording is shown as a subtitle only.
//
// Performance direction for whoever records or generates these: an educated textile chemist,
// calm, observant, understated, occasionally dry; livelier only at a real discovery. His own
// accent and cadence from the reference recording, never exaggerated, never a parody.
// This file is plain data with erasable types only, so Node can import it without a build step.

export type ArranVoiceMood =
  | 'neutral'
  | 'analytical'
  | 'curious'
  | 'amused'
  | 'concerned'
  | 'secretive'
  | 'excited'
  | 'irritated'
  | 'warning';

export type ArranVoiceContext =
  | 'greeting'
  | 'lab'
  | 'rug-inspection'
  | 'discovery'
  | 'warning'
  | 'books'
  | 'travel'
  | 'mummy'
  | 'reaction'
  | 'ambient';

export interface ArranVoiceLine {
  id: string;
  text: string;
  /** path under public/, without extension; the manifest says which formats exist */
  file: string;
  mood: ArranVoiceMood;
  contexts: ArranVoiceContext[];
  weight?: number;
  cooldownMs?: number;
  once?: boolean;
  /** play at the start of a visit and on common actions: fetch early */
  preload?: boolean;
}

const f = (dir: string, id: string) => `audio/arran/${dir}/${id}`;

export const ARRAN_VOICE_LINES: ArranVoiceLine[] = [
  // 1. greeting: on entering the lab, or tapping him with nothing in hand
  { id: 'arran-greeting-01', text: "Ah. You're back. What have you brought me this time?", file: f('greeting', 'arran-greeting-01'), mood: 'curious', contexts: ['greeting'], weight: 2, cooldownMs: 90000, preload: true },
  { id: 'arran-greeting-02', text: 'Come in. Mind the bench, the dishes are still drying.', file: f('greeting', 'arran-greeting-02'), mood: 'neutral', contexts: ['greeting'], cooldownMs: 90000, preload: true },
  { id: 'arran-greeting-03', text: "Good morning. Give me a moment, I'm halfway through a slide.", file: f('greeting', 'arran-greeting-03'), mood: 'analytical', contexts: ['greeting'], cooldownMs: 90000, preload: true },
  { id: 'arran-greeting-04', text: 'You again. Good. I was hoping for something more interesting than cotton waste.', file: f('greeting', 'arran-greeting-04'), mood: 'amused', contexts: ['greeting'], cooldownMs: 120000 },

  // 2. rug inspection: when a test starts
  { id: 'arran-inspect-01', text: 'Put it here. I want to see the fibres before we decide what it is.', file: f('rug-inspection', 'arran-inspect-01'), mood: 'analytical', contexts: ['rug-inspection'], weight: 2, preload: true },
  { id: 'arran-inspect-02', text: "Let me find a loose end. I'd rather not cut anything I don't have to.", file: f('rug-inspection', 'arran-inspect-02'), mood: 'analytical', contexts: ['rug-inspection'], preload: true },
  { id: 'arran-inspect-03', text: 'Hold the lamp a little closer. Thank you.', file: f('rug-inspection', 'arran-inspect-03'), mood: 'neutral', contexts: ['rug-inspection'], preload: true },
  { id: 'arran-inspect-04', text: "Right. Let's see what it's actually made of, not what the dealer says.", file: f('rug-inspection', 'arran-inspect-04'), mood: 'analytical', contexts: ['rug-inspection'] },

  // 3. laboratory explanation: tapping him in the lab, or the board
  { id: 'arran-lab-explain-01', text: 'Everything on this bench tells you what a thing is made of. None of it tells you when.', file: f('lab', 'arran-lab-explain-01'), mood: 'analytical', contexts: ['lab'], weight: 2 },
  { id: 'arran-lab-explain-02', text: 'Indigo comes out of the vat green and turns blue in the air. It never stops pleasing me.', file: f('lab', 'arran-lab-explain-02'), mood: 'amused', contexts: ['lab'] },
  { id: 'arran-lab-explain-03', text: "I write everything down. A result you can't repeat isn't a result.", file: f('lab', 'arran-lab-explain-03'), mood: 'neutral', contexts: ['lab'] },
  { id: 'arran-lab-explain-04', text: 'Wool has scales, cotton twists, silk is smooth as glass. The rest is patience.', file: f('lab', 'arran-lab-explain-04'), mood: 'analytical', contexts: ['lab'] },

  // 4. serious warning: before a cut, or a request he refuses
  { id: 'arran-warning-01', text: "No. Don't touch that yet.", file: f('warnings', 'arran-warning-01'), mood: 'warning', contexts: ['warning'], preload: true },
  { id: 'arran-warning-02', text: 'If I cut it, the cut stays. Think about that before you say yes.', file: f('warnings', 'arran-warning-02'), mood: 'warning', contexts: ['warning'], weight: 2, preload: true },
  { id: 'arran-warning-03', text: "I won't sign my name to something I haven't proved.", file: f('warnings', 'arran-warning-03'), mood: 'concerned', contexts: ['warning'] },

  // 5. discovery: a result that does not agree with how the rug is sold
  { id: 'arran-discovery-01', text: "Now that is interesting. That's not what it says on the label.", file: f('discovery', 'arran-discovery-01'), mood: 'excited', contexts: ['discovery'], weight: 2 },
  { id: 'arran-discovery-02', text: "Look at this. Look. Someone's been telling tales.", file: f('discovery', 'arran-discovery-02'), mood: 'excited', contexts: ['discovery'] },
  { id: 'arran-discovery-03', text: 'Ha. There it is. I thought as much.', file: f('discovery', 'arran-discovery-03'), mood: 'excited', contexts: ['discovery'] },

  // a result that agrees: a short, dry reaction
  { id: 'arran-reaction-01', text: 'Much as described. Which is rarer than you would think.', file: f('reactions', 'arran-reaction-01'), mood: 'amused', contexts: ['reaction'] },
  { id: 'arran-reaction-02', text: "Nothing to worry about. It's what the dealer says it is.", file: f('reactions', 'arran-reaction-02'), mood: 'neutral', contexts: ['reaction'] },

  // books: the errands
  { id: 'arran-books-01', text: 'Did you find it? Matthews. The fibre chapters are all I need.', file: f('books', 'arran-books-01'), mood: 'curious', contexts: ['books'] },
  { id: 'arran-books-02', text: "Thank you. You've no idea how long I've been guessing without it.", file: f('books', 'arran-books-02'), mood: 'amused', contexts: ['books'], once: false },

  // 6. mummy examination: the conservator's permitted study of a detached linen thread
  { id: 'arran-mummy-01', text: "We don't touch the wrappings. Only the thread that came away on its own.", file: f('mummy', 'arran-mummy-01'), mood: 'concerned', contexts: ['mummy'], weight: 2 },
  { id: 'arran-mummy-02', text: 'Linen. Flax, very fine, very old. That much the lens will tell us, and not a word more.', file: f('mummy', 'arran-mummy-02'), mood: 'analytical', contexts: ['mummy'] },
  { id: 'arran-mummy-03', text: 'Whoever this was, they deserve better than our curiosity. Gently, please.', file: f('mummy', 'arran-mummy-03'), mood: 'concerned', contexts: ['mummy'] },
];

export const ARRAN_LINE: Record<string, ArranVoiceLine> = Object.fromEntries(ARRAN_VOICE_LINES.map((l) => [l.id, l]));
