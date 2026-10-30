// What the encyclopedia's carpet pages teach: how to tell each kind of rug, and what it is passed off as
// or mistaken for, with the test that shows it. The knot, density and foundation come from rugs.ts; the
// dyes from Arran's cards (systems/arranLab.ts) where he has one, otherwise from the line here. Short,
// and in the trade's own words of 1925.
import type { RugType } from '../game/types';
import { RUGS } from './rugs';
import { kindKpsi, densityBand, BAND_WORDS } from '../game/knots';
import { dyeNoteOf } from '../game/systems/arranLab';
import { canAniline, canFakeAge } from '../game/systems/fakes';

interface Lore {
  /** the colours and what they are dyed with, where Arran has no card */
  dyes?: string;
  /** what it is passed off as or mistaken for, and what shows it */
  fakes: string;
}

export const LORE: Record<string, Lore> = {
  'nile-reed': { fakes: 'Sold as a Siwa or Bedouin kilim. Turn it over: a true slit-woven kilim shows the same pattern on both sides, with small slits where two colours meet.' },
  'village-kilim-canal': { fakes: 'Sold as an old Anatolian kilim. The bright red bands are an acid synthetic: a colour rub stains the cloth.' },
  'delta-house': { fakes: 'Sold as Anatolian village work. The knot is the same; the dye test shows a synthetic red, which an Anatolian rug of the 1880s would not have.' },
  'assiut-shawl-rug': { dyes: 'Undyed cream and brown wool.', fakes: 'Sold as Moroccan, or as old. Undyed wool has no dye to test; a knot count and the fresh wool at the roots tell new work from old.' },
  'siwa-kilim': { dyes: 'Ochre, black and undyed white wool.', fakes: 'Mixed up with Bedouin weaving of the Sinai. Siwa bands are weft-faced; a Bedouin tent band is warp-faced, the pattern carried on the long threads.' },
  'fayoum-hearth': { fakes: 'Abrash is imitated by dyeing wool patchily with aniline. True abrash changes in bands across the rug, row by row; the dye test shows madder.' },
  'sinai-tent-band': { dyes: 'Black goat hair, madder red and undyed white wool.', fakes: 'Mistaken for a Siwa kilim. A tent band is warp-faced and often joined from narrow strips; goat hair is coarse and wiry under the microscope.' },
  'red-medina': { fakes: 'A bazaar name, so any red rug gets called Red Medina. Check the symmetrical knot, the wool foundation, and that the red is madder, not a chemical orange.' },
  'persian-baluch': { dyes: 'Dark madder, aubergine and indigo, with a camel-coloured field.', fakes: 'Taken for Turkmen work, which is also dark. A "camel hair" field is often undyed sheep\'s wool: the microscope tells camel hair from wool.' },
  'date-palm-runner': { fakes: 'Runners are cut down from bigger rugs and rebound. Look at the ends: on a cut rug the end is sewn, and the warps do not run out into the fringe.' },
  'persian-hamadan': { dyes: 'Madder red, indigo and ivory, with an undyed camel border.', fakes: 'Sold as Bidjar. A Hamadan has a single weft between the rows of knots, plain on the back, and folds easily; a Bidjar is packed so hard it must be rolled.' },
  'tanta-courtyard': { fakes: 'Light floral rugs are sold as Persian city work. The symmetrical knot at about 90 to the inch says town work, and the red sprays run in a sample wash.' },
  'beni-ouarain': { dyes: 'Undyed ivory wool, with lines of natural black-brown.', fakes: 'New work is bleached white to look like old undyed wool. The microscope shows burnt, brittle tips where chlorine has been.' },
  'canal-ferry-rug': { fakes: 'Sold as an old blue Persian. Synthetic indigo is even from end to end; a vat of natural indigo leaves light and dark bands. The dye test cannot tell plant indigo from synthetic, so judge by the evenness.' },
  'kazak-star': { dyes: 'Madder red, indigo, ivory and a little yellow.', fakes: 'Anatolian workshops copy the Kazak stars. A Kazak has a wool foundation and long glossy pile; a cotton weft means a copy, as the microscope shows.' },
  'desert-star': { fakes: 'Sold as an old Mamluk carpet. The old Mamluk weavers tied the asymmetrical knot on wool; a cotton warp and the Turkish knot say a modern Cairo revival.' },
  'jaffa-citrus': { fakes: 'Sold as Persian. The symmetrical knot on cotton and the synthetic blue in the border rosettes, which the dye test shows, place it as a trade rug.' },
  'yoruk-prayer': { dyes: 'Madder red and indigo, with strong abrash.', fakes: 'Prayer rugs are the favourite of the ageing trade. Real wear is heaviest where knees and hands rest; even wear all over, a tea-brown back and a pumiced pile mean new work.' },
  'baluch-tree': { dyes: 'Aubergine, rust madder and dark indigo.', fakes: 'Taken for Turkmen work. The early aniline purples of the trade fade to a grey-brown at the tips while the roots stay purple; the dye test settles it.' },
  'cairo-garden': { fakes: 'Copies of the Cairo workshop rugs are sold with no paper. This one has its receipt; without papers, a dealer\'s word is all there is.' },
  'bergama-hearth': { dyes: 'Madder red, indigo and a weld yellow in the corners.', fakes: 'Red wefts are the Bergama sign. A copy has undyed or cotton wefts: fold back the end and look between the rows.' },
  'cedar-caravan': { fakes: 'Sold as Caucasian. The magenta in the small trees is an early aniline, faded; the dye test catches it, and it argues against an early date.' },
  'ladik-tulip': { dyes: 'Madder red, weld gold and indigo.', fakes: 'Ladik tulips were copied all over Anatolia, mostly coarser. Count the knots: a Ladik of this quality runs about 90 to the inch, a village copy nearer 60.' },
  'jerusalem-stone': { fakes: 'Its quiet colours tempt dealers to sun new rugs to match. Part the pile: the sun fades the tips and leaves the roots bright.' },
  'melas-arch': { dyes: 'Apricot, weld gold, madder and ivory.', fakes: 'Mistaken for Bergama, which also has red wefts. Melas has the narrow field and the apricot and gold palette; the knot and wefts alone will not separate them.' },
  'anatolian-hearth': { fakes: 'Village pieces like this are sold as "Konya". Without papers the town is a guess: call it central Anatolian.' },
  'persian-afshar': { dyes: 'Madder red, indigo and ivory, a little weld yellow.', fakes: 'Confused with Qashqai and other tribal rugs of the south. The boteh lattice, the wool foundation and slightly uneven rows point to the Afshar.' },
  'aleppo-courtyard': { fakes: 'Sold as old. The synthetic orange in the minor border gives it away: the dye test shows it.' },
  'shirvan-garden': { dyes: 'Indigo, ivory and madder, with small touches of yellow.', fakes: 'Shirvan and Kuba work are neighbours and dealers swap the names. Shirvan more often has cotton wefts and a short pile; a fibre test on a weft shows which.' },
  'karabagh-rose': { dyes: 'Madder reds and rose, with an iron-mordanted black.', fakes: 'Rose rugs are copied in Anatolia for the European trade. An old black corrodes, so the pile there sits lower than the colours round it; a new black stands level.' },
  'damascus-blue': { fakes: 'Its fine knotting gets it sold as Persian city work, and as older than it is. A knot count, then the colour rub and the sample wash for a stained age, settle it.' },
  'persian-qashqai': { dyes: 'Bright madder red, indigo, ivory and weld yellow.', fakes: 'Shiraz market rugs are sold as tribal Qashqai. Tribal work has glossy wool and ivory warps on a wool foundation; a town copy is flatter: look at the fringe.' },
  'persian-bakhtiari': { dyes: 'Madder red, indigo, ivory and a vegetable green.', fakes: 'The garden-panel design is woven in many towns, so the design alone does not place it. A firm, heavy back on cotton fits Chahar Mahal.' },
  'persian-heriz': { dyes: 'Brick madder, indigo, ivory and a soft blue.', fakes: 'Sold as "Serapi" for a higher price, a name the trade keeps for the finer old Heriz. Count the knots: an ordinary Heriz is coarse, about 60 to the inch.' },
  'persian-joshaghan': { dyes: 'Madder red, indigo, ivory and weld gold.', fakes: 'The lattice of small diamonds is copied by neighbouring villages. Without the route, call it "Joshaghan design".' },
  'persian-mashhad': { dyes: 'Cochineal red with a purple cast, indigo and ivory.', fakes: 'Jufti knots, tied over four warps, halve the work and the real density. They show as wide knots on the back; a knot count gives the true figure, not the one claimed.' },
  'persian-senneh': { dyes: 'Indigo, madder, ivory and a little gold.', fakes: 'So fine that it is sold as Persian-knotted city work, but Senneh is tied with the symmetrical knot. Feel the back: gritty, like sandpaper.' },
  'konya-prayer-rug': { dyes: 'Madder red, indigo and weld yellow.', fakes: 'Many central Anatolian prayer rugs are called Konya in the bazaar. The name is a habit, not proof.' },
  'oushak-medallion': { dyes: 'Soft madder terracotta, sage green and ivory.', fakes: 'Oushak colours fade gently, so new pieces are washed in chlorine to match. The microscope shows burnt, brittle wool tips.' },
  'moroccan-ember': { fakes: 'Sold as Anatolian village work; the hooked motifs are shared. Henna orange and a heavy wool handle point to North Africa.' },
  'persian-sarouk': { dyes: 'Madder rose-red and indigo, with blue wefts.', fakes: 'Many Sarouks for the American trade are washed in chemicals and the red painted back in. Look at the knot roots on the back: painted colour stops at the surface.' },
  'feraghan-herati': { dyes: 'Indigo, madder and a copper-mordanted green.', fakes: 'The green tells an old Feraghan: it corrodes, so the green pile sits lower than its neighbours. A new green stands level.' },
  'golden-palm': { fakes: 'Sold as late 19th-century work. The gold ground is a chrome-mordanted synthetic yellow: the dye test shows it, and it argues against the date.' },
  'persian-tabriz': { dyes: 'Ivory, madder, indigo and a soft green, often cochineal in the finer pieces.', fakes: 'Tabriz workshops copy every design, so the drawing proves nothing. The symmetrical knot on cotton does; a Kerman or Kashan is tied asymmetrical.' },
  'cairo-mamluk': { dyes: 'Madder crimson, green and blue.', fakes: 'Revival pieces are sold as true Mamluk carpets. Those were wool on wool and centuries older; this is cotton-founded and documented by its workshop: sell it as revival.' },
  'persian-kerman': { dyes: 'Soft rose, pale blue and ivory, from madder, cochineal and indigo.', fakes: 'Kerman designs are copied in the Arak villages for the American trade. A Kerman has three wefts between the rows of knots: count them at the end where the fringe begins.' },
  'khotan-pomegranate': { dyes: 'Apricot, indigo and madder, often with early aniline.', fakes: 'Khotan, Yarkand and Kashgar work are lumped together by dealers. The apricot fields fade when the dye is aniline; the dye test shows which.' },
  'persian-isfahan': { dyes: 'Madder red, ivory, indigo and turquoise.', fakes: 'The Isfahan looms only reopened about 1920; new work is sold as old Safavid. A knot count and fresh, unworn wool at the roots show it.' },
  'caucasus-eagle': { fakes: '"Eagle" rugs are much copied. An old one has wool wefts and browns corroded low in the pile; a copy has even colour and often cotton wefts.' },
  'bidjar-iron': { dyes: 'Madder red, deep indigo and ivory.', fakes: 'Sold as Hamadan, or a Hamadan sold as Bidjar. A Bidjar is packed so hard with heavy wefts that folding cracks it; it is rolled. A Hamadan has a single weft and folds easily.' },
  'persian-kashan': { dyes: 'Deep madder or cochineal red, indigo and ivory; blue wefts.', fakes: '"Kork" is claimed for any soft wool. Kork is the winter wool from the lamb\'s neck, fine and lustrous; under the microscope ordinary wool is thicker.' },
  'sapphire-night': { fakes: 'Sold simply as "Persian", with no town. Its dealer\'s papers count for more than any test.' },
  'damascus-rose': { fakes: 'Silk highlights are claimed for mercerised cotton. Under the microscope silk is a smooth rod, mercerised cotton a flat twisted ribbon. A burnt thread of silk smells of hair, cotton of paper.' },
  'hereke-silk': { dyes: 'Dyed silk in soft court colours, with gold thread.', fakes: 'The most copied name in the trade: Kayseri copies in mercerised cotton and art silk are sold as silk Hereke. The microscope or a burnt thread shows it.' },
  'istanbul-tulip': { fakes: 'Its highlights are mercerised cotton, honestly described as "bright as silk". Anyone who sells it as silk is wrong: the microscope shows the twisted ribbon.' },
  'polonaise-silk': { dyes: 'Silk in faded peach and pistachio, with silver-gilt thread.', fakes: 'Copies use brass for the metal thread. True metal thread is silver-gilt wound on silk; brass tarnishes green.' },
  'baghdad-night': { fakes: 'Fine copies of old designs are sold as the old pieces themselves. This one is honestly sold as after an old design; check the papers.' },
  'shah-treasury': { dyes: 'Cochineal reds, indigo and many silk colours.', fakes: 'The story of the Shah\'s treasury cannot be proved or disproved. Sell the carpet, not the legend.' },
};

const KNOT_LOOK: Record<'sym' | 'asym' | 'flat', string> = {
  sym: 'Symmetrical (Turkish): the yarn wraps both warps, so each knot on the back shows as two even bumps side by side.',
  asym: 'Asymmetrical (Persian): the yarn wraps one warp and passes under the next, so the knots on the back lean to one side.',
  flat: 'No knots: a flatweave, the colours woven in, with small slits where two colours meet.',
};
const knotKind = (t: RugType) => (/^flat/i.test(t.weave.knot) ? 'flat' : /asym/i.test(t.weave.knot) ? 'asym' : 'sym');

export interface TellRow { label: string; text: string }

/** "How to tell it": knot, density, foundation, colours and dyes, the back */
export function howToTell(t: RugType): TellRow[] {
  const k = kindKpsi(t);
  const dyes = dyeNoteOf(t.id) ?? LORE[t.id]?.dyes ?? null;
  const dyeLine = dyes ? `${dyes.charAt(0).toUpperCase()}${dyes.slice(1).replace(/\.$/, '')}.` : '';
  return [
    { label: 'Knot', text: KNOT_LOOK[knotKind(t)] },
    { label: 'Density', text: k == null ? 'No pile, so no knots to count.' : `${t.weave.kpsi.replace(/^about/, 'About')}: ${BAND_WORDS[densityBand(k)]}.` },
    { label: 'Foundation', text: `${t.weave.foundation}.` },
    { label: 'Colours', text: `${t.colourWords.charAt(0).toUpperCase()}${t.colourWords.slice(1)}.${dyeLine ? ` ${dyeLine}` : ''}` },
    { label: 'The back', text: t.backNote },
  ];
}

/** "Common fakes or confusions": the line here, then the faults any rug of its kind may carry */
export function fakesOf(t: RugType): string[] {
  const out: string[] = [];
  if (LORE[t.id]) out.push(LORE[t.id].fakes);
  if (canFakeAge(t)) out.push(`Sold as ${t.age} when it is new work washed in tea or chlorine: a right knot count shows crisp, unworn knots; a colour rub brings off a buff stain; the microscope shows burnt wool tips.`);
  if (canAniline(t.id)) out.push('Aniline reds passed off as madder: a colour rub or a sample wash shows colour that runs.');
  return out;
}

/** every rug the encyclopedia lists has its lore (checked by tests/rug-craft.ts) */
export const loreMissing = () => Object.keys(RUGS).filter((id) => !RUGS[id].own && !LORE[id]);
