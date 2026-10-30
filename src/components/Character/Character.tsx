import { waitsTurn, useHeld } from '../../game/cardTurn';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGame } from '../../game/state/store';
import { SKILLS, SKILL_ORDER, MANNER_AXES, BOOKS, levelOf, xpFor, MAX_LEVEL, mannerTitle, START_MANNER, type SkillId } from '../../data/character';
import { START_WARDROBE, heroCharisma, wornOutfit } from '../../data/wardrobe';
import { HeroBadge } from '../Wardrobe/HeroFigure';
import { Wardrobe } from '../Wardrobe/Wardrobe';
import { rankOf, RANKS } from '../../game/economy/progress';
import { fmt } from '../../game/economy/money';
import { TITLES } from '../../data/titles';

import { lowerName } from '../../game/text';
import { Icon } from '../Icon';
import { Fold } from '../Fold/Fold';
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
  const lockStory = !!(blockedByStory && blockingMission);
  const lockWorth = !!(blockedByWorth && next);
  // the two or three sides of your manner that show most, by name ("Honest, Firm")
  const leanings = MANNER_AXES.map((a) => [m[a.id] >= 0 ? a.high : a.low, Math.abs(m[a.id])] as const)
    .filter(([, v]) => v >= 12).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([n]) => n);
  return (
    <div className="charsheet inline" data-testid="character">
      {!hideDress && (
      <div className="cs-head">
          <div><small>THE MERCHANT OF GIZA</small><h2>{rank.name}</h2><span>The bazaar calls you <b>{mannerTitle(m)}</b>.</span></div>
        </div>
      )}
{hideDress ? null : (
      <Fold id="me-rep" title="Reputation" attention={lockStory || lockWorth}
        gist={<><span data-testid="rep-value">{g.reputation}{next ? ` / ${repNext} for ${next.name}` : ''}</span>{lockStory || lockWorth ? ' · held back' : ''}</>}>
        <i className="cs-bar rep"><em style={{ width: `${Math.min(100, (g.reputation / Math.max(1, repNext)) * 100)}%` }} /></i>
        <Facts items={[
          ['up', next ? <>Next: {next.note}</> : 'You have reached the top rank.'],
          ['star', 'Good sales and honest dealing raise it. Lies found out and missed debts lower it.'],
        ]} />
        <Why id="rep"><p className="cs-note">It opens better stock, the back rooms of city dealers and palace doors ({RANKS.length} ranks). Rank needs net worth and reputation, and from Merchant of the Levant on, royal warrants.</p></Why>
        {lockStory && (
          <p className="cs-note" data-testid="rank-story-lock">Reputation and net worth are there, but the rank will not move until an unfinished matter is settled: <b>{blockingMission!.title}</b>. {blockingMission!.locks}</p>
        )}
        {lockWorth && (
          <p className="cs-note" data-testid="rank-worth-lock">The story is settled. What holds <b>{next!.name}</b> back now: {[
            worth < next!.worth ? `net worth ${fmt(next!.worth)} (you have ${fmt(worth)})` : '',
            g.reputation < next!.rep ? `reputation ${next!.rep} (you have ${g.reputation})` : '',
            g.court.warrants.length < next!.warrants ? `${next!.warrants === 1 ? 'a royal warrant' : `${next!.warrants} royal warrants`} (you have ${g.court.warrants.length})` : '',
          ].filter(Boolean).join(', ')}.</p>
        )}
      </Fold>
)}
      <Fold id="me-manner" title="How the bazaar sees you" gist={leanings.length ? leanings.join(', ') : 'No leaning yet'}>
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
      </Fold>
      {!hideDress && <Fold id="me-charisma" title={`Charisma ${ch}`} gist={`${dress} · ${att.clean >= 70 ? 'clean' : att.clean >= 35 ? 'dusty' : 'filthy from the road'}`}>
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
        <Why id="charisma"><p className="cs-note">Clothes and cleanliness set your charisma. Every piece is sold separately: hats, coats, shoes, rings, even rifles.</p></Why>
      </Fold>}
      <Titles />
    </div>
  );
}

export function SkillsSection() {
  const g = useGame();
  const [open, setOpen] = useState<string | null>(null);
  const levels = SKILL_ORDER.map((id) => [SKILLS[id].name, levelOf(g.skills?.[id] ?? 0)] as const).sort((a, b) => b[1] - a[1]);
  const top = levels.filter(([, l]) => l > 1).slice(0, 3);
  return (
    <div className="charsheet inline" data-testid="skills">
      <Fold id="me-skills" title="Skills" gist={top.length ? top.map(([n, l]) => `${n} ${l}`).join(', ') : `All ${levels.length} at level 1`}>
      <p className="cs-note">They rise by doing. Every fifth level brings a perk.</p>
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
      </Fold>
      {g.books?.length > 0 && (
        <Fold id="me-books" title="Books read" gist={`${g.books.length}`}>
          {g.books.map((b) => <p key={b} className="cs-note">{BOOKS[b].title} · {BOOKS[b].author}</p>)}
        </Fold>
      )}
    </div>
  );
}

/** Titles earned, like achievements. */
export function Titles() {
  const g = useGame();
  const got = TITLES.filter((t) => (g.titles ?? []).includes(t.id));
  const listed = TITLES.filter((t) => !t.quiet || (g.titles ?? []).includes(t.id));
  return (
    <Fold id="me-titles" testid="titles" title="Titles" gist={`${got.length} of ${listed.length}${got.length ? ` · ${TITLES.find((t) => t.id === g.titles?.[g.titles.length - 1])?.name ?? got[0].name}` : ''}`}>
      <div className="cs-titles">
        {listed.map((t) => {
          const has = (g.titles ?? []).includes(t.id);
          return <div key={t.id} className={`cs-title ${has ? 'got' : ''}`}><b>{has || !t.secret ? t.name : '???'}</b><small>{has || !t.secret ? t.how : 'A secret.'}</small></div>;
        })}
      </div>
    </Fold>
  );
}

/** "Speech increased to 4" and new titles, announced once, like in Kingdom Come. */
export function LevelUpToast() {
  const g = useGame(useShallow((s) => ({ busy: waitsTurn(s), levelUps: s.levelUps, titleNews: s.titleNews, popLevelUp: s.popLevelUp, popTitle: s.popTitle })));
  // held while a road fight or a card has the screen, then shown (game/cardTurn.ts)
  const hold = useHeld();
  const wait = hold || g.busy;
  const up = wait ? undefined : g.levelUps?.[0];
  const title = !up && !wait ? g.titleNews?.[0] : undefined;
  useEffect(() => {
    if (!up && !title) return;
    const perk = up && SKILLS[up.skill].perks.some((p) => p.level === up.level);
    const t = setTimeout(() => (up ? g.popLevelUp() : g.popTitle()), perk ? 4600 : 2800);
    return () => clearTimeout(t);
  }, [up, title, g]);
  if (up) {
    const sk = SKILLS[up.skill];
    const perk = sk.perks.find((p) => p.level === up.level);
    return (
      <div className={`levelup ${perk ? 'has-perk' : ''}`} data-testid="levelup" onClick={() => g.popLevelUp()} key={`${up.skill}${up.level}`}>
        <small>{perk ? 'NEW PERK' : 'LEVEL UP'}</small>
        <b>{sk.name} <em className="lv-n">{up.level}</em></b>
        {perk ? <span><strong>{perk.name}</strong> {perk.effect}</span> : (() => { const nx = sk.perks.find((p) => p.level > up.level); return nx ? <span>Next perk at {nx.level}: {nx.name}</span> : null; })()}
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

/** The character's growth in sight while you play: every skill gained shows as a small chip with how far
 *  it is to the next level (and what that level brings), over the Me button. */
export function SkillPops() {
  // one quiet chip that rises from the Me button: gains that come together are merged into it, and it
  // never stacks into a column of boxes over the counter
  const [pop, setPop] = useState<{ k: number; gains: Partial<Record<SkillId, number>>; last: SkillId } | null>(null);
  const timer = useRef(0);
  useEffect(() => {
    let prev = useGame.getState().skills ?? {};
    return useGame.subscribe((s) => {
      const now = s.skills ?? {};
      if (now === prev) return;
      const fresh: [SkillId, number][] = [];
      for (const k of Object.keys(now) as SkillId[]) { const d = (now[k] ?? 0) - (prev[k] ?? 0); if (d > 0) fresh.push([k, d]); }
      prev = now;
      if (!fresh.length || !s.started) return;
      setPop((p) => {
        const gains = { ...(p?.gains ?? {}) };
        for (const [k, d] of fresh) gains[k] = (gains[k] ?? 0) + d;
        return { k: p?.k ?? Date.now(), gains, last: fresh[fresh.length - 1][0] };
      });
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setPop(null), 2200);
    });
  }, []);
  const anchor = typeof document !== 'undefined' ? document.querySelector('[data-testid="nav-hero"]')?.getBoundingClientRect() : undefined;
  if (!pop) return null;
  const xp = useGame.getState().skills?.[pop.last] ?? 0;
  const lv = levelOf(xp), lo = xpFor(lv), hi = xpFor(lv + 1);
  const pct = lv >= MAX_LEVEL ? 100 : Math.round(((xp - lo) / Math.max(1, hi - lo)) * 100);
  const parts = (Object.entries(pop.gains) as [SkillId, number][]).sort((a, c) => c[1] - a[1]).slice(0, 2);
  const style = anchor ? { left: `${Math.round(Math.min(window.innerWidth - 90, Math.max(90, anchor.left + anchor.width / 2)))}px`, bottom: `${Math.round(window.innerHeight - anchor.top + 6)}px` } : undefined;
  return (
    <div className="skill-pops" aria-live="polite" data-testid="skill-pops" style={style}>
      <div key={pop.k} className="skill-pop">
        <b>{parts.map(([k, d]) => `+${Math.round(d)} ${SKILLS[k].name}`).join(' · ')}</b>
        <i><em style={{ width: `${pct}%` }} /></i>
      </div>
    </div>
  );
}

/** One number for how far the merchant has come: every skill level above the first, added up. */
export const merchantLevel = (skills: Partial<Record<SkillId, number>> | undefined) => 1 + SKILL_ORDER.reduce((a, k) => a + levelOf(skills?.[k] ?? 0) - 1, 0);
