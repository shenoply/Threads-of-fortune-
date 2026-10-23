// Casting notes for recording. Used by tools/export-voice-script.ts.
import { NPCS } from './world';

export const VOICE_BRIEFS: Record<string, string> = {
  narrator: 'Documentary narrator. Male, 55-65, deep and calm, warm British-documentary delivery, unhurried, never theatrical.',
  seller: 'The merchant. Egyptian man, early 40s, deep warm baritone, charming and unhurried, light Cairene accent in English. Smiles through his lines.',
  samira: 'Samira. Egyptian woman, early 30s, refined upper-class Cairo accent, calm and precise, dry wit, never raises her voice.',
  yusuf: 'Yusuf. Egyptian hotel owner, late 40s, brisk and practical, working-class Cairo accent, a little impatient, not unfriendly.',
  mariam: 'Mariam. Young Egyptian woman, about 22, soft and warm, shy, hesitant pauses, gentle Shubra accent.',
  fuad: 'Samir al-Masri, carpet buyer to the household at Abdeen Palace. Egyptian man, late 50s. Formal, precise and reserved; a faint Italian colouring to his English. Never hurried.',
  nazli: 'Laila Haddad, purchasing agent to the household at Ras el-Tin. Egyptian woman, early 30s. Warm, elegant and a little amused; Alexandrian French in her vowels.',
  abdullah: 'Nadir al-Khatib, carpet buyer to the diwan at Raghadan, Amman. Arab man, early 40s. Hospitable, humorous and poetic; speaks English slowly and with pleasure.',
  faisal: 'Karim al-Rashid, carpet buyer to the court household in Baghdad. Iraqi man, early 40s. Soft-spoken, courteous and careful; weighs each word.',
  ataturk: 'Meryem Arslan, procurement secretary to the household at Çankaya. Turkish woman, about 40. Brisk, direct and decisive; short sentences, a Turkish accent, no small talk.',
  shivakiar: 'Nadia Selim, purchasing representative and reception hostess at Abdeen Palace. Egyptian woman, about 50. Grand, amused and very sure of herself; upper-class Cairo English with French phrases.',
  ...Object.fromEntries(Object.values(NPCS).map((n) => [n.id, `${n.name}. ${n.voice}.`])),
  kassab: 'Smooth Cairene dealer, late thirties, oily charm, a little mocking, quick',
  hassan: 'Egyptian coffee-house owner, mid fifties, warm, jolly, loud laugh, talks with his hands',
  whitcombe: 'English governess, mid thirties, Surrey accent, precise, polite, dry humour',
  kasparian: 'Armenian physician, fifties, soft-spoken, exact, a little weary',
  benakis: 'Greek cotton broker from Alexandria, forties, charming, expansive, vain',
  ammar: "Ammar. Egyptian man, mid-to-late 30s, a childhood friend back from years in Rome — confident, fast-talking, warm on the surface, a gold tooth you can practically hear. Italian polish over a Cairene base; charming even when he's lying, never raises his voice to make a point.",
};
