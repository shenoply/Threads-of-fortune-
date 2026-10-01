// Malek's Arabic: a handful of Egyptian phrases he says to himself in the shop and drops into a
// haggle. The clips (public/audio/malek/ar-<clip>.mp3) are a stock offline voice reading
// hand-written Egyptian phonemes (tools/generate-malek-arabic.py), not a clone of anyone. The text
// on screen is the Arabic, a reading in Latin letters and what it means.
export type ArabicWhere = 'shop' | 'haggle';
export interface ArabicPhrase {
  id: string;
  ar: string;
  latin: string;
  en: string;
  /** clip ids; one is picked each time */
  clips: string[];
  where: ArabicWhere[];
}
export const MALEK_ARABIC: ArabicPhrase[] = [
  { id: 'aah-wbaadein', ar: 'آه، وبعدين؟', latin: 'Aah, w-ba‘dein?', en: 'Ah… and then what?', clips: ['aah-wbaadein'], where: ['shop'] },
  { id: 'elli-khalaq', ar: 'اللي خلق علّق', latin: 'Elli khalaq, ‘allaq.', en: 'He who made us will provide.', clips: ['elli-khalaq'], where: ['shop'] },
  { id: 'tamalli-maak', ar: 'تملّي معاك', latin: 'Tamalli ma‘ak.', en: 'Always with you.', clips: ['tamalli-maak'], where: ['shop'] },
  { id: 'ha', ar: 'ها؟', latin: 'Ha?', en: 'Well?', clips: ['ha', 'ha-2'], where: ['shop', 'haggle'] },
  { id: 'ba', ar: 'با!', latin: 'Ba!', en: 'Bah!', clips: ['ba', 'ba-2'], where: ['shop', 'haggle'] },
  { id: 'meen-aal', ar: 'مين قال؟', latin: 'Meen ’aal?', en: 'Who said so?', clips: ['meen-aal', 'meen-aal-2'], where: ['shop', 'haggle'] },
  { id: 'tozz', ar: 'طظ!', latin: 'Tozz!', en: 'Pfft, so what!', clips: ['tozz', 'tozz-2'], where: ['shop', 'haggle'] },
  { id: 'how', ar: 'How?', latin: 'How?', en: 'How much? How so?', clips: ['how', 'how-2'], where: ['haggle'] },
];
export const ARABIC_BY_ID: Record<string, ArabicPhrase> = Object.fromEntries(MALEK_ARABIC.map((p) => [p.id, p]));
/** the English words of a line that opens with one of his Arabic phrases (for the English recording) */
/** how a phrase opens a line on screen: the Arabic and its reading (an English word just once) */
export const arabicLead = (p: ArabicPhrase) => (p.ar === p.latin ? p.latin : `${p.ar} ${p.latin}`);
export function withoutArabic(text: string, phraseId: string): string {
  const p = ARABIC_BY_ID[phraseId];
  const lead = p ? `${arabicLead(p)} ` : '';
  return lead && text.startsWith(lead) ? text.slice(lead.length) : text;
}
/** a phrase for this place, not the one he just said */
export function pickArabic(where: ArabicWhere, last: string | null, rnd = Math.random): ArabicPhrase {
  const pool = MALEK_ARABIC.filter((p) => p.where.includes(where) && p.id !== last);
  return pool[Math.floor(rnd() * pool.length)] ?? MALEK_ARABIC[0];
}
