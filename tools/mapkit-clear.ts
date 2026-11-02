// What the map decorations must keep clear of, written out for tools/build-mapkit.py (which calls this):
// the ground grid (sea, rivers, lakes, the canal), every town and well, the roads, railways, motor and sea
// routes as the map draws them, the names written on the painting, and the cartouche and scale ornament (drawn when zoomed right out).
//   npx tsx tools/mapkit-clear.ts <out.json>
import { writeFileSync } from 'node:fs';
import { SETTLEMENTS, ROAD_WELLS, RAIL_LINKS, MOTOR_ROUTES, SEA_ROUTES } from '../src/data/world';
import { ROAD_LINES } from '../src/data/terrain';
import { MAP_LABELS, CARTOUCHE, SCALE_BAR, LANDMARKS } from '../src/data/mapArt';
import { MASK_W, MASK_H, CELL } from '../src/data/landmask';
import { terrainAt, settlementById, routeLeg, MAP_W, MAP_H } from '../src/game/systems/world';
import { geo } from '../src/data/projection';

const out = process.argv[2] ?? 'mapkit-clear.json';
const code: Record<string, string> = { road: 'r', fertile: 'f', desert: 'd', hills: 'h', mountains: 'm', water: 'w', river: 'R', lake: 'L', canal: 'C', bridge: 'B', ford: 'F' };
const rows: string[] = [];
for (let cy = 0; cy < MASK_H; cy++) {
  let r = '';
  for (let cx = 0; cx < MASK_W; cx++) r += code[terrainAt({ x: cx * CELL + CELL / 2, y: cy * CELL + CELL / 2 })] ?? 'd';
  rows.push(r);
}
const P = (p: { x: number; y: number }) => [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10];
const leg = (a: string, b: string, mode: 'rail' | 'motor' | 'ship') => routeLeg(settlementById(a), settlementById(b), mode).map(P);
// the lesser names on the painting (mapRender.ts PAINT_MINOR), by longitude and latitude
const MINOR = [['Syrian Desert', 39.3, 32.6, 1.1, 0], ['Zagros', 49.0, 32.6, 0.95, 40], ['Dasht-i Kavir', 54.5, 34.6, 0.9, 0]] as const;
const data = {
  map: [MAP_W, MAP_H], cell: CELL, grid: rows,
  places: [
    ...SETTLEMENTS.filter((s) => !s.gateway).map((s) => ({ id: s.id, kind: s.kind, name: s.name.split(',')[0], x: s.x, y: s.y })),
    ...ROAD_WELLS.map((w) => ({ id: w.id, kind: 'well', name: '', x: w.x, y: w.y })),
  ],
  landmarks: LANDMARKS.map((l) => P(l as { x: number; y: number })),
  roads: ROAD_LINES.map((r) => r.pts),
  rails: RAIL_LINKS.map((l) => leg(l.a, l.b, 'rail')),
  motor: MOTOR_ROUTES.map((l) => leg(l.a, l.b, 'motor')),
  sea: SEA_ROUTES.map((l) => leg(l.a, l.b, 'ship')),
  labels: [
    ...MAP_LABELS.map((l) => ({ text: l.text, kind: l.kind, x: l.x, y: l.y, size: l.size ?? 1, rot: l.rot ?? 0 })),
    ...MINOR.map(([text, lon, lat, size, rot]) => ({ text, kind: 'minor', ...geo(lon, lat), size, rot })),
  ],
  ornaments: [
    { what: 'cartouche', x: CARTOUCHE.x, y: CARTOUCHE.y, r: 160 },
    { what: 'scale', x: SCALE_BAR.x, y: SCALE_BAR.y, r: 130 },
  ],
};
writeFileSync(out, JSON.stringify(data));
console.log(`wrote ${out}`);
