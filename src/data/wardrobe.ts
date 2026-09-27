// The hero's wardrobe: every piece sold separately, worn in layers over one painted base body.
//
// Art layout (all PNG with a transparent background, same canvas as the base of that pose):
//   public/art/hero/hero-base-wardrobe.png   1024x1536  full body, standing
//   public/art/hero/hero-base-stall.png      1024x1536  waist up, leaning on the counter
//   public/art/hero/hero-base-profile.png    1024x1024  head and shoulders
//   public/art/hero/<pose>/<piece id>.png    one layer per piece per pose
//
// Prices are in piastres, like everything else in the game. The old tailor sets cost the same
// bought piece by piece: Stambouli suit 350, Damascene kaftan 600, court dress 1,500.

export type Pose = 'wardrobe' | 'stall' | 'profile';
export const POSES: Pose[] = ['wardrobe', 'stall', 'profile'];
export const POSE_INFO: Record<Pose, { label: string; w: number; h: number; frame: string }> = {
  wardrobe: { label: 'Wardrobe', w: 1024, h: 1536, frame: 'full body standing, head to toe, facing the viewer' },
  stall: { label: 'Stall', w: 1024, h: 1536, frame: 'waist up, leaning forward over the rug counter, three-quarter view, forearms resting at the bottom edge' },
  profile: { label: 'Profile', w: 1024, h: 1024, frame: 'head and shoulders, facing the viewer' },
};

export type Slot = 'head' | 'top' | 'outer' | 'legs' | 'feet' | 'extras' | 'weapon' | 'carry';
export const SLOTS: { id: Slot; label: string; multi?: boolean; optional?: boolean }[] = [
  { id: 'head', label: 'Hats', optional: true },
  { id: 'top', label: 'Shirts & robes' },
  { id: 'outer', label: 'Coats & vests', optional: true },
  { id: 'legs', label: 'Trousers' },
  { id: 'feet', label: 'Shoes', optional: true },
  { id: 'extras', label: 'Extras', multi: true, optional: true },
  { id: 'weapon', label: 'Arms', optional: true },
  { id: 'carry', label: 'Bags', optional: true },
];

export interface Piece {
  id: string;
  name: string;
  slot: Slot;
  /** piastres */
  price: number;
  /** adds to charisma while worn */
  charisma: number;
  /** settlements whose tailors and shops sell it; empty = any town with a market */
  where: string[];
  /** which poses the piece shows in (legs and shoes are hidden behind the counter and below the profile frame) */
  poses: Pose[];
  /** stacking order: higher is drawn on top; below zero is behind his body (a slung rifle) */
  z: number;
  note: string;
  /** what the image generator draws: material, cut, colour */
  looks: string;
  /** swatch colour for the card before the picture exists */
  swatch: string;
}

const ALL: Pose[] = ['wardrobe', 'stall', 'profile'];
const UPPER: Pose[] = ['wardrobe', 'stall'];
const FULL: Pose[] = ['wardrobe'];
const BIG_CITIES = ['cairo', 'alexandria', 'istanbul'];
const LEVANT = ['damascus', 'aleppo', 'baghdad', 'beirut', 'jerusalem'];

const P = (p: Piece) => p;

export const PIECES: Record<string, Piece> = Object.fromEntries([
  // ---------- hats ----------
  P({ id: 'taqiyah', name: 'White knitted cap', slot: 'head', price: 5, charisma: 0, where: [], poses: ALL, z: 70, swatch: '#efe8d8', note: 'The taqiyah. Every man in the bazaar has one.', looks: 'a close-fitting white knitted cotton skullcap (taqiyah), slightly worn' }),
  P({ id: 'tarboosh', name: 'Tarboosh', slot: 'head', price: 40, charisma: 2, where: BIG_CITIES, poses: ALL, z: 70, swatch: '#8e1b1f', note: 'The red felt fez with a black silk tassel. An effendi is not dressed without it.', looks: 'a tall red felt tarboosh (fez) with a flat top and a black silk tassel hanging to the back' }),
  P({ id: 'qeleshe', name: 'Albanian white cap', slot: 'head', price: 45, charisma: 2, where: ['cairo', 'alexandria', 'istanbul'], poses: ALL, z: 70, swatch: '#f4f1ea', note: 'The round white felt qeleshe. The Khedive\'s house came from Albania, and old Cairo families still wear it.', looks: 'a round, brimless, white wool felt Albanian cap (qeleshe), dome-shaped, smooth and slightly stiff' }),
  P({ id: 'turban-white', name: 'White turban', slot: 'head', price: 30, charisma: 1, where: [], poses: ALL, z: 70, swatch: '#f5f5f0', note: 'Muslin wound over a cap. Respectable anywhere.', looks: 'a white muslin turban wound neatly around a small cap' }),
  P({ id: 'turban-silk', name: 'Silk turban', slot: 'head', price: 150, charisma: 3, where: LEVANT, poses: ALL, z: 70, swatch: '#c9a15a', note: 'Striped Damascus silk with gold thread. A merchant of substance.', looks: 'a turban of striped cream and gold Damascus silk, wound full and neat, gold threads catching the light' }),
  P({ id: 'kalpak', name: 'Pasha\'s kalpak', slot: 'head', price: 450, charisma: 4, where: ['istanbul', 'cairo'], poses: ALL, z: 70, swatch: '#1d1712', note: 'Tall black astrakhan, the hat of pashas and old Ottoman officers. People stand up.', looks: 'a tall, brimless black astrakhan lambswool kalpak hat, tightly curled fur, slightly tapered' }),
  P({ id: 'keffiyeh', name: 'Keffiyeh and agal', slot: 'head', price: 45, charisma: 1, where: ['damascus', 'baghdad', 'jerusalem', 'amman', 'bedouin'], poses: ALL, z: 70, swatch: '#e9e4da', note: 'For the desert road. Keeps sun and sand off.', looks: 'a white cotton keffiyeh draped over the head and shoulders, held by a black corded agal' }),
  P({ id: 'boater', name: 'Straw boater', slot: 'head', price: 90, charisma: 2, where: ['alexandria', 'portsaid', 'beirut'], poses: ALL, z: 70, swatch: '#d8bd7a', note: 'The Europeans of the Corniche wear these.', looks: 'a stiff flat-topped straw boater hat with a black grosgrain band' }),

  // ---------- shirts and robes ----------
  P({ id: 'linen-shirt', name: 'Collarless linen shirt', slot: 'top', price: 25, charisma: 0, where: [], poses: ALL, z: 20, swatch: '#e9dcc0', note: 'Cream linen with cloth buttons. What you wear under the vest at the stall.', looks: 'a loose cream linen shirt with a band collar, open at the throat, small red cloth buttons, full sleeves rolled to the forearm' }),
  P({ id: 'galabiya-work', name: 'Striped work galabiya', slot: 'top', price: 20, charisma: 0, where: [], poses: ALL, z: 20, swatch: '#8a6a47', note: 'Brown and cream stripes. Honest, and a little worn.', looks: 'an ankle-length brown and cream striped cotton galabiya with a round neck and a short button placket, loose sleeves' }),
  P({ id: 'galabiya-white', name: 'White galabiya', slot: 'top', price: 40, charisma: 1, where: [], poses: ALL, z: 20, swatch: '#f7f4ec', note: 'Clean white cotton for Friday and for guests.', looks: 'an ankle-length clean white cotton galabiya, round neck, long wide sleeves' }),
  P({ id: 'galabiya-wool', name: 'Fine wool galabiya', slot: 'top', price: 120, charisma: 2, where: ['cairo', 'tanta', 'fayoum'], poses: ALL, z: 20, swatch: '#3b3a45', note: 'Dark Upper Egyptian wool, the dress of an omda.', looks: 'an ankle-length charcoal-blue fine wool galabiya with a deep V neck and black silk piping' }),
  P({ id: 'dress-shirt', name: 'Collared dress shirt', slot: 'top', price: 100, charisma: 2, where: BIG_CITIES, poses: ALL, z: 20, swatch: '#ffffff', note: 'Starched white with a stiff collar and a dark tie. For offices and palaces.', looks: 'a starched white cotton dress shirt with a stiff turned-down collar and a narrow dark silk tie' }),

  // ---------- coats and vests ----------
  P({ id: 'vest-embroidered', name: 'Embroidered vest', slot: 'outer', price: 45, charisma: 0, where: [], poses: ALL, z: 30, swatch: '#5b3a1e', note: 'Brown wool with gold braid down the fronts. Your father\'s.', looks: 'an open-fronted dark brown wool waistcoat with wide bands of gold and rust embroidered braid down both fronts' }),
  P({ id: 'stambouli', name: 'Stambouli jacket', slot: 'outer', price: 180, charisma: 4, where: BIG_CITIES, poses: ALL, z: 30, swatch: '#2c2a2e', note: 'The effendi\'s buttoned black jacket. Hotel owners and officials take you seriously.', looks: 'a single-breasted black wool Stambouli frock jacket, high-buttoning, fitted, reaching mid-thigh' }),
  P({ id: 'linen-suit', name: 'Cream linen jacket', slot: 'outer', price: 160, charisma: 3, where: ['alexandria', 'portsaid', 'cairo'], poses: ALL, z: 30, swatch: '#e8dcc8', note: 'Cool and pale, the Alexandrian cotton men\'s jacket.', looks: 'a single-breasted cream linen suit jacket with notched lapels, three buttons, slightly creased' }),
  P({ id: 'kaftan', name: 'Silk kaftan', slot: 'outer', price: 400, charisma: 6, where: LEVANT, poses: ALL, z: 30, swatch: '#7a3b2e', note: 'Striped Damascus silk to the ankle. Old families and sheikhs respect it.', looks: 'an ankle-length open kaftan of striped wine-red and gold Damascus silk, lined, with a narrow collar' }),
  P({ id: 'bisht', name: 'Camel-hair bisht', slot: 'outer', price: 300, charisma: 5, where: ['baghdad', 'damascus', 'amman'], poses: ALL, z: 32, swatch: '#9b7650', note: 'A sheikh\'s cloak, edged in gold.', looks: 'a flowing sheer camel-brown wool bisht cloak worn open over the shoulders, edged with gold zari braid' }),
  P({ id: 'frock-coat', name: 'Court frock coat', slot: 'outer', price: 1050, charisma: 9, where: ['cairo', 'istanbul', 'alexandria'], poses: ALL, z: 30, swatch: '#141416', note: 'Black, knee-length, silk lapels. Chamberlains will not admit you to a palace without something like it.', looks: 'a black knee-length double-breasted court frock coat with silk-faced lapels, buttoned, sharply tailored' }),
  P({ id: 'burnous', name: 'Wool travel cloak', slot: 'outer', price: 90, charisma: 1, where: ['bedouin', 'sinai', 'suez', 'amman'], poses: ALL, z: 32, swatch: '#b9a98b', note: 'Heavy undyed wool. Cold desert nights stop mattering.', looks: 'a heavy undyed oatmeal wool hooded burnous cloak, hood down, worn open' }),

  // ---------- trousers ----------
  P({ id: 'sirwal', name: 'Cotton sirwal', slot: 'legs', price: 15, charisma: 0, where: [], poses: FULL, z: 10, swatch: '#d9cdb4', note: 'Loose trousers gathered at the ankle.', looks: 'loose off-white cotton sirwal trousers, full through the leg and gathered at the ankle' }),
  P({ id: 'wool-trousers', name: 'Dark wool trousers', slot: 'legs', price: 70, charisma: 1, where: BIG_CITIES, poses: FULL, z: 10, swatch: '#2c2c25', note: 'Pressed, with a crease.', looks: 'straight dark charcoal wool trousers with a sharp front crease' }),
  P({ id: 'linen-trousers', name: 'Cream linen trousers', slot: 'legs', price: 60, charisma: 1, where: ['alexandria', 'portsaid', 'cairo'], poses: FULL, z: 10, swatch: '#e8dcc8', note: 'Goes with the linen jacket.', looks: 'straight cream linen trousers, lightly creased' }),
  P({ id: 'morning-trousers', name: 'Striped court trousers', slot: 'legs', price: 250, charisma: 2, where: ['cairo', 'istanbul'], poses: FULL, z: 10, swatch: '#4a4a4f', note: 'Grey and black stripe, for the frock coat.', looks: 'formal grey and black pinstriped morning trousers, straight, sharply pressed' }),

  // ---------- shoes ----------
  P({ id: 'babouche', name: 'Yellow leather slippers', slot: 'feet', price: 15, charisma: 0, where: [], poses: FULL, z: 15, swatch: '#d6a84a', note: 'Backless markub slippers, flattened at the heel.', looks: 'backless pointed yellow leather markub slippers' }),
  P({ id: 'markub-red', name: 'Red Fez slippers', slot: 'feet', price: 50, charisma: 1, where: LEVANT.concat(['cairo']), poses: FULL, z: 15, swatch: '#9b2a22', note: 'Soft red leather, made in Fez and sold in every souq.', looks: 'soft pointed red leather slippers with a low back' }),
  P({ id: 'oxfords', name: 'Black oxford shoes', slot: 'feet', price: 60, charisma: 1, where: BIG_CITIES.concat(['beirut']), poses: FULL, z: 15, swatch: '#1b1b1b', note: 'Polished. They pinch.', looks: 'polished black leather lace-up oxford shoes' }),
  P({ id: 'spectator', name: 'Two-tone shoes', slot: 'feet', price: 140, charisma: 2, where: ['alexandria', 'beirut'], poses: FULL, z: 15, swatch: '#e4ddcf', note: 'White and tan, the Corniche fashion.', looks: 'white and tan two-tone leather brogue shoes' }),
  P({ id: 'boots', name: 'Riding boots', slot: 'feet', price: 150, charisma: 1, where: ['damascus', 'aleppo', 'amman', 'baghdad', 'suez'], poses: FULL, z: 15, swatch: '#5b3f2c', note: 'Knee-high, for the saddle and the road.', looks: 'knee-high brown leather riding boots, worn and oiled' }),

  // ---------- extras (several at once) ----------
  P({ id: 'sash', name: 'Red silk sash', slot: 'extras', price: 35, charisma: 1, where: [], poses: UPPER, z: 25, swatch: '#a3262a', note: 'Wound twice around the waist.', looks: 'a wide red silk sash (hizam) wound twice around the waist and knotted at the side' }),
  P({ id: 'belt', name: 'Leather belt', slot: 'extras', price: 20, charisma: 0, where: [], poses: UPPER, z: 26, swatch: '#6b5344', note: 'Brass buckle.', looks: 'a plain brown leather belt with a square brass buckle, worn at the waist' }),
  P({ id: 'misbaha', name: 'Amber prayer beads', slot: 'extras', price: 25, charisma: 1, where: [], poses: UPPER, z: 55, swatch: '#d08a2a', note: 'Something for the hands while the buyer thinks.', looks: 'a string of 33 amber prayer beads (misbaha) with a tassel, held loosely in the right hand' }),
  P({ id: 'scarf', name: 'Silk neck scarf', slot: 'extras', price: 50, charisma: 1, where: BIG_CITIES.concat(LEVANT), poses: ALL, z: 40, swatch: '#8b4513', note: 'Burnt orange, knotted loose.', looks: 'a burnt-orange silk scarf knotted loosely at the neck, ends tucked in' }),
  P({ id: 'watch', name: 'Gold pocket watch', slot: 'extras', price: 400, charisma: 2, where: ['alexandria', 'istanbul', 'cairo'], poses: UPPER, z: 35, swatch: '#caa052', note: 'Swiss, with a chain across the waistcoat. People check the time with you.', looks: 'a gold watch chain draped across the front of the chest from a buttonhole to a pocket, the gold pocket watch just visible' }),
  P({ id: 'ring', name: 'Signet ring', slot: 'extras', price: 150, charisma: 1, where: BIG_CITIES.concat(['damascus']), poses: UPPER, z: 56, swatch: '#b8913e', note: 'Carnelian in gold, on the little finger.', looks: 'a gold signet ring set with a red carnelian stone, on the little finger of the right hand' }),
  P({ id: 'spectacles', name: 'Gold spectacles', slot: 'extras', price: 80, charisma: 1, where: BIG_CITIES.concat(['beirut']), poses: ALL, z: 60, swatch: '#c9a457', note: 'Round lenses. Good for reading the weave, and for looking learned.', looks: 'small round gold-rimmed spectacles resting on the nose' }),
  P({ id: 'cane', name: 'Silver-topped cane', slot: 'extras', price: 120, charisma: 2, where: ['cairo', 'alexandria', 'istanbul'], poses: FULL, z: 58, swatch: '#3a2a1c', note: 'Ebony with a silver knob.', looks: 'an ebony walking cane with a silver knob handle, held in the right hand, tip on the ground' }),

  // ---------- arms ----------
  P({ id: 'khanjar', name: 'Curved dagger', slot: 'weapon', price: 80, charisma: 0, where: ['damascus', 'baghdad', 'aleppo', 'bedouin'], poses: UPPER, z: 45, swatch: '#9a8a6a', note: 'A khanjar in a silver sheath, worn at the belt.', looks: 'a curved khanjar dagger in an ornate silver sheath, tucked upright at the front of the waist' }),
  P({ id: 'kilij', name: 'Cavalry sabre', slot: 'weapon', price: 300, charisma: 1, where: ['istanbul', 'damascus'], poses: FULL, z: 45, swatch: '#7d7d7d', note: 'An Ottoman kilij, retired from service.', looks: 'a curved Ottoman kilij sabre in a black leather scabbard hanging from a shoulder strap at the left hip' }),
  P({ id: 'webley', name: 'Webley revolver', slot: 'weapon', price: 380, charisma: 0, where: ['alexandria', 'portsaid', 'jerusalem'], poses: FULL, z: 45, swatch: '#3b3b35', note: 'British service revolver in a flap holster.', looks: 'a brown leather flap holster on a belt at the right hip, the grip of a Webley revolver showing' }),
  P({ id: 'mauser-c96', name: 'Mauser pistol', slot: 'weapon', price: 450, charisma: 0, where: ['istanbul', 'beirut', 'aleppo'], poses: FULL, z: 45, swatch: '#4a4440', note: 'The broomhandle Mauser, in its wooden holster-stock.', looks: 'a Mauser C96 broomhandle pistol in its wooden holster-stock hanging from a leather strap at the right hip' }),
  P({ id: 'enfield', name: 'Lee-Enfield rifle', slot: 'weapon', price: 600, charisma: 0, where: ['portsaid', 'suez', 'jerusalem', 'baghdad'], poses: UPPER, z: -5, swatch: '#5c4a3d', note: 'Army surplus since the war. For the caravan roads.', looks: 'a Lee-Enfield bolt-action rifle slung over the right shoulder on a canvas strap, barrel up behind the shoulder' }),
  P({ id: 'ottoman-mauser', name: 'Ottoman Mauser rifle', slot: 'weapon', price: 520, charisma: 0, where: ['aleppo', 'damascus', 'konya', 'ankara', 'bedouin'], poses: UPPER, z: -5, swatch: '#6b5344', note: 'Model 1893, left behind by the old army.', looks: 'an Ottoman 1893 Mauser bolt-action rifle slung over the right shoulder on a leather strap, barrel up behind the shoulder' }),

  // ---------- bags ----------
  P({ id: 'satchel', name: 'Leather satchel', slot: 'carry', price: 60, charisma: 0, where: [], poses: FULL, z: 50, swatch: '#7a5634', note: 'Across the body, for samples and receipts.', looks: 'a brown leather satchel on a strap worn across the body, resting at the left hip' }),
  P({ id: 'briefcase', name: 'Leather briefcase', slot: 'carry', price: 140, charisma: 1, where: BIG_CITIES, poses: FULL, z: 50, swatch: '#4b3325', note: 'For contracts and auction catalogues.', looks: 'a dark brown leather briefcase with brass clasps, held in the left hand' }),
].map((p) => [p.id, p]));

export const PIECE_ORDER = Object.keys(PIECES);

export interface Outfit {
  head: string | null;
  top: string;
  outer: string | null;
  legs: string;
  feet: string | null;
  extras: string[];
  weapon: string | null;
  carry: string | null;
}

/** What the hero wears in the opening picture: his father's stall clothes. */
export const START_OUTFIT: Outfit = { head: null, top: 'linen-shirt', outer: 'vest-embroidered', legs: 'sirwal', feet: 'babouche', extras: [], weapon: null, carry: null };
export const START_OWNED = ['linen-shirt', 'vest-embroidered', 'sirwal', 'babouche', 'galabiya-work', 'taqiyah'];

export interface WardrobeState { owned: string[]; outfit: Outfit }
export const START_WARDROBE: WardrobeState = { owned: [...START_OWNED], outfit: { ...START_OUTFIT, extras: [] } };

export const wornIds = (o: Outfit): string[] =>
  [o.head, o.top, o.outer, o.legs, o.feet, ...o.extras, o.weapon, o.carry].filter((x): x is string => !!x && !!PIECES[x]);

/** Charisma from clothes before cleanliness: the sum of the pieces, capped at 20. */
export const outfitCharisma = (o: Outfit) => Math.min(20, wornIds(o).reduce((n, id) => n + (PIECES[id]?.charisma ?? 0), 0));

/** Charisma the way the rest of the game counts it: clothes times how clean they are. */
export const heroCharisma = (o: Outfit, clean: number) => Math.round(outfitCharisma(o) * (0.4 + 0.6 * clean / 100) - (clean < 30 ? 4 : 0));

/** The old single-outfit id that dialogue lines key on ('galabiya' means dressed for the bazaar). */
export function legacyWorn(o: Outfit): string {
  const c = outfitCharisma(o);
  if (c < 4) return 'galabiya';
  if (o.outer === 'frock-coat' || c >= 16) return 'frockcoat';
  if (o.outer === 'kaftan' || o.outer === 'bisht' || c >= 10) return 'kaftan';
  return 'stambouli';
}

/** Put a piece on, replacing whatever held that slot. Extras toggle. */
export function wearPiece(o: Outfit, id: string): Outfit {
  const p = PIECES[id];
  if (!p) return o;
  if (p.slot === 'extras') return { ...o, extras: o.extras.includes(id) ? o.extras.filter((x) => x !== id) : [...o.extras, id] };
  return { ...o, [p.slot]: id } as Outfit;
}

/** Take a piece off. Shirt and trousers cannot go: there is always something underneath. */
export function removePiece(o: Outfit, id: string, fallback: WardrobeState['owned']): Outfit {
  const p = PIECES[id];
  if (!p) return o;
  if (p.slot === 'extras') return { ...o, extras: o.extras.filter((x) => x !== id) };
  if (p.slot === 'top') return { ...o, top: fallback.includes('linen-shirt') ? 'linen-shirt' : o.top };
  if (p.slot === 'legs') return { ...o, legs: fallback.includes('sirwal') ? 'sirwal' : o.legs };
  return { ...o, [p.slot]: null } as Outfit;
}

export const soldIn = (p: Piece, at: string | null | undefined) => !!at && (p.where.length === 0 ? at !== 'road' : p.where.includes(at));

/** Old saves bought whole outfits; hand over the matching pieces. */
export const LEGACY_SETS: Record<string, Partial<Outfit>> = {
  galabiya: { top: 'galabiya-work', outer: null, head: 'taqiyah' },
  stambouli: { head: 'tarboosh', top: 'linen-shirt', outer: 'stambouli', legs: 'wool-trousers', feet: 'oxfords' },
  kaftan: { head: 'turban-silk', outer: 'kaftan', feet: 'markub-red' },
  frockcoat: { head: 'tarboosh', top: 'dress-shirt', outer: 'frock-coat', legs: 'morning-trousers', feet: 'oxfords' },
};
export function wardrobeFromLegacy(owned: string[], worn: string): WardrobeState {
  const have = new Set(START_OWNED);
  for (const id of owned) for (const v of Object.values(LEGACY_SETS[id] ?? {})) if (typeof v === 'string') have.add(v);
  const outfit: Outfit = worn === 'galabiya' ? { ...START_OUTFIT, extras: [] } : { ...START_OUTFIT, ...LEGACY_SETS[worn], extras: [] };
  return { owned: [...have], outfit };
}

// ---------- art paths and fitting ----------

export const baseSrc = (pose: Pose) => `art/hero/hero-base-${pose}.png`;
export const layerSrc = (pose: Pose, id: string) => `art/hero/${pose}/${id}.png`;

/** Nudges for layers that came back from the generator a little off. Filled in from the wardrobe's fit mode. */
export interface Fit { x: number; y: number; s: number }
export type FitTable = Record<string, Fit>; // key: `${pose}/${id}`
