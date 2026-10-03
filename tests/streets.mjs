// Walking in towns keeps to the streets: routes go along the lanes and over bridges, never straight
// through buildings or across water.
//   PORT=5173 node tests/streets.mjs
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? '5173';
const b = await chromium.launch();
const p = await b.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(`http://localhost:${PORT}/`);
const r = await p.evaluate(async () => {
  const { streetRoute } = await import('/src/game/systems/streets.ts');
  const show = (w) => w.map((q) => `${Math.round(q.x)},${Math.round(q.y)}`).join(' > ');
  return {
    gizaStallToAnimals: show(streetRoute('giza', { x: 760, y: 468 }, { x: 565, y: 745 })),
    gizaStallToFerry: show(streetRoute('giza', { x: 760, y: 468 }, { x: 1385, y: 680 })),
    gizaDesert: show(streetRoute('giza', { x: 225, y: 385 }, { x: 90, y: 870 })),
    cairoStationToGezira: show(streetRoute('city-cairo', { x: 750, y: 170 }, { x: 698, y: 690 })),
    cairoTapRiver: show(streetRoute('city-cairo', { x: 750, y: 170 }, { x: 420, y: 300 })),
    baghdadGateToPalace: show(streetRoute('city-baghdad', { x: 240, y: 747 }, { x: 1158, y: 373 })),
    damascusGateToFarid: show(streetRoute('city-damascus', { x: 827, y: 933 }, { x: 890, y: 624 })),
  };
});
for (const [k, v] of Object.entries(r)) console.log(k.padEnd(22), v);
const ok = r.gizaStallToAnimals.split('>').length > 3 && r.baghdadGateToPalace.includes('987,587');
console.log(ok && r.cairoStationToGezira.includes('690,510') ? 'PASS' : 'FAIL', 'errors', JSON.stringify(errs));
await b.close();
