import { CELEBS_1_MANNER } from './celebs1';
import { CELEBS_2_MANNER } from './celebs2';
import { CELEBS_3_MANNER } from './celebs3';
import { CELEBS_4_MANNER } from './celebs4';
import { BUYERS_3A_MANNER } from './buyers3a';
import { BUYERS_3B_MANNER } from './buyers3b';
import { BUYERS_3C_MANNER } from './buyers3c';
import { BUYERS_3D_MANNER } from './buyers3d';
// How each buyer takes your manner. like: +1 warms to it, 0 indifferent, -1 dislikes it.
export type MannerKind = 'charm' | 'kind' | 'firm';

export const SELLER_MANNER: Record<MannerKind, string[]> = {
  charm: ['Forgive me, but you have a better eye than half the dealers in this lane.', 'A room with you in it hardly needs a carpet. But let us find one anyway.'],
  kind: ['How is the family? Sit, rest a moment.', 'Business can wait for a glass of water.'],
  firm: ['I will be plain with you. I do not waste your time, and I do not lower my prices for show.', 'Let us talk business. Good rugs, fair prices, no theatre.'],
};

export interface Reaction { like: -1 | 0 | 1; good: string; bad: string }
export const BUYER_MANNER: Record<string, Record<MannerKind, Reaction>> = {
  samira: {
    charm: { like: 0, good: 'That is kind. Now show me the rugs, not the compliments.', bad: 'Compliments are cheap in this lane. I came for carpets.' },
    kind: { like: 1, good: 'Thank you. The children are well, God be praised. You are more civil than most dealers.', bad: 'Thank you.' },
    firm: { like: 1, good: 'Good. I prefer a merchant who does not perform.', bad: 'Firm is one thing. Rude is another.' },
  },
  yusuf: {
    charm: { like: -1, good: 'Hm. Flattery. Let us see the rugs.', bad: 'I have a hotel to run, not a heart to win. The rugs, please.' },
    kind: { like: 0, good: 'Water, yes. Thank you. Now, quickly.', bad: 'I have no time to sit.' },
    firm: { like: 1, good: 'At last, someone who talks like a businessman.', bad: 'Plain talk. Good.' },
  },
  mariam: {
    charm: { like: 0, good: 'Oh. Thank you. Karim says the same about my cooking, but I think he is being polite.', bad: 'Please, I am a married woman. Just the rugs.' },
    kind: { like: 1, good: 'Thank you, you are very kind. My mother-in-law will visit, and I want everything right.', bad: 'Thank you.' },
    firm: { like: -1, good: 'I understand.', bad: 'Oh. I did not mean to waste your time.' },
  },
  hassan: {
    charm: { like: 1, good: 'Ha! Flattery, in the morning, before coffee. I like you already.', bad: 'Save it for the tourists.' },
    kind: { like: 1, good: 'My family is well, God be praised, and my grandson has a new tooth. Thank you for asking.', bad: 'Thank you.' },
    firm: { like: 0, good: 'Business, business. All right.', bad: 'So serious! Nobody dies from a little chat.' },
  },
  whitcombe: {
    charm: { like: -1, good: 'Thank you, I\'m sure.', bad: 'Please don\'t. Everyone in Cairo tries that on English governesses.' },
    kind: { like: 1, good: 'How kind of you to ask. The children are well, and exhausting. And you?', bad: 'Thank you.' },
    firm: { like: 1, good: 'Good. I prefer plain dealing. It saves us both an hour.', bad: 'Quite.' },
  },
  kasparian: {
    charm: { like: 0, good: 'You are kind. My wife would say so too.', bad: 'Flattery is a symptom, not a cure.' },
    kind: { like: 1, good: 'Thank you. My mother is old, but well. It is kind of you to ask a stranger.', bad: 'Thank you.' },
    firm: { like: 1, good: 'Good. Plain facts are a doctor\'s favourite medicine.', bad: 'Firm, yes. Rude, no.' },
  },
  benakis: {
    charm: { like: 1, good: 'Ah! A man who appreciates a good suit. We will get on.', bad: 'I know I look good. Show me the carpets.' },
    kind: { like: 0, good: 'My wife? Spending my money, as usual. She is very well.', bad: 'I am always well.' },
    firm: { like: -1, good: 'Hm.', bad: 'Firm with me? My friend, I am the customer.' },
  },
  fuad: {
    charm: { like: 1, good: 'You have the manners of a Turin shopkeeper. I mean that as praise.', bad: 'Enough ceremony.' },
    kind: { like: 0, good: 'Your concern is noted.', bad: 'The King does not need your sympathy.' },
    firm: { like: -1, good: 'Hm.', bad: 'You forget where you are standing, merchant.' },
  },
  nazli: {
    charm: { like: 1, good: 'How charming. In Paris they would say you have esprit.', bad: 'Charming, but not today.' },
    kind: { like: 1, good: 'You are thoughtful. That is rare at court.', bad: 'Thank you.' },
    firm: { like: -1, good: 'Very well.', bad: 'I am not a customer in a bazaar.' },
  },
  abdullah: {
    charm: { like: 1, good: 'A merchant with a courtier\'s tongue. My father would have liked you.', bad: 'Poets flatter better than merchants.' },
    kind: { like: 1, good: 'You ask after my household? God keep yours. Sit, drink.', bad: 'Thank you.' },
    firm: { like: 0, good: 'Plainly said.', bad: 'In the desert we say the hasty man arrives last.' },
  },
  faisal: {
    charm: { like: 0, good: 'You are generous with words. Be as generous with the truth.', bad: 'I have heard sweeter from Englishmen.' },
    kind: { like: 1, good: 'Thank you. It has been a long year.', bad: 'Thank you.' },
    firm: { like: 0, good: 'Good. A clear price is a courtesy.', bad: 'Firmness is not a virtue on its own.' },
  },
  ataturk: {
    charm: { like: -1, good: 'Save your compliments for the Sultans. We have no more of them.', bad: 'Flattery is the old Turkey. Speak plainly.' },
    kind: { like: 0, good: 'Thank you. Now, the carpets.', bad: 'I do not need looking after.' },
    firm: { like: 1, good: 'Good. That is how the new Turkey does business.', bad: 'Plain talk. Continue.' },
  },
};
Object.assign(BUYER_MANNER, BUYERS_3A_MANNER, BUYERS_3B_MANNER, BUYERS_3C_MANNER, BUYERS_3D_MANNER);
Object.assign(BUYER_MANNER, CELEBS_1_MANNER, CELEBS_2_MANNER, CELEBS_3_MANNER, CELEBS_4_MANNER);
