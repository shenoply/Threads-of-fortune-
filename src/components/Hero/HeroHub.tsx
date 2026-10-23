import { HealthStrip } from '../Health/HealthStrip';
import { HERO_NAME } from '../../data/hero';
import { useState } from 'react';
import { useGame } from '../../game/state/store';
import { rankOf } from '../../game/economy/progress';
import { mannerTitle, START_MANNER } from '../../data/character';
import { START_WARDROBE, heroCharisma, wornOutfit } from '../../data/wardrobe';
import { HeroFigure } from '../Wardrobe/HeroFigure';
import { Wardrobe } from '../Wardrobe/Wardrobe';
import { MeNext } from './MeNext';
import { MeSection, SkillsSection } from '../Character/Character';
import { HouseholdSection } from '../Character/Household';
import './HeroHub.css';

/** Everything about the merchant himself: how he looks, what he has, how he is growing. */
export function HeroHub() {
  const g = useGame();
  const [open, setOpen] = useState(false);
  const w = g.wardrobe ?? START_WARDROBE;
  const clean = g.attire?.clean ?? 100;
  const ch = heroCharisma(w, clean);
  const { rank } = rankOf(g);
  return (
    <div className="screen hero-hub" data-testid="hero-hub">
      <HealthStrip always />
      <section className="hh-top">
        <button className="hh-room" style={{ backgroundImage: 'linear-gradient(180deg, rgba(18,12,7,0.05), rgba(18,12,7,0.45)), url(art/hero/wardrobe-room.jpg)' }} onClick={() => setOpen(true)} aria-label="Open the wardrobe" data-testid="hh-figure">
          <div className="hh-figure"><HeroFigure pose="wardrobe" outfitId={wornOutfit(w).id} /></div>
          <span className="hh-tap">Tap to dress</span>
        </button>
        <div className="hh-stats">
          <small>THE MERCHANT OF GIZA</small>
          <h2 data-testid="hero-name">{HERO_NAME}</h2>
          <p className="hh-called">{rank.name}</p>
          <p className="hh-called">The bazaar calls you <b>{mannerTitle(g.manner ?? START_MANNER)}</b>.</p>
          <dl>
            <div><dt>Charisma</dt><dd>{ch}</dd></div>
            <div><dt>Clothes</dt><dd>{clean >= 70 ? 'Clean' : clean >= 35 ? 'Dusty' : 'Filthy'} <small>{Math.round(clean)}%</small></dd></div>
          </dl>
          <button className="btn primary" onClick={() => setOpen(true)} data-testid="hh-wardrobe">Wardrobe</button>
        </div>
      </section>
      <MeNext onWardrobe={() => setOpen(true)} />
      <MeSection hideDress />
      <HouseholdSection />
      <SkillsSection />
      {open && <Wardrobe onClose={() => setOpen(false)} />}
    </div>
  );
}
