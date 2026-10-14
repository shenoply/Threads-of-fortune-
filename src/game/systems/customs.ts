// Borders, papers and customs, 1925. Crossing into another country you show your papers and declare
// the rugs you carry. Duty is a share of their declared worth (what your receipts say you paid).
//
// Duty, ad valorem, on rugs coming in (simplified to one rate per country):
//   Egypt 8%: the general import duty under the old commercial treaties, 8% ad valorem until the
//     tariff reform of 1930.
//   Palestine and Transjordan 11%, Syria and Lebanon 11%, Turkey 11%, Iraq 10%: general ad valorem
//     rates of the mandate and treaty tariffs of the early 1920s, rounded. Carpets were not exempt.
//   Persia 8%: the Persian customs, run by Belgian officials under the 1903 tariff, charged mostly
//     specific duties; one ad valorem rate stands in for them here (a game simplification).
//   Persia asks for a visa from a Persian consulate as well as a passport: the consulate in Baghdad
//     issues it. Without one the post at Qasr-i Shirin turns you back.
// Papers: after the war every frontier asked for a passport or a laissez-passer. Egyptians got
//   theirs at the Passport Office of the Ministry of the Interior in Cairo, with visas stamped at the
//   consulates. Without them most posts fine you and write a pass for the one crossing; the
//   Turkish Republic turns you back.
//
// The crossing is noticed when you arrive in a town of another country (by road, rail or sea). It is
// resolved once, from a roll on the stored seed, and kept on the pending record until you go on, so a
// reload shows the same outcome.
import { useGame } from '../state/store';
import { fmt, snap } from '../economy/money';
import { COUNTRY_NAME, COUNTRY_RULE, CHANGER_WHY, changerFee, countryOf, currencyAt, type Country } from '../economy/currency';
import { eventsOn } from '../economy/life';
import { settlementById } from './world';
import { rollFor } from './fieldwork';
import { RUGS } from '../../data/rugs';
import { heroCharisma } from '../../data/wardrobe';
import type { GameState } from '../state/store';
import type { RugItem } from '../types';
import { audio } from '../audio/engine';

export const DUTY: Record<Country, number> = { egypt: 0.08, palestine: 0.11, transjordan: 0.11, syria: 0.11, turkey: 0.11, iraq: 0.1, persia: 0.08 };
/** how readily the clerks take a little something, before your name and coat count */
const SOFT: Record<Country, number> = { egypt: 0.55, palestine: 0.42, transjordan: 0.6, syria: 0.5, turkey: 0.38, iraq: 0.55, persia: 0.5 };
/** passport and visas at the Passport Office, Ministry of the Interior, Cairo */
export const PAPERS_FEE = 100;
export const PAPERS_TOWN = 'cairo';
/** a crossing without papers, where they let you through at all */
export const NO_PAPERS_FINE = 150;
/** coming home to Egypt without papers: a lighter fine for an Egyptian subject */
export const NO_PAPERS_HOME = 50;
/** a Persian visa, at the Persian consulate in Baghdad (a passport first) */
export const VISA_FEE = 150;
export const VISA_TOWN = 'baghdad';

/** Frontiers made strict by the news (calendar1925.ts, the change of dynasty in Persia): they search
 *  more loads and take fewer presents. */
export const tightFrontier = (day: number, a?: Country, b?: Country) => eventsOn(day).some((e) => (a && e.frontier?.includes(a)) || (b && e.frontier?.includes(b)));

export type DeclareChoice = 'full' | 'under' | 'baksheesh';
export interface BorderResult { choice: DeclareChoice | 'none' | 'back'; kind: 'clear' | 'caught' | 'refused' | 'back'; text: string; lines: string[] }
export interface BorderPending { key: string; from: string; to: string; fromC: Country; toC: Country; day: number; post: string; result?: BorderResult }
type BorderState = ReturnType<typeof useGame.getState>;

const get = () => useGame.getState() as BorderState;
const set = (p: Partial<BorderState>) => useGame.setState(p as Partial<GameState>);

/** where the frontier is crossed, in the words of the day */
export function postFor(from: string, to: string): string {
  const a = settlementById(from), b = settlementById(to);
  const fc = countryOf(from), tc = countryOf(to);
  if (a?.port && b?.port) return `the customs house at ${b.name}`;
  const pair = (x: Country, y: Country) => (fc === x && tc === y) || (fc === y && tc === x);
  if (pair('egypt', 'palestine')) return a?.region === 'Sinai' || b?.region === 'Sinai' ? 'Rafah, on the Sinai frontier' : 'Kantara, on the Suez Canal';
  if (pair('palestine', 'syria')) return to === 'beirut' || from === 'beirut' ? 'Ras en-Naqura, on the coast road' : 'Jisr Banat Yaqub, the bridge over the Jordan';
  if (pair('palestine', 'transjordan')) return 'the Allenby Bridge over the Jordan';
  if (pair('transjordan', 'syria')) return tc === 'syria' ? 'Deraa, on the Hejaz Railway' : 'Ramtha, on the Hejaz Railway';
  if (pair('syria', 'turkey')) return 'Meidan Ekbez, on the Baghdad Railway';
  if (pair('iraq', 'persia')) return tc === 'persia' ? 'Qasr-i Shirin, on the Persian frontier' : 'Khanaqin, on the Persian frontier';
  if (tc === 'iraq' || fc === 'iraq') return tc === 'iraq' ? 'the Rutba wells, on the desert route' : `the customs post at ${b?.name ?? 'the frontier'}`;
  if (fc === 'egypt' || tc === 'egypt') return 'Kantara, on the Suez Canal';
  return `the customs post at ${b?.name ?? 'the frontier'}`;
}

/** rugs on the caravan, and what your receipts say they are worth */
export function carried(s: Pick<GameState, 'inventory'>) {
  const rugs = s.inventory.filter((i) => !i.stored);
  const worth = (i: RugItem) => (i.paid > 0 ? i.paid : Math.round((RUGS[i.typeId]?.valueBand[0] ?? 100) / 2));
  return { rugs, value: rugs.reduce((a, i) => a + worth(i), 0), worth };
}

export const hasPapers = (s: { passport?: { day: number } }) => !!s.passport;
/** papers for one country: Persia wants its own visa as well as the passport */
export const hasPapersFor = (s: { passport?: { day: number }; persianVisa?: { day: number } }, c: Country | undefined) => !!s.passport && (c !== 'persia' || !!s.persianVisa);
/** without papers: refused outright (Turkey, Persia), or a fine and a pass for this crossing */
export const refusesWithoutPapers = (c: Country) => c === 'turkey' || c === 'persia';
export const papersFine = (c: Country) => (c === 'egypt' ? NO_PAPERS_HOME : NO_PAPERS_FINE);

export interface Quote { duty: number; under: number; bribe: number; bribeOdds: number; caughtOdds: number; refusedFine: number; caughtFine: number }
export function quote(s: BorderState, toC: Country, fromC?: Country): Quote {
  const { value } = carried(s);
  const duty = value > 0 ? Math.max(5, Math.round(value * DUTY[toC])) : 0;
  const under = duty ? Math.max(5, Math.round(duty / 2)) : 0;
  const bribe = duty ? Math.max(10, snap(duty * 0.4)) : 0;
  const ch = heroCharisma(s.wardrobe, s.attire?.clean ?? 100);
  const att = s.attention ?? 0;
  const tight = tightFrontier(s.day, toC, fromC) ? 0.2 : 0;
  const bribeOdds = Math.max(0.1, Math.min(0.85, SOFT[toC] + s.reputation * 0.002 + ch * 0.01 - att * 0.003 - tight));
  const caughtOdds = Math.max(0.15, Math.min(0.8, 0.35 + att * 0.003 - ch * 0.005 + tight));
  return { duty, under, bribe, bribeOdds, caughtOdds, refusedFine: Math.max(50, Math.round(duty * 0.5)), caughtFine: Math.max(50, (duty - under) * 2) };
}
export const oddsWord = (p: number) => (p >= 0.7 ? 'good' : p >= 0.5 ? 'fair' : p >= 0.3 ? 'poor' : 'slim');

/** a new country: hold the caravan at the post until the card is answered */
function onArrive(at: string) {
  const s = get();
  const toC = countryOf(at);
  if (!toC) return;
  if (s.border) return;
  const last = s.lastTown;
  const fromC = countryOf(last);
  if (!last || !fromC || fromC === toC || last === at) { set({ lastTown: at, changer: undefined }); return; }
  const post = postFor(last, at);
  set({ changer: undefined, border: { key: `${last}>${at}:${s.day}`, from: last, to: at, fromC, toC, day: s.day, post } });
}

/** pay what is owed; short of cash, the customs keep your cheapest rug in bond for the rest */
function charge(s: BorderState, amount: number, label: string) {
  const ledger = [...s.ledger], lines: string[] = [];
  let cash = s.cash, inventory = s.inventory;
  const pay = Math.min(cash, amount);
  if (pay > 0) { cash -= pay; ledger.push({ day: s.day, kind: 'expense', label, amount: -pay }); }
  if (pay < amount) {
    const { rugs, worth } = carried(s);
    const cheap = [...rugs].sort((a, b) => worth(a) - worth(b))[0];
    if (cheap) { inventory = inventory.filter((i) => i.uid !== cheap.uid); lines.push(`Short of ${fmt(amount - pay)}: they keep your ${RUGS[cheap.typeId]?.name ?? 'rug'} in bond.`); }
  }
  return { cash, inventory, ledger, lines };
}

/** the officer's answer: duty, a little something, or half the truth */
export function crossBorder(choice: DeclareChoice | 'none' | 'back'): BorderResult | undefined {
  const s = get();
  const b = s.border;
  if (!b) return undefined;
  if (b.result) return b.result;
  const to = settlementById(b.to).name, from = settlementById(b.from).name;
  const place = b.post.replace(/^the /, '');
  const papers = hasPapersFor(s, b.toC);
  const journal = [...s.journal];
  if (choice === 'back' || (!papers && refusesWithoutPapers(b.toC))) {
    const persia = b.toC === 'persia';
    const result: BorderResult = persia
      ? { choice: 'back', kind: 'back', text: `The Persian officer at ${place} will not let anyone in without a passport and a visa from a Persian consulate. You turn back to ${from}.`, lines: [s.passport ? 'Get a Persian visa at the consulate in Baghdad.' : 'Get a passport in Cairo, then a Persian visa at the consulate in Baghdad.', 'The rest of the day is lost.'] }
      : { choice: 'back', kind: 'back', text: `The Turkish officer at ${place} will not let a man without a passport and visa into the Republic. You turn back to ${from}.`, lines: ['Get papers at the Passport Office in Cairo.', 'The rest of the day is lost.'] };
    set({ border: { ...b, result }, journal: [...journal, { day: s.day, text: `Turned back at ${place}: no papers for ${COUNTRY_NAME[b.toC]}.`, kind: 'road' }] });
    return result;
  }
  const q = quote(s, b.toC, b.fromC);
  const roll = rollFor(`${b.key}:${choice}`, s.seed);
  const lines: string[] = [];
  let owed = 0, rep = s.reputation, attention = s.attention ?? 0, kind: BorderResult['kind'] = 'clear', label = `Customs duty at ${place}`;
  let text = '';
  if (!papers) {
    const f = papersFine(b.toC);
    lines.push(b.toC === 'egypt' ? `No papers: an Egyptian coming home, fined ${fmt(f)} and questioned.` : `No papers: fined ${fmt(f)} and given a laissez-passer for this crossing.`);
  }
  const fine0 = papers ? 0 : papersFine(b.toC);
  if (choice === 'none' || q.duty === 0) {
    text = papers ? `The officer at ${place} reads your passport, stamps it, and waves you on into ${COUNTRY_NAME[b.toC]}.` : `The officer at ${place} looks a long time at a man with no passport.`;
  } else if (choice === 'full') {
    owed = q.duty;
    text = `You declare every rug at what you paid. The clerk at ${place} writes it all down and takes ${Math.round(DUTY[b.toC] * 100)} per cent: ${fmt(q.duty)}.`;
  } else if (choice === 'baksheesh') {
    label = `A present for the clerk at ${place}`;
    if (roll < q.bribeOdds) {
      owed = q.bribe;
      text = `The clerk pockets the ${fmt(q.bribe)}, chalks your bales without opening them, and wishes you a good journey.`;
    } else {
      owed = q.bribe ? q.duty + q.refusedFine : 0;
      kind = 'refused'; label = `Customs duty and a fine at ${place}`;
      rep -= 2; attention += 6;
      text = `The clerk pushes your money back across the table and calls his superior. You pay the full duty and a fine: ${fmt(owed)}. The story will be told in the souq.`;
      lines.push('Reputation falls a little. The posts will know your name.');
    }
  } else if (choice === 'under') {
    if (roll < q.caughtOdds) {
      owed = q.duty + q.caughtFine;
      kind = 'caught'; label = `Customs duty and a fine at ${place}`;
      rep -= 3; attention += 8;
      text = `They unroll the bales and check your receipts. You pay the full duty and a fine for the false declaration: ${fmt(owed)} in all.`;
      lines.push('Reputation falls. The posts will know your name.');
    } else {
      owed = q.under;
      text = `You declare the rugs at half their worth. The clerk glances at the top bale and takes ${fmt(q.under)}.`;
    }
  }
  // the papers fine and the customs bill come out of the purse together
  const s2 = { ...s, reputation: rep };
  const paid = charge(s2, owed, label);
  let { cash, inventory, ledger } = paid;
  lines.push(...paid.lines);
  if (fine0) {
    const c2 = charge({ ...s2, cash, inventory, ledger }, fine0, `Fine for travelling without papers, ${place}`);
    cash = c2.cash; inventory = c2.inventory; ledger = c2.ledger; lines.push(...c2.lines);
  }
  if (!papers) attention += 3;
  const money = currencyAt(b.to, s.day);
  if (money !== currencyAt(b.from, s.day)) lines.push(`Money from here on: ${money === 'egp' ? 'Egyptian pounds' : moneyName(b.to, s.day)}.`);
  const result: BorderResult = { choice, kind, text, lines };
  journal.push({ day: s.day, text: `Crossed into ${COUNTRY_NAME[b.toC]} at ${place}, bound for ${to}. ${text}`, kind: 'road' });
  set({ cash, inventory, ledger, reputation: Math.max(0, rep), attention: Math.max(0, Math.min(100, attention)), journal, border: { ...b, result } });
  audio.sfx(kind === 'clear' ? 'pen' : 'coins');
  // an hour at the post, longer if they search the bales or write you a pass
  get().passTime(kind === 'clear' && papers ? 60 : 180);
  return result;
}
function moneyName(at: string, day: number) {
  const c = currencyAt(at, day);
  return c === 'syp' ? 'Syrian pounds' : c === 'try' ? 'Turkish lira' : c === 'inr' ? 'Indian rupees' : c === 'pal' ? 'Palestine pounds' : c === 'kran' ? 'Persian krans and tomans' : 'Egyptian pounds';
}

/** close the card: on into the town, or (turned back) back where you came from */
export function finishBorder(): string | undefined {
  const s = get();
  const b = s.border;
  if (!b) return undefined;
  if (b.result?.kind === 'back') {
    set({ border: undefined, lastTown: b.from });
    get().arriveAt(b.from);
    get().passTime(8 * 60);
    return b.from;
  }
  set({ border: undefined, lastTown: b.to });
  return b.to;
}

/** passport and visas, at the Passport Office in Cairo */
export function buyPapers(): string {
  const s = get();
  if (s.world.at !== PAPERS_TOWN) return 'The Passport Office is in Cairo.';
  if (s.passport) return 'Your passport is in order, with visas for Palestine, Syria, Turkey and Iraq.';
  if (s.cash < PAPERS_FEE) return `The fees and stamps come to ${fmt(PAPERS_FEE)}.`;
  set({
    cash: s.cash - PAPERS_FEE,
    passport: { day: s.day },
    ledger: [...s.ledger, { day: s.day, kind: 'expense', label: 'Passport and visas, Ministry of the Interior', amount: -PAPERS_FEE }],
    journal: [...s.journal, { day: s.day, text: 'Got a passport at the Passport Office of the Ministry of the Interior, with visas from the consulates for Palestine, Syria, Turkey and Iraq.', kind: 'road' }],
  });
  get().passTime(4 * 60);
  audio.sfx('pen');
  return `A morning of queues and stamps, and ${fmt(PAPERS_FEE)} in fees. Your passport has visas for Palestine, Syria, Turkey and Iraq.`;
}

/** a Persian visa, at the Persian consulate in Baghdad */
export function buyPersianVisa(): string {
  const s = get();
  if (s.world.at !== VISA_TOWN) return 'The Persian consulate is in Baghdad.';
  if (s.persianVisa) return 'Your passport already carries a Persian visa.';
  if (!s.passport) return 'The consul stamps visas into a passport. Get one at the Passport Office in Cairo first.';
  if (s.cash < VISA_FEE) return `The visa and its stamps come to ${fmt(VISA_FEE)}.`;
  set({
    cash: s.cash - VISA_FEE,
    persianVisa: { day: s.day },
    ledger: [...s.ledger, { day: s.day, kind: 'expense', label: 'Persian visa, the Persian consulate in Baghdad', amount: -VISA_FEE }],
    journal: [...s.journal, { day: s.day, text: 'Got a Persian visa at the Persian consulate in Baghdad.', kind: 'road' }],
  });
  get().passTime(3 * 60);
  audio.sfx('pen');
  return `A morning in the consul's waiting room, and ${fmt(VISA_FEE)} in fees. Your passport has a Persian visa.`;
}

// ---- the money-changer: the first deal of each visit where the money is not Egyptian ----
const NOT_TRADE = /^(Customs|A present for the clerk|Fine for travelling|Money-changer|Passport|Persian visa|Checkpoint)/;
function onSpend(at: string, added: GameState['ledger']) {
  const s = get();
  if (s.border) return;
  const c = currencyAt(at, s.day);
  if (c === 'egp') return;
  if (s.changer && s.changer.town === at) return;
  const deal = added.find((e) => e.day === s.day && (e.kind === 'purchase' || e.kind === 'sale' || e.kind === 'expense') && e.amount !== 0 && !NOT_TRADE.test(e.label));
  if (!deal) return;
  const fee = Math.min(s.cash, changerFee(deal.amount, c));
  const name = settlementById(at).name;
  set({
    changer: { town: at, day: s.day, fee },
    cash: s.cash - fee,
    ledger: fee ? [...s.ledger, { day: s.day, kind: 'expense', label: `Money-changer in ${name}`, amount: -fee }] : s.ledger,
    journal: fee ? [...s.journal, { day: s.day, text: `A money-changer in ${name} changed your money for ${fmt(fee)}. ${CHANGER_WHY[c]}`, kind: 'road' }] : s.journal,
  });
}

let installed = false;
/** watch arrivals and the ledger: a new country opens the border card; a first deal pays the changer */
export function installBorders() {
  if (installed) return;
  installed = true;
  let prevAt = useGame.getState().world.at;
  let prevLen = useGame.getState().ledger.length;
  let prevSeed = useGame.getState().seed;
  { const s0 = get(); if (s0.world.at && !s0.lastTown && countryOf(s0.world.at)) set({ lastTown: s0.world.at }); }
  useGame.subscribe((st) => {
    // a different save loaded (a slot, a new game): take it as it is
    if (st.seed !== prevSeed || st.ledger.length < prevLen) { prevSeed = st.seed; prevAt = st.world.at; prevLen = st.ledger.length; return; }
    const at = st.world.at;
    if (at !== prevAt) { prevAt = at; if (at) onArrive(at); }
    // the town you stand in counts as where you came from, once you leave it
    else if (at && !st.lastTown && !st.border && countryOf(at)) set({ lastTown: at });
    const now = useGame.getState();
    if (now.ledger.length !== prevLen) {
      const added = now.ledger.slice(prevLen);
      prevLen = now.ledger.length;
      if (now.world.at && added.length <= 3) onSpend(now.world.at, added);
      prevLen = useGame.getState().ledger.length;
    }
  });
}

export { COUNTRY_RULE };
