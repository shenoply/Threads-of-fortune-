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
  /** the permission chain: Arran writes a letter, you carry it to Hamza Effendi at the museum store */
  permitStage?: 'letter' | 'granted';
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
  // what you see as you come in; once you choose a task, the lab shows that task instead (ArranLab TASK_SCENE)
  microscope: { text: 'The microscope is set up with a slide of wool fibres. Arran looks up from it as you come in.', spot: 'microscope' },
  dye_notes: { text: 'Dye swatches lie beside his notebook on the bench. Arran is comparing reds.', spot: 'dye' },
  books: { text: 'His notebook is open at a list of titles. Arran is checking which books he still needs.', spot: 'notebook' },
  balance: { text: 'Something small sits on the balance pan. Arran is writing down its weight.', spot: 'balance' },
  provisions: { text: 'Notes on caravan food are spread on the bench.', spot: 'notebook' },
  mummy_linen: { text: 'A note from Hamza Effendi lies on the desk: the linen thread from the museum store is ready for study, whenever you are.', spot: 'notebook' },
};
