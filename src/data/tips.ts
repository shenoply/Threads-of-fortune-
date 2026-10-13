// Tips as you go: each one appears the first time you reach the thing it explains, then never again.
export interface TipDef { id: string; title: string; lines: string[] }

export const TIPS: Record<string, TipDef> = {
  rashid: { id: 'rashid', title: 'Uncle Rashid, your supplier', lines: ['Buy rugs here to sell at your stall. The estimate shows what Giza buyers pay in good condition: buy well below it.', 'Dirty or worn rugs are cheap. Restore them from your Stock and sell them as good. "Ask for better" can win a discount, once a day.'] },
  map: { id: 'map', title: 'The World', lines: ['You start in your own district. Tap anywhere to walk. Places appear as the fog lifts.', 'Press World map for the whole region: tap a town, then Travel, or take the train. Your mission town is marked ✦.'] },
  town: { id: 'town', title: 'In a town', lines: ['Town: people to talk to, the city streets, baths, tailors and books. Market: local rugs, often cheaper where they are woven, and dealers who buy yours.', 'Animals and Guards: pack animals carry more and go faster; guards keep raiders off. Everyone eats and is paid every morning.'] },
  road: { id: 'road', title: 'On the road', lines: ['Pilgrims, caravans, Bedouin and raiders share the roads. Talk, pay, hire, fight or move on.', 'Raiders weigh your guards against their numbers. A strong caravan is left alone.'] },
  stock: { id: 'stock', title: 'Your stock', lines: ['Tap a rug to inspect it. Restore dirty or worn rugs here before you sell them.', 'Pack rugs for the road to sell in other towns. Rugs left at the stall stay safe and do not slow the caravan.'] },
  levelup: { id: 'levelup', title: 'Your skills grew', lines: ['Skills rise by doing: talking raises Speech, bargaining raises Haggling, inspecting raises Appraisal, travel raises Riding and Survival.', 'Every fifth level brings a perk. See them all on the Progress tab, with your reputation, your manner and your titles.'] },
  audience: { id: 'audience', title: 'At court', lines: ['Royals only look at Exceptional and Legendary rugs, and they want them in good condition.', 'Dress for it: the chamberlain turns away a work galabiya or road dust. Each royal will see you once a week.'] },
  bills: { id: 'bills', title: 'The first of the month', lines: ['Rent, market dues and your household are paid on the first of every month. The Calendar shows what is due.', 'Miss it and the landlord adds interest; miss it for two weeks and you lose your pitch.'] },
  rumours: { id: 'rumours', title: 'Word in the bazaar', lines: ['Rumours change every day: a town paying double for blue, a buyer looking for a rare piece. Act on them before they fade.'] },
  auction: { id: 'auction', title: 'The sale room', lines: ['Anyone may sit and watch, even with empty pockets. Every sale you see teaches you what that rug really fetches.', 'Inspect a lot before you bid: your Appraisal narrows the estimate. Dealers\' rooms have bargains and damaged stock; grand sales charge a 5% premium.'] },
};

// Words said once, set into the screen at the moment they matter (components/Tips/OnceLine.tsx).
// Each id is kept in tipsSeen once it has been said.
export const ONCE: Record<string, { who?: string; text: string }> = {
  papers: { who: 'Uncle Rashid', text: '"Every frontier post wants a passport now, nephew, and a visa stamped in it. A morning in the queues at the Ministry in Cairo costs less than one fine."' },
  fakes: { who: 'Uncle Rashid', text: '"Half the \'antiques\' in the Khan were woven last year and washed in tea, and a red too bright for its age is German aniline that runs in the first wash. Ask Arran to look before you pay antique money."' },
  changer: { who: 'Uncle Rashid', text: '"Outside Egypt a money-changer turns your notes into the money of the place, and keeps his share of the first deal you make each time you come to a town. So make that first deal a big one."' },
  telegraph: { text: 'The telegraph office: wire Rashid for stock, or ask another town\'s prices.' },
  'arran-fakes': { who: 'Arran', text: '"And if a dealer swears a rug is old, or dyed with madder, bring it here first. The wash and the dye test show a tea stain or an aniline red in an afternoon."' },
};
/** Haj Mahmoud on the morning card, the first time a buyer gave up waiting at your empty stall */
export const BOY_OFFER = 'Haj Mahmoud the cloth seller: "My nephew Sami could mind your stall for two piastres a day. Ask at your stall."';
