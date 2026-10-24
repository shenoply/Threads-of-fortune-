// Road fights as three rounds of orders (systems/combat.ts, components/World/Clash.tsx):
// tells and orders, morale breaking, the duel won and lost, spoils and prisoners, the police post's bounty
// and the wanted leader cleared from his road, promotions and the sergeant, the sergeant handling it alone,
// a beating that makes the band a named enemy, and an old save brought up to date.
import { chromium } from 'playwright';
import { PORT as __PORT, SHOTS } from './_env.mjs';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 412, height: 915 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const out = []; let ok = true; const check = (c, m) => { out.push(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) ok = false; };
const has = async (s) => (await p.locator(s).count()) > 0;
const KEY = 'threads-of-fortune-save';
const STORE = `performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/game/state/store.ts')) ?? '/src/game/state/store.ts'`;
/** run fn(store module, combat module) in the page */
const inGame = (fn, arg) => p.evaluate(async ([src, a]) => {
  const m = await import(eval(src)); const c = await import('/src/game/systems/combat.ts');
  return (0, eval)(`(${a.fn})`)(m, c, a.arg);
}, [STORE, { fn: fn.toString(), arg }]);

await p.goto(`http://localhost:${__PORT}/`);
await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'), localStorage.setItem('tof-fullscreen', 'off'))); await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
await p.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.started === true; } catch { return false; } }, null, { timeout: 10000 }).catch(() => {});
await p.evaluate(() => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); const s = d.state; s.tutorial = { done: true, step: 'done', inspected: true }; s.missionNews = undefined; s.levelUps = []; s.titleNews = [];
  Object.assign(s.world, { at: 'cairo', hour: 8, x: 214.3, y: 413.7 }); s.world.party.troops = { guard: 2, fellah: 2, veteran: 1 }; s.world.party.animals = { falahi: 2 }; s.world.party.food = 40; s.cash = 3000; s.reputation = 40;
  (window.__tofEdit = true, localStorage.setItem(k, JSON.stringify(d)), window.__tofEdit = false, (() => { const w = Storage.prototype.setItem; if (w.__hold) return; const h = function (key, v) { if (key === 'threads-of-fortune-save' && !window.__tofEdit) return; return w.call(this, key, v); }; h.__hold = true; Storage.prototype.setItem = h; setTimeout(() => { if (Storage.prototype.setItem === h) Storage.prototype.setItem = w; }, 4000); })()); localStorage.setItem('tof-skip-chapters', '1'); });
await p.reload(); if (await has('[data-testid=continue]')) await p.click('[data-testid=continue]'); await p.waitForTimeout(800);
await p.click('[data-testid=nav-map]').catch(() => {}); await p.waitForTimeout(500);
if (await has('[data-testid=district-world]')) await p.click('[data-testid=district-world]');

// ---- the rules themselves ----
const rules = await inGame((m, c) => {
  const moves = ['rush', 'snipe', 'circle', 'waver'];
  const bests = moves.map((mv) => c.ORDERS.filter((o) => c.SCORE[mv][o] === 2));
  const s = { myPow: 10, enPow: 10, temper: 'reckless', known: false, scout: false, ground: 'road', formation: 'line', sergeant: false, seed: 't' };
  const pr = c.promote({ fellah: 2, guard: 1 }, { fellah: 3 }, 1);
  let f = c.startFight(s); const wrong = c.ORDERS.find((o) => c.SCORE[c.moveOf(f.tell)][o] < 0);
  const bad = c.playRound(f, wrong);
  return { bests: bests.map((x) => x.length), distinct: new Set(bests.flat()).size, player: c.winOdds(s), sergeant: c.winOdds(s, c.sergeantPolicy(true, false)), weak: c.winOdds({ ...s, myPow: 5 }), camels: c.winOdds({ ...s, myPow: 8, ground: 'camels', formation: 'square' }), open: c.winOdds({ ...s, myPow: 8 }), pr, badMy: 100 - bad.my, badEn: 100 - bad.en };
});
check(rules.bests.every((n) => n === 1) && rules.distinct === 4, 'every move they make has exactly one right answer, and each is a different order');
check(rules.sergeant < rules.player, `the sergeant alone does a little worse than a master who reads them (${rules.sergeant}% against ${rules.player}%)`);
check(rules.weak < rules.player, `a weaker caravan has worse odds (${rules.weak}% against ${rules.player}%)`);
check(rules.camels !== rules.open, `ground and formation shift the odds (${rules.open}% on the open road in line, ${rules.camels}% behind the camels in a square)`);
check(rules.pr.troops.guard === 2 && rules.pr.troops.fellah === 1 && rules.pr.ups.length === 1, 'enough road experience makes a village lad a caravan guard');
check(rules.badMy >= 30 && rules.badEn < 10, `a wrong order costs your men's nerve and hardly touches theirs (you −${rules.badMy}, them −${rules.badEn})`);

// ---- meeting a band on the map ----
const meet = async (band, edit) => {
  await inGame((m, c, a) => {
    const s = m.useGame.getState();
    const parties = s.world.parties.map((q) => (q.id === a.band ? { ...q, x: s.world.x + 3, y: s.world.y + 2, speed: 0, cooldownUntil: 0, ...a.edit.party } : q));
    m.useGame.setState({ world: { ...s.world, at: null, hour: 8, parties, party: { ...s.world.party, ...(a.edit.troops ? { troops: a.edit.troops } : {}) } }, ...(a.edit.combat ? { combat: { ...c.combatStart(), ...a.edit.combat } } : {}) });
  }, { band, edit });
  await p.waitForTimeout(300);
  const mk = p.locator(`[data-party=${band}]`);
  for (let i = 0; i < 3 && !(await has('[data-testid=road-encounter]')); i++) { await mk.dispatchEvent('pointerup').catch(() => {}); await p.waitForTimeout(250); }
  await p.waitForSelector('[data-testid=road-encounter]', { timeout: 5000 });
};
const toFight = async () => { await p.click('[data-testid=amb-fight]'); await p.waitForSelector('[data-testid=clash-prep]'); };
const begin = async () => { await p.click('[data-testid=clash-begin]'); await p.waitForSelector('[data-testid=clash-orders]'); };
const morale = async () => ({ me: +(await p.textContent('[data-testid=morale-me]')), them: +(await p.textContent('[data-testid=morale-them]')) });
const battle = (fn, arg) => p.evaluate(fn, arg);
/** let the fight run (fast) until it ends or the duel is on offer */
const play = async (orders = ['charge'], duel = false) => {
  await p.evaluate(() => { window.__tofBattleSpeed = 6; });
  for (const o of orders) { if (!(await has('[data-testid=grp-all]'))) break; await p.click('[data-testid=grp-all]'); await p.click(`[data-testid=ord-${o}]`).catch(() => {}); }
  for (let i = 0; i < 400; i++) {
    if (await has('[data-testid=clash-over]')) return 'over';
    if (duel && await has('[data-testid=order-duel]')) return 'duel';
    await p.waitForTimeout(100);
  }
  return 'stuck';
};
/** strike in the duel at the moment his guard is open (or shut): a tap timed in the page itself */
const strike = async (open) => {
  for (let i = 0; i < 3 && await has('[data-testid=duel]'); i++) {
    const r = await p.evaluate((want) => new Promise((res) => {
      const t0 = performance.now();
      const tick = () => {
        const box = document.querySelector('[data-testid=duel]'); if (!box) return res('gone');
        const btn = box.querySelector('[data-testid=duel-strike]');
        if (box.dataset.open === want && !btn.disabled) { btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return res('struck'); }
        if (performance.now() - t0 > 9000) return res(`stuck ${box.dataset.open} ${btn.disabled}`);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }), open ? '1' : '0');
    if (r !== 'struck') { console.log('duel', r); await p.screenshot({ path: `${SHOTS}/combat2-duel-stuck.png` }); break; }
    await p.waitForTimeout(1400);
  }
};
const finish = async () => { await p.click('[data-testid=clash-continue]'); await p.waitForSelector('[data-testid=encounter-result]'); return p.textContent('[data-testid=encounter-result]'); };
const leave = async () => { await p.click('[data-testid=encounter-continue]'); await p.waitForTimeout(400); };
const state = () => inGame((m) => { const s = m.useGame.getState(); return { cash: s.cash, troops: s.world.party.troops, combat: s.combat, day: s.day, parties: s.world.parties.map((q) => ({ id: q.id, cooldownUntil: q.cooldownUntil })), inv: s.inventory.length }; });

// 1. tells and orders: the right answer breaks them; a win brings promotion and a named sergeant
await meet('rb0', { party: { size: 5, strength: 18 }, troops: { guard: 2, fellah: 2, veteran: 1 }, combat: { wins: 2, xp: { fellah: 3 } } });
check(await has('[data-testid=amb-leader]'), `the band has a named leader (${await p.textContent('[data-testid=amb-leader]').catch(() => '')})`);
await toFight();
check(await has('[data-testid=clash-band]') && /men/.test(await p.textContent('[data-testid=clash-band]')), 'before the fight: the band\'s size, arms and leader');
const grounds = await p.locator('[data-testid^=ground-]').count();
const o1 = await p.textContent('[data-testid=clash-odds]');
await p.click('[data-testid=form-square]'); await p.waitForTimeout(100);
const o2 = await p.textContent('[data-testid=clash-odds]');
check(grounds >= 2 && o1 !== o2, `ground to choose (${grounds} kinds) and the formation moves the odds (${o1.replace(/\D+/g, '')}% → ${o2.replace(/\D+/g, '')}%)`);
await p.click('[data-testid=form-line]');
await p.screenshot({ path: `${SHOTS}/combat2-prep.png` });
check(/win/i.test(await p.textContent('[data-testid=clash-stakes]')) && /lose/i.test(await p.textContent('[data-testid=clash-stakes]')), 'what rides on it is shown before the fight');
await begin();
check(await has('[data-testid=battlefield]') && await has('[data-testid=grp-rifles]') && await has('[data-testid=grp-foot]'), 'the field and the groups to order');
await p.click('[data-testid=grp-rifles]'); await p.click('[data-testid=fire-toggle]');
check(/Holding/.test(await p.textContent('[data-testid=fire-toggle]')), 'rifles hold their fire for a volley');
await p.evaluate(() => { window.__tofBattleSpeed = 3; });
await p.waitForFunction(() => { const b = document.querySelector('[data-testid=volley]'); return b && !b.disabled && b.classList.contains('ready'); }, null, { timeout: 30000 }).catch(() => {});
await p.screenshot({ path: `${SHOTS}/combat2-round1.png` });
const m0 = await morale();
await p.click('[data-testid=volley]').catch(() => {}); await p.waitForTimeout(150);
const feed = await p.textContent('[data-testid=clash-feed]');
check(/Volley/.test(feed), `the volley goes off together: ${feed.slice(-80)}`);
await p.click('[data-testid=grp-riders]').catch(() => {}); await p.click('[data-testid=ord-flank]').catch(() => {});
const r1 = await play(['charge']);
const banner = await p.textContent('[data-testid=clash-banner]').catch(() => '');
check(r1 === 'over' && /run|arms|pull back/.test(banner), `they break (${banner}; their nerve was ${m0.them})`);
await p.waitForTimeout(400); await p.screenshot({ path: `${SHOTS}/combat2-over.png` });
const txt1 = await finish();
let st = await state();
check(st.combat.wins === 3, 'the win is counted');
check((st.troops.guard ?? 0) >= 3 && /earned/.test(txt1), `a village lad earns his rifle: ${JSON.stringify(st.troops)}`);
check(!!st.combat.sergeant && /Sergeant/.test(txt1), `a veteran becomes the named sergeant (${st.combat.sergeant?.name})`);
await p.screenshot({ path: `${SHOTS}/combat2-result.png` });
await leave();

// 2. a wrong order hurts; the sergeant speaks before the fight; losing the duel costs your men's nerve
await meet('rb0', { party: { size: 6, strength: 16 }, troops: { guard: 3, fellah: 1, veteran: 2 }, combat: { ...st.combat } });
await toFight();
check(await has('[data-testid=clash-sergeant]'), `the sergeant has a word before the fight: ${(await p.textContent('[data-testid=clash-sergeant]').catch(() => '')).slice(0, 80)}`);
await begin();
await p.evaluate(() => { window.__tofBattle.morale[1] = 40; });
const r2 = await play(['hold'], true);
if (r2 === 'duel') {
  const pre = await morale();
  await p.click('[data-testid=order-duel]'); await p.waitForSelector('[data-testid=duel]');
  await p.waitForTimeout(1600); await p.screenshot({ path: `${SHOTS}/combat2-duel.png` });
  await strike(false);
  await p.waitForSelector('[data-testid=clash-orders], [data-testid=clash-over]');
  const post = await morale();
  check(post.me < pre.me && post.them > pre.them, `the duel lost: he beats you back and his men take heart (you ${pre.me}→${post.me}, them ${pre.them}→${post.them})`);
  await play(['charge']);
} else check(false, `the duel was offered (${r2})`);
await finish(); await leave();

// 3. the duel won: the whole band yields; spoils, prisoners and their leader
await meet('rb0', { party: { size: 6, strength: 22 }, troops: { guard: 2, veteran: 1 }, combat: { ...(await state()).combat, prisoners: [] } });
const lead = await p.textContent('[data-testid=amb-leader]').catch(() => '');
await toFight(); await begin();
await p.evaluate(() => { window.__tofBattle.morale[1] = 40; });
let r3 = await play(['hold'], true);
if (r3 === 'duel') {
  await p.click('[data-testid=order-duel]'); await p.waitForSelector('[data-testid=duel]');
  await strike(true);
  await play(['charge']);
  await p.screenshot({ path: `${SHOTS}/combat2-yield.png` });
  check(/lay down/.test(await p.textContent('[data-testid=clash-banner]')), 'the duel won: they lay down their arms');
} else check(false, `the duel was offered again (${r3})`);
const cash0 = (await state()).cash;
const txt3 = await finish();
st = await state();
check(await has('[data-testid=spoils-leader]') && st.combat.prisoners.some((q) => q.leader), `their leader is your prisoner (${lead})`);
check(st.cash > cash0 || await has('[data-testid=clash-spoils]'), `spoils: ${(await p.textContent('[data-testid=clash-spoils]').catch(() => '')).replace(/\s+/g, ' ')}`);
if (await has('[data-testid=amb-recruit]')) {
  const ref0 = st.troops.reformed ?? 0;
  await p.click('[data-testid=amb-recruit]'); st = await state();
  check((st.troops.reformed ?? 0) > ref0, 'a willing prisoner joins your men');
}
void txt3;
await leave();

// 4. the police post: the bounty paid, the leader jailed, his road quiet; the wanted list shows it
const pre4 = await state();
await inGame((m) => { const s = m.useGame.getState(); m.useGame.setState({ world: { ...s.world, x: 214.3, y: 413.7, at: 'cairo' } }); });
await p.locator('[data-testid=place-cairo]').dispatchEvent('click').catch(() => {}); await p.waitForTimeout(600);
if (await has('[data-testid=menu-more]')) await p.click('[data-testid=menu-more]');
await p.waitForSelector('[data-testid=menu-wanted]', { timeout: 5000 }).catch(() => {});
check(await has('[data-testid=menu-wanted]'), 'the police post is in the town menu, under More');
if (await has('[data-testid=menu-wanted]')) {
  await p.click('[data-testid=menu-wanted]'); await p.waitForSelector('[data-testid=wanted-card]');
  const posters = await p.locator('[data-testid=wanted-list] li').count();
  check(posters >= 4, `wanted posters for the band leaders (${posters})`);
  await p.waitForTimeout(600); await p.screenshot({ path: `${SHOTS}/combat2-wanted.png` });
  await p.click('[data-testid=hand-bounty]'); await p.waitForTimeout(300);
  const note = await p.textContent('[data-testid=wanted-note]');
  st = await state();
  const L = st.combat.leaders.rb0;
  check(st.cash > pre4.cash && L.status === 'jailed', `bounty paid (+${st.cash - pre4.cash}) and the leader jailed: ${note.slice(0, 90)}`);
  check(st.parties.find((q) => q.id === 'rb0').cooldownUntil >= st.day + 20, 'his band keeps off its road for weeks');
  check(/cells/.test(await p.textContent('[data-testid=wanted-rb0]')), 'his poster says he is in the cells');
  await p.screenshot({ path: `${SHOTS}/combat2-bounty.png` });
  await p.click('[data-testid=wanted-close]');
}
await p.keyboard.press('Escape').catch(() => {}); await p.waitForTimeout(200);
if (await has('[data-testid=menu-leave]')) await p.click('[data-testid=menu-leave]').catch(() => {});
if (await has('[data-testid=leave-city]')) await p.click('[data-testid=leave-city]').catch(() => {});
await p.waitForTimeout(400);

// 5. beaten: it costs men, a bale or a day, never the game, and the band that did it is a named enemy
await meet('rb2', { party: { size: 8, strength: 30 }, troops: { fellah: 1 } });
await toFight(); await begin();
await play(['charge']);
const txt5 = await finish();
st = await state();
check(/give ground|line breaks/.test(txt5) && !(await has('[data-testid=death], [data-testid=game-over]')), `a beating: ${txt5.slice(0, 110)}`);
check(!!st.combat.leaders.rb2?.robbed && /score/.test(txt5), 'the band that beat you is a named enemy to pay back');
await leave();

// 6. "Let the sergeant handle it": no orders, a result straight away
await meet('rb1', { party: { size: 4, strength: 8 }, troops: { guard: 3, veteran: 1 } });
await toFight();
await p.click('[data-testid=clash-auto]'); await p.waitForSelector('[data-testid=encounter-result]');
const txt6 = await p.textContent('[data-testid=encounter-result]');
check(/takes charge/.test(txt6), `the sergeant handles it: ${txt6.slice(0, 100)}`);
await leave();

// 6b. a name on the road: after enough wins, a band no stronger than you lets you pass with a word
await inGame((m, c) => { const s = m.useGame.getState(); const mine = 2 + Object.entries(s.world.party.troops).reduce((a, [id, n]) => a + ({ guard: 4, veteran: 6, fellah: 1, reformed: 3 }[id] ?? 2) * n, 0);
  m.useGame.setState({ combat: { ...(s.combat ?? c.combatStart()), wins: 6 }, world: { ...s.world, at: 'cairo', x: 214.3, y: 413.7, hour: 7, party: { ...s.world.party, food: 80 }, parties: s.world.parties.map((q) => (q.id === 'rb1' ? { ...q, x: 222, y: 417, speed: 0, cooldownUntil: 0, size: 5, strength: mine } : q.kind === 'raiders' ? { ...q, cooldownUntil: s.day + 30 } : q)) } }); });
await p.evaluate(() => window.dispatchEvent(new CustomEvent('tof:plan-trip', { detail: 'suez' }))); await p.waitForTimeout(500);
await p.locator('[data-testid=travel]').dispatchEvent('click').catch(() => {});
await p.locator('[data-testid=speed-4]').dispatchEvent('click').catch(() => {});
let passed = '';
for (let i = 0; i < 240 && !passed; i++) { const t = await p.evaluate(() => [...document.querySelectorAll('[data-testid=road-flash], [data-testid=world-report]')].map((e) => e.textContent).join(' ')); if (/know your name/.test(t)) passed = t; if (await has('[data-testid=road-encounter]')) break; await p.waitForTimeout(120); }
if (!passed) { await p.screenshot({ path: `${SHOTS}/combat2-name-dbg.png` }); console.log('dbg', await inGame((m) => { const s = m.useGame.getState(); const r = s.world.parties.find((q) => q.id === 'rb1'); return { x: s.world.x, y: s.world.y, at: s.world.at, r: [r.x, r.y, r.cooldownUntil, r.strength], day: s.day, wins: s.combat.wins }; })); }
check(!!passed && !(await has('[data-testid=road-encounter]')), `a name on the road: ${passed || 'no notice'}`);
await p.locator('[data-testid=stop]').dispatchEvent('click').catch(() => {});

// 7. an old save (version 23, before road fights had rounds) loads with a clean record
await p.evaluate(() => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); d.version = 23; delete d.state.combat; window.__tofEdit = true; localStorage.setItem(k, JSON.stringify(d)); window.__tofEdit = false; const w = Storage.prototype.setItem; const h = function (key, v) { if (key === k && !window.__tofEdit) return; return w.call(this, key, v); }; Storage.prototype.setItem = h; });
await p.reload(); if (await has('[data-testid=continue]')) await p.click('[data-testid=continue]'); await p.waitForTimeout(800);
const mig = await inGame((m) => { const s = m.useGame.getState(); return { combat: s.combat, version: m.SAVE_VERSION }; });
check(mig.version >= 24 && mig.combat && mig.combat.wins === 0 && Array.isArray(mig.combat.prisoners), 'an old save migrates: a clean fighting record, nothing lost');

console.log(out.join('\n')); console.log(ok && !errs.length ? 'PASS' : 'FAIL', errs);
await b.close();
process.exit(ok && !errs.length ? 0 : 1);
