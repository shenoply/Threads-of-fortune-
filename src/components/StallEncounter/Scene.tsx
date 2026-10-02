import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { fmt } from '../../game/economy/money';
import type { Encounter } from '../../game/systems/negotiation';
import { STAGES, prefsFor } from '../../game/systems/negotiation';
import type { RugItem } from '../../game/types';
import { BUYERS } from '../../data/buyers';
import { RUGS } from '../../data/rugs';
import { rugSrc } from '../RugViewer/rugArt';
import type { PlaybackView } from '../BuyerDialogue/usePlayback';
import { PortraitOrCameo, PersonBack } from '../People/Person';
import { personFor } from '../../data/people';
import { Atmosphere } from '../Atmosphere/Atmosphere';
import { radio } from '../../game/radio/player';
import { bulletin, loadArabic, newsStart, type Lang } from '../../game/radio/bulletin';
import { useGame } from '../../game/state/store';
import { START_WARDROBE } from '../../data/wardrobe';
import { HeroFigure } from '../Wardrobe/HeroFigure';
import { stallFigure } from './stallArt';

const STAGE_IMG = 'art/stall2/stall-empty-patched.webp';
// lantern flames in each painting, as fractions of the image (see Atmosphere)
const SELLER_LAMPS = '0.537,0.124;0.412,0.252;0.949,0.287';

// One item per shelf/wall spot, each cut as a full 1536x1024 canvas already positioned in place,
// so a spot's chosen prop just layers as a full-bleed overlay on the stage. One is picked per spot,
// per day, deterministically (see dayPick) so the shelves look freshly dressed but stay put all day.
const PROP_SPOTS: Record<string, string[]> = {
  'top-left': ['prop-clock', 'prop-lamp'],
  'top-mid': ['prop-vase', 'prop-photo'],
  'top-right': ['prop-astrolabe', 'prop-incense'],
  'mid-mid': ['prop-camera', 'prop-tawla', 'prop-telephone'],
  'bottom-left': ['prop-books', 'prop-cashbox'],
  'bottom-right': ['prop-hookah', 'prop-copper'],
  'above-shelves': ['prop-swords', 'prop-calligraphy', 'prop-prayerrug', 'prop-birdcage', 'prop-herbs'],
  hooks: ['prop-lanterns'],
};
const CAT_VARIANTS: Record<string, { hideWhileRugOnCounter?: boolean; replaces?: string }> = {
  'cat-doorway': {},
  'cat-counter': { hideWhileRugOnCounter: true },
  'cat-topshelf': { replaces: 'top-right' },
  'cat-radio': { replaces: 'mid-mid' },
};
const CAT_REPLACES: Record<string, string | undefined> = Object.fromEntries(Object.entries(CAT_VARIANTS).map(([k, v]) => [k, v.replaces]));

/** Deterministic day-seeded pick, so the shelf dressing changes daily but doesn't flicker mid-day. */
function dayPick<T>(day: number, salt: string, options: T[]): T {
  let h = day * 2654435761;
  for (let i = 0; i < salt.length; i++) h = (h * 33 + salt.charCodeAt(i)) >>> 0;
  return options[h % options.length];
}

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

export function Scene({ enc, presented, view, onSkip, onCat, upgrades = [] }: SceneProps) {
  // the hero as the player dressed him, once every piece he wears is painted for the stall
  const outfit = (useGame((st) => st.wardrobe) ?? START_WARDROBE).outfit;
  const box = useRef<HTMLDivElement>(null);
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

  // The stall: one painting of the counter with the pyramids beyond. The merchant stands at the left,
  // the buyer at the right, both behind the counter cloth, which hides where their pictures end.
  // The painting is laid out on a 3:2 stage anchored to the bottom of the frame, so whatever a
  // narrow screen crops off the top, every figure keeps its place on the counter.
  const who: 'seller' | 'buyer' = view.speaking ?? (view.lastSpeaker === 'seller' ? 'seller' : 'buyer');
  const text = who === 'seller' ? view.seller : view.buyer;
  const bw = Math.min(W * 0.62, 440);
  // the painting is 3:2 and bottom-anchored; on a wide, short frame (a desktop window) it may not
  // grow so tall that everything above the counter is cropped away: at most a frame and two thirds
  // tall, centred, with a blurred copy of the painting filling the sides
  const sh = Math.min(Math.max(W, H * 1.5) / 1.5, H / 0.6), sw = sh * 1.5;
  // figures stand on the counter (a fixed share of the stage) and must keep their heads inside the
  // visible frame, whose height is what a phone or a wide desktop panel actually shows
  const figH = Math.min(sh * 0.55, H * 0.93 - sh * 0.21);
  // the leaning figure: hands at 94% of its height rest on the counter top. The cloth's top edge
  // (counter-stall.webp) sits 22.5% up the stage and the painted hands land 7.5% of the stage
  // above where the 94% line puts them, so the figure is set that much lower to put hands on cloth.
  // The head (11% down) must stay inside the visible frame.
  const heroH = Math.min(sh * 0.62, (H * 0.94 - sh * 0.175 + 0) / 0.83);
  const heroStyle = { height: heroH, bottom: sh * 0.175 - heroH * 0.06 };
  // a standing buyer is drawn head to foot, the merchant only head to hands: their heads come out the
  // same size as his at 1.3 times his height; the counter then cuts them at the waist (40% up the figure) rather than the
  // shins, and their head (the top 5% of the picture is air) must stay inside the visible frame
  const buyerH = Math.min(heroH * 1.3, (H * 0.97 - sh * 0.225) / 0.55);
  const buyerB = sh * 0.225 - buyerH * 0.4;
  return (
    <div className={`scene stall ${view.speaking ? 'speaking-' + view.speaking : ''}`} ref={box} onClick={onSkip} data-testid="scene">
      {sw < W && <img className="stage-fill" src={STAGE_IMG} alt="" aria-hidden="true" draggable={false} />}
      <div className="stage" style={{ width: sw, height: sh, left: (W - sw) / 2, ['--fig-h' as string]: `${figH}px`, ['--buyer-h' as string]: `${buyerH}px`, ['--buyer-b' as string]: `${buyerB}px`, ['--hero-h' as string]: `${heroH}px` }}>
        <img className="stage-bg" src={STAGE_IMG} alt="The stall at Giza: the counter, the shelves and the pyramids beyond" data-lamps={SELLER_LAMPS} draggable={false} />
        <StallProps />
        <StallGramophone />
        {/* The base stall body is always painted, so he always shows dressed in whatever pieces
            already have a stall-pose layer; a piece without one yet just doesn't draw (see
            HeroFigure), rather than reverting the whole figure to a fixed picture. */}
        <div className="hero-at-stall" data-testid="hero-at-stall" style={heroStyle}><HeroFigure pose="stall" outfit={outfit} /></div>
        {buyer && (
          <div className={`buyer-figure${stallFigure(buyer.id).framed ? '' : ' has-photo'}${enc?.outcome && !enc.mocked ? ' leaving' : ''}`} data-testid="buyer-figure" data-buyer={buyer.id}>
            <ScenePerson id={buyer.id} />
          </div>
        )}
        <img className="counter" src="art/counter-stall.webp" alt="" draggable={false} />
        {rugT && presented && (
          <div className="split-rug" key={unfoldKey} data-testid="table-rug">
            <img src={rugSrc(rugT)} alt={`${rugT.name} laid out on the table`} style={presented.condition === 'Dirty' ? { filter: 'sepia(0.5) brightness(0.7)' } : undefined} />
          </div>
        )}
        <StallRadio />
        <StallPaper />
        <StallCat onCat={onCat} rugOnCounter={!!(rugT && presented)} />
      </div>
      {upgrades.includes('bazaar') && <div className="awning" aria-hidden="true" />}
      <Atmosphere />
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
}

/** Status band under the scene: narrator, stage, buyer meters, what you have learned. */
export function InfoBand({ enc, presented, view, tierName, priorities }: BandProps) {
  const buyer = enc ? BUYERS[enc.buyerId] : null;
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
        <div className={`speech ${mood}`} data-testid="speech">
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
          <div className="plate-row">
            <BuyerFace id={buyer.id} />
            <span className="name">{buyer.name}</span>
            <span className="tier" data-testid="enc-tier">{tierName}</span>
            <span className="role">{enc.asked.includes('room') ? prefsFor(enc).needLabel : buyer.role}</span>
          </div>
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
            {enc.buyerOffer && !enc.outcome && (enc.finalOffered
              ? <span className="value-chip offer final" data-testid="final-offer">Final offer {fmt(enc.buyerOffer)} · take it or they go</span>
              : <span className="value-chip offer">Offer {fmt(enc.buyerOffer)}</span>)}
          </div>
        </div>
      )}
      {presented && enc && !enc.outcome && (() => {
        const t = RUGS[presented.typeId];
        return (
          <div className="on-table" data-testid="on-table">
            <img src={rugSrc(t)} alt="" />
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

/** The daily shelf dressing: one prop per named spot, each a full-canvas cut-out already positioned, so it just layers over the empty stall. */
function StallProps() {
  const day = useGame((st) => st.day);
  return (
    <>
      {Object.entries(PROP_SPOTS).map(([spot, options]) => {
        if (spot === CAT_REPLACES[dayPick(day, 'cat', Object.keys(CAT_VARIANTS))]) return null;
        const pick = dayPick(day, spot, options);
        return <img key={spot} className="stall-prop" src={`art/stall2/props/${pick}.webp`} alt="" draggable={false} />;
      })}
    </>
  );
}

/** Saffron the cat: one of four daily poses (doorway, counter, top shelf, by the radio), also a full-canvas overlay. Tap her. */
function StallCat({ onCat, rugOnCounter }: { onCat: () => void; rugOnCounter: boolean }) {
  const day = useGame((st) => st.day);
  const [ok, setOk] = useState(true);
  const variant = dayPick(day, 'cat', Object.keys(CAT_VARIANTS));
  const rule = CAT_VARIANTS[variant];
  if (!ok || (rule.hideWhileRugOnCounter && rugOnCounter)) return null;
  return (
    <button className="stall-prop stall-cat" aria-label="Saffron the cat" data-testid="saffron" onClick={(e) => { e.stopPropagation(); onCat(); }}>
      <img src={`art/stall2/props/${variant}.webp`} alt="" onError={() => setOk(false)} />
    </button>
  );
}

/** The gramophone on the shelf, always there. Tap it to pick a record from what you have collected.
 *  The picture is a full-canvas cut-out like the other props (so it layers in the right place and
 *  stays out of the way of clicks elsewhere on the stage); a small invisible button sized to the
 *  actual horn-and-cabinet, at its measured position in that canvas, is the tap target. */
function StallGramophone() {
  const seen = useGame((st) => st.gramoSeen);
  return (
    <>
      <img className="stall-prop stall-gramophone-art" src="art/stall2/props/prop-gramophone.webp" alt="" draggable={false} />
      {/* the first time, a bright pulsing note calls attention to it; after that a small, steady
       *  note stays put so the horn is never just a picture — the player always has a cue that it
       *  can be tapped, not only until the hint happens to be seen once. */}
      <span className={`stall-gramophone-hint ${seen ? 'faint' : ''}`} aria-hidden="true">♪</span>
      <button
        className="stall-gramophone-hit"
        aria-label="Play the gramophone"
        data-testid="stall-gramophone"
        onClick={(e) => {
          e.stopPropagation();
          if (!seen) useGame.setState({ gramoSeen: true });
          window.dispatchEvent(new Event('tof:gramophone'));
        }}
      />
    </>
  );
}

/** This morning's paper folded on the counter, with a coffee. Tap it to pick it up and read. */
function StallPaper() {
  return (
    <button className="stall-paper" aria-label="Read today's paper" data-testid="stall-paper" onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new Event('tof:paper')); }}>
      <img src="art/newspaper-stall.webp" alt="" />
    </button>
  );
}

/** The wireless on the counter at your end. Tap it and the morning bulletin plays quietly while you trade; tap again to switch it off. */
function StallRadio() {
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
      <button className={`stall-radio ${on ? 'on' : ''}`} aria-label={on ? 'Switch the radio off' : 'Switch the radio on'} aria-pressed={on} data-testid="stall-radio" onClick={toggle}>
        <img src="art/radio-stall.webp" alt="" />
      </button>
      {/* the greeting and the date first: straight to the news */}
      {on && line < news && <button className="stall-radio-skip" onClick={(e) => { e.stopPropagation(); play(lang, news); }} data-testid="stall-radio-skip">News ⏭</button>}
    </>
  );
}
