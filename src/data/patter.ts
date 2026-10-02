// The merchant's patter at the stall: the lies he can tell about a rug, the compliments he can pay a
// buyer, and how buyers answer. Each sale offers a different handful (see systems/patter.ts), so no two
// sales sound the same. {rug} is the rug's name, {buyer} the buyer's name.

export type LieKind = 'provenance' | 'origin' | 'age' | 'material' | 'rarity' | 'rival';
export type PraiseKind = 'eye' | 'home' | 'family' | 'attire' | 'standing' | 'wit' | 'fairness';

export interface LieDef {
  label: string;
  sub: string;
  /** how hard it is to check: a buyer can feel silk, but nobody can ask a dead pasha */
  risk: number;
  /** interest it buys when believed */
  gain: number;
  /** what it adds to the price they will pay when believed (share, before the cap) */
  pay: number;
  /** extra patience it costs or gives (the rival lie hurries them) */
  patience?: number;
  lines: string[];
}

export const LIES: Record<LieKind, LieDef> = {
  provenance: {
    label: 'Give it a famous owner', sub: 'Nobody can ask a dead pasha', risk: 1, gain: 12, pay: 0.06,
    lines: [
      'Between us, it came out of a pasha\'s house in Zamalek. The family would not want me to say which.',
      'This lay in the reception room of a bey in Helwan until his sons sold the house to pay his debts.',
      'A consul\'s wife bought {rug} before the war. When they were posted home, she could not bear to roll it.',
      'It comes from the harem rooms of an old Garden City palace. The women there did not walk on rubbish.',
      'The khedive\'s chamberlain had {rug} under his writing desk. You can still see where the chair stood.',
      'A cotton king from Mansoura owned it. He lost everything in 1920, but he kept this until the last week.',
      'An Armenian family brought it out of Aleppo with nothing else. It was their dowry and their savings.',
      'It came from the house of a famous singer. I promised not to say her name. You would know it.',
      'A Greek banker in Alexandria had it in his library. He said it was the only thing in the room worth reading.',
      'The old mufti\'s nephew sold it to me himself. He wept, and then he asked for more money.',
      'A French archaeologist slept on {rug} in a tent at Saqqara for three seasons. It has seen more digs than he has.',
      'It furnished a pasha\'s dahabiya on the Nile. Kings have put their feet on it, and one queen.',
      'A Turkish officer carried it from Istanbul when the sultan fell. He said it was the last thing he saved.',
      'It was in the Shepheard\'s Hotel, in a suite the manager kept for princes. They redecorated, God forgive them.',
    ],
  },
  origin: {
    label: 'Say it was woven somewhere grander', sub: 'Persia sells better than the Delta', risk: 1.15, gain: 14, pay: 0.07,
    lines: [
      'Look at the drawing. Tabriz. Nobody else draws a vine like that.',
      'It came from a workshop in Kashan. Their weavers do not go home until the light goes.',
      'This is Isfahan work, from the city of the blue mosques. You can see the mosque in the border.',
      'It is from Herat, carried west by caravan. The road alone took a year.',
      'Bukhara. The red is Bukhara red; Cairo cannot make that red.',
      'It was woven in Kerman for a merchant in Baghdad. Persian hands, Arab money: the best of both.',
      'This is old Ushak, from Anatolia. The Sultans bought from the same looms.',
      'A Caucasian village wove it, high in the mountains. The cold makes the wool thick and the women patient.',
      'Ghiordes. Look at the prayer arch. They wove these for mosques before they wove them for dealers.',
      'It is Hereke work, from the sultan\'s own workshop. The court sold off a few when the money ran out.',
      'This came out of Shiraz with the nomads. They wove it on the move, between pastures.',
      'Mahal, from the villages around Arak. The English houses in London fight over these.',
    ],
  },
  age: {
    label: 'Make it older than it is', sub: 'An old rug is worth more', risk: 1, gain: 12, pay: 0.06,
    lines: [
      '{rug} is older than my grandfather, and he died at ninety.',
      'This was woven before the canal was dug. Think of that: before the canal.',
      'It is from the time of Muhammad Ali. Nobody weaves like this any more.',
      'A hundred years at least. Look how the wool has softened; you cannot fake that.',
      'This was already old when Napoleon came. The French did not take it; they did not know what it was.',
      'My father bought it as an antique in the time of Ismail. It was old then.',
      'The dyes have mellowed the way only a century does. New rugs shout. This one speaks.',
      'It is the last of a set woven for a wedding in 1840. The marriage did not last; the rugs did.',
      'Look at the back. A hundred years of feet have polished it. You cannot buy that.',
      'It was old when the Mamluk houses were still standing. Some of them are still not standing.',
    ],
  },
  material: {
    label: 'Claim silk or vegetable dyes', sub: 'Worth a lot, and they can touch it', risk: 1.6, gain: 18, pay: 0.09,
    lines: [
      'Run your hand here. The highlights are real silk, spun in Bursa.',
      'Every colour in {rug} comes from plants: madder root, indigo, pomegranate skin. No chemicals.',
      'This is kurk wool, from the necks of spring lambs. The softest wool there is.',
      'The foundation is silk, under the wool. That is why it lies so flat.',
      'The blue is true indigo from India, not the German powder. It will never fade.',
      'The weavers used camel hair for the brown, as the old nomads did.',
      'The red is cochineal, from beetles. A pound of it costs more than a sheep.',
      'Feel the weight. That is pure wool, no cotton anywhere, from warp to fringe.',
      'There is gold thread in the border. It catches the lamp at night.',
      'The white is undyed wool from a white flock. Only one village keeps them.',
    ],
  },
  rarity: {
    label: 'Say it is one of a kind', sub: 'Hard to check, worth a little', risk: 0.6, gain: 7, pay: 0.03,
    lines: [
      'There are three like this in Egypt. I know where the other two are, and they are not for sale.',
      'The woman who wove it died last winter. There will be no more.',
      'The workshop that made {rug} closed after the war. This is the last of their stock.',
      'I have sold rugs for twenty years and I have seen this pattern twice.',
      'The dealer who sold it to me wanted it back the next day. I said no.',
      'This design was made for one family. They had the cartoon burned so nobody could copy it.',
      'You could walk every lane from here to Damascus and not find its brother.',
      'A museum in Paris has one. Theirs is not as good.',
      'I was keeping it for myself. My wife says we need the money. My wife is always right.',
      'The pattern has a fault in the corner, on purpose. Only one weaver signed her work like that.',
    ],
  },
  rival: {
    label: 'Say someone else wants it', sub: 'Hurries them along', risk: 0.8, gain: 6, pay: 0.04, patience: -6,
    lines: [
      'A French lady asked about this one this morning. She said she would come back after lunch.',
      'Kassab from round the corner offered me a price for it yesterday. I said I would think.',
      'An American from the Mena House has been here twice for it. He brings his wife tomorrow.',
      'A bey\'s secretary wants it for the new house. He is only waiting for his master to agree.',
      'I am holding it for a man from Alexandria, but he has not paid. Money talks first.',
      'The hotel at the pyramids wants a rug for the lobby. I have not shown them this one yet.',
      'A dealer from Jerusalem looked at it for an hour. He will be back; they always come back.',
      'Somebody left a deposit on it and never came back. If he does, it is his.',
      'An English major wants it for his club in London. His boat leaves Port Said on Friday.',
      'My cousin in Khan el-Khalili says he can sell it for double. My cousin also says many things.',
    ],
  },
};

export interface PraiseDef { label: string; lines: string[] }
export const PRAISE: Record<PraiseKind, PraiseDef> = {
  eye: {
    label: 'Praise their eye',
    lines: [
      'You went straight to the best rug in the stall. Most people need an hour.',
      'You look at the back of a rug before the front. Only dealers do that.',
      'Forgive me, but you have a better eye than half the dealers in this lane.',
      'You saw the fault in the corner before I did. I am almost offended.',
      'With an eye like that, you should be selling, not buying. Do not tell anyone I said so.',
      'You noticed the border. Nobody notices the border.',
    ],
  },
  home: {
    label: 'Praise their house',
    lines: [
      'I hear your house is the most beautiful on the street. A good rug deserves a good room.',
      'People speak of your rooms in this lane. I would like to be spoken of in them.',
      'A house like yours makes a rug look better than it is. Good for me.',
      'Your guests must leave and talk about your house all the way home.',
      'Somebody with your taste does not keep an ordinary house.',
      'I would give a rug away just to see it lie in a house like yours. Almost.',
    ],
  },
  family: {
    label: 'Praise their family',
    lines: [
      'Your family has a good name in Cairo. Good names buy good rugs.',
      'Your father was a man people trusted. I can see where you get it.',
      'Your children will fight over this rug one day. That is how you know it was well bought.',
      'They say your family never buys twice, because the first time is right.',
      'God keep your house full. A full house needs a strong rug.',
      'My mother used to say your family\'s door was never closed to a guest.',
    ],
  },
  attire: {
    label: 'Praise their clothes',
    lines: [
      'That is a fine coat. English cloth, Cairo tailoring: the best of both.',
      'Your tarboosh sits better than the king\'s. Do not repeat that.',
      'The colour you are wearing would sit beautifully with this red.',
      'Forgive me, but you dress like somebody who knows quality when they feel it.',
      'That ring has been in a family for a long time. I know old gold when I see it.',
      'You look like you stepped off the boat from Paris this morning.',
    ],
  },
  standing: {
    label: 'Praise their standing',
    lines: [
      'It is an honour. My stall does not see many guests of your standing.',
      'When people ask where you buy your rugs, I would like the answer to be here.',
      'A person in your position cannot be seen walking on ordinary wool.',
      'The whole lane is watching you stop at my stall. My neighbours are green.',
      'You honour my stall. I will tell my grandchildren you sat on this stool.',
      'Important people come in a hurry. You stopped anyway. I am grateful.',
    ],
  },
  wit: {
    label: 'Laugh at their joke',
    lines: [
      'Ha! You should sell rugs. You would steal all my customers.',
      'That is the best thing anyone has said in this lane all week.',
      'A buyer with a sense of humour. God is good to me today.',
      'I will tell that one to my wife. She will laugh, and then she will ask what you bought.',
      'You are sharper than you let people think. That is dangerous in a buyer.',
      'Ha. Saffron agrees with you, and she agrees with nobody.',
    ],
  },
  fairness: {
    label: 'Praise their fairness',
    lines: [
      'You bargain like an honest man. That is rarer than silk.',
      'People say you pay what a thing is worth, and not a piastre less. I believe them.',
      'With you I do not need to start high. You know a fair price when you hear it.',
      'You do not insult a merchant to save a shilling. I respect that.',
      'An honest buyer makes an honest seller. You make it easy.',
      'They told me you are fair. Now I see they were being modest for you.',
    ],
  },
};

/** what buyers say back: believed a lie, caught it, liked a compliment, shrugged, or tired of flattery */
export const REPLY = {
  believed: [
    'Is that so? Then it has had a good life.',
    'Well. That changes how I look at it.',
    'I did not know that. It shows, now that you say it.',
    'Hm. I suppose that explains the price.',
    'Really? Tell me more about it.',
    'Then it deserves a good home.',
    'I can almost see it, the way you tell it.',
    'That is a story I would tell my guests.',
    'You are lucky to have found it, then.',
    'If that is true, I am not leaving without it.',
    'My husband will want to hear that.',
    'Then I will treat it with respect.',
  ],
  caught: {
    provenance: ['A pasha\'s house? Every rug in this lane comes from a pasha\'s house.', 'I knew that family. They never owned anything like this.', 'You told my neighbour the same story last month.'],
    origin: ['That is no more Persian than I am. Look at the knots.', 'Tabriz? This came from the Delta, and not long ago.', 'I have been to Kashan. They would laugh at you.'],
    age: ['A hundred years? The dye is still bright as a new tarboosh.', 'Old? The fringe has not even been washed.', 'This was woven since the war. I am not a tourist.'],
    material: ['Silk? This is mercerised cotton. I can feel it.', 'Plant dyes do not glow like that. That is a German powder.', 'Pure wool? There is cotton in the warp; look.'],
    rarity: ['One of a kind? I saw two of them in the Mouski yesterday.', 'Last of its kind? There is a pile of them in Tanta.', 'Do not tell me stories. Tell me the price.'],
    rival: ['Then sell it to the French lady.', 'Nobody else wants it, or it would not be on the top of the pile.', 'Every merchant has an invisible buyer waiting.'],
  },
  pleased: [
    'You are kind. It is not often I hear it.',
    'Ha. Flattery, but well done.',
    'Thank you. Now I like your stall better.',
    'You know how to talk to people. I see why they come back.',
    'That is a nice thing to say. Go on, then. Show me.',
    'You have good manners, for a rug dealer.',
    'God bless you. You have made my morning.',
    'You notice things. I like that in a merchant.',
  ],
  flat: [
    'Thank you. The rugs, please.',
    'Very kind. Now, the price.',
    'Mm. I did not come to be admired.',
    'If you say so.',
    'You say that to everyone.',
    'Thank you. Shall we look at carpets?',
  ],
  annoyed: [
    'Spare me. I have heard it from every stall since the tram.',
    'Flattery does not lower prices. It raises them.',
    'I would rather you were honest than charming.',
    'Please. I am not a tourist.',
    'If I wanted compliments I would have stayed at home.',
    'Keep that for the English ladies.',
  ],
  tooMuch: [
    'Enough sugar. You will rot my teeth.',
    'Now I am worried about what you are hiding.',
    'You have praised me three times. What is wrong with the rug?',
    'A merchant who flatters this much has something to sell me.',
    'Stop, stop. Just tell me the price.',
  ],
};
