// The clothes shops of Egypt, 1925. Each shop prints a catalogue of the ready outfits it stocks (see
// components/Wardrobe/Catalogue.tsx). Prices come from wardrobe.ts and are in piastres (100 to the pound).
//
//   Giza   Haj Mahmoud's: everyday dress, cheap and plain.
//   Cairo  Maison Lazarus, Opera Square: tailored wool, linen and court dress.
//   Cairo  Abu Ali, hatter and haberdasher, Khan el-Khalili: tarbooshes, felt caps and the small things.
//
// A catalogue in one town also lists what the other town's shops sell, locked, so the player knows
// what to save for and where to find it. Whether an outfit can actually be bought where the player
// stands is still decided by the outfit's own `where` list.

export interface ClothingShop {
  id: string;
  name: string;
  /** settlement id */
  town: string;
  address: string;
  est: number;
  tagline: string;
  blurb: string;
  /** outfit ids in the order they print */
  stock: string[];
}

export const CLOTHING_SHOPS: ClothingShop[] = [
  {
    id: 'haj-mahmoud',
    name: 'Haj Mahmoud & Sons',
    town: 'giza',
    address: 'The cloth lane, below the Pyramids Road',
    est: 1887,
    tagline: 'Cloth and Ready-Made Dress for the Working Man',
    blurb: 'Honest cotton by the cubit and ready-made galabiyas on the rail. Nothing here will impress a pasha, and nothing here will cost you a week.',
    stock: ['market-work', 'friday-white', 'classic-stall', 'coffee-house'],
  },
  {
    id: 'lazarus',
    name: 'Maison Lazarus',
    town: 'cairo',
    address: 'Opera Square, Ezbekiya',
    est: 1902,
    tagline: 'Tailors and Outfitters to the Effendi Class',
    blurb: 'English wool, Alexandrian linen and a cutter from Vienna. Suits are fitted on the premises, and a coat for court is ready in a fortnight.',
    stock: ['evening-merchant', 'wool-dignitary', 'cairo-effendi', 'contract-visit', 'auction-house', 'court-formal'],
  },
  {
    id: 'khan-hatter',
    name: 'Abu Ali, Hatter and Haberdasher',
    town: 'cairo',
    address: 'Khan el-Khalili, by the goldsmiths',
    est: 1861,
    tagline: 'Tarbooshes Blocked While You Wait',
    blurb: 'Felt for the head, and the dress that goes with it: a gentleman starts at the hat and works down.',
    stock: ['tarboosh-stall', 'albanian-merchant'],
  },
];

export const shopsIn = (town: string | null | undefined) => CLOTHING_SHOPS.filter((s) => s.town === town);
export const shopById = (id: string) => CLOTHING_SHOPS.find((s) => s.id === id);

/** Where else in Egypt an outfit can be bought, for the "find it in Cairo" note on a locked card. */
export const otherShopsFor = (outfitId: string, notTown: string) => CLOTHING_SHOPS.filter((s) => s.town !== notTown && s.stock.includes(outfitId));
