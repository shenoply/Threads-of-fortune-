// Arran's books: he asks for a named reference, you travel to the library that holds it, find it in
// the catalogue, come away with a copy you are allowed to own, and bring it back. Each returned book
// unlocks one of his services. See docs/handoff/ARRAN_BOOK_ROUTES_FOR_CLAUDE.md.
// Five errands: two textile manuals, a nutrition study (provisions assessment), a field-safety folio
// behind the Sinai pass (cargo hazard checks), and a customs ledger at Port Said (licence paperwork for
// restricted cargo). The last two are explicitly fictional documents.
import type { LabService } from './arranLab';

export type BookId = 'fibres' | 'dyes' | 'provisions' | 'field_safety' | 'restricted_records';
export type QuestPhase = 'unknown' | 'requested' | 'located' | 'copy_acquired' | 'returned';
export interface BookState { phase: QuestPhase; copyId?: string; day?: number }
/** a paper you carry: never a library's own original */
export interface Paper { id: string; bookId: BookId; kind: 'copy' | 'duplicate'; title: string; from: string; day: number }

export interface Library { id: string; town: string; name: string; who: string; blurb: string; open: [number, number] }
export const LIBRARIES: Record<string, Library> = {
  cairo: {
    id: 'cairo', town: 'cairo', name: 'The Qasr el-Nil reading room',
    who: 'A reading room for engineers, doctors and students, run by a patient librarian',
    blurb: 'Long tables, green-shaded lamps, a card catalogue in a hundred drawers. Books do not leave the room; the copyist in the lobby will write out any chapter for a fee.',
    open: [8, 18],
  },
  sinai: {
    id: 'sinai', town: 'sinai', name: 'The monastery guest-house records',
    who: 'Brother Anastasios keeps the papers travellers leave behind',
    blurb: 'A room of boxed papers under the library: survey notes, pilgrims\' letters, a few folios left by engineers. Nothing leaves the monastery; the brothers copy what a visitor needs, slowly.',
    open: [7, 17],
  },
  portsaid: {
    id: 'portsaid', town: 'portsaid', name: 'The customs house records office',
    who: 'A clerk of the Egyptian customs, with a ledger for everything',
    blurb: 'Manifests, seizure notes and licences, filed by date. A clerk will make a certified extract for a fee; the ledgers themselves stay in the building.',
    open: [8, 14],
  },
  alexandria: {
    id: 'alexandria', town: 'alexandria', name: 'The cotton merchants\' archive',
    who: 'The reference shelves of the export houses near the cotton warehouses',
    blurb: 'Ledgers, shipping lists and a shelf of dyeing manuals that the Lancashire buyers left behind. The archivist sells duplicates to anyone with a merchant\'s card.',
    open: [8, 17],
  },
};

export interface Book {
  id: BookId; title: string; author: string; imprint: string; sourceKind: 'historical' | 'fictional';
  library: string; shelf: string; hint: string; unlock: LabService | 'records'; unlockLabel: string;
  ask: string; thanks: string;
  copy: { price: number; minutes: number; label: string };
  duplicate: { price: number; minutes: number; label: string };
  page: { heading: string; equation: string; material: string; body: string; limit: string };
}

const TEXTILE_BOOKS: Record<'fibres' | 'dyes', Book> = {
  fibres: {
    id: 'fibres', sourceKind: 'historical',
    title: 'Laboratory Manual of Dyeing and Textile Chemistry', author: 'J. Merritt Matthews', imprint: 'New York, 1909',
    library: 'cairo', shelf: 'Shelf 667.2 MAT', hint: 'Ask at the Qasr el-Nil reading room in Cairo. They keep technical books for the engineering students.',
    unlock: 'fibre', unlockLabel: 'Fibre under the microscope',
    ask: '"My Matthews went to the bottom of the harbour at Port Said with a crate of glassware. Without it I would be guessing at fibres, and I do not guess for money. The reading room at Qasr el-Nil in Cairo has one. Bring me a copy of the fibre chapters and I can start testing."',
    thanks: '"Matthews! The fibre plates, the scale counts, all of it. Put your rugs on the bench whenever you like: I can tell wool from cotton from silk now, and say plainly when I cannot."',
    copy: { price: 40, minutes: 180, label: 'A fair copy of the fibre chapters, by the copyist' },
    duplicate: { price: 120, minutes: 15, label: 'The withdrawn duplicate, stamped "cancelled"' },
    page: {
      heading: 'Wool and cotton', equation: 'Cotton cellulose: (C₆H₁₀O₅)ₙ',
      material: 'A loose yarn thread and an optical microscope',
      body: 'Wool is a protein fibre covered in overlapping scales. Cotton is a flat, twisted ribbon of cellulose with a hollow centre. Silk is a smooth rod with neither scales nor twist.',
      limit: 'Fibre structure cannot date a rug.',
    },
  },
  dyes: {
    id: 'dyes', sourceKind: 'historical',
    title: 'A Manual of Dyeing', author: 'E. Knecht, C. Rawson and R. Loewenthal', imprint: 'London: Charles Griffin',
    library: 'alexandria', shelf: 'Case 4, dyeing', hint: 'The cotton merchants\' archive in Alexandria keeps the dyeing manuals the Lancashire buyers use.',
    unlock: 'dye', unlockLabel: 'Dye test',
    ask: '"For dyes I need my cards and my Knecht. The cards I have. The Knecht was lent to a man in Manchester in 1919 and I have not seen it since. The merchants\' archive in Alexandria keeps one for the cotton buyers. It is a long road; take care on it."',
    thanks: '"Knecht, Rawson and Loewenthal. Madder, indigo, the early anilines. I can test your dyes now. But remember: a synthetic colour tells you \'probably after this year\', never the year."',
    copy: { price: 60, minutes: 240, label: 'A copied extract of the natural and aniline dye chapters' },
    duplicate: { price: 160, minutes: 15, label: 'A spare copy from the archive\'s duplicates shelf' },
    page: {
      heading: 'Indigo in the vat', equation: 'Leucoindigo + oxygen → blue indigo',
      material: 'A few loose fibres, his dye cards and a porcelain dish',
      body: 'Yarn comes out of an indigo vat yellow-green and turns blue in the air. Madder gives reds; the anilines sold after 1856 give brighter, sometimes fugitive colours.',
      limit: 'Plant and synthetic indigo give the same pigment. Colour alone does not prove provenance or date.',
    },
  },
};
export const BOOKS: Record<BookId, Book> = {
  ...TEXTILE_BOOKS,
  provisions: {
    id: 'provisions', sourceKind: 'historical',
    title: 'Studies in Deficiency Disease', author: 'Robert McCarrison', imprint: 'London, 1921',
    library: 'cairo', shelf: 'Medical shelves, 616.39 MCC', hint: 'The Qasr el-Nil reading room keeps medical books for the students of the medical school.',
    unlock: 'provisions', unlockLabel: 'Provisions assessment',
    ask: '"Your men eat bread and dates for a fortnight and wonder why they are tired. McCarrison fed rats on the diets of different peoples and watched what happened. The reading room has him. Bring me the chapters on diet, and I can tell you what your caravan should carry."',
    thanks: '"McCarrison. Now bring me your stores and I will tell you honestly how far they go and what is missing. No miracle cures: food works over days, not minutes."',
    copy: { price: 40, minutes: 180, label: 'A fair copy of the chapters on diet' },
    duplicate: { price: 110, minutes: 15, label: 'A withdrawn duplicate from the students\' shelf' },
    page: {
      heading: 'Food for the road', equation: 'One ration a person a day; more for hard marching',
      material: 'Your stores, the number in your party, the days of the road',
      body: 'Bread and dates keep a man going; lentils, onions, milk and fresh greens where you can get them keep him well. Deficiency shows slowly, as weakness and slow recovery, and it mends slowly.',
      limit: 'A book cannot feed anyone. It tells you what to buy.',
    },
  },
  field_safety: {
    id: 'field_safety', sourceKind: 'fictional',
    title: 'Field safety folio of the 1911 Sinai survey party (fictional)', author: 'Survey engineers, unnamed', imprint: 'Manuscript, 1911',
    library: 'sinai', shelf: 'Box 14, survey papers', hint: 'A survey party left its folio with the monks at St Catherine\'s. The road runs through the Sinai passes: plan the crossing.',
    unlock: 'cargo', unlockLabel: 'Cargo hazard checks, a safer crossing of the Sinai passes, and the blasting charge for the old road',
    ask: '"A survey party left a folio at St Catherine\'s in 1911: how their quarrying powder, lamp oil and sheep-dip were packed and carried, and who was licensed to handle each. I want it for the crates that turn up at my door asking to be identified. It is a hard road through the passes. Wait for company, or pay a guide."',
    thanks: '"The folio. Now when someone brings me a crate I can tell them what it is, whether it is packed so it will not kill the camel, and which licensed man should handle it. I still will not open a sealed case, and I will not tell anyone how to use what is in it."',
    copy: { price: 50, minutes: 300, label: 'A copy by Brother Anastasios (slow, careful)' },
    duplicate: { price: 0, minutes: 0, label: '' },
    page: {
      heading: 'Carrying dangerous goods', equation: 'Operational pages withheld',
      material: 'Records, labels and permissions only',
      body: 'Explosives and poisons travel separately, sealed, labelled, with a licence and a named handler. The folio records who carried what, under which permit, and what went wrong when they did not.',
      limit: 'The pages on preparation and use are missing from this copy. Arran will discuss risks and paperwork, never a preparation.',
    },
  },
  restricted_records: {
    id: 'restricted_records', sourceKind: 'fictional',
    title: 'Controlled supplies ledger, Port Said customs (fictional extract)', author: 'Egyptian Customs Administration', imprint: 'Port Said, 1924–1925',
    library: 'portsaid', shelf: 'Ledger 7, controlled goods', hint: 'The customs house at Port Said keeps the ledger of controlled goods. The port is watched; carry only what you can explain.',
    unlock: 'records', unlockLabel: 'Papers for restricted cargo: carry it lawfully instead of risking confiscation',
    ask: '"The customs house at Port Said keeps a ledger of what they seize and what they license: cocaine for the chemists, powder for the quarries, spirits for the hotels. If you are going to carry anything of the sort for anyone, know what the papers look like before a patrol asks you for them."',
    thanks: '"A certified extract. Good. Now you can tell a proper licence from a forged one, and I can tell you which cargo needs which paper. Carry nothing without it. The law on drugs changed in March; the customs men are keen."',
    copy: { price: 60, minutes: 120, label: 'A certified extract by the customs clerk' },
    duplicate: { price: 0, minutes: 0, label: '' },
    page: {
      heading: 'What needs a licence', equation: 'Paperwork, not preparation',
      material: 'Manifests, licences and seizure notes',
      body: 'Blasting powder: a quarry or works permit and a named shot-firer. Arsenical sheep-dip and similar poisons: a registered dealer\'s label and a signed book. Cocaine, opium, morphine and their preparations: a pharmacist\'s or physician\'s authority. Spirits: duty paid and stamped.',
      limit: 'A summary for the game. Offences and penalties are not stated here; see the sources in the notebook.',
    },
  },
};
export const BOOK_ORDER: BookId[] = ['fibres', 'dyes', 'provisions', 'field_safety', 'restricted_records'];
/** a book that can be bought as a withdrawn duplicate, not only copied */
export const hasDuplicate = (id: BookId) => BOOKS[id].duplicate.price > 0;

/** the book each service needs; the colour transfer rub needs none */
export const serviceBook = (sv: LabService): BookId | null =>
  sv === 'fibre' ? 'fibres' : sv === 'dye' || sv === 'wash' ? 'dyes' : sv === 'provisions' ? 'provisions' : sv === 'cargo' ? 'field_safety' : null;

export const bookPhase = (books: Partial<Record<BookId, BookState>> | undefined, id: BookId): QuestPhase => books?.[id]?.phase ?? 'unknown';
