// The shop boy. In 1925 a Giza stallholder who had to be away left a boy (a neighbour's son or nephew)
// sitting on the stall for a couple of piastres a day and a loaf. He keeps buyers talking until the
// owner is back, or sells the plain stock at a price he has been given, and keeps the takings in a
// tin. He is a boy: now and then a buyer talks him down, or a coin goes missing. The longer he works
// for you, the less often either happens.
//
// Pure logic: no store import (the store imports this file). Values the store owns (the customers'
// arrival hours, how long a customer waits) are passed in.
import { recordCitySale } from './ranks';
import type { GameState } from '../state/store';
import type { LedgerEntry, RugItem } from '../types';
import { RUGS } from '../../data/rugs';
import { BUYERS, BUYER_TIERS, CELEB_IDS, SPECIAL_BUYERS } from '../../data/buyers';
import { rugValue } from './finance';
import { snap, snapDown, fmt } from '../economy/money';

export interface BoySale { day: number; typeId: string; price: number; asked: number; how?: 'down' | 'cheap' }
export interface ShopBoyState {
  hired: boolean;
  /** the day this stint began */
  since: number;
  /** how far he can be trusted, 0..90: a point for every day he works for you */
  trust: number;
  /** 'wait': keep buyers talking until you are back; 'sell': sell plain rugs at your price */
  mode: 'wait' | 'sell';
  /** his price for a plain rug, as a share of what it is worth */
  pct: number;
  /** days of pay you owe him */
  owed: number;
  /** what he did while you were away, for the card you see when you get back */
  report: string[];
  /** his last sales, newest last */
  sales: BoySale[];
  /** piastres found short in the tin, all told */
  short: number;
  days: number;
  /** a boy from one of the lane's own families (systems/laneBoys.ts) in Sami's place: who he is, what
   *  he is called, his one gift, and his pay by the week; none of these for Sami */
  who?: string;
  name?: string;
  trait?: BoyTrait;
  weekly?: number;
}
export type BoyTrait = 'sharp' | 'quick' | 'voice' | 'honest' | 'lane' | 'reads';
/** the boy's name: Sami, or the lane boy taken on in his place */
export const boyName = (b?: Pick<ShopBoyState, 'name'>) => b?.name ?? BOY.name;
/** the hired boy's gift, if he has one */
export const boyTrait = (s: Pick<GameState, 'shopBoy'>): BoyTrait | undefined => (s.shopBoy?.hired ? s.shopBoy.trait : undefined);
/** tonight's pay: Sami's day rate, or a lane boy's week spread over seven nights in whole piastres */
export const wageTonight = (b: Pick<ShopBoyState, 'weekly' | 'days'>, nights = 1) => {
  if (!b.weekly) return BOY.wage * nights;
  // tonight is night days+1; the nights still owed are the ones before it
  const d = b.days + 1;
  return Math.floor((d * b.weekly) / 7) - Math.floor((Math.max(0, d - nights) * b.weekly) / 7);
};

export const BOY = {
  name: 'Sami',
  who: 'Sami, nephew of Hajj Mahmoud the cloth seller',
  /** piastres a day, paid at night with the other wages: a labourer had 4 or 5, a boy 1 to 3 */
  wage: 2,
  /** hours more a buyer will wait when he is there to talk to them (the stall alone: AWAY_PATIENCE) */
  wait: 3,
  startTrust: 30,
  maxTrust: 90,
  /** he walks out after this many unpaid days */
  quitAfter: 3,
} as const;
export const BOY_PCTS = [0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3];

/** extra hours a customer waits at the stall while the boy is minding it */
export const boyWait = (s: Pick<GameState, 'shopBoy'>) => (s.shopBoy?.hired ? BOY.wait : 0);

/** your father's rug, or one with no price paid: the boy never sells those */
const neverSell = (i: RugItem) => i.uid === 'start-fh' || !i.paid || i.notes?.some((n) => /father/i.test(n));
/** Plain (Common) rugs left at the stall, not packed for the road, not at the restorer, not put aside. */
export function plainRugs(s: Pick<GameState, 'inventory' | 'day'>) {
  return s.inventory.filter((i) => (RUGS[i.typeId]?.tier ?? 1) === 1 && i.stored && !i.restoringUntil && !(i.reservedFor && (i.reservedUntil ?? Infinity) >= s.day) && !neverSell(i));
}
export const boyPrice = (i: RugItem, pct: number) => snap(rugValue(i) * pct);
/** only buyers who buy plain rugs at all will buy one from a boy; regulars with an order, and the
 *  famous, want the merchant himself */
export const buysFromBoy = (id: string) => (BUYER_TIERS[id]?.[0] ?? 2) === 1 && !SPECIAL_BUYERS.includes(id) && !CELEB_IDS.includes(id);
/** the chance a buyer takes a plain rug at this share of its worth: half at 90 per cent, almost none at 130 */
export const takeChance = (pct: number) => Math.max(0.05, Math.min(0.8, 0.5 - 1.5 * (pct - 0.9)));
export const trustWord = (t: number) => (t >= 75 ? 'trusted' : t >= 50 ? 'steady' : t >= 35 ? 'learning' : 'new');

export function hireBoy(prev: ShopBoyState | undefined, day: number): ShopBoyState {
  return {
    hired: true, since: day,
    // taken back after being let go, he is warier than he was
    trust: prev ? Math.max(20, prev.trust - 15) : BOY.startTrust,
    mode: prev?.mode ?? 'sell', pct: prev?.pct ?? 0.9, owed: 0, report: [], sales: prev?.sales ?? [], short: prev?.short ?? 0, days: prev?.days ?? 0,
  };
}

type Mind = Pick<GameState, 'shopBoy' | 'inventory' | 'day' | 'queue' | 'visitIdx' | 'cash' | 'ledger' | 'journal' | 'dayStats' | 'totalSales' | 'arrivals'> & Partial<Pick<GameState, 'ranks'>>;

/** The boy deals with the customers who came while you were away, up to `hour`. A buyer of plain rugs
 *  may buy one at his price; anyone else he keeps talking for a few hours. `final`: the day is over and
 *  everyone still unserved has gone home. Returns the changed state and lines for your report. */
export function boyMinds(s: Mind, hour: number, opts: { arrivalAt: (i: number) => number; patience: number; final: boolean; rng: () => number; name?: string }): { patch: Partial<GameState>; lines: string[] } | null {
  const boy = s.shopBoy;
  if (!boy?.hired) return null;
  const { rng } = opts;
  // someone else may mind the stall in his place (your wife: systems/household.ts)
  const who = opts.name ?? boyName(boy);
  let idx = s.visitIdx;
  let inventory = s.inventory;
  let cash = s.cash;
  const ledger: LedgerEntry[] = [...s.ledger];
  const journal = [...s.journal];
  const stats = { ...s.dayStats };
  let total = s.totalSales ?? 0;
  const sales = [...boy.sales];
  const lines: string[] = [];
  const left: string[] = [];
  const slack = 1 - boy.trust / 100;
  let sold = 0;
  let takings = 0;
  while (idx < s.queue.length && opts.arrivalAt(idx) <= hour) {
    const id = s.queue[idx];
    const pool = boy.mode === 'sell' && buysFromBoy(id) ? plainRugs({ inventory, day: s.day }) : [];
    if (pool.length && rng() < takeChance(boy.pct)) {
      const item = pool[Math.floor(rng() * pool.length)];
      const asked = boyPrice(item, boy.pct);
      let price = asked;
      let how: BoySale['how'];
      if (rng() < 0.35 * slack) { price = snapDown(asked * (0.85 + rng() * 0.05)); how = 'down'; }
      // a boy who can read your ticket does not take a first low offer
      else if (rng() < 0.12 * slack && boy.trait !== 'reads') { price = snapDown(asked * 0.75); how = 'cheap'; }
      if (price >= asked) how = undefined;
      const name = RUGS[item.typeId].name;
      inventory = inventory.filter((i) => i.uid !== item.uid);
      cash += price;
      ledger.push({ day: s.day, kind: 'sale', label: `${who} sold ${name} while you were away`, amount: price, cost: item.paid });
      journal.push({ day: s.day, text: `${who} sold the ${name} to ${BUYERS[id]?.name ?? 'a buyer'} for ${fmt(price)} while you were away (paid ${fmt(item.paid)}).`, kind: 'stall' });
      stats.sales += 1; stats.revenue += price; stats.gross += price - item.paid;
      total += 1; sold += 1; takings += price;
      sales.push({ day: s.day, typeId: item.typeId, price, asked, how });
      lines.push(`${who} sold the ${name} for ${fmt(price)} while you were away.${how === 'down' ? ` ${BUYERS[id]?.name ?? 'The buyer'} talked him down from ${fmt(asked)}.` : how === 'cheap' ? ` He took the first offer; your price was ${fmt(asked)}.` : ''}`);
      idx++;
      continue;
    }
    // nothing he could sell them: he keeps them talking, and in the end they go
    if (opts.final || opts.arrivalAt(idx) + opts.patience < hour) { left.push(BUYERS[id]?.name ?? 'A customer'); idx++; continue; }
    break;
  }
  if (left.length && opts.final) lines.push(`${left.length === 1 ? left[0] : `${left.slice(0, -1).join(', ')} and ${left[left.length - 1]}`} came by. ${who} asked them to wait, but they could not stay.`);
  let short = 0;
  // an honest boy's tin is never short
  if (sold && boy.trait !== 'honest' && rng() < 0.25 * slack) {
    short = Math.min(cash, 1 + Math.floor(rng() * 3));
    cash -= short;
    ledger.push({ day: s.day, kind: 'expense', label: `Short in ${who}'s takings`, amount: -short });
    lines.push(`The takings were ${short} piastre${short > 1 ? 's' : ''} short. ${who} says a coin rolled into the gutter.`);
  }
  if (idx === s.visitIdx && !lines.length) return null;
  const shopBoy: ShopBoyState = { ...boy, sales: sales.slice(-12), short: boy.short + short, report: [...boy.report, ...lines] };
  // the boy's sales are the stall's: they count in Cairo's table (systems/ranks.ts)
  return { patch: { visitIdx: idx, inventory, cash, ledger, journal, dayStats: stats, totalSales: total, shopBoy, ...recordCitySale(s, 'giza', takings) }, lines };
}

/** The boy's pay at night, with the other wages: paid if the purse allows, otherwise owed; three
 *  unpaid days and he goes back to his uncle's shop. Every day worked builds his trust. */
export function boyNight(s: Pick<GameState, 'shopBoy' | 'cash' | 'ledger' | 'day'>): { patch: Partial<GameState>; lines: string[] } | null {
  const boy = s.shopBoy;
  if (!boy?.hired) return null;
  const due = wageTonight(boy, 1 + boy.owed);
  const nm = boyName(boy), home = boy.who ? 'his family' : 'his uncle\'s shop';
  const lines: string[] = [];
  let cash = s.cash;
  const ledger = [...s.ledger];
  let next: ShopBoyState = { ...boy, days: boy.days + 1, trust: Math.min(BOY.maxTrust, boy.trust + 1) };
  if (cash >= due) {
    cash -= due;
    ledger.push({ day: s.day, kind: 'expense', label: `Wages for ${nm}, the shop boy${boy.owed ? ` (and ${boy.owed} day${boy.owed > 1 ? 's' : ''} owed)` : ''}`, amount: -due });
    next.owed = 0;
  } else if (boy.owed + 1 >= BOY.quitAfter) {
    next = { ...next, hired: false, owed: 0 };
    lines.push(`${nm} has gone back to ${home}. You owed him ${BOY.quitAfter} days' pay.`);
  } else {
    next.owed = boy.owed + 1;
    lines.push(`You could not pay ${nm} tonight. He will wait a day or two.`);
  }
  return { patch: { cash, ledger, shopBoy: next }, lines };
}
