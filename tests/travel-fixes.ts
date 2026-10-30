// Travel fixes from the playtest, checked without a browser.
//   npx tsx tests/travel-fixes.ts
import { useGame } from '../src/game/state/store';
import { frontierAt, borderOnRoad, crossBorder, finishBorder } from '../src/game/systems/customs';
import { findPath, routeLeg, settlementById, along, dist, motorRoutesFrom } from '../src/game/systems/world';
import { CROSSINGS } from '../src/data/barriers';
import { ROAD_WELLS, shortName } from '../src/data/world';
import { waitsTurn, setHold, held } from '../src/game/cardTurn';
import { omensNight } from '../src/game/systems/omens';
import { MISSIONS } from '../src/data/missions';
import type { GameState } from '../src/game/state/store';
import { audio } from '../src/game/audio/engine';
// no sound without a browser
(audio as unknown as { sfx: () => void }).sfx = () => {};

let fails = 0;
const ok = (c: boolean, what: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${what}`); if (!c) fails++; };
const at = (id: string) => { const s = settlementById(id); return { x: s.x, y: s.y }; };

// ---- the frontier is met on the road, at the post ----
const kantara = CROSSINGS.find((c) => c.name.startsWith('Kantara'))!;
const walk = findPath(at('giza'), at('damascus'))!;
const k = frontierAt(walk, 'giza', 'damascus');
ok(k !== undefined, 'a walk from Giza to Damascus meets a frontier');
if (k !== undefined) ok(dist(along(walk, k).pos, kantara) < 30, `and it is at Kantara (${dist(along(walk, k).pos, kantara).toFixed(0)} px off)`);
const car = routeLeg(at('damascus'), at('baghdad'), 'motor');
const r = frontierAt(car, 'damascus', 'baghdad');
const rutba = ROAD_WELLS.find((w) => w.id === 'well-rutba')!;
ok(r !== undefined && dist(along(car, r).pos, rutba) < 30, 'the desert car stops at the Rutba wells');
ok(frontierAt(findPath(at('giza'), at('alexandria'))!, 'giza', 'alexandria') === undefined, 'no frontier inside Egypt');

// held at the post, answered there, and arriving after does not ask again
useGame.setState({ lastTown: 'giza', border: undefined, passport: { day: 1 }, inventory: [], cash: 10000 } as Partial<GameState>);
ok(borderOnRoad('giza', 'damascus'), 'the caravan is held at the post');
const b = useGame.getState().border!;
ok(!!b.onRoad && b.post.includes('Kantara'), `the card is the Kantara post, on the road (${b.post})`);
ok(!borderOnRoad('giza', 'damascus'), 'not asked twice while the card is open');
crossBorder('none');
ok(finishBorder() === 'damascus' && useGame.getState().lastTown === 'damascus' && !useGame.getState().border, 'answered: on to Damascus, the frontier is behind');
ok(!borderOnRoad('giza', 'damascus'), 'and the same trip does not meet it again');

// ---- one card at a time ----
const base = { world: { at: 'damascus' } };
ok(waitsTurn({ ...base, border: {}, rescue: {} }, 'rescue'), 'a fall in the street waits for the frontier');
ok(!waitsTurn({ ...base, rescue: {} }, 'rescue'), 'and shows once the frontier is done');
ok(waitsTurn({ ...base, rescue: {}, jobOffer: { city: 'damascus' } }, 'job'), 'a buyer for a packed rug waits for the fall');
ok(waitsTurn({ ...base, jobOffer: { city: 'damascus' } }), 'notices wait for any card');
setHold('fight', true);
ok(held() && waitsTurn(base), 'level-ups wait while a fight is on');
setHold('fight', false);
ok(!held() && !waitsTurn(base), 'and come once it is over');

// ---- the Nairn car takes people only ----
const nairn = motorRoutesFrom('damascus', { people: 9, animals: { falahi: 8 } }).find((x) => x.to === 'baghdad')!;
ok(nairn.noAnimals && nairn.bill.length === 1 && nairn.fare === 9 * nairn.perPerson, `the Nairn car charges people only and will not take the camels (${nairn.fare})`);
ok(!motorRoutesFrom('damascus', { people: 2, animals: {} }).find((x) => x.to === 'baghdad')!.noAnimals, 'without animals it can be booked');
const lorry = motorRoutesFrom('baghdad', { people: 2, animals: { falahi: 2 } }).find((x) => x.to === 'kermanshah')!;
ok(!lorry.noAnimals && lorry.bill.length > 1, 'a lorry on the Persian road still carries beasts as freight');

// ---- the stall thief: no "you were warned" when the warning came while away ----
const s0 = useGame.getState();
const rug = { ...s0.inventory[0], uid: 'stall-1', typeId: 'nile-reed', stored: true, paid: 60 };
const away = omensNight({ ...s0, started: true, playMode: undefined, inventory: [rug], omen: { kind: 'thief', night: 9, away: true }, world: { ...s0.world, at: 'damascus' } } as unknown as GameState, 10);
ok(away.notes.some((n) => n.startsWith('While you were away')) && !away.notes.some((n) => n.includes('You were warned')), `away: ${away.notes[0]}`);

// ---- the objective says what to do from where you are ----
const hint = MISSIONS.alexandria.hint!({ ...s0, world: { ...s0.world, at: 'damascus' } } as never);
ok(!hint.includes('4 hours'), `in Damascus the errand reads: "${hint}"`);
ok(shortName('istanbul') === 'Stamboul' && shortName('damascus') === 'Damascus' && shortName(null) === 'Road', 'short names for the bar at the top');

process.exit(fails ? 1 : 0);
