// Malek's story on film: stage 3 plays clip 1 (Nabil pays the men and leads them in) then clip 2 (the
// orangutan sees them out) with their sound tracks on the video clock, Nabil's line once with a
// subtitle, a hard cut with no blank frame, Skip / sound / subtitles / Watch again; Continue applies
// the stage once (replay, reload and re-entry never apply it twice); nothing keeps sounding after
// leaving. Stage 4 keeps its painting, with the room's sound and Malek's line. Phone and desktop.
//   PORT=5173 SHOTS=/tmp/malek node tests/malek-cutscene.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const PORT = process.env.PORT ?? '4173', S = process.env.SHOTS ?? '/tmp/malek';
mkdirSync(S, { recursive: true });
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
for (const [tag, viewport] of [['phone', { width: 390, height: 844 }], ['desktop', { width: 1366, height: 800 }]]) {
  const p = await b.newPage({ viewport });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const got = []; p.on('response', (r) => { if (/videos\/|audio\/malek\/cutscene/.test(r.url())) got.push(`${r.status()} ${r.url().split('/').pop()}`); });
  const has = (id) => p.locator(`[data-testid="${id}"]`).count();
  const st = async () => JSON.parse(await p.evaluate(() => localStorage.getItem('threads-of-fortune-save'))).state;
  const edit = (fn) => p.evaluate((src) => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); new Function('s', 'd', src)(d.state, d); localStorage.setItem(k, JSON.stringify(d)); }, fn);
  const reload = async () => { await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(800); };
  const enter = async () => {
    await p.click('[data-testid=nav-stall]'); await p.waitForSelector('[data-testid=district]'); await p.waitForTimeout(300);
    if (await has('stall-sheet-close')) await p.click('[data-testid=stall-sheet-close]');
    await p.locator('[data-testid=poi-malek]').scrollIntoViewIfNeeded(); await p.click('[data-testid=poi-malek]');
    await p.waitForSelector('[data-testid=malek-shop]', { timeout: 20000 }); await p.waitForTimeout(400);
    return (await has('malek-story')) ? +(await p.locator('[data-testid=malek-story]').getAttribute('data-stage')) : 0;
  };
  const playing = () => p.evaluate(() => [...document.querySelectorAll('audio, video')].filter((m) => !m.paused).length);
  try {
    await p.goto(`http://localhost:${PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
    await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
    await edit(`s.tutorial = { done: true, step: 'done', inspected: true }; s.introSeen = ['malek']; s.relationships.nabil = { visits: 1, purchases: 0, spent: 0, affinity: 0, bad: 0, lastLines: [] }; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; localStorage.setItem('tof-skip-chapters', '1');
      s.day = 5; Object.assign(s.world, { at: 'giza', hour: 13 }); s.cash = 300; s.queue = [];
      s.malek = { stockDay: s.day, sold: {}, visits: 3, firstDay: 1, lastVisitDay: 4, orders: [], said: [], story: { nextStage: 3, lastStoryDay: 4, completed: [1, 2] } };`);
    await reload();
    const stage = await enter();
    const frame = await p.locator('.cut__frame').boundingBox();
    console.log(`${tag}: stage ${stage} | frame ${Math.round(frame.width)}x${Math.round(frame.height)} (ratio ${(frame.width / frame.height).toFixed(3)}, video 1.486)`);
    await p.waitForSelector('[data-testid=cutscene][data-state=playing]', { timeout: 10000 });
    await p.waitForTimeout(1800);
    const sub = await p.locator('[data-testid=cutscene-sub]').textContent().catch(() => '');
    await p.screenshot({ path: `${S}/cut-${tag}-1.png` });
    // the cut: watch for a moment with neither shot showing a frame
    const gap = await p.evaluate(() => new Promise((res) => {
      let blank = 0; const t0 = performance.now();
      const tick = () => {
        const on = document.querySelector('.cut__shot.is-on video');
        if (!on || on.readyState < 2) blank++;
        if (document.querySelector('[data-testid=cutscene]').dataset.shot === '1' && performance.now() - t0 > 4500) return res(blank);
        if (performance.now() - t0 > 9000) return res(-1);
        requestAnimationFrame(tick);
      };
      tick();
    }));
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `${S}/cut-${tag}-2.png` });
    const shot = await p.locator('[data-testid=cutscene]').getAttribute('data-shot');
    await p.waitForSelector('[data-testid=cutscene][data-state=done]', { timeout: 10000 });
    console.log(`   subtitle "${sub}" | now shot ${shot} | blank frames at the cut ${gap} | done, sounds still playing ${await playing()}`);
    console.log('   fetched:', got.filter((g) => /cutscene|mp4|webm/.test(g)).join(', '));
    // replay, then skip
    await p.click('[data-testid=cutscene-replay]'); await p.waitForSelector('[data-testid=cutscene][data-state=playing]');
    await p.click('[data-testid=cutscene-sound]'); await p.click('[data-testid=cutscene-subs]'); await p.waitForTimeout(1600);
    const subOff = await has('cutscene-sub');
    await p.click('[data-testid=cutscene-skip]'); await p.waitForTimeout(200);
    console.log(`   replay + sound off + subtitles off (sub shown ${subOff}) + skip -> ${await p.locator('[data-testid=cutscene]').getAttribute('data-state')} | playing ${await playing()}`);
    // the stage applies once
    await p.click('[data-testid=malek-story-done]'); await p.waitForTimeout(300);
    let s = await st();
    console.log('   continue ->', JSON.stringify(s.malek.story), '| sounds after:', await playing());
    await p.click('[data-testid=malek-leave]'); await p.waitForTimeout(300);
    await reload(); const again = await enter();
    s = await st();
    console.log('   reload + re-enter same day: stage', again, '| completed', JSON.stringify(s.malek.story.completed));
    await p.click('[data-testid=malek-leave]').catch(() => {}); await p.waitForTimeout(200);
    // stage 4 the next day: the painting, its sound and Malek's line
    await edit(`s.day = s.day + 1; s.world.hour = 13;`); await reload();
    const st4 = await enter();
    await p.waitForTimeout(700);
    console.log(`   next day: stage ${st4} | video ${await has('cutscene')} | line "${await p.locator('[data-testid=malek-still-line]').textContent().catch(() => '')}" | room sound ${got.some((g) => /reward/.test(g))}`);
    await p.screenshot({ path: `${S}/cut-${tag}-reward.png` });
    await p.click('[data-testid=malek-story-later]'); await p.waitForTimeout(400);
    console.log('   after the card: sounds playing', await playing());
  } catch (e) { console.log(tag, 'FAILED', e.message.split('\n')[0]); await p.screenshot({ path: `${S}/cut-${tag}-fail.png` }); }
  console.log('   errors', JSON.stringify(errs));
  await p.close();
}
await b.close();
