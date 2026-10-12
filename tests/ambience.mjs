import { chromium } from 'playwright';
import { PORT as __PORT } from './_env.mjs';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage();
const reqs=[]; p.on('request', r => { if (r.url().includes('/audio/')) reqs.push(r.url().split('/').pop()); });
await p.goto(`http://localhost:${__PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]'); await p.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.started === true; } catch { return false; } }, null, { timeout: 10000 }).catch(() => {}); /* day one is on disk before the save is edited */
// the street sounds come in after about 5 s on the map and the music after about 12 s
await p.waitForTimeout(13500);
const st = await p.evaluate(() => window.__tofAudio.state);
console.log('requested', reqs, 'engine', JSON.stringify(st), 'scene', await p.evaluate(() => window.__tofAudio.scene));
console.log(st.ambiencePlaying ? 'PASS' : 'FAIL', 'ambience playing after 13 s');
console.log(st.musicPlaying ? 'PASS' : 'FAIL', 'music playing after 13 s');
await b.close();
