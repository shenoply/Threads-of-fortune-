// The stall's small moments (StallMoments.tsx): tea offered pours a glass that then stays on the counter;
// a sale puts coins down; a lantern hangs lit in the evening and not at noon; and the rug cards in the
// tray show the carpet without its pale studio ground (Sinai Tent Band). Phone and PC.
//   PORT=5209 node --import ./tests/_nohmr.mjs tests/stall-moments.mjs
// SHOTS=<dir> keeps pictures: tea mid-pour, the glass resting, the coins, the lamp at dusk, the tray.
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

/** at the stall with a buyer, at an hour, with the tea service, Sinai Tent Band first in the tray */
async function atStall(p, hour) {
  await fresh(p);
  await p.evaluate((hour) => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); const s = d.state; s.inventory.unshift({ ...s.inventory[0], uid: 't-sinai', typeId: 'sinai-tent-band', condition: 'Good', paid: 0, stored: false }); s.upgrades = [...new Set([...(s.upgrades || []), 'tea'])]; s.world.hour = hour; s.tutorial = { done: true, step: 'done', inspected: true }; s.introSeen = ['malek', 'arran', 'abuhamid', 'bilgin-chess', 'rashid', 'nabil', 'cohen']; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; (window.__tofEdit = true, localStorage.setItem(k, JSON.stringify(d)), window.__tofEdit = false, (() => { const w = Storage.prototype.setItem; if (w.__hold) return; const h = function (key, v) { if (key === 'threads-of-fortune-save' && !window.__tofEdit) return; return w.call(this, key, v); }; h.__hold = true; Storage.prototype.setItem = h; setTimeout(() => { if (Storage.prototype.setItem === h) Storage.prototype.setItem = w; }, 4000); })()); localStorage.setItem('tof-skip-chapters', '1'); }, hour);
  await p.reload(); if (await p.locator('[data-testid=continue]').count()) await p.click('[data-testid=continue]'); await p.waitForTimeout(1000);
  await p.evaluate(async () => {
    const url = (f) => performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes(f)) ?? f;
    window.__g = (await import(url('/src/game/state/store.ts'))).useGame;
  });
  await p.click('[data-testid=nav-stall]');
  await p.waitForSelector('[data-testid=stall-wait]', { timeout: 20000 }).catch(() => {});
  if (await p.locator('[data-testid=stall-wait]').count()) await p.click('[data-testid=stall-wait]');
  await p.waitForSelector('[data-testid=actions] .act', { timeout: 15000 });
  await p.waitForTimeout(1200);
}

/** what lies under a point of the page, for "does it cover something that answers a tap" */
const covered = (p, sel) => p.evaluate((sel) => [...document.querySelectorAll('[data-testid=stall-gramophone], [data-testid=stall-radio], [data-testid=saffron], [data-testid=know-buyer]')].filter((e) => { const r = e.getBoundingClientRect(); if (r.width < 2 || e.classList.contains('kept-out')) return false; const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return t && t.closest(sel); }).map((e) => e.dataset.testid), sel);
const box = (p, sel) => p.locator(sel).first().boundingBox();
const inter = (a, b) => !!a && !!b && a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

for (const [w, h, tag] of [[412, 915, 'phone'], [1920, 1080, 'pc']]) {
  const touch = w < 900;
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: touch ? 2 : 1, hasTouch: touch, isMobile: touch });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));

  // ---- noon: no lamp; the tray's cards ----
  await atStall(p, 12);
  ok(`${tag}: no lamp at noon`, (await p.locator('[data-testid=moment-lamp]').count()) === 0);
  // the Sinai Tent Band card: its picture is the trimmed thumbnail, and its border rows are not the pale ground
  const card = p.locator('[data-testid=rug-sinai-tent-band] .thumb img').first();
  await card.waitFor({ timeout: 8000 }).catch(() => {});
  const pale = await card.evaluate((img) => new Promise((res) => {
    // a row of studio ground is nearly all pale and flat; the carpet's edge has pattern and fringe
    const go = () => { const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; const g = c.getContext('2d'); g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data; const rows = [0, 1, c.height - 2, c.height - 1].map((y) => { let n = 0, s = 0, s2 = 0; for (let x = 0; x < c.width; x++) { const i = (y * c.width + x) * 4; if (d[i] > 200 && d[i + 1] > 190 && d[i + 2] > 170) n++; const l = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; s += l; s2 += l * l; } const m = s / c.width; return { pale: n / c.width, sd: Math.sqrt(Math.max(0, s2 / c.width - m * m)) }; }); res({ share: Math.max(...rows.map((r) => (r.pale > 0.5 && r.sd < 14 ? 1 : 0))), rows: rows.map((r) => `${r.pale.toFixed(2)}/${r.sd.toFixed(0)}`).join(' '), w: c.width, h: c.height }); };
    img.complete ? go() : (img.onload = go);
  })).catch((e) => ({ share: 1, err: String(e) }));
  ok(`${tag}: Sinai Tent Band card has no pale margin`, pale.share === 0 && pale.w / pale.h > 2, JSON.stringify(pale));
  await p.locator('[data-testid=rugstrip]').screenshot({ path: `${SHOTS}/moments-${tag}-tray.png` }).catch(() => {});

  // ---- tea ----
  ok(`${tag}: no glass before tea`, (await p.locator('[data-testid=moment-tea]').count()) === 0);
  await p.evaluate(() => window.__g.getState().act('tea'));
  await p.waitForSelector('[data-testid=moment-tea]', { timeout: 4000 }).catch(() => {});
  ok(`${tag}: tea pours`, (await p.locator('[data-testid=moment-tea]').getAttribute('data-state').catch(() => '')) === 'play');
  await p.waitForTimeout(1250);
  await p.screenshot({ path: `${SHOTS}/moments-${tag}-tea-pour.png` });
  await p.waitForTimeout(2050);
  const teaEl = p.locator('[data-testid=moment-tea]');
  const pos = await teaEl.evaluate((e) => getComputedStyle(e).backgroundPositionX).catch(() => '');
  ok(`${tag}: the glass stays after the pour (last frame)`, (await teaEl.count()) === 1 && pos === '100%', pos);
  ok(`${tag}: tea leaves taps alone`, (await covered(p, '[data-testid=moment-tea]')).length === 0 && (await teaEl.evaluate((e) => getComputedStyle(e).pointerEvents)) === 'none');
  // the glass is by the buyer, on the counter, inside the picture
  const tb = await box(p, '[data-testid=moment-tea]'), sb = await box(p, '[data-testid=scene]');
  ok(`${tag}: the glass is in the picture`, !!tb && tb.x >= sb.x && tb.x + tb.width <= sb.x + sb.width && tb.y + tb.height <= sb.y + sb.height + 2, JSON.stringify(tb));

  // a rug on the table: the glass is still there and clear of the carpet
  await p.locator('[data-testid=rugstrip] .rugcard:not(.empty)').first().click();
  await p.waitForTimeout(1500);
  for (let i = 0; i < 2; i++) for (const a of ['act-saffron_move', 'act-saffron_stay']) if (await p.locator(`[data-testid=${a}]`).count()) { await p.click(`[data-testid=${a}]`).catch(() => {}); await p.waitForTimeout(1500); }
  ok(`${tag}: the glass stays for the visit`, (await teaEl.count()) === 1);
  const rugB = await box(p, '[data-testid=scene-carpet]');
  // the glass itself sits in the right third of its frame
  const glass = tb && { x: tb.x + tb.width * 0.57, y: tb.y + tb.height * 0.6, width: tb.width * 0.18, height: tb.height * 0.32 };
  ok(`${tag}: the glass is clear of the carpet`, !inter(glass, rugB), JSON.stringify({ glass, rugB }));
  await p.screenshot({ path: `${SHOTS}/moments-${tag}-tea-glass.png` });

  // ---- a sale: coins ----
  ok(`${tag}: no coins before the sale`, (await p.locator('[data-testid=moment-coins]').count()) === 0);
  await p.evaluate(() => { const g = window.__g; const e = g.getState().encounter; g.setState({ encounter: { ...e, outcome: 'sold', salePrice: 800, stage: 'close' } }); });
  await p.waitForSelector('[data-testid=moment-coins]', { timeout: 4000 }).catch(() => {});
  ok(`${tag}: a sale drops coins`, (await p.locator('[data-testid=moment-coins]').getAttribute('data-state').catch(() => '')) === 'play');
  await p.waitForTimeout(1300);
  ok(`${tag}: coins leave taps alone`, (await covered(p, '[data-testid=moment-coins]')).length === 0);
  await p.screenshot({ path: `${SHOTS}/moments-${tag}-coins.png` });
  if (process.env.DEBUG) console.log(await p.locator('[data-testid=moment-coins]').evaluate((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return JSON.stringify({ r, bg: cs.backgroundImage, pos: cs.backgroundPositionX, size: cs.backgroundSize, z: cs.zIndex, vis: cs.visibility, op: cs.opacity, top: document.elementFromPoint(r.left + r.width / 2, r.top + r.height * 0.75)?.className }); }));
  await p.close();

  // ---- dusk: the lamp ----
  const q = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: touch ? 2 : 1, hasTouch: touch, isMobile: touch });
  q.on('pageerror', (e) => errs.push(e.message));
  await atStall(q, 19);
  const lamp = q.locator('[data-testid=moment-lamp]');
  ok(`${tag}: the lamp is lit at dusk`, (await lamp.count()) === 1 && (await lamp.evaluate((e) => getComputedStyle(e).animationName)) === 'tof-moment');
  ok(`${tag}: the lamp leaves taps alone`, (await covered(q, '[data-testid=moment-lamp]')).length === 0);
  const lb = await box(q, '[data-testid=moment-lamp]'), hb = await box(q, '[data-testid=hero-at-stall] img, [data-testid=hero-at-stall]');
  ok(`${tag}: the lamp is in the picture`, !!lb && lb.width > 8 && lb.y >= (await box(q, '[data-testid=scene]')).y - 1, JSON.stringify(lb));
  await q.screenshot({ path: `${SHOTS}/moments-${tag}-lamp.png` });
  void hb;
  await q.close();

  // ---- reduced motion: the last frame, still ----
  const r = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  await atStall(r, 19);
  await r.evaluate(() => window.__g.getState().act('tea'));
  await r.waitForTimeout(400);
  const rs = await r.locator('[data-testid=moment-tea]').evaluate((e) => [e.dataset.state, getComputedStyle(e).animationName, getComputedStyle(e).backgroundPositionX]).catch(() => []);
  ok(`${tag}: reduced motion shows the glass without the pour`, rs[0] === 'rest' && rs[1] === 'none' && rs[2] === '100%', rs.join(' '));
  const rl = await r.locator('[data-testid=moment-lamp]').evaluate((e) => getComputedStyle(e).animationName).catch(() => '');
  ok(`${tag}: reduced motion keeps the lamp still`, rl === 'none', rl);
  await r.close();
  ok(`${tag}: no page errors`, errs.length === 0, errs.join(' | '));
}
await b.close();
console.log(fails ? `${fails} failed` : 'all ok');
process.exit(fails ? 1 : 0);
