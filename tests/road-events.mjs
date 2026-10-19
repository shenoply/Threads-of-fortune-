// Road stories: a walk Cairo to Suez at 4x with happenings forced through the test hook (window.__tofRoad).
// A passing one shows as the notice and never as a card; a choice card shows, a choice works, a card left
// alone settles itself and goes; the caravan never stops for any of it, and no overlay opens.
// Also: the first walk of a new game gets nothing on its own (walks counter), and every outcome is in the journal.
import { chromium } from 'playwright';
import { PORT, SHOTS } from './_env.mjs';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const out = []; let ok = true; const check = (c, m) => { out.push(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) ok = false; };
const has = async (s) => (await p.locator(s).count()) > 0;
const G = () => p.evaluate(async () => { const m = await import(performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/game/state/store.ts')) ?? '/src/game/state/store.ts'); const s = m.useGame.getState(); return { x: s.world.x, y: s.world.y, cash: s.cash, water: s.condition?.water, journal: s.journal.slice(-6).map((j) => j.text), road: s.roadStories, journey: !!s.journey, at: s.world.at }; });
await p.goto(`http://localhost:${PORT}/`);
await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'), localStorage.setItem('tof-fullscreen', 'off'))); await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]'); await p.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.started === true; } catch { return false; } }, null, { timeout: 10000 }).catch(() => {});
await p.evaluate(() => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); const s = d.state; s.tutorial = { done: true, step: 'done', inspected: true }; s.introSeen = ['malek', 'arran', 'abuhamid', 'bilgin-chess', 'rashid', 'nabil', 'cohen']; s.cash = 900; s.world.known.push('suez', 'sinai'); s.world.party.food = 40; s.condition = { ...(s.condition || {}), fatigue: 10, fed: 80, water: 95 }; Object.assign(s.world, { at: 'cairo', hour: 7, x: 214.3, y: 413.7, parties: [] }); (window.__tofEdit = true, localStorage.setItem(k, JSON.stringify(d)), window.__tofEdit = false, (() => { const w = Storage.prototype.setItem; if (w.__hold) return; const h = function (key, v) { if (key === 'threads-of-fortune-save' && !window.__tofEdit) return; return w.call(this, key, v); }; h.__hold = true; Storage.prototype.setItem = h; setTimeout(() => { if (Storage.prototype.setItem === h) Storage.prototype.setItem = w; }, 4000); })()); localStorage.setItem('tof-skip-chapters', '1'); localStorage.setItem('tof-night-rule', 'march'); });
await p.reload(); if (await has('[data-testid=continue]')) await p.click('[data-testid=continue]'); await p.waitForTimeout(600);
await p.click('[data-testid=nav-map]'); await p.waitForTimeout(400);
if (await has('[data-testid=district-world]')) await p.click('[data-testid=district-world]');
await p.evaluate(() => window.dispatchEvent(new CustomEvent('tof:plan-trip', { detail: 'suez' }))); await p.waitForTimeout(500); await p.locator('[data-testid=travel]').dispatchEvent('click');
await p.locator('[data-testid=speed-4]').dispatchEvent('click');
await p.waitForTimeout(600);
const g0 = await G();
check(g0.road?.walks === 1, `the walk is counted as the first of the game (${g0.road?.walks})`);
check(!(await has('[data-testid=road-event]')), 'nothing happens on its own on the first walk');

// the caravan must keep moving through everything below
// two still readings in a row (the page can run slowly on a busy machine) count as a halt
let last = g0, halts = 0, overlays = 0, stillRun = 0;
const moving = async () => { const g = await G(); const moved = Math.abs(g.x - last.x) + Math.abs(g.y - last.y) > 0.0005; last = g; stillRun = !moved && g.journey ? stillRun + 1 : 0; if (stillRun === 2) { halts++; out.push(`  still at ${g.x.toFixed(3)},${g.y.toFixed(3)} card=${await has('[data-testid=road-event]')}`); } if (await has('.overlay')) overlays++; return g; };
const force = (id) => p.evaluate((id) => window.__tofRoad(id), id);

// 1. a passing happening: a notice, no card
check(await force('dust-devil'), 'the test hook takes an event id');
let flash = '';
for (let i = 0; i < 20 && !/dust devil/.test(flash); i++) { await p.waitForTimeout(150); if (await has('[data-testid=road-flash]')) flash = (await p.locator('[data-testid=road-flash]').textContent().catch(() => '')) || ''; }
check(/dust devil/.test(flash), `a passing happening shows as the notice (${flash.slice(0, 80)})`);
check(!(await has('[data-testid=road-event]')), 'a passing happening asks nothing');
await p.screenshot({ path: `${SHOTS}/road-flash.png` });
await p.waitForTimeout(300); await moving();

// 2. a card with a choice: shows, the caravan walks on, a choice works
const before = await G();
await force('pilgrims-water');
await p.waitForSelector('[data-testid=road-event]', { timeout: 8000 }).catch(() => {});
check(await has('[data-testid=road-event]'), 'a choice shows as a card in the world card');
await p.screenshot({ path: `${SHOTS}/road-card.png` });
await p.waitForTimeout(700);
const mid = await moving();
check(Math.abs(mid.x - before.x) + Math.abs(mid.y - before.y) > 0.01 && await has('[data-testid=stop]'), 'the caravan keeps walking while the card is up');
await p.locator('[data-testid=road-choice-give]').dispatchEvent('click').catch((e) => out.push('  give: ' + e.message.split('\n')[0]));
await p.waitForTimeout(300);
const after = await G();
check(!(await has('[data-testid=road-event]')), 'the card goes once a choice is made');
check(after.water < before.water, `sharing water costs water (${before.water} → ${after.water})`);
check(after.journal.some((t) => /pilgrims/.test(t) && /blesses/.test(t)), 'the outcome is written in the journal');
flash = (await p.locator('[data-testid=road-flash]').textContent().catch(() => '')) || '';
check(/blesses|skins/.test(flash), `the outcome shows as a notice (${flash.slice(0, 60)})`);

// 3. a card left alone: settles with its default and goes, the caravan never stopping
const c0 = await G();
await force('wedding-bread');
await p.waitForSelector('[data-testid=road-event]', { timeout: 8000 }).catch(() => {});
check(await has('[data-testid=road-event]'), 'a second card shows');
let gone = false;
for (let i = 0; i < 120 && !gone; i++) { await p.waitForTimeout(250); await moving(); gone = !(await has('[data-testid=road-event]')); if (!(await G()).journey) break; }
const c1 = await G();
check(gone, 'a card left alone settles itself and goes');
check(c1.cash === c0.cash, 'the default spends nothing');
check(c1.journal.some((t) => /wedding/.test(t) && /drums/.test(t)), 'the default outcome is in the journal');

// 4. a shorter way: time saved moves the caravan along
await force('bedouin-guide');
await p.waitForSelector('[data-testid=road-event]', { timeout: 8000 }).catch(() => {});
check(await has('[data-testid=road-choice-pay]'), 'a paid choice is offered when you can pay');
await p.locator('[data-testid=road-choice-pay]').dispatchEvent('click').catch(() => {});
await p.waitForTimeout(300);
const gb = await G();
check(gb.journal.some((t) => /Tarabin/.test(t)), 'the guide is in the journal');

check(halts === 0, `the caravan never stopped (${halts} still checks)`);
check(overlays === 0, 'no overlay opened');
for (let i = 0; i < 400 && (await G()).journey; i++) await p.waitForTimeout(250);
const end = await G();
check(end.at === 'suez', `arrived in Suez (${end.at})`);

// 5. pacing on its own: a later walk (back to Cairo) brings some happenings, never more than about one a day
await p.evaluate(async () => { const m = await import(performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/game/state/store.ts')) ?? '/src/game/state/store.ts'); const s = m.useGame.getState(); m.useGame.setState({ roadStories: { lastAt: -999, recent: [], walks: 5 }, world: { ...s.world, party: { ...s.world.party, food: 40 } } }); });
for (const t of ['leave-settlement']) await p.click(`[data-testid=${t}]`, { timeout: 1500 }).catch(() => {});
const j0 = (await p.evaluate(async () => { const m = await import(performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/game/state/store.ts')) ?? '/src/game/state/store.ts'); const s = m.useGame.getState(); return { n: s.journal.length, day: s.day }; }));
await p.evaluate(() => window.dispatchEvent(new CustomEvent('tof:plan-trip', { detail: 'cairo' }))); await p.waitForTimeout(500); await p.locator('[data-testid=travel]').dispatchEvent('click').catch(() => {});
await p.locator('[data-testid=speed-4]').dispatchEvent('click').catch(() => {});
await p.waitForTimeout(1500); last = await G(); stillRun = 0;
let cards = 0, wasCard = false;
for (let i = 0; i < 900; i++) { const g = await moving(); if (!g.journey && g.at) break; const c = await has('[data-testid=road-event]'); if (c && !wasCard) cards++; wasCard = c; await p.waitForTimeout(150); }
const j1 = await p.evaluate(async () => { const m = await import(performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/game/state/store.ts')) ?? '/src/game/state/store.ts'); const s = m.useGame.getState(); return { day: s.day, at: s.world.at, road: s.journal.filter((j) => j.kind === 'road').map((j) => j.text), all: s.journal.length }; });
const ROAD = /dust devil|Water shines|noon heat|scorpion|Jackals|Camel Corps|police patrol|axle|goes lame|girth strap|funeral|red rag|walks with you|muleteer|herdsman|pilgrims|wedding|pedlar|Tarabin|A bale|sheikh|water-carrier|laban|dervish|canal bridge|village loom|tamarisk/;
const happened = j1.road.filter((t) => ROAD.test(t)).length - 4; // the four forced on the way out
const days = j1.day - j0.day + 1;
out.push(`  back to Cairo: ${days} day(s) on the calendar, ${happened} happening(s), ${cards} card(s), arrived ${j1.at}`);
check(happened >= 1, 'a later walk brings at least one happening on its own');
check(happened <= days, 'never more than about one a day');
check(halts === 0, `still no halts (${halts})`);
console.log(out.join('\n')); console.log(ok && !errs.length ? 'PASS' : 'FAIL', errs);
await b.close();
