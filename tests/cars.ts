// Your own motor car, checked without a browser.
//   npx tsx tests/cars.ts
import { useGame } from '../src/game/state/store';
import type { GameState } from '../src/game/state/store';
import { CARS, CAR_BY_ID, CAR_ROADS, DESERT_PAPERS, RESALE, CAR_FREIGHT, carsSoldIn } from '../src/data/cars';
import { carRoute, carFit, carCost, carReach, carWinter, passShut, rollTrip, DESERT_MUD_HOURS } from '../src/game/systems/cars';
import { SETTLEMENTS } from '../src/data/world';
import { audio } from '../src/game/audio/engine';
(audio as unknown as { sfx: () => void }).sfx = () => {};

let fails = 0;
const ok = (c: boolean, what: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${what}`); if (!c) fails++; };

// a summer day (day 100 is mid-June 1925) and a winter day (day 300 is early January 1926)
const SUMMER = 100, WINTER = 300;
ok(!carWinter(SUMMER) && carWinter(WINTER), 'day 100 is summer, day 300 is winter');

// ---- the data ----
ok(CARS.length === 5 && new Set(CARS.map((c) => c.id)).size === 5, 'five models');
ok(CAR_BY_ID['car-tourer'].price === 15000 && CAR_BY_ID['car-six'].price === 27500 && CAR_BY_ID['car-saloon'].price === 45000 && CAR_BY_ID['car-desert'].price === 95000 && CAR_BY_ID['car-lorry'].price === 32000, 'prices £150, £275, £450, £950, £320');
ok(CARS.filter((c) => c.desert).map((c) => c.id).join() === 'car-desert', 'only the Desert Eight is desert-capable');
ok(CAR_ROADS.every((r) => SETTLEMENTS.some((s) => s.id === r.a) && SETTLEMENTS.some((s) => s.id === r.b)), 'every road joins two real towns');
ok(carsSoldIn('baghdad').map((c) => c.id).sort().join() === 'car-desert,car-lorry', 'Baghdad sells the desert car and the lorry');
ok(carsSoldIn('jaffa').length === 2 && carsSoldIn('cairo').length === 4 && carsSoldIn('beirut').length === 5, 'Jaffa 2, Cairo 4, Beirut 5 models');

// ---- the road graph ----
const t = (a: string, b: string, m = 'car-tourer', d = SUMMER) => carRoute(a, b, m, d);
ok(t('beirut', 'damascus').route?.hours === 3.5, 'Beirut to Damascus 3½ h in a tourer');
const jd = t('jaffa', 'damascus').route;
ok(!!jd && jd.stops.join('>') === 'jaffa>beirut>damascus' && jd.hours === 12.5, `Jaffa to Damascus goes by the coast and Beirut (${jd?.stops.join('>')}, ${jd?.hours} h)`);
ok(t('giza', 'suez').route?.stops.join('>') === 'giza>cairo>suez', 'Giza to Suez through Cairo');
ok(!t('cairo', 'jaffa').route && !t('cairo', 'jaffa').why, 'no motor road across Sinai: Cairo to Jaffa not offered');
ok(!t('beirut', 'alexandria').route, 'no road to Alexandria');
ok(!t('damascus', 'baghdad').route && /desert car/.test(t('damascus', 'baghdad').why ?? ''), 'a tourer cannot cross the desert, and says why');
ok(!t('damascus', 'baghdad', 'car-lorry').route, 'nor can the lorry');
const desert = t('damascus', 'baghdad', 'car-desert').route;
ok(!!desert && desert.desert === 1 && desert.hours === Math.round((30 / 1.15) * 2) / 2, `the Desert Eight crosses (${desert?.hours} h, 1 set of papers)`);
const bt = t('beirut', 'tehran', 'car-desert').route;
ok(!!bt && bt.stops.join('>') === 'beirut>damascus>baghdad>khanaqin>kermanshah>hamadan>tehran', 'Beirut to Tehran by the desert and the Persian road');
ok(t('baghdad', 'tehran', 'car-lorry').route?.stops.length === 5, 'the lorry goes up the Persian road');
ok(t('baghdad', 'tehran', 'car-lorry').route!.hours > t('baghdad', 'tehran', 'car-six').route!.hours, 'the lorry is slower than the Six');
ok(carReach('baghdad', 'car-tourer').sort().join() === 'hamadan,kermanshah,khanaqin,tehran', 'a tourer in Baghdad reaches only the Persian road');
ok(carReach('baghdad', 'car-desert').includes('jaffa'), 'the desert car in Baghdad can reach Jaffa');
// winter: mud in the desert, snow on the passes some days
const wd = carRoute('damascus', 'baghdad', 'car-desert', WINTER).route!;
ok(Math.abs(wd.hours - Math.round(((30 + DESERT_MUD_HOURS) / 1.15) * 2) / 2) < 0.01, `winter mud adds hours to the desert (${wd.hours} h)`);
let shutDay = -1;
for (let d = 270; d < 400 && shutDay < 0; d++) if (passShut(d, 'lebanon')) shutDay = d;
ok(shutDay > 0, `snow shuts the Lebanon some winter day (day ${shutDay})`);
if (shutDay > 0) {
  const r = carRoute('beirut', 'damascus', 'car-tourer', shutDay);
  ok(!!r.route && r.route.stops.length > 2 && r.route.hours > 3.5, `and then Beirut to Damascus goes the long way round (${r.route?.stops.join('>')})`);
}
let persiaDay = -1;
for (let d = 270; d < 400 && persiaDay < 0; d++) if (passShut(d, 'persia')) persiaDay = d;
ok(persiaDay > 0, `snow shuts the Persian passes some winter day (day ${persiaDay})`);
if (persiaDay > 0) {
  const r = carRoute('baghdad', 'kermanshah', 'car-tourer', persiaDay);
  ok(!r.route && /Snow has shut the Persian passes/.test(r.why ?? ''), 'and then Baghdad to Kermanshah is refused with a line about snow');
}
let summerShut = 0;
for (let d = 60; d < 200; d++) if (passShut(d, 'lebanon') || passShut(d, 'persia')) summerShut++;
ok(summerShut === 0, 'no snow on the passes from May to September');

// ---- who and what fits ----
const tourer = CAR_BY_ID['car-tourer'], lorry = CAR_BY_ID['car-lorry'];
ok(carFit(tourer, { people: 4, animals: {} }, 2).ok, 'four people and two rugs fit the tourer');
ok(carFit(tourer, { people: 5, animals: {} }, 0).why === 'Seats for 4: you are 5', 'five do not: "Seats for 4"');
ok(carFit(tourer, { people: 1, animals: {} }, 3).why === 'Room for 2 rugs: you carry 3', 'three rugs do not fit the tourer');
ok(carFit(tourer, { people: 1, animals: { falahi: 2 } }, 0).why === 'Your camels cannot ride: leave them or walk', 'camels cannot ride');
ok(carFit(tourer, { people: 1, animals: { falahi: 0 } }, 0).ok, 'a camel count of nought is no camel');
ok(carFit(lorry, { people: 2, animals: {} }, 20).ok && !carFit(lorry, { people: 3, animals: {} }, 0).ok, 'the lorry: 20 rugs, two seats');

// ---- cost ----
ok(carCost(tourer, t('cairo', 'suez').route!) === 4 * tourer.perHour, 'Cairo to Suez costs four hours of petrol');
ok(carCost(CAR_BY_ID['car-desert'], desert!) === Math.round(desert!.hours * 25) + DESERT_PAPERS, 'the desert crossing adds £5 of papers');
// what can go wrong
const never = rollTrip(tourer, t('cairo', 'suez').route!, 10000, () => 0.99);
ok(never.delay === 0 && never.repair === 0 && never.toll === 0, 'a lucky drive: nothing happens');
const bad = rollTrip(CAR_BY_ID['car-desert'], desert!, 10000, () => 0.01);
ok(bad.delay >= 2 && bad.delay <= 6 && bad.repair >= 50 && bad.repair <= 300 && bad.toll > 0 && bad.toll <= 3000, `an unlucky crossing: ${bad.delay} h lost, ${bad.repair} PT repair, ${bad.toll} PT toll`);
ok(rollTrip(CAR_BY_ID['car-desert'], desert!, 0, () => 0.01).toll === 0, 'raiders take nothing from an empty purse');

// ---- buying, selling and driving through the store ----
const base = useGame.getState();
const at = (id: string) => { const s = SETTLEMENTS.find((x) => x.id === id)!; return { at: id, x: s.x, y: s.y }; };
const reset = (town: string, cash: number) => useGame.setState({
  cash, car: undefined, carNamed: undefined, reputation: 10, inventory: [], ledger: [], day: SUMMER,
  world: { ...base.world, ...at(town), party: { ...base.world.party, animals: {}, flock: {}, troops: {} } },
} as Partial<GameState>);
const g = () => useGame.getState();

reset('damascus', 100000);
ok(/not sold/.test(g().buyCar('car-tourer')) && !g().car, 'no garage in Damascus');
reset('cairo', 10000);
ok(/You have/.test(g().buyCar('car-tourer')) && !g().car && g().cash === 10000, 'cannot buy without the money');
reset('cairo', 100000);
g().buyCar('car-saloon');
ok(g().car?.model === 'car-saloon' && g().car?.at === 'cairo' && g().cash === 55000, 'bought the Bellmont Saloon in Cairo for £450');
ok(g().reputation === 15 && g().carNamed === true, 'a man with a motor car: reputation +5');
ok(g().ledger.some((l) => l.amount === -45000 && /Motor garage/.test(l.label)), 'a ledger line for the purchase');
ok(/Sell it first/.test(g().buyCar('car-tourer')) && g().car?.model === 'car-saloon', 'one car at a time');
g().sellCar();
ok(!g().car && g().cash === 55000 + 45000 * RESALE, 'sold back at 60%');
g().buyCar('car-saloon');
ok(g().reputation === 15, 'the reputation is given only once');
g().sellCar();

// drive Giza ... from Cairo to Suez in a tourer
reset('cairo', 50000);
g().buyCar('car-tourer');
const before = g().cash;
let res = g().driveCar('jaffa');
ok(!res.ok && /No motor road/.test(res.text), 'no road to Jaffa from Cairo');
useGame.setState({ world: { ...g().world, party: { ...g().world.party, animals: { falahi: 1 } } } } as Partial<GameState>);
res = g().driveCar('suez');
ok(!res.ok && /camels cannot ride/.test(res.text), 'camels stop the drive');
useGame.setState({ world: { ...g().world, party: { ...g().world.party, animals: {} } } } as Partial<GameState>);
res = g().driveCar('suez');
ok(res.ok && res.stops.join('>') === 'cairo>suez' && res.hours >= 4, `drive to Suez (${res.ok ? res.hours : 0} h)`);
ok(before - g().cash >= 4 * tourer.perHour, 'petrol paid');
ok(g().car?.at === 'cairo', 'the car is on the road: still booked at Cairo until it arrives');
g().arriveAt('suez');
g().carArrived('suez');
ok(g().car?.at === 'suez' && g().car?.trips === 1, 'after the drive the car stands in Suez, one drive made');
// left behind: you take the train back to Cairo, the car stays in Suez
g().arriveAt('cairo');
res = g().driveCar('giza');
ok(!res.ok && /Your car is in Suez/.test(res.text), 'from Cairo, the car is in Suez: no drive');
ok(/Your car is in Suez/.test(g().sellCar()) && !!g().car, 'and it cannot be sold from Cairo');

// the saloon: arrive rested
reset('beirut', 100000);
useGame.setState({ condition: { fatigue: 70, dependence: 0 } } as Partial<GameState>);
g().buyCar('car-saloon');
res = g().driveCar('damascus');
ok(res.ok, 'saloon: Beirut to Damascus');
g().arriveAt('damascus');
g().carArrived('damascus');
ok(g().condition?.fatigue === 0, 'the saloon arrives rested');

// the desert car and its papers
reset('baghdad', 200000);
g().buyCar('car-desert');
const c0 = g().cash;
res = g().driveCar('damascus');
ok(res.ok && g().ledger.some((l) => l.label === 'Desert papers for the car' && l.amount === -DESERT_PAPERS), 'desert papers paid for the crossing');
ok(c0 - g().cash >= DESERT_PAPERS, 'and charged');
g().arriveAt('damascus');
g().carArrived('damascus');
ok(g().car?.at === 'damascus', 'the desert car stands in Damascus');

// a lorry: twenty rugs, but not three people
reset('cairo', 100000);
g().buyCar('car-lorry');
ok(g().driveCar('suez').ok, 'the lorry drives with you alone');

// shipping the car
reset('jaffa', 100000);
g().buyCar('car-six');
const c1 = g().cash;
g().shipCar('beirut');
ok(g().car?.at === 'beirut' && c1 - g().cash === CAR_FREIGHT, 'the car shipped from Jaffa to Beirut for £4');

// old saves: no car field at all is fine
reset('cairo', 1000);
ok(g().car === undefined && !g().driveCar('suez').ok, 'without a car nothing is offered');

console.log(fails ? `${fails} FAILED` : 'ALL OK');
process.exit(fails ? 1 : 0);
