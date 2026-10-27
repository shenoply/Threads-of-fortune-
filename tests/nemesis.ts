// A leader who gets away remembers you, gathers men and comes looking.
//   npx tsx tests/nemesis.ts
import { stepParties, type Party } from '../src/game/systems/world';
import { nemesisLine, type Leader } from '../src/game/systems/combat';

let fails = 0;
const ok = (c: boolean, w: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${w}`); if (!c) fails++; };
const band = (vendetta: boolean): Party => ({ id: 'rb0', kind: 'raiders', name: 'x', size: 6, strength: 20, x: 250, y: 400, path: [{ x: 250, y: 400 }, { x: 250, y: 400 }], travelled: 0, speed: 26, vendetta });
const me = { x: 250, y: 435 }; // 35 away: out of an ordinary band's reach
const rng = () => 0.5;
const plain = stepParties([band(false)], 0.2, rng, me, 30, 10)[0];
const feud = stepParties([band(true)], 0.2, rng, me, 30, 10)[0];
const d = (p: Party) => Math.hypot(p.x - me.x, p.y - me.y);
ok(d(feud) < 35 - 4, `a band with a score to settle rides at you from further off (${d(feud).toFixed(1)} away)`);
ok(d(feud) < d(plain), `an ordinary band does not (${d(plain).toFixed(1)} away)`);
const L: Leader = { name: 'Abdel-Al the Cudgel', temper: 'reckless', bounty: 100, status: 'free', gen: 0 };
ok(nemesisLine(L) === '', 'a stranger has nothing to say about you');
ok(/ran/.test(nemesisLine({ ...L, past: ['escaped'], meets: 1 })), `after he got away: ${nemesisLine({ ...L, past: ['escaped'], meets: 1 })}`);
ok(/bale/.test(nemesisLine({ ...L, past: ['beat-you'], meets: 1 })), `after he beat you: ${nemesisLine({ ...L, past: ['beat-you'], meets: 1 })}`);
ok(/cousins/.test(nemesisLine({ ...L, past: ['ransomed'], meets: 2 })), 'after his ransom');
ok(/buried/.test(nemesisLine({ ...L, past: ['escaped', 'beat-you', 'escaped'], meets: 4 })), 'after four meetings, it is personal');
console.log(fails ? `${fails} FAILED` : 'ALL OK'); process.exit(fails ? 1 : 0);
