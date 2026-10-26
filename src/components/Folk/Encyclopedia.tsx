// The encyclopedia: every person, family, town, rug and band in the world, each a page, and every
// name on a page a link to another. People you have met show what you know of them (their traits,
// how they feel, what has passed between you); the rest show what anyone in the bazaar could tell you.
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame, wantedList } from '../../game/state/store';
import { world, person, houseOf, notablesOf, ageNow, TRAIT_WORD, type Person } from '../../game/systems/population';
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

export function Encyclopedia({ start, onClose }: { start?: Page | null; onClose: () => void }) {
  const [stack, setStack] = useState<Page[]>(start ? [start] : []);
  const [section, setSection] = useState<Section>('people');
  const [q, setQ] = useState('');
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
            <List section={section} q={q.trim().toLowerCase()} go={go} />
          </>
        )}
      </div>
    </div>
  );
}

function List({ section, q, go }: { section: Section; q: string; go: (p: Page) => void }) {
  const g = useGame();
  const w = world();
  const f = g.folk;
  const known = (id: string) => f?.met[id] !== undefined || f?.heard.includes(id);
  if (section === 'people') {
    const all = Object.values(w.people).filter((p) => p.role !== 'kin' || known(p.id) || p.bride);
    const hit = all.filter((p) => !q || `${p.name} ${p.title} ${placeName(p.home)}`.toLowerCase().includes(q))
      .sort((a, b) => Number(f?.met[b.id] !== undefined) - Number(f?.met[a.id] !== undefined) || Number(known(b.id)) - Number(known(a.id)) || a.name.localeCompare(b.name));
    return (
      <div className="ency-list" data-testid="ency-people">
        <small className="ency-count">{hit.length} people · {Object.keys(f?.met ?? {}).length} met</small>
        {hit.slice(0, 120).map((p) => (
          <button key={p.id} className="ency-row" onClick={() => go({ kind: 'person', id: p.id })} data-testid={`ency-row-${p.id}`}>
            <FolkFace p={p} size={40} />
            <span><b>{p.name}</b><small>{p.title}</small></span>
            <em>{f?.met[p.id] !== undefined ? relWord(f.rel[p.id] ?? 0, true) : known(p.id) ? 'Heard of' : ''}</em>
          </button>
        ))}
        {hit.length > 120 && <small className="ency-count">Search to find the rest.</small>}
      </div>
    );
  }
  if (section === 'houses') {
    const hs = Object.values(w.houses).filter((h) => !q || `${h.name} ${placeName(h.home)} ${h.trade}`.toLowerCase().includes(q)).sort((a, b) => ['grand', 'notable', 'trade', 'humble'].indexOf(a.rank) - ['grand', 'notable', 'trade', 'humble'].indexOf(b.rank) || a.name.localeCompare(b.name));
    return <div className="ency-list">{hs.map((h) => { const head = w.people[h.head]; return (
      <button key={h.id} className="ency-row" onClick={() => go({ kind: 'house', id: h.id })}><FolkFace p={head} size={40} /><span><b>{h.name}</b><small>{placeName(h.home)} · {h.trade} · {h.members.length} in the family</small></span><em>{h.rank === 'grand' ? 'A great house' : h.rank === 'notable' ? 'Notable' : ''}</em></button>
    ); })}</div>;
  }
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
        {h && <p><b>Family:</b> <button className="ency-link" onClick={() => go({ kind: 'house', id: h.id })}>{h.name}</button></p>}
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
        <div className="ency-top"><FolkFace p={head} size={80} /><div><h2>{h.name}</h2><small>{placeName(h.home)} · {h.trade}</small><small>{h.rank === 'grand' ? 'A great house' : h.rank === 'notable' ? 'A notable house' : h.rank === 'trade' ? 'A trading family' : 'A family of the quarter'}</small></div></div>
        <div className="ency-label">THE FAMILY</div>
        <Tree head={head} go={go} />
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

/** a family tree, from the head down */
function Tree({ head, go }: { head: Person; go: (p: Page) => void }) {
  const g = useGame();
  const row = (x: Person) => <button className="ency-row" onClick={() => go({ kind: 'person', id: x.id })}><FolkFace p={x} size={40} /><span><b>{x.name}</b><small>{x.title} · {ageNow(x, g.day)}</small></span></button>;
  const spouse = head.spouse ? person(head.spouse) : undefined;
  return (
    <div className="ency-tree">
      <div className="ency-couple">{row(head)}{spouse && row(spouse)}</div>
      {head.children.length > 0 && <div className="ency-kids">{head.children.map((c) => person(c)).filter(Boolean).map((c) => <div key={c!.id}>{row(c!)}</div>)}</div>}
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
