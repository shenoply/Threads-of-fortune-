// What the food souk sells in each town, 1925. Everything ends up as party.food rations
// (one ration = a day's food for one person; FOOD_PER_LOAD rations fill a load), so weight
// and the save format are unchanged. Comforts (tea, coffee) give no rations, only a small lift
// to the men's spirits, at most once a day and never above COMFORT_CAP.
import { SETTLEMENTS } from './world';

export interface Provision {
  id: string;
  name: string;
  /** one plain sentence */
  line: string;
  /** settlement ids or region names (Egypt, Sinai, Palestine, Lebanon, Syria, Transjordan, Anatolia, Iraq, Persia) */
  where: string[];
  /** rations per unit bought; 0 for a comfort that feeds nobody */
  rations: number;
  /** price per unit = rations (or 1 for a comfort) x MARKETS[sid].food x mult */
  mult: number;
  /** morale lift for the day, 1-2 */
  morale?: number;
}

export const COMFORT_CAP = 85;

export const PROVISIONS: Provision[] = [
  // Egypt
  { id: 'aish', name: 'Aish baladi and onions', line: 'Coarse wheat flatbread, dried hard for the road, with a string of onions.', where: ['Egypt'], rations: 1, mult: 1 },
  { id: 'ful', name: 'Dried ful beans', line: 'Broad beans, soaked and stewed overnight into ful medames.', where: ['Egypt'], rations: 1, mult: 1.1 },
  { id: 'adas', name: 'Red lentils', line: 'Split lentils for soup; they cook quickly on a small fire.', where: ['cairo', 'giza', 'tanta', 'fayoum', 'jaffa', 'jerusalem', 'amman'], rations: 1, mult: 1.1 },
  { id: 'dates-eg', name: 'Upper Egypt dates', line: 'Dried dates pressed into palm baskets; they do not spoil.', where: ['Egypt'], rations: 1, mult: 1.3 },
  { id: 'gibna', name: 'Gibna domiati', line: 'Salted white cheese from Damietta, kept in brine.', where: ['cairo', 'tanta', 'alexandria', 'portsaid'], rations: 1, mult: 1.7 },
  { id: 'fesikh', name: 'Fesikh', line: 'Salted grey mullet from the Delta lakes; strong, and it keeps.', where: ['tanta', 'alexandria', 'portsaid', 'suez'], rations: 1, mult: 1.4 },
  // Sinai
  { id: 'rusks', name: 'Monastery rusks', line: 'Twice-baked bread from the monks\' bakery, the same they give the Jabaliya.', where: ['sinai'], rations: 1, mult: 1 },
  { id: 'olives', name: 'Olives', line: 'Cured black or green olives, sold by the scoop.', where: ['sinai', 'jaffa', 'jerusalem', 'beirut', 'damascus', 'aleppo'], rations: 1, mult: 1.5 },
  { id: 'dates-sinai', name: 'Feiran dates', line: 'Small dry dates from the palms of Wadi Feiran.', where: ['sinai', 'bedouin'], rations: 1, mult: 1.2 },
  { id: 'shrak', name: 'Shrak bread', line: 'Thin Bedouin bread baked on an iron saj over the fire.', where: ['bedouin', 'amman'], rations: 1, mult: 1 },
  { id: 'jameed', name: 'Jameed', line: 'Balls of salted, sun-dried goat yoghurt; light, and they last for months.', where: ['bedouin', 'amman'], rations: 1, mult: 1.4 },
  // Palestine, Lebanon, Syria
  { id: 'khubz', name: 'Khubz', line: 'Round wheat loaves from the town oven.', where: ['jaffa', 'beirut', 'damascus', 'aleppo'], rations: 1, mult: 1 },
  { id: 'kaak', name: 'Ka\'ak al-Quds', line: 'Long sesame bread rings, sold with a twist of za\'atar.', where: ['jerusalem'], rations: 1, mult: 1 },
  { id: 'oranges', name: 'Jaffa oranges', line: 'Thick-skinned Shamouti oranges from the groves outside the town.', where: ['jaffa'], rations: 1, mult: 1.6, morale: 1 },
  { id: 'burghul', name: 'Burghul', line: 'Cracked boiled wheat, dried in the sun; it swells well in the pot.', where: ['beirut', 'damascus', 'aleppo', 'amman'], rations: 1, mult: 1.1 },
  { id: 'labneh', name: 'Labneh in oil', line: 'Strained yoghurt rolled into balls and kept under olive oil.', where: ['beirut'], rations: 1, mult: 1.8 },
  { id: 'jibneh', name: 'White jibneh', line: 'Salted white cheese from the villages around the city.', where: ['damascus', 'jerusalem'], rations: 1, mult: 1.7 },
  { id: 'qamaraldin', name: 'Qamar al-din', line: 'Sheets of dried apricot paste from the Ghouta orchards.', where: ['damascus', 'beirut'], rations: 1, mult: 1.8, morale: 1 },
  { id: 'pistachio-aleppo', name: 'Aleppo pistachios', line: 'Small green pistachios from the orchards round Aleppo.', where: ['aleppo'], rations: 1, mult: 2.2, morale: 1 },
  // Anatolia
  { id: 'peksimet', name: 'Peksimet', line: 'Hard-baked army biscuit that keeps for weeks.', where: ['Anatolia'], rations: 1, mult: 1 },
  { id: 'simit', name: 'Simit', line: 'Sesame bread rings from the street sellers.', where: ['istanbul'], rations: 1, mult: 1.2 },
  { id: 'bulgur', name: 'Bulgur', line: 'Cracked wheat for pilaf, the plain food of the Anatolian villages.', where: ['konya', 'ankara'], rations: 1, mult: 1.1 },
  { id: 'tarhana', name: 'Tarhana', line: 'Dried crumbs of yoghurt and flour that make a soup in minutes.', where: ['konya', 'ankara'], rations: 1, mult: 1.2 },
  { id: 'pastirma', name: 'Pastırma', line: 'Dried beef cured in a paste of fenugreek and red pepper.', where: ['Anatolia'], rations: 1, mult: 2.4 },
  { id: 'figs', name: 'Dried figs', line: 'Figs from the Aydin valley, threaded on strings.', where: ['istanbul', 'konya'], rations: 1, mult: 1.6, morale: 1 },
  { id: 'pekmez', name: 'Pekmez', line: 'Thick grape molasses, eaten with bread on cold mornings.', where: ['konya', 'ankara'], rations: 1, mult: 1.5, morale: 1 },
  // Iraq
  { id: 'khubz-iraq', name: 'Tannour bread', line: 'Flat bread slapped on the inside of a clay oven.', where: ['Iraq'], rations: 1, mult: 1 },
  { id: 'dates-iraq', name: 'Zahdi dates', line: 'The common dried date of the Basra and Baghdad groves.', where: ['Iraq'], rations: 1, mult: 1 },
  { id: 'rice-iraq', name: 'Anbar rice', line: 'Scented rice from the Euphrates paddies near Najaf.', where: ['Iraq'], rations: 1, mult: 1.4 },
  { id: 'kleicha', name: 'Kleicha', line: 'Small baked cakes filled with dates and cardamom.', where: ['baghdad'], rations: 1, mult: 1.8, morale: 1 },
  // Persia
  { id: 'sangak', name: 'Nan-e sangak', line: 'Long wholemeal bread baked on a bed of hot pebbles.', where: ['tehran', 'kashan', 'isfahan', 'kerman'], rations: 1, mult: 1 },
  { id: 'lavash', name: 'Lavash', line: 'Thin dry flatbread that keeps for weeks when stacked.', where: ['tabriz', 'kermanshah', 'hamadan'], rations: 1, mult: 1 },
  { id: 'kashk', name: 'Kashk', line: 'Dried whey, rubbed into hot water for soup.', where: ['Persia'], rations: 1, mult: 1.2 },
  { id: 'rice-persia', name: 'Rice', line: 'Long-grain rice brought down from Gilan.', where: ['tehran', 'tabriz', 'isfahan', 'kermanshah'], rations: 1, mult: 1.5 },
  { id: 'lighvan', name: 'Lighvan cheese', line: 'Sheep\'s cheese from the village of Lighvan, kept in brine.', where: ['tabriz'], rations: 1, mult: 1.8 },
  { id: 'raisins', name: 'Raisins', line: 'Sun-dried raisins from the vineyards of Malayer.', where: ['hamadan', 'tabriz'], rations: 1, mult: 1.6, morale: 1 },
  { id: 'mulberries', name: 'Dried mulberries', line: 'White mulberries dried on the roofs, sweet as sugar.', where: ['isfahan', 'kashan', 'tehran'], rations: 1, mult: 1.7, morale: 1 },
  { id: 'pistachio-kerman', name: 'Kerman pistachios', line: 'Pistachios from the Rafsanjan orchards.', where: ['kerman'], rations: 1, mult: 2.2, morale: 1 },
  { id: 'dates-bam', name: 'Bam dates', line: 'Soft dates from the palm groves of Bam.', where: ['kerman'], rations: 1, mult: 1.3 },
  // Comforts: no rations, a small lift for the men
  { id: 'tea', name: 'Tea and loaf sugar', line: 'Black tea and a cone of sugar for the evening fire.', where: ['Egypt', 'Iraq', 'Persia'], rations: 0, mult: 4, morale: 2 },
  { id: 'coffee', name: 'Coffee and cardamom', line: 'Roasted beans and cardamom for bitter coffee, as the Bedouin take it.', where: ['Sinai', 'Palestine', 'Lebanon', 'Syria', 'Transjordan', 'cairo', 'alexandria'], rations: 0, mult: 5, morale: 2 },
  { id: 'kahve', name: 'Turkish coffee and sugar', line: 'Finely ground coffee and lump sugar for the copper pot.', where: ['Anatolia'], rations: 0, mult: 5, morale: 2 },
];

const regionOf = (sid: string) => SETTLEMENTS.find((s) => s.id === sid)?.region;

/** What the souk in `sid` sells: food cheapest first, comforts last. */
export function provisionsAt(sid: string): Provision[] {
  const reg = regionOf(sid);
  const here = PROVISIONS.filter((p) => p.where.includes(sid) || (!!reg && p.where.includes(reg)));
  return [...here.filter((p) => p.rations > 0).sort((a, b) => a.mult - b.mult), ...here.filter((p) => p.rations === 0)];
}

/** The cheapest food per ration here: the row that keeps the old buy-food testids. */
export function stapleAt(sid: string): Provision | undefined {
  return provisionsAt(sid).find((p) => p.rations > 0);
}

export const provisionById = (id: string) => PROVISIONS.find((p) => p.id === id);

/** Price of n units at a town whose ration costs `food` pt. Staples at mult 1 cost what the old ration did. */
export const provisionPrice = (p: Provision, n: number, food: number) => Math.ceil(n * Math.max(1, p.rations) * food * p.mult);
