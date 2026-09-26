// Casting notes for recording. Used by tools/export-voice-script.ts.
import { NPCS } from './world';

export const VOICE_BRIEFS: Record<string, string> = {
  narrator: 'Documentary narrator. Male, 55-65, deep and calm, warm British-documentary delivery, unhurried, never theatrical.',
  seller: 'The merchant. Egyptian man, early 40s, deep warm baritone, charming and unhurried, light Cairene accent in English. Smiles through his lines.',
  samira: 'Samira. Egyptian woman, early 30s, refined upper-class Cairo accent, calm and precise, dry wit, never raises her voice.',
  yusuf: 'Yusuf. Egyptian hotel owner, late 40s, brisk and practical, working-class Cairo accent, a little impatient, not unfriendly.',
  mariam: 'Mariam. Young Egyptian woman, about 22, soft and warm, shy, hesitant pauses, gentle Shubra accent.',
  fuad: 'King Fuad I of Egypt, late 50s. Formal, precise and reserved; educated in Italy, a faint Italian colouring to his English. Never hurried.',
  nazli: 'Queen Nazli of Egypt, early 30s. Warm, elegant and a little amused; Alexandrian French in her vowels.',
  abdullah: 'Emir Abdullah of Transjordan, early 40s. Hospitable, humorous and poetic; a Hejazi Arab speaking English slowly and with pleasure.',
  faisal: 'King Faisal I of Iraq, early 40s. Soft-spoken, courteous and careful; a diplomat weighing each word.',
  ataturk: 'Mustafa Kemal Pasha, 44. Brisk, direct and decisive; short sentences, a Turkish accent, no small talk.',
  ...Object.fromEntries(Object.values(NPCS).map((n) => [n.id, `${n.name}. ${n.voice}.`])),
  kassab: 'Smooth Cairene dealer, late thirties, oily charm, a little mocking, quick',
  hassan: 'Egyptian coffee-house owner, mid fifties, warm, jolly, loud laugh, talks with his hands',
  whitcombe: 'English governess, mid thirties, Surrey accent, precise, polite, dry humour',
  kasparian: 'Armenian physician, fifties, soft-spoken, exact, a little weary',
  benakis: 'Greek cotton broker from Alexandria, forties, charming, expansive, vain',
};
