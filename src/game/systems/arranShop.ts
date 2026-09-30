// Arran's price book: what he sells, what each thing does, and what it costs, laid out like a
// mail-order catalogue. Services are paid in the lab; reports and tools are bought from the book.
// Effects are real: a signed report or the loupe makes a buyer weigh your argument more.
import type { LabService } from './arranLab';

export type ShopKind = 'service' | 'report' | 'tool' | 'book';
export interface ShopItem {
  id: string; kind: ShopKind; section: string; name: string; price: number | null;
  img: string; blurb: string; effect: string; service?: LabService; book?: 'fibres' | 'dyes';
}

export const SECTIONS = [
  { id: 'exam', title: 'Examinations', sub: 'Carried out on the premises while you wait' },
  { id: 'reports', title: 'Written reports', sub: 'Signed in ink, for showing to buyers' },
  { id: 'goods', title: 'Goods for the trade', sub: 'Instruments of the better class' },
  { id: 'library', title: 'Books of reference', sub: 'Not for sale. Wanted' },
] as const;

export const SHOP: ShopItem[] = [
  { id: 'fibre', kind: 'service', section: 'exam', service: 'fibre', name: 'Fibre under the microscope', price: 8, img: 'microscope',
    blurb: 'One loose yarn teased apart on a glass slide and examined at two hundred diameters. Wool shows its scales; cotton its twisted ribbon; silk a smooth, glassy rod. Forty-five minutes.',
    effect: 'Tells you what the pile and the foundation are made of, and whether that matches how the rug is sold.' },
  { id: 'dye', kind: 'service', section: 'exam', service: 'dye', name: 'Dye test', price: 18, img: 'swatches',
    blurb: 'A few fibres boiled and spotted on porcelain beside his dye cards. Madder, indigo, weld and the anilines each answer differently. Two hours.',
    effect: 'Natural or synthetic colours, measured against the age the rug is sold at. Never gives a year.' },
  { id: 'fastness', kind: 'service', section: 'exam', service: 'fastness', name: 'Colour-fastness rub', price: 6, img: 'vat',
    blurb: 'A damp white cloth pressed firmly to the back of the rug and examined in daylight. Nothing is cut. Thirty minutes.',
    effect: 'Whether a colour will run in the wash. Worth knowing before you call a rug washable.' },
  { id: 'metal', kind: 'service', section: 'exam', service: 'metal', name: 'Density on the balance', price: 12, img: 'balance',
    blurb: 'An object weighed in air and again in water, and its density worked out in the notebook. Plated and hollow pieces are noted.',
    effect: 'For brass, silver and gold antiques. You have none at present.' },

  { id: 'report', kind: 'report', section: 'reports', name: 'Signed laboratory report', price: 15, img: 'weave',
    blurb: 'A clean copy of one result on his headed paper, signed "A. Embleton, textile chemist", folded to go with the rug. One report per result; only results that agree with the description can be written up.',
    effect: 'At the stall, a fibre report makes buyers weigh your craft argument more; a colour-fastness report does the same for durability. Buyers trust you a little more.' },

  { id: 'loupe', kind: 'tool', section: 'goods', name: 'Pocket loupe, ten diameters', price: 120, img: 'loupe',
    blurb: 'A folding brass loupe of good German glass, in a leather slip case. Arran keeps two and will part with one.',
    effect: 'Show a buyer the knots through the glass: your craft argument counts for more on finely woven rugs. Yours for good.' },

  { id: 'cloths', kind: 'tool', section: 'goods', name: 'Rubbing cloths, white cotton, packet of six', price: 20, img: 'wool',
    blurb: 'Bleached calico squares for the damp-cloth test, cut and hemmed in the laboratory. Press one to the back of a washable rug in front of the buyer.',
    effect: 'On rugs sold as washable, your durability argument counts for more. Keeps for good.' },
  { id: 'specimens', kind: 'tool', section: 'goods', name: 'Specimen box: madder root, indigo cake, weld', price: 45, img: 'bowl',
    blurb: 'A small mahogany box with three compartments: dried madder root, a cake of Bengal indigo and a twist of weld, each labelled in his hand.',
    effect: 'Show a buyer where the old colours come from: your story argument counts for more on antique rugs.' },
  { id: 'gauge', kind: 'tool', section: 'goods', name: 'Brass knot gauge, one inch', price: 60, img: 'xsection',
    blurb: 'A thin brass plate with a one-inch window, for counting knots on the back of a rug without guessing. Made for Arran by a clockmaker in the Muski.',
    effect: 'Count the knots in front of the buyer: your craft argument counts for more on hard-wearing rugs.' },

  { id: 'matthews', kind: 'book', section: 'library', book: 'fibres', name: 'Matthews, Laboratory Manual of Dyeing and Textile Chemistry', price: null, img: 'strands',
    blurb: 'New York, 1909. His own copy was lost at Port Said. The Qasr el-Nil reading room in Cairo has one.',
    effect: 'Bring him a copy and the fibre test opens.' },
  { id: 'knecht', kind: 'book', section: 'library', book: 'dyes', name: 'Knecht, Rawson and Loewenthal, A Manual of Dyeing', price: null, img: 'cotton',
    blurb: 'London: Charles Griffin. Lent to a man in Manchester in 1919 and never returned. The cotton merchants\' archive in Alexandria keeps one.',
    effect: 'Bring him a copy and the dye test opens.' },
];

/** how much more a buyer weighs an argument, from Arran's reports on the rug and his instruments you carry */
export function labArgBonus(kind: string, reports: LabService[] | undefined, tools: string[] | undefined, traits: readonly string[]) {
  const has = (t: string) => !!tools?.includes(t);
  let r = 0;
  if (kind === 'craft' && reports?.includes('fibre')) r += 0.3;
  if (kind === 'durability' && reports?.includes('fastness')) r += 0.3;
  if (kind === 'craft' && traits.includes('fineWeave') && has('loupe')) r += 0.15;
  if (kind === 'craft' && traits.includes('hardwearing') && has('gauge')) r += 0.1;
  if (kind === 'durability' && traits.includes('washable') && has('cloths')) r += 0.15;
  if (kind === 'story' && traits.includes('antique') && has('specimens')) r += 0.15;
  return r;
}
