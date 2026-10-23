// What Hassan is closest to next, four rows with a bar each: his next rank, a better coat, the
// skill nearest its next level and the next title. Each row opens where it is worked on.
import { useGame } from '../../game/state/store';
import { rankOf } from '../../game/economy/progress';
import { fmt } from '../../game/economy/money';
import { SKILLS, SKILL_ORDER, levelOf, xpFor, MAX_LEVEL } from '../../data/character';
import { OUTFITS, START_WARDROBE, heroCharisma, wornOutfit } from '../../data/wardrobe';
import { TITLES } from '../../data/titles';
import { Icon } from '../Icon';
import { audio } from '../../game/audio/engine';

const pct = (v: number) => `${Math.max(3, Math.min(100, v * 100))}%`;

export function MeNext({ onWardrobe }: { onWardrobe: () => void }) {
  const g = useGame();
  const { next, worth, blockedByStory, blockingMission } = rankOf(g);
  const w = g.wardrobe ?? START_WARDROBE;
  const clean = g.attire?.clean ?? 100;
  const ch = heroCharisma(w, clean);
  const worn = wornOutfit(w);
  const coat = OUTFITS.filter((o) => !w.owned.includes(o.id) && o.charisma > worn.charisma).sort((a, b) => a.price - b.price)[0];
  const skill = SKILL_ORDER.map((id) => {
    const xp = g.skills?.[id] ?? 0, l = levelOf(xp);
    const lo = xpFor(l), hi = xpFor(Math.min(MAX_LEVEL, l + 1));
    return { id, l, p: l >= MAX_LEVEL ? -1 : (xp - lo) / Math.max(1, hi - lo) };
  }).filter((x) => x.p >= 0).sort((a, b) => b.p - a.p)[0];
  const got = new Set(g.titles ?? []);
  const listed = TITLES.filter((t) => !t.quiet || got.has(t.id));
  const title = listed.find((t) => !got.has(t.id) && !t.secret);
  const repP = next ? g.reputation / Math.max(1, next.rep) : 1;
  const worthP = next ? Math.max(0, worth) / Math.max(1, next.worth) : 1;
  const go = (f: () => void) => () => { audio.sfx('tap'); f(); };
  return (
    <section className="me-next" data-testid="me-next">
      <h3>Next for you</h3>
      {next && (
        <button className="mn-row" onClick={go(() => window.dispatchEvent(new Event('tof:open-road')))} data-testid="me-next-rank">
          <Icon name="crown" />
          <span className="mn-body">
            <b>{next.name}</b>
            <i className="mn-bar"><em style={{ width: pct(Math.min(repP, worthP)) }} /></i>
            <small>Reputation {g.reputation}/{next.rep}{repP >= 1 ? ' ✓' : ''} · worth {fmt(worth)}/{fmt(next.worth)}{worthP >= 1 ? ' ✓' : ''}</small>
            {blockedByStory && blockingMission && <small className="mn-held" data-testid="rank-story-lock">Held back until you settle: {blockingMission.title}</small>}
          </span>
        </button>
      )}
      <button className="mn-row" onClick={go(onWardrobe)} data-testid="me-next-coat">
        <Icon name="needle" />
        <span className="mn-body">
          <b>Charisma {ch}{coat ? ` → ${Math.round(coat.charisma * (0.4 + 0.6 * clean / 100))}` : ''}</b>
          <i className="mn-bar"><em style={{ width: pct(coat ? Math.min(1, g.cash / coat.price) : 1) }} /></i>
          <small>{coat ? <>{coat.name}, {fmt(coat.price)}{g.cash >= coat.price ? ' · you can afford it' : ''}</> : 'You own the best clothes.'}{clean < 70 ? ' · a hammam would help' : ''}</small>
        </span>
      </button>
      {skill && (
        <div className="mn-row static" data-testid="me-next-skill">
          <Icon name="up" />
          <span className="mn-body">
            <b>{SKILLS[skill.id].name} {skill.l} → {skill.l + 1}</b>
            <i className="mn-bar"><em style={{ width: pct(skill.p) }} /></i>
            <small>{SKILLS[skill.id].how}</small>
          </span>
        </div>
      )}
      {title && (
        <div className="mn-row static" data-testid="me-next-title">
          <Icon name="star" />
          <span className="mn-body">
            <b>{title.name}</b>
            <small>{title.how} · {got.size} of {listed.length} titles</small>
          </span>
        </div>
      )}
    </section>
  );
}
