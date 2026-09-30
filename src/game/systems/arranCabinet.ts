// Arran's cabinet: things a chemist in 1925 could sell or arrange for a caravan merchant. Remedies he
// makes up himself; a poison sold for what it was really used for (keeping moth out of wool); and
// powder goods he will only arrange through licensed men, with the permit in the price.
// Everything here is a name, a price, a permission and a game effect. Nothing says how any of it is
// made, mixed, measured or used beyond "carry it" and "hand it to the licensed man".

export type CabinetId = 'restorative' | 'khamsin' | 'moth' | 'rockets' | 'cartridges' | 'revolver' | 'charge';
export type CabinetKind = 'remedy' | 'poison' | 'powder';
export interface CabinetItem {
  id: CabinetId; kind: CabinetKind; name: string; price: number;
  blurb: string; effect: string; law: string;
  /** stackable goods are counted; the rest are one-offs */
  stack: boolean;
  /** what must be true before he will sell it */
  needs?: 'guards' | 'folio';
}

export const CABINET: CabinetItem[] = [
  { id: 'restorative', kind: 'remedy', name: 'Iron and quinine tonic', price: 100, stack: true,
    blurb: 'A bitter tonic wine of the kind every chemist in Cairo sold. Arran makes up his own and labels it plainly.',
    effect: 'Takes some of the tiredness off (fatigue −15). No lift, no crash, no habit. Slower than the Muski chemist\'s coca wine, and honest about it.',
    law: 'An ordinary chemist\'s tonic. No paper needed.' },
  { id: 'khamsin', kind: 'remedy', name: 'Khamsin kit: eye lotion and gauze veils', price: 150, stack: false,
    blurb: 'Boracic eye lotion in a blue bottle, gauze veils for the men and the camels\' eyes, and a tin of grease for cracked lips.',
    effect: 'For 30 days the season adds nothing to the risk of the Sinai passes: the sandstorms still come, but they cost you less.',
    law: 'Ordinary goods.' },
  { id: 'moth', kind: 'poison', name: 'Moth preservative for wool (a poison)', price: 200, stack: false,
    blurb: 'A labelled arsenical preservative of the kind wool warehouses used against moth. Arran treats your rugs himself, in the yard, and keeps the tin locked.',
    effect: 'Every rug you hold now is moth-proofed. Buyers who care about wear give your durability argument more weight for those rugs.',
    law: 'A poison: sold only by a registered dealer, signed for in his poisons book, kept locked and labelled. Never near food or water.' },
  { id: 'rockets', kind: 'powder', name: 'Signal rockets, from a licensed fireworks maker', price: 175, stack: true,
    blurb: 'Three paper-wrapped signal rockets in a sealed tin, bought on Arran\'s account from a licensed maker near the Citadel.',
    effect: 'Used once in the Sinai passes: fired at the first sight of riders, they tell raiders you are watching and armed (risk −8).',
    law: 'Fireworks need a licensed maker. Carried sealed, apart from lamp oil and fire.' },
  { id: 'cartridges', kind: 'powder', name: 'Cartridges for your guards, through a licensed gunsmith', price: 300, stack: true, needs: 'guards',
    blurb: 'A sealed case of rifle cartridges from a gunsmith in the Muski who holds a licence. Arran vouches for you; the gunsmith writes your name in his book.',
    effect: 'Used once in the Sinai passes: your guards count for more if raiders come down (strength +4).',
    law: 'Sold only by a licensed gunsmith, to someone who employs armed guards. Your name goes in his book.' },
  { id: 'revolver', kind: 'powder', name: 'A Webley revolver, with a carry permit', price: 1250, stack: false,
    blurb: 'A second-hand service revolver in a leather holster. The permit, from the police in Giza, is in the price; Arran\'s letter got you the appointment.',
    effect: 'Yours for good: your caravan\'s strength counts 2 more against raiders, everywhere.',
    law: 'Needs a police permit in your name. Carry it, and the permit, together.' },
  { id: 'charge', kind: 'powder', name: 'A blasting charge for the old road, with a licensed shot-firer', price: 750, stack: true, needs: 'folio',
    blurb: 'The survey folio marks a rockfall that closed the short road over the pass in 1911. A licensed shot-firer from the Suez road works will clear it, with his own sealed charge, if you pay him and carry him.',
    effect: 'Adds a choice at the Sinai passes: clear the old short road (no delay, much lower risk). Used up in the crossing.',
    law: 'The charge belongs to the works and is handled only by the shot-firer, under the works permit. You never touch it.' },
];
export const cabinetItem = (id: CabinetId) => CABINET.find((c) => c.id === id)!;
export const KIND_WORD: Record<CabinetKind, string> = { remedy: 'Remedy', poison: 'Poison', powder: 'Powder, licensed' };
export const KHAMSIN_DAYS = 30;
export const REVOLVER_STRENGTH = 2;
export const CARTRIDGE_STRENGTH = 4;
export const ROCKET_RISK = 8;
export const RESTORATIVE_FATIGUE = 15;
