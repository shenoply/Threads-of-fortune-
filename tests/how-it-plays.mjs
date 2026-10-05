// How it plays: the tile page opens from the title screen and Settings, every tile has its clip (or
// its poster where the browser cannot play H.264, as in this test browser), and a tile opens the full
// view with Back / Next / All.
//   PORT=5173 SHOTS=/tmp/how node tests/how-it-plays.mjs
import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'node:fs';
const PORT = process.env.PORT ?? '5173', S = process.env.SHOTS ?? '/tmp/how';
mkdirSync(S, { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const out = []; let ok = true; const check = (c, m) => { out.push(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) ok = false; };
await p.goto(`http://localhost:${PORT}/`);
await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-fullscreen', 'off'))); await p.reload();
await p.click('[data-testid=title-how]'); await p.waitForSelector('[data-testid=how-it-plays]');
const ids = await p.locator('.how__tile').evaluateAll((t) => t.map((x) => x.dataset.testid.slice(4)));
check(ids.length >= 8, `${ids.length} tiles: ${ids.join(', ')}`);
check(ids.every((id) => existsSync(`public/video/how/${id}.mp4`) && existsSync(`public/video/how/${id}.webp`)), 'every tile has its clip and poster');
await p.waitForTimeout(1500);
const sizes = await p.locator('.how__tile').evaluateAll((t) => t.map((x) => { const r = x.getBoundingClientRect(); return Math.abs(r.width - r.height) < 2 && r.width > 120; }));
check(sizes.every(Boolean), 'tiles are squares');
await p.screenshot({ path: `${S}/grid.png` });
await p.click('[data-testid=how-stall]'); await p.waitForSelector('[data-testid=how-view]');
check((await p.locator('.how__text h3').textContent()) === 'Selling at your stall', 'tile opens its full view');
await p.screenshot({ path: `${S}/view.png` });
await p.click('[data-testid=how-next]'); check((await p.locator('.how__text h3').textContent()) === 'Walking Giza', 'Next goes on');
await p.click('[data-testid=how-all]'); check(!(await p.locator('[data-testid=how-view]').count()), 'All returns to the squares');
await p.click('[data-testid=how-close]'); check(!(await p.locator('[data-testid=how-it-plays]').count()), 'closes');
console.log(out.join('\n'));
console.log(ok && !errs.length ? 'PASS' : 'FAIL', JSON.stringify(errs.slice(0, 3)));
await b.close();
