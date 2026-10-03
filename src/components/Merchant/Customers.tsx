import { useState } from 'react';
import { useGame, rankNeeded } from '../../game/state/store';
import { rankOf, RANKS } from '../../game/economy/progress';
import { BUYERS, LISTED_BUYERS as BUYER_ORDER, SPECIAL_BUYERS, BUYER_UNLOCK, BUYER_TIERS, CELEB_IDS, CELEB_INFO, celebUnlock } from '../../data/buyers';
import { NABIL_MIN_REP } from '../../data/nabil';
import { fmt } from '../../game/economy/money';
import { createPortal } from 'react-dom';
import { Cutscene } from '../Malek/Cutscene';
import { STORY_FILM } from '../Malek/storyFilm';
import { IntroFilm } from '../IntroFilm/IntroFilm';
import { FILMS, FILM_ORDER, type FilmId } from '../IntroFilm/films';

const TIER = ['', 'Common', 'Fine', 'Exceptional', 'Legendary'];
const ROYALS = ['fuad', 'nazli', 'abdullah', 'faisal', 'ataturk'];

/** Everyone you will deal with: who they are, what they want, what they spend, and when they will start coming. */
export function Customers() {
  const g = useGame();
  const [open, setOpen] = useState<string | null>(null);
  const show = (id: string) => {
    setOpen(id);
    const seen = useGame.getState().buyersSeen ?? [];
    if (!seen.includes(id)) useGame.setState({ buyersSeen: [...seen, id] });
  };
  const groups: { title: string; note: string; ids: string[] }[] = [
    { title: 'Everyday customers', note: 'Common rugs. They keep the stall alive.', ids: BUYER_ORDER.filter((id) => SPECIAL_BUYERS.includes(id) || (BUYER_TIERS[id]?.[0] ?? 1) === 1) },
    { title: 'Fine households', note: 'Fine rugs, £6 to £18. They start coming once you are a Bazaar merchant.', ids: BUYER_ORDER.filter((id) => !SPECIAL_BUYERS.includes(id) && BUYER_TIERS[id]?.[0] === 2) },
    { title: 'Rich collectors', note: 'Exceptional and Legendary rugs. They come to a Khan dealer, and laugh at a stall of village mats.', ids: BUYER_ORDER.filter((id) => (BUYER_TIERS[id]?.[0] ?? 1) >= 3) },
    { title: 'Famous names of 1925', note: 'Real people of the time. Once you are a Khan dealer they drop in, or stay in a town for a few days.', ids: CELEB_IDS },
    { title: 'The courts', note: 'Kings, a queen, an emir and a president. They receive you in their palaces once your reputation is high enough.', ids: ROYALS },
  ];
  const allIds = groups.flatMap((gr) => gr.ids.filter((id) => BUYERS[id]));
  const unlockOf = (id: string) => (id === 'nabil' ? NABIL_MIN_REP : CELEB_IDS.includes(id) ? celebUnlock(id) : ROYALS.includes(id) ? BUYERS[id]?.royal?.minRep ?? 30 : BUYER_UNLOCK[id] ?? 0);
  return (
    <div className="customers" data-testid="customers">
      <FilmShelf />
      {(g.buyersSeen?.length ?? 0) < 3 ? <p className="cust-goal" data-testid="cust-goal">Tap a buyer to open their card · {g.buyersSeen?.length ?? 0} of 3 opened</p> : <p className="cust-intro">Tap anyone to see what they buy and spend.</p>}
      {groups.map((gr) => (
        <section key={gr.title}>
          <div className="section-label">{gr.title.toUpperCase()}</div>
          <p className="cust-note">{gr.note}</p>
          <div className="cust-grid">
            {gr.ids.filter((id) => BUYERS[id]).map((id) => {
              const b = BUYERS[id];
              const need = unlockOf(id);
              const rankShort = !ROYALS.includes(id) && !SPECIAL_BUYERS.includes(id) && rankOf(g).idx < (CELEB_IDS.includes(id) ? 2 : rankNeeded(id));
              const locked = g.reputation < need || rankShort;
              const r = g.relationships[id];
              const t = BUYER_TIERS[id] ?? [3, 4];
              return (
                <button key={id} className={`cust ${locked ? 'locked' : ''} ${open === id ? 'open' : ''}`} onClick={() => show(id)} data-testid={`cust-${id}`}>
                  <img src={`art/portraits/${id}.jpg`} alt="" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                  <b>{b.name}</b>
                  <small>{rankShort ? RANKS[CELEB_IDS.includes(id) ? 2 : rankNeeded(id)].name : locked ? `Reputation ${need}` : r?.visits ? `${r.visits} visit${r.visits > 1 ? 's' : ''}` : 'Not met yet'}</small>
                </button>
              );
            })}
          </div>
        </section>
      ))}
      {open && BUYERS[open] && (
        <BuyerCard
          id={open}
          onClose={() => setOpen(null)}
          onPrev={allIds.indexOf(open) > 0 ? () => show(allIds[allIds.indexOf(open) - 1]) : undefined}
          onNext={allIds.indexOf(open) < allIds.length - 1 ? () => show(allIds[allIds.indexOf(open) + 1]) : undefined}
        />
      )}
    </div>
  );
}

/** A buyer's card: who they are, what they buy and spend, and how things stand with them so far.
 *  Used both from the full customers list (with Previous/Next) and, standalone, from mid-negotiation
 *  so a buyer's name or portrait can be tapped to see who they are without leaving the table. */
export function BuyerCard({ id, onClose, onPrev, onNext }: { id: string; onClose: () => void; onPrev?: () => void; onNext?: () => void }) {
  const g = useGame();
  const b = BUYERS[id];
  if (!b) return null;
  const need = id === 'nabil' ? NABIL_MIN_REP : CELEB_IDS.includes(id) ? celebUnlock(id) : ROYALS.includes(id) ? b.royal?.minRep ?? 30 : BUYER_UNLOCK[id] ?? 0;
  const locked = g.reputation < need;
  const r = g.relationships[id];
  const t = BUYER_TIERS[id] ?? [3, 4];
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal-card big-card buyer-card" onClick={(e) => e.stopPropagation()} data-testid="buyer-card">
        <div className="big-card-head"><h2>{b.name}</h2><button className="btn door-btn leave slim" onClick={onClose} data-testid="buyer-card-close">⟵ Back</button></div>
        <img className="buyer-big" src={`art/portraits/${id}.jpg`} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        <p className="buyer-role">{CELEB_INFO[id as keyof typeof CELEB_INFO]?.role ?? b.role}</p>
        <div className="buyer-facts">
          <span><small>Buys</small><b>{TIER[t[0]]}{t[1] > t[0] ? ` – ${TIER[t[1]]}` : ''}</b></span>
          <span><small>Spends</small><b>{fmt(b.budget[0])} – {fmt(b.budget[1])}</b></span>
          <span><small>{locked ? 'Comes at' : 'Visits'}</small><b>{locked ? `Rep ${need}` : r?.visits ? r.visits : 'Not met'}</b></span>
        </div>
        <p className="buyer-bio">{b.bio}</p>
        {(onPrev || onNext) && (
          <div className="buyer-nav">
            <button className="btn" disabled={!onPrev} onClick={onPrev}>⟵ Previous</button>
            <button className="btn" disabled={!onNext} onClick={onNext} data-testid="buyer-next">Next ⟶</button>
          </div>
        )}
      </div>
    </div>
  );
}

/** The first-meeting films you have seen, to watch again. */
function FilmShelf() {
  const seen = useGame((st) => st.introSeen ?? []);
  const [play, setPlay] = useState<FilmId | null>(null);
  const films = FILM_ORDER.filter((id) => seen.includes(id));
  // Malek's story on film, once you have seen it in his shop
  const backRoom = useGame((st) => !!st.malek?.story?.completed?.includes(3));
  const [cut, setCut] = useState(false);
  if (!films.length && !backRoom) return null;
  return (
    <div className="film-shelf" data-testid="film-shelf">
      <span>Films</span>
      {films.map((id) => <button key={id} className="btn small" onClick={() => setPlay(id)} data-testid={`film-again-${id}`}>▶ {FILMS[id].name}</button>)}
      {backRoom && <button className="btn small" onClick={() => setCut(true)} data-testid="film-again-backroom">▶ The Back Room (Malek)</button>}
      {play && createPortal(<IntroFilm id={play} onDone={() => setPlay(null)} />, document.body)}
      {cut && createPortal(
        <div className="film-cut" role="dialog" aria-label="The Back Room Opens" data-testid="film-cut">
          <Cutscene shots={STORY_FILM[3]} title="The Back Room Opens" />
          <button className="btn" onClick={() => setCut(false)} data-testid="film-cut-close">Close</button>
        </div>, document.body)}
    </div>
  );
}
