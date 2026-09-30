import type { BuyerDef } from '../game/types';
import { ROYALS } from './royals';
import { MORE_BUYERS, BUYER_UNLOCK } from './buyers2';
import { NABIL, NABIL_TIERS } from './nabil';
import { COHEN, COHEN_TIERS } from './cohen';
import { BUYERS_3A, BUYERS_3A_TIERS } from './buyers3a';
import { BUYERS_3B, BUYERS_3B_TIERS } from './buyers3b';
import { BUYERS_3C, BUYERS_3C_TIERS } from './buyers3c';
import { BUYERS_3D, BUYERS_3D_TIERS } from './buyers3d';
import { CELEBS_1, CELEBS_1_TIERS, CELEBS_1_INFO } from './celebs1';
import { CELEBS_2, CELEBS_2_TIERS, CELEBS_2_INFO } from './celebs2';
import { CELEBS_3, CELEBS_3_TIERS, CELEBS_3_INFO } from './celebs3';
import { CELEBS_4, CELEBS_4_TIERS, CELEBS_4_INFO } from './celebs4';


const isBoldOrOrnate = (t: { traits: string[] }) => t.traits.includes('bold') || t.traits.includes('ornate');

export const BUYERS: Record<string, BuyerDef> = {
  samira: {
    id: 'samira',
    name: 'Samira',
    role: 'Furnishing a receiving room in Garden City',
    bio: 'Married into a cotton family. Knows good things and dislikes showy ones.',
    budget: [700, 1100],
    patience: 62,
    trust: 45,
    interest: 35,
    values: { restrained: 3, humble: 1, story: 2, fineWeave: 1, antique: 1, warm: 1, darkField: 1, ornate: -2, bold: -2, silk: -2, lightField: -1 },
    colourPref: { indigo: 2, ivory: 0, crimson: -1, gold: 0, mixed: 0 },
    args: { story: 2, craft: 0.5, fit: 1.5, durability: -0.5 },
    priorities: {
      room: [{ id: 'taste', label: 'Taste' }, { id: 'restraint', label: 'Restraint' }],
      drawn: [{ id: 'story', label: 'Story' }, { id: 'authenticity', label: 'Authenticity' }],
    },
    directBudgetTrust: -6,
    pushyTrust: -4,
    embellishNotice: 0.45,
    catAffinity: 1,
    needs: [
      {
        id: 'dining',
        label: 'A dining-room rug for a long table',
        room: [
          'This time it is the dining room. A long table, twelve chairs, and my nephews under it. It must be warm and it must survive them.',
        ],
        values: { warm: 2, hardwearing: 2, darkField: 2, restrained: 1, humble: 1, silk: -3, fragile: -3, lightField: -2 },
        colourPref: { crimson: 2, indigo: 1, ivory: -2, gold: 0, mixed: 0 },
        budget: [700, 1300],
        priorities: [{ id: 'taste', label: 'Warmth' }, { id: 'restraint', label: 'Survives children' }],
      },
      {
        id: 'prayer',
        label: 'A fine old piece for her mother-in-law',
        room: [
          'My mother-in-law wants a fine old rug for her own room. She has been buying carpets for fifty years. She will know if it is not what you say it is.',
        ],
        values: { fineWeave: 3, antique: 2, story: 2, rare: 2, restrained: 1, humble: -1, flatweave: -2 },
        colourPref: { indigo: 1, crimson: 1, ivory: 0, gold: -1, mixed: 0 },
        budget: [1400, 3000],
        priorities: [{ id: 'taste', label: 'Fine weave' }, { id: 'restraint', label: 'True age' }],
      },
    ],
    silhouette: 'samira',
    accent: '#9b2f2a',
    objections: [
      {
        id: 'dirty',
        when: (_t, i) => i.condition === 'Dirty' || i.condition === 'Worn' || i.condition === 'Damaged',
        text: 'It has been walked on a great deal. Is it tired, or only in need of a wash?',
        honest: 'I would rather hear that than be told it is perfect. Go on.',
        facts: 'Very well. If the wool is sound, a wash is not my concern.',
        factsWorks: true,
      },
      {
        id: 'loud',
        when: (t) => isBoldOrOrnate(t),
        text: 'It is lovely. It is also rather loud. My guests would look at the rug before they looked at me.',
        honest: 'Thank you for not pretending otherwise. Most men here would tell me it is quiet as a mosque.',
        facts: 'The weave may be fine. The rug is still shouting.',
        factsWorks: false,
      },
      {
        id: 'ivory',
        when: (t) => t.traits.includes('lightField'),
        text: 'An ivory ground in a receiving room. The girls will be beating it every week.',
        honest: 'Yes. That is the honest answer. I will think about where it could go.',
        facts: 'A fine drawing does not stop footprints.',
        factsWorks: false,
      },
      {
        id: 'price',
        when: () => true,
        text: 'It suits the room. I only wonder whether it suits the price.',
        honest: 'You are candid. I like that better than flattery.',
        facts: 'Well. The work is good, I will give you that.',
        factsWorks: true,
      },
    ],
    commission: {
      traits: ['restrained', 'no bold colour'],
      label: 'A quieter rug for Samira\'s sister',
      bonus: 300,
      wants: (t) => t.traits.includes('restrained') && !t.traits.includes('bold'),
    },
    lines: {
      arrival: [
        'Samira steps out of the sun and lowers her parasol.',
        'Samira comes in from the lane, glancing at the rugs before she looks at you.',
      ],
      greeting: [
        'Good morning. I have been told this corner keeps better rugs than it looks.',
        'Good day. I will not take much of your time, if you will not waste mine.',
      ],
      repeat: [
        'You are still here. Good. I was afraid the landlord would have taken the corner back.',
        'I came back, you see. That is either a compliment or a warning.',
        'Good morning. Do not look so surprised. I told you I would return if the first one behaved.',
      ],
      room: [
        'I am furnishing a receiving room. I want something beautiful, but not something that announces its price before its taste.',
        'It is a receiving room with tall windows and dark wood. Everything in it is quiet. The rug must agree with that.',
      ],
      drawnTo: [
        'I like things that have come from somewhere. A rug should have a past, and it should be true.',
        'I like a rug that makes a guest ask about it. Not one that answers the question before it is asked.',
      ],
      budgetEarly: [
        'You ask what I will spend before you know what I want? That is how a hotel buys rugs.',
      ],
      budgetLate: [
        'For the right piece I would go to perhaps ten pounds. For the wrong one, nothing at all.',
      ],
      decider: [
        'My husband signs the cheques. I choose what is on the floor. We are both content with that arrangement.',
      ],
      smallTalk: [
        'It is hot, yes. It was hot yesterday also. Shall we talk about rugs?',
        'Your cat seems to own the stall. I suspect she chooses the stock.',
      ],
      tea: ['Thank you. Mint, not too sweet. You remembered, or you guessed well.'],
      earlyPresent: [
        'You are showing me rugs before you know what I need. Is that how you sell in Giza?',
      ],
      rugGood: [
        'Now that is interesting. Let me see it properly.',
        'Yes. This one has manners.',
      ],
      rugNeutral: ['It is a good rug. I am not yet sure it is my rug.', 'Hmm. Show me the corner.'],
      rugBad: ['No. I can see why someone would want it. It is not me.', 'That is a rug for a hotel lobby.'],
      colour: {
        indigo: 'The blue is deep without being dark. That would sit well with the wood.',
        crimson: 'So much red. It would be the loudest thing in the room.',
        ivory: 'Pale grounds are elegant, but they are a great deal of work.',
        gold: 'Straw colours. Cheerful. Perhaps a little plain for a receiving room.',
        mixed: 'The colours argue with each other a little.',
      },
      condition: {
        dirty: 'It needs a wash. You are selling me the dust as well?',
        worn: 'The pile is low along one side. It has had a long life already.',
        damaged: 'There is damage in the corner. I can see it from here.',
      },
      story: {
        good: [
          'A caravan sign. A place to rest. That is exactly what a receiving room is for.',
          'That is a story I could tell at dinner without sounding like I am boasting.',
        ],
        flat: ['A pleasant story. Every rug in this lane has one.', 'Hmm. I was hoping for something truer.'],
      },
      craft: {
        good: ['Yes, I can see the knots. You know your trade.'],
        flat: ['I am sure the knots are very fine. I will not be counting them.', 'You sound like a dealer\'s catalogue.'],
      },
      fit: {
        good: ['Yes. Against dark wood and tall windows, I can see it.', 'You listened. That is rarer than silk in this market.'],
        flat: ['I am not sure it would be quiet enough.', 'You are describing a different room from mine.'],
      },
      durability: {
        good: ['Good. I do not want to buy another in five years.'],
        flat: ['It will last, yes. So would a stone floor. That is not why one buys a rug.'],
      },
      repeatArg: ['You have told me that already.', 'Yes, yes. You said so.'],
      embellishBelieved: ['A pasha\'s house. Well. That would amuse my mother-in-law.'],
      embellishCaught: [
        'A pasha\'s house? A moment ago you had no papers at all. Which is it?',
        'You have just told me two different histories. I will believe neither.',
      ],
      priceLow: ['Done. Quickly, before you change your mind.', 'That is fair. More than fair.'],
      priceFair: ['That is reasonable. I accept.', 'Very well. We have an agreement.'],
      priceHigh: ['That is a Garden City price, and I am standing in Giza.', 'No. That is too much for what it is.'],
      priceInsult: ['Now you are testing me. I did not come here to be tested.', 'I think the sun has reached your head.'],
      counter: ['I will give you {price}. That is a real offer.', '{price}, and I will not pretend it hurts me.', 'Let us say {price}.'],
      holdGive: ['You are stubborn. Good. {price}, then, and not a piastre more.'],
      holdRefuse: ['Holding firm is not the same as being right.', 'Then we are both standing still.'],
      sweetener: ['Delivered to the house and the fringe washed? That makes a difference.'],
      impatience: ['I have another appointment at noon.', 'Let us come to it, please.'],
      success: [
        'Send it to the house on Sharia Qasr el-Nil by the afternoon. You have done well.',
        'Good. It will be the first thing in that room I have not had to argue with.',
      ],
      badSale: ['I bought it. I am not certain why.'],
      walkAway: [
        'No. Thank you for your time, but no.',
        'I think I will look elsewhere today.',
      ],
      saffron: ['Your cat is sitting on the one I wanted to see. She has taste.'],
      commission: [
        'My sister is furnishing her study and asked me who sold me that rug. She wants something quieter still. Keep an eye out for her.',
      ],
      commissionDone: ['That is exactly what she needs. She will be delighted. So will I, for being right.'],
      referral: ['I have told two friends about your corner. Behave yourself.'],
      rare: ['That is not a Giza rug. Where did you find it?'],
      embellishLater: [
        'My cousin knows the old families. He says no pasha ever owned that rug. I would have liked the truth better.',
      ],
      previousRug: [
        'The rug you sold me worked beautifully in the receiving room. My sister is now looking for something quieter.',
        'The {rug} has settled in. Guests ask about it, which is exactly right.',
      ],
      concession: ['That is a start.'],
      catPet: ['She is very sure of herself, your cat.'],
    },
  },

  yusuf: {
    id: 'yusuf',
    name: 'Yusuf',
    role: 'Owns the Hotel Nefertari near the station',
    bio: 'Fourteen rooms, one lobby, a ledger he reads every night.',
    budget: [250, 550],
    patience: 70,
    trust: 50,
    interest: 30,
    values: { hardwearing: 3, washable: 2, darkField: 2, humble: 1, flatweave: 1, soft: 1, lightField: -2, silk: -3, fragile: -3, fineWeave: -1, ornate: -1, antique: -1 },
    colourPref: { crimson: 1, indigo: 1, ivory: -2, gold: 0, mixed: 0 },
    args: { story: -1, craft: 0.5, fit: 1, durability: 2.5 },
    priorities: {
      room: [{ id: 'durability', label: 'Durability' }, { id: 'cleaning', label: 'Easy cleaning' }],
      drawn: [{ id: 'cost', label: 'Cost per year' }, { id: 'commercial', label: 'Looks good to guests' }],
    },
    directBudgetTrust: 4,
    pushyTrust: -2,
    embellishNotice: 0.1,
    catAffinity: -1,
    needs: [
      {
        id: 'rooms',
        label: 'Cheap washable rugs for the guest rooms',
        room: [
          'Fourteen guest rooms upstairs. I need something cheap that the girls can wash in the courtyard every week. No one steals a cheap rug.',
        ],
        values: { washable: 3, flatweave: 2, humble: 2, hardwearing: 1, fineWeave: -2, silk: -3, antique: -2, ornate: -2 },
        colourPref: { gold: 1, crimson: 0, indigo: 0, ivory: -1, mixed: 0 },
        budget: [80, 250],
        priorities: [{ id: 'durability', label: 'Washable' }, { id: 'cleaning', label: 'Cheap' }],
      },
      {
        id: 'terrace',
        label: 'Something bold for the café terrace',
        room: [
          'The café terrace. The tourists sit there and write postcards. I want something red and loud that looks like Egypt to a man from Manchester, and survives the sun.',
        ],
        values: { bold: 3, warm: 2, hardwearing: 2, story: 1, restrained: -2, fragile: -3, silk: -2, lightField: -1 },
        colourPref: { crimson: 3, gold: 1, indigo: 0, ivory: -2, mixed: 1 },
        budget: [300, 700],
        priorities: [{ id: 'durability', label: 'Bold colour' }, { id: 'cleaning', label: 'Survives sun' }],
      },
    ],
    silhouette: 'fez',
    accent: '#5b4a2e',
    objections: [
      {
        id: 'silk',
        when: (t) => t.traits.includes('silk') || t.traits.includes('fragile'),
        text: 'Silk. In a hotel. You want me to put a rope around it and charge admission?',
        honest: 'At least you admit it. Show me something my guests can drag a trunk over.',
        facts: 'Fine knots. Fine. The porter will still ruin it in a month.',
        factsWorks: false,
      },
      {
        id: 'light',
        when: (t) => t.traits.includes('lightField'),
        text: 'Pale ground? My guests come off the Alexandria train. By noon this is brown.',
        honest: 'Right. So we agree. Unless the price reflects the washing.',
        facts: 'You can talk about knots all day. Dust does not listen.',
        factsWorks: false,
      },
      {
        id: 'dirty',
        when: (_t, i) => i.condition === 'Dirty' || i.condition === 'Damaged',
        text: 'It is filthy. I will have to pay a boy to wash it before a guest sees it.',
        honest: 'Good. Then that comes off the price.',
        facts: 'Sound underneath, you say. My boy will find out.',
        factsWorks: true,
      },
      {
        id: 'cost',
        when: () => true,
        text: 'It is a rug. It goes on a floor. What I care about is what it costs me each year it lies there.',
        honest: 'Good. A man who knows what he is selling.',
        facts: 'Ten years, you say. At that price, that is fair. Maybe.',
        factsWorks: true,
      },
    ],
    commission: {
      traits: ['hard-wearing', 'dark ground'],
      label: 'A corridor rug for the Nefertari',
      bonus: 150,
      wants: (t) => t.traits.includes('hardwearing') && (t.traits.includes('darkField') || t.traits.includes('washable')),
    },
    lines: {
      arrival: ['Yusuf comes in fast, checking his watch, a tram ticket still in his hand.', 'Yusuf arrives, wiping his forehead with a folded handkerchief.'],
      greeting: ['I have a hotel to run. Show me something useful.', 'Morning. I need a rug, not a sermon.'],
      repeat: ['Back again. The last one is still in one piece, so here I am.', 'Morning. Do not start with tea. Start with prices.'],
      room: [
        'The lobby. Eighty people a day, trunks, porters, boots from the station. It needs to survive.',
        'It goes in front of the reception desk. Every guest stands on it with luggage.',
      ],
      drawnTo: [
        'What does it cost me per year? That is what I care about. And that it looks decent to a Frenchman.',
        'Something that does not look cheap and is not expensive. That is the whole trick of the hotel business.',
      ],
      budgetEarly: ['Straight to it. Good. Not more than five pounds. Less if you are sensible.'],
      budgetLate: ['I told my wife five pounds. She told me four. We will see.'],
      decider: ['I decide. My wife complains afterwards. That is the system.'],
      smallTalk: ['Yes, the heat. It is Egypt. Can we skip the weather?', 'Business? Slow until the winter season. Then mad.'],
      tea: ['Tea? Quickly then. Thank you.'],
      earlyPresent: ['You have not asked what I need it for. Fine, show me.'],
      rugGood: ['That is more like it. Thick. Dark. Let me feel it.', 'Now we are talking.'],
      rugNeutral: ['Maybe. Turn it over.', 'It is a rug. Tell me why it is my rug.'],
      rugBad: ['No. That is for a lady\'s parlour.', 'For a hotel? Do not waste my time.'],
      colour: {
        indigo: 'Dark blue. Good. Hides everything.',
        crimson: 'Red is fine. Red looks rich and hides wine.',
        ivory: 'Pale? You have seen my lobby?',
        gold: 'Light colours. The dust will love it.',
        mixed: 'Busy pattern. That hides stains, at least.',
      },
      condition: { dirty: 'It is dirty. That comes off the price.', worn: 'It is already worn. So it will wear faster.', damaged: 'There is a hole. You want me to pay for the hole?' },
      story: {
        good: ['Hm. The guests like a story. Go on, but quickly.'],
        flat: ['Very nice. My guests will not ask where it came from. They will ask where the lift is.', 'I do not pay for stories.'],
      },
      craft: {
        good: ['Tight knots. Good. That means it holds.'],
        flat: ['Fine work. Fine work costs money.'],
      },
      fit: {
        good: ['In front of the desk. Yes, I can see it there.', 'It would make the lobby look like a better hotel. That is worth money.'],
        flat: ['Not for my lobby. Maybe for my wife.'],
      },
      durability: {
        good: ['That is what I want to hear. Boots, trunks, the lot?', 'Beat clean in ten minutes? That saves me a boy\'s wage.'],
        flat: ['You say that. They all say that.'],
      },
      repeatArg: ['You said. I heard you.', 'Yes, yes. The price?'],
      embellishBelieved: ['A pasha. Good, I will tell the French. They pay extra for pashas.'],
      embellishCaught: ['A pasha? You said you had no papers. Do not try that with me.'],
      priceLow: ['Done. Wrap it before you wake up.', 'Sold. You will never be rich like that, but sold.'],
      priceFair: ['Fine. That is a fair price. Done.', 'All right. Done.'],
      priceHigh: ['Too much. Much too much.', 'For a floor? No.'],
      priceInsult: ['You think I am a tourist? I have lived in Cairo forty years.', 'Ha. No. Next.'],
      counter: ['{price}. Cash, today.', 'I will pay {price}. That is the offer.', '{price}, and I will send guests your way.'],
      holdGive: ['Stubborn. All right, {price}. But you deliver.'],
      holdRefuse: ['Then keep it. I can wait longer than you.', 'You hold, I hold. Nobody eats.'],
      sweetener: ['Delivered to the station road, today? Good, that saves me a porter.'],
      impatience: ['I have a train of guests at two.', 'Come on, come on.'],
      success: ['Done. Have it at the Nefertari by four o\'clock. Ask for Yusuf.', 'Good. If it lasts, I will be back.'],
      badSale: ['Fine. I bought it. If it falls apart, I know where you sit.'],
      walkAway: ['No. I will find one at the Khan.', 'Waste of a morning. Good day.'],
      saffron: ['The cat is on it. Cat hair. On a hotel rug. No.'],
      commission: ['The corridor upstairs needs a runner. Hard-wearing, dark. Find me one and there is a bonus in it.'],
      commissionDone: ['That will do for the corridor. Here, the bonus. I keep my word.'],
      referral: ['I sent a German couple your way. Do not frighten them.'],
      rare: ['That looks expensive. Why are you showing me expensive?'],
      embellishLater: ['A guest from Istanbul laughed at that "pasha rug". Laughed. In my lobby.'],
      previousRug: ['The {rug} is holding up. Porters drag trunks over it every day.', 'The last one is still in one piece. So here I am.'],
      concession: ['Now you are speaking my language.'],
      catPet: ['Can you keep the cat off the stock?'],
    },
  },

  mariam: {
    id: 'mariam',
    name: 'Mariam',
    role: 'Newly married, setting up a flat in Shubra',
    bio: 'Married in the spring to Karim, a telegraph clerk. Their first home.',
    budget: [150, 350],
    patience: 56,
    trust: 40,
    interest: 40,
    values: { warm: 3, soft: 2, story: 1, humble: 1, hardwearing: 1, wool: 1, fragile: -2, silk: -1, cool: -1, ornate: -1 },
    colourPref: { crimson: 2, gold: 1, indigo: 0, ivory: -1, mixed: 0 },
    args: { story: 1.5, craft: 0, fit: 1.5, durability: 1 },
    priorities: {
      room: [{ id: 'warmth', label: 'Warmth' }, { id: 'longterm', label: 'A home to grow into' }],
      drawn: [{ id: 'feeling', label: 'How it feels' }, { id: 'gentle', label: 'No hard selling' }],
    },
    directBudgetTrust: -2,
    pushyTrust: -12,
    embellishNotice: 0.15,
    catAffinity: 2,
    needs: [
      {
        id: 'mother',
        label: 'A quiet blue rug for her mother-in-law\'s room',
        room: [
          'Karim\'s mother is coming to live with us. She wants her room quiet and blue, like her house in Tanta. I want her to feel welcome.',
        ],
        values: { restrained: 2, cool: 2, soft: 1, wool: 1, darkField: 1, bold: -2, silk: -1, fragile: -1 },
        colourPref: { indigo: 3, ivory: 0, crimson: -1, gold: 0, mixed: 0 },
        budget: [250, 550],
        priorities: [{ id: 'warmth', label: 'Quiet blue' }, { id: 'longterm', label: 'Welcoming' }],
      },
      {
        id: 'corner',
        label: 'A small soft piece for a corner of the bedroom',
        room: [
          'This is only for a corner of the bedroom. Something soft to stand on in the morning. Something I can wash.',
        ],
        values: { soft: 3, washable: 2, warm: 1, humble: 1, fragile: -3, silk: -2, ornate: -1 },
        colourPref: { crimson: 1, gold: 2, indigo: 0, ivory: -1, mixed: 0 },
        budget: [40, 120],
        priorities: [{ id: 'warmth', label: 'Soft' }, { id: 'longterm', label: 'Washable' }],
      },
    ],
    silhouette: 'scarf',
    accent: '#7a5a2a',
    objections: [
      {
        id: 'precious',
        when: (t) => t.traits.includes('silk') || t.traits.includes('fragile'),
        text: 'It is so beautiful I would be afraid to walk on it. We hope for children one day, God willing.',
        honest: 'Thank you for saying so. I would have bought it and been frightened of it forever.',
        facts: 'I believe you. I would still be frightened of it.',
        factsWorks: false,
      },
      {
        id: 'cold',
        when: (t) => t.traits.includes('cool') || t.colourFamily === 'ivory',
        text: 'It feels a little cold. Like a room where nobody sits.',
        honest: 'Yes. I think I want a warmer one.',
        facts: 'Perhaps in a bigger room it would feel warmer.',
        factsWorks: false,
      },
      {
        id: 'dirty',
        when: (_t, i) => i.condition === 'Dirty' || i.condition === 'Worn' || i.condition === 'Damaged',
        text: 'It looks a little tired. Will it clean?',
        honest: 'I can wash things. I just did not want to be fooled.',
        facts: 'Oh, good. Then I can make it new again myself.',
        factsWorks: true,
      },
      {
        id: 'money',
        when: () => true,
        text: 'Karim gave me an amount. This is more than we planned. I am sorry.',
        honest: 'You are kind to say that. Let me think.',
        facts: 'I know it is worth it. It is only that we are just starting.',
        factsWorks: true,
      },
    ],
    lines: {
      arrival: ['Mariam hesitates at the edge of the stall, holding a small cloth purse.', 'Mariam comes in shyly, smiling at the cat first.'],
      greeting: ['Good morning. I am only looking. Is that all right?', 'Peace be upon you. My aunt said you are honest.'],
      repeat: ['It is me again. Karim says hello.', 'Good morning. I have been thinking about your rugs all week.'],
      room: [
        'It is our first home. Two rooms in Shubra, and a balcony. The floor is cold tile, and in winter it is very cold.',
        'It is for the main room. We sit there in the evenings. I want it to feel like a home, not a waiting room.',
      ],
      drawnTo: [
        'I want something that feels warm when I come home. Something we will still have when we are old.',
        'Please do not push me. I buy things when they feel right.',
      ],
      budgetEarly: ['Oh. Karim gave me an amount. It is not very large. Perhaps three pounds, a little more.'],
      budgetLate: ['I could perhaps go to three pounds fifty. Karim will sigh, but he will understand.'],
      decider: ['Karim said I should choose. He said he would only buy something brown.'],
      smallTalk: ['We were married in April. It still feels new.', 'Your cat is lovely. What is her name? Saffron. That suits her.'],
      tea: ['Oh, thank you. You are very kind.'],
      earlyPresent: ['Oh. You want to show me already? Wait, I have not said what I need.'],
      rugGood: ['Oh. Oh, that is lovely.', 'May I touch it? It feels like a home.'],
      rugNeutral: ['It is nice. I am not sure.', 'Hmm. I do not know.'],
      rugBad: ['It is very grand. It is not for two rooms in Shubra.', 'I do not think this is for us.'],
      colour: {
        indigo: 'Blue is calm. Maybe a little cool for our room.',
        crimson: 'Red. Warm red. Like my grandmother\'s house.',
        ivory: 'Very pale. It would be hard to keep clean.',
        gold: 'It looks like sunlight. That is nice.',
        mixed: 'So many colours.',
      },
      condition: { dirty: 'It needs a wash, I think.', worn: 'It has been loved already.', damaged: 'Oh, there is a tear.' },
      story: {
        good: ['Women wove it to keep warm in winter? That makes me like it more.', 'It has come such a long way. Now it can rest.'],
        flat: ['That is interesting.', 'I see.'],
      },
      craft: { good: ['You know so much about it.'], flat: ['I do not really understand knots. I am sorry.'] },
      fit: {
        good: ['On the cold tile, in the evenings. Yes. I can see us there.', 'You remembered about the tile. Thank you.'],
        flat: ['I am not sure it is for our room.'],
      },
      durability: {
        good: ['It will last? Good. I want to keep it forever.'],
        flat: ['I suppose it will last.'],
      },
      repeatArg: ['Yes, you told me.', 'I remember.'],
      embellishBelieved: ['A pasha\'s house! Karim will not believe me.'],
      embellishCaught: ['But you said before you did not know where it was from. I do not understand.'],
      priceLow: ['Oh! Really? Thank you. Thank you.', 'That is so kind. Yes.'],
      priceFair: ['Yes. I think that is fair. Yes.', 'All right. Yes. I will take it.'],
      priceHigh: ['Oh. That is more than I have.', 'I am sorry, that is too much for us.'],
      priceInsult: ['Oh. I did not think you would say that.', 'I think I should go.'],
      counter: ['Could it be {price}? I am sorry to ask.', 'I have {price}. Is that enough?', 'Would you take {price}?'],
      holdGive: ['All right. {price}. I will explain it to Karim.'],
      holdRefuse: ['Please. I cannot.', 'I am sorry. I really cannot.'],
      sweetener: ['You would bring it to Shubra? We have no cart. Thank you.'],
      impatience: ['I should be home before Karim.', 'I am sorry, I must go soon.'],
      success: ['Karim will be so happy. Thank you, truly.', 'Our first real rug. I will remember this day.'],
      badSale: ['I bought it. I think I was too shy to say no.'],
      walkAway: ['I am sorry. Maybe another day.', 'Thank you for your time. I should go.'],
      saffron: ['Oh, she is sleeping on it! Do not wake her. She looks so comfortable.'],
      commission: [],
      commissionDone: [],
      referral: ['My aunt Hoda wants to visit you. I told her you were gentle with me.'],
      rare: ['That one is too fine for me. But it is beautiful.'],
      embellishLater: ['Karim\'s uncle says that rug was not from a pasha. I defended you. Was I wrong?'],
      previousRug: ['The {rug} is in our main room. Karim sits on it and reads the paper.', 'The rug makes the flat feel like ours. Karim says thank you.'],
      concession: ['Oh. That is kind of you.'],
      catPet: ['Oh, she is so sweet!'],
    },
  },
};

Object.assign(BUYERS, { nabil: NABIL, cohen: COHEN }, ROYALS, MORE_BUYERS, BUYERS_3A, BUYERS_3B, BUYERS_3C, BUYERS_3D, CELEBS_1, CELEBS_2, CELEBS_3, CELEBS_4);
/** The rug tiers each buyer shops in (1 Common … 4 Legendary). Below the range they are not interested. */
export const BUYER_TIERS: Record<string, [number, number]> = { samira: [1, 2], yusuf: [1, 2], mariam: [1, 1], hassan: [1, 1], whitcombe: [1, 2], kasparian: [2, 2], benakis: [2, 3], nabil: NABIL_TIERS, cohen: COHEN_TIERS, ...BUYERS_3A_TIERS, ...BUYERS_3B_TIERS, ...BUYERS_3C_TIERS, ...BUYERS_3D_TIERS, ...CELEBS_1_TIERS, ...CELEBS_2_TIERS, ...CELEBS_3_TIERS, ...CELEBS_4_TIERS };
/** Famous people of 1925 who drop in now and then once your name is known. */
export const CELEB_INFO = { ...CELEBS_1_INFO, ...CELEBS_2_INFO, ...CELEBS_3_INFO, ...CELEBS_4_INFO };
export const CELEB_IDS = Object.keys(CELEB_INFO);
/** Reputation a celebrity needs before they will visit. */
export const celebUnlock = (id: string) => ({ FINE: 8, EXCEPTIONAL: 18, LEGENDARY: 32 } as const)[CELEB_INFO[id as keyof typeof CELEB_INFO].prestige];

export const BUYER_ORDER = ['samira', 'yusuf', 'mariam', 'hassan', 'whitcombe', 'salem', 'kasparian', 'levy', 'antonios', 'benakis', 'wasif', 'martel', 'rustam', 'hollister', 'shivakiar'];
export { BUYER_UNLOCK };
