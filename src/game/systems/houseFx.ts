// What the rival houses (systems/houses.ts) are doing to prices today, for the pure price functions of the
// store, the bargaining and the city tables. Kept in step with the save by the store; no imports, so any
// module can read it without a cycle.
export interface HouseCorner { by: string; town: string; typeId: string; until: number }
export const HOUSE_FX: {
  /** lines a house has bought up: dearer and fewer at that town's dealers until the day given */
  corners: HouseCorner[];
  /** town -> the house with a shop there: its dealers have another buyer to sell to, and pay you a little less */
  shops: Record<string, string>;
  /** towns where a partner house sends you trade: its dealers pay you a little more */
  partners: string[];
  /** what a buyer at your stall offers against an ordinary day (a house cutting prices in Cairo, a rumour) */
  pay: number;
  /** ranks.ts row ids of houses that have gone under and left the tables */
  gone: string[];
} = { corners: [], shops: {}, partners: [], pay: 1, gone: [] };

/** what a cornered line costs at a town's dealers, against an ordinary day */
export const CORNER_PRICE = 1.25;
/** copies a cornered line loses from the dealer's stack */
export const CORNER_THIN = 1;
/** a dealer's bid in a town where a rival house keeps a shop */
export const SHOP_BID = 0.95;
/** a dealer's bid in a partner house's home town */
export const PARTNER_BID = 1.05;

const cornerOn = (sid: string, typeId: string, day: number) => HOUSE_FX.corners.find((c) => c.town === sid && c.typeId === typeId && c.until >= day);
/** the dealer's asking price for this line here today */
export const houseAsk = (sid: string, typeId: string, day: number) => (cornerOn(sid, typeId, day) ? CORNER_PRICE : 1);
/** copies the dealer has lost to a house buying up the line */
export const houseThin = (sid: string, typeId: string, day: number) => (cornerOn(sid, typeId, day) ? CORNER_THIN : 0);
/** a dealer's bid for your rug here: less where a house keeps a shop, more in a partner's town */
export const houseBid = (sid: string) => (HOUSE_FX.shops[sid] ? SHOP_BID : 1) * (HOUSE_FX.partners.includes(sid) ? PARTNER_BID : 1);
