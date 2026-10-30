// The encyclopedia: every person, family, town, rug and band in the world, each a page, and every
// name on a page a link to another. People you have met show what you know of them (their traits,
// how they feel, what has passed between you); the rest show what anyone in the bazaar could tell you.
import { favourLine } from '../../game/systems/favours';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame, wantedList } from '../../game/state/store';
import { world, person, houseOf, notablesOf, residentsOf, charactersOf, ageNow, TRAIT_WORD, type Person, type House, type Role } from '../../game/systems/population';
import { SETTLEMENTS } from '../../data/world';
import { RUGS, RUG_IDS, PERSIAN_RUG_IDS } from '../../data/rugs';
import { BAND_ROAD } from '../../game/systems/combat';
import { fmt } from '../../game/economy/money';
import { dateFor } from '../../game/economy/economy';
import { rugThumb } from '../RugViewer/rugArt';
import { howToTell, fakesOf } from '../../data/rugLore';
import { FolkFace } from './FolkFace';
import { CHIEF_MARK, PERSON_MARK } from '../../data/epithets';
import { TraitMarks } from '../Epithet/Epithet';
import { RelBar } from './FolkCard';
import { relWord } from '../../game/systems/folkTalk';
import './folk.css';
import './ency.css';
import { pageProps, useSwipePages } from '../Touch/SwipePages';

type Kind = 'person' | 'house' | 'place' | 'rug' | 'band' | 'portrait';
type Section = 'people' | 'houses' | 'places' | 'rugs' | 'bands';
interface Page { kind: Kind; id: string }
const SECTION_WORD: Record<Section, string> = { people: 'People', houses: 'Families', places: 'Towns', rugs: 'Rugs', bands: 'Bands' };
const ROLE_WORD: Record<string, string> = { souq: 'Souq master', dealer: 'Dealer on the tables', merchant: 'Merchant', notable: 'Man of standing', craft: 'Craftsman', caravan: 'Caravan master', kin: 'Family', resident: 'Foreign resident', character: 'A character of the town' };
const placeName = (id: string) => SETTLEMENTS.find((s) => s.id === id)?.name ?? id;
// a family's standing: the four ranks of house, highest first, and its place among its own town's houses
type Rank = House['rank'];
const RANKS: Rank[] = ['grand', 'notable', 'trade', 'humble'];
const RANK_GROUP: Record<Rank, string> = { grand: 'Great houses', notable: 'Notable houses', trade: 'Trading families', humble: 'Families of the quarter' };
const RANK_ONE: Record<Rank, string> = { grand: 'A great house', notable: 'A notable house', trade: 'A trading family', humble: 'A family of the quarter' };
const RANK_SHORT: Record<Rank, string> = { grand: 'Great house', notable: 'Notable', trade: 'Trade', humble: 'Quarter' };
const HEAD_ORDER: Role[] = ['dealer', 'souq', 'notable', 'resident', 'merchant', 'caravan', 'craft', 'character', 'kin'];
const ORD = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
const ord = (n: number) => ORD[n - 1] ?? `${n}th`;
const houseCmp = (a: House, b: House) => {
  const w = world();
  return RANKS.indexOf(a.rank) - RANKS.indexOf(b.rank) || HEAD_ORDER.indexOf(w.people[a.head]?.role ?? 'kin') - HEAD_ORDER.indexOf(w.people[b.head]?.role ?? 'kin') || b.members.length - a.members.length || a.name.localeCompare(b.name);
};
/** the houses of a town, highest standing first */
const townCache = new Map<string, House[]>();
const housesOfTown = (city: string) => {
  let l = townCache.get(city);
  if (!l) { l = Object.values(world().houses).filter((h) => h.home === city).sort(houseCmp); townCache.set(city, l); queueMicrotask(() => townCache.delete(city)); }
  return l;
};
/** "2nd of 5 houses in Cairo" */
const placeInTown = (h: House) => { const all = housesOfTown(h.home); return { n: all.findIndex((x) => x.id === h.id) + 1, of: all.length }; };
/** where a person stands in the family: Head of the house, Wife, Eldest son... */
function kinWord(x: Person): string {
  const h = x.house ? world().houses[x.house] : undefined;
  if (!h) return '';
  if (h.head === x.id) return 'Head of the house';
  const head = world().people[h.head];
  if (head?.spouse === x.id) return x.sex === 'f' ? 'Wife of the head' : 'Husband of the head';
  const sibs = (head?.children ?? []).map((c) => world().people[c]).filter((c) => c && c.sex === x.sex).sort((a, b) => b.age - a.age);
  const i = sibs.findIndex((c) => c.id === x.id);
  if (i < 0) return 'Of the house';
  const what = x.sex === 'm' ? 'son' : 'daughter';
  return sibs.length === 1 ? `Only ${what}` : i === 0 ? `Eldest ${what}` : i === sibs.length - 1 ? `Youngest ${what}` : `${['', 'Second', 'Third', 'Fourth', 'Fifth'][i] ?? `${ord(i + 1)}`} ${what}`;
}

/** the entries beside this one, for a swipe to the next or the previous: a person among their own
 *  family, a family among its town's houses, a town among the towns, a rug among the rugs */
function siblingsOf(p: Page): string[] {
  const w = world();
  if (p.kind === 'person') { const h = w.people[p.id]?.house; return h && w.houses[h] ? w.houses[h].members.filter((m) => w.people[m]) : []; }
  if (p.kind === 'house') { const h = w.houses[p.id]; return h ? housesOfTown(h.home).map((x) => x.id) : []; }
  if (p.kind === 'place') return SETTLEMENTS.map((s) => s.id);
  if (p.kind === 'rug') return RUG_IDS.filter((id) => RUGS[id]);
  return [];
}

export function Encyclopedia({ start, onClose }: { start?: Page | null; onClose: () => void }) {
  const [stack, setStack] = useState<Page[]>(start ? [start] : []);
  const [section, setSection] = useState<Section>('people');
  const [q, setQ] = useState('');
  const [town, setTown] = useState('');
  const page = stack[stack.length - 1];
  const go = (p: Page) => setStack((s) => [...s, p]);
  const back = () => setStack((s) => s.slice(0, -1));
  useEffect(() => { if (start) setStack([start]); }, [start?.kind, start?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // a swipe sideways turns to the entry beside this one; it takes this page's place, so Back still
  // goes where it went before
  const sibs = page ? siblingsOf(page) : [];
  const si = page ? sibs.indexOf(page.id) : -1;
  const swap = (id: string) => { setStack((s) => [...s.slice(0, -1), { kind: page!.kind, id }]); bodyRef.current?.scrollTo({ top: 0 }); };
  const pages = useSwipePages({ prev: si > 0 ? () => swap(sibs[si - 1]) : null, next: si >= 0 && si < sibs.length - 1 ? () => swap(sibs[si + 1]) : null }, si >= 0);
  const bodyRef = useRef<HTMLDivElement>(null);
  return (
    <div className="ency" role="dialog" aria-label="Encyclopedia" data-testid="encyclopedia">
      <header className="ency-head">
        {page ? <button className="ency-back" onClick={back} data-testid="ency-back">‹</button> : <span />}
        <b>Encyclopedia</b>
        <button className="ency-back" onClick={onClose} data-testid="ency-close">×</button>
      </header>
      <div className="ency-body" ref={bodyRef}>
        {page ? <div {...(si >= 0 ? pageProps(pages) : {})} data-testid="ency-pages" data-at={si >= 0 ? `${si + 1}/${sibs.length}` : undefined}><PageView key={`${page.kind}:${page.id}`} p={page} go={go} back={back} /></div> : (
          <>
            <div className="ency-tabs" role="tablist">{(Object.keys(SECTION_WORD) as Section[]).map((s) => <button key={s} className={section === s ? 'on' : ''} onClick={() => setSection(s)} data-testid={`ency-tab-${s}`}>{SECTION_WORD[s]}</button>)}</div>
            <input className="ency-search" placeholder="Search names, towns, trades" value={q} onChange={(e) => setQ(e.target.value)} data-testid="ency-search" />
            <List section={section} q={q.trim().toLowerCase()} go={go} town={town} setTown={setTown} />
          </>
        )}
      </div>
      {/* a large way out at the foot of the page, where the thumb is; the small one at the top stays */}
      <footer className="ency-foot">
        <button className="ency-bigback" onClick={page ? back : onClose} data-testid="ency-done">{page ? '‹ Back' : 'Back to the game'}</button>
      </footer>
    </div>
  );
}

/** a family as a card: the head's portrait, the rest of the family as a row of faces */
function HouseCard({ h, go, here, n }: { h: House; go: (p: Page) => void; here?: boolean; n?: number }) {
  const w = world();
  const head = w.people[h.head];
  const at = placeInTown(h);
  const others = h.members.filter((m) => m !== h.head).map((m) => w.people[m]).filter(Boolean).sort((a, b) => b.age - a.age);
  return (
    <button className={`ency-house rk-edge-${h.rank}${here ? ' here' : ''}`} onClick={() => !here && go({ kind: 'house', id: h.id })} data-testid={`ency-house-${h.id}`}>
      <FolkFace p={head} size={84} card />
      <span className="ency-house-text">
        <small className="ency-card-label"><i className={`rk rk-${h.rank}`}>{4 - RANKS.indexOf(h.rank)}</i>{n ? `${ord(n)} · ` : ''}{RANK_ONE[h.rank]}</small>
        <b>{h.name}</b>
        <small>{placeName(h.home).split(',')[0]} · {h.trade} · {ord(at.n)} of {at.of}</small>
        <span className="ency-faces">{others.slice(0, 5).map((o) => <FolkFace key={o.id} p={o} size={30} />)}{others.length > 5 && <em>+{others.length - 5}</em>}</span>
      </span>
    </button>
  );
}

function Houses({ q, go, town, setTown }: { q: string; go: (p: Page) => void; town: string; setTown: (t: string) => void }) {
  const w = world();
  const towns = SETTLEMENTS.filter((st) => Object.values(w.houses).some((h) => h.home === st.id));
  const hs = Object.values(w.houses).filter((h) => (!town || h.home === town) && (!q || `${h.name} ${placeName(h.home)} ${h.trade} ${h.members.map((m) => w.people[m]?.name).join(' ')}`.toLowerCase().includes(q))).sort(houseCmp);
  return (
    <div className="ency-list" data-testid="ency-houses">
      <div className="ency-filter">
        <select value={town} onChange={(e) => setTown(e.target.value)} aria-label="Town" data-testid="ency-town">
          <option value="">All towns</option>
          {towns.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
        </select>
        <small className="ency-count">{hs.length} families</small>
      </div>
      <div className="ency-ladder-key">{RANKS.map((r, i) => <span key={r}><i className={`rk rk-${r}`}>{4 - i}</i>{RANK_SHORT[r]}</span>)}</div>
      {RANKS.map((r) => { const grp = hs.filter((h) => h.rank === r); return grp.length === 0 ? null : (
        <section key={r} className="ency-rank" data-testid={`ency-rank-${r}`}>
          <div className="ency-label"><i className={`rk rk-${r}`}>{4 - RANKS.indexOf(r)}</i> {RANK_GROUP[r].toUpperCase()} · {grp.length}</div>
          <div className="ency-houses">{grp.map((h) => <HouseCard key={h.id} h={h} go={go} />)}</div>
        </section>
      ); })}
    </div>
  );
}

const PAGE = 40;
/** what a family calls one of its own: "Abu Nadim", not "Abu"; a mother by her own name, not Umm Karim */
// a title is not a name: "Ustaz Fahmi Abd al-Latif" is Fahmi on his card, "the late Hajj Mansour" Hajj Mansour
const firstName = (x: Person) => { const n = x.name.replace(/^the late\s+/i, '').replace(/^(Ustaz|Ustadh|Sitt|Dr\.?|Khawaga)\s+(?=\S)/, '').split(' '); return /^(Abu|Umm|Abd|Hajj|Haj|Sheikh|Mirza|Signora)$/.test(n[0]) && n[1] ? `${n[0]} ${n[1]}` : n[0]; };
/** one person as a portrait card: the face large, the name, what they are, their family's standing */
function PersonCard({ p, go, tag, label }: { p: Person; go: (p: Page) => void; tag?: string; label?: string }) {
  const g = { day: useGame((s) => s.day) };
  const h = p.house ? world().houses[p.house] : undefined;
  return (
    <button className={`ency-card${h ? ` rk-edge-${h.rank}` : ''}`} onClick={() => go({ kind: 'person', id: p.id })} data-testid={`ency-row-${p.id}`}>
      <FolkFace p={p} size={150} card />
      {tag && <i className="ency-card-tag">{tag}</i>}
      <span className="ency-card-text">
        {label && <small className="ency-card-label">{label}</small>}
        <b>{p.name}</b>
        <small>{p.title}</small>
        <small className="ency-card-age">{ageNow(p, g.day)} · {placeName(p.home).split(',')[0]}{p.mixed ? ` · ${p.mixed}` : p.foreign ? ` · ${p.foreign}` : ''}</small>
      </span>
    </button>
  );
}

function List({ section, q, go, town, setTown }: { section: Section; q: string; go: (p: Page) => void; town: string; setTown: (t: string) => void }) {
  const g = useGame();
  const [more, setMore] = useState(PAGE);
  // the people you know come first: once you have met anyone, the list opens on them
  const [who, setWho] = useState<'met' | 'all' | 'locals' | 'foreign' | 'characters'>(() => (Object.keys(g.folk?.met ?? {}).length ? 'met' : 'all'));
  useEffect(() => setMore(PAGE), [section, q]);
  const w = world();
  const f = g.folk;
  const known = (id: string) => f?.met[id] !== undefined || f?.heard.includes(id);
  if (section === 'people') {
    // everyone in the world is listed from the start: heads, wives and children alike
    const all = Object.values(w.people);
    const towns = SETTLEMENTS.filter((st) => all.some((p) => p.home === st.id));
    const hit = all.filter((p) => (who === 'all' || (who === 'met' ? f?.met[p.id] !== undefined : (who === 'foreign' ? !!p.foreign || !!p.mixed : who === 'characters' ? p.role === 'character' : !p.foreign && p.role !== 'character'))) && (!town || p.home === town) && (!q || `${p.name} ${p.title} ${placeName(p.home)}`.toLowerCase().includes(q)))
      .sort((a, b) => Number(f?.met[b.id] !== undefined) - Number(f?.met[a.id] !== undefined) || Number(known(b.id)) - Number(known(a.id))
        || (a.house && w.houses[a.house] ? RANKS.indexOf(w.houses[a.house].rank) : 9) - (b.house && w.houses[b.house] ? RANKS.indexOf(w.houses[b.house].rank) : 9) || a.name.localeCompare(b.name));
    const [shown, setShown] = [Math.min(hit.length, more), setMore];
    return (
      <div data-testid="ency-people">
        <div className="ency-filter">
          <select value={town} onChange={(e) => { setTown(e.target.value); setMore(PAGE); }} aria-label="Town" data-testid="ency-people-town">
            <option value="">Everyone</option>
            {towns.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
          </select>
          <small className="ency-count">{hit.length} people · {Object.keys(f?.met ?? {}).length} met</small>
        </div>
        <div className="ency-chips-row">{(['met', 'all', 'locals', 'foreign', 'characters'] as const).map((k) => <button key={k} className={who === k ? 'on' : ''} onClick={() => { setWho(k); setMore(PAGE); }} data-testid={`ency-who-${k}`}>{{ met: 'People you have met', all: 'Everyone', locals: 'Locals', foreign: 'Foreigners', characters: 'Characters' }[k]}</button>)}</div>
        <div className="ency-grid">
          {hit.slice(0, shown).map((p) => <PersonCard key={p.id} p={p} go={go} tag={f?.met[p.id] !== undefined ? relWord(f.rel[p.id] ?? 0, true) : known(p.id) ? 'Heard of' : ''} />)}
        </div>
        {shown < hit.length && <button className="ency-more" onClick={() => setShown(shown + PAGE)} data-testid="ency-more">Show more · {hit.length - shown} left</button>}
      </div>
    );
  }
  if (section === 'houses') return <Houses q={q} go={go} town={town} setTown={setTown} />;
  if (section === 'places') {
    const ps = SETTLEMENTS.filter((s) => !q || `${s.name} ${s.region}`.toLowerCase().includes(q));
    return <div className="ency-list">{ps.map((s) => <button key={s.id} className="ency-row plain" onClick={() => go({ kind: 'place', id: s.id })}><span><b>{s.name}</b><small>{s.region} · {notablesOf(s.id).length} notables</small></span><em>{g.world.known.includes(s.id) ? '' : 'Not yet visited'}</em></button>)}</div>;
  }
  if (section === 'rugs') {
    const ids = [...RUG_IDS, ...PERSIAN_RUG_IDS].filter((id) => !RUGS[id].own && (!q || `${RUGS[id].name} ${RUGS[id].origin}`.toLowerCase().includes(q)));
    return <div className="ency-list">{ids.map((id) => <button key={id} className="ency-row" onClick={() => go({ kind: 'rug', id })}><img className="ency-rug" src={rugThumb(RUGS[id])} alt="" /><span><b>{RUGS[id].name}</b><small>{RUGS[id].origin}</small></span><em>{g.inventory.some((i) => i.typeId === id) ? 'In stock' : (g.register ?? []).includes(id) ? 'Handled' : ''}</em></button>)}</div>;
  }
  const bands = wantedList(g);
  return <div className="ency-list">{bands.map((b) => <button key={b.id} className="ency-row plain" onClick={() => go({ kind: 'band', id: b.id })}><span><b>{b.leader.name}</b><small>Leads the band on {b.road}</small></span><em>{b.leader.status === 'jailed' ? 'In the cells' : b.leader.status === 'held' ? 'Your prisoner' : `${fmt(b.leader.bounty)} on his head`}</em></button>)}</div>;
}

/** a relation as a small portrait with its name under it */
function KinChip({ p, label, go }: { p: Person; label: string; go: (p: Page) => void }) {
  const g = { day: useGame((s) => s.day) };
  return (
    <button className="ency-kin-chip" onClick={() => go({ kind: 'person', id: p.id })}>
      <FolkFace p={p} size={72} card />
      <small className="ency-card-label">{label}</small>
      <b>{firstName(p)}</b>
      <small>{ageNow(p, g.day)}</small>
    </button>
  );
}

function PLink({ id, go }: { id: string; go: (p: Page) => void }) {
  const p = person(id);
  if (!p) return null;
  return <button className="ency-link" onClick={() => go({ kind: 'person', id })}>{p.name}</button>;
}

function PageView({ p, go, back }: { p: Page; go: (p: Page) => void; back: () => void }) {
  const g = useGame();
  const f = g.folk;
  // a face at full size: the painted portrait itself, not the small list copy; a tap or Back closes it
  if (p.kind === 'portrait') {
    const x = person(p.id);
    if (!x) return null;
    return (
      <button type="button" className="ency-portrait-big" onClick={back} aria-label={`${x.name}: tap to close`} data-testid="ency-portrait-big">
        <FolkFace p={x} size={560} card />
        <small>{x.name} · tap to close</small>
      </button>
    );
  }
  if (p.kind === 'person') {
    const x = person(p.id);
    if (!x) return <p>Nobody by that name.</p>;
    const met = f?.met[x.id] !== undefined;
    const h = x.house ? houseOf(x.house) : undefined;
    const log = (f?.log ?? []).filter((l) => l.who === x.id).slice(-8).reverse();
    const kin: [string, string | undefined][] = [['Father', x.father], ['Mother', x.mother], [x.sex === 'f' ? 'Husband' : 'Wife', x.spouse]];
    return (
      <article className="ency-page" data-testid="ency-person">
        <div className="ency-top person-top"><button type="button" className="ency-face-btn" onClick={() => go({ kind: 'portrait', id: x.id })} aria-label={`${x.name}: see the portrait full size`} data-testid="ency-portrait"><FolkFace p={x} size={140} card /></button><div><h2>{x.name}</h2><small>{x.title}</small><small>{ROLE_WORD[x.role]} · {ageNow(x, g.day)} years · of <button className="ency-link" onClick={() => go({ kind: 'place', id: x.home })}>{placeName(x.home)}</button></small><RelBar p={x} /></div></div>
        {(x.foreign || x.mixed) && <p className="ency-said"><b>{x.mixed ? 'Mixed family:' : 'Foreigner:'}</b> {x.mixed ?? `${x.foreign}, living in ${placeName(x.home).split(',')[0]}`}</p>}
        {x.bio && <p>{x.bio}</p>}
        {x.role === 'character' && x.talk && <p className="ency-said"><b>You will hear:</b> {typeof x.talk === 'string' ? x.talk : x.talk[0]}</p>}
        {met ? <TraitMarks labels marks={x.traits.map((t) => ({ emblem: PERSON_MARK[t], label: TRAIT_WORD[t], tip: '' }))} size={26} testid="ency-traits" /> : <><p className="ency-said" data-testid="ency-hearsay"><b>What they say:</b> {hearsay(x)}</p><p className="ency-dim">You have not met. You will know {x.sex === 'f' ? 'her' : 'him'} better when you do.</p></>}
        {h && <p data-testid="ency-person-house"><b>Family:</b> <button className="ency-link" onClick={() => go({ kind: 'house', id: h.id })}>{h.name}</button><br /><small className="ency-dim"><i className={`rk rk-${h.rank}`}>{4 - RANKS.indexOf(h.rank)}</i> {RANK_ONE[h.rank]} · {ord(placeInTown(h).n)} of {placeInTown(h).of} in {placeName(h.home).split(',')[0]} · {kinWord(x)}</small></p>}
        {(kin.some(([, id]) => id) || x.children.length > 0) && <><div className="ency-label">FAMILY</div><div className="ency-kin-grid">
          {kin.filter(([, id]) => id && person(id)).map(([k, id]) => <KinChip key={k} p={person(id!)!} label={k} go={go} />)}
          {x.children.map((c) => person(c)).filter((c): c is Person => !!c).sort((a, b) => b.age - a.age).map((c) => <KinChip key={c.id} p={c} label={kinWord(c) || (c.sex === 'm' ? 'Son' : 'Daughter')} go={go} />)}
        </div></>}
        {x.route && <p><b>His road:</b> <button className="ency-link" onClick={() => go({ kind: 'place', id: x.route![0] })}>{placeName(x.route[0])}</button> to <button className="ency-link" onClick={() => go({ kind: 'place', id: x.route![1] })}>{placeName(x.route[1])}</button></p>}
        {x.bride && <p className="ency-note">A family that would receive a proposal: see Household, under Me.</p>}
        {(() => { const ps = (useGame.getState().favours?.active ?? []).filter((f) => f.giver === x.id || f.to === x.id); return ps.length > 0 && <><div className="ency-label">PROMISES</div><ul className="ency-log" data-testid="ency-promises">{ps.map((f) => <li key={f.id}>{favourLine(f)} <small>· {Math.max(0, f.due - useGame.getState().day)} days left</small></li>)}</ul></>; })()}
        {log.length > 0 && <><div className="ency-label">BETWEEN YOU</div><ul className="ency-log">{log.map((l, i) => <li key={i}><small>{dateFor(l.day).short}</small> {l.text}</li>)}</ul></>}
      </article>
    );
  }
  if (p.kind === 'house') {
    const h = houseOf(p.id);
    if (!h) return null;
    const head = person(h.head)!;
    return (
      <article className="ency-page" data-testid="ency-house">
        <div className="ency-top"><FolkFace p={head} size={110} card /><div><h2>{h.name}</h2><small>{placeName(h.home)} · {h.trade} · {h.members.length} in the family</small></div></div>
        <div className="ency-label">STANDING</div>
        <div className="ency-ladder" data-testid="ency-ladder">{RANKS.map((r, i) => <span key={r} className={r === h.rank ? 'on' : ''}><i className={`rk rk-${r}`}>{4 - i}</i>{RANK_SHORT[r]}</span>)}</div>
        <p className="ency-dim">{RANK_ONE[h.rank]}: {ord(placeInTown(h).n)} of {placeInTown(h).of} families in <button className="ency-link" onClick={() => go({ kind: 'place', id: h.home })}>{placeName(h.home).split(',')[0]}</button>.</p>
        <div className="ency-label">THE FAMILY, FROM THE HEAD DOWN</div>
        <Tree head={head} house={h} go={go} />
        <div className="ency-label">THE OTHER FAMILIES OF {placeName(h.home).split(',')[0].toUpperCase()}</div>
        <div className="ency-houses">{housesOfTown(h.home).map((o, i) => <HouseCard key={o.id} h={o} go={go} here={o.id === h.id} n={i + 1} />)}</div>
      </article>
    );
  }
  if (p.kind === 'place') {
    const st = SETTLEMENTS.find((s) => s.id === p.id);
    if (!st) return null;
    const ppl = notablesOf(st.id);
    const sells = st.sells.map((o) => o.typeId).filter((id) => RUGS[id]);
    return (
      <article className="ency-page" data-testid="ency-place">
        <h2>{st.name}</h2><small className="ency-dim">{st.region}</small>
        <p>{st.blurb}</p>
        {sells.length > 0 && <><div className="ency-label">ITS DEALERS SELL</div><div className="ency-chips">{sells.map((id) => <button key={id} className="ency-link" onClick={() => go({ kind: 'rug', id })}>{RUGS[id].name}</button>)}</div></>}
        <div className="ency-label">ITS FAMILIES, BY STANDING</div>
        <div className="ency-houses">{housesOfTown(st.id).map((o, i) => <HouseCard key={o.id} h={o} go={go} n={i + 1} />)}</div>
        {residentsOf(st.id).length > 0 && <><div className="ency-label">ITS FOREIGNERS</div><div className="ency-grid">{residentsOf(st.id).map((x) => <PersonCard key={x.id} p={x} go={go} />)}</div></>}
        {charactersOf(st.id).length > 0 && <><div className="ency-label">ITS CHARACTERS</div><div className="ency-grid">{charactersOf(st.id).map((x) => <PersonCard key={x.id} p={x} go={go} />)}</div></>}
        <div className="ency-label">ITS PEOPLE</div>
        <div className="ency-grid">{ppl.map((x) => <PersonCard key={x.id} p={x} go={go} tag={f?.met[x.id] !== undefined ? relWord(f.rel[x.id] ?? 0, true) : ''} />)}</div>
      </article>
    );
  }
  if (p.kind === 'rug') {
    const t = RUGS[p.id];
    if (!t) return null;
    const where = SETTLEMENTS.filter((s) => s.sells.some((o) => o.typeId === p.id));
    return (
      <article className="ency-page" data-testid="ency-rug">
        <img className="ency-rugbig" src={rugThumb(t)} alt="" />
        <h2>{t.name}</h2><small className="ency-dim">{t.origin} · {t.material} · {t.age} · {t.size}</small>
        <p>{t.history}</p>
        <p className="ency-dim">Worth {fmt(t.valueBand[0])}–{fmt(t.valueBand[1])} in good order.</p>
        <div className="ency-label">HOW TO TELL IT</div>
        <dl className="ency-tell" data-testid="ency-tell">{howToTell(t).map((r) => <Fragment key={r.label}><dt>{r.label}</dt><dd>{r.text}</dd></Fragment>)}</dl>
        {fakesOf(t).length > 0 && <><div className="ency-label">COMMON FAKES OR CONFUSIONS</div><ul className="ency-fakes" data-testid="ency-fakes">{fakesOf(t).map((f) => <li key={f}>{f}</li>)}</ul></>}
        {where.length > 0 && <><div className="ency-label">SOLD IN</div><div className="ency-chips">{where.map((s) => <button key={s.id} className="ency-link" onClick={() => go({ kind: 'place', id: s.id })}>{s.name}</button>)}</div></>}
      </article>
    );
  }
  const b = wantedList(g).find((x) => x.id === p.id);
  return b ? (
    <article className="ency-page" data-testid="ency-band">
      <h2>{b.leader.name}{b.leader.seen && <> <TraitMarks marks={[CHIEF_MARK[b.leader.temper]]} size={26} /></>}</h2><small className="ency-dim">Leads the band on {BAND_ROAD[b.id]}</small>
      <p>{b.leader.status === 'jailed' ? 'In the cells. His band keeps off its road until a new man takes it.' : b.leader.status === 'held' ? 'Your prisoner.' : `Free on ${b.road}. The police pay ${fmt(b.leader.bounty)} for him alive.`}{b.leader.robbed ? ' He robbed you, and has not paid for it.' : b.leader.grudge ? ' He got away from you once, and has not forgotten it.' : ''}</p>
      <p className="ency-dim">{b.leader.seen ? `Known to be ${b.leader.temper}.` : 'His temper: not known until you have seen him fight.'}</p>
    </article>
  ) : <p>Nothing known.</p>;
}

/** a family tree, from the head down: the head, the wife, then the children eldest first */
function Tree({ head, house, go }: { head: Person; house: House; go: (p: Page) => void }) {
  const g = { day: useGame((s) => s.day) };
  const row = (x: Person, label: string, big = false) => (
    <button key={x.id} className={`ency-node${big ? ' big' : ''}`} onClick={() => go({ kind: 'person', id: x.id })} data-testid={`ency-tree-${x.id}`}>
      <FolkFace p={x} size={big ? 120 : 92} card />
      <small className="ency-card-label">{label}</small>
      <b>{firstName(x)}</b>
      <small>{ageNow(x, g.day)} years</small>
    </button>
  );
  const spouse = head.spouse ? person(head.spouse) : undefined;
  const kids = head.children.map((c) => person(c)).filter((c): c is Person => !!c).sort((a, b) => b.age - a.age);
  const rest = house.members.filter((m) => m !== head.id && m !== head.spouse && !head.children.includes(m)).map((m) => person(m)).filter((c): c is Person => !!c);
  return (
    <div className="ency-tree">
      <div className="ency-couple">{row(head, 'Head of the house', true)}{spouse && <><i className="ency-wed" aria-hidden="true" />{row(spouse, spouse.sex === 'f' ? 'His wife' : 'Her husband', true)}</>}</div>
      {kids.length > 0 && <><i className="ency-stem" aria-hidden="true" /><div className="ency-kids">{kids.map((c) => row(c, kinWord(c)))}</div></>}
      {rest.length > 0 && <div className="ency-kids">{rest.map((c) => row(c, 'Of the house'))}</div>}
    </div>
  );
}

/** the encyclopedia, mounted once: opens on 'tof:ency' at the page asked for, or the index */
/** the word in the souq about someone you have not met: one of their traits, at second hand */
const HEARSAY: Record<string, [string, string]> = {
  honest: ['His word is good, they say. He has never been known to swear a rug is older than it is.', 'Her word is good, they say. Nobody has caught her in a lie.'],
  greedy: ['He counts every piastre twice, they say, and the second time he finds one missing.', 'She drives a hard bargain, they say, and enjoys it.'],
  proud: ['A proud man, they say. He does not forget a slight.', 'A proud woman, they say. Her family name matters to her.'],
  generous: ['An open hand, they say. Half the lane has eaten at his table.', 'An open hand, they say. No beggar leaves her door empty.'],
  cunning: ['Watch him, they say. He is three moves ahead and smiling.', 'Watch her, they say. She hears more than she lets on.'],
  pious: ['A devout man, they say. He keeps the prayers and the fasts.', 'A devout woman, they say. She keeps the old ways.'],
  cheerful: ['Good company, they say. Always a joke, even on a bad day.', 'Good company, they say. She laughs easily.'],
  stern: ['A hard man to please, they say. Few have seen him smile.', 'Strict, they say. Her household runs like a clock.'],
  curious: ['He asks a lot of questions, they say, and remembers the answers.', 'She wants to know everything, they say, and usually does.'],
  gossip: ['He knows everyone\'s business, they say, and shares it freely.', 'Tell her nothing you would not want the whole souq to know, they say.'],
};
const hearsay = (x: { traits: string[]; sex: 'm' | 'f' }) => (HEARSAY[x.traits[0]] ?? HEARSAY.honest)[x.sex === 'f' ? 1 : 0];

export function EncyclopediaHost() {
  const [open, setOpen] = useState<{ page: Page | null; n: number } | null>(null);
  useEffect(() => {
    const on = (e: Event) => { const d = (e as CustomEvent).detail as Page | undefined; setOpen({ page: d?.kind ? d : null, n: Date.now() }); };
    window.addEventListener('tof:ency', on);
    return () => window.removeEventListener('tof:ency', on);
  }, []);
  const start = useMemo(() => open?.page ?? null, [open?.n]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!open) return null;
  return createPortal(<Encyclopedia key={open.n} start={start} onClose={() => setOpen(null)} />, document.body);
}
