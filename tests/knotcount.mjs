// Counting knots: at Arran's bench on a rug you own, and in a dealer's market before you buy. The true
// count of each rug is fixed by its uid or the dealer's offer, so the test knows it (the page shows it in
// development builds). At the lab: tap the gold row's knots, set the column with + and −, Arran checks it,
// and a right count on a rug washed to look old says so. In Cairo: a wrong count is kept, skews the
// estimate a little and is not corrected; a right count gives the true figure, and buying the rug keeps it.
//   PORT=5173 SHOTS=/tmp/kc node tests/knotcount.mjs
import { chromium } from 'playwright';
import { PORT, SHOTS as S } from './_env.mjs';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const has = (id) => p.locator(`[data-testid="${id}"]`).count();
const edit = (fn) => p.evaluate((src) => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); new Function('s', 'd', src)(d.state, d); (window.__tofEdit = true, localStorage.setItem(k, JSON.stringify(d)), window.__tofEdit = false, (() => { const w = Storage.prototype.setItem; if (w.__hold) return; const h = function (key, v) { if (key === 'threads-of-fortune-save' && !window.__tofEdit) return; return w.call(this, key, v); }; h.__hold = true; Storage.prototype.setItem = h; setTimeout(() => { if (Storage.prototype.setItem === h) Storage.prototype.setItem = w; }, 4000); })()); }, fn);
const store = `(await import(performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/game/state/store.ts')) ?? '/src/game/state/store.ts')).useGame`;
const st = (expr) => p.evaluate(new Function(`return (async () => { const G = ${store}; const s = G.getState(); return ${expr}; })()`));
const reload = async () => { await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(700); };
const out = []; const fails = [];
const check = (ok, msg) => { out.push(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) fails.push(msg); };

/** tap every knot in the marked row (across) on the canvas, and set the column (down) with the stepper */
async function count({ acrossOff = 0, downOff = 0, shot } = {}) {
  await p.waitForSelector('[data-testid=kc-start]');
  const [A, D] = (await p.locator('[data-testid=knotcount]').getAttribute('data-truth')).split('x').map(Number);
  const [mr, mc] = (await p.locator('[data-testid=knotcount]').getAttribute('data-mark')).split(',').map(Number);
  await p.click('[data-testid=kc-start]');
  const box = await p.locator('[data-testid=kc-canvas]').boundingBox();
  const M = 0.55, cw = box.width / (A + 2 * M), ch = box.height / (D + 2 * M);
  // the knot where the row and the column cross starts marked: tap the rest of the row
  for (let k = 0; k < A; k++) if (k !== mc) await p.mouse.click(box.x + (M + k + 0.5) * cw, box.y + (M + mr + 0.5) * ch);
  const tapped = Number(await p.locator('[data-testid=kc-across]').textContent());
  for (let k = 0; k < acrossOff; k++) await p.click('[data-testid=kc-across-plus]');
  const d0 = Number(await p.locator('[data-testid=kc-down]').textContent());
  for (let k = d0; k < D + downOff; k++) await p.click('[data-testid=kc-down-plus]');
  if (shot) await p.screenshot({ path: shot });
  await p.click('[data-testid=kc-done]');
  await p.waitForSelector('[data-testid=kc-result]');
  return { A, D, tapped };
}

try {
  await p.goto(`http://localhost:${PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
  await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]'); await p.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.started === true; } catch { return false; } }, null, { timeout: 10000 }).catch(() => {});
  await edit(`s.tutorial = { done: true, step: 'done', inspected: true }; s.missionNews = undefined; s.levelUps = []; s.titleNews = [];
    Object.assign(s.world, { at: 'giza', hour: 9 }); s.cash = 3000; s.queue = []; s.visitIdx = 0;
    s.inventory = [{ uid: 'kc-blue', typeId: 'damascus-blue', condition: 'Good', restored: false, provenance: 'Likely', paid: 600, notes: [], stored: true, fakeAge: true }];
    localStorage.setItem('tof-skip-chapters', '1');`);
  await reload();

  // ── at Arran's bench ──
  await p.click('[data-testid=nav-stall]'); await p.waitForSelector('[data-testid=district]'); await p.waitForTimeout(400);
  if (await has('stall-sheet-close')) await p.click('[data-testid=stall-sheet-close]');
  await p.locator('[data-testid=poi-lab]').scrollIntoViewIfNeeded(); await p.click('[data-testid=poi-lab]');
  await p.waitForSelector('[data-testid=arran-door]', { timeout: 20000 });
  await p.click('[data-testid=arran-enter]'); await p.waitForTimeout(700);
  if (await has('arran-scene-leave')) await p.click('[data-testid=arran-scene-leave]');
  await p.click('[data-testid=arran-rug-kc-blue]'); await p.waitForTimeout(300);
  check(await has('arran-knots-kc-blue') > 0, 'the bench offers a knot count on your rug');
  await p.locator('[data-testid=arran-knots-kc-blue]').scrollIntoViewIfNeeded(); await p.screenshot({ path: `${S}/kc-bench.png` });
  const h0 = await st('s.world.hour');
  await p.click('[data-testid=arran-knots-kc-blue]');
  await p.waitForSelector('[data-testid=knotcount]');
  check((await p.locator('.kc-rules').textContent()).includes('one inch'), 'rules line at the top');
  await p.screenshot({ path: `${S}/kc-ready.png` });
  const lab = await count({ shot: `${S}/kc-counting.png` });
  check(lab.tapped === lab.A, `tapping the gold row counts its knots (${lab.tapped} of ${lab.A})`);
  await p.screenshot({ path: `${S}/kc-lab-result.png` });
  check((await p.locator('[data-testid=kc-result]').getAttribute('data-ok')) === '1', `a true count of ${lab.A} x ${lab.D} is within 5%`);
  check((await p.locator('[data-testid=kc-check]').textContent()).includes('Near enough'), 'Arran checks it and says so');
  check((await p.locator('[data-testid=kc-verdict]').textContent()).includes('new work'), 'a right count shows new work washed to look old');
  const kc = await st('s.knotCounts["kc-blue"]');
  check(kc?.ok && kc.counted === lab.A * lab.D && kc.truth === lab.A * lab.D, 'the count is kept on the rug');
  check((await st('s.knotTally.tries')) === 1 && (await st('s.knotTally.close')) === 1, 'tries and right counts tallied');
  check((await st('s.world.hour')) > h0, 'a count takes a quarter of an hour');
  await p.click('[data-testid=kc-back]'); await p.waitForTimeout(300);
  check(!(await has('knotcount')) && (await has('arran-knots-kc-blue')) > 0, 'back at the bench, quietly');
  // the same day, the same rug: the count stands
  await p.click('[data-testid=arran-knots-kc-blue]'); await p.waitForSelector('[data-testid=kc-result]');
  check(!(await has('kc-start')), 'one count of a rug a day');
  await p.click('[data-testid=kc-back]');
  // what the inspector now says of the rug
  const hint = await p.evaluate(async () => {
    const F = await import('/src/game/systems/fakes.ts');
    const G = (await import(performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/game/state/store.ts')) ?? '/src/game/state/store.ts')).useGame.getState();
    return F.knowFlaw(G.inventory[0], 'age', F.eyeOf(G));
  });
  check(hint === 'hint', 'a right count gives the eye a hint of faked age');

  // ── a Cairo dealer: a wrong count, then (the next day) a right one, then buy ──
  await edit(`Object.assign(s.world, { at: 'cairo', hour: 10 }); s.guideSeen = true;`);
  await reload();
  await p.click('[data-testid=nav-map]'); await p.waitForTimeout(500);
  if (await has('guide-skip')) await p.click('[data-testid=guide-skip]');
  if (await has('enter')) await p.click('[data-testid=enter]');
  await p.waitForSelector('[data-testid=town-menu]', { timeout: 8000 }).catch(() => {});
  if (await has('menu-market')) await p.click('[data-testid=menu-market]');
  else { if (await has('menu-more')) await p.click('[data-testid=menu-more]'); await p.click('[data-testid=menu-all]'); }
  await p.waitForTimeout(600);
  const rows = p.locator('.mkt-row[data-testid^=buy-]');
  const n = await rows.count();
  let row = -1;
  for (let i = 0; i < n && row < 0; i++) {
    const id = (await rows.nth(i).getAttribute('data-testid')).replace('buy-', '');
    if (await p.evaluate(async (id) => (await import('/src/game/knots.ts')).countable(id), id)) row = i;
  }
  check(row >= 0, `a countable rug in the Cairo market (${n} offers)`);
  const typeId = (await rows.nth(row).getAttribute('data-testid')).replace('buy-', '');
  await rows.nth(row).locator('img.lookable').click();
  await p.waitForSelector('[data-testid=inspector]');
  await p.click('[data-testid=tab-weave]');
  await p.click('[data-testid=knot-count-open]');
  const bad = await count({ acrossOff: 2 });
  check((await p.locator('[data-testid=kc-result]').getAttribute('data-ok')) === '0', `two knots too many across (${bad.A + 2} for ${bad.A}) is a wrong count`);
  const dealerLine = await p.locator('.kc-check').textContent();
  check(!dealerLine.includes(String(bad.A * bad.D)), 'at the dealer nobody tells you the true count');
  await p.screenshot({ path: `${S}/kc-dealer-result.png` });
  await p.click('[data-testid=kc-back]');
  check((await p.locator('[data-testid=knot-line]').textContent()).includes(String((bad.A + 2) * bad.D)), 'the inspector keeps your (wrong) count');
  await p.click('[data-testid=tab-estimate]');
  const est = await p.locator('[data-testid=estimate-value]').textContent();
  const band = await p.evaluate(async (id) => (await import('/src/data/rugs.ts')).RUGS[id].valueBand, typeId);
  out.push(`estimate by a wrong count: ${est}; true band ${band.join('-')} piastres`);
  check(est.includes('by your knot count') && !est.includes(`£${(band[0] / 100).toLocaleString('en-GB')}–`), 'a wrong count moves the estimate off the true value');
  await p.screenshot({ path: `${S}/kc-dealer-estimate.png` });
  // the next morning, count again, right this time
  await p.click('[data-testid=inspector-close]');
  await edit(`s.day = s.day + 1;`); await reload();
  await p.click('[data-testid=nav-map]'); await p.waitForTimeout(500);
  if (await has('enter')) await p.click('[data-testid=enter]');
  await p.waitForSelector('[data-testid=town-menu]', { timeout: 8000 }).catch(() => {});
  if (await has('menu-market')) await p.click('[data-testid=menu-market]');
  else { if (await has('menu-more')) await p.click('[data-testid=menu-more]'); await p.click('[data-testid=menu-all]'); }
  await p.waitForTimeout(600);
  const r2 = p.locator(`[data-testid=buy-${typeId}]`);
  if (await r2.count()) {
    await r2.locator('img.lookable').click(); await p.waitForSelector('[data-testid=inspector]');
    await p.click('[data-testid=tab-weave]'); await p.click('[data-testid=knot-count-open]');
    const good = await count();
    check((await p.locator('[data-testid=kc-result]').getAttribute('data-ok')) === '1', `a true count the next day (${good.A} x ${good.D})`);
    await p.click('[data-testid=kc-back]'); await p.click('[data-testid=tab-estimate]');
    const est2 = await p.locator('[data-testid=estimate-value]').textContent();
    out.push(`estimate by a right count: ${est2}`);
    await p.click('[data-testid=inspector-close]');
    const before = await st('Object.keys(s.knotCounts).length');
    await r2.locator('button').click(); await p.waitForTimeout(400);
    const bought = await st(`(() => { const it = s.inventory[s.inventory.length - 1]; return { typeId: it.typeId, k: s.knotCounts[it.uid] }; })()`);
    check(bought.typeId === typeId && bought.k?.ok && (await st('Object.keys(s.knotCounts).length')) === before + 1, 'buying the rug keeps the count on it');
  } else out.push('(the dealer sold out overnight: the buy step is skipped)');
} catch (e) { fails.push(String(e)); }
check(!errs.length, `no page errors ${errs.join(' | ')}`);
console.log(out.join('\n'));
console.log(fails.length ? `FAIL ${fails.length}: ${fails.join(' | ')}` : 'PASS');
await b.close();
process.exit(fails.length ? 1 : 0);
