// Egyptian money in 1925: 1 Egyptian pound (£E) = 100 piastres (PT) = 1,000 milliemes.
// Pegged at £E0.975 to £1 sterling (97.5 piastres to the pound sterling) from 1914.
// All amounts in the game are held in piastres.

/** Prices are quoted on a merchant's ladder: piastres in fives, then pounds in sensible steps. */
export function priceStep(v: number) {
  if (v < 200) return 5;
  if (v < 1000) return 25;
  if (v < 5000) return 100; // £E1
  if (v < 20000) return 500; // £E5
  return 2500; // £E25
}

export function snap(v: number) {
  if (!isFinite(v) || v <= 5) return 5;
  const st = priceStep(v);
  return Math.max(5, Math.round(v / st) * st);
}

/** A buyer's offer never rounds up past what they would pay. */
export function snapDown(v: number) {
  if (!isFinite(v) || v <= 5) return 5;
  let st = priceStep(v);
  if (Math.floor(v / st) * st < 5) st = 5;
  return Math.max(5, Math.floor(v / st) * st);
}

/** Next and previous prices on the ladder, used by the price dial. */
export const ladderUp = (v: number, steps = 1) => { let x = snap(v); for (let i = 0; i < steps; i++) x = snap(x + priceStep(x)); return x; };
export const ladderDown = (v: number, steps = 1) => { let x = snap(v); for (let i = 0; i < steps; i++) x = snap(Math.max(5, x - priceStep(x - 1))); return x; };

/** Every price a character can say aloud, for the recording script. */
export function ladder(lo = 5, hi = 160000) {
  const out: number[] = [];
  for (let v = 5; v <= hi; v += priceStep(v)) if (v >= lo) out.push(v);
  return out;
}

/** How money is written: always in Egyptian pounds, e.g. £0.85, £4.50, £250. */
export function fmt(pt: number): string {
  const v = Math.round(pt);
  if (v < 0) return `−${fmt(-v)}`;
  const pounds = v / 100;
  const s = v % 100 === 0 ? pounds.toLocaleString('en-GB') : pounds.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `£${s}`;
}

const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
export function words(n: number): string {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '');
  if (n < 1000) return ONES[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' and ' + words(n % 100) : '');
  return words(Math.floor(n / 1000)) + ' thousand' + (n % 1000 ? (n % 1000 < 100 ? ' and ' : ' ') + words(n % 1000) : '');
}

/** How a merchant says a price out loud: "eighty-five piastres", "four pounds fifty", "two hundred and fifty pounds". */
export function spoken(pt: number) {
  if (pt < 100) return `${words(pt)} piastres`;
  const p = Math.floor(pt / 100), r = pt % 100;
  const pounds = p === 1 ? 'one pound' : `${words(p)} pounds`;
  return r ? `${pounds} ${words(r)}` : pounds;
}
