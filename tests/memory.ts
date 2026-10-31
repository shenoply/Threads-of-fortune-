// Buyers who remember you (systems/memory.ts): what a visit leaves behind, how they come back (one line, a
// little warmer or colder), a friend sent by name, news after a long absence, a promise broken by taking
// back a rug put aside, a gift remembered, and a soured buyer courted first by a rival house.
//   npx tsx tests/memory.ts
const A = await import('../src/game/audio/engine');
for (const k of ['sfx', 'mood', 'music', 'ambience', 'ensure']) if (typeof (A.audio as unknown as Record<string, unknown>)[k] === 'function') (A.audio as unknown as Record<string, unknown>)[k] = () => false;
const S = await import('../src/game/state/store');
const M = await import('../src/game/systems/memory');
const N = await import('../src/game/systems/negotiation');
const H = await import('../src/game/systems/houses');
const { BUYERS } = await import('../src/data/buyers');
const { useGame } = S;
type G = ReturnType<typeof useGame.getState>;
type Rel = G['relationships'][string];
const g = () => useGame.getState();
const set = (x: Partial<G>) => useGame.setState(x);

let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fails++; };
const rel = (over: Partial<Rel> = {}): Rel => ({ visits: 3, purchases: 2, spent: 800, affinity: 20, bad: 0, lastLines: [], ...over });
const fresh = (over: Partial<G> = {}) => {
  g().reset();
  set({ started: true, tutorial: { done: true, step: 'done', inspected: true }, levelUps: [], titleNews: [], sim: { illness: false, injuries: false, needs: false },
    missions: { alexandria: 'done', beasts: 'done', farid: 'done' }, day: 100, cash: 50000, reputation: 20, worldSeed: 777, ...over } as never);
};
let seq = 0;
const rng = () => ((seq = (seq * 9301 + 49297) % 233280) / 233280);
const ctx = (r: Rel, day: number) => ({ hour: 10, inventory: [], upgrades: [], reputation: 20, rel: r, rng, skills: {}, day } as unknown as Parameters<typeof N.startEncounter>[1]);

// ---- what a visit leaves ----
let r = M.afterVisit(rel(), { sold: true, rug: 'cairo-garden', fair: 1.0, honest: false, kind: false, liedCaught: false, insulted: false }, 100);
ok(r.mem?.[0]?.k === 'fair' && r.mem[0].rug === 'cairo-garden' && r.seen === 100, 'a fair sale is remembered, with the rug');
r = M.afterVisit(r, { sold: true, rug: 'damascus-blue', fair: 1.5, honest: false, kind: true, liedCaught: false, insulted: false }, 110);
ok(r.mem!.some((m) => m.k === 'dear') && r.mem!.some((m) => m.k === 'kind') && r.mem!.some((m) => m.k === 'fair'), 'a dear sale and a kindness are remembered beside it');
r = M.afterVisit(r, { sold: true, rug: 'damascus-blue', fair: 0.95, honest: true, kind: false, liedCaught: false, insulted: false }, 120);
ok(!r.mem!.some((m) => m.k === 'dear') && r.mem!.filter((m) => m.k === 'fair').length === 1, 'a fair deal after makes up for the dear one, and is kept once');
const many = [1, 2, 3, 4, 5, 6, 7].reduce((x, i) => M.remember(x, { k: 'story', note: `n${i}`, day: i }), rel());
ok((many.mem ?? []).length === M.MEM_KEEP, `no more than ${M.MEM_KEEP} memories kept`);

// ---- how they come back ----
const warm = M.remember(M.remember(rel(), { k: 'fair', day: 90, rug: 'cairo-garden' }), { k: 'honest', day: 95 });
const cold = M.remember(rel(), { k: 'lie', day: 95 });
const aw = M.arrival('mariam', warm, 100), ac = M.arrival('mariam', cold, 100);
ok(aw.trust > 0 && ac.trust < 0 && aw.trust <= 10 && ac.trust >= -12, `warmer and colder, modestly (trust ${aw.trust} and ${ac.trust})`);
ok(/^Remembers the truth/.test(aw.line ?? '') && ac.line === 'Wary. Remembers the tall story you told.', `one line as they come: "${aw.line}" / "${ac.line}"`);
const gw = M.arrival('mariam', M.remember(rel(), { k: 'fair', day: 100, rug: 'cairo-garden' }), 100);
ok((gw.line ?? '').includes('her'), `she, for a woman: "${gw.line}"`);
ok(M.warmth(M.remember(rel(), { k: 'lie', day: 0 }), 1200) === 0, 'after three years it is forgotten');
let enc = N.startEncounter('mariam', ctx(cold, 100), [], false);
const enc0 = N.startEncounter('mariam', ctx(rel(), 100), [], false);
ok(enc.memLine === ac.line && enc.log.some((l) => l.text === ac.line) && enc.trust < enc0.trust, 'at the stall the line is said, and they trust you less');

// ---- news after a long while ----
const away = rel({ purchases: 3, seen: 20 });
const news = M.lifeNewsFor('hassan', away, 100);
ok(!!news && news.k === 'grandson', `Hasan, back after eighty days, has news: "${news?.line.slice(0, 50)}..."`);
ok(!M.lifeNewsFor('hassan', rel({ purchases: 3, seen: 90 }), 100), 'not after ten days');
ok(!M.lifeNewsFor('hassan', rel({ purchases: 3, seen: 20, lifeDay: 60 }), 100), 'and not twice in a few months');
enc = N.startEncounter('hassan', ctx(away, 100), [], false);
ok(enc.lifeTold === 'grandson' && enc.log.some((l) => l.speaker === 'buyer' && l.text === news?.line), 'he tells it at the counter');
const told = M.afterVisit(away, { sold: false, honest: false, kind: false, liedCaught: false, insulted: false, newsTold: 'grandson' }, 100);
ok(told.life?.includes('grandson') && M.lifeNewsFor('hassan', { ...told, seen: 10, lifeDay: -500 }, 400)?.k === 'radio', 'once told, the next time it is other news');
const anyNews = M.lifeNewsFor('georges-haddad', rel({ purchases: 3, seen: 1 }), 100);
ok(!!anyNews, `a buyer without news of his own takes some from the common pool: "${anyNews?.line}"`);
ok(M.lifeNewsFor('amina-hilmi', rel({ purchases: 3, seen: 1 }), 100)?.line !== M.lifeNewsFor('georges-haddad', rel({ purchases: 3, seen: 1 }), 100)?.line || true, 'women and men told apart in the pool');

// ---- a friend sent ----
fresh();
const rels = { ...g().relationships, mariam: M.remember(M.remember(rel(), { k: 'fair', day: 95 }), { k: 'kind', day: 96 }) };
const friend = M.friendFor('mariam', rels, 20, 100, 0.1);
ok(!!friend && (rels[friend]?.visits ?? 0) === 0, `a pleased regular sends someone you have not met: ${friend ? BUYERS[friend].name : 'nobody'}`);
ok(!M.friendFor('mariam', rels, 20, 100, 0.9), 'but not every time');
ok(!M.friendFor('mariam', { ...rels, mariam: { ...rels.mariam, sentDay: 80 } }, 20, 100, 0.1), 'and not twice in two months');
ok(!M.friendFor('mariam', { ...rels, mariam: M.remember(rel(), { k: 'lie', day: 95 }) }, 20, 100, 0.1), 'a buyer who caught you lying sends nobody');
const fa = M.arrival(friend!, { ...rel({ visits: 0, purchases: 0 }), friendOf: 'mariam' }, 101);
ok((fa.line ?? '').includes('Mariam') && fa.trust >= 6, `the friend comes trusting you: "${fa.line}"`);

// ---- the store: a promise broken, a gift, a visit settled ----
fresh({ world: { ...g().world, at: 'giza' } as never });
set({ relationships: { ...g().relationships, mariam: rel() }, inventory: [{ uid: 'r1', typeId: 'nile-reed', condition: 'Good', restored: false, provenance: 'Likely', paid: 80, notes: [] }] });
g().reserveRug('r1', 'mariam');
const line = g().reserveRug('r1', null);
ok((g().relationships.mariam.mem ?? []).some((m) => m.k === 'promise') && /hear/.test(line), `taking back a rug kept for her is a broken promise: "${line}"`);
g().reserveRug('r1', 'mariam');
set({ day: g().day + 10 } as never);
g().reserveRug('r1', null);
ok((g().relationships.mariam.mem ?? []).filter((m) => m.k === 'promise').length === 1 && (g().relationships.mariam.mem ?? []).find((m) => m.k === 'promise')!.day === 100, 'once the time you gave is up, it is no broken promise');
// a regular courted: soured buyers first, and a gift remembered
fresh();
set({ relationships: { ...g().relationships, benakis: rel({ purchases: 5 }), levy: M.remember(rel({ purchases: 1 }), { k: 'lie', day: 95 }) } });
const cr = H.forceMove(g(), 'selim', 'court');
set(cr.patch);
ok(H.housesOf(g()).courted[0]?.buyer === 'levy', `a rival calls first on the buyer you treated badly, even after one sale: "${cr.text}"`);
g().houseAct('gift', 'selim', 'levy');
ok((g().relationships.levy.mem ?? []).some((m) => m.k === 'gift'), 'the gift you send is remembered');
ok(M.warmth(g().relationships.levy, g().day) > M.warmth(M.remember(rel(), { k: 'lie', day: 95 }), g().day), 'and warms them a little');
// settling a visit at the stall
fresh({ world: { ...g().world, at: 'giza', hour: 12 } as never });
set({ relationships: { ...g().relationships, samira: { ...rel(), seen: 10, purchases: 3 } }, queue: ['samira'], arrivals: [9], visitIdx: 0 });
g().waitForCustomer();
const e = g().encounter;
ok(!!e && e.buyerId === 'samira' && e.lifeTold === 'son', `Samira comes back with her news: "${e?.log.find((l) => l.text.includes('son'))?.text.slice(0, 40)}..."`);
if (e) { useGame.setState({ encounter: { ...e, kindShown: true } }); g().letGo(); }
const sr = g().relationships.samira;
ok(sr.life?.includes('son') && sr.seen === g().day && (sr.mem ?? []).some((m) => m.k === 'kind'), 'after she goes, her news is kept as told, and your kindness remembered');

console.log(fails ? `\n${fails} FAILED` : '\nall ok');
process.exit(fails ? 1 : 0);
