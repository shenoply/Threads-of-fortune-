// Your men: the train that follows you on the map (a token for each guard and animal), the full page
// on a kind of guard, the limit on how many you can lead, talking to them, and them stopping you on
// the road when food runs low.
//   PORT=5173 SHOTS=/tmp/troops node tests/troops.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const PORT = process.env.PORT ?? '5173', S = process.env.SHOTS ?? '/tmp/troops';
mkdirSync(S, { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const has = (id) => p.locator(`[data-testid="${id}"]`).count();
const out = []; let ok = true;
const check = (c, m) => { out.push(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) ok = false; };
try {
  await p.goto(`http://localhost:${PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
  await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
  await p.evaluate(() => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); const s = d.state; s.tutorial = { done: true, step: 'done', inspected: true }; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; s.cash = 50000; s.reputation = 0; Object.assign(s.world, { at: 'cairo', x: 214.3, y: 413.7, hour: 7, known: [...new Set([...(s.world.known ?? []), 'cairo', 'tanta', 'saqqara'])] }); s.world.party = { ...s.world.party, food: 200, troops: { veteran: 1, sentinel: 3, reformed: 2 }, animals: { falahi: 2, baladi_d: 3 } }; localStorage.setItem(k, JSON.stringify(d)); localStorage.setItem('tof-skip-chapters', '1'); });
  await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(800);
  // the train on the map
  await p.click('[data-testid=nav-map]'); await p.waitForTimeout(1200);
  if (await has('district-world')) { await p.click('[data-testid=district-world]'); await p.waitForTimeout(900); }
  if (await has('venue-leave')) { await p.click('[data-testid=venue-leave]'); await p.waitForTimeout(900); }
  const toks = await p.locator('[data-testid=me-train] .me-tok').count();
  check(toks === 11, `train shows ${toks} tokens (6 men + 5 animals)`);
  await p.screenshot({ path: `${S}/map.png` });
  // the limit (reputation 0 → 6 men): store refuses a 7th
  const r = await p.evaluate(async () => { const { useGame } = await import('/src/game/state/store.ts'); const { recruitPool } = await import('/src/game/systems/caravan.ts'); const s = useGame.getState(); const pool = recruitPool('cairo', s.day, s.world.hired).find((x) => x.available); return pool ? useGame.getState().recruit(pool.troop, pool.key, 1) : 'no pool'; });
  check(/at most/.test(r), `7th man refused: "${r.slice(0, 60)}"`);
  // talk to your men
  const t = await p.evaluate(async () => { const { useGame } = await import('/src/game/state/store.ts'); const m0 = useGame.getState().world.party.morale ?? 70; const msg = useGame.getState().talkToMen('rations'); return [m0, useGame.getState().world.party.morale, msg]; });
  check(t[1] === Math.min(100, t[0] + 10), `extra rations: patience ${t[0]} → ${t[1]}`);
  // stopped on the road when food is short
  await p.evaluate(async () => { const { useGame } = await import('/src/game/state/store.ts'); const s = useGame.getState(); useGame.setState({ world: { ...s.world, party: { ...s.world.party, food: 12 } } }); });
  if (await has('district-world')) { await p.click('[data-testid=district-world]'); await p.waitForTimeout(900); }
  await p.locator('[data-testid=place-saqqara]').dispatchEvent('click'); await p.waitForTimeout(600);
  if (await has('food-go')) { await p.click('[data-testid=food-go]'); await p.waitForTimeout(400); }
  const started = await has('travel');
  if (!started) out.push('testids: ' + (await p.evaluate(() => [...document.querySelectorAll('[data-testid]')].map((e) => e.dataset.testid).filter((t) => /plan|travel|go|walk|place-sa/.test(t)).join(','))));
  if (started) await p.click('[data-testid=travel]'); await p.waitForTimeout(300);
  if (await has('speed-3')) await p.click('[data-testid=speed-3]');
  await p.waitForSelector('[data-testid=men-talk]', { timeout: 15000 }).catch(() => {});
  const stopped = await has('men-talk');
  out.push(`(travel started: ${started})`);
  check(stopped > 0, 'the men stop you when food runs short');
  if (stopped) { await p.screenshot({ path: `${S}/stopped.png` }); await p.click('[data-testid=men-close]'); }
  // the full page on a kind of guard, from the caravan screen
  await p.evaluate(async () => { const { useGame } = await import('/src/game/state/store.ts'); const s = useGame.getState(); useGame.setState({ world: { ...s.world, at: 'cairo' } }); });
  await p.click('[data-testid=nav-caravan]').catch(() => {}); await p.waitForTimeout(800);
  if (await has('roster-info-veteran')) { await p.click('[data-testid=roster-info-veteran]'); await p.waitForTimeout(400); }
  check((await has('troop-page-veteran')) > 0, 'troop page opens from the roster');
  await p.screenshot({ path: `${S}/troop-page.png` });
  console.log(out.join('\n')); console.log(ok && !errs.length ? 'PASS' : 'FAIL', JSON.stringify(errs.slice(0, 3)));
} catch (e) { console.log(out.join('\n')); console.log('FAIL', e.message.split('\n')[0], JSON.stringify(errs.slice(0, 3))); }
await b.close();
