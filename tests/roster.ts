// Your men by name always match the men you hired: hire, fight, death, promotion, dismissal, desertion and
// rehire, each checked against the troop counts kind by kind; the dead go to the Fallen list, not "home".
//   npx tsx tests/roster.ts
const A = await import('../src/game/audio/engine');
for (const k of ['sfx', 'mood', 'music', 'ambience', 'ensure', 'stopMusic', 'stopVoice', 'fightResult', 'encounterOver']) (A.audio as unknown as Record<string, unknown>)[k] = () => false;
const { useGame, combatOf } = await import('../src/game/state/store');
const { recruitPool } = await import('../src/game/systems/caravan');
const { rosterMatches, familySum } = await import('../src/game/systems/men');
const { POOL } = await import('../src/data/portraitPool');

let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fails++; };
const st = () => useGame.getState();
const men = () => combatOf(st()).men ?? [];
const fallen = () => combatOf(st()).fallen ?? [];
const troops = () => st().world.party.troops;
const count = (k: string) => troops()[k] ?? 0;
const named = (k: string) => men().filter((m) => m.kind === k).length;
const match = (what: string) => ok(rosterMatches(men(), troops()), `${what}: roster ${JSON.stringify(Object.fromEntries([...new Set(men().map((m) => m.kind))].map((k) => [k, named(k)])))} = counts ${JSON.stringify(Object.fromEntries(Object.entries(troops()).filter(([, n]) => n)))}`);

useGame.setState({ started: true, cash: 1_000_000, reputation: 80, world: { ...st().world, at: 'giza' } });
const hire = (town: string, troop: string, n: number) => {
  useGame.setState({ world: { ...st().world, at: town, hired: {} } });
  const pool = recruitPool(town, st().day, {}).find((r) => r.troop === troop);
  if (pool && pool.available >= n) st().recruit(troop, pool.key, n);
  else useGame.setState({ world: { ...st().world, party: { ...st().world.party, troops: { ...troops(), [troop]: count(troop) + n } } } });
};

// ---- hiring: the right kind, the right people, plain faces ----
hire('cairo', 'guard', 2); hire('bedouin', 'bedouin', 1); hire('giza', 'fellah', 3); hire('damascus', 'guard', 1);
match('two Cairo guards, a Bedouin rider, three village lads, a Damascus guard');
const face = (id: string) => POOL.find((p) => p.id === id);
ok(men().filter((m) => m.kind === 'bedouin').every((m) => face(m.face)?.region === 'bedouin'), `the Bedouin rider is a Bedouin: ${men().filter((m) => m.kind === 'bedouin').map((m) => m.name)}`);
const dam = men().find((m) => m.home === 'damascus');
ok(!!dam && dam.kind === 'guard' && face(dam.face)?.region === 'levant', `the guard hired in Damascus is a Syrian: ${dam?.name}`);
ok(men().every((m) => face(m.face)?.cls !== 'notable'), 'no hired man wears a notable\'s face');
ok(men().filter((m) => m.kind === 'fellah').every((m) => face(m.face)?.age === 'y' && face(m.face)?.cls === 'humble'), 'the village lads are young and plain');
ok(new Set(men().map((m) => m.face)).size === men().length, 'no two share a face');

// ---- a fight on the road: the dead are buried by name, never "sent home" ----
const band = { id: 'testband', kind: 'raiders', name: 'Robbers', size: 6, strength: 60, x: 300, y: 300, path: [{ x: 300, y: 300 }, { x: 300, y: 300 }], travelled: 0, speed: 0, home: { x: 300, y: 300 } };
useGame.setState({ world: { ...st().world, at: null, parties: [...st().world.parties, band as never] } });
let lostRoad = 0;
for (let i = 0; i < 6 && !lostRoad; i++) {
  const ids = men().map((m) => m.id), f0 = fallen().length, j0 = st().journal.length;
  const msg = st().partyChoice('testband', 'fight');
  lostRoad = ids.filter((id) => !men().some((m) => m.id === id)).length;
  if (lostRoad) {
    ok(fallen().length - f0 === lostRoad, `road fight: ${lostRoad} killed, ${fallen().length - f0} on the Fallen list (${fallen().slice(-lostRoad).map((f) => f.name).join(', ')})`);
    ok(msg.includes('You bury'), `the fight's account names them: "${msg.slice(msg.indexOf('Lost'))}"`);
    ok(!st().journal.slice(j0).some((j) => /goes home|go home/.test(j.text)), 'nobody killed is said to have gone home');
  }
  useGame.setState({ world: { ...st().world, parties: st().world.parties.map((p) => (p.id === 'testband' ? { ...p, cooldownUntil: 0 } : p)) } });
}
ok(lostRoad > 0, 'the road fight cost a man (seeded)');
match('after the road fight');

// ---- an ambush fight: named dead, then the counts drop, then a promotion ----
hire('giza', 'fellah', 2);
useGame.setState({ combat: { ...combatOf(st()), xp: { ...combatOf(st()).xp, fellah: 99 } } });
const f1 = fallen().length;
const victim = men().filter((m) => m.kind === 'guard').length;
st().menFight({ lost: { guard: 1 }, kills: 3, where: 'the Cairo to Suez road' });
st().ambushOutcome('rb0', { troopsLost: { guard: 1 }, theyLeave: true, text: '' });
ok(named('guard') === victim - 1 && fallen().length === f1 + 1 && fallen()[fallen().length - 1].kind === 'guard', `a guard falls in an ambush: ${fallen()[fallen().length - 1].name}, ${fallen()[fallen().length - 1].where}`);
match('after the ambush');
const lads = count('fellah'), guards = count('guard');
const out = st().clashAfter('rb0', { result: 'yield', kills: 3, size: 4 });
ok(count('fellah') < lads && count('guard') > guards, `promotion: ${lads - count('fellah')} lad(s) made guard. "${out.ups}"`);
match('after the promotion');

// ---- sending a man home: the one you chose, and only him ----
const pick = men().find((m) => m.kind === 'guard')!;
st().dismissMan(pick.id);
ok(!men().some((m) => m.id === pick.id), `${pick.name} sent home by name`);
match('after sending one man home');
hire('giza', 'fellah', 2);
st().dismiss('fellah', 1);
ok(count('fellah') === 1 && named('fellah') === 1, '"Send one home" lets one lad go');
match('after "send one home"');

// ---- hunger: a man walks, by name, once in the journal ----
useGame.setState({ world: { ...st().world, at: null, party: { ...st().world.party, food: 0, morale: 5 } } });
const j1 = st().journal.length, ids0 = men().map((m) => m);
st().endDay();
match('after a hungry night');
const walked = ids0.filter((m) => !men().some((x) => x.id === m.id));
ok(walked.length === 1, `a man walks off hungry: ${walked.map((m) => m.name)}`);
ok(walked.every((m) => JSON.stringify(st()).includes(m.name.split(' ')[0])) && !st().journal.slice(j1).some((j) => walked.some((m) => j.text.includes(`${m.name} takes his pay`))), 'he is named once, as the man who walked, not as one paid off');

// ---- rehire ----
hire('baghdad', 'guard', 1);
match('after rehiring in Baghdad');
ok(men().some((m) => m.home === 'baghdad' && m.kind === 'guard' && face(m.face)?.region === 'iraq'), `the Baghdad guard is an Iraqi: ${men().find((m) => m.home === 'baghdad')?.name}`);

// ---- the Fallen: their families can be paid ----
useGame.setState({ world: { ...st().world, at: 'cairo' } });
const i0 = fallen().findIndex((f) => !f.paid);
const cash0 = st().cash;
st().payFallen(i0);
ok(!!fallen()[i0].paid && cash0 - st().cash === familySum(fallen()[i0]), `the family of ${fallen()[i0].name} is paid ${familySum(fallen()[i0])} pt`);
ok(fallen().every((f) => f.face && f.joined !== undefined), 'every fallen man keeps his face and the day he joined');

console.log(fails ? `${fails} FAILED` : 'ALL OK');
process.exit(fails ? 1 : 0);
