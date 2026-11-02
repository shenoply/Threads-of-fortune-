// The rug laid on the table at the stall is the live carpet (CarpetView in its compact, in-scene
// mode): presenting a rug puts it on the counter, a drag turns or tips it there, a double tap lays it
// straight, the inspector still opens over it, and the lesson's inspect steps still go through.
//   PORT=5201 node --import ./tests/_nohmr.mjs tests/stall-carpet.mjs
// SHOTS=<dir> also keeps a phone and a PC picture of the stall with the carpet turned.
import { chromium } from 'playwright';
import { PORT, SHOTS } from './_env.mjs';

const b = await chromium.launch();
let fails = 0;
const ok = (name, cond, extra = '') => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${extra ? ' · ' + extra : ''}`); if (!cond) fails++; };
const SAVE = 'threads-of-fortune-save';

async function fresh(p) {
  await p.goto(`http://localhost:${PORT}/`);
  await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1')));
  await p.reload();
  await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
  await p.waitForFunction((k) => { try { return JSON.parse(localStorage.getItem(k)).state.started === true; } catch { return false; } }, SAVE, { timeout: 10000 }).catch(() => {});
}

/** past the lesson, at the stall with a buyer and a rug on the table */
async function atStall(p, rugs = [], { present = true } = {}) {
  await fresh(p);
  await p.evaluate((rugs) => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); const s = d.state; rugs.forEach(([id, condition], i) => s.inventory.unshift({ ...s.inventory[0], uid: `t${i}-${id}`, typeId: id, condition, paid: 0, stored: false })); s.tutorial = { done: true, step: 'done', inspected: true }; s.introSeen = ['malek', 'arran', 'abuhamid', 'bilgin-chess', 'rashid', 'nabil', 'cohen']; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; (window.__tofEdit = true, localStorage.setItem(k, JSON.stringify(d)), window.__tofEdit = false, (() => { const w = Storage.prototype.setItem; if (w.__hold) return; const h = function (key, v) { if (key === 'threads-of-fortune-save' && !window.__tofEdit) return; return w.call(this, key, v); }; h.__hold = true; Storage.prototype.setItem = h; setTimeout(() => { if (Storage.prototype.setItem === h) Storage.prototype.setItem = w; }, 4000); })()); localStorage.setItem('tof-skip-chapters', '1'); }, rugs);
  await p.reload(); if (await p.locator('[data-testid=continue]').count()) await p.click('[data-testid=continue]'); await p.waitForTimeout(1000);
  await p.click('[data-testid=nav-stall]');
  await p.waitForSelector('[data-testid=stall-wait]', { timeout: 20000 }).catch(() => {});
  if (await p.locator('[data-testid=stall-wait]').count()) await p.click('[data-testid=stall-wait]');
  await p.waitForSelector('[data-testid=actions] .act', { timeout: 15000 });
  await p.waitForTimeout(1200);
  if (!present) return;
  await p.locator('[data-testid=rugstrip] .rugcard:not(.empty)').first().click();
  await p.waitForTimeout(1500);
  for (let i = 0; i < 2; i++) for (const a of ['act-saffron_move', 'act-saffron_stay']) if (await p.locator(`[data-testid=${a}]`).count()) { await p.click(`[data-testid=${a}]`).catch(() => {}); await p.waitForTimeout(1500); }
}

const view = (p) => p.evaluate(() => { const c = document.querySelector('[data-testid=scene-carpet] canvas'); return c ? { yaw: +c.dataset.yaw, pitch: +c.dataset.pitch, zoom: +c.dataset.zoom } : null; });

// ---- phone and PC: the carpet on the counter, handled in place ----
for (const [w, h, tag] of [[412, 915, 'phone'], [1920, 1080, 'pc']]) {
  const touch = w < 900;
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: touch ? 2.625 : 1, hasTouch: touch, isMobile: touch });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await atStall(p);
  const live = p.locator('[data-testid=scene-carpet]');
  ok(`${tag}: the rug on the table is the live carpet`, (await live.count()) === 1 && (await p.locator('[data-testid=scene] canvas.cv-canvas').count()) === 1);
  ok(`${tag}: one table rug, no static picture`, (await p.locator('[data-testid=table-rug]').count()) === 1 && (await p.locator('[data-testid=table-rug] img').count()) === 0);
  // the picture keeps its size
  const sceneH0 = await p.locator('.stall > .scene').evaluate((e) => e.getBoundingClientRect().height);
  // it lies inside the picture
  const box = await live.boundingBox();
  const sb = await p.locator('.stall > .scene').boundingBox();
  ok(`${tag}: the carpet lies in the scene`, !!box && box.x >= sb.x - 1 && box.x + box.width <= sb.x + sb.width + 1 && box.y + box.height <= sb.y + sb.height + 1, JSON.stringify(box));
  // the things on the counter that answer a tap (gramophone, radio, Saffron) stay reachable (the paper
  // lies under the counter's front in this painting, as it did under the old picture of the rug)
  const blocked = await p.evaluate(() => [...document.querySelectorAll('[data-testid=stall-gramophone], [data-testid=stall-radio], [data-testid=saffron]')].filter((e) => { const r = e.getBoundingClientRect(); if (r.width < 2 || getComputedStyle(e).visibility === 'hidden' || e.classList.contains('kept-out')) return false; const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return t && t.closest('[data-testid=scene-carpet]'); }).map((e) => e.dataset.testid));
  ok(`${tag}: the carpet does not cover what answers a tap`, blocked.length === 0, blocked.join(' '));
  // drawn and then at rest (nothing redrawn while idle)
  await p.waitForTimeout(600);
  const frames = await p.evaluate(() => new Promise((r) => { const c = document.querySelector('[data-testid=scene-carpet] canvas'); const n0 = +c.dataset.draws; setTimeout(() => r([n0, +c.dataset.draws]), 700); }));
  ok(`${tag}: idle carpet does not redraw`, frames[0] > 0 && frames[0] === frames[1], frames.join('→'));
  // a drag across spins it
  const v0 = await view(p);
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  const drag = async (dx, dy) => {
    if (touch) {
      const cdp = await p.context().newCDPSession(p);
      const pt = (x, y) => [{ x, y, id: 1 }];
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(cx, cy) });
      for (let i = 1; i <= 8; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(cx + (dx * i) / 8, cy + (dy * i) / 8) }); await p.waitForTimeout(16); }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } else {
      await p.mouse.move(cx, cy); await p.mouse.down();
      for (let i = 1; i <= 8; i++) { await p.mouse.move(cx + (dx * i) / 8, cy + (dy * i) / 8); await p.waitForTimeout(16); }
      await p.mouse.up();
    }
    await p.waitForTimeout(900);
  };
  const lineBefore = await p.locator('[data-testid=speech]').textContent().catch(() => '');
  await drag(Math.min(140, box.width * 0.4), 0);
  const v1 = await view(p);
  ok(`${tag}: a drag across spins it round`, Math.abs(v1.yaw - v0.yaw) > 0.3, `${v0.yaw.toFixed(2)} → ${v1.yaw.toFixed(2)}`);
  await drag(0, -50);
  const v2 = await view(p);
  ok(`${tag}: a drag up tips it`, Math.abs(v2.pitch - v1.pitch) > 0.15, `${v1.pitch.toFixed(2)} → ${v2.pitch.toFixed(2)}`);
  ok(`${tag}: handling the carpet keeps the stall in place`, (await p.locator('[data-testid=stall]').count()) === 1 && (await p.locator('[data-testid=inspector]').count()) === 0 && (await p.locator('.stall > .scene').evaluate((e) => e.getBoundingClientRect().height)) === sceneH0);
  void lineBefore;
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/stall-carpet-${tag}.png` });
  // a double tap lays it straight
  // (two taps within 320 ms; headless drawing is slow, so the easing back is waited for)
  if (touch) { await p.touchscreen.tap(cx, cy); await p.touchscreen.tap(cx, cy); }
  else await p.mouse.dblclick(cx, cy);
  const straight = (v) => Math.abs(v.pitch - v0.pitch) < 0.02 && Math.abs(Math.sin(v.yaw - v0.yaw)) < 0.02;
  for (let i = 0; i < 50 && !straight(await view(p)); i++) await p.waitForTimeout(100);
  const v3 = await view(p);
  ok(`${tag}: a double tap lays it straight`, straight(v3), JSON.stringify(v3));
  // the full inspector still opens
  await p.click('[data-testid=inspect-btn]');
  await p.waitForSelector('[data-testid=inspector]', { timeout: 5000 }).catch(() => {});
  ok(`${tag}: Inspect still opens the full inspector`, (await p.locator('[data-testid=inspector] [data-testid=roll-bar]').count()) === 1 && (await p.locator('[data-testid=inspector] [data-testid=zoom-in]').count()) === 1);
  await p.click('[data-testid=inspector-close]').catch(() => {});
  await p.waitForTimeout(300);
  ok(`${tag}: no page errors`, errs.length === 0, errs.join(' | '));
  await p.close();
}

// ---- the lesson: the carpet on the table and the inspect steps ----
{
  const p = await b.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await fresh(p);
  const { serveFirstCustomer } = await import('./_env.mjs');
  await serveFirstCustomer(p);
  const idle = async () => { for (let i = 0; i < 80; i++) { if (!(await p.locator('.skip-hint').count())) return; await p.waitForTimeout(250); } };
  await idle();
  await p.click('[data-testid=act-ask_room]'); await p.waitForTimeout(400); await idle();
  await p.click('[data-testid=rug-desert-star]'); await p.waitForTimeout(600); await idle();
  ok('lesson: Desert Star lies live on the table', (await p.locator('[data-testid=scene-carpet]').count()) === 1);
  const step = () => p.evaluate((k) => JSON.parse(localStorage.getItem(k)).state.tutorial.step, SAVE);
  // the lesson goes straight from showing the rug to the talk (store.ts present: looking closer is
  // taught by the viewer's hint); the inspect steps, if they come back, must still pass
  const s0 = await step();
  ok('lesson: past the rug step', ['inspect', 'argue'].includes(s0), s0);
  // handling the carpet in the scene is not the inspector and moves the lesson nowhere
  const box = await p.locator('[data-testid=scene-carpet]').boundingBox();
  const cdp = await p.context().newCDPSession(p);
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy, id: 1 }] });
  for (let i = 1; i <= 8; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx + i * 12, y: cy, id: 1 }] }); await p.waitForTimeout(16); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await p.waitForTimeout(500);
  ok('lesson: turning the table carpet leaves the lesson where it was', (await step()) === s0 && (await p.locator('[data-testid=inspector]').count()) === 0, await step());
  if (s0 === 'inspect') {
    await p.click('[data-testid=inspect-btn]'); await p.waitForTimeout(600);
    ok('lesson: Inspect opens the inspector at inspect2', (await p.locator('[data-testid=inspector]').count()) === 1 && (await step()) === 'inspect2', await step());
    await p.click('[data-testid=inspector] [data-testid=zoom-in]'); await p.waitForTimeout(200);
    await p.click('[data-testid=inspector-close]'); await p.waitForTimeout(600); await idle();
    ok('lesson: a closer look and Done move on to argue', (await step()) === 'argue', await step());
  }
  // the talk goes on: the lesson's next move is offered and taken
  const next = p.locator('[data-testid=actions] .act.glow:not([disabled])').first();
  ok('lesson: the next move glows', (await next.count()) === 1);
  if (await next.count()) { await next.click(); await p.waitForTimeout(600); await idle(); }
  ok('lesson: the lesson moved on', (await step()) !== 'argue' || (await p.locator('[data-testid=act-name_price]:not([disabled])').count()) > 0, await step());
  ok('lesson: the carpet is still on the table', (await p.locator('[data-testid=scene-carpet]').count()) === 1);
  ok('lesson: no page errors', errs.length === 0, errs.join(' | '));
  await p.close();
}

// ---- the owner's three reports (Pixel 7a): a pale frame round some carpets, a carpet that did not
// appear, and a tap on a rug card that opened the inspector by itself ----
const PALE_RUGS = [['sinai-tent-band', 'Good'], ['siwa-kilim', 'Dirty'], ['bergama-hearth', 'Good'], ['ladik-tulip', 'Worn']];
const MORE_RUGS = [['persian-heriz', 'Damaged'], ['anatolian-hearth', 'Good'], ['kazak-star', 'Good']];
/** the carpet drawn on the counter: how much of it there is, and how much of its long edges is pale ground */
const drawn = (p) => p.evaluate(() => {
  const c = document.querySelector('[data-testid=scene-carpet] canvas');
  if (!c || !c.width) return { n: 0, pale: 1 };
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, W = c.width, H = c.height;
  const solid = (x, y) => d[(y * W + x) * 4 + 3] > 230;
  let n = 0, x0 = W, x1 = 0;
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (solid(x, y)) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; }
  if (!n) return { n: 0, pale: 1 };
  // down the middle half of the carpet: the first and last solid pixels of each column, a step inside
  let cols = 0, pale = 0;
  const isPale = (x, y) => { const i = (y * W + x) * 4, lo = Math.min(d[i], d[i + 1], d[i + 2]), hi = Math.max(d[i], d[i + 1], d[i + 2]); return lo > 165 && hi - lo < 45; };
  for (let x = Math.round(x0 + (x1 - x0) * 0.25); x < x0 + (x1 - x0) * 0.75; x += 2) {
    let t = 0; while (t < H && !solid(x, t)) t++;
    let b = H - 1; while (b > t && !solid(x, b)) b--;
    if (b - t < 6) continue;
    cols += 2;
    if (isPale(x, t + 2)) pale++;
    if (isPale(x, b - 2)) pale++;
  }
  return { n, pale: cols ? pale / cols : 1 };
});
const present = async (p, id, hold = 0) => {
  // the tray folds away at times (a question from the buyer): open it again
  if (!(await p.locator(`[data-testid=rug-${id}]`).isVisible().catch(() => false)) && await p.locator('[data-testid=tray-handle][aria-expanded=false]').count()) { await p.click('[data-testid=tray-handle]').catch(() => {}); await p.waitForTimeout(400); }
  const card = p.locator(`[data-testid=rug-${id}]`);
  await card.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
  const bb = await card.boundingBox({ timeout: 3000 }).catch(() => null);
  if (!bb) return false;
  const x = bb.x + bb.width / 2, y = bb.y + bb.height / 3;
  if (hold) {
    // a real finger: down, a moment, up (CDP touch, so the page's own pointer events run)
    const cdp = await p.context().newCDPSession(p);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
    await p.waitForTimeout(hold);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach().catch(() => {});
  } else await p.touchscreen.tap(x, y);
  return true;
};
const onTable = (p) => p.evaluate(() => document.querySelector('[data-testid=rugstrip] .rugcard.presented')?.dataset.testid?.replace('rug-', '') ?? '');
const inspector = (p) => p.locator('[data-testid=inspector]').count();
const closeInspector = async (p) => { if (await inspector(p)) { await p.click('[data-testid=inspector-close]').catch(() => {}); await p.waitForTimeout(300); } };
const waitDrawn = async (p, ms = 4000) => { let r = await drawn(p); for (let t = 0; t < ms && r.n < 300; t += 150) { await p.waitForTimeout(150); r = await drawn(p); } return r; };
const saffron = async (p) => { for (const a of ['act-saffron_move', 'act-saffron_stay']) if (await p.locator(`[data-testid=${a}]`).count()) { await p.click(`[data-testid=${a}]`).catch(() => {}); await p.waitForTimeout(600); } };

for (const roll of [false, true]) {
  const tag = roll ? 'phone, unrolling' : 'phone';
  const p = await b.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, hasTouch: true, isMobile: true });
  // the unroll is skipped in automated runs; this run takes the player's path (CarpetView mayRoll)
  if (roll) await p.addInitScript(() => { window.__tofRoll = true; });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await atStall(p, [...PALE_RUGS, ...MORE_RUGS], { present: false });
  await saffron(p);

  // 1. no pale frame: the photographs with a studio ground are drawn cut to the carpet
  for (const [id] of PALE_RUGS) {
    await present(p, id, 120); await p.waitForTimeout(400); await saffron(p);
    if ((await onTable(p)) !== id) { await present(p, id, 120); await p.waitForTimeout(400); }
    for (let i = 0; i < 30 && (await p.locator('[data-testid=table-rug][data-pic=full]').count()) === 0; i++) await p.waitForTimeout(150);
    await p.waitForTimeout(roll ? 2200 : 500);
    const r = await waitDrawn(p);
    ok(`${tag}: ${id} lies on the counter without a pale frame`, (await onTable(p)) === id && r.n > 300 && r.pale < 0.2, `on the table ${await onTable(p)}, pale edge ${(r.pale * 100).toFixed(0)}%`);
    ok(`${tag}: putting ${id} down did not open the inspector`, (await inspector(p)) === 0);
    await closeInspector(p);
    if (!roll && SHOTS) await p.screenshot({ path: `${SHOTS}/stall-carpet-${id}.png` }).catch(() => {});
  }

  // 3. a tap on a card while the buyer's line is typed out (the tray redraws all the while) only shows the rug
  const all = [...PALE_RUGS, ...MORE_RUGS].map(([id]) => id);
  let opened = 0, shown = 0;
  for (const id of all.slice(0, 5)) {
    if (!(await present(p, id, 140))) continue;
    await p.waitForTimeout(900);
    if (await inspector(p)) { opened++; await closeInspector(p); }
    else if ((await onTable(p)) === id) shown++;
    await saffron(p);
  }
  ok(`${tag}: a finger's tap on a card shows the rug and never opens the inspector`, opened === 0 && shown >= 3, `${shown} shown, ${opened} inspector`);
  // the same tap twice in quick succession is not a wish to look closer
  {
    const other = (await onTable(p)) === 'persian-heriz' ? 'anatolian-hearth' : 'persian-heriz';
    const card = p.locator(`[data-testid=rug-${other}]`);
    if (!(await card.isVisible().catch(() => false)) && await p.locator('[data-testid=tray-handle][aria-expanded=false]').count()) { await p.click('[data-testid=tray-handle]').catch(() => {}); await p.waitForTimeout(400); }
    await card.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
    const bb = await card.boundingBox();
    const cdp = await p.context().newCDPSession(p);
    const pt = [{ x: bb.x + bb.width / 2, y: bb.y + bb.height / 3, id: 1 }];
    for (let k = 0; k < 2; k++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt }); await new Promise((r) => setTimeout(r, 90));
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await new Promise((r) => setTimeout(r, 160));
    }
    await cdp.detach().catch(() => {});
    await p.waitForTimeout(900);
    ok(`${tag}: a double tap on a card puts it down without opening the inspector`, (await inspector(p)) === 0 && (await onTable(p)) === other, await onTable(p));
    await closeInspector(p);
  }
  // a deliberate press and hold still looks closer
  const found = await present(p, 'kazak-star', 800);
  await p.waitForTimeout(500);
  ok(`${tag}: pressing and holding a card opens the inspector`, (await inspector(p)) === 1, `card found ${found}, on the table ${await onTable(p)}, tray ${await p.locator('[data-testid=rugstrip]').isVisible()}`);
  await closeInspector(p);
  // a tap and a drag on the carpet itself never open it
  {
    const bb = await p.locator('[data-testid=scene-carpet]').boundingBox();
    if (bb) {
      await p.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.waitForTimeout(700);
      const cdp = await p.context().newCDPSession(p);
      const cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy, id: 1 }] });
      await p.waitForTimeout(700);
      for (let i = 1; i <= 6; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx + i * 10, y: cy, id: 1 }] }); await p.waitForTimeout(16); }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await p.waitForTimeout(800);
    }
    ok(`${tag}: a tap, a hold and a drag on the table carpet never open the inspector`, !!bb && (await inspector(p)) === 0);
  }

  // 2. the carpet always appears: rugs swapped quickly, stepping away and back, the inspector opened and closed
  for (let k = 0; k < 7; k++) { await present(p, all[k % all.length], 60); await p.waitForTimeout(70); }
  await p.waitForTimeout(400); await saffron(p);
  // (the buyer may have had enough of the swapping and gone; then the next one is served)
  if (!(await p.locator('[data-testid=actions] .act').count())) {
    for (const s of ['let-go', 'stall-wait', 'nav-stall']) if (!(await p.locator('[data-testid=actions] .act').count()) && await p.locator(`[data-testid=${s}]`).count()) { await p.click(`[data-testid=${s}]`).catch(() => {}); await p.waitForTimeout(1500); }
    await p.waitForSelector('[data-testid=actions] .act', { timeout: 20000 }).catch(() => {});
    await saffron(p);
    await present(p, 'sinai-tent-band', 100); await p.waitForTimeout(500); await saffron(p);
  }
  let r = await waitDrawn(p);
  ok(`${tag}: after rugs swapped quickly, a carpet lies on the table`, (await p.locator('[data-testid=table-rug]').count()) === 1 && r.n > 300, `${r.n} px`);
  ok(`${tag}: and no inspector opened by itself`, (await inspector(p)) === 0);
  await closeInspector(p);
  if (await p.locator('[data-testid=inspect-btn]:not([disabled])').isVisible().catch(() => false)) {
    await p.click('[data-testid=inspect-btn]', { timeout: 3000 }).catch(() => {}); await p.waitForTimeout(700);
    await closeInspector(p);
    r = await waitDrawn(p);
    ok(`${tag}: after the inspector is closed the carpet is still drawn`, r.n > 300, `${r.n} px`);
  }
  // the page hidden and shown again (a phone switching apps) draws it again
  await p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  r = await waitDrawn(p);
  ok(`${tag}: drawn after the page is shown again`, r.n > 300, `${r.n} px`);
  if (await p.locator('[data-testid=step-away]').count()) {
    await p.click('[data-testid=step-away]').catch(() => {}); await p.waitForTimeout(1200);
    for (const s of ['stall-wait', 'nav-stall']) if (await p.locator(`[data-testid=${s}]`).count() && !(await p.locator('[data-testid=actions] .act').count())) { await p.click(`[data-testid=${s}]`).catch(() => {}); await p.waitForTimeout(1500); }
    await p.waitForSelector('[data-testid=actions] .act', { timeout: 15000 }).catch(() => {});
    await saffron(p);
    if (!(await p.locator('[data-testid=table-rug]').count())) { await present(p, 'sinai-tent-band', 100); await p.waitForTimeout(500); }
    r = await waitDrawn(p);
    ok(`${tag}: after stepping away and back the carpet is drawn`, r.n > 300, `${r.n} px`);
  }
  ok(`${tag}: no page errors`, errs.length === 0, errs.join(' | '));
  await p.close();
}

// 2. on a slow line, and with a picture that will not come: the small picture the tray already has goes
// down at once, and a plain picture stands in for one that fails
{
  const p = await b.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, hasTouch: true, isMobile: true });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await atStall(p, [['sinai-tent-band', 'Dirty'], ['bergama-hearth', 'Good'], ['ladik-tulip', 'Good']], { present: false });
  await saffron(p);
  await p.waitForFunction(() => [...document.querySelectorAll('.rugcard img')].every((i) => i.complete), null, { timeout: 20000 }).catch(() => {});
  await p.route('**/art/rugs/ladik-tulip.webp', (rt) => rt.abort());
  // the full pictures (not the tray's small ones) take seven seconds to come
  let slow = true;
  await p.route(/\/art\/rugs\/(sinai-tent-band|bergama-hearth)\.webp/, async (rt) => { if (slow) await new Promise((r) => setTimeout(r, 7000)); await rt.continue().catch(() => {}); });
  for (const id of ['sinai-tent-band', 'bergama-hearth']) {
    await present(p, id, 100);
    await p.waitForTimeout(150); await saffron(p);
    const t0 = Date.now(); const r = await waitDrawn(p, 2500);
    ok(`slow line: ${id} is on the counter at once, from the small picture`, (await onTable(p)) === id && r.n > 300, `${r.n} px after ${Date.now() - t0} ms, ${await p.locator('[data-testid=table-rug]').getAttribute('data-pic').catch(() => '?')}`);
  }
  slow = false;
  await present(p, 'ladik-tulip', 100); await p.waitForTimeout(300); await saffron(p);
  await p.waitForTimeout(2500);
  const r = await waitDrawn(p);
  ok('a carpet whose full picture fails is still drawn', (await onTable(p)) === 'ladik-tulip' && r.n > 300, `${r.n} px`);
  ok('slow line: no page errors', errs.length === 0, errs.join(' | '));
  await p.close();
}

// the PC: a right click on a card looks closer at once; a click only shows the rug
{
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await atStall(p, PALE_RUGS, { present: false });
  await saffron(p);
  await p.click('[data-testid=rug-sinai-tent-band]', { delay: 140 }); await p.waitForTimeout(900);
  ok('pc: a click on a card shows the rug and opens nothing', (await onTable(p)) === 'sinai-tent-band' && (await inspector(p)) === 0);
  await p.waitForTimeout(800);
  const r = await waitDrawn(p);
  ok('pc: Sinai Tent Band lies without a pale frame', r.n > 300 && r.pale < 0.2, `pale edge ${(r.pale * 100).toFixed(0)}%`);
  await p.click('[data-testid=rug-siwa-kilim]', { button: 'right' }); await p.waitForTimeout(700);
  ok('pc: a right click on a card opens the inspector', (await inspector(p)) === 1);
  // the inspector's carpet is cut to the carpet too
  const cut = await p.evaluate(async () => {
    const m = await import('/src/components/RugViewer/trim.ts');
    const out = {};
    for (const id of ['sinai-tent-band', 'siwa-kilim', 'bergama-hearth', 'polonaise-silk', 'anatolian-hearth', 'persian-heriz']) { const im = new Image(); im.src = `art/rugs/${id}.webp`; await im.decode(); const c = m.carpetCrop(im); out[id] = c && { l: c.x / im.naturalWidth, t: c.y / im.naturalHeight, r: 1 - (c.x + c.w) / im.naturalWidth, b: 1 - (c.y + c.h) / im.naturalHeight }; }
    return out;
  });
  const big = (c) => c && Math.max(c.t, c.b) > 0.05;
  ok('trim: the studio ground is cut from the photographs that have one', big(cut['sinai-tent-band']) && big(cut['siwa-kilim']) && big(cut['bergama-hearth']) && big(cut['polonaise-silk']), JSON.stringify(cut['sinai-tent-band']));
  ok('trim: a photograph that is all carpet is left whole', cut['anatolian-hearth'] === null, JSON.stringify(cut['anatolian-hearth']));
  ok('trim: a transparent ground is cut away', !!cut['persian-heriz'] && cut['persian-heriz'].l > 0, JSON.stringify(cut['persian-heriz']));
  await closeInspector(p);
  ok('pc: no page errors', errs.length === 0, errs.join(' | '));
  await p.close();
}

// the royal audience lays the same carpet before the royal buyer
{
  const p = await b.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, hasTouch: true, isMobile: true });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await atStall(p, PALE_RUGS, { present: false });
  await saffron(p);
  const royal = await p.evaluate(async () => {
    const m = await import(performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/game/state/store.ts')));
    const { BUYERS } = await import('/src/data/buyers.ts');
    const id = Object.keys(BUYERS).find((k) => BUYERS[k].royal);
    const s = m.useGame.getState();
    m.useGame.setState({ encounter: { ...s.encounter, buyerId: id, venue: BUYERS[id].royal.venue, saffronOn: undefined, presented: undefined, outcome: undefined, prompt: undefined } });
    return id;
  });
  await p.waitForSelector('[data-testid=scene][data-audience]', { timeout: 5000 }).catch(() => {});
  ok('audience: the audience scene is up', (await p.locator('[data-testid=scene][data-audience]').count()) === 1, royal);
  await present(p, 'sinai-tent-band', 130); await p.waitForTimeout(900);
  ok('audience: a tap on a card does not open the inspector', (await inspector(p)) === 0);
  await closeInspector(p);
  const r = await waitDrawn(p);
  ok('audience: the carpet lies before the royal buyer, without a pale frame', (await p.locator('.audience-rug.live [data-testid=scene-carpet]').count()) === 1 && r.n > 300 && r.pale < 0.2, `${r.n} px, pale edge ${(r.pale * 100).toFixed(0)}%`);
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/stall-carpet-audience.png` });
  ok('audience: no page errors', errs.length === 0, errs.join(' | '));
  await p.close();
}

await b.close();
console.log(fails ? `${fails} FAILED` : 'all ok');
process.exit(fails ? 1 : 0);
