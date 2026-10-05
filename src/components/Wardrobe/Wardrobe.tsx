import { useEffect, useState } from 'react';
import { useGame } from '../../game/state/store';
import { fmt } from '../../game/economy/money';
import { SETTLEMENTS } from '../../data/world';
import { OUTFITS, OUTFIT, START_WARDROBE, fullSrc, heroCharisma, soldIn, type ReadyOutfit } from '../../data/wardrobe';
import { HeroFigure } from './HeroFigure';
import { preload } from '../../game/preload';
import './Wardrobe.css';

const placeName = (id: string) => SETTLEMENTS.find((s) => s.id === id)?.name ?? id;
const ROOM = 'art/hero/wardrobe-room.jpg';

/** The hero's wardrobe: twenty ready outfits. Look at one full length, buy it where it is sold, put it on.
 *  Whatever he wears here is what he wears at the stall. */
export function Wardrobe({ onClose }: { onClose: () => void; startSlot?: string }) {
  const g = useGame();
  const w = g.wardrobe ?? START_WARDROBE;
  const at = g.world?.at ?? null;
  const here = at && at !== 'road' ? placeName(at) : null;
  const clean = g.attire?.clean ?? 100;
  const [look, setLook] = useState<string>(w.worn);
  const [note, setNote] = useState('');
  const o: ReadyOutfit = OUTFIT[look] ?? OUTFIT[w.worn];
  const owned = w.owned.includes(o.id);
  const wearing = w.worn === o.id;
  const forHere = soldIn(o, at);
  const chNow = heroCharisma(w, clean);
  const chThis = heroCharisma({ ...w, worn: o.id }, clean);
  useEffect(() => { preload(OUTFITS.map((x) => fullSrc(x.id))); }, []);

  // owned first, then what this town sells, then the rest; each by price
  const order = [...OUTFITS].sort((a, b) => {
    const r = (x: ReadyOutfit) => (w.owned.includes(x.id) ? 0 : soldIn(x, at) ? 1 : 2);
    return r(a) - r(b) || a.price - b.price;
  });
  const buy = () => { const msg = g.buyOutfit(o.id); setNote(msg); };
  const wear = () => { g.wearOutfit(o.id); setNote(`You change into ${o.name.toLowerCase()}. The stall will see you in it.`); };

  return (
    <div className="overlay wardrobe" role="dialog" aria-label="Wardrobe" data-testid="wardrobe">
      <div className="overlay-head">
        <div>
          <h2>Wardrobe</h2>
          <div className="sub">{here ? `In ${here}` : 'On the road: nothing to buy here'} · Cash {fmt(g.cash)} · Charisma {chNow}</div>
        </div>
        <button className="btn" onClick={onClose} data-testid="wr-close">Close</button>
      </div>
      <div className="wr-body">
        <section className="wr-stage" style={{ backgroundImage: `linear-gradient(180deg, rgba(18,12,7,0.05), rgba(18,12,7,0.4)), url(${ROOM})` }}>
          <HeroFigure key={o.id} pose="wardrobe" outfitId={o.id} className="wr-hero" />
          <div className="wr-caption">
            <b>{o.name}</b>
            <span>{wearing ? 'Wearing' : owned ? 'In your wardrobe' : fmt(o.price)} · charisma {chThis}{chThis !== chNow ? ` (${chThis > chNow ? '+' : ''}${chThis - chNow})` : ''}</span>
          </div>
        </section>
        <section className="wr-shop">
          <div className="wr-detail" data-testid="wr-detail">
            <p>{o.note}</p>
            <p className="wr-where">{owned ? 'Yours.' : forHere ? `Sold here, ${fmt(o.price)}.` : o.where.length ? `Sold in ${o.where.slice(0, 4).map(placeName).join(', ')}.` : 'Sold in any market town.'}</p>
            <div className="wr-actions">
              {owned
                ? <button className="btn primary" disabled={wearing} onClick={wear} data-testid="wr-wear">{wearing ? 'Wearing it' : 'Put it on'}</button>
                : <button className="btn primary" disabled={!forHere || g.cash < o.price} onClick={buy} data-testid="wr-buy">{forHere ? `Buy for ${fmt(o.price)}` : 'Not sold here'}</button>}
            </div>
            {note && <p className="wr-note" data-testid="wr-note">{note}</p>}
          </div>
          <div className="wr-grid" data-testid="wr-grid">
            {order.map((x) => (
              <button key={x.id} className={`wr-card${x.id === o.id ? ' on' : ''}${w.worn === x.id ? ' worn' : ''}`} onClick={() => { setLook(x.id); setNote(''); }} data-testid={`wr-outfit-${x.id}`}>
                <span className="wr-thumb" style={{ backgroundImage: `url(${fullSrc(x.id)})` }} />
                <span className="wr-card-name">{x.name}</span>
                <small>{w.worn === x.id ? 'Wearing' : w.owned.includes(x.id) ? 'Owned' : soldIn(x, at) ? `Here · ${fmt(x.price)}` : fmt(x.price)}</small>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
