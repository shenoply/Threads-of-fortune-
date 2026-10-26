// Up to four wives, and fathers who are dealers on the season's tables.
//   npx tsx tests/wives.ts
import { applyHousehold, householdNight, wivesOf, houseNeed, inLawHouses, BRIDES, MAX_WIVES, type HouseholdState } from '../src/game/systems/household';
import { rankReaction } from '../src/game/systems/ranks';
import type { GameState } from '../src/game/state/store';

let fails = 0;
const ok = (cond: boolean, what: string) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${what}`); if (!cond) fails++; };

const base = (h: HouseholdState, over: Partial<GameState> = {}) => ({
  household: h, day: 100, cash: 100000, reputation: 90, world: { at: 'cairo', hour: 9, friends: [] }, ledger: [], journal: [],
  wardrobe: undefined, attire: { clean: 100 }, manner: { honesty: 20, firmness: 0, kindness: 0, charm: 0 }, skills: {}, stats: {}, ranks: undefined, upgrades: ['bazaar'],
  relationships: {}, post: [], inventory: [], ...over,
}) as unknown as GameState;

const wife = (id: string) => ({ id, married: 10, content: 70, role: 'home' as const, lastHome: 99 });
let h: HouseholdState = { stage: 'married', suitors: {}, children: [], pace: 1, spouse: wife('nadia'), known: ['yasmin', 'zeinab', 'emine'] };

// Selim Haddad wants you among the first six of Cairo
const y = BRIDES.yasmin;
ok(!!houseNeed(undefined, y), 'Haddad refuses a man not on the Cairo table');
const ranks = { season: 1, tables: { cairo: { you: 10_000_000 } }, seen: ['cairo'], firsts: [], reacted: [] };
ok(!houseNeed(ranks as never, y), 'first in Cairo: Haddad will hear you');

// court and marry a second wife
h = { ...h, suitors: { yasmin: { favour: 80, visits: 3, gifts: 1 } } };
let r = applyHousehold(base(h, { ranks } as never), { kind: 'ask', bride: 'yasmin' });
ok(r.ok, `ask for Yasmin while married: ${r.msg.slice(0, 60)}`);
h = r.patch.household!;
r = applyHousehold(base(h, { day: 110, ranks } as never), { kind: 'feast' });
ok(r.ok, 'the feast');
h = r.patch.household!;
ok(wivesOf(h).length === 2 && h.spouse!.id === 'nadia', 'two wives, Nadia still first');
ok(h.spouse!.content < 70, `Nadia feels it: ${h.spouse!.content}`);
ok(inLawHouses(h).includes('rival-selim'), 'Haddad is family now');

// a great house will not give a second wife
h = { ...h, suitors: { emine: { favour: 90, visits: 3, gifts: 1 } } };
r = applyHousehold(base(h, { world: { at: 'istanbul', hour: 9, friends: [] }, ranks } as never), { kind: 'ask', bride: 'emine' });
ok(!r.ok, `Tezcan refuses: ${r.msg.slice(0, 70)}`);

// presents go to the wife named
r = applyHousehold(base(h, { day: 120 }), { kind: 'present', wife: 'yasmin' });
const ya = wivesOf(r.patch.household!).find((w) => w.id === 'yasmin')!;
ok(r.ok && ya.lastPresent === 120 && r.patch.household!.spouse!.lastPresent === undefined, 'a present for Yasmin only');

// each wife has her children
let hh2: HouseholdState = { ...h, birthIn: 1, wives: h.wives!.map((w) => ({ ...w, birthIn: 1 })) };
const out = householdNight(base(hh2, { world: { at: 'giza', hour: 22, friends: [] } } as never), {}, [], 400, () => 0.3);
hh2 = out.household!;
ok(hh2.children.length === 2 && hh2.children.some((c) => c.mother === 'yasmin') && hh2.children.some((c) => !c.mother), 'a child for each wife, with her mother named');

// four is the limit
const full: HouseholdState = { stage: 'married', suitors: { zeinab: { favour: 90, visits: 3, gifts: 1 } }, children: [], pace: 1, spouse: wife('nadia'), wives: [wife('amira'), wife('layla'), wife('salma')], known: ['zeinab'] };
ok(wivesOf(full).length === MAX_WIVES, 'four wives');
r = applyHousehold(base(full, { world: { at: 'giza', hour: 9, friends: [] } } as never), { kind: 'ask', bride: 'zeinab' });
ok(!r.ok, 'no fifth');

// a father-in-law never answers you as a rival
const rr = rankReaction({ ranks: { ...ranks, pending: [{ rival: 'rival-selim', city: 'cairo' }] }, day: 130, reputation: 50, journal: [], jobNote: undefined, household: h } as never);
ok(!rr.ranks?.undercut?.cairo && (rr.reputation ?? 0) === 51, 'Haddad is proud, not angry');

if (fails) { console.log(`${fails} failed`); process.exit(1); }
console.log('all passed');
