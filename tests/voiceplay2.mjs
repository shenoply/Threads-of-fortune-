import { chromium } from 'playwright';
import { PORT as __PORT, serveFirstCustomer } from './_env.mjs';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 390, height: 760 } });
await p.goto(`http://localhost:${__PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]'); await p.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.started === true; } catch { return false; } }, null, { timeout: 10000 }).catch(() => {}); /* day one is on disk before the save is edited */
await serveFirstCustomer(p); // day one opens on the Giza district: start the first sale
const samples = [];
for (let i = 0; i < 30; i++) { samples.push(await p.evaluate(() => window.__tofVoice.playing)); await p.waitForTimeout(250); }
await p.click('[data-testid=act-ask_room]');
for (let i = 0; i < 40; i++) { samples.push(await p.evaluate(() => window.__tofVoice.playing)); await p.waitForTimeout(250); }
console.log('clips in manifest', await p.evaluate(() => window.__tofVoice.count));
console.log(samples.map((x) => (x ? '#' : '.')).join(''));
await b.close();
