// Phone usability check: every main screen at 390x844 on a touch device: nothing wider than the
// screen, and no control smaller than 32px to the thumb (counting the invisible hit area).
//   PORT=5173 node tests/phone-ux.mjs   (screenshots in /tmp/claude-0/ux)
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
const has = (id) => p.locator(`[data-testid="${id}"]`).count();
const edit = (fn) => p.evaluate((src) => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); new Function('s', 'd', src)(d.state, d); localStorage.setItem(k, JSON.stringify(d)); }, fn);
const shot = (n) => p.screenshot({ path: `/tmp/phone-ux-${n}.png` });
// small tap targets on screen right now
const small = () => p.evaluate(() => [...document.querySelectorAll('button, a, [role=button]')].filter((e) => { const r = e.getBoundingClientRect(); const a = getComputedStyle(e, '::after'); const grow = a.content !== 'none' && a.position === 'absolute' ? 16 : 0; return r.width > 0 && r.height > 0 && r.top < innerHeight && r.bottom > 0 && (r.height + grow < 32 || r.width + grow < 32); }).map((e) => (e.dataset.testid || e.getAttribute('aria-label') || e.textContent.trim()).slice(0, 24) + ` ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`));
const overflow = () => p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
await p.goto(`http://localhost:${process.env.PORT ?? 4173}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
await edit(`s.tutorial = { done: true, step: 'done', inspected: true }; s.introSeen = ['malek','arran','abuhamid','rashid','nabil','cohen']; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; localStorage.setItem('tof-skip-chapters', '1'); Object.assign(s.world, { at: 'giza', hour: 11 }); s.queue = ['yusuf']; s.arrivals = [11.05]; s.visitIdx = 0;`);
await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(1200);
const report = async (n) => { await shot(n); console.log(n, '| page wider than screen:', await overflow(), '| small taps:', (await small()).join(', ')); };
await report('01-map');
for (const [tab, n] of [['nav-stall', '02-stall'], ['nav-caravan', '03-caravan'], ['nav-inventory', '04-stock'], ['nav-ledger', '05-progress'], ['nav-hero', '06-me']]) { await p.click(`[data-testid=${tab}]`).catch(() => {}); await p.waitForTimeout(900); await report(n); }
await p.click('[data-testid=nav-stall]'); await p.waitForTimeout(700); if (await has('stall-wait')) await p.click('[data-testid=stall-wait]'); await p.waitForTimeout(2500); await report('07-encounter');
await p.click('[data-testid=settings-btn]').catch(() => {}); await p.waitForTimeout(500); await report('08-settings');
await b.close();
