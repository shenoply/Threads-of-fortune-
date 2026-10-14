// The stall in a negotiation must fit a real phone screen (Chrome's bars take ~140px of an 800px
// phone): the stall picture, what was just said, the buyer's interest and the action buttons all in
// view at once, with nothing scrolled off. Measures each part at a few phone sizes.
//   PORT=5173 SHOTS=/tmp/stall node tests/stall-layout.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { PORT as __PORT, SHOTS as __SHOTS } from './_env.mjs';
const PORT = __PORT, S = __SHOTS;
mkdirSync(S, { recursive: true });
const b = await chromium.launch();
let allOk = true;
for (const [w, h] of [[412, 760], [390, 700], [360, 640], [1280, 800]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: w < 900, isMobile: w < 900 });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const has = (id) => p.locator(`[data-testid="${id}"]`).count();
  await p.goto(`http://localhost:${PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
  await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]'); await p.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.started === true; } catch { return false; } }, null, { timeout: 10000 }).catch(() => {}); /* day one is on disk before the save is edited */
  await p.evaluate(() => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); const s = d.state; s.tutorial = { done: true, step: 'done', inspected: true }; s.introSeen = ['malek', 'arran', 'abuhamid', 'bilgin-chess', 'rashid', 'nabil', 'cohen']; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; (window.__tofEdit = true, localStorage.setItem(k, JSON.stringify(d)), window.__tofEdit = false, (() => { /* hold the game's autosave off the edited save until the reload */ const w = Storage.prototype.setItem; if (w.__hold) return; const h = function (key, v) { if (key === 'threads-of-fortune-save' && !window.__tofEdit) return; return w.call(this, key, v); }; h.__hold = true; Storage.prototype.setItem = h; setTimeout(() => { if (Storage.prototype.setItem === h) Storage.prototype.setItem = w; }, 4000); })()); localStorage.setItem('tof-skip-chapters', '1'); });
  await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(1000);
  await p.click('[data-testid=nav-stall]');
  await p.waitForSelector('[data-testid=stall-wait]', { timeout: 20000 }).catch(() => {});
  if (await has('stall-wait')) await p.click('[data-testid=stall-wait]');
  await p.waitForSelector('[data-testid=actions] .act', { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(1500);
  // lay a rug on the table and say something, so the speech line is up
  const rug = p.locator('[data-testid=rugstrip] .rugcard:not(.empty)').first();
  if (await rug.count()) { await rug.click(); await p.waitForTimeout(2500); }
  // Saffron the cat sometimes jumps on the rug (two cat actions, no speech yet): settle her and say something
  for (let i = 0; i < 2 && ((await has('act-saffron_move')) || (await has('act-saffron_stay'))); i++) {
    await p.click((await has('act-saffron_move')) ? '[data-testid=act-saffron_move]' : '[data-testid=act-saffron_stay]').catch(() => {}); await p.waitForTimeout(2500);
  }
  if (!(await has('speech'))) { const a = p.locator('[data-testid=actions] .act:not([disabled])').first(); if (await a.count()) { await a.click().catch(() => {}); await p.waitForTimeout(2500); } }
  const measure = () => p.evaluate(() => {
    const vis = (sel) => { const e = document.querySelector(sel); if (!e) return 'none'; const r = e.getBoundingClientRect(); let cut = r.bottom > innerHeight + 1 || r.top < -1 || r.height < 2; for (let a = e.parentElement; a; a = a.parentElement) { const st = getComputedStyle(a); if (/(auto|scroll|hidden)/.test(st.overflowY)) { const q = a.getBoundingClientRect(); if (r.top < q.top - 1 || r.bottom > q.bottom + 1) cut = true; } } return `${Math.round(r.top)}-${Math.round(r.bottom)}${cut ? ' CUT' : ''}`; };
    const acts = [...document.querySelectorAll('[data-testid=actions] .act')].map((e) => e.getBoundingClientRect()).filter((r) => r.height > 0);
    return {
      scene: vis('.stall > .scene'), speech: vis('[data-testid=speech]'), interest: vis('[data-testid=meter-interest]'), handle: vis('[data-testid=tray-handle]'), rugs: vis('[data-testid=rugstrip]'), actions: vis('[data-testid=actions]'),
      actsCut: acts.filter((r) => r.bottom > innerHeight + 1).length, acts: acts.length, hud: vis('.hud'),
      // the picture may be taller than the painting's shape on a phone (it crops the painting's sides),
      // but both people stay whole in it: heads in shot, neither cut off at the side
      rows: getComputedStyle(document.querySelector('.stall')).gridTemplateRows,
      chain: (() => { const out = []; for (let e = document.querySelector('.stall'); e && out.length < 6; e = e.parentElement) { const r = e.getBoundingClientRect(); out.push(`${e.className.split(' ')[0]}:${Math.round(r.height)}/${getComputedStyle(e).overflowY}`); } return out.join(' < '); })(),
      bandSpill: (() => { const b = [...document.querySelectorAll('[data-testid=band] > *')].reduce((mx, e) => Math.max(mx, e.getBoundingClientRect().bottom), 0); const h = document.querySelector('[data-testid=tray-handle]')?.getBoundingClientRect().top ?? 9999; return b > h + 1; })(),
      sceneOk: (() => {
        const r = document.querySelector('.stall > .scene').getBoundingClientRect();
        if (r.height > r.width * (r.width < 600 ? 1.45 : 470 / 780) + 2) return false;
        return ['[data-testid=hero-at-stall]', '[data-testid=buyer-figure]'].every((sel) => { const e = document.querySelector(sel); if (!e) return true; const q = e.getBoundingClientRect(); return q.top >= r.top - 1 && q.left >= r.left - 2 && q.right <= r.right + 2; });
      })(),
      overlap: (() => { const a = document.querySelector('[data-testid=enc-tier]')?.getBoundingClientRect(); const b = document.querySelector('[data-testid=meter-interest]')?.getBoundingClientRect(); return !!(a && b && a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom); })(),
    };
  });
  const m = await measure();
  await p.locator('[data-testid=tray-handle]').dispatchEvent('click'); await p.waitForTimeout(400);
  const shut = await measure();
  await p.screenshot({ path: `${S}/stall-${w}x${h}-shut.png` });
  await p.locator('[data-testid=tray-handle]').dispatchEvent('click'); await p.waitForTimeout(400);
  const good = (x) => !Object.entries(x).some(([k, v]) => k !== (x === shut ? 'rugs' : '') && typeof v === 'string' && v.includes('CUT')) && x.actsCut === 0 && x.speech !== 'none' && x.interest !== 'none' && x.sceneOk && !x.overlap && !x.bandSpill;
  const ok = good(m) && good(shut) && m.rugs !== 'none';
  allOk = allOk && ok;
  console.log(`${w}x${h}`, ok ? 'ok  ' : 'FAIL', JSON.stringify(m), '\n   shut:', JSON.stringify(shut), errs.length ? errs[0] : '');
  await p.screenshot({ path: `${S}/stall-${w}x${h}.png` });
  await p.close();
}
console.log(allOk ? 'PASS' : 'FAIL');
await b.close();
