// Malek talks to himself in Arabic in his shop (no tap needed), with the words on screen and the clip
// fetched; at the stall his haggling lines open with ها / با now and then.
//   PORT=5173 SHOTS=/tmp/malek node tests/malek-arabic.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const PORT = process.env.PORT ?? '4173', S = process.env.SHOTS ?? '/tmp/malek';
mkdirSync(S, { recursive: true });
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const heard = []; p.on('response', (r) => { if (/audio\/malek\/|voices\/malek/.test(r.url())) heard.push(`${r.status()} ${r.url().split('/').pop()}`); });
const has = (id) => p.locator(`[data-testid="${id}"]`).count();
const edit = (fn) => p.evaluate((src) => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); new Function('s', 'd', src)(d.state, d); localStorage.setItem(k, JSON.stringify(d)); }, fn);
const reload = async () => { await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(900); };
const game = (fn) => p.evaluate(async (src) => { const m = await import('/src/game/state/store.ts'); return new Function('g', 'set', 'get', src)(m.useGame.getState(), m.useGame.setState, m.useGame.getState); }, fn);
try {
  await p.goto(`http://localhost:${PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
  await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
  await edit(`s.tutorial = { done: true, step: 'done', inspected: true }; s.introSeen = ['malek']; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; localStorage.setItem('tof-skip-chapters', '1');
    Object.assign(s.world, { at: 'giza', hour: 13 }); s.cash = 300; s.queue = []; s.visitIdx = 0;
    s.malek = { stockDay: s.day, sold: {}, visits: 1, firstDay: 1, lastVisitDay: s.day, orders: [], said: [], story: { nextStage: 6, lastStoryDay: 1, completed: [1,2,3,4,5] } };`);
  await reload();
  await p.click('[data-testid=nav-stall]'); await p.waitForSelector('[data-testid=district]'); await p.waitForTimeout(300);
  if (await has('stall-sheet-close')) await p.click('[data-testid=stall-sheet-close]');
  await p.locator('[data-testid=poi-malek]').scrollIntoViewIfNeeded(); await p.click('[data-testid=poi-malek]');
  await p.waitForSelector('[data-testid=malek-door]', { timeout: 20000 });
  await p.click('[data-testid=malek-enter]'); await p.waitForSelector('[data-testid=malek-room]');
  // nothing plays by itself
  await p.waitForTimeout(5000);
  const silent = !(await has('malek-arabic'));
  // open the talk: he asks if you are eating, in Arabic, from his own recording
  await p.click('[data-testid=malek-talk]'); await p.waitForSelector('[data-testid=malek-arabic]', { timeout: 3000 });
  const hello = await p.locator('[data-testid=malek-arabic]').getAttribute('data-phrase');
  // ask about the kofta: he answers in English (his recording), then in Arabic on request
  await p.click('[data-testid=malek-ask-kofta]'); await p.waitForTimeout(1500);
  const en = (await p.locator('[data-testid=malek-speech]').textContent()).replace(/^MALEK\s*/, '');
  await p.click('[data-testid=malek-chat-ar]'); await p.waitForSelector('[data-testid=malek-arabic]');
  const arK = await p.locator('[data-testid=malek-arabic]').getAttribute('data-phrase');
  await p.screenshot({ path: `${S}/ar-shop.png` });
  // an Arabic-only answer
  await p.click('[data-testid=malek-ask-thanks]'); await p.waitForTimeout(300);
  const thanks = await p.locator('[data-testid=malek-arabic]').getAttribute('data-phrase');
  // picking kofta from the menu: he says his kofta line
  await p.click('[data-testid=malek-tab-menu]'); await p.waitForTimeout(300);
  const koftaBtn = p.locator('[data-testid=malek-buy-malek_kofta]');
  let menuLine = 'n/a';
  if (await koftaBtn.count()) { await koftaBtn.first().evaluate((e) => e.click()); await p.waitForTimeout(400); menuLine = (await p.locator('[data-testid=malek-speech]').textContent().catch(() => '')).replace(/^MALEK\s*/, ''); if (await has('malek-cancel')) await p.click('[data-testid=malek-cancel]'); }
  await p.waitForTimeout(1500);
  console.log('   silent until asked:', silent, '| hello:', hello, '| kofta EN:', JSON.stringify(en), '| kofta AR:', arK, '| thanks:', thanks, '| menu kofta:', JSON.stringify(menuLine));
  console.log('1. clips fetched:', heard.join(', '));
  await p.click('[data-testid=malek-leave]'); await p.waitForTimeout(300);

  // 2. at the stall
  await edit(`s.queue = ['malek']; s.arrivals = [s.world.hour + 0.05]; s.visitIdx = 0; s.encounter = null; s.malek.stallLastDay = undefined;`); await reload();
  await p.click('[data-testid=nav-stall]'); await p.waitForTimeout(800); await p.click('[data-testid=stall-wait]'); await p.waitForTimeout(1500);
  await game(`const e = get().encounter; set({ encounter: { ...e, saffronOn: undefined } }); for (const a of ['ask_room', 'ask_drawn']) if (!get().encounter.outcome) get().act(a); get().present(get().inventory[0].uid); for (const a of ['durability', 'fit', 'craft']) if (!get().encounter.outcome) get().act(a);`);
  for (let i = 0; i < 4; i++) await game(`if (!get().encounter.outcome) get().act('name_price', 600)`);
  const ar = await game(`return get().encounter.log.filter((l) => l.ar).map((l) => l.text.slice(0, 60))`);
  console.log('2. stall lines with Arabic:', JSON.stringify(ar));
  // the conversation plays out line by line; the clip goes with its line
  for (let i = 0; i < 40 && !heard.some((h) => /ar-(ha|ba)/.test(h)); i++) await p.waitForTimeout(1000);
  await p.screenshot({ path: `${S}/ar-stall.png` });
  console.log('   clips fetched:', heard.join(', '));
} catch (e) { console.log('FAILED', e.message.split('\n')[0]); await p.screenshot({ path: `${S}/ar-fail.png` }); }
console.log('errors', JSON.stringify(errs));
await b.close();
