// Saves from the old travel map (before save 33) load onto the one-painting map: the caravan, its explored
// ground and the bands on the roads are carried to the same places, and nothing of the old size is left.
//   npx tsx tests/map-move.ts
import { useGame } from '../src/game/state/store';
import { oldToNew, OLD_MAP } from '../src/game/state/mapMove';
import { SETTLEMENTS } from '../src/data/world';
import { FOG_LEN, isExplored, isBlockedPx, settlementById, MAP_W, MAP_H, fitFog } from '../src/game/systems/world';
import OLD from '../tools/old-map-positions.json';

let fails = 0;
const ok = (c: boolean, w: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${w}`); if (!c) fails++; };

// every town on the old map lands on itself
let worst = 0;
for (const s of SETTLEMENTS) {
  const o = (OLD as Record<string, number[]>)[s.id];
  if (!o) continue;
  const n = oldToNew({ x: o[0], y: o[1] });
  worst = Math.max(worst, Math.hypot(n.x - s.x, n.y - s.y));
}
ok(worst < 3, `old town positions carry to the new ones (worst ${worst.toFixed(1)} units)`);
// and anywhere on the old map stays on the new one
let inside = true;
for (let x = 0; x <= OLD_MAP.w; x += 25) for (let y = 0; y <= OLD_MAP.h; y += 25) { const n = oldToNew({ x, y }); if (!(n.x >= 0 && n.y >= 0 && n.x < MAP_W && n.y < MAP_H)) inside = false; }
ok(inside, 'every old point lands on the new map');

// a save from the old map: on the road between Damascus and Baghdad, the Delta explored, a train under way
const migrate = useGame.persist.getOptions().migrate!;
const fogOld = '0'.repeat(OLD_MAP.cols * OLD_MAP.rows).split('');
const openOld = (x: number, y: number) => { const cx = Math.floor(x / 5), cy = Math.floor(y / 5); for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) fogOld[(cy + dy) * OLD_MAP.cols + cx + dx] = '1'; };
const O = OLD as Record<string, number[]>;
openOld(O.cairo[0], O.cairo[1]); openOld(O.tehran[0], O.tehran[1]);
const mid = { x: (O.damascus[0] + O.baghdad[0]) / 2, y: (O.damascus[1] + O.baghdad[1]) / 2 };
const base = useGame.getState();
const old = { ...JSON.parse(JSON.stringify({ ...base, world: { ...base.world, x: mid.x, y: mid.y, at: null, fog: fogOld.join(''), parties: [{ id: 'rb4', kind: 'raiders', name: 'x', size: 9, strength: 30, x: 700, y: 280, path: [{ x: 700, y: 280 }], travelled: 0, speed: 26, vendetta: true }] } })), started: true };
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const p = migrate(clone(old), 32) as typeof base;
ok(p.world.fog.length === FOG_LEN, `the fog is the new map's size (${p.world.fog.length})`);
ok(isExplored(p.world.fog, settlementById('cairo')) && isExplored(p.world.fog, settlementById('tehran')), 'what was explored round Cairo and Tehran is still explored');
ok(!isExplored(p.world.fog, settlementById('konya')), 'what was not explored still is not');
const q = { x: p.world.x, y: p.world.y };
const dm = settlementById('damascus'), bg = settlementById('baghdad');
ok(Math.hypot(q.x - (dm.x + bg.x) / 2, q.y - (dm.y + bg.y) / 2) < 120 && !isBlockedPx(q), `the caravan is still in the Syrian desert, on open ground (${q.x}, ${q.y})`);
ok(isExplored(p.world.fog, q), 'and the ground round it is open');
const band = p.world.parties.find((x) => x.id === 'rb4');
ok(!!band && band.vendetta === true && band.strength === 30, 'a band with a score to settle keeps it');
ok(p.world.parties.every((x) => x.x >= 0 && x.x < MAP_W && x.y >= 0 && x.y < MAP_H), 'every band is on the new map');
// a journey under way ends where it was going
const p2 = migrate({ ...clone(old), journey: { path: [{ x: 1, y: 1 }, { x: 2, y: 2 }], done: 0, train: true, dest: 'aleppo' } }, 32) as typeof base;
ok(!p2.journey && p2.world.at === 'aleppo' && p2.world.x === settlementById('aleppo').x, `a train under way arrives at Aleppo (${JSON.stringify([!!p2.journey, p2.world.at, p2.world.x])})`);
// a fog of a size no map ever had does not break the map
ok(fitFog('0'.repeat(177 * 118)).length === FOG_LEN, 'an old fog read cell by cell is the new size, unexplored');
const p3 = migrate({ ...clone(old), world: { ...clone(old).world, fog: '0101' } }, 32) as typeof base;
ok(p3.world.fog.length === FOG_LEN, 'a broken fog is replaced by an unexplored one');
console.log(fails ? `${fails} FAILED` : 'ALL OK'); process.exit(fails ? 1 : 0);
