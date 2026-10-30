// Shops in other cities: what each one is (ShopState), what it sells in a week, and the Monday post
// from its agent. Pure logic: no store import (the store imports this file).
import type { RugItem } from '../types';
import { RUGS } from '../../data/rugs';
import { SHOP_CITIES, RASHIDS_MAN, AGENTS, RAIL_FEE, type AgentOffer } from '../../data/shops';
import { telegramFee } from './post';
import { perceivedValue } from './negotiation';
import { settlementById } from './world';
import { fmt, snap } from '../economy/money';

export interface ShopAgent extends AgentOffer {
  /** the day he was taken on */
  since: number;
  /** weeks his wage could not be paid; two and he goes */
  unpaid?: number;
  /** times his book has been found short */
  caught?: number;
}
export type ShopRug = RugItem & { /** sent by rail: on the shop's wall from this day */ arrives?: number };
export interface ShopState {
  /** the day it became yours */
  since: number;
  /** what the lease cost (counted in net worth); 0 for the Alexandria shop the goal opened */
  paid: number;
  agent?: ShopAgent;
  stock: ShopRug[];
  /** everything sent to you so far */
  takings?: number;
  /** taken from the takings and not reported: hidden until you look over his book */
  skimmed?: number;
  /** the last day you looked over his book */
  booksDay?: number;
  /** the last week: rugs sold and money sent; what he sold for, what he kept (commission and retainer),
   *  what came to you after his pay, and the rugs left on the wall */
  last?: { day: number; sold: number; sent: number; gross?: number; pay?: number; net?: number; left?: number };
  /** retainers paid so far (takings less these is what the shop has made) */
  wages?: number;
  /** Cairo: the shop in the Khan el-Khalili (the 'khan' upgrade), kept by you, not an agent */
  khan?: boolean;
  /** the Alexandria shop opened by the 'An agent in Alexandria' goal */
  gift?: boolean;
  /** Rashid's man has been let go: the rent for the other merchants' rugs stops */
  noNahhas?: boolean;
  /** a grown son or daughter keeping the shop (systems/household.ts): honest, no wage */
  childAgent?: { id: string; name: string; since: number };
}
export type Shops = Record<string, ShopState>;

/** freight for `n` rugs from the Giza stall to a shop, and the wire that orders it (none from the stall) */
export const railFee = (sid: string, from: string, n: number) => n * (settlementById(sid)?.region === 'Egypt' ? RAIL_FEE.egypt : RAIL_FEE.abroad) + (from === 'giza' ? 0 : telegramFee(from, 'giza'));

/** a shop's rugs that are on its wall today (not still on the train) */
export const onWall = (sh: ShopState | undefined, day: number) => (sh?.stock ?? []).filter((r) => (r.arrives ?? 0) <= day);

/** What a shop's agent asks for a rug from a walk-in buyer: the town's taste counts, as with its dealers,
 *  and a good salesman gets nearer the rug's worth (about 0.9 to 1.0 of it). It is the rug as it is sold:
 *  the same kind, condition and papers fetch the same price on the same wall (a hidden fault is not
 *  known to the walk-in buyer, nor to the agent). */
export function shopPrice(sid: string, item: RugItem, skill: number): number {
  const t = RUGS[item.typeId];
  if (!t) return 0;
  const st = settlementById(sid);
  let m = 1;
  for (const tr of t.traits) m += st?.demand?.[tr] ?? 0;
  return snap(perceivedValue(t, item) * m * (0.8 + 0.25 * skill));
}

/** the terms a man keeps a shop on today: his retainer and commission as the data now has them (a save
 *  keeps the terms he was taken on with, which may be older) */
export function agentTerms(sid: string, a: AgentOffer): { wage: number; share: number } {
  const now = a.id === RASHIDS_MAN.id ? RASHIDS_MAN : (AGENTS[sid] ?? []).find((x) => x.id === a.id);
  return now ? { wage: now.wage, share: now.share ?? 0 } : { wage: a.wage, share: a.share ?? 0 };
}

/** the chance in a week that a given rug on the wall finds a buyer */
export const sellChance = (sid: string, skill: number) => Math.max(0.05, Math.min(0.75, (0.15 + 0.45 * skill) * (SHOP_CITIES[sid]?.trade ?? 1)));
/** no more than this many rugs go in one week */
export const weekCap = (sid: string, skill: number) => 2 + Math.round(skill * 2 + ((SHOP_CITIES[sid]?.trade ?? 1) - 1) * 4);

export interface ShopWeek {
  shops: Shops;
  /** what each shop sold this week (for the city's sales table, systems/ranks.ts) */
  sales: { sid: string; gross: number }[];
  /** money in (takings sent) and out (wages), and what to write */
  cashIn: number;
  cashOut: number;
  ledger: { day: number; kind: 'bonus' | 'expense'; label: string; amount: number }[];
  journal: { day: number; text: string; kind?: string }[];
  letters: { from: string; title: string; body: string }[];
  /** the short Monday notice: "Takings from Alexandria: £12.40." */
  notice: string[];
}

const list = (names: string[]) => (names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

const NUM = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
const rugsWord = (n: number) => `${NUM[n] ?? String(n)} rug${n === 1 ? '' : 's'}`;

/** the week's account in a line, for his letter and for Progress: "Sales £28.40, his pay £3.70, to you £24.70. Four rugs left on the wall." */
export function weekAccount(last: NonNullable<ShopState['last']>, mine = false): string {
  const gross = last.gross ?? last.sent;
  const pay = last.pay ?? 0;
  const net = last.net ?? last.sent;
  const left = last.left ?? 0;
  const money = gross || pay ? `Sales ${fmt(gross)}, ${mine ? 'my pay' : 'his pay'} ${fmt(pay)}, ${net >= 0 ? `to you ${fmt(net)}` : `${fmt(-net)} from your purse`}.` : 'No sales and no pay.';
  return `${money} ${rugsWord(left)} left on the wall.`;
}

/** Monday: every shop with an agent sells for the week, takes his commission (and his retainer, if he had
 *  rugs to sell) and writes. `cash` is what you have before (a retainer the takings do not cover comes out
 *  of it; when it cannot, it is owed). */
export function shopsWeek(shops: Shops | undefined, day: number, cash: number, rng: () => number): ShopWeek {
  const out: ShopWeek = { shops: { ...(shops ?? {}) }, cashIn: 0, cashOut: 0, ledger: [], journal: [], letters: [], notice: [], sales: [] };
  let purse = cash;
  for (const [sid, sh0] of Object.entries(shops ?? {})) {
    // your own grown child keeps it honestly and for no pay, and sells as well as a good agent
    const keeper: ShopAgent | undefined = sh0.agent ?? (sh0.childAgent ? { id: sh0.childAgent.id, name: sh0.childAgent.name, honesty: 1, skill: 0.7, wage: 0, since: sh0.childAgent.since } as ShopAgent : undefined);
    if (sh0.khan || !keeper) continue;
    const sh: ShopState = { ...sh0, stock: [...sh0.stock] };
    const terms = sh0.agent ? agentTerms(sid, keeper) : { wage: 0, share: 0 };
    const a: ShopAgent = { ...keeper, wage: terms.wage, share: terms.share || undefined };
    const town = settlementById(sid)?.name ?? sid;
    const wall = onWall(sh, day);
    const sold: { item: ShopRug; price: number }[] = [];
    const p = sellChance(sid, a.skill), cap = weekCap(sid, a.skill);
    for (const item of [...wall].sort(() => rng() - 0.5)) {
      if (sold.length >= cap) break;
      if (rng() < p) sold.push({ item, price: shopPrice(sid, item, a.skill) });
    }
    const gross = sold.reduce((t, x) => t + x.price, 0);
    const share = terms.share ? Math.round(gross * terms.share) : 0;
    // a dishonest man keeps some back now and then, and reports less
    const skim = gross > 0 && rng() < (1 - a.honesty) * 0.8 ? Math.round((gross - share) * (0.15 + rng() * 0.2)) : 0;
    const sent = gross - share - skim;
    sh.stock = sh.stock.filter((r) => !sold.some((x) => x.item.uid === r.uid));
    if (skim) sh.skimmed = (sh.skimmed ?? 0) + skim;
    const left = onWall(sh, day).length;
    const names = sold.map((x) => `the ${RUGS[x.item.typeId]?.name ?? 'rug'}`);
    // the retainer: only in a week when there were rugs of yours to sell
    const owesWage = terms.wage > 0 && wall.length > 0;
    let body: string;
    if (sold.length) body = `Effendi, this week I sold ${list(names)}. I send ${fmt(sent)} by postal order${share ? ', my commission taken' : ''}${owesWage ? `, and keep my retainer of ${fmt(terms.wage)}` : ''}. ${left ? `${left} of your rugs ${left === 1 ? 'is' : 'are'} still on the wall.` : 'Nothing of yours is left on the wall: send me more.'}`;
    else if (wall.length) body = `Effendi, a slow week. Buyers came in and looked, but nobody paid. ${wall.length} of your rugs ${wall.length === 1 ? 'is' : 'are'} on the wall.`;
    else body = `Effendi, there is nothing of yours in the shop to sell, so there are no takings to send${terms.wage ? ', and I take no retainer for an empty wall' : ''}. Bring rugs, or send them from your stall by rail, and I will sell them. The shutters still go up every morning.`;
    // Rashid's man also shows other merchants' rugs, and their rent for the wall comes to you (store.ts)
    if (a.id === RASHIDS_MAN.id && !sh.noNahhas) body += ' The rent from the other merchants for the wall comes with this, as agreed.';
    // the retainer: from the takings first, then from your purse
    let paidWage = 0;
    purse += sent;
    if (owesWage) {
      if (purse >= terms.wage) { paidWage = terms.wage; purse -= terms.wage; a.unpaid = 0; }
      else {
        a.unpaid = (a.unpaid ?? 0) + 1;
        body += ` I have not had my retainer${a.unpaid > 1 ? ' for two weeks' : ''}.`;
      }
    }
    out.cashIn += sent;
    if (gross > 0) out.sales.push({ sid, gross });
    out.cashOut += paidWage;
    if (sent > 0) {
      out.ledger.push({ day, kind: 'bonus', label: `Takings from ${town}`, amount: sent });
      out.notice.push(`Takings from ${town}: ${fmt(sent)}.`);
    }
    if (paidWage) out.ledger.push({ day, kind: 'expense', label: `Wage: ${a.name}, your agent in ${town} (retainer)`, amount: -paidWage });
    sh.takings = (sh.takings ?? 0) + sent;
    sh.wages = (sh.wages ?? 0) + paidWage;
    // what he says he sold for is what he sent and what he kept as commission
    sh.last = { day, sold: sold.length, sent, gross: sent + share, pay: share + paidWage, net: sent - paidWage, left };
    const account = weekAccount(sh.last);
    out.journal.push({ day, text: sold.length ? `${a.name} sold ${list(names)} in ${town} and sent ${fmt(sent)}. ${account}` : wall.length ? `Nothing sold in ${town} this week. ${account}` : `Your shop in ${town} stood empty this week: nothing to sell, nothing sent.`, kind: 'shop' });
    if ((a.unpaid ?? 0) >= 2) {
      body += ' I have locked the shop and left the key with the landlord. Your rugs are safe inside.';
      out.journal.push({ day, text: `${a.name} left your shop in ${town}: his retainer was not paid.`, kind: 'shop' });
      sh.agent = undefined;
      if (a.id === RASHIDS_MAN.id) sh.noNahhas = true;
    } else if (sh0.agent) sh.agent = { ...sh0.agent, unpaid: a.unpaid, wage: terms.wage, share: terms.share || undefined };
    out.letters.push({ from: a.name, title: `From your shop in ${town}`, body: `${body} Your servant, ${a.name}. The week's account: ${weekAccount(sh.last, true)}` });
    out.shops[sid] = sh;
  }
  return out;
}

/** Looking over the agent's book in person: whatever he kept back comes out; he pays back half. */
export function lookOverBook(sh: ShopState, day: number): { shop: ShopState; refund: number; text: string } {
  const a = sh.agent;
  if (!a) return { shop: sh, refund: 0, text: 'There is nobody keeping the shop, and no book to look at.' };
  if ((sh.booksDay ?? -99) > day - 7) return { shop: sh, refund: 0, text: 'You went through his book a few days ago. Nothing new in it yet.' };
  const missing = sh.skimmed ?? 0;
  if (!missing) return { shop: { ...sh, booksDay: day }, refund: 0, text: `${a.name}'s book agrees with every postal order he sent. It is in order.` };
  const refund = Math.round(missing / 2);
  return {
    shop: { ...sh, booksDay: day, skimmed: 0, agent: { ...a, caught: (a.caught ?? 0) + 1, honesty: Math.min(0.95, a.honesty + 0.15) } },
    refund,
    text: `The book and the postal orders do not agree: ${fmt(missing)} is missing. ${a.name} says it was a mistake in his sums, pays back ${fmt(refund)} and swears it will not happen again.`,
  };
}
