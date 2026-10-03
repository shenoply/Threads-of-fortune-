// The gramophone through the mixer: master 0 silences it, a record that will not load shows Retry
// and gives the score back, and an old record ending does not stop the new one.
//   PORT=5173 node tests/gramophone.mjs
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? '5173';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(`http://localhost:${PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]'); await p.waitForTimeout(1200);
await p.evaluate(() => window.dispatchEvent(new Event('tof:gramophone')));
await p.waitForTimeout(1500); await p.waitForSelector('[data-testid=gramophone-list] .gramo-track', { timeout: 8000 });
const ids = await p.locator('.gramo-track').evaluateAll((els) => els.map((e) => e.dataset.testid));
await p.click(`[data-testid=${ids[0]}]`); await p.waitForTimeout(1700);
const out = {};
out.recordVol = await p.evaluate(() => { const a = window.__tofAudio; return [...a.els].find(([, e]) => e.kind === 'music')?.[0].volume; });
out.master0 = await p.evaluate(() => { const a = window.__tofAudio; a.setVolumes({ master: 0, music: 1, sfx: 1, dialogue: 1 }); return [...a.els].find(([, e]) => e.kind === 'music')?.[0].volume; });
await p.evaluate(() => window.__tofAudio.setVolumes({ master: 1, music: 1, sfx: 1, dialogue: 1 }));
// switch to record B, then fire A's ended late
const firstEl = await p.evaluateHandle(() => [...window.__tofAudio.els].find(([, e]) => e.kind === 'music')[0]);
await p.click(`[data-testid=${ids[1]}]`); await p.waitForTimeout(200);
await firstEl.evaluate((el) => el.onended?.());
out.bStillOn = await p.locator(`[data-testid=${ids[1]}].on`).count();
out.recordCutStillOn = await p.evaluate(() => window.__tofAudio.cuts.has('record'));
// a record that fails
await p.route('**/audio/music/*.mp3', (r) => r.abort());
await p.click(`[data-testid=${ids[2]}]`); await p.waitForTimeout(1500);
out.retryShown = await p.locator('[data-testid=gramo-retry]').count();
out.scoreBack = await p.evaluate(() => !window.__tofAudio.cuts.has('record'));
console.log(JSON.stringify(out));
const ok = out.recordVol > 0.8 && out.master0 === 0 && out.bStillOn === 1 && out.recordCutStillOn && out.retryShown === 1 && out.scoreBack;
console.log(ok ? 'PASS' : 'FAIL', 'errors', JSON.stringify(errs));
await b.close();
