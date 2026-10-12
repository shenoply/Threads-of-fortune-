// Small helpers for putting names into the middle of a sentence: the right article, a capital kept
// where it belongs (Giza, Cairo, Bedouin, Arnaut, Egyptian...), and a plural that agrees with its count.
export { withArticle } from '../data/animals';

// first words that are names of places or peoples and keep their capital mid-sentence
const PROPER = new Set([
  'Giza', 'Cairo', 'Alexandria', 'Bedouin', 'Arnaut', 'Egyptian', 'Arabian', 'Cypriot', 'Syrian', 'Turkish', 'Persian',
  'Anatolian', 'Albanian', 'Sudanese', 'Barb', 'Falahi', 'Maghrabi', 'Bishari', 'Anafi', 'Hassawi', 'Baladi', 'Damascus',
  'Aleppo', 'Fayoum', 'Tanta', 'Konya', 'Smyrna', 'Kurdish', 'Caucasian', 'Mosul', 'Baghdad', 'Beirut', 'Jaffa', 'Sinai',
  'Nile', 'British', 'French', 'Greek', 'Armenian', 'Coptic', 'Ottoman', 'Lloyd\'s', 'Dr',
]);

/** "Caravan guard" -> "caravan guard", but "Giza watchman" and "Bedouin rider" keep their capitals */
export function midName(name: string): string {
  const first = name.split(/[\s,]/)[0];
  if (PROPER.has(first) || /^[A-Z]{2,}/.test(first)) return name;
  return name.charAt(0).toLowerCase() + name.slice(1);
}

/** "1 ration", "2 rations"; pass the plural when it is not just an added s */
export const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
