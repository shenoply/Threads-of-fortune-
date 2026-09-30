import { useEffect, useRef, useState } from 'react';
import { useGame } from '../../game/state/store';
import { fmt } from '../../game/economy/money';
import { audio } from '../../game/audio/engine';
import { RUGS } from '../../data/rugs';
import { LAB_SERVICES, type LabService } from '../../game/systems/arranLab';
import { bookPhase } from '../../game/systems/arranBooks';
import { SECTIONS, SHOP, type ShopItem } from '../../game/systems/arranShop';
import './ArranCatalogue.css';

/**
 * Arran's price book, laid out like a mail-order catalogue: index tabs, engraved plates, small print
 * and a price on every line. Pick an entry to read it on the facing page and buy it from the bar.
 */
export function ArranCatalogue({ onClose, onService }: { onClose: () => void; onService: (sv: LabService) => void }) {
  const g = useGame();
  const [sec, setSec] = useState<string>(SECTIONS[0].id);
  const [sel, setSel] = useState<string>(SHOP.find((i) => i.section === SECTIONS[0].id)!.id);
  const [note, setNote] = useState('');
  const detail = useRef<HTMLElement>(null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  const items = SHOP.filter((i) => i.section === sec);
  const item = SHOP.find((i) => i.id === sel) ?? items[0];
  const secIdx = SECTIONS.findIndex((s) => s.id === sec);
  const unlocked = g.labUnlocked ?? [];
  const tools = g.arranTools ?? [];
  const pick = (it: ShopItem) => {
    setSel(it.id); setNote(''); audio.sfx('tap');
    // on a phone the facing page is below the plates: bring it into view
    if (window.innerWidth <= 700) requestAnimationFrame(() => detail.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  const turn = (d: number) => {
    const n = SECTIONS[(secIdx + d + SECTIONS.length) % SECTIONS.length];
    setSec(n.id); setSel(SHOP.find((i) => i.section === n.id)!.id); setNote(''); audio.sfx('pen');
  };

  const status = (it: ShopItem): string => {
    if (it.kind === 'service' && it.service) {
      if (it.service === 'metal') return 'Not taken at present';
      if (it.service !== 'fastness' && !unlocked.includes(it.service)) return 'Needs his book';
    }
    if (it.kind === 'tool' && tools.includes(it.id)) return 'Owned';
    if (it.kind === 'book' && it.book) return bookPhase(g.arranBooks, it.book) === 'returned' ? 'On his shelf' : 'Wanted';
    return '';
  };

  // results that can be written up: agree with the description, rug still yours, no report yet
  const reportable = (g.arranFindings ?? []).filter((f) => {
    if (f.verdict !== 'consistent' || !['fibre', 'fastness', 'dye'].includes(f.service)) return false;
    const r = g.inventory.find((i) => i.uid === f.subjectId);
    return !!r && !(r.labReports ?? []).includes(f.service);
  });

  const price = (it: ShopItem) => (it.price == null ? '—' : fmt(it.price));

  return (
    <div className="cat" role="dialog" aria-label="Arran's price book" data-testid="arran-catalogue">
      <div className="cat__book">
        <header className="cat__masthead">
          <small>Season of 1925 · Prices in Egyptian money</small>
          <h1>A. Embleton</h1>
          <p>Textile Chemist · Examinations, Reports &amp; Instruments · Giza</p>
          <div className="cat__rule" />
        </header>

        <nav className="cat__tabs" aria-label="Sections">
          {SECTIONS.map((s, i) => (
            <button key={s.id} type="button" className={`cat__tab ${sec === s.id ? 'is-on' : ''}`} onClick={() => { setSec(s.id); setSel(SHOP.find((x) => x.section === s.id)!.id); setNote(''); audio.sfx('pen'); }} data-testid={`cat-tab-${s.id}`}>
              <span>{['I', 'II', 'III', 'IV'][i]}</span>{s.title}
            </button>
          ))}
        </nav>

        <div className="cat__spread">
          {/* left page: the plates of this section */}
          <section className="cat__page cat__page--list" aria-label={SECTIONS[secIdx].title}>
            <h2>{SECTIONS[secIdx].title}</h2>
            <p className="cat__sub">{SECTIONS[secIdx].sub}</p>
            <div className="cat__grid">
              {items.map((it, n) => {
                const stt = status(it);
                return (
                  <button key={it.id} type="button" className={`cat__entry ${item.id === it.id ? 'is-sel' : ''} ${stt === 'Owned' || stt === 'On his shelf' ? 'is-owned' : ''}`} onClick={() => pick(it)} data-testid={`cat-item-${it.id}`}>
                    <span className="cat__no">No. {secIdx + 1}{String(n + 1).padStart(2, '0')}</span>
                    <img src={`art/arran/cat/${it.img}.webp`} alt="" draggable={false} />
                    <b>{it.name}</b>
                    <span className="cat__price">{price(it)}</span>
                    {stt && <em className="cat__stamp">{stt}</em>}
                  </button>
                );
              })}
            </div>
            <footer className="cat__folio">
              <button type="button" onClick={() => turn(-1)} aria-label="Previous section" data-testid="cat-prev">‹</button>
              <span>Page {secIdx * 2 + 3}</span>
              <button type="button" onClick={() => turn(1)} aria-label="Next section" data-testid="cat-next">›</button>
            </footer>
          </section>

          {/* right page: the chosen entry in full */}
          <section className="cat__page cat__page--detail" ref={detail} aria-live="polite" data-testid="cat-detail">
            <img className="cat__plate" src={`art/arran/cat/${item.img}.webp`} alt="" draggable={false} />
            <h3>{item.name}</h3>
            <div className="cat__pricebar"><span>Price</span><i /><b data-testid="cat-price">{price(item)}</b></div>
            <p className="cat__blurb">{item.blurb}</p>
            <p className="cat__effect"><span>In the game:</span> {item.effect}</p>
            {item.kind === 'report' && (
              <div className="cat__reports">
                <p className="cat__small">Results he can write up for you:</p>
                {!reportable.length && <p className="cat__small">None yet. Only a result that agrees with the rug's description can be signed.</p>}
                {reportable.map((f) => {
                  const r = g.inventory.find((i) => i.uid === f.subjectId)!;
                  return (
                    <div className="cat__reportrow" key={f.id}>
                      <span><b>{RUGS[r.typeId]?.name}</b> · {LAB_SERVICES[f.service].label}</span>
                      <button type="button" className="cat__buy small" onClick={() => setNote(g.arranBuy('report', f.id))} data-testid={`cat-report-${f.id}`}>Buy · {fmt(item.price!)}</button>
                    </div>
                  );
                })}
              </div>
            )}
            {note && <p className="cat__note" data-testid="cat-note">{note}</p>}
          </section>
        </div>

        <div className="cat__bar">
          <span className="cat__purse">Your purse · <b>{fmt(g.cash)}</b></span>
          {item.kind === 'service' && item.service && (() => {
            const sv = item.service;
            const locked = sv === 'metal' || (sv !== 'fastness' && !unlocked.includes(sv));
            return <button type="button" className="cat__buy" disabled={locked} onClick={() => onService(sv)} data-testid="cat-use">{locked ? status(item) : `Choose a rug · ${fmt(LAB_SERVICES[sv].price)}`}</button>;
          })()}
          {item.kind === 'tool' && (
            <button type="button" className="cat__buy" disabled={tools.includes(item.id)} onClick={() => setNote(g.arranBuy(item.id))} data-testid="cat-buy">{tools.includes(item.id) ? 'Owned' : `Buy · ${fmt(item.price!)}`}</button>
          )}
          {item.kind === 'book' && <span className="cat__hint">{status(item) === 'On his shelf' ? 'Returned. Read it in the notebook.' : 'Fetch it for him: see the notebook.'}</span>}
          <button type="button" className="cat__close" onClick={onClose} data-testid="cat-close">Close</button>
        </div>
      </div>
    </div>
  );
}
