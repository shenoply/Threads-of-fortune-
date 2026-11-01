// The living travel map, checked without a browser: the art registry, the compass needle, the ships'
// and caravans' lanes against the land mask, and inked journeys with the save 34 migration.
//   npx tsx tests/maplife.ts
import { MAP_ART, LANDMARKS, SHIPS, CARAVANS, WEATHER, COMPASS, MAP_LABELS, expectedFile, setArtFiles, artFile, itemFile, shipSheet, SHIP_SHEET, SHEET_TILT } from '../src/data/mapArt';
import { Needle, turnBetween, bearing } from '../src/game/systems/compass';
import { mapLanes, poseAt, shipFrame } from '../src/game/systems/mapLife';
import { thin, inkLine, addInk, inkPath, pathUpTo, nearInk, INK_CAP } from '../src/game/systems/inked';
import { isWaterPx, terrainAt, isBlockedPx, findPath, settlementById, MAP_W, MAP_H, dist } from '../src/game/systems/world';
import { SETTLEMENTS, ROAD_WELLS } from '../src/data/world';
import { useGame, SAVE_VERSION } from '../src/game/state/store';
import { audio } from '../src/game/audio/engine';
(audio as unknown as { sfx: () => void }).sfx = () => {};

let fails = 0;
const ok = (c: boolean, what: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${what}`); if (!c) fails++; };

// ---- the registry: every piece of the brief, under its code, at its spot ----
const codes = MAP_ART.map((a) => a.code);
ok(new Set(codes).size === codes.length, `every code is used once (${codes.length} pieces)`);
ok(LANDMARKS.length === 33 && LANDMARKS[0].code === '01' && LANDMARKS[32].code === '33', '33 landmarks, 01 to 33');
ok(SHIPS.length === 10 && CARAVANS.length === 5 && WEATHER.length === 4, '10 ships, 5 caravans, 4 weather pieces');
ok(['K-compass-base', 'K-compass-needle', 'K-compass-rim', 'S-wake', 'T', 'B', 'F-corner', 'M-city', 'M-port', 'M-camp', 'M-locked'].every((c) => codes.includes(c)), 'compass, wake, cartouche, scale, frame and markers are listed');
ok(expectedFile(LANDMARKS[0]) === 'art/map/01-giza.png' && expectedFile(SHIPS[2]) === 'art/map/S3-felucca.png' && expectedFile(COMPASS.base) === 'art/map/K-compass-base.png', 'file names follow the brief (01-giza.png, S3-felucca.png, K-compass-base.png)');
const towns = new Set([...SETTLEMENTS.map((s) => s.id), ...ROAD_WELLS.map((w) => w.id)]);
ok(LANDMARKS.every((l) => towns.has(l.town!)), 'each landmark belongs to a town or well on the map');
const far = LANDMARKS.map((l) => { const t = SETTLEMENTS.find((s) => s.id === l.town) ?? ROAD_WELLS.find((w) => w.id === l.town)!; return { c: l.code, d: dist(t, l as { x: number; y: number }) }; }).filter((o) => o.d > 12);
ok(!far.length, `each landmark stands at its town (${far.map((o) => `${o.c}: ${o.d.toFixed(0)}`).join(', ') || 'all within 12 units'})`);
ok(MAP_ART.filter((a) => a.x !== undefined).every((a) => a.x! >= 0 && a.x! <= MAP_W && a.y! >= 0 && a.y! <= MAP_H), 'every spot is on the map');
ok(MAP_LABELS.length === 25 && MAP_LABELS.some((l) => l.text === 'Gulf of Aqaba'), 'the 25 sea, river and region names');
// a painting is used once its file is in, whatever it is called after its code; WebP before PNG
setArtFiles(['K-compass-base.webp', 'S3-nile-boat.png', 'S1-steamer.png', 'S1-steamer.webp', '01-giza.png', 'S10-steamer.png']);
ok(itemFile(COMPASS.base) === 'art/map/K-compass-base.webp', 'the compass base is found');
ok(itemFile(COMPASS.needle) === undefined, 'a missing piece has no file (the placeholder is drawn)');
ok(itemFile(SHIPS[2]) === 'art/map/S3-nile-boat.png', 'a file under the code with another name is taken');
ok(itemFile(SHIPS[0]) === 'art/map/S1-steamer.webp', 'WebP before PNG');
ok(itemFile(SHIPS[9]) === 'art/map/S10-steamer.png' && artFile('S1') !== 'art/map/S10-steamer.png', 'S1 and S10 are not confused');
ok(itemFile(LANDMARKS[0]) === 'art/map/01-giza.png' && itemFile(LANDMARKS[1]) === undefined, 'landmark 01 found, 02 not');
setArtFiles([]);

// ---- the Blender ships: a sheet per type, 16 headings ----
setArtFiles(['S1-steamer.png', 'ships/steamer.webp', 'ships/steamer.png', 'ships/dhow.png', 'ships/caspian.webp']);
ok(shipSheet(SHIPS[0]) === 'art/map/ships/steamer.webp' && shipSheet(SHIPS[9]) === 'art/map/ships/steamer.webp', 'S1 and S10 take the steamer sheet, WebP before PNG');
ok(shipSheet(SHIPS[3]) === 'art/map/ships/dhow.png' && shipSheet(SHIPS[8]) === 'art/map/ships/caspian.webp', 'the dhows take the dhow sheet, S9 the small Caspian steamer');
ok(shipSheet(SHIPS[1]) === undefined && shipSheet(SHIPS[2]) === undefined, 'a type without a sheet has none (the painting or placeholder is drawn)');
ok(itemFile(SHIPS[0]) === 'art/map/S1-steamer.png' && artFile('S') === undefined, 'a sheet is never taken for a single painting');
ok(SHIPS.every((s) => SHIP_SHEET[s.ship!]), 'every ship has a sheet type');
setArtFiles([]);
{
  const deg = Math.PI / 180;
  ok(shipFrame(0).i === 0 && shipFrame(Math.PI / 2).i === 4 && shipFrame(Math.PI).i === 8 && shipFrame(-Math.PI / 2).i === 12, 'east, south, west and north are frames 0, 4, 8 and 12');
  ok(shipFrame(Math.PI * 2 - 0.01).i === 0 && shipFrame(Math.PI * 4 + Math.PI / 2).i === 4, 'headings past a full turn wrap round');
  // on the slanting view a heading 30 degrees north of east on the map is nearer north on the ground
  const ne = shipFrame(-30 * deg);
  ok(Math.abs(ne.ground - Math.atan2(-0.5 / SHEET_TILT, Math.cos(30 * deg))) < 1e-9 && ne.i === 14, `30 degrees north of east on the map is frame 14, not 15 (ground ${(ne.ground / deg).toFixed(1)} degrees)`);
  let worst = 0, jumps = 0, prev = shipFrame(0).i;
  for (let a = 0; a < 360; a += 0.5) {
    const f = shipFrame(a * deg);
    worst = Math.max(worst, Math.abs(f.rest));
    if (f.i !== prev) { if ((f.i - prev + 16) % 16 !== 1) jumps++; prev = f.i; }
  }
  ok(worst <= 11.25 * deg + 1e-9, `the frame is never more than 11.25 degrees off the heading (${(worst / deg).toFixed(2)})`);
  ok(jumps === 0, 'turning steadily, the frames step one at a time through all 16');
  // a ship coming about at the end of its lane passes through the frames in order
  const l = mapLanes().get('S1')!;
  const seenFrames = new Set<number>();
  for (let t = 0; t < 2 * (l.secs + l.turn); t += 0.05) { const p = poseAt(l, t); if (p.turning) seenFrames.add(shipFrame(p.angle).i); }
  ok(seenFrames.size >= 9, `S1 shows ${seenFrames.size} headings as it comes about`);
}

// ---- the compass needle ----
ok(Math.abs(turnBetween(0.1, Math.PI * 2 - 0.1) + 0.2) < 1e-9, 'the needle turns the short way past north');
ok(Math.abs(bearing({ x: 0, y: 0 }, { x: 10, y: 0 }) - Math.PI / 2) < 1e-9 && Math.abs(bearing({ x: 0, y: 0 }, { x: 0, y: -10 })) < 1e-9, 'bearings: north is up, east is a quarter turn');
{
  const n = new Needle();
  n.a = 1.2; n.setTarget(0);
  let over = false, t = 0;
  while (t < 8) { n.step(1 / 60); t += 1 / 60; if (n.a < -0.02) over = true; }
  ok(over, 'swinging back to north it overshoots a little (a damped wobble)');
  ok(n.settled && Math.abs(n.a) < 0.003, `and settles on north within a few seconds (${n.a.toFixed(4)})`);
  let peak = 0;
  const m = new Needle(); m.a = 1.2; m.setTarget(0);
  for (let i = 0; i < 480; i++) { m.step(1 / 60); if (m.a < 0) peak = Math.max(peak, -m.a); }
  ok(peak < 0.5, `the overshoot is gentle (${(peak * 57.3).toFixed(0)} degrees from 69)`);
  const k = new Needle(); k.a = 3.0; k.setTarget(-3.0);
  k.step(0.05);
  ok(k.a > 3.0, 'from 172 degrees to -172 it swings on through south, not back round');
  const h = new Needle(); h.setTarget(Math.PI / 2); for (let i = 0; i < 600; i++) h.step(1 / 60);
  ok(Math.abs(h.a - Math.PI / 2) < 0.003, 'it settles on a heading (east)');
  const slow = new Needle(); slow.a = 1; slow.setTarget(0); slow.step(5);
  ok(Number.isFinite(slow.a) && Math.abs(slow.a) < 1.5, 'a long frame does not throw it about');
}

// ---- ships keep to the water, the felucca to the Nile, caravans to the land ----
const lanes = mapLanes();
for (const s of SHIPS) {
  const l = lanes.get(s.code);
  if (!l) { ok(false, `${s.code} has a lane`); continue; }
  let bad = 0;
  for (let t = 0; t < 2 * (l.secs + l.turn); t += 0.5) {
    const p = poseAt(l, t);
    if (s.ship === 'felucca' ? terrainAt(p) !== 'river' : !isWaterPx(p)) bad++;
  }
  ok(bad === 0 && l.len >= 20, `${s.code} (${s.ship}) sails ${l.len.toFixed(0)} units, always on ${s.ship === 'felucca' ? 'the Nile' : 'water'}${bad ? ` (${bad} points off)` : ''}`);
  ok(dist(l.pts[0], s as { x: number; y: number }) < 80, `${s.code} stays near its spot`);
}
for (const c of CARAVANS) {
  const l = lanes.get(c.code);
  if (!l) { ok(false, `${c.code} has a way`); continue; }
  let bad = 0;
  for (let t = 0; t < 2 * (l.secs + l.turn); t += 1) { const p = poseAt(l, t); if (isBlockedPx(p) || isWaterPx(p)) bad++; }
  ok(bad === 0 && dist(l.pts[0], c as { x: number; y: number }) < 70, `${c.code} walks ${l.len.toFixed(0)} units of land near its spot`);
}
{
  const l = lanes.get('S1')!;
  const a = poseAt(l, 0), b = poseAt(l, 0.5);
  ok(Math.abs(a.x - b.x) + Math.abs(a.y - b.y) < 1, 'ships go slowly (under 2 units a second)');
  const out = poseAt(l, (1 - l.phase) * 2 * (l.secs + l.turn) + l.secs * 0.5), back = poseAt(l, (1 - l.phase) * 2 * (l.secs + l.turn) + l.secs * 1.5 + l.turn);
  ok(out.out && !back.out && Math.abs(Math.abs(turnBetween(out.angle, back.angle)) - Math.PI) < 0.01, 'out along the lane and back, turned about');
}

// ---- inked journeys ----
const g = settlementById('giza'), al = settlementById('damascus');
const walk = findPath(g, al)!;
const line = inkLine(walk);
ok(line.length >= 4 && line.length <= walk.length * 2, `a walk is kept thinned (${walk.length} points to ${line.length / 2})`);
ok(line.every((v) => Math.abs(v * 2 - Math.round(v * 2)) < 1e-9), 'rounded to half a unit');
ok(Math.abs(line[0] - g.x) < 0.6 && Math.abs(line[line.length - 2] - al.x) < 0.6, 'from where it began to where it ended');
ok(thin([{ x: 0, y: 0 }, { x: 5, y: 0.2 }, { x: 10, y: 0 }]).length === 2, 'a point on the straight is dropped');
ok(inkLine([{ x: 1, y: 1 }, { x: 1.5, y: 1 }]).length === 0, 'a step too short to see is not kept');
const big = Array.from({ length: 400 }, (_, i) => ({ x: (i * 7) % 2000, y: (i * 37) % 1200 }));
let many: number[][] = [];
for (let i = 0; i < 60; i++) many = addInk(many, big);
ok(many.reduce((s, l) => s + l.length, 0) <= INK_CAP && many.length > 1, 'years of travel stay under the cap, the oldest lines dropped first');
ok(inkPath([[1, 2, 3, 4]]) === 'M1 2L3 4', 'the SVG path');
ok(pathUpTo([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }], 15).at(-1)!.y === 5, 'the way behind, part way along');
ok(nearInk([line], al, 4) && !nearInk([line], settlementById('tehran'), 8), 'a town on an inked way counts as visited, a far one not');

// the store: a journey inked, and the save version with its migration
ok(SAVE_VERSION === 34, 'save version 34');
useGame.getState().inkJourney(walk);
ok(useGame.getState().inked.length === 1, 'inkJourney keeps the way travelled');
const migrate = useGame.persist.getOptions().migrate!;
const old = { world: { fog: '1'.repeat(400 * 243), x: g.x, y: g.y, known: ['giza'], at: 'giza', party: { troops: {}, animals: {}, food: 5 } }, day: 4 } as unknown as Record<string, unknown>;
const m = migrate(JSON.parse(JSON.stringify(old)), 33) as unknown as { inked: unknown };
ok(Array.isArray(m.inked) && (m.inked as unknown[]).length === 0, 'a save 33 opens with no inked lines');
const kept = migrate({ ...JSON.parse(JSON.stringify(old)), inked: [[1, 2, 3, 4]] }, 34) as unknown as { inked: number[][] };
ok(kept.inked.length === 1, 'a save 34 keeps its inked lines');
const broken = migrate({ ...JSON.parse(JSON.stringify(old)), inked: 'nonsense' }, 34) as unknown as { inked: unknown };
ok(Array.isArray(broken.inked), 'a damaged ink list is reset');

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
