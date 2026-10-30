// The merchant's rank and the names the bazaar gives him, where they can be seen: under his name on
// Me, on the character sheet, and as small engraved badges over the other named people.
import { useShallow } from 'zustand/react/shallow';
import { useGame } from '../../game/state/store';
import { rankOf, RANKS } from '../../game/economy/progress';
import { fmt } from '../../game/economy/money';
import { EPITHETS, EPITHET, wornEpithet, type EmblemId, type EpithetCtx, type TraitMark } from '../../data/epithets';
import { audio } from '../../game/audio/engine';
import { Fold, openFoldNext } from '../Fold/Fold';
import { Emblem } from './Emblem';
import './epithet.css';

export const RANK_EMBLEM: Record<string, EmblemId> = { stall: 'awning', bazaar: 'carpet', khan: 'arch', levant: 'compass', kings: 'crown' };

/** how near the next rank is, 0..1, and what is still missing, in words */
export function rankProgress(g: Parameters<typeof rankOf>[0]) {
  const r = rankOf(g);
  const n = r.next;
  if (!n) return { ...r, near: 1, missing: [] as string[] };
  const parts = [
    n.worth ? Math.max(0, r.worth) / n.worth : 1,
    n.rep ? Math.max(0, g.reputation) / n.rep : 1,
    n.warrants ? g.court.warrants.length / n.warrants : 1,
  ].map((x) => Math.min(1, x));
  const missing = [
    r.worth < n.worth ? `net worth ${fmt(n.worth)}` : '',
    g.reputation < n.rep ? `reputation ${n.rep}` : '',
    g.court.warrants.length < n.warrants ? (n.warrants === 1 ? 'a royal warrant' : `${n.warrants} royal warrants`) : '',
    r.blockedByStory && r.blockingMission ? r.blockingMission.title : '',
  ].filter(Boolean);
  // the bar shows the thing furthest behind; a story still to settle holds it short of the end
  const near = Math.min(...parts) * (r.blockedByStory ? 0.92 : 1);
  return { ...r, near, missing };
}

/** The rank under the name: its seal, its name, a bar to the next and what that still needs. */
export function RankBadge({ onTap }: { onTap?: () => void }) {
  const g = useGame();
  const { idx, rank, next, near, missing } = rankProgress(g);
  const body = (
    <>
      <Emblem id={RANK_EMBLEM[rank.id]} shape="seal" size={40} />
      <span className="rb-body">
        <small>Rank {idx + 1} of {RANKS.length}</small>
        <b data-testid="rank-badge-name">{rank.name}</b>
        {next ? (
          <>
            <i className="rb-bar" aria-hidden="true"><em style={{ width: `${Math.max(4, near * 100)}%` }} /></i>
            <small className="rb-next">Next, {next.name}{missing.length ? `: ${missing.join(', ')}` : ''}</small>
          </>
        ) : <small className="rb-next">The highest rank in the trade.</small>}
      </span>
    </>
  );
  return onTap
    ? <button className="rank-badge" onClick={() => { audio.sfx('tap'); onTap(); }} data-testid="rank-badge">{body}</button>
    : <div className="rank-badge" data-testid="rank-badge">{body}</div>;
}

/** The seal alone, for the top bar: one tap to Me. */
export function RankChip({ onTap, disabled }: { onTap: () => void; disabled?: boolean }) {
  const g = useGame();
  const { rank, idx } = rankOf(g);
  return (
    <button className="hud-rank" onClick={() => { audio.sfx('tap'); onTap(); }} disabled={disabled} aria-label={`Your rank: ${rank.name}, ${idx + 1} of ${RANKS.length}. Open Me`} data-testid="hud-rank" data-rank={rank.id}>
      <Emblem id={RANK_EMBLEM[rank.id]} shape="seal" size={30} />
    </button>
  );
}

/** the merchant's name with the epithet he wears: "Hassan al-Sadiq" */
export function HeroName({ name, plain = false, testid }: { name: string; plain?: boolean; testid?: string }) {
  const g = useGame(useShallow((s) => ({ have: s.epithets, worn: s.epithetWorn })));
  const e = plain ? undefined : wornEpithet(g.have, g.worn);
  return (
    <h2 className="hero-name" data-testid={testid ?? 'hero-name'} data-epithet={e?.id}>
      {name}{e && <> <em className="ep-worn" data-testid="hero-epithet">{e.name}</em></>}
      {e && <small className="ep-gloss">{e.gloss}</small>}
    </h2>
  );
}

/** The badges won, in a row; tapping it opens the list on the character sheet. */
export function EpithetRow({ max = 6 }: { max?: number }) {
  const have = useGame((s) => s.epithets ?? []);
  const worn = useGame((s) => s.epithetWorn);
  const shown = have.slice(-max);
  const go = () => {
    audio.sfx('tap');
    openFoldNext('me-epithets');
    const el = document.querySelector('[data-testid=epithets]') as HTMLDetailsElement | null;
    if (el) { el.open = true; el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  };
  return (
    <button className="ep-row" onClick={go} data-testid="epithet-row" aria-label={have.length ? `Names the bazaar gives you: ${have.map((id) => EPITHET[id].name).join(', ')}` : 'Names the bazaar may give you'}>
      {shown.length ? shown.map((id) => (
        <span key={id} className={`ep-row-b ${id === (worn && have.includes(worn) ? worn : have[have.length - 1]) ? 'worn' : ''}`}>
          <Emblem id={EPITHET[id].emblem} size={28} title={`${EPITHET[id].name}, ${EPITHET[id].gloss}`} />
        </span>
      )) : <span className="ep-row-none">No name in the bazaar yet</span>}
      {have.length > max && <span className="ep-row-more">+{have.length - max}</span>}
    </button>
  );
}

/** Every name the bazaar can give, won or not: its badge, how it is won, how near, and which to wear. */
export function EpithetsFold() {
  const g = useGame();
  const have = g.epithets ?? [];
  const worn = wornEpithet(have, g.epithetWorn);
  const ctx = g as unknown as EpithetCtx;
  // a lesser name that was outgrown is shown under the one that replaced it, not as still to win
  const outgrown = new Set(have.map((id) => EPITHET[id].over).filter(Boolean));
  return (
    <Fold id="me-epithets" testid="epithets" title="Names the bazaar gives you"
      gist={worn ? `${have.length} won · wearing ${worn.name}` : `${have.length} of ${EPITHETS.length}`}>
      <p className="cs-note ep-intro">Deal, fight and travel in one way long enough and the bazaar gives you a name for it. Opposites cannot both hold: win one and the other is forgotten.</p>
      <ul className="ep-list">
        {EPITHETS.filter((e) => !outgrown.has(e.id)).map((e) => {
          const got = have.includes(e.id);
          const [now, mark] = e.progress(ctx);
          const opp = e.against ? EPITHET[e.against] : undefined;
          return (
            <li key={e.id} className={`ep-item ${got ? 'got' : ''}`} data-testid={`epithet-${e.id}`} data-got={got ? '1' : undefined}>
              <Emblem id={e.emblem} size={44} dim={!got} />
              <span className="ep-body">
                <b>{e.name} <small>{e.gloss}</small></b>
                <span className="ep-how">{e.how}</span>
                {!got && <i className="rb-bar" aria-hidden="true"><em style={{ width: `${Math.max(3, Math.min(1, now / mark) * 100)}%` }} /></i>}
                {opp && <span className="ep-opp">Cannot be held with {opp.name}, {opp.gloss.replace(/^The /, 'the ')}.</span>}
              </span>
              {got && (worn?.id === e.id
                ? <span className="ep-wearing" data-testid={`epithet-worn-${e.id}`}>Worn</span>
                : <button className="btn ep-wear" onClick={() => { audio.sfx('tap'); g.wearEpithet(e.id); }} data-testid={`epithet-wear-${e.id}`}>Wear</button>)}
            </li>
          );
        })}
      </ul>
    </Fold>
  );
}

/** Small round badges for the temper of another person: a rival dealer, a bandit chief, a buyer. */
export function TraitMarks({ marks, size = 24, labels = false, testid }: { marks: TraitMark[]; size?: number; labels?: boolean; testid?: string }) {
  if (!marks.length) return null;
  return (
    <span className={`trait-marks ${labels ? 'with-labels' : ''}`} data-testid={testid}>
      {marks.map((m) => (
        <span key={m.label} className="trait-mark" title={`${m.label}: ${m.tip}`}>
          <Emblem id={m.emblem} shape="round" size={size} title={labels ? undefined : m.label} />
          {labels && <span className="tm-text"><b>{m.label}</b><small>{m.tip}</small></span>}
        </span>
      ))}
    </span>
  );
}
