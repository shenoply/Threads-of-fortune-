// A carpet of your own design: the choices, what the weaver charges and how long it takes, and the
// carpet it becomes in the game (a rug type of its own, sold like any other).
import type { RugType, Trait } from '../types';
import { BASE_COST, BORDER, DEAR_DYE, FIELD, GUARD, KNOTS, LAYOUT, MEDALLION, PALETTES, SIZES, WOOL } from './patterns';

export interface Design {
  id: string;
  name: string;
  size: string;
  layout: string;
  palette: string;
  /** dye index (into the palette) for each place */
  ground: number; ground2: number; main: number; accent: number; light: number; border: number;
  field: string;
  medallion: string;
  band: string;
  guard: string;
  knots: string;
  wool: string;
  /** shown and woven upright (figures pointing along the carpet) or sideways (across it) */
  orient?: 'side' | 'up';
}

const by = <T extends { id: string }>(list: T[], id: string) => list.find((x) => x.id === id) ?? list[0];
export const parts = (d: Design) => ({
  size: by(SIZES, d.size), layout: by(LAYOUT, d.layout), palette: by(PALETTES, d.palette), field: by(FIELD, d.field),
  medallion: by(MEDALLION, d.layout === 'medallion' ? d.medallion : 'none'), band: by(BORDER, d.band), guard: by(GUARD, d.guard),
  knots: by(KNOTS, d.knots), wool: by(WOOL, d.wool),
});

export function newDesign(n: number): Design {
  const p = PALETTES[0];
  const [ground, ground2, main, accent, light, , border] = p.roles;
  return { id: `own-${n}`, name: '', size: 'rug', layout: 'medallion', palette: p.id, ground, ground2, main, accent, light, border, field: 'lozenge', medallion: 'stepped', band: 'meander', guard: 'dots', knots: 'coarse', wool: 'village' };
}

/** put a palette's own colours in their places */
export function withPalette(d: Design, id: string): Design {
  const p = by(PALETTES, id);
  const [ground, ground2, main, accent, light, , border] = p.roles;
  return { ...d, palette: p.id, ground, ground2, main, accent, light, border };
}

const lum = (hex: string) => { const n = parseInt(hex.slice(1), 16); return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
/** the dyes actually used, with the dark outline the weaver adds */
export function colours(d: Design) {
  const { palette } = parts(d);
  const dyes = palette.dyes;
  const pick = (i: number) => dyes[Math.max(0, Math.min(dyes.length - 1, i))];
  const outline = [...dyes].sort((a, b) => lum(a.hex) - lum(b.hex))[0];
  let main = pick(d.main), light = pick(d.light), accent = pick(d.accent);
  const ground = pick(d.ground), ground2 = pick(d.ground2), border = pick(d.border);
  // a figure the same tone as its ground would vanish: the weaver lifts it with the light wool
  const lightest = [...dyes].sort((a, b) => lum(b.hex) - lum(a.hex))[0];
  if (A(lum(main.hex) - lum(ground.hex)) < 0.12) main = A(lum(lightest.hex) - lum(ground.hex)) > 0.25 ? lightest : outline;
  if (A(lum(light.hex) - lum(main.hex)) < 0.1) light = lightest !== main ? lightest : outline;
  if (accent === main) accent = light;
  return { ground, ground2, main, accent, light, border, outline };
}
const A = Math.abs;

/** what the weaver asks, in piastres */
export function costOf(d: Design) {
  const p = parts(d);
  const labour = BASE_COST * p.size.area * p.knots.price * p.wool.price;
  const pattern = (p.field.cost + p.medallion.cost + p.band.cost + p.guard.cost + p.layout.cost) * Math.sqrt(p.size.area) * p.knots.price;
  const c = colours(d);
  const dear = new Set([c.ground, c.ground2, c.main, c.accent, c.light, c.border].filter((x) => x.dear).map((x) => x.name)).size;
  const dyes = dear * DEAR_DYE * p.size.area;
  return Math.round((labour + pattern + dyes) / 5) * 5;
}
/** days on the loom */
export function daysOf(d: Design) {
  const p = parts(d);
  return Math.max(1, Math.round(p.size.days * p.knots.days * (p.wool.id === 'allsilk' ? 1.4 : 1) + (p.medallion.id !== 'none' ? 1 : 0)));
}
/** what a carpet like this fetches: a little over what it cost to make, more for fine work */
export function valueOf(d: Design): [number, number] {
  const c = costOf(d), p = parts(d);
  const fine = p.knots.id === 'fine' ? 0.15 : p.knots.id === 'medium' ? 0.07 : 0;
  const silk = p.wool.sheen * 0.12;
  return [Math.round(c * (1.08 + fine) / 5) * 5, Math.round(c * (1.62 + fine + silk) / 5) * 5];
}

export function traitsOf(d: Design): Trait[] {
  const p = parts(d), c = colours(d);
  const t = new Set<Trait>(p.wool.traits);
  t.add(lum(c.ground.hex) < 0.35 ? 'darkField' : 'lightField');
  const warm = [c.ground, c.main, c.border].filter((x) => /madder|rose|apricot|saffron|weld|camel/.test(x.name)).length;
  t.add(warm >= 2 ? 'warm' : 'cool');
  if (p.knots.id === 'fine') t.add('fineWeave');
  if (p.medallion.id !== 'none' || p.layout.id === 'prayer' || p.band.cost >= 14) t.add('ornate'); else t.add('restrained');
  if (A(lum(c.main.hex) - lum(c.ground.hex)) > 0.35) t.add('bold');
  if (p.knots.id === 'coarse' && p.wool.id === 'village') t.add('humble');
  t.add('story');
  return [...t];
}

const tierOf = (cost: number): 1 | 2 | 3 | 4 => (cost < 400 ? 1 : cost < 1200 ? 2 : cost < 4000 ? 3 : 4);

export function rugTypeOf(d: Design): RugType {
  const p = parts(d), c = colours(d);
  const cost = costOf(d), band = valueOf(d);
  const name = d.name.trim() || defaultName(d);
  const fam = /madder|rose/.test(c.ground.name) ? 'crimson' : /indigo|sky|teal/.test(c.ground.name) ? 'indigo' : /ivory|cream/.test(c.ground.name) ? 'ivory' : /weld|saffron|apricot|camel/.test(c.ground.name) ? 'gold' : 'mixed';
  return {
    id: d.id, name, own: true,
    origin: 'Your own design, woven at Kerdasa by Giza', material: p.wool.id === 'allsilk' ? 'Silk' : p.wool.id === 'silk' ? 'Wool with silk highlights' : p.wool.id === 'kork' ? 'Kork wool' : 'Wool',
    age: 'New work', size: p.size.cm, colourFamily: fam,
    colourWords: `${c.ground.name} ground, ${c.main.name} and ${c.accent.name} figures, a ${c.border.name} border`,
    rarity: 'Uncommon', tier: tierOf(cost), provenance: 'Documented',
    dealerCost: cost, valueBand: band, asking: Math.round(band[1] * 0.95 / 5) * 5,
    traits: traitsOf(d),
    history: `Your own design: ${p.layout.name.toLowerCase()} layout${p.medallion.id !== 'none' ? ` with a ${p.medallion.name.toLowerCase()}` : ''}, ${p.field.name.toLowerCase()} figures and a ${p.band.name.toLowerCase()} border, in the ${p.palette.name} colours.`,
    storyLine: `I drew this one myself and had it woven at Kerdasa, up the road. There is not another like it anywhere.`,
    craftLine: `${p.knots.name}, ${p.wool.name.toLowerCase()}. ${p.field.line}`,
    durabilityLine: p.wool.id === 'allsilk' ? 'Silk: for a wall or a quiet room, not for boots.' : 'New wool, tightly knotted. It will see out the house.',
    weave: { knot: p.knots.id === 'fine' ? 'Asymmetrical (Persian)' : 'Symmetrical (Turkish)', kpsi: p.knots.kpsi, foundation: p.knots.id === 'coarse' ? 'Wool warp and weft' : 'Cotton warp and weft' },
    fringe: 'New cotton fringe, complete', backNote: 'Clean, even knots on the back; the design shows through clearly.',
    art: { kind: 'design', design: d },
  };
}

export function defaultName(d: Design) {
  const p = parts(d);
  const what = p.medallion.id !== 'none' ? p.medallion.name : p.layout.id === 'prayer' ? 'Prayer rug' : p.field.name;
  return `${p.palette.name} ${what}`.replace(/\b(\w)/g, (m) => m.toUpperCase());
}

/** your own loom house at Kerdasa: what it costs, and what it changes */
export const WORKSHOP_PRICE = 6000;
export const WORKSHOP_LINE = 'A loom house of your own at Kerdasa: carpets cost a fifth less, come off the loom a quarter sooner, a second loom, and the fine city knot and silk.';
/** what needs your own workshop: the finest knot and silk */
export const needsWorkshop = (d: Pick<Design, 'knots' | 'wool'>) => d.knots === 'fine' || d.wool === 'silk' || d.wool === 'allsilk';
/** what you pay: the weaver's price, a fifth less in your own workshop */
export const priceOf = (d: Design, owned: boolean) => (owned ? Math.round((costOf(d) * 0.8) / 5) * 5 : costOf(d));
/** days on the loom, a quarter fewer in your own workshop */
export const daysFor = (d: Design, owned: boolean) => (owned ? Math.max(1, Math.round(daysOf(d) * 0.75)) : daysOf(d));
/** how many carpets can be on the looms at once: one at the weaver's, two in your own house, and one more as your name grows */
export const loomsFree = (rank: number, owned = false) => 1 + (owned ? 1 : 0) + (rank >= 3 ? 1 : 0);
