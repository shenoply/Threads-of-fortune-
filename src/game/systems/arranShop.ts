// The Embleton catalogue: everything Arran offers, what each thing does, and what it costs, laid out like a
// mail-order catalogue. Services are paid in the lab; reports and tools are bought from the book.
// Effects are real: a signed report or the loupe makes a buyer weigh your argument more.
import type { LabService } from './arranLab';
import type { BookId } from './arranBooks';
import { CABINET, KIND_WORD, type CabinetId } from './arranCabinet';

export type ShopKind = 'service' | 'report' | 'tool' | 'book' | 'cabinet';
export interface ShopItem {
  id: string; kind: ShopKind; section: string; name: string; price: number | null;
  img: string; blurb: string; effect: string; service?: LabService; book?: BookId; cabinet?: CabinetId; law?: string;
}

export const SECTIONS = [
  { id: 'exam', title: 'Examinations', sub: 'Carried out on the premises while you wait' },
  { id: 'reports', title: 'Written reports', sub: 'Signed in ink, for showing to buyers' },
  { id: 'goods', title: 'Goods for the trade', sub: 'Instruments of the better class' },
  { id: 'cabinet', title: 'Remedies, poisons & powder', sub: 'Made up here, or arranged through licensed men' },
  { id: 'library', title: 'Books of reference', sub: 'Not for sale. Wanted' },
] as const;

export const SHOP: ShopItem[] = [
  { id: 'fibre', kind: 'service', section: 'exam', service: 'fibre', name: 'Fibre under the microscope', price: 8, img: 'microscope',
    blurb: 'One loose yarn teased apart on a glass slide and examined at two hundred diameters. Wool shows its scales; cotton its twisted ribbon; silk a smooth, glassy rod. Forty-five minutes.',
    effect: 'Tells you what the pile and the foundation are made of, and whether that matches how the rug is sold.' },
  { id: 'dye', kind: 'service', section: 'exam', service: 'dye', name: 'Dye test', price: 18, img: 'dye-test',
    blurb: 'A few fibres boiled and spotted on porcelain beside his dye cards. Madder, indigo, weld and the anilines each answer differently. Two hours.',
    effect: 'Natural or synthetic colours, measured against the age the rug is sold at. Never gives a year.' },
  { id: 'fastness', kind: 'service', section: 'exam', service: 'fastness', name: 'Colour transfer rub', price: 6, img: 'colour-transfer-rub',
    blurb: 'A damp white cloth rubbed firmly on the back of the rug and examined in daylight. Nothing is cut. Thirty minutes.',
    effect: 'Whether colour comes off on a cloth: a guide for floors where boots and brooms rub it. It says nothing about washing.' },
  { id: 'wash', kind: 'service', section: 'exam', service: 'wash', name: 'Sample wash test', price: 14, img: 'sample-wash',
    blurb: 'A few loose fibres washed in warm soapy water in a porcelain dish beside undyed white wool, then dried and compared. Three hours.',
    effect: 'Whether the dyes run in a warm soap wash of a small sample. Worth knowing before you call a rug washable. Needs his Knecht.' },
  { id: 'provisions', kind: 'service', section: 'exam', service: 'provisions', name: 'Provisions assessment', price: 10, img: 'provisions-assessment',
    blurb: 'He counts your stores against your party and the road, and asks how you have been sleeping. One hour. Needs his McCarrison.',
    effect: 'How many days your food covers, which roads it will not cover, and how tired you are. Food works over days, not minutes.' },
  { id: 'cargo', kind: 'service', section: 'exam', service: 'cargo', name: 'Cargo hazard check', price: 12, img: 'balance', // 'cargo-hazard' arrived as an empty file: restore when the plate is resupplied
   
    blurb: 'Labels, seals and packing of a crate someone wants carried, checked against the Sinai survey folio. He never opens a sealed case. One hour.',
    effect: 'What the crate is, how it must travel, and which licensed handler and paper it needs. Never how to prepare or use it.' },
  { id: 'metal', kind: 'service', section: 'exam', service: 'metal', name: 'Density on the balance', price: 12, img: 'density-balance',
    blurb: 'An object weighed in air and again in water, and its density worked out in the notebook. Plated and hollow pieces are noted.',
    effect: 'For brass, silver and gold antiques. You have none at present.' },

  { id: 'report', kind: 'report', section: 'reports', name: 'Signed laboratory report', price: 15, img: 'signed-report',
    blurb: 'A clean copy of one result on his headed paper, signed "A. Embleton, textile chemist", folded to go with the rug. One report per result; only results that agree with the description can be written up.',
    effect: 'At the stall, a fibre report makes buyers weigh your craft argument more; a rub or wash report does the same for durability. Buyers trust you a little more.' },

  { id: 'loupe', kind: 'tool', section: 'goods', name: 'Pocket loupe, ten diameters', price: 120, img: 'loupe',
    blurb: 'A folding brass loupe of good German glass, in a leather slip case. Arran keeps two and will part with one.',
    effect: 'Show a buyer the knots through the glass: your craft argument counts for more on finely woven rugs. Yours for good.' },

  { id: 'cloths', kind: 'tool', section: 'goods', name: 'Rubbing cloths, white cotton, packet of six', price: 20, img: 'rubbing-cloths',
    blurb: 'Bleached calico squares for the damp-cloth test, cut and hemmed in the laboratory. Press one to the back of a washable rug in front of the buyer.',
    effect: 'On rugs sold as washable, your durability argument counts for more. Keeps for good.' },
  { id: 'specimens', kind: 'tool', section: 'goods', name: 'Specimen box: madder root, indigo cake, weld', price: 45, img: 'dye-specimen-box',
    blurb: 'A small mahogany box with three compartments: dried madder root, a cake of Bengal indigo and a twist of weld, each labelled in his hand.',
    effect: 'Show a buyer where the old colours come from: your story argument counts for more on antique rugs.' },
  { id: 'gauge', kind: 'tool', section: 'goods', name: 'Brass knot gauge, one inch', price: 60, img: 'brass-knot-gauge',
    blurb: 'A thin brass plate with a one-inch window, for counting knots on the back of a rug without guessing. Made for Arran by a clockmaker in the Muski.',
    effect: 'Count the knots in front of the buyer: your craft argument counts for more on hard-wearing rugs.' },

  { id: 'matthews', kind: 'book', section: 'library', book: 'fibres', name: 'Matthews, Laboratory Manual of Dyeing and Textile Chemistry', price: null, img: 'book-matthews',
    blurb: 'New York, 1909. His own copy was lost at Port Said. The Qasr el-Nil reading room in Cairo has one.',
    effect: 'Bring him a copy and the fibre test opens.' },
  { id: 'knecht', kind: 'book', section: 'library', book: 'dyes', name: 'Knecht, Rawson and Loewenthal, A Manual of Dyeing', price: null, img: 'book-knecht',
    blurb: 'London: Charles Griffin. Lent to a man in Manchester in 1919 and never returned. The cotton merchants\' archive in Alexandria keeps one.',
    effect: 'Bring him a copy and the dye test and the sample wash test open.' },
  { id: 'mccarrison', kind: 'book', section: 'library', book: 'provisions', name: 'McCarrison, Studies in Deficiency Disease', price: null, img: 'book-mccarrison',
    blurb: 'London, 1921. On the medical shelves of the Qasr el-Nil reading room in Cairo.',
    effect: 'Bring him a copy and the provisions assessment opens.' },
  { id: 'folio', kind: 'book', section: 'library', book: 'field_safety', name: 'The 1911 Sinai survey folio (fictional)', price: null, img: 'book-sinai-folio',
    blurb: 'Left with the monks at St Catherine\'s. Copied slowly by Brother Anastasios; the road there runs through the passes.',
    effect: 'Bring him a copy and the cargo hazard check and the blasting charge open.' },
  { id: 'ledger', kind: 'book', section: 'library', book: 'restricted_records', name: 'Port Said customs ledger of controlled goods (fictional)', price: null, img: 'book-customs-ledger',
    blurb: 'A certified extract from the customs house at Port Said, open mornings only.',
    effect: 'Bring him the extract and you can carry restricted cargo with the proper papers.' },
  // the cabinet, drawn from arranCabinet.ts so prices and effects are defined once
  ...CABINET.map((c): ShopItem => ({ id: `cab-${c.id}`, kind: 'cabinet', section: 'cabinet', cabinet: c.id, name: c.name, price: c.price,
    img: `cab-${c.id}`, blurb: `${KIND_WORD[c.kind]}. ${c.blurb}`, effect: c.effect, law: c.law })),
];

/** how much more a buyer weighs an argument, from Arran's reports on the rug and his instruments you carry */
export function labArgBonus(kind: string, reports: LabService[] | undefined, tools: string[] | undefined, traits: readonly string[]) {
  const has = (t: string) => !!tools?.includes(t);
  let r = 0;
  if (kind === 'craft' && reports?.includes('fibre')) r += 0.3;
  if (kind === 'durability' && (reports?.includes('fastness') || reports?.includes('wash'))) r += 0.3;
  if (kind === 'craft' && traits.includes('fineWeave') && has('loupe')) r += 0.15;
  if (kind === 'craft' && traits.includes('hardwearing') && has('gauge')) r += 0.1;
  if (kind === 'durability' && traits.includes('washable') && has('cloths')) r += 0.15;
  if (kind === 'story' && traits.includes('antique') && has('specimens')) r += 0.15;
  return r;
}
