// Epithets: won past a mark with a journal line and a toast, opposites push each other out, a
// greater name replaces its lesser one, and an older save gets what it deserves without the toast.
//   npx tsx tests/epithets.ts
const A = await import('../src/game/audio/engine');
for (const k of ['sfx', 'mood', 'music', 'ambience', 'ensure']) if (typeof (A.audio as unknown as Record<string, unknown>)[k] === 'function') (A.audio as unknown as Record<string, unknown>)[k] = () => false;
const S = await import('../src/game/state/store');
const EP = await import('../src/data/epithets');
const { useGame } = S;
const g = () => useGame.getState();
const set = (x: Partial<ReturnType<typeof g>>) => useGame.setState(x);
let fails = 0;
const check = (ok: unknown, msg: string) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) fails++; };

check(EP.EPITHETS.length >= 10 && EP.EPITHETS.length <= 18, `${EP.EPITHETS.length} epithets`);
for (const e of EP.EPITHETS) if (e.against) check(EP.EPITHET[e.against]?.against === e.id, `${e.id} and ${e.against} oppose each other both ways`);

g().newGame?.();
set({ started: true, levelUps: [], titleNews: [], epithets: [], epithetQuiet: undefined });
const base = g().manner;
check((g().epithets ?? []).length === 0, 'a new game has no epithet');

set({ manner: { ...base, honesty: 45 } });
check(g().epithets?.includes('sadiq'), 'honesty 45 wins al-Sadiq');
check(g().titleNews.includes('ep:sadiq'), 'and it is announced');
check(g().journal.some((j) => /al-Sadiq/.test(j.text)), 'and written in the journal');
check(EP.wornEpithet(g().epithets, g().epithetWorn)?.id === 'sadiq', 'and worn');

set({ manner: { ...g().manner, honesty: -20 }, stats: { ...g().stats, liesOk: 9 } });
check(g().epithets?.includes('fahlawi') && !g().epithets?.includes('sadiq'), 'al-Fahlawi pushes al-Sadiq out');
check(g().journal.some((j) => /No one in the bazaar calls you al-Sadiq/.test(j.text)), 'the loss is written down');

set({ combat: { ...g().combat, wins: 6 } as never });
check(g().epithets?.includes('nabbut'), 'six fights: Abu Nabbut');
g().wearEpithet('nabbut');
check(g().epithetWorn === 'nabbut', 'can choose to wear Abu Nabbut');
set({ combat: { ...g().combat, wins: 16 } as never });
check(g().epithets?.includes('futuwwa') && !g().epithets?.includes('nabbut'), 'sixteen fights: al-Futuwwa replaces Abu Nabbut');
check(g().epithetWorn === undefined && EP.wornEpithet(g().epithets, g().epithetWorn)?.id === 'futuwwa', 'the worn one falls back to the latest');
set({ day: g().day });
check(!g().epithets?.includes('nabbut'), 'Abu Nabbut is not won back');

// an older save: quiet
set({ epithets: [], titleNews: [], epithetQuiet: true });
set({ day: g().day });
check((g().epithets ?? []).length >= 2 && !g().titleNews.some((t) => t.startsWith('ep:')), 'an older save gets its names without a toast');
check(!g().epithetQuiet, 'and the quiet flag clears');

// other people's marks
check(EP.buyerMarks({ patience: 30, trust: 20, embellishNotice: 0.6 }).length === 3, 'a sharp, wary, impatient buyer shows three marks');
console.log(fails ? `\n${fails} failed` : '\nall passed');
process.exit(fails ? 1 : 0);
