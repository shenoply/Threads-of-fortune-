// Touch gestures (src/components/Touch) on a Pixel 7a-sized screen with real touch events (CDP): swipe
// away, pull down to close, swipe between pages, long press to inspect; the world map still pans.
//   PORT=5173 SHOTS=/tmp/swipes node --import ./tests/_nohmr.mjs tests/swipes.mjs   (ONLY=toast,stock to run a part)
import { chromium } from 'playwright';
import { PORT, SHOTS } from './_env.mjs';
const OUT = SHOTS;
const ONLY = (process.env.ONLY ?? '').split(',').filter(Boolean);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 412, height: 800 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const p = await ctx.newPage();
p.on('dialog', (d) => d.accept());
p.setDefaultTimeout(8000);
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const cdp = await ctx.newCDPSession(p);
let ok = true; const check = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) ok = false; };
const has = async (id) => (await p.locator(id.startsWith('[') || id.startsWith('.') ? id : `[data-testid="${id}"]`).count()) > 0;
const waitId = (id, ms = 8000) => p.waitForSelector(id.startsWith('[') || id.startsWith('.') ? id : `[data-testid="${id}"]`, { timeout: ms }).then(() => true).catch(() => false);
const G = (fn, arg) => p.evaluate(async ([f, a]) => { const { useGame } = await import(performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/game/state/store.ts')) ?? '/src/game/state/store.ts'); const g = new Proxy({}, { get: (_, k) => useGame.getState()[k] }); return new Function('g', 'set', 'a', f)(g, useGame.setState, a); }, [fn, arg]);
const shot = (n) => p.screenshot({ path: `${OUT}/${n}.png` });
const sleep = (ms) => p.waitForTimeout(ms);
const T = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i })) });
/** a finger from (x0,y0) to (x1,y1); `mid` takes a screenshot halfway */
async function drag(x0, y0, x1, y1, { steps = 14, ms = 260, mid } = {}) {
  await T('touchStart', [[x0, y0]]);
  for (let i = 1; i <= steps; i++) {
    await T('touchMove', [[x0 + ((x1 - x0) * i) / steps, y0 + ((y1 - y0) * i) / steps]]);
    await sleep(ms / steps);
    if (mid && i === Math.round(steps * 0.6)) await shot(mid);
  }
  await T('touchEnd', []);
  await sleep(450);
}
async function hold(x, y, ms = 750) { await T('touchStart', [[x, y]]); await sleep(ms); await T('touchEnd', []); await sleep(500); }
const box = async (sel) => { const l = p.locator(sel).first(); await l.scrollIntoViewIfNeeded().catch(() => {}); return l.boundingBox(); };
const clearCards = async () => { for (const id of ['day-summary-ok', 'mission-ok', 'big-news-ok']) { const x = p.locator(`[data-testid=${id}]`); if (await x.count()) await x.first().click({ timeout: 1500 }).catch(() => {}); } };
const want = (k) => !ONLY.length || ONLY.includes(k);

// a fresh game past the lesson
await p.goto(`http://localhost:${PORT}/`, { timeout: 60000 });
await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'), localStorage.setItem('tof-tester', '1')));
await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
await sleep(2500);
await G('set({ tutorial: { done: true, step: "done", inspected: true }, introSeen: ["malek","arran","abuhamid","bilgin-chess","rashid","nabil","cohen"], missionNews: undefined, levelUps: [], titleNews: [] }); try { g.skipTutorial?.(); } catch {}');
await sleep(800); await clearCards();

if (want('map')) {
  // the district and the world map still pan under one finger (the sheets' pull and the swipes leave them be)
  await p.click('[data-testid=nav-map]').catch(() => {});
  await sleep(1200);
  if (await has('stall-sheet-close')) { await p.click('[data-testid=stall-sheet-close]'); await sleep(600); }
  const sample = () => p.evaluate(() => { const c = document.querySelector('.district-canvas'); if (!c) return null; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; const out = []; for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) { const i = ((Math.floor((y + 0.5) * c.height / 24) * c.width) + Math.floor((x + 0.5) * c.width / 24)) * 4; out.push(d[i] + d[i + 1] + d[i + 2]); } return out; });
  if (await has('.district-canvas')) {
    const m = await box('.district-canvas');
    const a = await sample();
    await drag(m.x + m.width / 2, m.y + m.height * 0.45, m.x + m.width / 2 - 140, m.y + m.height * 0.45 + 50, { steps: 16, ms: 320 });
    await sleep(400);
    const c = await sample();
    const moved = a && c ? a.filter((v, k) => Math.abs(v - c[k]) > 40).length / a.length : 0;
    await shot('map-district-pan');
    check(moved > 0.3, `the district plan pans under a finger (${Math.round(moved * 100)}% of the picture moved)`);
  }
  if (await has('.dt-world')) { await p.click('.dt-world'); await sleep(1500); }
  if (await has('.world-map')) {
    const m = await box('.world-map');
    const marker = () => p.evaluate(() => { const e = [...document.querySelectorAll('[data-testid^=place-]')].find((x) => x.getBoundingClientRect().width > 0); const r = e?.getBoundingClientRect(); return r ? [Math.round(r.left), Math.round(r.top)] : null; });
    const a = await marker();
    // from open ground (not the stall's bubble in the middle)
    await drag(m.x + 70, m.y + m.height * 0.62, m.x + 230, m.y + m.height * 0.62 - 90, { steps: 16, ms: 320 });
    await sleep(400);
    const c = await marker();
    await shot('map-world-pan');
    check(JSON.stringify(a) !== JSON.stringify(c), `the world map pans under a finger (${JSON.stringify(a)} -> ${JSON.stringify(c)})`);
  } else check(false, 'world map showed');
}

if (want('toast')) {
  await G('set({ levelUps: [{ skill: "haggling", level: 2 }] })');
  if (await waitId('levelup', 3000)) {
    const r = await box('[data-testid=levelup]');
    const moved = async () => p.evaluate(() => { const e = document.querySelector('[data-testid=levelup]'); return e ? getComputedStyle(e).translate : 'gone'; });
    await T('touchStart', [[r.x + r.width / 2, r.y + r.height / 2]]);
    for (let i = 1; i <= 8; i++) { await T('touchMove', [[r.x + r.width / 2 + i * 30, r.y + r.height / 2]]); await sleep(25); }
    const mid = await moved();
    await shot('toast-levelup-drag');
    await T('touchEnd', []); await sleep(450);
    check(mid !== 'none' && mid !== 'gone', `the level-up toast follows the finger (translate ${mid})`);
    check(!(await has('levelup')), 'level-up toast swipes away');
  } else check(false, 'level-up toast showed');
  // short of the threshold it settles back
  await sleep(600);
  await G('set({ levelUps: [{ skill: "speech", level: 2 }] })');
  if (await waitId('levelup', 3000)) {
    console.log('   (levelup up again)');
    const r = await box('[data-testid=levelup]');
    await drag(r.x + r.width / 2, r.y + r.height / 2, r.x + r.width / 2 + 40, r.y + r.height / 2, { ms: 500 });
    const tr = await p.evaluate(() => { const e = document.querySelector('[data-testid=levelup]'); return e ? getComputedStyle(e).translate : 'gone'; });
    check(tr === 'none' || tr === '0px', `a short drag leaves the toast in place (translate ${tr})`);
    await p.click('[data-testid=levelup]').catch(() => {});
  }
}

if (want('mission')) {
  const id = await G('return Object.keys(g.missions ?? {})[0] ?? "alexandria"');
  await G('set({ missionNews: a })', id);
  await p.click('[data-testid=nav-map]').catch(() => {});
  if (await waitId('mission-card', 3000)) {
    const r = await box('[data-testid=mission-card]');
    await drag(r.x + 60, r.y + r.height / 2, r.x + 380, r.y + r.height / 2, { mid: 'mission-news-drag' });
    check(!(await G('return g.missionNews')), 'mission news swipes away');
  } else check(false, `mission news showed (${id})`);
}

if (want('settings')) {
  await p.click('[data-testid=settings-btn]');
  await waitId('settings');
  const r = await box('[data-testid=settings]');
  await shot('settings-grip');
  await drag(r.x + r.width / 2, r.y + 20, r.x + r.width / 2, r.y + 260, { mid: 'settings-pull' });
  check(!(await has('settings')), 'Settings pulls down to close');
  // a short pull springs back
  await p.click('[data-testid=settings-btn]'); await waitId('settings');
  const r2 = await box('[data-testid=settings]');
  await drag(r2.x + r2.width / 2, r2.y + 20, r2.x + r2.width / 2, r2.y + 60, { ms: 500 });
  check(await has('settings'), 'a short pull leaves Settings open');
  // admin
  await p.locator('[data-testid=admin-open]').scrollIntoViewIfNeeded();
  await p.click('[data-testid=admin-open]');
  if (await waitId('admin-sheet', 4000)) {
    const h = await box('.adm-head');
    await drag(h.x + 80, h.y + h.height / 2, h.x + 80, h.y + 300, { mid: 'admin-pull' });
    check(!(await has('admin-sheet')), "Tester's sheet pulls down to close");
  } else check(false, 'admin sheet opened');
}

if (want('stall')) {
  await G('set({ world: { ...g.world, at: "giza" } })');
  await p.click('[data-testid=nav-stall]');
  if (await waitId('stall-sheet', 5000)) {
    const h = await box('[data-testid=stall-sheet] .sheet-head');
    await drag(h.x + 60, h.y + h.height / 2, h.x + 60, h.y + 320, { mid: 'stall-sheet-pull' });
    check(!(await has('stall-sheet')), 'stall sheet ("Your stall") pulls down to close');
  } else check(false, 'stall sheet opened');
}

if (want('stock')) {
  await p.click('[data-testid=nav-inventory]');
  await sleep(800);
  const it = p.locator('.inv-item').first();
  if (await it.count()) {
    const r = await box('.inv-item h3');
    await hold(r.x + 20, r.y + r.height / 2);
    check(await has('inspector'), 'long press on a stock rug opens the inspector');
    if (await has('inspector')) {
      const sel = () => p.evaluate(() => document.querySelector('[data-testid=inspector] [role=tab][aria-selected=true]')?.textContent);
      const t0 = await sel();
      const bd = await box('[data-testid=insp-body]');
      await drag(bd.x + bd.width - 40, bd.y + 20, bd.x + 40, bd.y + 26, { mid: 'inspector-swipe' });
      const t1 = await sel();
      check(t0 !== t1 && t1 === 'Condition', `inspector notes swipe to the next page (${t0} -> ${t1})`);
      const bd2 = await box('[data-testid=insp-body]');
      await drag(bd2.x + 40, bd2.y + 20, bd2.x + bd2.width - 40, bd2.y + 26);
      check((await sel()) === 'Overview', 'and back');
      await shot('inspector-after');
      const h = await box('[data-testid=inspector] .overlay-head');
      await drag(h.x + 40, h.y + h.height / 2, h.x + 40, h.y + 340, { mid: 'inspector-pull' });
      check(!(await has('inspector')), 'inspector pulls down to close');
    }
  } else check(false, 'stock has a rug');
}

if (want('ency')) {
  const pid = await G('const h = Object.values((window.__w ?? null) ?? {}); return null');
  await p.evaluate(() => window.dispatchEvent(new CustomEvent('tof:ency', { detail: { kind: 'place', id: 'giza' } })));
  if (await waitId('encyclopedia', 4000)) {
    await sleep(500);
    const at0 = await p.locator('[data-testid=ency-pages]').getAttribute('data-at');
    const r = await box('[data-testid=ency-pages]');
    await drag(r.x + r.width - 30, r.y + 120, r.x + 30, r.y + 126, { mid: 'ency-swipe' });
    const at1 = await p.locator('[data-testid=ency-pages]').getAttribute('data-at');
    check(at0 !== at1, `encyclopedia swipes to the next entry (${at0} -> ${at1})`);
    await shot('ency-next');
    const h = await box('.ency-head');
    await drag(h.x + 120, h.y + h.height / 2, h.x + 120, h.y + 330);
    check(!(await has('encyclopedia')), 'encyclopedia pulls down to close');
  } else check(false, 'encyclopedia opened');
}

if (want('paper')) {
  await G('set({ day: Math.max(g.day, 4) })');
  await p.evaluate(() => window.dispatchEvent(new Event('tof:paper')));
  if (await waitId('newspaper', 4000)) {
    await sleep(500);
    const d0 = await p.locator('[data-testid=paper-days] span').textContent();
    const r = await box('.paper-pov');
    await drag(r.x + 40, r.y + r.height / 2, r.x + r.width - 40, r.y + r.height / 2 + 4, { mid: 'paper-swipe' });
    const d1 = await p.locator('[data-testid=paper-days] span').textContent();
    check(d0 !== d1, `the paper swipes to the day before (${d0} -> ${d1})`);
    await shot('paper-older');
    await p.click('[data-testid=paper-newer]');
    check((await p.locator('[data-testid=paper-days] span').textContent()) === d0, 'and the arrow brings the next day back');
    await p.click('[data-testid=newspaper-close]');
  } else check(false, 'paper opened');
}

if (want('cal')) {
  await p.click('[data-testid=hud-calendar]');
  if (await waitId('calendar', 4000)) {
    const txt = () => p.locator('[data-testid=cal-detail] > b').textContent();
    const a = await txt();
    const r = await box('[data-testid=cal-detail]');
    await drag(r.x + 40, r.y + 30, r.x + r.width - 40, r.y + 34, { mid: 'calendar-diary-swipe' });
    const c = await txt();
    check(a !== c, `the diary swipes to the day before (${a} -> ${c})`);
    await p.click('[data-testid=calendar-close]');
  } else check(false, 'calendar opened');
}

if (want('summary')) {
  await p.click('[data-testid=nav-map]').catch(() => {});
  await G('set({ dayOver: false }); g.endDay();');
  await sleep(1200);
  if (await waitId('day-summary', 5000)) {
    await shot('day-summary');
    const r = await box('[data-testid=day-summary] .modal-card');
    await drag(r.x + 40, r.y + r.height / 2, r.x + 400, r.y + r.height / 2 + 6, { mid: 'day-summary-drag' });
    await sleep(300);
    check(!(await has('day-summary')), 'the morning card swipes away');
  } else console.log('note: no morning card after endDay (quiet night)');
}

await shot('end');
check(!errs.length, `no page errors ${errs.slice(0, 3).join(' | ')}`);
await b.close();
console.log(ok ? 'ALL OK' : 'SOME FAILED');
process.exit(ok ? 0 : 1);
