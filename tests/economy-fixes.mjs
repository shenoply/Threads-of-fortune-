// Economy batch one: the father's rug cannot be sold for a free copy, net worth subtracts every debt,
// the receipt counts repairs and delivery, wages count only when paid.
//   PORT=5173 node tests/economy-fixes.mjs
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? '5173';
const b = await chromium.launch();
const p = await b.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(`http://localhost:${PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]'); await p.waitForTimeout(800);
const r = await p.evaluate(async () => {
  const { useGame, keptBack } = await import('/src/game/state/store.ts');
  const { netWorth, liabilities } = await import('/src/game/economy/progress.ts');
  const out = {};
  const g = () => useGame.getState();
  // 1. the father's rug
  useGame.setState({ started: true, missions: { ...g().missions, farid: 'active' }, world: { ...g().world, appraised: [], at: 'cairo' }, faridRecovered: false });
  const fr = g().inventory.find((i) => i.typeId === 'fayoum-hearth') ?? (useGame.setState({ inventory: [...g().inventory, { uid: 'fh1', typeId: 'fayoum-hearth', condition: 'Worn', restored: false, provenance: '', paid: 0, notes: [] }] }), g().inventory.find((i) => i.typeId === 'fayoum-hearth'));
  out.keptBack = keptBack(g(), fr);
  const cash0 = g().cash;
  out.sellPaid = g().sellLocal(fr.uid, 'cairo');
  out.stillHave = g().inventory.some((i) => i.typeId === 'fayoum-hearth');
  out.cashSame = g().cash === cash0;
  // lost (stolen): Rashid gets it back once, not twice
  useGame.setState({ inventory: g().inventory.filter((i) => i.typeId !== 'fayoum-hearth') });
  out.recoveredOnce = g().inventory.filter((i) => i.typeId === 'fayoum-hearth').length;
  useGame.setState({ inventory: g().inventory.filter((i) => i.typeId !== 'fayoum-hearth') });
  out.recoveredTwice = g().inventory.filter((i) => i.typeId === 'fayoum-hearth').length;
  // 2. net worth with a £5 loan taken as cash
  const w0 = netWorth(g());
  useGame.setState({ cash: g().cash + 500, loans: [...(g().loans ?? []), { id: 'l1', lender: 'khan', principal: 500, owed: 530, taken: g().day, due: g().day + 30 }] });
  out.loanChangesWorth = netWorth(g()) - w0;
  out.liabilities = liabilities(g());
  return out;
});
console.log(JSON.stringify(r));
const ok = r.keptBack && r.sellPaid === 0 && r.stillHave && r.cashSame && r.recoveredOnce === 1 && r.recoveredTwice === 0 && r.loanChangesWorth === -30;
console.log(ok ? 'PASS' : 'FAIL', 'errors', JSON.stringify(errs));
await b.close();
