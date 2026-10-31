// Your animals by name: bought, sold, stabled and taken back as themselves; miles make an old friend who
// carries a little more; a mare and a stallion at one stable have a foal on their own; nothing takes an
// animal away (hunger, robbers); prize animals and the camel race.
//   npx tsx tests/animals.ts
const A = await import('../src/game/audio/engine');
for (const k of ['sfx', 'mood', 'music', 'ambience', 'ensure', 'stopMusic', 'stopVoice', 'fightResult', 'encounterOver']) (A.audio as unknown as Record<string, unknown>)[k] = () => false;
const { useGame } = await import('../src/game/state/store');
const { capacity, animalCount } = await import('../src/game/systems/caravan');
const { isFriend, isYoung, animalWorth, ageWords, FRIEND_MILES } = await import('../src/game/systems/herd');
const { BREEDS } = await import('../src/data/animals');

let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fails++; };
const st = () => useGame.getState();
const herd = () => st().world.party.herd ?? [];
const counts = () => st().world.party.animals;
const matches = () => Object.entries(counts()).every(([b, n]) => herd().filter((a) => a.breed === b).length === n) && herd().every((a) => (counts()[a.breed] ?? 0) > 0);
const at = (town: string) => useGame.setState({ world: { ...st().world, at: town } });

useGame.setState({ started: true, cash: 5_000_000, reputation: 80, world: { ...st().world, at: 'giza', party: { ...st().world.party, troops: { guard: 6 }, food: 200 } } });

// ---- named on purchase ----
st().trade('bishari', 1); st().trade('bishari', 1); st().trade('baladi_d', 1); st().trade('maghrabi', 1);
ok(herd().length === 4 && matches(), `four bought, four named: ${herd().map((a) => `${a.name} (${BREEDS[a.breed].name}, ${a.sex}, ${ageWords(a, st().day)}, ${a.temper})`).join('; ')}`);
ok(new Set(herd().map((a) => a.name)).size === 4, 'no two share a name');
ok(herd().every((a) => !isYoung(a, st().day)), 'a dealer sells grown animals');

// ---- rename ----
const first = herd()[0];
st().renameAnimal(first.id, '  Bint  Sahra ');
ok(herd().find((a) => a.id === first.id)?.name === 'Bint Sahra', 'you can give one a name of your own');

// ---- sell: by breed (the newest goes) and by name ----
const donkeyId = herd().find((a) => a.breed === 'baladi_d')!.id;
const cash0 = st().cash;
st().sellAnimal(donkeyId);
ok(!herd().some((a) => a.id === donkeyId) && st().cash > cash0 && matches(), `sold by name: ${cash0 < st().cash ? `+${st().cash - cash0} pt` : ''}`);
st().trade('baladi_d', 1); st().trade('baladi_d', -1);
ok(matches(), 'bought and sold by breed: names still match the counts');

// ---- the stable: the same animal goes in and comes out ----
const keep = herd().find((a) => a.name === 'Bint Sahra')!;
st().stableNamed(keep.id);
ok((st().stableHerd?.giza ?? []).some((a) => a.id === keep.id) && !herd().some((a) => a.id === keep.id) && matches(), 'Bint Sahra is left at the Giza stable by name');
st().fetchStabled();
ok(herd().some((a) => a.id === keep.id && a.name === 'Bint Sahra') && matches(), 'and taken back as herself');

// ---- miles: an old friend carries a little more ----
const cap0 = capacity(st().world.party);
useGame.setState({ world: { ...st().world, at: null, x: 800, y: 470 } });
let x = 800;
for (let i = 0; i < 40 && !herd().every(isFriend); i++) { x += 12; st().travelStep({ x, y: 470 }, 0.02, true); }
ok(herd().every(isFriend), `after ${Math.round(herd()[0].miles)} miles every animal is an old friend (at ${FRIEND_MILES})`);
ok(capacity(st().world.party) > cap0, `old friends carry a little more: ${cap0} → ${capacity(st().world.party)} loads`);
ok(st().journal.some((j) => /old friend/.test(j.text)), `the journal says so: "${st().journal.find((j) => /old friend/.test(j.text))?.text}"`);

// ---- nothing takes an animal away ----
const n0 = animalCount(st().world.party);
useGame.setState({ world: { ...st().world, at: null, party: { ...st().world.party, food: 0 } } });
for (let i = 0; i < 8; i++) st().endDay();
ok(animalCount(st().world.party) === n0, `eight hungry days on the road: still ${n0} animals`);
for (let i = 0; i < 12; i++) st().robBroke();
ok(animalCount(st().world.party) === n0, 'robbed twelve times: they never take an animal');
ok(typeof (st() as unknown as Record<string, unknown>).butcherAnimal === 'undefined', 'there is no butchering an animal');

// ---- breeding at a stable, on its own ----
useGame.setState({ world: { ...st().world, at: 'cairo', party: { ...st().world.party, food: 200 } } });
st().trade('arabian', 1); st().trade('arabian', 1);
const [h1, h2] = herd().filter((a) => a.breed === 'arabian');
useGame.setState({ world: { ...st().world, party: { ...st().world.party, herd: herd().map((a) => (a.id === h1.id ? { ...a, sex: 'f' as const, name: 'Kuhaila', born: st().day - 6 * 365 } : a.id === h2.id ? { ...a, sex: 'm' as const, name: 'Antar', born: st().day - 7 * 365 } : a)) } } });
st().stableNamed(h1.id); st().stableNamed(h2.id);
const mare = () => (st().stableHerd?.cairo ?? []).find((a) => a.id === h1.id);
ok(!!mare() && (st().stableHerd?.cairo ?? []).some((a) => a.id === h2.id), 'a mare and a stallion left at the Cairo stable');
const skip = (n: number) => { for (let i = 0; i < n; i++) { useGame.setState({ world: { ...st().world, party: { ...st().world.party, food: 200 } } }); st().endDay(); useGame.setState({ dayOver: false }); } };
skip(25);
ok(mare()?.due !== undefined, `after some weeks together she is in foal, due day ${mare()?.due}: "${st().journal.find((j) => /in foal/.test(j.text))?.text}"`);
skip((mare()?.due ?? st().day) - st().day + 1);
const foal = (st().stableHerd?.cairo ?? []).find((a) => a.dam === 'Kuhaila');
ok(!!foal && (st().stabled?.cairo?.animals.arabian ?? 0) === 3, `the foal is born at the stable and counted: ${foal?.name}, ${foal ? ageWords(foal, st().day) : ''}`);
ok(st().journal.some((j) => /has given birth/.test(j.text)), `"${st().journal.find((j) => /has given birth/.test(j.text))?.text}"`);
if (foal) {
  const base = BREEDS.arabian.price;
  ok(isYoung(foal, st().day) && animalWorth(foal, st().day, base) < animalWorth(foal, st().day + 3 * 365, base), `a young one is worth more as it grows: ${animalWorth(foal, st().day, base)} → ${animalWorth(foal, st().day + 3 * 365, base)}`);
}

// ---- a prize animal: dear, talked about, bought back by a notable's groom ----
const { PRIZE_ANIMALS, RACE_STAKE } = await import('../src/data/animals');
const { runRace, raceMerit } = await import('../src/game/systems/herd');
at('bedouin');
const rep0 = st().reputation, c1 = st().cash;
const pmsg = st().buyPrize();
const prize = herd().find((a) => a.prize);
ok(!!prize && prize.breed === PRIZE_ANIMALS.bedouin.breed && st().reputation > rep0 && matches(), `a prize she-camel at the Bedouin camp: ${prize?.name}, ${c1 - st().cash} pt. "${pmsg}"`);
ok(st().buyPrize().startsWith('Nothing of that quality'), 'one a season');

// ---- the camel race: enter if you like; a loss costs the stake, never the camel ----
const before = animalCount(st().world.party), c2 = st().cash;
const r = st().enterRace(prize!.id);
ok(!!r && r.field.length === 6 && animalCount(st().world.party) === before, `${prize!.name} runs ${r?.place} of 6 (merit ${raceMerit(prize!, st().day).toFixed(1)}): "${r?.text}"`);
ok(st().cash - c2 >= -RACE_STAKE, 'the most a race costs is the stake');
ok(st().enterRace(prize!.id) === null, 'one race a week');
// over many races a fine camel wins more often than a baggage camel
const wins = (a: typeof prize) => { let w = 0; for (let i = 0; i < 300; i++) if (runRace(a!, st().day, `t${i}`).place === 1) w++; return w; };
const bag = { ...prize!, breed: 'maghrabi', prize: undefined, miles: 0 };
ok(wins(prize) > wins(bag) + 30, `a prize Bishari wins ${wins(prize)} of 300, a Maghrabi baggage camel ${wins(bag)}`);
at('cairo');
const c3 = st().cash;
st().sellAnimal(prize!.id);
ok(st().cash - c3 > BREEDS.bishari.price, `a notable's groom pays ${st().cash - c3} pt for her in Cairo`);

console.log(fails ? `${fails} FAILED` : 'ALL OK');
process.exit(fails ? 1 : 0);
