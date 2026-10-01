// Malek's menu as a book: a worn leather cover that swings open onto parchment pages, a page for
// each part of his kitchen, each dish with a picture from his own grill (cropped from the shop's
// paintings), its Arabic name, the price and what it does for you. One page at a time on a phone,
// two side by side on a wide screen; swipe, or use the arrows.
import { useEffect, useRef, useState } from 'react';
import { MALEK_MENU, type MalekItem, type MalekItemId } from '../../data/malekMenu';
import {
  MEAL_MINUTES, MORALE_PATIENCE, UNAVAILABLE_WORD, availability, parcelDays, stockLeft, tabCovers, type MalekState,
} from '../../game/systems/malek';
import { audio } from '../../game/audio/engine';
import { fmt } from '../../game/economy/money';

const PAGES: { title: string; ar: string; items: MalekItemId[]; foot?: string }[] = [
  { title: 'Breakfast and the pot', ar: 'الفطور والحلّة', items: ['malek_ful', 'malek_lentils', 'malek_stew'] },
  { title: 'From the charcoal', ar: 'على الفحم', items: ['malek_kofta', 'malek_kebab', 'malek_liver'] },
  { title: 'For the road', ar: 'زاد الطريق', items: ['malek_bastirma', 'malek_road_pack', 'malek_caravan_pack'] },
  { title: 'To drink', ar: 'المشروبات', items: ['malek_tea'], foot: 'Water is free from the jar by the door. Salted parcels do not count as water.' },
];
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const arNum = (n: number) => String(n).replace(/\d/g, (d) => AR_DIGITS[+d]);
const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);
function effects(it: MalekItem) {
  const e = it.effects, out: string[] = [];
  if (e.satiety) out.push(`Fed ${sign(e.satiety)}`);
  if (e.energy) out.push(`Fatigue −${e.energy}`);
  if (e.morale) out.push(`Buyers +${e.morale * MORALE_PATIENCE} patience, 4 h`);
  if (e.hydration) out.push(`Water ${sign(e.hydration)}`);
  return out;
}

export function MalekMenuBook({ hour, day, malek, onOrder, onClose }: {
  hour: number; day: number; malek: MalekState | undefined; onOrder: (id: MalekItemId) => void; onClose: () => void;
}) {
  const leaves = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [perView, setPerView] = useState(1);
  const tab = malek?.tab ?? 0;
  // which page is showing, from the scroll position
  useEffect(() => {
    const el = leaves.current; if (!el) return;
    const sync = () => {
      const w = el.clientWidth;
      setPerView(el.scrollWidth > 0 && (el.firstElementChild as HTMLElement | null) ? Math.max(1, Math.round(w / (el.firstElementChild as HTMLElement).offsetWidth)) : 1);
      setPage(Math.round(el.scrollLeft / ((el.firstElementChild as HTMLElement | null)?.offsetWidth || w)));
    };
    sync();
    el.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    return () => { el.removeEventListener('scroll', sync); window.removeEventListener('resize', sync); };
  }, []);
  const turn = (d: number) => {
    const el = leaves.current; if (!el) return;
    const w = (el.firstElementChild as HTMLElement | null)?.offsetWidth ?? el.clientWidth;
    el.scrollBy({ left: d * w * perView, behavior: 'smooth' });
    audio.sfx('tap');
  };
  const last = Math.max(0, PAGES.length - perView);
  return (
    <div className="mbook" role="dialog" aria-label="Malek's menu" data-testid="malek-menu">
      <div className="mbook__book">
        {/* the cover swings open as the book appears; the pages are already there underneath */}
        <div className="mbook__cover" aria-hidden="true">
          <span className="mbook__cover-ar">مشويات مالك</span>
          <span className="mbook__cover-en">Malek's Grill</span>
          <span className="mbook__cover-small">Giza · behind the bazaar</span>
        </div>
        <div className="mbook__leaves" ref={leaves}>
          {PAGES.map((pg, n) => (
            <section key={pg.title} className="mbook__page" data-testid={`malek-page-${n}`}>
              <header className="mbook__head">
                <span className="mbook__orn" aria-hidden="true">❦</span>
                <h3><span lang="ar" dir="rtl">{pg.ar}</span><small>{pg.title}</small></h3>
              </header>
              <ul className="mbook__dishes">
                {pg.items.map((id) => {
                  const it = MALEK_MENU.find((m) => m.id === id)!;
                  const av = availability(it, hour, day, malek);
                  const left = stockLeft(it, malek, day);
                  return (
                    <li key={id} className={`mbook__dish ${av.ok ? '' : 'is-off'}`} data-testid={`malek-item-${id}`}>
                      <img className="mbook__pic" src={`art/malek/menu/${id}.webp`} alt="" loading="lazy" draggable={false} />
                      <div className="mbook__text">
                        <p className="mbook__line"><b>{it.name}</b><i aria-hidden="true" /><span className="mbook__price">{fmt(it.price)}</span></p>
                        <p className="mbook__ar" lang="ar" dir="rtl">{it.nameAr}</p>
                        <p className="mbook__desc">{it.description}</p>
                        <p className="mbook__chips">{effects(it).map((c) => <span key={c}>{c}</span>)}</p>
                        <p className="mbook__meta">
                          {it.consumption === 'eat_in' ? `Eat here · ${MEAL_MINUTES} min` : `Take away · ${it.servings} serving${it.servings > 1 ? 's' : ''} · ${it.weightKg} kg · keeps ${parcelDays(it, day)} game days`}
                          {Number.isFinite(left) && av.ok ? ` · ${left} left today` : ''}
                        </p>
                        {tab > 0 && tabCovers(it) && av.ok && <p className="malek-tabnote mbook__tab">On Malek's tab: {tab} plate{tab === 1 ? '' : 's'} left</p>}
                        {av.ok
                          ? <button className="btn primary small" onClick={() => onOrder(id)} data-testid={`malek-buy-${id}`}>{it.consumption === 'eat_in' ? 'Order' : 'Buy'}</button>
                          : <span className="mbook__stamp" data-testid={`malek-off-${id}`}>{UNAVAILABLE_WORD[av.why]}</span>}
                      </div>
                    </li>
                  );
                })}
              </ul>
              {pg.foot && <p className="mbook__foot">{pg.foot}</p>}
              {n === PAGES.length - 1 && <p className="mbook__foot mbook__fine">Prices, effects and keeping times are game values, not 1925 prices or real food-safety advice.</p>}
              <p className="mbook__num" aria-hidden="true">— {arNum(n + 1)} —</p>
            </section>
          ))}
        </div>
      </div>
      <nav className="mbook__nav">
        <button className="btn small" onClick={() => turn(-1)} disabled={page <= 0} aria-label="Previous page" data-testid="malek-page-prev">‹</button>
        <span className="mbook__dots" aria-hidden="true">{PAGES.map((p, i) => <i key={p.title} className={i >= page && i < page + perView ? 'is-on' : ''} />)}</span>
        <button className="btn small" onClick={() => turn(1)} disabled={page >= last} aria-label="Next page" data-testid="malek-page-next">›</button>
        <button className="btn small" onClick={onClose} data-testid="malek-menu-close">Close the menu</button>
      </nav>
    </div>
  );
}
