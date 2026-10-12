// Malek talks to himself in Arabic in his shop (no tap needed), with the words on screen and the clip
// fetched; at the stall his haggling lines open with ها / با now and then.
//   PORT=5173 SHOTS=/tmp/malek node tests/malek-arabic.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { PORT as __PORT, SHOTS as __SHOTS } from './_env.mjs';
const PORT = __PORT, S = __SHOTS;
mkdirSync(S, { recursive: true });
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const heard = []; p.on('response', (r) => { if (/audio\/malek\/|voices\/malek/.test(r.url())) heard.push(`${r.status()} ${r.url().split('/').pop()}`); });
const has = (id) => p.locator(`[data-testid="${id}"]`).count();
const edit = (fn) => p.evaluate((src) => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); new Function('s', 'd', src)(d.state, d); (window.__tofEdit = true, localStorage.setItem(k, JSON.stringify(d)), window.__tofEdit = false, (() => { /* hold the game's autosave off the edited save until the reload */ const w = Storage.prototype.setItem; if (w.__hold) return; const h = function (key, v) { if (key === 'threads-of-fortune-save' && !window.__tofEdit) return; return w.call(this, key, v); }; h.__hold = true; Storage.prototype.setItem = h; setTimeout(() => { if (Storage.prototype.setItem === h) Storage.prototype.setItem = w; }, 4000); })()); }, fn);
const reload = async () => { await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(900); };
const game = (fn) => p.evaluate(async (src) => { const m = await import(performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/game/state/store.ts')) ?? '/src/game/state/store.ts'); return new Function('g', 'set', 'get', src)(m.useGame.getState(), m.useGame.setState, m.useGame.getState); }, fn);
try {
  await p.goto(`http://localhost:${PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
  await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]'); await p.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.started === true; } catch { return false; } }, null, { timeout: 10000 }).catch(() => {}); /* day one is on disk before the save is edited */
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
  // the talk is a conversation now: pick replies by their words
  const say = async (t) => { await p.locator('[data-testid=malek-reply]', { hasText: t }).first().click(); await p.waitForTimeout(1500); };
  // ask about the kofta: he answers in English (his recording), then in Arabic on request
  await say('Yes. Where do I sit?'); await say('What is good today?');
  const en = (await p.locator('[data-testid=malek-speech]').textContent()).replace(/^MALEK\s*/, '');
  await p.click('[data-testid=malek-chat-lang]'); await p.waitForSelector('[data-testid=malek-arabic]');
  const arK = await p.locator('[data-testid=malek-arabic]').getAttribute('data-phrase');
  await p.screenshot({ path: `${S}/ar-shop.png` });
  // an Arabic-only answer
  await say('A discount for a friend?'); await say('Thank you, Malek.');
  const thanks = await p.locator('[data-testid=malek-arabic]').getAttribute('data-phrase');
  if (!hello || !arK || !thanks || !/kofta/i.test(en)) console.log('FAIL Malek\'s lines: hello', hello, '| kofta EN', JSON.stringify(en), '| kofta AR', arK, '| thanks', thanks);
  // picking kofta from the menu: he says his kofta line
  await p.click('[data-testid=malek-tab-menu]'); await p.waitForTimeout(300);
  const koftaBtn = p.locator('[data-testid=malek-buy-malek_kofta]');
  let menuLine = 'n/a';
  if (await koftaBtn.count()) { await koftaBtn.first().evaluate((e) => e.click()); await p.waitForTimeout(400); menuLine = (await p.locator('[data-testid=malek-speech]').textContent().catch(() => '')).replace(/^MALEK\s*/, ''); if (await has('malek-cancel')) await p.click('[data-testid=malek-cancel]'); }
  await p.waitForTimeout(1500);
  console.log('   silent until asked:', silent, '| hello:', hello, '| kofta EN:', JSON.stringify(en), '| kofta AR:', arK, '| thanks:', thanks, '| menu kofta:', JSON.stringify(menuLine));
  console.log('1. clips fetched:', heard.join(', '));
  if (await has('malek-menu-close')) await p.click('[data-testid=malek-menu-close]'); // the open menu book covers the door
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
} catch (e) { console.log('FAILED', e.message.split('\n').filter((l, i) => i === 0 || /waiting for locator|intercepts/.test(l)).slice(0, 3).join(' / ')); await p.screenshot({ path: `${S}/ar-fail.png` }); }
console.log('errors', JSON.stringify(errs));
await b.close();
