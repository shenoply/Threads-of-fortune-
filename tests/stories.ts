// The stories (systems/stories.ts, data/stories.ts): every tale walked down every branch, each choice taken
// at least once; the effects that last (money, reputation, rivals, buyers' memories, carpets, epithets);
// how the tales open, run two at a time, come by letter, Courier, stall and town; a beat left unanswered;
// a deadline missed; the Stories list; the save migration.
//   npx tsx tests/stories.ts
const A = await import('../src/game/audio/engine');
for (const k of ['sfx', 'mood', 'music', 'ambience', 'ensure']) if (typeof (A.audio as unknown as Record<string, unknown>)[k] === 'function') (A.audio as unknown as Record<string, unknown>)[k] = () => false;
const S = await import('../src/game/state/store');
const ST = await import('../src/game/systems/stories');
const D = await import('../src/data/stories');
const H = await import('../src/game/systems/houses');
const EP = await import('../src/data/epithets');
const { skipDays } = await import('../src/game/testerHook');
const { useGame } = S;
type G = ReturnType<typeof useGame.getState>;
const g = () => useGame.getState();
const set = (x: Partial<G>) => useGame.setState(x);

let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fails++; };
const fresh = (over: Partial<G> = {}) => {
  g().reset();
  set({ started: true, tutorial: { done: true, step: 'done', inspected: true }, levelUps: [], titleNews: [], sim: { illness: false, injuries: false, needs: false },
    missions: { alexandria: 'done', beasts: 'done', farid: 'done' }, day: 40, cash: 200000, reputation: 30, worldSeed: 12345,
    labUnlocked: ['fibre'], knotTally: { tries: 3, close: 1 }, ...over } as never);
};
/** a plain copy of the state without the actions */
const snap = (): G => Object.fromEntries(Object.entries(g()).filter(([, v]) => typeof v !== 'function')) as G;

// ---- the tales ----
ok(D.ARCS.length === 5, `${D.ARCS.length} stories`);
for (const a of D.ARCS) {
  const beats = Object.values(a.beats);
  ok(beats.length >= 3 && beats.length <= 9, `${a.title}: ${beats.length} beats`);
  ok(beats.every((b) => b.choices.filter((c) => !c.hidden || c.id === b.lapse).length >= 1 && b.choices.length >= 2), `${a.title}: every beat offers two or three choices`);
  ok(new Set(beats.map((b) => b.via)).size >= 2, `${a.title}: told through ${[...new Set(beats.map((b) => b.via))].join(', ')}`);
  for (const b of beats) for (const c of b.choices) ok(!/\b(delve|tapestry|testament|vibrant|realm)\b/i.test(c.label), `${a.id}.${b.id}.${c.id}: plain words`);
}

// ---- every branch ----
// walk each tale from its first beat, taking every choice the beat shows; the next beat is brought at once
type Path = string[];
const seen = new Set<string>();
const endings = new Map<string, string[]>();
const been = new Set<string>();
function walk(s0: G, arc: string, path: Path, depth: number) {
  if (depth > 16) { ok(false, `${arc}: a path runs too long: ${path.join(' > ')}`); return; }
  const st = ST.storiesOf(s0);
  const run = st.runs[arc];
  if (!run) { ok(false, `${arc}: no run`); return; }
  if (run.status === 'done') { endings.set(arc, [...(endings.get(arc) ?? []), `${path.join(' > ')} = ${run.end}`]); return; }
  let s = s0;
  if (run.shown === undefined) {
    // bring the next beat now (skip the days between)
    const r = ST.forceStory({ ...s, day: Math.max(s.day, run.at) } as G, arc, 'advance');
    s = { ...s, day: Math.max(s.day, run.at), ...r.patch } as G;
  }
  const p = ST.pendingAll(s).find((x) => x.arc.id === arc);
  if (!p) { ok(false, `${arc}: nothing pending after ${path.join(' > ')}`); return; }
  // the same beat with the same flags has been walked from here before
  const key = `${s.worldSeed}:${arc}:${p.beat.id}:${JSON.stringify(p.run.flags)}:${p.c.s.inventory.length}`;
  if (been.has(key)) return;
  been.add(key);
  const views = ST.choicesOf(p);
  if (!views.length) { ok(false, `${arc}.${p.beat.id}: no choice shown`); return; }
  for (const v of views) {
    seen.add(`${arc}.${p.beat.id}.${v.id}`);
    if (v.blocked) { ok(false, `${arc}.${p.beat.id}.${v.id} blocked: ${v.blocked}`); continue; }
    const r = ST.storyChoose(s, arc, v.id);
    if (!r.msg) { ok(false, `${arc}.${p.beat.id}.${v.id}: no answer`); continue; }
    walk({ ...s, ...r.patch } as G, arc, [...path, `${p.beat.id}:${v.id}`], depth + 1);
  }
}
for (const seed of [12345, 12346, 12347]) for (const a of D.ARCS) {
  // Hasan and Yusuf known at the stall; the rivals all trading; a few rugs in the store
  fresh({ worldSeed: seed, day: a.id === 'antaki' ? 1800 : 200 } as never);
  set({ relationships: { ...g().relationships, hassan: { visits: 3, purchases: 2, spent: 600, affinity: 20, bad: 0, lastLines: [] }, yusuf: { visits: 3, purchases: 2, spent: 700, affinity: 20, bad: 0, lastLines: [] } },
    inventory: [...g().inventory, { uid: 'plain1', typeId: 'nile-reed', condition: 'Good', restored: false, provenance: 'Likely', paid: 80, notes: [], stored: true }] });
  const r = ST.forceStory(g(), a.id, 'start');
  walk({ ...snap(), ...r.patch } as G, a.id, [], 0);
}
// every choice anywhere is reachable, except one kept for the lapse alone
// (the deadline's beat, and what you say when the carpet is gone, are walked below)
const ASIDE = new Set(['museum.late.apologise', 'museum.late.ship', 'museum.deliver.sorry']);
for (const a of D.ARCS) for (const b of Object.values(a.beats)) for (const c of b.choices) {
  if (ASIDE.has(`${a.id}.${b.id}.${c.id}`)) continue;
  if (b.lapse === c.id && c.hidden && (() => { try { return c.hidden!({ f: {}, g: {}, marks: [] } as never) === true; } catch { return false; } })()) continue;
  ok(seen.has(`${a.id}.${b.id}.${c.id}`), `${a.id}.${b.id}.${c.id} taken on some path`);
}
for (const [arc, es] of endings) ok(new Set(es.map((e) => e.split(' = ')[1])).size >= 3, `${arc}: ${new Set(es.map((e) => e.split(' = ')[1])).size} different endings over ${es.length} paths`);

// ---- what lasts ----
const pickPath = (arc: string, picks: string[], over: Partial<G> = {}) => {
  fresh(over);
  set(ST.forceStory(g(), arc, 'start').patch);
  for (const id of picks) {
    const run = ST.storiesOf(g()).runs[arc];
    if (run.status === 'done') break;
    if (run.shown === undefined) { set({ day: Math.max(g().day, run.at) } as never); set(ST.forceStory(g(), arc, 'advance').patch); }
    const msg = g().storyAct(arc, id);
    if (!msg) { ok(false, `${arc}: could not choose ${id}`); break; }
  }
};
// 1. exposing the forgery: name, Selim's temper, Hollister remembers, the epithet
pickPath('forgery', ['look', 'expose']);
ok(g().reputation === 33 && H.housesOf(g()).list.selim.mood === -3 && (g().relationships.hollister?.mem ?? []).some((m) => m.k === 'story'), 'exposing Selim: reputation +3, Selim sore, Mr Hollister remembers');
ok((g().epithets ?? []).includes('amin'), `and the bazaar calls you al-Amin (${(g().epithets ?? []).join(', ')})`);
let run = ST.storiesOf(g()).runs.forgery;
ok(run.beat === 'thanks' && run.shown === undefined && run.at === g().day + 3, 'Hollister\'s letter comes in three days');
skipDays(3);
const letter = g().post?.letters.find((l) => l.story?.arc === 'forgery');
ok(!!letter && ST.storiesOf(g()).runs.forgery.shown !== undefined, `it comes by post: "${letter?.title}"`);
g().storyAct('forgery', 'museum');
ok(ST.storiesOf(g()).flags.museumFriend === true, 'asking for the museum is remembered for later');
// 1b. buying the fake: a carpet in the store, aged, with the story's key
pickPath('forgery', ['arran', 'buy']);
const fake = g().inventory.find((i) => i.story === 'mamluk-fake');
ok(!!fake && fake.fakeAge === true && fake.provenance === 'Disputed', 'buying Selim\'s fake puts it in your store, aged and disputed');
ok(ST.storiesOf(g()).runs.forgery.picks[0].choice === 'arran' && g().ledger.some((l) => l.label.includes('Arran')), 'Arran\'s opinion cost twenty piastres, and the choice is kept');
// 2. the smuggling: a later beat remembers the forgery
pickPath('forgery', ['look', 'expose']);
set(ST.forceStory(g(), 'bale', 'start').patch);
const offer = ST.pendingAll(g()).find((p) => p.arc.id === 'bale')!;
ok(offer.beat.via === 'stall' && ST.beatText(offer).includes('honest man'), 'Stavrou\'s man knows you exposed Selim');
ok(ST.pendingAt(g(), 'stall').length === 1 && ST.pendingAt(g(), 'town', 'portsaid').length === 0, 'he waits at the stall');
g().storyAct('bale', 'agree');
ok(ST.pendingAt(g(), 'town', 'portsaid').length === 1, 'the bale waits on Port Said\'s town menu');
const yp = H.housesOf(g()).list.yanni.purse;
g().storyAct('bale', 'open'); g().storyAct('bale', 'coastguard');
ok(H.housesOf(g()).list.yanni.purse < yp && H.housesOf(g()).list.yanni.mood === -5 && Number(ST.storiesOf(g()).flags.patrol) > g().day, 'the Coastguard raid costs Stavrou, he is furious, and the patrols go out');
// 4. the wedding: whom you sell to changes who comes back
pickPath('wedding', ['promise', 'yusuf'], { relationships: { ...g().relationships } });
const hm = g().relationships.hassan?.mem ?? [];
ok(hm.some((m) => m.k === 'promise'), 'selling Hasan\'s promised carpet to Yusuf: Hasan remembers the broken promise');
ok(H.housesOf(g()).courted.some((c) => c.buyer === 'hassan' && c.by === 'selim'), 'and Selim calls on Hasan');
ok((g().relationships.yusuf?.mem ?? []).some((m) => m.k === 'story'), 'Yusuf remembers the Tabriz');
// 5. the slump: Antaki opens only after the crash
fresh({ day: 1500 } as never);
ok(!D.ARCS.find((a) => a.id === 'antaki')!.unlock(g(), 1500), 'the house of Antaki waits for the slump');
ok(D.ARCS.find((a) => a.id === 'antaki')!.unlock(g(), 1780), 'and comes after the crash of October 1929');
pickPath('antaki', ['partner'], { day: 1780 } as never);
skipDays(8);
ok(g().ledger.some((l) => l.label.includes('share of the week') && l.amount === 600), 'a partnership pays on Mondays');

// ---- how they open and run ----
fresh({ day: 25, reputation: 9 } as never);
set({ stories: ST.freshStories(1) });
skipDays(20);
ok(Object.keys(ST.storiesOf(g()).runs).length >= 1 && Object.values(ST.storiesOf(g()).runs).every((r) => r.started - 1 >= ST.START_GAP || r.started >= 30), `the first tale opens by itself once your name allows (${Object.keys(ST.storiesOf(g()).runs).join(', ')})`);
fresh({ day: 400, reputation: 40 } as never);
set({ stories: ST.freshStories(1) });
skipDays(40);
const on = Object.values(ST.storiesOf(g()).runs).filter((r) => r.status === 'on').length;
ok(on >= 1 && on <= ST.MAX_ON, `no more than two run at once (${on})`);
// an unanswered beat is answered for you
fresh();
set(ST.forceStory(g(), 'forgery', 'start').patch);
skipDays(22);
run = ST.storiesOf(g()).runs.forgery;
ok(run.status === 'done' && run.picks[0].choice === 'leave' && H.housesOf(g()).list.selim.purse > H.HOUSE.selim.purse, `left unanswered, the Muski decides: "${run.end}"`);
// a deadline missed
pickPath('museum', ['advance', 'damascus', 'buy'], { worldSeed: 12345 } as never);
set({ stories: { ...ST.storiesOf(g()), runs: { ...ST.storiesOf(g()).runs, museum: { ...ST.storiesOf(g()).runs.museum, flags: { ...ST.storiesOf(g()).runs.museum.flags, genuine: true } } } } });
set({ day: Number(ST.storiesOf(g()).runs.museum.flags.deadline) } as never);
skipDays(2);
run = ST.storiesOf(g()).runs.museum;
ok(run.beat === 'late' && run.shown !== undefined, 'Mrs Ashby sails without her carpet when the day passes');
ok(ST.choicesOf(ST.pendingAll(g()).find((p) => p.arc.id === 'museum')!).map((c) => c.id).join() === 'apologise,ship', 'with a carpet in hand you may send it after her');
g().storyAct('museum', 'ship');
ok(ST.storiesOf(g()).runs.museum.status === 'done' && !g().inventory.some((i) => i.story === 'ashby-carpet'), 'and it goes to Boston');
pickPath('museum', ['accept', 'zaki', 'order']);
set({ inventory: g().inventory.filter((i) => i.story !== 'ashby-carpet') });
set({ day: ST.storiesOf(g()).runs.museum.at } as never); set(ST.forceStory(g(), 'museum', 'advance').patch);
ok(ST.choicesOf(ST.pendingAll(g()).find((p) => p.arc.id === 'museum')!).map((c) => c.id).join() === 'sorry', 'with the carpet sold meanwhile, you can only tell her so');
pickPath('museum', ['accept', 'zaki', 'leave']);
set({ day: Number(ST.storiesOf(g()).runs.museum.flags.deadline) } as never);
skipDays(2);
ok(ST.choicesOf(ST.pendingAll(g()).find((p) => p.arc.id === 'museum')!).map((c) => c.id).join() === 'apologise', 'with nothing found, an apology');
// the Courier carries a story's item
fresh();
set(ST.forceStory(g(), 'forgery', 'start').patch);
ok(ST.storyNews(g(), g().day).some((t) => t.includes('Mamluk')), 'the Courier prints the forgery');
// the Stories list
const list = ST.storyList(g());
ok(list.length === 1 && list[0].pending && /Courier/.test(list[0].where), `the Stories list: "${list[0]?.arc.title}: ${list[0]?.where}"`);

// ---- the save ----
fresh();
const saved = { ...snap() } as Record<string, unknown>;
delete saved.stories;
const mig = (useGame as unknown as { persist: { getOptions: () => { migrate: (p: unknown, v: number) => G } } }).persist.getOptions().migrate(saved, 31);
ok(!!mig.stories && Object.keys(mig.stories.runs).length === 0, 'an older save gets an empty book of stories');
ok(S.SAVE_VERSION >= 32, `save version ${S.SAVE_VERSION}`);
ok(EP.EPITHETS.some((e) => e.id === 'shaykh'), 'the stories add their epithets');

console.log(fails ? `\n${fails} FAILED` : '\nall ok');
process.exit(fails ? 1 : 0);
