// Records the short "how it plays" clips from the running game (npx vite --port 5173): each feature is
// played by a script on a phone-sized screen, with a soft ring where the finger taps, then cut to a
// square loop. Writes public/video/how/<id>.mp4 and a poster <id>.webp.
//   node tools/record-feature-clips.mjs [ids...]
import { chromium } from 'playwright';
import { mkdirSync, renameSync, readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const PORT = process.env.PORT ?? '5173';
const RAW = process.env.RAW ?? '/tmp/feature-raw';
const OUT = 'public/video/how';
mkdirSync(RAW, { recursive: true }); mkdirSync(OUT, { recursive: true });
const VW = 390, VH = 844;
// the game's Google fonts, served from a local copy (FONTS=<folder with fonts.css and node_modules/@fontsource>)
const FONTS = process.env.FONTS;
async function fonts(ctx) {
  if (!FONTS || !existsSync(`${FONTS}/fonts.css`)) return;
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ contentType: 'text/css', body: readFileSync(`${FONTS}/fonts.css`, 'utf8') }));
  await ctx.route('https://fonts.local/**', (r) => { const f = new URL(r.request().url()).pathname; r.fulfill({ contentType: 'font/woff2', body: readFileSync(`${FONTS}/node_modules/@fontsource${f}`) }); });
}

// a ring that blooms where the finger lands, so a viewer can follow the taps
const TOUCH = `addEventListener('pointerdown', (e) => {
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;border:3px solid rgba(255,227,138,.95);background:rgba(255,227,138,.28);box-shadow:0 0 14px rgba(255,227,138,.8);transition:transform .45s ease-out,opacity .45s ease-out;left:'+e.clientX+'px;top:'+e.clientY+'px';
  document.documentElement.appendChild(d);
  requestAnimationFrame(() => { d.style.transform = 'scale(1.6)'; d.style.opacity = '0'; });
  setTimeout(() => d.remove(), 600);
}, true);`;

async function session(id, prep) {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  // a first page to make the save, without recording
  const ctx0 = await b.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await fonts(ctx0);
  const p0 = await ctx0.newPage();
  await p0.goto(`http://localhost:${PORT}/`);
  await p0.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'), localStorage.setItem('tof-fullscreen', 'off')));
  await p0.reload(); await p0.click('[data-testid=skip-to-day]'); await p0.click('[data-testid=begin-day-one]');
  await p0.evaluate((src) => {
    const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); const s = d.state;
    s.tutorial = { done: true, step: 'done', inspected: true };
    s.introSeen = ['malek', 'arran', 'abuhamid', 'bilgin-chess', 'rashid', 'nabil', 'cohen'];
    s.missionNews = undefined; s.levelUps = []; s.titleNews = []; s.guideSeen = true;
    new Function('s', src)(s);
    localStorage.setItem(k, JSON.stringify(d)); localStorage.setItem('tof-skip-chapters', '1');
  }, prep ?? '');
  const state = await ctx0.storageState(); await ctx0.close();
  const ctx = await b.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, storageState: state, recordVideo: { dir: RAW, size: { width: VW, height: VH } } });
  await fonts(ctx);
  await ctx.addInitScript(TOUCH);
  const p = await ctx.newPage();
  const t0 = Date.now();
  const has = (s) => p.locator(s).count();
  const tap = async (sel, wait = 700) => { const l = p.locator(sel).first(); await l.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {}); const bx = await l.boundingBox({ timeout: 3000 }).catch(() => null); if (bx) await p.mouse.click(bx.x + bx.width / 2, bx.y + bx.height / 2); else console.log('  miss', sel); await p.waitForTimeout(wait); };
  const marks = {};
  const mark = (k) => (marks[k] = (Date.now() - t0) / 1000);
  await p.goto(`http://localhost:${PORT}/`);
  if (await has('[data-testid=continue]')) await p.click('[data-testid=continue]');
  await p.waitForTimeout(900);
  return { b, ctx, p, has, tap, mark, marks, done: async () => { const v = p.video(); await ctx.close(); const path = await v.path(); await b.close(); renameSync(path, `${RAW}/${id}.webm`); return marks; } };
}

/** cut [a, b] seconds and crop the band of the screen from `top` to `top + h` (CSS px), 360 px wide, H.264 */
function encode(id, a, b, top = 0, h = VH) {
  const s = 1; // the recording is one video pixel per CSS px
  const outH = Math.round(360 * h / VW / 2) * 2;
  const crop = `crop=${VW * s}:${h * s}:0:${Math.round(top * s)},scale=360:${outH}:flags=lanczos,fps=24`;
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(a), '-to', String(b), '-i', `${RAW}/${id}.webm`, '-vf', crop, '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '29', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${OUT}/${id}.mp4`]);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(a + (b - a) * 0.55), '-i', `${RAW}/${id}.webm`, '-vf', crop.replace(',fps=24', ''), '-frames:v', '1', '-c:v', 'libwebp', '-quality', '72', `${OUT}/${id}.webp`]);
}

const CLIPS = {};
export { CLIPS, session, encode };

// ── the clips ─────────────────────────────────────────────────────────────────
const dismiss = async ({ p, has }) => { if (await has('[data-testid=upgrade-nudge-dismiss]')) { await p.click('[data-testid=upgrade-nudge-dismiss]').catch(() => {}); await p.waitForTimeout(300); } };

CLIPS.stall = async () => {
  const r = await session('stall', 's.cash = 3000;');
  const { p, tap, has, mark } = r; await dismiss(r);
  await tap('[data-testid=nav-stall]', 300);
  await p.waitForSelector('[data-testid=stall-wait]', { timeout: 20000 }).catch(() => {});
  mark('a'); await p.waitForTimeout(900);
  if (await has('[data-testid=stall-wait]')) await tap('[data-testid=stall-wait]', 2500);
  await p.waitForSelector('[data-testid=actions] .act', { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(1800);
  await tap('[data-testid=rugstrip] .rugcard:not(.empty) >> nth=0', 2800);
  const acts = p.locator('[data-testid=actions] .act');
  if (await acts.count()) { await acts.first().click(); await p.waitForTimeout(3200); }
  mark('b');
  return { ...(await r.done()), top: 0, h: 844 };
};

CLIPS.district = async () => {
  const r = await session('district');
  const { p, tap, mark } = r; await dismiss(r);
  const box = await p.locator('[data-testid=district]').boundingBox();
  mark('a');
  for (const [fx, fy] of [[0.35, 0.55], [0.6, 0.35], [0.45, 0.7]]) { await p.mouse.click(box.x + box.width * fx, box.y + box.height * fy); await p.waitForTimeout(1900); }
  mark('b');
  return { ...(await r.done()), top: 0, h: 844 };
};

CLIPS.rashid = async () => {
  const r = await session('rashid', 's.cash = 3000;');
  const { p, tap, has, mark } = r; await dismiss(r);
  mark('a');
  await tap('[data-testid=first-hour-go]', 2200);
  const look = p.locator('[data-testid^=look-]').first();
  if (await look.count()) { await look.click(); await p.waitForTimeout(2200); await p.keyboard.press('Escape'); if (await has('[data-testid=inspector-close]')) await tap('[data-testid=inspector-close]', 800); }
  await tap('[data-testid=haggle] >> nth=0', 2200);
  await tap('[data-testid=buy-cash] >> nth=0', 2600);
  mark('b');
  return { ...(await r.done()), top: 0, h: 844 };
};

CLIPS.inspect = async () => {
  const r = await session('inspect');
  const { p, tap, mark } = r; await dismiss(r);
  await tap('[data-testid=nav-inventory]', 1200);
  mark('a');
  await tap('button:has-text("Inspect") >> nth=0', 1800);
  await tap('[data-testid=inspector] button[aria-label="Zoom in"]', 1300);
  await tap('[data-testid=inspector] button[aria-label="Zoom in"]', 1500);
  await tap('[data-testid=inspector] button[aria-label="Zoom out"]', 1000);
  await tap('[data-testid=inspector] button[aria-label="Zoom out"]', 900);
  await tap('[data-testid=inspector] button:has-text("Condition")', 2000);
  await tap('[data-testid=inspector] button:has-text("Weave")', 2000);
  mark('b');
  return { ...(await r.done()), top: 0, h: 844 };
};

CLIPS.travel = async () => {
  const r = await session('travel', 's.cash = 3000;');
  const { p, tap, has, mark } = r; await dismiss(r);
  mark('a');
  await tap('[data-testid=district-world]', 1500);
  await tap('button[aria-label="Zoom out"]', 700);
  await tap('button[aria-label="Zoom out"]', 900);
  await tap('[data-testid=place-cairo]', 1500);
  const ff = p.locator('[data-testid=map-speed] button').nth(2);
  if (await ff.count()) { await ff.click().catch(() => {}); }
  for (let i = 0; i < 40 && !(await has('[data-testid=settlement]')); i++) await p.waitForTimeout(250);
  await p.waitForTimeout(1500);
  mark('b');
  return { ...(await r.done()), top: 0, h: 844 };
};

CLIPS.caravan = async () => {
  const r = await session('caravan', 's.cash = 6000;');
  const { p, tap, mark } = r; await dismiss(r);
  mark('a');
  await tap('[data-testid=nav-caravan]', 1500);
  await tap('[data-testid=buy-food-days]', 1500);
  await tap('[data-testid=buy-falahi]', 1800);
  await p.mouse.wheel(0, 500); await p.waitForTimeout(900);
  await tap('[data-testid=hire-fellah]', 1800);
  await p.mouse.wheel(0, -900); await p.waitForTimeout(1500);
  mark('b');
  return { ...(await r.done()), top: 0, h: 844 };
};

CLIPS.cafe = async () => {
  const r = await session('cafe', 's.cash = 3000; Object.assign(s.world, { hour: 10 });');
  const { p, tap, mark } = r; await dismiss(r);
  mark('a');
  await tap('[data-testid=poi-coffee]', 2200);
  await tap('[data-testid=cafe-play-tawla]', 1200);
  await tap('[data-testid=cafe-tawla]', 1200);
  await tap('[data-testid=tw-open]', 2400);
  for (let k = 0, moves = 0; k < 60 && moves < 4; k++) {
    await p.waitForTimeout(300);
    const can = p.locator('.tw-pt.can, .tw-bar.can');
    if (!(await can.count())) continue;
    await can.first().click(); await p.waitForTimeout(700);
    const dest = p.locator('.tw-pt.dest, .tw-off.dest');
    if (await dest.count()) { await dest.first().click(); moves++; await p.waitForTimeout(900); }
  }
  await p.waitForTimeout(1500);
  mark('b');
  return { ...(await r.done()), top: 0, h: 844 };
};

CLIPS.news = async () => {
  const r = await session('news');
  const { p, tap, has, mark } = r; await dismiss(r);
  mark('a');
  await tap('[data-testid=paper-btn]', 2200);
  await p.mouse.move(195, 500); await p.mouse.wheel(0, 450); await p.waitForTimeout(1500);
  await p.mouse.wheel(0, 450); await p.waitForTimeout(1500);
  await tap('[data-testid=newspaper-close]', 1000);
  await tap('[data-testid=radio-btn]', 4500);
  mark('b');
  return { ...(await r.done()), top: 0, h: 844 };
};

const want = process.argv.slice(2);
// ENCODE_ONLY=1: re-cut the existing recordings with the marks in MARKS (JSON) instead of playing again
if (process.env.ENCODE_ONLY) { const M = JSON.parse(process.env.MARKS); for (const [id, m] of Object.entries(M)) encode(id, m.a, m.b, m.top ?? 0, m.h ?? VH); process.exit(0); }
for (const [id, fn] of Object.entries(CLIPS)) {
  if (want.length && !want.includes(id)) continue;
  const m = await fn();
  console.log(id, JSON.stringify(m));
  encode(id, m.a, m.b, m.top, m.h);
}
