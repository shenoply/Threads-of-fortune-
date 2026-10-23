// The gunsmith in the Muski, Cairo, 1925: old Ali Hafez, armourer, and what he sells a merchant who
// travels. A man carries one thing at his side (a blade, a whip or a pistol) and one long arm; each adds
// to the caravan's strength on the road and widens the opening in a duel with a band's leader
// (systems/combat.ts duelWindow). Firearms are sold with the carry permit in the price. Buying another
// in the same place trades the old one in at half what it cost. Nothing here says how any of it works.
// Prices are in piastres (100 to the pound).

export type ArmSlot = 'side' | 'long';
export interface Arm {
  id: string;
  name: string;
  slot: ArmSlot;
  /** blade, whip, pistol, shotgun or rifle: for the words, and the order on the counter */
  kind: 'blade' | 'whip' | 'pistol' | 'shotgun' | 'rifle';
  price: number;
  /** what it adds to the caravan's strength */
  power: number;
  /** a line in Ali Hafez's words, or about the piece */
  line: string;
  /** the still of him holding it (art/arms/seller-<id>.webp); none yet, and the counter is shown */
  pic?: boolean;
}

export const ARMS: Arm[] = [
  { id: 'kurbash', name: 'A kurbash', slot: 'side', kind: 'whip', price: 120, power: 1, pic: true, line: 'Hippopotamus hide. The overseers carried them. It keeps a dog, or a thief, at the length of your arm.' },
  { id: 'khanjar', name: 'An Arab khanjar', slot: 'side', kind: 'blade', price: 300, power: 1, pic: true, line: 'A curved dagger from the Hejaz, silver on the sheath. Worn in front, where a man can see it.' },
  { id: 'saif', name: 'A Bedouin saif', slot: 'side', kind: 'blade', price: 350, power: 1, pic: true, line: 'A plain straight sword from the tribes. The leather is old; the steel is good.' },
  { id: 'kindjal', name: 'A Caucasian kindjal', slot: 'side', kind: 'blade', price: 400, power: 1, pic: true, line: 'A long straight dagger with a horn hilt. Circassians brought them south.' },
  { id: 'cane', name: 'A sword cane', slot: 'side', kind: 'blade', price: 500, power: 1, pic: true, line: 'A malacca stick with a silver head and a thin blade inside it. A gentleman\'s answer in a dark lane.' },
  { id: 'cavalry-sword', name: 'A British cavalry sword, 1908 pattern', slot: 'side', kind: 'blade', price: 600, power: 2, pic: true, line: 'A long straight blade and a steel bowl over the hand. Sold off by a regiment going home.' },
  { id: 'kilij', name: 'An Ottoman kilij', slot: 'side', kind: 'blade', price: 900, power: 2, pic: true, line: 'The broad curved tip cuts deep. Red velvet on the scabbard; it was a pasha\'s once, or so the seller said.' },
  { id: 'shamshir', name: 'A Persian shamshir', slot: 'side', kind: 'blade', price: 1200, power: 2, pic: true, line: 'Deeply curved, Isfahan steel. In Persia a merchant who carries one is taken seriously.' },
  { id: 'browning', name: 'A Browning pocket pistol, 1910', slot: 'side', kind: 'pistol', price: 800, power: 2, line: 'Small and flat, from the Belgian works. It sits in a coat pocket. The permit is in the price.' },
  { id: 'nagant', name: 'A Nagant revolver, 1895', slot: 'side', kind: 'pistol', price: 900, power: 2, pic: true, line: 'Russian, from the officers who came south after the war. Heavy, and it does not fail. Permit included.' },
  { id: 'webley', name: 'A Webley revolver, Mark VI', slot: 'side', kind: 'pistol', price: 1250, power: 2, line: 'The British officer\'s revolver, with a lanyard ring. Permit included.' },
  { id: 'mauser-c96', name: 'A Mauser C96 pistol', slot: 'side', kind: 'pistol', price: 1600, power: 3, pic: true, line: 'The broomhandle, with its wooden holster that fits on as a stock. It reaches further than any pistol. Permit included.' },
  { id: 'fowling-piece', name: 'A double fowling piece', slot: 'long', kind: 'shotgun', price: 900, power: 2, pic: true, line: 'Two barrels and an engraved lock, with a cartridge belt. For birds on the Nile; on the road, it makes men think.' },
  { id: 'martini', name: 'A Martini-Henry rifle', slot: 'long', kind: 'rifle', price: 700, power: 3, pic: true, line: 'Old, single shot, and still everywhere on the frontier. Cheap cartridges.' },
  { id: 'gras', name: 'A French Gras rifle', slot: 'long', kind: 'rifle', price: 800, power: 3, pic: true, line: 'Long, with its bayonet. The Ottomans bought them by the thousand.' },
  { id: 'mosin', name: 'A Mosin-Nagant rifle, 1891', slot: 'long', kind: 'rifle', price: 1000, power: 3, pic: true, line: 'Russian, five rounds, with a sling. Plenty came through Constantinople after the war.' },
  { id: 'lebel', name: 'A Lebel rifle, 1886', slot: 'long', kind: 'rifle', price: 1100, power: 3, line: 'French, with the long needle bayonet. Syria is full of them.' },
  { id: 'lee-enfield', name: 'A Lee-Enfield rifle, Mark III', slot: 'long', kind: 'rifle', price: 1400, power: 4, pic: true, line: 'The British service rifle: ten rounds and quick to work. The best thing on this wall.' },
  { id: 'mauser-98', name: 'A Mauser rifle, Gewehr 98', slot: 'long', kind: 'rifle', price: 1500, power: 4, pic: true, line: 'German, long and very accurate. A rifleman with one is worth two.' },
];
export const ARM_BY_ID: Record<string, Arm> = Object.fromEntries(ARMS.map((a) => [a.id, a]));
/** where the gunsmith keeps his shop */
export const GUNSMITH_TOWN = 'cairo';
export const armPic = (id: string | null, small = false) => `art/arms/seller-${id && ARM_BY_ID[id]?.pic ? id : 'neutral'}${small ? '-768' : ''}.webp`;
/** what the caravan's strength gets from what you carry */
export const armsPower = (carry: { side?: string; long?: string } | undefined) => (ARM_BY_ID[carry?.side ?? '']?.power ?? 0) + (ARM_BY_ID[carry?.long ?? '']?.power ?? 0);
