// The tester's sheet: one button per new feature that puts the game in the state the feature needs and
// takes the player straight to it. For this beta build only; opened from Settings, not in Ironman.
// Every use is written in the journal ("Tester's sheet: …"), as the beta codes are, so a tester's save
// shows what was done to it. Each action uses the store's own actions where there is one, and otherwise
// sets the state the way the tests in tests/*.mjs set it up.
import { useState, type ReactNode } from 'react';
import { useGame, forceSave, dateFor, SAVE_VERSION, combatOf, leaderOf, type GameState } from '../../game/state/store';
import { SAVE_KEY, blockSaves, checkSave, readKey, writeKey } from '../../game/state/saveGuard';
import { fmt } from '../../game/economy/money';
import { Fold } from '../Fold/Fold';
import { CHEATS } from '../Settings/SecretCode';
import { settlementById } from '../../game/systems/world';
import { SETTLEMENTS } from '../../data/world';
import { skyOn } from '../Atmosphere/Weather';
import { dustToday } from '../../game/economy/seasons';
import { eventsOn } from '../../game/economy/life';
import { firstDue, countdown, dueDate, FIRST_SUM } from '../../game/firstWeek';
import { MILESTONES, MILESTONE_ORDER, activeMilestone, milestonesDone } from '../../data/milestones';
import { ALL_OPEN } from '../../game/unlocks';
import { OPENING_TIP } from '../../game/opening';
import { RASHIDS_MAN, SHOP_CITIES } from '../../data/shops';
import { standings, placeIn, recordCitySale, seasonOf, seasonEnd, ordinal } from '../../game/systems/ranks';
import { BAND_ROAD } from '../../game/systems/combat';
import { strength } from '../../game/systems/caravan';
import { forceRoadEvent } from '../../game/systems/roadEvents';
import { roadEventById } from '../../data/roadEvents';
import { hh, heirOf, ageOf, childName, BRIDES, type HouseholdState } from '../../game/systems/household';
import { persiaOpen } from '../../game/unlocks';
import type { MapIntent } from '../World/Campaign';
import type { MerchantSub } from '../Merchant/Merchant';
import type { RugItem } from '../../game/types';
import { skipDays } from '../../game/testerHook';
import './admin.css';

type S = GameState;
type Tab = 'stall' | 'supplier' | 'inventory' | 'ledger' | 'map' | 'caravan' | 'hero';
/** what the app lends the sheet to move the player about */
export interface AdminNav {
  tab: (t: Tab) => void;
  map: (m: Omit<MapIntent, 'n'>) => void;
  merchant: (sub: MerchantSub) => void;
  upgrades: () => void;
  toast: (m: string) => void;
  backup: () => void;
  openFile: (f: File) => void;
  restart: () => void;
}

const S = () => useGame.getState();
const set = (p: Partial<S>) => useGame.setState(p);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const log = (what: string) => { const s = S(); set({ journal: [...s.journal, { day: s.day, text: `Tester's sheet: ${what}`, kind: 'quiet' }] }); };

// ---------- taking the player to a screen: tap its buttons as he would ----------
const sel = (id: string) => (id.startsWith('[') || id.startsWith('.') ? id : `[data-testid="${id}"]`);
const shown = (q: string) => [...document.querySelectorAll<HTMLElement>(sel(q))].find((e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed');
async function waitFor(q: string, ms = 6000): Promise<HTMLElement | undefined> {
  for (let t = 0; t < ms; t += 120) { const e = shown(q); if (e) return e; await wait(120); }
  return undefined;
}
/** tap each in turn, waiting for it to show; a step ending in '?' is skipped when it does not come */
async function taps(steps: string[]): Promise<boolean> {
  for (const st of steps) {
    const optional = st.endsWith('?');
    const id = optional ? st.slice(0, -1) : st;
    // a town-menu tile may be behind "More in …"
    if (id.startsWith('menu-') && !optional && !(await waitFor(id, 1500))) shown('menu-more')?.click();
    const e = await waitFor(id, optional ? 1200 : 7000);
    if (!e) { if (optional) continue; return false; }
    e.scrollIntoView({ block: 'center' });
    e.click();
    await wait(250);
  }
  return true;
}
/** open a Fold (by its id) and bring it into view */
async function openFold(id: string) {
  // a Fold is found by its id (testid "fold-<id>") or by the testid it was given; whichever shows first
  let d: HTMLDetailsElement | undefined;
  for (let t = 0; t < 6000 && !d; t += 120) {
    const e = shown(`fold-${id}`) ?? shown(id);
    if (e) d = (e.tagName === 'DETAILS' ? e : e.closest('details') ?? e) as HTMLDetailsElement;
    else await wait(120);
  }
  if (!d) return false;
  if (d.tagName === 'DETAILS' && !d.open) d.querySelector('summary')?.click();
  await wait(200);
  d.scrollIntoView({ block: 'start' });
  return true;
}
/** a tap on a band's marker on the world map (it opens the road encounter when it is close) */
async function tapParty(id: string) {
  for (let i = 0; i < 4; i++) {
    const m = await waitFor(`[data-party="${id}"]`, 4000);
    if (!m) return false;
    m.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    if (await waitFor('road-encounter', 900)) return true;
  }
  return false;
}

// ---------- state helpers ----------
/** the first-visit films for these people are taken as seen, so the button lands on the feature */
const seen = (...ids: string[]) => set({ introSeen: [...new Set([...(S().introSeen ?? []), ...ids])] } as Partial<S>);
const INTROS = ['malek', 'arran', 'abuhamid', 'bilgin-chess', 'rashid', 'nabil', 'cohen', 'alexandria'];
/** a merchant past the opening and the first-sale lesson: every city open, no intro scenes in the way */
function pastOpening() {
  const s = S();
  set({ tutorial: { ...s.tutorial, done: true, step: 'done', inspected: true }, tipsSeen: [...new Set([...(s.tipsSeen ?? []), OPENING_TIP])],
    introSeen: [...new Set([...(s.introSeen ?? []), ...INTROS])], levelUps: [], titleNews: [], missionNews: undefined } as Partial<S>);
}
/** be in a town at once (no road, no customs): the arrival itself is the game's own */
function teleport(id: string, hour?: number) {
  const s = S(); const st = settlementById(id);
  set({ journey: undefined, border: undefined, encounter: null, held: null, dayOver: false, lastTown: id, rescue: undefined,
    world: { ...s.world, at: null, x: st.x, y: st.y, hour: hour ?? s.world.hour } } as Partial<S>);
  S().arriveAt(id);
}
const rug = (typeId: string, extra: Partial<RugItem> = {}): RugItem => ({ uid: `adm${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`, typeId, condition: 'Good', restored: false, provenance: 'Likely', paid: 300, notes: [], stored: false, ...extra } as RugItem);
const topUp = (pt: number) => { const s = S(); if (s.cash < pt) set({ cash: pt }); };
/** the next day after today on which `test` holds (up to two years ahead) */
const nextDay = (test: (d: number) => boolean) => { const d0 = S().day; for (let d = d0 + 1; d < d0 + 730; d++) if (test(d)) return d; return 0; };
/** go to the morning of day d: the night before it passes as a normal night */
function jumpTo(d: number) {
  set({ day: d - 1, dayOver: false });
  S().endDay();
}
const longDate = (d: number) => dateFor(d).long;
/** the sky and the feasts show over the stall scene: in Giza, with the next buyer walking up */
async function toStall(nav: AdminNav) {
  if (S().world.at !== 'giza') teleport('giza');
  set({ world: { ...S().world, hour: Math.max(8, Math.min(16, S().world.hour)) }, dayOver: false });
  nav.map({ view: 'district', stall: true });
  await taps(['day-summary-ok?', 'stall-wait', 'stall-wait?']);
}
const home = (nav: AdminNav) => { const at = S().world.at; nav.map(at === 'giza' ? { view: 'district' } : at ? { view: 'world', panel: at } : { view: 'world' }); };

// the household, written whole where the game has no action for a step
// (a man already married stays as he is: re-writing the betrothal beside his wife made her twice)
const married = (h: HouseholdState, day: number): HouseholdState => (h.spouse ? h : { ...h, stage: 'married', chosen: undefined, contract: undefined, terms: undefined, scene: undefined, offered: h.offered ?? day - 20, suitors: {},
  spouse: { id: h.chosen ?? 'nadia', married: day, content: 70, role: 'home', lastHome: day, regard: 'warm', homeDays: 0 }, birthIn: h.birthIn ?? 330 });
/** what a night skipped by the tester cost, from the ledger: the money that went, and where */
const nightCost = (cash0: number, ledger0: number) => {
  const s = useGame.getState();
  const lines = s.ledger.slice(ledger0).filter((e) => e.amount < 0);
  const d = s.cash - cash0;
  if (Math.abs(d) < 1) return '';
  return ` The night ${d < 0 ? `cost ${fmt(-d)}` : `brought ${fmt(d)}`}${lines.length ? ` (${lines.slice(0, 4).map((e) => `${e.label} ${fmt(-e.amount)}`).join(', ')}${lines.length > 4 ? '…' : ''}; see the ledger)` : ''}.`;
};

/** a fight on the road just outside Cairo: the nearest band brought up, `ratio` of your strength */
function roadFight(ratio: number, size: number, wanted = false): { band: string; text: string } | null {
  pastOpening();
  const s = S(); const c = settlementById('cairo');
  const men = Object.values(s.world.party.troops).reduce((a, n) => a + (n ?? 0), 0);
  const troops = men > 0 ? s.world.party.troops : { guard: 2, fellah: 2 };
  const mine = strength({ ...s.world.party, troops });
  const band = s.world.parties.find((p) => p.id === 'rb0') ?? s.world.parties.find((p) => BAND_ROAD[p.id]);
  if (!band) return null;
  const me = { x: c.x + 6, y: c.y - 2 };
  const parties = s.world.parties.map((p) => (p.id === band.id ? { ...p, x: me.x + 3, y: me.y + 2, cooldownUntil: 0, size, strength: Math.max(2, Math.round(mine * ratio)) } : p));
  set({ journey: undefined, encounter: null, dayOver: false, condition: { ...(s.condition ?? { fatigue: 0, dependence: 0 }), fatigue: 0, fed: 100, water: 100 } as S['condition'],
    world: { ...s.world, at: null, ...me, hour: 9, parties, party: { ...s.world.party, troops, food: Math.max(s.world.party.food ?? 0, 40) } } } as Partial<S>);
  let text = `${band.name}: ${size} men, strength ${Math.max(2, Math.round(mine * ratio))} against your ${mine}`;
  if (wanted) {
    const lead = leaderOf(S(), band.id);
    if (lead) {
      const c0 = combatOf(S());
      const w = { ...lead, status: 'free' as const, seen: true, robbed: S().day - 1, bounty: lead.bounty + 50 };
      set({ combat: { ...c0, leaders: { ...c0.leaders, [band.id]: w } } });
      text = `${w.name} (wanted, bounty ${fmt(w.bounty)}) with ${size} men`;
    }
  }
  return { band: band.id, text };
}

// ---------- the sheet ----------
type Act = { label: string; run: () => string | Promise<string>; testid: string; quiet?: boolean };
type Sec = { id: string; title: string; gist: string; acts: Act[]; extra?: ReactNode };
const lastMsg: Record<string, string> = {};

export function AdminSheet({ nav, onClose }: { nav: AdminNav; onClose: () => void }) {
  const g = useGame();
  const [msgs, setMsgs] = useState<Record<string, string>>({ ...lastMsg });
  const [town, setTown] = useState('alexandria');
  const [paste, setPaste] = useState('');
  const [copyText, setCopyText] = useState('');
  let open = true;
  /** close the sheet, then move the player (on the next tick, once the sheet is gone) */
  const leave = async (fn: () => void) => { open = false; onClose(); await wait(30); fn(); await wait(350); };

  const fire = async (sec: string, a: Act) => {
    const say = (m: string) => { lastMsg[sec] = m; setMsgs((x) => ({ ...x, [sec]: m })); };
    if (S().ironman) { say('Not in a one-life game.'); return; }
    say('…');
    let r: string;
    try { r = await a.run(); } catch (e) { r = `That did not work: ${(e as Error).message}`; }
    say(r);
    if (!a.quiet) log(`${a.label}. ${r}`);
    if (!open && r) nav.toast(r);
  };

  const ironman = !!g.ironman;
  const fw = firstDue(g.family, g.day);
  const goal = activeMilestone(g.missions);
  const h = hh(g);
  const heir = heirOf(h);
  const cairo = placeIn(g.ranks, 'cairo');

  const sections: Sec[] = [
    { id: 'money', title: 'Money and name', gist: `${fmt(g.cash)} · reputation ${g.reputation}`, acts: [
      { label: '+£50', testid: 'adm-cash50', run: () => { set({ cash: S().cash + 5000 }); return `£50 added: ${fmt(S().cash)} now.`; } },
      { label: '+£500', testid: 'adm-cash500', run: () => { set({ cash: S().cash + 50000 }); return `£500 added: ${fmt(S().cash)} now.`; } },
      { label: 'Reputation +10', testid: 'adm-rep10', run: () => { set({ reputation: S().reputation + 10 }); return `Reputation ${S().reputation}.`; } },
      { label: 'Reputation +50', testid: 'adm-rep50', run: () => { set({ reputation: S().reputation + 50 }); return `Reputation ${S().reputation}.`; } },
      { label: 'Rested and fed', testid: 'adm-rested', run: () => { set(CHEATS.rested.run(S())); return 'Rested, fed, watered and well.'; } },
      { label: 'Clear debts', testid: 'adm-nodebt', run: () => { set({ ...CHEATS.nodebt.run(S()), ruin: { stage: 0, since: 0 } } as Partial<S>); return 'Every debt paid off: Rashid, loans, bills and your father\'s debt.'; } },
    ] },
    { id: 'time', title: 'Time and weather', gist: `${longDate(g.day)} · ${String(Math.floor(g.world.hour)).padStart(2, '0')}:00`, acts: [
      ...([['Dawn', 6], ['Noon', 12], ['Evening', 18], ['Night', 22]] as const).map(([l, hr]) => ({ label: l, testid: `adm-hour-${hr}`, run: async () => {
        set({ world: { ...S().world, hour: hr }, ...(hr < 20 ? { dayOver: false } : {}) });
        await leave(() => home(nav));
        return `${l}: the clock is at ${hr}:00.`;
      } })),
      { label: 'Next day', testid: 'adm-nextday', run: async () => { S().endDay(); await leave(() => home(nav)); return `Morning of ${longDate(S().day)}.`; } },
      ...([['Skip 7 days', 7], ['Skip 30 days', 30], ['Skip 90 days', 90]] as const).map(([l, n]) => ({ label: l, testid: `adm-skip-${n}`, run: async () => { const r = skipDays(n); await leave(() => home(nav)); return r; } })),
      { label: 'Winter grey day', testid: 'adm-grey', run: async () => {
        const d = nextDay((x) => skyOn(x, 'giza') === 'grey');
        if (!d) return 'No grey day ahead here.';
        jumpTo(d); await leave(() => void toStall(nav)); return `${longDate(d)}: a grey winter day (only December to February).`;
      } },
      { label: 'Rain day', testid: 'adm-rain', run: async () => {
        const at = 'giza';
        const d = nextDay((x) => skyOn(x, at) === 'rain');
        if (!d) return 'No rain day ahead here.';
        jumpTo(d); await leave(() => void toStall(nav)); return `${longDate(d)}: rain over Giza.`;
      } },
      { label: 'Khamsin day', testid: 'adm-khamsin', run: async () => {
        const d = nextDay((x) => !!dustToday(x));
        if (!d) return 'No khamsin ahead.';
        jumpTo(d); await leave(() => void toStall(nav)); return `${longDate(d)}: ${dustToday(d)?.name ?? 'a khamsin'}. Rugs out on display may take sand.`;
      } },
      { label: 'Ramadan', testid: 'adm-ramadan', run: async () => {
        const d = nextDay((x) => eventsOn(x).some((e) => /Ramadan/i.test(e.name)) && !eventsOn(x - 1).some((e) => /Ramadan/i.test(e.name)));
        if (!d) return 'No Ramadan ahead in the calendar.';
        jumpTo(d); await leave(() => void toStall(nav)); return `${longDate(d)}: the first day of Ramadan.`;
      } },
      { label: 'Eid', testid: 'adm-eid', run: async () => {
        const d = nextDay((x) => eventsOn(x).some((e) => /^Eid/i.test(e.name)) && !eventsOn(x - 1).some((e) => /^Eid/i.test(e.name)));
        if (!d) return 'No Eid ahead in the calendar.';
        jumpTo(d); await leave(() => void toStall(nav)); return `${longDate(d)}: ${eventsOn(d).find((e) => /^Eid/i.test(e.name))?.name}.`;
      } },
    ] },
    { id: 'week', title: 'First week', gist: fw ? countdown(fw.owed, fw.days) : g.family?.first?.done ? `Rashid's £10 settled (${g.family.first.how})` : 'no instalment', acts: [
      { label: 'Show it at Rashid\'s', testid: 'adm-week-show', run: async () => {
        const f = firstDue(S().family, S().day);
        seen('rashid'); await leave(() => nav.tab('supplier'));
        return f ? `Rashid wants ${fmt(f.owed)} by ${dueDate(f.by)} (${f.days} days)${f.second ? ', his second week' : ''}.` : `Nothing owed for the first week${S().family?.first?.how ? ` (${S().family!.first!.how})` : ''}.`;
      } },
      { label: 'Pay it', testid: 'adm-week-pay', run: async () => {
        const f = firstDue(S().family, S().day);
        if (!f) return 'Nothing to pay: the first week is settled.';
        topUp(f.owed); S().payFamily(f.owed);
        seen('rashid'); await leave(() => nav.tab('supplier'));
        const w = S().family?.first;
        return `Paid ${fmt(f.owed)} (${w?.how === 'early' ? 'early: £1 off the debt' : w?.how ?? 'part'}).`;
      } },
      { label: 'Miss it', testid: 'adm-week-miss', run: async () => {
        const f = firstDue(S().family, S().day);
        if (!f) return 'Nothing to miss: the first week is settled. Use "Start it again".';
        // the day itself passes with an empty purse; the purse then comes back as it was
        const cash = S().cash;
        set({ day: Math.max(S().day, f.by), cash: 0, dayOver: false });
        S().endDay();
        set({ cash: cash + S().cash });
        seen('rashid'); await leave(() => nav.tab('supplier'));
        const w = S().family?.first;
        return w?.second && !w.done ? `Missed: £2 on the debt, trust down; one more week, ${fmt(w.sum - w.paid)} by ${dueDate(w.by)}.` : `Missed again: it goes in his book as overdue.`;
      } },
      { label: 'Start it again', testid: 'adm-week-again', run: () => {
        const s = S(); const f = s.family ?? { left: 10000, due: 0, since: 0, paid: 0 };
        set({ family: { ...f, first: { sum: FIRST_SUM, by: s.day + 6, paid: 0 } } });
        return `Rashid wants ${fmt(FIRST_SUM)} by ${dueDate(s.day + 6)} again.`;
      } },
    ] },
    { id: 'goals', title: 'Goals ladder', gist: goal ? `${milestonesDone(g.missions) + 1}/7 · ${MILESTONES[goal].title}` : `${milestonesDone(g.missions)} of 7 done`, acts: [
      { label: 'Show the current goal', testid: 'adm-goal-show', run: async () => {
        const id = activeMilestone(S().missions);
        await leave(() => nav.merchant('collection'));
        void openFold('pr-ladder');
        return id ? `Goal ${MILESTONE_ORDER.indexOf(id) + 1} of 7: ${MILESTONES[id].title}. ${MILESTONES[id].hint(S() as never)}` : S().day < 7 ? 'No goal yet: the goals start on day 7.' : 'No goal open now (the next opens in the morning).';
      } },
      { label: 'Complete it', testid: 'adm-goal-done', run: async () => {
        const s = S();
        let id = activeMilestone(s.missions);
        // none open yet: open the next one, as the morning would
        if (!id) { id = MILESTONE_ORDER.find((x) => s.missions[x] !== 'done'); if (!id) return 'All seven goals are done.'; }
        const m = MILESTONES[id];
        let shops = s.shops;
        if (id === 'ms-agent') {
          const cur = s.shops?.alexandria;
          if (!cur) shops = { ...(s.shops ?? {}), alexandria: { since: s.day, paid: 0, stock: [], gift: true, agent: { ...RASHIDS_MAN, since: s.day } } };
          else if (!cur.agent) shops = { ...s.shops, alexandria: { ...cur, agent: { ...RASHIDS_MAN, since: s.day } } };
        }
        set({ shops, missions: { ...s.missions, [id]: 'done' }, milestoneNews: id, cash: s.cash + m.reward.cash, reputation: s.reputation + m.reward.rep,
          supplier: { ...s.supplier, trust: Math.min(100, s.supplier.trust + m.reward.trust) },
          journal: [...s.journal, { day: s.day, text: `Goal reached: ${m.title}. ${m.opens}. ${m.speaker}: ${m.reward.text}`, kind: 'mission' }],
          ledger: m.reward.cash ? [...s.ledger, { day: s.day, kind: 'bonus', label: `Goal: ${m.title}`, amount: m.reward.cash }] : s.ledger });
        await leave(() => nav.merchant('collection'));
        void openFold('pr-ladder');
        return `Goal reached: ${m.title}. The next one opens tomorrow morning.`;
      } },
    ] },
    { id: 'unlocks', title: 'Unlocks', gist: (g.tipsSeen ?? []).includes(ALL_OPEN) || (g.tipsSeen ?? []).includes(OPENING_TIP) ? 'everything open' : 'opening one by one', acts: [
      { label: 'Open everything', testid: 'adm-open-all', run: async () => {
        pastOpening(); const s = S();
        set({ tipsSeen: [...new Set([...(s.tipsSeen ?? []), ALL_OPEN])], passport: s.passport ?? { day: s.day } });
        await leave(() => nav.map({ view: 'world' }));
        return 'Every city, trade and service is open, with travel papers.';
      } },
      { label: 'New player\'s view', testid: 'adm-open-none', run: async () => {
        const s = S();
        set({ tipsSeen: (s.tipsSeen ?? []).filter((t) => t !== ALL_OPEN && t !== OPENING_TIP && !t.startsWith('open-')) });
        await leave(() => home(nav));
        let dev = false; try { dev = localStorage.getItem('tof-skip-chapters') === '1'; } catch { /* */ }
        return `Things open one at a time again, as for a new player${dev ? ' (the old test switch in this browser still opens everything)' : ''}.`;
      } },
    ] },
    { id: 'dress', title: 'Stall dressing', gist: 'buy and place pieces on the stall', acts: [
      { label: 'Dress your stall', testid: 'adm-dress', run: async () => {
        await leave(() => nav.upgrades());
        await openFold('dressing-fold');
        for (let i = 0; i < 20 && !document.querySelector('[data-testid=dress-open]'); i++) await new Promise((r) => setTimeout(r, 100));
        (document.querySelector('[data-testid=dress-open]') as HTMLButtonElement | null)?.click();
        return 'Dress your stall: tap a place on the stall, then a piece to see it there.';
      } },
      { label: '+£50 to spend', testid: 'adm-dress-cash', run: () => { set({ cash: S().cash + 5000 }); return `£50 added: ${fmt(S().cash)} now.`; } },
    ] },
    { id: 'shops', title: 'Shops', gist: `${Object.keys(g.shops ?? {}).length} shops`, acts: [
      { label: 'Shop in Alexandria, agent, 3 rugs', testid: 'adm-shop', run: async () => {
        pastOpening();
        teleport('alexandria', 10);
        const c = SHOP_CITIES.alexandria;
        if (S().reputation < c.rep) set({ reputation: c.rep });
        if (!S().shops?.alexandria) { topUp(c.cost + 5000); S().buyShop('alexandria'); }
        const sh = S().shops?.alexandria;
        if (!sh) return 'The shop could not be bought.';
        if (!sh.agent) S().hireAgent('alexandria', 'shawqi');
        const rugs = [rug('cairo-garden'), rug('nile-reed'), rug('delta-house')];
        set({ inventory: [...S().inventory, ...rugs] });
        for (const r of rugs) S().leaveStock('alexandria', r.uid);
        await leave(() => nav.map({ view: 'world', panel: 'alexandria' }));
        await taps(['menu-myshop']);
        const now = S().shops?.alexandria;
        return `Your shop off the Souq el-Attarin: ${now?.agent?.name ?? 'no agent'}, ${now?.stock.length ?? 0} rugs on the wall.`;
      } },
      { label: 'Go to Monday', testid: 'adm-monday', run: async () => {
        let n = 0;
        do { S().endDay(); n++; } while (dateFor(S().day).weekday !== 'Monday' && n < 8);
        const t = S().ledger.filter((l) => l.day === S().day && /^Takings from/.test(l.label));
        await leave(() => nav.merchant('post'));
        return `${longDate(S().day)}. ${t.length ? t.map((l) => `${l.label}: ${fmt(l.amount)}`).join('; ') : 'No takings this week (nothing sold, or no shop with an agent).'}`;
      } },
    ] },
    { id: 'ranks', title: 'City tables', gist: `Cairo: ${ordinal(cairo.place)} of ${cairo.of}`, acts: [
      { label: 'Show Cairo\'s table', testid: 'adm-ranks-show', run: async () => {
        await leave(() => nav.merchant('collection'));
        await openFold('ranks-fold');
        const p = placeIn(S().ranks, 'cairo');
        return `Cairo: you are ${ordinal(p.place)} of ${p.of}, ${fmt(p.value)} sold this season.`;
      } },
      ...([['Top 3 in Cairo', 3, 'adm-ranks-3'], ['First in Cairo', 1, 'adm-ranks-1']] as const).map(([l, place, testid]) => ({ label: l, testid, run: async () => {
        const rows = standings(S().ranks, 'cairo').filter((r) => !r.you);
        const target = (rows[place - 1]?.value ?? 0) + 100;
        const need = target - (S().ranks?.tables.cairo?.you ?? 0);
        if (need > 0) set(recordCitySale(S(), 'cairo', need) as Partial<S>);
        await leave(() => nav.merchant('collection'));
        await openFold('ranks-fold');
        const p = placeIn(S().ranks, 'cairo');
        return `Cairo: ${ordinal(p.place)} of ${p.of}${need > 0 ? `, ${fmt(need)} of sales added` : ''}.`;
      } })),
      { label: 'End the season', testid: 'adm-season', run: async () => {
        const end = seasonEnd(seasonOf(S().day));
        set({ day: end, dayOver: false });
        S().endDay();
        await leave(() => nav.merchant('collection'));
        await openFold('ranks-fold');
        const j = [...S().journal].reverse().find((x) => /^The end of the/.test(x.text));
        return j ? j.text.split('. ').slice(0, 2).join('. ') : `Season over on ${longDate(end)}.`;
      } },
    ] },
    { id: 'fight', title: 'Road fight', gist: `${combatOf(g).wins} won · ${combatOf(g).losses} lost`, acts: [
      ...([['Easy odds', 0.45, 3, 'adm-fight-easy'], ['Even odds', 1, 5, 'adm-fight-even'], ['Hard odds', 1.9, 9, 'adm-fight-hard']] as const).map(([l, ratio, size, testid]) => ({ label: l, testid, run: async () => {
        const f = roadFight(ratio, size);
        if (!f) return 'No band on the map to meet.';
        await leave(() => nav.map({ view: 'world' }));
        const ok = await tapParty(f.band);
        return ok ? `On the road outside Cairo: ${f.text}.` : `The band is beside you on the map (${f.text}): tap it.`;
      } })),
      { label: 'A wanted leader', testid: 'adm-fight-wanted', run: async () => {
        const f = roadFight(1, 6, true);
        if (!f) return 'No band on the map to meet.';
        await leave(() => nav.map({ view: 'world' }));
        const ok = await tapParty(f.band);
        return `${ok ? 'On the road outside Cairo' : 'Beside you on the map (tap it)'}: ${f.text}.`;
      } },
    ] },
    { id: 'road', title: 'Road stories', gist: 'a walk from Cairo to Suez', acts:
      ([['Dust devil (passing)', 'dust-devil'], ['Pilgrims ask for water', 'pilgrims-water'], ['A dropped bale', 'found-bale'], ['Coffee with a sheikh', 'sheikh-coffee'], ['A pedlar swaps rugs', 'trader-swap']] as const).map(([l, id]) => ({ label: l, testid: `adm-road-${id}`, run: async () => {
        pastOpening();
        if (S().world.at !== 'cairo') teleport('cairo', 8);
        const s = S();
        set({ world: { ...s.world, hour: 8, party: { ...s.world.party, food: Math.max(s.world.party.food ?? 0, 40) } }, condition: { ...(s.condition ?? { fatigue: 0, dependence: 0 }), fatigue: 0, fed: 100, water: 100 } as S['condition'],
          ...(id === 'trader-swap' && !s.inventory.some((i) => !i.stored) ? { inventory: [...s.inventory, rug('cairo-garden')] } : {}) });
        // the bands near Cairo keep off for a day, so the story is not lost under a hold-up
        const c = settlementById('cairo'), w = S().world;
        set({ world: { ...w, parties: w.parties.map((q) => (Math.hypot(q.x - c.x, q.y - c.y) < 60 ? { ...q, cooldownUntil: Math.max(q.cooldownUntil ?? 0, S().day + 1) } : q)) } });
        forceRoadEvent(id);
        await leave(() => nav.map({ view: 'world', plan: 'suez' }));
        const ok = await taps(['travel']);
        await taps(['speed-4?']);
        return ok ? `Walking to Suez: "${roadEventById(id)?.text.split('. ')[0]}" comes within the hour.` : 'Plan a walk from Cairo: the story comes in the first hour of walking.';
      } })) },
    { id: 'games', title: 'Mini-games', gist: 'dominoes and knot counting', acts: [
      { label: 'Dominoes with Tawfiq (Giza)', testid: 'adm-dom-giza', run: async () => {
        pastOpening();
        if (S().world.at !== 'giza') teleport('giza', 10); else set({ world: { ...S().world, hour: 10 }, dayOver: false });
        topUp(500);
        await leave(() => nav.map({ view: 'district' }));
        const ok = await taps(['stall-sheet-close?', 'poi-coffee', 'cafe-play-dominoes']);
        return ok ? 'At Bilgin\'s: Tawfiq\'s dominoes table.' : 'In Giza: tap Bilgin\'s coffee house, then the dominoes table.';
      } },
      { label: 'Dominoes in Damascus', testid: 'adm-dom-damascus', run: async () => {
        pastOpening(); teleport('damascus', 11); topUp(500);
        await leave(() => nav.map({ view: 'world', panel: 'damascus' }));
        const ok = await taps(['guide-skip?', 'enter?', 'menu-walk', 'vpoi-dominoes']);
        return ok ? 'At the Nawfara: Abu Sa\'id\'s dominoes.' : 'In Damascus: walk the city to the Nawfara coffee house.';
      } },
      { label: 'Knot count at Arran\'s', testid: 'adm-knots', run: async () => {
        pastOpening();
        if (S().world.at !== 'giza') teleport('giza', 9); else set({ world: { ...S().world, hour: 9 }, dayOver: false });
        const r = rug('damascus-blue', { stored: true, paid: 600, fakeAge: true } as Partial<RugItem>);
        set({ inventory: [...S().inventory, r] });
        await leave(() => nav.map({ view: 'district' }));
        const ok = await taps(['stall-sheet-close?', 'poi-lab', 'arran-enter', 'arran-scene-leave?', `arran-rug-${r.uid}`, `arran-knots-${r.uid}`]);
        return ok ? 'At Arran\'s bench with a Damascus blue to count.' : 'A Damascus blue is in your store: take it to Arran\'s laboratory.';
      } },
    ] },
    { id: 'family', title: 'Family', gist: `${h.stage === 'none' ? 'single' : h.stage}${h.children.length ? ` · ${h.children.length} children` : ''}`, acts: [
      { label: 'Make eligible', testid: 'adm-fam-eligible', run: async () => {
        const s = S();
        set({ reputation: Math.max(s.reputation, 30), upgrades: [...new Set([...s.upgrades, 'mat', 'bazaar'])] });
        await leave(() => nav.tab('hero')); await openFold('me-household');
        return 'Reputation 30 and a stall with a canopy: Rashid will look for a match if you ask.';
      } },
      { label: 'Start courting', testid: 'adm-fam-court', run: async () => {
        pastOpening();
        const s = S();
        set({ reputation: Math.max(s.reputation, 30), upgrades: [...new Set([...s.upgrades, 'mat', 'bazaar'])] });
        if (hh(S()).stage === 'none') S().householdAct({ kind: 'seek' });
        if (hh(S()).stage !== 'offered') return `Already ${hh(S()).stage}.`;
        teleport(BRIDES.nadia.city, 9);
        const m = S().householdAct({ kind: 'visit', bride: 'nadia' });
        await leave(() => nav.tab('hero')); await openFold('me-household');
        return `In ${BRIDES.nadia.cityName}: ${m.split('. ')[0]}.`;
      } },
      { label: 'Skip to married', testid: 'adm-fam-married', run: async () => {
        const s = S(); const h0 = hh(s);
        if (h0.stage === 'married') return 'Already married.';
        const h1 = married(h0, s.day);
        set({ household: h1, journal: [...s.journal, { day: s.day, text: `Married ${BRIDES[h1.spouse!.id].name}.`, kind: 'home' }] });
        await leave(() => nav.tab('hero')); await openFold('me-household');
        return `Married to ${BRIDES[h1.spouse!.id].name}. The first child would come in about ${h1.birthIn} days at home.`;
      } },
      { label: 'Have a child', testid: 'adm-fam-child', run: async () => {
        const s = S();
        if (s.world.at !== 'giza') teleport('giza');
        const n0 = hh(S()).children.length;
        set({ household: { ...married(hh(S()), S().day), birthIn: 1 } });
        const cash0 = S().cash, l0 = S().ledger.length;
        S().endDay();
        const kids = hh(S()).children;
        await leave(() => nav.tab('hero')); await openFold('me-household');
        return (kids.length > n0 ? `A ${kids[kids.length - 1].sex} is born (morning of ${longDate(S().day)}). Choose a name under Household.` : 'No birth tonight (the house may be full).') + nightCost(cash0, l0);
      } },
      { label: 'Children to 18', testid: 'adm-fam-grow', run: async () => {
        const s = S(); let h1 = married(hh(s), s.day);
        if (!h1.children.length) h1 = { ...h1, children: [{ id: `c${s.day}`, sex: 'son', name: 'Ahmad', born: s.day, ageDays: 0, traits: { learning: 5, trade: 5, craft: 5 } }] };
        // a child not yet named stays so: the Household asks for the name, as at the birth
        set({ household: { ...h1, children: h1.children.map((c) => ({ ...c, path: c.path ?? 'shop', ageDays: Math.max(c.ageDays, 18 * 365 - 1) })) } });
        const cash0 = S().cash, l0 = S().ledger.length;
        S().endDay();
        await leave(() => nav.tab('hero')); await openFold('me-household');
        const bare = hh(S()).children.filter((c) => !c.name).length;
        return `Grown: ${hh(S()).children.map((c) => `${childName(c)} (${ageOf(c)})`).join(', ')}.${bare ? ' Name them under Household.' : ''}` + nightCost(cash0, l0);
      } },
      { label: 'Show the heir', testid: 'adm-fam-heir', run: async () => {
        const hr = heirOf(hh(S()));
        await leave(() => nav.tab('hero')); await openFold('me-household');
        return hr ? `Your heir: ${childName(hr)}, ${ageOf(hr)}. He or she would carry on the house.` : 'No heir yet: a child of 18 is needed.';
      } },
    ], extra: heir ? <p className="adm-note">Heir: {childName(heir)}, {ageOf(heir)}</p> : null },
    { id: 'persia', title: 'Persia', gist: persiaOpen(g) ? 'the road is open' : 'shut', acts: [
      { label: 'Shops in Baghdad +2, and a visa', testid: 'adm-persia-open', run: () => {
        pastOpening(); const s = S();
        const mk = (sid: string) => s.shops?.[sid] ?? { since: s.day, paid: 0, stock: [] };
        set({ shops: { ...(s.shops ?? {}), baghdad: mk('baghdad'), damascus: mk('damascus'), aleppo: mk('aleppo') }, passport: s.passport ?? { day: s.day }, persianVisa: s.persianVisa ?? { day: s.day } });
        return persiaOpen(S()) ? 'Shops in Baghdad, Damascus and Aleppo, a passport and a Persian visa: Persia is open.' : 'Persia is still shut.';
      } },
      { label: 'Go to Baghdad', testid: 'adm-persia-baghdad', run: async () => {
        pastOpening(); teleport('baghdad', 9);
        await leave(() => nav.map({ view: 'world', panel: 'baghdad' }));
        return 'In Baghdad.';
      } },
      { label: 'Go to Kermanshah', testid: 'adm-persia-kermanshah', run: async () => {
        pastOpening(); const s = S();
        if (!persiaOpen(s)) set({ shops: { ...(s.shops ?? {}), baghdad: s.shops?.baghdad ?? { since: s.day, paid: 0, stock: [] }, damascus: s.shops?.damascus ?? { since: s.day, paid: 0, stock: [] }, aleppo: s.shops?.aleppo ?? { since: s.day, paid: 0, stock: [] } }, passport: s.passport ?? { day: s.day }, persianVisa: s.persianVisa ?? { day: s.day } });
        teleport('kermanshah', 9);
        await leave(() => nav.map({ view: 'world', panel: 'kermanshah' }));
        return 'In Kermanshah (Persia opened for it if it was shut).';
      } },
    ] },
    { id: 'travel', title: 'Travel', gist: g.world.at ? `in ${settlementById(g.world.at).name}` : 'on the road', acts: [
      { label: 'Go there now', testid: 'adm-teleport', run: async () => {
        pastOpening(); teleport(town);
        await leave(() => nav.map(town === 'giza' ? { view: 'district' } : { view: 'world', panel: town }));
        return `In ${settlementById(town).name}.`;
      } },
      { label: 'Food and water', testid: 'adm-food', run: () => {
        const s = S();
        set({ world: { ...s.world, party: { ...s.world.party, food: Math.max(s.world.party.food ?? 0, 40) } }, condition: { ...(s.condition ?? { fatigue: 0, dependence: 0 }), fed: 100, water: 100 } as S['condition'] });
        return `Water skins full, ${S().world.party.food} days of food.`;
      } },
    ], extra: (
      <label className="adm-pick">Town
        <select value={town} onChange={(e) => setTown(e.target.value)} data-testid="adm-town">
          {[...SETTLEMENTS].sort((a, b) => a.name.localeCompare(b.name)).map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
        </select>
      </label>
    ) },
    { id: 'save', title: 'Save', gist: `day ${g.day}`, acts: [
      { label: 'Copy save', testid: 'adm-save-copy', quiet: true, run: async () => {
        forceSave();
        const raw = readKey(SAVE_KEY) ?? '';
        try { await navigator.clipboard.writeText(raw); setCopyText(''); return `Copied (${Math.round(raw.length / 1024)} KB). Paste it into a message to keep it.`; }
        catch { setCopyText(raw); return 'This browser will not copy by itself: hold the text below and copy it.'; }
      } },
      { label: 'Save as a file', testid: 'adm-save-file', quiet: true, run: () => { nav.backup(); return 'A backup file is being saved.'; } },
      { label: 'Back to day one', testid: 'adm-save-reset', run: async () => {
        if (!window.confirm('Start a new game from day one? This game is lost unless you saved it first.')) return 'Nothing changed.';
        log('back to day one.');
        await leave(() => nav.restart());
        return 'A new game from day one.';
      } },
    ], extra: (
      <div className="adm-save">
        {copyText && <textarea readOnly value={copyText} rows={3} onFocus={(e) => e.currentTarget.select()} data-testid="adm-save-text" />}
        <label className="btn adm-btn" data-testid="adm-save-open">Open a save file<input type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) nav.openFile(f); e.target.value = ''; }} /></label>
        <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={2} placeholder="…or paste a copied save here" data-testid="adm-paste" />
        <button className="btn adm-btn" disabled={!paste.trim()} data-testid="adm-paste-load" onClick={() => {
          const c = checkSave(paste.trim(), SAVE_VERSION);
          if (!c.ok) { lastMsg.save = c.why; setMsgs((x) => ({ ...x, save: c.why })); return; }
          if (!window.confirm(`Load the pasted save from day ${c.day}? This game is replaced.`)) return;
          blockSaves(); writeKey(SAVE_KEY, paste.trim()); window.location.reload();
        }}>Load the pasted save</button>
      </div>
    ) },
  ];

  return (
    <div className="admin-sheet" role="dialog" aria-modal="true" aria-label="Tester's sheet" data-testid="admin-sheet">
      <div className="adm-head">
        <div><small>FOR TESTING THIS BETA</small><h2>Tester's sheet</h2></div>
        <button className="btn" onClick={onClose} data-testid="admin-close">Close ×</button>
      </div>
      <div className="adm-body">
        <p className="adm-intro">Each button sets the game up and takes you straight to the feature. Everything you use here is noted in your journal.</p>
        {ironman && <p className="adm-intro adm-warn" data-testid="admin-ironman">Not in a one-life game: these buttons do nothing.</p>}
        {sections.map((sec) => (
          <Fold key={sec.id} id={`adm-${sec.id}`} title={sec.title} gist={sec.gist} testid={`adm-sec-${sec.id}`} rowTestid={`adm-row-${sec.id}`}>
            <p className="adm-desc">{DESC[sec.id]}</p>
            <div className="adm-btns">
              {sec.acts.map((a) => <button key={a.testid} className="btn adm-btn" disabled={ironman} onClick={() => void fire(sec.id, a)} data-testid={a.testid}>{a.label}</button>)}
            </div>
            {sec.extra}
            {msgs[sec.id] && <p className="adm-res" role="status" data-testid={`adm-res-${sec.id}`}>{msgs[sec.id]}</p>}
          </Fold>
        ))}
      </div>
    </div>
  );
}

const DESC: Record<string, string> = {
  money: 'Top up the purse and your name, rest, and wipe every debt.',
  time: 'Move the clock, or jump to a day with that weather or feast (the night before passes as usual).',
  week: 'Uncle Rashid\'s first £10 of your father\'s debt, due on day 7: see it, pay it, or let it pass.',
  goals: 'The seven goals from day 7 (Progress, Collection): see the one in hand, or finish it now.',
  unlocks: 'See everything at once, or put the game back to showing things one at a time.',
  dress: 'The pieces that dress the Giza stall, and money to buy them.',
  shops: 'A shop in Alexandria with an agent and three rugs on the wall; then the Monday takings.',
  ranks: 'The dealers\' sales table for Cairo this season: your place, a push up it, the season\'s end.',
  fight: 'A band stops you on the road just outside Cairo, at the odds you pick.',
  road: 'Start the walk from Cairo to Suez with a road story set to happen in the first hour.',
  games: 'Sit down at a game: dominoes in Giza or Damascus, or count knots at Arran\'s bench.',
  family: 'Marriage and children, a step at a time: the Household section on the Me tab.',
  persia: 'Open the road to Persia (shops in three cities and a visa) and go there.',
  travel: 'Be in any town at once, and fill the water skins and food bags.',
  save: 'Keep a copy of this game, bring one back, or start again from day one.',
};
