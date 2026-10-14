import { useMemo } from 'react';
import { BREEDS } from '../../data/animals';
import type { PartyState } from '../../game/systems/caravan';

/** One band's look on the field: its men, its leader, and the ground where it waits for caravans. */
export const BAND_ART: Record<string, { man: string; leader: string; fields: string[] }> = {
  // Delta and valley tracks between the canals and the cane
  'egypt-rural-highway-robbers': { man: 'robber', leader: 'robber-leader', fields: ['nile', 'road'] },
  // Sinai and the Transjordan steppe
  'sinai-transjordan-desert-raiders': { man: 'raider', leader: 'raider-leader', fields: ['dunes', 'oasis', 'ruins'] },
  // the Judean and Samarian hills, the Jordan fords
  'palestine-road-thieves': { man: 'thief', leader: 'thief-leader', fields: ['hills', 'ford', 'pass'] },
  // the 1925 revolt: the Hauran basalt and the Druze mountain
  'syria-1925-rebels': { man: 'rebel', leader: 'rebel-leader', fields: ['basalt', 'mountain', 'pass'] },
  // the Euphrates crossings and the desert border posts
  'iraq-border-smuggler-brigands': { man: 'smuggler', leader: 'smuggler-leader', fields: ['ruins', 'ford', 'dunes', 'oasis'] },
};

/** The ground for one fight: fixed for a given band on a given day, different from one fight to the next. */
export function fieldFor(bandId: string, partyId: string, day: number) {
  const fields = (BAND_ART[bandId] ?? BAND_ART['egypt-rural-highway-robbers']).fields;
  let h = day;
  for (const ch of partyId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `art/battle/battle-${fields[h % fields.length]}.webp`;
}
const MOUNTED_BANDS = new Set(['raider', 'smuggler']);
const MOUNTED = new Set(['bedouin', 'desertcaptain', 'arnaut', 'reformed']);
const art = (id: string) => `art/battle/${id}.webp`;
export const BATTLE_ART = [...new Set([...Object.values(BAND_ART).flatMap((b) => [b.man, b.leader]), 'hero', 'guard', 'fellah', 'veteran', 'watchman', 'sentinel', 'harbour', 'camel', 'horse', 'fallen-light', 'fallen-dark', ...MOUNTED])].map(art);
/** Every man on the field is drawn; past this many a side is shown as its first men. */
const MAX_SHOWN = 18;

interface Token { key: string; img: string; x: number; y: number; size: number; down: boolean; flip: boolean; turn?: number; lead?: boolean }
export interface FieldUnit { id: string; n: number; start: number }
/** One exchange of fire: which round it is and how many rifles spoke on each side. */
export interface Volley { round: number; mine: number; theirs: number }

// a fixed scatter so tokens don't sit on a grid, and don't jump between renders
const jitter = (i: number, k: number) => (((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1) + 1) % 1 - 0.5;

/** Lay out one side: rows of men across the field, riders and leaders a size up. */
function layout(ids: { id: string; img: string; big: boolean; down: boolean }[], front: number, back: number, mine: boolean): Token[] {
  const perRow = 6;
  const rows = Math.max(1, Math.ceil(ids.length / perRow));
  return ids.map((u, i) => {
    const r = Math.floor(i / perRow), c = i % perRow;
    const inRow = Math.min(perRow, ids.length - r * perRow);
    const y = rows === 1 ? front : front + ((back - front) * r) / (rows - 1);
    const x = 50 + (c - (inRow - 1) / 2) * 14 + jitter(i, mine ? 1 : 2) * 5;
    return { key: `${mine ? 'm' : 'e'}${i}`, img: u.img, x, y: y + jitter(i, 3) * 3, size: u.down ? 18 : u.big ? 34 : 24, down: u.down, flip: !mine };
  });
}

/** Which standing men fire this round, and where the muzzle of each one is. */
function shooters(tokens: Token[], count: number, round: number) {
  const up = tokens.filter((t) => !t.down);
  const picked = [...up].sort((a, b) => jitter(round, a.key.length + a.x) - jitter(round, b.key.length + b.x)).slice(0, Math.min(count, up.length));
  return picked.map((t, i) => {
    const dir = t.flip ? 1 : -1; // he faces the other side: the muzzle is ahead of him
    return { key: `${round}-${t.key}`, x: t.x + jitter(round + i, 5) * 4, y: t.y + dir * t.size * 0.42, dir, delay: (jitter(round, i + 9) + 0.5) * 0.35 };
  });
}

/**
 * The fight seen from above, like a painted map: their band at the top, your caravan below.
 * Men who fall stay where they fell. On a charge both lines close in; holding, they keep their distance.
 * Each round a few rifles flash and their powder smoke drifts off across the field.
 */
export function BattleField({ bandId, field, mySide, enemyN, enemyStart, party, charging, volley, cue, act, wall, leaderOut, heroArt }: {
  bandId: string; field: string; mySide: FieldUnit[]; enemyN: number; enemyStart: number; party: PartyState; charging: boolean; volley?: Volley;
  /** what the band is doing this round, shown by how its men move (systems/combat.ts tells) */
  cue?: 'rush' | 'feint' | 'snipe' | 'circle' | 'waver' | 'flee';
  /** the order your men are carrying out */
  act?: 'volley' | 'hold' | 'charge' | 'flank' | 'parley';
  /** camels knelt in a line in front of your men */
  wall?: boolean;
  /** their leader steps out alone (the duel) */
  leaderOut?: boolean;
  heroArt?: string;
}) {
  const band = BAND_ART[bandId] ?? BAND_ART['egypt-rural-highway-robbers'];

  const mine = useMemo(() => {
    const men: { id: string; img: string; big: boolean; down: boolean }[] = [];
    for (const u of mySide) {
      const id = u.id === 'you' ? (heroArt ?? 'hero') : u.id;
      // every man he hired is on the field; those lost are the ones at the back of each group
      for (let k = 0; k < u.start && men.length < MAX_SHOWN; k++) {
        const down = k >= u.n;
        men.push({ id, img: art(down ? 'fallen-light' : id), big: MOUNTED.has(id) && !down, down });
      }
    }
    return layout(men, 62, 78, true);
  }, [mySide]);

  const animals = useMemo(() => {
    const out: Token[] = [];
    let camels = 0, horses = 0;
    for (const [id, n] of Object.entries(party.animals ?? {})) {
      const kind = BREEDS[id]?.kind;
      if (kind === 'camel') camels += n; else if (kind === 'horse') horses += n;
    }
    if (wall) {
      // the camels knelt side by side across the front, the loads between them: men fire over them
      const n = Math.max(2, Math.min(4, camels));
      for (let i = 0; i < n; i++) out.push({ key: `w${i}`, img: art('camel'), x: 50 + (i - (n - 1) / 2) * 21, y: 53, size: 30, down: false, flip: false, turn: 90 });
      return out;
    }
    const herd = [...Array(Math.min(3, camels)).fill('camel'), ...Array(Math.min(2, horses)).fill('horse')];
    herd.forEach((id, i) => out.push({ key: `a${i}`, img: art(id), x: 50 + (i - (herd.length - 1) / 2) * 16, y: 92, size: 36, down: false, flip: false }));
    return out;
  }, [party.animals, wall]);

  const theirs = useMemo(() => {
    const shown = Math.min(enemyStart, MAX_SHOWN);
    const fallen = Math.min(shown, enemyStart - enemyN);
    const men = Array.from({ length: shown }, (_, k) => ({ k, down: false }));
    // the leader goes down last: the men in front fall first
    let left = fallen;
    for (let k = shown - 1; k >= 0 && left > 0; k--) { men[k].down = true; left--; }
    const ids = men.map(({ k, down }) => {
      const id = k === 0 ? band.leader : band.man;
      return { id, img: art(down ? 'fallen-dark' : id), big: (k === 0 || MOUNTED_BANDS.has(band.man)) && !down, down };
    });
    // the leader stands behind his men
    const [leader, ...rest] = ids;
    return [...layout(rest, 34, 24, false), ...layout([leader], 15, 15, false).map((t) => ({ ...t, key: 'eL', lead: true }))];
  }, [enemyN, enemyStart, band]);

  const gap = charging ? 7 : 0;
  // how a man moves for the band's move this round: the men in front, and their leader with them or not
  const theirMove = (t: Token, i: number): Token => {
    if (t.down) return t;
    if (leaderOut && t.lead) return { ...t, x: 50, y: 33 };
    switch (cue) {
      case 'rush': return { ...t, y: t.y + 11 };
      case 'feint': return t.lead ? { ...t, x: t.x - 6 } : { ...t, y: t.y + 9 };
      case 'snipe': return t.lead ? { ...t, y: t.y - 3 } : { ...t, y: t.y - 5, size: t.size * 0.85 };
      case 'circle': return t.lead ? t : i % 2 ? { ...t, x: Math.max(6, t.x - 30), y: t.y + 14 } : { ...t, x: t.x - 8 };
      case 'flee': return { ...t, y: t.y - 30 - (i % 3) * 4, x: t.x + jitter(i, 9) * 20 };
      case 'waver': return t.lead ? { ...t, y: t.y - 4 } : { ...t, x: t.x + jitter(i, 7) * 14, y: t.y - 4 - (i % 3) * 3 };
      default: return t;
    }
  };
  const myMove = (t: Token, i: number): Token => {
    if (t.down) return t;
    // the duel: you walk out to meet him
    if (leaderOut && /hero/.test(t.img)) return { ...t, x: 50, y: 45 };
    switch (act) {
      case 'charge': return { ...t, y: t.y - 16 };
      case 'flank': return i % 2 ? { ...t, x: Math.min(94, t.x + 30), y: t.y - 18 } : t;
      case 'hold': return { ...t, x: 50 + (t.x - 50) * 0.7, y: t.y - 2 };
      case 'parley': return t.img.includes('hero') || i === 0 ? { ...t, y: t.y - 8 } : t;
      default: return t;
    }
  };
  const placed = [...theirs.map((t, i) => theirMove({ ...t, y: t.down ? t.y : t.y + gap }, i)), ...mine.map((t, i) => myMove({ ...t, y: t.down ? t.y : t.y - gap }, i))];
  const fire = volley ? [...shooters(placed.filter((t) => t.flip), volley.theirs, volley.round), ...shooters(placed.filter((t) => !t.flip), volley.mine, volley.round)] : [];

  return (
    <div className={`bf${cue ? ` cue-${cue}` : ''}`} data-testid="battlefield" data-cue={cue ?? ''} style={{ backgroundImage: `url(${field})` }}>
      {[...placed, ...animals].map((t) => (
        <img
          key={t.down ? `${t.key}-down` : t.key}
          className={`bf-tok${t.down ? ' down' : ''}${t.flip ? ' flip' : ''}${t.lead ? ' lead' : ''}${cue === 'waver' && t.flip && !t.down ? ' shaky' : ''}`}
          src={t.img}
          alt=""
          style={{ left: `${t.x}%`, top: `${t.y}%`, width: `${t.size}%`, transform: `translate(-50%,-50%)${t.flip ? ' rotate(180deg)' : t.turn ? ` rotate(${t.turn}deg)` : ''}` }}
        />
      ))}
      {fire.map((f) => (
        <span key={f.key} className="bf-shot" style={{ left: `${f.x}%`, top: `${f.y}%`, animationDelay: `${f.delay}s`, ['--dir' as string]: f.dir }}>
          <i className="bf-flash" style={{ animationDelay: `${f.delay}s` }} />
          <i className="bf-smoke" style={{ animationDelay: `${f.delay}s` }} />
        </span>
      ))}
    </div>
  );
}
