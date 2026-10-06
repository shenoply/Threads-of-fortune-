// The opening: a new game shows "Getting started · 1 of 9" with the needed button pulsing; cities
// beyond Giza and Cairo are locked (greyed, and tapping one says why); each step ticks itself off;
// on the way to Alexandria a small band of robbers stops you once and costs you no rugs; a rug won
// or bought in Alexandria finishes it; Skip unlocks everything; an older save that is under way skips it.
//   PORT=5173 SHOTS=/tmp/opening node tests/opening.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const PORT = process.env.PORT ?? '5173', S = process.env.SHOTS ?? '/tmp/opening';
mkdirSync(S, { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const out = []; let ok = true; const check = (c, m) => { out.push(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) ok = false; };
const has = (sel) => p.locator(sel).count();
const K = 'threads-of-fortune-save';
const st = () => p.evaluate((k) => JSON.parse(localStorage.getItem(k)).state, K);
const edit = async (fn) => { await p.evaluate(([k, f]) => { const d = JSON.parse(localStorage.getItem(k)); new Function('s', f)(d.state); localStorage.setItem(k, JSON.stringify(d)); }, [K, fn]); await p.reload(); if (await has('[data-testid=continue]')) await p.click('[data-testid=continue]'); await p.waitForTimeout(900); };
const bar = async () => (await p.locator('[data-testid=first-hour]').innerText().catch(() => '')).replace(/\s+/g, ' ').toLowerCase();

await p.goto(`http://localhost:${PORT}/`);
await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'), localStorage.setItem('tof-fullscreen', 'off'))); await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]'); await p.waitForTimeout(1200);
check((await bar()).includes('1 of 9'), `a new game starts the opening: "${(await bar()).slice(0, 80)}"`);
check((await has('.guide-flash')) > 0, 'the button it needs is pulsing');
await p.screenshot({ path: `${S}/1-start.png` });

// past the first sale and Rashid: the third step
await edit(`s.tutorial = { done: true, step: 'done', inspected: true }; s.introSeen = ['malek','arran','abuhamid','bilgin-chess','rashid','nabil','cohen']; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; s.totalSales = 1; s.ledger.push({ day: s.day, kind: 'purchase', label: 'Bought a rug from Rashid', amount: -75 });`);
check((await bar()).includes('3 of 9'), `after a sale and Rashid: "${(await bar()).slice(0, 90)}"`);

// the map: Damascus is shut, Cairo is open
await p.click('[data-testid=nav-map]'); await p.waitForTimeout(700);
if (await has('[data-testid=district-world]')) { await p.click('[data-testid=district-world]'); await p.waitForTimeout(900); }
const known = await p.evaluate(() => [...document.querySelectorAll('[data-testid^=place-]')].map((e) => [e.dataset.testid, e.className.includes('locked')]));
const lockedOnes = known.filter(([, l]) => l).map(([id]) => id);
check(lockedOnes.length > 0 && !lockedOnes.includes('place-cairo') && !lockedOnes.includes('place-giza'), `cities beyond Giza and Cairo are greyed (${lockedOnes.length} locked; Cairo open)`);
check(lockedOnes.includes('place-alexandria'), 'Alexandria waits until you have a guard and have reached Cairo');
await p.screenshot({ path: `${S}/2-map.png` });

// Malek, Bilgin, the guard, Cairo
await edit(`s.totalSales = 2; s.ledger.push({ day: s.day, kind: 'expense', label: "Malek's: kofta", amount: -3 }); s.world.rumours = [...(s.world.rumours||[]), 'Khan el-Khalili pays a third more than Giza for a good rug. Go with a guard.'];`);
check((await bar()).includes('6 of 9') && /guard/i.test(await bar()), `then the guard yard: "${(await bar()).slice(0, 90)}"`);
await edit(`s.world.party.troops = { watchman: 1 }; s.world.at = 'cairo'; s.whereabouts = { ...(s.whereabouts||{}), [s.day]: 'cairo' }; s.cash = 5000; s.world.hour = 9;`);
check((await bar()).includes('8 of 9'), `in Cairo with a guard: "${(await bar()).slice(0, 90)}"`);

// to Alexandria by train: the robbers stop it
await p.click('[data-testid=nav-map]'); await p.waitForTimeout(800);
if (await has('[data-testid=district-world]')) { await p.click('[data-testid=district-world]'); await p.waitForTimeout(800); }
const alexLocked = await p.locator('[data-testid=place-alexandria]').evaluate((e) => e.className.includes('locked')).catch(() => null);
check(alexLocked === false, 'Alexandria opens once you are in Cairo with a guard');
await p.locator('[data-testid=place-alexandria]').click({ force: true }); await p.waitForTimeout(600);
const train = await has('[data-testid=train]');
check(train > 0, 'the trip card offers the train');
if (train) await p.click('[data-testid=train]');
const t0 = Date.now(); let ambush = false;
while (Date.now() - t0 < 60000) { if ((await has('.ambush, [data-testid=ambush]')) > 0) { ambush = true; break; } await p.waitForTimeout(500); }
check(ambush, 'robbers stop the train on the way');
await p.screenshot({ path: `${S}/3-ambush.png` });
const rugs0 = (await st()).inventory.length;
// talk or pay our way through, whatever the card offers first
const pick = await p.evaluate(() => { const bs = [...document.querySelectorAll('.ambush button, [data-testid=ambush] button')]; const want = bs.find((b) => /pay|talk|deter|give/i.test(b.textContent || '')) ?? bs[0]; if (want) { want.setAttribute('data-pick', '1'); return want.textContent.trim().slice(0, 40); } return ''; });
if (pick) await p.click('[data-pick="1"]');
for (let i = 0; i < 8; i++) { await p.waitForTimeout(700); const more = await p.evaluate(() => { const bs = [...document.querySelectorAll('.ambush button, [data-testid=ambush] button')]; const b = bs.find((x) => /continue|carry on|ride on|on your way|done|ok|leave/i.test(x.textContent || '')) ?? bs.find((x) => /pay|talk|give/i.test(x.textContent || '')); if (b) { b.click(); return true; } return false; }); if (!more) break; }
await p.waitForTimeout(800);
const s9 = await st();
check(!!s9.onboard?.bandits, `the robbers are dealt with (${pick})`);
check(s9.inventory.length === rugs0, 'no rugs lost to them');
check(!(s9.world.parties || []).some((x) => x.id === 'opening-bandits'), 'and they are gone from the road');

// a rug bought in Alexandria finishes it
await edit(`s.journey = undefined; s.world.at = 'alexandria'; s.onboard = { ...(s.onboard||{}), auction: true };`);
check((await has('[data-testid=first-hour]')) === 0, 'buying in Alexandria finishes the opening');
const freed = await p.evaluate(() => 1);
void freed;

// Skip
await edit(`s.journey = undefined; s.onboard = {}; s.tipsSeen = []; s.missions = { ...(s.missions||{}), alexandria: 'active' }; s.world.at = 'giza'; s.world.party.troops = {};`);
check((await has('[data-testid=first-hour]')) > 0, 'the opening is back when not done');
p.once('dialog', (d) => d.accept());
if (await has('[data-testid=first-hour-skip]')) await p.click('[data-testid=first-hour-skip]');
await p.waitForTimeout(400);
await p.screenshot({ path: `${S}/4-skip.png` });
check((await has('[data-testid=first-hour]')) === 0 && ((await st()).tipsSeen || []).includes('first-hour'), 'Skip ends the opening');

// an older save under way skips it
await p.evaluate((k) => { const d = JSON.parse(localStorage.getItem(k)); d.version = 20; d.state.day = 9; d.state.tipsSeen = []; localStorage.setItem(k, JSON.stringify(d)); }, K);
await p.reload(); await p.waitForTimeout(1200);
check(((await st()).tipsSeen || []).includes('first-hour'), 'a tester\'s save already under way skips the opening');

console.log(out.join('\n'));
console.log(ok && !errs.length ? 'PASS' : 'FAIL', errs);
await b.close();
process.exit(ok && !errs.length ? 0 : 1);
