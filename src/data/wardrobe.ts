// The hero's wardrobe: twenty ready outfits, each painted twice: full length for the wardrobe and
// waist up for the stall. Put one on in the wardrobe and the stall shows him in the same clothes.
//
// Art (transparent WebP, 1024 x 1536 canvas, made by tools/outfit-art.py from the PNG masters):
//   public/art/hero/outfits/<id>-full.webp    full body, standing, facing the viewer
//   public/art/hero/outfits/<id>-stall.webp   waist up at the counter, hands open to the buyer
//
// Prices are in piastres, like everything else in the game.

export type Dress = 'galabiya' | 'stambouli' | 'kaftan' | 'frockcoat';

export interface ReadyOutfit {
  id: string;
  name: string;
  /** piastres */
  price: number;
  /** what the clothes add to his charisma, before cleanliness */
  charisma: number;
  /** towns whose tailors sell it; empty = any town with a market */
  where: string[];
  /** a line for the wardrobe card */
  note: string;
  /** how buyers' dialogue reads him: plain bazaar clothes, effendi, old-family silk, or court dress */
  dress: Dress;
}

const BIG = ['cairo', 'alexandria', 'istanbul'];
const LEVANT = ['damascus', 'aleppo', 'beirut', 'jerusalem', 'baghdad'];

export const OUTFITS: ReadyOutfit[] = [
  { id: 'classic-stall', name: 'Your father’s stall clothes', price: 110, charisma: 1, where: [], dress: 'galabiya', note: 'Cream linen shirt, the brown embroidered vest, sirwal and yellow slippers. What the lane knows you in.' },
  { id: 'tarboosh-stall', name: 'Stall clothes with tarboosh', price: 160, charisma: 3, where: BIG, dress: 'galabiya', note: 'The same vest and shirt, with a red tarboosh. A shade more respectable.' },
  { id: 'market-work', name: 'Striped work galabiya', price: 40, charisma: 0, where: [], dress: 'galabiya', note: 'Brown and cream stripes and a white cap. Honest, and a little worn.' },
  { id: 'friday-white', name: 'Friday whites', price: 90, charisma: 2, where: [], dress: 'galabiya', note: 'A clean white galabiya and turban, red slippers. For Friday, and for guests.' },
  { id: 'coffee-house', name: 'Coffee-house afternoon', price: 140, charisma: 3, where: [], dress: 'galabiya', note: 'The vest with a burnt-orange silk scarf at the neck. Easy, and a little dashing.' },
  { id: 'evening-merchant', name: 'Evening merchant', price: 210, charisma: 4, where: BIG.concat(['portsaid', 'tanta']), dress: 'stambouli', note: 'Tarboosh, vest and dark pressed trousers, with a watch chain. For the evening trade.' },
  { id: 'albanian-merchant', name: 'Albanian merchant', price: 260, charisma: 5, where: BIG, dress: 'stambouli', note: 'The white felt qeleshe of the old Cairo families, with the vest and dark trousers.' },
  { id: 'port-traveller', name: 'Port traveller', price: 300, charisma: 5, where: ['portsaid', 'suez', 'alexandria'], dress: 'stambouli', note: 'A cream linen field jacket and a leather satchel across the body. Made for the quays.' },
  { id: 'levant-trader', name: 'Levant trader', price: 360, charisma: 6, where: LEVANT, dress: 'stambouli', note: 'Silk turban, embroidered vest and a red silk sash. The souqs of Damascus nod at it.' },
  { id: 'wool-dignitary', name: 'Omda’s wool', price: 420, charisma: 7, where: ['cairo', 'tanta', 'fayoum'], dress: 'stambouli', note: 'Fine navy wool galabiya with a gold watch chain. The dress of a village headman.' },
  { id: 'alexandria-linen', name: 'Alexandria linen suit', price: 450, charisma: 7, where: ['alexandria', 'portsaid', 'beirut'], dress: 'stambouli', note: 'Cream linen suit, striped tie, straw boater and two-tone shoes. The Corniche fashion.' },
  { id: 'cairo-effendi', name: 'Cairo effendi', price: 480, charisma: 8, where: BIG, dress: 'stambouli', note: 'Tarboosh and a buttoned black Stambouli jacket. Hotel owners and officials take you seriously.' },
  { id: 'contract-visit', name: 'Contract visit', price: 600, charisma: 9, where: BIG.concat(['beirut']), dress: 'stambouli', note: 'Cream jacket, dark tie and a leather briefcase. For signing things.' },
  { id: 'desert-road', name: 'Desert road', price: 220, charisma: 3, where: ['damascus', 'amman', 'baghdad', 'jerusalem', 'suez'], dress: 'galabiya', note: 'Keffiyeh and agal, vest, belt and riding boots. Keeps sun and sand off.' },
  { id: 'cold-night', name: 'Cold desert night', price: 160, charisma: 2, where: ['sinai', 'suez', 'amman', 'bedouin'], dress: 'galabiya', note: 'A heavy hooded wool burnous over a striped galabiya. Cold nights stop mattering.' },
  { id: 'caravan-rider', name: 'Caravan rider', price: 380, charisma: 4, where: ['damascus', 'aleppo', 'amman', 'baghdad', 'bedouin'], dress: 'galabiya', note: 'Keffiyeh, a long travel coat, satchel and boots. Dressed for the saddle.' },
  { id: 'damascus-silk', name: 'Damascus silk', price: 800, charisma: 10, where: LEVANT, dress: 'kaftan', note: 'A striped wine-red and gold silk kaftan and silk turban. Old families and sheikhs respect it.' },
  { id: 'gold-bisht', name: 'Gold-edged bisht', price: 700, charisma: 10, where: ['baghdad', 'damascus', 'amman'], dress: 'kaftan', note: 'A camel-hair cloak edged in gold over white. A sheikh’s dress.' },
  { id: 'auction-house', name: 'Auction-house suit', price: 1100, charisma: 12, where: BIG, dress: 'stambouli', note: 'Tarboosh, black suit, waistcoat and spectacles. Auctioneers look to you first.' },
  { id: 'court-formal', name: 'Court dress', price: 1800, charisma: 16, where: ['cairo', 'istanbul', 'alexandria'], dress: 'frockcoat', note: 'Black astrakhan kalpak and a court frock coat. Chamberlains admit you to a palace.' },
];
export const OUTFIT: Record<string, ReadyOutfit> = Object.fromEntries(OUTFITS.map((o) => [o.id, o]));

export interface WardrobeState { owned: string[]; worn: string }
export const START_WARDROBE: WardrobeState = { owned: ['classic-stall', 'market-work'], worn: 'classic-stall' };

/** The outfit he has on (the stall clothes if the save names one that no longer exists). */
export const wornOutfit = (w: WardrobeState | undefined | null): ReadyOutfit => OUTFIT[w?.worn ?? ''] ?? OUTFIT['classic-stall'];

/** Charisma from clothes before cleanliness. */
export const outfitCharisma = (w: WardrobeState | undefined | null) => wornOutfit(w).charisma;

/** Charisma the way the rest of the game counts it: clothes times how clean they are. */
export const heroCharisma = (w: WardrobeState | undefined | null, clean: number) => Math.round(outfitCharisma(w) * (0.4 + 0.6 * clean / 100) - (clean < 30 ? 4 : 0));

/** The old outfit id that dialogue lines key on ('galabiya' means dressed for the bazaar). */
export const legacyWorn = (w: WardrobeState | undefined | null): Dress => wornOutfit(w).dress;

export const soldIn = (o: ReadyOutfit, at: string | null | undefined) => !!at && (o.where.length === 0 ? at !== 'road' : o.where.includes(at));

export const fullSrc = (id: string) => `art/hero/outfits/${id}-full.webp`;
export const stallSrc = (id: string) => `art/hero/outfits/${id}-stall.webp`;

/**
 * Saves from before the ready outfits: they held separate pieces (or, older still, whole tailor sets).
 * Give the outfits that match what was owned, and put him in the nearest one to what he wore.
 */
const FROM_PIECE: Record<string, string> = {
  'galabiya-work': 'market-work', 'galabiya-white': 'friday-white', 'galabiya-wool': 'wool-dignitary', tarboosh: 'tarboosh-stall',
  qeleshe: 'albanian-merchant', stambouli: 'cairo-effendi', 'linen-suit': 'alexandria-linen', kaftan: 'damascus-silk', bisht: 'gold-bisht',
  'frock-coat': 'court-formal', burnous: 'cold-night', keffiyeh: 'desert-road', scarf: 'coffee-house', 'turban-silk': 'levant-trader', briefcase: 'contract-visit',
  // the oldest saves bought whole sets
  galabiya: 'market-work', frockcoat: 'court-formal',
};
export function wardrobeFromOld(old: unknown, attire?: { owned?: string[]; worn?: string }): WardrobeState {
  const o = (old ?? {}) as { owned?: string[]; worn?: string; outfit?: { head?: string | null; top?: string; outer?: string | null } };
  if (typeof o.worn === 'string' && OUTFIT[o.worn] && Array.isArray(o.owned)) return { owned: o.owned.filter((id) => OUTFIT[id]), worn: o.worn };
  const owned = new Set(START_WARDROBE.owned);
  for (const id of [...(o.owned ?? []), ...(attire?.owned ?? [])]) if (FROM_PIECE[id]) owned.add(FROM_PIECE[id]);
  const was = o.outfit;
  const worn = (was && (FROM_PIECE[was.outer ?? ''] ?? (was.top === 'galabiya-white' ? 'friday-white' : was.top === 'galabiya-work' ? 'market-work' : was.head === 'tarboosh' ? 'tarboosh-stall' : null)))
    ?? FROM_PIECE[attire?.worn ?? ''] ?? 'classic-stall';
  owned.add(worn);
  return { owned: [...owned], worn };
}
