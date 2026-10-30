// The rug-craft fixes from the weaving playtest: the encyclopedia's carpet pages teach (knot, density,
// foundation, dyes, the back, fakes), every back agrees with its density band, articles read right,
// each condition offers a choice of treatments, the knot count reads the band, the lab agrees with the
// catalogue on the sample wash, Arran's scene follows the test in hand, and the loom shows the field and
// border you chose.
//   npx tsx tests/rug-craft.ts
import { RUGS } from '../src/data/rugs';
import { LORE, howToTell, fakesOf, loreMissing } from '../src/data/rugLore';
import { kindKpsi, densityBand, BAND_FORBIDS, knotVerdict, densityLine } from '../src/game/knots';
import { withArticle } from '../src/game/text';
import { TREATMENTS, treatmentFor } from '../src/data/suppliers';
import { serviceBook } from '../src/game/systems/arranBooks';
import { pickArranScene } from '../src/game/systems/arranScenes';
import { knowFlaw, flawNotes } from '../src/game/systems/fakes';
import { resolveFinding } from '../src/game/systems/arranLab';
import { knotMap } from '../src/game/loom/render';
import { newDesign, withPalette, rugTypeOf } from '../src/game/loom/design';
import { BORDER } from '../src/game/loom/patterns';
import type { RugItem } from '../src/game/types';

let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fails++; };

// 1. every carpet in the encyclopedia has its lore, and the pages say the things a dealer checks
ok(loreMissing().length === 0, `lore for every carpet (missing: ${loreMissing().join(', ') || 'none'})`);
ok(Object.keys(LORE).every((id) => RUGS[id]), 'no lore for a rug that does not exist');
for (const id of Object.keys(RUGS)) {
  const t = RUGS[id];
  const rows = howToTell(t);
  if (rows.map((r) => r.label).join() !== 'Knot,Density,Foundation,Colours,The back' || rows.some((r) => !r.text.trim())) { ok(false, `${id}: how to tell it`); continue; }
  if (!fakesOf(t).length) ok(false, `${id}: no fakes or confusions`);
}
const knotOf = (id: string) => howToTell(RUGS[id])[0].text;
for (const id of ['persian-senneh', 'persian-tabriz', 'persian-heriz', 'bidjar-iron']) ok(/^Symmetrical/.test(knotOf(id)), `${id}: symmetrical`);
for (const id of ['persian-sarouk', 'persian-kerman', 'persian-mashhad']) ok(/^Asymmetrical/.test(knotOf(id)), `${id}: asymmetrical`);
ok(/triple weft/i.test(howToTell(RUGS['persian-kerman'])[2].text), 'Kerman: triple weft');
ok(/kork/i.test(fakesOf(RUGS['persian-kashan'])[0]), 'Kashan: kork wool');
ok(/red weft/i.test(fakesOf(RUGS['bergama-hearth'])[0]) && /red weft/i.test(fakesOf(RUGS['melas-arch'])[0]), 'Bergama and Melas: red wefts');
ok(/^No knots/.test(knotOf('nile-reed')) && /No pile/.test(howToTell(RUGS['nile-reed'])[1].text), 'a flatweave has no knots to count');
const words = Object.keys(RUGS).flatMap((id) => [...howToTell(RUGS[id]).map((r) => r.text), ...fakesOf(RUGS[id])]).join(' ');
ok(!/\b(delve|tapestry of|vibrant|crucial|testament|realm|seamless|robust)\b/i.test(words), 'no modern trade words in the lore');

// 2. every back agrees with its density band (Red Medina at 60 is not "dense")
for (const id of Object.keys(RUGS)) {
  const k = kindKpsi(RUGS[id]);
  if (k == null) continue;
  const bad = BAND_FORBIDS[densityBand(k)];
  if (bad && bad.test(RUGS[id].backNote)) ok(false, `${id}: back "${RUGS[id].backNote}" at ${k} knots (${densityBand(k)})`);
}
ok(!/dense/i.test(RUGS['red-medina'].backNote), 'Red Medina back is not "dense"');
ok(densityBand(60) === 'village' && densityBand(120) === 'town' && densityBand(250) === 'city', 'bands follow the loom: village 60, town 120, city 250');
ok(/village knotting/.test(densityLine(RUGS['red-medina'])), `Weave tab: ${densityLine(RUGS['red-medina'])}`);
ok(/village knotting/.test(knotVerdict({ counted: 60, truth: 60, ok: true, day: 1 }, 'red-medina')), 'a count of 60 reads village knotting');

// 3. articles
ok(withArticle('indigo') === 'an indigo' && withArticle('undyed ivory') === 'an undyed ivory' && withArticle('madder red') === 'a madder red', 'a/an by the vowel');
ok(withArticle('usual pattern') === 'a usual pattern' && withArticle('hour') === 'an hour' && withArticle('European') === 'a European', 'a/an by the sound');
const tab = rugTypeOf({ ...withPalette(newDesign(1), 'tabriz'), band: 'kufic', field: 'herati', medallion: 'round' });
ok(!/\ba [aeiou]/i.test(`${tab.colourWords} ${tab.history}`), `own design words: "${tab.colourWords}"`);

// 4. a choice of treatments for every condition that wants one, each to a different condition
for (const c of ['Dirty', 'Worn', 'Damaged'] as const) {
  const t = TREATMENTS[c];
  ok(t.length >= 2 && new Set(t.map((x) => x.to)).size === t.length && t.some((x) => x.mult === 1), `${c}: ${t.map((x) => `${x.short} to ${x.to}`).join(', ')}`);
  ok(treatmentFor(c)?.mult === 1 && treatmentFor(c, t[t.length - 1].id) === t[t.length - 1], `${c}: the usual job by default, the chosen one by id`);
}
ok(TREATMENTS.Good.length === 0 && TREATMENTS.Excellent.length === 0, 'nothing to do for a rug in good order');

// 5. the catalogue and the Test tab follow one rule: the sample wash needs no book
ok(serviceBook('wash') === null && serviceBook('fastness') === null && serviceBook('fibre') === 'fibres', 'wash and rub need no book; fibre needs Matthews');

// 6. a proven fake is proven; a right knot count alone is a strong doubt
const dam: RugItem = { uid: 'd1', typeId: 'damascus-blue', condition: 'Good', restored: false, provenance: 'Likely', paid: 900, notes: [], fakeAge: true };
const rub = resolveFinding(dam, 'fastness', 3);
ok(rub.verdict === 'inconsistent' && /buff brown/.test(rub.evidence.join(' ')), 'the rub catches a tea-stained age');
ok(knowFlaw(dam, 'age', { findings: [rub] }) === 'proven', 'after the rub the age is proven');
ok(knowFlaw(dam, 'age', { knots: ['d1'] }) === 'hint', 'after a right knot count, a doubt');
ok(flawNotes(dam, { findings: [rub] })[0]?.text === 'New work, washed to look old', 'stock line says so');

// 7. Arran's scene follows the test done today
const sc = (service: 'fastness' | 'fibre', verdict: 'consistent' | 'inconsistent') => pickArranScene({ day: 5, hour: 10, arranFindings: [{ id: 'x', subjectId: 'r', service, verdict, confidence: 'strong', claim: '', evidence: [], limitations: [], day: 5 }] }).scene.n;
ok(sc('fastness', 'inconsistent') === 2 && sc('fastness', 'consistent') === 3 && sc('fibre', 'consistent') === 1, 'a rub or a fibre test today brings a scene about it');

// 8. the loom: the chosen field shows round a medallion, and the border pattern stands out from the border
const SLOT = ['ground', 'ground2', 'main', 'accent', 'light', 'border', 'outline'];
for (const pal of ['tabriz', 'heriz', 'kazak']) {
  const d = { ...withPalette(newDesign(1), pal), layout: 'medallion', medallion: 'round', field: 'herati', band: 'kufic' };
  const m = knotMap(d);
  // the field outside the medallion and corners: count knots in figure colours
  const fx0 = Math.round(m.w * 0.22), fx1 = Math.round(m.w * 0.3), fy0 = Math.round(m.h * 0.3), fy1 = Math.round(m.h * 0.7);
  let fig = 0, all = 0;
  for (let y = fy0; y < fy1; y++) for (let x = fx0; x < fx1; x++) { all++; if (['main', 'accent', 'light'].includes(SLOT[m.k[y * m.w + x]])) fig++; }
  ok(fig / all > 0.08, `${pal}: herati figures beside the medallion (${Math.round((fig / all) * 100)}% of the field there)`);
  // the border band along the top edge, in its middle depth
  const by = Math.round(m.h * 0.08);
  const seen = new Set<string>();
  for (let x = Math.round(m.w * 0.2); x < m.w * 0.8; x++) seen.add(SLOT[m.k[by * m.w + x]]);
  ok([...seen].some((s) => s !== 'border' && s !== 'outline'), `${pal}: the ${BORDER.find((b) => b.id === 'kufic')!.name} shows in the border (${[...seen].join(', ')})`);
}

console.log(fails ? `\n${fails} failed` : '\nall passed');
process.exit(fails ? 1 : 0);
