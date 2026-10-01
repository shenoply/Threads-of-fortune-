import type { BuyerDef } from '../game/types';

// Malek "Boo Rayan", Al-Mallem (المعلم): he runs a charcoal grill in Giza on his own and expects the
// worst of everything, rugs included. He comes to your stall now and then once you have eaten at his
// place (src/game/systems/malek.ts malekDue). He wants something for a floor that sees grease, boots
// and spilled tea: dark, hard-wearing, cheap, and he will tell you why every rug is wrong first.
export const MALEK_BUYER: BuyerDef = {
  id: 'malek', name: 'Malek', role: 'Owns the charcoal grill round the corner; called Al-Mallem, the boss', roomWord: 'shop',
  bio: 'Runs his grill shop alone and says partners eat the profits. Pessimistic about everything, generous with the kofta when nobody is looking. Wants a rug for a floor that sees grease, boots and spilled tea.',
  // the hardest Common buyer in the lane: short patience, slow trust, and he only buys when fully
  // convinced (negotiation.ts malekConvinced), otherwise he leaves to think about it
  budget: [120, 450], patience: 55, trust: 30, interest: 35,
  values: { hardwearing: 3, darkField: 2, washable: 2, wool: 1, lightField: -2, fragile: -3, silk: -3, antique: -1 },
  colourPref: { crimson: 1, indigo: 1, mixed: 0, gold: -1, ivory: -2 },
  args: { story: 0.2, craft: 0.6, fit: 1.1, durability: 1.8 },
  priorities: {
    room: [{ id: 'grease', label: 'Grease and boots' }, { id: 'tables', label: 'Under the tables' }],
    drawn: [{ id: 'dark', label: 'Dark enough to forgive' }, { id: 'cheap', label: 'Cheap enough to replace' }],
  },
  directBudgetTrust: 0, pushyTrust: -5, embellishNotice: 0.95, catAffinity: -1,
  needs: [
    {
      id: 'shopfloor', label: 'A rug for the shop floor by the tables',
      room: ['Under my tables. Charcoal dust, grease, boots, tea. The floor has seen worse than your rugs.'],
      values: { hardwearing: 3, darkField: 2, washable: 2, fragile: -3, silk: -3 },
      colourPref: { crimson: 1, indigo: 1, ivory: -2 },
      budget: [120, 520], priorities: [{ id: 'grease', label: 'Grease and boots' }, { id: 'dark', label: 'Dark enough to forgive' }],
    },
  ],
  objections: [
    { id: 'pale', when: (t) => t.traits.includes('lightField'), text: 'Pale. One drop of fat and it is a map of my mistakes.', honest: 'At least you admit it.', facts: 'It cleans? Everything cleans. Then it is dirty again.', factsWorks: false },
    { id: 'fine', when: (t) => t.traits.includes('silk') || t.traits.includes('fragile'), text: 'This is for a palace. My customers sit on stools that fight back.', honest: 'Ha. Honest. Keep it for a palace.', facts: 'Strong? It looks like it would faint.', factsWorks: false },
  ],
  silhouette: 'fez', accent: '#5a3a24',
  lines: {
    arrival: [
      'Malek, out of his apron for once, in a tweed suit that has been to more weddings than he admits. He looks at your rugs as if they owe him money.',
      'Malek from the grill, in his good suit and a cloud of charcoal smoke, frowns at the whole stall at once.',
      'A stocky man in a brown tweed suit and a watch chain stops at the stall: Malek, dressed for business, which for him means suspicion.',
    ],
    greeting: ['Now what? Show me a rug that does not mind grease. If you have one, I will be surprised.'],
    repeat: [
      'Me again. The floor is still ugly.',
      'Bah. I came to look. Looking is free; you told me.',
      'I left the grill to a boy who cannot count. Show me something quickly.',
      'Now what? Nothing. I came to see what you have. Probably nothing.',
    ],
    room: ['Under my tables. Charcoal dust, grease, boots, tea. The floor has seen worse than your rugs.'],
    drawnTo: ['Dark. Thick. Cheap enough that I do not cry when somebody spills the stew.'],
    budgetEarly: ['Less than you are thinking. Less than that too.'],
    budgetLate: ['Four pounds, maybe five, for a rug that lives through a winter of my customers.'],
    decider: ['I decide. Nobody else in that shop decides anything. That is the problem with the shop.'],
    smallTalk: [
      'Business is fine. Business is always fine until it is not.',
      'My supplier in Cairo says the bastirma is the best this year. He says that every year.',
      'You look thin. You should eat at a good grill. I know one. It is mine.',
      'The tourists stop at your stall and then at mine. Neither of us sells them anything. Ha.',
    ],
    tea: ['Your tea. Hm. Mine is better. Fine. Thank you.'],
    earlyPresent: ['Before you start selling, let me tell you what is wrong with my floor.'],
    rugGood: ['Hm. That one might live.', 'Dark. Thick. I hate that I like it.'],
    rugNeutral: ['Maybe. Everything is maybe.', 'It is a rug. I will give it that.'],
    rugBad: ['No. My customers would eat it.', 'Bah. Pretty. Useless.'],
    colour: { indigo: 'Indigo hides charcoal. Good.', crimson: 'Red hides a lot. Kebab, for one.', ivory: 'Pale. No.', gold: 'Gold shows every fingerprint.', mixed: 'Busy. Good. Nobody will see the stains.' },
    condition: { dirty: 'Dirty already. At least it knows where it is going.', worn: 'Worn. So am I. It is not a reason to pay more.', damaged: 'Damaged. My floor will finish it in a week.' },
    story: { good: ['A nice story. The grease will not read it.'], flat: ['I do not buy stories. I buy floors.'] },
    craft: { good: ['Tight. Fine. Tight is good.'], flat: ['Knots. Everybody talks about knots.'] },
    fit: { good: ['That would go under the tables. Ha. Maybe.'], flat: ['Wrong size for my shop. My shop is the wrong size for everything.'] },
    durability: { good: ['That is the only thing I wanted to hear.'], flat: ['Everybody says it will last. Then it does not.'] },
    repeatArg: ['You said that. I heard it the first time; I did not believe it then either.'],
    embellishBelieved: ['Hm. Maybe.'],
    embellishCaught: ['Ha. No. I have been lied to by better men, and they were selling meat.'],
    priceLow: ['Done. Before you change your mind.'], priceFair: ['Fair. I hate fair. Done.'], priceHigh: ['For that I could buy a sheep and lie on it.'], priceInsult: ['Bah. No.'],
    counter: ['{price}. And I am being generous, which I never am.'], holdGive: ['{price}. Fine. Do not tell anyone.'], holdRefuse: ['No. I have a grill to get back to.'],
    sweetener: ['You will carry it to the shop? Then I will not charge you for the tea.'],
    impatience: ['The charcoal does not light itself. Hurry.'],
    success: ['Good. Now it can be ruined properly.', 'Fine. Come and eat. I will not give you a discount; I will give you a bigger plate.'],
    badSale: ['It will do. Everything only does.'],
    walkAway: ['Another day. Maybe. Probably not.', 'Bah. I will come back when you have something ugly and strong.'],
    saffron: ['Your cat looks at me like my customers do.'],
    commission: ['If this one lives, I need another by the door.'],
    commissionDone: ['It lived. I did not expect that. Do not tell anyone.'],
    referral: ['I told the bean man about you. He will complain too. You are used to it.'],
    rare: ['That one is too good for my floor. Do not let me buy it.'],
    embellishLater: ['That rug was not what you said it was. The grease told me.'],
    previousRug: [
      'The rug is still alive. Grease, boots, stew. Still alive. Hm.',
      'The {rug} has survived a month of my customers. Do not let it go to your head.',
      'People sit longer since the rug. That is bad for business and good for the tea. I want one for the door.',
    ],
    concession: ['Ha. Thank you.'],
    catPet: ['It bites? Good. So do I.'],
  },
};
export const MALEK_TIERS: [number, number] = [1, 1];

/** the price is agreed, he is not convinced: he leaves to think it over */
export const MALEK_UNSURE = [
  'Hm. That is the price. I am not sure it is the rug. Keep it. Maybe I come back.',
  'Fine, the number is fine. My stomach says no. I listen to my stomach; it has never lost me money.',
  'Ha. You almost had me. Almost is not a sale. I will think about it.',
  'I need to look at my floor again. Do not sell it to the first fool who asks. Unless he pays more. Bah.',
];
/** back for a rug he looked at before */
export const MALEK_RETURN = {
  back: ['I thought about the {rug}. I thought about it at the grill. That is a bad sign; I only think about meat at the grill.', 'The {rug}. Is it still here? Do not tell me the price again. I remember the price.'],
  kept: ['You kept it aside. Hm. Nobody keeps anything for me. Good. Now let us argue properly.', 'You put it aside for me. I noticed. Do not make a speech about it.'],
  sold: ['You sold it. Of course you did. Everything good goes to someone else.', 'Gone? Bah. This is why I do not come back for things.'],
};
/** what is in his pocket today: nobody, Malek included, knows until he sits down. `mult` scales the
 *  most he can pay, `value` what a rug seems worth to him (fictional game tuning); `hint` is what you
 *  might notice, and sometimes there is nothing to notice */
export type MalekPurse = 'tight' | 'usual' | 'flush';
export const MALEK_PURSE: Record<MalekPurse, { mult: number; value: number; odds: number; hint: string[] }> = {
  tight: { mult: 0.5, value: 0.85, odds: 0.3, hint: [
    'Malek pats his pockets before he sits down, the way men do at the end of the month.',
    'Malek mentions, twice, that the butcher has put his prices up.',
    'Malek says the coal man came for his money this morning. He says it as if the coal man had stabbed him.',
  ] },
  usual: { mult: 1, value: 1, odds: 0.4, hint: [] },
  flush: { mult: 1.9, value: 1.45, odds: 0.3, hint: [
    'Malek has a new watch chain, and he makes sure you see it.',
    'Malek orders tea for both of you before he has looked at a single rug. The grill must have had a good week.',
    'A wedding party ate at the grill last night, Malek says. Forty plates. He is smiling, which is alarming.',
  ] },
};
/** back to ask for the same rug again, after he bought one (a customer saw it under his tables and wants one) */
export const MALEK_AGAIN = {
  have: ['The {rug}. Another one, the same. A customer sat on mine and now he will not stop talking about it. Ha. Same price, or I go.', 'You have another {rug}? Good. Same as before. Do not look at me like that, it is for my cousin. Maybe.'],
  none: ['I want the same {rug} again. You have none? Bah. Get one. I will come back.', 'Another {rug}, like the first. No? Then why do I walk all this way? For your face?'],
};
