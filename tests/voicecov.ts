import { readFileSync } from 'node:fs';
import { startEncounter, presentRug, doAction, type Ctx } from '../src/game/systems/negotiation';
import { startingInventory } from '../src/game/economy/economy';
import { lineId, templateOf } from '../src/game/audio/voice';
const csv = readFileSync('public/voices/voice-script.csv', 'utf8');
const files = new Set([...csv.matchAll(/"([a-z]+\/[0-9a-f]{8}(?:\.a)?)\.mp3"/g)].map((m) => m[1]));
const inv = startingInventory();
const ids = ['ask_room','ask_drawn','ask_budget','small_talk','story','craft','fit','durability','obj_honest','obj_facts','obj_concede','name_price','hold','halfway','accept_offer','sweetener','story_true','story_embellish','saffron_move','saffron_stay','ask_decider','tea','obj_another'] as const;
let total = 0, hit = 0; const miss = new Map<string, number>();
for (let i = 0; i < 3000; i++) {
  const buyer = ['samira','yusuf','mariam'][i % 3];
  const rel = { visits: i % 4, purchases: i % 3, spent: 0, affinity: 0, bad: 0, lastLines: [], lastRug: 'desert-star' };
  const c: Ctx = { inventory: inv, upgrades: ['tea'], reputation: 0, rel, rng: Math.random };
  const e = startEncounter(buyer, c, ['start-ds','start-cg','start-dr'], false);
  presentRug(e, c, ['start-ds','start-cg','start-dr'][i % 3]);
  for (let k = 0; k < 25 && !e.outcome; k++) doAction(e, c, ids[Math.floor(Math.random() * ids.length)], 60 + 5 * Math.floor(Math.random() * 40));
  for (const l of e.log) {
    const sp = l.speaker === 'seller' ? 'seller' : l.speaker === 'buyer' ? buyer : 'narrator';
    total++;
    const id = `${sp}/${lineId(sp, l.text)}`;
    const t = templateOf(l.text); const tid = `${sp}/${lineId(sp, t.template)}.a`;
    if (files.has(id) || (t.n !== undefined && files.has(tid))) hit++; else miss.set(`${sp}: ${l.text}`, (miss.get(`${sp}: ${l.text}`) ?? 0) + 1);
  }
}
console.log(`voice coverage ${(hit / total * 100).toFixed(1)}% of ${total} spoken lines`);
console.log([...miss.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, v]) => `${v}× ${k.slice(0, 110)}`).join('\n'));
