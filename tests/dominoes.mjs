// Dominoes with the coffee-house regulars: Tawfiq at Bilgin's in Giza, and Abu Sa'id at the Nawfara in
// Damascus from the city walk. A hand is dealt from a seed (regular, day, hands played), so it plays the
// same every time: the test plays it through by always laying the first tile that goes (left end first),
// checks the result against the same hand played by the rules module, then the stake, the record, the
// friendship count and, on a win, the talk added to what you have heard.
//   PORT=5173 SHOTS=/tmp/dom node tests/dominoes.mjs
import { chromium } from 'playwright';
import { PORT, SHOTS as S } from './_env.mjs';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const has = (id) => p.locator(`[data-testid="${id}"]`).count();
const edit = (fn) => p.evaluate((src) => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); new Function('s', 'd', src)(d.state, d); (window.__tofEdit = true, localStorage.setItem(k, JSON.stringify(d)), window.__tofEdit = false, (() => { const w = Storage.prototype.setItem; if (w.__hold) return; const h = function (key, v) { if (key === 'threads-of-fortune-save' && !window.__tofEdit) return; return w.call(this, key, v); }; h.__hold = true; Storage.prototype.setItem = h; setTimeout(() => { if (Storage.prototype.setItem === h) Storage.prototype.setItem = w; }, 4000); })()); }, fn);
const store = `(await import(performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/game/state/store.ts')) ?? '/src/game/state/store.ts')).useGame`;
const st = (expr) => p.evaluate(new Function(`return (async () => { const G = ${store}; const s = G.getState(); return ${expr}; })()`));
const out = []; const fails = [];
const check = (ok, msg) => { out.push(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) fails.push(msg); };

/** the same hand by the rules module: the player always lays the first tile that goes, left end first */
const simulate = (regId) => p.evaluate(async (regId) => {
  const D = await import('/src/game/cafe/dominoes.ts');
  const G = (await import(performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/game/state/store.ts')) ?? '/src/game/state/store.ts')).useGame.getState();
  const r = G.dominoes?.[regId] ?? {};
  const played = (r.won ?? 0) + (r.lost ?? 0) + (r.drawn ?? 0);
  let h = D.deal(D.rngFrom(D.seedOf(`${regId}:${G.day}:${played}`)));
  for (let i = 0; i < 60 && !h.over; i++) {
    if (h.turn === 'him') { const m = D.chooseMove(h, 'him'); h = m ? D.play(h, 'him', m) : D.knock(h, 'him'); continue; }
    const ms = D.legal(h, 'you');
    if (!ms.length) { h = D.knock(h, 'you'); continue; }
    const t = ms[0].tile; const es = ms.filter((m) => D.sameTile(m.tile, t)).map((m) => m.end);
    h = D.play(h, 'you', { tile: t, end: es.includes('L') ? 'L' : es[0] });
  }
  return { winner: h.over?.winner ?? null, laid: h.laid, you: h.over?.you, him: h.over?.him };
}, regId);

/** play the hand on screen the same way */
async function playHand(shot) {
  let taps = 0, shotDone = false;
  for (let k = 0; k < 200 && !(await has('cafe-end')); k++) {
    await p.waitForTimeout(120);
    if (await has('domino-knock')) { await p.click('[data-testid=domino-knock]'); continue; }
    const can = p.locator('.dm-mine.can');
    if (!(await can.count())) continue;
    await can.first().click(); taps++;
    await p.waitForTimeout(60);
    if (await has('domino-end-L')) {
      if (!shotDone && shot) { await p.screenshot({ path: shot }); shotDone = true; }
      await p.locator('[data-testid=domino-end-L]').dispatchEvent('click');
    }
    if (taps === 4 && shot && !shotDone) { await p.waitForTimeout(400); await p.screenshot({ path: shot }); shotDone = true; }
  }
  return taps;
}

try {
  await p.goto(`http://localhost:${PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
  await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]'); await p.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.started === true; } catch { return false; } }, null, { timeout: 10000 }).catch(() => {});
  await edit(`s.tutorial = { done: true, step: 'done', inspected: true }; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; Object.assign(s.world, { at: 'giza', hour: 10 }); s.cash = 500; s.introSeen = [...(s.introSeen ?? []), 'abuhamid']; localStorage.setItem('tof-skip-chapters', '1');`);
  await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(800);
  await p.click('[data-testid=nav-stall]'); await p.waitForSelector('[data-testid=district]'); await p.waitForTimeout(300);
  if (await has('stall-sheet-close')) await p.click('[data-testid=stall-sheet-close]');
  await p.locator('[data-testid=poi-coffee]').scrollIntoViewIfNeeded(); await p.click('[data-testid=poi-coffee]');
  await p.waitForSelector('[data-testid=cafe-room]', { timeout: 8000 });
  await p.screenshot({ path: `${S}/dom-room.png` });
  check(await has('cafe-spot-dominoes') > 0, 'the dominoes table is marked in Bilgin\'s room');

  // ── Giza: Tawfiq, for 5 piastres ──
  await p.click('[data-testid=cafe-play-dominoes]'); await p.waitForSelector('[data-testid=domino-table]');
  check((await p.locator('[data-testid=domino-rules]').textContent()).includes('open end'), 'rules line at the top');
  await p.screenshot({ path: `${S}/dom-sit.png` });
  const sim = await simulate('tawfiq');
  const c0 = await st('s.cash'), t0 = await st('s.world.hour * 60');
  await p.click('[data-testid=domino-stake-5]'); await p.click('[data-testid=domino-deal]');
  const taps = await playHand(`${S}/dom-play.png`);
  await p.screenshot({ path: `${S}/dom-end.png` });
  const r1 = await st('s.dominoes.tawfiq'); const c1 = await st('s.cash');
  const res = r1.won ? 'you' : r1.lost ? 'him' : null;
  out.push(`Giza hand: ${taps} tiles laid by you; simulated winner ${sim.winner} (${sim.you} v ${sim.him}); on screen ${res}`);
  check(res === sim.winner, 'the hand on screen ends as the seeded hand does');
  check(c1 - c0 === (res === 'you' ? 5 : res === 'him' ? -5 : 0), `the stake changes hands (${c0} -> ${c1})`);
  check(r1.friend === 1 && r1.stakeDay === (await st('s.day')), 'first day at his table: friendship 1, stake taken today');
  const told = await has('domino-told');
  if (res === 'you') check(told > 0 && (await st('s.world.rumours.length')) > 0, 'a win brings talk, kept with what you have heard');
  else check(!told, 'no talk from a man who has just beaten you');
  check((await st('s.world.hour * 60')) - t0 >= 20, 'the hand takes time');
  await p.click('[data-testid=cafe-done]'); await p.waitForTimeout(400);
  check(await has('cafe-room') > 0 && !(await has('domino-table')), 'getting up returns quietly to the room');

  // a second hand the same day: for tea only
  await p.click('[data-testid=cafe-play-dominoes]'); await p.waitForSelector('[data-testid=domino-table]');
  check(await p.locator('[data-testid=domino-stake-5]').isDisabled(), 'one hand for money a day');
  await p.click('[data-testid=cafe-quit]'); await p.waitForTimeout(300);

  // the reward on a win, straight through the store: talk once a day, price talk is real bazaar talk
  const w = await st(`(() => { s.dominoGame('tawfiq', 'win', 0); const a = G.getState(); return { n: a.world.rumours.length, rec: a.dominoes.tawfiq, j: a.journal.slice(-2).map((x) => x.text) }; })()`);
  out.push(`win via store: ${JSON.stringify(w.j)}`);
  check(w.rec.told === 1 && w.rec.won === 2, 'a second win the same day: no second piece of talk');

  // ── Damascus: Abu Sa'id, from the city walk ──
  await edit(`Object.assign(s.world, { at: 'damascus', x: 486.9, y: 291, hour: 11 }); s.guideSeen = true;`);
  await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]');
  await p.click('[data-testid=nav-map]'); await p.waitForTimeout(500);
  if (await has('guide-skip')) await p.click('[data-testid=guide-skip]');
  if (await has('enter')) await p.click('[data-testid=enter]');
  await p.waitForSelector('[data-testid=town-menu], [data-testid=walk-city]', { timeout: 8000 }).catch(() => {});
  if (await has('menu-walk')) await p.click('[data-testid=menu-walk]'); else await p.click('[data-testid=walk-city]');
  await p.waitForTimeout(1200);
  await p.locator('[data-testid=vpoi-dominoes]').click();
  await p.waitForSelector('[data-testid=domino-table]', { timeout: 12000 });
  check((await p.locator('.dm-who').textContent()).includes('Abu Sa'), 'Damascus: Abu Sa\'id at the Nawfara');
  await p.screenshot({ path: `${S}/dom-damascus-sit.png` });
  const sim2 = await simulate('abusaid');
  await p.click('[data-testid=domino-deal]');
  await playHand(null);
  const r2 = await st('s.dominoes.abusaid');
  const res2 = r2.won ? 'you' : r2.lost ? 'him' : null;
  check(res2 === sim2.winner, `Damascus hand ends as seeded (${res2})`);
  await p.screenshot({ path: `${S}/dom-damascus-end.png` });
  await p.click('[data-testid=cafe-done]'); await p.waitForTimeout(400);
  check(await has('vpoi-dominoes') > 0, 'back on the Damascus street');

  // the rules over many seeded hands: every hand ends, every tile is accounted for, the line always matches
  const rules = await p.evaluate(async () => {
    const D = await import('/src/game/cafe/dominoes.ts');
    let bad = 0, wins = { you: 0, him: 0, none: 0 };
    for (let s = 1; s <= 300; s++) {
      const rnd = D.rngFrom(s); let h = D.deal(rnd);
      for (let i = 0; i < 80 && !h.over; i++) {
        const who = h.turn; const m = who === 'him' ? D.chooseMove(h, 'him') : (() => { const ms = D.legal(h, 'you'); return ms.length ? ms[Math.floor(rnd() * ms.length)] : null; })();
        h = m ? D.play(h, who, m) : D.knock(h, who);
      }
      const okLine = h.line.every((t, i) => i === 0 || h.line[i - 1].b === t.a);
      if (!h.over || !okLine || h.line.length + h.you.length + h.him.length !== 14) bad++;
      wins[h.over?.winner ?? 'none']++;
    }
    return { bad, wins };
  });
  out.push(`300 hands, random player v the regular: ${JSON.stringify(rules.wins)}`);
  check(rules.bad === 0, 'every hand ends with a matching line and all fourteen tiles accounted for');
  check(rules.wins.him > rules.wins.you, 'the regular beats a random player more often than not');
} catch (e) { fails.push(String(e)); }
check(!errs.length, `no page errors ${errs.join(' | ')}`);
console.log(out.join('\n'));
console.log(fails.length ? `FAIL ${fails.length}: ${fails.join(" | ")}` : "PASS");
await b.close();
process.exit(fails.length ? 1 : 0);
