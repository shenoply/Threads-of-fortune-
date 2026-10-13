// Money by country, 1925. The game keeps every sum in Egyptian piastres (see money.ts); this module
// only says what the money is called where you stand, and what a sum comes to in it.
//
// Rates, in Egyptian piastres (PT) for one unit of the local money. Sterling is the yardstick:
// the Egyptian pound was worth £1 0s 6d sterling, so £1 sterling = 97.5 PT and 1 shilling = 4.88 PT.
//
//   Egypt, Sinai          Egyptian pound (£E) = 100 PT.
//   Palestine             Egyptian pound until the Palestine pound came in on 1 November 1927.
//   Transjordan           the same: Egyptian money circulated until the Palestine pound replaced it.
//   Palestine pound       at par with sterling (1,000 mils) = 97.5 PT.
//   Syria and Lebanon     the Syrian-Lebanese pound of the Banque de Syrie et du Grand-Liban, fixed at
//                         20 French francs. Its worth in PT follows the franc against sterling, which
//                         fell from about 90 to the pound in early 1925 to 240 at its worst in July 1926,
//                         then recovered to about 124 under Poincare (table below, monthly averages,
//                         rounded). At 92 francs to the pound, one Syrian pound is 21 PT; at 200, under 10.
//   Turkey                the paper Turkish lira (100 kurus), about 9 to the pound sterling in 1925-26:
//                         97.5 / 9 = 10.8, taken as 11 PT.
//   Iraq                  the Indian rupee (16 annas), 1s 6d sterling: 1.5 x 4.88 = 7.3 PT. The Iraqi
//                         dinar did not replace it until 1932.
import { dayOf } from './life';
import { fmt } from './money';
import { SETTLEMENTS } from '../../data/world';

export type Country = 'egypt' | 'palestine' | 'transjordan' | 'syria' | 'turkey' | 'iraq';
export type Currency = 'egp' | 'pal' | 'syp' | 'try' | 'inr';

const REGION_COUNTRY: Record<string, Country> = {
  Egypt: 'egypt', Sinai: 'egypt', Palestine: 'palestine', Transjordan: 'transjordan',
  Syria: 'syria', Lebanon: 'syria', Anatolia: 'turkey', Iraq: 'iraq',
};

export const COUNTRY_NAME: Record<Country, string> = {
  egypt: 'Egypt', palestine: 'Palestine', transjordan: 'Transjordan', syria: 'Syria and Lebanon', turkey: 'Turkey', iraq: 'Iraq',
};
/** who governs it, in a few words */
export const COUNTRY_RULE: Record<Country, string> = {
  egypt: 'the Kingdom of Egypt', palestine: 'the British Mandate', transjordan: 'the Emirate, under the British Mandate',
  syria: 'the French Mandate', turkey: 'the Turkish Republic', iraq: 'the Kingdom of Iraq, under the British Mandate',
};

export function countryOf(id: string | null | undefined): Country | undefined {
  if (!id) return undefined;
  const st = SETTLEMENTS.find((s) => s.id === id);
  return st ? REGION_COUNTRY[st.region] : undefined;
}

/** the Palestine pound replaced Egyptian money in Palestine and Transjordan from 1 November 1927 */
export const PALESTINE_POUND_FROM = dayOf(11, 1, 1927);

export function currencyOf(c: Country | undefined, day: number): Currency {
  if (c === 'syria') return 'syp';
  if (c === 'turkey') return 'try';
  if (c === 'iraq') return 'inr';
  if ((c === 'palestine' || c === 'transjordan') && day >= PALESTINE_POUND_FROM) return 'pal';
  return 'egp';
}
export const currencyAt = (id: string | null | undefined, day: number) => currencyOf(countryOf(id), day);

/** French francs to the pound sterling, by month from March 1925 (monthly averages, rounded) */
const FRANCS: [number, number][] = [
  [dayOf(3, 1), 92], [dayOf(5, 1), 96], [dayOf(7, 1), 103], [dayOf(9, 1), 108], [dayOf(11, 1), 125],
  [dayOf(12, 1), 130], [dayOf(3, 1, 1926), 137], [dayOf(5, 1, 1926), 160], [dayOf(6, 1, 1926), 175],
  [dayOf(7, 1, 1926), 205], [dayOf(8, 1, 1926), 175], [dayOf(10, 1, 1926), 165], [dayOf(11, 1, 1926), 140],
  [dayOf(12, 1, 1926), 124],
];
export function francsToSterling(day: number) {
  let f = FRANCS[0][1];
  for (const [d, v] of FRANCS) if (day >= d) f = v;
  return f;
}

/** Egyptian piastres for one unit of the money */
export function ptPerUnit(c: Currency, day: number) {
  switch (c) {
    case 'egp': return 100;
    case 'pal': return 97.5;
    case 'syp': return Math.round((20 / francsToSterling(day)) * 97.5 * 10) / 10;
    case 'try': return 11;
    case 'inr': return 7.3;
  }
}

export const CURRENCY: Record<Currency, { name: string; plural: string; sign: string; sub: string; subPer: number; issuer: string }> = {
  egp: { name: 'Egyptian pound', plural: 'Egyptian pounds', sign: '£', sub: 'piastres', subPer: 100, issuer: 'the National Bank of Egypt' },
  pal: { name: 'Palestine pound', plural: 'Palestine pounds', sign: '£P', sub: 'mils', subPer: 1000, issuer: 'the Palestine Currency Board' },
  syp: { name: 'Syrian pound', plural: 'Syrian pounds', sign: '£S', sub: 'Syrian piastres', subPer: 100, issuer: 'the Banque de Syrie et du Grand-Liban' },
  try: { name: 'Turkish lira', plural: 'Turkish lira', sign: '£T', sub: 'kuruş', subPer: 100, issuer: 'the Turkish state' },
  inr: { name: 'rupee', plural: 'rupees', sign: 'Rs', sub: 'annas', subPer: 16, issuer: 'the Government of India' },
};

/** a sum in Egyptian piastres, in the local money: units rounded as a merchant would say them */
export function inLocal(pt: number, c: Currency, day: number) {
  const units = pt / ptPerUnit(c, day);
  const cur = CURRENCY[c];
  if (units < 1) {
    const raw = units * cur.subPer, step = raw >= 20 && cur.subPer >= 100 ? 5 : 1;
    const sub = Math.max(1, Math.round(raw / step) * step);
    return { units, short: `${sub} ${c === 'inr' ? 'annas' : c === 'try' ? 'kuruş' : c === 'pal' ? 'mils' : 'Syrian pt'}`, long: `${sub} ${cur.sub}` };
  }
  const r = units >= 10 ? Math.round(units) : Math.round(units * 2) / 2;
  const n = `${Math.floor(r).toLocaleString('en-GB')}${r % 1 ? '½' : ''}`;
  const short = c === 'inr' ? `Rs ${n}` : `${cur.sign}${n}`;
  return { units, short, long: `${n} ${r === 1 ? cur.name : cur.plural}` };
}

/** "£S12 (£E2.40)" where the money is not Egyptian; plain "£2.40" where it is */
export function localMoney(pt: number, at: string | null | undefined, day: number) {
  const c = currencyAt(at, day);
  if (c === 'egp') return fmt(pt);
  return `${inLocal(pt, c, day).short} (£E${fmt(pt).slice(1)})`;
}
/** "12 Syrian pounds (£E2.40)": the long form, for a sentence */
export function localMoneyLong(pt: number, at: string | null | undefined, day: number) {
  const c = currencyAt(at, day);
  if (c === 'egp') return fmt(pt);
  return `${inLocal(pt, c, day).long} (£E${fmt(pt).slice(1)})`;
}

/** the money used in a place, in a line: "Syrian pounds, about 21 piastres each" */
export function moneyLine(at: string | null | undefined, day: number) {
  const c = currencyAt(at, day);
  const cur = CURRENCY[c];
  if (c === 'egp') {
    const country = countryOf(at);
    return country && country !== 'egypt' ? `Egyptian pounds and piastres, as at home` : 'Egyptian pounds and piastres';
  }
  const per = ptPerUnit(c, day);
  return `${cur.plural[0].toUpperCase()}${cur.plural.slice(1)}, about ${per >= 20 ? Math.round(per) : per.toFixed(1).replace(/\.0$/, '')} piastres each`;
}

/** what the money-changer keeps on the first deal of a visit, by money (2 per cent is "two piastres in the pound") */
export const CHANGER_CUT: Record<Currency, number> = { egp: 0, pal: 0.01, syp: 0.025, try: 0.03, inr: 0.02 };
export const CHANGER_WHY: Record<Currency, string> = {
  egp: '',
  pal: 'Palestine pounds for your Egyptian notes, at a small charge.',
  syp: 'The franc keeps falling, so he keeps two and a half piastres in the pound against it.',
  try: 'Paper lira for your Egyptian notes, and the lira is weak: he keeps three in the hundred.',
  inr: 'Rupees for your Egyptian notes: he keeps two in the hundred.',
};
export const changerFee = (amountPt: number, c: Currency) => (CHANGER_CUT[c] ? Math.max(5, Math.min(500, Math.round(Math.abs(amountPt) * CHANGER_CUT[c]))) : 0);
