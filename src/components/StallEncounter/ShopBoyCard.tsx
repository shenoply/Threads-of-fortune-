import { useState } from 'react';
import { createPortal } from 'react-dom';
import './stallhelp.css';
import { useGame } from '../../game/state/store';
import { isOpen } from '../../game/unlocks';
import { fmt } from '../../game/economy/money';
import { RUGS } from '../../data/rugs';
import { BOY, BOY_PCTS, boyName, boyPrice, plainRugs, takeChance, trustWord } from '../../game/systems/shopBoy';
import { BOY_TRAIT, boyFace, laneBoys } from '../../game/systems/laneBoys';
import { fireBoy, hireBoy, setBoy } from '../../game/systems/stallHelpActions';
import { BOY_OFFERED } from '../../game/systems/stallNight';
import '../Tips/once.css';

/** tipsSeen mark: the boy's card has been used once since Hajj Mahmoud's offer */
const BOY_CARD_USED = 'boy-card-used';

/** The boy who minds the stall while you are away: hire him, tell him what to do, let him go. */
export function ShopBoyCard() {
  const g = useGame();
  const b = g.shopBoy;
  const [open, setOpen] = useState(false);
  if (!g.tutorial.done) return null;
  // the boy comes into it when Hajj Mahmoud first offers him (game/unlocks.ts)
  if (!isOpen(g, 'boy')) return null;
  if (!b?.hired) {
    // Hajj Mahmoud has offered his nephew on a morning card: the card stands out until it is first used
    const seen = g.tipsSeen ?? [];
    const fresh = !b && seen.includes(BOY_OFFERED) && !seen.includes(BOY_CARD_USED);
    const samiBefore = !!b && !b.who;
    const kids = laneBoys(g.day);
    return (
      <div className={`boy-card${fresh ? ' once-mark' : ''}`} data-testid="boy-card" data-fresh={fresh ? '1' : undefined} onClickCapture={fresh ? () => g.seeTip(BOY_CARD_USED) : undefined}>
        <div className="boy-head">
          <BoyFace />
          <span><b>A boy to mind the stall</b><small>{samiBefore ? `${BOY.name} is back at his uncle's shop. He would come back.` : `${BOY.who}, will sit at your stall when you are away.`} {BOY.wage} piastres a day.</small></span>
          <button className="btn small" onClick={() => hireBoy()} data-testid="boy-hire">{samiBefore ? 'Take him back' : `Hire ${BOY.name}`}</button>
        </div>
        {kids.length > 0 && (
          <div className="lane-boys" data-testid="lane-boys">
            <p className="lane-boys-k">Or a boy from a family of the lane</p>
            {kids.map((k) => (
              <div key={k.id} className="lane-boy" data-testid={`lane-boy-${k.id}`}>
                <BoyFace who={k.id} />
                <span>
                  <b>{k.name}, {k.age}</b>
                  <small>{k.family}</small>
                  <small className="lane-boy-gift"><i>{BOY_TRAIT[k.trait].label}.</i> {BOY_TRAIT[k.trait].does}</small>
                </span>
                <button className="btn small" onClick={() => hireBoy(k)} data-testid={`lane-hire-${k.id}`}>{b?.who === k.id ? 'Take him back' : 'Take him on'}<small>{k.weekly} pt a week</small></button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
  const rugs = plainRugs(g);
  const pct = b.pct;
  const step = (d: number) => { const i = BOY_PCTS.indexOf(pct); const n = BOY_PCTS[Math.max(0, Math.min(BOY_PCTS.length - 1, (i < 0 ? 2 : i) + d))]; setBoy({ pct: n }); };
  const odds = takeChance(pct);
  const recent = b.sales.slice(-3).reverse();
  return (
    <div className="boy-card" data-testid="boy-card">
      <div className="boy-head">
        <BoyFace who={b.who} />
        <span><b>{boyName(b)} minds the stall</b><small>{b.mode === 'sell' ? 'Sells plain rugs at your price' : 'Keeps buyers waiting for you'} · {trustWord(b.trust)}{b.trait ? ` · ${BOY_TRAIT[b.trait].label.toLowerCase()}` : ''}{b.owed ? ` · owed ${b.owed} day${b.owed > 1 ? 's' : ''}` : ''}</small></span>
        <button className="btn small" onClick={() => setOpen((o) => !o)} aria-expanded={open} data-testid="boy-toggle">{open ? 'Close' : 'Orders'}</button>
      </div>
      {open && (
        <>
          <div className="boy-seg" role="group" aria-label="What he does">
            <button className={`btn small ${b.mode === 'wait' ? 'on' : ''}`} onClick={() => setBoy({ mode: 'wait' })} data-testid="boy-mode-wait">Keep them waiting</button>
            <button className={`btn small ${b.mode === 'sell' ? 'on' : ''}`} onClick={() => setBoy({ mode: 'sell' })} data-testid="boy-mode-sell">Sell plain rugs</button>
          </div>
          {b.trait && <p data-testid="boy-gift"><small><i>{BOY_TRAIT[b.trait].label}.</i> {BOY_TRAIT[b.trait].does} {b.weekly} piastres a week.</small></p>}
          <p><small>{b.mode === 'wait' ? `Buyers wait about ${BOY.wait} hours longer for you. He sells nothing.` : 'He sells only Common rugs left at the stall (not packed for the road), to buyers who want one. Better buyers wait for you.'}</small></p>
          {b.mode === 'sell' && (
            <>
              <div className="boy-pct">
                <span>His price: <b data-testid="boy-pct">{Math.round(pct * 100)}%</b> of worth<br /><small>{odds >= 0.45 ? 'Most buyers will take it' : odds >= 0.25 ? 'Some buyers will take it' : 'Few buyers will take it'}</small></span>
                <button className="btn small" onClick={() => step(-1)} disabled={pct <= BOY_PCTS[0]} aria-label="Lower" data-testid="boy-pct-down">−</button>
                <button className="btn small" onClick={() => step(1)} disabled={pct >= BOY_PCTS[BOY_PCTS.length - 1]} aria-label="Higher" data-testid="boy-pct-up">+</button>
              </div>
              {rugs.length ? (
                <ul className="boy-list" data-testid="boy-rugs">
                  {rugs.slice(0, 4).map((i) => <li key={i.uid}><span>{RUGS[i.typeId].name}</span><b>{fmt(boyPrice(i, pct))}</b></li>)}
                  {rugs.length > 4 && <li><small>and {rugs.length - 4} more</small></li>}
                </ul>
              ) : <p><small>No plain rugs at the stall for him to sell. Leave some unpacked in Stock.</small></p>}
            </>
          )}
          {recent.length > 0 && (
            <ul className="boy-list" data-testid="boy-sales">
              {recent.map((x, i) => <li key={i}><span>Day {x.day}: {RUGS[x.typeId]?.name}</span><b>{fmt(x.price)}</b></li>)}
            </ul>
          )}
          <div className="boy-foot"><button className="btn small" onClick={() => fireBoy()} data-testid="boy-fire">Let him go</button></div>
        </>
      )}
    </div>
  );
}

/** the shop boy's face: Sami's portrait, a lane boy's face from the world, or a plain silhouette of a boy
 *  in a skullcap for one the world has no picture of */
export function BoyFace({ who, size }: { who?: string; size?: number }) {
  const full = boyFace(who ? { who } : undefined);
  // a face of the portrait pool has a small copy for lists; a face not painted yet falls to the silhouette
  const small = full && /^art\/people\/[^/]+\.webp$/.test(full) ? full.replace(/^art\/people\/(.+)\.webp$/, 'art/people/small/$1.webp') : full;
  const [step, setStep] = useState(0);
  const src = step === 0 ? small : step === 1 && small !== full ? full : undefined;
  return (
    <i className="boy-face" aria-hidden="true" style={size ? { width: size, height: size } : undefined}>
      {src ? <img key={src} src={src} alt="" onError={() => setStep((n) => (n === 0 && small !== full ? 1 : 2))} /> : <BoySilhouette />}
    </i>
  );
}

export function BoySilhouette() {
  return (
    <svg className="boy-sil" viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" fill="#2c1c10" />
      {/* a boy's head and shoulders in a galabiya, a taqiya on his head, lit from the left */}
      <path d="M6 40c1-8 6-12.5 14-12.5S33 32 34 40z" fill="#5b4028" />
      <circle cx="20" cy="18" r="7.2" fill="#6b4c30" />
      <path d="M12.9 16.4c.4-4.2 3.5-6.8 7.1-6.8s6.7 2.6 7.1 6.8c-2.4-1.1-4.7-1.5-7.1-1.5s-4.7.4-7.1 1.5z" fill="#d9c7a4" />
      <path d="M12.8 18a7.2 7.2 0 0 0 4 6.4" stroke="#c99a5c" strokeOpacity=".5" strokeWidth="1" fill="none" />
    </svg>
  );
}

/** The boy in plain sight: his face, his name and what he is doing, as a chip. At the stall between
 *  customers it opens his card; in the picture it only shows. */
export function BoyChip({ onOpen, inScene }: { onOpen?: () => void; inScene?: boolean }) {
  const g = useGame();
  const b = g.shopBoy;
  if (!g.tutorial.done || !isOpen(g, 'boy')) return null;
  if (!b?.hired && inScene) return null;
  const job = !b?.hired ? `${BOY.name}, or a boy of the lane` : b.owed ? `owed ${b.owed} day${b.owed > 1 ? 's' : ''}' pay` : b.mode === 'sell' ? 'sells plain rugs when you are away' : 'keeps buyers waiting when you are away';
  const body = (
    <>
      <BoyFace who={b?.hired ? b.who : undefined} />
      <span><b>{b?.hired ? boyName(b) : 'A boy to mind the stall'}</b><small>{inScene ? (b!.mode === 'sell' ? 'sells plain rugs' : 'keeps them waiting') : job}</small></span>
    </>
  );
  if (inScene) return <BoyInScene />;
  return <button className={`boy-chip${b?.owed ? ' owed' : ''}`} onClick={onOpen} data-testid="boy-chip">{body}<span className="go" aria-hidden="true">›</span></button>;
}

/** The boy at your elbow while you sell: his face in the corner of the picture. A tap and he asks what
 *  you want; he can bring the tea or fetch the other rugs. One line under the talk, never a box. */
function BoyInScene() {
  const g = useGame();
  const b = g.shopBoy!;
  const [ask, setAsk] = useState(false);
  const enc = g.encounter;
  const teaOk = !!enc && !enc.outcome && g.upgrades.includes('tea') && !enc.teaUsed && !enc.venue;
  const band = typeof document !== 'undefined' ? document.querySelector('.stall > .band') : null;
  const name = boyName(b);
  const all = typeof document !== 'undefined' ? document.querySelector('[data-testid="change-rugs"]') as HTMLButtonElement | null : null;
  const moreRugs = all && !all.disabled ? all : null;
  return (
    <>
      <button className={`boy-scene${ask ? ' on' : ''}`} onClick={() => setAsk((x) => !x)} data-testid="boy-chip-scene" aria-label={`${name}, your shop boy`} aria-expanded={ask}>
        <BoyFace who={b.who} />
        <small>{name}</small>
      </button>
      {ask && band && createPortal(
        <div className="boy-ask" data-testid="boy-ask">
          <span><b>{name}</b> leans in: “Effendi?”</span>
          <div>
            {teaOk && <button className="btn small" onClick={() => { setAsk(false); useGame.getState().act('tea'); }} data-testid="boy-tea">Bring tea</button>}
            {moreRugs && <button className="btn small" onClick={() => { setAsk(false); moreRugs.click(); }} data-testid="boy-rugs">Fetch the other rugs</button>}
            <button className="btn small" onClick={() => setAsk(false)} data-testid="boy-later">Not now</button>
          </div>
        </div>,
        band,
      )}
    </>
  );
}
