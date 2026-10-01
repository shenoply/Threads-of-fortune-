import type { BuyerDef } from '../game/types';

// Cohen: a fictional Egyptian Jewish textile wholesaler, born in Alexandria, with a Cairo office
// (docs/handoff/COHEN_TRADER_CLAUDE_HANDOFF.md, updated by docs/handoff/COHEN_CHARACTER_UPDATE_FOR_CLAUDE.md).
// Egyptian Arabic in the trade, French with some suppliers. His mother taught him to judge colour in
// daylight; his wife Miriam keeps the office books while he travels. Short and stocky, cream linen
// three-piece suit, a leather notebook. Very wealthy, always after his margin: he will not overpay.
// He does not like you: he believes you undercut him on the Nile Crescent Hotel corridor contract last
// spring (his belief; the story has not settled what happened). Cool, curt, rarely complimentary, but a
// contract kept earns his professional trust. His identity is part of his life and calendar, never a
// bargaining modifier, and his dislike is a commercial grudge, nothing else.
// His visits run on orders (src/game/systems/cohen.ts), not the ordinary haggle.

export const COHEN: BuyerDef = {
  id: 'cohen', name: 'Cohen', role: 'Textile wholesaler with an office in Cairo; supplies hotels and steamship lines', roomWord: 'corridor',
  bio: 'Born in Alexandria. A very rich wholesaler who still counts every piastre of margin: purchase, transport, defects, resale. Thinks you undercut him on the Nile Crescent Hotel contract and has not forgiven it. His wife Miriam runs the office books while he travels.',
  budget: [300, 3000], patience: 76, trust: 50, interest: 50,
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
    arrival: ['A short, stocky man in a cream linen suit, a leather notebook in one hand, stops at the stall and does not smile.', 'Cohen arrives, notebook already open.'],
    greeting: ["I don't have to like you. The numbers have to work. You took the Nile Crescent corridor from me last spring at a price nobody honest could match. This time I have the order: two rugs, boots all day. Edges first."],
    repeat: ["Another order. Don't read anything into it.", 'Cohen again. The numbers worked last time. Barely.'],
    room: ['A hotel corridor, two point two metres by one point two. Boots all day, porters with trunks at night.'],
    drawnTo: ['Colour that holds, edges that hold, and two rugs that look like brothers.'],
    budgetEarly: ['My client pays a fair wholesale price. I will name it when I see what you have.'],
    budgetLate: ['Three pounds a rug for sound stock, paid on delivery. That is the contract price.'],
    decider: ['I decide what I buy. My client decides whether I buy from them again.'],
    smallTalk: ['My mother taught me to look at colour in daylight, never under a lamp. She was right.', 'The steamship lines want everything by the next sailing. Everyone wants everything by the next sailing.'],
    tea: ['I will drink it. It changes nothing.'],
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
    priceLow: ['Done.'], priceFair: ['Fair. Done.'], priceHigh: ['At that price, you earn twice and I earn nothing. Try again.'], priceInsult: ['No.'],
    counter: ['My figure is {price} a rug.'], holdGive: ['{price}, then.'], holdRefuse: ['No. My client has a budget.'],
    sweetener: ['Delivery to the office is useful. Thank you.'],
    impatience: ['I have a train at four.'],
    success: ["We have an agreement. Don't mistake it for friendship.", 'Delivered. Miriam will enter it in the books tonight.'],
    badSale: ['It will do.'],
    walkAway: ["The margin is too thin. I'll leave it.", 'Another time, when you have the stock.'],
    saffron: ['Your cat is on my rug.'],
    commission: ['A single sale is pleasant. A repeat order is a business.'],
    commissionDone: ['The order arrived on time. That is why I am back.'],
    referral: ['A steamship agent asked where my corridor rugs came from. I told him. Do not thank me; he asked.'],
    rare: ['This is too fine for a corridor. Keep it for someone who will not walk on it.'],
    embellishLater: ['What you told me about the {rug} was not true. It did not matter to the corridor, but it matters to me.'],
    previousRug: ['The order arrived on time. That is why I am back.'],
    concession: ['Thank you.'],
    catPet: ['Keep her off the stock.'],
  },
};
export const COHEN_TIERS: [number, number] = [1, 2];
