import { useEffect, useState, type ReactNode } from 'react';
import { useGame } from '../../game/state/store';
import { SKILLS, SKILL_ORDER, MANNER_AXES, BOOKS, levelOf, xpFor, MAX_LEVEL, mannerTitle, START_MANNER } from '../../data/character';
import { START_WARDROBE, heroCharisma, wornOutfit } from '../../data/wardrobe';
import { HeroBadge } from '../Wardrobe/HeroFigure';
import { Wardrobe } from '../Wardrobe/Wardrobe';
import { rankOf, RANKS } from '../../game/economy/progress';
import { fmt } from '../../game/economy/money';
import { TITLES } from '../../data/titles';

import { lowerName } from '../../game/text';
import { Icon } from '../Icon';
import './charsheet.css';

/** Short lines, each with a small icon: the gist of a section at a glance. */
function Facts({ items }: { items: [string, ReactNode][] }) {
  return <ul className="cs-facts">{items.map(([icon, text], k) => <li key={k}><Icon name={icon} className="cs-fi" /><span>{text}</span></li>)}</ul>;
}

/** The longer explanation, kept one tap away. */
function Why({ id, children }: { id: string; children: ReactNode }) {
  return (
    <details className="cs-why" data-testid={`why-${id}`}>
      <summary>What does this mean?</summary>
      <div>{children}</div>
    </details>
  );
}

/** One line for each side of your manner: what it does at the stall. */
const MANNER_SHORT: Record<string, [string, string]> = {
  honesty: ['scale', 'Honest: more trust from the start. Cunning: better stories, dear when caught.'],
  firmness: ['shield', 'Firm: higher offers, but buyers lose patience sooner.'],
  kindness: ['hand', 'Kind: buyers wait longer and come back more often.'],
  charm: ['chat', 'Charm: warms some buyers. Others find it too much.'],
};
// The merchant's character sheet: reputation, how the bazaar sees you, charisma and skills.
export function MeSection({ hideDress = false }: { hideDress?: boolean } = {}) {
  const g = useGame();
  const m = g.manner ?? START_MANNER;
  const att = g.attire ?? { owned: ['galabiya'], worn: 'galabiya', clean: 100 };
  const wr = g.wardrobe ?? START_WARDROBE;
  const ch = heroCharisma(wr, att.clean);
  const [wardrobe, setWardrobe] = useState(false);
  const dress = lowerName(wornOutfit(wr).name);
  const { rank, next, blockedByStory, blockingMission, blockedByWorth, worth } = rankOf(g);
  const repNext = next?.rep ?? 100;
  return (
    <div className="charsheet inline" data-testid="character">
      {!hideDress && (
      <div className="cs-head">
          <div><small>THE MERCHANT OF GIZA</small><h2>{rank.name}</h2><span>The bazaar calls you <b>{mannerTitle(m)}</b>.</span></div>
        </div>
      )}
      <div className="cs-section">
        <div className="cs-label"><b>Reputation</b><span data-testid="rep-value">{g.reputation}{next ? ` / ${repNext} for ${next.name}` : ''}</span></div>
        <i className="cs-bar rep"><em style={{ width: `${Math.min(100, (g.reputation / Math.max(1, repNext)) * 100)}%` }} /></i>
        <Facts items={[
          ['up', next ? <>Next: {next.note}</> : 'You have reached the top rank.'],
          ['star', 'Good sales and honest dealing raise it. Lies found out and missed debts lower it.'],
        ]} />
        <Why id="rep"><p className="cs-note">Earned by good sales, honest dealing, commissions and royal warrants. Lost when you are caught lying or miss a debt. It opens better stock, the back rooms of city dealers and palace doors ({RANKS.length} ranks). Rank needs net worth and reputation, and from Merchant of the Levant on, royal warrants.</p></Why>
        {blockedByStory && blockingMission && (
          <p className="cs-note" data-testid="rank-story-lock">Reputation and net worth are there, but the rank will not move until an unfinished matter is settled: <b>{blockingMission.title}</b>. {blockingMission.locks}</p>
        )}
        {blockedByWorth && next && (
          <p className="cs-note" data-testid="rank-worth-lock">The story is settled. What holds <b>{next.name}</b> back now: {[
            worth < next.worth ? `net worth ${fmt(next.worth)} (you have ${fmt(worth)})` : '',
            g.reputation < next.rep ? `reputation ${next.rep} (you have ${g.reputation})` : '',
            g.court.warrants.length < next.warrants ? `${next.warrants === 1 ? 'a royal warrant' : `${next.warrants} royal warrants`} (you have ${g.court.warrants.length})` : '',
          ].filter(Boolean).join(', ')}.</p>
        )}
      </div>
      <div className="cs-section">
        <div className="cs-label"><b>How the bazaar sees you</b></div>
        {MANNER_AXES.map((a) => {
          const v = m[a.id];
          return (
            <div key={a.id} className="cs-manner" data-testid={`manner-${a.id}`}>
              <span>{a.low}</span>
              <i className="cs-bipolar"><em style={{ left: v >= 0 ? '50%' : `${50 + v / 2}%`, width: `${Math.abs(v) / 2}%` }} className={v >= 0 ? 'pos' : 'neg'} /><u /></i>
              <span>{a.high}</span>
            </div>
          );
        })}
        <Why id="manner">
          <Facts items={MANNER_AXES.map((a) => MANNER_SHORT[a.id] ?? ['star', a.note])} />
          <p className="cs-note">Your manner moves with what you say at the stall: a true word or a tall story, holding your price or giving way.</p>
        </Why>
      </div>
      <div className="cs-section">
        <div className="cs-label"><b>Charisma {ch}</b><span>{dress} · {att.clean >= 70 ? 'clean' : att.clean >= 35 ? 'dusty' : 'filthy from the road'}</span></div>
        <i className="cs-bar clean"><em style={{ width: `${att.clean}%` }} /></i>
        {!hideDress && <div className="cs-dress">
          <HeroBadge outfitId={wornOutfit(wr).id} size={64} />
          <button className="btn" onClick={() => setWardrobe(true)} data-testid="open-wardrobe">Open wardrobe</button>
        </div>}
        {wardrobe && <Wardrobe onClose={() => setWardrobe(false)} />}
        <Facts items={[
          ['needle', 'Better clothes, more trust. Tailors in the big cities.'],
          ['sun', 'The road gets you dirty. A city hammam washes it off.'],
          ['crown', 'No palace admits a man in a work galabiya.'],
        ]} />
        <Why id="charisma"><p className="cs-note">Clothes and cleanliness set your charisma. Buyers trust a well-dressed merchant, and palaces will not admit you in a work galabiya. The road gets you dirty; a city hammam washes it off. Every piece is sold separately: hats, coats, shoes, rings, even rifles. Tailors in the big cities sell the better ones.</p></Why>
      </div>
      <Titles />
    </div>
  );
}

export function SkillsSection() {
  const g = useGame();
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="charsheet inline" data-testid="skills">
      <div className="cs-label"><b>Skills</b><span>They rise by doing. Every fifth level brings a perk.</span></div>
      {SKILL_ORDER.map((id) => {
        const sk = SKILLS[id];
        const xp = g.skills?.[id] ?? 0;
        const l = levelOf(xp);
        const lo = xpFor(l), hi = xpFor(Math.min(MAX_LEVEL, l + 1));
        const pct = l >= MAX_LEVEL ? 100 : ((xp - lo) / Math.max(1, hi - lo)) * 100;
        const nextPerk = sk.perks.find((p) => p.level > l);
        return (
          <button key={id} className={`cs-skill ${open === id ? 'open' : ''}`} onClick={() => setOpen(open === id ? null : id)} data-testid={`skill-${id}`}>
            <span className="cs-skill-top"><b>{sk.name}</b><em>{l}</em></span>
            <i className="cs-bar"><em style={{ width: `${pct}%` }} /></i>
            {open === id ? (
              <span className="cs-skill-more">
                <small>{sk.what} {sk.how}</small>
                {sk.perks.map((p) => <small key={p.name} className={l >= p.level ? 'got' : ''}>{l >= p.level ? '✓' : `Lv ${p.level}`} · <b>{p.name}</b>: {p.effect}</small>)}
              </span>
            ) : (
              <small>{nextPerk ? `Next perk at ${nextPerk.level}: ${nextPerk.name}` : 'All perks learned'}</small>
            )}
          </button>
        );
      })}
      {g.books?.length > 0 && (
        <div className="cs-section">
          <div className="cs-label"><b>Books read</b></div>
          {g.books.map((b) => <p key={b} className="cs-note">{BOOKS[b].title} · {BOOKS[b].author}</p>)}
        </div>
      )}
    </div>
  );
}

/** Titles earned, like achievements. */
export function Titles() {
  const g = useGame();
  const got = TITLES.filter((t) => (g.titles ?? []).includes(t.id));
  return (
    <div className="cs-section" data-testid="titles">
      <div className="cs-label"><b>Titles</b><span>{got.length} of {TITLES.length}</span></div>
      <div className="cs-titles">
        {TITLES.map((t) => {
          const has = (g.titles ?? []).includes(t.id);
          return <div key={t.id} className={`cs-title ${has ? 'got' : ''}`}><b>{has || !t.secret ? t.name : '???'}</b><small>{has || !t.secret ? t.how : 'A secret.'}</small></div>;
        })}
      </div>
    </div>
  );
}

/** "Speech increased to 4" and new titles, announced once, like in Kingdom Come. */
export function LevelUpToast() {
  const g = useGame();
  const up = g.levelUps?.[0];
  const title = !up ? g.titleNews?.[0] : undefined;
  useEffect(() => {
    if (!up && !title) return;
    const t = setTimeout(() => (up ? g.popLevelUp() : g.popTitle()), 3200);
    return () => clearTimeout(t);
  }, [up, title, g]);
  if (up) {
    const sk = SKILLS[up.skill];
    const perk = sk.perks.find((p) => p.level === up.level);
    return (
      <div className="levelup" data-testid="levelup" onClick={() => g.popLevelUp()}>
        <small>SKILL INCREASED</small>
        <b>{sk.name} {up.level}</b>
        {perk && <span>New perk: {perk.name}. {perk.effect}</span>}
      </div>
    );
  }
  const t = title ? TITLES.find((x) => x.id === title) : undefined;
  if (!t) return null;
  return (
    <div className="levelup title" data-testid="title-toast" onClick={() => g.popTitle()}>
      <small>TITLE EARNED</small>
      <b>{t.name}</b>
      <span>{t.how}</span>
    </div>
  );
}
