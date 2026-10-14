// Road stories: when a small happening finds a walking caravan, and what it does.
// Data in data/roadEvents.ts. Nothing here stops the walk: the map shows a passing line, or a card
// with a choice that the caravan walks on beside and that settles itself if left alone.
import { ROAD_EVENTS, roadEventById, type RoadChoice, type RoadEvent, type RoadFx } from '../../data/roadEvents';
import { RUGS, RUG_IDS } from '../../data/rugs';
import { useGame, type GameState } from '../state/store';
import { rollFor } from './fieldwork';
import { capacity, troopCount, MORALE_START } from './caravan';
import { terrainAt, settlementById, type Pt } from './world';
import { newUid } from '../economy/economy';
import { fmt } from '../economy/money';
import { rumoursOn } from '../economy/life';
import { openingStep } from '../opening';
import type { RugItem } from '../types';

/** at least a day of road between two happenings */
export const GAP_HOURS = 24;
/** the chance, each hour of walking once the gap has passed (about one in a day and a half of road) */
export const HOURLY_CHANCE = 1 / 14;
/** none in the first hours of a walk, while the town is still in sight */
const GRACE_HOURS = 3;
/** a card left alone settles itself after an hour on the road, and never sooner than this on the screen */
export const CARD_HOURS = 1;
export const CARD_MIN_MS = 8000;

const absHour = (s: Pick<GameState, 'day'> & { world: { hour: number } }) => s.day * 24 + s.world.hour;

/** forced from a test: the next hour of walking brings this event, whatever the pacing */
let forced: string | null = null;
export function forceRoadEvent(id: string) { forced = roadEventById(id) ? id : null; return !!forced; }
if (typeof window !== 'undefined') (window as unknown as { __tofRoad?: typeof forceRoadEvent }).__tofRoad = forceRoadEvent;

/** a new walk begins from a town: counted, so the first walk of a new game is left in peace */
export function walkBegun() {
  const s = useGame.getState();
  const r = s.roadStories ?? { lastAt: -999, recent: [], walks: 0 };
  useGame.setState({ roadStories: { ...r, walks: r.walks + 1 } });
}

/** the ground under the caravan: open desert and hills, or the sown land; a made road takes after what is round it */
function groundOf(p: Pt): 'desert' | 'sown' {
  const k = terrainAt(p);
  if (k === 'desert' || k === 'hills') return 'desert';
  if (k === 'fertile') return 'sown';
  for (const [dx, dy] of [[8, 0], [-8, 0], [0, 8], [0, -8]]) if (terrainAt({ x: p.x + dx, y: p.y + dy }) === 'fertile') return 'sown';
  return 'desert';
}

const carriedCommon = (s: GameState) => s.inventory.filter((i) => !i.stored && (RUGS[i.typeId]?.tier ?? 1) === 1);
const COMMON = () => RUG_IDS.filter((id) => (RUGS[id].tier ?? 1) === 1);

function fits(e: RoadEvent, s: GameState, p: Pt, dest?: string) {
  const h = s.world.hour, day = h >= 6 && h < 19;
  if (e.when === 'day' && !day) return false;
  if (e.when === 'night' && day) return false;
  if (e.where !== 'any' && e.where !== groundOf(p)) return false;
  if (e.needs?.animals && !Object.values(s.world.party.animals ?? {}).some((n) => (n ?? 0) > 0)) return false;
  if (e.needs?.men && !troopCount(s.world.party)) return false;
  if (e.needs?.rug && !carriedCommon(s).length) return false;
  if ((e.text.includes('{dest}') || e.fx?.rumour) && !dest) return false;
  return true;
}

/** Once per whole game hour of walking: does something happen on the road? */
export function roadEventDue(p: Pt, walkStartAbs: number, dest?: string): RoadEvent | null {
  const s = useGame.getState();
  const now = absHour(s), hr = Math.floor(now);
  if (forced) {
    const e = roadEventById(forced)!;
    forced = null;
    return e;
  }
  if (openingStep(s)) return null;
  const r = s.roadStories ?? { lastAt: -999, recent: [], walks: 0 };
  if (r.walks < 2) return null;
  if (now - r.lastAt < GAP_HOURS || now - walkStartAbs < GRACE_HOURS) return null;
  if (rollFor(`road:${hr}:${s.journal.length}`, s.seed) >= HOURLY_CHANCE) return null;
  const pool = ROAD_EVENTS.filter((e) => !r.recent.includes(e.id) && fits(e, s, p, dest));
  if (!pool.length) return null;
  return pool[Math.floor(rollFor(`road-pick:${hr}:${s.journal.length}`, s.seed) * pool.length)];
}

/** the event's line, with the town named */
export function eventText(e: RoadEvent, dest?: string) {
  return e.text.replace('{dest}', dest ? settlementById(dest).name : 'the next town');
}

/** the choices you can take now (a choice you cannot afford is left off; the default always shows) */
export function choicesFor(e: RoadEvent): RoadChoice[] {
  const s = useGame.getState();
  return (e.choices ?? []).filter((c) => c.id === e.def || (
    (!c.needs?.cash || s.cash >= c.needs.cash)
    && (!c.needs?.water || (s.condition?.water ?? 100) >= c.needs.water)
    && (!c.needs?.rug || carriedCommon(s).length > 0)
  ));
}

/** "−3 PT · +4 rations · 1 h": what it came to, after the line */
function fxLine(fx: RoadFx) {
  const out: string[] = [];
  if (fx.cash) out.push(`${fx.cash > 0 ? '+' : '−'}${fmt(Math.abs(fx.cash))}`);
  if (fx.food) out.push(`${fx.food > 0 ? '+' : '−'}${Math.abs(fx.food)} ration${Math.abs(fx.food) === 1 ? '' : 's'}`);
  if (fx.water) out.push(`water ${fx.water > 0 ? '+' : '−'}${Math.abs(fx.water)}`);
  if (fx.morale) out.push(`spirits ${fx.morale > 0 ? 'up' : 'down'}`);
  if (fx.rep) out.push(`standing ${fx.rep > 0 ? '+' : '−'}${Math.abs(fx.rep)}`);
  if (fx.hours && fx.hours > 0) out.push(`${fx.hours < 1 ? 'half an hour' : `${fx.hours} h`} lost`);
  if (fx.hours && fx.hours < 0) out.push(`${-fx.hours} h saved`);
  return out.join(' · ');
}

/** what is said of prices in the town ahead: the bazaar's own talk when there is some, else hearsay */
function rumourFor(s: GameState, dest: string, key: string): string {
  const name = settlementById(dest).name;
  const real = rumoursOn(s.day).filter((r) => r.sid === dest && r.kind !== 'event');
  if (real.length && rollFor(`${key}:true`, s.seed) < 0.75) return real[Math.floor(rollFor(`${key}:which`, s.seed) * real.length)].text;
  const WORDS = ['silk', 'old rugs', 'kilims', 'bright rugs', 'fine weaving', 'dark-ground rugs'];
  const w = WORDS[Math.floor(rollFor(`${key}:word`, s.seed) * WORDS.length)];
  return rollFor(`${key}:glut`, s.seed) < 0.4
    ? `The dealers in ${name} are full up and paying little.`
    : `${name} is paying well for ${w} this week.`;
}

/**
 * Settle an event: a passing one at once, or a card's choice (or its default, when left alone).
 * Returns the line to show and, for a shorter way, the days of walking saved.
 */
export function settleRoadEvent(e: RoadEvent, choiceId: string | null, dest?: string): { text: string; skipDays: number } {
  let s = useGame.getState();
  const key = `${e.id}:${Math.floor(absHour(s))}`;
  const c = e.choices ? (e.choices.find((x) => x.id === (choiceId ?? e.def)) ?? e.choices[0]) : undefined;
  let result = c ? c.result : '';
  let fx: RoadFx = c ? (c.fx ?? {}) : (e.fx ?? {});
  if (c?.odds && rollFor(`${key}:odds`, s.seed) < c.odds.p) { result = c.odds.result; fx = c.odds.fx ?? {}; }
  const extra: string[] = [];

  const party = { ...s.world.party };
  let cash = s.cash, inventory = s.inventory, rep = s.reputation;
  const ledger = [...s.ledger];
  const cond = s.condition ? { ...s.condition } : undefined;
  const needsOn = !s.sim || s.sim.needs || !!s.ironman;
  if (fx.cash) {
    const amt = fx.cash < 0 ? -Math.min(cash, -fx.cash) : fx.cash;
    cash += amt;
    if (amt) ledger.push({ day: s.day, kind: amt < 0 ? 'expense' : 'bonus', label: 'On the road', amount: amt });
  }
  if (fx.food) party.food = Math.max(0, (party.food ?? 0) + fx.food);
  if (fx.morale) party.morale = Math.max(0, Math.min(100, (party.morale ?? MORALE_START) + fx.morale));
  if (cond && needsOn && fx.water) cond.water = Math.max(0, Math.min(100, (cond.water ?? 100) + fx.water));
  if (cond && needsOn && fx.fatigue) cond.fatigue = Math.max(0, Math.min(100, cond.fatigue + fx.fatigue));
  if (fx.rep) rep = Math.max(0, rep + fx.rep);
  const commons = COMMON();
  if (fx.rugGain) {
    const room = Math.floor(capacity(party) + 0.001) - inventory.filter((i) => !i.stored).length;
    if (room <= 0) extra.push('But there is no room in the packs, and you have to leave it.');
    else {
      const typeId = commons[Math.floor(rollFor(`${key}:rug`, s.seed) * commons.length)];
      const t = RUGS[typeId];
      const found = !fx.cash;
      const item: RugItem = { uid: newUid('r'), typeId, condition: found ? 'Dirty' : 'Good', restored: false, provenance: found ? 'Uncertain' : t.provenance, paid: found ? 0 : -(fx.cash ?? 0), notes: [found ? 'Found on the road.' : 'Bought at a village loom on the road.'], stored: false };
      inventory = [...inventory, item];
      extra.push(`${t.name} added to your packs.`);
    }
  }
  if (fx.rugSwap) {
    const mine = carriedCommon({ ...s, inventory } as GameState);
    if (mine.length) {
      const out = mine[Math.floor(rollFor(`${key}:out`, s.seed) * mine.length)];
      const others = commons.filter((id) => id !== out.typeId);
      const typeId = others[Math.floor(rollFor(`${key}:in`, s.seed) * others.length)];
      inventory = [...inventory.filter((i) => i.uid !== out.uid), { uid: newUid('r'), typeId, condition: 'Worn', restored: false, provenance: 'Uncertain', paid: out.paid, notes: ['Swapped with a pedlar on the road.'], stored: false }];
      extra.push(`Your ${RUGS[out.typeId].name} for his ${RUGS[typeId].name}.`);
    }
  }
  let rumours = s.world.rumours;
  if (fx.rumour && dest) {
    const line = rumourFor(s, dest, key);
    extra.push(line);
    if (!rumours.includes(`Heard on the road: ${line}`)) rumours = [...rumours, `Heard on the road: ${line}`];
  }
  const said = [eventText(e, dest), result, ...extra].filter(Boolean).join(' ');
  const r = s.roadStories ?? { lastAt: -999, recent: [], walks: 0 };
  useGame.setState({
    cash, inventory, reputation: rep, ledger,
    ...(cond ? { condition: cond } : {}),
    world: { ...s.world, party, rumours },
    journal: [...s.journal, { day: s.day, text: said, kind: 'road' }],
    roadStories: { ...r, lastAt: absHour(s), recent: [...r.recent, e.id].slice(-10) },
  });
  // an hour or two lost: the clock runs on with the caravan standing (days turn, rations are eaten)
  if (fx.hours && fx.hours > 0) {
    s = useGame.getState();
    s.travelStep({ x: s.world.x, y: s.world.y }, fx.hours / 24, false);
  }
  const tail = fxLine({ ...fx, ...(needsOn ? {} : { water: undefined }) });
  const shown = [c ? result : eventText(e, dest), ...extra].filter(Boolean).join(' ');
  return { text: tail ? `${shown} (${tail})` : shown, skipDays: fx.hours && fx.hours < 0 ? -fx.hours / 24 : 0 };
}

/** an event just found on the road: open it as a card (a choice) or settle it at once (a passing line) */
export function startRoadEvent(e: RoadEvent): { card: boolean; until: number } {
  const s = useGame.getState();
  // the pacing clock starts now, even while the card is open
  const r = s.roadStories ?? { lastAt: -999, recent: [], walks: 0 };
  useGame.setState({ roadStories: { ...r, lastAt: absHour(s) } });
  return { card: !!e.choices?.length, until: absHour(s) + CARD_HOURS };
}

export { absHour };
