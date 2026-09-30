// Arran's books: he asks for a named reference, you travel to the library that holds it, find it in
// the catalogue, come away with a copy you are allowed to own, and bring it back. Each returned book
// unlocks one of his services. See docs/handoff/ARRAN_BOOK_ROUTES_FOR_CLAUDE.md.
// Only the two textile books are playable so far; the other three seeds in the handoff (provisions,
// field safety, restricted records) are story work for later and are not listed here.
import type { LabService } from './arranLab';

export type BookId = 'fibres' | 'dyes';
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
  alexandria: {
    id: 'alexandria', town: 'alexandria', name: 'The cotton merchants\' archive',
    who: 'The reference shelves of the export houses near the cotton warehouses',
    blurb: 'Ledgers, shipping lists and a shelf of dyeing manuals that the Lancashire buyers left behind. The archivist sells duplicates to anyone with a merchant\'s card.',
    open: [8, 17],
  },
};

export interface Book {
  id: BookId; title: string; author: string; imprint: string; sourceKind: 'historical' | 'fictional';
  library: string; shelf: string; hint: string; unlock: LabService; unlockLabel: string;
  ask: string; thanks: string;
  copy: { price: number; minutes: number; label: string };
  duplicate: { price: number; minutes: number; label: string };
  page: { heading: string; equation: string; material: string; body: string; limit: string };
}

export const BOOKS: Record<BookId, Book> = {
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
export const BOOK_ORDER: BookId[] = ['fibres', 'dyes'];

/** the service a book unlocks; the fastness rub needs no book */
export const serviceBook = (sv: LabService): BookId | null => (sv === 'fibre' ? 'fibres' : sv === 'dye' ? 'dyes' : null);

export const bookPhase = (books: Partial<Record<BookId, BookState>> | undefined, id: BookId): QuestPhase => books?.[id]?.phase ?? 'unknown';
