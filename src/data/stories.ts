// The five stories (systems/stories.ts runs them). Each is a few beats; each beat asks you to choose, and
// the choice sets what comes next and what lasts. Fictional people; places and the times are 1925-30.
//   1. The Mamluk carpet: Selim Tannous shows a forged antique in the Muski.
//   2. A bale from Port Said: Yanni Stavrou's people want a sealed bale carried to Cairo.
//   3. Mrs Ashby's commission: a documented seventeenth-century carpet, found in time, or not.
//   4. Two weddings in the lane: Hasan and Yusuf both want the same great carpet.
//   5. The house of Antaki: an old house, ruined by the slump, offers its stock and its name.
import type { GameState } from '../game/state/store';
import type { ArcRun, Outcome, Via, Fx } from '../game/systems/stories';
import { BUYERS, BUYER_ORDER } from './buyers';
import { HOUSES, housesOf, houseName } from '../game/systems/houses';
import { eraById } from '../game/economy/era';
import { dateFor } from '../game/economy/economy';
import { fmt } from '../game/economy/money';
import { filedAs } from './renamedIds';

export interface Ctx {
  s: GameState;
  run: ArcRun;
  day: number;
  /** this tale's flags */
  f: Record<string, string | number | boolean>;
  /** flags that outlast one tale */
  g: Record<string, string | number | boolean>;
  /** what the bazaar remembers of your stories */
  marks: string[];
  /** a roll fixed by the seed, the tale and the day the beat came */
  roll: (k: string) => number;
}
export interface Choice {
  id: string;
  label: string;
  cost?: number | ((c: Ctx) => number);
  /** why it cannot be chosen now, if it cannot */
  need?: (c: Ctx) => string | undefined;
  hidden?: (c: Ctx) => boolean;
  go: (c: Ctx) => Outcome;
}
export interface Beat {
  id: string;
  via: Via;
  /** the town whose menu holds it */
  town?: string | ((c: Ctx) => string);
  /** who writes, or who stands at the stall */
  who?: string | ((c: Ctx) => string);
  /** their portrait, if they have one */
  face?: string;
  title: string | ((c: Ctx) => string);
  text: (c: Ctx) => string;
  choices: Choice[];
  /** days to answer once it has come; then `lapse` is chosen for you */
  expires?: number;
  lapse?: string;
  /** while it is on its way: a line for the Stories list */
  soon?: (c: Ctx) => string;
}
export interface Arc {
  id: string;
  title: string;
  blurb: string;
  unlock: (s: GameState, day: number) => boolean;
  first: string;
  beats: Record<string, Beat>;
  /** a deadline: the beat it turns to once passed */
  late?: (c: Ctx) => string | undefined;
}

const P = (id: string) => `art/portraits/${filedAs(id)}.jpg`;
const trading = (s: GameState, id: string) => housesOf(s).list[id]?.status === 'trading';
const hasRug = (c: Ctx, key: string) => c.s.inventory.some((r) => r.story === key);
const end = (text: string, fx: Fx[] = [], endLine?: string): Outcome => ({ text, fx, end: endLine ?? text });
const go = (text: string, next: string, wait: number, fx: Fx[] = [], flags?: Outcome['flags']): Outcome => ({ text, fx, next, wait, flags });
const short = (d: number) => dateFor(d).short;
/** someone you have not met yet, for an introduction */
const stranger = (s: GameState, k: number) => {
  const pool = BUYER_ORDER.filter((b) => (s.relationships[b]?.visits ?? 0) === 0 && !s.relationships[b]?.friendOf && !BUYERS[b]?.royal);
  return pool.length ? pool[k % pool.length] : undefined;
};

// ======================================================================================================
// 1. The Mamluk carpet
// ======================================================================================================
const MAMLUK = 'mamluk-fake';
const forgery: Arc = {
  id: 'forgery', title: 'The Mamluk carpet',
  blurb: 'Selim Tannous has an "antique" in the Muski that the whole bazaar is talking about.',
  unlock: (s, day) => day >= 30 && s.reputation >= 8 && trading(s, 'selim'),
  first: 'paper',
  beats: {
    paper: {
      id: 'paper', via: 'courier', title: 'A carpet from a sultan\'s mosque?',
      text: () => 'Selim Tannous of the Muski has on show a large carpet he calls Mamluk work of the fifteenth century, from a mosque in Old Cairo, with a deed of the mosque\'s waqf to prove it. He asks one hundred and fifty pounds. Mr Hollister of Shepheard\'s Hotel is said to be interested.',
      expires: 20, lapse: 'leave',
      choices: [
        { id: 'look', label: 'Go to the Muski and look at it yourself', go: () => go('You will look at it the next time you are in Cairo.', 'shop', 0) },
        { id: 'arran', label: 'Ask Arran what he makes of the picture in the paper', cost: 20,
          go: () => go('Arran writes back the same afternoon: "The border is right and the field is wrong. Look at the reds where the knots go in, and smell the wool." You will look at it the next time you are in Cairo.', 'shop', 0, [], { arran: true }) },
        { id: 'leave', label: 'Leave it to the Muski',
          go: () => end('You leave it alone. A week later Selim sells it to the American for his price.', [{ house: 'selim', purse: 15000, rep: 3 }], 'You left it alone, and Selim sold it to Mr Hollister for £150.') },
      ],
    },
    shop: {
      id: 'shop', via: 'town', town: 'cairo', title: 'Selim\'s Mamluk carpet, in the Muski',
      soon: () => 'The carpet is in Selim\'s shop in the Muski.',
      text: (c) => `Selim's boy unrolls it in the back of the shop. It is a big carpet: a star in the middle, cypresses and papyrus in the border, the greens and reds of the old Cairo work. ${c.f.arran ? 'You do as Arran said. The red is as bright down at the root of the knot as at the tip, where four hundred years would have faded it, and the wool smells of the chemical wash.' : 'Something is wrong with it. The red is as bright at the root of the knot as at the tip, and the back is too clean for four hundred years.'} It is Revival work from one of the shops in the Darb el-Ahmar, a few years old, washed and rubbed to look ancient. The waqf deed is real; it belongs to another carpet, long gone. Selim watches you look.`,
      expires: 40, lapse: 'quiet',
      choices: [
        { id: 'expose', label: 'Say so, to the elders of the souq and the Courier',
          go: () => go('You tell the elders of the souq what you saw, and the Courier prints it. Selim calls you a liar in the street, but the American does not buy. Reputation +3.', 'thanks', 3,
            [{ rep: 3 }, { manner: { honesty: 8 } }, { house: 'selim', mood: -3, rep: -10 }, { mark: 'exposed' }, { mem: 'hollister', m: { k: 'story', note: 'You saved him from a forged carpet', w: 2.5 } }]) },
        { id: 'buy', label: 'Buy it quietly, for less than he asks', cost: 4000,
          go: () => go('Selim takes forty pounds, looks at you a long moment, and says nothing. The carpet goes to your store in Giza, deed and all.', 'visitor', 5,
            [{ house: 'selim', purse: 4000, mood: 1 }, { rug: { typeId: 'cairo-mamluk', key: MAMLUK, paid: 4000, fakeAge: true, provenance: 'Disputed', note: 'Sold by Selim Tannous as Mamluk work of the fifteenth century, with a waqf deed that belongs to another carpet. Revival work from the Darb el-Ahmar, washed to look old.' } }]) },
        { id: 'share', label: 'Keep quiet, for a share when it sells',
          go: () => go('"A tenth when the American pays," Selim says. "You were never here." Three days later his boy brings you fifteen pounds in a twist of newspaper.', 'found', 14,
            [{ cash: 1500, label: 'A tenth of Selim\'s sale' }, { manner: { honesty: -8 } }, { house: 'selim', mood: 3, purse: 13500 }]) },
        { id: 'quiet', label: 'Walk out and say nothing', hidden: () => true,
          go: () => end('You say nothing. Selim sells it to the American.', [{ house: 'selim', purse: 15000 }], 'You said nothing, and Selim sold it to Mr Hollister.') },
      ],
    },
    thanks: {
      id: 'thanks', via: 'letter', who: 'Mr J. W. Hollister, Shepheard\'s Hotel', title: 'A hundred and fifty pounds',
      text: () => 'Sir, I am told I owe you a hundred and fifty pounds, or at least the sense not to spend them. I had my cheque written for that "Mamluk" carpet. Let me thank you in some way you will accept. I am at Shepheard\'s until the spring.',
      expires: 30, lapse: 'friends',
      choices: [
        { id: 'cheque', label: 'Accept his cheque, with thanks', go: () => end('His cheque for twenty pounds comes by the hotel\'s boy, with his card.', [{ cash: 2000, label: 'Mr Hollister\'s thanks' }], 'Exposed Selim\'s forgery. Mr Hollister sent twenty pounds in thanks.') },
        { id: 'friends', label: 'Ask him to tell his friends instead',
          go: (c) => { const f = c.s.relationships['edmund-fairburn']?.visits ? stranger(c.s, c.day) : 'edmund-fairburn'; return end(`He does better: he tells everyone at the Turf Club.${f ? ` ${BUYERS[f]?.name} will call at your stall.` : ''}`, [{ mem: 'hollister', m: { k: 'story', note: 'You saved him from a forged carpet', w: 3 } }, ...(f ? [{ appoint: f, inDays: 2, friendOf: 'hollister' } as Fx] : [])], `Exposed Selim's forgery. Mr Hollister sends his friends to you${f ? `, starting with ${BUYERS[f]?.name}` : ''}.`); } },
        { id: 'museum', label: 'Ask him to mention your name at the Arab Museum',
          go: () => end('He dines with the keeper of the Arab Museum the next week, and tells the story. A name like yours is useful at a museum.', [{ global: 'museumFriend', v: true }], 'Exposed Selim\'s forgery. The Arab Museum has heard your name.') },
      ],
    },
    visitor: {
      id: 'visitor', via: 'stall', who: 'Edmund Fairburn', face: P('edmund-fairburn'), title: 'An Englishman asks about the Mamluk carpet',
      soon: () => 'Word goes round that you have Selim\'s carpet.',
      text: (c) => hasRug(c, MAMLUK)
        ? 'Edmund Fairburn, of the Palestine government, home on leave, has heard you bought the Mamluk carpet. He wants an old carpet for his study in Jerusalem, a real one, and he has the money. "Is it what Selim said it was?" he asks.'
        : 'Edmund Fairburn, of the Palestine government, has heard you bought the Mamluk carpet. You no longer have it.',
      expires: 30, lapse: 'keep',
      choices: [
        { id: 'lie', label: 'Tell him it is fifteenth-century Mamluk, with the deed', hidden: (c) => !hasRug(c, MAMLUK),
          go: (c) => {
            const caught = c.roll('found') < 0.5;
            return go(`He pays one hundred and twenty pounds and sails for Jaffa with it.${caught ? '' : ' Nothing more is heard.'}`, caught ? 'exposed' : '', caught ? 20 : 0,
              [{ loseRug: MAMLUK }, { cash: 12000, label: 'The "Mamluk" carpet to Mr Fairburn' }, { manner: { honesty: -10 } }], { lied: true });
          } },
        { id: 'truth', label: 'Tell him it is Revival work, washed to look old', hidden: (c) => !hasRug(c, MAMLUK),
          go: () => end('He laughs, and buys it anyway as a good carpet at a fair price: thirty pounds. "At least I shall know what I am standing on."', [{ loseRug: MAMLUK }, { cash: 3000, label: 'The Revival carpet to Mr Fairburn' }, { rep: 1 }, { manner: { honesty: 5 } }, { mem: 'edmund-fairburn', m: { k: 'honest' } }], 'Bought Selim\'s fake and sold it honestly to Mr Fairburn.') },
        { id: 'keep', label: 'Keep it, and say it is not for sale',
          go: (c) => end(hasRug(c, MAMLUK) ? 'It stays in your store: a lesson in what to look for.' : 'You tell him it has gone.', [], 'Bought Selim\'s fake, and kept it.') },
      ],
    },
    exposed: {
      id: 'exposed', via: 'courier', title: 'A forged carpet in Jerusalem',
      soon: () => 'Mr Fairburn has his carpet in Jerusalem.',
      text: () => 'Mr Edmund Fairburn of the Palestine government has had his "Mamluk" carpet examined by the Department of Antiquities in Jerusalem, who say it is new work. He names the Giza dealer who sold it to him.',
      expires: 14, lapse: 'silent',
      choices: [
        { id: 'repay', label: 'Pay him back and take the carpet home', cost: 12000,
          go: () => end('You wire the money to Jerusalem; the carpet comes back by rail a fortnight later. People say at least you paid. Reputation -1.', [{ rep: -1 }, { rug: { typeId: 'cairo-mamluk', key: MAMLUK, paid: 0, fakeAge: true, provenance: 'Disputed', note: 'Sold as Mamluk, sent back from Jerusalem, and paid for twice. Revival work.' } }, { mem: 'edmund-fairburn', m: { k: 'lie' } }], 'Sold Selim\'s fake as old, were found out, and paid it back.') },
        { id: 'blame', label: 'Say the deed was Selim\'s, not yours',
          go: () => end('Nobody believes either of you. Reputation -3.', [{ rep: -3 }, { house: 'selim', mood: -2 }, { lie: true }, { mem: 'edmund-fairburn', m: { k: 'lie' } }], 'Sold Selim\'s fake as old, were found out, and blamed Selim.') },
        { id: 'silent', label: 'Say nothing',
          go: () => end('The talk goes on for a month. Reputation -4.', [{ rep: -4 }, { lie: true }, { mem: 'edmund-fairburn', m: { k: 'lie' } }], 'Sold Selim\'s fake as old, and the bazaar knows it.') },
      ],
    },
    found: {
      id: 'found', via: 'courier', title: 'Mr Hollister\'s carpet',
      soon: () => 'Selim\'s carpet is on its way to America.',
      text: () => 'An American collector has learned in London that the "Mamluk" carpet he bought from Selim Tannous of the Muski is new work. Selim says another dealer saw it before the sale and said nothing.',
      expires: 14, lapse: 'deny',
      choices: [
        { id: 'repay', label: 'Send Mr Hollister your share back, with a letter', cost: 1500,
          go: () => end('He writes back two lines: he is grateful for the honesty, late as it is. Reputation -1.', [{ rep: -1 }, { mem: 'hollister', m: { k: 'honest' } }, { manner: { honesty: 4 } }], 'Took a share of Selim\'s forgery, then paid it back.') },
        { id: 'deny', label: 'Say you never saw it',
          go: () => end('Selim\'s boy says otherwise, for a coin. Reputation -2.', [{ rep: -2 }, { lie: true }, { mem: 'hollister', m: { k: 'lie' } }], 'Took a share of Selim\'s forgery and denied it.') },
        { id: 'turn', label: 'Tell the Courier it was all Selim\'s doing',
          go: () => end('The Courier prints it. Selim is finished with you, and the bazaar thinks less of you both. Reputation -1.', [{ rep: -1 }, { house: 'selim', rep: -8, mood: -5 }], 'Took a share of Selim\'s forgery, then turned on him.') },
      ],
    },
  },
};

// ======================================================================================================
// 2. A bale from Port Said
// ======================================================================================================
const patrolOn = (c: Ctx) => Number(c.g.patrol ?? 0) >= c.day;
const carry = (c: Ctx, pay: number, fine: number, odds: number, again: boolean): Outcome => {
  const caught = c.roll(again ? 'carry2' : 'carry') < odds + (patrolOn(c) ? 0.2 : 0);
  const n = Number(c.f.carried ?? 0) + (caught ? 0 : 1);
  if (caught) return go(`A Coastguard patrol stops your load on the Canal road at Ismailia and cuts the bale open. You are fined ${fmt(fine)}, and the story is in every coffee house by the evening. Reputation -${again ? 6 : 4}.`, again ? '' : 'after', again ? 0 : 4,
    [{ cash: -fine, label: 'Fined by the Coastguard' }, { rep: again ? -6 : -4 }, { house: 'yanni', mood: -1 }, { global: 'patrol', v: c.day + 60 }], { caught: true, carried: n });
  return go(`Nobody stops you. You leave the bale at the coffee house by the Bab el-Hadid, and a boy brings ${fmt(pay)} to your stall the next morning.`, again ? '' : 'after', again ? 0 : 10,
    [{ cash: pay, label: 'For carrying a bale from Port Said' }, { house: 'yanni', mood: 3 }, ...(n >= 2 ? [{ mark: 'smuggled' } as Fx] : [])], { carried: n });
};
const bale: Arc = {
  id: 'bale', title: 'A bale from Port Said',
  blurb: 'Yanni Stavrou\'s people want a sealed bale carried to Cairo with your rugs.',
  unlock: (s, day) => day >= 70 && s.reputation >= 12 && trading(s, 'yanni'),
  first: 'offer',
  beats: {
    offer: {
      id: 'offer', via: 'stall', who: 'Stephanos, from Mr Stavrou\'s office', title: 'A man from Mr Stavrou',
      text: (c) => `A man in a good grey suit, with a Greek accent and a gold tooth, says Mr Stavrou sends his regards. ${c.marks.includes('exposed') ? '"We hear you are an honest man. That is why we come to you: nobody searches an honest man." ' : ''}He wants you to bring one sealed bale from Mr Stavrou's store in Port Said to Cairo, with your own rugs, and leave it at a coffee house by the Bab el-Hadid station. Twelve pounds for the trouble, and no questions.`,
      expires: 14, lapse: 'refuse',
      choices: [
        { id: 'agree', label: 'Agree, and fetch it from Port Said', go: () => go('"Ask at the store behind the Rue Sultan Hussein," he says, and leaves without buying anything.', 'store', 0) },
        { id: 'refuse', label: 'Refuse him politely', go: () => go('He shrugs. "Mr Stavrou will be sorry." He does not look sorry.', 'seized', 15, [{ house: 'yanni', mood: -1 }]) },
        { id: 'inform', label: 'Say yes, and go to the customs house instead', go: () => go('You tell him yes. In Port Said you will go to the customs house first.', 'customs', 0) },
      ],
    },
    store: {
      id: 'store', via: 'town', town: 'portsaid', title: 'Mr Stavrou\'s store, behind the Rue Sultan Hussein',
      soon: () => 'The bale waits for you in Port Said.',
      text: (c) => `A clerk takes you to the back. The bale is sewn in sacking and sealed with lead, and it is heavy for its size.${patrolOn(c) ? ' The clerk says the Coastguard has been stopping lorries on the Canal road.' : ''}`,
      expires: 45, lapse: 'leave',
      choices: [
        { id: 'carry', label: 'Load it with your rugs and go', go: (c) => carry(c, 1200, 2000, 0.2, false) },
        { id: 'open', label: 'Cut the seal and look inside first', go: () => go('You cut the lead seal while the clerk is out of the room.', 'inside', 0, [], { opened: true }) },
        { id: 'leave', label: 'Leave it on the floor and walk out', go: () => end('His men watch you go. Mr Stavrou will not forget it.', [{ house: 'yanni', mood: -2 }], 'Went to fetch Stavrou\'s bale, and left it on the floor.') },
      ],
    },
    inside: {
      id: 'inside', via: 'town', town: 'portsaid', title: 'The bale, cut open',
      text: () => 'Inside are two Persian carpets rolled tight, and inside the carpets, packed flat, forty tins of hashish. A Coastguard patrol would make a good evening of it.',
      expires: 3, lapse: 'reseal',
      choices: [
        { id: 'carry', label: 'Carry it anyway, for twice the money', go: (c) => carry(c, 2400, 5000, 0.3, false) },
        { id: 'coastguard', label: 'Take it to the Coastguard post on the quay',
          go: (c) => go('Captain Rennie of the Coastguard writes down every word. That night his men search Stavrou\'s store and find more. Stavrou is fined heavily, and there is a reward for you. Reputation +4.', 'threat', 7,
            [{ rep: 4 }, { cash: 1000, label: 'The Coastguard\'s reward' }, { house: 'yanni', purse: -8000, stock: -15, rep: -12, mood: -5 }, { mark: 'informed' }, { global: 'patrol', v: c.day + 60 }]) },
        { id: 'reseal', label: 'Sew it up again and leave it', go: () => end('You leave it as you found it, more or less. Stavrou\'s clerk notices the seal.', [{ house: 'yanni', mood: -3 }], 'Found what was in Stavrou\'s bale, and left it.') },
      ],
    },
    customs: {
      id: 'customs', via: 'town', town: 'portsaid', title: 'The customs house on the quay',
      soon: () => 'The customs house at Port Said.',
      text: () => 'Captain Rennie of the Coastguard, a tired Scot with a pipe, hears you out in an office that smells of tar.',
      expires: 45, lapse: 'think',
      choices: [
        { id: 'name', label: 'Give him Stavrou\'s name and the coffee house',
          go: (c) => go('His men take the bale at the coffee house and Stavrou\'s store the same night. Stavrou is fined. Reputation +3.', 'threat', 7, [{ rep: 3 }, { house: 'yanni', purse: -6000, rep: -10, mood: -5 }, { mark: 'informed' }, { global: 'patrol', v: c.day + 60 }]) },
        { id: 'reward', label: 'Ask for the informer\'s tenth',
          go: (c) => go('The Captain counts out twenty-five pounds without looking at you. Stavrou is fined, and will want to know who talked.', 'threat', 7, [{ cash: 2500, label: 'The informer\'s tenth' }, { house: 'yanni', purse: -6000, rep: -10, mood: -5 }, { global: 'patrol', v: c.day + 60 }]) },
        { id: 'think', label: 'Think better of it, and go home', go: () => end('You leave without saying anything. Stavrou\'s man never comes back.', [{ house: 'yanni', mood: -1 }], 'Thought of going to the customs about Stavrou, and did not.') },
      ],
    },
    seized: {
      id: 'seized', via: 'courier', title: 'Seizure at Port Said',
      soon: () => 'Stavrou will find somebody else.',
      text: () => 'Coastguard men found hashish in a bale of carpets on a lorry for Cairo. The driver says he was paid by a man he did not know.',
      expires: 10, lapse: 'counsel',
      choices: [
        { id: 'counsel', label: 'Keep your own counsel', go: () => end('You say nothing to anyone.', [], 'Refused Stavrou\'s bale; someone else carried it and was caught.') },
        { id: 'tell', label: 'Tell the Coastguard what you were offered',
          go: (c) => end('Captain Rennie thanks you. Stavrou is questioned. Reputation +2.', [{ rep: 2 }, { house: 'yanni', mood: -4, rep: -6 }, { global: 'patrol', v: c.day + 45 }, { mark: 'informed' }], 'Refused Stavrou\'s bale, and told the Coastguard about the offer.') },
        { id: 'note', label: 'Send Stavrou word that you said nothing',
          go: () => end('A box of Greek cakes comes to your stall the next day. No card.', [{ house: 'yanni', mood: 3 }], 'Refused Stavrou\'s bale, but kept his secret. He is grateful.') },
      ],
    },
    after: {
      id: 'after', via: 'letter', who: 'Y. Stavrou, Port Said', title: (c) => (c.f.caught ? 'Your misfortune' : 'Another bale'),
      text: (c) => (c.f.caught
        ? 'Dear friend, I am told of your misfortune at Ismailia. I am a fair man. I will pay half the fine, if you will forget my name.'
        : 'Dear friend, the bale arrived. There will be another next month, for twice the money. Or perhaps we might do better business together.'),
      expires: 21, lapse: 'stop',
      choices: [
        { id: 'again', label: 'Carry another bale, for twice the money', hidden: (c) => !!c.f.caught,
          go: (c) => { const o = carry(c, 2400, 5000, 0.25, true); return { ...o, end: o.text } as Outcome; } },
        { id: 'partner', label: 'Offer him a partnership on the road instead', hidden: (c) => !!c.f.caught,
          go: () => end('He likes the idea better than you expected. You share the road to Cairo for three months, and he works for you, not against you.', [{ house: 'yanni', truce: true, mood: 2 }], 'Carried Stavrou\'s bale, then made a partner of him.') },
        { id: 'stop', label: 'Tell him once was enough', hidden: (c) => !!c.f.caught, go: () => end('He does not write again.', [], 'Carried a bale for Stavrou once, and stopped.') },
        { id: 'half', label: 'Take his half of the fine', hidden: (c) => !c.f.caught, go: () => end('Ten pounds come in an envelope, and nothing else.', [{ cash: 1000, label: 'Stavrou pays half your fine' }, { house: 'yanni', mood: 1 }], 'Carried Stavrou\'s bale, were caught, and took his money.') },
        { id: 'threat', label: 'Tell him he will pay all of it, or you talk', hidden: (c) => !c.f.caught,
          go: () => end('He pays all of it, and then some. He will remember this.', [{ cash: 3000, label: 'Stavrou pays for your silence' }, { manner: { honesty: -5 } }, { house: 'yanni', mood: -4 }], 'Carried Stavrou\'s bale, were caught, and made him pay for your silence.') },
        { id: 'away', label: 'Keep away from him', hidden: (c) => !c.f.caught, go: () => end('You burn the letter.', [], 'Carried Stavrou\'s bale and were caught.') },
      ],
    },
    threat: {
      id: 'threat', via: 'letter', who: 'Unsigned, posted in Port Said', title: 'A word of advice',
      text: () => 'A man who talks to the Coastguard should watch his bales, and his stall, and his road home.',
      expires: 10, lapse: 'ignore',
      choices: [
        { id: 'watch', label: 'Pay a watchman for the stall for a month', cost: 300, go: () => end('Nothing happens. Perhaps the watchman is why.', [], 'Gave Stavrou away to the Coastguard. Paid a watchman, and nothing came of his threat.') },
        { id: 'rennie', label: 'Show the letter to Captain Rennie', go: () => end('Constables walk past your stall in Giza for a week. Reputation +1.', [{ rep: 1 }], 'Gave Stavrou away to the Coastguard, and the police stood by you.') },
        { id: 'ignore', label: 'Burn it and carry on',
          go: (c) => {
            const hit = c.roll('fire') < 0.5;
            const r = hit ? c.s.inventory.filter((i) => i.stored && !i.framed && !i.story).sort((a, b) => a.paid - b.paid)[0] : undefined;
            return end(r ? 'Two nights later someone throws lamp oil over the rugs in your store. One is ruined.' : 'Nothing comes of it.', r ? [{ loseRug: r.uid }] : [], r ? 'Gave Stavrou away; his men ruined a rug in your store.' : 'Gave Stavrou away to the Coastguard, and his threat came to nothing.');
          } },
      ],
    },
  },
};

// ======================================================================================================
// 3. Mrs Ashby's commission
// ======================================================================================================
const LEADS: Record<string, { town: string; name: string; price: number; text: string }> = {
  damascus: { town: 'damascus', name: 'Abu Nadim\'s old stock in Damascus', price: 5000, text: 'In the store behind Abu Nadim\'s shop in the Hamidiyya, under twenty others, a long carpet with a white ground and a pattern of stars.' },
  aleppo: { town: 'aleppo', name: 'a widow\'s house in Aleppo', price: 3500, text: 'In a house in the Jdeideh quarter, the widow of a dragoman shows you a carpet her husband\'s grandfather brought from Smyrna, red, with medallions like stars.' },
  jerusalem: { town: 'jerusalem', name: 'an Armenian dealer by the Jaffa Gate', price: 4500, text: 'Hagop Der Bedrossian, by the Jaffa Gate, keeps it rolled in a cupboard: a small carpet with a red ground and a border of cloud bands, and a merchant\'s ink stamp on the back.' },
};
const leadPrice = (c: Ctx, k: string) => Math.round(LEADS[k].price * (k === 'damascus' && (housesOf(c.s).list.shami?.mood ?? 0) < 0 ? 1.3 : 1));
const ASHBY = 'ashby-carpet';
const genuineLead = (c: Ctx) => ['damascus', 'aleppo', 'jerusalem'][Math.abs(c.s.worldSeed ?? 0) % 3];
const museum: Arc = {
  id: 'museum', title: 'Mrs Ashby\'s commission',
  blurb: 'A collector wants a seventeenth-century carpet with its history written down.',
  unlock: (s, day) => day >= 120 && s.reputation >= 18,
  first: 'ask',
  late: (c) => (c.f.deadline && c.day > Number(c.f.deadline) && c.run.beat !== 'late' ? 'late' : undefined),
  beats: {
    ask: {
      id: 'ask', via: 'letter', who: 'Mrs Cornelia Ashby, Shepheard\'s Hotel', title: 'A carpet for Boston',
      text: (c) => `${c.g.museumFriend ? 'Mr Hollister gave me your name. ' : ''}I am looking for a carpet of the seventeenth century, Turkish or Persian, with its history written down: good enough for the Arab Museum at Bab el-Khalq to show it in a case for a season, before it goes home with me to Boston. I will pay one hundred and twenty pounds. I sail on ${short(c.day + 75)}.`,
      expires: 14, lapse: 'decline',
      choices: [
        { id: 'accept', label: 'Accept the commission', go: (c) => go('You write that you will find it before she sails.', 'leads', 2, [], { deadline: c.day + 75 }) },
        { id: 'advance', label: 'Accept, and ask for ten pounds on account', go: (c) => go('Her ten pounds come by return, with a note: "I shall expect it."', 'leads', 2, [{ cash: 1000, label: 'Mrs Ashby\'s money on account' }], { deadline: c.day + 75, advance: true }) },
        { id: 'decline', label: 'Decline: it is beyond your stall', go: () => end('You decline politely. She finds someone in Constantinople.', [], 'Declined Mrs Ashby\'s commission.') },
      ],
    },
    leads: {
      id: 'leads', via: 'letter', who: 'Arran, the Giza laboratory', title: (c) => (c.f.tried ? 'The other leads' : 'Where such carpets are'),
      soon: () => 'Arran is asking about.',
      text: (c) => `${c.f.tried ? `That one was no good. ` : 'I have asked about. '}Old carpets with their papers are rarer than honest men. ${Object.keys(LEADS).filter((k) => !String(c.f.tried ?? '').includes(k)).map((k) => LEADS[k].name).join('; ')}. There is also Zaki in the Darb el-Ahmar, who makes old carpets new, if you want that kind of help. I would not. Bring me a thread from anything you mean to buy.${c.f.deadline ? ` Mrs Ashby sails on ${short(Number(c.f.deadline))}.` : ''}`,
      expires: 20, lapse: 'give',
      choices: [
        ...Object.entries(LEADS).map(([k, l]) => ({ id: k, label: `Go to ${l.name}`, hidden: (c: Ctx) => String(c.f.tried ?? '').includes(k),
          go: () => go(`You will look at it when you are in ${l.town === 'damascus' ? 'Damascus' : l.town === 'aleppo' ? 'Aleppo' : 'Jerusalem'}.`, 'look', 0, [], { lead: k, tested: false, counted: false }) } as Choice)),
        { id: 'zaki', label: 'Go and see Zaki in the Darb el-Ahmar', hidden: (c) => !!c.f.zaki, go: () => go('You will find his workshop when you are next in Cairo.', 'zaki', 0, [], { zaki: true }) },
        { id: 'give', label: 'Write to Mrs Ashby that you cannot find one', go: (c) => end('She writes back that she is disappointed, but thanks you for saying so.', [...(c.f.advance ? [{ cash: -1000, label: 'Mrs Ashby\'s money returned' } as Fx] : []), { rep: 1 }], 'Gave up Mrs Ashby\'s commission honestly.') },
      ],
    },
    look: {
      id: 'look', via: 'town', town: (c) => LEADS[String(c.f.lead)]?.town ?? 'damascus', title: (c) => `The carpet: ${LEADS[String(c.f.lead)]?.name ?? 'a lead'}`,
      soon: (c) => `The carpet is in ${LEADS[String(c.f.lead)]?.town ?? 'a town'}.`,
      text: (c) => {
        const k = String(c.f.lead), real = genuineLead(c) === k;
        const said = c.f.tested ? (real ? ' Arran\'s answer comes by telegram: "Natural dyes, hand-spun, the wear is old. Buy it."' : ' Arran\'s answer comes by telegram: "Aniline in the red. Fifty years old at most."')
          : c.f.counted ? (real ? ' You count the knots on the back: uneven, as old work is, and the warps are worn grey at the ends.' : ' You count the knots on the back: too even, too many to the inch, and the warps are new cotton.') : '';
        return `${LEADS[k].text}${k === 'damascus' && (housesOf(c.s).list.shami?.mood ?? 0) < 0 ? ' Abu Nadim remembers you, and asks more.' : ''}${said} The owner asks ${fmt(leadPrice(c, k))}.`;
      },
      expires: 45, lapse: 'other',
      choices: [
        { id: 'buy', label: 'Buy it', cost: (c) => leadPrice(c, String(c.f.lead)),
          go: (c) => { const real = genuineLead(c) === c.f.lead; return go('It is sewn into sacking and sent to your store in Giza.', 'deliver', 2,
            [{ rug: { typeId: 'oushak-medallion', key: ASHBY, paid: leadPrice(c, String(c.f.lead)), provenance: real ? 'Documented' : 'Disputed', fakeAge: !real, note: real ? 'An Ushak carpet of the seventeenth century, with a merchant\'s papers. Bought for Mrs Ashby\'s commission.' : 'Sold as a seventeenth-century Ushak. A later copy. Bought for Mrs Ashby\'s commission.' } }],
            { bought: true, genuine: real }); } },
        { id: 'test', label: 'Send a thread to Arran first', cost: 150, hidden: (c) => !!c.f.tested || !(c.s.labUnlocked ?? []).length,
          go: () => go('You pull one thread from the back and put it in the post to Giza.', 'look', 0, [], { tested: true }) },
        { id: 'count', label: 'Count the knots yourself', hidden: (c) => !!c.f.counted || !!c.f.tested || !(c.s.knotTally?.tries),
          go: () => go('You turn it over and take out your glass.', 'look', 0, [], { counted: true }) },
        { id: 'other', label: 'Leave it, and try another lead',
          go: (c) => go('You thank the owner and leave.', 'leads', 0, [], { tried: `${c.f.tried ?? ''},${c.f.lead}` }) },
      ],
    },
    zaki: {
      id: 'zaki', via: 'town', town: 'cairo', title: 'Zaki\'s workshop, in the Darb el-Ahmar',
      text: () => 'Zaki works in a courtyard with three looms and a vat that smells of tea and lime. He can make a seventeenth-century Ushak in five weeks, from old wool unpicked from a ruined carpet, washed and worn and given papers. "Twenty-five pounds. The papers are extra."',
      expires: 30, lapse: 'leave',
      choices: [
        { id: 'order', label: 'Order one, papers and all', cost: 3500,
          go: () => go('He spits on his palm and shakes your hand.', 'deliver', 35, [{ manner: { honesty: -10 } }, { rug: { typeId: 'oushak-medallion', key: ASHBY, paid: 3500, provenance: 'Documented', fakeAge: true, note: 'Made by Zaki in the Darb el-Ahmar to look like a seventeenth-century Ushak, with papers to match.' } }], { bought: true, genuine: false, forged: true }) },
        { id: 'learn', label: 'Ask him only how it is done, and go back to the leads',
          go: () => go('He shows you for the price of a coffee: how the wool is aged, how the warps are greyed with ash. You will know his work when you see it.', 'leads', 0, [], { knows: true }) },
        { id: 'leave', label: 'Leave him to it', go: () => go('You go back to Arran\'s list.', 'leads', 0) },
      ],
    },
    deliver: {
      id: 'deliver', via: 'stall', who: 'Mrs Ashby and Hamza Effendi', title: 'Mrs Ashby comes for her carpet',
      soon: () => 'The carpet is on its way to your store.',
      text: (c) => `Mrs Ashby comes to the stall with Hamza Effendi from the museum store, who carries a glass and a ruler.${hasRug(c, ASHBY) ? '' : ' You no longer have the carpet you bought for her.'}`,
      expires: 20, lapse: 'keep',
      choices: [
        { id: 'hand', label: 'Hand it over, with its papers', hidden: (c) => !hasRug(c, ASHBY),
          go: (c) => {
            const pay = 12000 - (c.f.advance ? 1000 : 0);
            if (c.f.genuine) return end(`Hamza Effendi looks for a long time and nods. It goes into a case at Bab el-Khalq for the winter, with your name on the card. Mrs Ashby pays ${fmt(pay)}. Reputation +5.`, [{ loseRug: ASHBY }, { cash: pay, label: 'Mrs Ashby\'s commission' }, { rep: 5 }, { mark: 'museum' }], 'Found Mrs Ashby a true seventeenth-century carpet. It was shown at the Arab Museum.');
            const caught = c.roll('hamza') < (c.f.forged ? 0.6 : 0.8);
            if (caught) return end('Hamza Effendi counts the knots, looks at the warps, and puts his glass away. "This was made in Cairo, and not long ago." Mrs Ashby leaves without a word. Reputation -6.', [{ rep: -6 }, { lie: true }, { manner: { honesty: -5 } }], 'Offered Mrs Ashby a carpet that was not what it seemed, and were found out.');
            return end(`Hamza Effendi passes it. Mrs Ashby pays ${fmt(pay)} and takes it to Boston. You will wonder for years whether anyone there will look closer.`, [{ loseRug: ASHBY }, { cash: pay, label: 'Mrs Ashby\'s commission' }, { manner: { honesty: -5 } }], 'Sold Mrs Ashby a carpet that was not what it seemed, and were not found out.');
          } },
        { id: 'hollister', label: 'Tell her it is not ready, and sell it to Mr Hollister', hidden: (c) => !hasRug(c, ASHBY) || !c.f.genuine,
          go: (c) => end('Mr Hollister pays one hundred and fifty pounds without a murmur. Mrs Ashby sails without it, and tells everyone at Shepheard\'s why. Reputation -2.', [{ loseRug: ASHBY }, { cash: 15000 - (c.f.advance ? 1000 : 0), label: 'The Ushak carpet, to Mr Hollister' }, { rep: -2 }], 'Found a true seventeenth-century carpet, and sold it to Mr Hollister instead.') },
        { id: 'keep', label: 'Keep it yourself', hidden: (c) => !hasRug(c, ASHBY),
          go: (c) => end('You tell her you cannot part with it. It stays in your store.', c.f.advance ? [{ cash: -1000, label: 'Mrs Ashby\'s money returned' }] : [], 'Found a carpet for Mrs Ashby, and kept it.') },
        { id: 'sorry', label: 'Tell her the truth: you have nothing for her', hidden: (c) => hasRug(c, ASHBY),
          go: (c) => end('She is gracious about it.', c.f.advance ? [{ cash: -1000, label: 'Mrs Ashby\'s money returned' }] : [], 'Had nothing for Mrs Ashby in the end.') },
      ],
    },
    late: {
      id: 'late', via: 'letter', who: 'Mrs Cornelia Ashby, on board the SS Ionia', title: 'Too late',
      text: (c) => `I sailed this morning without my carpet. ${c.f.advance ? 'I trust you will return the ten pounds. ' : ''}If you find it after all, write to me in Boston.`,
      expires: 20, lapse: 'apologise',
      choices: [
        { id: 'apologise', label: 'Write and apologise', go: (c) => end('You write a long letter. She does not answer.', [...(c.f.advance ? [{ cash: -1000, label: 'Mrs Ashby\'s money returned' } as Fx] : []), { rep: -1 }], 'Missed Mrs Ashby\'s sailing.') },
        { id: 'ship', label: 'Ship the carpet you have to Boston', hidden: (c) => !hasRug(c, ASHBY) || !c.f.genuine,
          go: (c) => end('It reaches Boston in seven weeks. She pays the full price less the freight and the time.', [{ loseRug: ASHBY }, { cash: 9000 - (c.f.advance ? 1000 : 0), label: 'Mrs Ashby\'s commission, late' }, { rep: 2 }], 'Missed Mrs Ashby\'s sailing, but sent her carpet after her.') },
      ],
    },
  },
};

// ======================================================================================================
// 4. Two weddings in the lane
// ======================================================================================================
const TABRIZ = 2600;
const wedding: Arc = {
  id: 'wedding', title: 'Two weddings in the lane',
  blurb: 'Hasan of the Nile Star and Yusuf of the Hotel Nefertari both want the same great carpet.',
  unlock: (s, day) => day >= 40 && s.reputation >= 5,
  first: 'hasan',
  beats: {
    hasan: {
      id: 'hasan', via: 'stall', who: 'Hasan', face: P('hassan'), title: 'Hasan asks a favour',
      text: () => 'Hasan of the Nile Star leans on your counter. "Zeinab, my youngest, is married in four weeks. Rashid has a great Tabriz in his back room, the one with the red medallion. I want it under the bride\'s chair, and I want it from you, not from Rashid: you are the lane\'s own. Thirty-two pounds. It is all I have put by."',
      expires: 10, lapse: 'try',
      choices: [
        { id: 'promise', label: 'Promise him the Tabriz', go: () => go('"Your hand on it," he says, and shakes it twice.', 'yusuf', 2, [], { promised: true }) },
        { id: 'try', label: 'Say you will try', go: () => go('"Try hard," he says.', 'yusuf', 2) },
        { id: 'refuse', label: 'Tell him it is beyond you', go: () => go('He goes off to Rashid himself, disappointed in you.', 'yusuf', 2, [{ mem: 'hassan', m: { k: 'slight', note: 'You would not get him the Tabriz', w: -1 } }], { refused: true }) },
      ],
    },
    yusuf: {
      id: 'yusuf', via: 'stall', who: 'Yusuf', face: P('yusuf'), title: 'Yusuf wants the same carpet',
      soon: () => 'The lane is talking about weddings.',
      text: (c) => `Yusuf of the Hotel Nefertari comes the same week. His son Mahmoud is married on the same Thursday as Zeinab, and Yusuf wants the great Tabriz from Rashid's back room. "I know Hasan wants it. I will pay forty-five pounds. Hasan has thirty-two, and his coffee house has not been painted since the war."${c.f.promised ? ' You have promised it to Hasan.' : ''}${c.f.refused ? ' You told Hasan you could not get it.' : ''} Rashid will let you have it for ${fmt(TABRIZ)}.`,
      expires: 10, lapse: 'yusuf',
      choices: [
        { id: 'hasan', label: 'Sell it to Hasan, as you said', hidden: (c) => !!c.f.refused, cost: TABRIZ,
          go: () => go('Hasan counts out thirty-two pounds in coins, and weeps a little. Yusuf goes away stiff and polite.', 'invite', 6,
            [{ cash: 3200, label: 'The great Tabriz, to Hasan' }, { mem: 'hassan', m: { k: 'story', note: 'The Tabriz under Zeinab\'s chair at her wedding', w: 3 }, forget: ['slight'] }, { mem: 'yusuf', m: { k: 'slight', note: 'You sold the Tabriz to Hasan, not him' } }, { court: 'yusuf', by: 'selim' }], { won: 'hassan', lost: 'yusuf' }) },
        { id: 'yusuf', label: 'Sell it to Yusuf, for more', cost: TABRIZ,
          go: (c) => go(`Yusuf pays forty-five pounds in notes. ${c.f.promised ? 'Hasan hears of it within the hour, and does not come to your stall to say so.' : 'Hasan hears of it within the hour.'}`, 'invite', 6,
            [{ cash: 4500, label: 'The great Tabriz, to Yusuf' }, { mem: 'yusuf', m: { k: 'story', note: 'The Tabriz for Mahmoud\'s wedding', w: 3 } }, { mem: 'hassan', m: c.f.promised ? { k: 'promise', rug: 'persian-tabriz' } : { k: 'slight', note: 'You sold the Tabriz to Yusuf, not him' } }, { court: 'hassan', by: 'selim' }, ...(c.f.promised ? [{ manner: { honesty: -6 } } as Fx] : [])], { won: 'yusuf', lost: 'hassan' }) },
        { id: 'pair', label: 'Ask Rashid for a second carpet to match', cost: TABRIZ * 2, hidden: (c) => !!c.f.refused,
          go: () => go('Rashid grumbles, and finds a sister to the Tabriz in a dealer\'s store in Tanta: not so fine, but a pair. Hasan pays thirty-two pounds, Yusuf forty; each thinks he has the better one.', 'invite', 6,
            [{ cash: 7200, label: 'Two Tabriz carpets, to Hasan and Yusuf' }, { mem: 'hassan', m: { k: 'story', note: 'A Tabriz for Zeinab\'s wedding', w: 2 }, forget: ['slight'] }, { mem: 'yusuf', m: { k: 'story', note: 'A Tabriz for Mahmoud\'s wedding', w: 2 } }], { won: 'both' }) },
        { id: 'bid', label: 'Let them bid against each other',
          cost: TABRIZ, hidden: (c) => !!c.f.refused,
          go: () => go('They bid in front of the whole lane. Yusuf wins at fifty-five pounds. Both of them think less of you for it.', 'invite', 6,
            [{ cash: 5500, label: 'The great Tabriz, to Yusuf, at auction' }, { manner: { kindness: -5 } }, { rep: -1 }, { mem: 'yusuf', m: { k: 'slight', note: 'You made him bid against his neighbour', w: -1 } }, { mem: 'hassan', m: { k: 'slight', note: 'You made him bid against his neighbour', w: -1.5 } }, { court: 'hassan', by: 'selim' }], { won: 'yusuf', lost: 'hassan' }) },
      ],
    },
    invite: {
      id: 'invite', via: 'letter', who: (c) => (c.f.won === 'both' ? 'Hasan and Yusuf, together' : c.f.won === 'hassan' ? 'Hasan, the Nile Star' : 'Yusuf, the Hotel Nefertari'), title: 'An invitation',
      soon: () => 'The weddings are coming.',
      text: (c) => (c.f.won === 'both' ? 'The two weddings are on the same Thursday, and the two families have decided to hold them in one street, with one band. You are asked to both.' : `The wedding is on Thursday at the house. You are asked to come, and to sit with the family.`),
      expires: 10, lapse: 'decline',
      choices: [
        { id: 'go', label: 'Go, with a present for the couple', cost: 150,
          go: (c) => { const w = c.f.won === 'both' ? 'hassan' : String(c.f.won); const f = stranger(c.s, c.day); return go(`You dance more than you meant to.${f ? ` ${BUYERS[f]?.name}, a cousin of the family, takes your card and says ${BUYERS[f]?.name.startsWith('Miss') || BUYERS[f]?.name.startsWith('Madame') ? 'she' : 'he'} will call at your stall.` : ''}`, 'after', 60, [{ mem: w, m: { k: 'gift' } }, ...(c.f.won === 'both' ? [{ mem: 'yusuf', m: { k: 'gift' } } as Fx] : []), ...(f ? [{ appoint: f, inDays: 3, friendOf: w } as Fx] : [])]); } },
        { id: 'send', label: 'Send a present, and stay at the stall', cost: 100, go: (c) => go('Your present is opened in front of everyone. It is thought proper.', 'after', 60, [{ mem: c.f.won === 'both' ? 'hassan' : String(c.f.won), m: { k: 'gift' } }]) },
        { id: 'decline', label: 'Send your regrets', go: () => go('Your regrets are noted.', 'after', 60) },
      ],
    },
    after: {
      id: 'after', via: 'stall', who: (c) => (c.f.lost === 'yusuf' ? 'Yusuf' : c.f.lost === 'hassan' ? 'Hasan' : 'Hasan and Yusuf'), title: (c) => (c.f.lost ? 'An old neighbour' : 'The two families'),
      soon: () => 'The lane will settle down after the weddings.',
      text: (c) => {
        if (!c.f.lost) return 'Hasan and Yusuf come to the stall together, which nobody has seen before. The two couples have taken flats in the same building, and both houses want prayer rugs, six of them, for the new rooms.';
        const who = c.f.lost === 'hassan' ? 'Hasan' : 'Yusuf';
        const away = housesOf(c.s).defected[String(c.f.lost)];
        return `${who} stops at your stall for the first time since the wedding. ${away ? `He has been buying from ${houseName(HOUSES.find((h) => h.id === away.by)!)} in the Muski. ` : ''}"It was a fine wedding without your carpet," he says. He does not sound as if he means it.`;
      },
      expires: 20, lapse: 'shrug',
      choices: [
        { id: 'gift', label: 'Give him a small rug for the young couple', hidden: (c) => !c.f.lost,
          need: (c) => (c.s.inventory.some((i) => !i.story && !i.framed && !i.restoringUntil) ? undefined : 'You have no rug to give.'),
          go: (c) => { const r = c.s.inventory.filter((i) => !i.story && !i.framed && !i.restoringUntil).sort((a, b) => a.paid - b.paid)[0]; return end('He turns it over, says it is well made, and shakes your hand. The lane notices.', [{ loseRug: r.uid }, { mem: String(c.f.lost), m: { k: 'gift' }, forget: ['slight', 'promise'] }, { manner: { kindness: 5 } }], 'Made peace with the family you disappointed over the Tabriz.'); } },
        { id: 'sorry', label: 'Apologise, and leave it there', hidden: (c) => !c.f.lost,
          go: (c) => end('He nods. It will take time.', [{ mem: String(c.f.lost), m: { k: 'slight', note: 'The Tabriz, though you apologised', w: -0.5 }, forget: ['slight', 'promise'] }], 'Apologised to the family you disappointed over the Tabriz.') },
        { id: 'shrug', label: 'Say business is business', hidden: (c) => !c.f.lost, go: () => end('He goes. He will not be back soon.', [{ manner: { kindness: -5 } }], 'Sold the Tabriz, and let the other family go.') },
        { id: 'fair', label: 'Fill the order at a fair price', hidden: (c) => !!c.f.lost,
          go: () => end('Six prayer rugs, at a price that makes Rashid shake his head. Both families tell the lane about you.', [{ cash: 1200, label: 'Prayer rugs for two new households' }, { mem: 'hassan', m: { k: 'fair' } }, { mem: 'yusuf', m: { k: 'fair' } }, { rep: 2 }], 'Found the lane two great carpets, and made two loyal households.') },
        { id: 'dear', label: 'Charge what the lane will bear', hidden: (c) => !!c.f.lost,
          go: () => end('They pay, and look at each other.', [{ cash: 2200, label: 'Prayer rugs for two new households' }, { mem: 'hassan', m: { k: 'dear' } }, { mem: 'yusuf', m: { k: 'dear' } }], 'Found the lane two great carpets, then charged them dear.') },
      ],
    },
  },
};

// ======================================================================================================
// 5. The house of Antaki
// ======================================================================================================
const ANTAKI_PRICE = 30000, ANTAKI_SHARE = 12000;
const ANTAKI_STOCK = ['persian-sarouk', 'persian-tabriz', 'oushak-medallion', 'feraghan-herati', 'konya-prayer-rug', 'shirvan-garden', 'karabagh-rose', 'melas-arch', 'ladik-tulip', 'bergama-hearth'];
const antakiRug = (typeId: string, paid: number): Fx => ({ rug: { typeId, paid, note: 'From the stock of the house of Antaki Frères, the Hamzawi, established 1868.' } });
/** the house that would buy Antaki: the richest still trading */
const buyerHouse = (s: GameState) => HOUSES.filter((d) => housesOf(s).list[d.id]?.status === 'trading').sort((a, b) => housesOf(s).list[b.id].purse - housesOf(s).list[a.id].purse)[0];
const antaki: Arc = {
  id: 'antaki', title: 'The house of Antaki',
  blurb: 'An old Cairo house, ruined by the slump, offers its stock and its name for cash.',
  unlock: (s, day) => day >= eraById('era-crash').from + 7 && s.reputation >= 10,
  first: 'offer',
  beats: {
    offer: {
      id: 'offer', via: 'letter', who: 'Edouard Antaki, Antaki Frères, the Hamzawi', title: 'The house of Antaki',
      text: (c) => { const h = buyerHouse(c.s); return `My father is seventy-eight. The house has sold carpets in the Hamzawi since 1868, and the bank has called in its loan. We have twenty-six carpets and the name over the door, and we will let them go for three hundred pounds in cash before the first of the month. Or, if you prefer, a partner for a share. ${h ? `${houseName(h)} has made an offer, but my father would rather it went to you.` : ''}`; },
      expires: 14, lapse: 'pass',
      choices: [
        { id: 'buy', label: 'Buy the stock and the name outright', cost: ANTAKI_PRICE,
          go: () => go('You sign at the notary\'s in the Mousky the same week. Ten of the best carpets go to your store at once; the rest wait in the warehouse.', 'warehouse', 2, ANTAKI_STOCK.map((t) => antakiRug(t, Math.round(ANTAKI_PRICE / 10))), { bought: true }) },
        { id: 'partner', label: 'Offer to come in as a partner, for a share', cost: ANTAKI_SHARE,
          go: (c) => go('A share of the house is yours, and a share of what it sells each week. Three carpets come to your store on account.', 'partner', 40,
            ANTAKI_STOCK.slice(0, 3).map((t) => antakiRug(t, Math.round(ANTAKI_SHARE / 6))), { weekly: 600, weeklyUntil: c.day + 140 }) },
        { id: 'pass', label: 'Let it go to someone else',
          go: (c) => { const h = buyerHouse(c.s); return go(`You write that you cannot. ${h ? `${houseName(h)} buys the house.` : 'The bank sells the stock at auction.'}`, 'taken', 3, h ? [{ house: h.id, purse: -20000, stock: 26, rep: 8 }] : [], { rival: h?.id ?? '' }); } },
      ],
    },
    warehouse: {
      id: 'warehouse', via: 'town', town: 'cairo', title: 'The Antaki warehouse, in the Hamzawi',
      text: () => 'Old Antaki sits on a bale in the warehouse with his two clerks, who have worked for him for forty years. They stand when you come in. The rest of the stock is stacked to the beams.',
      expires: 30, lapse: 'name',
      choices: [
        { id: 'keep', label: 'Keep the old man and his clerks on', cost: 1500,
          go: () => go('The clerks go back to their desks as if nothing had happened. Old Antaki tells everyone in the Hamzawi that the house is in good hands. Reputation +3.', 'book', 30, [{ rep: 3 }, { manner: { kindness: 6 } }, { mark: 'antaki' }]) },
        { id: 'clear', label: 'Let them go, and sell the rest off quickly',
          go: () => end('The rest of the stock goes to the dealers of the Muski at a fair price for a bad year. The old man goes home to Heliopolis. Reputation -2.', [{ cash: 6000, label: 'The rest of the Antaki stock, sold off' }, { rep: -2 }, { manner: { kindness: -6 } }], 'Bought the house of Antaki, and sold it off.') },
        { id: 'name', label: 'Put your own name over the door, beside theirs',
          go: () => end('The signwriter paints your name beside the old one. Reputation +4.', [{ rep: 4 }, { mark: 'antaki' }], 'Bought the house of Antaki: your name stands beside theirs in the Hamzawi.') },
      ],
    },
    partner: {
      id: 'partner', via: 'letter', who: 'Edouard Antaki', title: 'The bank is satisfied',
      soon: () => 'The house of Antaki trades on, with your money in it.',
      text: () => 'The bank is satisfied, for now. My father asks whether you would buy the rest of the house, at the price we spoke of less what you have paid already. Or we go on as we are.',
      expires: 21, lapse: 'stay',
      choices: [
        { id: 'rest', label: 'Buy the rest of the house', cost: ANTAKI_PRICE - ANTAKI_SHARE,
          go: () => go('The notary again, and the rest of the stock is yours.', 'warehouse', 2, ANTAKI_STOCK.slice(3).map((t) => antakiRug(t, Math.round(ANTAKI_PRICE / 10))), { weekly: 0 }) },
        { id: 'stay', label: 'Go on as partners', go: (c) => end('You go on as you are, and your share comes every Monday.', [], `Came into the house of Antaki as a partner: a share every week until ${short(Number(c.f.weeklyUntil ?? c.day))}.`) },
        { id: 'sell', label: 'Sell your share back to them', go: () => end('Edouard pays you out, slowly, from the next season.', [{ cash: 10000, label: 'Your share of Antaki Frères, sold back' }], 'Was a partner in the house of Antaki for a season, and sold out.', ), },
      ],
    },
    taken: {
      id: 'taken', via: 'courier', title: (c) => { const h = HOUSES.find((d) => d.id === c.f.rival); return h ? `${houseName(h)} buys the house of Antaki` : 'The house of Antaki sold up'; },
      soon: () => 'The house of Antaki changes hands.',
      text: (c) => { const h = HOUSES.find((d) => d.id === c.f.rival); return h ? `The old firm of Antaki Frères, in the Hamzawi since 1868, has been bought with all its stock by ${houseName(h)}. Old Mr Antaki and his clerks are let go.` : 'The stock of Antaki Frères was sold at auction for what it would fetch.'; },
      expires: 14, lapse: 'let',
      choices: [
        { id: 'clerks', label: 'Offer the old clerks work at your stall', cost: 600,
          go: (c) => { const f = stranger(c.s, c.day + 3); return end(`They know every buyer in Cairo.${f ? ` The first one they bring is ${BUYERS[f]?.name}.` : ''} Reputation +2.`, [{ rep: 2 }, { manner: { kindness: 4 } }, ...(f ? [{ appoint: f, inDays: 2 } as Fx] : [])], 'Let the house of Antaki go to a rival, but took on its clerks.'); } },
        { id: 'pick', label: 'Buy the pick of the stock from the new owner', cost: 6000, hidden: (c) => !c.f.rival,
          go: (c) => end('Three of the best, at a price that leaves both of you sour.', [{ house: String(c.f.rival), purse: 6000 }, ...ANTAKI_STOCK.slice(0, 3).map((t) => antakiRug(t, 2000))], 'Let the house of Antaki go to a rival, then bought the best of it back.') },
        { id: 'let', label: 'Let it go', go: () => end('The sign comes down in the Hamzawi.', [], 'Let the house of Antaki go.') },
      ],
    },
    book: {
      id: 'book', via: 'letter', who: 'Old Mr Antaki', title: 'My book of clients',
      text: () => 'I have kept a book of every buyer this house has had since 1868: who they were, what they bought, who their children married. It is no use to me now. It is yours.',
      expires: 20, lapse: 'keep',
      choices: [
        { id: 'call', label: 'Call on the old clients yourself',
          go: (c) => { const a = stranger(c.s, c.day), b = stranger(c.s, c.day + 5); const who = [a, b].filter((x, i, l) => x && l.indexOf(x) === i) as string[]; return end(`You spend a week in carriages.${who.length ? ` ${who.map((w) => BUYERS[w]?.name).join(' and ')} will call at your stall.` : ''} Reputation +1.`, [{ rep: 1 }, ...who.map((w, i) => ({ appoint: w, inDays: 2 + i } as Fx))], 'Bought the house of Antaki and kept its people. Its old clients are yours.'); } },
        { id: 'keep', label: 'Thank him, and keep the book', go: () => end('It sits on your shelf, and you read it on quiet evenings.', [{ rep: 1 }], 'Bought the house of Antaki and kept its people.') },
      ],
    },
  },
};

export const ARCS: Arc[] = [wedding, forgery, bale, museum, antaki];
