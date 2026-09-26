// The Giza Courier: a fictional daily paper for the stall. Articles for the dated events of 1925-26,
// small invented incidents that move the markets, and filler, adverts, weather and shipping notes.
import type { Trait } from '../game/types';

export interface Story { headline: string; deck?: string; body: string }

/** For each EVENTS id: the article printed on the day it begins, and a one-line reminder printed while it is still coming up. */
export const EVENT_NEWS: Record<string, { article: Story; comingUp: string; advice: string }> = {
  sheikhsaid: {
    article: {
      headline: 'Kurdish Rising in Eastern Anatolia',
      deck: 'Martial Law Declared in the East; Wool Roads Closed',
      body: 'The Kurdish tribes of eastern Anatolia have taken up arms against the Ankara government, and martial law has been proclaimed across the eastern provinces. Traffic from Diyarbakır and Elazığ has ceased. Istanbul merchants report that no wool or carpets have come west for some weeks.',
    },
    comingUp: 'The Kurdish rising in the east goes on: expect little Anatolian wool on the roads.',
    advice: 'Istanbul dealers pay a little more while eastern goods are scarce. Ankara pays less and the roads there are watched by troops; travel with care.',
  },
  jeddah: {
    article: {
      headline: 'Jeddah Under Siege',
      deck: 'King Ali Shut In by the Wahhabi Army; Hejaz Shipping at a Standstill',
      body: 'The forces of Ibn Saud have closed round Jeddah, where King Ali remains inside the walls. Few steamers are willing to call at the port. At Suez the shipping agents say the pilgrim trade has all but dried up.',
    },
    comingUp: 'The siege of Jeddah continues, and the Suez pilgrim trade with it is slack.',
    advice: 'Suez dealers are paying less with no pilgrims passing. Sell elsewhere until the Hejaz is quiet.',
  },
  oil: {
    article: {
      headline: 'Iraq Signs Oil Concession',
      deck: 'Seventy-Five Years to the Turkish Petroleum Company',
      body: 'The government of King Faisal has put its name to a concession of seventy-five years with the Turkish Petroleum Company. Oil men are already arriving in Baghdad with their families. House agents there say furnished villas cannot be had for any money.',
    },
    comingUp: 'The Iraq oil concession is expected about the 14th: Baghdad will be furnishing houses.',
    advice: 'Baghdad dealers are paying well for rugs to furnish the oil men\'s houses. A long road, but a good market for a few weeks.',
  },
  parliament: {
    article: {
      headline: 'Deputies Gather for the New Chamber',
      deck: 'Opening Fixed for the 23rd; Reception Rooms Being Dressed',
      body: 'Newly elected deputies are arriving in Cairo from every province for the opening of the Chamber on the 23rd. Hotels near the Parliament buildings are full. Upholsterers and carpet sellers report a brisk week.',
    },
    comingUp: 'Parliament opens on the 23rd, and every new deputy wants a good carpet.',
    advice: 'Cairo dealers pay extra for fine, restrained or ornate rugs this week. Buyers at the stall are a little freer with their money.',
  },
  dissolved: {
    article: {
      headline: 'Chamber Dissolved on Its First Day',
      deck: 'Zaghlul Elected Speaker in the Afternoon; Decree Issued by Evening',
      body: 'The new Chamber of Deputies elected Zaghlul Pasha its Speaker yesterday afternoon, and by the evening King Fuad had dissolved it. The Wafd is loud in its anger. In the clubs and cafés the talk is of politics, and the pashas are keeping their purses shut.',
    },
    comingUp: 'The new Chamber opens on the 23rd; there is talk it may not sit for long.',
    advice: 'Expect thinner purses at the stall and slightly lower bids in Cairo while the politicians quarrel.',
  },
  'balfour-strike': {
    article: {
      headline: 'Palestine Shops Shut for Balfour',
      deck: 'Black Flags in Jerusalem and Jaffa',
      body: 'Lord Balfour has landed in Palestine. The Arab shopkeepers of Jerusalem and Jaffa have closed their doors in protest, and black flags hang across the streets. The strike is expected to last the day.',
    },
    comingUp: 'Lord Balfour lands in Palestine on the 25th; the Arab shops are expected to strike.',
    advice: 'The markets of Jerusalem and Jaffa are shut today. Do not plan to sell there.',
  },
  balfour: {
    article: {
      headline: 'Jerusalem Prepares for the University Opening',
      deck: 'Lord Balfour to Open the Hebrew University on Mount Scopus',
      body: 'Consuls, professors and visitors of distinction are filling the hotels of Jerusalem ahead of the opening of the Hebrew University on 1 April. Receptions are given every evening. The dealers of the Old City say the visitors are buying.',
    },
    comingUp: 'The Hebrew University opens on 1 April, and Jerusalem is filling with visitors.',
    advice: 'Jerusalem pays extra for antique rugs, fine weaving and pieces with a story while the dignitaries are in town.',
  },
  geocongress: {
    article: {
      headline: 'Geographers Meet in Cairo',
      deck: 'International Congress Opens Under the Patronage of King Fuad',
      body: 'The International Geographical Congress has opened in Cairo, with delegates from some thirty countries. Between sessions the delegates are being taken to the Pyramids. The dragomen at Giza report a good trade.',
    },
    comingUp: 'The Geographical Congress meets in Cairo early in April, with delegates touring Giza.',
    advice: 'Foreign delegates are at the Pyramids with money to spend. Keep the stall well stocked; budgets are up.',
  },
  'balfour-damascus': {
    article: {
      headline: 'Disorder in Damascus',
      deck: 'Crowds Gather at Lord Balfour\'s Hotel; Bazaar Shut',
      body: 'Lord Balfour\'s visit to Damascus has been met with angry crowds, who stoned his hotel. The bazaar has shut in protest and French troops are clearing the streets. His Lordship has left for Beirut.',
    },
    comingUp: 'Lord Balfour goes on to Damascus about the 8th, and feeling there runs high.',
    advice: 'Damascus is shut and dangerous. Keep your caravans away for a few days.',
  },
  ramadan: {
    article: {
      headline: 'Ramadan Begins',
      deck: 'Cannon to Mark Sunset; Shops to Open After the Fast',
      body: 'The month of fasting has begun. The cannon on the Citadel will mark sunset each evening, and the shops are expected to do most of their business after dark. Merchants look forward to the last ten nights, when families buy for the feast.',
    },
    comingUp: 'Ramadan begins on the 26th: evening trade, and a rush for the feast at the end.',
    advice: 'Buyers come after dark and tire easily by day. Budgets are a little up, and the last ten nights are the best of the month.',
  },
  eid: {
    article: {
      headline: 'The Feast Begins',
      deck: 'Eid al-Fitr Brings New Clothes and Open Purses',
      body: 'The fast is over and the city is keeping the feast. Families are out in new clothes and the sweet shops cannot keep up. Carpet dealers report their best days since the winter.',
    },
    comingUp: 'Eid al-Fitr falls on the 24th: new clothes, new carpets, open purses.',
    advice: 'The best selling days of the spring. Buyers at the stall have much more to spend; have your best pieces on show.',
  },
  paris: {
    article: {
      headline: 'Paris Exposition Opens',
      deck: 'Decorative Arts on Show; Bold Rugs in Demand',
      body: 'The Exposition des Arts Décoratifs has opened in Paris. Letters from the French capital speak of new furniture in hard, plain shapes, and of the geometric rugs and kilims wanted to go with it. The Alexandria export houses are already buying for Europe.',
    },
    comingUp: 'The Paris Exposition opens on the 28th, and Europe will want bold rugs and kilims.',
    advice: 'Alexandria pays extra for bold rugs and flatweaves for the Paris trade, and Beirut a little more. Buy kilims where they are cheap.',
  },
  adana: {
    article: {
      headline: 'Earthquake at Adana',
      deck: 'Relief Committees Formed in Aleppo',
      body: 'An earthquake has struck Adana, and many families are without a roof. Relief committees in Aleppo are buying plain, hard-wearing rugs for the homeless. The road north is crowded with carts.',
    },
    comingUp: 'Reports of tremors in the Adana district: keep an eye on the northern news.',
    advice: 'Aleppo relief committees pay well for hard-wearing and humble rugs. Cheap village pieces will do.',
  },
  hajj: {
    article: {
      headline: 'No Mahmal This Year',
      deck: 'Pilgrims Released From the Journey While Jeddah Is Besieged',
      body: 'With Jeddah still under siege, the ulema have released Egyptians from the pilgrimage, and the Mahmal will not leave Cairo this year. Those who would have bought prayer rugs for the journey are staying at home.',
    },
    comingUp: 'The pilgrimage season opens about the 10th, though no Mahmal will leave Cairo.',
    advice: 'Suez dealers pay much less and Cairo a little less without the pilgrims. Hold prayer rugs for later.',
  },
  summer: {
    article: {
      headline: 'The Court Removes to Alexandria',
      deck: 'Ministries and Society Leave for the Sea',
      body: 'The government and the better families have begun their annual move to Alexandria for the hot months. The Cairo season is over. Alexandria dealers are expecting a busy summer.',
    },
    comingUp: 'The court goes to Alexandria for the summer from the 15th; Cairo will be quiet.',
    advice: 'Sell in Alexandria, where dealers pay more. Cairo pays less and Giza buyers are fewer until October.',
  },
  adha: {
    article: {
      headline: 'Feast of the Sacrifice',
      deck: 'Sheep Markets Crowded; Guest Rooms Made Ready',
      body: 'The Feast of the Sacrifice has begun. The sheep markets were crowded all yesterday. Families are gathering and the best carpets in every house are being laid in the guest rooms.',
    },
    comingUp: 'Eid al-Adha falls on 1 July, and families will be dressing their guest rooms.',
    advice: 'Buyers at the stall are spending freely for the feast. A good week to sell.',
  },
  syria: {
    article: {
      headline: 'Druze Rise in the Hauran',
      deck: 'French Posts Attacked; Caravans Stopped at Damascus',
      body: 'The Druze of the Hauran have risen against the French, and the trouble is spreading. French patrols are stopping every caravan at the gates of Damascus. Damascus rugs are scarce in the markets and prices are rising.',
    },
    comingUp: 'Unrest is reported among the Druze of the Hauran; Syria may be troubled this summer.',
    advice: 'Damascus pays well and Beirut a little better, but the Damascus road is dangerous. Weigh the risk before you go.',
  },
  isparta: {
    article: {
      headline: 'Earthquake Destroys Isparta',
      deck: 'Carpet Town of Anatolia in Ruins; Looms Stopped',
      body: 'An earthquake has destroyed some two thousand houses in Isparta, the carpet town of Anatolia. The looms have stopped. Istanbul and Konya dealers report that Turkish carpets are suddenly hard to find.',
    },
    comingUp: 'Tremors are reported in western Anatolia: the Isparta looms may be affected.',
    advice: 'Istanbul and Konya pay more for rugs, but buying there costs more too. Bring stock in rather than buying locally.',
  },
  nile: {
    article: {
      headline: 'The Nile Has Risen',
      deck: 'Wafaa el-Nil Kept With Boats and Fireworks',
      body: 'The river has reached its height and Cairo is keeping the feast of the flood. Boats crowd the water by Roda and there will be fireworks tonight. The cutting of the dam is to follow.',
    },
    comingUp: 'Wafaa el-Nil, the flood feast, is expected about the middle of August.',
    advice: 'A holiday mood in Cairo; buyers at the stall have a little more to spend for a few days.',
  },
  plumer: {
    article: {
      headline: 'New High Commissioner for Palestine',
      deck: 'Field Marshal Plumer Takes Up His Post',
      body: 'Field Marshal Lord Plumer has arrived in Jerusalem as High Commissioner. Government House is holding receptions. Officials are said to be refurnishing their offices.',
    },
    comingUp: 'Lord Plumer takes up his post in Jerusalem about the 25th.',
    advice: 'Jerusalem pays extra for restrained, finely woven and hard-wearing rugs for government offices.',
  },
  cotton: {
    article: {
      headline: 'Cotton Fetches Best Prices in Years',
      deck: 'Picking Done; Delta Landowners in Funds',
      body: 'The cotton has been picked and is selling at the best prices for some years. Landowners in the Delta have money in hand. Dealers in Tanta and Alexandria are buying accordingly.',
    },
    comingUp: 'The cotton picking ends with September; the Delta will soon have money.',
    advice: 'Tanta dealers pay more, and Alexandria a little more, while the cotton money lasts.',
  },
  mawlid: {
    article: {
      headline: 'The Prophet\'s Birthday',
      deck: 'Sufi Tents Pitched Across Cairo',
      body: 'The Sufi orders have pitched their tents for the Mawlid al-Nabi, and the streets are lit each night. Every tent is floored with carpets. Sweets in the shape of dolls and horsemen are on sale at every corner.',
    },
    comingUp: 'The Mawlid al-Nabi falls late in September, with Sufi tents across Cairo.',
    advice: 'Cairo dealers pay more for carpets to floor the tents, and buyers at the stall have a little more to spend.',
  },
  badawi: {
    article: {
      headline: 'The Great Fair at Tanta',
      deck: 'Mawlid of Sayyid al-Badawi Draws the Whole Delta',
      body: 'The Mawlid of Sayyid al-Badawi has opened at Tanta. The town is full of pilgrims, fairground tents and sellers from every village in the Delta. The trains from Cairo are packed.',
    },
    comingUp: 'The great Mawlid at Tanta opens about 8 October: buy cheap, sell well.',
    advice: 'Go to Tanta. Rugs are cheap to buy there this week and the dealers pay well.',
  },
  bombard: {
    article: {
      headline: 'Damascus Under Fire',
      deck: 'French Guns Shell the Old City; Souqs Burning',
      body: 'French artillery has shelled the old city of Damascus. The souqs are shut and parts of them are burning. No caravans are passing the gates.',
    },
    comingUp: 'The fighting near Damascus is growing worse; the city may not be safe in October.',
    advice: 'Damascus is shut and dangerous. Stay away.',
  },
  republic: {
    article: {
      headline: 'Ankara Keeps Republic Day',
      deck: 'Second Anniversary Marked With Receptions',
      body: 'The Turkish Republic is two years old. The new ministries and embassies in Ankara are giving receptions. Furnishers there say they cannot find enough good carpets.',
    },
    comingUp: 'Ankara keeps Republic Day on the 29th, with receptions at the ministries.',
    advice: 'Ankara pays extra for ornate, fine and bold rugs for the receptions.',
  },
  season: {
    article: {
      headline: 'The Winter Visitors Arrive',
      deck: 'First Cook Steamers of the Season; Hotels Filling',
      body: 'The first of the Thomas Cook steamers has brought the winter visitors. The hotels at Giza and in the city are filling. Guides and camel men are out early at the Pyramids.',
    },
    comingUp: 'The winter tourist season opens with November: Giza will be full of foreigners.',
    advice: 'The long good season at the stall begins. Buyers have more to spend until spring; keep stock coming.',
  },
  hadda: {
    article: {
      headline: 'Najd Border Fixed',
      deck: 'Ma\'an and Aqaba to Transjordan; Desert Road Safer',
      body: 'Britain and Ibn Saud have agreed the border of Najd with Transjordan, and Ma\'an and Aqaba now belong to the Emir Abdullah. Travellers say the desert road to Amman is safer than it has been for years.',
    },
    comingUp: 'Talks on the Najd border are near an end; the Amman road may soon be safer.',
    advice: 'Amman dealers pay a little more while the news is fresh.',
  },
  tut: {
    article: {
      headline: 'The Boy King Examined',
      deck: 'Mr Carter\'s Party Opens the Mummy at Luxor',
      body: 'Mr Howard Carter\'s party has begun the examination of Tutankhamun\'s mummy at Luxor. The papers are full of it. Visitors are coming to Giza in greater numbers than any season before.',
    },
    comingUp: 'The examination of Tutankhamun\'s mummy is expected about the 11th.',
    advice: 'Tourists are flooding Giza. Budgets at the stall are much higher; sell your best now.',
  },
  hatlaw: {
    article: {
      headline: 'Turkey Bans the Fez',
      deck: 'Protests in Erzurum and Rize; Gendarmes on the Roads',
      body: 'Ankara has passed a law against the fez. There have been protests in Erzurum and Rize, and gendarmes are out on the roads. Istanbul dealers are cautious.',
    },
    comingUp: 'A law on hats is before the Turkish assembly; trouble is expected in the provinces.',
    advice: 'Istanbul pays a little less, and the roads to Ankara and Istanbul are watched. Travel in Turkey with care.',
  },
  tekkes: {
    article: {
      headline: 'Dervish Lodges Closed',
      deck: 'Every Tekke and Tomb in Turkey Shut by Decree',
      body: 'The Ankara government has closed every dervish lodge and tomb in Turkey. At Konya the lodges are emptying. Their old prayer rugs and felts are being sold off cheap.',
    },
    comingUp: 'Ankara is expected to act against the dervish lodges before the year is out.',
    advice: 'Buy at Konya, where lodge rugs are cheap; Istanbul is a little cheaper too. Konya dealers pay less, so sell elsewhere.',
  },
  mosul: {
    article: {
      headline: 'Mosul Awarded to Iraq',
      deck: 'League of Nations Decides; Baghdad Rejoices',
      body: 'The League of Nations has given Mosul, and its oil, to Iraq. Baghdad is celebrating. The notables are spending freely.',
    },
    comingUp: 'The League is to decide on Mosul in December; Baghdad awaits the word.',
    advice: 'Baghdad dealers pay well while the city celebrates.',
  },
  jouvenel: {
    article: {
      headline: 'A New High Commissioner for Syria',
      deck: 'M. de Jouvenel Replaces General Sarrail',
      body: 'M. Henry de Jouvenel, senator and journalist, has arrived in Beirut to replace General Sarrail. He is said to favour talks with the rebels. The city is full of receptions.',
    },
    comingUp: 'A new French High Commissioner is expected in Beirut before Christmas.',
    advice: 'Beirut pays extra for ornate, silk and finely woven rugs for the receptions.',
  },
  hejaz: {
    article: {
      headline: 'Jeddah Surrenders',
      deck: 'Ibn Saud King of the Hejaz; Ships Running Again',
      body: 'King Ali has surrendered Jeddah and Ibn Saud is now King of the Hejaz. The steamers are sailing again. At Suez next year\'s pilgrims are already buying for the journey.',
    },
    comingUp: 'The siege of Jeddah is near its end, say the shipping agents at Suez.',
    advice: 'Suez dealers pay more as the pilgrim trade returns. Prayer rugs will sell there.',
  },
  slump: {
    article: {
      headline: 'Cotton Falls by a Third',
      deck: 'Delta Landowners Cancel Orders',
      body: 'The price of cotton has fallen by a third since last year. Landowners in the Delta are cancelling orders. Fewer of the pashas are seen at Giza.',
    },
    comingUp: 'Cotton prices are weakening in the new year; the Delta may be short of money.',
    advice: 'Budgets at the stall are lower, and Tanta and Alexandria pay less. Sell carefully and hold stock loosely.',
  },
};

export interface SurpriseDef {
  id: string; weight: number; months?: number[]; // 1..12 months it can happen in (omit = any)
  cities: string[];              // candidate settlement ids; one is picked; text uses {city}
  days: [number, number];        // duration range
  article: Story;                // may use {city}
  advice: string;                // what it means for a rug merchant, may use {city}
  effect: { budget?: number; cityBid?: number; cityBuy?: number; closed?: boolean; danger?: boolean; traits?: Trait[]; traitMult?: number };
  // cityBid/cityBuy/closed/danger/traits apply to the picked city; budget applies to the Giza stall
}

export const SURPRISES: SurpriseDef[] = [
  {
    id: 'souq-fire', weight: 2, cities: ['cairo', 'damascus', 'aleppo', 'jerusalem', 'baghdad', 'tanta', 'beirut'], days: [1, 2],
    article: { headline: 'Fire in the {city} Souq', deck: 'Cloth Market Closed While Damage Is Counted', body: 'A fire broke out before dawn among the cloth stalls of {city}. The fire brigade had it out within the hour, but the market has been closed while the damage is counted. Several carpet shops lost stock to smoke and water.' },
    advice: 'The {city} market is shut for a day or two. When it opens, stock there will be dearer.',
    effect: { closed: true, cityBuy: 1.15 },
  },
  {
    id: 'souq-fire-after', weight: 1, cities: ['cairo', 'damascus', 'aleppo', 'baghdad'], days: [3, 5],
    article: { headline: 'Carpet Stalls Rebuilding at {city}', deck: 'Dealers Short of Stock After Last Week\'s Fire', body: 'The carpet dealers of {city} are back at work after the recent fire, but many are short of stock. Prices for what remains have gone up. Some are buying from travelling merchants at the gate.' },
    advice: 'Buying in {city} is dear, but dealers there will pay a little more for what you bring.',
    effect: { cityBuy: 1.2, cityBid: 1.08 },
  },
  {
    id: 'caravan-bales', weight: 3, cities: ['aleppo', 'baghdad', 'damascus', 'amman', 'konya'], days: [3, 5],
    article: { headline: 'Great Caravan Reaches {city}', deck: 'Bales of Carpets Crowd the Khans', body: 'A caravan of more than a hundred camels has come into {city} with bales of carpets and wool. The khans are full to the roof. Dealers say they have not seen so much stock at once in years.' },
    advice: 'Rugs are cheap to buy in {city} this week, but the dealers there are full and pay less.',
    effect: { cityBuy: 0.8, cityBid: 0.85 },
  },
  {
    id: 'steamer-bales', weight: 3, cities: ['alexandria', 'portsaid', 'beirut', 'jaffa', 'istanbul'], days: [3, 5],
    article: { headline: 'Carpet Cargo Landed at {city}', deck: 'Hundreds of Bales on the Quay', body: 'A steamer has discharged several hundred bales of carpets at {city}. The customs sheds are full and the agents are selling on the quay. Local dealers are complaining of the competition.' },
    advice: 'Buy cheaply at {city} while the quay is full. Do not expect good bids there until the bales are gone.',
    effect: { cityBuy: 0.82, cityBid: 0.88 },
  },
  {
    id: 'wedding', weight: 3, cities: ['cairo', 'alexandria', 'tanta', 'beirut', 'damascus', 'baghdad', 'jerusalem'], days: [3, 6],
    article: { headline: 'A Great Wedding at {city}', deck: 'Two Leading Families to Be Joined', body: 'The daughter of one of the first families of {city} is to marry, and the preparations are on a grand scale. The house is being entirely refurnished. The dealers have been told to bring their finest.' },
    advice: '{city} pays extra for silk, ornate and finely woven rugs while the wedding house is furnished.',
    effect: { traits: ['silk', 'ornate', 'fineWeave'], traitMult: 1.25 },
  },
  {
    id: 'hotel-refit', weight: 3, cities: ['cairo', 'alexandria', 'portsaid', 'jerusalem', 'beirut', 'istanbul'], days: [4, 7],
    article: { headline: 'Grand Hotel at {city} to Be Refitted', deck: 'Corridors and Public Rooms to Be Recarpeted', body: 'The proprietors of one of the principal hotels at {city} have announced a refit of the public rooms and corridors before the next season. Contractors are asking for hard-wearing carpets in quantity.' },
    advice: '{city} pays well for hard-wearing and washable rugs for the hotel refit.',
    effect: { traits: ['hardwearing', 'washable'], traitMult: 1.25 },
  },
  {
    id: 'rail-strike', weight: 2, cities: ['tanta', 'alexandria', 'portsaid', 'suez', 'cairo'], days: [2, 4],
    article: { headline: 'Railway Men Stop Work', deck: 'Goods Trains Held on the {city} Line', body: 'Workmen of the State Railways have stopped work on the {city} line over a question of pay. Goods trains are standing in the sidings. The police are guarding the stations.' },
    advice: 'The road to {city} is unsettled and goods are held up. Travel there with care for a few days.',
    effect: { danger: true, cityBid: 0.95 },
  },
  {
    id: 'washout', weight: 2, months: [1, 2, 3, 11, 12], cities: ['jaffa', 'jerusalem', 'beirut', 'damascus', 'aleppo', 'amman'], days: [2, 4],
    article: { headline: 'Line Washed Out Near {city}', deck: 'Winter Rains Carry Away an Embankment', body: 'Heavy rain in the hills has carried away a stretch of embankment near {city}. Trains are stopped and the roads are deep in mud. Engineers expect to have the line open within the week.' },
    advice: 'The approach to {city} is dangerous in the mud. Carts are sticking fast and caravans losing days.',
    effect: { danger: true },
  },
  {
    id: 'customs-drive', weight: 2, cities: ['alexandria', 'portsaid', 'suez', 'beirut', 'jaffa'], days: [3, 6],
    article: { headline: 'Customs Tighten at {city}', deck: 'Every Bale to Be Opened', body: 'The customs authorities at {city} have ordered that every bale passing the harbour be opened and examined. Merchants complain of long delays. Dealers there are buying less while their goods sit in the sheds.' },
    advice: 'Dealers at {city} are paying less while the customs men hold their goods.',
    effect: { cityBid: 0.88 },
  },
  {
    id: 'theft-ring', weight: 2, cities: ['cairo', 'alexandria', 'jerusalem', 'beirut', 'istanbul'], days: [3, 5],
    article: { headline: 'Carpet Thieves Taken at {city}', deck: 'Stolen Rugs to Be Sold by the Police', body: 'The police at {city} have broken up a band that stole carpets from villas and mosques. A store of rugs was found in a warehouse. Those not claimed by their owners are to be sold at auction.' },
    advice: 'Police sales are putting cheap rugs on the {city} market. A good week to buy there.',
    effect: { cityBuy: 0.8 },
  },
  {
    id: 'khamsin', weight: 3, months: [3, 4, 5], cities: ['giza'], days: [1, 3],
    article: { headline: 'Khamsin Blows Over Giza', deck: 'Sand in Every Street; Visitors Stay Indoors', body: 'A hot wind from the desert has filled the air with sand since morning. Excursions to the Pyramids have been cancelled and the visitors are keeping to their hotels. Shopkeepers have covered their goods.' },
    advice: 'Few buyers will brave the sand. Budgets at the stall are down; cover your rugs.',
    effect: { budget: 0.8 },
  },
  {
    id: 'collector', weight: 2, cities: ['cairo', 'alexandria', 'jerusalem', 'beirut', 'istanbul', 'damascus'], days: [4, 7],
    article: { headline: 'Foreign Collector at {city}', deck: 'Buying Old Carpets for a Museum at Home', body: 'A European gentleman who collects old carpets is staying at {city}. He is said to be buying for a museum in his own country. The dealers are bringing out their oldest pieces.' },
    advice: '{city} pays extra for antique and finely woven rugs while the collector is buying.',
    effect: { traits: ['antique', 'fineWeave'], traitMult: 1.3 },
  },
  {
    id: 'village-moulid', weight: 2, cities: ['tanta', 'fayoum', 'saqqara', 'giza', 'cairo'], days: [2, 4],
    article: { headline: 'Village Moulid Near {city}', deck: 'Tents and Swings Go Up for the Saint\'s Day', body: 'The villagers near {city} are keeping the moulid of their local saint. Tents, swings and sweet stalls have gone up by the tomb. Families from the country round about are coming in to buy.' },
    advice: 'Country buyers at {city} want cheap, hard-wearing rugs for the tents and pay a little better.',
    effect: { cityBid: 1.08, traits: ['humble', 'hardwearing'], traitMult: 1.15 },
  },
  {
    id: 'cruise', weight: 3, months: [1, 2, 3, 4, 11, 12], cities: ['giza'], days: [1, 3],
    article: { headline: 'American Cruise Ship at Alexandria', deck: 'Several Hundred Passengers Bound for the Pyramids', body: 'A large American cruising steamer has arrived at Alexandria, and special trains are bringing her passengers to Cairo. The guides say they will be at the Pyramids by morning. They are said to be generous buyers.' },
    advice: 'Americans are coming to Giza with full pockets. Budgets are up; show your best rugs.',
    effect: { budget: 1.2 },
  },
  {
    id: 'mosque-committee', weight: 2, cities: ['cairo', 'tanta', 'damascus', 'aleppo', 'konya', 'baghdad', 'jerusalem'], days: [4, 7],
    article: { headline: 'Mosque at {city} to Be Recarpeted', deck: 'Committee Collects Subscriptions', body: 'A committee of notables at {city} has raised the money to recarpet one of the old mosques of the town. They are asking dealers for hard-wearing rugs in plain colours. Deliveries are wanted within the month.' },
    advice: '{city} pays extra for restrained and hard-wearing rugs for the mosque.',
    effect: { traits: ['restrained', 'hardwearing'], traitMult: 1.2 },
  },
  {
    id: 'consul', weight: 2, cities: ['alexandria', 'jerusalem', 'beirut', 'damascus', 'baghdad', 'istanbul'], days: [4, 6],
    article: { headline: 'New Consul Arrives at {city}', deck: 'Residence to Be Furnished', body: 'A new consul has arrived at {city} to take up his post. The residence has stood empty for some months and is to be furnished throughout. His wife is said to have particular taste.' },
    advice: '{city} pays extra for fine and restrained rugs for the new residence.',
    effect: { traits: ['fineWeave', 'restrained'], traitMult: 1.2 },
  },
  {
    id: 'pasha-house', weight: 2, cities: ['cairo', 'alexandria', 'tanta'], days: [3, 6],
    article: { headline: 'New Villa Nears Completion', deck: 'Palace at {city} Wants Carpets for Twenty Rooms', body: 'A large new villa built for a landed family at {city} is nearly finished. The architect is choosing carpets for some twenty rooms. Dealers have been asked for bold and ornate pieces.' },
    advice: '{city} pays extra for bold and ornate rugs for the new villa.',
    effect: { traits: ['bold', 'ornate'], traitMult: 1.2 },
  },
  {
    id: 'kilim-fashion', weight: 2, cities: ['alexandria', 'beirut', 'istanbul'], days: [4, 7],
    article: { headline: 'Kilims the Fashion in {city}', deck: 'European Houses Want Flatweaves', body: 'The European houses at {city} have taken up the kilim for their new rooms. Agents are buying flat-woven rugs of every kind for shipment abroad. Good pieces are becoming hard to find.' },
    advice: '{city} pays extra for flatweaves. Buy kilims cheaply where you can.',
    effect: { traits: ['flatweave'], traitMult: 1.3 },
  },
  {
    id: 'bank-failure', weight: 1, cities: ['alexandria', 'cairo', 'beirut'], days: [3, 5],
    article: { headline: 'Private Bank Closes Its Doors', deck: 'Merchants at {city} Short of Credit', body: 'A small private bank at {city} has suspended payment. Several merchants who kept their money there are short of cash. The larger banks say they are not affected.' },
    advice: 'Dealers at {city} are short of cash and paying less for a few days.',
    effect: { cityBid: 0.88 },
  },
  {
    id: 'lottery-win', weight: 1, cities: ['cairo', 'alexandria', 'tanta'], days: [2, 4],
    article: { headline: 'Lottery Prize Goes to {city}', deck: 'Winning Ticket Sold in the Market', body: 'The first prize in the charity lottery has been won with a ticket sold in the market at {city}. The winner is said to be a man of modest means. He is already furnishing a new house.' },
    advice: 'A little more money is going round {city}; dealers there pay slightly better.',
    effect: { cityBid: 1.08 },
  },
  {
    id: 'sponge-boats', weight: 1, months: [5, 6, 7, 8, 9], cities: ['beirut', 'jaffa'], days: [3, 5],
    article: { headline: 'Good Season for the Fishing Boats', deck: 'Harbour at {city} in Funds', body: 'The fishing and sponge boats of {city} are reporting their best season in years. The boatmen are paid and the coffee houses are full. Shopkeepers along the harbour say trade is brisk.' },
    advice: 'Humble, hard-wearing rugs sell a little better at {city} while the boatmen are in funds.',
    effect: { traits: ['humble', 'hardwearing'], traitMult: 1.15 },
  },
  {
    id: 'bedouin-market', weight: 2, cities: ['bedouin', 'amman', 'sinai'], days: [3, 5],
    article: { headline: 'Tribes Gather for the Market at {city}', deck: 'Flocks Sold; Weavings Brought In', body: 'The tribes have come in to trade at {city} after a good season on the grazing. Flocks are being sold and the women have brought their weavings. Flat-woven rugs and tent bands are to be had cheaply.' },
    advice: 'Buy cheaply at {city} while the tribes are selling their weavings.',
    effect: { cityBuy: 0.8 },
  },
  {
    id: 'raid-rumour', weight: 1, cities: ['sinai', 'bedouin', 'amman'], days: [2, 4],
    article: { headline: 'Unrest Reported on the Road to {city}', deck: 'Camel Corps Sent Out', body: 'Travellers report that the road to {city} is unsettled after a dispute over grazing wells. A patrol of the Camel Corps has been sent out. Merchants are advised to wait.' },
    advice: 'The road to {city} is dangerous for a few days. Wait or go well guarded.',
    effect: { danger: true },
  },
  {
    id: 'dyers-strike', weight: 1, cities: ['damascus', 'aleppo', 'konya', 'istanbul'], days: [3, 6],
    article: { headline: 'Dyers Stop Work at {city}', deck: 'Weavers Idle Without Coloured Wool', body: 'The dyers of {city} have laid down their work in a dispute with the wool merchants. Without coloured wool the looms are idle. New carpets from the town will be short for some days.' },
    advice: 'New rugs are scarce at {city}; buying there costs more, but the dealers pay better for yours.',
    effect: { cityBuy: 1.15, cityBid: 1.08 },
  },
  {
    id: 'dervish-sale', weight: 1, cities: ['konya', 'aleppo', 'damascus', 'cairo'], days: [3, 5],
    article: { headline: 'Old Household Sold at {city}', deck: 'Contents of a Notable Family House Go Under the Hammer', body: 'The contents of an old family house at {city} are being sold after the death of its last owner. Among them are many old carpets, some of great age. The dealers are expected in numbers.' },
    advice: 'Old rugs are cheaper to buy at {city} this week. Look for antiques.',
    effect: { cityBuy: 0.85 },
  },
  {
    id: 'garrison', weight: 2, cities: ['cairo', 'alexandria', 'jerusalem', 'baghdad', 'portsaid'], days: [4, 6],
    article: { headline: 'Officers\' Mess to Be Refurnished', deck: 'Garrison at {city} Invites Tenders', body: 'The garrison at {city} has invited tenders for carpets for its officers\' mess and quarters. Plain, strong rugs are wanted. The contract is said to be a large one.' },
    advice: '{city} pays extra for hard-wearing, dark-ground rugs for the mess.',
    effect: { traits: ['hardwearing', 'darkField'], traitMult: 1.2 },
  },
  {
    id: 'summer-villas', weight: 2, months: [5, 6, 7], cities: ['alexandria', 'beirut'], days: [4, 7],
    article: { headline: 'Summer Villas Opened at {city}', deck: 'Families Arriving From the Interior', body: 'The summer houses along the shore at {city} are being opened and aired. Families are arriving from the interior with their servants. Pale, light rugs are in demand for the cool rooms.' },
    advice: '{city} pays extra for pale-ground and cool-coloured rugs for the summer houses.',
    effect: { traits: ['lightField', 'cool'], traitMult: 1.2 },
  },
  {
    id: 'winter-cold', weight: 2, months: [12, 1, 2], cities: ['jerusalem', 'damascus', 'amman', 'aleppo', 'ankara', 'konya', 'istanbul'], days: [3, 6],
    article: { headline: 'Snow Falls at {city}', deck: 'Houses Cold; Warm Rugs Wanted', body: 'Snow has fallen at {city} and the cold is sharp. Charcoal is dear. Families are laying down every rug they own and buying more.' },
    advice: '{city} pays extra for warm, heavy wool rugs while the cold lasts.',
    effect: { traits: ['warm', 'wool'], traitMult: 1.2 },
  },
  {
    id: 'exhibition', weight: 1, cities: ['cairo', 'alexandria', 'jerusalem', 'beirut'], days: [4, 7],
    article: { headline: 'Exhibition of Eastern Art at {city}', deck: 'Rugs and Metalwork on Show', body: 'An exhibition of eastern arts has opened at {city}, with carpets, metalwork and pottery lent by private owners. Visitors have been numerous. Dealers report fresh interest in old pieces with a history.' },
    advice: '{city} pays extra for rugs with a story and rare pieces while the exhibition is open.',
    effect: { traits: ['story', 'rare'], traitMult: 1.25 },
  },
  {
    id: 'quiet-week', weight: 2, cities: ['giza'], days: [2, 3],
    article: { headline: 'Hotels Report a Quiet Week', deck: 'Fewer Visitors at the Pyramids', body: 'The hotel managers say this has been a quiet week. Several parties have gone up the river to Luxor instead. The camel men at Giza are standing idle.' },
    advice: 'Fewer buyers at the stall for a day or two. Budgets are slightly down.',
    effect: { budget: 0.9 },
  },
  {
    id: 'garden-party', weight: 2, months: [1, 2, 3, 4, 11, 12], cities: ['giza'], days: [1, 2],
    article: { headline: 'Garden Party at Mena House', deck: 'Society Out in Force Beneath the Pyramids', body: 'A large garden party is to be given in the grounds of the hotel at Mena. Society from Cairo will attend, and many guests are expected to stroll up to the plateau afterwards. The traders have swept their pitches.' },
    advice: 'Well-to-do guests will be strolling past the stall. Budgets are up for a day or two.',
    effect: { budget: 1.12 },
  },
];

export const FILLER: Story[] = [
  { headline: 'River Still Rising', deck: 'Gauge at Roda Watched Daily', body: 'The Nile gauge at Roda showed a further rise this morning. The irrigation engineers say the flood is coming on well and there is no cause for concern.' },
  { headline: 'River Falls Slowly', body: 'The Nile is falling at the usual rate for the season. Cultivators in Upper Egypt are preparing their basins for sowing.' },
  { headline: 'Low Water at the Barrage', body: 'The river is low at the Delta Barrage, and some of the larger boats are waiting at Cairo for more water. The engineers expect no difficulty for the summer crop.' },
  { headline: 'Cotton Firm at Minet el-Bassal', body: 'Prices on the Alexandria cotton exchange were steady yesterday. Brokers report a fair demand from Lancashire for the long-staple varieties.' },
  { headline: 'Worm in the Cotton Fields', body: 'Inspectors of the Ministry of Agriculture are visiting the villages of the Gharbiya to look for the cotton worm. Children have been engaged to pick the eggs from the leaves.' },
  { headline: 'New Tram Route for Abbasiya', body: 'The tramway company announces a new route from Ataba to Abbasiya, to open next month. Cars will run every ten minutes during the day.' },
  { headline: 'Tram Collides With Cart', body: 'A tram and a cart of oranges met at the corner of Clot Bey Street yesterday. Nobody was hurt, but oranges were collected from the road for some time afterwards.' },
  { headline: 'Chaplin at the Cinema', deck: 'Crowds for the Latest Comedy', body: 'The latest comedy of Charlie Chaplin is being shown this week at a cinema in Emad el-Din Street. The management has added an extra evening performance to meet demand.' },
  { headline: 'Visitors at the Museum', body: 'The Egyptian Museum reports more visitors this month than in any month before. The rooms holding the treasures of Tutankhamun are the most crowded.' },
  { headline: 'Lost Donkey', body: 'A grey donkey with a red saddle cloth strayed from the Giza road on Tuesday. The owner, a water seller, asks that anyone who finds it bring it to the police post at the tram terminus.' },
  { headline: 'Football at Gezira', deck: 'A Close Match Watched by a Large Crowd', body: 'An Egyptian eleven played a team from the garrison at the Gezira grounds on Friday. The game was hard fought and the crowd loud. The Egyptians won by the odd goal.' },
  { headline: 'Cigarette Makers Busy', body: 'The cigarette factories of Cairo report full order books for the export trade. Rolling rooms in Bulaq are working late into the evening.' },
  { headline: 'Opera Season Announced', deck: 'Italian Company Engaged for the Khedivial Opera', body: 'An Italian opera company has been engaged for the coming season at the Khedivial Opera House. Aida is to open the programme. Boxes may be booked at the theatre.' },
  { headline: 'Pigeon Race From Tanta', body: 'The pigeon fanciers of Cairo held their race from Tanta on Sunday. The winning bird reached its loft in Sayyida Zeinab well before noon.' },
  { headline: 'Camel Race at the Desert Edge', body: 'A camel race was run yesterday on the sand beyond Mena. Bedouin riders from the Fayoum took the first two places. The prize was a silver-mounted saddle.' },
  { headline: 'Scholarships for Study Abroad', body: 'The Ministry of Education invites applications for scholarships to study engineering and medicine in England and France. Candidates must hold the secondary certificate.' },
  { headline: 'Street Lamps for Giza Road', body: 'New electric lamps are being fixed along the road to the Pyramids. Carriage drivers have welcomed the change.' },
  { headline: 'Sale of Horses at the Citadel', body: 'A number of horses no longer needed by the police will be sold by auction at the Citadel stables on Thursday morning.' },
  { headline: 'Dredging at Port Said', body: 'The Canal Company\'s dredgers are at work near the harbour mouth at Port Said. Shipping is passing as usual.' },
  { headline: 'Water Carriers Complain', body: 'The water carriers of the old quarters have asked the municipality not to lay pipes in their streets too quickly. They say their trade is old and their families many.' },
  { headline: 'Dates From the Oases', body: 'The first date caravans from the western oases have arrived at the Fayoum. Buyers report a good crop and fair prices.' },
  { headline: 'Sugar Cane Harvest', body: 'The cane is being cut in Upper Egypt and the mills at Nag Hammadi are working day and night. Light railways carry the cane from the fields.' },
  { headline: 'Excavators at Saqqara', body: 'The Antiquities Service reports fresh finds at Saqqara, where work is continuing near the Step Pyramid. Visitors are asked not to go beyond the ropes.' },
  { headline: 'Motor Cars on the Increase', body: 'The traffic police report that there are more motor cars in Cairo than ever before. Drivers are reminded that the speed limit in the streets is strictly enforced.' },
  { headline: 'A New Café in Opera Square', body: 'A new café has opened in Opera Square with tables on the pavement and a small orchestra in the evenings. Ices are served until midnight.' },
  { headline: 'Boat Race on the Nile', body: 'The rowing clubs held their races on the river at Gezira on Saturday. Large crowds watched from the bridge and the banks.' },
  { headline: 'Locusts Reported in the South', body: 'A small swarm of locusts has been seen in the Sudan border country. The Ministry of Agriculture has sent men to watch it. No danger to the crops is expected.' },
  { headline: 'Quarrel Over a Parrot', body: 'Two neighbours in Bab el-Louk came before the magistrate over a parrot that would not stop calling one of them by a rude name. The bird was ordered to be moved to another room.' },
  { headline: 'Fresh Fish at Suez', body: 'The fishermen of Suez report a fine catch this week. Fish from the Red Sea is reaching the Cairo markets by the morning train.' },
  { headline: 'New Books at the Library', body: 'The Khedivial Library has received a gift of old manuscripts from a private collection. Scholars may consult them on application.' },
  { headline: 'Tennis at the Sporting Club', body: 'The spring tournament at the Alexandria Sporting Club drew a good entry this year. Play was held up for an hour by wind.' },
  { headline: 'Bread Prices Unchanged', body: 'The municipality announces that the price of the standard loaf will not change this month. Bakers had asked for an increase.' },
  { headline: 'Ferry Delayed at Rod el-Farag', body: 'The ferry at Rod el-Farag was delayed for an hour yesterday when a buffalo refused to leave the landing stage.' },
  { headline: 'Night School Opens in Bulaq', body: 'A night school for working men has opened in Bulaq. Reading, writing and arithmetic are taught three evenings a week free of charge.' },
  { headline: 'Oranges From Jaffa', body: 'The first Jaffa oranges of the season are in the Cairo markets. Fruit sellers say the quality is good this year.' },
  { headline: 'Theatre in Emad el-Din', body: 'A new comedy is playing to full houses at one of the Arabic theatres in Emad el-Din Street. The leading man sings between the acts.' },
  { headline: 'Kite Flying on the Roofs', body: 'The boys of the old city have taken to their roofs with kites now that the wind has turned. Residents of the Hussein quarter report several lost among the minarets.' },
  { headline: 'Wireless Talk', body: 'A number of Cairo gentlemen have fitted wireless sets and report hearing music from Europe at night when the air is clear.' },
  { headline: 'Aeroplane Over the Pyramids', body: 'An aeroplane of the air force flew low over the Pyramids yesterday morning. The camels were not pleased.' },
  { headline: 'Coffee Prices Rise', body: 'The price of coffee in the Cairo markets has risen a little this week. Merchants blame a delay in shipments from the Yemen.' },
  { headline: 'Gardens at Ezbekiya', body: 'The band plays in the Ezbekiya Gardens on Sunday afternoons throughout the cool season. Chairs may be hired at the gate.' },
  { headline: 'Salt From the Lakes', body: 'Salt from the lakes near Port Said is being loaded for the Syrian coast. The trade is said to be larger than last year.' },
  { headline: 'Pilgrims Return From Jerusalem', body: 'A party of Coptic pilgrims has returned from Jerusalem by the Kantara railway. They were met at the station by their families with flowers.' },
  { headline: 'Carriage Fares Fixed', body: 'The police have issued a new table of carriage fares for the city. Visitors are advised to settle the fare before setting out.' },
  { headline: 'Butterflies at the Zoological Gardens', body: 'The Zoological Gardens at Giza have opened a new room for butterflies from the Sudan. Children are admitted at half price on Fridays.' },
];

export const ADS: { title: string; body: string }[] = [
  { title: 'Farhat & Sons, Coffee Roasters, Muski', body: 'Fresh roasted every morning. Yemeni and Abyssinian beans. Ground while you wait.' },
  { title: 'The Nile Pharmacy', body: 'Soothing lotions for sun and sand. Eye drops for the khamsin. Open late, Fouad Street.' },
  { title: 'Kassab Brothers, Tailors', body: 'Suits cut in the London style at Cairo prices. Tarbushes pressed while you wait. Near Opera Square.' },
  { title: 'Hotel Pyramides View', body: 'Clean rooms, electric light, a terrace facing the Pyramids. Moderate terms by the week.' },
  { title: 'Georgiou\'s Bakery, Heliopolis', body: 'French bread, Greek pastries and wedding cakes to order. Deliveries twice a day.' },
  { title: 'The Delta Motor Garage', body: 'Cars for hire by the hour or the day. Careful drivers who know the road to Mena. Telephone 212.' },
  { title: 'Mansour Lamp Oil', body: 'Bright and clean. Burns without smoke. Sold in tins by every good grocer.' },
  { title: 'Zaki & Haddad, Carpet Cleaners', body: 'Rugs washed by hand in fresh water and dried in the sun. Moth proofing. Fetched and returned.' },
  { title: 'The Oriental Photographic Studio', body: 'Portraits, wedding groups and views of Egypt. Visitors photographed on camels at the Pyramids.' },
  { title: 'Salib Shoe Repairs', body: 'Soles and heels while you wait. Boots for the desert made to measure. Clot Bey Street.' },
  { title: 'Levant Steam Navigation Agency', body: 'Weekly sailings from Alexandria for Jaffa, Beirut and the Syrian coast. Passengers and cargo. Apply at the Rue Chérif office.' },
  { title: 'El-Nour Soap Works', body: 'Pure olive oil soap from the Syrian recipe. Kind to hands, to linen and to carpets.' },
  { title: 'Madame Hélène, Modes', body: 'Hats from Paris each season. Evening gowns altered and trimmed. Kasr el-Nil Street.' },
  { title: 'Rashid Tobacco Company', body: 'Hand-rolled cigarettes of choice leaf. Boxes of fifty and one hundred. Ask your café.' },
  { title: 'The Pyramid Donkey Stand', body: 'Strong, quiet donkeys for ladies and children. Honest boys. Fixed prices to the Sphinx.' },
  { title: 'Abdel-Malek Ironmongery', body: 'Locks, hinges, lamps, Primus stoves and tent pegs. Everything for house and caravan. Muski.' },
  { title: 'Stavros Wine and Spirit Store', body: 'Cyprus wines, Greek brandy and table waters. Hotels and clubs supplied.' },
  { title: 'The Crescent Insurance Office', body: 'Goods insured against fire, theft and loss at sea. Moderate premiums for merchants.' },
  { title: 'Fawzi Dental Surgery', body: 'Painless extraction by modern methods. Consultations mornings only. Ataba Square.' },
  { title: 'Bishara Typewriting School', body: 'Learn English and French typewriting in three months. Evening classes for gentlemen in business.' },
  { title: 'Selim Rope and Sacking', body: 'Bales corded and sewn for the railway or the ship. Good twine by the reel. Bulaq.' },
];

export const WEATHER: Record<number, string[]> = {
  1: ['Cool and clear. A cold night; frost reported in the Delta fields.', 'Grey morning, bright afternoon. Light north wind.', 'Fine and cool. Overcoats in the evening.'],
  2: ['Cool and bright. Some cloud from the north.', 'A shower of rain before dawn, then sunshine.', 'Fine, mild at noon, cold after dark.'],
  3: ['Warmer. A haze over the desert in the afternoon.', 'Fine and mild. Wind from the north-west.', 'Bright and pleasant. Dusty on the Giza road.'],
  4: ['Warm and dry. Haze by the afternoon.', 'Hot at noon, pleasant in the evening.', 'Fine and warm. A dry wind from the south later.'],
  5: ['Hot. Shade temperatures rising.', 'Hot and dry. Little wind.', 'Very warm. The evenings are close.'],
  6: ['Hot and still. Best to be indoors at noon.', 'Great heat. A light breeze off the river at night.', 'Hot and dry. Hazy sky.'],
  7: ['Heat continues. Humid by the river.', 'Hot and heavy. No relief at night.', 'Very hot. Dust in the afternoon.'],
  8: ['Hot and damp. The river high and brown.', 'Heavy heat. A north breeze in the evening.', 'Close and humid. Mosquitoes by the water.'],
  9: ['Still hot, a little less damp.', 'Warm days, easier nights.', 'Hot at noon. A pleasant north wind at dusk.'],
  10: ['Warm and fine. The heat breaking at last.', 'Pleasant. Clear skies and cool mornings.', 'Fine and warm. Good weather for the Pyramids.'],
  11: ['Fine and mild. Visitors out early.', 'Cool morning, warm afternoon.', 'Clear and pleasant. A light north wind.'],
  12: ['Cool and bright. Cold at night.', 'Grey and cool. A chance of rain at Alexandria.', 'Fine and cool. Overcoats after sunset.'],
};

export const KHAMSIN: string[] = [
  'Khamsin. Hot wind from the south; the sun a pale disc through the dust.',
  'Sandstorm over Giza. Visibility poor; Pyramids hidden by midday.',
  'Hot, dry and dusty. The khamsin is expected to blow until evening.',
];

export const SHIPPING: string[] = [
  'The {ship}, from {from}, is due at Alexandria with general cargo.',
  'Arrived at Port Said: the {ship}, from {from}, passengers and mails.',
  'The {ship} left {from} on Monday for Alexandria. Due Thursday.',
  'The {ship}, from {from}, is discharging bales at the Alexandria quays.',
  'Passing Suez: the {ship}, bound north, last from {from}.',
  'The {ship} is delayed at {from} by weather and will arrive a day late.',
  'Sailed from Alexandria: the {ship}, for {from}, with cotton and onions.',
  'The {ship}, from {from}, reports a calm passage and will berth tomorrow.',
  'Cargo of carpets and dried fruit expected by the {ship} from {from}.',
  'The {ship}, from {from}, landed pilgrims and cargo at Port Said.',
  'The {ship} is loading at {from} for Alexandria and Port Said.',
  'Mails from {from} by the {ship} will be delivered this afternoon.',
];

export const SHIPS: string[] = [
  'Nile Star', 'Levant Trader', 'Cyprian Maid', 'Crescent', 'Pharos', 'Orontes Belle',
  'Andros', 'Sultana', 'Carmel', 'Delta Queen', 'Lebanon', 'Smyrna Rose', 'Salonica', 'Mareotis',
];

export const PORTS: string[] = [
  'Marseilles', 'Genoa', 'Naples', 'Trieste', 'Piraeus', 'Smyrna', 'Istanbul', 'Limassol',
  'Beirut', 'Jaffa', 'Haifa', 'Mersin', 'Alexandretta', 'Tripoli', 'Malta', 'Brindisi',
];
