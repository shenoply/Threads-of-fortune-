// Beta codes in Settings: the list shows, a code works and is written in the journal, and the
// Progress page has no objective banner over it.
//   PORT=5173 node tests/beta-codes.mjs
import { chromium } from 'playwright';
import { BASE, SHOTS } from './_env.mjs';
import { mkdirSync } from 'node:fs';
mkdirSync(SHOTS, { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
let ok = true; const check = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) ok = false; };
await p.goto(BASE);
await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1')));
await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]'); await p.waitForTimeout(1500);
check((await p.locator('[data-testid=first-hour]').count()) > 0, 'the objective shows on the map');
await p.click('[data-testid=nav-hero]').catch(() => {}); await p.click('[data-testid=nav-ledger]'); await p.waitForTimeout(500);
check((await p.locator('[data-testid=first-hour], [data-testid=mission-banner]').count()) === 0, 'no objective banner over the Progress page');
await p.click('[data-testid=nav-map]'); await p.waitForTimeout(400);
await p.click('[data-testid=settings-btn]'); await p.waitForTimeout(400);
await p.click('[data-testid=code-open]');
await p.click('[data-testid=beta-codes] summary');
check((await p.locator('[data-testid=beta-codes] li').count()) >= 8, 'the beta codes are listed');
const cash0 = await p.evaluate(() => JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.cash);
await p.fill('[data-testid=code-input]', 'Purse'); await p.click('[data-testid=code-go]'); await p.waitForTimeout(600);
check(/Done/.test(await p.locator('[data-testid=code-msg]').innerText()), 'purse works');
await p.screenshot({ path: `${SHOTS}/beta-codes.png` });
const s = await p.evaluate(() => JSON.parse(localStorage.getItem('threads-of-fortune-save')).state);
check(s.cash === cash0 + 10000, `£100 added (${cash0} → ${s.cash})`);
check(s.journal.some((j) => j.text.includes('Beta code')), 'and written in the journal');
console.log(ok && !errs.length ? 'PASS' : 'FAIL', errs);
await b.close();
process.exit(ok && !errs.length ? 0 : 1);
