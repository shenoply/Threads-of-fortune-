// The morning card's two small pulls forward, read from the game as it stands (nothing here is saved):
// one line on what the day ahead holds that is really in the state (a payment due, a promise falling
// due, a buyer coming back, a sale room sitting, a letter waiting), and from about the twentieth day a
// few things within reach of the purse.
import type { GameState } from './state/store';
import { BUYERS } from '../data/buyers';
import { UPGRADES } from '../data/suppliers';
import { SHOP_CITIES } from '../data/shops';
import { RUGS } from '../data/rugs';
import { BREEDS, ANIMAL_MARKETS } from '../data/animals';
import { AUCTION_HOUSES } from '../data/auctionHouses';
import { nextSale } from './auction/sessions';
import { dateFor } from './economy/economy';
import { isFirstOfMonth } from './economy/life';
import { fmt } from './economy/money';
import { firstDue, dueDate } from './firstWeek';
import { unread } from './systems/post';
import { settlementById } from './systems/world';
import { PAPERS_FEE } from './systems/customs';
import { animalCount } from './systems/caravan';

type S = Pick<GameState, 'day' | 'cash' | 'reputation' | 'family' | 'supplier' | 'queue' | 'visitIdx' | 'relationships' | 'post' | 'favours' | 'upgrades' | 'shops' | 'register' | 'passport' | 'world'>;

const when = (day: number, today: number) => (day <= today ? 'today' : day === today + 1 ? 'tomorrow' : `on ${dateFor(day).weekday}`);
const town = (id: string) => { try { return settlementById(id).name.split(',')[0]; } catch { return id; } };

/** One line on the day ahead, or null when nothing real is coming. `instalment`: Rashid's monthly sum. */
export function aheadLine(s: S, instalment: number): string | null {
  const day = s.day;
  // 1. money falling due
  const first = firstDue(s.family, day);
  if (first && first.days <= 3) {
    const short = first.owed - s.cash;
    return `Rashid's ${fmt(first.owed)} falls due ${first.days === 0 ? 'tonight' : `on ${dueDate(first.by)}`}. ${short > 0 ? `${fmt(short)} still to find.` : 'The money is in your purse.'}`;
  }
  if (s.supplier.debt > 0 && s.supplier.debtDue >= day && s.supplier.debtDue - day <= 2) return `Rashid's credit for stock, ${fmt(s.supplier.debt)}, is due ${when(s.supplier.debtDue, day)}.`;
  const left = s.family?.left ?? 0;
  for (let d = 1; d <= 2; d++) if (left > 0 && isFirstOfMonth(day + d)) return `On the first of the month, ${when(day + d, day)}, Rashid takes ${fmt(Math.min(instalment, left))} of your father's debt from the purse.`;
  // 2. a promise falling due
  const fav = (s.favours?.active ?? []).filter((f) => f.due >= day && f.due - day <= 2).sort((a, b) => a.due - b.due)[0];
  if (fav) return `A favour you promised falls due ${when(fav.due, day)}: ${fav.text.replace(/\.$/, '')}.`;
  // 3. a buyer who knows you, coming to the stall
  const back = s.queue.slice(s.visitIdx).find((id) => (s.relationships[id]?.visits ?? 0) > 0 && BUYERS[id]);
  if (back) {
    const r = s.relationships[back];
    return `${BUYERS[back].name} is expected at the stall today. ${r.purchases > 0 ? `An old customer: ${r.purchases === 1 ? 'one rug bought from you so far' : `${r.purchases} rugs bought from you so far`}.` : 'Last time there was no sale.'}`;
  }
  // 4. a sale room sitting soon, nearest first
  const near = ['cairo', 'alexandria'];
  const sale = AUCTION_HOUSES.map((h) => ({ h, d: nextSale(h.id, day) })).filter((x) => x.d >= day && x.d - day <= 2).sort((a, b) => Number(near.includes(b.h.city)) - Number(near.includes(a.h.city)) || a.d - b.d)[0];
  // 5. a letter waiting
  const letters = unread(s.post, day);
  if (letters > 0 && (!sale || !near.includes(sale.h.city))) {
    const l = (s.post?.letters ?? []).find((x) => x.day <= day && !x.read);
    return letters === 1 && l ? `A letter waits for you at the post: ${l.title.replace(/\.$/, '')}.` : `${letters} letters wait for you at the post.`;
  }
  if (sale) return `The ${sale.h.displayName} in ${town(sale.h.city)} holds a sale ${when(sale.d, day)}.`;
  return null;
}

export interface Reach { id: string; kind: 'stall' | 'shop' | 'piece' | 'caravan' | 'papers'; title: string; line: string; cost: number; ready: boolean }

/** From about day 20: one to three things the purse could buy now or soon, one of each kind. */
export const REACH_FROM = 20;
export function withinReach(s: S): Reach[] {
  if (s.day < REACH_FROM) return [];
  const out: Reach[] = [];
  const cash = s.cash, rep = s.reputation;
  const add = (r: Omit<Reach, 'ready'>) => { if (cash >= r.cost * 0.75) out.push({ ...r, ready: cash >= r.cost }); };
  // the next stall
  const st = UPGRADES.find((u) => u.stall && !s.upgrades.includes(u.id) && (!u.after || s.upgrades.includes(u.after)));
  if (st && rep >= (st.rep ?? 0)) add({ id: `up-${st.id}`, kind: 'stall', title: st.name, line: st.effect.split('.')[0] + '.', cost: st.cost });
  // a shop in another city, the cheapest the lane's good word allows
  const shop = Object.values(SHOP_CITIES).filter((c) => c.id !== 'cairo' && !s.shops?.[c.id] && rep >= c.rep).sort((a, b) => a.cost - b.cost)[0];
  if (shop) add({ id: `shop-${shop.id}`, kind: 'shop', title: `A shop in ${town(shop.id)}`, line: `${shop.place[0].toUpperCase()}${shop.place.slice(1)}. An agent keeps it and sells for you.`, cost: shop.cost });
  // a carpet at Rashid's that is not yet in the Register
  const reg = s.register ?? [];
  const piece = (s.supplier.offers ?? []).filter((o) => RUGS[o.typeId] && !reg.includes(o.typeId)).sort((a, b) => (RUGS[b.typeId].tier ?? 1) - (RUGS[a.typeId].tier ?? 1) || b.price - a.price).find((o) => cash >= o.price * 0.75);
  if (piece) add({ id: `piece-${piece.uid}`, kind: 'piece', title: RUGS[piece.typeId].name, line: "At Rashid's today, and not yet in your Register.", cost: piece.price });
  // a first camel for the caravan, at the cheapest market that has one
  if (s.world?.party && animalCount(s.world.party) === 0) {
    const camel = Object.entries(ANIMAL_MARKETS).flatMap(([city, list]) => list.filter(([id]) => BREEDS[id]?.kind === 'camel').map(([id, k]) => ({ city, id, price: Math.round(BREEDS[id].price * k) }))).sort((a, b) => a.price - b.price)[0];
    if (camel) add({ id: 'caravan', kind: 'caravan', title: `A ${BREEDS[camel.id].name} for the caravan`, line: `At the ${town(camel.city)} market. More rugs on the road, and further to go.`, cost: camel.price });
  }
  // papers for the frontiers
  if (!s.passport) add({ id: 'papers', kind: 'papers', title: 'A passport', line: 'At the Passport Office in Cairo. Palestine, Syria and beyond without fines at the frontier.', cost: PAPERS_FEE });
  // the ones you can buy now first, then the biggest of the rest: never more than three
  return out.sort((a, b) => Number(b.ready) - Number(a.ready) || b.cost - a.cost).slice(0, 3);
}
