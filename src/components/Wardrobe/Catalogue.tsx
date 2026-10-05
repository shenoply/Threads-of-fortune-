import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../../game/state/store';
import { fmt } from '../../game/economy/money';
import { SETTLEMENTS } from '../../data/world';
import { OUTFIT, START_WARDROBE, fullSrc, heroCharisma, soldIn, type ReadyOutfit } from '../../data/wardrobe';
import { CLOTHING_SHOPS, otherShopsFor, shopById } from '../../data/clothingShops';
import { Wardrobe } from './Wardrobe';
import './Catalogue.css';

const townName = (id: string) => SETTLEMENTS.find((s) => s.id === id)?.name ?? id;
const roman = (n: number) => ['', 'I', 'II', 'III', 'IV', 'V'][n] ?? String(n);

const PAGES: { id: string; label: string; test: (o: ReadyOutfit) => boolean }[] = [
  { id: 'everyday', label: 'Everyday dress', test: (o) => o.dress === 'galabiya' },
  { id: 'effendi', label: 'Merchant and effendi', test: (o) => o.dress === 'stambouli' },
  { id: 'formal', label: 'Court and silk', test: (o) => o.dress === 'frockcoat' || o.dress === 'kaftan' },
];

/** The shop catalogue: a printed book of what this shop sells, and (locked) what only the other town's shops stock. */
export function Catalogue({ shopId, onClose }: { shopId: string; onClose: () => void }) {
  const shop = shopById(shopId)!;
  const g = useGame();
  const w = g.wardrobe ?? START_WARDROBE;
  const at = g.world?.at ?? null;
  const clean = g.attire?.clean ?? 100;
  const own = useMemo(() => new Set(shop.stock), [shop]);
  const elsewhere = useMemo(() => new Set(CLOTHING_SHOPS.filter((s) => s.town !== shop.town).flatMap((s) => s.stock).filter((id) => !own.has(id))), [shop, own]);
  const pages = useMemo(() => PAGES.map((p) => ({
    ...p,
    open: shop.stock.map((id) => OUTFIT[id]).filter((o) => o && p.test(o)),
    locked: [...elsewhere].map((id) => OUTFIT[id]).filter((o) => o && p.test(o)),
  })).filter((p) => p.open.length + p.locked.length > 0), [shop, elsewhere]);
  const [pageId, setPageId] = useState(pages[0]?.id ?? 'everyday');
  const [note, setNote] = useState('');
  const [fitting, setFitting] = useState(false);
  const page = pages.find((p) => p.id === pageId) ?? pages[0];
  const chNow = heroCharisma(w, clean);

  const buy = (o: ReadyOutfit) => setNote(g.buyOutfit(o.id) || 'Done.');
  const wear = (o: ReadyOutfit) => { g.wearOutfit(o.id); setNote(`You change into ${o.name.toLowerCase()}.`); };

  const card = (o: ReadyOutfit, i: number, locked: boolean) => {
    const owned = w.owned.includes(o.id);
    const wearing = w.worn === o.id;
    const ch = heroCharisma({ ...w, worn: o.id }, clean);
    const there = locked ? otherShopsFor(o.id, shop.town)[0] : undefined;
    return (
      <div key={o.id} className={`cat-item${locked ? ' locked' : ''}${owned ? ' owned' : ''}`} data-testid={locked ? `cat-locked-${o.id}` : `cat-item-${o.id}`}>
        <span className="cat-no">{locked ? 'Not stocked' : `No. ${i + 1}`}</span>
        <span className="cat-plate">
          <i style={{ backgroundImage: `url(${fullSrc(o.id)})` }} />
          {locked && <span className="cat-lock" aria-hidden="true">🔒</span>}
        </span>
        <b className="cat-name">{o.name}</b>
        <small className="cat-note">{o.note}</small>
        <span className="cat-foot">
          <span className="cat-price">{owned ? (wearing ? 'Wearing' : 'Owned') : fmt(o.price)}</span>
          <em>Charisma {ch > chNow ? `+${ch - chNow}` : ch === chNow ? 'same' : ch - chNow}</em>
          {!locked && (owned
            ? <button className="cat-add" disabled={wearing} onClick={() => wear(o)} data-testid={`cat-wear-${o.id}`}>{wearing ? 'On' : 'Put on'}</button>
            : <button className="cat-add on" disabled={!soldIn(o, at) || g.cash < o.price} onClick={() => buy(o)} data-testid={`cat-buy-${o.id}`}>{g.cash < o.price ? 'Not enough' : 'Buy and wear'}</button>)}
        </span>
        {locked && <span className="cat-where">{there ? `Found in ${townName(there.town)}: ${there.name}, ${there.address}.` : `Sold in ${o.where.slice(0, 3).map(townName).join(', ')}.`}</span>}
      </div>
    );
  };

  return createPortal(
    <div className="overlay catalogue" role="dialog" aria-label={`${shop.name} catalogue`} data-testid="catalogue">
      <div className="cat-top">
        <button className="btn" onClick={onClose} data-testid="cat-close">Leave the shop</button>
        <span className="cat-cash">Cash <b>{fmt(g.cash)}</b> · Charisma <b>{chNow}</b></span>
      </div>
      <div className="cat-scroll">
        <article className="cat-paper">
          <header className="cat-masthead">
            <small className="cat-est">Established {shop.est}</small>
            <h1>{shop.name}</h1>
            <div className="cat-rule"><i /><span>✦</span><i /></div>
            <p className="cat-tag">{shop.tagline}</p>
            <p className="cat-addr">{shop.address}, {townName(shop.town)}</p>
            <p className="cat-blurb">{shop.blurb}</p>
          </header>
          {pages.length > 1 && (
            <nav className="cat-tabs" role="tablist">
              {pages.map((p, i) => (
                <button key={p.id} role="tab" aria-selected={page?.id === p.id} className={page?.id === p.id ? 'on' : ''} onClick={() => setPageId(p.id)} data-testid={`cat-tab-${p.id}`}><em>{roman(i + 1)}</em> {p.label}</button>
              ))}
            </nav>
          )}
          {page && (
            <section className="cat-page">
              <h2><span>Page {roman(pages.indexOf(page) + 1)}</span> {page.label}</h2>
              <div className="cat-grid">
                {page.open.map((o, i) => card(o, i, false))}
                {page.locked.map((o, i) => card(o, i, true))}
              </div>
            </section>
          )}
          <footer className="cat-colophon">All prices in Egyptian pounds and piastres. Garments altered to measure at no charge. No credit given.</footer>
        </article>
      </div>
      <div className="cat-bar">
        {note && <p className="cat-note-line" data-testid="cat-msg">{note}</p>}
        <div className="cat-bar-row">
          <button className="btn" onClick={() => setFitting(true)} data-testid="cat-fitting">Your wardrobe</button>
        </div>
      </div>
      {fitting && <Wardrobe onClose={() => setFitting(false)} />}
    </div>,
    document.body,
  );
}
