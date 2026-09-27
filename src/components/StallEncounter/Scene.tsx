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
import { bulletin, type Lang } from '../../game/radio/bulletin';
import { useGame } from '../../game/state/store';
import { START_WARDROBE } from '../../data/wardrobe';
import { HeroFigure, usePoseReady } from '../Wardrobe/HeroFigure';

const SELLER_IMG = 'art/stall-seller.jpg';
const SAMIRA_IMG = 'art/stall-samira-v2.jpg';
// lantern flames in each painting, as fractions of the image (see Atmosphere)
const SELLER_LAMPS = '0.537,0.124;0.412,0.252;0.949,0.287';
const SAMIRA_LAMPS = '0.398,0.139';

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
  const heroReady = usePoseReady('stall', outfit);
  const box = useRef<HTMLDivElement>(null);
  const { w: W, h: H } = useSize(box);
  const buyer = enc ? BUYERS[enc.buyerId] : null;
  const isSamira = !enc || enc.buyerId === 'samira';
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

  // The stall: a two-shot of two paintings, the merchant on the left and the buyer across the table on the right.
  const who: 'seller' | 'buyer' = view.speaking ?? (view.lastSpeaker === 'seller' ? 'seller' : 'buyer');
  const text = who === 'seller' ? view.seller : view.buyer;
  const bw = Math.min(W * 0.62, 440);
  return (
    <div className={`scene split ${view.speaking ? 'speaking-' + view.speaking : ''}`} ref={box} onClick={onSkip} data-testid="scene">
      <div className="panel seller-side">
        {heroReady ? (
          <>
            <img className="lane" src={SELLER_IMG} alt="" draggable={false} />
            <div className="hero-at-stall" data-testid="hero-at-stall"><HeroFigure pose="stall" outfit={outfit} /></div>
          </>
        ) : (
          <img src={SELLER_IMG} alt="The merchant at his stall in the Giza bazaar, the pyramids beyond" data-lamps={SELLER_LAMPS} draggable={false} />
        )}
      </div>
      <div className="panel buyer-side">
        {isSamira ? (
          <img src={SAMIRA_IMG} alt="Samira, leaning on the rug-covered table" data-lamps={SAMIRA_LAMPS} draggable={false} />
        ) : (
          <>
            <img className="lane" src={SELLER_IMG} alt="" draggable={false} />
            {buyer && (
              <div className="buyer-figure has-photo" data-testid="buyer-figure" data-buyer={buyer.id}>
                <ScenePerson id={buyer.id} />
              </div>
            )}
          </>
        )}
      </div>
      {upgrades.includes('bazaar') && <div className="awning" aria-hidden="true" />}
      {rugT && presented && (
        <div className="split-rug" key={unfoldKey} data-testid="table-rug">
          <img src={rugSrc(rugT)} alt={`${rugT.name} laid out on the table`} style={presented.condition === 'Dirty' ? { filter: 'sepia(0.5) brightness(0.7)' } : undefined} />
        </div>
      )}
      <StallRadio />
      <Saffron onCat={onCat} />
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
            {enc.buyerOffer && !enc.outcome && <span className="value-chip offer">Offer {fmt(enc.buyerOffer)}</span>}
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

/** The buyer across the table: a painted cut-out from art/portraits/<id>-stall.webp if added, otherwise drawn from behind. */
function ScenePerson({ id }: { id: string }) {
  const [ok, setOk] = useState<boolean | null>(null);
  const [framed, setFramed] = useState<boolean | null>(null);
  return (
    <>
      {ok === false && framed === false && <PersonBack spec={personFor(id)} className="buyer-art" />}
      {/* no cut-out yet: the painted portrait stands in, framed like a photograph on the counter */}
      {ok === false && framed !== false && <img src={`art/portraits/${id}.jpg`} alt="" className="buyer-framed" style={{ display: framed ? 'block' : 'none' }} onLoad={() => setFramed(true)} onError={() => setFramed(false)} />}
      <img src={`art/portraits/${id}-stall.webp`} alt="" className="buyer-art" style={{ display: ok ? 'block' : 'none', objectFit: 'contain', objectPosition: '100% 100%' }} onLoad={(e) => { setOk(true); e.currentTarget.parentElement?.classList.add('has-photo'); }} onError={(e) => { setOk(false); e.currentTarget.parentElement?.classList.remove('has-photo'); }} />
    </>
  );
}

/** Saffron lying on the rug at the corner of the counter. Tap her. */
function Saffron({ onCat }: { onCat: () => void }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return (
    <button className="cat-badge" aria-label="Saffron the cat" data-testid="saffron" onClick={(e) => { e.stopPropagation(); onCat(); }}>
      <img src="art/saffron-stall.webp" alt="" onError={() => setOk(false)} />
    </button>
  );
}

/** The wireless on the counter. Tap it and the morning bulletin plays quietly while you trade; tap again to switch it off. */
function StallRadio() {
  const g = useGame();
  const [on, setOn] = useState(radio.playing);
  useEffect(() => {
    const t = setInterval(() => setOn(radio.playing), 1000);
    return () => clearInterval(t);
  }, []);
  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (radio.playing) { radio.stop(); setOn(false); return; }
    let lang: Lang = 'en';
    try { lang = (localStorage.getItem('tof-radio-lang') as Lang) || 'en'; } catch { /* private mode */ }
    if ((g.radioHeard ?? 0) < g.day) useGame.setState({ radioHeard: g.day });
    radio.play(lang, bulletin(g.day, lang), () => {}, () => setOn(false), 0.4);
    setOn(true);
  };
  return (
    <button className={`stall-radio ${on ? 'on' : ''}`} aria-label={on ? 'Switch the radio off' : 'Switch the radio on'} aria-pressed={on} data-testid="stall-radio" onClick={toggle}>
      <img src="art/radio-stall.webp" alt="" />
    </button>
  );
}
