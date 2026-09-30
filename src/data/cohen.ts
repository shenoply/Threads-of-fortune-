import type { BuyerDef } from '../game/types';

// Cohen: a fictional Egyptian Jewish textile wholesaler, 43, born in Alexandria, with a modest Cairo
// office (docs/handoff/COHEN_TRADER_CLAUDE_HANDOFF.md). Egyptian Arabic in the trade, French with some
// suppliers. His mother taught him to judge colour in daylight; his wife Miriam keeps the office books
// while he travels. He buys reliable rugs for hotel corridors and steamship cabins and cares about
// edges, dimensions, colour that holds and delivery on the day, not origin stories. Patient and
// precise. His identity is part of his life and calendar, never a bargaining modifier.
// His visits run on orders (src/game/systems/cohen.ts), not the ordinary haggle.

export const COHEN: BuyerDef = {
  id: 'cohen', name: 'Cohen', role: 'Textile wholesaler with an office in Cairo; supplies hotels and steamship lines', roomWord: 'corridor',
  bio: 'Born in Alexandria, forty-three. Keeps swatches and shipment notes in a pocket book; his wife Miriam runs the office accounts while he travels. Wants sound rugs, delivered on the day.',
  budget: [300, 3000], patience: 90, trust: 50, interest: 50,
  values: { hardwearing: 3, wool: 2, restrained: 1, darkField: 1, washable: 1, fragile: -3, silk: -2, antique: -1 },
  colourPref: { crimson: 1, indigo: 1, mixed: 0, gold: 0, ivory: -1 },
  args: { story: 0.2, craft: 1, fit: 1.2, durability: 2 },
  priorities: {
    room: [{ id: 'boots', label: 'Boots all day' }, { id: 'match', label: 'A matching pair' }],
    drawn: [{ id: 'edges', label: 'Sound edges' }, { id: 'day', label: 'Delivery on the day' }],
  },
  directBudgetTrust: 2, pushyTrust: -2, embellishNotice: 0.7, catAffinity: 1,
  needs: [
    {
      id: 'corridor', label: 'Two rugs for a hotel corridor',
      room: ['A hotel corridor, two point two metres by one point two. Boots all day, porters with trunks at night.'],
      values: { hardwearing: 3, wool: 2, darkField: 1, fragile: -3, silk: -2 },
      colourPref: { crimson: 1, indigo: 1 },
      budget: [300, 3000], priorities: [{ id: 'boots', label: 'Boots all day' }, { id: 'match', label: 'A matching pair' }],
    },
  ],
  objections: [
    { id: 'edges', when: (_t, i) => i.condition !== 'Excellent' && i.condition !== 'Good', text: 'The edges have gone here. In a corridor that becomes a hole by winter.', honest: 'Thank you. Then it is not for this contract.', facts: 'It is still a good rug. It is not a corridor rug.', factsWorks: false },
    { id: 'fit', when: () => true, text: 'Show me the edges first; the pattern can wait.', honest: 'Good. Now the measurements.', facts: 'Yes. And the size?', factsWorks: true },
  ],
  silhouette: 'scarf', accent: '#5b4a33',
  lines: {
    arrival: ['A man in a pale linen suit, a pocket book in one hand, comes to the stall and nods to you.', 'Cohen arrives, pocket book in hand.'],
    greeting: ['My client needs two rugs for a corridor where boots cross all day. Show me the edges first; the pattern can wait.'],
    repeat: ['Good morning. I have another order, if you have the stock.', 'Cohen again. How are the rugs holding?'],
    room: ['A hotel corridor, two point two metres by one point two. Boots all day, porters with trunks at night.'],
    drawnTo: ['Colour that holds, edges that hold, and two rugs that look like brothers.'],
    budgetEarly: ['My client pays a fair wholesale price. I will name it when I see what you have.'],
    budgetLate: ['Three pounds a rug for sound stock, paid on delivery. That is the contract price.'],
    decider: ['I decide what I buy. My client decides whether I buy from them again.'],
    smallTalk: ['My mother taught me to look at colour in daylight, never under a lamp. She was right.', 'The steamship lines want everything by the next sailing. Everyone wants everything by the next sailing.'],
    tea: ['Thank you. My wife says I drink too much of it on the road.'],
    earlyPresent: ['Before the rug, the order. Let me tell you what I need.'],
    rugGood: ['This one I can use. Let me see the back.'],
    rugNeutral: ['Possibly. The edges first.'],
    rugBad: ['Not for a corridor.'],
    colour: { indigo: 'Indigo holds well if it was dyed properly.', crimson: 'Red. Does it run?', ivory: 'Pale grounds show every boot.', gold: 'Gold grounds fade in a sunny corridor.', mixed: 'Many colours; one of them will be the weak one.' },
    condition: { dirty: 'Dirt I can clean. Show me the edges.', worn: 'The edges are going.', damaged: 'Damaged. Not for this order.' },
    story: { good: ['A good story. My client will not ask for it.'], flat: ['The pattern can wait. The edges?'] },
    craft: { good: ['Tight enough. Good.'], flat: ['Knots matter less than edges for my client.'] },
    fit: { good: ['That is a corridor rug.'], flat: ['Not for a corridor.'] },
    durability: { good: ['That is what I need to hear.'], flat: ['Every seller says it will last.'] },
    repeatArg: ['You told me. Let us move on.'],
    embellishBelieved: ['Interesting. It does not change the edges.'],
    embellishCaught: ['That is not true, and I did not need it to be.'],
    priceLow: ['Done.'], priceFair: ['Fair. Done.'], priceHigh: ['Too much for a corridor.'], priceInsult: ['No.'],
    counter: ['My figure is {price} a rug.'], holdGive: ['{price}, then.'], holdRefuse: ['No. My client has a budget.'],
    sweetener: ['Delivery to the office is useful. Thank you.'],
    impatience: ['I have a train at four.'],
    success: ['Good. Miriam will enter it in the books tonight.', 'Thank you. My client will be pleased, and so will I.'],
    badSale: ['It will do.'],
    walkAway: ['Another time, when you have the stock.', 'We may do business on the next order.'],
    saffron: ['Your cat approves of the wool. So do I.'],
    commission: ['I will have another order after this one, if this one goes well.'],
    commissionDone: ['Delivered as promised. That is rarer than good wool.'],
    referral: ['I told a steamship agent about your stall. He is punctual; be punctual with him.'],
    rare: ['This is too fine for a corridor. Keep it for someone who will not walk on it.'],
    embellishLater: ['What you told me about the {rug} was not true. It did not matter to the corridor, but it matters to me.'],
    previousRug: ['The corridor rugs are wearing well. The hotel has asked for more.'],
    concession: ['Thank you.'],
    catPet: ['She has an eye for wool.'],
  },
};
export const COHEN_TIERS: [number, number] = [1, 2];
