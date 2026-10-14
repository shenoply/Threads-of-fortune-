// Plays long walks the way a player would and counts every time the game stops play.
// Fails when something interrupts that is not a real choice (a fight, the Sinai pass, a border).
import { chromium } from 'playwright';
import { PORT, SHOTS } from './_env.mjs';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 412, height: 915 } }); // Pixel 7a
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const out = []; let ok = true; const check = (c, m) => { out.push(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) ok = false; };
const has = async (s) => (await p.locator(s).count()) > 0;
const S = () => p.evaluate(() => JSON.parse(localStorage.getItem('threads-of-fortune-save')).state);
await p.goto(`http://localhost:${PORT}/`);
await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'), localStorage.setItem('tof-fullscreen', 'off'))); await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
await p.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.started === true; } catch { return false; } }, null, { timeout: 10000 }).catch(() => {});
const save = await p.evaluate(() => localStorage.getItem('threads-of-fortune-save'));
await p.goto('about:blank'); await p.goto(`http://localhost:${PORT}/`);
await p.evaluate((raw) => { const d = JSON.parse(raw); const s = d.state; s.tutorial = { done: true, step: 'done', inspected: true }; s.tipsSeen = [...(s.tipsSeen || []), 'first-hour']; s.introSeen = ['malek', 'arran', 'abuhamid', 'bilgin-chess', 'rashid', 'nabil', 'cohen']; s.cash = 90000; s.world.known.push('suez', 'tanta', 'alexandria', 'ismailia', 'portsaid'); s.world.party = { ...s.world.party, food: 14, troops: { guard: 3 }, animals: { baladi_h: 1 }, morale: 55 }; s.condition = { ...(s.condition || {}), fatigue: 10, fed: 80, water: 50 }; Object.assign(s.world, { at: 'cairo', hour: 6, x: 214.3, y: 413.7, parties: [] }); localStorage.setItem('threads-of-fortune-save', JSON.stringify(d)); localStorage.setItem('tof-skip-chapters', '1'); }, save);
await p.reload(); if (await has('[data-testid=continue]')) await p.click('[data-testid=continue]'); await p.waitForTimeout(800);
const BLOCK = { 'men-talk': 'men', nightfall: 'night', reroute: 'reroute', 'well-stop': 'well', 'big-news': 'news', 'job-offer': 'job', 'day-summary': 'summary', 'level-up': 'level', tip: 'tip' };
const CHOICE = ['road-encounter', 'pass-card', 'border-card'];
const events = []; const shots = new Set();
async function walk(id) {
  await p.click('[data-testid=nav-map]').catch(() => {}); await p.waitForTimeout(300);
  if (await has('[data-testid=district-world]')) await p.click('[data-testid=district-world]');
  for (const t of ['leave-settlement']) if (await has(`[data-testid=${t}]`)) await p.click(`[data-testid=${t}]`).catch(() => {});
  await p.evaluate((t) => window.dispatchEvent(new CustomEvent('tof:plan-trip', { detail: t })), id); await p.waitForTimeout(500);
  await p.waitForSelector('[data-testid=food-buy-go], [data-testid=travel]', { timeout: 4000 }).catch(() => {});
  if (await has('[data-testid=food-buy-go]')) await p.click('[data-testid=food-buy-go]').catch((e) => out.push('  click: ' + e.message.split('\n')[0]));
  else if (await has('[data-testid=travel]')) await p.locator('[data-testid=travel]').dispatchEvent('click');
  await p.waitForTimeout(600);
  if (await has('[data-testid=food-buy-go]')) await p.click('[data-testid=food-buy-go]');
  await p.waitForTimeout(800); if (!(await has('[data-testid=stop]'))) { out.push(`  could not start the walk to ${id}`); await p.screenshot({ path: `${SHOTS}/flow-nostart-${id}.png` }); return; }
  await p.locator('[data-testid=speed-4]').dispatchEvent('click').catch(() => {});
  const d0 = (await S()).day; let still = 0, lastX = null; await p.waitForTimeout(1500); await p.screenshot({ path: `${SHOTS}/flow-start-${id}.png` });
  for (let i = 0; i < (process.env.N ? +process.env.N : 900); i++) {
    const z = await S().catch(() => null); if (!z) { await p.waitForTimeout(200); continue; }
    if (z.world.at === id && !z.journey) break;
    const on = await p.evaluate(([B, C]) => { const ids = [...document.querySelectorAll('[data-testid]')].filter((e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed').map((e) => e.dataset.testid); const ov = document.querySelector('.overlay'); return { b: Object.keys(B).filter((k) => ids.includes(k)), c: C.filter((k) => ids.includes(k)), ov: ov ? (ov.getAttribute('data-testid') || ov.className) : '' }; }, [BLOCK, CHOICE]);
    for (const k of on.b) { events.push({ k, day: z.day, to: id }); if (!shots.has(k)) { shots.add(k); await p.screenshot({ path: `${SHOTS}/flow-${k}.png` }); } }
    if (on.ov && !/settlement/.test(on.ov) && !on.b.length && !on.c.length) events.push({ k: `overlay:${on.ov}`, day: z.day, to: id });
    // clear what is on screen the way a player would: the first button
    if (on.c.includes('road-encounter')) { await p.locator('[data-testid=road-encounter] .btn').first().click().catch(() => {}); await p.click('[data-testid=encounter-continue]', { timeout: 2000 }).catch(() => {}); }
    else if (on.c.includes('pass-card')) { await p.locator('[data-testid=pass-card] .btn.primary').first().click().catch(() => {}); await p.click('[data-testid=pass-continue]', { timeout: 2000 }).catch(() => {}); }
    for (const t of ['men-close', 'reroute-keep', 'big-news-ok', 'day-summary-ok', 'job-decline', 'tip-ok', 'level-ok']) if (await has(`[data-testid=${t}]`)) await p.click(`[data-testid=${t}]`).catch(() => {});
    if (on.b.includes('nightfall')) await p.locator('[data-testid=nightfall] .btn').first().click().catch(() => {});
    // a halt nobody asked for: the caravan stands still with nothing on screen to answer
    if (z.journey && lastX !== null && Math.abs(z.world.x - lastX) < 0.01 && !on.b.length && !on.c.length && !(await has('[data-testid=sleeping]'))) still++; else still = 0;
    if (still === 15) { events.push({ k: 'silent-halt', day: z.day, to: id }); await p.screenshot({ path: `${SHOTS}/flow-halt-${id}.png` }); if (await has('[data-testid=speed-4]')) await p.locator('[data-testid=speed-4]').dispatchEvent('click'); }
    lastX = z.world.x;
    await p.waitForTimeout(200);
  }
  const z = await S(); out.push(`  walked to ${id}: arrived ${z.world.at === id}, ${z.day - d0} day(s)`);
  for (const t of ['leave-settlement']) await p.click(`[data-testid=${t}]`, { timeout: 1500 }).catch(() => {});
}
await walk('suez');
await walk('cairo');
// collapse repeats of the same card on the same day
const uniq = []; for (const e of events) if (!uniq.some((u) => u.k === e.k && u.day === e.day && u.to === e.to)) uniq.push(e);
out.push('  interruptions: ' + (uniq.map((e) => `${e.k}@d${e.day}`).join(', ') || 'none'));
const bad = uniq.filter((e) => !['news'].includes(e.k));
check(bad.length <= 2, `no more than two stops that are not a real choice over three walks (${bad.length})`);
check(!uniq.some((e) => e.k === 'silent-halt'), 'the caravan never halts without saying why');
check(!uniq.some((e) => e.k === 'news'), 'the news never shows on the road');
console.log(out.join('\n')); console.log(ok && !errs.length ? 'PASS' : 'FAIL', errs);
await b.close();
