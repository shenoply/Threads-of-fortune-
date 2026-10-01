// Twenty pictures of Arran at work, one per visit, chosen from what is really going on in the game so
// the picture and his first line never contradict what you can do next: he only thanks you for a
// book you are carrying, the mummy linen appears only once its case is open, the sealed crate only
// when you are carrying goods without papers. The line is ordinary dialogue under the picture with
// "Ask Arran about it" and "Look around the lab"; nothing blocks the lab's own controls.
// Scenes 1–10: his lab and the story. 11–20: his own analytical cases, in Giza, 1925.
import type { BookId, Paper } from './arranBooks';
import type { LabFinding } from './arranLab';
import type { ArranVisitState } from './arranVisits';
import { mummyPermitted } from './arranVisits';

export interface ArranScene {
  n: number;
  title: string;
  /** null while the painting needs a corrected Giza background: the room is shown instead */
  img: string | null;
  line: string;
  ask: string;
}

const IMG = (n: number) => `art/arran/scenes/s${String(n).padStart(2, '0')}.webp`;

export const SCENES: Record<number, ArranScene> = {
  1: { n: 1, title: 'Wool under the microscope', img: IMG(1), line: 'Come and look at this fibre. It tells a rather different story under the lens.',
    ask: 'Wool is covered in tiny overlapping scales; cotton is a flat twisted ribbon; silk is a smooth rod. A dealer can call a rug anything he likes. The lens only lets it be one thing.' },
  2: { n: 2, title: 'Dye rubbing off', img: IMG(2), line: 'I was afraid of this. The red is coming away on a clean cloth.',
    ask: 'A damp white cloth rubbed on the back of a rug shows whether colour comes off. It says nothing about washing: that needs a sample washed in soap, which is a separate test.' },
  3: { n: 3, title: 'Comparing dyed yarn', img: IMG(3), line: 'These three skeins look alike at first. Hold them to the light and tell me what you notice.',
    ask: 'Natural dyes shift a little in daylight; the early synthetic ones are brighter and flatter, and some fade. Colour can suggest "probably after this year", never the year itself.' },
  4: { n: 4, title: 'Receiving a requested book', img: IMG(4), line: 'You found the volume! Let me check the passage before I draw any conclusions.',
    ask: 'A proper source is worth more to me than a confident guess. Give me the copy and I can start the work it was for.' },
  5: { n: 5, title: 'Planning the Sinai journey', img: IMG(5), line: "Before you leave for St Catherine's, we should go over the route and your supplies.",
    ask: 'The distance on the map is only half of it. There are the passes, the wells, the season, and how much your animals can carry. Count days of food for the way back, and a delay.' },
  6: { n: 6, title: 'Reading the Port Said ledger', img: IMG(6), line: 'This ledger shows why the contents of a crate and its paperwork must agree.',
    ask: 'The customs men do not open every case. They read the papers, and they write down every case whose papers do not agree with it. With the ledger I can tell you which paper each kind of cargo needs.' },
  // the new painting's window shows a European skyline, so the earlier study art stands in
  7: { n: 7, title: 'Examining mummy linen', img: 'art/arran/17-arran-mummy-study.webp', line: "Please don't touch the wrapping. I'm studying its fibres and weave without disturbing the mummy.",
    ask: 'Hamza Effendi has brought one thread that came away on its own. I can say it is linen and how it was spun and woven. I cannot say who this was, and nothing else is to be touched.' },
  8: { n: 8, title: 'Advising on provisions', img: IMG(8), line: "How many people and animals are going? Let's count the days of food properly.",
    ask: 'Everyone eats a ration a day and the animals eat too. Take enough for there and back and a delay. More food is more weight: on foot, too much will slow you down.' },
  9: { n: 9, title: 'Refusing a sealed crate', img: null, line: "I won't open that until you tell me whose crate it is and show me its papers.",
    ask: 'A sealed case is somebody else\'s property and somebody else\'s responsibility. I will check its labels and its packing and tell you what paper it needs. I will not open it.' },
  10: { n: 10, title: 'Reading at night', img: IMG(10), line: 'I thought this book would answer my question. It has given me three more.',
    ask: 'That is usually how it goes. I write each question down; most of them are answered in the end, by the bench, not by the book.' },
  11: { n: 11, title: 'Measuring trace iron', img: IMG(11), line: 'The colour difference is small. That is precisely why we compare it with a known sample.',
    ask: 'The water board sent two samples. A trace of iron gives the solution a faint tint; I match it against standards of known strength rather than trusting my eye alone.' },
  12: { n: 12, title: 'Cobalt and nickel analysis', img: IMG(12), line: "Nickel is complicating the result. I can't simply name the metal from its colour.",
    ask: 'Two metals that behave alike. I have to separate what the nickel is doing before the cobalt result means anything. A mineral dealer wants an answer by Friday; he will get a careful one.' },
  13: { n: 13, title: 'Fish sample with an Egyptian officer', img: IMG(13), line: 'The officer has brought a sample, not proof of a crime. Let us see what the analysis actually establishes.',
    ask: 'I can say whether arsenic is present in this fish, and roughly how much. How it got there, and whether anyone meant harm, is for the officer and the court. I write down exactly what I found and nothing more.' },
  14: { n: 14, title: 'Testing fruit conserve', img: IMG(14), line: 'This preserve has an unusual set. That gives us a question to investigate, not an answer.',
    ask: 'A grocer suspects a supplier of bulking his jam. The texture is a hint; only analysis can say whether anything was added, and what.' },
  15: { n: 15, title: 'Coal-gas analysis', img: IMG(15), line: 'Watch the level in the burette. One careless reading could change the whole result.',
    ask: 'The gas works wants to know what is in its gas. Each part of the sample is taken up in turn and the volume that remains is read off. One misread line and the whole account is wrong.' },
  16: { n: 16, title: 'Examining air samples', img: IMG(16), line: 'A smoke complaint brought these here. We must identify what we measured before judging the source.',
    ask: 'Neighbours complain about a works chimney. I can report which gases I measured and how much. Saying "bad air" helps nobody; saying what, and how much, might.' },
  17: { n: 17, title: 'Measuring nitrogen', img: IMG(17), line: 'This test measures nitrogen. Calling it protein requires an additional assumption.',
    ask: 'For grain and fodder, the nitrogen is multiplied by a customary factor and called protein. The factor is an assumption, so I write it down beside the result.' },
  18: { n: 18, title: 'Hydrogen-electrode experiment', img: IMG(18), line: "There — the precipitate is beginning to form. I'm checking the electrical reading alongside what we can see.",
    ask: 'The meter tells me how acid the solution is at the moment the cloudiness appears. My eye tells me when; the meter tells me what. I trust them together more than either alone.' },
  19: { n: 19, title: 'Calorimetry', img: IMG(19), line: 'The temperature rose, but we must account for the instrument before reporting the heat.',
    ask: 'A fuel merchant wants the heat value of his coal. The vessel and the water warm up too; until I allow for them, the number flatters the coal.' },
  20: { n: 20, title: 'Studying an X-ray plate', img: IMG(20), line: 'A colleague sent this diffraction photograph from London. We can interpret it here, though we cannot make one in this lab.',
    ask: 'The spots are how X-rays scatter off a crystal. The plate was made in a specialist laboratory; I can study the pattern and the paper that came with it, but I have no X-ray tube in Giza.' },
};

/** The historical cases, shown one after another on quiet visits */
const CASES = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
const AMBIENT = [1, 3];

export interface SceneState {
  day: number; hour: number;
  arranBooks?: Partial<Record<BookId, { phase: string; copyId?: string }>>;
  papers?: Paper[];
  arranVisit?: ArranVisitState;
  labUnlocked?: string[];
  cargo?: { paperwork: string; cls: string; collected: boolean }[];
  arranFindings?: LabFinding[];
}

export interface ScenePick { scene: ArranScene; reason: string; book?: BookId }

/** One scene per visit, from real game state, in the order of the design brief. A story scene that is
 *  still true (a book in your bag, Sinai ahead) is not shown again on the next entry or the one after:
 *  he is found at other work in between, and the story waits in the notebook. Ordinary visits go
 *  round all his cases, one per entry, never the same twice running. */
export function pickArranScene(s: SceneState): ScenePick {
  const S = (n: number, reason: string, book?: BookId): ScenePick => ({ scene: SCENES[n], reason, book });
  const recent = s.arranVisit?.recentScenes ?? [];
  const fresh = (p: ScenePick | null) => (p && !recent.slice(-2).includes(p.scene.n) ? p : null);
  // 1. a requested book you are actually carrying
  const carried = (Object.entries(s.arranBooks ?? {}) as [BookId, { phase: string; copyId?: string }][])
    .find(([, b]) => b?.phase === 'copy_acquired' && (s.papers ?? []).some((p) => p.id === b.copyId));
  const book = carried ? (carried[0] === 'restricted_records' ? S(6, 'quest_book_ready_to_deliver', carried[0]) : S(4, 'quest_book_ready_to_deliver', carried[0])) : null;
  // 2. the museum linen, once its case is open and not yet studied (this one waits for you: it is the event)
  if (mummyPermitted(s.arranVisit, s.day) && !s.arranVisit?.mummyIntroductionSeen) return S(7, 'mummy_case_active');
  // 3. heading for Sinai
  const sinai = s.arranBooks?.field_safety?.phase;
  const trip = sinai === 'requested' || sinai === 'located' ? ((s.labUnlocked ?? []).includes('provisions') ? S(8, 'sinai_departure_active') : S(5, 'sinai_departure_active')) : null;
  // 4. carrying restricted goods with no papers
  const crate = (s.cargo ?? []).some((c) => c.paperwork === 'none' && c.cls !== 'ordinary') ? S(9, 'undocumented_crate_active') : null;
  // 5. a result from today
  const today = (s.arranFindings ?? []).filter((f) => f.day === s.day).slice(-1)[0];
  const result = !today ? null
    : today.service === 'fastness' && today.verdict === 'inconsistent' ? S(2, 'specific_test_result_ready')
      : today.service === 'fibre' ? S(1, 'specific_test_result_ready')
        : today.service === 'dye' || today.service === 'wash' ? S(3, 'specific_test_result_ready') : null;
  const story = fresh(book) ?? fresh(trip) ?? fresh(crate) ?? fresh(result);
  if (story) return story;
  // 6/7. an ordinary visit: late at night he is mostly reading; otherwise his own cases and the bench
  const night = s.hour >= 19 || s.hour < 7;
  const pool = night ? [10, 10, ...CASES] : [...AMBIENT, ...CASES];
  const entries = s.arranVisit?.entries ?? s.arranVisit?.visitCount ?? 0;
  for (let k = 0; k < pool.length; k++) {
    const n = pool[(entries + k) % pool.length];
    if (n !== recent[recent.length - 1]) return S(n, n === 10 || AMBIENT.includes(n) ? 'ambient_lab_visit' : 'selected_lab_activity');
  }
  return S(pool[0], 'ambient_lab_visit');
}
