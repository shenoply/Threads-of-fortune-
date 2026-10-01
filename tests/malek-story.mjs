// Malek's five-visit story in the browser: never on the first visit; one stage per later game day;
// "Not now" keeps the stage for the next visit; leaving, re-entering and reloading the same day never
// play a second stage or replay one; missed days advance one stage; after stage 5 Arthur is a topic and
// the story does not loop.
//   PORT=5173 SHOTS=/tmp/malek node tests/malek-story.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const PORT = process.env.PORT ?? '4173', S = process.env.SHOTS ?? '/tmp/malek';
mkdirSync(S, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const has = (id) => p.locator(`[data-testid="${id}"]`).count();
const st = async () => JSON.parse(await p.evaluate(() => localStorage.getItem('threads-of-fortune-save'))).state;
const edit = (fn) => p.evaluate((src) => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); new Function('s', 'd', src)(d.state, d); localStorage.setItem(k, JSON.stringify(d)); }, fn);
const reload = async () => { await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(800); };
const enter = async () => {
  await p.click('[data-testid=nav-stall]'); await p.waitForSelector('[data-testid=district]'); await p.waitForTimeout(300);
  if (await has('stall-sheet-close')) await p.click('[data-testid=stall-sheet-close]');
  await p.locator('[data-testid=poi-malek]').scrollIntoViewIfNeeded(); await p.click('[data-testid=poi-malek]');
  await p.waitForSelector('[data-testid=malek-shop]', { timeout: 20000 }); await p.waitForTimeout(400);
  return (await has('malek-story')) ? +(await p.locator('[data-testid=malek-story]').getAttribute('data-stage')) : 0;
};
const leave = async () => { if (await has('malek-leave')) await p.click('[data-testid=malek-leave]'); await p.waitForTimeout(300); };
const story = async () => JSON.stringify((await st()).malek.story);
const nextDay = async (n = 1) => { await edit(`s.day = s.day + ${n}; s.world.hour = 13;`); await reload(); };
try {
  await p.goto(`http://localhost:${PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
  await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
  await edit(`s.tutorial = { done: true, step: 'done', inspected: true }; s.introSeen = ['malek']; s.relationships.nabil = { visits: 1, purchases: 0, spent: 0, affinity: 0, bad: 0, lastLines: [] }; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; Object.assign(s.world, { at: 'giza', hour: 13 }); s.cash = 300; s.queue = []; localStorage.setItem('tof-skip-chapters', '1');`);
  await reload();

  console.log('day 1, first visit: stage', await enter()); await leave();
  console.log('day 1, second visit: stage', await enter(), '| (none on the day you first came)'); await leave();
  await nextDay();
  let s1 = await enter();
  console.log('day 2: stage', s1); await p.screenshot({ path: `${S}/story-1.png` });
  console.log('   text:', (await p.locator('[data-testid=malek-story]').innerText()).replace(/\s+/g, ' ').slice(0, 220));
  await p.click('[data-testid=malek-story-later]'); await p.waitForTimeout(300);
  console.log('   Not now ->', await story()); await leave();
  console.log('day 2, re-enter: stage', await enter(), '(the same stage, still pending)');
  await p.click('[data-testid=malek-story-done]'); await p.waitForTimeout(300);
  console.log('   done ->', await story()); await leave();
  console.log('day 2, re-enter after finishing: stage', await enter()); await leave();
  await reload();
  console.log('day 2, after reload: stage', await enter(), '|', await story()); await leave();
  // reload in the middle of a stage: it is still there, not skipped
  await nextDay();
  console.log('day 3: stage', await enter()); await p.screenshot({ path: `${S}/story-2.png` });
  await reload();
  console.log('day 3, reloaded mid-stage: stage', await enter());
  await p.click('[data-testid=malek-story-done]'); await p.waitForTimeout(300); await leave();
  // a week away: one stage, not three
  await nextDay(7);
  console.log('day 10 (a week later): stage', await enter()); await p.screenshot({ path: `${S}/story-3.png` });
  await p.click('[data-testid=malek-story-done]'); await p.waitForTimeout(300); await leave();
  console.log('   ->', await story());
  for (const d of [4, 5]) {
    await nextDay();
    const n = await enter(); await p.screenshot({ path: `${S}/story-${n}.png` });
    console.log(`stage ${n} shown:`, n === d); await p.click('[data-testid=malek-story-done]'); await p.waitForTimeout(300);
    if (n === 5) {
      await p.click('[data-testid=malek-talk]');
      console.log('   Arthur topic:', await has('malek-topic-arthur'));
      await p.click('[data-testid=malek-topic-storeroom]'); await p.waitForTimeout(150);
      console.log('   storeroom now:', (await p.locator('[data-testid=malek-speech]').textContent()).replace('MALEK ', '').slice(0, 80));
    }
    await leave();
  }
  await nextDay(3);
  console.log('after stage 5, later visit: stage', await enter(), '|', await story());
} catch (e) { console.log('FAILED', e.message.split('\n')[0]); await p.screenshot({ path: `${S}/story-fail.png` }); }
console.log('errors', JSON.stringify(errs));
await b.close();
