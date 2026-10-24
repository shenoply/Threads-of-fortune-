// Gramophone records: one for every finished piece of the game's music. Three come with the stall's
// old gramophone; the rest are found in the towns they belong to (a record seller in the souq), and
// now and then in a sealed bale from the customs sheds. Every record has its own label: a colour, a
// company and the script it is printed in. The companies and performers are made up.
export interface RecordDisc {
  id: string; title: string; performer: string; company: string;
  /** the label's paper colour and its ink */
  paper: string; ink: string;
  script: 'arabic' | 'turkish' | 'french' | 'greek' | 'albanian' | 'persian';
  /** the town whose record seller has it; 'stall' for the three that come with the gramophone */
  home: string;
  price: number;
}

// every record is pressed by the one Cairo company whose label they carry (art/records/label-<id>.webp)
const LABEL = 'Nile Lantern Record Co., Cairo';

export const RECORDS: RecordDisc[] = [
  { id: 'title-hijaz', title: 'Threads of Fortune (Theme)', performer: 'The Giza Takht', company: LABEL, paper: '#7a1e1e', ink: '#f2d58a', script: 'arabic', home: 'stall', price: 0 },
  { id: 'sahil-al-layl', title: 'Sahil al-Layl', performer: 'Sitt Wadida and her ensemble', company: LABEL, paper: '#1d3b5c', ink: '#f0e2b8', script: 'arabic', home: 'stall', price: 0 },
  { id: 'ya-layl-ya-ayn', title: 'Ya Layl Ya Ayn', performer: 'Sheikh Abdel-Sami al-Minyawi', company: LABEL, paper: '#2f4a2a', ink: '#efd9a0', script: 'arabic', home: 'stall', price: 0 },
  { id: 'a-mile-before-supper', title: 'A Mile Before Supper', performer: 'The Giza Takht', company: LABEL, paper: '#8a5a1c', ink: '#fff0c8', script: 'arabic', home: 'giza', price: 150 },
  { id: 'khan-bayati', title: 'Khan Bayati', performer: 'Ustaz Mursi and his oud', company: LABEL, paper: '#5a1f3a', ink: '#f2d58a', script: 'arabic', home: 'cairo', price: 180 },
  { id: 'khan-rast', title: 'Khan Rast', performer: 'Ustaz Mursi and his oud', company: LABEL, paper: '#3a2a5a', ink: '#f2d58a', script: 'arabic', home: 'cairo', price: 180 },
  { id: 'khan-kurd', title: 'Khan Kurd', performer: 'The Muski Takht', company: LABEL, paper: '#6a3a14', ink: '#fbe7b5', script: 'arabic', home: 'cairo', price: 180 },
  { id: 'qamar-after-midnight', title: 'Qamar After Midnight', performer: 'The Qamar Cabaret Orchestra', company: LABEL, paper: '#141414', ink: '#e8c46a', script: 'arabic', home: 'cairo', price: 220 },
  { id: 'the-gavel-rises', title: 'The Gavel Rises', performer: 'The Ezbekiya Salon Band', company: LABEL, paper: '#3d3d3d', ink: '#f0e2b8', script: 'french', home: 'cairo', price: 160 },
  { id: 'palace-rast', title: 'Palace Rast', performer: 'The Ras el-Tin Ensemble', company: LABEL, paper: '#0f3b3b', ink: '#f2d58a', script: 'arabic', home: 'alexandria', price: 240 },
  { id: 'palace-nahawand', title: 'Palace Nahawand', performer: 'The Ras el-Tin Ensemble', company: LABEL, paper: '#4a1010', ink: '#f2d58a', script: 'arabic', home: 'alexandria', price: 240 },
  { id: 'salon-waltz', title: 'Salon Waltz', performer: 'Orchestre Mazarita', company: LABEL, paper: '#d8c49a', ink: '#3a2410', script: 'french', home: 'alexandria', price: 200 },
  { id: 'auction', title: 'Auction', performer: 'Orchestre Mazarita', company: LABEL, paper: '#c9b27a', ink: '#2a1a0a', script: 'french', home: 'alexandria', price: 160 },
  { id: 'corniche-rebetiko', title: 'Corniche Rebetiko', performer: 'Kompania Anatolis', company: LABEL, paper: '#24456e', ink: '#f4f0e0', script: 'greek', home: 'alexandria', price: 200 },
  { id: 'deck-passage', title: 'Deck Passage', performer: 'The Canal Quartet', company: LABEL, paper: '#2b5d7a', ink: '#f6ecd0', script: 'french', home: 'portsaid', price: 180 },
  { id: 'road-bayati', title: 'Road Bayati', performer: 'Musallam the rababa player', company: LABEL, paper: '#7a5a2a', ink: '#fff0c8', script: 'arabic', home: 'suez', price: 150 },
  { id: 'road-hijaz', title: 'Road Hijaz', performer: 'Musallam the rababa player', company: LABEL, paper: '#9a6a2a', ink: '#2a1a0a', script: 'arabic', home: 'suez', price: 150 },
  { id: 'au-bout-du-chemin', title: 'Au Bout Du Chemin', performer: 'Mlle Rachel Toledano', company: LABEL, paper: '#5b2a4a', ink: '#f6e0c0', script: 'french', home: 'jaffa', price: 200 },
  { id: 'bells-of-the-old-city', title: 'Bells Of The Old City', performer: 'The Jaffa Gate Ensemble', company: LABEL, paper: '#d6c8a8', ink: '#3a2a18', script: 'arabic', home: 'jerusalem', price: 220 },
  { id: 'evening-bayati', title: 'Evening Bayati', performer: 'Najib Sawaya', company: LABEL, paper: '#1e3a2a', ink: '#efd9a0', script: 'arabic', home: 'beirut', price: 200 },
  { id: 'la-vie-du-levant', title: 'La Vie du Levant', performer: 'Mlle Odette Haddad', company: LABEL, paper: '#a8324a', ink: '#fff2d8', script: 'french', home: 'beirut', price: 240 },
  { id: 'evening-saba', title: 'Evening Saba', performer: 'Abu Fawzi al-Hamwi', company: LABEL, paper: '#2a2a4a', ink: '#f2d58a', script: 'arabic', home: 'damascus', price: 200 },
  { id: 'qamar-dimashq', title: 'Qamar Dimashq', performer: 'Sitt Fayza al-Halabiya', company: LABEL, paper: '#6a1a1a', ink: '#ffe6a8', script: 'arabic', home: 'damascus', price: 260 },
  { id: 'hijaz-kar-umayyad-gate', title: 'Hijaz Kar Umayyad Gate', performer: 'The Barada Takht', company: LABEL, paper: '#3a5a6a', ink: '#f6ecd0', script: 'arabic', home: 'damascus', price: 220 },
  { id: 'the-risky-pass', title: 'The Risky Pass', performer: 'Awad and the Salt Road Band', company: LABEL, paper: '#5a4a2a', ink: '#f6ecd0', script: 'arabic', home: 'amman', price: 180 },
  { id: 'ya-rakib-al-layl', title: 'Ya Rakib Al Layl', performer: 'Mulla Jasim al-Basri', company: LABEL, paper: '#1a3a4a', ink: '#f2d58a', script: 'arabic', home: 'baghdad', price: 260 },
  { id: 'istanbul-ussak', title: 'Istanbul Ussak', performer: 'Hafız Rıfat Bey', company: LABEL, paper: '#7a1a2a', ink: '#f6e0b0', script: 'turkish', home: 'istanbul', price: 260 },
  { id: 'nightingale-club', title: 'The Nightingale Club', performer: 'The Bülbül Orchestra', company: LABEL, paper: '#101828', ink: '#e8c46a', script: 'french', home: 'istanbul', price: 300 },
  { id: 'bu-geceyi-sev', title: 'Bu Geceyi Sev', performer: 'Saadet Hanım', company: LABEL, paper: '#4a1a4a', ink: '#f6d8a0', script: 'turkish', home: 'istanbul', price: 300 },
  { id: 'larg-nga-malet', title: 'Larg nga Malet', performer: 'Drita Kolonja', company: LABEL, paper: '#7a2a1a', ink: '#f6ecd0', script: 'albanian', home: 'istanbul', price: 280 },
  { id: 'selims-corner', title: 'Selims Corner', performer: 'The Galata Trio', company: LABEL, paper: '#2a4a3a', ink: '#f2d58a', script: 'turkish', home: 'istanbul', price: 200 },
  { id: 'solo-nay-flute', title: 'Solo Nay Flute', performer: 'Dede Ahmet of Konya', company: LABEL, paper: '#c8b890', ink: '#2a1a0a', script: 'turkish', home: 'konya', price: 220 },
  { id: 'yol-boyunca', title: 'Yol Boyunca', performer: 'Aşık Hasan of Kırşehir', company: LABEL, paper: '#5a3a1a', ink: '#f6ecd0', script: 'turkish', home: 'ankara', price: 220 },
];
export const RECORD_BY_ID: Record<string, RecordDisc> = Object.fromEntries(RECORDS.map((r) => [r.id, r]));
export const START_RECORDS = RECORDS.filter((r) => r.home === 'stall').map((r) => r.id);
export const recordsOwned = (s: { records?: string[] }) => s.records ?? START_RECORDS;
export const recordsIn = (town: string) => RECORDS.filter((r) => r.home === town);
