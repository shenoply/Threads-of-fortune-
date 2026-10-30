// The years 1926–1930: the shifts that make the middle and late game a different trade from the first
// year. Each era event has a date, an article in the Courier, a line for "The times" saying what it
// means for a rug merchant, often a word in the coffee houses a few weeks before, and concrete effects
// on prices, buyers, roads and the post.
//
// FACT is what the record says, with a source; GAME is the game's own estimate of what it did to the
// rug trade. Effects are kept modest: an event tilts the trade, it does not make or break a merchant.
//
// Pure data and small pure helpers. life.ts adds these events to its calendar; this module imports
// only types from it (no cycle at load).
import type { GameEvent } from './life';
import type { Story } from '../../data/news';
import { RUGS } from '../../data/rugs';

const d = (m: number, dd: number, y: number) => Math.round((Date.UTC(y, m - 1, dd) - Date.UTC(1925, 2, 9)) / 86400000);
/** the last day of the calendar (calendar1925.ts CAL_END, repeated so this file needs nothing at load) */
const END = d(12, 31, 1930);

// ---------- groups of rugs the era moves ----------
const ids = (f: (id: string) => boolean) => Object.keys(RUGS).filter(f);
const isPersian = (id: string) => /^Persia\b|Persian/.test(RUGS[id].origin);
/** Persian rugs of every grade */
export const PERSIAN = ids(isPersian);
/** what New York bought: Sarouk and Kerman above all, Heriz and Tabriz for the big rooms.
 *  FACT: by 1929 about 90 per cent of Kerman's output went to America (Encyclopaedia Iranica, "Carpets xii",
 *  https://www.iranicaonline.org/articles/carpets-xii). The Sarouk as the American trade's rug is trade knowledge. */
export const AMERICAN_TASTE = ['persian-sarouk', 'persian-kerman', 'persian-heriz', 'persian-tabriz'];
/** cheap and middling Persian rugs: what Hamburg wanted after Germany cut its duty in July 1927 (Iranica, as above) */
export const PERSIAN_CHEAP = ids((id) => isPersian(id) && (RUGS[id].tier ?? 1) <= 2);
/** the rugs of the tribes that rose in 1929 */
export const FARS_TRIBAL = ['persian-qashqai', 'persian-bakhtiari'];
/** old and rare pieces: what collectors buy */
export const OLD_RARE = ids((id) => RUGS[id].traits.includes('antique') || RUGS[id].traits.includes('rare'));
/** the dear end of the trade: city carpets and treasures */
export const LUXURY = ids((id) => (RUGS[id].tier ?? 1) >= 3);

/** what a rug fetches or costs because of the times: `sell` on what buyers pay, `buy` on what it costs to
 *  buy (Rashid at Giza and the town markets); `at` the towns ('giza' for the stall and Rashid), all if left out */
export interface RugFx { ids: string[]; label: string; sell?: number; buy?: number; at?: string[] }
/** a motor service made faster or cheaper (data/world.ts MOTOR_ROUTES) */
export interface MotorFx { a: string; b: string; days?: number; fare?: number }
/** options the era opens or closes, read by the systems that own them */
export type EraFlag = 'airmail' | 'nairnFast' | 'persiaRoad';

export interface EraEvent extends GameEvent {
  era: true;
  /** the Courier's article on the day it begins */
  article: Story;
  /** one line for "The times": what changed and why it matters to your trade */
  times: string;
  /** coffee-house talk this many days before it begins (never for an accident) */
  hint?: { days: number; text: string };
  rugs?: RugFx[];
  motor?: MotorFx[];
  flags?: EraFlag[];
}

// Buyer groups (calendar1925.ts CALLERS): foreign, american, luxury, cotton, persian, coptic, pious.
export const ERA_EVENTS: EraEvent[] = [
  // FACT: the Constituent Assembly made Reza Khan Shah on 12 December 1925 (Encyclopaedia Iranica, "Pahlavi dynasty";
  // currency.ts SHAH_DAY). GAME: Tehran's notables dress their houses for the new reign.
  { era: true, id: 'era-pahlavi', name: 'Reza Shah Pahlavi', from: d(12, 13, 1925), to: d(1, 10, 1926), icon: 'crown',
    text: 'The Constituent Assembly in Tehran has made Reza Khan Shah of Persia. The Qajar dynasty is ended, and the new court is being furnished.',
    article: { headline: 'A New Shah in Tehran', deck: 'The Assembly Ends the Qajar Line; Reza Pahlavi Takes the Throne', body: 'The Constituent Assembly at Tehran has voted the crown to Reza Khan, the former War Minister, who takes the name Pahlavi. The Qajar dynasty is at an end. Tehran merchants report the notables refurnishing their reception rooms for the new reign.' },
    advice: 'Tehran dealers pay more for fine, showy carpets while the new court finds its feet.',
    times: 'Tehran is buying fine carpets for the new court.',
    demand: [{ sid: 'tehran', traits: ['fineWeave', 'ornate', 'silk'], mult: 1.2 }] },

  // FACT: Reza Shah was crowned at the Golestan Palace on 25 April 1926 (Wikipedia, "Coronation of Reza Shah").
  // GAME: the court and the ministries buy for the ceremony and the receptions after it.
  { era: true, id: 'era-coronation', name: 'The coronation in Tehran', from: d(4, 25, 1926), to: d(5, 20, 1926), icon: 'crown',
    text: 'Reza Shah has crowned himself at the Golestan Palace. Embassies and ministries in Tehran are giving receptions, and every reception room wants a better carpet.',
    article: { headline: 'Reza Shah Crowned at the Golestan', deck: 'He Places the Crown on His Own Head; Tehran Illuminated', body: 'In the Golestan Palace at Tehran, Reza Shah Pahlavi has placed the new crown on his own head before the ministers, the clergy and the foreign envoys. The city is illuminated for three nights. Carpet dealers in the Tehran bazaar say the ministries have been buying all month.' },
    advice: 'Tehran pays well for fine and silk carpets this month. A long road from Giza, but a good market.',
    times: 'Fine and silk carpets fetch more in Tehran for a few weeks.',
    hint: { days: 21, text: 'Tehran is getting ready to crown Reza Shah, and the court is buying carpets for the Golestan Palace.' },
    demand: [{ sid: 'tehran', traits: ['fineWeave', 'silk', 'ornate'], mult: 1.25 }], cityBid: { tehran: 1.1 }, callers: { persian: 1.3 } },

  // GAME, from the record of trade: Persian carpet exports grew after the war, and America was the great market
  // (Iranica, "Carpets xii"). Carter's team cleared the Treasury of Tutankhamun's tomb in the 1926-27 season
  // (dates about). The winter is the game's estimate of what that meant at Shepheard's and the Continental.
  { era: true, id: 'era-americans', name: 'The American winter', from: d(11, 15, 1926), to: d(4, 10, 1927), icon: 'coin',
    text: 'The winter cruise ships from New York are in, and the hotels are full of Americans. Some are tourists for Luxor and the boy king\'s Treasury; some are New York carpet buyers, and they want Persian carpets.',
    article: { headline: 'New York Comes to Cairo', deck: 'Cruise Steamers Full; American Buyers in the Hotels', body: 'Three cruise steamers from New York have landed their passengers at Alexandria this week, and Shepheard\'s has not a room to spare. Besides the visitors for Luxor, where Mr Carter is opening the Treasury of the tomb, there are buyers for the New York carpet houses, who are asking every dealer in the Muski for Persian carpets.' },
    advice: 'Persian carpets, Sarouk and Kerman above all, fetch more at the stall and in Cairo this winter. Buy them where they are cheap and bring them home.',
    times: 'New York buyers are in the hotels: Persian carpets, Sarouk and Kerman most of all, sell high in Cairo this winter.',
    hint: { days: 21, text: 'the winter cruise ships from New York are booked full, and the New York carpet houses are sending buyers with them.' },
    budget: 1.05, callers: { american: 1.6, foreign: 1.15 },
    rugs: [{ ids: AMERICAN_TASTE, label: 'Sarouk and Kerman carpets', sell: 1.25, at: ['giza', 'cairo', 'alexandria'] }, { ids: PERSIAN, label: 'Persian rugs', sell: 1.08, at: ['giza', 'cairo', 'alexandria'] }] },

  // FACT: Imperial Airways took over the RAF desert air mail and flew Cairo-Baghdad-Basra from 7 and 12 January 1927,
  // fortnightly, weekly from April (NZ Society of GB, "Imperial Airways: Basra - Cairo Airmail",
  // https://www.nzsgb.org.uk/bobs/air-external-basra/). GAME: letters from Baghdad reach you in a day.
  { era: true, id: 'era-airmail', name: 'The air mail to Baghdad', from: d(1, 12, 1927), to: END, icon: 'news',
    text: 'Imperial Airways has begun flying the mail from Cairo to Baghdad and Basra, across the desert in a day and a half.',
    article: { headline: 'Mails to Baghdad by Air', deck: 'Imperial Airways Takes Over the Desert Route', body: 'The first Imperial Airways machine left Heliopolis for Baghdad this morning with the mails, by Gaza, Rutba and Ramadi. The service will run every fortnight and, the company hopes, every week from the spring. A letter posted in Cairo on Wednesday may now be read in Baghdad on Friday.' },
    advice: 'Letters from buyers in Baghdad now reach you in a day. A deal there can be struck before a rival hears of it.',
    times: 'Letters from buyers in Baghdad come in a day.',
    hint: { days: 14, text: 'the English are to fly the Baghdad mail from Heliopolis after the New Year.' },
    flags: ['airmail'] },

  // FACT: in 1927 the Nairn company made nearly 4,000 crossings with 20,000 passengers and 4,500 sacks of mail
  // (Wikipedia, "Nairn Transport Company"). GAME: more cars and a known road make the crossing a day and a night,
  // and the fare comes down with the traffic.
  { era: true, id: 'era-nairn', name: 'More cars on the desert route', from: d(3, 1, 1927), to: END, icon: 'map',
    text: 'The Nairn company runs cars across the Syrian desert several times a week now, in convoy, day and night. Damascus to Baghdad is a day and a night.',
    article: { headline: 'The Desert in a Day and a Night', deck: 'Nairn Cars Leave Damascus Several Times a Week', body: 'The Nairn Eastern Transport Company has added cars to its desert service and now sends a convoy from Damascus to Baghdad several times a week, driving through the night by Rutba wells. Passengers who left Damascus at noon were drinking their coffee in Baghdad the next evening. The company has lowered its fare.' },
    advice: 'The Nairn car from Damascus to Baghdad takes a day less and costs less. Baghdad is within reach of a merchant in a hurry.',
    times: 'Damascus to Baghdad by Nairn car is a day and a night, and cheaper: Baghdad is closer.',
    motor: [{ a: 'damascus', b: 'baghdad', days: 1, fare: 0.85 }], flags: ['nairnFast'],
    cityBid: { baghdad: 1.03, damascus: 1.03 } },

  // FACT: the Jericho earthquake of 11 July 1927 damaged Jerusalem, Nablus, Ramle and Lydda and killed some
  // 300 people (Survey of Israel / Amiran 1996, summarised on Wikipedia, "1927 Jericho earthquake").
  // GAME: dealers there keep their money for repairs, and families sell to rebuild.
  { era: true, id: 'era-quake', name: 'Earthquake in Palestine', from: d(7, 11, 1927), to: d(7, 31, 1927), icon: 'warn', unforeseen: true,
    text: 'An earthquake has shaken Palestine and Transjordan. Houses have fallen in Nablus, Ramle and Lydda, the Mount of Olives is cracked, and in Jerusalem people are sleeping in the open.',
    article: { headline: 'Earthquake Shakes Palestine', deck: 'Hundreds Dead in Nablus and Ramle; Jerusalem Damaged', body: 'A severe earthquake was felt across Palestine and Transjordan yesterday afternoon. The old town of Nablus has suffered most. In Jerusalem the German hospice on the Mount of Olives and parts of the Haram are damaged. The government has opened relief camps.' },
    advice: 'Jerusalem dealers are buying little and families are selling to rebuild: buy cheap there, sell elsewhere.',
    times: 'Jerusalem buys little; families there sell old rugs cheaply to rebuild.',
    cityBid: { jerusalem: 0.85, jaffa: 0.95 }, cityBuy: { jerusalem: 0.88 } },

  // FACT: Saad Zaghlul died in Cairo on 23 August 1927; shops shut for the funeral (Wikipedia, "Saad Zaghloul").
  { era: true, id: 'era-zaghlul', name: 'Zaghlul is dead', from: d(8, 23, 1927), to: d(9, 5, 1927), icon: 'moon', unforeseen: true,
    text: 'Saad Zaghlul Pasha, the father of the Wafd, is dead. Cairo is in mourning, and every shop shuts for the funeral.',
    article: { headline: 'Saad Zaghlul Pasha Is Dead', deck: 'The Nation Mourns the Leader of the Wafd', body: 'Saad Zaghlul Pasha died last night at his house, the Beit el-Umma, in his seventieth year. Crowds filled the streets around the house before dawn. The shops of Cairo will close for the funeral, and black flags hang from the balconies.' },
    advice: 'Cairo is in mourning for a fortnight: buyers are few and nobody haggles with a light heart.',
    times: 'Egypt is in mourning: a quiet fortnight at the stall.',
    budget: 0.93, footfall: -1 },

  // FACT: Germany cut its import duties on carpets in July 1927, and German demand for cheap and middling Persian
  // carpets carried the trade to 1929 (Iranica, "Carpets xii"). GAME: the export houses in Alexandria, Beirut and
  // Constantinople buy for Hamburg, and the Persian village rugs dear a little at the source.
  { era: true, id: 'era-hamburg', name: 'Hamburg buys Persian rugs', from: d(9, 1, 1927), to: d(10, 31, 1929), icon: 'anchor',
    text: 'Germany has lowered its duty on carpets, and Hamburg wants cheap and middling Persian rugs by the bale. The export houses of Alexandria, Beirut and Constantinople are buying.',
    article: { headline: 'Hamburg Wants Persian Rugs', deck: 'German Duty Lowered; Export Houses Buying by the Bale', body: 'Since Berlin lowered its duty on carpets in July, the German importers have been buying Persian rugs of the ordinary grades in quantity. The export houses on the Alexandria quays report orders from Hamburg for Hamadan and Mashhad rugs by the hundred.' },
    advice: 'Persian village and town rugs sell well to the export houses in Alexandria, Beirut and Constantinople, and cost a little more in Persia.',
    times: 'The export houses in Alexandria, Beirut and Constantinople pay more for Persian village rugs.',
    hint: { days: 30, text: 'Germany is cutting its duty on carpets, and the Hamburg importers are writing to every export house in Alexandria.' },
    rugs: [{ ids: PERSIAN_CHEAP, label: 'Persian village rugs', sell: 1.18, at: ['alexandria', 'beirut', 'istanbul'] }, { ids: PERSIAN_CHEAP, label: 'Persian village rugs', buy: 1.08, at: ['hamadan', 'kermanshah', 'tehran', 'tabriz', 'kashan', 'isfahan', 'kerman', 'baghdad'] }] },

  // FACT: the Turkish Petroleum Company's well at Baba Gurgur, near Kirkuk, struck oil on 14 October 1927 and ran
  // wild for days (Wikipedia, "Baba Gurgur"). GAME: oil money reaches Baghdad; dealers pay more and charge more,
  // and Rustam Isfahani's people come to Cairo more often.
  { era: true, id: 'era-kirkuk', name: 'Oil at Baba Gurgur', from: d(10, 15, 1927), to: d(3, 31, 1928), icon: 'up',
    text: 'The Turkish Petroleum Company\'s well at Baba Gurgur, by Kirkuk, has struck oil. The gusher is running wild and the whole of Iraq is talking of nothing else. Baghdad money is out.',
    article: { headline: 'Oil Gushes at Kirkuk', deck: 'The Baba Gurgur Well Runs Wild; Baghdad Jubilant', body: 'The well of the Turkish Petroleum Company at Baba Gurgur, near Kirkuk, came in at dawn with a roar heard for miles, throwing oil higher than the derrick. Tribesmen are damming the wadis to stop the flood. In Baghdad, house agents say the company\'s men are taking every furnished house, and the notables are spending in the expectation of royalties.' },
    advice: 'Baghdad pays well for fine and hard-wearing carpets to furnish the oil men\'s houses, and prices there are up. Take good stock east.',
    times: 'Baghdad money is out: its dealers pay well for good carpets, and charge more for their own.',
    hint: { days: 21, text: 'the drillers at Baba Gurgur near Kirkuk are deep, and the company\'s men in Baghdad say oil is close. Baghdad money is coming.' },
    cityBid: { baghdad: 1.22 }, cityBuy: { baghdad: 1.06 }, demand: [{ sid: 'baghdad', traits: ['fineWeave', 'ornate', 'hardwearing'], mult: 1.15 }], callers: { persian: 1.4 } },
  // GAME: the oil camps stay; Baghdad keeps a share of the money until the slump.
  { era: true, id: 'era-oilcamps', name: 'The oil camps', from: d(4, 1, 1928), to: d(10, 31, 1929), icon: 'up',
    text: 'The oil company is building camps and roads at Kirkuk, and Baghdad keeps the money of its engineers and their families.',
    article: { headline: 'Kirkuk Builds', deck: 'Camps, Roads and a Railway Spur for the Oilfield', body: 'The Turkish Petroleum Company is laying out camps for its engineers at Baba Gurgur and asks the government for a railway spur. Baghdad shopkeepers say the European families are the best customers the city has had since the war.' },
    advice: 'Baghdad dealers still pay a little over the odds for good carpets.',
    times: 'The oil men are settling in, and Baghdad still pays a little over the odds.',
    cityBid: { baghdad: 1.1 }, callers: { persian: 1.15 } },

  // FACT: Persia ended the capitulations on 10 May 1928 and set its own customs tariff (Spectator, 19 May 1928;
  // FRUS 1928 vol. III). GAME: the new customs men search loads at the frontier.
  { era: true, id: 'era-capitulations', name: 'Persia ends the capitulations', from: d(5, 10, 1928), to: d(8, 31, 1928), icon: 'lock',
    text: 'Persia has ended the old privileges of foreigners and set its own customs tariff. At Khanaqin and Qasr-i-Shirin the new customs men open every bale.',
    article: { headline: 'Persia Ends the Capitulations', deck: 'Foreign Privileges Abolished; A New Tariff at the Frontier', body: 'From today foreigners in Persia answer to Persian courts, and Persia fixes its own customs duties. Merchants crossing at Qasr-i-Shirin report that the new customs officers, many of them trained by Belgians, are searching loads with great care.' },
    advice: 'Expect a thorough search at the Persian frontier: declare what you carry.',
    times: 'The Persian frontier at Khanaqin searches every load.',
    frontier: ['persia'] },
  // FACT: Reza Shah's government built motor roads across Persia from the mid-1920s, and the Trans-Iranian Railway
  // was begun in 1927 (Wikipedia, "Reza Shah"). GAME: the lorry from Baghdad to Tehran takes a day less.
  { era: true, id: 'era-persiaroad', name: 'The Shah\'s new roads', from: d(6, 1, 1928), to: END, icon: 'map',
    text: 'The Shah\'s road gangs have graded the road from Qasr-i-Shirin through Kermanshah and Hamadan to Tehran. The lorries take a day less.',
    article: { headline: 'A Motor Road to Tehran', deck: 'The Kermanshah Road Graded; Lorries Save a Day', body: 'The Persian Ministry of Public Works announces the grading of the road from the Iraq frontier by Kermanshah and Hamadan to Tehran. Lorry drivers arriving at Khanaqin say the passes are kept open by gangs of road menders, and that the journey to Tehran is now a day shorter.' },
    advice: 'The lorry from Baghdad to Tehran is a day quicker. Persian stock comes west faster.',
    times: 'Baghdad to Tehran by lorry is a day quicker.',
    motor: [{ a: 'baghdad', b: 'tehran', days: 4 }], flags: ['persiaRoad'] },

  // FACT: Prime Minister Muhammad Mahmoud dissolved Parliament and suspended the constitution on 19 July 1928,
  // ruling by decree for three years (Wikipedia, "Mohamed Mahmoud Pasha"). GAME: the pashas wait to see.
  { era: true, id: 'era-ironhand', name: 'The Chamber suspended', from: d(7, 19, 1928), to: d(9, 15, 1928), icon: 'scale', unforeseen: true,
    text: 'Muhammad Mahmoud Pasha has dissolved the Chamber and suspended the constitution for three years. He will govern by decree. The Wafd is in uproar.',
    article: { headline: 'Constitution Suspended for Three Years', deck: 'Mahmoud Pasha to Rule by Decree; Wafd Protests', body: 'A royal rescript published this morning dissolves both Chambers and suspends for three years the articles of the constitution that concern them. Muhammad Mahmoud Pasha promises "the iron hand". Police are posted at the Wafd\'s offices.' },
    advice: 'Cairo\'s pashas are keeping their money in their pockets until they see which way it goes.',
    times: 'The Cairo pashas are spending less until they see which way it goes.',
    budget: 0.95, cityBid: { cairo: 0.95 } },

  // GAME: the last good winter before the crash. The record season is the game's estimate; the speculation of 1928-29
  // in New York is well known.
  { era: true, id: 'era-boom', name: 'The best winter since the war', from: d(11, 10, 1928), to: d(3, 31, 1929), icon: 'up',
    text: 'Shares in New York go up and up, and Americans with new money fill the Nile steamers. The hotels have never been so full.',
    article: { headline: 'Shepheard\'s Booked to the Roof', deck: 'Americans Flush with Wall Street Money', body: 'The hotel managers of Cairo say they have never known such a season. The Americans are spending freely, and the dealers of the Muski are selling old pieces faster than they can find them.' },
    advice: 'Old and rare pieces and Persian city carpets sell high this winter. Hold your best pieces for the Americans.',
    times: 'Americans flush with Wall Street money: old pieces and Persian city carpets sell high.',
    hint: { days: 21, text: 'Shepheard\'s and the Semiramis are booked to the roof for the winter, and half the names are American.' },
    budget: 1.06, callers: { american: 1.5, foreign: 1.15, luxury: 1.1 },
    rugs: [{ ids: AMERICAN_TASTE, label: 'Persian city carpets', sell: 1.15, at: ['giza', 'cairo', 'alexandria'] }, { ids: OLD_RARE, label: 'old and rare pieces', sell: 1.12, at: ['giza', 'cairo', 'alexandria', 'jerusalem'] }] },

  // FACT: the Persian Majlis passed the law on the uniform dress of men, with the Pahlavi cap, in December 1928
  // (shahrefarang.com, "Pahlavi hat and dress code for men"). GAME: the bazaars are uneasy.
  { era: true, id: 'era-dresslaw', name: 'The Pahlavi cap', from: d(12, 27, 1928), to: d(3, 20, 1929), icon: 'tag',
    text: 'The Majlis has passed the Shah\'s law on dress: every Persian man is to wear European clothes and the Pahlavi cap. The clergy grumble, and the tribes say they will not.',
    article: { headline: 'Persians to Wear the Pahlavi Cap', deck: 'The Majlis Passes the Law on Uniform Dress', body: 'The Persian Majlis has passed the law obliging men to wear the short coat, trousers and the peaked Pahlavi cap, the clergy excepted. Tailors in Tehran are said to be working day and night. The tribal chiefs of Fars are reported to be displeased.' },
    advice: 'The Persian bazaars are uneasy and the dealers bid less. Watch the south: the tribes are restless.',
    times: 'The Persian bazaars are uneasy and bid less, and the tribes in the south are angry.',
    cityBid: { tehran: 0.95, isfahan: 0.95, kashan: 0.95 } },
  // FACT: the tribes of Fars and the Bakhtiari rose in spring 1929; Shiraz was besieged in mid-June; the government
  // accepted terms in July and most Bakhtiari leaders gave in late in July (Wikipedia, "Persian tribal uprisings of
  // 1929"; grievances: conscription, the dress law, disarmament). GAME: Qashqai and Bakhtiari rugs stop coming.
  { era: true, id: 'era-fars', name: 'The tribes rise in Fars', from: d(4, 10, 1929), to: d(7, 31, 1929), icon: 'sword',
    text: 'The Qashqai and the other tribes of Fars have risen against conscription and the dress law, and the Bakhtiari are fighting near Isfahan. No tribal rugs are coming out of the south.',
    article: { headline: 'Tribes in Arms in Southern Persia', deck: 'Fars in Revolt; Fighting Near Isfahan', body: 'Reports from Bushire say the Qashqai and the Khamseh tribes are in arms against the government\'s conscription and its dress law, and that the roads to Shiraz are cut. Bakhtiari horsemen have fought the army west of Isfahan. Isfahan merchants say no tribal rugs have come in for weeks.' },
    advice: 'Qashqai and Bakhtiari rugs are scarce and dear everywhere: sell any you hold. Keep away from Isfahan.',
    times: 'Qashqai and Bakhtiari rugs are scarce and dear, and the Isfahan road is dangerous.',
    hint: { days: 21, text: 'the Qashqai will not wear the Pahlavi cap or send their sons to the army, and Fars is arming. Tribal rugs may soon be scarce.' },
    danger: ['isfahan'],
    rugs: [{ ids: FARS_TRIBAL, label: 'Qashqai and Bakhtiari rugs', sell: 1.22, buy: 1.25 }] },

  // FACT: rioting began in Jerusalem on 23 August 1929 and spread to Hebron (24 August), Safed and Jaffa; British troops
  // were brought from Egypt (Wikipedia, "1929 Palestine riots"). The Western Wall dispute had run since September 1928.
  // GAME: the Jerusalem markets shut, soldiers at the gates, and foreign buyers leave Palestine.
  { era: true, id: 'era-riots', name: 'Riots in Palestine', from: d(8, 23, 1929), to: d(8, 30, 1929), icon: 'warn', unforeseen: true,
    text: 'Rioting over the Western Wall has broken out in Jerusalem and spread to Hebron, Safed and Jaffa. Many are dead. Troops are coming from Egypt, and the markets are shut.',
    article: { headline: 'Bloodshed in Jerusalem and Hebron', deck: 'Troops Rushed from Egypt; Markets Shut', body: 'Disturbances which began on Friday at the Western Wall have spread across Palestine. There has been killing in Hebron and fighting in Jaffa and Safed. Battalions are on their way from Egypt by train, and the Old City of Jerusalem is under curfew.' },
    advice: 'Stay away from Jerusalem and Jaffa. The markets are shut and soldiers search everyone at the gates.',
    times: 'Jerusalem is shut, soldiers watch Jaffa, and the foreign buyers are leaving.',
    hint: { days: 10, text: 'there is bad blood in Jerusalem over the Western Wall, and the police are few.' },
    closed: ['jerusalem'], closedNote: 'The Old City is under curfew after the riots. Every shop is shut.', danger: ['jerusalem', 'jaffa'], frontier: ['palestine'], callers: { american: 0.7 } },
  // GAME: the aftermath through the autumn.
  { era: true, id: 'era-commission', name: 'Palestine after the riots', from: d(8, 31, 1929), to: d(11, 30, 1929), icon: 'warn',
    text: 'Palestine is quiet under the troops, and a commission from London is coming to inquire. Few visitors come, and Jerusalem dealers sell more than they buy.',
    article: { headline: 'A Commission for Palestine', deck: 'London Sends Inquirers; Troops Stay', body: 'The Colonial Office announces a commission of inquiry into the disturbances. The troops will stay until it reports. The American Colony and the hotels of Jerusalem report many cancellations for the winter.' },
    advice: 'Jerusalem and Jaffa dealers pay less, and the gates are still watched. Buy cheaply there if you must go.',
    times: 'Jerusalem and Jaffa pay less, and the gates are watched.',
    danger: ['jerusalem'], cityBid: { jerusalem: 0.82, jaffa: 0.9 }, cityBuy: { jerusalem: 0.9 }, callers: { american: 0.8 } },

  // FACT: the New York stock market broke on 24 October 1929 and again on 28-29 October (Wikipedia, "Wall Street crash
  // of 1929"). GAME: the Americans in Cairo stop buying at once.
  { era: true, id: 'era-crash', name: 'The crash in New York', from: d(10, 30, 1929), to: d(11, 30, 1929), icon: 'down',
    text: 'The New York share market has collapsed. Americans in Cairo are cabling their brokers from Shepheard\'s, and the carpet buyers have cancelled their orders.',
    article: { headline: 'Panic on Wall Street', deck: 'Billions Lost in Two Days; American Visitors Cancel', body: 'The share market of New York has suffered the worst fall in its history, and the panic spread to London. At Shepheard\'s the cable office has a queue. Several American parties have cancelled their Nile steamers, and the buyers for the New York carpet houses have gone home.' },
    advice: 'The Americans will not be buying this winter. Sell Persian city carpets and old pieces now, to whoever will pay, before prices fall further.',
    times: 'The Americans have stopped buying. Sell your dear pieces before prices fall further.',
    hint: { days: 14, text: 'the Americans at the hotels talk of nothing but their shares, and some say the New York market cannot go on rising.' },
    budget: 0.95, callers: { american: 0.4, luxury: 0.85 },
    rugs: [{ ids: AMERICAN_TASTE, label: 'Persian city carpets', sell: 0.85 }, { ids: OLD_RARE, label: 'old and rare pieces', sell: 0.9 }] },

  // FACT: the world slump of 1929-31; the Egyptian cotton price index (1913 = 100) fell from 159 in 1928 to 140 in 1929
  // and 109 in 1930 (Y. Gluckstein, "Egypt", 1935, https://www.marxists.org/archive/cliff/works/1935/xx/egypt.htm).
  // GAME: fewer buyers and thinner purses, the dear end hit hardest; but dealers short of cash sell cheaply, so a
  // merchant with money in hand can buy well. Hard, survivable: margins hold for one who buys cheap.
  { era: true, id: 'era-slump', name: 'The slump', from: d(12, 1, 1929), to: END, icon: 'down',
    text: 'Trade is bad everywhere. The Americans have not come, cotton is falling, and every dealer from Alexandria to Baghdad wants cash. Those who have it can buy as never before.',
    article: { headline: 'Hard Times in the Bazaars', deck: 'Dealers Want Cash; Fine Carpets Hard to Sell', body: 'The slump that began in New York has reached the bazaars of the East. Dealers in the Muski say the winter visitors are fewer by half and the Americans almost absent. Merchants are selling stock at a loss to meet their bills. A man with ready money, says one old dealer, can furnish a palace for the price of a house.' },
    advice: 'Buyers are fewer and spend less, and the dear pieces suffer most. But stock is cheap everywhere: buy with cash, keep costs low, and sell ordinary rugs that people still need.',
    times: 'Fewer buyers and thinner purses, the dear carpets hardest hit. But dealers sell cheaply for cash: buy well and keep your costs down.',
    budget: 0.88, callers: { american: 0.2, foreign: 0.75, luxury: 0.7, cotton: 0.7 },
    cityBid: { alexandria: 0.9, cairo: 0.93, tanta: 0.88, beirut: 0.92, baghdad: 0.92, istanbul: 0.92 },
    rugs: [{ ids: LUXURY, label: 'city carpets and treasures', sell: 0.86 }, { ids: Object.keys(RUGS), label: 'every rug', buy: 0.85 }] },

  // FACT: the Wafd won the elections of December 1929 and Nahhas Pasha formed a government on 1 January 1930
  // (Wikipedia, "1929 Egyptian parliamentary election"). GAME: new deputies buy for their reception rooms.
  { era: true, id: 'era-nahhas', name: 'The Wafd returns', from: d(1, 1, 1930), to: d(1, 25, 1930), icon: 'scale',
    text: 'The Wafd has won the elections and Nahhas Pasha has formed a government. New deputies are in Cairo, and every one of them wants a carpet for his reception room.',
    article: { headline: 'Nahhas Pasha Forms a Government', deck: 'The Wafd Back in Power; The Chamber to Meet', body: 'After its sweeping victory at the polls, the Wafd returns to office under Mustafa el-Nahhas Pasha. Deputies from the provinces are taking rooms in Cairo for the opening of the Chamber. The upholsterers report the first good week since the autumn.' },
    advice: 'A good fortnight in hard times: Cairo wants fine, quiet carpets for the deputies\' reception rooms.',
    times: 'A good fortnight for fine, quiet carpets in Cairo, slump or no slump.',
    demand: [{ sid: 'cairo', traits: ['fineWeave', 'restrained', 'ornate'], mult: 1.2 }], budget: 1.04 },

  // FACT: the United States tariff act of 17 June 1930 (Smoot-Hawley) raised duties on imported carpets; Iranica
  // ("Carpets xii") counts the American tariffs as weighing more on Persian carpets than the Depression itself.
  // GAME: Kerman and Sarouk workshops, which wove for America, have stock they cannot ship: cheap at the source.
  { era: true, id: 'era-tariff', name: 'The American tariff', from: d(6, 25, 1930), to: END, icon: 'down',
    text: 'Washington has put a heavy new duty on carpets. The Kerman and Sarouk workshops, which wove for New York, have stacks they cannot ship.',
    article: { headline: 'America Shuts Its Door on Carpets', deck: 'New Tariff Signed; Persian Workshops Idle', body: 'President Hoover has signed the new tariff, with heavy duties on carpets and rugs among a thousand other goods. In Kerman, it is said, half the looms have stopped, and the exporters\' warehouses are full of carpets made for New York.' },
    advice: 'Kerman, Sarouk, Heriz and Tabriz carpets cost far less in Persia and Baghdad, and fetch less too. A merchant who can wait for better times can buy them very cheaply.',
    times: 'Sarouk and Kerman carpets are cheap at the source and sell for less. Buy them only to hold.',
    hint: { days: 30, text: 'Washington is to put a heavy duty on carpets, and the Kerman workshops are frightened.' },
    rugs: [{ ids: AMERICAN_TASTE, label: 'Sarouk and Kerman carpets', buy: 0.7, sell: 0.88 }] },

  // FACT: King Fuad turned out the Nahhas government and made Ismail Sidqi prime minister on 20 June 1930; the Chamber
  // was dissolved in July and riots followed, with some two dozen killed by 15 July (Wikipedia, "Ismail Sidky").
  { era: true, id: 'era-sidqi', name: 'Riots against Sidqi', from: d(7, 8, 1930), to: d(7, 22, 1930), icon: 'warn',
    text: 'The King has dismissed Nahhas and given the government to Ismail Sidqi Pasha. The Wafd has called the country out: there are riots in Cairo, Alexandria and the Delta towns, and troops have fired on crowds.',
    article: { headline: 'Riots in Cairo and Alexandria', deck: 'Troops Fire on Crowds; Sidqi Pasha Stands Firm', body: 'Demonstrations against the new government of Ismail Sidqi Pasha have turned to rioting in Cairo, Alexandria and Mansura. Troops have fired on crowds, and there are dead in Alexandria. The trams are not running and the shops of the European quarter have their shutters down.' },
    advice: 'Keep your stock indoors. Few buyers are out, and there are soldiers at the gates of Cairo and Alexandria.',
    times: 'Few buyers out, and soldiers in Cairo and Alexandria.',
    hint: { days: 14, text: 'the King has turned out Nahhas, and the Wafd will not take it quietly.' },
    budget: 0.9, footfall: -1, danger: ['cairo', 'alexandria'] },
  // FACT: the constitution of 22 October 1930 (Royal Order No. 70) reduced the Chamber and changed the franchise
  // (Wikipedia, "Egyptian Constitution of 1930").
  { era: true, id: 'era-constitution', name: 'Sidqi\'s constitution', from: d(10, 22, 1930), to: d(11, 5, 1930), icon: 'scroll',
    text: 'Sidqi Pasha has given Egypt a new constitution with a smaller Chamber and an indirect vote. The Wafd will boycott it. Cairo is sullen and quiet.',
    article: { headline: 'A New Constitution for Egypt', deck: 'Smaller Chamber, Indirect Elections; Wafd to Boycott', body: 'A royal order published today replaces the constitution of 1923. The Chamber is reduced, and deputies will be chosen in two stages. The Wafd and the Liberals have announced that they will take no part in the elections.' },
    advice: 'Cairo is quiet and buyers are wary for a fortnight.',
    times: 'Cairo is sullen and its buyers wary.',
    budget: 0.97 },
  // FACT: Egyptian cotton fell to an index of 109 in 1930 and 56 in 1931 (Gluckstein, as above). GAME: the harvest
  // of 1930 brings no money to the Delta.
  { era: true, id: 'era-cotton30', name: 'Cotton at the bottom', from: d(9, 1, 1930), to: END, icon: 'down',
    text: 'The cotton is picked, and nobody will pay for it. Prices are the lowest since before the war. The Delta landowners have nothing to spend, and the fellahin cannot pay their rents.',
    article: { headline: 'Cotton Lower Than Before the War', deck: 'The Harvest Brings No Money to the Delta', body: 'At the Minet el-Bassal exchange cotton is quoted lower than at any time since before the war. The government is buying to hold up the price, without much effect. Landowners in the Delta say they will not cover their costs.' },
    advice: 'Tanta and Alexandria pay little and the cotton families have stopped buying. Sell elsewhere.',
    times: 'The Delta has no money. Sell away from Tanta and Alexandria.',
    budget: 0.95, cityBid: { tanta: 0.8, alexandria: 0.92 }, callers: { cotton: 0.5 } },
];

/** the article and advice the Courier prints for an era event */
export const isEra = (e: GameEvent): e is EraEvent => (e as EraEvent).era === true;
const ERA_BY_ID: Record<string, EraEvent> = Object.fromEntries(ERA_EVENTS.map((e) => [e.id, e]));
export const eraById = (id: string) => ERA_BY_ID[id];

// ---------- helpers: by day (the list is fixed, so a small cache does) ----------
const onCache = new Map<number, EraEvent[]>();
export const eraOn = (day: number): EraEvent[] => {
  let r = onCache.get(day);
  if (!r) { if (onCache.size > 64) onCache.clear(); r = ERA_EVENTS.filter((e) => day >= e.from && day <= e.to); onCache.set(day, r); }
  return r;
};
/** is this option open today? */
export const eraFlag = (day: number, f: EraFlag) => eraOn(day).some((e) => e.flags?.includes(f));
const fits = (fx: RugFx, typeId: string, at: string) => fx.ids.includes(typeId) && (!fx.at || fx.at.includes(at));
/** what buyers at `at` ('giza' for the stall) pay for this rug because of the times */
export function eraSellMult(day: number, typeId: string, at: string): number {
  let m = 1;
  for (const e of eraOn(day)) for (const fx of e.rugs ?? []) if (fx.sell && fits(fx, typeId, at)) m *= fx.sell;
  return m;
}
/** what this rug costs to buy at `at` ('giza' for Rashid) because of the times */
export function eraBuyMult(day: number, typeId: string, at: string): number {
  let m = 1;
  for (const e of eraOn(day)) for (const fx of e.rugs ?? []) if (fx.buy && fits(fx, typeId, at)) m *= fx.buy;
  return m;
}
/** a motor service as the times have it: fewer days, a lower fare */
export function eraMotor(day: number, a: string, b: string, base: { days: number; fare: number }): { days: number; fare: number } {
  let { days, fare } = base;
  for (const e of eraOn(day)) for (const m of e.motor ?? []) if ((m.a === a && m.b === b) || (m.a === b && m.b === a)) {
    if (m.days !== undefined) days = Math.min(days, m.days);
    if (m.fare !== undefined) fare = Math.round(fare * m.fare);
  }
  return { days, fare };
}

// ---------- "The times": what is going on, and what the coffee houses say is coming ----------
export interface TimesLine { id: string; name: string; text: string; icon?: string; since: number }
export interface Times { now: TimesLine[]; talk: { id: string; text: string; inDays: number }[] }
/** the hint's first day */
export const hintDay = (e: EraEvent) => (e.hint ? e.from - e.hint.days : Infinity);
/** what the times are today: the shifts on now (newest first) and the talk of what is coming */
export function timesOn(day: number): Times {
  const now = eraOn(day).slice().sort((a, b) => b.from - a.from).map((e) => ({ id: e.id, name: e.name, text: e.times, icon: e.icon, since: e.from }));
  const talk = ERA_EVENTS.filter((e) => e.hint && day >= hintDay(e) && day < e.from).sort((a, b) => a.from - b.from).map((e) => ({ id: e.id, text: `Talk in the coffee houses: ${e.hint!.text.charAt(0).toUpperCase()}${e.hint!.text.slice(1)}`, inDays: e.from - day }));
  return { now, talk };
}

/** The night's word on the times, for the morning notes and the journal: talk that starts tonight and the shifts
 *  that begin. (The event's own story is already in the morning notes from life.ts eventsStarting.) */
export function eraNight(day: number): { notes: string[]; journal: string[] } {
  const notes: string[] = [], journal: string[] = [];
  for (const e of ERA_EVENTS) {
    if (e.hint && hintDay(e) === day) {
      const t = `Talk in the coffee houses: ${e.hint.text.charAt(0).toUpperCase()}${e.hint.text.slice(1)}`;
      notes.push(t); journal.push(t);
    }
    if (e.from === day) journal.push(`The times: ${e.name}. ${e.times}`);
  }
  return { notes, journal };
}

/** what an era event changes, in a trader's words, beyond the town prices BigNews already reads */
export function eraMeans(e: GameEvent): string[] {
  if (!isEra(e)) return [];
  const out: string[] = [];
  const pc = (m: number) => `${Math.round(Math.abs(m - 1) * 100)}%`;
  for (const fx of e.rugs ?? []) {
    const where = fx.at ? ` in ${fx.at.map((x) => (x === 'giza' ? 'your stall' : x === 'istanbul' ? 'Constantinople' : x.charAt(0).toUpperCase() + x.slice(1))).slice(0, 3).join(', ')}` : '';
    const label = fx.label.charAt(0).toUpperCase() + fx.label.slice(1);
    if (fx.sell && fx.sell !== 1) out.push(`${label} fetch ${fx.sell > 1 ? 'more' : 'less'}${where} (about ${pc(fx.sell)}).`);
    if (fx.buy && fx.buy !== 1) out.push(`${label} cost ${fx.buy > 1 ? 'more' : 'less'} to buy${where} (about ${pc(fx.buy)}).`);
  }
  for (const m of e.motor ?? []) out.push(`The motor service ${m.a.charAt(0).toUpperCase() + m.a.slice(1)} to ${m.b.charAt(0).toUpperCase() + m.b.slice(1)}${m.days ? ` takes ${m.days === 1 ? 'a day and a night' : `${m.days} days`}` : ''}${m.fare && m.fare < 1 ? ', for a lower fare' : ''}.`);
  if (e.flags?.includes('airmail')) out.push('Letters from Baghdad reach you in a day.');
  if (e.frontier?.length) out.push(`The ${e.frontier.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join(' and ')} frontier searches loads with care.`);
  return out;
}
