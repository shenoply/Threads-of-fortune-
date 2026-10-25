// The buyer's card: who is at your counter, as a merchant reads them. Their temper (patient or
// short, trusting or wary, stubborn, easily charmed, unpredictable), what they like and cannot
// abide, the colour they lean to, what they spend, and how they came today: some days they only
// look, and the best patter in Cairo will not sell to them. What you have not learned yet stays a
// question, filled in by asking them and by their visits.
import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../../game/state/store';
import { BUYERS, CELEB_INFO } from '../../data/buyers';
import { RUGS } from '../../data/rugs';
import { fmt } from '../../game/economy/money';
import { PURSE, prefsFor, type Encounter } from '../../game/systems/negotiation';
import { useDialogEscape } from '../useDialogEscape';
import './dossier.css';

const LIKES: Record<string, string> = {
  restrained: 'Quiet patterns', story: 'A rug with a story', fineWeave: 'A fine weave', antique: 'Age', warm: 'Warm colours', bold: 'Bold patterns',
  ornate: 'Ornate work', silk: 'Silk', hardwearing: 'Hard-wearing', darkField: 'A dark ground', lightField: 'A light ground', humble: 'Plain village work',
  rare: 'Something rare', flatweave: 'Kilims', geometric: 'Geometric designs', floral: 'Flowers', tribal: 'Tribal work', large: 'Large carpets', small: 'Small rugs',
  fragile: 'Delicate pieces', documented: 'Papers and provenance', prestige: 'A name to boast of', new: 'New work',
};
const COLOUR: Record<string, { word: string; hex: string }> = {
  indigo: { word: 'Indigo', hex: '#3f5aa8' }, ivory: { word: 'Ivory', hex: '#e9dcc0' }, crimson: { word: 'Red', hex: '#b2382c' },
  gold: { word: 'Gold', hex: '#d9a441' }, mixed: { word: 'Many colours', hex: '#8a6a9a' },
};
const ARG: Record<string, string> = { story: 'Moved by a story', craft: 'Admires craft', fit: 'Wants it to suit the room', durability: 'Wants it to last' };

type Chip = { label: string; tone: 'good' | 'warn' | 'bad' | 'plain'; tip: string };

/** the temper, read from what the buyer is like (their patience, trust, the things that annoy them) */
function temper(id: string): Chip[] {
  const b = BUYERS[id];
  const out: Chip[] = [];
  if (b.patience <= 45) out.push({ label: 'Impatient', tone: 'warn', tip: 'Gets bored quickly. Show the right rug early.' });
  else if (b.patience >= 70) out.push({ label: 'Patient', tone: 'good', tip: 'Will hear you out.' });
  if (b.trust <= 35) out.push({ label: 'Wary', tone: 'warn', tip: 'Slow to trust. Honesty pays.' });
  else if (b.trust >= 60) out.push({ label: 'Trusting', tone: 'good', tip: 'Takes you at your word.' });
  if ((b.pushyTrust ?? 0) <= -4) out.push({ label: 'Stubborn', tone: 'bad', tip: 'Push them and they dig in.' });
  if ((b.directBudgetTrust ?? 0) <= -5) out.push({ label: 'Hates money talk', tone: 'warn', tip: 'Asking the budget early sours them.' });
  if (b.interest <= 30) out.push({ label: 'Hard to impress', tone: 'warn', tip: 'Starts cold. Only a fine match warms them.' });
  if ((b.embellishNotice ?? 0) >= 0.5) out.push({ label: 'Sharp eye', tone: 'bad', tip: 'Will catch a tall tale.' });
  else if ((b.embellishNotice ?? 1) <= 0.25) out.push({ label: 'Easily charmed', tone: 'good', tip: 'A good story goes a long way.' });
  if ((b.needs?.length ?? 0) >= 2) out.push({ label: 'Unpredictable', tone: 'plain', tip: 'Wants something different visit to visit.' });
  if ((b.catAffinity ?? 0) > 0) out.push({ label: 'Fond of cats', tone: 'good', tip: 'Saffron helps.' });
  else if ((b.catAffinity ?? 0) < 0) out.push({ label: 'Dislikes cats', tone: 'warn', tip: 'Keep Saffron out of it.' });
  const top = Object.entries(b.args ?? {}).sort((a, c) => c[1] - a[1])[0];
  if (top && top[1] >= 1.5 && ARG[top[0]]) out.push({ label: ARG[top[0]], tone: 'plain', tip: 'The argument that works best on them.' });
  return out;
}

export function BuyerDossier({ enc, onClose }: { enc: Encounter; onClose: () => void }) {
  const g = useGame();
  const box = useRef<HTMLDivElement>(null);
  useDialogEscape(box, onClose, true);
  const b = BUYERS[enc.buyerId];
  if (!b) return null;
  const rel = g.relationships[enc.buyerId];
  const visits = rel?.visits ?? 0;
  const prefs = prefsFor(enc);
  // what they like is learned: by asking (the room, what draws them), or by having had them before
  const knowsLikes = visits >= 2 || enc.asked.includes('room') || enc.asked.includes('drawn');
  const knowsBudget = !!enc.budgetKnown || (rel?.purchases ?? 0) > 0;
  const vals = Object.entries(prefs.values ?? {});
  const likes = vals.filter(([k, v]) => v >= 1 && LIKES[k]).sort((a, c) => c[1] - a[1]).slice(0, 4).map(([k]) => LIKES[k]);
  const hates = vals.filter(([k, v]) => v <= -1 && LIKES[k]).sort((a, c) => a[1] - c[1]).slice(0, 3).map(([k]) => LIKES[k]);
  const col = Object.entries(prefs.colourPref ?? {}).sort((a, c) => c[1] - a[1])[0];
  const fav = col && col[1] > 0 ? COLOUR[col[0]] : undefined;
  const budget = enc.budgetKnown ?? prefs.budget;
  const purse = enc.purse ? PURSE[enc.purse] : null;
  const role = CELEB_INFO[enc.buyerId as keyof typeof CELEB_INFO]?.role ?? prefs.needLabel ?? b.role;
  const accent = fav?.hex ?? '#d9a441';
  return createPortal(
    <div className="overlay dossier-overlay" onClick={onClose} ref={box} role="dialog" aria-modal="true" aria-label={`${b.name}: what you know`}>
      <div className="dossier" style={{ ['--acc' as string]: accent }} onClick={(e) => e.stopPropagation()} data-testid="dossier">
        <div className="ds-top">
          <img className="ds-face" src={`art/portraits/${enc.buyerId}.jpg`} alt="" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
          <div className="ds-who">
            <small>{visits > 1 ? `Visit ${visits}` : 'First visit'}{rel?.purchases ? ` · bought ${rel.purchases}` : ''}</small>
            <b>{b.name}</b>
            <span>{role}</span>
          </div>
          <button className="ds-close" onClick={onClose} aria-label="Close" data-testid="dossier-close">×</button>
        </div>

        <div className={`ds-today ${enc.purse ?? 'usual'}`} data-testid="dossier-today">
          <small>TODAY</small>
          <b>{purse ? purse.label : 'Here to look and maybe buy'}</b>
          <span>{purse ? purse.line : 'An ordinary visit: the right rug, well shown, can win them.'}</span>
        </div>

        <section className="ds-sec">
          <h4>Their temper</h4>
          <div className="ds-chips">{temper(enc.buyerId).map((c) => <span key={c.label} className={`ds-chip ${c.tone}`} title={c.tip}><b>{c.label}</b><small>{c.tip}</small></span>)}</div>
        </section>

        <section className="ds-sec">
          <h4>What they look for</h4>
          {knowsLikes ? (
            <>
              <div className="ds-likes">{likes.map((l) => <span key={l} className="ds-like">♥ {l}</span>)}{fav && <span className="ds-like col"><i style={{ background: fav.hex }} /> {fav.word}</span>}</div>
              {hates.length > 0 && <div className="ds-likes">{hates.map((l) => <span key={l} className="ds-hate">✕ {l}</span>)}</div>}
            </>
          ) : <p className="ds-unknown" data-testid="dossier-unknown">Not known yet. Ask about the room, or what draws them, and it fills in.</p>}
        </section>

        <div className="ds-facts">
          <span><small>Spends</small><b>{knowsBudget ? `${fmt(budget[0])} – ${fmt(budget[1])}` : '?'}</b></span>
          <span><small>Last bought</small><b>{rel?.lastRug ? RUGS[rel.lastRug]?.name ?? '–' : '–'}</b></span>
          <span><small>Spent with you</small><b>{rel?.spent ? fmt(rel.spent) : '–'}</b></span>
        </div>
        <p className="ds-bio">{b.bio}</p>
      </div>
    </div>,
    document.body,
  );
}
