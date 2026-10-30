// Coming back on the game's own days: the gift, Rashid's runner and the free bale follow game days (and
// older saves that kept the wall clock still work); the first week's handouts are a third of the usual,
// so Rashid's first £10 has to be sold for; the rank on the road agrees with the rank in the header.
//   npx tsx tests/hook-days.ts
// (or: npx esbuild tests/hook-days.ts --bundle --platform=node --format=esm --outfile=/tmp/hook.mjs && node /tmp/hook.mjs)
import { giftToday, giftFor, pouchReady, pouchFor, errandsFor, ALL_THREE, earlyK } from '../src/game/systems/daily';
import { baleFreeIn } from '../src/game/systems/bales';
import { RANKS, rankOf } from '../src/game/economy/progress';
import { FIRST_SUM } from '../src/game/firstWeek';
import type { LedgerEntry } from '../src/game/types';

let fails = 0;
const ok = (c: boolean, w: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${w}`); if (!c) fails++; };

// ---- the gift, by game day ----
ok(giftToday(undefined, 1).open && giftToday(undefined, 1).run === 1, 'a new game: the first gift is there on day 1');
const d1 = { streak: 1, best: 1, giftDay: 1 };
ok(!giftToday(d1, 1).open, 'opened on day 1: nothing more that day');
ok(giftToday(d1, 2).open && giftToday(d1, 2).run === 2, 'day 2: the second of the run');
ok(giftToday(d1, 3).run === 2, 'one day missed is forgiven');
ok(giftToday({ streak: 3, best: 3, giftDay: 1 }, 5).run === 1 && giftToday({ streak: 3, best: 3, giftDay: 1 }, 5).lost, 'two days missed: a new week');
const old = { streak: 4, best: 4, last: '2026-10-29' };
ok(giftToday(old, 30).open && giftToday(old, 30).run === 5, 'an older save (wall-clock date) carries its run on, on game days');

// ---- the runner, at dawn ----
ok(pouchReady(undefined, 1), 'the runner is there on the first morning');
ok(!pouchReady({ streak: 0, best: 0, pouchDay: 4 }, 4), 'once a day');
ok(pouchReady({ streak: 0, best: 0, pouchDay: 4 }, 5), 'again the next dawn');
ok(pouchReady({ streak: 0, best: 0, pouch: Date.now() }, 9), 'an older save (ms) gets its purse at once');

// ---- the free bale, every other dawn ----
ok(baleFreeIn(undefined, 1) === 0, 'a free bale on day 1');
ok(baleFreeIn({ freeDay: 1, opened: 1, dry: 1, treasures: 0 }, 2) === 1, 'the next one the day after tomorrow');
ok(baleFreeIn({ freeDay: 1, opened: 1, dry: 1, treasures: 0 }, 3) === 0, 'free again on day 3');
ok(baleFreeIn({ freeAt: Date.now(), opened: 3, dry: 3, treasures: 0 }, 12) === 0, 'an older save (ms) gets a bale at once');

// ---- the first week: handouts cut to a third ----
ok(earlyK(1) < 0.34 && earlyK(7) < 0.34 && earlyK(8) === 1, 'first week a third, then the full sums');
const g1 = giftFor(1, 0, [], 1), g8 = giftFor(1, 0, [], 8);
const cashOf = (g: ReturnType<typeof giftFor>) => (g.kind === 'cash' ? g.amount : 0);
ok(cashOf(g1) === 30 && cashOf(g8) === 100, `day-one gift £${cashOf(g1) / 100} (was £1)`);
const top = pouchFor(0, () => 0.99, ['x'], 1), top8 = pouchFor(0, () => 0.99, ['x'], 8);
const purseMax = top.kind === 'cash' ? top.amount : 999;
ok(pouchFor(0, () => 0.05, ['x'], 1).kind !== 'rug' && pouchFor(0, () => 0.05, ['x'], 8).kind === 'rug', 'no rug from the runner in the first week');
ok(top8.kind === 'cash' && top8.amount === 80, 'after the first week the full purse');
ok(purseMax <= 30, `runner's purse in the first week at most £${purseMax / 100} (was up to £0.80)`);
// a day-one sale ledger that finishes every errand there is
const big: LedgerEntry[] = [1, 2, 3].map((n) => ({ day: 1, kind: 'sale', label: `s${n}`, amount: 900, cost: 400 }) as LedgerEntry);
const e1 = errandsFor(1, big, 0), e8 = errandsFor(8, big.map((l) => ({ ...l, day: 8 })), 0);
const pay1 = e1.reduce((a, e) => a + e.reward, 0) + ALL_THREE(0, 1), pay8 = e8.reduce((a, e) => a + e.reward, 0) + ALL_THREE(0, 8);
ok(pay1 <= 170 && pay8 >= 400, `all three errands on day 1 pay £${pay1 / 100} (day 8: £${pay8 / 100})`);
const handouts = cashOf(g1) + purseMax + pay1;
ok(handouts * 3 <= FIRST_SUM, `the most day one can hand out is £${handouts / 100}: under a third of Rashid's £${FIRST_SUM / 100}`);

// ---- the road's rank and the header's rank agree ----
const base = { cash: 100000, reputation: 30, inventory: [], upgrades: [], supplier: { debt: 0 }, court: { warrants: [] }, missions: {} as Record<string, string> };
ok(rankOf(base).idx === 0, 'rich and well spoken of, but no story done: still a Stall keeper');
ok(RANKS[1].name === 'Bazaar merchant', 'the ladder');
// road.ts imports the store's types only; its rank step is checked by the same rule
const { roadOf } = await import('../src/game/road');
try {
  const steps = roadOf({ ...base, ledger: [], stats: {}, shops: {}, register: [] } as never);
  const r1 = steps.find((x) => x.id === 'rank-bazaar')!;
  ok(!r1.done, 'the road does not call Bazaar merchant Reached while the header says Stall keeper');
  ok(r1.needs.some((n) => /story/i.test(n.label) && n.have < n.want), 'and it says what is missing: the story');
  const steps2 = roadOf({ ...base, missions: { alexandria: 'done' }, ledger: [], stats: {}, shops: {}, register: [] } as never);
  ok(steps2.find((x) => x.id === 'rank-bazaar')!.done === (rankOf({ ...base, missions: { alexandria: 'done' } }).idx >= 1), 'with the first mission done, both agree again');
} catch (e) { ok(false, `road: ${(e as Error).message}`); }

// ---- the morning card: one line ahead, and what is within reach ----
const { aheadLine, withinReach } = await import('../src/game/tomorrow');
const { firstWeekStart } = await import('../src/game/firstWeek');
const morning = { day: 5, cash: 300, reputation: 2, family: { left: 10000, due: 0, since: 0, paid: 0, first: firstWeekStart() }, supplier: { trust: 20, offers: [], debt: 0, debtDue: 0 }, queue: ['yusuf'], visitIdx: 0, relationships: { yusuf: { visits: 1, purchases: 1, spent: 900, affinity: 0 } }, post: { letters: [] }, favours: undefined, upgrades: [], shops: {}, register: [], passport: undefined, world: { party: { animals: {} } } } as never;
const line = aheadLine(morning, 2500) ?? '';
ok(/£10.*falls due.*£7.*still to find/.test(line), `payment first: "${line}"`);
const later = { ...(morning as object), day: 12, family: { left: 9000, due: 0, since: 0, paid: 1000, first: { ...firstWeekStart(), paid: 1000, done: 6, how: 'early' } } } as never;
const l2 = aheadLine(later, 2500) ?? '';
ok(/Yusuf|yusuf/i.test(l2) || /sale|letter|first of the month/.test(l2), `then what is real: "${l2}"`);
ok(withinReach(morning).length === 0, 'nothing within reach before day 20');
const rich = { ...(later as object), day: 25, cash: 1500, reputation: 12 } as never;
const reach = withinReach(rich);
ok(reach.length >= 1 && reach.length <= 3, `day 25 with £15: ${reach.map((r) => `${r.title} ${r.cost / 100}`).join('; ')}`);

console.log(fails ?`${fails} FAILED` : 'ALL OK'); process.exit(fails ? 1 : 0);
