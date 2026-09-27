import type { Condition, Goal, RugItem, SupplierOffer } from '../types';
import { fmt } from './money';
import { RUGS } from '../../data/rugs';
import { RASHID_POOL } from '../../data/suppliers';
import { snap } from './money';

let uidCounter = Date.now() % 100000;
export const newUid = (p = 'r') => `${p}${(uidCounter++).toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;

const SUPPLIER_FACTOR: Record<Condition, number> = { Excellent: 1.15, Good: 1, Worn: 0.72, Dirty: 0.55, Damaged: 0.4 };

export function offerPrice(typeId: string, c: Condition) {
  const t = RUGS[typeId];
  // Rashid charges more for the better pieces: auctions and other towns are the cheaper way to stock them
  return snap(t.dealerCost * SUPPLIER_FACTOR[c] * ((t.tier ?? 1) >= 2 ? 1.15 : 1));
}

function weighted<T extends { w?: number; weight?: number }>(arr: T[], rng: () => number): T {
  const total = arr.reduce((s, a) => s + (a.w ?? a.weight ?? 1), 0);
  let r = rng() * total;
  for (const a of arr) {
    r -= a.w ?? a.weight ?? 1;
    if (r <= 0) return a;
  }
  return arr[arr.length - 1];
}

const tagFor = (typeId: string, c: Condition): SupplierOffer['tag'] =>
  c === 'Dirty' ? 'Dirty' : c === 'Damaged' ? 'Damaged' : c === 'Worn' ? 'Worn' : (RUGS[typeId].tier ?? 1) >= 3 ? 'Rare' : undefined;

export function rashidStock(day: number, rng: () => number, rep = 0, commonOnly = false): SupplierOffer[] {
  if (day === 1) {
    return [
      { uid: newUid('s'), typeId: 'village-kilim-canal', condition: 'Good', price: offerPrice('village-kilim-canal', 'Good'), qty: 3 },
      { uid: newUid('s'), typeId: 'nile-reed', condition: 'Dirty', price: offerPrice('nile-reed', 'Dirty'), tag: 'Dirty', qty: 2 },
      { uid: newUid('s'), typeId: 'delta-house', condition: 'Good', price: offerPrice('delta-house', 'Good'), tag: 'Limited', leavesAfterDay: 1 },
    ];
  }
  const out: SupplierOffer[] = [];
  const used = new Set<string>();
  let guard = 0;
  // until Rashid's errand is done he keeps everything but village rugs in the back room
  const pool = RASHID_POOL.filter((p) => (p.minRep ?? 0) <= rep && (!commonOnly || (RUGS[p.typeId].tier ?? 1) === 1));
  const n = rep >= 25 ? 5 : rep >= 10 ? 4 : 3;
  while (out.length < n && guard++ < 40) {
    const tpl = weighted(pool, rng);
    if (used.has(tpl.typeId)) continue;
    used.add(tpl.typeId);
    const c = weighted(tpl.conditions, rng).c;
    const limited = (RUGS[tpl.typeId].tier ?? 1) >= 3 && rng() < 0.6;
    out.push({
      uid: newUid('s'),
      typeId: tpl.typeId,
      condition: c,
      price: offerPrice(tpl.typeId, c),
      tag: limited ? 'Limited' : tagFor(tpl.typeId, c),
      leavesAfterDay: limited ? day : undefined,
      qty: limited ? 1 : (RUGS[tpl.typeId].tier ?? 1) === 1 ? 2 + Math.floor(rng() * 3) : (RUGS[tpl.typeId].tier ?? 1) === 2 ? 1 + Math.floor(rng() * 2) : 1,
    });
  }
  return out;
}

export function startingInventory(): RugItem[] {
  return [
    { uid: 'start-ds', typeId: 'desert-star', condition: 'Good', restored: false, provenance: 'Likely', paid: 420, notes: ['Consigned by Rashid against your father\'s account'], stored: true },
    { uid: 'start-cg', typeId: 'cairo-garden', condition: 'Good', restored: false, provenance: 'Documented', paid: 480, notes: ['Consigned by Rashid against your father\'s account'], stored: true },
    { uid: 'start-fh', typeId: 'fayoum-hearth', condition: 'Worn', restored: false, provenance: 'Uncertain', paid: 110, notes: ['Handed over from your father\'s last stock'], stored: true },
  ];
}

export function dateFor(day: number) {
  const d = new Date(Date.UTC(1925, 2, 9 + day));
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const wd = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getUTCDay()];
  const y = d.getUTCFullYear();
  return { short: `${d.getUTCDate()} ${months[d.getUTCMonth()].slice(0, 3)} ${y}`, long: `${wd}, ${d.getUTCDate()} ${months[d.getUTCMonth()]} ${y}`, weekday: wd };
}

export function goalsFor(day: number, opts: { commission?: string; debt: number; visitors?: number }): Goal[] {
  const g: Goal[] = [];
  const v = opts.visitors ?? 3;
  const sales = Math.max(1, Math.min(v, 2));
  const gross = snap(Math.min(150 + (day - 1) * 40, 1500) * (v / 3 + 0.34));
  g.push({ id: 'sales', kind: 'sales', label: day === 1 ? 'Make your first sales: sell 2 rugs' : sales === 1 ? 'Make a sale' : `Sell ${sales} rugs`, target: sales });
  g.push({ id: 'gross', kind: 'gross', label: `Earn ${fmt(gross)} gross profit`, target: gross });
  if (opts.commission) g.push({ id: 'commission', kind: 'commission', label: opts.commission, target: 1 });
  if (opts.debt > 0) g.push({ id: 'pay', kind: 'payRashid', label: `Pay Uncle Rashid ${fmt(opts.debt)}`, target: opts.debt });
  return g;
}
