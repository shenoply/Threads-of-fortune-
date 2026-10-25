// The merchant's book: every carpet, every buyer and every town of the game, as pictures to fill in.
// What you have handled, met or reached is shown in full; the rest waits as a dim picture with a line
// on where to find it. Each entry opens the full card (the rug viewer, the buyer's card, the town).
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame, SET_REWARD } from '../../game/state/store';
import { RUGS, RUG_IDS, PERSIAN_RUG_IDS } from '../../data/rugs';
import { BUYERS, CELEB_IDS } from '../../data/buyers';
import { SETTLEMENTS } from '../../data/world';
import { CITY_WALKS } from '../../data/cityWalks';
import { isPersian } from '../../data/persiaMap';
import { rugThumb } from '../RugViewer/rugArt';
import { RugViewer } from '../RugViewer/RugViewer';
import { BuyerCard } from '../Merchant/Customers';
import { PortraitOrCameo } from '../People/Person';
import { personFor } from '../../data/people';
import { sourcesOf } from '../Ledger/Ledger';
import { fmt } from '../../game/economy/money';
import { Icon } from '../Icon';
import { audio } from '../../game/audio/engine';
import './book.css';

type Part = 'carpets' | 'people' | 'places';
const TIER_NAME = ['', 'Everyday rugs', 'Trade rugs', 'City carpets', 'Treasures', 'Carpets of Persia'];
const PLACE_KINDS = ['city', 'town', 'port', 'home'];
const placePic = (id: string) => {
  if (id === 'giza') return 'art/world/thumbs/giza-district-640.webp';
  if (['alexandria', 'amman', 'baghdad', 'damascus', 'istanbul', 'jerusalem'].includes(id)) return `art/world/thumbs/city-${id}-640.webp`;
  if (isPersian(id)) return `art/world/city-${id}.jpg`;
  return CITY_WALKS[id]?.map ?? '';
};

export function Book() {
  const g = useGame();
  const [part, setPart] = useState<Part>('carpets');
  const [rug, setRug] = useState<string | null>(null);
  const [person, setPerson] = useState<string | null>(null);
  const [place, setPlace] = useState<string | null>(null);
  const reg = g.register ?? [];
  const met = (id: string) => (g.relationships[id]?.visits ?? 0) > 0;
  const been = useMemo(() => new Set([g.world.at, ...Object.values(g.whereabouts ?? {})].filter(Boolean) as string[]), [g.world.at, g.whereabouts]);
  const people = useMemo(() => Object.values(BUYERS).filter((b) => !b.royal || true).map((b) => b.id), []);
  const places = SETTLEMENTS.filter((s) => PLACE_KINDS.includes(s.kind));
  const EVERY = [...RUG_IDS, ...PERSIAN_RUG_IDS];
  const count = { carpets: EVERY.filter((id) => reg.includes(id)).length, people: people.filter(met).length, places: places.filter((p) => been.has(p.id)).length };
  const total = { carpets: EVERY.length, people: people.length, places: places.length };
  const pick = (p: Part) => { audio.sfx('tap'); setPart(p); };
  return (
    <div className="book" data-testid="book">
      <div className="book-parts" role="tablist">
        {(['carpets', 'people', 'places'] as Part[]).map((p) => (
          <button key={p} role="tab" aria-selected={part === p} className={part === p ? 'on' : ''} onClick={() => pick(p)} data-testid={`book-${p}`}>
            <b>{p === 'carpets' ? 'Carpets' : p === 'people' ? 'People' : 'Places'}</b>
            <span>{count[p]} of {total[p]}</span>
            <i><em style={{ width: `${(count[p] / Math.max(1, total[p])) * 100}%` }} /></i>
          </button>
        ))}
      </div>

      {part === 'carpets' && [1, 2, 3, 4, 5].map((tier) => {
        // the four tiers of the trade at home, then every carpet of Persia as a set of its own
        const ids = tier === 5 ? PERSIAN_RUG_IDS : RUG_IDS.filter((id) => (RUGS[id].tier ?? 1) === tier);
        const have = ids.filter((id) => reg.includes(id)).length;
        const full = (g.collectSets ?? []).includes(tier);
        return (
        <section key={tier} className={`book-sec tier-sec tier-${tier}`}>
          <h4><span className={`t-tier-${tier === 5 ? 3 : tier}`}>{TIER_NAME[tier]}</span> <small>{have} of {ids.length}</small></h4>
          {/* the set's reward, so every new carpet is a step towards something */}
          <div className={`book-set ${full ? 'full' : ''}`} data-testid={`set-${tier}`}>
            <i><em style={{ width: `${(have / Math.max(1, ids.length)) * 100}%` }} /></i>
            <span>{full ? 'Set complete ✓' : `Complete the set: ${fmt(SET_REWARD[tier].cash)} and +${SET_REWARD[tier].rep} reputation`}</span>
          </div>
          <div className="book-grid rugs">
            {ids.map((id) => {
              const t = RUGS[id], got = reg.includes(id);
              return (
                <button key={id} className={`book-card ${got ? 'got' : 'not'} tier-${t.tier ?? 1}`} onClick={() => { audio.sfx('tap'); setRug(id); }} data-testid={`reg-${id}`}>
                  <span className="book-pic"><img src={rugThumb(t)} alt="" loading="lazy" />{!got && <span className="book-want">To find</span>}</span>
                  <b className={`t-tier-${t.tier ?? 1}`}>{t.name}</b>
                  <small>{fmt(t.valueBand[0])}–{fmt(t.valueBand[1])}{got ? ` · ${t.origin.split(',')[0].split('/')[0].trim()}` : ''}</small>
                  {!got && <small className="book-where">{sourcesOf(id)}</small>}
                </button>
              );
            })}
          </div>
        </section>
        );
      })}

      {part === 'people' && (
        [['Buyers at the stall', people.filter((id) => !BUYERS[id].royal && !CELEB_IDS.includes(id))], ['Famous buyers', people.filter((id) => CELEB_IDS.includes(id))], ['At court', people.filter((id) => BUYERS[id].royal)]] as [string, string[]][]
      ).map(([title, ids]) => (
        <section key={title} className="book-sec">
          <h4>{title} <small>{ids.filter(met).length} of {ids.length}</small></h4>
          <div className="book-grid bk-people">
            {ids.map((id) => (
              <button key={id} className={`book-card bk-person ${met(id) ? 'got' : 'not'}`} onClick={() => { audio.sfx('tap'); setPerson(id); }} data-testid={`book-person-${id}`}>
                <span className="book-face"><PortraitOrCameo id={id} spec={personFor(id)} size={64} /></span>
                <b>{met(id) ? BUYERS[id].name : BUYERS[id].name.split(' ')[0]}</b>
                <small>{met(id) ? BUYERS[id].role.split(',')[0] : 'Not met yet'}</small>
              </button>
            ))}
          </div>
        </section>
      ))}

      {part === 'places' && (
        <section className="book-sec">
          <h4>Towns and cities <small>{count.places} of {total.places} reached</small></h4>
          <div className="book-grid bk-places">
            {places.map((st) => (
              <button key={st.id} className={`book-card bk-place ${been.has(st.id) ? 'got' : 'not'}`} onClick={() => { audio.sfx('tap'); setPlace(st.id); }} data-testid={`book-place-${st.id}`}>
                <span className="book-pic wide">{placePic(st.id) ? <img src={placePic(st.id)} alt="" loading="lazy" /> : <Icon name="map" />}</span>
                <b>{st.name.split(',')[0]}</b>
                <small>{been.has(st.id) ? st.region ?? '' : 'Not reached yet'}</small>
              </button>
            ))}
          </div>
        </section>
      )}

      {rug && (reg.includes(rug)
        ? <div className="venue-overlay"><RugViewer preview={{ typeId: rug, condition: 'Good' }} onClose={() => setRug(null)} /></div>
        : <Entry title={(RUGS[rug].tier ?? 1) < 4 ? RUGS[rug].name : 'An unknown treasure'} pic={rugThumb(RUGS[rug])} dim onClose={() => setRug(null)}>
            <p>You have not handled one yet.</p>
            <p><b>Where to find it:</b> {sourcesOf(rug)}.</p>
            {(RUGS[rug].tier ?? 1) < 4 && <p className="dim">Usually {fmt(RUGS[rug].valueBand[0])}–{fmt(RUGS[rug].valueBand[1])}.</p>}
          </Entry>)}
      {person && <BuyerCard id={person} onClose={() => setPerson(null)} />}
      {place && (() => {
        const st = SETTLEMENTS.find((x) => x.id === place)!;
        return (
          <Entry title={st.name} pic={placePic(st.id)} dim={!been.has(st.id)} onClose={() => setPlace(null)}>
            <p>{st.blurb}</p>
            {!been.has(st.id) && <p className="dim">Not reached yet. Plan the journey from the map.</p>}
          </Entry>
        );
      })()}
    </div>
  );
}

function Entry({ title, pic, dim, onClose, children }: { title: string; pic: string; dim?: boolean; onClose: () => void; children: React.ReactNode }) {
  return createPortal(
    <div className="book-entry-wrap" onClick={onClose} data-testid="book-entry">
      <div className="book-entry" onClick={(e) => e.stopPropagation()}>
        {pic && <span className={`book-entry-pic ${dim ? 'dim' : ''}`}><img src={pic} alt="" /></span>}
        <h3>{title}</h3>
        {children}
        <button className="btn" onClick={onClose} data-testid="book-entry-close">Close</button>
      </div>
    </div>,
    document.body,
  );
}
