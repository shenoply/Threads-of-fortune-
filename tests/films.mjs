// The first-meeting films: Abu Hamid at the coffee house, Arran at the lab (paintings until his
// video), Rashid at his warehouse, Nabil when he first comes to the stall (his greeting waits until the
// film ends). Each plays once; the Customers screen keeps them to watch again.
//   PORT=5173 SHOTS=/tmp/malek node tests/films.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const PORT = process.env.PORT ?? '4173', S = process.env.SHOTS ?? '/tmp/malek';
mkdirSync(S, { recursive: true });
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('response', (r) => { if (r.status() >= 400 && /audio\/intro|art\//.test(r.url())) errs.push(r.status() + ' ' + r.url()); });
const has = (id) => p.locator(`[data-testid="${id}"]`).count();
const edit = (fn) => p.evaluate((src) => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); new Function('s', 'd', src)(d.state, d); localStorage.setItem(k, JSON.stringify(d)); }, fn);
const reload = async () => { await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(800); };
const seen = () => p.evaluate(() => JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.introSeen ?? []);
const district = async () => { await p.click('[data-testid=nav-stall]'); await p.waitForSelector('[data-testid=district]'); await p.waitForTimeout(300); if (await has('stall-sheet-close')) await p.click('[data-testid=stall-sheet-close]'); };
const poi = async (id) => { await p.locator(`[data-testid=poi-${id}]`).scrollIntoViewIfNeeded(); await p.click(`[data-testid=poi-${id}]`); await p.waitForTimeout(1200); };
const watch = async (id, shot) => {
  await p.waitForSelector(`[data-testid=film-${id}]`, { timeout: 5000 }).catch(() => {});
  const on = await has(`film-${id}`);
  await p.waitForTimeout(4000);
  const cap = await p.locator('[data-testid=film-caption]').textContent().catch(() => '');
  const frame = await p.locator('[data-testid=film-stills]').getAttribute('data-frame').catch(() => '-');
  await p.screenshot({ path: `${S}/film-${shot}.png` });
  await p.click('[data-testid=film-skip]').catch(() => {}); await p.waitForTimeout(400);
  return `film ${on} | frame ${frame} | "${(cap ?? '').slice(0, 70)}"`;
};
try {
  await p.goto(`http://localhost:${PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'))); await p.reload();
  await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
  await edit(`s.tutorial = { done: true, step: 'done', inspected: true }; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; Object.assign(s.world, { at: 'giza', hour: 10 }); s.reputation = 30; localStorage.setItem('tof-skip-chapters', '1');`);
  await reload();
  await district(); await poi('coffee');
  console.log('coffee house:', await watch('abuhamid', 'abuhamid'), '| dialogue under it:', await has('dialogue') + await p.locator('.dialogue, [data-testid=npc-dialogue]').count());
  await p.keyboard.press('Escape'); await p.waitForTimeout(300); await reload();
  await district(); await poi('lab');
  console.log('lab:', await watch('arran', 'arran'));
  await p.keyboard.press('Escape'); await p.waitForTimeout(300); await reload();
  await p.click('[data-testid=nav-supplier]').catch(async () => { await p.evaluate(() => window.dispatchEvent(new Event('noop'))); });
  if (!(await has('film-rashid'))) { await p.click('text=Go to Rashid').catch(() => {}); }
  await p.waitForTimeout(800);
  console.log('Rashid:', await watch('rashid', 'rashid'));
  // Nabil at the stall
  await edit(`s.queue = ['nabil']; s.arrivals = [s.world.hour + 0.05]; s.visitIdx = 0; s.encounter = null;`); await reload();
  await p.click('[data-testid=nav-stall]'); await p.waitForTimeout(600); await p.click('[data-testid=stall-wait]'); await p.waitForTimeout(1500);
  console.log('Nabil arrives:', await watch('nabil', 'nabil'));
  await p.waitForTimeout(1500);
  console.log('   after the film his greeting plays:', ((await p.locator('[data-testid=stall]').first().innerText()).match(/Nabil[^\n]*/) ?? [''])[0].slice(0, 80));
  console.log('seen:', JSON.stringify(await seen()));
  await p.evaluate(async () => { const m = await import('/src/game/state/store.ts'); m.useGame.getState().letGo(); });
  // second visits: no films
  await reload(); await district(); await poi('coffee');
  console.log('coffee again: film', await has('film-abuhamid'));
  await p.keyboard.press('Escape'); await reload();
  // the shelf
  await p.click('[data-testid=nav-ledger]').catch(() => {}); await p.waitForTimeout(500);
  await p.click('text=Customers').catch(() => {}); await p.waitForTimeout(500);
  console.log('shelf:', (await p.locator('[data-testid=film-shelf]').innerText().catch(() => 'none')).replace(/\s+/g, ' '));
} catch (e) { console.log('FAILED', e.message.split('\n')[0]); await p.screenshot({ path: `${S}/films-fail.png` }); }
console.log('errors', JSON.stringify(errs));
await b.close();
