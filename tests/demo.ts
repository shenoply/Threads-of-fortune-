// The Steam demo (src/game/demo.ts): only Giza, Cairo and Alexandria open; ships, the looms and the garages
// shut with "In the full game"; no main mission after Rashid's errand; the Mamluk carpet story from day 5;
// the closing card's moment after day 10; a demo save plays on in the full build (same format, the mark ignored).
//   npx tsx tests/demo.ts
const A = await import('../src/game/audio/engine');
for (const k of ['sfx', 'mood', 'music', 'ambience', 'ensure', 'stopMusic', 'stopVoice', 'fightResult', 'encounterOver']) (A.audio as unknown as Record<string, unknown>)[k] = () => false;
const D = await import('../src/game/demo');
const { useGame } = await import('../src/game/state/store');
const { cityLocked, lockNeeds, OPENING_TIP } = await import('../src/game/opening');
const { isOpen, newlyOpen, laterOf, ALL_OPEN, DEMO_SHUT } = await import('../src/game/unlocks');
const { storiesOf } = await import('../src/game/systems/stories');
const { demoDone } = await import('../src/game/demoEnd');

let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fails++; };
const st = () => useGame.getState();

ok(!D.DEMO, 'the full build is not the demo');
D.setDemo(true);

// a new game in the demo carries the mark
st().beginDayOne();
ok(st().demo === true, 'a game begun in the demo is marked demo');

// the opening, finished (as if the errand were done): towns
useGame.setState({ tipsSeen: [...(st().tipsSeen ?? []), OPENING_TIP, ALL_OPEN], missions: { alexandria: 'done' }, tutorial: { ...st().tutorial, done: true } });
ok(['giza', 'cairo', 'alexandria'].every((t) => !cityLocked(st(), t)), 'Giza, Cairo and Alexandria open');
ok(['tanta', 'portsaid', 'damascus', 'baghdad', 'jaffa'].every((t) => cityLocked(st(), t)), 'Tanta, Port Said, Damascus, Baghdad, Jaffa closed');
const L = lockNeeds(st(), 'damascus', 'Damascus');
ok(/in the full game/i.test(L.title) && !L.opening && L.items.length === 0, `the lock card says "${L.title}", no skip offer`);
ok(/in the full game/i.test(lockNeeds(st(), null, '').title), 'Persia: in the full game');

// systems
ok(!isOpen(st(), 'abroad') && !isOpen(st(), 'looms') && !isOpen(st(), 'garage'), 'ships, looms and garages shut even with everything else open');
ok(isOpen(st(), 'caravan') && isOpen(st(), 'auction'), 'the guard yard and the sale rooms open');
ok(laterOf('looms') === D.FULL_GAME, 'the looms say "In the full game."');
useGame.setState({ tipsSeen: (st().tipsSeen ?? []).filter((t) => t !== ALL_OPEN && t !== OPENING_TIP) });
ok(!newlyOpen(st()).some((n) => DEMO_SHUT.includes(n.k)), 'no "now open" line for what the demo keeps shut');

// the nights: no next mission, the story at day 5, the rival at work, the card after day 10
const rested = () => useGame.setState({ dayOver: false } as never);
for (let i = 0; i < 12 && st().day <= D.DEMO_DAYS; i++) { st().endDay(); rested(); }
ok(st().day === D.DEMO_DAYS + 1, `day ${st().day}: past the demo's ten days`);
ok(!Object.entries(st().missions ?? {}).some(([k, v]) => v === 'active' && ['beasts', 'farid', 'rival', 'ambush'].includes(k)), `no main mission after the errand (missions: ${JSON.stringify(st().missions)})`);
const fg = storiesOf(st()).runs.forgery;
ok(!!fg && fg.started === D.DEMO_STORY_DAY, `the Mamluk carpet began on day ${fg?.started}`);
ok(!!st().lane?.last, `Shukri across the lane: "${st().lane?.last?.text}"`);
ok(D.demoOver(st()), 'the closing card is due');
const done = demoDone(st());
ok(done.length >= 4 && done.some((t) => t.includes('Rashid')) && done.some((t) => t.includes('Mamluk')), `the card's lines:\n    ${done.join('\n    ')}`);

// the same save in the full build
D.setDemo(false);
ok(!D.demoOver(st()), 'the full build shows no closing card');
ok(!cityLocked(st(), 'damascus') && !cityLocked(st(), 'tanta'), 'the full build opens the map');
ok(isOpen(st(), 'abroad') && isOpen(st(), 'looms'), 'ships and looms open in the full build on the demo save');
const night = st().day; st().endDay(); rested();
ok(st().day === night + 1 && st().missions?.beasts === 'active', `the full build gives the next mission on the demo save (${JSON.stringify(st().missions)})`);

console.log(fails ? `\n${fails} FAILED` : '\nall ok');
process.exit(fails ? 1 : 0);
