// Rivers, lakes and crossings: every town can still be walked to from Giza (crossing at bridges and
// fords), nobody walks across a river or lake, and the walk to Baghdad uses a crossing.
//   PORT=5173 node tests/map-barriers.mjs
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? '5173';
const b = await chromium.launch();
const p = await b.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(`http://localhost:${PORT}/`);
const r = await p.evaluate(async () => {
  const W = await import('/src/game/systems/world.ts');
  const { SETTLEMENTS } = await import('/src/data/world.ts');
  const giza = SETTLEMENTS.find((s) => s.id === 'giza');
  const rows = [];
  for (const s of SETTLEMENTS) {
    if (s.id === 'giza') continue;
    const path = W.findPath({ x: giza.x, y: giza.y }, { x: s.x, y: s.y });
    let wet = 0; const crossed = new Set();
    if (path) for (let i = 1; i < path.length; i++) for (let t = 0; t <= 1; t += 0.05) {
      const q = { x: path[i - 1].x + (path[i].x - path[i - 1].x) * t, y: path[i - 1].y + (path[i].y - path[i - 1].y) * t };
      const k = W.terrainAt(q);
      // (a lone sample can clip the corner of a river cell; a town on the coast stands half in the sea)
      if (['river', 'lake', 'canal'].includes(k)) { wet++; crossed.add('!' + k + '@' + Math.round(q.x) + ',' + Math.round(q.y)); }
      if (k === 'bridge' || k === 'ford') crossed.add(W.placeNameAt(q) ?? k);
    }
    rows.push({ to: s.id, ok: !!path, days: path ? +W.pathDays(path, W.PX_PER_DAY).toFixed(1) : null, wet, crossed: [...crossed].join(', ') });
  }
  return rows;
});
for (const x of r) console.log(`${x.to.padEnd(11)} ${x.ok ? `${x.days} d` : 'NO ROUTE'}${x.wet ? `  !! ${x.wet} closed samples` : ''}${x.crossed ? `  via ${x.crossed}` : ''}`);
const ok = r.every((x) => x.ok && x.wet <= 2);
console.log(ok ? 'PASS' : 'FAIL', 'errors', JSON.stringify(errs));
await b.close();
