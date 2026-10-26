// The rug trade's other houses, city by city: the named dealers who keep the season's tables
// (systems/ranks.ts), and the smaller shops that fill out each table under them.
// Portraits will be art/portraits/<id>.jpg; until one is drawn the table shows an initial.

export type Temper = 'aggressive' | 'steady' | 'cunning' | 'old';

export interface Rival {
  id: string;
  name: string;
  /** one plain line under the name */
  role: string;
  /** the tables this house is counted in (its home city first) */
  cities: string[];
  temper: Temper;
  /** what the house sells in a season, in piastres, before the day's luck */
  season: number;
  she?: boolean;
}

export const RIVALS: Rival[] = [
  { id: 'rival-boghos', name: 'Boghos Tavitian', role: 'Armenian dealer in the Khan', cities: ['cairo'], temper: 'old', season: 220000 },
  { id: 'rival-selim', name: 'Selim Haddad', role: 'Dealer in Cairo', cities: ['cairo'], temper: 'aggressive', season: 150000 },
  { id: 'rival-yanni', name: 'Yanni Stavrou', role: 'Greek importer in Cairo', cities: ['cairo'], temper: 'cunning', season: 180000 },
  { id: 'rival-costa', name: 'Costa Lambrakis', role: 'Dealer in Alexandria', cities: ['alexandria'], temper: 'aggressive', season: 160000 },
  { id: 'rival-lucia', name: 'Signora Lucia Valenti', role: 'Runs her late husband\'s firm in Alexandria', cities: ['alexandria'], temper: 'steady', season: 200000, she: true },
  { id: 'rival-fikry', name: 'Ahmed Fikry', role: 'Dealer in Alexandria', cities: ['alexandria'], temper: 'cunning', season: 120000 },
  { id: 'rival-shalaby', name: 'Abdel-Rahim Shalaby', role: 'Dealer in Port Said', cities: ['portsaid'], temper: 'aggressive', season: 90000 },
  { id: 'rival-sahyoun', name: 'Hajj Ahmad Rizk', role: 'Dealer in Jaffa and Jerusalem, and an orange grower', cities: ['jerusalem', 'jaffa'], temper: 'steady', season: 70000 },
  { id: 'rival-tabet', name: 'Fuad Tabet', role: 'Dealer in Beirut', cities: ['beirut'], temper: 'cunning', season: 110000 },
  { id: 'rival-shami', name: 'Abu Nadim al-Shami', role: 'Dealer in Damascus', cities: ['damascus'], temper: 'old', season: 140000 },
  { id: 'rival-kouyoumdjian', name: 'Garabed Kouyoumdjian', role: 'Dealer in Aleppo', cities: ['aleppo'], temper: 'steady', season: 150000 },
  { id: 'rival-kassab', name: 'Haj Omar Kassab', role: 'Dealer in Aleppo', cities: ['aleppo'], temper: 'old', season: 120000 },
  { id: 'rival-najjar', name: 'Haj Jawad al-Najjar', role: 'Dealer in Baghdad', cities: ['baghdad'], temper: 'old', season: 130000 },
  { id: 'rival-arslanian', name: 'Mihran Arslanian', role: 'Dealer in Constantinople', cities: ['istanbul'], temper: 'cunning', season: 250000 },
  { id: 'rival-tezcan', name: 'Hüsnü Bey Tezcan', role: 'Dealer in Constantinople', cities: ['istanbul'], temper: 'aggressive', season: 200000 },
  { id: 'rival-haddadin', name: 'Mansour Haddadin', role: 'Dealer in Amman', cities: ['amman'], temper: 'steady', season: 50000 },
];
export const RIVAL: Record<string, Rival> = Object.fromEntries(RIVALS.map((r) => [r.id, r]));

/** The cities that keep a season's table, with the quarters their smaller shops stand in. */
export const RANK_CITIES: { id: string; name: string; quarters: string[]; lesser: number }[] = [
  { id: 'cairo', name: 'Cairo', lesser: 9, quarters: ['the Muski', 'the Khan el-Khalili', 'the Ghuriya', 'Bab Zuweila', 'the Hamzawi', 'Opera Square', 'the Azbakiya', 'Bulaq', 'Sharia Abdin'] },
  { id: 'alexandria', name: 'Alexandria', lesser: 8, quarters: ['the Souq el-Attarin', 'Ramleh', 'the Manshiya', 'Sharia Sherif Pasha', 'Anfushi', 'Moharrem Bey', 'the Rue Fuad', 'the Turkish town'] },
  { id: 'portsaid', name: 'Port Said', lesser: 9, quarters: ['the Arab town', 'the quay', 'the Rue du Commerce', 'the European town', 'the coaling basin'] },
  { id: 'jaffa', name: 'Jaffa', lesser: 9, quarters: ['the old town', 'the harbour', 'Ajami', 'the clock tower square', 'the Jerusalem road'] },
  { id: 'jerusalem', name: 'Jerusalem', lesser: 10, quarters: ['the Old City', 'Jaffa Gate', 'the Christian Quarter', 'David Street', 'the Jaffa Road'] },
  { id: 'beirut', name: 'Beirut', lesser: 10, quarters: ['the Souq Tawileh', 'the port', 'the Bourj', 'Bab Idriss', 'the Souq Sursock'] },
  { id: 'damascus', name: 'Damascus', lesser: 10, quarters: ['the Souq al-Hamidiyya', 'Straight Street', 'the Souq Midhat Pasha', 'Bab Touma', 'the Buzuriyya'] },
  { id: 'aleppo', name: 'Aleppo', lesser: 9, quarters: ['the covered souq', 'Bab Antakya', 'the Khan al-Gumruk', 'Jdeideh', 'the Souq al-Attarin'] },
  { id: 'baghdad', name: 'Baghdad', lesser: 10, quarters: ['the Souq al-Saray', 'Rashid Street', 'the Shorja', 'Kadhimiya', 'the river bank'] },
  { id: 'istanbul', name: 'Constantinople', lesser: 9, quarters: ['the Grand Bazaar', 'the Arasta', 'Pera', 'Galata', 'Sultanahmet', 'the Egyptian Bazaar'] },
  { id: 'amman', name: 'Amman', lesser: 10, quarters: ['the souq', 'the station road', 'Jebel Amman', 'the Roman theatre'] },
];
export const RANK_CITY: Record<string, (typeof RANK_CITIES)[number]> = Object.fromEntries(RANK_CITIES.map((c) => [c.id, c]));

/** Sales made in a town without a table of its own count in the nearest one that has. */
export const RANK_TABLE_OF: Record<string, string> = { giza: 'cairo', saqqara: 'cairo', fayoum: 'cairo', tanta: 'cairo', suez: 'portsaid' };

const SHOPS = ['A dealer', 'A broker', 'Two brothers', 'A family firm', 'A Persian importer', 'An old dealer', 'A tourist shop', 'A mender who also sells', 'A pedlar', 'A small importer'];

/** The smaller shops of a city's table: a few words each, never a name. */
export function lesserShops(city: string): { id: string; label: string; season: number }[] {
  const c = RANK_CITY[city];
  if (!c) return [];
  const top = Math.max(...RIVALS.filter((r) => r.cities.includes(city)).map((r) => r.season), 40000);
  const out: { id: string; label: string; season: number }[] = [];
  const seed = city.length * 7 + city.charCodeAt(0);
  for (let i = 0; out.length < c.lesser && i < 60; i++) {
    const label = `${SHOPS[(seed + i * 3) % SHOPS.length]} in ${c.quarters[(seed + i) % c.quarters.length]}`;
    if (out.some((o) => o.label === label)) continue;
    const n = out.length;
    out.push({ id: `${city}-shop${n}`, label, season: Math.round(top * 0.55 * Math.pow(0.7, n)) });
  }
  return out;
}
