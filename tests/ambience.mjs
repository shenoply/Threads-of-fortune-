import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage();
const reqs=[]; p.on('request', r => { if (r.url().includes('/audio/')) reqs.push(r.url().split('/').pop()); });
await p.goto('http://localhost:4173/'); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
await p.waitForTimeout(3000);
console.log('requested', reqs, 'engine', JSON.stringify(await p.evaluate(() => window.__tofAudio.state)), 'scene', await p.evaluate(() => window.__tofAudio.scene));
await b.close();
