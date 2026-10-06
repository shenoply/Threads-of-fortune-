// Dr Feras's consultation: he speaks, you answer, the plate (tap = full screen, Skip works), then treatment options
// that you pay for; and passing out in a town brings a passer-by who carries you to the clinic.
//   PORT=5199 SHOTS=/tmp/w/c node tests/consult.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const PORT = process.env.PORT ?? '5199', S = process.env.SHOTS ?? '/tmp/w/c'; mkdirSync(S, { recursive: true });
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 } }); p.setDefaultTimeout(8000);
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const out = []; let ok = true; const check = (c, m) => { out.push(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) ok = false; };
const has = (id) => p.locator(`[data-testid="${id}"]`).count();
const st = () => p.evaluate(() => JSON.parse(localStorage.getItem('threads-of-fortune-save')).state);
await p.goto(`http://localhost:${PORT}/`);
await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'), localStorage.setItem('tof-fullscreen', 'off'))); await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]'); await p.waitForTimeout(800);
await p.evaluate(() => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); const s = d.state; s.tutorial = { done: true, step: 'done', inspected: true }; s.guideSeen = true; s.tipsSeen = ['first-hour']; s.introSeen = [...(s.introSeen || []), 'feras', 'malek', 'arran', 'abuhamid', 'bilgin-chess', 'rashid', 'nabil', 'cohen']; s.world.at = 'cairo'; s.cash = 950; s.illnesses = [{ id: 'cut', since: s.day, until: s.day + 3 }]; localStorage.setItem(k, JSON.stringify(d)); });
await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(800);
await p.click('[data-testid=nav-map]'); await p.waitForTimeout(700);
if (await has('enter')) await p.click('[data-testid=enter]'); await p.waitForTimeout(900);
if (await p.getByText('Skip', { exact: true }).count()) await p.getByText('Skip', { exact: true }).first().click().catch(() => {});
await p.waitForTimeout(800);
await p.click('[data-testid=menu-clinic]'); await p.waitForSelector('[data-testid=clinic]'); await p.waitForTimeout(600);
check((await has('consult-cut')) > 0, 'the consultation starts by itself when you are ill');
check((await has('line-feras-0')) > 0 && (await has('line-you-1')) === 0, 'Dr Feras speaks first');
await p.screenshot({ path: `${S}/1-feras.png` });
await p.waitForSelector('[data-testid=line-you-1]', { timeout: 6000 });
check(true, 'then you answer');
await p.screenshot({ path: `${S}/2-you.png` });
await p.waitForSelector('[data-testid=consult-plate]', { timeout: 9000 });
check(true, 'then his book opens on the plate');
await p.waitForTimeout(800); await p.screenshot({ path: `${S}/3-plate.png` });
const playing = await p.evaluate(() => { const a = document.querySelector('[data-testid=feras-voice]'); return a ? !a.paused : false; });
await p.click('[data-testid=plate-open]'); await p.waitForTimeout(500);
check((await has('lightbox')) > 0, 'tapping the picture opens it full screen');
await p.screenshot({ path: `${S}/4-full.png` });
const still = await p.evaluate(() => { const a = document.querySelector('[data-testid=feras-voice]'); return a ? !a.paused || a.ended : false; });
check(playing === still, `his voice is not interrupted by the full-screen view (playing before: ${playing}, after: ${still})`);
await p.click('[data-testid=lightbox-close]'); await p.waitForTimeout(300);
check((await has('lightbox')) === 0, 'the full-screen view closes');
await p.click('[data-testid=plate-skip]'); await p.waitForSelector('[data-testid=consult-treat]');
check((await has('treat-cut')) > 0 && (await has('remedy-cut')) > 0 && (await has('treat-none')) > 0, 'treatment options: full, simple remedy, none');
await p.screenshot({ path: `${S}/5-treat.png` });
const cash0 = (await st()).cash;
await p.click('[data-testid=remedy-cut]'); await p.waitForTimeout(500);
const s1 = await st();
check(s1.cash < cash0 && s1.illnesses[0].treated, `paying for the remedy takes the money (${cash0} -> ${s1.cash}) and treats it`);
await p.screenshot({ path: `${S}/6-paid.png` });
await p.click('[data-testid=consult-done]'); await p.waitForTimeout(300);
check((await has('talk-cut')) > 0, 'afterwards the list lets you talk to him again');
await p.click('[data-testid=clinic-leave]'); await p.waitForTimeout(400);

// passing out in Giza: a passer-by carries him to the clinic
await p.evaluate(() => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); d.state.world.at = 'giza'; d.state.illnesses = []; d.state.condition = { ...(d.state.condition || {}), fatigue: 99 }; localStorage.setItem(k, JSON.stringify(d)); });
await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(1500);
check((await has('rescue')) > 0, 'worn out to the bone in a town: you pass out and someone comes');
await p.screenshot({ path: `${S}/7-rescue.png` });
for (let i = 0; i < 2 && await has('rescue-next'); i++) { await p.click('[data-testid=rescue-next]'); await p.waitForTimeout(250); }
await p.screenshot({ path: `${S}/8-rescue3.png` });
await p.click('[data-testid=rescue-clinic]'); await p.waitForSelector('[data-testid=clinic]');
const s2 = await st();
check(s2.world.at === 'cairo' && s2.condition.fatigue <= 60, `he wakes in Cairo, rested (fatigue ${s2.condition.fatigue})`);
await p.screenshot({ path: `${S}/9-clinic.png` });
console.log(out.join('\n')); console.log(ok && !errs.length ? 'PASS' : 'FAIL', errs);
await b.close();
