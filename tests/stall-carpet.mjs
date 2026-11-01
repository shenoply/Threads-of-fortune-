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
async function atStall(p) {
  await fresh(p);
  await p.evaluate(() => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); const s = d.state; s.tutorial = { done: true, step: 'done', inspected: true }; s.introSeen = ['malek', 'arran', 'abuhamid', 'bilgin-chess', 'rashid', 'nabil', 'cohen']; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; (window.__tofEdit = true, localStorage.setItem(k, JSON.stringify(d)), window.__tofEdit = false, (() => { const w = Storage.prototype.setItem; if (w.__hold) return; const h = function (key, v) { if (key === 'threads-of-fortune-save' && !window.__tofEdit) return; return w.call(this, key, v); }; h.__hold = true; Storage.prototype.setItem = h; setTimeout(() => { if (Storage.prototype.setItem === h) Storage.prototype.setItem = w; }, 4000); })()); localStorage.setItem('tof-skip-chapters', '1'); });
  await p.reload(); if (await p.locator('[data-testid=continue]').count()) await p.click('[data-testid=continue]'); await p.waitForTimeout(1000);
  await p.click('[data-testid=nav-stall]');
  await p.waitForSelector('[data-testid=stall-wait]', { timeout: 20000 }).catch(() => {});
  if (await p.locator('[data-testid=stall-wait]').count()) await p.click('[data-testid=stall-wait]');
  await p.waitForSelector('[data-testid=actions] .act', { timeout: 15000 });
  await p.waitForTimeout(1200);
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

await b.close();
console.log(fails ? `${fails} FAILED` : 'all ok');
process.exit(fails ? 1 : 0);
