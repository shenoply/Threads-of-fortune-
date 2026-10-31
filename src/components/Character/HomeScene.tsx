import { useState } from 'react';
import { useGame } from '../../game/state/store';
import { waitsTurn } from '../../game/cardTurn';
import { fmt } from '../../game/economy/money';
import { person, faceSrc } from '../../game/systems/population';
import {
  BRIDES, RANK_WORD, LIKES_WORD, COND_WORD, FEAST_SCALES, ROOMS_COST, GATHERING, HEIR_REP, HEIR_REP_GATHERING,
  hh, ageOf, heirOf, wivesOf, brideArt, wifeArt, childArt, fatherShort, callGift, feastOf, merchantName,
  type BrideId, type HouseholdAct,
} from '../../game/systems/household';
import '../Mission/mission-scene.css';
import './household.css';

/** her father's face: a dealer's own portrait, or the face the world gave him */
function fatherArt(id: BrideId): string | undefined {
  const b = BRIDES[id];
  if (!b) return undefined;
  if (b.house) return `art/portraits/${b.house}.webp`;
  const d = person(b.folk ?? `bride-${id}`);
  const fa = (d?.father ? person(d.father) : undefined) ?? person(`father-${id}`);
  return fa ? faceSrc(fa) : undefined;
}

/** a round face on the card, or the initial when there is no picture */
function Face({ src, name }: { src?: string; name: string }) {
  const [ok, setOk] = useState(true);
  return (
    <span className="hs-face">
      <b>{name.replace(/^(the|al-|her)\s*/i, '')[0]?.toUpperCase()}</b>
      {src && ok && <img src={src} alt="" onError={() => setOk(false)} />}
      <small>{name}</small>
    </span>
  );
}

interface Choice { id: string; label: string; note: string; act: HouseholdAct; off?: string }

/** The household's four key moments as a card in the flow, like a mission's closing scene: the first
 *  call on her family, the proposal, the wedding feast, and the keys of the house. */
export function HomeSceneCard() {
  const g = useGame();
  const h = hh(g);
  const sc = h.scene;
  const [note, setNote] = useState('');
  if (!sc) return null;
  if (waitsTurn(g, 'home')) return null;
  const act = (a: HouseholdAct) => { const m = g.householdAct(a); if (!hh(useGame.getState()).scene?.done) setNote(m); else setNote(''); };
  const close = () => { setNote(''); g.householdAct({ kind: 'close' }); };
  const b = sc.bride ? BRIDES[sc.bride] : undefined;
  const fa = b ? fatherShort(b) : '';
  const Fa = fa.charAt(0).toUpperCase() + fa.slice(1);
  // where her father has died, her mother speaks for the family
  const his = fa === 'her mother' ? 'her' : 'his';
  let who = '', title = '', text = '';
  let faces: { src?: string; name: string }[] = [];
  let choices: Choice[] = [];

  if (sc.kind === 'call' && b) {
    const su = h.suitors[b.id] ?? { favour: 0, visits: 0, gifts: 0 };
    const first = !su.visits;
    who = `${b.rank ? RANK_WORD[b.rank] : 'A family'} · ${b.cityName}`;
    title = first ? 'The first call' : `A call on ${Fa}`;
    faces = [{ src: fatherArt(b.id), name: Fa }, { src: brideArt(b.id), name: b.short }];
    text = first
      ? `${Fa} receives you in the front room, with coffee and the eldest son. ${b.short} brings in the tray, and goes out again. They will remember how you present yourself today. This family weighs ${LIKES_WORD[b.likes]}.`
      : `Coffee again in ${fa}'s front room.${su.rival ? ` The other suitor is not mentioned, which means everyone is thinking of him.` : ''} This family weighs ${LIKES_WORD[b.likes]}. Her family's opinion of you: ${su.favour} of 100.`;
    const gift = callGift(b);
    choices = [
      { id: 'modest', label: `Modestly: let ${fa} do the talking`, note: 'Plain good manners', act: { kind: 'visit', bride: b.id, way: 'modest' } },
      { id: 'gift', label: 'With a generous gift for the house', note: fmt(gift), act: { kind: 'visit', bride: b.id, way: 'gift' }, off: g.cash < gift ? `You have ${fmt(g.cash)}` : undefined },
      { id: 'trade', label: 'Talk of your trade', note: 'Your buyers, your rugs, your prices', act: { kind: 'visit', bride: b.id, way: 'trade' } },
    ];
  } else if (sc.kind === 'ask' && b) {
    const mahr = sc.mahr ?? b.mahr;
    who = `${b.cityName} · her family's house`;
    title = 'Asking for her hand';
    faces = [{ src: fatherArt(b.id), name: Fa }, { src: brideArt(b.id), name: b.short }];
    const faith = b.faith && b.faith !== 'muslim' ? ` She keeps her family's faith; the contract is written before the ma'zun, as the law requires.` : '';
    const ask = sc.demand === 'more' ? ` ${Fa} is quiet a moment. "For a daughter like ours, ${fmt(mahr)}." It is more than was spoken of.`
      : sc.demand && sc.demand !== 'none' ? ` ${Fa} has one condition, to be written into the contract: ${COND_WORD[sc.demand]}.`
      : ` ${Fa} gives ${his} consent.`;
    text = `You ask for ${b.short}'s hand, as is proper, with ${b.introducer} beside you. The mahr agreed between the families is ${fmt(b.mahr)}, paid to the bride when the contract is written.${faith}${ask}`;
    const short = g.cash < mahr ? `You have ${fmt(g.cash)}` : undefined;
    choices = sc.demand === 'more' ? [
      { id: 'agree', label: `Agree to ${fmt(mahr)}`, note: 'Write the contract and pay the mahr', act: { kind: 'ask', bride: b.id, answer: 'agree' }, off: short },
      { id: 'hold', label: `Hold to the ${fmt(b.mahr)} agreed`, note: 'He may take offence', act: { kind: 'ask', bride: b.id, answer: 'hold' }, off: g.cash < b.mahr ? `You have ${fmt(g.cash)}` : undefined },
    ] : sc.demand && sc.demand !== 'none' ? [
      { id: 'agree', label: 'Agree, and write it in', note: `Pay the mahr of ${fmt(mahr)}`, act: { kind: 'ask', bride: b.id, answer: 'agree' }, off: short },
      { id: 'hold', label: 'Ask him to let it go', note: 'He may take offence', act: { kind: 'ask', bride: b.id, answer: 'hold' }, off: short },
    ] : [
      { id: 'agree', label: `Write the contract: mahr ${fmt(mahr)}`, note: `The wedding feast follows in ${b.cityName}`, act: { kind: 'ask', bride: b.id, answer: 'agree' }, off: short },
    ];
  } else if (sc.kind === 'feast' && b) {
    const rooms = ROOMS_COST[wivesOf(h).length] ?? 0;
    who = `${b.cityName} · her father's house`;
    title = 'The wedding feast';
    faces = [{ src: brideArt(b.id), name: b.short }, { src: fatherArt(b.id), name: Fa }];
    text = `${b.short}'s family has made ready. The feast is theirs to host and yours to pay for, and the quarter will judge both houses by it.${rooms ? ` Her own rooms in the house at Giza cost ${fmt(rooms)} besides.` : ''} How large a feast?`;
    choices = FEAST_SCALES.map((sz) => { const f = feastOf(b, sz); return { id: sz, label: `${f.label} · ${fmt(f.cost)}`, note: `${f.note}. Reputation +${f.rep}`, act: { kind: 'feast', scale: sz } as HouseholdAct, off: g.cash < f.cost + rooms ? `You have ${fmt(g.cash)}` : undefined }; });
  } else if (sc.kind === 'heir') {
    const heir = heirOf(h);
    const done = !!sc.done;
    const head = h.merchant;
    const name = done && head ? head.name : heir?.name ?? '';
    const pro = (done && head ? head.sex : heir?.sex) === 'daughter' ? 'she' : 'he';
    const mother = h.mother ?? h.spouse?.id;
    who = 'Giza · the house';
    title = 'The keys of the house';
    const art = done && head?.child ? childArt(head.child)[0] : heir ? childArt(heir, h.spouse?.id)[0] : undefined;
    faces = [{ src: art || undefined, name }, ...(mother && BRIDES[mother] ? [{ src: h.mother ? brideArt(mother) : wifeArt(h.spouse!), name: BRIDES[mother].short }] : [])];
    text = heir ? `${heir.name} is ${ageOf(heir)}, and has the trade in hand. ${merchantName(g)} could step aside now: the stall, the shops and the stock would pass to ${heir.name}, and ${pro} would carry something of the family name.` : '';
    choices = heir ? [
      { id: 'gathering', label: 'Gather the family, and hand over the keys before them all', note: `${fmt(GATHERING)} · reputation ${Math.round(g.reputation * HEIR_REP_GATHERING)}`, act: { kind: 'inherit', way: 'gathering' }, off: g.cash < GATHERING ? `You have ${fmt(g.cash)}` : undefined },
      { id: 'quiet', label: 'Hand over quietly', note: `Reputation ${Math.round(g.reputation * HEIR_REP)}`, act: { kind: 'inherit', way: 'quiet' } },
    ] : [];
  }

  return (
    <div className="mscene" role="dialog" aria-label={title} data-testid="home-scene" data-kind={sc.kind}>
      <div className="mscene-card">
        <div className="hs-faces">{faces.map((f, i) => <Face key={i} src={f.src} name={f.name} />)}</div>
        <small className="mscene-who">{who}</small>
        <h2>{title}</h2>
        <p className="mscene-text" data-testid="home-scene-text">{sc.done ?? text}</p>
        {note && !sc.done && <p className="hs-note" role="status" data-testid="home-scene-note">{note}</p>}
        <div className="mscene-choices">
          {sc.done ? (
            <button className="mscene-choice primary" onClick={close} data-testid="home-scene-go"><b>Go on</b></button>
          ) : (
            <>
              {choices.map((c, i) => (
                <button key={c.id} className={`mscene-choice ${i === 0 && !c.off ? 'primary' : ''}`} disabled={!!c.off} onClick={() => act(c.act)} data-testid={`home-${c.id}`}>
                  <b>{c.label}</b><small>{c.off ? `${c.note} · ${c.off}` : c.note}</small>
                </button>
              ))}
              <button className="mscene-choice" onClick={close} data-testid="home-scene-leave"><b>{sc.kind === 'call' ? 'Not today' : 'Not yet'}</b><small>Nothing is spent</small></button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
