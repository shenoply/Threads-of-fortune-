// Malek's grill, played in the browser: the door picture, the 3D room (drag, wheel, pinch, reset,
// walls fading, hotspots), ordering with the confirm step (one charge for a double tap), parcels
// bought, carried, eaten from Stock, the save surviving a reload, closed hours, and the exit.
//   PORT=5173 SHOTS=/tmp/malek W=390 H=844 node tests/malek.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const PORT = process.env.PORT ?? '4173', S = process.env.SHOTS ?? '/tmp/malek';
mkdirSync(S, { recursive: true });
const W = +(process.env.W ?? 390), H = +(process.env.H ?? 844);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: !!process.env.TOUCH });
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/favicon|404|Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 160)); });
const has = (id) => p.locator(`[data-testid="${id}"]`).count();
const st = async () => JSON.parse(await p.evaluate(() => localStorage.getItem('threads-of-fortune-save'))).state;
const edit = (fn) => p.evaluate((src) => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); new Function('s', 'd', src)(d.state, d); localStorage.setItem(k, JSON.stringify(d)); }, fn);
const reload = async () => { await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(800); };
const toShop = async () => {
  await p.click('[data-testid=nav-stall]'); await p.waitForSelector('[data-testid=district]'); await p.waitForTimeout(400);
  if (await has('stall-sheet-close')) await p.click('[data-testid=stall-sheet-close]');
  await p.locator('[data-testid=poi-malek]').scrollIntoViewIfNeeded(); await p.click('[data-testid=poi-malek]');
  await p.waitForSelector('[data-testid=malek-shop]', { timeout: 20000 }); await p.waitForTimeout(500);
};
const camPos = () => p.evaluate(() => { const c = document.querySelector('[data-testid=malek-stage] canvas'); return c ? c.toDataURL('image/png').length : 0; });
try {
  await p.goto(`http://localhost:${PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'))); await p.reload();
  await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
  await edit(`s.tutorial = { done: true, step: 'done', inspected: true }; s.missionNews = undefined; s.levelUps = []; s.titleNews = [];
    Object.assign(s.world, { at: 'giza', hour: 6 }); s.cash = 300; s.queue = []; s.visitIdx = 0; s.condition = { fatigue: 40, dependence: 0, fed: 20, water: 60 }; localStorage.setItem('tof-skip-chapters', '1');`);
  await reload();

  // closed at 06:00
  await toShop();
  console.log('06:00 closed card:', await has('malek-closed'), '| visits counted:', (await st()).malek?.visits ?? 0);
  await p.screenshot({ path: `${S}/m-closed.png` });
  await p.click('[data-testid=malek-leave]'); await p.waitForTimeout(300);
  console.log('left: shop gone?', !(await has('malek-shop')));

  // noon: the door picture, then inside
  await edit(`s.world.hour = 12.5;`); await reload();
  await toShop();
  const scene1 = await p.locator('[data-testid=malek-door]').getAttribute('data-scene');
  console.log('12:30 door scene:', scene1, '|', (await p.locator('.malek-say').textContent()).slice(0, 80));
  await p.screenshot({ path: `${S}/m-door.png` });
  await p.click('[data-testid=malek-enter]');
  await p.waitForSelector('[data-testid=malek-stage] canvas', { timeout: 30000 }); await p.waitForTimeout(2500);
  console.log('3D canvas:', await p.locator('[data-testid=malek-stage] canvas').count(), '| fallback:', await has('malek-fallback'));
  await p.screenshot({ path: `${S}/m-room.png` });
  const hot = async (h) => { const bx = await p.locator(`[data-testid=malek-hot-${h}]`).boundingBox(); const o = await p.locator(`[data-testid=malek-hot-${h}]`).evaluate((e) => e.style.opacity); return bx ? `${Math.round(bx.x)},${Math.round(bx.y)} op${o}` : 'none'; };
  console.log('hotspots:', 'malek', await hot('malek'), '| menu', await hot('menu'), '| tables', await hot('tables'), '| exit', await hot('exit'));

  // drag to turn: a small wobble must not move the camera; a real drag does, within limits
  const stage = await p.locator('[data-testid=malek-stage]').boundingBox();
  const cx = stage.x + stage.width / 2, cy = stage.y + stage.height / 2;
  console.log('orbit at start:', JSON.stringify(await p.evaluate(() => window.__malekOrbit?.current)));
  const before = await hot('malek');
  await p.mouse.move(cx, cy); await p.mouse.down(); await p.mouse.move(cx + 4, cy + 3, { steps: 3 }); await p.mouse.up(); await p.waitForTimeout(500);
  console.log('4px wobble moves nothing:', before === (await hot('malek')));
  await p.mouse.move(cx, cy); await p.mouse.down(); await p.mouse.move(cx + 2000, cy, { steps: 30 }); await p.mouse.up(); await p.waitForTimeout(900);
  await p.screenshot({ path: `${S}/m-turned-max.png` });
  const afterMax = await hot('malek');
  await p.mouse.move(cx, cy); await p.mouse.down(); await p.mouse.move(cx + 2000, cy, { steps: 30 }); await p.mouse.up(); await p.waitForTimeout(900);
  console.log('drag turns, then stops at the limit:', before !== afterMax, afterMax === (await hot('malek')));
  await p.mouse.move(cx, cy); await p.mouse.down(); await p.mouse.move(cx - 4000, cy - 400, { steps: 40 }); await p.mouse.up(); await p.waitForTimeout(900);
  await p.screenshot({ path: `${S}/m-turned-left.png` });
  // wheel zoom
  await p.mouse.move(cx, cy); await p.mouse.wheel(0, -1500); await p.waitForTimeout(900);
  await p.screenshot({ path: `${S}/m-zoomed.png` });
  const zoomed = await hot('malek');
  await p.click('[data-testid=malek-reset]'); await p.waitForTimeout(1200);
  console.log('orbit after reset:', JSON.stringify(await p.evaluate(() => window.__malekOrbit?.current)));
  const near = (a, b) => { const [x1, y1] = a.split(' ')[0].split(',').map(Number), [x2, y2] = b.split(' ')[0].split(',').map(Number); return Math.abs(x1 - x2) < 6 && Math.abs(y1 - y2) < 6; };
  console.log('reset returns the view:', near(await hot('malek'), before), `(before ${before}, zoomed ${zoomed}, after ${await hot('malek')})`);
  // pinch with two fingers (pointer events, as a phone sends them) zooms in
  const r0 = await p.evaluate(() => window.__malekOrbit.current.r);
  await p.evaluate(({ cx, cy }) => {
    const el = document.querySelector('[data-testid=malek-stage]');
    const ev = (type, id, x) => el.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: x, clientY: cy, bubbles: true, isPrimary: id === 1 }));
    ev('pointerdown', 1, cx - 30); ev('pointerdown', 2, cx + 30);
    for (let i = 1; i <= 10; i++) { ev('pointermove', 1, cx - 30 - i * 8); ev('pointermove', 2, cx + 30 + i * 8); }
    ev('pointerup', 1, cx - 110); ev('pointerup', 2, cx + 110);
  }, { cx, cy });
  console.log('pinch out zooms in: r', r0.toFixed(1), '->', (await p.evaluate(() => window.__malekOrbit.current.r)).toFixed(1));
  await p.click('[data-testid=malek-reset]'); await p.waitForTimeout(800);
  // a scroll over the menu scrolls the menu, never the room
  await p.click('[data-testid=malek-tab-menu]'); await p.waitForTimeout(200);
  const o1 = JSON.stringify(await p.evaluate(() => window.__malekOrbit.current));
  const mb = await p.locator('[data-testid=malek-menu]').boundingBox();
  await p.mouse.move(mb.x + mb.width / 2, mb.y + 40); await p.mouse.wheel(0, 600); await p.waitForTimeout(300);
  console.log('menu scroll leaves the room alone:', o1 === JSON.stringify(await p.evaluate(() => window.__malekOrbit.current)), '| menu scrolled', await p.locator('[data-testid=malek-menu]').evaluate((e) => e.scrollTop));
  await p.click('[data-testid=malek-tab-menu]'); await p.waitForTimeout(200);
  // what the room costs to draw
  console.log('render cost:', JSON.stringify(await p.evaluate(() => { const i = window.__malekGl.info; return { calls: i.render.calls, triangles: i.render.triangles, textures: i.memory.textures, geometries: i.memory.geometries }; })));
  // the page itself never scrolled
  console.log('page scrollY', await p.evaluate(() => scrollY));

  // Malek hotspot talks; menu hotspot opens the menu
  await p.click('[data-testid=malek-hot-malek]'); await p.waitForTimeout(300);
  console.log('talk:', (await p.locator('[data-testid=malek-speech]').textContent()).slice(0, 90));
  await p.click('[data-testid=malek-hot-menu]'); await p.waitForTimeout(300);
  console.log('menu open:', await has('malek-menu'), '| ful (morning only) off at 12:30:', await has('malek-off-malek_ful'));
  await p.screenshot({ path: `${S}/m-menu.png` });

  // order kofta: confirm shows price, servings, weight; a double tap charges once
  const cash0 = (await st()).cash;
  await p.click('[data-testid=malek-buy-malek_kofta]'); await p.waitForSelector('[data-testid=malek-confirm]');
  console.log('confirm:', (await p.locator('[data-testid=malek-confirm]').innerText()).replace(/\s+/g, ' ').slice(0, 260));
  await p.screenshot({ path: `${S}/m-confirm.png` });
  // two clicks on the same Pay button in the same moment (a double tap): one charge
  await p.evaluate(() => { const btn = document.querySelector('[data-testid=malek-pay]'); btn.click(); btn.click(); }); await p.waitForTimeout(500);
  let s = await st();
  console.log('charged once:', cash0 - s.cash, '(price 7) | fed', s.condition.fed, 'fatigue', s.condition.fatigue, '| hour', s.world.hour.toFixed(2), '| ledger', s.ledger.filter((l) => /Malek/.test(l.label)).length);
  console.log('result:', (await p.locator('[data-testid=malek-result]').innerText()).replace(/\s+/g, ' ').slice(0, 260));
  await p.screenshot({ path: `${S}/m-result.png` });
  await p.click('[data-testid=malek-result-ok]');
  // a second kofta: no extra energy within the window
  await p.click('[data-testid=malek-buy-malek_kofta]'); await p.click('[data-testid=malek-pay]'); await p.waitForTimeout(300);
  s = await st();
  console.log('second kofta: fatigue', s.condition.fatigue, 'fed', s.condition.fed, '| report:', (await p.locator('[data-testid=malek-report]').innerText()).replace(/\s+/g, ' ').slice(0, 200));
  await p.click('[data-testid=malek-result-ok]');

  // parcels: bought into the pack, nothing eaten yet
  const fedBefore = s.condition.fed;
  await p.click('[data-testid=malek-buy-malek_caravan_pack]'); await p.click('[data-testid=malek-pay]'); await p.waitForTimeout(300); await p.click('[data-testid=malek-result-ok]');
  await p.click('[data-testid=malek-buy-malek_bastirma]'); await p.click('[data-testid=malek-pay]'); await p.waitForTimeout(300); await p.click('[data-testid=malek-result-ok]');
  s = await st();
  console.log('parcels:', JSON.stringify(s.parcels.map((x) => [x.item, x.servings, x.spoilsDay])), '| fed unchanged by buying:', s.condition.fed === fedBefore);
  await p.click('[data-testid=malek-tab-food]'); await p.waitForTimeout(200);
  await p.screenshot({ path: `${S}/m-parcels.png` });

  // reload: everything kept
  await reload();
  s = await st();
  console.log('after reload: cash', s.cash, '| parcels', s.parcels.length, '| malek visits', s.malek.visits, 'sold', JSON.stringify(s.malek.sold));

  // stock: eat from the caravan parcel
  await p.click('[data-testid=nav-inventory]').catch(() => {}); await p.waitForTimeout(600);
  console.log('stock parcels:', await has('inv-parcels'));
  const pack = s.parcels.find((x) => x.item === 'malek_caravan_pack');
  const hour0 = s.world.hour;
  await p.click(`[data-testid=inv-eat-${pack.uid}]`); await p.waitForTimeout(300);
  s = await st();
  console.log('ate one: servings', s.parcels.find((x) => x.uid === pack.uid)?.servings, '| water', s.condition.water, '| time unchanged', s.world.hour === hour0, '|', await p.locator('[data-testid=inv-parcel-note]').textContent());
  await p.locator('[data-testid=inv-parcels]').screenshot({ path: `${S}/m-stock.png` });

  // the visit picture does not repeat at once when another fits
  const seen = [scene1];
  for (let i = 0; i < 4; i++) {
    await edit(`s.day = s.day + 1; s.world.hour = 13;`); await reload();
    await toShop();
    seen.push(await p.locator('[data-testid=malek-door]').getAttribute('data-scene'));
    await p.click('[data-testid=malek-leave]'); await p.waitForTimeout(300);
  }
  console.log('scenes over five midday visits:', seen.join(' > '), '| repeats:', seen.filter((x, i) => i && x === seen[i - 1]).length);
  await edit(`s.world.hour = 20.4;`); await reload(); await toShop();
  console.log('20:24 scene:', await p.locator('[data-testid=malek-door]').getAttribute('data-scene'));
  await p.click('[data-testid=malek-door-menu]'); await p.waitForSelector('[data-testid=malek-menu]'); await p.waitForTimeout(1500);
  console.log('cold grill: kebab off:', await has('malek-off-malek_kebab'), '| parcel still on:', await has('malek-buy-malek_road_pack'));
  await p.screenshot({ path: `${S}/m-closing-room.png` });
  // story is off while art is missing
  console.log('story offered:', await has('malek-story'), '| story state:', JSON.stringify((await st()).malek.story));
  // exit through the door hotspot
  await p.click('[data-testid=malek-hot-exit]'); await p.waitForTimeout(400);
  console.log('exit hotspot leaves:', !(await has('malek-shop')), '| district:', await has('district'));
} catch (e) { console.log('FAILED', e.message.split('\n')[0]); await p.screenshot({ path: `${S}/m-fail.png` }); }
console.log('errors', JSON.stringify(errs));
await b.close();
