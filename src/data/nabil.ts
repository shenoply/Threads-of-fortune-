import type { BuyerDef } from '../game/types';

// Nabil al-Khatib: a recurring Cairo buyer, one of the city's wealthiest textile merchants
// (docs/handoff/NABIL_BUYER_FOR_CLAUDE_v2.md). He is hard to deal with because he knows stock and
// can walk away, never because of his stature. His objections come from the rug's real record:
// a repair, weak provenance, wear. Honesty raises his trust; bluffing and token price changes cost
// patience. His ceiling follows the rug's quality and evidence (see src/game/systems/nabil.ts).
// Original fiction. In player-facing text he is "Nabil" or "the merchant".

export const NABIL: BuyerDef = {
  id: 'nabil', name: 'Nabil al-Khatib', role: 'Textile merchant with a warehouse behind the Muski, Cairo', roomWord: 'showroom',
  bio: 'Built a fortune from one warehouse, a list of importers and an exact eye for knots, dyes and repairs. Pays well for what he can defend. Dislikes flattery and hurry.',
  budget: [1500, 60000], patience: 70, trust: 40, interest: 40,
  values: { fineWeave: 3, antique: 2, rare: 2, story: 1, wool: 1, silk: 1, restrained: 1, humble: -2, flatweave: -1 },
  colourPref: { indigo: 1, crimson: 1, ivory: 0, gold: 0, mixed: 0 },
  args: { story: 0.8, craft: 2.2, fit: 0.6, durability: 1.2 },
  priorities: {
    room: [{ id: 'resale', label: 'Resells to collectors' }, { id: 'clients', label: 'Clients who check' }],
    drawn: [{ id: 'evidence', label: 'Evidence over stories' }, { id: 'condition', label: 'An honest account of condition' }],
  },
  directBudgetTrust: -2, pushyTrust: -4, embellishNotice: 0.85, catAffinity: 0,
  needs: [
    {
      id: 'stock', label: 'Fine stock for his showroom',
      room: ['A showroom off the Muski. My clients are collectors and hotel buyers; they send their own experts. I sell only what I would defend in front of them.'],
      values: { fineWeave: 3, antique: 2, rare: 2, restrained: 1, humble: -2 },
      colourPref: { indigo: 1, crimson: 1 },
      budget: [1500, 60000], priorities: [{ id: 'evidence', label: 'Evidence over stories' }, { id: 'resale', label: 'Resells to collectors' }],
    },
  ],
  objections: [
    { id: 'repair', when: (_t, i) => i.restored, text: 'The colour is handsome. Tell me what you know of the repair along this edge.', honest: 'You told me the fault before I had to pull it out of you. I remember that.', facts: 'You describe the rug. I asked about the repair.', factsWorks: false },
    { id: 'history', when: (t, i) => i.provenance === 'Uncertain' || i.provenance === 'Disputed' || t.provenance === 'Uncertain', text: 'Where has it been? Not the legend. The last three owners, if you know them.', honest: 'Uncertain, then. Good. Uncertain I can price. Invented I cannot.', facts: 'You have described your hope for it. I asked for its history.', factsWorks: false },
    { id: 'wear', when: (_t, i) => i.condition === 'Worn' || i.condition === 'Damaged' || i.condition === 'Dirty', text: 'The pile is low at this end. How much of that did you price in?', honest: 'Then we agree on what we are looking at. That is most of a negotiation.', facts: 'The wool is good, yes. The wear is also real.', factsWorks: true },
    { id: 'price', when: () => true, text: 'I have seen three pieces like this in a month. Why is yours the one I should carry out?', honest: 'Plainly said. Go on.', facts: 'Knots, dyes, condition. Now you are speaking my language.', factsWorks: true },
  ],
  silhouette: 'fez', accent: '#4a3a2a',
  lines: {
    arrival: ['A merchant in a grey three-piece suit comes in with a leather portfolio under his arm and looks at the stock before he looks at you.', 'Nabil al-Khatib arrives, portfolio under his arm, and nods once.'],
    greeting: ['Show me the piece you would keep if you could afford to.', 'Good morning. I have an hour. Let us not waste it on the ones you want to be rid of.'],
    repeat: ['I am back. I remember what you told me last time, and whether it held.', 'Nabil again. Show me what is new, and what is true about it.'],
    room: ['A showroom off the Muski. Collectors, hotel buyers, two consuls. Every one of them brings an expert.', 'My clients check. So I check first.'],
    drawnTo: ['Evidence. A fine weave, an honest account of the condition, and a price that knows the market.', 'I buy what I can defend in front of a man who knows more than I do.'],
    budgetEarly: ['My budget is my business. Show me something worth talking about first.'],
    budgetLate: ['I can pay today, in full, for the right piece. That is all the budget you need to know.'],
    decider: ['I decide. I have for thirty years.'],
    smallTalk: ['Cotton is falling in Liverpool, so everyone in Cairo is nervous. Good time to buy, bad time to talk.', 'I do not need compliments. I need facts.'],
    tea: ['Thank you. Tea does not change a price, but it is civilised.'],
    earlyPresent: ['You have not asked what I want. Now I must look at what you want to sell.'],
    rugGood: ['Hm. Turn it over. Good. Now the other corner.', 'This one I will look at properly.'],
    rugNeutral: ['A decent piece. Decent is not why I came.', 'It is a rug. Tell me why it is this rug.'],
    rugBad: ['That is for a hallway in Heliopolis. Not for my showroom.', 'No. Show me the one you are proud of.'],
    colour: { indigo: 'Good indigo, even. Somebody knew the vat.', crimson: 'A clear red. Madder, or they want me to think so.', ivory: 'Pale grounds show every lie. Let me see the edges.', gold: 'Gold grounds sell to hotels. Not to collectors.', mixed: 'Many colours. Are they all fast?' },
    condition: { dirty: 'Dirt I can wash. What is under it?', worn: 'Worn. How worn, exactly?', damaged: 'Damage. Show me all of it, not the corner you like.' },
    story: { good: ['Good. That is a history, not a hope.'], flat: ['A charming story. Stories do not appear on the back of a rug.'] },
    craft: { good: ['Now you speak my language. Count them with me.', 'Yes. Knots do not lie, only sellers do.'], flat: ['Every seller in the Khan says fine weave. Show me.'] },
    fit: { good: ['That is a showroom piece, yes.'], flat: ['I did not ask where it would go. I asked what it is.'] },
    durability: { good: ['Sound. That matters to a man who resells.'], flat: ['It will last. They all last, if nobody walks on them.'] },
    repeatArg: ['You said that already. Saying it twice does not make it twice as true.', 'I heard you the first time.'],
    embellishBelieved: ['Interesting. I will check that, of course.'],
    embellishCaught: ['No. That house never owned a rug like this, and you know it. Now I trust nothing else you said.'],
    priceLow: ['Done. You should have asked more; I will not tell you how much.', 'Done, and quickly, before you think about it.'],
    priceFair: ['A fair figure for a fair account. Done.', 'Agreed. I can pay today.'],
    priceHigh: ['That is the price of a rug with papers. This one has none.', 'Too high for what we both know about it.'],
    priceInsult: ['Now you are selling to a tourist. I am not one.', 'No. That figure tells me you think I cannot count.'],
    counter: ['I can pay today, and I will take the risk. Here is my figure: {price}.', '{price}. Cash, today, and I carry it myself.', 'My figure is {price}. You may say no.'],
    holdGive: ['You held your price without inventing a reason. {price}.'],
    holdRefuse: ['Then we disagree, politely. I will not go higher.', 'No. I respect a firm price, but I do not have to pay it.'],
    sweetener: ['Delivery is a courtesy. I will note it.'],
    impatience: ['I have heard this. Give me something new, or a number.', 'My carriage is waiting and so am I.'],
    success: ['Good. Send the receipt to the warehouse; the clerk will know my name.', 'We will do business again, if the next one is as honest.'],
    badSale: ['I have paid more than I should. That is my mistake, not yours. I will remember the price, not the grudge.'],
    walkAway: ['We may speak again when the account is clearer.', 'Not today. I will come back when you have something you can defend.'],
    finalOffer: ['My last figure is {price}. After that I thank you and leave.'],
    saffron: ['Your cat has better manners than most sellers. She at least does not talk.'],
    commission: ['I have a client who wants a documented antique, fine weave, no repairs. Find one and I pay a finder\'s bonus.'],
    commissionDone: ['Documented, sound, and exactly as described. Here is your bonus. My client will be pleased.'],
    referral: ['I mentioned your stall to a consul\'s wife. Do not flatter her; she hates it more than I do.'],
    rare: ['Now this is a piece I did not expect to find in Giza.'],
    embellishLater: ['I checked what you told me about the {rug}. It was not true. I paid for a story I cannot resell.'],
    previousRug: ['The {rug} sold to a client in Zamalek. He checked it twice. It held.', 'I still have the {rug}. Nobody has found a fault in it yet.'],
    concession: ['Sensible.'],
    catPet: ['Hm. She is a better judge of wool than most dealers in the Khan.'],
  },
};

/** He deals in city carpets and treasures, now and then a very good trade rug. */
export const NABIL_TIERS: [number, number] = [2, 4];
/** Reputation before he bothers with your stall at all. */
export const NABIL_MIN_REP = 12;
