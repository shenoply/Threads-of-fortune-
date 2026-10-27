// Your men by name: hires get names and faces, the dead are chosen and buried, promotions keep the man.
//   npx tsx tests/men.ts
import { syncMen, killMen, woundMen, bloodMen, promoteMen, manLabel } from '../src/game/systems/men';

let fails = 0;
const ok = (cond: boolean, what: string) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${what}`); if (!cond) fails++; };

let men = syncMen([], { fellah: 3, guard: 2, veteran: 1, bedouin: 2 }, 10);
ok(men.length === 8, `eight men, eight names: ${men.map(manLabel).join(', ')}`);
ok(new Set(men.map((m) => m.name)).size === 8, 'no two share a name');
ok(new Set(men.map((m) => m.face)).size === 8, 'no two share a face');
ok(men.filter((m) => m.kind === 'bedouin').every((m) => m.face.startsWith('bedouin')), 'Bedouin riders get Bedouin faces');
ok(syncMen(men, { fellah: 3, guard: 2, veteran: 1, bedouin: 2 }, 11) === men, 'nothing changes when the counts do not');
const more = syncMen(men, { fellah: 4, guard: 2, veteran: 1, bedouin: 1 }, 12);
ok(more.length === 8 && more.filter((m) => m.kind === 'fellah').length === 4 && men.slice(0, 3).every((m) => more.some((x) => x.id === m.id)), 'a hire adds a man, a man let go leaves; the old hands stay');
const k = killMen(men, { guard: 1, fellah: 1 }, 's1');
ok(k.fallen.length === 2 && k.men.length === 6 && k.fallen.every((f) => !k.men.includes(f)), `two killed by name: ${k.fallen.map(manLabel).join(', ')}`);
const w = woundMen(k.men, { veteran: 1 }, 10, 's1');
ok(w.hurt.length === 1 && w.hurt[0].scars === 1 && (w.hurt[0].hurtUntil ?? 0) > 10, 'a wounded man carries a scar and rests');
let b = bloodMen(w.men, 3, 's1');
ok(b.men.every((m) => m.fights === 1) && b.men.reduce((a, m) => a + m.kills, 0) === 3, 'every man counts the fight; the kills are shared');
for (let i = 0; i < 8; i++) b = bloodMen(b.men, 3, `s${i + 2}`);
ok(b.men.some((m) => m.by), `a man with enough fights earns a name: ${b.men.filter((m) => m.by).map(manLabel).join(', ')}`);
const vet = b.men.filter((m) => m.kind === 'fellah').sort((a, c) => c.fights - a.fights)[0];
const p = promoteMen(b.men, [{ from: 'fellah', to: 'guard' }]);
ok(p.up.length === 1 && p.up[0].id === vet.id && p.up[0].kind === 'guard', `the seasoned lad is the one promoted: ${manLabel(p.up[0])}`);
console.log(fails ? `${fails} FAILED` : 'ALL OK');
process.exit(fails ? 1 : 0);
