import { useMemo } from 'react';
import { BREEDS } from '../../data/animals';
import type { PartyState } from '../../game/systems/caravan';

/** One band's look on the field: its men, its leader, the ground it fights on. */
export const BAND_ART: Record<string, { man: string; leader: string; field: string }> = {
  'egypt-rural-highway-robbers': { man: 'robber', leader: 'robber-leader', field: 'road' },
  'sinai-transjordan-desert-raiders': { man: 'raider', leader: 'raider-leader', field: 'dunes' },
  'palestine-road-thieves': { man: 'thief', leader: 'thief-leader', field: 'pass' },
  'syria-1925-rebels': { man: 'rebel', leader: 'rebel-leader', field: 'pass' },
  'iraq-border-smuggler-brigands': { man: 'smuggler', leader: 'smuggler-leader', field: 'oasis' },
};
const MOUNTED_BANDS = new Set(['raider', 'smuggler']);
const MOUNTED = new Set(['bedouin', 'desertcaptain', 'arnaut', 'reformed']);
const art = (id: string) => `art/battle/${id}.webp`;
export const BATTLE_ART = [...new Set([...Object.values(BAND_ART).flatMap((b) => [b.man, b.leader, `battle-${b.field}`]), 'hero', 'guard', 'fellah', 'veteran', 'watchman', 'sentinel', 'harbour', 'camel', 'horse', 'fallen-light', 'fallen-dark', ...MOUNTED])].map(art);

interface Token { key: string; img: string; x: number; y: number; size: number; down: boolean; flip: boolean }
export interface FieldUnit { id: string; n: number; start: number }

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
    return { key: `${mine ? 'm' : 'e'}${i}`, img: u.img, x, y: y + jitter(i, 3) * 3, size: u.down ? 15 : u.big ? 34 : 24, down: u.down, flip: !mine };
  });
}

/**
 * The fight seen from above, like a painted map: their band at the top, your caravan below.
 * Men who fall stay where they fell. On a charge both lines close in; holding, they keep their distance.
 */
export function BattleField({ bandId, mySide, enemyN, enemyStart, party, charging }: { bandId: string; mySide: FieldUnit[]; enemyN: number; enemyStart: number; party: PartyState; charging: boolean }) {
  const band = BAND_ART[bandId] ?? BAND_ART['egypt-rural-highway-robbers'];

  const mine = useMemo(() => {
    const men: { id: string; img: string; big: boolean; down: boolean }[] = [];
    for (const u of mySide) {
      const shown = u.id === 'you' ? 1 : Math.min(u.start, 4);
      // show at most four of a kind; the fallen are the same share of those four
      const fallen = u.id === 'you' ? 0 : Math.round(((u.start - u.n) / Math.max(1, u.start)) * shown);
      for (let k = 0; k < shown; k++) {
        const down = k >= shown - fallen;
        const id = u.id === 'you' ? 'hero' : u.id;
        men.push({ id, img: art(down ? 'fallen-light' : id), big: MOUNTED.has(id) && !down, down });
      }
    }
    return layout(men, 64, 76, true);
  }, [mySide]);

  const animals = useMemo(() => {
    const out: Token[] = [];
    let camels = 0, horses = 0;
    for (const [id, n] of Object.entries(party.animals ?? {})) {
      const kind = BREEDS[id]?.kind;
      if (kind === 'camel') camels += n; else if (kind === 'horse') horses += n;
    }
    const herd = [...Array(Math.min(3, camels)).fill('camel'), ...Array(Math.min(2, horses)).fill('horse')];
    herd.forEach((id, i) => out.push({ key: `a${i}`, img: art(id), x: 50 + (i - (herd.length - 1) / 2) * 16, y: 91, size: 36, down: false, flip: false }));
    return out;
  }, [party.animals]);

  const theirs = useMemo(() => {
    const shown = Math.min(enemyStart, 9);
    const fallen = Math.round(((enemyStart - enemyN) / Math.max(1, enemyStart)) * shown);
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
    return [...layout(rest, 32, 22, false), ...layout([leader], 16, 16, false)];
  }, [enemyN, enemyStart, band]);

  const gap = charging ? 7 : 0;
  return (
    <div className="bf" data-testid="battlefield" style={{ backgroundImage: `url(${art(`battle-${band.field}`)})` }}>
      {[...theirs.map((t) => ({ ...t, y: t.down ? t.y : t.y + gap })), ...mine.map((t) => ({ ...t, y: t.down ? t.y : t.y - gap })), ...animals].map((t) => (
        <img
          key={t.key}
          className={`bf-tok${t.down ? ' down' : ''}`}
          src={t.img}
          alt=""
          style={{ left: `${t.x}%`, top: `${t.y}%`, width: `${t.size}%`, transform: `translate(-50%,-50%)${t.flip ? ' rotate(180deg)' : ''}` }}
        />
      ))}
    </div>
  );
}
