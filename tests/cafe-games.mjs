// Chess and tawla with Bilgin in the Giza coffee house: the table opens from the chess corner of his café, both games
// play on a phone, Bilgin answers, and the stake changes hands.
//   PORT=5173 SHOTS=/tmp/cafe node tests/cafe-games.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const PORT = process.env.PORT ?? '5173', S = process.env.SHOTS ?? '/tmp/cafe';
mkdirSync(S, { recursive: true });
const b = await chromium.launch();
const vp = process.env.DESKTOP ? { width: 1280, height: 800 } : { width: 390, height: 844 };
const p = await b.newPage({ viewport: vp, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const has = (id) => p.locator(`[data-testid="${id}"]`).count();
const edit = (fn) => p.evaluate((src) => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); new Function('s', 'd', src)(d.state, d); localStorage.setItem(k, JSON.stringify(d)); }, fn);
const cash = () => p.evaluate(() => JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.cash);
const out = [];
try {
  await p.goto(`http://localhost:${PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
  await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
  await edit(`s.tutorial = { done: true, step: 'done', inspected: true }; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; Object.assign(s.world, { at: 'giza', hour: 10 }); s.cash = 500; s.introSeen = [...(s.introSeen ?? []), 'abuhamid']; localStorage.setItem('tof-skip-chapters', '1');`);
  await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(800);
  await p.click('[data-testid=nav-stall]'); await p.waitForSelector('[data-testid=district]'); await p.waitForTimeout(300);
  if (await has('stall-sheet-close')) await p.click('[data-testid=stall-sheet-close]');
  await p.locator('[data-testid=poi-coffee]').scrollIntoViewIfNeeded(); await p.click('[data-testid=poi-coffee]');
  await p.waitForSelector('[data-testid=cafe-room]', { timeout: 8000 });
  await p.screenshot({ path: `${S}/room-counter.png` });
  await p.click('[data-testid=cafe-hot-corner]'); await p.waitForTimeout(700);
  await p.screenshot({ path: `${S}/room-corner.png` });
  await p.click('[data-testid=cafe-play]'); await p.waitForSelector('[data-testid=cafe-table]');
  await p.screenshot({ path: `${S}/table.png` });

  // chess for 5 piastres: play a few moves, Bilgin answers each, then resign
  const c0 = await cash();
  await p.click('[data-testid=cafe-stake-5]'); await p.click('[data-testid=cafe-chess]');
  await p.waitForSelector('[data-testid=cafe-chess-board]');
  const moves = [['e2', 'e4'], ['g1', 'f3'], ['f1', 'c4'], ['d2', 'd3']];
  let answered = 0;
  for (const [f, t] of moves) {
    const before = await p.locator('.chess-board .pc.b').evaluateAll((e) => e.map((x) => x.parentElement.dataset.sq).join());
    await p.click(`[data-sq=${f}]`); await p.click(`[data-sq=${t}]`).catch(() => {});
    await p.waitForFunction((bf) => [...document.querySelectorAll('.chess-board .pc.b')].map((x) => x.parentElement.dataset.sq).join() !== bf, before, { timeout: 8000 }).then(() => answered++).catch(() => {});
    await p.waitForTimeout(200);
  }
  out.push(`chess: Bilgin answered ${answered}/${moves.length}`);
  await p.screenshot({ path: `${S}/chess.png` });
  await p.click('[data-testid=cafe-resign]'); await p.waitForSelector('[data-testid=cafe-end]');
  await p.click('[data-testid=cafe-done]'); await p.waitForTimeout(500);
  const c1 = await cash();
  out.push(`chess stake: ${c0} -> ${c1}`);
  const chessOk = answered === moves.length && c1 === c0 - 5;

  // tawla for 20: opening roll, then play several of your turns by tapping
  await p.waitForSelector('[data-testid=cafe-play]', { timeout: 8000 });
  await p.click('[data-testid=cafe-play]'); await p.click('[data-testid=cafe-stake-20]'); await p.click('[data-testid=cafe-tawla]');
  await p.click('[data-testid=tw-open]');
  let myMoves = 0, turnsSeen = 0;
  for (let k = 0; k < 120 && turnsSeen < 4; k++) {
    await p.waitForTimeout(250);
    const can = p.locator('.tw-pt.can, .tw-bar.can');
    if (!(await can.count())) { continue; }
    await can.first().click();
    const dest = p.locator('.tw-pt.dest, .tw-off.dest');
    if (await dest.count()) { await dest.first().click(); myMoves++; if (!(await p.locator('.tw-pt.can, .tw-bar.can').count())) turnsSeen++; }
  }
  const say = await p.locator('[data-testid=tw-say]').textContent();
  out.push(`tawla: ${myMoves} checker moves over ${turnsSeen} turns; last "${say}"`);
  await p.screenshot({ path: `${S}/tawla.png` });
  const t0 = await cash();
  await p.click('[data-testid=cafe-quit]'); await p.waitForTimeout(500);
  const t1 = await cash();
  out.push(`tawla quit mid-game: ${t0} -> ${t1}`);
  const tawlaOk = myMoves >= 6 && t1 === t0 - 20;

  // rules check: random tawla games always finish with 30 checkers accounted for
  const sim = await p.evaluate(async () => {
    const T = await import('/src/game/cafe/tawla.ts');
    let done = 0;
    for (let g = 0; g < 30; g++) {
      let bd = T.startBoard(), s = 1, n = 0;
      while (!T.winner(bd) && n++ < 2000) { const pl = T.choosePlay(bd, s, [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)]); if (pl) bd = pl.board; s = -s; }
      if (T.winner(bd)) done++;
    }
    return done;
  });
  out.push(`tawla sims finished: ${sim}/30`);
  console.log(out.join('\n'));
  console.log(chessOk && tawlaOk && sim === 30 && !errs.length ? 'PASS' : 'FAIL', 'errors', JSON.stringify(errs.slice(0, 3)));
} catch (e) { console.log(out.join('\n')); console.log('FAIL', e.message, JSON.stringify(errs.slice(0, 3))); }
await b.close();
