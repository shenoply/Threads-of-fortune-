// What the player does with the shop boy, the post, the telegraph office and the licence. These write
// to the store directly, so the store's own action list stays as it was.
import { useGame, localOffers, localBid } from '../state/store';
import { RUGS } from '../../data/rugs';
import { fmt } from '../economy/money';
import { dateFor } from '../economy/economy';
import { settlementById } from './world';
import { BOY, hireBoy as hire, type ShopBoyState } from './shopBoy';
import { post, telegramFee, TELEGRAPH_TOWNS } from './post';
import { renew, officeTown } from './inspector';
import { audio } from '../audio/engine';

const g = () => useGame.getState();
const jot = (text: string, kind = 'stall') => [...g().journal, { day: g().day, text, kind }];

export function hireBoy(): string {
  const s = g();
  if (s.shopBoy?.hired) return '';
  const again = !!s.shopBoy;
  const text = again ? `${BOY.name} is back at the stall, a little warier than before.` : `You take on ${BOY.who}, to mind the stall when you are away: ${BOY.wage} piastres a day.`;
  useGame.setState({ shopBoy: hire(s.shopBoy, s.day), journal: jot(text) });
  audio.sfx('tap');
  return text;
}

export function fireBoy(): string {
  const s = g();
  const b = s.shopBoy;
  if (!b?.hired) return '';
  const owed = b.owed * BOY.wage;
  const pay = Math.min(owed, Math.max(0, s.cash));
  const text = `You let ${BOY.name} go${pay ? ` and pay him the ${fmt(pay)} you owed` : ''}. He goes back to his uncle's shop.`;
  useGame.setState({
    shopBoy: { ...b, hired: false, owed: 0 },
    cash: s.cash - pay,
    ...(pay ? { ledger: [...s.ledger, { day: s.day, kind: 'expense' as const, label: `Wages owed to ${BOY.name}`, amount: -pay }] } : {}),
    journal: jot(text),
  });
  audio.sfx('tap');
  return text;
}

export function setBoy(change: Partial<Pick<ShopBoyState, 'mode' | 'pct'>>) {
  const b = g().shopBoy;
  if (b) useGame.setState({ shopBoy: { ...b, ...change } });
}

export function renewLicence(): string {
  const s = g();
  const town = officeTown(s.upgrades);
  if (s.world.at !== town) return `Pay at the markets office in ${settlementById(town).name}.`;
  const r = renew(s);
  if (!r.ok) return r.msg;
  useGame.setState({ ...r.patch, journal: jot(r.msg, 'due') });
  audio.sfx('coins');
  return r.msg;
}

/** every letter that has come is marked read */
export function readPost() {
  const s = g();
  const p = s.post;
  if (!p || !p.letters.some((l) => l.day <= s.day && !l.read)) return;
  useGame.setState({ post: { ...p, letters: p.letters.map((l) => (l.day <= s.day ? { ...l, read: true } : l)) } });
}

const here = () => g().world.at;
export const telegraphHere = () => { const at = here(); return !!at && TELEGRAPH_TOWNS.includes(at); };

/** Wire Rashid to buy one of today's rugs for you: he sends it to your stall, you pay at the
 *  telegraph counter by telegraphic money order. */
export function wireRashid(offerUid: string): string {
  const s = g();
  const at = here();
  if (!at || !TELEGRAPH_TOWNS.includes(at)) return 'There is no telegraph office here.';
  const o = s.supplier.offers.find((x) => x.uid === offerUid);
  if (!o) return 'Rashid no longer has that rug.';
  const fee = telegramFee(at, 'giza');
  if (s.cash < o.price + fee) return `The rug and the telegram come to ${fmt(o.price + fee)}. You have ${fmt(s.cash)}.`;
  const line = s.buyOffer(offerUid, false);
  if (!line || g().cash === s.cash) return line || 'Rashid could not do it.';
  const name = RUGS[o.typeId].name;
  const text = `You wired Rashid from ${settlementById(at).name} for the ${name} (${fmt(o.price)}). He has put it in your stock at the stall in Giza.`;
  const s2 = g();
  useGame.setState({
    cash: s2.cash - fee,
    ledger: [...s2.ledger, { day: s2.day, kind: 'expense', label: `Telegram to Rashid from ${settlementById(at).name}`, amount: -fee }],
    journal: jot(text),
    post: post(s2.post, { day: s2.day, sent: s2.day, kind: 'telegram', from: 'Rashid, Giza', title: `${name} sent to your stall`, body: `Received your wire. ${name} paid and put in your stock at the stall. Safe journey.` }),
  });
  return text;
}

/** Ask the dealers of another town their prices, reply paid. The answer is dated: prices move. */
export function askPrices(town: string): string {
  const s = g();
  const at = here();
  if (!at || !TELEGRAPH_TOWNS.includes(at)) return 'There is no telegraph office here.';
  const fee = telegramFee(at, town) * 2;
  if (s.cash < fee) return `A reply-paid telegram to ${settlementById(town).name} costs ${fmt(fee)}.`;
  const st = settlementById(town);
  const sell = localOffers(town, s.day, [], s.world.friends, s.reputation).slice(0, 4).map((o) => `${RUGS[o.typeId].name} ${fmt(o.price)}`);
  const seen = new Set<string>();
  const mine = s.inventory.filter((i) => !i.restoringUntil && !seen.has(i.typeId) && seen.add(i.typeId)).slice(0, 5).map((i) => `${RUGS[i.typeId].name} ${fmt(localBid(town, i, s.day))}`);
  const when = dateFor(s.day).short;
  const body = [
    sell.length ? `Selling: ${sell.join(', ')}.` : 'Nothing for sale today.',
    mine.length ? `Would pay for yours: ${mine.join(', ')}.` : '',
    `Prices as of ${when}.`,
  ].filter(Boolean).join(' ');
  useGame.setState({
    cash: s.cash - fee,
    ledger: [...s.ledger, { day: s.day, kind: 'expense', label: `Reply-paid telegram to ${st.name}`, amount: -fee }],
    journal: jot(`Wired the dealers of ${st.name} for their prices.`),
    post: post(s.post, { day: s.day, sent: s.day, kind: 'telegram', from: `Dealers of ${st.name}`, title: `Prices in ${st.name}`, body }),
  });
  audio.sfx('pen');
  return body;
}
