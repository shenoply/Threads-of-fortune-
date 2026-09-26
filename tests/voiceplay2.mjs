import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 390, height: 760 } });
await p.goto('http://localhost:4173/'); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'))); await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
const samples = [];
for (let i = 0; i < 30; i++) { samples.push(await p.evaluate(() => window.__tofVoice.playing)); await p.waitForTimeout(250); }
await p.click('[data-testid=act-ask_room]');
for (let i = 0; i < 40; i++) { samples.push(await p.evaluate(() => window.__tofVoice.playing)); await p.waitForTimeout(250); }
console.log('clips in manifest', await p.evaluate(() => window.__tofVoice.count));
console.log(samples.map((x) => (x ? '#' : '.')).join(''));
await b.close();
