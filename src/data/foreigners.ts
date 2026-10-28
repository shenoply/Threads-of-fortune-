// The foreign communities of 1925, town by town: who actually lived in Egypt, the Levant, Iraq, Anatolia
// and Persia under the Mandates and the Protectorate, and what they did there. Each entry is the head of
// a household; the world (game/systems/population.ts) gives each a name from their own people, and a
// family where they had one: a wife of their own people, or a mixed marriage (a Greek grocer's Egyptian-
// Christian wife, an Egyptian lawyer's English wife), with children who carry both.
//
// Notes on the history behind the list:
// - Egypt: some 200,000 foreigners lived in Egypt by the 1927 census, protected by the Capitulations and
//   tried at the Mixed Courts. Greeks were the largest community (grocers, bakers, cotton brokers,
//   cigarette makers), then Italians (builders, mechanics, architects), the British (the army, the
//   police, the ministries), the French (lawyers of the Mixed Courts, the Suez Canal Company, the schools,
//   archaeology), the Maltese (British subjects: clerks, pilots, port trades), Swiss and Belgians (hotels,
//   the Heliopolis tramways), and Russian émigrés after 1920. Syro-Lebanese Christians ("Shawam") ran
//   newspapers and banks; Sephardi Jewish families were bankers and merchants, Karaites goldsmiths.
//   Albanians had come with Muhammad Ali's army a century before and kept a community in Cairo.
//   The royal family and much of the old pasha class were Turco-Circassian.
// - Palestine: British Mandate officials and the Palestine Police; German Templer colonies (Jaffa,
//   Sarona, Jerusalem); the American Colony in Jerusalem; Russian Orthodox nuns and pilgrims; Jewish
//   immigrants from Russia and Poland, and old Sephardi and Yemenite families.
// - Syria and Lebanon: the French Mandate (officers, administrators, the Banque de Syrie), the American
//   University of Beirut, Armenian refugees in Aleppo and Beirut after 1915–1923.
// - Transjordan: Circassians and Chechens (who had resettled Amman in the 1870s), the British officers
//   of the Arab Legion.
// - Iraq: the British Mandate (officials, the RAF at Hinaidi), Indian traders, the Khanaqin oil field
//   (the Khanaqin Oil Company was formed in 1925), American missionaries.
// - Anatolia and Constantinople: Levantine Italian and French families of Pera, White Russian refugees,
//   American college teachers, the Greeks of Constantinople (exempt from the 1923 exchange); in Angora,
//   foreign advisers to the new Republic.
// - Persia: Belgian officials ran the customs, an American financial mission (1922–27) ran the
//   treasury, the Imperial Bank of Persia and the Anglo-Persian Oil Company were British, mission
//   hospitals stood in Isfahan and Kerman, Russian émigrés and Soviet traders were in Tabriz and Tehran.
// None of the people are real: the roles are.

export type Foreign = 'british' | 'french' | 'italian' | 'maltese' | 'albanian' | 'russian' | 'american' | 'jewish' | 'circassian' | 'german' | 'swiss' | 'belgian' | 'indian' | 'shami';
export type FamilyKind = 'alone' | 'own' | 'mixed-egypt' | 'mixed-levant' | 'mixed-greek' | 'mixed-armenian' | 'mixed-british';

export interface ForeignHead {
  city: string;
  c: Foreign | 'greek' | 'armenian';
  sex?: 'm' | 'f';
  age: number;
  rank: 'humble' | 'trade' | 'notable' | 'grand';
  title: string;
  fam: FamilyKind;
  bio: string;
  /** what they say when asked about their trade */
  talk: string;
  goods?: string;
}

export const FOREIGN_NAMES: Record<Foreign, { m: string[]; f: string[]; fam: string[] }> = {
  british: { m: ['Arthur', 'Reginald', 'Hugh', 'Cecil', 'Percy', 'Gerald', 'Harold', 'Edward', 'Frederick', 'Walter', 'Archibald', 'Leonard', 'Basil', 'Neville', 'Douglas'], f: ['Margaret', 'Dorothy', 'Edith', 'Violet', 'Winifred', 'Mabel', 'Gertrude', 'Muriel', 'Ethel', 'Constance'], fam: ['Pemberton', 'Ashworth', 'Hartley', 'Fenwick', 'Carstairs', 'Whitcombe', 'Blakeney', 'Thorne', 'Lockwood', 'Prentice', 'Merriweather', 'Hollis', 'Duckworth', 'Ravensworth', 'Fairfax'] },
  french: { m: ['Henri', 'Gaston', 'Marcel', 'Lucien', 'Émile', 'Jules', 'Raoul', 'Étienne', 'Octave', 'Fernand', 'Armand'], f: ['Madeleine', 'Germaine', 'Odette', 'Simone', 'Yvonne', 'Hélène', 'Marguerite'], fam: ['Delacroix', 'Moreau', 'Lefebvre', 'Garnier', 'Rousseau', 'Mercier', 'Duval', 'Chevalier', 'Bonnard', 'Fournier'] },
  italian: { m: ['Giuseppe', 'Antonio', 'Luigi', 'Enrico', 'Carlo', 'Vittorio', 'Umberto', 'Alfredo', 'Ernesto', 'Giovanni', 'Salvatore'], f: ['Giulia', 'Teresa', 'Elena', 'Rosa', 'Lucia', 'Carmela', 'Angela', 'Bianca'], fam: ['Rossi', 'Ferrari', 'Bianchi', 'Lombardi', 'Esposito', 'Marino', 'Galli', 'Conti', 'Ricci', 'Moretti', 'Baldini'] },
  maltese: { m: ['Giorgio', 'Salvu', 'Ġużeppi', 'Pawlu', 'Carmelo', 'Ninu', 'Wigi'], f: ['Marija', 'Rożi', 'Tereża', 'Kunċetta', 'Anġla'], fam: ['Camilleri', 'Borg', 'Vella', 'Farrugia', 'Zammit', 'Grech', 'Mifsud', 'Azzopardi'] },
  albanian: { m: ['Ismail', 'Ahmet', 'Hysen', 'Bajram', 'Ramiz', 'Dervish', 'Kasem', 'Sulejman'], f: ['Hatixhe', 'Fatime', 'Emine', 'Lule', 'Drita'], fam: ['Gjoka', 'Kola', 'Leka', 'Dibra', 'Kruja', 'Delvina', 'Shehu'] },
  russian: { m: ['Nikolai', 'Sergei', 'Alexei', 'Pavel', 'Mikhail', 'Konstantin', 'Dmitri', 'Igor', 'Vladimir'], f: ['Natalia', 'Olga', 'Tatiana', 'Vera', 'Irina', 'Ksenia', 'Lyudmila'], fam: ['Smirnov', 'Morozov', 'Petrov', 'Sokolov', 'Ivanov', 'Kuznetsov', 'Belov', 'Lebedev'] },
  american: { m: ['Henry', 'Charles', 'George', 'Samuel', 'Elmer', 'Chester', 'Clarence', 'Howard', 'Lyman', 'Ezra'], f: ['Grace', 'Helen', 'Ruth', 'Florence', 'Clara', 'Harriet', 'Mildred'], fam: ['Whitaker', 'Caldwell', 'Holbrook', 'Spencer', 'Thayer', 'Barlow', 'Kimball', 'Prescott', 'Lowell'] },
  jewish: { m: ['Moïse', 'Joseph', 'Élie', 'Isaac', 'Salomon', 'Victor', 'Raphaël', 'Haim', 'Yaakov', 'Avraham', 'Mordechai'], f: ['Rachel', 'Esther', 'Sarah', 'Léa', 'Rebecca', 'Miriam', 'Fortunée'], fam: ['Toledano', 'Nahmias', 'Benaroya', 'Mizrahi', 'Castro', 'Abravanel', 'Levi', 'Halevi', 'Ginzburg', 'Rosenblum', 'Sharabi'] },
  circassian: { m: ['Kamal', 'Ismail', 'Fuad', 'Yusuf', 'Ali', 'Mehmed', 'Hasan', 'Said'], f: ['Nazli', 'Gülfidan', 'Şemsigül', 'Mihrimah', 'Safinaz'], fam: ['Natkho', 'Khutat', 'Kabardi', 'Mirza', 'Shapsugh', 'Bzhedug', 'Kabartay'] },
  german: { m: ['Friedrich', 'Gottlieb', 'Heinrich', 'Karl', 'Wilhelm', 'Johannes', 'Otto', 'Ludwig'], f: ['Lina', 'Frieda', 'Gertrud', 'Martha', 'Hedwig', 'Elise'], fam: ['Hoffmann', 'Schneider', 'Wagner', 'Bauer', 'Keller', 'Fischer', 'Weber', 'Krafft'] },
  swiss: { m: ['Hans', 'Rudolf', 'Ulrich', 'Werner', 'Pierre', 'Jakob'], f: ['Anna', 'Verena', 'Rosalie', 'Ida'], fam: ['Baumann', 'Steiner', 'Brunner', 'Gerber', 'Meier', 'Vuilleumier'] },
  belgian: { m: ['Gustave', 'Léon', 'Albert', 'Joseph', 'Désiré', 'Edmond'], f: ['Jeanne', 'Mathilde', 'Léonie', 'Clémence'], fam: ['Lambert', 'Dupont', 'Janssens', 'Peeters', 'Wouters', 'Claes', 'Mertens'] },
  indian: { m: ['Abdul-Hussein', 'Mulla Taher', 'Fazal', 'Ghulam Ali', 'Karim Bhai', 'Abdulla Bhai', 'Jaffer'], f: ['Zainab', 'Rubab', 'Sakina', 'Khatija'], fam: ['Lakdawala', 'Merchant', 'Rangoonwala', 'Bhaiji', 'Poonawala', 'Dhanji'] },
  shami: { m: ['Iskandar', 'Salim', 'Bechara', 'Gabriel', 'Michel', 'Antoun', 'Philippe', 'Naguib'], f: ['Hélène', 'Mary', 'Labiba', 'Rose', 'Alice', 'Marguerite'], fam: ['Farah', 'Nasr', 'Ghosn', 'Rizk', 'Daoud', 'Khalil', 'Sabbagh', 'Chakour'] },
};

// faith: everyone Christian except as marked; Albanians, Circassians and the Bohra traders are Muslim
export const FOREIGN_FAITH: Partial<Record<Foreign, 'muslim' | 'jewish'>> = { albanian: 'muslim', circassian: 'muslim', indian: 'muslim', jewish: 'jewish' };
/** which part of the portrait pool their faces come from */
export const FOREIGN_POOL: Record<Foreign, 'european' | 'greek' | 'anatolia' | 'levant' | 'iraq'> = {
  british: 'european', french: 'european', italian: 'european', german: 'european', swiss: 'european', belgian: 'european', american: 'european', russian: 'european',
  maltese: 'greek', albanian: 'anatolia', circassian: 'anatolia', jewish: 'levant', shami: 'levant', indian: 'iraq',
};
export const FOREIGN_WORD: Record<Foreign | 'greek' | 'armenian', string> = {
  british: 'English', french: 'French', italian: 'Italian', maltese: 'Maltese', albanian: 'Albanian', russian: 'Russian', american: 'American', jewish: 'Jewish',
  circassian: 'Circassian', german: 'German', swiss: 'Swiss', belgian: 'Belgian', indian: 'Indian', shami: 'Syrian', greek: 'Greek', armenian: 'Armenian',
};

const h = (city: string, c: ForeignHead['c'], age: number, rank: ForeignHead['rank'], title: string, fam: FamilyKind, bio: string, talk: string, extra: Partial<ForeignHead> = {}): ForeignHead => ({ city, c, age, rank, title, fam, bio, talk, ...extra });

export const FOREIGN_HEADS: ForeignHead[] = [
  // ---- Cairo ----
  h('cairo', 'british', 46, 'notable', 'Major of the garrison at Abbasiya', 'own', 'Came out with his regiment in 1916 and stayed when it went home. Plays polo at Gezira on Saturdays and complains about it on Sundays.', 'The Army buys carpets by the yard for the officers\' mess. Ugly ones, mostly. If you have ugly ones, I am your man.'),
  h('cairo', 'british', 52, 'notable', 'Adviser to the Ministry of the Interior', 'own', 'Has been "about to retire to Dorset" for nine years.', 'Since independence I advise and the minister decides. It is restful, in its way.'),
  h('cairo', 'british', 29, 'trade', 'Lieutenant of the Cairo City Police', 'alone', 'Learned his Arabic in the bazaar and his manners in the barracks. Both are improving.', 'Pickpockets in the Muski, effendi. Watch your purse, and watch the man who tells you to watch it.'),
  h('cairo', 'french', 55, 'notable', 'Judge of the Mixed Courts', 'own', 'Tries the cases of foreigners in Egypt under the Capitulations. Has a low opinion of everyone\'s lawyers, including his own.', 'If a foreigner cheats you, the Mixed Courts will hear it. Eventually. Bring patience and a good interpreter.'),
  h('cairo', 'french', 41, 'trade', 'Archaeologist of the French Institute', 'mixed-levant', 'Digs at Saqqara in the winter and argues about it in Paris in the summer.', 'An old rug is a document, monsieur. Most dealers read them upside down.'),
  h('cairo', 'italian', 48, 'trade', 'Architect of apartment houses in Ismailia quarter', 'own', 'Half of the new buildings on Soliman Pasha Street have his balconies on them.', 'A good rug and a marble floor are the same thing: they must last a hundred years and look as if they cost more.'),
  h('cairo', 'italian', 36, 'humble', 'Motor mechanic in Bulaq', 'mixed-egypt', 'Keeps the pashas\' Fiats running and their chauffeurs honest.', 'Bring me a lorry that runs and I will make it run better. Bring me one that does not, and pray.'),
  h('cairo', 'greek', 50, 'trade', 'Grocer and wine merchant on Clot Bey Street', 'own', 'Sells olives, raki, tinned sardines and credit, in that order.', 'Every Greek in Egypt starts with a grocery. The clever ones end with a bank. I am still in groceries.', { goods: 'groceries and wine' }),
  h('cairo', 'greek', 44, 'trade', 'Cigarette maker of Kasr el-Nil', 'mixed-levant', 'His cigarettes are rolled by forty girls and smoked by every officer in Cairo.', 'Egyptian tobacco is Turkish leaf rolled in Cairo by Greeks and smoked by Englishmen. Everyone is happy.', { goods: 'cigarettes' }),
  h('cairo', 'shami', 58, 'grand', 'Owner of a Cairo newspaper', 'own', 'His family came from Beirut sixty years ago and has printed half the news in Egypt since.', 'A merchant who advertises in my paper sells twice as much, and pays me for the privilege. You see the beauty of it.'),
  h('cairo', 'jewish', 60, 'grand', 'Banker of the Sephardi community', 'own', 'His family financed the cotton boom, the sugar mills and two khedives. Speaks five languages, all of them politely.', 'Money is like water, effendi. It goes where it is welcome and stays where it is safe.'),
  h('cairo', 'jewish', 38, 'trade', 'Karaite goldsmith of the Khan el-Khalili', 'own', 'His family has worked gold in the Jewish quarter longer than anyone can remember.', 'Gold does not lie, and neither do I. The scales are there: weigh it yourself.', { goods: 'gold work' }),
  h('cairo', 'albanian', 62, 'notable', 'Bey of an old Albanian family', 'mixed-egypt', 'His grandfather came with Muhammad Ali\'s Albanian regiments in 1801. The family has forgotten Albanian but not the grudges.', 'We came to Egypt with swords. Now we come with lawyers. It is called progress.'),
  h('cairo', 'circassian', 64, 'grand', 'Pasha of the old Turco-Circassian court', 'own', 'Owns land in three provinces and opinions about all of them. Speaks Turkish to his wife, French to his sons and Arabic to his servants.', 'In my father\'s day a pasha did not ask the price. I ask. It frightens them.'),
  h('cairo', 'russian', 47, 'humble', 'A former colonel, now a riding master', 'own', 'Fought the Bolsheviks in the Crimea, lost, and came to Egypt with a sabre, a wife and a samovar.', 'In Petersburg we had carpets from Bukhara on every wall. Now I have one, and the landlord wants it.'),
  h('cairo', 'swiss', 50, 'trade', 'Manager of a grand hotel by the Ezbekiya', 'own', 'Runs his hotel like a Swiss clock and his kitchen like a Swiss bank.', 'My guests want an Oriental carpet in every room and an English breakfast on every table. I supply both.'),
  h('cairo', 'american', 45, 'trade', 'Teacher at the new American University', 'own', 'Came to teach chemistry for one year in 1919. Still here, still teaching chemistry.', 'Our students want two things: a degree and a government job. I can give them the first.'),
  h('cairo', 'maltese', 40, 'humble', 'Clerk at the Egyptian State Railways', 'mixed-egypt', 'A British subject by passport, an Egyptian by habit and a Maltese at Christmas.', 'Every timetable in Egypt passes my desk. None of them is kept. I still type them.'),
  // ---- Giza and Saqqara ----
  h('giza', 'american', 52, 'notable', 'Director of an American dig at the pyramids', 'own', 'Has lived in a mud-brick dig house below the Great Pyramid for twenty years and measures everything twice.', 'I pay my diggers better than anyone in Giza, and I know every one of them by name. They steal less that way.'),
  h('giza', 'british', 34, 'trade', 'Agent for a tourist company at Mena House', 'alone', 'Sells camel rides to Americans who want to see the Sphinx and photographs of them doing it.', 'They buy a rug on the last day, in a hurry, at any price. Be there on the last day.'),
  h('saqqara', 'french', 58, 'notable', 'Inspector of Antiquities at Saqqara', 'mixed-egypt', 'Has dug at the step pyramid for so long the workmen call him "the old man of the tombs".', 'Everything in this sand has been bought and sold at least twice. Mostly by my workmen.'),
  // ---- Tanta, Fayoum ----
  h('tanta', 'greek', 54, 'trade', 'Cotton broker of Tanta', 'mixed-levant', 'Buys the Delta\'s cotton in the field and sells it in Alexandria before it is picked.', 'Cotton is a gamble, and I am the house. Mostly.', { goods: 'cotton futures' }),
  h('tanta', 'greek', 30, 'humble', 'Baker of the Greek quarter', 'own', 'Bakes koulouria for the Greeks and aish baladi for everyone else.', 'Bread at five in the morning, bread at five at night. In between I sleep, if the children allow it.'),
  h('fayoum', 'british', 49, 'trade', 'Irrigation engineer of the Fayoum', 'own', 'Knows every canal and sluice in the Fayoum and most of the men who cut them illegally.', 'Water is the only thing in Egypt more argued over than money. I referee.'),
  // ---- Alexandria ----
  h('alexandria', 'greek', 62, 'grand', 'Cotton magnate of the Minet el-Bassal exchange', 'own', 'His warehouses fill the old harbour and his name is on a hospital, a school and a racehorse.', 'Alexandria is a Greek city that happens to be in Egypt. Ask any Greek.', { goods: 'cotton' }),
  h('alexandria', 'greek', 40, 'trade', 'Ship\'s chandler of the Eastern Harbour', 'mixed-egypt', 'Sells rope, paint, tinned beef and gossip to every captain who docks.', 'A ship stays four days. In four days a sailor wants everything and pays for nothing.'),
  h('alexandria', 'italian', 57, 'notable', 'Banker of the Banco di Roma', 'own', 'His family has lived in Alexandria since the days of the old Khedive and owns a villa on every hill.', 'In Alexandria we speak French in the bank, Italian at home, Greek in the market and Arabic to the cook.'),
  h('alexandria', 'italian', 33, 'humble', 'Stonemason of the Corniche works', 'mixed-egypt', 'Came from Naples to build the sea wall and married the girl who brought the workmen\'s lunch.', 'I build the wall and the sea knocks it down. We are old friends.'),
  h('alexandria', 'jewish', 55, 'grand', 'Merchant prince of Alexandria', 'own', 'His family\'s house in Rue Rosette has a ballroom, a synagogue and a garden with peacocks.', 'My grandfather came with a bale of cotton. We still have the bale. It is framed.'),
  h('alexandria', 'british', 44, 'notable', 'Harbour master of Alexandria', 'own', 'Runs the port with a whistle, a telescope and a temper.', 'Everything that comes into Egypt by sea goes past my window. Including you, sir.'),
  h('alexandria', 'french', 39, 'trade', 'Teacher at the Lycée Français', 'alone', 'Teaches Racine to the sons of pashas and Molière to the daughters of grocers.', 'Our pupils speak beautiful French and will never set foot in France. It is a very Alexandrian education.'),
  h('alexandria', 'maltese', 50, 'humble', 'Harbour pilot of the Western Harbour', 'own', 'Has brought eight thousand ships through the harbour mouth and sunk none of them. He will tell you about each.', 'The sand bar moves every winter. I know where it is. The charts do not.'),
  h('alexandria', 'shami', 46, 'notable', 'Lawyer of the Mixed Courts', 'mixed-egypt', 'Argues in French, swears in Arabic and bills in pounds sterling.', 'The law is the same for everyone in Egypt. The fees are not.'),
  h('alexandria', 'russian', 52, 'humble', 'A former princess, now a teacher of piano', 'alone', 'Escaped Odessa in 1920 with a fur coat, a Bible and a piano score. The coat was sold, the Bible kept.', 'In Russia I had a hundred servants. Now I have pupils. They are worse.', { sex: 'f' }),
  // ---- Port Said, Suez ----
  h('portsaid', 'french', 50, 'notable', 'Engineer of the Suez Canal Company', 'own', 'Lives in a white house with green shutters by the Canal Company offices and keeps Paris time.', 'Forty ships a day, monsieur, and every one pays. The Canal is the best shop in the world.'),
  h('portsaid', 'french', 27, 'trade', 'Pilot of the Suez Canal Company', 'alone', 'Takes the great liners through the Canal and drinks pastis on the quay when he is done.', 'Eight hours from Port Said to Suez, and the captain wants to know each minute where his ship is.'),
  h('portsaid', 'greek', 45, 'trade', 'Ship\'s supplier of the Port Said quay', 'mixed-levant', 'Sells everything to everyone at the Canal mouth, and some of it twice.', 'Passengers come ashore for two hours and want souvenirs. I sell them the same rug every week.', { goods: 'ship supplies' }),
  h('portsaid', 'british', 51, 'notable', 'Agent of a P&O shipping line', 'own', 'Meets every liner from Bombay with a clipboard and a cold.', 'Officers on home leave buy rugs for their mothers. Small ones. Their mothers have small houses.'),
  h('portsaid', 'maltese', 35, 'humble', 'Boatman of the Canal mouth', 'mixed-egypt', 'Rows passengers ashore for a shilling and back for two.', 'Ashore it is one shilling. Back to the ship, when it is about to sail, the price changes.'),
  h('portsaid', 'indian', 48, 'trade', 'Bohra trader of silks and curios', 'own', 'Sells Benares silk and Kashmir shawls to passengers going east, and Egyptian brass to those going west.', 'East or west, a passenger wants something to show his wife. I sell him the proof he was abroad.', { goods: 'silks and curios' }),
  h('suez', 'british', 38, 'trade', 'Quarantine doctor at Suez', 'own', 'Inspects every pilgrim ship from the Hejaz and every liner from India, and trusts none of them.', 'Cholera, plague, typhus: I see them all before Egypt does. That is the job.'),
  h('suez', 'greek', 52, 'trade', 'Hotel keeper at Port Tewfik', 'mixed-egypt', 'Keeps the only clean hotel in Suez and makes sure everyone knows it.', 'Travellers stop one night at Suez and swear never again. Then they come back, because there is nowhere else.'),
  // ---- Palestine ----
  h('jerusalem', 'british', 50, 'notable', 'District Commissioner of Jerusalem', 'own', 'Governs the Holy City with a fountain pen and a great deal of tact.', 'Every stone here belongs to three religions and four lawyers. I try not to step on any of them.'),
  h('jerusalem', 'british', 31, 'trade', 'Inspector of the Palestine Police', 'alone', 'Came from the Black and Tans in Ireland and wants to forget it.', 'The roads to Jericho are quiet this month. Next month, who knows.'),
  h('jerusalem', 'american', 60, 'notable', 'Elder of the American Colony', 'own', 'Came from Chicago forty years ago with a religious community that now runs a hotel, a photography studio and a hospital.', 'We came to wait for the end of the world. In the meantime we opened a shop.'),
  h('jerusalem', 'russian', 58, 'humble', 'Abbess of a Russian convent on the Mount of Olives', 'alone', 'Her nuns were cut off from Russia by the Revolution. She keeps the bells rung and the accounts honest.', 'We pray, we embroider, we sell the embroidery. God takes the prayers; the pilgrims take the rest.', { sex: 'f' }),
  h('jerusalem', 'german', 55, 'trade', 'Builder of the German Colony', 'own', 'A Templer, from a Württemberg family that came to the Holy Land in 1869 to build the Kingdom of God, and built houses instead.', 'Stone, timber, iron: everything a house needs. The Kingdom of God takes longer.'),
  h('jerusalem', 'jewish', 42, 'trade', 'Bookseller of the Jaffa Road', 'own', 'Came from Odessa in 1921 with a crate of books and a cough.', 'Hebrew, Russian, German, Arabic: I sell books in every language and read them in all of them.', { goods: 'books' }),
  h('jaffa', 'german', 48, 'trade', 'Orange grower of the Templer colony at Sarona', 'own', 'Grows Jaffa oranges, ships them to Liverpool and complains about the price in three languages.', 'An orange from Jaffa is worth two from Spain. Tell that to the English grocer.', { goods: 'oranges' }),
  h('jaffa', 'jewish', 35, 'trade', 'Engineer of the new Tel Aviv', 'mixed-british', 'Came from Warsaw to build a city on the sand dunes north of Jaffa.', 'Ten years ago it was sand. Now it is sand with houses on it.'),
  h('jaffa', 'jewish', 50, 'humble', 'Yemenite silversmith of Jaffa', 'own', 'His family walked from Sana\'a to Jaffa in 1882 carrying their tools.', 'Silver filigree takes a week for a bracelet. Nobody pays for a week any more.', { goods: 'silver filigree' }),
  // ---- Lebanon and Syria ----
  h('beirut', 'french', 44, 'notable', 'Colonel of the French Army of the Levant', 'own', 'Commands a garrison under the Mandate and writes long letters home about the beauty of the mountains.', 'The Mandate is a mission civilisatrice, monsieur. Also a great deal of paperwork.'),
  h('beirut', 'french', 37, 'trade', 'Official of the Banque de Syrie et du Grand-Liban', 'mixed-levant', 'Issues the Mandate\'s banknotes and worries about all of them.', 'The Syrian pound is worth what Paris says it is worth. Paris changes its mind.'),
  h('beirut', 'american', 50, 'notable', 'Professor at the American University of Beirut', 'own', 'Teaches medicine on the cliffs above the sea and has trained half the doctors in the Levant.', 'My students go to Baghdad, Cairo, Khartoum. In twenty years they will run the hospitals of the East.'),
  h('beirut', 'armenian', 36, 'humble', 'Shoemaker of the refugee camp at Karantina', 'own', 'Walked from Adana in 1921 and set up his last in a tent. It is a shop now.', 'A man who has walked a thousand miles knows what a good shoe is worth.'),
  h('beirut', 'italian', 46, 'trade', 'Silk exporter of the Lebanon mountain', 'mixed-levant', 'Buys raw silk from the mountain villages and sends it to the mills of Lyon and Como.', 'The silkworm does the work, the village women do the rest, and I take the boat to Marseille.', { goods: 'raw silk' }),
  h('damascus', 'french', 40, 'notable', 'Captain of the French intelligence service', 'alone', 'Speaks perfect Arabic, trusts nobody and is trusted by nobody. Damascus has been uneasy since the summer.', 'The roads to the Hauran are closed, monsieur. I would not go there this year.'),
  h('damascus', 'jewish', 58, 'trade', 'Merchant of the Damascus Jewish quarter', 'own', 'His family has traded brocade from the Hamidiyya for three hundred years.', 'Damascus silk, Damascus steel, Damascus roses. And Damascus prices, which are the best part.', { goods: 'brocade' }),
  h('aleppo', 'french', 45, 'trade', 'French customs officer at Aleppo', 'own', 'Collects duties on every bale that crosses from Turkey and suspects every one of them.', 'Wool from Turkey, carpets from Persia, rifles from nobody knows where. I count them all.'),
  h('aleppo', 'armenian', 40, 'trade', 'Carpet weaver of the Armenian refugees', 'own', 'Learned his knots in Marash, lost everything in 1920, and set up looms again in Aleppo.', 'An Armenian rug from Aleppo will outlast the man who buys it. And his son.', { goods: 'carpets' }),
  // ---- Transjordan ----
  h('amman', 'circassian', 55, 'notable', 'Elder of the Circassian quarter of Amman', 'own', 'His people came from the Caucasus fifty years ago and rebuilt Amman from the Roman ruins.', 'We were here before the Emir and we will be here after him. We built the houses he lives in.'),
  h('amman', 'circassian', 32, 'trade', 'Carter of the Amman to Jerusalem road', 'own', 'Drives the only wagons that go up and down the Salt road in winter.', 'My wagons get through when the motor cars do not. The English pay double for that.'),
  h('amman', 'british', 36, 'notable', 'Officer of the Arab Legion', 'alone', 'Trains the Emir\'s new police force and rides out to the tribes when there is trouble.', 'The desert is quiet when the tribes are fed. Feed them, and you will not need me.'),
  // ---- Iraq ----
  h('baghdad', 'british', 47, 'notable', 'Political officer of the High Commission', 'own', 'Advises the new King\'s ministers, who do not always want his advice.', 'Iraq is a kingdom now, with a parliament, a constitution and me. Mostly me.'),
  h('baghdad', 'british', 28, 'trade', 'Flight lieutenant of the RAF at Hinaidi', 'alone', 'Flies the mail to Cairo and bombs the tribes when told to. Prefers the mail.', 'From the air the desert looks like a rug. A very large, very empty rug.'),
  h('baghdad', 'indian', 52, 'trade', 'Indian cloth merchant of the Shorja', 'own', 'His family has traded Manchester cotton and Bombay silk in Baghdad since the Ottoman days.', 'The English bring the cloth, the Indians sell it, and the Iraqis wear it. Everyone has a share.', { goods: 'cloth' }),
  h('baghdad', 'american', 46, 'trade', 'Missionary teacher of the American School for Boys', 'own', 'Runs a school in a rented house by the river and has more pupils than desks.', 'They come to learn English so that they can work for the English. I teach them anyway.'),
  h('baghdad', 'jewish', 45, 'notable', 'Banker of the Baghdad Jewish community', 'own', 'A third of Baghdad is Jewish, and half its banking. His family is in both.', 'In Baghdad the Jews keep the accounts, the Muslims keep the government and the English keep the change.'),
  h('khanaqin', 'british', 40, 'trade', 'Engineer of the Khanaqin oil field', 'alone', 'Drills for oil on the Persian frontier for a company formed this year. Has found mostly dust.', 'They say there is a sea of oil under these hills. So far I have found a well of tea.'),
  // ---- Anatolia ----
  h('istanbul', 'italian', 56, 'notable', 'Levantine merchant of Pera', 'own', 'His family has lived in Pera since the Genoese, and still holds an Italian passport it has never used.', 'We were here before the Ottomans and we are here after them. The Levantines always land on their feet.'),
  h('istanbul', 'russian', 44, 'humble', 'White Russian restaurant keeper of Pera', 'own', 'Came with Wrangel\'s army in 1920 and opened a restaurant with balalaikas and borscht.', 'Half of Petersburg came to Constantinople in 1920. Half of them owe me money.'),
  h('istanbul', 'american', 52, 'notable', 'Professor at the American college on the Bosporus', 'own', 'Has taught at the college above Rumeli Hisarı for twenty-five years and seen three governments come and go.', 'The new Republic wants engineers. We make engineers. We will be fine.'),
  h('istanbul', 'greek', 48, 'trade', 'Furrier of the Grand Bazaar', 'own', 'One of the Greeks of the City, allowed to stay when the rest went in the exchange of 1923.', 'My family has sold furs in this bazaar for two hundred years. The exchange took my cousins. It did not take me.', { goods: 'furs' }),
  h('ankara', 'german', 50, 'notable', 'Adviser to the new Republic\'s ministry of works', 'own', 'Came to build a capital on a hill of mud and is doing it.', 'In ten years Angora will have boulevards. At present it has goats.'),
  // ---- Persia ----
  h('tehran', 'belgian', 54, 'notable', 'Director of the Persian customs', 'own', 'The Belgians have run Persia\'s customs for twenty-five years. He has run them for ten, and collected every rial.', 'Every bale that crosses a Persian frontier passes through my books. The Shah reads them.'),
  h('tehran', 'american', 45, 'notable', 'Officer of the American financial mission', 'own', 'Came from Washington in 1922 to put Persia\'s treasury in order. It is a long job.', 'We have balanced the budget twice. It unbalanced itself both times.'),
  h('tehran', 'british', 50, 'notable', 'Manager of the Imperial Bank of Persia', 'own', 'Prints the Shah\'s banknotes and has the gold to prove it.', 'A Persian merchant trusts three things: God, his mother and the Imperial Bank. In that order, usually.'),
  h('tehran', 'russian', 42, 'trade', 'Agent of the Soviet trade mission', 'alone', 'Buys Persian cotton, rice and carpets for the workers\' state and drives a hard bargain for the proletariat.', 'The Soviet Union needs carpets. For the workers, you understand. The workers like silk.'),
  h('isfahan', 'british', 56, 'notable', 'Doctor of the mission hospital at Isfahan', 'own', 'Has run the hospital outside the walls for twenty years. Treats mullahs and muleteers alike, and charges the mullahs.', 'Half my patients pay in rugs. The hospital floor is the finest in Persia.'),
  h('kerman', 'british', 48, 'trade', 'Agent of a London carpet company', 'own', 'Buys Kerman carpets for the London and New York trade and sets the patterns the looms weave.', 'New York wants pink. Kerman weaves pink. I do not ask why.'),
  h('tabriz', 'russian', 60, 'trade', 'Carpet exporter of the Tabriz bazaar', 'mixed-armenian', 'Came before the war as a buyer for a Moscow firm and stayed when the firm stopped existing.', 'Tabriz rugs to Constantinople, Constantinople to Europe. The road is long and everyone takes a share.', { goods: 'carpets' }),
  h('hamadan', 'british', 42, 'trade', 'Branch manager of the Imperial Bank at Hamadan', 'own', 'Lends money to carpet merchants and takes their rugs as security. His strongroom is a carpet museum.', 'When a merchant defaults, I get a rug. When he pays, I get interest. Either way I am well floored.'),
  h('kermanshah', 'british', 39, 'trade', 'Agent of the Anglo-Persian Oil Company', 'alone', 'Runs the company\'s small refinery and its large accounts.', 'The oil goes to the Navy. The Persians get a royalty and a grievance.'),
];
