// Balance batch: the father's rug kept back, Farid's rug replaced before the mission can close, the
// Alexandria errand card, the ferry per head, carrying capacity, customers who give up while you are
// away, the dealers' glut, the night's wages on the morning card, the father's debt as an overdue sum.
//   PORT=5173 node tests/balance-fixes.mjs
import { chromium } from 'playwright';
import { PORT as __PORT } from './_env.mjs';
const PORT = __PORT;
const b = await chromium.launch();
const p = await b.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(`http://localhost:${PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]'); await p.waitForTimeout(800);
const r = await p.evaluate(async () => {
  const S = await import('/src/game/state/store.ts');
  const { useGame, keptBack, availableRugs, localBid, ferryFare } = S;
  const { overdue } = await import('/src/game/systems/finance.ts');
  const { MISSIONS } = await import('/src/data/missions.ts');
  const g = () => useGame.getState();
  const set = (x) => useGame.setState(x);
  const out = {};
  const base = { started: true, tutorial: { done: true, step: 'done', inspected: true }, levelUps: [], titleNews: [] };
  set(base);
  // 10. before Farid's mission: the father's rug is kept back and never laid out
  set({ missions: { alexandria: 'done' }, world: { ...g().world, appraised: [] } });
  const fh = g().inventory.find((i) => i.typeId === 'fayoum-hearth');
  out.keptBefore = keptBack(g(), fh);
  out.notOffered = !availableRugs(g()).some((i) => i.uid === fh.uid);
  // 11. lost in Damascus: Rashid replaces it and the mission stays open
  set({ missions: { ...g().missions, beasts: 'done', farid: 'active' }, faridRecovered: false, world: { ...g().world, at: 'damascus', appraised: [] } });
  set({ inventory: g().inventory.filter((i) => i.typeId !== 'fayoum-hearth') });
  out.faridStillActive = g().missions.farid === 'active';
  out.rugBack = g().inventory.some((i) => i.typeId === 'fayoum-hearth');
  // 12. the errand bought in Alexandria shows its card; a stale "new mission" banner is put away
  set({ missions: { alexandria: 'active' }, missionNews: undefined, onboard: {}, cash: 5000, inventory: g().inventory.map((i) => ({ ...i, stored: true })), world: { ...g().world, at: 'alexandria', party: { ...g().world.party, animals: {}, troops: {} } } });
  const offer = S.localOffers('alexandria', g().day, [], [], 0)[0];
  out.buyMsg = g().buyLocal('alexandria', offer.key);
  out.news = g().missionNews;
  set({ missionNews: 'alexandria' });
  out.staleCleared = g().missionNews === undefined;
  // 7. capacity: on foot you carry two rugs
  set({ inventory: g().inventory.map((i, k) => ({ ...i, stored: k > 1 })) });
  const o2 = S.localOffers('alexandria', g().day, g().world.boughtLocal, [], 0)[0];
  const n0 = g().inventory.length;
  out.capMsg = g().buyLocal('alexandria', o2.key);
  out.capHeld = g().inventory.length === n0;
  // 1. the dealers' glut: a second rug sold in one town fetches a tenth less
  const rug = { uid: 'x1', typeId: 'cairo-garden', condition: 'Good', restored: false, provenance: 'Likely', paid: 100, notes: [], stored: false };
  const bid0 = localBid('jerusalem', rug, g().day);
  set({ inventory: [...g().inventory, { ...rug, uid: 'x2' }] });
  g().sellLocal('x2', 'jerusalem');
  out.glut = [bid0, localBid('jerusalem', rug, g().day)];
  // 15. the ferry: a piastre a head
  set({ world: { ...g().world, at: 'giza', party: { ...g().world.party, troops: { watchman: 2 } } } });
  const c0 = g().cash; g().ferry('cairo', true);
  out.ferry = { paid: c0 - g().cash, label: g().ledger[g().ledger.length - 1].label, fare: ferryFare(g()).total };
  // 5. away from the stall: customers wait two hours, then go
  set({ world: { ...g().world, at: 'cairo', hour: 14 }, queue: ['samira', 'samira', 'samira'], arrivals: [8.5, 10, 15.5], visitIdx: 0, encounter: null, held: null, dayOver: false });
  g().arriveAt('giza');
  out.gaveUp = { visitIdx: g().visitIdx, note: g().journal[g().journal.length - 1].text };
  // 14. the morning card counts the night's wages
  set({ world: { ...g().world, at: 'giza', hour: 20 }, cash: 5000 });
  g().endDay();
  out.summary = { wages: g().lastSummary?.wages };
  // 8. an instalment Rashid has waited on is overdue
  out.overdue = overdue(100, 0, false, [], 30, 2500);
  // 9. the warrant asks for an Exceptional rug, as the courts do
  const ms = { day: 1, world: { at: 'giza', appraised: [] }, inventory: [{ uid: 'a', typeId: 'cairo-garden', stored: false, condition: 'Good' }], court: { warrants: [] }, upgrades: [], reputation: 20, wardrobe: { owned: ['cairo-effendi'], worn: 'cairo-effendi' }, attire: { clean: 100 } };
  out.warrantHint = MISSIONS.warrant.hint(ms);
  out.watchmen = MISSIONS.ambush.steps[0];
  out.beastsNext = MISSIONS.beasts.next({ ...ms, inventory: [], world: { at: 'giza', appraised: [], party: { animals: { baladi_d: 2 }, troops: {}, food: 6 } } });
  return out;
});
console.log(JSON.stringify(r, null, 1));
const ok = r.keptBefore && r.notOffered && r.faridStillActive && r.rugBack && /Mission complete/.test(r.buyMsg) && r.news === 'alexandria-done' && r.staleCleared
  && /cannot carry/.test(r.capMsg) && r.capHeld && r.glut[1] < r.glut[0] && r.ferry.paid === 3 && /3 people/.test(r.ferry.label)
  && r.gaveUp.visitIdx === 2 && /went elsewhere/.test(r.gaveUp.note) && r.summary.wages === 20 && r.overdue === 2500
  && /Exceptional/.test(r.warrantHint) && /four Giza watchmen/.test(r.watchmen) && r.beastsNext?.go === 'stock';
console.log(ok ? 'PASS' : 'FAIL', 'errors', JSON.stringify(errs));
await b.close();
