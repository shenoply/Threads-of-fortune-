// Malek's Arabic: a handful of Egyptian phrases he says to himself in the shop and drops into a
// haggle. The clips (public/audio/malek/ar-<clip>.mp3) are all Malek's own recordings (voice notes
// of 2 Oct 2026, cut and cleaned). The text on screen is the Arabic, a reading in Latin letters and
// what it means.
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
  { id: 'aah-wbaadein', ar: 'آه، وَبَعْدِين؟', latin: 'Aah, w-ba‘dein?', en: 'Ah… and then what?', clips: ['aah-wbaadein'], where: ['shop'] },
  { id: 'elli-khalaq', ar: 'الِّي خِلَق عَلَّق', latin: 'Elli khile’, ‘alla’.', en: 'He who made us will provide.', clips: ['elli-khalaq'], where: ['shop'] },
  { id: 'tamalli-maak', ar: 'تِمَلِّي مَعَاك', latin: 'Timalli ma‘ak.', en: 'Always with you.', clips: ['tamalli-maak'], where: ['shop'] },
  { id: 'ha', ar: 'هَا؟', latin: 'Ha?', en: 'Well?', clips: ['ha', 'ha-2'], where: ['shop', 'haggle'] },
  { id: 'ba', ar: 'بَا!', latin: 'Ba!', en: 'Bah!', clips: ['ba', 'ba-2'], where: ['shop', 'haggle'] },
  { id: 'meen-aal', ar: 'مِين قَال؟', latin: 'Meen ’aal?', en: 'Who said so?', clips: ['meen-aal', 'meen-aal-2'], where: ['shop', 'haggle'] },
  { id: 'taa', ar: 'طَعْ!', latin: 'Ta‘!', en: 'Pfft, no way!', clips: ['taa', 'taa-2'], where: ['shop', 'haggle'] },
  // his own longer sentences from the recording, said to himself in the shop
  { id: 'ana-malek', ar: 'أنا مالك، بيقولوا عليّا المعلّم. عندي محل مشويات صغير في الجيزة.', latin: 'Ana Malek, bi-y’ulu ‘alayya el-Mallem. ‘Andi mahall mashwiyyat sughayyar fil-Giza.', en: 'I am Malek, they call me Al-Mallem. I have a small grill shop in Giza.', clips: ['ana-malek'], where: ['shop'] },
  { id: 'baseha-badri', ar: 'بصحى بدري، أولّع الفحم، وأحط الفول على النار.', latin: 'Basha badri, awalla‘ el-fahm, w-ahutt el-ful ‘ala n-nar.', en: 'I get up early, light the charcoal and put the beans on the fire.', clips: ['baseha-badri'], where: ['shop'] },
  { id: 'el-dohr', ar: 'الضهر الناس كلها بتيجي مرة واحدة، ومحدش بيفكر فيّا.', latin: 'Ed-dohr en-nas kollaha bteegi marra wahda, w-mahaddish biyfakkar fiyya.', en: 'At noon everyone comes at once, and nobody thinks of me.', clips: ['el-dohr'], where: ['shop'] },
  { id: 'el-kofta', ar: 'الكفتة بإيدي، واللحمة حلوة، بس الكراسي وحشة شوية.', latin: 'El-kofta b-eedi, wel-lahma helwa, bass el-karasi wehsha shwayya.', en: 'The kofta is made by my own hands, the meat is good, but the chairs are a bit bad.', clips: ['el-kofta'], where: ['shop'] },
  { id: 'el-korsi', ar: 'لو الكرسي بيتهز، دي مش غلطتي.', latin: 'Law el-korsi biyithazz, di mish ghaltiti.', en: 'If the chair wobbles, that is not my fault.', clips: ['el-korsi'], where: ['shop'] },
  { id: 'ayez-takol', ar: 'ها؟ عايز تاكل؟', latin: 'Ha? ‘Ayez takol?', en: 'Well? Do you want to eat?', clips: ['ayez-takol'], where: ['shop'] },
  { id: 'tabaq-akbar', ar: 'تعالى، مش هديك خصم… هديك طبق أكبر.', latin: 'Ta‘ala, mish haddik khasm… haddik taba’ akbar.', en: 'Come on. I will not give you a discount… I will give you a bigger plate.', clips: ['tabaq-akbar'], where: ['shop'] },
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
