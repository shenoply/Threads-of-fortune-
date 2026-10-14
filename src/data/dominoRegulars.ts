// The dominoes regulars: one man in a coffee house of each big town who will always play a hand. Beat him
// and he talks: a price he has heard, a dealer to watch, a road to keep off. Play him often and he
// becomes a friend, and a friend tells you even when you lose.

export interface Regular {
  id: string;
  /** the town (settlement id) */
  town: string;
  name: string;
  /** who he is, in a few words */
  who: string;
  /** the coffee house */
  place: string;
  /** said as you sit down */
  hello: string;
  /** when he wins, and when he loses */
  wins: string;
  loses: string;
  /** what he knows of the trade and the roads, given out one at a time */
  talk: string[];
  /** the towns whose prices he hears about (his own first) */
  hears: string[];
}

export const REGULARS: Record<string, Regular> = {
  tawfiq: {
    id: 'tawfiq', town: 'giza', name: 'Tawfiq', who: 'drove the Pyramids tram for twenty years', place: "Bilgin's coffee house",
    hello: '"Sit, sit. The tram never waited for me, so I wait for nobody either. Shuffle."',
    wins: '"Twenty years on the tram, my friend. I can count a hand faster than a fare."',
    loses: '"You have quick fingers. Bilgin, another tea, I am being robbed."',
    talk: [
      'The porters at the Mena House sell the guests\' old rugs to a man in the Khan for half, and he sells them back to the next guests on Monday.',
      'A cart was turned over on the Pyramids road after dark last week. The Mena House has asked for a policeman at the bridge.',
      'The Americans off the Nile boats pay whatever is asked on the first day. By the third day they have learned to say no.',
    ],
    hears: ['giza', 'cairo'],
  },
  sayyid: {
    id: 'sayyid', town: 'cairo', name: 'Sayyid', who: 'a bookbinder in the Khan', place: 'Fishawi\'s, in the Khan el-Khalili',
    hello: '"A merchant who plays? Good. The students only argue about Zaghlul. Sit."',
    wins: '"I bind books all day. I know how things fit together."',
    loses: '"Well, well. The tiles do not care who binds what. Again tomorrow."',
    talk: [
      'Two brothers by the gold market dye new Anatolian rugs with tea and sell them to the hotels as old Ushaks. Look at the back before you buy from them.',
      'The dealers in the Khan pay more on a Thursday, when the cruise passengers come in from Luxor.',
      'The police have been stopping carts on the Sharia Muhammad Ali at night and asking for papers.',
    ],
    hears: ['cairo', 'alexandria', 'tanta'],
  },
  stavros: {
    id: 'stavros', town: 'alexandria', name: 'Stavros', who: 'a Greek ship\'s chandler', place: 'Athineos, at Ramleh station',
    hello: '"You play the block game? Good, sit. The cotton men only play cards and lose."',
    wins: '"In my trade you count rope by the metre and men by their debts. Tiles are easy."',
    loses: '"Bah. Your luck, my coffee. Kyrie eleison."',
    talk: [
      'A dealer in the Attarin buys rugs off the Smyrna boats with salt water in them, dries them on the roof and sells them as Persian.',
      'The customs men at the Western Harbour are opening every bale from Beirut this month. Have your papers in order.',
      'When the cotton price is up the brokers buy carpets for their new villas in Rushdy. It is up this year.',
    ],
    hears: ['alexandria', 'portsaid', 'cairo'],
  },
  khalil: {
    id: 'khalil', town: 'jerusalem', name: 'Khalil', who: 'a stone-cutter from Silwan', place: 'the coffee house inside Jaffa Gate',
    hello: '"Sit down, merchant. My hands are tired from stone. Tiles are lighter."',
    wins: '"Stone teaches patience. You have to wait for the right place."',
    loses: '"Good. You have earned your tea. I will pay for it, God help me."',
    talk: [
      'A man by the Damascus Gate sells "Bethlehem" prayer rugs. They come from a workshop in Jaffa, two hundred a month.',
      'The Jericho road is not safe after the Inn of the Good Samaritan when it is dark. Go down in the morning.',
      'The pilgrims from Russia have no money this year. The Americans have plenty, and they want anything that looks old.',
    ],
    hears: ['jerusalem', 'jaffa', 'amman'],
  },
  abusaid: {
    id: 'abusaid', town: 'damascus', name: 'Abu Sa\'id', who: 'a brocade weaver', place: 'the Nawfara, below the Umayyad Mosque',
    hello: '"Sit, sit. The storyteller is late again. We will have our own story."',
    wins: '"A weaver counts threads all day. Seven tiles are nothing."',
    loses: '"Ya salaam. You play like a Damascene. Who taught you?"',
    talk: [
      'A dealer by the Hamidiyya has German aniline reds in his "old Kurdish" rugs. Wet your thumb before you pay him.',
      'The French stop caravans at the Bab Sharqi and count every bale. They take a fee for counting.',
      'The road south through the Hauran is bad. The Druze villages are angry with the French, and a merchant is a stranger to both.',
    ],
    hears: ['damascus', 'beirut', 'aleppo'],
  },
  husnu: {
    id: 'husnu', town: 'istanbul', name: 'Hüsnü Efendi', who: 'a retired customs clerk', place: 'the Çorlulu Ali Pasha courtyard, by the Grand Bazaar',
    hello: '"Thirty years I counted other men\'s goods. Now I count tiles. Sit."',
    wins: '"I knew every trick at the customs house. The tiles have none I have not seen."',
    loses: '"Hm. Well played. Do not tell the others in the courtyard."',
    talk: [
      'Since the capital went to Angora half the old families are selling. A dealer by the Nuruosmaniye gate buys their carpets by the room, unseen.',
      'Somebody in the bazaar sells "Hereke" silks woven in Kayseri last winter. A real Hereke has the mark in the corner. Ask to see it.',
      'The gendarmes on the Anatolian road are searching carts for guns since the trouble in the east. They take their time, and they take a fee.',
    ],
    hears: ['istanbul', 'konya'],
  },
  kasim: {
    id: 'kasim', town: 'amman', name: 'Kasim', who: 'a Circassian carter', place: 'the coffee house by the Seil',
    hello: '"Sit. My mules are resting, so I am resting. One hand."',
    wins: '"A carter knows numbers. How many sacks, how many piastres, how many days."',
    loses: '"Hah! Good. My mules would have played better than me today."',
    talk: [
      'The new officials on Jabal Amman want rugs and there is no dealer here worth the name. A man with a good load would sell it in a week.',
      'The Wahhabi raiders came as far as Ziza last summer. Do not cross to the south without the Legion.',
      'The souq dealer buys from the Bedouin for nothing and sells to the British for a great deal. He will do the same to you.',
    ],
    hears: ['amman', 'jerusalem', 'damascus'],
  },
  yunus: {
    id: 'yunus', town: 'baghdad', name: 'Yunus', who: 'a boatman on the Tigris', place: 'the Shabandar, on al-Mutanabbi Street',
    hello: '"Sit down. The river is low, the boats are idle, and I am bored. Let us play."',
    wins: '"On the river you learn to read what is coming. The tiles are slower than the current."',
    loses: '"The river gives, the river takes. Today the river is yours."',
    talk: [
      'The Persian importers in the covered market keep the best Kermanshahs in the back for the English. Ask for the back room.',
      'The Nairn cars cross to Damascus in two days now, but the desert men still stop the camel caravans past Rutba.',
      'When the Lynch steamer comes up from Basra the carpet price falls for a week. Buy then, not before.',
    ],
    hears: ['baghdad'],
  },
};

/** the regular in this town's coffee house, if it has one */
export const regularIn = (town: string) => Object.values(REGULARS).find((r) => r.town === town);
