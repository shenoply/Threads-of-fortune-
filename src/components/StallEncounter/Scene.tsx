import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from '../Icon';
import { useAtStall, useRecord } from '../Radio/Gramophone';
import { RECORD_BY_ID } from '../../data/records';
import { audio } from '../../game/audio/engine';
import { fmt } from '../../game/economy/money';
import type { Encounter } from '../../game/systems/negotiation';
import { STAGES, prefsFor } from '../../game/systems/negotiation';
import type { RugItem } from '../../game/types';
import { BUYERS } from '../../data/buyers';
import { RUGS } from '../../data/rugs';
import { rugSrc, rugThumb } from '../RugViewer/rugArt';
import type { PlaybackView } from '../BuyerDialogue/usePlayback';
import { PortraitOrCameo, PersonBack } from '../People/Person';
import { personFor } from '../../data/people';
import { Atmosphere } from '../Atmosphere/Atmosphere';
import { radio } from '../../game/radio/player';
import { bulletin, loadArabic, newsStart, type Lang } from '../../game/radio/bulletin';
import { useGame } from '../../game/state/store';
import { START_WARDROBE, wornOutfit } from '../../data/wardrobe';
import { HeroFigure } from '../Wardrobe/HeroFigure';
import { stallFigure } from './stallArt';
import { BuyerCard } from '../Merchant/Customers';

import { CAT_VARIANTS, catPose, spotsHere, spotsOf } from '../../game/stallDressing';
import { dressingArt, DRESSING_BY_ID } from '../../data/shops';
import { StallSky } from '../Atmosphere/StallSky';
import { STALL_SCENES, catAt, lookUps, sceneIdFor, placeStyle, placedRect, sceneFg, sceneImg, stallSceneFor, type Anchor, type StallScene } from '../../game/stallScenes';

interface SceneProps {
  enc: Encounter | null;
  presented?: RugItem;
  view: PlaybackView;
  onSkip: () => void;
  onCat: () => void;
  upgrades?: string[];
}

function useSize(ref: React.RefObject<HTMLElement>) {
  const [s, set] = useState({ w: 390, h: 265 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => set({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    set({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, [ref]);
  return s;
}

export function Dust() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.width = 656;
    c.height = 190;
    const g = c.getContext('2d')!;
    const motes = Array.from({ length: 46 }, () => ({ x: 280 + Math.random() * 150, y: Math.random() * 190, r: 0.4 + Math.random() * 1.1, vx: (Math.random() - 0.3) * 0.08, vy: -0.02 - Math.random() * 0.06, a: Math.random() }));
    let raf = 0;
    const loop = () => {
      g.clearRect(0, 0, c.width, c.height);
      for (const m of motes) {
        m.x += m.vx;
        m.y += m.vy;
        m.a += 0.01;
        if (m.y < 0) { m.y = 190; m.x = 280 + Math.random() * 150; }
        g.fillStyle = `rgba(255,228,170,${0.25 + Math.sin(m.a) * 0.2})`;
        g.beginPath();
        g.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        g.fill();
      }
      raf = requestAnimationFrame(loop);
    };
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) loop();
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas className="dust" ref={ref} />;
}

export function Scene({ enc, presented, view, onSkip, onCat }: SceneProps) {
  useAtStall();
  const sc = STALL_SCENES[useGame((st) => sceneIdFor(lookUps(st)))];
  const STAGE_IMG = sceneImg(sc.id);
  // the hero as the player dressed him, once every piece he wears is painted for the stall
  const outfit = wornOutfit(useGame((st) => st.wardrobe) ?? START_WARDROBE).id;
  const box = useRef<HTMLDivElement>(null);
  // the tallest this frame has been during this conversation (see Href below)
  const tallest = useRef({ id: '', h: 0 });
  const { w: W, h: H } = useSize(box);
  const buyer = enc ? BUYERS[enc.buyerId] : null;
  const [unfoldKey, setUnfoldKey] = useState(0);
  useEffect(() => setUnfoldKey((k) => k + 1), [presented?.uid]);

  const typed = (full: string, who: 'seller' | 'buyer') => (view.speaking === who && view.active ? full.slice(0, view.typed) : full);
  const cursor = (who: 'seller' | 'buyer', full: string) => view.speaking === who && view.typed < full.length && <span className="cursor" />;
  const moodRing =
    view.buyerMood === 'pleased' || view.buyerMood === 'warm' ? 'mood-good' : view.buyerMood === 'skeptical' || view.buyerMood === 'leaving' ? 'mood-bad' : '';
  const rugT = presented ? RUGS[presented.typeId] : null;

  if (buyer?.royal) {
    // A royal audience: the painted audience scene, the merchant seen from behind on the left.
    const who: 'seller' | 'buyer' = view.speaking ?? (view.lastSpeaker === 'seller' ? 'seller' : 'buyer');
    const text = who === 'seller' ? view.seller : view.buyer;
    return (
      <div className={`scene audience ${view.speaking ? 'speaking-' + view.speaking : ''}`} ref={box} onClick={onSkip} data-testid="scene" data-audience={buyer.id}>
        <img className="audience-art" src={`art/royal/${buyer.id}-audience.jpg`} alt={`An audience with ${buyer.name}`} style={{ objectPosition: `50% ${buyer.royal.focusY}%` }} draggable={false} />
        <div className="scene-fade" />
        {rugT && presented && (
          <div className="audience-rug" key={unfoldKey} data-testid="table-rug">
            <img src={rugSrc(rugT)} alt={`${rugT.name}, unrolled before ${buyer.name}`} />
          </div>
        )}
        <Atmosphere indoor />
        {text && (
          <div className={`bubble low ${who === 'seller' ? 'tail-up-left' : 'tail-up-right'} ${who === 'buyer' ? moodRing : ''}`} style={{ left: 8, bottom: 8, width: Math.min(W * 0.7, 480), maxHeight: H * 0.55 }} data-testid={who === 'seller' ? 'seller-bubble' : 'buyer-bubble'}>
            <b>{who === 'seller' ? 'You' : buyer.name}</b>
            {typed(text, who)}
            {cursor(who, text)}
          </div>
        )}
        {view.busy && (
          <button className="skip-hint" onClick={(e) => { e.stopPropagation(); onSkip(); }}>
            Tap to skip
          </button>
        )}
      </div>
    );
  }

  // The stall: the painting of the stall you hold (game/stallScenes.ts). The merchant stands at the
  // left, the buyer at the right, both behind the counter; the counter's front, cut from the same
  // painting, is laid over them and hides where their pictures end. The painting is laid out on a 3:2
  // stage anchored to the bottom of the frame, so whatever a narrow screen crops off the top, every
  // figure keeps its place on the counter.
  const who: 'seller' | 'buyer' = view.speaking ?? (view.lastSpeaker === 'seller' ? 'seller' : 'buyer');
  const text = who === 'seller' ? view.seller : view.buyer;
  const bw = Math.min(W * 0.62, 440);
  // the painting is 3:2 and bottom-anchored; on a wide, short frame (a desktop window) it may not
  // grow so tall that everything above the counter is cropped away: at most a frame and two thirds
  // tall, centred, with a blurred copy of the painting filling the sides
  // the counter's back edge, as a share of the stage up from the bottom
  const edge = 1 - sc.contact / 100;
  // what must be in view on a wide, short frame: from over the people's heads (42% of the stage above
  // the edge) down to the counter top's front (14% under it). The stage grows no taller than that
  // window allows, and if it still overhangs the frame the counter's front is cut off first.
  // On a phone the frame's height changes as the talk below it grows and the rug tray folds. The
  // painting and the people are sized for the tallest the frame will be (a set share of the screen),
  // so they keep one scale for the whole conversation; a shorter frame only cuts off more of the
  // counter's front, never shrinks the stall or the people.
  if (tallest.current.id !== (enc?.id ?? '')) tallest.current = { id: enc?.id ?? '', h: 0 };
  tallest.current.h = Math.max(tallest.current.h, H);
  // no more than a quarter taller than the frame is now, so the people's heads always stay in shot
  const Href = W < 600 && typeof window !== 'undefined' ? Math.min(H * 1.25, Math.max(H, tallest.current.h)) : H;
  const sh = Math.min(Math.max(W, Href * 1.5) / 1.5, Href / 0.56), sw = sh * 1.5;
  const cbRef = Math.min(Math.max(0, sh - Href), Math.max(0, edge - 0.14) * sh);
  const cb = Math.min(Math.max(0, sh - H), Math.max(0, edge - 0.14) * sh);
  const Hv = Href + cbRef; // the frame's top, measured up from the stage's bottom, at the scale's frame
  // on a tall, narrow frame (a phone) the painting is cropped at both sides; the figures are kept at
  // the edges of what is shown, not of the painting, and no wider than the frame leaves room for
  const crop = Math.max(0, (sw - W) / 2);
  const figH = Math.min(sh * 0.55, Hv * 0.93 - sh * (edge - 0.015), W * 0.62);
  // the leaning figure: his painted hands come 7.5% of the stage above where the 94% line of the
  // picture would put them, so he is set 5% of the stage under the edge to rest them on it. The head
  // (11% down) must stay inside the visible frame.
  const heroH = Math.min(sh * 0.62, (Hv * 0.94 - sh * (edge - 0.05)) / 0.83, W * 0.66);
  const heroStyle = { height: heroH, bottom: sh * (edge - 0.05) - heroH * 0.13, left: crop };
  // a standing buyer is drawn head to foot, the merchant only head to hands: their heads come out the
  // same size as his at 1.3 times his height; the counter cuts them at the waist (40% up the figure),
  // and their head (the top 5% of the picture is air) must stay inside the visible frame
  const buyerH = Math.min(heroH * 1.3, (Hv * 0.97 - sh * edge) / 0.55);
  const buyerB = sh * edge - buyerH * 0.4;
  // where the two people stand, in % of the stage across: nothing on the counter is drawn in front of
  // them (on a phone that is the whole counter in view; on a wide screen the middle stays dressed)
  const visL = (crop / sw) * 100, visR = 100 - visL;
  const people: [number, number][] = [[visL - 2, visL + ((heroH * 0.85) / sw) * 100 + 2], ...(buyer ? [[visR - ((buyerH * 0.62) / sw) * 100 - 2, visR + 2] as [number, number]] : [])];
  const inFront = (x: number) => people.some(([a, b]) => x > a && x < b);
  return (
    <div className={`scene stall ${view.speaking ? 'speaking-' + view.speaking : ''}`} ref={box} onClick={onSkip} data-testid="scene">
      {sw < W && <img className="stage-fill" src={STAGE_IMG} alt="" aria-hidden="true" draggable={false} />}
      <div className="stage" style={{ width: sw, height: sh, left: (W - sw) / 2, top: 'auto', bottom: -cb, ['--rug-b' as string]: `${(edge * 100 - 8).toFixed(2)}%`, ['--fig-h' as string]: `${figH}px`, ['--buyer-h' as string]: `${buyerH}px`, ['--buyer-b' as string]: `${buyerB}px`, ['--hero-h' as string]: `${heroH}px`, ['--crop' as string]: `${crop}px`, ['--edge' as string]: `${(edge * 100).toFixed(2)}%` }}>
        <img className="stage-bg" src={STAGE_IMG} alt={`Your stall: ${sc.label}`} data-lamps={sc.lamps} data-scene={sc.id} data-testid="stage-bg" draggable={false} />
        {sc.sky && <StallSky scene={sc.id} />}
        <StallSign sc={sc} />
        <StallProps sc={sc} />
        {/* The base stall body is always painted, so he always shows dressed in whatever pieces
            already have a stall-pose layer; a piece without one yet just doesn't draw (see
            HeroFigure), rather than reverting the whole figure to a fixed picture. */}
        <div className="hero-at-stall" data-testid="hero-at-stall" style={heroStyle}><HeroFigure pose="stall" outfitId={outfit} /></div>
        {buyer && (
          <div className={`buyer-figure${stallFigure(buyer.id).framed ? '' : ' has-photo'}${enc?.outcome && !enc.mocked ? ' leaving' : ''}`} data-testid="buyer-figure" data-buyer={buyer.id}>
            <ScenePerson id={buyer.id} />
          </div>
        )}
        <img className="counter" src={sceneFg(sc.id)} alt="" style={{ top: `${sc.fgTop}%` }} draggable={false} data-testid="stall-counter" />
        <StallProps sc={sc} front inFront={inFront} />
        <StallGramophone sc={sc} inFront={inFront} />
        {rugT && presented && (
          <div className="split-rug" key={unfoldKey} data-testid="table-rug">
            <img src={rugSrc(rugT)} alt={`${rugT.name} laid out on the table`} style={presented.condition === 'Dirty' ? { filter: 'sepia(0.5) brightness(0.7)' } : undefined} />
          </div>
        )}
        {(() => {
          // a radio or paper that would stand in front of someone moves along the counter to a free
          // place in view (on a phone, with no buyer, the right of the counter is clear)
          const freeAt = (a: Anchor, alts: number[]) => (!inFront(a.x) ? a : { ...a, x: alts.find((x) => !inFront(x) && x > visL + 4 && x < visR - 4) ?? a.x });
          const ra = freeAt(sc.radio, [71, 77, 83]), pa = freeAt(sc.paper, [80, 86, 66]);
          return (
            <>
              <StallRadio at={ra} hide={inFront(ra.x)} />
              <StallPaper at={pa} hide={inFront(pa.x)} />
            </>
          );
        })()}
        <StallCat sc={sc} onCat={onCat} rugOnCounter={!!(rugT && presented)} tag={!buyer} />
      </div>
      {/* a buyer who gives up gets up and goes, and the picture says so in words too */}
      {enc?.outcome === 'walked' && buyer && !enc.mocked && <div className="left-banner" data-testid="left-banner">{buyer.name.split(' ')[0]} {enc.letGo ? 'has gone' : 'walked away'}</div>}
      <Atmosphere sheltered={sc.sky} indoor={!sc.sky} />
      {text && (
        <div
          className={`bubble top ${who === 'seller' ? 'tail-left' : 'tail-right'} ${who === 'buyer' ? moodRing : ''}`}
          style={{ [who === 'seller' ? 'left' : 'right']: 8, top: 8, width: bw, maxHeight: H * 0.5 }}
          data-testid={who === 'seller' ? 'seller-bubble' : 'buyer-bubble'}
        >
          <b>{who === 'seller' ? 'You' : buyer?.name ?? 'Samira'}</b>
          {typed(text, who)}
          {cursor(who, text)}
        </div>
      )}
      {view.busy && (
        <button className="skip-hint" onClick={(e) => { e.stopPropagation(); onSkip(); }}>
          Tap to skip
        </button>
      )}
    </div>
  );
}

interface BandProps {
  enc: Encounter | null;
  presented?: RugItem;
  view: PlaybackView;
  tierName: string;
  priorities: { id: string; label: string }[];
  /** a tap on the words under the picture hurries them, the same as a tap on the picture */
  onSkip?: () => void;
}

/** Status band under the scene: narrator, stage, buyer meters, what you have learned. */
export function InfoBand({ enc, presented, view, tierName, priorities, onSkip }: BandProps) {
  const buyer = enc ? BUYERS[enc.buyerId] : null;
  // tap the buyer's name or portrait to see their card (bio, what they buy, how things stand) without
  // stepping away from the table
  const [profileOpen, setProfileOpen] = useState(false);
  const stageIdx = enc ? STAGES.findIndex((x) => x.id === enc.stage) : -1;
  const allP = buyer && enc ? [...prefsFor(enc).roomPriorities, ...buyer.priorities.drawn] : [];
  // On phones the speech sits here, under the picture, instead of in a bubble over it.
  const who: 'seller' | 'buyer' = view.speaking ?? (view.lastSpeaker === 'seller' ? 'seller' : 'buyer');
  const said = who === 'seller' ? view.seller : view.buyer;
  const shown = said && view.speaking === who && view.active ? said.slice(0, view.typed) : said;
  const mood = who === 'buyer' && (view.buyerMood === 'pleased' || view.buyerMood === 'warm') ? 'mood-good' : who === 'buyer' && (view.buyerMood === 'skeptical' || view.buyerMood === 'leaving') ? 'mood-bad' : '';
  return (
    <div className={`band ${view.narrator ? 'has-narr' : ''}`} data-testid="band">
      {said && (
        <div className={`speech ${mood}`} data-testid="speech" onClick={view.busy ? onSkip : undefined} style={view.busy ? { cursor: 'pointer' } : undefined}>
          <b>{who === 'seller' ? 'You' : buyer?.name ?? 'Samira'}</b>
          {shown}
        </div>
      )}
      {view.narrator && (
        <div className="narrator" data-testid="narrator" key={view.narrator}>
          <small>NARRATOR</small>
          {view.narrator}
        </div>
      )}
      {view.caption && !view.narrator && <div className="caption">{view.caption}</div>}
      {(() => {
        // Echo the other side of the exchange so nothing is missed while one speech slot is in use.
        const showSeller = view.lastSpeaker === 'buyer' || view.speaking === 'buyer';
        const text = showSeller ? view.seller : view.buyer;
        if (!text || view.speaking === null && view.lastSpeaker === 'other') return null;
        return (
          <div className="echo" data-testid="echo">
            <b>{showSeller ? 'You said' : `${buyer?.name ?? ''} said`}</b> {text}
          </div>
        );
      })()}
      {enc && buyer && (
        <div className="plate-buyer" data-testid="buyer-plate">
          <button className="plate-row plate-row-btn" onClick={() => setProfileOpen(true)} data-testid="buyer-plate-open" aria-label={`${buyer.name}'s profile`}>
            <BuyerFace id={buyer.id} />
            <span className="name">{buyer.name}</span>
            <span className="tier" data-testid="enc-tier">{tierName}</span>
            <span className="role">{enc.asked.includes('room') ? prefsFor(enc).needLabel : buyer.role}</span>
          </button>
          {profileOpen && <BuyerCard id={buyer.id} onClose={() => setProfileOpen(false)} />}
          <div className="meters">
            <Meter label="Interest" v={enc.interest} color="#d9a441" />
            <Meter label="Patience" v={enc.patience} color="#8fae5b" max={Math.max(100, enc.patience)} />
            <Meter label="Trust" v={enc.trust} color="#8ea6dc" />
          </div>
          <div className="values">
            {allP.map((p) => {
              const known = priorities.some((x) => x.id === p.id);
              return (
                <span key={p.id} className={`value-chip ${known ? '' : 'unknown'}`}>
                  {known ? p.label : '?'}
                </span>
              );
            })}
            {enc.budgetKnown && <span className="value-chip">≈ {fmt(enc.budgetKnown[0])}–{fmt(enc.budgetKnown[1])}</span>}
            {/* their offer is not repeated here: the offer bar over the buttons shows it */}
          </div>
        </div>
      )}
      {presented && enc && !enc.outcome && (() => {
        const t = RUGS[presented.typeId];
        return (
          <div className="on-table" data-testid="on-table">
            <img src={rugThumb(t)} alt="" />
            <span>
              <b>{t.name}</b> on the table · {presented.condition}{presented.restored ? ', restored' : ''} · <span className={`prov ${presented.provenance}`}>{presented.provenance}</span> · paid {fmt(presented.paid)}
            </span>
          </div>
        );
      })()}
      {enc && (
        <div className="stages" aria-label="Negotiation stage" data-testid="stages" data-stage={enc.stage}>
          {STAGES.map((st, i) => (
            <span key={st.id} className={i === stageIdx ? 'on' : i < stageIdx ? 'done' : ''}>
              {st.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Meter({ label, v, color, max = 100 }: { label: string; v: number; color: string; max?: number }) {
  return (
    <span className="meter" title={`${label}: ${Math.round(v)}`} data-testid={`meter-${label.toLowerCase()}`} data-value={Math.round(v)}>
      {label}
      <i>
        <span style={{ width: `${Math.max(0, Math.min(100, (v / max) * 100))}%`, background: color }} />
      </i>
    </span>
  );
}

/** Small round likeness beside the buyer's name. Samira is cropped from the painting. */
export function BuyerFace({ id, size = 36 }: { id: string; size?: number }) {
  return (
    <span className="buyer-face" data-testid="buyer-face" style={{ width: size, height: size }}>
      <PortraitOrCameo id={id} spec={personFor(id)} size={size} />
    </span>
  );
}

/** The buyer across the table: the redrawn stall2 cut-out, the older cut-out, or the framed portrait (stallArt.ts knows which). */
function ScenePerson({ id }: { id: string }) {
  const { src, framed } = stallFigure(id);
  const [failed, setFailed] = useState(false);
  if (failed) return <PersonBack spec={personFor(id)} className="buyer-art" />;
  return framed
    ? <img src={src} alt="" className="buyer-framed" onError={() => setFailed(true)} />
    : <img src={src} alt="" className="buyer-art" style={{ objectFit: 'contain', objectPosition: '100% 100%' }} onError={() => setFailed(true)} />;
}

/** What stands in the stall: one piece per spot, as the player dressed it (game/stallDressing.ts), each
 *  at its place in this stall's painting (game/stallScenes.ts): the full-canvas cut-out, scaled and
 *  shifted so its painted part stands there. Pieces on the shelves and walls are drawn behind the
 *  people, pieces on the counter (front) in front of them. A spot this stall has no room for, or a
 *  piece whose picture has not been painted yet, does not draw. */
export function StallProps({ sc, front = false, inFront }: { sc: StallScene; front?: boolean; inFront?: (x: number) => boolean }) {
  const sp = useGame((st) => JSON.stringify(spotsOf(st)));
  const up = JSON.parse(useGame((st) => JSON.stringify(lookUps(st)))) as string[];
  const spots = JSON.parse(sp) as Record<string, string>;
  const [missing, setMissing] = useState<string[]>([]);
  return (
    <>
      {spotsHere(up).map((s) => {
        const id = spots[s.id], at = sc.spots[s.id];
        if (!id || !at || !DRESSING_BY_ID[id] || !!at.front !== front || missing.includes(id)) return null;
        const src = dressingArt(id), pos = placeStyle(src, at);
        if (!pos) return null;
        return <img key={id} className={`stall-prop placed${front ? ' front' : ''}${inFront?.(at.x) ? ' kept-out' : ''}`} src={src} alt="" style={pos} draggable={false} data-testid={`stall-piece-${id}`} onError={() => setMissing((m) => [...m, id])} />;
      })}
    </>
  );
}

/** The board over the stall: blank as painted, until a sign is put up; then your name is lettered on it. */
export const DEFAULT_SIGN = 'Rugs & Carpets';
function StallSign({ sc }: { sc: StallScene }) {
  const up = useGame((st) => !!spotsOf(st).sign);
  const name = useGame((st) => st.signName);
  if (!up) return null;
  return <SignLetters sc={sc} name={name || DEFAULT_SIGN} />;
}
export function SignLetters({ sc, name }: { sc: StallScene; name: string }) {
  const [l, t, r, b] = sc.sign;
  // as large as the board allows: its height, or its width over the letters (sizes in % of the stage's height)
  const fs = Math.min((b - t) * 0.5, ((r - l) * 1.5 * 0.86) / (Math.max(4, name.length) * 0.66));
  return (
    <div className={`stall-signname${sc.signDark ? ' dark' : ''}`} style={{ left: `${l}%`, top: `${t}%`, width: `${r - l}%`, height: `${b - t}%`, fontSize: `${fs.toFixed(2)}cqh` }} data-testid="stall-signname" aria-label={`The sign: ${name}`}>
      <span>{name}</span>
    </div>
  );
}

/** Stroke Saffron seven times running and she purrs you to sleep: Hassan dreams (components/Dream),
 *  once a day at most. */
const catTaps: number[] = [];
function catDream() {
  const now = Date.now();
  catTaps.push(now);
  while (catTaps.length && now - catTaps[0] > 5000) catTaps.shift();
  const s = useGame.getState();
  if (catTaps.length >= 7 && s.dreams?.last !== s.day && !s.encounter) { catTaps.length = 0; window.setTimeout(() => window.dispatchEvent(new CustomEvent('tof:dream', { detail: 'nap' })), 900); }
}

/** An animated cut-out drawn over its still at the same place: hidden until it has loaded (no flash),
 *  and never in the way of a tap. */
function AnimOver({ src, className, style }: { src: string; className: string; style: React.CSSProperties }) {
  const [ready, setReady] = useState<string | null>(null);
  return <img className={className} src={src} alt="" style={{ ...style, opacity: ready === src ? 1 : 0, pointerEvents: 'none' }} onLoad={() => setReady(src)} onError={() => setReady(null)} draggable={false} data-testid="stall-anim" />;
}

/** Saffron the cat: one of her poses for the day, at its place in this painting (a pose this stall
 *  has no place for sits her on the counter instead), never on a spot that holds a piece. Tap her. */
function StallCat({ sc, onCat, rugOnCounter, tag }: { sc: StallScene; onCat: () => void; rugOnCounter: boolean; tag?: boolean }) {
  const variant = useGame((st) => catPose(st.day, spotsOf(st)));
  const [ok, setOk] = useState(true);
  const { pose, at } = catAt(sc, variant);
  const rule = CAT_VARIANTS[pose];
  const src = `art/stall2/props/${pose}.webp`;
  const [chase, setChase] = useState(0);
  const [chasing, setChasing] = useState(false);
  const quiet = !rugOnCounter && pose === 'cat-counter';
  useEffect(() => {
    if (!quiet || (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    let id = 0;
    const next = () => { id = window.setTimeout(() => { if (!document.hidden) setChase(Date.now()); next(); }, 22000 + Math.random() * 20000); };
    id = window.setTimeout(() => { setChase(Date.now()); next(); }, 6000 + Math.random() * 6000);
    (window as unknown as { __tofChase?: () => void }).__tofChase = () => setChase(Date.now());
    return () => window.clearTimeout(id);
  }, [quiet]);
  const pos = at && placeStyle(src, at);
  const hit = at && placedRect(src, at);
  if (!ok || !pos || !hit || (rule?.hideWhileRugOnCounter && rugOnCounter)) return null;
  return (
    <>
      <img className={`stall-prop placed stall-cat-art${at.front ? ' front' : ''}${tag && !tapSeen('cat') ? ' beckon' : ''}`} src={src} alt="" style={{ ...pos, opacity: chasing ? 0 : 1 }} onError={() => setOk(false)} draggable={false} />
      {/* on the counter she sits still and now and then goes after a sparrow (one two-second leap, while
       *  no rug is laid out); in her other places she breathes, the matching loop laid over the still */}
      {pose !== 'cat-counter' && <AnimOver className={`stall-prop placed stall-cat-art stall-anim${at.front ? ' front' : ''}${tag && !tapSeen('cat') ? ' beckon' : ''}`} src={`art/stall2/props/${pose}-animated.webp`} style={pos} />}
      {pose === 'cat-counter' && chase > 0 && <img key={chase} className={`stall-prop placed stall-cat-art stall-anim${at.front ? ' front' : ''}`} src={`art/stall2/props/cat-counter-chase.webp?n=${chase}`} alt="" style={{ ...pos, pointerEvents: 'none', opacity: chasing ? 1 : 0 }} onLoad={() => { setChasing(true); window.setTimeout(() => { setChasing(false); setChase(0); }, 1990); }} onError={() => setChase(0)} draggable={false} data-testid="saffron-chase" />}
      <button className="stall-cat-hit" style={{ left: `${hit[0]}%`, top: `${hit[1]}%`, width: `${hit[2] - hit[0]}%`, height: `${hit[3] - hit[1]}%` }} aria-label="Saffron the cat" data-testid="saffron" data-pose={pose} onClick={(e) => { e.stopPropagation(); tapUsed('cat'); onCat(); catDream(); }} />

    </>
  );
}

/** The gramophone, always there. Tap it to pick a record from what you have collected. The picture is
 *  the full-canvas cut-out placed at this stall's spot for it; a small invisible button over the
 *  horn-and-cabinet is the tap target. */
function StallGramophone({ sc, inFront }: { sc: StallScene; inFront?: (x: number) => boolean }) {
  const seen = useGame((st) => st.gramoSeen);
  const rp = useRecord();
  const [mini, setMini] = useState(false);
  useEffect(() => { if (!mini) return; const t = window.setTimeout(() => setMini(false), 6000); return () => clearTimeout(t); }, [mini, rp.current, rp.playing]);
  const src = 'art/stall2/props/prop-turntable.webp';
  // the record player is drawn wider than the old horn gramophone: the same spot, scaled to sit level on it
  const at = sc.gramophone && { ...sc.gramophone, s: sc.gramophone.s * 0.62 };
  const pos = at && placeStyle(src, at);
  const r = at && placedRect(src, at);
  if (!pos || !r) return null;
  // the record player is low and flat: it stays on the counter even in front of someone, below their hands
  void inFront;
  return (
    <>
      <img className={`stall-prop placed stall-gramophone-art${at.front ? ' front' : ''}${!seen ? ' beckon' : ''}${rp.playing ? ' playing' : ''}`} src={src} alt="" style={pos} draggable={false} />
      {/* the record turning: only while one is playing; stopped, ended or failed, the still shows again */}
      {rp.playing && !rp.held && <AnimOver className={`stall-prop placed stall-gramophone-art stall-anim${at.front ? ' front' : ''}`} src="art/stall2/props/prop-turntable-animated.webp" style={pos} />}
      {/* the first time, a bright pulsing note calls attention to it; after that a small, steady
       *  note stays put so the horn is never just a picture */}
      {mini && <RecordMini x={(r[0] + r[2]) / 2} y={r[1] - 2} onShelf={() => { setMini(false); window.dispatchEvent(new Event('tof:gramophone')); }} onClose={() => setMini(false)} />}
      <button
        className="stall-gramophone-hit"
        style={{ left: `${r[0]}%`, top: `${r[1]}%`, width: `${r[2] - r[0]}%`, height: `${r[3] - r[1]}%` }}
        aria-label="Play the gramophone"
        data-testid="stall-gramophone"
        onClick={(e) => {
          e.stopPropagation();
          if (!seen) useGame.setState({ gramoSeen: true });
          // with a record on (or one chosen before), a small control pops up over the horn; the first
          // time, the shelf opens
          if (rp.current) setMini((m) => !m); else window.dispatchEvent(new Event('tof:gramophone'));
        }}
      />
    </>
  );
}

/** Things on the stall that do something when tapped glow softly now and then, until each has been
 *  tried once (no labels over the picture). */
const tapKey = (id: string) => `tof-tap-${id}`;
const tapSeen = (id: string) => { try { return localStorage.getItem(tapKey(id)) === '1'; } catch { return false; } };
function tapUsed(id: string) { try { localStorage.setItem(tapKey(id), '1'); } catch { /* private mode */ } window.dispatchEvent(new Event('tof:tap-used')); }
/** the little control over the gramophone: play or pause, the next record, and the shelf */
function RecordMini({ x, y, onShelf, onClose }: { x: number; y: number; onShelf: () => void; onClose: () => void }) {
  const rp = useRecord();
  const rec = rp.current ? RECORD_BY_ID[rp.current] : null;
  const stop = (e: React.MouseEvent | React.PointerEvent) => e.stopPropagation();
  return (
    <div className="rec-mini" style={{ left: `${x}%`, top: `${y}%` }} onClick={stop} onPointerDown={stop} data-testid="rec-mini">
      <small>{rec ? rec.title : 'No record'}</small>
      <span>
        <button onClick={() => { audio.sfx('tap'); rp.toggle(); }} aria-label={rp.playing ? 'Pause' : 'Play'} data-testid="rec-mini-toggle">{rp.playing ? '❚❚' : '▶'}</button>
        <button onClick={() => { audio.sfx('tap'); rp.next(); }} aria-label="Next record" data-testid="rec-mini-next">⏭</button>
        <button onClick={() => { audio.sfx('tap'); onShelf(); }} aria-label="Your records" data-testid="rec-mini-shelf">☰</button>
        <button onClick={onClose} aria-label="Close" className="x">×</button>
      </span>
    </div>
  );
}

/** a small picture standing on the counter: its width in % of the stage, centred on the anchor, its foot on it */
const standAt = (a: Anchor, w: number) => ({ left: `${a.x - w / 2}%`, bottom: `${100 - a.y}%`, width: `${w * a.s}%` });

/** This morning's paper folded on the counter, with a coffee. Tap it to pick it up and read. */
function StallPaper({ at, hide }: { at: Anchor; hide?: boolean }) {
  return (
    <button className={`stall-paper${hide ? ' kept-out' : ''}`} style={standAt(at, 9)} aria-label="Read today's paper" data-testid="stall-paper" onClick={(e) => { e.stopPropagation(); tapUsed('paper'); window.dispatchEvent(new Event('tof:paper')); }}>
      <img src="art/newspaper-stall.webp" alt="" className={!tapSeen('paper') ? 'beckon' : ''} />
    </button>
  );
}

/** The wireless on the counter at your end. Tap it and the morning bulletin plays quietly while you trade; tap again to switch it off. */
function StallRadio({ at, hide }: { at: Anchor; hide?: boolean }) {
  const g = useGame();
  const [on, setOn] = useState(radio.playing);
  const [line, setLine] = useState(-1);
  const [lang, setLang] = useState<Lang>('en');
  useEffect(() => {
    const t = setInterval(() => setOn(radio.playing), 1000);
    return () => clearInterval(t);
  }, []);
  const play = async (l: Lang, from = 0) => {
    if (l === 'ar') await loadArabic();
    radio.play(l, bulletin(g.day, l), (i) => setLine(i), () => { setOn(false); setLine(-1); }, 0.4, from);
    setOn(true);
  };
  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    tapUsed('radio');
    if (radio.playing) { radio.stop(); setOn(false); setLine(-1); return; }
    let l: Lang = 'en';
    try { l = (localStorage.getItem('tof-radio-lang') as Lang) || 'en'; } catch { /* private mode */ }
    setLang(l);
    if ((g.radioHeard ?? 0) < g.day) useGame.setState({ radioHeard: g.day });
    play(l);
  };
  const news = newsStart(bulletin(g.day, lang));
  return (
    <>
      <button className={`stall-radio ${on ? 'on' : ''}${hide ? ' kept-out' : ''}`} style={standAt(at, 8)} aria-label={on ? 'Switch the radio off' : 'Switch the radio on'} aria-pressed={on} data-testid="stall-radio" onClick={toggle}>
        <img src="art/radio-stall-small.webp" alt="" className={!tapSeen('radio') ? 'beckon' : ''} />
      </button>
      {/* the greeting and the date first: straight to the news */}
      {on && line < news && <button className="stall-radio-skip" onClick={(e) => { e.stopPropagation(); play(lang, news); }} data-testid="stall-radio-skip">News ⏭</button>}
    </>
  );
}
