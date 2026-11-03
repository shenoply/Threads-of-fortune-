// The travel map's decorations, checked without a browser: the zones are what the generator makes (and the same
// every run), nothing stands on water but the sea marks, nothing on a river, every town, well, road, railway and
// motor route is kept clear, Ararat and Damavand stand at their places; and tools/cut-sheets.py, run on synthetic
// sheets, finds every item and shares them out into the right groups.
//   npx tsx tests/mapkit.ts
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import KIT from '../src/data/mapKitSheets.json';
import { KIT_ITEMS, KIT_COUNT } from '../src/data/mapKitZones';
import { decodeZones, itemsIn, KIT_KINDS, KIT_SHEETS, kitPresent, lodFor, boostFor, liveAt } from '../src/game/systems/mapKitDraw';
import { isWaterPx, terrainAt, settlementById, routeLeg, dist, MAP_W, MAP_H, type Pt } from '../src/game/systems/world';
import { SETTLEMENTS, ROAD_WELLS, RAIL_LINKS, MOTOR_ROUTES } from '../src/data/world';
import { ROAD_LINES } from '../src/data/terrain';
import { geo } from '../src/data/projection';

let fails = 0;
const ok = (c: boolean, what: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${what}`); if (!c) fails++; };
const root = fileURLToPath(new URL('..', import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), 'mapkit-'));

// ---- the zones
const z = decodeZones(KIT_ITEMS);
ok(z.n === KIT_COUNT && z.n > 3000, `${z.n} decorations decoded`);
const count: Record<string, number> = {};
for (let i = 0; i < z.n; i++) count[KIT_KINDS[z.kind[i]].kind] = (count[KIT_KINDS[z.kind[i]].kind] ?? 0) + 1;
console.log('     ' + KIT_KINDS.map((k) => `${k.kind} ${count[k.kind] ?? 0}`).join(', '));
// dunes, outcrops, scrub and ochre hills are no longer placed: on flat sand they read as stickers (2026-11-03)
const NONE = ['hill-ochre', 'dune', 'outcrop', 'scrub'];
ok(KIT_KINDS.every((k) => NONE.includes(k.kind) ? !count[k.kind] : (count[k.kind] ?? 0) > 0), 'every kind but the desert marks is placed somewhere, and no desert marks');
let sorted = true;
for (let i = 1; i < z.n; i++) if (z.y[i] < z.y[i - 1]) { sorted = false; break; }
ok(sorted, 'stored back to front (by the base, top of the map first)');
ok([0, 1, 2].every((l) => z.lod.some((v) => v === l)), 'all three levels of detail are used');
ok(z.x.every((x, i) => x > 0 && x < MAP_W && z.y[i] > 0 && z.y[i] < MAP_H), 'every item is on the map');

// the same every run: the generator, run again, writes the same file
const again = join(tmp, 'zones.ts');
execFileSync('python3', ['tools/build-mapkit.py', '--out', again], { cwd: root, stdio: 'pipe' });
ok(readFileSync(again, 'utf8') === readFileSync(join(root, 'src/data/mapKitZones.ts'), 'utf8'), 'the zones are deterministic (tools/build-mapkit.py writes the same file again)');

// nothing on water but the sea marks; nothing on a river, lake or the canal
const wet = new Set(['water', 'river', 'lake', 'canal', 'bridge', 'ford']);
const onWater = (p: Pt) => isWaterPx(p) || wet.has(terrainAt(p));
const badLand: string[] = [], badSea: string[] = [];
for (let i = 0; i < z.n; i++) {
  const k = KIT_KINDS[z.kind[i]], x = z.x[i], y = z.y[i];
  const h = k.h * z.size[i], w = h * k.aspect;
  if (k.sea) { if (!isWaterPx({ x, y }) || terrainAt({ x, y }) !== 'water') badSea.push(`${k.kind} ${x},${y}`); continue; }
  for (const p of [{ x, y }, { x: x - w / 2, y }, { x: x + w / 2, y }, { x, y: y - h * 0.5 }, { x, y: y - h * 0.9 }]) if (onWater(p)) { badLand.push(`${k.kind} ${x},${y}`); break; }
}
ok(!badLand.length, `no land decoration stands on the sea, a river, a lake or the canal (${badLand.slice(0, 4).join('; ') || 'none'})`);
ok(!badSea.length, `every sea mark is on open sea (${badSea.slice(0, 4).join('; ') || 'all'})`);

// clear of the towns and wells, and of the roads, railways and motor routes, by each level's clearance
const CL = KIT.clear;
const places = [...SETTLEMENTS.filter((s) => !s.gateway).map((s) => ({ p: s as Pt, r: ['city', 'port', 'home', 'town'].includes(s.kind) ? CL.town : CL.place, id: s.id })),
  ...ROAD_WELLS.map((w) => ({ p: w as Pt, r: CL.place, id: w.id }))];
const segDist = (p: Pt, a: Pt, b: Pt) => {
  const dx = b.x - a.x, dy = b.y - a.y, L = dx * dx + dy * dy;
  const t = L ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / L)) : 0;
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
};
const lines: Pt[][] = [...ROAD_LINES.map((r) => r.pts.map(([x, y]) => ({ x, y }))),
  ...RAIL_LINKS.map((l) => routeLeg(settlementById(l.a), settlementById(l.b), 'rail')),
  ...MOTOR_ROUTES.map((l) => routeLeg(settlementById(l.a), settlementById(l.b), 'motor'))];
const nearTown: string[] = [], nearRoute: string[] = [];
const TOL = 2.6; // a cell of the generator's grid
for (let i = 0; i < z.n; i++) {
  const k = KIT_KINDS[z.kind[i]], p = { x: z.x[i], y: z.y[i] }, sc = CL.lodScale[z.lod[i]];
  const t = places.find((q) => dist(q.p, p) < q.r * sc - TOL);
  if (t) nearTown.push(`${k.kind} at ${t.id} (${dist(t.p, p).toFixed(1)})`);
  if (k.sea) continue;
  for (const l of lines) {
    let d = Infinity;
    for (let j = 1; j < l.length; j++) d = Math.min(d, segDist(p, l[j - 1], l[j]));
    if (d < CL.road * sc - TOL) { nearRoute.push(`${k.kind} ${p.x},${p.y} (${d.toFixed(1)})`); break; }
  }
}
ok(!nearTown.length, `every town and well is kept clear (${nearTown.slice(0, 4).join('; ') || 'none too close'})`);
ok(!nearRoute.length, `every road, railway and motor route is kept clear (${nearRoute.slice(0, 4).join('; ') || 'none too close'})`);

// Ararat and Damavand, the very large snowy peaks, at their real places (the summit drawn above the base)
const big = [...Array(z.n).keys()].filter((i) => KIT_KINDS[z.kind[i]].kind === 'peak-big');
for (const [name, lon, lat] of [['Ararat', 44.3, 39.7], ['Damavand', 52.11, 35.95]] as const) {
  const g = geo(lon, lat);
  const at = big.find((i) => Math.hypot(z.x[i] - g.x, z.y[i] - KIT_KINDS[z.kind[i]].h * z.size[i] * 0.75 - g.y) < 40);
  ok(at !== undefined && z.lod[at] === 0, `${name} stands at its place and shows at every zoom`);
}
const kindAt = (lon: number, lat: number, r: number, kinds: string[]) => { const g = geo(lon, lat); return itemsIn(z, g.x - r, g.y - r, g.x + r, g.y + r).filter((i) => kinds.includes(KIT_KINDS[z.kind[i]].kind)).length; };
ok(kindAt(31.0, 30.9, 45, ['palm', 'field']) >= 10, 'palms and fields in the Delta');
ok(kindAt(44.6, 32.6, 60, ['palm']) >= 10, 'palms along the Tigris and Euphrates');
ok(kindAt(51.5, 36.6, 60, ['broadleaf', 'clump', 'conifer']) >= 15, 'the Caspian shore is wooded');
ok(kindAt(36.0, 34.1, 30, ['conifer']) >= 3, 'cedars on Mount Lebanon');
ok(kindAt(33.9, 28.6, 40, ['peak-granite']) >= 3, 'red granite peaks in Sinai');
ok(kindAt(48.0, 33.5, 120, ['peak-bare', 'peak-snow']) >= 20, 'peaks along the Zagros');

// ---- zoom
ok(lodFor(0.8) === 0 && lodFor(1.5) === 1 && lodFor(3) === 2, 'fewer decorations far out, all of them close in');
ok(boostFor(0.75) > boostFor(1.5) && boostFor(3) === 1 && boostFor(0.5) === 1.5, 'drawn a little larger far out, at their size close in');
ok(!liveAt(5, false) && !liveAt(1, true) && liveAt(4, true), 'they sway only close in, and only with Map life on');

// ---- the atlases: present when both the image and its frames are in the folder
const pres = kitPresent(['kit/01-palms.webp', 'kit/01-palms.json', 'kit/05-peaks-snow.webp', 'K-compass-base.webp']);
ok(pres['01-palms'] && !pres['05-peaks-snow'] && Object.keys(pres).length === 10, 'a sheet counts as in only with its image and its frames');
ok(KIT_SHEETS.length === 10 && KIT_KINDS.every((k) => KIT_SHEETS.includes(k.sheet) && (KIT.sheets as Record<string, { groups: [string, number][]; largest?: string }>)[k.sheet].groups.some(([g]) => g === k.group) || (KIT.sheets as Record<string, { largest?: string }>)[k.sheet].largest === k.group), 'every kind is drawn from a group its sheet has');

// ---- tools/cut-sheets.py on synthetic sheets
const src = join(tmp, 'sheets'), out = join(tmp, 'kit');
execFileSync('python3', ['-I', 'tests/mapkit-sheets.py', src], { cwd: root, stdio: 'pipe' });
const log = execFileSync('python3', ['-I', 'tools/cut-sheets.py', '--src', src, '--out', out], { cwd: root }).toString();
ok(!/note:/.test(log), 'every synthetic sheet has the number of items expected (no notes)');
for (const [stem, spec] of Object.entries(KIT.sheets as Record<string, { groups: [string, number][]; largest?: string }>)) {
  const f = join(out, `${stem}.json`);
  if (!existsSync(f) || !existsSync(join(out, `${stem}.webp`))) { ok(false, `${stem}: atlas written`); continue; }
  const meta = JSON.parse(readFileSync(f, 'utf8')) as { frames: { w: number; h: number; ax: number; ay: number; ih: number }[]; groups: Record<string, number[]> };
  const want: Record<string, number> = Object.fromEntries(spec.groups);
  if (spec.largest) want[spec.largest] = 1;
  const got = Object.fromEntries(Object.entries(meta.groups).map(([g, l]) => [g, l.length]));
  const same = Object.keys(want).length === Object.keys(got).length && Object.entries(want).every(([g, n]) => got[g] === n);
  const bases = meta.frames.every((fr) => fr.ax > 0 && fr.ax < fr.w && fr.ay > fr.h * 0.5 && fr.ay <= fr.h + 0.5 && fr.ih > 0);
  ok(same && bases, `${stem}: ${Object.entries(got).map(([g, n]) => `${g} ${n}`).join(', ')} items, each with its base`);
}

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
