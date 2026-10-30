// What a new merchant is shown, and when. Day one is the stall, Rashid, Malek and Bilgin; the rest of the
// game's trades and services come into view at the moment they first matter, each with one short line.
// Nothing here is a new saved field: an opened system is marked in tipsSeen ('open-<id>'), so it stays
// open. A game that skipped the opening (or the test switch, or Sandbox) sees everything, and an older
// save already under way is marked 'open-all' by the save migration.
import type { GameState } from './state/store';
import { OPENING, openingSkipped, openingStep } from './opening';
import { housesIn } from './auction/sessions';
import { venuesIn } from '../data/entertainment';
import { eyeOf, flawNotes } from './systems/fakes';
import { BOY_OFFERED } from './systems/stallNight';
import { settlementById } from './systems/world';

type S = GameState;
export type Sys = 'caravan' | 'abroad' | 'auction' | 'bank' | 'cabaret' | 'lab' | 'clinic' | 'boy';
export const ALL_OPEN = 'open-all';
const mark = (k: Sys) => `open-${k}`;

/** the opening has run to its end (not skipped) */
const finished = (s: S) => !!s.started && !openingSkipped(s) && !openingStep(s);
/** the opening has reached (or passed) the step with this id */
const reached = (s: S, id: string) => {
  if (finished(s)) return true;
  const cur = openingStep(s);
  return !!cur && cur.n >= OPENING.findIndex((x) => x.id === id);
};
const count = (r?: Partial<Record<string, number>>) => Object.values(r ?? {}).reduce<number>((a, n) => a + (n ?? 0), 0);
const evening = (s: S) => s.world.hour >= 18 || s.world.hour < 2;

interface Rule {
  /** the moment it opens (or proof it was already used) */
  when: (s: S) => boolean;
  /** the one line said when it opens; '' to open quietly (it has its own moment elsewhere) */
  line: (s: S) => string;
  /** shown where a dimmed thing stands in for it */
  later: string;
}

export const UNLOCKS: Record<Sys, Rule> = {
  // the guard yard, the animal market and the Caravan screen: when the opening asks for a guard
  caravan: {
    when: (s) => reached(s, 'guards') || count(s.world.party.troops) > 0 || count(s.world.party.animals) > 0,
    line: () => 'The guard yard and the animal market are open to you. Your men and animals are kept under Caravan.',
    later: 'Opens when you need men for the road.',
  },
  // the wider world: ships, the Passport Office, telegraph offices and the palaces, once Rashid's errand is done
  abroad: {
    when: (s) => finished(s) || !!s.passport,
    line: () => 'Rashid\'s errand is done and the roads are open: ships, telegraph offices, the Passport Office and the palaces now show in the towns.',
    later: 'Opens once Rashid\'s errand in Alexandria is done.',
  },
  // the sale rooms: the first time, after the opening, you stand in a town that has one
  auction: {
    when: (s) => (finished(s) && !!s.world.at && housesIn(s.world.at).length > 0) || s.missions?.auction === 'active'
      || Object.keys(s.world.walks ?? {}).some((k) => k.startsWith('auction-')) || (s.stats?.auctionsWon ?? 0) > 0,
    line: (s) => `${s.world.at ? settlementById(s.world.at).name : 'This town'} has an auction house. Sales are held on set days; the town menu gives the next one.`,
    later: 'Opens after Rashid\'s errand.',
  },
  // the moneylender, the bank and Lloyd's agent: when money runs short, or after a week on your own
  bank: {
    when: (s) => (finished(s) && (s.cash < 50 || s.day >= 8)) || (s.loans ?? []).length > 0 || !!s.insurance,
    line: (s) => `${s.cash < 50 ? 'Money is short. ' : ''}The Khan moneylender and the Banque Misr will now deal with you, in Cairo and Alexandria: loans, and insurance for your cargo.`,
    later: 'Opens later in the game.',
  },
  // cabarets and theatres: an evening in a town that has one
  cabaret: {
    when: (s) => (finished(s) && !!s.world.at && venuesIn(s.world.at).length > 0 && evening(s)) || Object.keys(s.venues ?? {}).length > 0,
    line: (s) => `Evening in ${s.world.at ? settlementById(s.world.at).name : 'town'}, and the cabarets are open. Merchants and buyers take tables there.`,
    later: 'Opens in the evenings, after the opening.',
  },
  // Arran's laboratory (and the libraries that serve it): the first rug you have reason to doubt
  lab: {
    when: (s) => !!s.tutorial?.done && (
      s.inventory.some((i) => i.flawKnown || i.provenance === 'Disputed' || flawNotes(i, eyeOf(s)).length > 0)
      || (s.tipsSeen ?? []).some((t) => t === 'fakes' || t === 'arran-fakes')
      || (s.arranFindings ?? []).length > 0 || (s.labUnlocked ?? []).length > 0 || !!s.arranVisit),
    line: () => 'A doubtful rug. Arran Embleton, the textile chemist in Giza, can test its wool and dyes at his laboratory.',
    later: 'Opens when a rug gives you reason to doubt it.',
  },
  // Dr Feras and the chemist: when you fall ill, or once the opening is behind you
  clinic: {
    when: (s) => finished(s) || (s.illnesses ?? []).length > 0,
    line: (s) => ((s.illnesses ?? []).length ? 'You are unwell. Dr Feras keeps a clinic in Cairo.' : ''),
    later: 'Opens when you need a doctor.',
  },
  // the boy who minds the stall: Haj Mahmoud's morning offer after a buyer is lost is his moment
  boy: {
    when: (s) => !!s.shopBoy || (s.tipsSeen ?? []).includes(BOY_OFFERED),
    line: () => '',
    later: 'Opens when a buyer has been lost while you were away.',
  },
};
export const SYSTEMS = Object.keys(UNLOCKS) as Sys[];

/** everything is open: the opening was skipped (or the test switch, or Sandbox), or an older save under way */
export const allOpen = (s: S) => openingSkipped(s) || (s.tipsSeen ?? []).includes(ALL_OPEN);

/** is this part of the game shown yet? */
export function isOpen(s: S, k: Sys): boolean {
  return allOpen(s) || (s.tipsSeen ?? []).includes(mark(k)) || UNLOCKS[k].when(s);
}

/** systems whose moment has come but are not yet marked: the caller marks them and says the lines */
export function newlyOpen(s: S): { k: Sys; mark: string; line: string }[] {
  if (!s.started || allOpen(s)) return [];
  const seen = s.tipsSeen ?? [];
  return SYSTEMS.filter((k) => !seen.includes(mark(k)) && UNLOCKS[k].when(s)).map((k) => ({ k, mark: mark(k), line: UNLOCKS[k].line(s) }));
}

/** For the save migration: an older save under way sees everything, as it did; one on its first days
 *  keeps what it has already met (marked quietly) and meets the rest at its moment. */
export function migrateOpen(s: S): string[] {
  const seen = s.tipsSeen ?? [];
  if (!s.started || seen.includes(ALL_OPEN)) return seen;
  const underway = openingSkipped(s) || finished(s) || s.day >= 3;
  if (underway) return [...seen, ALL_OPEN];
  return [...seen, ...SYSTEMS.filter((k) => !seen.includes(mark(k)) && UNLOCKS[k].when(s)).map(mark)];
}

// ---- the Persian road (save 24) ----
// Persia is on the map from the start, greyed. It opens to a merchant with shops in Baghdad and two other
// cities (the shops system keys them by settlement id; the Khan el-Khalili shop counts as Cairo) and a
// Persian visa from the consulate in Baghdad.
/** the cities where you keep a shop */
export function shopTowns(s: S): string[] {
  const keyed = Object.keys((s as unknown as { shops?: Record<string, unknown> }).shops ?? {});
  return [...new Set([...keyed, ...((s.upgrades ?? []).includes('khan') ? ['cairo'] : [])])];
}
export function persiaOpen(s: S): boolean {
  const shops = shopTowns(s);
  return shops.includes('baghdad') && shops.length >= 3 && !!s.persianVisa;
}
/** what still keeps the road shut, in a line */
export function persiaWhy(s: S): string {
  const shops = shopTowns(s);
  const need: string[] = [];
  if (!shops.includes('baghdad')) need.push('a shop in Baghdad');
  const others = shops.filter((t) => t !== 'baghdad').length;
  if (others < 2) need.push(others === 1 ? 'a shop in one more city' : 'shops in two other cities');
  if (!s.persianVisa) need.push('a Persian visa from the consulate in Baghdad');
  if (!need.length) return 'The road to Persia is open.';
  if (need.length === 3) return 'Opens to a merchant with shops in Baghdad and two other cities, and a Persian visa from the consulate in Baghdad.';
  return `Opens with shops in Baghdad and two other cities, and a Persian visa. Still to get: ${need.join(', ')}.`;
}
