// Talking to Malek in his shop, and what he says when you pick from his menu. Every answer here is his
// own recorded voice: `en` is a line he recorded in English (it plays from his voice file, so the text
// must match the recording word for word); `ar` is one of his recorded Arabic phrases (malekArabic.ts).
import type { MalekItemId } from './malekMenu';

export interface RealLine { en?: string; ar?: string }
export interface ChatLine extends RealLine { id: string; ask: string }

export const MALEK_CHAT: ChatLine[] = [
  { id: 'who', ask: 'Who runs this place?', en: 'I am Malek, Al-Mallem. The boss. And there is nobody else here to be boss of.', ar: 'ana-malek' },
  { id: 'early', ask: 'You start early?', en: 'I light the charcoal before the sun. I put the beans on.', ar: 'baseha-badri' },
  { id: 'busy', ask: 'Busy at lunch?', en: 'And by noon everyone wants lunch at the same time. Nobody thinks of me.', ar: 'el-dohr' },
  { id: 'kofta', ask: 'Is the kofta good?', en: 'Is the kofta good? Of course it is good. I make it with my own hands.', ar: 'el-kofta' },
  { id: 'stool', ask: 'This stool wobbles.', en: 'Sit anywhere. The stools are all equally bad.', ar: 'el-korsi' },
  { id: 'discount', ask: 'A discount for a friend?', en: 'Fine. Come and eat. I will not give you a discount; I will give you a bigger plate.', ar: 'tabaq-akbar' },
  { id: 'rug', ask: 'A good rug for four pounds?', en: 'For that I could buy a sheep and lie on it.' },
  { id: 'slow', ask: 'Business is slow.', ar: 'elli-khalaq' },
  { id: 'story', ask: 'Let me tell you what happened…', ar: 'aah-wbaadein' },
  { id: 'thanks', ask: 'Thank you, Malek.', ar: 'tamalli-maak' },
];

/** what he says when you open the talk, or tap him: "Well? Do you want to eat?" */
export const MALEK_HELLO: RealLine = { ar: 'ayez-takol' };

/** what he says as you pick from the menu */
export const MALEK_MENU_LINE: Partial<Record<MalekItemId, RealLine>> = {
  malek_kofta: { en: 'Is the kofta good? Of course it is good. I make it with my own hands.' },
  malek_ful: { en: 'I light the charcoal before the sun. I put the beans on.' },
  malek_lentils: { ar: 'ayez-takol' },
  malek_kebab: { ar: 'el-kofta' },
  malek_liver: { ar: 'el-kofta' },
  malek_stew: { ar: 'ayez-takol' },
  malek_bastirma: { ar: 'elli-khalaq' },
  malek_road_pack: { ar: 'elli-khalaq' },
  malek_caravan_pack: { ar: 'elli-khalaq' },
  malek_tea: { ar: 'tamalli-maak' },
};
