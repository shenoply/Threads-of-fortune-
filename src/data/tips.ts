// Hints at the point of use (components/Tips/Tip.tsx): one short line the first time you reach a thing,
// in the voice of someone who would say it, pointing at the control it is about. Shown once (kept in
// tipsSeen), gone with a tap or a swipe, never over the game. "What's this?" opens How to play at `guide`.
export interface TipDef {
  id: string;
  /** who says it, shown in bold before the line; none for a plain line */
  who?: string;
  text: string;
  /** How to play page (components/Guide/Guide.tsx) for "What's this?" */
  guide?: string;
  /** the control it is about, lit while the line shows */
  point?: string;
}

const T = (id: string, text: string, o: Omit<TipDef, 'id' | 'text'> = {}): TipDef => ({ id, text, ...o });

export const TIPS: Record<string, TipDef> = {
  district: T('district', 'This is your district. Tap a place to walk there. Your stall is the S.', { guide: 'map', point: '[data-testid="poi-stall"]' }),
  today: T('today', '"My runner leaves you a purse now and then, and there are small errands for coin. Look under Today."', { who: 'Rashid', guide: 'today', point: '[data-testid="gift-btn"]' }),
  rashid: T('rashid', '"Buy below the estimate and sell dearer at your stall. Your father\'s debt is paid at the foot of the page."', { who: 'Rashid', guide: 'rashid' }),
  stock: T('stock', '"Every rug you own is here. A worn or dirty one sells better once it is repaired."', { who: 'Your father', guide: 'stock' }),
  inspect: T('inspect', 'Drag to turn the rug. The tabs below give its condition, weave and story.', { guide: 'rugs' }),
  me: T('me', 'Your rank and your name in the bazaar. Good sales raise your reputation, and the bazaar starts to give you names.', { guide: 'me', point: '[data-testid="rank-badge"], [data-testid="epithet-row"]' }),
  world: T('world', 'The world map. Tap a town, then choose how to go. The number by a town is your place among its rug sellers.', { guide: 'travel' }),
  caravan: T('caravan', 'Your men, animals and food for the road. Everyone is fed and paid each morning.', { guide: 'caravan' }),
  town: T('town', 'A town. Its market buys and sells rugs; the Guards and Animals tabs make your caravan.', { guide: 'travel' }),
  road: T('road', 'Others share the road. Tap a party on the map to meet them.', { guide: 'fights' }),
  fights: T('fights', 'Raiders weigh your strength against theirs. The number on each choice is your chance.', { guide: 'fights' }),
  loans: T('loans', '"A loan is quick money and slow trouble. Read the rate before you sign."', { who: 'Rashid', guide: 'loans' }),
  weaving: T('weaving', 'Choose a design and colours, pay the weavers, and the carpet is yours in a few weeks.', { guide: 'weaving' }),
  levelup: T('levelup', 'A skill grew. Skills rise by doing; see them all under Me.', { guide: 'me', point: '[data-testid="nav-hero"]' }),
  audience: T('audience', 'Royals only look at Exceptional and Legendary rugs in good condition. Dress for it.', { guide: 'me' }),
  bills: T('bills', 'Rent, dues and the household are paid on the 1st of each month. The Calendar shows what is due.', { guide: 'rashid' }),
  rumours: T('rumours', 'Rumours change every day. A town paying well for a colour is worth the trip.', { guide: 'words' }),
  auction: T('auction', 'Anyone may sit and watch. Inspect a lot before you bid.', { guide: 'auction' }),
};

// Words said once, set into the screen at the moment they matter (components/Tips/OnceLine.tsx).
// Each id is kept in tipsSeen once it has been said.
export const ONCE: Record<string, { who?: string; text: string }> = {
  papers: { who: 'Uncle Rashid', text: '"Every frontier post wants a passport now, nephew, and a visa stamped in it. A morning in the queues at the Ministry in Cairo costs less than one fine."' },
  fakes: { who: 'Hagop the dealer', text: '"Half the \'antiques\' in the Khan were woven last year and washed in tea. Ask Arran to look before you pay antique money."' },
  changer: { who: 'Uncle Rashid', text: '"Outside Egypt a money-changer turns your notes into the money of the place, and keeps his share of the first deal you make each time you come to a town. So make that first deal a big one."' },
  telegraph: { text: 'The telegraph office: wire Rashid for stock, or ask another town\'s prices.' },
  'arran-fakes': { who: 'Arran', text: '"And if a dealer swears a rug is old, or dyed with madder, bring it here first. The wash and the dye test show a tea stain or an aniline red in an afternoon."' },
};
/** Hajj Mahmoud on the morning card, the first time a buyer gave up waiting at your empty stall */
export const BOY_OFFER = 'Hajj Mahmoud the cloth seller: "My nephew Sami could mind your stall for two piastres a day. Ask at your stall."';
