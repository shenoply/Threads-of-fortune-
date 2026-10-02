// Talking to Malek in his shop, and what he says when you pick from his menu. Every line he says here is
// his own recorded voice: `en` is a line he recorded in English (it plays from his voice file, so the
// text must match the recording word for word); `ar` is one of his recorded Arabic phrases
// (malekArabic.ts). The talk is a small conversation: he speaks, you answer, he answers that.
import type { MalekItemId } from './malekMenu';

export interface RealLine { en?: string; ar?: string }
export type TalkNodeId =
  | 'start' | 'seat' | 'wobble' | 'kofta' | 'discount' | 'thanks' | 'who' | 'early' | 'busy' | 'slow' | 'story' | 'rug' | 'sheep';
export interface Reply { say: string; to?: TalkNodeId; then?: 'menu' | 'end' }
export interface TalkNode { malek: RealLine; replies: Reply[] }

const KOFTA = 'Is the kofta good? Of course it is good. I make it with my own hands.';
const BEANS = 'I light the charcoal before the sun. I put the beans on.';

export const MALEK_TALK: Record<TalkNodeId, TalkNode> = {
  start: {
    malek: { ar: 'ayez-takol' },
    replies: [
      { say: 'Yes. Where do I sit?', to: 'seat' },
      { say: 'Not yet. Who runs this place?', to: 'who' },
      { say: 'I came about a rug.', to: 'rug' },
    ],
  },
  seat: {
    malek: { en: 'Sit anywhere. The stools are all equally bad.' },
    replies: [
      { say: 'This one wobbles.', to: 'wobble' },
      { say: 'What is good today?', to: 'kofta' },
    ],
  },
  wobble: {
    malek: { ar: 'el-korsi' },
    replies: [
      { say: 'Fair enough. Is the kofta good?', to: 'kofta' },
      { say: 'With stools like these, business must be slow.', to: 'slow' },
    ],
  },
  kofta: {
    malek: { en: KOFTA, ar: 'el-kofta' },
    replies: [
      { say: 'Then I will have some.', then: 'menu' },
      { say: 'A discount for a friend?', to: 'discount' },
    ],
  },
  discount: {
    malek: { en: 'Fine. Come and eat. I will not give you a discount; I will give you a bigger plate.', ar: 'tabaq-akbar' },
    replies: [
      { say: 'Deal. Bring the plate.', then: 'menu' },
      { say: 'Thank you, Malek.', to: 'thanks' },
    ],
  },
  thanks: {
    malek: { ar: 'tamalli-maak' },
    replies: [
      { say: 'I will see you tomorrow.', then: 'end' },
      { say: 'Actually, I am still hungry.', then: 'menu' },
    ],
  },
  who: {
    malek: { en: 'I am Malek, Al-Mallem. The boss. And there is nobody else here to be boss of.', ar: 'ana-malek' },
    replies: [
      { say: 'You do it all yourself?', to: 'early' },
      { say: 'Then I had better sit down.', to: 'seat' },
    ],
  },
  early: {
    malek: { en: BEANS, ar: 'baseha-badri' },
    replies: [
      { say: 'And at lunchtime?', to: 'busy' },
      { say: 'That sounds hard.', to: 'slow' },
    ],
  },
  busy: {
    malek: { en: 'And by noon everyone wants lunch at the same time. Nobody thinks of me.', ar: 'el-dohr' },
    replies: [
      { say: 'I am thinking of you, Malek.', to: 'thanks' },
      { say: 'Then let me order before the rush.', then: 'menu' },
    ],
  },
  slow: {
    malek: { ar: 'elli-khalaq' },
    replies: [
      { say: 'Amen. What is good today?', to: 'kofta' },
      { say: 'Let me tell you about my day…', to: 'story' },
    ],
  },
  story: {
    malek: { ar: 'aah-wbaadein' },
    replies: [
      { say: '…and then I came here to eat.', to: 'seat' },
      { say: '…never mind. Thank you for listening.', to: 'thanks' },
    ],
  },
  rug: {
    malek: { ar: 'aah-wbaadein' },
    replies: [
      { say: 'A good rug for your floor. Only four pounds.', to: 'sheep' },
      { say: 'Never mind. I am hungry.', to: 'seat' },
    ],
  },
  sheep: {
    malek: { en: 'For that I could buy a sheep and lie on it.' },
    replies: [
      { say: 'Fair. Feed me instead.', to: 'seat' },
      { say: 'Business is slow for me too, Malek.', to: 'slow' },
    ],
  },
};

/** what he says as you pick from the menu */
export const MALEK_MENU_LINE: Partial<Record<MalekItemId, RealLine>> = {
  malek_kofta: { en: KOFTA },
  malek_ful: { en: BEANS },
  malek_lentils: { ar: 'ayez-takol' },
  malek_kebab: { ar: 'el-kofta' },
  malek_liver: { ar: 'el-kofta' },
  malek_stew: { ar: 'ayez-takol' },
  malek_bastirma: { ar: 'elli-khalaq' },
  malek_road_pack: { ar: 'elli-khalaq' },
  malek_caravan_pack: { ar: 'elli-khalaq' },
  malek_tea: { ar: 'tamalli-maak' },
};
