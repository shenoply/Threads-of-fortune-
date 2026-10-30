// Courting as choices over days, the four scene cards, roles that do something, and the heir.
//   npx tsx tests/family-life.ts
import {
  applyHousehold, householdNight, heirOf, kinOf, presentsFor, callFit, feastOf, housekeeping, tidyHousehold, fatherShort, roleLine, stallWifeLine,
  BRIDES, ASK_AT, type HouseholdState, type HouseholdAct,
} from '../src/game/systems/household';
import { assignFamilyFaces, householdFaces } from '../src/game/systems/familyFaces';
import { worldFaces } from '../src/game/systems/population';
import type { GameState } from '../src/game/state/store';

let fails = 0;
const ok = (cond: boolean, what: string) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${what}`); if (!cond) fails++; };

const base = (h: HouseholdState, over: Partial<GameState> = {}) => ({
  household: h, day: 100, cash: 100000, reputation: 40, world: { at: 'cairo', hour: 9, friends: [] }, ledger: [], journal: [],
  wardrobe: undefined, attire: { clean: 100 }, manner: { honesty: 20, firmness: 0, kindness: 0, charm: 0 }, skills: {}, stats: {}, ranks: undefined, upgrades: ['bazaar'],
  relationships: {}, post: [], inventory: [], ...over,
}) as unknown as GameState;
let st = base({ stage: 'offered', offered: 90, suitors: {}, children: [], pace: 1 });
const run = (a: HouseholdAct, rng = () => 0.9) => { const r = applyHousehold(st, a, rng); st = { ...st, ...r.patch } as GameState; return r; };
const H = () => st.household!;

// the first call opens a scene; the choice is the call
let r = run({ kind: 'scene', scene: 'call', bride: 'nadia' });
ok(r.ok && H().scene?.kind === 'call', 'the first call opens as a scene card');
ok(H().suitors.nadia === undefined, 'nothing happens until a choice is made');
r = run({ kind: 'visit', bride: 'nadia', way: 'gift' });
ok(r.ok && H().scene?.done === r.msg, `the card shows what happened: ${r.msg.slice(0, 70)}`);
ok((H().suitors.nadia?.favour ?? 0) === 0, `a generous gift to the honest teacher is a wrong note on a first call (opinion ${H().suitors.nadia?.favour})`);
run({ kind: 'close' });
ok(!H().scene, 'Go on closes the card');
// one call a day
r = run({ kind: 'scene', scene: 'call', bride: 'nadia' });
ok(!r.ok && /tomorrow/.test(r.msg), `a second call the same day is refused: ${r.msg}`);
// the right note on another day moves more than the wrong one
st = { ...st, day: 101 };
const fav0 = H().suitors.nadia!.favour;
run({ kind: 'scene', scene: 'call', bride: 'nadia' });
run({ kind: 'visit', bride: 'nadia', way: 'modest' });
const modestGain = H().suitors.nadia!.favour - fav0;
ok(modestGain > 10, `modest suits a schoolteacher's family: +${modestGain}`);
ok(callFit(BRIDES.dalia, 'modest').fit === -1 && callFit(BRIDES.dalia, 'gift').fit === 1, 'a notable Alexandria house wants show, not modesty');
run({ kind: 'close' });

// presents: one a day, each day does something; what fits differs by family
r = run({ kind: 'gift', bride: 'nadia', present: 'devout' });
ok(r.ok && /\+\d/.test(r.msg), `a present works and says how much: ${r.msg.slice(-40)}`);
r = run({ kind: 'gift', bride: 'nadia', present: 'own' });
ok(!r.ok && /tomorrow/.test(r.msg), 'a second present the same day is refused with a reason');
st = { ...st, day: 104 };
const f1 = H().suitors.nadia!.favour;
r = run({ kind: 'gift', bride: 'nadia', present: 'own' });
ok(r.ok && H().suitors.nadia!.favour > f1, 'a present on a later day still counts');
ok(presentsFor(BRIDES.zeinab).find((p) => p.kind === 'gold')!.lift < 0, 'gold is too much for a lane family');
ok(presentsFor({ ...BRIDES.yasmin, faith: 'christian' }).find((p) => p.kind === 'devout')!.label.includes('church'), 'a devout present of the family\'s own faith');

// a rival suitor for a good match, and the day her father decides
let s2 = base({ stage: 'offered', offered: 90, known: ['dalia'], suitors: { dalia: { favour: 30, visits: 1, gifts: 0 } }, children: [], pace: 1 }, { world: { at: 'alexandria', hour: 9, friends: [] } } as never);
const rv = applyHousehold(s2, { kind: 'visit', bride: 'dalia', way: 'gift' }, () => 0.1);
const rs = rv.patch.household!.suitors.dalia!;
ok(!!rs.rival && /suitor|caller/.test(rv.msg), `another suitor calls: ${rs.rival?.who}`);
s2 = { ...s2, household: rv.patch.household } as GameState;
const notes: string[] = [];
const night = householdNight(s2, {}, notes, rs.rival!.by + 1, () => 0.5);
ok(!!night.household?.suitors.dalia?.lost && notes.some((n) => n.includes('given her')), `lost to him: ${notes[0]}`);

// the proposal: the mahr shown, her father asking more, holding firm with too little favour
st = { ...st, household: { ...H(), suitors: { nadia: { favour: 80, visits: 5, gifts: 2 } } } };
r = run({ kind: 'scene', scene: 'ask', bride: 'nadia' }, () => 0.1);
ok(H().scene?.demand === 'more' && H().scene!.mahr! > BRIDES.nadia.mahr, `her father asks ${H().scene?.mahr} against ${BRIDES.nadia.mahr}`);
r = run({ kind: 'ask', bride: 'nadia', answer: 'hold' });
ok(!r.ok && H().suitors.nadia!.favour < 80 && !H().chosen && !!H().scene?.done, 'holding firm offends a father not yet won over');
run({ kind: 'close' });
st = { ...st, household: { ...H(), suitors: { nadia: { favour: 92, visits: 6, gifts: 2 } } } };
run({ kind: 'scene', scene: 'ask', bride: 'nadia' }, () => 0.1);
ok(H().scene?.demand === 'none', 'a father who thinks highly of you asks nothing more');
const cash0 = st.cash;
r = run({ kind: 'ask', bride: 'nadia', answer: 'agree' });
ok(r.ok && H().chosen === 'nadia' && cash0 - st.cash === BRIDES.nadia.mahr, 'the contract, and the mahr shown is the mahr paid');
run({ kind: 'close' });

// the feast: its size moves reputation and her family's regard
st = { ...st, day: 120 };
r = run({ kind: 'scene', scene: 'feast' });
ok(H().scene?.kind === 'feast', 'the feast opens as a scene');
const rep0 = st.reputation;
r = run({ kind: 'feast', scale: 'lavish' });
ok(r.ok && st.reputation - rep0 === feastOf(BRIDES.nadia, 'lavish').rep && H().spouse?.regard === 'warm', `a lavish feast: reputation +${st.reputation - rep0}, regard ${H().spouse?.regard}`);
ok(!H().chosen && H().contract === undefined && !H().terms, 'the betrothal is cleared at the wedding');
ok(feastOf(BRIDES.dalia, 'modest').regard === 'cool' && feastOf(BRIDES.dalia, 'lavish').regard === 'proud', 'a notable house is cool to a modest feast, proud of a lavish one');
run({ kind: 'close' });

// the old tester step: a betrothal written beside the wife is tidied away
const dup = tidyHousehold({ ...H(), chosen: 'nadia', contract: 50 });
ok(!dup.chosen && !dup.contract, 'no second Nadia');

// roles: the books cut the household bill; the stall has its line
st = { ...st, household: { ...H(), spouse: { ...H().spouse!, role: 'books' } } };
const cut = housekeeping(st, [{ label: 'Household and lodging', amount: 400 }]);
ok(!!cut && cut.amount === -80, `keeping the books saves ${cut?.amount}`);
const onStall = { ...H(), spouse: { ...H().spouse!, role: 'stall' as const } };
ok(roleLine(onStall.spouse, st).includes('stall') && !!stallWifeLine({ household: onStall, shopBoy: undefined }), 'minding the stall: a line on her card and on the stall');
ok(fatherShort(BRIDES.nadia) === 'Ustaz Fahmi' && fatherShort(BRIDES.aziza) === 'her mother', 'her father by name, or her mother where he has died');

// the heir: a daughter, her sister not mistaken for the heir, and no courting reopened
const grown = (id: string, sex: 'son' | 'daughter', name: string, born: number) => ({ id, sex, name, born, ageDays: 18 * 365 + 10, traits: { learning: 10, trade: 10, craft: 10 } });
st = { ...st, household: { ...H(), known: ['yasmin'], children: [grown('a', 'daughter', 'Zeinab', 1), grown('b', 'daughter', 'Fatma', 2)] } };
r = run({ kind: 'scene', scene: 'heir' });
ok(H().scene?.kind === 'heir', 'the keys of the house: a scene');
r = run({ kind: 'inherit', way: 'quiet' });
const hd = H();
ok(r.ok && hd.merchant?.name === 'Zeinab' && hd.merchant.sex === 'daughter' && !!hd.merchant.child, 'Zeinab heads the house, a daughter, with her picture');
ok(!heirOf(hd), 'her sister is not her heir');
ok(kinOf(hd, hd.children[0]) === 'sibling', 'Fatma is her sister');
ok(applyHousehold(st, { kind: 'scene', scene: 'call', bride: 'yasmin' }).ok === false && !hd.known, 'no families courted for the new head');

// faces: a grown child gets a face nobody else has, or keeps the initial
const fam: HouseholdState = { stage: 'married', suitors: {}, pace: 1, spouse: { id: 'nura', married: 1, content: 70, role: 'home', lastHome: 1 }, children: [grown('x', 'daughter', 'Huda', 1), grown('y', 'daughter', 'Hind', 2)] };
const faced = assignFamilyFaces(fam, 400)!;
const got = faced.children.map((c) => c.face);
ok(got.every((f) => f !== undefined) && (got[0] === '' || got[0] !== got[1]), `grown daughters: ${JSON.stringify(got)}`);
ok(got.every((f) => !f || !worldFaces().has(f)), 'no face taken from someone in the world');
ok(householdFaces(faced).size === got.filter(Boolean).length, 'no face twice in the household');
const nadiaFam: HouseholdState = { ...fam, spouse: { id: 'nadia', married: 1, content: 70, role: 'home', lastHome: 1 }, children: [grown('z', 'son', 'Ahmad', 1), grown('w', 'son', 'Omar', 2)] };
const nf = assignFamilyFaces(nadiaFam, 400)!.children.map((c) => c.face);
ok(nf[0] === 'fam:child-egypt-son-18' && nf[1] !== nf[0], `Egyptian sons: the family picture once, then another or the initial (${JSON.stringify(nf)})`);

void ASK_AT;
if (fails) { console.log(`${fails} failed`); process.exit(1); }
console.log('all passed');
