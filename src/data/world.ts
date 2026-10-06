import { VENUE_NPCS, VENUE_QUESTS } from './entertainment';
// The overworld: settlements, people to talk to, delivery work, sea passages and railways.
// Coordinates are pixels on art/map-levant.jpg (885 x 567).
import type { Trait } from '../game/types';

export type SettlementKind = 'home' | 'city' | 'town' | 'village' | 'oasis' | 'port' | 'monastery' | 'camp';

export interface Settlement {
  id: string;
  name: string;
  kind: SettlementKind;
  x: number;
  y: number;
  region: string;
  blurb: string;
  known?: boolean; // on the map from the start
  demand: Partial<Record<Trait, number>>; // local dealer pays more for these (0.1 = +10%)
  sells: { typeId: string; factor: number; minRep?: number; chance?: number }[]; // local stock as a share of dealer cost; rare pieces need reputation and turn up only some days
  people: string[];
  port?: boolean;
  rail?: boolean;
  gateway?: string; // lies beyond the map edge; this is where the road leaves the map
}

export const SETTLEMENTS: Settlement[] = [
  {
    id: 'giza', name: 'Giza', kind: 'home', x: 146.9, y: 443.7, region: 'Egypt', known: true, rail: true,
    blurb: 'Your borrowed corner in the lane below the pyramids. Tourists by day, dealers by night.',
    demand: {}, sells: [{ typeId: 'nile-reed', factor: 0.8 }], people: ['abuhamid', 'kassab'],
  },
  {
    id: 'saqqara', name: 'Saqqara', kind: 'village', x: 172.9, y: 472.5, region: 'Egypt',
    blurb: 'Mud-brick houses beside the step pyramid. Half the men dig for the Antiquities Service; the other half sell what the first half find.',
    demand: { antique: 0.15 }, sells: [{ typeId: 'delta-house', factor: 0.6 }], people: ['mansour'],
  },
  {
    id: 'fayoum', name: 'Medinet el-Fayoum', kind: 'oasis', x: 135.4, y: 490.9, region: 'Egypt', rail: true,
    blurb: 'An oasis town of water-wheels and canals. The women here weave flat reed-stripe rugs on ground looms.',
    demand: { warm: 0.1, soft: 0.1 }, sells: [{ typeId: 'fayoum-hearth', factor: 0.7 }, { typeId: 'nile-reed', factor: 0.6 }], people: ['ummsalah'],
  },
  {
    id: 'cairo', name: 'Cairo', kind: 'city', x: 214.3, y: 413.7, region: 'Egypt', known: true, rail: true,
    blurb: 'The largest city in Africa. The Khan el-Khalili, the Wikala where Rashid keeps his bales, and houses with money to spend.',
    demand: { fineWeave: 0.15, story: 0.1, ornate: 0.1 }, sells: [{ typeId: 'cairo-garden', factor: 0.9 }, { typeId: 'desert-star', factor: 0.9 }, { typeId: 'golden-palm', factor: 0.9, minRep: 20 }],
    people: ['rashid', 'hagop'],
  },
  {
    id: 'tanta', name: 'Tanta', kind: 'town', x: 227.6, y: 371.6, region: 'Egypt', rail: true,
    blurb: 'A Delta cotton town. Three times a year the moulid of Sayyid al-Badawi fills it with a million pilgrims and every trader in Egypt.',
    demand: { warm: 0.15, hardwearing: 0.1, humble: 0.1 }, sells: [{ typeId: 'tanta-courtyard', factor: 0.7 }, { typeId: 'delta-house', factor: 0.75 }], people: ['sheikhomar'],
  },
  {
    id: 'alexandria', name: 'Alexandria', kind: 'port', x: 86.4, y: 387.2, region: 'Egypt', port: true, rail: true,
    blurb: 'Greek cafés, cotton brokers and grand hotels along the Corniche. Ships leave for Jaffa, Beirut and Istanbul every week.',
    demand: { hardwearing: 0.15, bold: 0.1, washable: 0.1 }, sells: [{ typeId: 'canal-ferry-rug', factor: 0.85 }, { typeId: 'jaffa-citrus', factor: 0.95 }, { typeId: 'moroccan-ember', factor: 0.85, minRep: 10 }],
    people: ['pericles'],
  },
  {
    id: 'portsaid', name: 'Port Said', kind: 'port', x: 327.3, y: 381.4, region: 'Egypt', port: true, rail: true,
    blurb: 'The mouth of the Suez Canal. Liners stop for a day and their passengers buy anything that looks Oriental.',
    demand: { bold: 0.2, story: 0.15, ornate: 0.1 }, sells: [{ typeId: 'canal-ferry-rug', factor: 0.7 }, { typeId: 'village-kilim-canal', factor: 0.7 }], people: ['captainreed'],
  },
  {
    id: 'suez', name: 'Suez', kind: 'town', x: 341.1, y: 440.8, region: 'Egypt', rail: true,
    blurb: 'Hot, quiet and full of shipping clerks. Pilgrim boats leave from here for the Hijaz.',
    demand: { washable: 0.1 }, sells: [{ typeId: 'canal-ferry-rug', factor: 0.75 }, { typeId: 'village-kilim-canal', factor: 0.65 }], people: [],
  },
  {
    id: 'sinai', name: "St Catherine's", kind: 'monastery', x: 489.7, y: 460.9, region: 'Sinai',
    blurb: 'A walled Greek monastery at the foot of Mount Sinai. The monks keep carpets older than most kingdoms.',
    demand: { antique: 0.2, restrained: 0.1 }, sells: [], people: ['anastasios'],
  },
  {
    id: 'bedouin', name: 'Tarabin camp', kind: 'camp', x: 423.5, y: 391.8, region: 'Sinai',
    blurb: 'Black goat-hair tents in a wadi. The Tarabin weave kilims on narrow looms and trade them for sugar, cloth and news.',
    demand: { silk: -0.3 }, sells: [{ typeId: 'village-kilim-canal', factor: 0.6 }, { typeId: 'date-palm-runner', factor: 0.7 }], people: ['salim'],
  },
  {
    id: 'jaffa', rail: true, name: 'Jaffa', kind: 'port', x: 357.2, y: 315.7, region: 'Palestine', port: true,
    blurb: 'Orange groves, a crowded harbour and the road up to Jerusalem.',
    demand: { warm: 0.1, bold: 0.05 }, sells: [{ typeId: 'jaffa-citrus', factor: 0.75 }, { typeId: 'date-palm-runner', factor: 0.8 }], people: ['abuyusef'],
  },
  {
    id: 'jerusalem', rail: true, name: 'Jerusalem', kind: 'city', x: 403.3, y: 341.1, region: 'Palestine',
    blurb: 'Pilgrims, scholars, consuls and Armenian dealers in the Old City. Documented pieces sell here for more than anywhere south of Damascus.',
    demand: { story: 0.2, antique: 0.1, restrained: 0.1 }, sells: [{ typeId: 'jerusalem-stone', factor: 0.75 }, { typeId: 'cedar-caravan', factor: 0.85 }], people: ['boulos'],
  },
  {
    id: 'beirut', rail: true, name: 'Beirut', kind: 'port', x: 381.4, y: 266.2, region: 'Lebanon', port: true,
    blurb: 'A French Mandate port of silk merchants and new banks. The road over the mountains leads to Damascus.',
    demand: { silk: 0.2, fineWeave: 0.1 }, sells: [{ typeId: 'cedar-caravan', factor: 0.75 }, { typeId: 'damascus-blue', factor: 0.9, minRep: 8 }], people: ['nadia'],
  },
  {
    id: 'damascus', rail: true, name: 'Damascus', kind: 'city', x: 486.9, y: 291.0, region: 'Syria',
    blurb: 'The oldest living city. Expert dealers in the Souq al-Hamidiyya can tell a Damascus weave from a Kayseri copy across the room.',
    demand: { silk: 0.2, antique: 0.2, fineWeave: 0.15 }, sells: [{ typeId: 'damascus-blue', factor: 0.75 }, { typeId: 'aleppo-courtyard', factor: 0.9 }, { typeId: 'damascus-rose', factor: 0.85, minRep: 45, chance: 0.15 }], people: ['farid'],
  },
  {
    id: 'amman', rail: true, name: 'Amman', kind: 'town', x: 452.3, y: 339.9, region: 'Transjordan',
    blurb: 'A small town of Circassian farmers on the Hejaz Railway, now the seat of the Emir of Transjordan. His new palace is rising on the hill of Raghadan.',
    demand: { wool: 0.15, warm: 0.1, hardwearing: 0.1 }, sells: [{ typeId: 'cedar-caravan', factor: 0.8 }, { typeId: 'date-palm-runner', factor: 0.75 }], people: [],
  },
  {
    id: 'aleppo', rail: true, name: 'Aleppo', kind: 'city', x: 521.4, y: 187.3, region: 'Syria',
    blurb: 'The great covered souq of the north, where Anatolian, Persian and Arab caravans meet.',
    demand: { wool: 0.1, story: 0.1 }, sells: [{ typeId: 'aleppo-courtyard', factor: 0.75 }, { typeId: 'anatolian-hearth', factor: 0.85 }, { typeId: 'caucasus-eagle', factor: 0.85, minRep: 15 }], people: ['kevork'],
  },
  {
    id: 'konya', name: 'Konya', kind: 'town', rail: true, x: 305.4, y: 146.9, region: 'Anatolia',
    blurb: 'The city of Rumi on the Anatolian plateau. Village women bring rugs in on donkeys every market day.',
    demand: { silk: 0.1 }, sells: [{ typeId: 'anatolian-hearth', factor: 0.7 }, { typeId: 'konya-prayer-rug', factor: 0.8, minRep: 12 }], people: ['ayse'],
  },
  {
    id: 'istanbul', name: 'Istanbul', kind: 'city', rail: true, x: 167.1, y: 49.0, region: 'Anatolia', port: true,
    blurb: 'The old capital, emptied of its sultan last year. Palace households are quietly selling their carpets.',
    demand: { ornate: 0.2, silk: 0.15, antique: 0.15 }, sells: [{ typeId: 'konya-prayer-rug', factor: 0.9, minRep: 12 }, { typeId: 'golden-palm', factor: 0.85, minRep: 20 }, { typeId: 'istanbul-tulip', factor: 0.85, minRep: 50, chance: 0.2 }], people: ['selim'],
  },
  {
    id: 'ankara', name: 'Ankara', kind: 'city', rail: true, x: 345.7, y: 95.1, region: 'Anatolia',
    blurb: 'Capital of the Republic since 1923. A dusty town full of builders, ministries in borrowed houses, and the President\'s residence at Çankaya.',
    demand: { wool: 0.1, restrained: 0.1 }, sells: [{ typeId: 'anatolian-hearth', factor: 0.75 }, { typeId: 'caucasus-eagle', factor: 0.8, minRep: 15 }], people: [],
  },
  {
    id: 'baghdad', name: 'Baghdad', kind: 'city', x: 823.9, y: 266.2, region: 'Iraq',
    blurb: 'A long desert crossing east. Persian carpets come through here on their way west, cheaper than anywhere else.',
    demand: { hardwearing: 0.1 }, sells: [{ typeId: 'sapphire-night', factor: 0.8, minRep: 20 }, { typeId: 'moroccan-ember', factor: 0.9, minRep: 15 }, { typeId: 'baghdad-night', factor: 0.85, minRep: 55, chance: 0.12 }], people: ['haji'],
  },
];

// Transport links other than walking. Rail days are worked out from distance unless given.
export const RAIL_LINKS: { a: string; b: string; days?: number }[] = [
  { a: 'giza', b: 'cairo' }, { a: 'cairo', b: 'tanta' }, { a: 'tanta', b: 'alexandria' }, { a: 'giza', b: 'fayoum' },
  { a: 'cairo', b: 'suez' }, { a: 'cairo', b: 'portsaid' },
  { a: 'portsaid', b: 'jaffa' }, // across the canal at Kantara, then the Sinai line through El Arish and Gaza
  { a: 'jaffa', b: 'jerusalem' }, { a: 'jaffa', b: 'damascus' }, // via Lydda, Haifa and the Hejaz branch through Deraa
  { a: 'beirut', b: 'damascus' }, { a: 'damascus', b: 'aleppo' }, // Rayak, Homs, Hama
  { a: 'aleppo', b: 'konya', days: 2 }, { a: 'konya', b: 'istanbul', days: 2 },
  { a: 'damascus', b: 'amman', days: 1 }, // the Hejaz Railway through Deraa
  { a: 'istanbul', b: 'ankara', days: 1 }, { a: 'konya', b: 'ankara', days: 2 }, // Anatolian Railway via Eskişehir
];
// Nairn Transport Company: Cadillacs and Buicks across the desert since 1923
export const MOTOR_ROUTES: { a: string; b: string; days: number; fare: number }[] = [{ a: 'damascus', b: 'baghdad', days: 2, fare: 2500 }];

export const SEA_ROUTES: { a: string; b: string; days: number; fare: number }[] = [
  { a: 'alexandria', b: 'jaffa', days: 2, fare: 120 },
  { a: 'portsaid', b: 'jaffa', days: 1, fare: 80 },
  { a: 'alexandria', b: 'beirut', days: 3, fare: 180 },
  { a: 'jaffa', b: 'beirut', days: 1, fare: 60 },
  { a: 'alexandria', b: 'istanbul', days: 5, fare: 450 },
  { a: 'beirut', b: 'istanbul', days: 4, fare: 400 },
];

// Egyptian State Railways, 1925
export const RAIL_FARE_PER_DAY_OF_WALKING = 5;

export interface DialogueOption {
  label: string;
  next?: string;
  effects?: string[]; // 'reveal:id', 'rumour:text', 'quest:id', 'rep:n', 'cash:n', 'appraise', 'questdone:id', 'trust:rashid:n'
  requires?: string; // 'quest:id', 'questactive:id', 'questdone:id', 'has:typeId', 'hasitem:uid', 'cash:n', 'notquest:id'
}
export interface DialogueNode {
  text: string;
  options: DialogueOption[];
}
export interface Npc {
  id: string;
  name: string;
  role: string;
  look: 'fez' | 'scarf' | 'turban' | 'hat' | 'keffiyeh' | 'cowl' | 'bare';
  accent: string;
  voice: string; // voice direction for recording
  nodes: Record<string, DialogueNode>;
}

const bye = (label = 'Go in peace.'): DialogueOption => ({ label });

export const NPCS: Record<string, Npc> = {
  ...VENUE_NPCS,
  kassab: {
    id: 'kassab', name: 'Selim Kassab', role: 'The dealer with the stall next to yours', look: 'fez', accent: '#8a6a1a',
    voice: 'Smooth Cairene dealer, late thirties, oily charm, a little mocking, quick',
    nodes: {
      start: {
        text: 'Neighbour! Such a pleasure. Your father and I were almost friends, you know. Almost. Come, see my rugs. New, bright, cheap. Everything the tourists want.',
        options: [
          { label: 'Why do you tell my buyers my father sold fakes?', next: 'fakes' },
          { label: 'The lane is big enough for two.', next: 'two' },
          { label: 'Stay away from my customers.', next: 'warn' },
          bye('Good day, Selim.'),
        ],
      },
      fakes: {
        text: 'Did I say that? People hear what they want. Of course, a son would know if his father\'s rugs were real. Would he not? Perhaps take one to an expert. Perhaps in Damascus.',
        options: [bye('We will see.')],
      },
      two: {
        text: 'Big enough, yes. For a while. Customers are like pigeons, my friend. They go where the grain is.',
        options: [bye()],
      },
      warn: {
        text: 'Your customers? They have legs. They walk. If they walk to me, what can I do? Offer them tea and let them go? I am not a monk.',
        options: [{ label: 'Then I will outsell you.', effects: ['rep:0'], next: 'bet' }, bye()],
      },
      bet: {
        text: 'Ha! I like you. We will see who is still here at the end of the month.',
        options: [bye()],
      },
    },
  },
  abuhamid: {
    id: 'abuhamid', name: 'Bilgin', role: 'Keeps the coffee house at the end of your lane', look: 'bare', accent: '#2f3d2a',
    voice: 'Young Turkish coffee-house owner settled in Giza, once a chess champion in Istanbul: calm, hospitable, well connected, enjoys his own jokes',
    nodes: {
      start: {
        text: 'Sit, sit. You look like a man who sold something today, or a man who wants to. Coffee?',
        options: [
          { label: 'Where can a new man sell for more?', next: 'sellmore', effects: ['rumour:Khan el-Khalili pays a third more than Giza for a good rug. Go with a guard.'] },
          { label: 'What is the news on the lane?', next: 'news' },
          { label: 'Where can I find rugs cheaper than Rashid?', next: 'cheap' },
          { label: 'Tell me about the roads north.', next: 'roads' },
          { label: 'Where can I hire guards?', next: 'guards' },
          { label: 'They say you were a chess champion.', next: 'chess' },
          bye('Another time, Bilgin.'),
        ],
      },
      sellmore: {
        text: 'Across the river, habibi. In the Khan el-Khalili the hotel buyers pay a third more than our lane does. And Rashid will send you to Alexandria before long: that road has robbers. Take a guard from the yard, even a cheap one. Robbers count heads before they count purses.',
        options: [{ label: 'Where can I hire guards?', next: 'guards' }, bye('Thank you, Bilgin.')],
      },
      chess: {
        text: 'In Istanbul, once. I won more than I lost, and I lost to the right people. Now I play in the back corner for tea, or for a few piastres if you are brave. Come and sit when you have time.',
        options: [{ label: 'What is the news on the lane?', next: 'news' }, bye('Another time, Bilgin.')],
      },
      news: {
        text: 'A Frenchwoman came asking for "a rug with a real past". The hotel man Yusuf complains about porters. And the police moved the tourist donkeys again. Nothing changes except the prices.',
        options: [{ label: 'And the prices?', next: 'cheap' }, bye()],
      },
      cheap: {
        text: 'Go where they are woven, habibi. The women of Fayoum sell their reed rugs for almost nothing. And at Saqqara the diggers sell old things. Some of them are even old.',
        options: [
          { label: 'Where is Fayoum?', effects: ['reveal:fayoum', 'reveal:saqqara', 'rumour:Fayoum weavers sell Nile Reed flatweaves cheaply at the source.'], next: 'fayoum' },
          bye(),
        ],
      },
      fayoum: {
        text: 'Southwest, past Saqqara. A day and a half on a donkey, or take the train from Cairo. Ask for Umm Salah. Tell her Bilgin sent you and she will charge you double.',
        options: [bye('Thank you, I think.')],
      },
      roads: {
        text: 'North is the Delta and Alexandria. East past Suez is Sinai: monks, Bedouin, and men who charge a toll for the privilege of not robbing you. Past that, Palestine and Syria. Take the train where there is one. Camels are romantic only in books.',
        options: [{ label: 'Who charges the toll?', next: 'toll' }, bye()],
      },
      guards: {
        text: 'Village lads from Saqqara and Fayoum will walk with you for a few piastres, and run at the first shot. Real guards you find in Cairo and Alexandria. Bedouin riders at the Tarabin camp, if Salim likes you. And out-of-work gendarmes wander the Delta roads looking for a caravan to join. Feed them well. Hungry men go home.',
        options: [{ label: 'Thank you.', effects: ['rumour:Hire guards in Cairo and Alexandria, riders at the Tarabin camp, and look for gendarmes for hire on the Delta roads.'] }],
      },
      toll: {
        text: 'Whoever is thirsty that week. Carry a little money you do not mind losing, and speak politely. Most of them would rather talk than fight.',
        options: [bye()],
      },
    },
  },
  mansour: {
    id: 'mansour', name: 'Sheikh Mansour', role: 'Foreman of the diggers at Saqqara', look: 'turban', accent: '#7a5a2a',
    voice: 'Village elder, deep, measured, dry humour, Upper Egyptian accent',
    nodes: {
      start: {
        text: 'You are the rug man from Giza. My nephew says your cat bit him. He deserved it. What do you want in Saqqara?',
        options: [
          { label: 'I hear old rugs turn up here.', next: 'old' },
          { label: 'What do the diggers find?', next: 'dig' },
          bye(),
        ],
      },
      old: {
        text: 'Old? Some are old. Some were old last Tuesday. A man in the village takes new silk, soaks it in tea and sells it to Englishmen as "Pharaoh\'s carpet". Pharaoh did not have carpets. Buy from me what I tell you the truth about.',
        options: [
          { label: 'Then tell me the truth about what you have.', next: 'truth', effects: ['rumour:Saqqara sells silk rugs cheaply, but provenance is never better than Uncertain.'] },
          bye(),
        ],
      },
      truth: {
        text: 'I have a silk rug like the one you keep in your corner. A widow in Helwan sold it. No papers. Maybe Damascus, maybe Kayseri. The price reflects my ignorance. Look in the market.',
        options: [bye('I will look.')],
      },
      dig: {
        text: 'Tombs, pots, a cat mummy every week. The inspectors take everything with writing on it. Last month an Englishman paid for a whole camel of broken pottery. God is generous.',
        options: [{ label: 'I hear old rugs turn up here.', next: 'old' }, bye()],
      },
    },
  },
  ummsalah: {
    id: 'ummsalah', name: 'Umm Salah', role: 'Weaver, head of a family of Fayoum looms', look: 'scarf', accent: '#6f7a3c',
    voice: 'Middle-aged village woman, quick, sharp, laughs easily, strong rural accent',
    nodes: {
      start: {
        text: 'A Giza man! You people buy our rugs for nine piastres and sell them for eighty. Sit down, I want to see your face while you lie to me.',
        options: [
          { label: 'I want to buy at the source and pay fairly.', next: 'fair' },
          { label: 'Tell me how you weave them.', next: 'weave' },
          { label: 'Is there anything I can carry for you?', next: 'quest', requires: 'notquest:salah-son' },
          { label: 'Your son has the rug. He sends his love.', next: 'thanks', requires: 'questready:salah-son' },
          bye(),
        ],
      },
      fair: {
        text: 'Fairly. Hm. Buy from my looms and I will sell you the good ones, not the ones the goats slept on. Look in the market.',
        options: [bye()],
      },
      weave: {
        text: 'Ground loom, pegged in the courtyard. The green is from the reeds by the canal, the blue is indigo from Cairo, and the rest is patience. A rug a week if the children let me.',
        options: [{ label: 'Can I tell my buyers that?', next: 'story', effects: ['rumour:Nile Reed rugs are documented Fayoum work. The weaver\'s story helps with warm-hearted buyers.'] }, bye()],
      },
      story: {
        text: 'Tell them anything true. Tell them Umm Salah sends her greetings and that the rug will outlive them both.',
        options: [bye()],
      },
      quest: {
        text: 'My son Salah works at the telegraph office in Cairo. His wife is expecting. Take him this rug from my loom. Do not sell it, do not let your cat sleep on it. He will give you something for your trouble.',
        options: [
          { label: 'I will carry it to Cairo.', effects: ['quest:salah-son'] },
          bye('Not this time.'),
        ],
      },
      thanks: {
        text: 'He got it? Good. You are more honest than you look. From now on my rugs are cheaper for you. Tell nobody.',
        options: [{ label: 'Thank you, Umm Salah.', effects: ['questclaim:salah-son'] }],
      },
    },
  },
  rashid: {
    id: 'rashid', name: 'Uncle Rashid', role: 'Wholesaler at the Wikalat el-Ghuri', look: 'fez', accent: '#5b4a2e',
    voice: 'Old Cairo merchant, sixties, gruff, teasing, secretly fond, fast talker',
    nodes: {
      start: {
        text: 'You came all the way to the Wikala? Your father only came when he owed me money. Do you owe me money?',
        options: [
          { label: 'I came to see your bales myself.', next: 'bales' },
          { label: 'Tell me about my father.', next: 'father' },
          { label: 'Who buys silk in this city?', next: 'silk' },
          bye(),
        ],
      },
      bales: {
        text: 'Here I have the whole stock, not the three pieces I send to your corner. Buy here and you pay less, because there is no donkey to feed between us.',
        options: [{ label: 'Show me.', effects: ['trust:rashid:2'] }, bye()],
      },
      father: {
        text: 'He was a better talker than a merchant. He could sell sand to a Bedouin and then give the money to the Bedouin\'s daughter for her wedding. That old Fayoum rug was the last thing he bought before he stopped working. He paid too much for it and he still will not tell me why. Ask him, he changes the subject.',
        options: [{ label: 'Who would know?', next: 'who' }, bye()],
      },
      who: {
        text: 'In Damascus there is a man called Farid al-Khatib. He knows every workshop from Aleppo to Kayseri. If anyone can tell you what that rug really is, he can. It will cost you the journey and a bruise to your pride.',
        options: [{ label: 'Thank you, uncle.', effects: ['reveal:damascus', 'rumour:Farid al-Khatib in Damascus can appraise your father\'s Fayoum Hearth.'] }],
      },
      silk: {
        text: 'Old families in Heliopolis and Zamalek, and Hagop the Armenian in the Khan, who buys anything for resale. He pays little, but he pays today.',
        options: [bye()],
      },
    },
  },
  hagop: {
    id: 'hagop', name: 'Hagop Boyajian', role: 'Armenian dealer in the Khan el-Khalili', look: 'hat', accent: '#3a3f5a',
    voice: 'Armenian-Egyptian man, fifties, soft-spoken, precise, polite and very shrewd',
    nodes: {
      start: {
        text: 'Mr. Giza. I hear you sell to ladies in Garden City. I sell to dealers in Paris. Perhaps we can be useful to each other.',
        options: [
          { label: 'Would you buy my stock?', next: 'buy' },
          { label: 'I am looking for a Kashan for a client.', next: 'kashan', requires: 'notquest:hagop-kashan' },
          { label: 'I have the Kashan you asked for.', next: 'kashandone', requires: 'has:sapphire-night', },
          { label: 'Salah from the telegraph office?', next: 'salah', requires: 'questactive:salah-son' },
          bye(),
        ],
      },
      buy: {
        text: 'Anything, at a dealer\'s price. That is the local market here. I do not argue, I do not cry, I pay. When you need money more than margin, come to me.',
        options: [bye()],
      },
      kashan: {
        text: 'The reverse. I have a client in Paris who wants a Kashan, a real one, midnight blue. Find one and I pay three hundred and twenty. Rashid had one. So did a widow near the Citadel.',
        options: [{ label: 'I will look.', effects: ['quest:hagop-kashan'] }, bye()],
      },
      kashandone: {
        text: 'Let me see. Kork wool... yes. That is a real Kashan. Three hundred and twenty, as promised, and my respect, which is worth more.',
        options: [{ label: 'Done.', effects: ['questclaim:hagop-kashan'] }, bye('Not yet. I have a buyer in Garden City.')],
      },
      salah: {
        text: 'The telegraph boy? He is at the office by the Opera. Tell him Hagop says his mother is too generous.',
        options: [{ label: 'Take the rug to Salah.', effects: ['questready:salah-son', 'rumour:Salah received his mother\'s rug. Return to Umm Salah in Fayoum.'] }],
      },
    },
  },
  sheikhomar: {
    id: 'sheikhomar', name: 'Sheikh Omar', role: 'Organises the stalls at the moulid', look: 'turban', accent: '#6b3a22',
    voice: 'Big-voiced festival organiser, cheerful, loud, blesses everything',
    nodes: {
      start: {
        text: 'Welcome to Tanta, God bless you! If you come at the moulid you will sell everything you own, and your cat. The rest of the year we are farmers.',
        options: [
          { label: 'What sells at the moulid?', next: 'sells', effects: ['rumour:Tanta pays well for warm, hard-wearing rugs.'] },
          bye(),
        ],
      },
      sells: {
        text: 'Warm rugs for village houses, strong ones for tents. Nobody here wants silk. Silk is for Cairo people who have chairs.',
        options: [bye()],
      },
    },
  },
  pericles: {
    id: 'pericles', name: 'Pericles Stavrou', role: 'Greek shipping agent on the Corniche', look: 'hat', accent: '#2c3b6b',
    voice: 'Alexandrian Greek man, forties, elegant, fast, switches between charm and business',
    nodes: {
      start: {
        text: 'Kyrie, a carpet man! Everyone in Alexandria is a cotton man or a shipping man. You will be lonely. Where are you sailing?',
        options: [
          { label: 'Where do your ships go?', next: 'ships', effects: ['reveal:jaffa', 'reveal:beirut', 'reveal:istanbul'] },
          { label: 'Do you know rugs from Smyrna?', next: 'smyrna' },
          { label: 'Can I sell to the hotels here?', next: 'hotels' },
          bye(),
        ],
      },
      ships: {
        text: 'Jaffa in two days, Beirut in three, Istanbul in five if the sea is kind. Buy a passage from the harbour. Deck class is cheap and the view is free.',
        options: [bye()],
      },
      smyrna: {
        text: 'In twenty-two, when Smyrna burned, my cousins came here with nothing but the carpets they could carry. Many of those carpets are now on the floors of Egypt. If you have one with a star in the middle, it may have come on our ships.',
        options: [{ label: 'I sold one like that.', next: 'star' }, bye()],
      },
      star: {
        text: 'Then you sold a piece of somebody\'s house. I hope you sold it to someone who deserved it.',
        options: [bye()],
      },
      hotels: {
        text: 'The Ptolemy and the Corniche Palace buy hard-wearing rugs by the dozen. They pay well for dark colours that hide sand. The local market here reflects that.',
        options: [bye()],
      },
    },
  },
  captainreed: {
    id: 'captainreed', name: 'Captain Reed', role: 'Retired P&O officer, now a canal pilot', look: 'hat', accent: '#3a4a5a',
    voice: 'Englishman, sixties, clipped naval voice, kindly, a bit deaf',
    nodes: {
      start: {
        text: 'Carpets, eh? The liners stop here for six hours. Passengers want something "authentically Oriental" to prove they went east of Malta. They pay for a good yarn more than a good rug.',
        options: [
          { label: 'So a good story sells.', next: 'story', effects: ['rumour:Port Said passengers pay for bold rugs with a story.'] },
          bye('Good day, Captain.'),
        ],
      },
      story: {
        text: 'Sells like ice. Mind you, some chap sold my wife a "Pharaoh\'s prayer mat" in 1911. Made in Manchester. I still have it. It is a very good mat.',
        options: [bye()],
      },
    },
  },
  anastasios: {
    id: 'anastasios', name: 'Brother Anastasios', role: 'Librarian of the monastery', look: 'cowl', accent: '#2a2a2a',
    voice: 'Greek monk, seventies, very quiet, gentle, precise English with a Greek accent',
    nodes: {
      start: {
        text: 'You have come a long way to sell carpets to monks. We do not buy. But we remember. What do you wish to know?',
        options: [
          { label: 'How do you tell an old rug from a new one?', next: 'old', effects: ['rumour:Old dyes fade unevenly (abrash); chemical dyes fade flat. Check the back.'] },
          { label: 'Who lives out in the wadis?', next: 'wadis', effects: ['reveal:bedouin'] },
          bye(),
        ],
      },
      old: {
        text: 'Look at the back, not the front. Old wool is worn smooth by hands, not by brushes. Natural dyes change shade row by row. Chemical dyes are the same colour from end to end, like a lie told too well.',
        options: [bye('Thank you, Brother.')],
      },
      wadis: {
        text: 'The Tarabin. East of here, two days. They trade kilims for sugar and news. Bring news. They value it more than sugar.',
        options: [bye()],
      },
    },
  },
  salim: {
    id: 'salim', name: 'Salim ibn Eid', role: 'Tarabin sheikh\'s son', look: 'keffiyeh', accent: '#4a3a2a',
    voice: 'Young Bedouin man, calm, proud, dry wit, speaks slowly',
    nodes: {
      start: {
        text: 'A townsman with a cat, in the desert. My father will want to hear about this. Sit. Coffee first, business later, perhaps never.',
        options: [
          { label: 'I bring news from Cairo.', next: 'news', effects: ['rep:1'] },
          { label: 'Are the roads safe?', next: 'roads' },
          bye(),
        ],
      },
      news: {
        text: 'The English have a new high commissioner and the price of sugar went up? Then nothing has changed. Thank you, it is still news. Our weavers will trade with you as friends.',
        options: [bye()],
      },
      roads: {
        text: 'Safe for our friends. For others, there are young men with rifles and no sheep. If they stop you, say you ate with Salim ibn Eid.',
        options: [{ label: 'I will remember.', effects: ['rumour:Mention Salim ibn Eid to raiders in Sinai.'] }],
      },
    },
  },
  abuyusef: {
    id: 'abuyusef', name: 'Abu Yusef', role: 'Orange merchant at Jaffa harbour', look: 'fez', accent: '#8a5a1c',
    voice: 'Jaffa merchant, fifties, jovial, generous, loud laugh',
    nodes: {
      start: {
        text: 'Egyptian! Take an orange. Take two. In Jaffa we pay for everything in oranges. Jerusalem is up the road, you want to go up, everybody goes up.',
        options: [{ label: 'What sells in Jerusalem?', next: 'jer', effects: ['reveal:jerusalem'] }, bye()],
      },
      jer: {
        text: 'Old things with papers. The consuls and the professors want to know who made it and when. Bring a good story and the paper to prove it.',
        options: [bye()],
      },
    },
  },
  boulos: {
    id: 'boulos', name: 'Father Boulos', role: 'Armenian priest and quiet dealer in the Old City', look: 'cowl', accent: '#3a2a3a',
    voice: 'Armenian priest, sixties, warm baritone, speaks slowly and kindly',
    nodes: {
      start: {
        text: 'Peace be with you. Most dealers who come to Jerusalem want to sell to pilgrims. What do you want?',
        options: [
          { label: 'To learn what makes a rug valuable here.', next: 'value' },
          bye(),
        ],
      },
      value: {
        text: 'Truth. A documented rug here is worth a third more than the same rug with a story. People come to Jerusalem looking for true things, even when they buy carpets.',
        options: [bye('Thank you, Father.')],
      },
    },
  },
  nadia: {
    id: 'nadia', name: 'Nadia Sursock', role: 'Silk merchant\'s widow who runs the business', look: 'hat', accent: '#6a2a3a',
    voice: 'Beiruti woman, forties, sophisticated, amused, French-inflected Arabic',
    nodes: {
      start: {
        text: 'Egypt sends me a carpet seller. How charming. Silk is my family\'s business, so do not tell me anything about silk I do not already know.',
        options: [{ label: 'Then tell me about Damascus silk.', next: 'dam' }, bye()],
      },
      dam: {
        text: 'Half of what is sold as Damascus silk was woven in Kayseri for export. The other half was woven in Damascus for tourists. Only a real expert in the Hamidiyya can tell you which half you own.',
        options: [{ label: 'Who?', next: 'who' }, bye()],
      },
      who: {
        text: 'Farid al-Khatib. He is rude, slow and always right. Over the mountains, a day and a half.',
        options: [{ label: 'Thank you.', effects: ['reveal:damascus'] }],
      },
    },
  },
  farid: {
    id: 'farid', name: 'Farid al-Khatib', role: 'Antique dealer in the Souq al-Hamidiyya', look: 'fez', accent: '#2e2a22',
    voice: 'Old Damascene expert, seventies, slow, severe, few words, occasional dry kindness',
    nodes: {
      start: {
        text: 'Rashid\'s boy. Your father owed me an opinion and never came to collect it. Show me what you have. Do not tell me what it is. Tell me nothing.',
        options: [
          { label: 'Look at my father\'s old rug. (Appraisal: £0.50)', next: 'appraise', requires: 'has:fayoum-hearth' },
          { label: 'How do you judge a rug?', next: 'judge' },
          bye(),
        ],
      },
      judge: {
        text: 'I turn it over. I count. I smell it. Then I listen to the dealer lie, and I measure the lie against the rug. The rug is usually more honest.',
        options: [bye()],
      },
      appraise: {
        text: 'Hm.',
        options: [{ label: 'Pay £0.50 and wait.', effects: ['cash:-50', 'appraise'] }, bye('Perhaps not.')],
      },
    },
  },
  kevork: {
    id: 'kevork', name: 'Kevork Tashjian', role: 'Rug broker in the covered souq', look: 'hat', accent: '#3a3a2a',
    voice: 'Aleppo Armenian, fifties, energetic, bargains while he talks',
    nodes: {
      start: {
        text: 'You came from Egypt to Aleppo to buy Anatolian rugs? Smart. Here they are half what they are in Cairo. Take ten. Take twenty.',
        options: [{ label: 'Where do they come from?', next: 'from', effects: ['reveal:konya'] }, bye()],
      },
      from: {
        text: 'Konya, Kayseri, the villages in between. Go to Konya and they are cheaper still, but you ride two weeks and pay the Turkish customs. For you, Aleppo is enough.',
        options: [bye()],
      },
    },
  },
  ayse: {
    id: 'ayse', name: 'Ayşe Hanım', role: 'Collects village rugs for the Konya market', look: 'scarf', accent: '#8a2a1c',
    voice: 'Anatolian woman, fifties, practical, kind, speaks Turkish-accented Arabic',
    nodes: {
      start: {
        text: 'An Egyptian in Konya! The star rugs you sell in Giza, we make here. My sister wove the one with the caravan star. Maybe you sold it.',
        options: [{ label: 'I did. To a lady in Cairo who loves it.', next: 'love', effects: ['rep:1'] }, bye()],
      },
      love: {
        text: 'Then my sister will be pleased. Tell your lady the star means a place to rest. Buy from us and I will give you the good ones.',
        options: [bye()],
      },
    },
  },
  selim: {
    id: 'selim', name: 'Selim Bey', role: 'Former palace steward, now selling quietly', look: 'fez', accent: '#1e2a4a',
    voice: 'Ottoman gentleman, sixties, formal, melancholy, very polite Istanbul Turkish accent',
    nodes: {
      start: {
        text: 'The palace carpets? Some are in museums now, some are in my cellar, and some are on the floors of men who do not deserve them. What kind of man are you?',
        options: [{ label: 'One who sells to people who will look after them.', next: 'ok', effects: ['rep:1'] }, bye()],
      },
      ok: {
        text: 'A good answer. Come back when you have a house to sell from, not a corner. Then we will talk seriously.',
        options: [bye()],
      },
    },
  },
  haji: {
    id: 'haji', name: 'Haji Karim', role: 'Persian carpet importer', look: 'turban', accent: '#2a3a4a',
    voice: 'Persian merchant, sixties, poetic, unhurried, Persian-accented Arabic',
    nodes: {
      start: {
        text: 'You crossed the desert for carpets? The carpets cross it for you, if you wait. But since you are here, I will show you Kashans at a Baghdad price.',
        options: [bye('I am listening.')],
      },
    },
  },
};

export interface QuestDef {
  id: string;
  title: string;
  giver: string;
  desc: string;
  reward: number;
  rep: number;
  /** settlement to point a player at while the quest is 'active' (where the next step happens) */
  target?: string;
  /** settlement to point at once it turns 'ready' (a delivery leg done, back to the giver to claim),
   *  when that differs from target — most quests are a single leg and never need this */
  readyTarget?: string;
}

export const QUESTS: Record<string, QuestDef> = {
  ...VENUE_QUESTS,
  'salah-son': { id: 'salah-son', title: 'A rug for Salah', giver: 'ummsalah', desc: 'Carry Umm Salah\'s rug to her son at the Cairo telegraph office (ask Hagop in the Khan), then return to Fayoum.', reward: 100, rep: 2, target: 'cairo', readyTarget: 'fayoum' },
  'hagop-kashan': { id: 'hagop-kashan', title: 'A Kashan for Paris', giver: 'hagop', desc: 'Bring Hagop in Cairo the documented Persian rug, Sapphire Night, for his Paris client. He pays £90.', reward: 9000, rep: 1, target: 'cairo' },
};

export interface RoamingKind {
  kind: 'caravan' | 'pilgrims' | 'raiders' | 'bedouin';
  name: string;
  line: string;
}
