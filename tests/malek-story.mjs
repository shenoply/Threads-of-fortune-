// Malek's five-part story, told at his tables: each visit, sitting down plays the next part (one part
// per visit, any day, the first visit included). "Not now" keeps that part for the next time you sit;
// sitting again in the same visit just sits; leaving or reloading never skips or repeats a part; part 3
// is on film; after part 5 Arthur is a topic and the story does not loop. The tables mark glows while
// a part is waiting.
//   PORT=5173 SHOTS=/tmp/malek node tests/malek-story.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const PORT = process.env.PORT ?? '4173', S = process.env.SHOTS ?? '/tmp/malek';
mkdirSync(S, { recursive: true });
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
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
  await p.waitForSelector('[data-testid=malek-door]', { timeout: 20000 });
  const atDoor = await has('malek-story');
  await p.click('[data-testid=malek-enter]'); await p.waitForSelector('[data-testid=malek-room]');
  return atDoor;
};
const glowing = () => p.locator('[data-testid=malek-hot-tables].is-due').count();
const sit = async () => {
  await p.locator('[data-testid=malek-hot-tables]').evaluate((e) => e.click()); await p.waitForTimeout(400);
  return (await has('malek-story')) ? +(await p.locator('[data-testid=malek-story]').getAttribute('data-stage')) : 0;
};
const leave = async () => { if (await has('malek-menu-close')) await p.click('[data-testid=malek-menu-close]'); if (await has('malek-leave')) await p.click('[data-testid=malek-leave]'); await p.waitForTimeout(300); };
const done = () => p.click('[data-testid=malek-story-done]').then(() => p.waitForTimeout(300));
const story = async () => JSON.stringify((await st()).malek.story);
try {
  await p.goto(`http://localhost:${PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
  await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
  await edit(`s.tutorial = { done: true, step: 'done', inspected: true }; s.introSeen = ['malek']; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; Object.assign(s.world, { at: 'giza', hour: 13 }); s.cash = 300; s.queue = []; localStorage.setItem('tof-skip-chapters', '1');`);
  await reload();

  // visit 1 (the very first): nothing at the door; the tables glow; sitting plays part 1
  console.log('visit 1: story at the door?', await enter(), '| tables glowing', await glowing());
  let n = await sit(); console.log('   sit -> part', n); await p.screenshot({ path: `${S}/story-sit-1.png` });
  console.log('   text:', (await p.locator('[data-testid=malek-story]').innerText()).replace(/\s+/g, ' ').slice(0, 120));
  await p.click('[data-testid=malek-story-later]'); await p.waitForTimeout(300);
  console.log('   Not now ->', await story(), '| sit again -> part', n = await sit());
  await done(); console.log('   Continue ->', await story(), '| glowing', await glowing(), '| sit again this visit -> part', await sit(), '|', (await p.locator('[data-testid=malek-speech]').textContent().catch(() => '')).slice(6, 60));
  await leave();
  // visit 2, same day: part 2; then reload with part 3 pending: it comes back, not skipped
  await enter(); console.log('visit 2 (same day): sit -> part', await sit()); await done(); await leave();
  await enter(); console.log('visit 3: sit -> part', n = await sit(), '| film', await has('cutscene'));
  await p.waitForSelector('[data-testid=cutscene][data-state=playing]', { timeout: 10000 }).catch(() => {});
  console.log('   playing:', await p.locator('[data-testid=cutscene]').getAttribute('data-state'));
  await reload(); await enter(); console.log('   reloaded mid-part, next visit: sit -> part', await sit(), '|', await story());
  await done(); await leave();
  for (const want of [4, 5]) { await enter(); const got = await sit(); console.log(`visit: sit -> part ${got} (want ${want})`); await done(); await leave(); }
  const s = await st();
  console.log('all done:', JSON.stringify(s.malek.story.completed), '| arthur topic', await (async () => { await enter(); await p.click('[data-testid=malek-talk]'); return has('malek-chat'); })());
  console.log('after the story: glowing', await glowing(), '| sit -> part', await sit());
} catch (e) { console.log('FAILED', e.message.split('\n')[0]); await p.screenshot({ path: `${S}/story-fail.png` }); }
console.log('errors', JSON.stringify(errs));
await b.close();
