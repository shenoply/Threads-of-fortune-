// The road ahead: everything the merchant can work towards, in order, as one track he can see from the
// start (the next stall, the shops in other cities, better buyers, the sale rooms, the ranks), each with
// its picture and how far he has got. Nothing here is saved: it is all read from the game as it stands.
import type { GameState } from './state/store';
import { RANKS, netWorth, HOUSE_TARGET } from './economy/progress';
import { UPGRADES } from '../data/suppliers';
import { SHOP_CITIES } from '../data/shops';
import { CELEB_INFO, celebUnlock } from '../data/buyers';
import { sceneSmall } from './stallScenes';
import { settlementById } from './systems/world';
import { filedAs } from '../data/renamedIds';

export interface Need { label: string; have: number; want: number; money?: boolean }
export interface Step {
  id: string;
  /** the rank this step belongs under (0 = working towards Bazaar merchant) */
  chapter: number;
  title: string;
  line: string;
  pic: string;
  needs: Need[];
  done: boolean;
  /** what a tap takes him to */
  go?: { kind: 'upgrades' } | { kind: 'town'; town: string } | { kind: 'buyers' };
  /** a rank itself: the end of a chapter */
  rank?: boolean;
}

type S = GameState;
const sales = (s: S) => s.ledger.filter((l) => l.kind === 'sale' && l.amount > 0 && !/^Seized/.test(l.label)).length;
const celebPic = (p: 'FINE' | 'EXCEPTIONAL' | 'LEGENDARY') => `art/portraits/${filedAs(Object.keys(CELEB_INFO).find((id) => CELEB_INFO[id as keyof typeof CELEB_INFO].prestige === p) ?? 'samira')}.jpg`;
const celebRep = (p: 'FINE' | 'EXCEPTIONAL' | 'LEGENDARY') => celebUnlock(Object.keys(CELEB_INFO).find((id) => CELEB_INFO[id as keyof typeof CELEB_INFO].prestige === p)!);

export function roadOf(s: S): Step[] {
  const worth = netWorth(s), rep = s.reputation, cash = s.cash;
  const up = (id: string) => UPGRADES.find((u) => u.id === id)!;
  const has = (id: string) => s.upgrades.includes(id);
  const steps: Step[] = [];
  const stallStep = (id: 'mat' | 'bazaar' | 'khan', chapter: number, title: string, line: string, pic: string) => {
    const u = up(id);
    steps.push({ id: `up-${id}`, chapter, title, line, pic, done: has(id), go: { kind: 'upgrades' },
      needs: [{ label: 'Money', have: cash, want: u.cost, money: true }, { label: 'Reputation', have: rep, want: u.rep ?? 0 }] });
  };
  const rankStep = (i: number) => {
    const r = RANKS[i];
    const needs: Need[] = [{ label: 'Net worth', have: worth, want: r.worth, money: true }, { label: 'Reputation', have: rep, want: r.rep }];
    if (r.warrants) needs.push({ label: 'Royal warrants', have: s.court.warrants.length, want: r.warrants });
    steps.push({ id: `rank-${r.id}`, chapter: i - 1, title: r.name, line: 'Your next rank', pic: '', needs, done: needs.every((n) => n.have >= n.want), rank: true });
  };
  const shopStep = (sid: string, chapter: number) => {
    const c = SHOP_CITIES[sid];
    const owned = !!s.shops?.[sid];
    steps.push({ id: `shop-${sid}`, chapter, title: `A shop in ${settlementById(sid).name.split(',')[0]}`, line: `${c.place[0].toUpperCase()}${c.place.slice(1)}. An agent keeps it and sells for you each week.`, pic: sceneSmall(sid), done: owned, go: { kind: 'town', town: sid },
      needs: [{ label: 'Money', have: cash, want: c.cost, money: true }, { label: 'Reputation', have: rep, want: c.rep }] });
  };
  const buyersStep = (p: 'FINE' | 'EXCEPTIONAL' | 'LEGENDARY', chapter: number, title: string, line: string) => {
    const want = celebRep(p);
    steps.push({ id: `buyers-${p}`, chapter, title, line, pic: celebPic(p), done: rep >= want, go: { kind: 'buyers' }, needs: [{ label: 'Reputation', have: rep, want }] });
  };
  const shopsBy = (lo: number, hi: number) => Object.values(SHOP_CITIES).filter((c) => c.id !== 'cairo' && c.rep > lo && c.rep <= hi).sort((a, b) => a.cost - b.cost).map((c) => c.id);

  // chapter 0: from a borrowed corner to a bazaar merchant
  stallStep('mat', 0, 'A rug mat of your own', 'No longer a borrowed corner: buyers trust you more.', sceneSmall('giza-mat'));
  steps.push({ id: 'sales-10', chapter: 0, title: 'Ten sales', line: 'The lane learns your face.', pic: sceneSmall('giza-borrowed'), done: sales(s) >= 10, needs: [{ label: 'Sales', have: sales(s), want: 10 }] });
  buyersStep('FINE', 0, 'Well-to-do buyers', 'Scholars, officers and their wives start to call at your stall.');
  rankStep(1);
  // chapter 1: the canopied stall, the first shops and the sale rooms
  stallStep('bazaar', 1, 'The bazaar stall', 'A canopy, a proper counter and more buyers a day.', sceneSmall('giza-bazaar'));
  steps.push({ id: 'auction-1', chapter: 1, title: 'Win a lot at auction', line: 'The sale rooms of Cairo and Alexandria sell what never reaches a stall.', pic: 'art/drafts/auction-cairo-small-room.webp', done: (s.stats?.auctionsWon ?? 0) > 0, needs: [{ label: 'Lots won', have: s.stats?.auctionsWon ?? 0, want: 1 }] });
  for (const sid of shopsBy(0, 30)) shopStep(sid, 1);
  buyersStep('EXCEPTIONAL', 1, 'Famous buyers', 'Statesmen, poets and great ladies come asking for you.');
  rankStep(2);
  // chapter 2: the shops of the Levant, and the Khan
  for (const sid of shopsBy(30, 45)) shopStep(sid, 2);
  buyersStep('LEGENDARY', 2, 'Buyers of legend', 'Princes and the richest houses of the East.');
  rankStep(3);
  // chapter 3: the great cities and the court
  stallStep('khan', 3, 'Your shop in the Khan el-Khalili', 'The great bazaar of Cairo: richer buyers, budgets a quarter higher.', sceneSmall('cairo'));
  for (const sid of shopsBy(45, 999)) shopStep(sid, 3);
  rankStep(4);
  // and the end of the road
  steps.push({ id: 'house', chapter: 4, title: 'The House of Fortune', line: 'A rich man\'s fortune: your father\'s name made good.', pic: sceneSmall('istanbul'), done: worth >= HOUSE_TARGET, needs: [{ label: 'Net worth', have: worth, want: HOUSE_TARGET, money: true }] });
  return steps;
}

/** how near a step is, 0..1 (each need counted alike) */
export const nearness = (st: Step) => (st.done ? 1 : st.needs.reduce((a, n) => a + Math.min(1, Math.max(0, n.have) / Math.max(1, n.want)), 0) / Math.max(1, st.needs.length));

/** the step to show first: in the current chapter, the one he is nearest to; past chapters' leftovers come after */
export function nextStep(steps: Step[]): Step | null {
  const open = steps.filter((x) => !x.done);
  if (!open.length) return null;
  const ch = open[0].chapter;
  return open.filter((x) => x.chapter === ch && !x.rank).sort((a, b) => nearness(b) - nearness(a))[0] ?? open[0];
}
