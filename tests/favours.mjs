// Favours: a person who likes you asks something of you; keeping your word pays and lapsing costs.
//   node --import ./tests/_nohmr.mjs tests/favours.mjs
import { chromium } from 'playwright';
import { BASE, SHOTS } from './_env.mjs';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
let ok = true; const check = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) ok = false; };
const has = (sel) => p.locator(sel).count();
const storeUrl = () => p.evaluate(() => performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/game/state/store.ts')) ?? '/src/game/state/store.ts');
const st = async (fn, arg) => p.evaluate(async ([u, f, a]) => { const m = await import(u); return new Function('m', 'a', `return (${f})(m, a)`)(m, a); }, [await storeUrl(), fn.toString(), arg]);
await p.goto(BASE);
await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'), localStorage.setItem('tof-skip-chapters', '1')));
await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]'); await p.waitForTimeout(1500);
await st((m) => { const s = m.useGame.getState(); m.useGame.setState({ tutorial: { done: true, step: 'done', inspected: true }, cash: 20000, levelUps: [], titleNews: [], missionNews: undefined }); });
const r = await st(async (m) => {
  const pop = await import('/src/game/systems/population.ts');
  const out = {};
  const g = () => m.useGame.getState();
  const like = (id, v) => { const f = g().folk ?? { rel: {}, met: {}, talked: {}, heard: [], log: [] }; m.useGame.setState({ folk: { ...f, rel: { ...f.rel, [id]: v }, met: { ...f.met, [id]: 0 } } }); };
  const souq = pop.souqMaster('cairo');
  like(souq.id, 0); out.cold = g().favourOffer(souq.id);
  // find someone whose offer is each kind, across days
  const kinds = {};
  for (const p of Object.values(pop.world().people).filter((x) => x.role !== 'kin').slice(0, 300)) {
    like(p.id, 40);
    for (let d = 0; d < 60 && Object.keys(kinds).length < 4; d += 12) { m.useGame.setState({ day: d }); const o = g().favourOffer(p.id); if (o && !kinds[o.kind]) kinds[o.kind] = o; }
  }
  out.kinds = Object.keys(kinds);
  // a letter, start to end
  const L = kinds.letter; m.useGame.setState({ day: L.day });
  const cash0 = g().cash, rel0 = g().folk.rel[L.giver];
  out.accept = g().favourAccept(L);
  out.wrong = g().favourSettle(L.id, L.giver);
  out.done = g().favourSettle(L.id, L.to);
  out.paid = g().cash - cash0; out.relUp = g().folk.rel[L.giver] - rel0; out.left = g().favours.active.length; out.kept = g().favours.done;
  // a loan: lent now, back with interest when due
  const N = kinds.loan; if (N) { m.useGame.setState({ day: N.day }); const c0 = g().cash; g().favourAccept(N); out.lent = c0 - g().cash; out.early = g().favourSettle(N.id, N.giver); m.useGame.setState({ day: N.due }); let t = g().favourSettle(N.id, N.giver); if (/Next week/.test(t)) { m.useGame.setState({ day: N.due + 11 }); t = g().favourSettle(N.id, N.giver); } out.back = g().cash - c0; }
  // a rug favour lets lapse: dropped, and they think less of you
  const R = kinds.rug; if (R) { m.useGame.setState({ day: R.day }); g().favourAccept(R); const r0 = g().folk.rel[R.giver]; m.useGame.setState({ day: R.due + 1 }); await new Promise((res) => setTimeout(res, 50)); out.lapsed = !g().favours.active.some((f) => f.id === R.id); out.relDown = g().folk.rel[R.giver] - r0; }
  return out;
});
check(r.cold === null, 'nobody asks a favour of a stranger');
check(r.kinds.includes('letter') && r.kinds.includes('rug') && r.kinds.includes('loan'), `people ask for letters, rugs and loans (${r.kinds.join(', ')})`);
check(/letter/.test(r.accept) && /someone else/.test(r.wrong) && r.paid > 0 && r.relUp >= 12 && r.kept >= 1, `a letter carried pays and wins regard: ${r.done.slice(0, 90)} (+${r.paid}, regard +${r.relUp})`);
check(r.lent > 0 && /Not due/.test(r.early) && r.back > 0, `a loan comes back with interest when due (lent ${r.lent}, net +${r.back})`);
check(r.lapsed && r.relDown <= -10, `a favour let lapse is dropped and costs regard (${r.relDown})`);
// the card shows the ask
await st((m) => { m.useGame.setState({ day: 200 }); });
const sid = await st(async () => (await import('/src/game/systems/population.ts')).souqMaster('cairo').id);
await st((m, id) => { const f = m.useGame.getState().folk; m.useGame.setState({ folk: { ...f, rel: { ...f.rel, [id]: 40 }, met: { ...f.met, [id]: 0 } }, favours: { active: [], done: 0, failed: 0, last: {} } }); }, sid);
console.log('errors', errs.length);
check(!errs.length, 'no page errors');
console.log(ok ? 'ALL OK' : 'SOME FAILED'); await b.close(); process.exit(ok ? 0 : 1);
