// Step 1 of the "How it plays" films: play each feature on a phone-sized screen against the built game
// (npx vite preview --port 4173), and at every step wait until the screen has really finished loading
// (no requests in flight, every picture decoded, animations settled) before taking a sharp screenshot.
// Records where the next tap lands, and the narrator's line for that step.
//   FONTS=<dir> OUT=<dir> node tools/how-films/capture.mjs [ids...]
// Step 2 is tools/how-films/compose.py.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { FILMS } from './script.mjs';

const URL = process.env.URL ?? 'http://localhost:4173/';
const OUT = process.env.OUT ?? '/tmp/how-films';
const FONTS = process.env.FONTS;
const VW = 390, VH = 844;

async function fonts(ctx) {
  if (!FONTS || !existsSync(`${FONTS}/fonts.css`)) return;
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ contentType: 'text/css', body: readFileSync(`${FONTS}/fonts.css`, 'utf8') }));
  await ctx.route('https://fonts.local/**', (r) => r.fulfill({ contentType: 'font/woff2', body: readFileSync(`${FONTS}/node_modules/@fontsource${new globalThis.URL(r.request().url()).pathname}`) }));
}

async function newGame(b, prep) {
  const ctx = await b.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await fonts(ctx);
  const p = await ctx.newPage();
  let inflight = 0, last = Date.now();
  p.on('request', () => { inflight++; last = Date.now(); });
  const done = () => { inflight = Math.max(0, inflight - 1); last = Date.now(); };
  p.on('requestfinished', done); p.on('requestfailed', done);
  await p.goto(URL);
  await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'), localStorage.setItem('tof-fullscreen', 'off')));
  await p.reload(); await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
  await p.evaluate((src) => {
    const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); const s = d.state;
    s.tutorial = { done: true, step: 'done', inspected: true };
    s.introSeen = ['malek', 'arran', 'abuhamid', 'bilgin-chess', 'rashid', 'nabil', 'cohen'];
    s.missionNews = undefined; s.levelUps = []; s.titleNews = []; s.guideSeen = true; s.cash = 6000;
    new Function('s', src)(s);
    localStorage.setItem(k, JSON.stringify(d)); localStorage.setItem('tof-skip-chapters', '1');
  }, prep ?? '');
  await p.reload();
  if (await p.locator('[data-testid=continue]').count()) await p.click('[data-testid=continue]');
  // no sound in the capture, and no blinking caret in the shots
  await p.addStyleTag({ content: '*{caret-color:transparent!important} .upgrade-nudge{display:none!important}' });
  /** wait until nothing is loading, every picture on screen is decoded, and the screen has stopped moving */
  const settle = async (extra = 900) => {
    const t0 = Date.now();
    while (Date.now() - t0 < 20000) {
      if (inflight === 0 && Date.now() - last > 700) {
        const ready = await p.evaluate(async () => {
          const imgs = [...document.images].filter((i) => { const r = i.getBoundingClientRect(); return r.width > 0 && r.bottom > 0 && r.top < innerHeight; });
          await Promise.all(imgs.map((i) => (i.complete ? i.decode().catch(() => {}) : new Promise((res) => { i.onload = i.onerror = res; }))));
          return imgs.every((i) => i.complete);
        });
        if (ready) break;
      }
      await p.waitForTimeout(150);
    }
    await p.waitForTimeout(extra);
  };
  await settle(1500);
  return { ctx, p, settle };
}

const want = process.argv.slice(2);
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
for (const film of FILMS) {
  if (want.length && !want.includes(film.id)) continue;
  const dir = `${OUT}/${film.id}`; mkdirSync(dir, { recursive: true });
  const { ctx, p, settle } = await newGame(b, film.prep);
  const steps = [];
  for (const [i, st] of film.steps.entries()) {
    if (st.before) { await st.before(p).catch((e) => console.log('  before failed', film.id, i, e.message.split('\n')[0])); }
    await settle(st.settle ?? 900);
    const shot = `${dir}/${String(i).padStart(2, '0')}.png`;
    await p.screenshot({ path: shot });
    // where the finger goes next
    let tap = null;
    if (st.tap) {
      const l = typeof st.tap === 'string' ? p.locator(st.tap).first() : null;
      if (l) {
        await l.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {});
        // scrolling changes the screen: shoot again so the ring sits on what is shown
        await settle(300); await p.screenshot({ path: shot });
        const bx = await l.boundingBox({ timeout: 3000 }).catch(() => null);
        if (bx) tap = [bx.x + bx.width / 2, bx.y + bx.height / 2];
      } else tap = st.tap;
    }
    steps.push({ shot, say: st.say, tap });
    console.log(film.id, i, tap ? `tap ${tap.map(Math.round)}` : '', st.say.slice(0, 50));
    if (tap) {
      // a real click on the element where there is one (some controls ignore a bare mouse event)
      const l = typeof st.tap === 'string' ? p.locator(st.tap).first() : null;
      let done = false;
      if (l) done = await l.click({ force: true, timeout: 3000, noWaitAfter: true }).then(() => true).catch(() => false);
      if (!done) await p.mouse.click(tap[0], tap[1]);
      await p.waitForTimeout(400);
    }
  }
  writeFileSync(`${dir}/steps.json`, JSON.stringify({ id: film.id, title: film.title, steps }, null, 1));
  await ctx.close();
}
await b.close();
