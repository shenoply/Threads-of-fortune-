// Character: how the bazaar sees you (manner), what you are good at (skills), and how you present yourself (attire).
// Skills rise by doing, as in Kingdom Come: Deliverance II. Every fifth level brings a perk.

export type SkillId = 'speech' | 'haggling' | 'appraisal' | 'craft' | 'riding' | 'survival' | 'scholarship' | 'catkeeping';

export interface SkillDef {
  id: SkillId;
  name: string;
  what: string;
  how: string;
  perks: { level: number; name: string; effect: string }[];
}

export const SKILLS: Record<SkillId, SkillDef> = {
  speech: {
    id: 'speech', name: 'Speech', what: 'Stories, arguments and the art of a good lie.',
    how: 'Rises when you argue for a rug, answer objections and choose your manner.',
    perks: [
      { level: 5, name: 'Silver Tongue', effect: 'Arguments land a little harder.' },
      { level: 10, name: 'Straight Face', effect: 'Buyers are less likely to catch an embellished story.' },
      { level: 15, name: 'Old Friend', effect: 'Every buyer starts with more trust.' },
      { level: 20, name: 'Master of the Majlis', effect: 'Kings and ministers listen longer.' },
    ],
  },
  haggling: {
    id: 'haggling', name: 'Haggling', what: 'Reading a buyer\'s limit and pushing it.',
    how: 'Rises with every round of bargaining and every sale.',
    perks: [
      { level: 5, name: 'Market Ear', effect: 'Buyers\' first offers are higher.' },
      { level: 10, name: 'Patient Hand', effect: 'Holding your price costs less patience.' },
      { level: 15, name: 'The Last Piastre', effect: 'Buyers will go a little higher at the end.' },
      { level: 20, name: 'Bazaar Legend', effect: 'Rashid gives you better prices when you ask.' },
    ],
  },
  appraisal: {
    id: 'appraisal', name: 'Appraisal', what: 'Knowing what a rug is and what it is worth.',
    how: 'Rises when you inspect rugs, buy stock and have pieces appraised.',
    perks: [
      { level: 5, name: 'Knot Counter', effect: 'Market estimates are tighter, even without a ledger book.' },
      { level: 10, name: 'Dealer\'s Eye', effect: 'You spot condition problems before you buy.' },
      { level: 15, name: 'Provenance Hunter', effect: 'City dealers show you one more piece.' },
      { level: 20, name: 'Connoisseur', effect: 'Collectors and courts pay more for your word.' },
    ],
  },
  craft: {
    id: 'craft', name: 'Craftsmanship', what: 'Washing, re-fringing and reweaving.',
    how: 'Rises every time you send a rug for restoration.',
    perks: [
      { level: 5, name: 'Good Soap', effect: 'Washing costs less.' },
      { level: 10, name: 'Invisible Mend', effect: 'Reweaves no longer show on the back.' },
      { level: 15, name: 'Quick Hands', effect: 'Restorations take a day less.' },
      { level: 20, name: 'Master Restorer', effect: 'Restored rugs keep their full collector value.' },
    ],
  },
  riding: {
    id: 'riding', name: 'Riding', what: 'Camels, horses and long days in the saddle.',
    how: 'Rises with every day you travel with animals.',
    perks: [
      { level: 5, name: 'Firm Seat', effect: 'The caravan moves a little faster.' },
      { level: 10, name: 'Camel Whisperer', effect: 'Animals carry more.' },
      { level: 15, name: 'Desert Pace', effect: 'Faster again on open ground.' },
    ],
  },
  survival: {
    id: 'survival', name: 'Survival', what: 'Wells, weather and knowing when to hide.',
    how: 'Rises with every day on the road and every encounter you survive.',
    perks: [
      { level: 5, name: 'Lean Rations', effect: 'The caravan eats less.' },
      { level: 10, name: 'Tracker', effect: 'You see raiders from further away.' },
      { level: 15, name: 'Desert Born', effect: 'Raiders ask for smaller tolls.' },
    ],
  },
  scholarship: {
    id: 'scholarship', name: 'Scholarship', what: 'Books, inscriptions and the history of weaving.',
    how: 'Rises when you read books bought in the cities and talk with experts.',
    perks: [
      { level: 5, name: 'Reader', effect: 'Books teach Appraisal as well as Scholarship.' },
      { level: 10, name: 'Historian', effect: 'Stories you tell about documented rugs land harder.' },
      { level: 15, name: 'Orientalist\'s Rival', effect: 'European buyers and consuls trust you.' },
    ],
  },
  catkeeping: {
    id: 'catkeeping', name: 'Cat-keeping', what: 'Saffron, and the understanding between you.',
    how: 'Rises whenever you pet Saffron or let her help with a sale.',
    perks: [
      { level: 5, name: 'Good Kitty', effect: 'Saffron sits on rugs less often when buyers visit.' },
      { level: 10, name: 'Shop Cat', effect: 'Buyers who like cats trust you more.' },
      { level: 15, name: 'Saffron\'s Choice', effect: 'Saffron sits on the rug the buyer will like best.' },
    ],
  },
};
export const SKILL_ORDER: SkillId[] = ['speech', 'haggling', 'appraisal', 'craft', 'riding', 'survival', 'scholarship', 'catkeeping'];

/** XP needed to reach a level: a gentle curve, then steeper. */
export const xpFor = (level: number) => Math.round(12 * Math.pow(level - 1, 1.6));
export const MAX_LEVEL = 20;
export function levelOf(xp: number) {
  let l = 1;
  while (l < MAX_LEVEL && xp >= xpFor(l + 1)) l++;
  return l;
}
export const hasPerk = (xp: number | undefined, skill: SkillId, level: number) => levelOf(xp ?? 0) >= level && SKILLS[skill].perks.some((p) => p.level === level);

// ---------- Manner: how the bazaar sees you ----------
export interface Manner { honesty: number; firmness: number; kindness: number; charm: number }
export const START_MANNER: Manner = { honesty: 0, firmness: 0, kindness: 0, charm: 0 };

export const MANNER_AXES: { id: keyof Manner; low: string; high: string; note: string }[] = [
  { id: 'honesty', low: 'Cunning', high: 'Honest', note: 'Honest merchants start with more trust. A cunning one tells better stories, and pays dearly when caught.' },
  { id: 'firmness', low: 'Yielding', high: 'Firm', note: 'Firm merchants get higher offers, but impatient buyers leave sooner.' },
  { id: 'kindness', low: 'Cold', high: 'Kind', note: 'Kindness buys patience, and buyers come back more often.' },
  { id: 'charm', low: 'Plain', high: 'Charming', note: 'Charm warms some buyers. Others find it too much.' },
];

/** What the bazaar calls you, from your strongest trait. */
export function mannerTitle(m: Manner): string {
  const entries: [string, number][] = [
    [m.honesty >= 0 ? 'the Honest' : 'the Fox', Math.abs(m.honesty)],
    [m.firmness >= 0 ? 'the Rock' : 'the Soft-hearted', Math.abs(m.firmness)],
    [m.kindness >= 0 ? 'the Generous' : 'the Cold', Math.abs(m.kindness)],
    [m.charm >= 0 ? 'the Charmer' : 'the Plain-spoken', Math.abs(m.charm)],
  ];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][1] < 12 ? 'a newcomer nobody has an opinion about yet' : entries[0][0];
}

// ---------- Attire and cleanliness (charisma) ----------
export interface AttireDef { id: string; name: string; cost: number; charisma: number; where: string[]; note: string }
export const ATTIRE: Record<string, AttireDef> = {
  galabiya: { id: 'galabiya', name: 'Work galabiya', cost: 0, charisma: 0, where: [], note: 'What you wear at the stall. Honest, and a little worn.' },
  stambouli: { id: 'stambouli', name: 'Stambouli suit and tarboosh', cost: 350, charisma: 8, where: ['cairo', 'alexandria', 'istanbul'], note: 'The effendi\'s dress. Hotel owners and officials take you seriously.' },
  kaftan: { id: 'kaftan', name: 'Silk kaftan and turban', cost: 600, charisma: 10, where: ['damascus', 'aleppo', 'baghdad'], note: 'A Damascene merchant\'s dress. Old families and sheikhs respect it.' },
  frockcoat: { id: 'frockcoat', name: 'Frock coat and fez', cost: 1500, charisma: 16, where: ['cairo', 'istanbul', 'alexandria'], note: 'Court dress. Chamberlains will not admit you to a palace without something like it.' },
};

/** Cities with a public bath where you can wash off the road. */
export const HAMMAMS: Record<string, { name: string; cost: number }> = {
  cairo: { name: 'Hammam al-Tambali', cost: 5 },
  alexandria: { name: 'The Greek baths on Rue Nabi Daniel', cost: 6 },
  damascus: { name: 'Hammam Nur al-Din', cost: 5 },
  aleppo: { name: 'Hammam Yalbougha', cost: 5 },
  istanbul: { name: 'Çemberlitaş Hamamı', cost: 8 },
  baghdad: { name: 'Hammam al-Pasha', cost: 5 },
  jerusalem: { name: 'Hammam al-Ayn', cost: 5 },
  beirut: { name: 'Hammam al-Nuzha', cost: 5 },
};

/** Charisma: attire, times how clean it is. 0 to about 20. */
export const charismaOf = (worn: string, clean: number) => Math.round((ATTIRE[worn]?.charisma ?? 0) * (0.4 + 0.6 * clean / 100) - (clean < 30 ? 4 : 0));

// ---------- Books (Scholarship) ----------
export interface BookDef { id: string; title: string; author: string; cost: number; where: string[]; skill: SkillId; xp: number; note: string }
export const BOOKS: Record<string, BookDef> = {
  bode: { id: 'bode', title: 'Vorderasiatische Knüpfteppiche', author: 'Wilhelm von Bode (Leipzig, 1901)', cost: 150, where: ['cairo', 'istanbul'], skill: 'appraisal', xp: 40, note: 'The Berlin museum director on the old carpets of the Near East. In German, with plates you can read without it.' },
  mumford: { id: 'mumford', title: 'Oriental Rugs', author: 'John Kimberly Mumford (New York, 1900)', cost: 120, where: ['alexandria', 'beirut'], skill: 'appraisal', xp: 35, note: 'An American\'s guide to weaves, knots and dyes, with a chapter on how dealers lie.' },
  hawley: { id: 'hawley', title: 'Oriental Rugs, Antique and Modern', author: 'Walter A. Hawley (New York, 1913)', cost: 140, where: ['cairo', 'jerusalem'], skill: 'scholarship', xp: 45, note: 'Maps of every weaving district from Anatolia to India.' },
  maqamat: { id: 'maqamat', title: 'The Maqamat of al-Hariri', author: 'al-Hariri of Basra (12th century)', cost: 60, where: ['damascus', 'baghdad', 'cairo'], skill: 'speech', xp: 40, note: 'The adventures of a silver-tongued rogue. Every merchant should know Abu Zayd\'s tricks.' },
  ibnkhaldun: { id: 'ibnkhaldun', title: 'The Muqaddimah', author: 'Ibn Khaldun (1377)', cost: 90, where: ['cairo', 'damascus', 'istanbul'], skill: 'scholarship', xp: 50, note: 'On cities, dynasties and why markets rise and fall.' },
  baedeker: { id: 'baedeker', title: 'Baedeker\'s Egypt and the Sûdân', author: 'Karl Baedeker (Leipzig, 1914)', cost: 80, where: ['alexandria', 'cairo', 'portsaid'], skill: 'survival', xp: 35, note: 'Every road, well and railway timetable, and which hotels to avoid.' },
};
