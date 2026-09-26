// Builds public/voices/voice-script.csv: every spoken line in the game, one row per clip to record.
import { writeFileSync, readFileSync } from 'node:fs';
import { BUYERS, BUYER_TIERS } from '../src/data/buyers';
import { RUGS } from '../src/data/rugs';
import { SELLER, NARRATOR, RASHID, DOCUMENTARY, STAGE } from '../src/data/dialogue';
import { NPCS } from '../src/data/world';
import { VOICE_BRIEFS } from '../src/data/voices';
import { SELLER_MANNER, BUYER_MANNER } from '../src/data/manners';
import { GROOMING } from '../src/data/grooming';
import { AUCTIONEER } from '../src/data/auctioneer';
import { lineId, quotes } from '../src/game/audio/voice';
import { THREAT_LINES, THREAT_VOICE } from '../src/data/travelThreats1925';
import { JOBS, GIVER_VOICE } from '../src/data/jobs';
import { MISSIONS } from '../src/data/missions';
import { ladder, spoken } from '../src/game/economy/money';

type Row = { speaker: string; file: string; text: string; note: string };
const rows: Row[] = [];
const seen = new Set<string>();
const rugNames = Object.values(RUGS).map((r) => r.name);

function add(speaker: string, raw: string, note = '') {
  if (!raw || !raw.trim()) return;
  let texts = [raw.replace('{amount}', '{price}')];
  if (raw.includes('{rug}')) texts = rugNames.map((n) => raw.replace(/\{rug\}/g, n));
  for (const text of texts) {
    if (text.includes('{price}')) {
      const [a, b] = text.split('{price}');
      const id = lineId(speaker, text);
      if (a.trim() || speaker !== 'auctioneer') push(speaker, `${speaker}/${id}.a.mp3`, a.trim(), `${note} Part 1 of a price line. Full line: "${text}". Stop naturally before the number.`);
      if (b.trim().replace(/^[.,!?]\s*/, '')) push(speaker, `${speaker}/${id}.b.mp3`, b.trim(), `${note} Part 2, spoken straight after the number.`);
    } else push(speaker, `${speaker}/${lineId(speaker, text)}.mp3`, text, note);
  }
}
function push(speaker: string, file: string, text: string, note: string) {
  if (seen.has(file)) return;
  seen.add(file);
  rows.push({ speaker, file, text, note: note.trim() });
}
function walk(speaker: string, v: unknown, note: string) {
  if (typeof v === 'string') add(speaker, v, note);
  else if (Array.isArray(v)) v.forEach((x) => walk(speaker, x, note));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(speaker, x, note || k);
}

// Narrator
DOCUMENTARY.forEach((d) => add('narrator', d.text, 'Opening documentary.'));
Object.values(NARRATOR).forEach((t) => add('narrator', t, 'Tutorial guidance.'));
Object.values(STAGE).forEach((t) => add('narrator', t, 'Stage direction.'));
Object.values(BUYERS).forEach((b) => b.lines.arrival.forEach((t) => add('narrator', t, 'Stage direction, read quietly.')));
const neg = readFileSync(new URL('../src/game/systems/negotiation.ts', import.meta.url), 'utf8');
for (const m of neg.matchAll(/say\(enc, '(?:saffron|system)', '([^']+)'\)/g)) add('narrator', m[1], 'Stage direction.');

// Seller
for (const [k, v] of Object.entries(SELLER)) {
  if (k === 'fit') for (const [b, t] of Object.entries(v as Record<string, string>)) add('seller', t, `Speaking to ${b}.`);
  else walk('seller', v, k);
}
for (const r of Object.values(RUGS)) {
  add('seller', r.storyLine, `Telling the story of ${r.name}.`);
  add('seller', r.craftLine, `Explaining the craft of ${r.name}.`);
  add('seller', r.durabilityLine, `Durability of ${r.name}.`);
}

// Buyers
for (const b of Object.values(BUYERS)) {
  walk(b.id, { ...b.lines, arrival: [] }, '');
  b.objections.forEach((o) => { add(b.id, o.text, 'Objection.'); add(b.id, o.honest, 'Reply to an honest answer.'); add(b.id, o.facts, 'Reply to facts.'); });
  b.needs.forEach((n) => n.room.forEach((t) => add(b.id, t, n.label)));
}

// Manner: the seller's charm, kindness and firmness, and how each buyer takes it
walk('seller', SELLER_MANNER, 'Choosing a manner with a buyer.');
for (const [id, m] of Object.entries(BUYER_MANNER)) for (const [kind, r] of Object.entries(m)) { add(id, r.good, `Reacting well to ${kind}.`); add(id, r.bad, `Reacting badly to ${kind}.`); }

// How buyers react to the merchant's smell, clothes and thin stock
for (const [id, gr] of Object.entries(GROOMING)) walk(id, gr, 'Reacting to the merchant\'s appearance or stock.');

// Rashid (supplier screen) and world NPCs
walk('rashid', RASHID, '');
for (const n of Object.values(NPCS)) for (const [id, node] of Object.entries(n.nodes)) add(n.id, node.text, `Dialogue node "${id}".`);

// Road ambushes: the band's leader speaks the quoted part of his demand
for (const [id, l] of Object.entries(THREAT_LINES)) for (const q of quotes(l.demand)) add(THREAT_VOICE[id] ?? 'robberchief', q, 'Leader of an armed band stopping a merchant caravan on the road, 1925. Rough, unhurried, menacing.');

// Map jobs: a giver with a voice speaks the line when the job is done
for (const j of JOBS) if (GIVER_VOICE[j.giver]) add(GIVER_VOICE[j.giver], j.done, `Job "${j.title}" completed.`);

// Main missions: the giver speaks the quoted words in the brief and the reward
for (const m of Object.values(MISSIONS)) {
  const sp = GIVER_VOICE[m.giver];
  if (!sp) continue;
  for (const q of quotes(m.brief)) add(sp, q, `Mission "${m.title}": handing over the errand.`);
  for (const q of quotes(m.reward.text)) add(sp, q, `Mission "${m.title}": errand done.`);
}

// The auctioneer: fast, clipped sale-room patter
walk('auctioneer', AUCTIONEER, 'Auctioneer at a 1920s sale. Brisk, loud, rhythmic.');

// Number clips for price lines: every price on the merchant's ladder that this speaker can say, with the unit spoken.
const top = (id: string) => {
  const b = BUYERS[id];
  const caps = [b.budget[1], ...b.needs.map((n) => n.budget[1])];
  return Math.max(...caps) * 1.35;
};
const RANGES: Record<string, [number, number]> = { seller: [5, 60000], rashid: [5, 5000], auctioneer: [5, 100000] };
// royals only consider Exceptional and Legendary rugs, so they never name small sums
for (const id of Object.keys(BUYERS)) { const mt = BUYERS[id].royal ? 3 : (BUYER_TIERS[id]?.[0] ?? 1); RANGES[id] = [mt >= 3 ? 1000 : mt === 2 ? 200 : 5, top(id)]; }
for (const [sp, [lo, hi]] of Object.entries(RANGES)) for (const n of ladder(lo, hi)) push(sp, `${sp}/num-${n}.mp3`, spoken(n), 'Price for a price line, unit included. Neutral, mid-sentence intonation.');

const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
const csv = ['speaker,voice_brief,file,text,direction', ...rows.map((r) => [r.speaker, VOICE_BRIEFS[r.speaker] ?? '', r.file, r.text, r.note].map(esc).join(','))].join('\n');
writeFileSync(new URL('../public/voices/voice-script.csv', import.meta.url), csv);
const bySpeaker: Record<string, number> = {};
rows.forEach((r) => (bySpeaker[r.speaker] = (bySpeaker[r.speaker] ?? 0) + 1));
console.log(rows.length, 'clips', JSON.stringify(bySpeaker));
