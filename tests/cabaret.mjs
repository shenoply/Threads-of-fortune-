// An evening out: Cairo's cabaret cards, the Sala Nour shutters, a table at the Alhambra, the
// contact's contract, and the appointment that follows.   node tests/cabaret.mjs  (dev server on 4173)
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? '4173';
const S = process.env.SHOTS ?? '/tmp';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const has = (id) => p.locator(`[data-testid=${id}]`).count();
const save = () => p.evaluate(() => JSON.parse(localStorage.getItem('threads-of-fortune-save')).state);
try {
  await p.goto(`http://localhost:${PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'))); await p.reload();
  await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
  await p.evaluate(() => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); const s = d.state; s.tutorial = { done: true, step: 'done', inspected: true }; s.missionNews = undefined; s.levelUps = []; s.titleNews = [];
    Object.assign(s.world, { at: 'cairo', hour: 18, x: 214.3, y: 413.7 }); s.cash = 3000; s.reputation = 12; localStorage.setItem(k, JSON.stringify(d)); localStorage.setItem('tof-skip-chapters', '1'); });
  await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(800);
  await p.click('[data-testid=nav-map]').catch(() => {}); await p.waitForTimeout(600);
  await p.locator('[data-testid=place-cairo]').dispatchEvent('click'); await p.waitForTimeout(600);
  await p.locator('[data-testid=venue-alhambra-cairo]').scrollIntoViewIfNeeded(); await p.waitForTimeout(400);
  await p.screenshot({ path: `${S}/cab-cards.png` });
  console.log('cards:', await has('venue-alhambra-cairo'), await has('venue-qamar'), await has('venue-sala-santi'), await has('venue-sala-badia'), '| badia button:', await p.locator('[data-testid=enter-sala-badia]').textContent());
  await p.click('[data-testid=enter-alhambra-cairo]'); await p.waitForSelector('[data-testid=cabaret]'); await p.waitForTimeout(1500);
  await p.screenshot({ path: `${S}/cab-room.png` });
  await p.click('[data-testid=cab-talk]'); await p.waitForTimeout(800);
  await p.click('text=Does the house need carpets?'); await p.waitForTimeout(500);
  await p.click('text=I will find you one.'); await p.waitForTimeout(500);
  console.log('quest after talk:', (await save()).world.quests['alhambra-stairs'], '| note:', (await p.locator('[data-testid=cab-note]').textContent().catch(() => '')).slice(0, 60));
  const cash0 = (await save()).cash;
  await p.click('[data-testid=cab-table]'); await p.waitForTimeout(2200);
  await p.screenshot({ path: `${S}/cab-show.png` });
  const st = await save();
  console.log('table:', (await p.locator('[data-testid=cab-note]').textContent()).slice(0, 120), '| cash', cash0, '->', st.cash, '| appointments', JSON.stringify(st.appointments ?? []), '| show class on?', await p.locator('.cab-show.on').count());
  await p.click('[data-testid=cab-table]').catch(() => {}); await p.waitForTimeout(300);
  console.log('second tap charged?', (await save()).cash === st.cash ? 'no' : 'YES');
  await p.click('[data-testid=cab-leave]'); await p.waitForTimeout(400);
  console.log('back in town?', await has('settlement'), '| errors', errs);
} catch (e) { console.log('FAIL', e.message.split('\n')[0]); }
await b.close();
