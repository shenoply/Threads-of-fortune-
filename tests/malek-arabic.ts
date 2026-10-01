// Malek's Arabic: the phrases, their clips on disk, the shop pick never repeats, and in a haggle he
// opens some lines with "Ha?" or "Bah!" (never two running, never in the greeting) and nobody else does.
//   npx tsx tests/malek-arabic.ts
import { existsSync } from 'node:fs';
import * as N from '../src/game/systems/negotiation';
import { RUGS } from '../src/data/rugs';
import { MALEK_ARABIC, pickArabic } from '../src/data/malekArabic';
import type { RugItem } from '../src/game/types';

let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fails++; };
const clips = MALEK_ARABIC.flatMap((p) => p.clips);
ok(clips.every((c) => existsSync(`public/audio/malek/ar-${c}.mp3`)), `all ${clips.length} clips on disk`);
ok(['aah-wbaadein', 'elli-khalaq', 'tamalli-maak', 'ha', 'ba', 'meen-aal', 'tozz', 'how'].every((id) => MALEK_ARABIC.some((p) => p.id === id)), 'the eight phrases (with مين قال؟, طظ! and How?)');
let last: string | null = null, rep = 0;
for (let i = 0; i < 200; i++) { const p = pickArabic('shop', last); if (p.id === last) rep++; last = p.id; }
ok(rep === 0, 'the shop never says the same phrase twice running');
ok(MALEK_ARABIC.filter((p) => p.where.includes('haggle')).map((p) => p.id).sort().join() === 'ba,ha,how,meen-aal,tozz', 'in a haggle: ها، با، مين قال، طظ، How');

let seed = 5;
const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const tier1 = Object.values(RUGS).filter((t) => (t.tier ?? 1) === 1);
const haggle = (buyer: string) => {
  const inv: RugItem[] = tier1.slice(0, 4).map((t, i) => ({ uid: `r${i}`, typeId: t.id, condition: 'Good', restored: false, provenance: t.provenance, paid: 150, notes: [] }));
  const c = { inventory: inv, upgrades: [], reputation: 10, rel: { visits: 1, purchases: 0, spent: 0, affinity: 0, bad: 0, lastLines: [] }, rng, findings: [], day: 5 } as unknown as Parameters<typeof N.startEncounter>[1];
  const e = N.startEncounter(buyer, c, inv.slice(0, 3).map((i) => i.uid), false);
  e.saffronOn = undefined;
  for (const a of ['ask_room', 'ask_drawn'] as const) if (!e.outcome) N.doAction(e, c, a);
  if (!e.outcome) N.presentRug(e, c, inv[0].uid);
  for (const a of ['durability', 'fit', 'craft'] as const) if (!e.outcome && !e.objection) N.doAction(e, c, a);
  if (!e.outcome && e.objection) N.doAction(e, c, 'obj_honest');
  for (let k = 0; k < 6 && !e.outcome; k++) N.doAction(e, c, 'name_price', Math.round(N.wtp(e, inv[0]) * 1.3 / 5) * 5);
  return e.log.filter((l) => l.speaker === 'buyer');
};
let withAr = 0, total = 0, running = 0, greeting = 0;
for (let i = 0; i < 40; i++) {
  const lines = haggle('malek');
  total += lines.length; withAr += lines.filter((l) => l.ar).length;
  if (lines[0]?.ar) greeting++;
  lines.forEach((l, j) => { if (l.ar && lines[j - 1]?.ar) running++; });
}
console.log(`     Malek: ${withAr} of ${total} lines open in Arabic`);
ok(withAr > 0 && withAr < total / 2, 'some of his lines, not most');
ok(running === 0 && greeting === 0, 'never two running, never the greeting');
const one = haggle('malek').find((l) => l.ar);
console.log(`     e.g. "${one?.text.slice(0, 80)}"`);
ok(!!one && /^(ها؟ Ha\?|با! Ba!|مين قال؟ Meen ’aal\?|طظ! Tozz!|How\?) /.test(one.text), 'the line shows the Arabic and its reading');
const used = new Set<string>(); for (let i = 0; i < 40; i++) haggle('malek').forEach((l) => l.ar && used.add(l.ar));
console.log('     openers used:', [...used].sort().join(', '));
ok(used.size >= 4, 'he uses most of them over a few haggles');
ok(haggle('samira').every((l) => !l.ar), 'nobody else does it');
console.log(fails ? `${fails} FAILED` : 'all passed');
process.exit(fails ? 1 : 0);
