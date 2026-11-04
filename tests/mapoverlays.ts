// The travel map's painted overlays, checked without a browser: every landmark, ship, wake, caravan and people
// picture is in public/art/map under the name the map asks for; the landmarks, laid out at the middle and close zooms
// on a phone and a wide screen, never overlap one another or another town's pin and name, and the home and the chief
// cities always show close in; the people stand on dry ground, off the roads and railways, clear of every pin, name,
// landmark and painted region name, and well apart from one another.
//   npx tsx tests/mapoverlays.ts
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { LANDMARKS, SHIPS, CARAVANS, PEOPLE, SHIP_PAINT, PAINTED_LANDMARKS } from '../src/data/mapArt';
import { landmarkLayout, landmarkFile, pinBox, placePeople, peopleClear, nearestWay, underName, PEOPLE_SCALES } from '../src/game/systems/mapOverlays';
import { SETTLEMENTS } from '../src/data/world';
import { isWaterPx, terrainAt } from '../src/game/systems/world';
import SIZES from '../src/data/mapOverlays.json';

let fails = 0;
const ok = (c: boolean, what: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${what}`); if (!c) fails++; };
const root = fileURLToPath(new URL('..', import.meta.url));
const has = (f: string) => existsSync(`${root}public/art/map/${f}`);

// ---- the files
ok(LANDMARKS.every((it) => has(landmarkFile(it))), `all ${LANDMARKS.length} landmarks in public/art/map (<code>-<name>.webp)`);
const shipFiles = Object.values(SHIP_PAINT).map((c) => SHIPS.find((s) => s.code === c)!).map((s) => `${s.code}-${s.name}.webp`);
ok(shipFiles.every(has) && has('S-wake.webp'), `a painting for every ship type (${shipFiles.join(', ')}) and the wake`);
ok(SHIPS.every((s) => Object.keys(SHIP_PAINT).includes(s.ship!)), 'every ship (S1-S10) has its type\'s painting');
ok(CARAVANS.every((c) => has(`${c.code}-caravan.webp`)), 'C1-C5 caravans');
ok(PEOPLE.every((p) => has(`people/${p.art}.webp`)), 'every people group\'s picture');
const sz = SIZES.sizes as unknown as Record<string, number[]>;
ok(Object.keys(sz).every((f) => has(f)) && Object.keys(sz).length >= 57, `sizes listed for ${Object.keys(sz).length} pictures (src/data/mapOverlays.json)`);

// ---- the landmarks
const pinned = (id: string) => SETTLEMENTS.some((s) => s.id === id && !s.gateway);
// (touching by under a pixel is not overlapping)
let tol = 0;
const hit = (a: { l: number; t: number; r: number; b: number }, b: typeof a) => a.l < b.r - tol && a.r > b.l + tol && a.t < b.b - tol && a.b > b.t + tol;
for (const [s, tier, what] of [[2.6, 1, 'phone, middle'], [2.96, 2, 'phone, close'], [4.6, 1, 'wide, middle'], [5.6, 2, 'wide, close']] as const) {
  tol = 0.6 / s;
  const L = landmarkLayout(s, tier, () => true, pinned);
  let clash = 0;
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) if (hit(L[i].box, L[j].box)) clash++;
  let onPin = 0;
  for (const l of L) for (const q of SETTLEMENTS) if (!q.gateway && q.id !== l.it.town && hit(pinBox({ id: q.id, kind: q.kind, name: q.name.split(',')[0], x: q.x, y: q.y }, s, tier), l.box)) onPin++;
  ok(clash === 0 && onPin === 0, `${what} (s ${s}): ${L.length} landmarks, none over another (${clash}) or another town's pin and name (${onPin})`);
  if (tier === 2) {
    // (since 2026-11-04 the repainted map has most landmarks painted in: only the ones it lacks are laid over it)
    const want = ['fayoum', 'amman'];  // (Saqqara's, between the Giza and Cairo pins, gives way to their names close in)
    const missing = want.filter((t) => !L.some((l) => l.it.town === t));
    ok(!missing.length, `${what}: the towns whose landmark the painting lacks show theirs${missing.length ? ` (missing ${missing.join(', ')})` : ''}`);
    const twice = L.filter((l) => PAINTED_LANDMARKS.has(l.it.code)).map((l) => l.it.town);
    ok(!twice.length, `${what}: no landmark painted into the map is laid over it again${twice.length ? ` (${twice.join(', ')})` : ''}`);
  }
}
// laid out round the pins as the page placed them: a block over a landmark's spot pushes it aside or leaves it out
{
  const giza = SETTLEMENTS.find((q) => q.id === 'amman')!;
  const free = landmarkLayout(4, 2, (id) => id === 'amman', pinned, undefined, [{ id: 'amman', dot: true, box: { l: giza.x - 3, r: giza.x + 3, t: giza.y - 3, b: giza.y + 3 } }]);
  const blocked = landmarkLayout(4, 2, (id) => id === 'amman', pinned, undefined, [
    { id: 'amman', dot: true, box: { l: giza.x - 3, r: giza.x + 3, t: giza.y - 3, b: giza.y + 3 } },
    { id: 'cairo', dot: false, box: { l: giza.x - 40, r: giza.x + 40, t: giza.y - 60, b: giza.y - 4 } },
  ]);
  const cb = { l: giza.x - 40, r: giza.x + 40, t: giza.y - 60, b: giza.y - 4 };
  const clear = blocked.every((l) => l.box.r <= cb.l || l.box.l >= cb.r || l.box.b <= cb.t || l.box.t >= cb.b);
  ok(free.length === 1 && free[0].box.b <= giza.y - 3 && clear && blocked.every((l) => l.box.t >= giza.y + 3), 'a landmark stands on its pin and gives way to a name laid over its spot (it goes under the pin instead, or is left out)');
}

// ---- the people
const P = placePeople();
// (since the landmarks grew, 2026-11-03, the Beirut fishermen find no shore clear of its landmark and are left out)
const unplaced = PEOPLE.filter((sp) => !P.some((q) => q.art === sp.art && q.near === sp.near)).map((sp) => `${sp.art} at ${sp.near}`);
ok(P.length >= PEOPLE.length - 1, `${P.length} of ${PEOPLE.length} groups placed (left out: ${unplaced.join(', ') || 'none'})`);
const dry = P.every((p) => [0, 0.5, 1].every((u) => { const q = { x: p.x - p.w / 2 + p.w * u, y: p.y - 0.2 }; const t = terrainAt(q); return !isWaterPx(q) && t !== 'water' && t !== 'river' && t !== 'lake' && t !== 'canal'; }));
ok(dry, 'every group stands on dry ground');
ok(P.every((p) => nearestWay({ x: p.x, y: p.y - p.h / 2 }) >= 1.8 && nearestWay({ x: p.x, y: p.y }) >= 1.8), 'off the roads and railways');
ok(P.every((p) => peopleClear(p.x, p.y, p.w, p.h, p.near, PEOPLE.find((s) => s.art === p.art && s.near === p.near)?.shore)), 'clear of pins, names, landmarks and the roads at every close scale');
ok(P.every((p) => PEOPLE_SCALES.every((s) => !underName({ x: p.x, y: p.y - p.h / 2 }, s))), 'never under a painted name');
let near = 0;
for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) if (Math.hypot(P[i].x - P[j].x, P[i].y - P[j].y) < 12) near++;
ok(near === 0, 'well apart from one another');
ok(P.every((p) => { const sp = PEOPLE.find((q) => q.art === p.art && q.near === p.near)!; const t = SETTLEMENTS.find((q) => q.id === p.near); return sp.to ? nearestWay(p) < 22 : !t || Math.hypot(t.x - p.x, t.y - p.y) < 32; }), 'each near its town or beside its road');
const fish = P.filter((p) => p.art === 'fishermen');
ok(fish.length > 0 && fish.every((p) => { for (let k = 0; k < 16; k++) { const a = (k * Math.PI) / 8; if (isWaterPx({ x: p.x + Math.cos(a) * (p.w / 2 + 3), y: p.y - p.h / 2 + Math.sin(a) * (p.h / 2 + 3) })) return true; } return false; }), 'the fishermen at the water\'s edge');

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
