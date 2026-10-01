// Malek's rules without the browser: hours, stock, meal caps and no stacking, parcels, the visit
// picture never repeating when it need not, his lines not repeating, and the five-stage story.
//   npx tsx tests/malek-rules.ts
import { malekItem } from '../src/data/malekMenu';
import { MALEK_LINES, TAB_PLATES, malekGreeting, tabCovers, topicCtx, MALEK_START, STORY, availability, eatServing, malekLine, nightMeters, parcelDays, pickScene, storyComplete, storyReady, storyStageFor, wellFedNow, type MalekStory, type StoryStage } from '../src/game/systems/malek';

let fails = 0;
const ok = (cond: boolean, what: string) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${what}`); if (!cond) fails++; };

// hours and stock
const kofta = malekItem('malek_kofta'), ful = malekItem('malek_ful'), stew = malekItem('malek_stew'), kebab = malekItem('malek_kebab');
ok(!availability(kofta, 9, 1, MALEK_START).ok, 'no kofta before the grill is lit (09:00)');
ok(availability(kofta, 12, 1, MALEK_START).ok, 'kofta at noon');
ok(!availability(kofta, 20.5, 1, MALEK_START).ok, 'no kofta with a cold grill (20:30)');
ok(availability(ful, 8, 1, MALEK_START).ok && !availability(ful, 11.5, 1, MALEK_START).ok, 'ful in the morning only');
ok(!availability(stew, 12, 3, MALEK_START).ok && availability(stew, 12, 4, MALEK_START).ok, 'stew rotates (not day 3, yes day 4)');
const soldOut = { ...MALEK_START, stockDay: 5, sold: { malek_kebab: 4 } };
ok(!availability(kebab, 12, 5, soldOut).ok && availability(kebab, 12, 6, soldOut).ok, 'kebab sells out for the day and restocks the next');
ok(!availability(malekItem('malek_tea'), 22, 1, MALEK_START).ok, 'closed at 22:00');

// meals: caps and no stacking
const now = 5 * 24 + 12;
let { c, report } = eatServing({ fatigue: 30, dependence: 0, fed: 80, water: 50 }, kofta, now);
ok(c.fed === 100 && report.fed.gain === 20 && report.fed.wasted === 45, `fed capped at 100, overflow reported (gain ${report.fed.gain}, wasted ${report.fed.wasted})`);
ok(c.fatigue === 22, `kofta takes 8 off fatigue (${c.fatigue})`);
ok(wellFedNow(c, now + 1) === 4 && wellFedNow(c, now + 4.1) === 0, 'well fed +4 for four hours, then gone');
const second = eatServing(c, kofta, now + 1);
ok(second.c.fatigue === 22 && second.report.rest.gain === 0, 'a second kofta in the window gives no more energy');
ok(second.c.wellFed?.value === 4 && second.c.wellFed?.until === c.wellFed?.until, 'and does not extend or stack well fed');
const better = eatServing(c, kebab, now + 2);
ok(better.c.fatigue === 20 && better.c.wellFed?.value === 6 && better.c.wellFed?.until === c.wellFed?.until, 'a better meal tops up only the difference and keeps the same end time');
let t = eatServing({ fatigue: 10, dependence: 0 }, malekItem('malek_tea'), now);
const t2 = eatServing(t.c, malekItem('malek_tea'), now + 1);
ok(t.c.fatigue === 8 && t2.c.fatigue === 8, 'tea energy once per four hours');
const zero = eatServing({ fatigue: 1, dependence: 0, water: 3 }, malekItem('malek_bastirma'), now);
ok(zero.c.fatigue === 0 && zero.c.water === 0, 'fatigue and water clamp at 0');
let cc: typeof c = { fatigue: 50, dependence: 0, fed: 0 };
for (let i = 0; i < 30; i++) cc = eatServing(cc, kebab, now + i * 0.1).c;
ok(cc.fatigue === 40 && cc.fed === 100, `thirty kebabs in a row: fatigue only 50 -> ${cc.fatigue}, fed capped at ${cc.fed}`);

// night
const n1 = nightMeters({ fatigue: 20, dependence: 0, fed: 70, water: 30 }, { onRoad: true, provisions: false });
ok(n1.skipRation === 1 && n1.c.fed === 10, 'fed at nightfall skips your ration, then the meter drops');
ok(n1.thirsty && n1.c.fatigue === 26, 'thirsty on the road with empty sacks adds fatigue');
let road = { fatigue: 20, dependence: 0, water: 70 } as Parameters<typeof nightMeters>[0]; let thirstyNights = 0;
for (let i = 0; i < 30; i++) { const n = nightMeters(road, { onRoad: true, provisions: true }); road = { ...n.c, fatigue: 20 }; if (n.thirsty) thirstyNights++; }
ok(thirstyNights === 0, `thirty road nights with provisions and no salt: never thirsty (water ${road.water})`);
let salty = { fatigue: 20, dependence: 0, water: 70 } as Parameters<typeof nightMeters>[0]; let saltyNight = 0;
for (let i = 0; i < 9 && !saltyNight; i++) { for (let k = 0; k < 2; k++) salty = eatServing(salty, malekItem('malek_road_pack'), 100 + i * 24 + k * 5).c; const n = nightMeters(salty, { onRoad: true, provisions: true }); salty = n.c; if (n.thirsty) saltyNight = i + 1; }
ok(saltyNight > 0 && saltyNight <= 4, `two salted parcels a day on the road: thirsty by night ${saltyNight}`);
const n2 = nightMeters({ fatigue: 20, dependence: 0, fed: 10, water: 10 }, { onRoad: false, provisions: true });
ok(n2.skipRation === 0 && !n2.thirsty && n2.c.water === 60, 'in town you drink; hungry means the ration is drawn');

// parcels
ok(parcelDays(malekItem('malek_road_pack'), 1) === 7 && parcelDays(malekItem('malek_road_pack'), 100) === 5, 'seven days of (game) freshness, five in summer');

// pictures
ok(pickScene(20.5, 'closing', 3) === 'closing', 'closing is the only picture after 20:00');
let rep = 0; let last: ReturnType<typeof pickScene> | undefined;
for (let i = 0; i < 40; i++) { const sc = pickScene(13, last, i); if (sc === last) rep++; last = sc; }
ok(rep === 0, 'no immediate repeat at midday across 40 visits');

// lines
const said: string[] = [];
let catchRuns = 0;
for (let i = 0; i < 30; i++) { const l = malekLine('greetMidday', said, i); if (said.length && /^(Ha\b|Bah\b|Now what\?)/.test(l) && /^(Ha\b|Bah\b|Now what\?)/.test(said[said.length - 1])) catchRuns++; said.push(l); }
ok(catchRuns === 0, 'never two catchphrase lines in a row');
ok(said.every((l, i) => i === 0 || l !== said[i - 1]), 'never the same line twice running');

// greetings: the most pressing thing first
const g = (m: Partial<typeof MALEK_START>, o: Partial<{ day: number; hour: number; fed: number; fatigue: number; salt: number }> = {}) => malekGreeting({ ...MALEK_START, visits: 3, lastVisitDay: 9, ...m }, { day: 10, hour: 13, fed: 50, fatigue: 10, salt: 1, ...o }).ctx;
ok(g({ visits: 0 }) === 'greetFirst', 'first visit');
ok(g({}, { fed: 10 }) === 'greetHungry' && g({}, { fatigue: 60 }) === 'greetTired', 'hungry, then tired, show on your face');
ok(g({ stallOutcome: 'sold', rug: 'x', stallNoted: false }) === 'greetRug' && g({ stallOutcome: 'walked', stallNoted: false }) === 'greetNoSale', 'he mentions how his stall visit went');
ok(g({ stallOutcome: 'walked', stallNoted: true }) === 'greetMidday', '...only once');
ok(g({ lastVisitDay: 2 }) === 'greetAway', 'away for days');
ok(g({}, { hour: 8 }) === 'greetMorning' && g({}, { hour: 19 }) === 'greetEvening', 'by the hour');
ok(topicCtx('rugs', MALEK_START) === 'rugsWant' && topicCtx('rugs', { ...MALEK_START, rug: 'x' }) === 'rugsHave', 'rug talk depends on whether he bought one');
const total = Object.values(MALEK_LINES).reduce((n, l) => n + l.length, 0);
const catchy = Object.values(MALEK_LINES).flat().filter((l) => /^(Ha\b|Bah\b|Now what\?)/.test(l)).length;
ok(total >= 100 && catchy / total < 0.12, `${total} lines, catchphrase openers ${catchy} (${Math.round((catchy / total) * 100)}%)`);
ok(tabCovers(kofta) && !tabCovers(kebab) && !tabCovers(malekItem('malek_road_pack')) && TAB_PLATES === 3, 'his tab covers eat-in plates except the kebab, not parcels');

// story: off while art is missing
ok(storyReady(), 'every stage has its art: the story is on');
ok(storyStageFor(MALEK_START.story, 10, { introduced: false }) === null, 'never on the very first visit');
ok(storyStageFor(MALEK_START.story, 10, { introduced: true }) === 1, 'stage 1 on a later visit');
ok(storyStageFor(MALEK_START.story, 10, { introduced: true, customerMet: false }) === null, 'stage 1 waits until Nabil has come to your stall');
ok(storyReady(STORY.map((st) => (st.n === 2 ? { ...st, art: null } : st))) === false, 'a stage without art switches the whole story off');
// with art for every stage (as it will be), the machine runs one stage a day, in order
const art: StoryStage[] = STORY.map((s) => ({ ...s, art: s.art ?? `test-${s.n}.webp` }));
let st: MalekStory = { ...MALEK_START.story };
ok(storyStageFor(st, 3, { introduced: false, stages: art }) === null, 'stage 1 waits until you know the shop');
const s1 = storyStageFor(st, 3, { introduced: true, stages: art });
ok(s1 === 1, 'stage 1 offered');
st = { ...st, pending: 1 };
ok(storyStageFor(st, 3, { introduced: true, stages: art }) === 1, 'dismissed: the same stage is offered again (pending)');
st = storyComplete(st, 1, 3);
ok(st.nextStage === 2 && st.lastStoryDay === 3 && st.completed.join() === '1' && st.pending == null, 'completing commits stage, day and next together');
ok(storyComplete(st, 1, 3).completed.join() === '1', 'completing it again changes nothing');
ok(storyStageFor(st, 3, { introduced: true, stages: art }) === null, 'no second stage on the same day');
ok(storyStageFor(st, 9, { introduced: true, stages: art }) === 2, 'after days away, only the next stage (not all missed ones)');
for (let d = 4, n = 2; n <= 5; d++, n++) st = storyComplete({ ...st, pending: n }, n, d + 6);
ok(st.nextStage === 6 && st.completed.join() === '1,2,3,4,5', 'all five done');
ok(storyStageFor(st, 40, { introduced: true, stages: art }) === null, 'the story does not loop');
ok(storyComplete(st, 3, 50).completed.length === 5, 'an out-of-order completion is ignored');

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
