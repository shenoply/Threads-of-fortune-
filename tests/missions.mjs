// The story missions as scenes: each ends on a scene with a choice once you have done what it asked,
// and the reward and the chosen outcome are paid together. Selim's cousins finish on the road.
//   node --import ./tests/_nohmr.mjs tests/missions.mjs
import { chromium } from 'playwright';
import { BASE, SHOTS } from './_env.mjs';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
let ok = true; const check = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) ok = false; };
const has = (sel) => p.locator(sel).count();
const storeUrl = () => p.evaluate(() => performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/game/state/store.ts')) ?? '/src/game/state/store.ts');
const st = async (fn, arg) => p.evaluate(async ([u, f, a]) => { const m = await import(u); return new Function('m', 'a', `return (${f})(m, a)`)(m, a); }, [await storeUrl(), fn.toString(), arg]);
await p.goto(BASE);
await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'), localStorage.setItem('tof-skip-chapters', '1')));
await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]'); await p.waitForTimeout(1500);
await st((m) => { m.useGame.setState({ tutorial: { done: true, step: 'done', inspected: true }, cash: 10000, levelUps: [], titleNews: [], missionNews: undefined }); });
const only = async (id, extra) => st((m, a) => { const s = m.useGame.getState(); const missions = { ...s.missions }; for (const k of ['alexandria', 'beasts', 'farid', 'rival', 'ambush', 'cudgel', 'auction', 'shepheards', 'warrant', 'canopy', 'weaver', 'warrant2']) missions[k] = 'done'; missions[a.id] = 'active'; m.useGame.setState({ missions, missionNews: undefined, missionScene: undefined, encounter: null, ...(a.extra ?? {}) }); }, { id, extra });

// Farid's verdict: a scene with three ways to end it
await only('farid');
await st((m) => { const s = m.useGame.getState(); if (!s.inventory.some((i) => i.typeId === 'fayoum-hearth')) m.useGame.setState({ inventory: [...s.inventory, { uid: 'start-fh', typeId: 'fayoum-hearth', condition: 'Worn', restored: false, provenance: 'Likely', paid: 0, stored: false }] }); m.useGame.setState({ world: { ...m.useGame.getState().world, appraised: ['start-fh'] } }); });
await p.waitForSelector('[data-testid=mission-scene][data-mission=farid]', { timeout: 5000 });
await p.screenshot({ path: `${SHOTS}/missions-farid.png` });
check((await p.locator('.mscene-choice').count()) === 3, 'Farid\'s verdict: a scene and three ways to end it');
const rep0 = await st((m) => m.useGame.getState().reputation);
await p.click('[data-testid=scene-keep]'); await p.waitForTimeout(300);
let s = await st((m) => { const g = m.useGame.getState(); const fh = g.inventory.find((i) => i.typeId === 'fayoum-hearth'); return { done: g.missions.farid, rep: g.reputation, framed: fh?.framed, prov: fh?.provenance, news: g.missionNews, told: g.missionTold?.farid }; });
check(s.done === 'done' && s.rep >= rep0 + 7 && s.framed && s.prov === 'Documented', `kept and framed, documented, reward paid (${s.rep - rep0} reputation)`);
check(s.news === 'farid-done' && /card/.test(s.told ?? ''), 'the mission-done line tells how it ended');

// Selim's last throw: after the sales, one more scene
await only('rival', { stats: { rivalSales: 6 } });
await p.waitForSelector('[data-testid=mission-scene][data-mission=rival]', { timeout: 5000 });
await p.click('[data-testid=scene-expose]'); await p.waitForTimeout(300);
s = await st((m) => { const g = m.useGame.getState(); return { done: g.missions.rival, shamed: g.selimShamed }; });
check(s.done === 'done' && s.shamed, 'Selim shown up in front of the lane: done, and his family will remember');

// Selim's cousins: the mission ends when they have been met on the road, however it went
await only('ambush');
await st((m) => m.useGame.setState({ cousins: 'won', missionTold: { ambush: 'Mahmoud Kassab and his cousins are scattered across the Suez road.' } }));
await p.waitForTimeout(400);
s = await st((m) => { const g = m.useGame.getState(); return { done: g.missions.ambush, news: g.missionNews }; });
check(s.done === 'done' && s.news === 'ambush-done', 'the cousins met on the road: the mission is done');

// Shepheard's: in Cairo with a Fine rug, the lady sees you
await only('shepheards');
const uid = await st((m) => { const s0 = m.useGame.getState(); const it = { uid: 'fine1', typeId: 'damascus-blue', condition: 'Good', restored: false, provenance: 'Likely', paid: 800, stored: false }; m.useGame.setState({ inventory: [...s0.inventory, it], world: { ...s0.world, at: 'cairo' } }); return it.uid; });
await p.waitForSelector('[data-testid=mission-scene][data-mission=shepheards]', { timeout: 5000 });
await p.screenshot({ path: `${SHOTS}/missions-shepheards.png` });
const c0 = await st((m) => m.useGame.getState().cash);
await p.click('[data-testid=scene-fair]'); await p.waitForTimeout(300);
s = await st((m, u) => { const g = m.useGame.getState(); return { done: g.missions.shepheards, cash: g.cash, has: g.inventory.some((i) => i.uid === u) }; }, uid);
check(s.done === 'done' && s.cash > c0 && !s.has, `the rug sold to the lady at a fair price (+${s.cash - c0})`);

// the camel mark: Umm Salah, and her granddaughter
await only('weaver', { world: { ...(await st((m) => m.useGame.getState().world)), at: 'fayoum' } });
await p.waitForSelector('[data-testid=mission-scene][data-mission=weaver]', { timeout: 5000 });
await p.click('[data-testid=scene-family]'); await p.waitForTimeout(300);
s = await st((m) => { const g = m.useGame.getState(); return { done: g.missions.weaver, known: g.household?.known ?? [], fav: g.household?.suitors?.amira?.favour ?? 0 }; });
check(s.done === 'done' && s.known.includes('amira') && s.fav >= 25, 'Umm Salah talks of your father; Amira\'s family takes to you');

// the cudgel: done only when their leader is taken alive after the mission began
await only('cudgel', { missionStart: { cudgel: 5 } });
await st((m) => { const g = m.useGame.getState(); const c = g.combat ?? { wins: 0, losses: 0, xp: {}, rifles: 0, spare: 0, prisoners: [], leaders: {} }; m.useGame.setState({ combat: { ...c, leaders: { ...c.leaders, rb0: { name: 'Abdel-Al the Cudgel', temper: 'cautious', bounty: 200, status: 'jailed', gen: 0 } }, leaderDay: { rb0: 6 } } }); });
await p.waitForTimeout(400);
check(await st((m) => m.useGame.getState().missions.cudgel) === 'done', 'the man with the cudgel taken alive: done');

check(errs.length === 0, `no page errors ${errs.join(' | ')}`);
console.log(ok ? 'ALL OK' : 'SOME FAILED');
await b.close();
process.exit(ok ? 0 : 1);
