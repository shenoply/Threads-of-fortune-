// Dr Feras's clinic in Cairo: the room shows at once, the introduction plays the first time (Skip and
// Esc work, and it never charges or advances time), it does not play again after a reload but can be
// replayed, the consultation treats what you have, and his book has all 43 conditions. Also: the
// Alexandria film plays on the first arrival there.
//   PORT=5173 SHOTS=/tmp/clinic node tests/clinic.mjs
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
const PORT = process.env.PORT ?? '5173', S = process.env.SHOTS ?? '/tmp/clinic';
mkdirSync(S, { recursive: true });
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
for (const vp of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
const p = await b.newPage({ viewport: vp, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
// the test browser has no H.264: stand in a WebM at the same address
const stand = 'public/video/arran-intro.webm';
if (existsSync(stand)) await p.route('**/video/clinic/feras-introduction.mp4', (r) => r.fulfill({ contentType: 'video/webm', body: readFileSync(stand) }));
const out = []; let ok = true; const check = (c, m) => { out.push(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) ok = false; };
const has = (id) => p.locator(`[data-testid="${id}"]`).count();
const st = () => p.evaluate(() => JSON.parse(localStorage.getItem('threads-of-fortune-save')).state);
await p.goto(`http://localhost:${PORT}/`);
await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'), localStorage.setItem('tof-fullscreen', 'off'))); await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
await p.evaluate(() => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); const s = d.state; s.tutorial = { done: true, step: 'done', inspected: true }; s.introSeen = ['malek', 'arran', 'abuhamid', 'bilgin-chess', 'rashid', 'nabil', 'cohen']; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; s.cash = 3000; s.illnesses = [{ id: 'flu', since: s.day, until: s.day + 8 }, { id: 'bruises', since: s.day, until: s.day + 5 }]; Object.assign(s.world, { at: 'cairo', hour: 10 }); localStorage.setItem(k, JSON.stringify(d)); localStorage.setItem('tof-skip-chapters', '1'); });
await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(800);
await p.click('[data-testid=nav-map]'); await p.waitForTimeout(600);
if (!(await has('menu-clinic'))) { if (await has('enter')) await p.click('[data-testid=enter]'); await p.waitForTimeout(600); }
await p.click('[data-testid=menu-clinic]'); await p.waitForSelector('[data-testid=clinic]');
check(await p.locator('.cl-room').isVisible(), 'the clinic room shows at once');
check((await has('clinic-intro')) > 0, 'the introduction plays on the first visit');
const s0 = await st();
await p.waitForTimeout(1500);
const vstate = await p.evaluate(() => { const v = document.querySelector('[data-testid=clinic-video]'); return v ? { t: v.currentTime, paused: v.paused } : null; });
check(vstate && vstate.t > 0.3, `video playing ${JSON.stringify(vstate)}`);
await p.screenshot({ path: `${S}/intro-${vp.width}.png` });
await p.keyboard.press('Escape'); await p.waitForTimeout(300);
check(!(await has('clinic-intro')) && (await has('clinic')) > 0, 'Esc skips the film, the clinic stays');
const s1 = await st();
check(s1.cash === s0.cash && s1.world.hour === s0.world.hour, 'watching costs nothing and takes no time');
check((s1.introSeen ?? []).includes('feras'), 'marked as seen');
await p.click('[data-testid=treat-flu]'); await p.waitForTimeout(200);
const s2 = await st();
const flu = s2.illnesses.find((i) => i.id === 'flu');
check(s2.cash === 3000 - 30 && flu.treated && flu.until - s2.day === 4, `treated influenza (cash ${s2.cash}, ${flu.until - s2.day} days left)`);
await p.screenshot({ path: `${S}/consult-${vp.width}.png` });
await p.click('[data-testid=clinic-book]');
const n = await p.locator('.cl-entry').count(); await p.click('[data-testid=book-injuries]'); const n2 = await p.locator('.cl-entry').count();
check(n + n2 === 43, `the book has ${n} diseases and ${n2} injuries`);
await p.click('[data-testid=book-concussion]'); await p.waitForTimeout(300);
check((await has('book-page-concussion')) > 0, 'a page opens');
await p.screenshot({ path: `${S}/book-${vp.width}.png` });
await p.click('[data-testid=clinic-leave]');
await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(800);
await p.click('[data-testid=nav-map]'); await p.waitForTimeout(600);
if (!(await has('menu-clinic'))) { if (await has('enter')) await p.click('[data-testid=enter]'); await p.waitForTimeout(600); }
await p.click('[data-testid=menu-clinic]'); await p.waitForTimeout(500);
check(!(await has('clinic-intro')) && (await has('clinic-replay')) > 0, 'not again after a reload; replay button there');
await p.click('[data-testid=clinic-replay]'); await p.waitForTimeout(400);
check((await has('clinic-intro')) > 0, 'replay plays it'); await p.click('[data-testid=clinic-skip]');
await p.click('[data-testid=clinic-leave]');
console.log(vp.width, out.join('\n'));
console.log(ok && !errs.length ? 'PASS' : 'FAIL', JSON.stringify(errs.slice(0, 3)));
await p.close();
}
await b.close();
