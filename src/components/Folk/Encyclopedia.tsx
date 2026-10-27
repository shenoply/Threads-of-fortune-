// The encyclopedia: every person, family, town, rug and band in the world, each a page, and every
// name on a page a link to another. People you have met show what you know of them (their traits,
// how they feel, what has passed between you); the rest show what anyone in the bazaar could tell you.
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame, wantedList } from '../../game/state/store';
import { world, person, houseOf, notablesOf, ageNow, TRAIT_WORD, type Person, type House, type Role } from '../../game/systems/population';
import { SETTLEMENTS } from '../../data/world';
import { RUGS, RUG_IDS, PERSIAN_RUG_IDS } from '../../data/rugs';
import { BAND_ROAD } from '../../game/systems/combat';
import { fmt } from '../../game/economy/money';
import { dateFor } from '../../game/economy/economy';
import { rugThumb } from '../RugViewer/rugArt';
import { FolkFace } from './FolkFace';
import { RelBar } from './FolkCard';
import { relWord } from '../../game/systems/folkTalk';
import './folk.css';
import './ency.css';

type Kind = 'person' | 'house' | 'place' | 'rug' | 'band';
type Section = 'people' | 'houses' | 'places' | 'rugs' | 'bands';
interface Page { kind: Kind; id: string }
const SECTION_WORD: Record<Section, string> = { people: 'People', houses: 'Families', places: 'Towns', rugs: 'Carpets', bands: 'Bands' };
const ROLE_WORD: Record<string, string> = { souq: 'Souq master', dealer: 'Dealer on the tables', merchant: 'Merchant', notable: 'Man of standing', craft: 'Craftsman', caravan: 'Caravan master', kin: 'Family' };
const placeName = (id: string) => SETTLEMENTS.find((s) => s.id === id)?.name ?? id;
// a family's standing: the four ranks of house, highest first, and its place among its own town's houses
type Rank = House['rank'];
const RANKS: Rank[] = ['grand', 'notable', 'trade', 'humble'];
const RANK_GROUP: Record<Rank, string> = { grand: 'Great houses', notable: 'Notable houses', trade: 'Trading families', humble: 'Families of the quarter' };
const RANK_ONE: Record<Rank, string> = { grand: 'A great house', notable: 'A notable house', trade: 'A trading family', humble: 'A family of the quarter' };
const RANK_SHORT: Record<Rank, string> = { grand: 'Great house', notable: 'Notable', trade: 'Trade', humble: 'Quarter' };
const HEAD_ORDER: Role[] = ['dealer', 'souq', 'notable', 'merchant', 'caravan', 'craft', 'kin'];
const ORD = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
const ord = (n: number) => ORD[n - 1] ?? `${n}th`;
const houseCmp = (a: House, b: House) => {
  const w = world();
  return RANKS.indexOf(a.rank) - RANKS.indexOf(b.rank) || HEAD_ORDER.indexOf(w.people[a.head]?.role ?? 'kin') - HEAD_ORDER.indexOf(w.people[b.head]?.role ?? 'kin') || b.members.length - a.members.length || a.name.localeCompare(b.name);
};
/** the houses of a town, highest standing first */
const housesOfTown = (city: string) => Object.values(world().houses).filter((h) => h.home === city).sort(houseCmp);
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

export function Encyclopedia({ start, onClose }: { start?: Page | null; onClose: () => void }) {
  const [stack, setStack] = useState<Page[]>(start ? [start] : []);
  const [section, setSection] = useState<Section>('people');
  const [q, setQ] = useState('');
  const [town, setTown] = useState('');
  const page = stack[stack.length - 1];
  const go = (p: Page) => setStack((s) => [...s, p]);
  const back = () => setStack((s) => s.slice(0, -1));
  useEffect(() => { if (start) setStack([start]); }, [start?.kind, start?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="ency" role="dialog" aria-label="Encyclopedia" data-testid="encyclopedia">
      <header className="ency-head">
        {page ? <button className="ency-back" onClick={back} data-testid="ency-back">‹</button> : <span />}
        <b>Encyclopedia</b>
        <button className="ency-back" onClick={onClose} data-testid="ency-close">×</button>
      </header>
      <div className="ency-body">
        {page ? <PageView p={page} go={go} /> : (
          <>
            <div className="ency-tabs" role="tablist">{(Object.keys(SECTION_WORD) as Section[]).map((s) => <button key={s} className={section === s ? 'on' : ''} onClick={() => setSection(s)} data-testid={`ency-tab-${s}`}>{SECTION_WORD[s]}</button>)}</div>
            <input className="ency-search" placeholder="Search names, towns, trades" value={q} onChange={(e) => setQ(e.target.value)} data-testid="ency-search" />
            <List section={section} q={q.trim().toLowerCase()} go={go} town={town} setTown={setTown} />
          </>
        )}
      </div>
    </div>
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
          {grp.map((h) => { const head = w.people[h.head]; const at = placeInTown(h); return (
            <button key={h.id} className={`ency-row house-row rk-line-${r}`} onClick={() => go({ kind: 'house', id: h.id })} data-testid={`ency-house-${h.id}`}>
              <FolkFace p={head} size={40} />
              <span><b>{h.name}</b><small>{placeName(h.home)} · {h.trade} · {h.members.length} in the family</small></span>
              <em>{ord(at.n)} in {placeName(h.home).split(',')[0]}</em>
            </button>
          ); })}
        </section>
      ); })}
    </div>
  );
}

function List({ section, q, go, town, setTown }: { section: Section; q: string; go: (p: Page) => void; town: string; setTown: (t: string) => void }) {
  const g = useGame();
  const w = world();
  const f = g.folk;
  const known = (id: string) => f?.met[id] !== undefined || f?.heard.includes(id);
  if (section === 'people') {
    // everyone in the world is listed from the start: heads, wives and children alike
    const all = Object.values(w.people);
    const hit = all.filter((p) => !q || `${p.name} ${p.title} ${placeName(p.home)}`.toLowerCase().includes(q))
      .sort((a, b) => Number(f?.met[b.id] !== undefined) - Number(f?.met[a.id] !== undefined) || Number(known(b.id)) - Number(known(a.id)) || a.name.localeCompare(b.name));
    return (
      <div className="ency-list" data-testid="ency-people">
        <small className="ency-count">{hit.length} people · {Object.keys(f?.met ?? {}).length} met</small>
        {hit.map((p) => (
          <button key={p.id} className="ency-row" onClick={() => go({ kind: 'person', id: p.id })} data-testid={`ency-row-${p.id}`}>
            <FolkFace p={p} size={40} />
            <span><b>{p.name}</b><small>{p.title}{p.house && w.houses[p.house] ? ` · ${RANK_SHORT[w.houses[p.house].rank]}` : ''}</small></span>
            <em>{f?.met[p.id] !== undefined ? relWord(f.rel[p.id] ?? 0, true) : known(p.id) ? 'Heard of' : ''}</em>
          </button>
        ))}
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
    return <div className="ency-list">{ids.map((id) => <button key={id} className="ency-row" onClick={() => go({ kind: 'rug', id })}><img className="ency-rug" src={rugThumb(RUGS[id])} alt="" /><span><b>{RUGS[id].name}</b><small>{RUGS[id].origin}</small></span><em>{(g.register ?? []).includes(id) ? 'Sold' : ''}</em></button>)}</div>;
  }
  const bands = wantedList(g);
  return <div className="ency-list">{bands.map((b) => <button key={b.id} className="ency-row plain" onClick={() => go({ kind: 'band', id: b.id })}><span><b>{b.leader.name}</b><small>Leads the band on {b.road}</small></span><em>{b.leader.status === 'jailed' ? 'In the cells' : b.leader.status === 'held' ? 'Your prisoner' : `${fmt(b.leader.bounty)} on his head`}</em></button>)}</div>;
}

function PLink({ id, go }: { id: string; go: (p: Page) => void }) {
  const p = person(id);
  if (!p) return null;
  return <button className="ency-link" onClick={() => go({ kind: 'person', id })}>{p.name}</button>;
}

function PageView({ p, go }: { p: Page; go: (p: Page) => void }) {
  const g = useGame();
  const f = g.folk;
  if (p.kind === 'person') {
    const x = person(p.id);
    if (!x) return <p>Nobody by that name.</p>;
    const met = f?.met[x.id] !== undefined;
    const h = x.house ? houseOf(x.house) : undefined;
    const log = (f?.log ?? []).filter((l) => l.who === x.id).slice(-8).reverse();
    const kin: [string, string | undefined][] = [['Father', x.father], ['Mother', x.mother], [x.sex === 'f' ? 'Husband' : 'Wife', x.spouse]];
    return (
      <article className="ency-page" data-testid="ency-person">
        <div className="ency-top"><FolkFace p={x} size={96} /><div><h2>{x.name}</h2><small>{x.title}</small><small>{ROLE_WORD[x.role]} · {ageNow(x, g.day)} years · of <button className="ency-link" onClick={() => go({ kind: 'place', id: x.home })}>{placeName(x.home)}</button></small><RelBar p={x} /></div></div>
        {x.bio && <p>{x.bio}</p>}
        {met ? <p className="ency-traits">{x.traits.map((t) => TRAIT_WORD[t]).join(' · ')}</p> : <p className="ency-dim">You have not met. What {x.sex === 'f' ? 'she' : 'he'} is like, you will learn when you do.</p>}
        {h && <p data-testid="ency-person-house"><b>Family:</b> <button className="ency-link" onClick={() => go({ kind: 'house', id: h.id })}>{h.name}</button><br /><small className="ency-dim"><i className={`rk rk-${h.rank}`}>{4 - RANKS.indexOf(h.rank)}</i> {RANK_ONE[h.rank]} · {ord(placeInTown(h).n)} of {placeInTown(h).of} in {placeName(h.home).split(',')[0]} · {kinWord(x)}</small></p>}
        <ul className="ency-kin">
          {kin.filter(([, id]) => id).map(([k, id]) => <li key={k}><span>{k}</span><PLink id={id!} go={go} /></li>)}
          {x.children.map((c) => <li key={c}><span>{person(c)?.sex === 'm' ? 'Son' : 'Daughter'}</span><PLink id={c} go={go} /> <small>{ageNow(person(c)!, g.day)}</small></li>)}
        </ul>
        {x.route && <p><b>His road:</b> <button className="ency-link" onClick={() => go({ kind: 'place', id: x.route![0] })}>{placeName(x.route[0])}</button> to <button className="ency-link" onClick={() => go({ kind: 'place', id: x.route![1] })}>{placeName(x.route[1])}</button></p>}
        {x.bride && <p className="ency-note">A family that would receive a proposal: see Household, under Me.</p>}
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
        <div className="ency-top"><FolkFace p={head} size={80} /><div><h2>{h.name}</h2><small>{placeName(h.home)} · {h.trade} · {h.members.length} in the family</small></div></div>
        <div className="ency-label">STANDING</div>
        <div className="ency-ladder" data-testid="ency-ladder">{RANKS.map((r, i) => <span key={r} className={r === h.rank ? 'on' : ''}><i className={`rk rk-${r}`}>{4 - i}</i>{RANK_SHORT[r]}</span>)}</div>
        <p className="ency-dim">{RANK_ONE[h.rank]}: {ord(placeInTown(h).n)} of {placeInTown(h).of} families in <button className="ency-link" onClick={() => go({ kind: 'place', id: h.home })}>{placeName(h.home).split(',')[0]}</button>.</p>
        <div className="ency-label">THE FAMILY, FROM THE HEAD DOWN</div>
        <Tree head={head} house={h} go={go} />
        <div className="ency-label">THE OTHER FAMILIES OF {placeName(h.home).split(',')[0].toUpperCase()}</div>
        <div className="ency-list">{housesOfTown(h.home).map((o, i) => { const hd = person(o.head)!; return (
          <button key={o.id} className={`ency-row house-row rk-line-${o.rank}${o.id === h.id ? ' here' : ''}`} onClick={() => o.id !== h.id && go({ kind: 'house', id: o.id })}><FolkFace p={hd} size={32} /><span><b>{ord(i + 1)} · {o.name}</b><small>{RANK_ONE[o.rank]} · {o.trade}</small></span><em /></button>
        ); })}</div>
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
        <div className="ency-list">{housesOfTown(st.id).map((o, i) => { const hd = person(o.head)!; return <button key={o.id} className={`ency-row house-row rk-line-${o.rank}`} onClick={() => go({ kind: 'house', id: o.id })}><FolkFace p={hd} size={32} /><span><b>{ord(i + 1)} · {o.name}</b><small>{RANK_ONE[o.rank]} · {o.trade}</small></span><em /></button>; })}</div>
        <div className="ency-label">ITS PEOPLE</div>
        <div className="ency-list">{ppl.map((x) => <button key={x.id} className="ency-row" onClick={() => go({ kind: 'person', id: x.id })}><FolkFace p={x} size={40} /><span><b>{x.name}</b><small>{x.title}</small></span><em>{f?.met[x.id] !== undefined ? relWord(f.rel[x.id] ?? 0, true) : ''}</em></button>)}</div>
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
        {where.length > 0 && <><div className="ency-label">SOLD IN</div><div className="ency-chips">{where.map((s) => <button key={s.id} className="ency-link" onClick={() => go({ kind: 'place', id: s.id })}>{s.name}</button>)}</div></>}
      </article>
    );
  }
  const b = wantedList(g).find((x) => x.id === p.id);
  return b ? (
    <article className="ency-page" data-testid="ency-band">
      <h2>{b.leader.name}</h2><small className="ency-dim">Leads the band on {BAND_ROAD[b.id]}</small>
      <p>{b.leader.status === 'jailed' ? 'In the cells. His band keeps off its road until a new man takes it.' : b.leader.status === 'held' ? 'Your prisoner.' : `Free on ${b.road}. The police pay ${fmt(b.leader.bounty)} for him alive.`}{b.leader.robbed ? ' He robbed you, and has not paid for it.' : b.leader.grudge ? ' He got away from you once, and has not forgotten it.' : ''}</p>
      <p className="ency-dim">{b.leader.seen ? `Known to be ${b.leader.temper}.` : 'His temper: not known until you have seen him fight.'}</p>
    </article>
  ) : <p>Nothing known.</p>;
}

/** a family tree, from the head down: the head, the wife, then the children eldest first */
function Tree({ head, house, go }: { head: Person; house: House; go: (p: Page) => void }) {
  const g = useGame();
  const row = (x: Person, label: string) => (
    <button key={x.id} className="ency-row tree-row" onClick={() => go({ kind: 'person', id: x.id })} data-testid={`ency-tree-${x.id}`}>
      <FolkFace p={x} size={40} />
      <span><small className="tree-label">{label}</small><b>{x.name}</b><small>{x.title} · {ageNow(x, g.day)}</small></span>
    </button>
  );
  const spouse = head.spouse ? person(head.spouse) : undefined;
  const kids = head.children.map((c) => person(c)).filter((c): c is Person => !!c).sort((a, b) => b.age - a.age);
  const rest = house.members.filter((m) => m !== head.id && m !== head.spouse && !head.children.includes(m)).map((m) => person(m)).filter((c): c is Person => !!c);
  return (
    <div className="ency-tree">
      <div className="ency-couple">{row(head, 'Head of the house')}{spouse && row(spouse, spouse.sex === 'f' ? 'His wife' : 'Her husband')}</div>
      {kids.length > 0 && <div className="ency-kids">{kids.map((c) => row(c, kinWord(c)))}</div>}
      {rest.length > 0 && <div className="ency-kids">{rest.map((c) => row(c, 'Of the house'))}</div>}
    </div>
  );
}

/** the encyclopedia, mounted once: opens on 'tof:ency' at the page asked for, or the index */
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
