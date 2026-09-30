// What Arran is doing when you walk in (docs/handoff/ARRAN_LAB_VISITS_FOR_CLAUDE.md). The activity
// is chosen once per game day, so stepping out and straight back in finds him at the same thing.
// Priority: a new special scene (the mummy linen study, once permitted), then a book errand in
// hand, then the least recently seen of the ordinary activities.
export type ArranActivity = 'microscope' | 'dye_notes' | 'books' | 'balance' | 'provisions' | 'mummy_linen';
export interface ArranVisitState {
  visitCount: number;
  lastActivity?: ArranActivity;
  lastActivityDay?: number;
  /** the conservator's letter arrives: from this day the mummy linen study is permitted */
  permitDay?: number;
  mummyIntroductionSeen?: boolean;
}
export interface VisitContext { day: number; returnedBooks: readonly string[]; pendingBook: boolean }

const ORDER: ArranActivity[] = ['microscope', 'books', 'balance', 'dye_notes', 'provisions'];

export const mummyPermitted = (v: ArranVisitState | undefined, day: number) => v?.permitDay != null && day >= v.permitDay;

export function chooseArranActivity(v: ArranVisitState, c: VisitContext): ArranActivity {
  if (v.lastActivityDay === c.day && v.lastActivity) return v.lastActivity;
  if (mummyPermitted(v, c.day) && !v.mummyIntroductionSeen) return 'mummy_linen';
  if (c.pendingBook && v.lastActivity !== 'books') return 'books';
  const eligible: ArranActivity[] = ORDER
    .filter((a) => a !== 'dye_notes' || c.returnedBooks.includes('dyes'))
    .filter((a) => a !== 'provisions' || c.returnedBooks.includes('provisions'))
    .filter((a) => (a as string) !== 'balance') // no metal antiques in the game yet
    .filter((a) => a !== 'books' || c.pendingBook || c.returnedBooks.length > 0);
  const prev = eligible.indexOf(v.lastActivity as ArranActivity);
  return eligible[(prev + 1) % eligible.length];
}

/** the line under the header, and where the camera and portrait start */
export const ACTIVITY_SCENE: Record<ArranActivity, { text: string; spot: 'microscope' | 'dye' | 'notebook' | 'balance' | null }> = {
  microscope: { text: 'Arran is bent over the microscope, a slide of wool fibres under the lens.', spot: 'microscope' },
  dye_notes: { text: 'Arran is laying dye swatches beside his notebook, comparing reds.', spot: 'dye' },
  books: { text: 'Arran is at the shelf with his notebook open, running a finger down a list of titles.', spot: 'notebook' },
  balance: { text: 'Arran is weighing something small on the balance.', spot: 'balance' },
  provisions: { text: 'Arran is reading notes on caravan food.', spot: 'notebook' },
  mummy_linen: { text: 'A letter from the conservator lies open on the bench.', spot: null },
};
