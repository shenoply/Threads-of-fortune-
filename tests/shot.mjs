import { chromium } from 'playwright';
import { PORT as __PORT, SHOTS as __SHOTS, serveFirstCustomer } from './_env.mjs';
const mode = process.argv[2] || 'phone';
const b = await chromium.launch();
const vp = mode==='wide' ? {width:1280,height:760} : mode==='small' ? {width:360,height:640} : {width:390,height:760};
const p = await b.newPage({ viewport: vp, deviceScaleFactor: 2 });
const errs=[]; p.on('pageerror', e=>errs.push(e.message));
await p.goto(`http://localhost:${__PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload(); // skip the opening film
await p.click('[data-testid=skip-to-day]');
await p.click('[data-testid=begin-day-one]'); await p.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.started === true; } catch { return false; } }, null, { timeout: 10000 }).catch(() => {}); /* day one is on disk before the save is edited */
await serveFirstCustomer(p); // day one opens on the Giza district: start the first sale
const shot = async (n)=>p.screenshot({ path: `${__SHOTS}/${mode}-${n}.png` });
await p.waitForTimeout(3500); await shot('1');
await p.click('[data-testid=act-ask_room]');
await p.waitForTimeout(7000); await shot('2');
await p.click('[data-testid=rug-desert-star]');
await p.waitForTimeout(6000); await shot('3');
console.log('errors', errs);
await b.close();
