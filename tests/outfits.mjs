// Ready outfits: the wardrobe lists the twenty, buying one where it is sold puts it on, wearing one
// changes the stall picture to match, and an old piece-by-piece save loads into the nearest outfits.
//   PORT=5173 SHOTS=/tmp/outfits node tests/outfits.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const PORT = process.env.PORT ?? '5173', S = process.env.SHOTS ?? '/tmp/outfits';
mkdirSync(S, { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const out = []; let ok = true; const check = (c, m) => { out.push(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) ok = false; };
const has = (id) => p.locator(`[data-testid="${id}"]`).count();
const st = () => p.evaluate(() => JSON.parse(localStorage.getItem('threads-of-fortune-save')).state);
const boot = async (prep) => {
  await p.goto(`http://localhost:${PORT}/`);
  await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'), localStorage.setItem('tof-fullscreen', 'off'))); await p.reload();
  await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
  await p.evaluate((src) => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); const s = d.state; s.tutorial = { done: true, step: 'done', inspected: true }; s.introSeen = ['malek', 'arran', 'abuhamid', 'bilgin-chess', 'rashid', 'nabil', 'cohen']; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; s.cash = 3000; new Function('d', 's', src)(d, s); localStorage.setItem(k, JSON.stringify(d)); localStorage.setItem('tof-skip-chapters', '1'); }, prep ?? '');
  await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(800);
};
await boot();
let s = await st();
check(s.wardrobe.worn === 'classic-stall' && s.wardrobe.owned.includes('market-work'), `new game wears ${s.wardrobe.worn}, owns ${s.wardrobe.owned}`);
await p.click('[data-testid=nav-hero]'); await p.waitForTimeout(500);
await p.click('[data-testid=hh-wardrobe]'); await p.waitForSelector('[data-testid=wardrobe]');
check((await p.locator('.wr-card').count()) === 20, 'twenty outfits in the wardrobe');
await p.click('[data-testid=wr-outfit-friday-white]'); await p.click('[data-testid=wr-buy]'); await p.waitForTimeout(300);
s = await st();
check(s.wardrobe.worn === 'friday-white' && s.cash === 3000 - 90, `bought and wearing Friday whites (cash ${s.cash})`);
await p.click('[data-testid=wr-outfit-court-formal]');
check(await p.locator('[data-testid=wr-buy]').isDisabled(), 'court dress is not sold in Giza');
await p.waitForTimeout(600); await p.screenshot({ path: `${S}/wardrobe.png` });
await p.click('[data-testid=wr-outfit-market-work]'); await p.click('[data-testid=wr-wear]'); await p.waitForTimeout(300);
check((await st()).wardrobe.worn === 'market-work', 'put on the work galabiya');
await p.click('[data-testid=wr-close]');
await p.click('[data-testid=nav-stall]');
await p.waitForSelector('[data-testid=stall-wait]', { timeout: 20000 }).catch(() => {});
if (await has('stall-wait')) await p.click('[data-testid=stall-wait]');
await p.waitForSelector('[data-testid=hero-at-stall]', { timeout: 15000 }).catch(() => {});
await p.waitForTimeout(1500);
const src = await p.locator('[data-testid=hero-at-stall] img').getAttribute('src').catch(() => null);
check(src === 'art/hero/outfits/market-work-stall.webp', `stall shows ${src}`);
await p.screenshot({ path: `${S}/stall.png` });
// an old piece-by-piece save
await boot("s.wardrobe = { owned: ['linen-shirt', 'vest-embroidered', 'sirwal', 'babouche', 'tarboosh', 'stambouli'], outfit: { head: 'tarboosh', top: 'linen-shirt', outer: 'stambouli', legs: 'sirwal', feet: 'babouche', extras: [], weapon: null, carry: null } }; d.version = 19;");
s = await st();
check(s.wardrobe.worn === 'cairo-effendi' && s.wardrobe.owned.includes('tarboosh-stall'), `old save -> wears ${s.wardrobe.worn}, owns ${s.wardrobe.owned}`);
console.log(out.join('\n'));
console.log(ok && !errs.length ? 'PASS' : 'FAIL', JSON.stringify(errs.slice(0, 3)));
await b.close();
