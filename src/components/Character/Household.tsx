import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { person } from '../../game/systems/population';
import { useGame } from '../../game/state/store';
import { fmt } from '../../game/economy/money';
import { dateFor } from '../../game/economy/economy';
import { Fold } from '../Fold/Fold';
import {
  BRIDES, BRIDE_ORDER, RANK_WORD, availableBrides, ASK_AT, FEAST_AFTER, MATCH_REP, PACES, PATH_AGE, GROWN, PRESENT, SON_NAMES, DAUGHTER_NAMES, PATH_WORD, ROLE_WORD,
  hh, ageOf, childName, contentWord, heirOf, brideArt, childArt, merchantName, standing, wivesOf, canCourt, wifeRep, houseNeed, houseName, HOUSE_PERK, MAX_WIVES, ROOMS_COST,
  type BrideId, type Child, type ChildPath, type SpouseRole, type HouseholdAct,
} from '../../game/systems/household';
import './household.css';

/** A framed portrait: the painting once it has loaded, the sitter's initial until then (or if there is none). */
function Portrait({ src, name, small = false, fallback, onOpen, big = false }: { src: string; name: string; small?: boolean; fallback?: string; onOpen?: () => void; big?: boolean }) {
  const [ok, setOk] = useState(false);
  const [use, setUse] = useState(src);
  const inner = <>
    <b>{name.replace(/^(the|al-)\s*/i, '')[0]}</b>
    <img src={use} alt="" loading="lazy" onLoad={() => setOk(true)} onError={() => { setOk(false); if (fallback && use !== fallback) setUse(fallback); }} style={{ opacity: ok ? 1 : 0 }} />
  </>;
  // tap a face to see the person: the picture large, and what you know of them
  return onOpen
    ? <button className={`hh-pt hh-pt-open ${small ? 'sm' : ''}`} onClick={onOpen} aria-label={`See ${name}`} data-testid={`hh-open-${name.replace(/\W+/g, '-').toLowerCase()}`}>{inner}</button>
    : <span className={`hh-pt ${small ? 'sm' : ''} ${big ? 'big' : ''}`} aria-hidden="true">{inner}</span>;
}

/** someone of the household seen close: the picture large, who they are, and a way into the encyclopedia */
interface Look { src: string; fallback?: string; name: string; lines: string[]; person?: string }
/** a name in a card: opens the same close view as the face beside it */
const openCard = (e: { currentTarget: HTMLElement }) => (e.currentTarget.closest('.hh-card')?.querySelector('.hh-pt-open') as HTMLButtonElement | null)?.click();
const NameBtn = ({ children }: { children: ReactNode }) => <button className="hh-name" onClick={openCard}>{children}</button>;
const ency = (id: string) => window.dispatchEvent(new CustomEvent('tof:ency', { detail: { kind: 'person', id } }));

function LookSheet({ look, onClose }: { look: Look; onClose: () => void }) {
  return createPortal(
    <div className="hh-look-wrap" onClick={onClose} data-testid="hh-look">
      <div className="hh-look" role="dialog" aria-label={look.name} onClick={(e) => e.stopPropagation()}>
        <div className="hh-look-pic"><Portrait src={look.src} fallback={look.fallback} name={look.name} big /></div>
        <h3>{look.name}</h3>
        {look.lines.filter(Boolean).map((l, i) => <p key={i}>{l}</p>)}
        <div className="hh-btns">
          {look.person && person(look.person) && <button className="btn" onClick={() => { onClose(); window.dispatchEvent(new CustomEvent('tof:ency', { detail: { kind: 'person', id: look.person } })); }} data-testid="hh-look-ency">Family and standing ›</button>}
          <button className="btn primary" onClick={onClose} data-testid="hh-look-close">Close</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const Bar = ({ v, testid }: { v: number; testid?: string }) => <i className="cs-bar hh-bar" data-testid={testid}><em style={{ width: `${Math.max(0, Math.min(100, v))}%` }} /></i>;

/** Your household on the Me tab: the families, your wife, the children and the heir. */
export function HouseholdSection() {
  const g = useGame();
  const h = hh(g);
  const [msg, setMsg] = useState('');
  const [handOver, setHandOver] = useState(false);
  const [look, setLook] = useState<Look | null>(null);
  const personOf = (id: BrideId) => BRIDES[id]?.folk ?? `bride-${id}`;
  const act = (a: HouseholdAct) => setMsg(g.householdAct(a));
  const at = g.world.at;
  const sp = h.spouse;
  const wives = wivesOf(h);
  const courtable = canCourt(h) && h.stage !== 'betrothed' ? availableBrides(h) : [];
  const heir = heirOf(h);
  const named = h.children.filter((c) => c.name);
  const waiting = h.children.some((c) => !c.name || (ageOf(c) >= PATH_AGE && ageOf(c) < GROWN && !c.path));
  const gist = wives.length > 1 ? `${wives.map((w) => BRIDES[w.id].short).join(', ')}${h.children.length ? ` · ${h.children.length} ${h.children.length === 1 ? 'child' : 'children'}` : ''}`
    : sp ? `${BRIDES[sp.id].short} · ${contentWord(sp.content).toLowerCase()}${h.children.length ? ` · ${h.children.length} ${h.children.length === 1 ? 'child' : 'children'}` : ''}`
    : h.stage === 'betrothed' && h.chosen ? `Promised to ${BRIDES[h.chosen].short}`
    : availableBrides(h).length ? `${availableBrides(h).length} famil${availableBrides(h).length === 1 ? 'y' : 'ies'} would receive you`
    : h.merchant ? `${h.merchant.name}, son of ${h.merchant.father}` : 'Not married';
  return (
    <div className="charsheet inline" data-testid="household">
      <Fold id="me-household" title="Household" gist={gist} attention={waiting || h.stage === 'offered' && !Object.keys(h.suitors).length}>
        {h.merchant && <p className="cs-note" data-testid="hh-merchant">{h.merchant.name} heads the house now, since {dateFor(h.merchant.since).short}. {h.mother ? <>His mother <button className="hh-name" onClick={() => setLook({ src: brideArt(h.mother!), name: BRIDES[h.mother!].name, person: personOf(h.mother!), lines: [`Mother of ${h.merchant!.name}. She lives with him.`, `Daughter of ${BRIDES[h.mother!].father}.`] })} data-testid="hh-mother">{BRIDES[h.mother].short}</button> lives with him.</> : ''}</p>}

        {h.stage === 'none' && !h.merchant && !availableBrides(h).length && (
          <>
            <p className="cs-note" data-testid="hh-none">
              {standing(g) ? 'You are not married. If you want a household, Uncle Rashid knows families who would hear of you. Winning one over takes calls, presents and a good name.' : `You are not married. Families will listen once your name is known (reputation ${MATCH_REP}) and you keep a stall with a canopy or better.`}
            </p>
            {standing(g) && <button className="btn" onClick={() => act({ kind: 'seek' })} data-testid="hh-seek">Ask Rashid to look for a match</button>}
          </>
        )}

        {sp && !h.merchant && !h.chosen && (wives.length >= MAX_WIVES
          ? <p className="cs-note" data-testid="hh-four">Four wives: the law allows no more.</p>
          : <p className="cs-note" data-testid="hh-more">The law allows up to four wives, each in rooms of her own ({fmt(ROOMS_COST[wives.length] ?? 0)} for the next). A family gives a daughter to a man with a wife at home only if his name is big enough: reputation {wifeRep(h)}{g.reputation < wifeRep(h) ? `, you have ${g.reputation}` : ''}. The wives you have will feel it.</p>)}
        {sp && canCourt(h) && h.offered === undefined && g.reputation >= wifeRep(h) && <button className="btn" onClick={() => act({ kind: 'seek' })} data-testid="hh-seek-more">Ask Rashid to look for another wife</button>}

        {courtable.length > 0 && (h.stage === 'offered' || h.stage === 'none' || h.stage === 'married') && (
          <>
            {h.stage === 'none' && standing(g) && <button className="btn" onClick={() => act({ kind: 'seek' })} data-testid="hh-seek">Ask Rashid to look for a match as well</button>}
            <p className="cs-note">Call on a family in their town, send presents to the house, and when her father thinks well enough of you ({ASK_AT}), ask for her hand. Your name, your clothes and your honesty all count, and a dealer's family looks at where you stand on his city's table.</p>
            {courtable.map((id: BrideId) => {
              const b = BRIDES[id];
              const su = h.suitors[id] ?? { favour: 0, visits: 0, gifts: 0 };
              const here = at === b.city;
              return (
                <div key={id} className="hh-card" data-testid={`bride-${id}`}>
                  <Portrait src={brideArt(id)} name={b.short} onOpen={() => setLook({ src: brideArt(id), name: b.name, person: personOf(id), lines: [`${b.rank ? RANK_WORD[b.rank] + ' · ' : ''}${b.cityName}`, `Daughter of ${b.father}.`, b.intro, b.brings, `Her father's opinion of you: ${su.favour} of 100.`] })} />
                  <div className="hh-txt">
                    <b><NameBtn>{b.name}</NameBtn></b>
                    <small className="hh-rank">{b.rank ? RANK_WORD[b.rank] : ''}{b.rank ? ' · ' : ''}{b.cityName}{b.minRep && g.reputation < b.minRep ? ` · wants a name of ${b.minRep}` : ''}</small>
                    <small>Daughter of {b.father}. Through {b.introducer}.</small>
                    <small className="hh-intro">{b.intro}</small>
                    <small className="hh-brings">{b.brings}{b.house ? ` ${HOUSE_PERK}` : ''}</small>
                    {b.house && <button className="hh-father" onClick={() => ency(b.house!)} data-testid={`hh-father-${id}`}><img src={`art/portraits/small/${b.house}.webp`} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} /><small>Her father, {houseName(b)} ›</small></button>}
                    {b.house && <small className={`hh-house ${houseNeed(g.ranks, b) ? 'short' : 'ok'}`} data-testid={`house-${id}`}>{houseName(b)}'s house: {houseNeed(g.ranks, b) ? `wants you among the first ${b.place} of ${b.cityName}` : `you stand high enough in ${b.cityName}`}.</small>}
                    {sp && b.rank === 'grand' && <small className="hh-house short">A great house: no daughter of theirs becomes a second wife.</small>}
                    <Bar v={su.favour} testid={`favour-${id}`} />
                    <small>Her father's opinion of you: {su.favour}{su.visits ? ` · ${su.visits} call${su.visits > 1 ? 's' : ''}` : ''}{su.gifts ? ` · ${su.gifts} present${su.gifts > 1 ? 's' : ''}` : ''}</small>
                    <div className="hh-btns">
                      <button className="btn" disabled={!here} onClick={() => act({ kind: 'visit', bride: id })} data-testid={`visit-${id}`}>{here ? 'Call on the family' : `In ${b.cityName}`}</button>
                      <button className="btn" onClick={() => act({ kind: 'gift', bride: id })} data-testid={`gift-${id}`}>Present {fmt(b.gift.cost)}</button>
                      {su.favour >= ASK_AT && <button className="btn primary" disabled={!here} onClick={() => act({ kind: 'ask', bride: id })} data-testid={`ask-${id}`}>Ask for her hand · mahr {fmt(b.mahr)}</button>}
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {h.chosen && (() => {
          const b = BRIDES[h.chosen];
          const from = (h.contract ?? g.day) + FEAST_AFTER;
          return (
            <div className="hh-card" data-testid="hh-betrothed">
              <Portrait src={brideArt(b.id)} name={b.short} onOpen={() => setLook({ src: brideArt(b.id), name: b.name, person: personOf(b.id), lines: [`Promised to you. Daughter of ${b.father}, of ${b.cityName}.`, b.intro, b.brings] })} />
              <div className="hh-txt">
                <b><NameBtn>{b.name}</NameBtn></b>
                <small>The contract is written and the mahr paid. The wedding feast is held at her father's house in {b.cityName}, from {dateFor(from).short}: {fmt(b.feast)}{sp ? `, and her rooms in the house ${fmt(ROOMS_COST[wives.length] ?? 0)}` : ''}.</small>
                <div className="hh-btns"><button className="btn primary" disabled={at !== b.city || g.day < from} onClick={() => act({ kind: 'feast' })} data-testid="hold-feast">Hold the wedding feast</button></div>
              </div>
            </div>
          );
        })()}

        {wives.map((sp, wi) => {
          const b = BRIDES[sp.id];
          const tag = wi ? `-${sp.id}` : '';
          const home = at === 'giza';
          return (
            <div key={sp.id} className="hh-card" data-testid={`hh-spouse${tag}`}>
              <Portrait src={brideArt(sp.id)} name={b.short} onOpen={() => setLook({ src: brideArt(sp.id), name: b.name, person: personOf(sp.id), lines: [`${wives.length > 1 ? `Your ${["first", "second", "third", "fourth"][wi]} wife. ` : 'Your wife. '}Married ${dateFor(sp.married).short} in ${b.cityName}.`, `Daughter of ${b.father}.`, `${contentWord(sp.content)}${home ? ', and you are home' : ''}.`, b.brings, `${h.children.filter((c) => (c.mother ?? wives[0]?.id) === sp.id).length || 'No'} children with you.`] })} />
              <div className="hh-txt">
                <b><NameBtn>{b.short}</NameBtn>{wives.length > 1 ? <em className="hh-nth"> · {["first", "second", "third", "fourth"][wi]} wife</em> : null}</b>
                <small>Married {dateFor(sp.married).short} in {b.cityName}. {b.brings}</small>
                <Bar v={sp.content} testid={`hh-content${tag}`} />
                <small data-testid={`hh-content-word${tag}`}>{contentWord(sp.content)}{home ? ', and you are home' : g.day - sp.lastHome > 10 ? `: you have been away ${g.day - sp.lastHome} days` : ''}.{sp.workshop ? ' She keeps a small workshop.' : ''}</small>
                <div className="hh-roles" role="group" aria-label="What she does">
                  {(['home', 'stall', 'books', 'rugs'] as SpouseRole[]).map((r) => (
                    <button key={r} className={`hh-chip ${sp.role === r ? 'on' : ''}`} onClick={() => act({ kind: 'role', role: r, wife: sp.id })} data-testid={`role-${r}${tag}`}>{ROLE_WORD[r]}</button>
                  ))}
                </div>
                <div className="hh-btns">
                  <button className="btn" disabled={!home} onClick={() => act({ kind: 'evening', wife: sp.id })} data-testid={`hh-evening${tag}`}>An evening at home</button>
                  <button className="btn" onClick={() => act({ kind: 'present', wife: sp.id })} data-testid={`hh-present${tag}`}>A present {fmt(PRESENT.cost)}</button>
                </div>
              </div>
            </div>
          );
        })}

        {h.children.map((c: Child) => {
          const age = ageOf(c);
          const names = (c.sex === 'son' ? SON_NAMES : DAUGHTER_NAMES).filter((n) => !named.some((x) => x.name === n)).slice(0, 4);
          const shops = Object.keys(((g as unknown as { shops?: Record<string, unknown> }).shops) ?? {});
          return (
            <div key={c.id} className="hh-card kid" data-testid={`child-${c.id}`}>
              <Portrait src={childArt(c, sp?.id)[0]} fallback={childArt(c, sp?.id)[1]} key={childArt(c, sp?.id)[0]} name={c.name ?? (c.sex === 'son' ? 'S' : 'D')} small onOpen={() => setLook({ src: childArt(c, sp?.id)[0], fallback: childArt(c, sp?.id)[1], name: c.name ?? `Your ${c.sex}, not yet named`, lines: [`${c.sex === 'son' ? 'Son' : 'Daughter'} of ${merchantName(g)}${c.mother ?? sp?.id ? ` and ${BRIDES[c.mother ?? sp!.id]?.short ?? ''}` : ''}.`, `Born ${dateFor(c.born).short}. ${age < 1 ? 'A baby.' : `${age} year${age > 1 ? 's' : ''} old.`}`, c.path ? `${PATH_WORD[c.path][0].toUpperCase()}${PATH_WORD[c.path].slice(1)}.` : '', c.role === 'apprentice' ? 'Travels with you as your apprentice.' : c.role === 'shop' ? `Keeps the shop in ${c.shopAt}.` : ''] })} />
              <div className="hh-txt">
                <b><NameBtn>{c.name ?? `A ${c.sex}, not yet named`}</NameBtn>{c.twinOf || h.children.some((x) => x.id !== c.id && x.born === c.born && (x.mother ?? '') === (c.mother ?? '')) ? <em className="hh-nth"> · {h.children.filter((x) => x.born === c.born && (x.mother ?? '') === (c.mother ?? '')).length === 3 ? 'a triplet' : 'a twin'}</em> : null}</b>
                <small>{wives.length > 1 || c.mother ? `${BRIDES[c.mother ?? sp?.id ?? '']?.short ?? ''}'s ${c.sex}. ` : ''}{age < 1 ? 'A baby' : `${age} year${age > 1 ? 's' : ''}`}{c.path ? `, ${PATH_WORD[c.path]}` : ''}{c.role === 'apprentice' ? ', travelling with you' : c.role === 'shop' ? `, keeping the shop (${c.shopAt})` : ''}.{age >= PATH_AGE ? ` Learning ${Math.round(c.traits.learning)} · trade ${Math.round(c.traits.trade)} · craft ${Math.round(c.traits.craft)}` : ''}</small>
                {!c.name && <div className="hh-roles">{names.map((n) => <button key={n} className="hh-chip" onClick={() => act({ kind: 'name', child: c.id, name: n })} data-testid={`name-${c.id}-${n}`}>{n}</button>)}</div>}
                {c.name && age >= PATH_AGE && age < GROWN && (
                  <div className="hh-roles">{(['school', 'shop', 'weaving'] as ChildPath[]).map((p) => <button key={p} className={`hh-chip ${c.path === p ? 'on' : ''}`} onClick={() => act({ kind: 'path', child: c.id, path: p })} data-testid={`path-${c.id}-${p}`}>{p === 'school' ? 'School' : p === 'shop' ? 'The stall' : 'The loom'}</button>)}</div>
                )}
                {c.name && age >= GROWN && (
                  <div className="hh-roles">
                    <button className={`hh-chip ${!c.role || c.role === 'home' ? 'on' : ''}`} onClick={() => act({ kind: 'childRole', child: c.id, role: 'home' })}>At home</button>
                    {c.sex === 'son' && <button className={`hh-chip ${c.role === 'apprentice' ? 'on' : ''}`} onClick={() => act({ kind: 'childRole', child: c.id, role: 'apprentice' })} data-testid={`apprentice-${c.id}`}>Travels with you</button>}
                    {shops.map((k) => <button key={k} className={`hh-chip ${c.shopAt === k ? 'on' : ''}`} onClick={() => act({ kind: 'childRole', child: c.id, role: 'shop', shop: k })}>Keeps the shop: {k}</button>)}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {sp && (
          <div className="hh-pace" data-testid="hh-pace">
            <small>It is a long game: at the true pace a child is grown after eighteen years of trading. You may let the years at home pass faster.</small>
            <div className="hh-roles">{PACES.map((p) => <button key={p} className={`hh-chip ${h.pace === p ? 'on' : ''}`} onClick={() => act({ kind: 'pace', pace: p })} data-testid={`pace-${p}`}>{p === 1 ? 'True time' : `${p} times faster`}</button>)}</div>
          </div>
        )}

        {heir && !g.ended && (
          <div className="hh-heir" data-testid="hh-heir">
            <small><button className="hh-name" onClick={() => (document.querySelector(`[data-testid=child-${heir.id}] .hh-pt-open`) as HTMLButtonElement | null)?.click()} data-testid="hh-heir-name">{heir.name}</button> is your heir. When you are ready, {heir.sex === 'son' ? 'he' : 'she'} takes the house on, with its shops and stock and part of your name.</small>
            {!handOver ? <button className="btn" onClick={() => setHandOver(true)} data-testid="hh-handover">Hand the house to {heir.name}</button>
              : <div className="hh-btns"><button className="btn primary" onClick={() => { setHandOver(false); act({ kind: 'inherit' }); }} data-testid="hh-handover-yes">Yes, {merchantName(g)} steps aside</button><button className="btn" onClick={() => setHandOver(false)}>Not yet</button></div>}
          </div>
        )}
        {msg && <p className="hh-msg" role="status" data-testid="hh-msg">{msg}</p>}
        {look && <LookSheet look={look} onClose={() => setLook(null)} />}
      </Fold>
    </div>
  );
}

/** On the end-of-the-road card: carry on as the eldest grown child, if there is one. */
export function HeirButton() {
  const g = useGame();
  const heir = heirOf(hh(g));
  if (!heir) return null;
  return <button className="btn primary" style={{ marginBottom: 8 }} onClick={() => g.householdAct({ kind: 'inherit' })} data-testid="ending-heir">Carry on as {heir.name}</button>;
}
