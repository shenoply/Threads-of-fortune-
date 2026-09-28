// Cabarets, music halls and theatres of 1925: an evening out, a contact who books the bill, carpet
// contracts for the foyer and the stairs, and, at the Qamar, a share in the house.
//
// The real venues are imaginative reconstructions; their exact rooms and fronts are not established.
// The five contacts and everyone painted on the stages are fictional. Dates: a venue with no `opens`
// is available from the game's start, which says nothing about when it was founded; `since` is only
// set where the founding year is documented. Money is in piastres, as everywhere in the store.
import type { Npc, QuestDef, DialogueOption } from './world';

// Day 1 is 10 March 1925 (see game/economy/life.ts). Computed here rather than imported, because
// life.ts imports world.ts, which registers the contacts below: importing it back would be a cycle.
const dayOf = (m: number, d: number, y: number) => Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1925, 2, 9)) / 86400000);

export interface Venue1925 {
  id: string;
  city: string;
  name: string;
  kind: 'cabaret' | 'music hall' | 'theatre' | 'nightclub';
  street: string;
  /** locked until this day; the label is what the card shows before then */
  opens?: { day: number; label: string };
  /** a documented founding, shown on the card; never invented */
  since?: string;
  history: string;
  contact: string;
  /** piastres for a table on a performance night */
  ticket: number;
  /** who is on the bill: buyers already in the game, named in the evening's caption */
  performers: string[];
  /** a fictional house company, for the nights nobody famous is on */
  company: string;
  /** the caption over the show picture */
  evening: string;
  /** which buyers you might meet at the next table */
  guests: string[];
}

export const VENUES_1925: Record<string, Venue1925> = {
  'alhambra-cairo': {
    id: 'alhambra-cairo', city: 'cairo', name: 'Alhambra Casino', kind: 'cabaret', street: 'Bab al-Bahri Street, Ezbekiyya',
    history: 'A music hall of the Ezbekiyya quarter, where Naima al-Masriyya sang through the 1920s. When it first opened its doors, nobody at the desk can tell you.',
    contact: 'farid-nassar', ticket: 40, performers: ['munira-al-mahdiyya'], company: 'the house singer and her three musicians',
    evening: 'The lamps go down, the oud finds the key, and the room stops talking.',
    guests: ['yusuf', 'benakis', 'kassab', 'whitcombe', 'kasparian'],
  },
  qamar: {
    id: 'qamar', city: 'cairo', name: 'The Qamar', kind: 'music hall', street: 'Emad al-Din Street',
    history: 'A small music hall under a copper crescent, run by Nadia Wahba, who sang here herself before she bought the lease. Good company, a tired floor, and a proprietor who knows what a carpet is worth.',
    contact: 'nadia-wahba', ticket: 30, performers: ['mohamed-abdel-wahab'], company: 'the Qamar company: a singer, an oud, a violin and a drum',
    evening: 'Nadia nods to the band from the bureau. The singer takes the middle of the little stage.',
    guests: ['samira', 'mariam', 'hassan', 'kassab', 'levy'],
  },
  'sala-santi': {
    id: 'sala-santi', city: 'cairo', name: 'Sala Santi', kind: 'music hall', street: 'Ezbekiyya Gardens',
    history: 'A concert hall on the gardens, for people who come to listen. In July 1925 the papers announced an appearance here by a young singer from the Delta, Umm Kulthum.',
    contact: 'youssef-hanna', ticket: 50, performers: ['umm-kulthum', 'mohamed-abdel-wahab'], company: 'a takht of four and a singer from the conservatoire',
    evening: 'No one moves a chair. The garden windows go dark behind the singer while she holds the note.',
    guests: ['whitcombe', 'hollister', 'benakis', 'wasif', 'levy'],
  },
  'sala-badia': {
    id: 'sala-badia', city: 'cairo', name: 'Sala Nour', kind: 'cabaret', street: 'Emad al-Din Street',
    opens: { day: dayOf(1, 1, 1926), label: 'Opens 1926' },
    history: 'Madame Nour Haddad\'s first sala: singing and short comic plays on a small stage, in a hall she has fitted out herself. The dancers came later; this is the first year.',
    contact: 'salma-farid', ticket: 40, performers: ['munira-al-mahdiyya'], company: 'the sala\'s singer and two actors',
    evening: 'A song, then a sketch about a pasha and his cook, then the song again with the room joining in.',
    guests: ['samira', 'yusuf', 'kassab', 'martel', 'rustam'],
  },
  'maxim-istanbul': {
    id: 'maxim-istanbul', city: 'istanbul', name: 'The Nightingale', kind: 'nightclub', street: 'Sıraselviler Caddesi, Taksim',
    since: 'Since 1921',
    history: 'Nikolai Orlov\'s club beneath a picture house: jazz, dancing and variety for the Pera crowd, run by a Russian who came by way of Odessa.',
    contact: 'kemal-arslan', ticket: 80, performers: [], company: 'Kemal Arslan\'s band: piano, clarinet, bass and drums',
    evening: 'The band goes into a foxtrot and two couples are up before the first bar is finished.',
    guests: ['hollister', 'whitcombe', 'martel', 'rustam', 'shivakiar'],
  },
};

export const venuesIn = (city: string) => Object.values(VENUES_1925).filter((v) => v.city === city);
export const venueOpen = (v: Venue1925, day: number) => !v.opens || day >= v.opens.day;
export const venueArt = (v: Venue1925, which: 'exterior' | 'interior' | 'show') => `art/venues/${v.id}/${which}.webp`;
export const CLOSED_DOOR = 'art/venues/closed-door.webp';

/** A share of the Qamar: what it costs, what it needs, what it pays. Piastres. */
export const QAMAR_SHARE = { cost: 2500, rep: 25, dividend: 60, quest: 'qamar-first-rug' };

const bye = (label = 'Good evening.'): DialogueOption => ({ label });

/** Carpet contracts the contacts hand out; they ride the ordinary quest effects. */
export const VENUE_QUESTS: Record<string, QuestDef> = {
  'alhambra-stairs': { id: 'alhambra-stairs', title: 'A runner for the Alhambra stairs', giver: 'farid-nassar', desc: 'Farid Nassar wants a hard-wearing runner for the stairs to the Alhambra\'s gallery. Bring him a Fine rug or better; he pays half again over its value.', reward: 300, rep: 2 },
  'qamar-first-rug': { id: 'qamar-first-rug', title: 'A rug for the Qamar\'s stage', giver: 'nadia-wahba', desc: 'Nadia Wahba wants something with colour for the front of the Qamar\'s stage. Bring her a Fine rug or better and she pays well over its value.', reward: 320, rep: 2 },
  'qamar-floor': { id: 'qamar-floor', title: 'The Qamar\'s floor', giver: 'nadia-wahba', desc: 'Now that you own a share, Nadia wants the bare boards covered: an Exceptional rug for the centre of the room, paid for from the house.', reward: 900, rep: 3 },
  'santi-foyer': { id: 'santi-foyer', title: 'Quiet for the Sala Santi foyer', giver: 'youssef-hanna', desc: 'Youssef Hanna wants a restrained, well-made rug for the foyer where the audience waits. Fine or better; the hall pays a premium for something that does not shout.', reward: 350, rep: 2 },
  'badia-opening': { id: 'badia-opening', title: 'A carpet for Sala Nour\'s opening', giver: 'salma-farid', desc: 'Salma Farid is fitting out the sala for the opening. She wants an Exceptional rug for the foyer, and she will pay double for it.', reward: 1200, rep: 4 },
  'maxim-bar': { id: 'maxim-bar', title: 'A carpet for the Nightingale\'s bar', giver: 'kemal-arslan', desc: 'Kemal Arslan wants a fine geometric rug for the bar end of the club, paid in the club\'s good money. Fine or better.', reward: 500, rep: 3 },
};

/** The five contacts. Each greets, talks about the house, offers a contract and takes the rug when you bring it. */
export const VENUE_NPCS: Record<string, Npc> = {
  'farid-nassar': {
    id: 'farid-nassar', name: 'Farid Nassar', role: 'Bookings manager, Alhambra Casino', look: 'bare', accent: '#7a2a2a',
    voice: 'Egyptian man, late fifties, measured, warm, a manager who has seen every act in Cairo',
    nodes: {
      start: {
        text: 'The carpet merchant from Giza. Sit, sit. We open at nine; until then the room is mine and the chairs are yours. What can the Alhambra do for you?',
        options: [
          { label: 'Who sings tonight?', next: 'bill' },
          { label: 'Does the house need carpets?', next: 'contract', requires: 'notquest:alhambra-stairs' },
          { label: 'I have the runner for your stairs.', next: 'deliver', requires: 'questactive:alhambra-stairs' },
          { label: 'How is the runner wearing?', next: 'after', requires: 'questdone:alhambra-stairs' },
          bye('Good evening, Farid.'),
        ],
      },
      bill: {
        text: 'Whoever the Ezbekiyya wants. Some nights a name that fills the street, most nights our own singer, who is better than half the names. Take a table and you will hear for yourself. The men at the tables buy carpets too, by the way. Rich ones.',
        options: [bye('I will take a table.')],
      },
      contract: {
        text: 'The stairs to the gallery. Three hundred pairs of feet a night, and the runner is worn to the string. Bring me something Fine that will take it, and I pay you half again over what it is worth. The Alhambra does not haggle with its suppliers.',
        options: [{ label: 'I will find you one.', effects: ['quest:alhambra-stairs'] }, bye('Not this month.')],
      },
      deliver: {
        text: 'Let me see it on the step. Yes. Yes, that will take the feet. Here is your money, and my thanks.',
        options: [{ label: 'It is yours.', effects: ['deliver:alhambra-stairs:2'], requires: 'hastier:2' }, { label: 'I do not have it with me yet.', next: 'start' }],
      },
      after: {
        text: 'Wearing like iron. The manager of the Kursaal asked me where it came from. I told him Giza, and to expect a queue.',
        options: [bye()],
      },
    },
  },
  'nadia-wahba': {
    id: 'nadia-wahba', name: 'Nadia Wahba', role: 'Proprietor of the Qamar, once its singer', look: 'bare', accent: '#4a3a5a',
    voice: 'Syrian-Egyptian woman, early forties, composed, dry, a singer\'s voice used sparingly',
    nodes: {
      start: {
        text: 'You look at my floor the way I look at a bad tenor. Good. I bought this hall with a singer\'s savings and a dealer\'s eye; the floor is what is left to fix. Sit. Tell me what you have.',
        options: [
          { label: 'Tell me about the Qamar.', next: 'house' },
          { label: 'What does the stage need?', next: 'contract', requires: 'notquest:qamar-first-rug' },
          { label: 'I have your rug for the stage.', next: 'deliver', requires: 'questactive:qamar-first-rug' },
          { label: 'About a share in the house.', next: 'share', requires: 'questdone:qamar-first-rug' },
          { label: 'The floor, then.', next: 'floor', requires: 'upgrade:qamar' },
          bye('Good evening, Nadia.'),
        ],
      },
      house: {
        text: 'Forty tables, a company of four, and a crescent I paid a coppersmith too much for. The Pera crowd comes on Thursdays; the effendis come every night and argue about cotton. The building is sound. What it lacks is capital, and carpets.',
        options: [bye('I see.')],
      },
      contract: {
        text: 'Something with colour for the front of the stage, where the lamps fall. Fine at least; the audience is close enough to count the knots. I pay above the market, and I remember who was useful.',
        options: [{ label: 'I will bring one.', effects: ['quest:qamar-first-rug'] }, bye('Another time.')],
      },
      deliver: {
        text: 'Unroll it under the lamp. Ah. That is a stage now. Take your money; the singer will thank you tonight from the middle of it.',
        options: [{ label: 'It is yours.', effects: ['deliver:qamar-first-rug:2'], requires: 'hastier:2' }, { label: 'Not with me yet.', next: 'start' }],
      },
      share: {
        text: 'I said I lacked capital. Twenty-five pounds buys a quarter share of the Qamar: a little of the door every week, a word with anyone who sits at my tables, and the floor becomes your business as much as mine. I do not offer this twice a season.',
        options: [
          { label: 'Buy a quarter share for £25.', effects: ['invest:qamar'], requires: 'notupgrade:qamar' },
          { label: 'Let me think about it.', next: 'start' },
        ],
      },
      floor: {
        text: 'Partner. The boards in the middle of the room have been bare since the Khedive. Bring me an Exceptional rug for the centre and the house pays for it, handsomely, out of the door money.',
        options: [
          { label: 'Here is the rug for the floor.', effects: ['deliver:qamar-floor:3'], requires: 'hastier:3' },
          { label: 'I will find one.', effects: ['quest:qamar-floor'], requires: 'notquest:qamar-floor' },
          bye('Soon.'),
        ],
      },
    },
  },
  'youssef-hanna': {
    id: 'youssef-hanna', name: 'Youssef Hanna', role: 'Administrator of Sala Santi', look: 'bare', accent: '#5a6a4a',
    voice: 'Egyptian man, sixties, patient, learned, a gentle joke under every sentence',
    nodes: {
      start: {
        text: 'A merchant who comes before the doors open is either very keen or very lost. The hall is for listening, you understand; we do not sell anything but the silence between the songs. How can I help you?',
        options: [
          { label: 'Who is singing this season?', next: 'bill' },
          { label: 'Does the hall need a carpet?', next: 'contract', requires: 'notquest:santi-foyer' },
          { label: 'I have the foyer rug.', next: 'deliver', requires: 'questactive:santi-foyer' },
          { label: 'How is the foyer?', next: 'after', requires: 'questdone:santi-foyer' },
          bye('Good evening, Youssef.'),
        ],
      },
      bill: {
        text: 'We announced a young woman from the Delta for July, Umm Kulthum; her father brings her, and she sings as though the hall were a mosque. Otherwise the conservatoire sends us its best, and the gardens send us their moths. Take a table. Nobody talks during the singing, so you will have to sell in the interval.',
        options: [bye('I will listen.')],
      },
      contract: {
        text: 'The foyer, where they wait. Something quiet and well made; the audience should walk on it and forget it. Fine or better, and I pay a premium for restraint, which is rarer than gold thread.',
        options: [{ label: 'I know the sort.', effects: ['quest:santi-foyer'] }, bye('Not yet.')],
      },
      deliver: {
        text: 'Lay it by the door. Nobody will notice it, which is exactly the point. Thank you. Your money, and a seat whenever you want one.',
        options: [{ label: 'It is yours.', effects: ['deliver:santi-foyer:2'], requires: 'hastier:2' }, { label: 'I do not have it with me.', next: 'start' }],
      },
      after: {
        text: 'Nobody has noticed it. A professor from the university stood on it for ten minutes discussing Ibn Khaldun and never looked down. Perfect.',
        options: [bye()],
      },
    },
  },
  'salma-farid': {
    id: 'salma-farid', name: 'Salma Farid', role: 'Front of house, Sala Nour', look: 'bare', accent: '#6a2a4a',
    voice: 'Egyptian woman, early thirties, quick, practical, cheerful, always halfway to the next task',
    nodes: {
      start: {
        text: 'Mind the paint. Madame Nour wants the sala open and perfect and I have three days and two hands. You are the carpet man from Giza? Good. Walk with me and talk fast.',
        options: [
          { label: 'What is the programme?', next: 'bill' },
          { label: 'What does the sala need?', next: 'contract', requires: 'notquest:badia-opening' },
          { label: 'I have the carpet for the opening.', next: 'deliver', requires: 'questactive:badia-opening' },
          { label: 'How was the opening?', next: 'after', requires: 'questdone:badia-opening' },
          bye('Good evening, Salma.'),
        ],
      },
      bill: {
        text: 'Singing and short plays. Madame sings herself some nights, and we have two actors who can make a pasha laugh at his own cook. Dancers? Next year, perhaps. This year we fill the room with a song.',
        options: [bye('I will come.')],
      },
      contract: {
        text: 'The foyer. Everyone who matters in Cairo will stand on it on the first night and look down before they look up. Exceptional, nothing less, and Madame pays double for it. She says a carpet is the first thing a critic sees and the last thing he forgives.',
        options: [{ label: 'I will bring the best I have.', effects: ['quest:badia-opening'] }, bye('That is a tall order.')],
      },
      deliver: {
        text: 'Unroll it, quickly, before she comes down. Oh. Oh, that is the one. Here, the money is counted; she counted it twice. Thank you. Now go before I find you a ladder.',
        options: [{ label: 'It is yours.', effects: ['deliver:badia-opening:3'], requires: 'hastier:3' }, { label: 'It is not with me.', next: 'start' }],
      },
      after: {
        text: 'Full house, two encores, and a critic from the morning paper who stood on your carpet and wrote that the sala had taste. Madame cut it out and pinned it in the office.',
        options: [bye()],
      },
    },
  },
  'kemal-arslan': {
    id: 'kemal-arslan', name: 'Kemal Arslan', role: 'Bandleader and bookings, the Nightingale', look: 'bare', accent: '#2a3a6a',
    voice: 'Turkish man, forty, poised, amused, speaks like a man counting a bar of music',
    nodes: {
      start: {
        text: 'A carpet merchant, in the Nightingale, before the band has tuned. Orlov would like you; he likes anyone who sells something at night. I am Kemal; the band is mine, the bookings are half mine. What are you selling?',
        options: [
          { label: 'What does the band play?', next: 'bill' },
          { label: 'Does the club need a carpet?', next: 'contract', requires: 'notquest:maxim-bar' },
          { label: 'I have the rug for the bar.', next: 'deliver', requires: 'questactive:maxim-bar' },
          { label: 'How is the bar?', next: 'after', requires: 'questdone:maxim-bar' },
          bye('Good evening, Kemal.'),
        ],
      },
      bill: {
        text: 'Foxtrots for the diplomats, a tango for the Russians, and after midnight whatever the clarinet feels like. The dance floor is the show. Take a table; the people at the next one have money from three countries.',
        options: [bye('I will take one.')],
      },
      contract: {
        text: 'The bar end, where the floor stops and the drinking starts. Something geometric, Fine or better, that looks well under a globe lamp at two in the morning. The club pays in good money and does not ask twice.',
        options: [{ label: 'I will find it.', effects: ['quest:maxim-bar'] }, bye('Perhaps later.')],
      },
      deliver: {
        text: 'Roll it out by the rail. Yes. Orlov will say it is too good for the bar and then stand on it all night. Your money, merchant.',
        options: [{ label: 'It is yours.', effects: ['deliver:maxim-bar:2'], requires: 'hastier:2' }, { label: 'Not with me.', next: 'start' }],
      },
      after: {
        text: 'A Romanian countess spilled champagne on it the first night and Orlov nearly threw her out. It has survived worse since. Come and hear the band.',
        options: [bye()],
      },
    },
  },
};
