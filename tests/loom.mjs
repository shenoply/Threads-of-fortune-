// The weaver: design a carpet from the pattern book, pay, wait for the loom, collect it; it is in
// stock as a carpet of its own with a picture, it survives a reload, it can be offered at the stall,
// and a second commission waits while the one loom is busy.
//   node --import ./tests/_nohmr.mjs tests/loom.mjs
import { chromium } from 'playwright';
import { BASE } from './_env.mjs';
const K = 'threads-of-fortune-save';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
let ok = true; const check = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) ok = false; };
const has = (id) => p.locator(`[data-testid="${id}"]`).count();
const storeUrl = () => p.evaluate(() => performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/game/state/store.ts')) ?? '/src/game/state/store.ts');
const st = async (fn, arg) => p.evaluate(async ([u, f, a]) => { const m = await import(u); return new Function('m', 'a', `return (${f})(m, a)`)(m, a); }, [await storeUrl(), fn.toString(), arg]);
const hold = () => p.evaluate((k) => { const w = Storage.prototype.setItem; Storage.prototype.setItem = function (key, v) { if (key === k && !window.__tofEdit) return; return w.call(this, key, v); }; setTimeout(() => { Storage.prototype.setItem = w; }, 4000); }, K);

await p.goto(BASE);
await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'), localStorage.setItem('tof-skip-chapters', '1')));
await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
await p.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.started === true; } catch { return false; } }, null, { timeout: 10000 }).catch(() => {});
await p.evaluate((k) => { const d = JSON.parse(localStorage.getItem(k)); const s = d.state; s.tutorial = { done: true, step: 'done', inspected: true }; s.introSeen = ['malek', 'arran', 'abuhamid', 'bilgin-chess', 'rashid', 'nabil', 'cohen']; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; s.cash = 10000; window.__tofEdit = true; localStorage.setItem(k, JSON.stringify(d)); window.__tofEdit = false; }, K);
await hold();
await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(1000);

await p.click('[data-testid=nav-inventory]');
await p.click('[data-testid=stock-loom]');
await p.waitForSelector('[data-testid=loom-preview]');
const pic0 = await p.getAttribute('[data-testid=loom-preview]', 'src');
check(pic0?.startsWith('data:image/jpeg') && pic0.length > 20000, 'the design shows as a woven picture');
await p.click('[data-testid=loom-step-colours]'); await p.click('[data-testid=loom-pal-tabriz]');
await p.click('[data-testid=loom-step-centre]'); await p.click('[data-testid=loom-med-round]');
const pic1 = await p.getAttribute('[data-testid=loom-preview]', 'src');
check(pic1 !== pic0, 'each choice changes the picture');
await p.fill('[data-testid=loom-name]', 'Test Garden');
const cash0 = await st((m) => m.useGame.getState().cash);
await p.click('[data-testid=loom-weave]');
const s1 = await st((m) => { const s = m.useGame.getState(); return { cash: s.cash, w: s.loom?.weaving, n: s.loom?.designs.length }; });
check(s1.cash < cash0 && s1.w?.length === 1 && s1.n === 1, `paid ${cash0 - s1.cash} and the carpet is on the loom`);
check(await p.isDisabled('[data-testid=loom-weave]'), 'one loom: a second carpet must wait');
check(!(await has(`loom-collect-${s1.w[0].id}`)), 'not ready on the day it was ordered');
await st((m, d) => m.useGame.setState({ day: d }), s1.w[0].ready);
await p.waitForTimeout(300);
await p.click(`[data-testid=loom-collect-${s1.w[0].id}]`);
const inv = await st((m) => m.useGame.getState().inventory.filter((i) => i.typeId.startsWith('own-')).map((i) => i.typeId));
check(inv.length === 1, 'the carpet is in stock');
await p.click('[data-testid=loom-close]');
await p.waitForTimeout(500);
check(await p.locator('text=Test Garden').count() > 0, 'it is listed by its name in the stockroom');
// survives a reload
await p.waitForTimeout(1500);
await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(1500);
const after = await st((m) => m.useGame.getState().inventory.filter((i) => i.typeId.startsWith('own-')).length);
check(after === 1, 'still in stock after a reload');
await p.click('[data-testid=nav-inventory]').catch(() => {}); await p.waitForTimeout(500);
check(await p.locator('text=Test Garden').count() > 0, 'and still shown with its name');
p.once('dialog', (dl) => dl.accept('Renamed Garden'));
await p.locator('[data-testid^=rename-]').first().click();
await p.waitForTimeout(400);
check(await p.locator('text=Renamed Garden').count() > 0, 'a carpet of yours can be renamed from the stockroom');
check(errs.length === 0, `no page errors ${errs.join(' | ')}`);
console.log(ok ? 'ALL OK' : 'SOME FAILED');
await b.close();
process.exit(ok ? 0 : 1);
