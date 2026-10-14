// The seasons of 1925: a khamsin morning (news card, fewer and shorter-tempered buyers, sand in a rug
// left out, the haze over Giza, the calendar mark) and the eve of Eid al-Fitr (the card the evening
// before, prayer rugs in demand, the feast on the calendar). Also the quarantine and the flood.
//   PORT=5173 node tests/seasons.mjs
import { chromium } from 'playwright';
import { BASE, SHOTS } from './_env.mjs';
const K = 'threads-of-fortune-save';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
let ok = true; const check = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) ok = false; };
await p.goto(BASE);
await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'), localStorage.setItem('tof-skip-chapters', '1'), localStorage.setItem('tof-news', '1')));
await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
await p.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.started === true; } catch { return false; } }, null, { timeout: 10000 }).catch(() => {});
await p.waitForTimeout(1000);
const save = await p.evaluate((k) => localStorage.getItem(k), K);

// the rules, straight from the modules
const rules = await p.evaluate(async () => {
  // the very modules the game loaded (a module edited since has a ?t= stamp on its URL)
  const url = (f) => performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes(f)) ?? f;
  const life = await import(url('/src/game/economy/life.ts'));
  const cal = await import(url('/src/game/economy/calendar1925.ts'));
  const world = await import(url('/src/game/systems/world.ts'));
  const ids = (d) => life.eventsOn(d).map((e) => e.id);
  cal.setSeasonDay(155); const ship = world.seaRoutesFrom('portsaid').find((r) => r.to === 'jaffa').days;
  cal.setSeasonDay(100); const shipNormal = world.seaRoutesFrom('portsaid').find((r) => r.to === 'jaffa').days;
  return { k24: ids(24), lane24: life.laneDay(24), lane10: life.laneDay(10), eid: ids(46), sham: life.laneDay(42), ship, shipNormal, ferryFlood: cal.ferryHours(170), ferry: cal.ferryHours(100), demo: life.cityClosed(249, 'cairo') };
});
check(rules.k24.includes('khamsin-24'), `a khamsin blows on 2 April 1925 (day 24): ${rules.k24.join(', ')}`);
check(rules.lane24.extra === rules.lane10.extra - 1 && rules.lane24.patience === 0.85, `khamsin: one buyer fewer and patience x0.85 (${JSON.stringify(rules.lane24)})`);
check(rules.eid.includes('eid'), 'Eid al-Fitr on 24 April 1925 (day 46)');
check(rules.sham.extra <= -2, `Sham el-Nessim empties the lane (${rules.sham.extra})`);
check(rules.ship === rules.shipNormal + 2, `quarantine at Port Said adds two days to the Jaffa boat (${rules.shipNormal} -> ${rules.ship})`);
check(rules.ferryFlood > rules.ferry, `the ferry is slower in the flood (${rules.ferry}h -> ${rules.ferryFlood}h)`);
check(rules.demo, 'Cairo is shut on Jihad Day, 13 November 1925');

const load = async (day, extra = {}) => {
  await p.goto('about:blank');
  await p.goto(BASE);
  await p.evaluate(([k, raw, day, extra]) => {
    const d = JSON.parse(raw);
    Object.assign(d.state, { day, tutorial: { done: true, step: 'done', inspected: true }, tipsSeen: [...(d.state.tipsSeen || []), 'first-hour'], newsSeen: [], lastSummary: undefined, missionNews: undefined, seasonsSeen: [] }, extra);
    d.state.world = { ...d.state.world, at: 'giza' };
    localStorage.setItem(k, JSON.stringify(d));
  }, [K, save, day, extra]);
  await p.reload(); if (await p.locator('[data-testid=continue]').count()) await p.click('[data-testid=continue]');
  await p.waitForTimeout(2200);
};

// 1. a khamsin morning at the stall, with one good rug left out
const rug = { uid: 'dust1', typeId: 'cairo-garden', condition: 'Good', restored: false, provenance: 'Likely', paid: 500, notes: [] };
await load(24, { inventory: [rug] });
const card = p.locator('[data-testid=big-news]');
await p.locator('[data-testid=big-news-more]').click().catch(() => {}); await p.waitForTimeout(300);
const txt = (await card.innerText().catch(() => '')).replace(/\s+/g, ' ');
check(/Khamsin/.test(txt) && /Fewer buyers/.test(txt) && /Sand gets into rugs/.test(txt), `the khamsin card: "${txt.slice(0, 160)}"`);
await p.screenshot({ path: `${SHOTS}/seasons-khamsin-card.png` });
await p.click('[data-testid=big-news-ok]').catch(() => {}); await p.waitForTimeout(600);
const st = await p.evaluate((k) => JSON.parse(localStorage.getItem(k)).state, K);
const it = st.inventory.find((i) => i.uid === 'dust1');
check(it?.condition === 'Worn' && st.journal.some((j) => /khamsin blew sand/.test(j.text)), `the rug left out is worn by the sand (${it?.condition})`);
check((await p.locator('[data-testid=dust-haze]').count()) > 0, 'the sand haze hangs over the scene');
await p.screenshot({ path: `${SHOTS}/seasons-khamsin-scene.png` });
await p.click('[data-testid=hud-calendar]').catch(() => {}); await p.waitForTimeout(600);
check((await p.locator('[data-testid=cal-event-khamsin-24]').count()) > 0, 'the calendar names the khamsin today');
await p.screenshot({ path: `${SHOTS}/seasons-khamsin-calendar.png` });
await p.reload(); if (await p.locator('[data-testid=continue]').count()) await p.click('[data-testid=continue]'); await p.waitForTimeout(1500);
const st2 = await p.evaluate((k) => JSON.parse(localStorage.getItem(k)).state, K);
check(st2.inventory.find((i) => i.uid === 'dust1')?.condition === 'Worn', 'once per spell: a reload does not sand it again');

// 2. the eve of Eid al-Fitr: told the evening before, prayer rugs wanted
await load(45);
await p.locator('[data-testid=big-news-more]').click().catch(() => {}); await p.waitForTimeout(300);
const t2 = (await card.innerText().catch(() => '')).replace(/\s+/g, ' ');
check(/Tomorrow: Eid al-Fitr/.test(t2) && /prayer rugs/.test(t2), `the Eid card the day before: "${t2.slice(0, 200)}"`);
await p.screenshot({ path: `${SHOTS}/seasons-eid-card.png` });
await p.click('[data-testid=big-news-ok]').catch(() => {}); await p.waitForTimeout(500);
await p.click('[data-testid=hud-calendar]').catch(() => {}); await p.waitForTimeout(600);
await p.locator('.cal-day', { has: p.locator('em', { hasText: /^24$/ }) }).first().click();
await p.waitForTimeout(300);
check((await p.locator('[data-testid=cal-event-eid]').count()) > 0, 'the calendar shows Eid al-Fitr on 24 April');
await p.screenshot({ path: `${SHOTS}/seasons-eid-calendar.png` });

console.log(ok && !errs.length ? 'PASS' : 'FAIL', errs);
await b.close();
process.exit(ok && !errs.length ? 0 : 1);
