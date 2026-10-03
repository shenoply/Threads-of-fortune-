// Robbed with nothing to pay: one of the ten outcomes, each possible, none crashing.
//   PORT=5173 node tests/rob-broke.mjs
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? '5173';
const b = await chromium.launch();
const p = await b.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(`http://localhost:${PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]'); await p.waitForTimeout(600);
const r = await p.evaluate(async () => {
  const { useGame } = await import('/src/game/state/store.ts');
  const base = JSON.parse(JSON.stringify(useGame.getState()));
  const seen = {};
  const keys = { animal: /lead it away/, clothes: /off your back/, beating: /beating/, ransom: /ransom|goat-hair tent/, work: /to work/, iou: /ledger/, papers: /papers/, spoiled: /waterskins/, chief: /knotted cord/, word: /dignity/, rug: /off your animal instead/ };
  for (let i = 0; i < 400; i++) {
    useGame.setState({ ...base, reputation: 10, papers: [{ id: 'p1', bookId: 'x', kind: 'copy', title: 'the copied manuscript', from: 'cairo', day: 1 }], world: { ...base.world, party: { ...base.world.party, food: 5, animals: { camel: 1 } } }, inventory: base.inventory.map((x) => ({ ...x, stored: false })) });
    const t = useGame.getState().robBroke();
    const k = Object.entries(keys).find(([, re]) => re.test(t))?.[0] ?? 'other:' + t.slice(0, 40);
    seen[k] = (seen[k] ?? 0) + 1;
  }
  return seen;
});
console.log(JSON.stringify(r));
const ok = ['animal', 'clothes', 'beating', 'ransom', 'work', 'iou', 'papers', 'spoiled', 'chief', 'word', 'rug'].every((k) => r[k] > 0) && !Object.keys(r).some((k) => k.startsWith('other'));
console.log(ok ? 'PASS' : 'FAIL', 'errors', JSON.stringify(errs.slice(0, 3)));
await b.close();
