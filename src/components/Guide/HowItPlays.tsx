// How it plays: one square tile per main feature, each a short silent clip of the game itself playing
// that feature (recorded by tools/record-feature-clips.mjs). Tap a tile for the whole clip and two
// lines on how it works. Opens from the title screen, Settings and How to play.
import { useEffect, useRef, useState } from 'react';
import './howItPlays.css';

export interface Feature { id: string; name: string; what: string; how: string; focus: string }
export const FEATURES: Feature[] = [
  { id: 'stall', name: 'Selling at your stall', focus: '50% 18%', what: 'Wait for a buyer, lay a rug on the table and talk them round.', how: 'Ask about their room, argue what they care about, watch interest, patience and trust, then name your price.' },
  { id: 'district', name: 'Walking Giza', focus: '50% 40%', what: 'Your lane in Giza is a map you walk.', how: 'Tap anywhere to walk there. Tap a place to go in: your stall, Bilgin’s coffee house, Arran’s laboratory, Malek’s grill.' },
  { id: 'rashid', name: 'Buying stock', focus: '50% 30%', what: 'Uncle Rashid sells you the rugs you sell on.', how: 'Look closely, haggle, then pay cash or take it on credit. Buy well below what Giza will pay.' },
  { id: 'inspect', name: 'Inspecting a rug', focus: '50% 38%', what: 'Know what you are selling before you price it.', how: 'Zoom in, turn it over, and read its condition, weave and history.' },
  { id: 'travel', name: 'Travelling', focus: '50% 45%', what: 'The whole region is open to you.', how: 'Zoom out from Giza and tap a town. The clock runs while you travel: speed it up, or stop any time.' },
  { id: 'caravan', name: 'Your caravan', focus: '50% 30%', what: 'Everything you take on the road.', how: 'Buy food for the days ahead, animals to carry rugs, and men to guard them. Everyone eats.' },
  { id: 'cafe', name: 'Chess and tawla', focus: '50% 45%', what: 'Bilgin’s coffee house, for an hour off.', how: 'Play him at chess or tawla, for tea or for a few piastres.' },
  { id: 'news', name: 'Paper and radio', focus: '50% 40%', what: 'Every day is a real day of 1925.', how: 'The Courier and Radio Giza carry that day’s news. It moves prices, brings buyers and changes the roads.' },
];
const src = (id: string, ext: 'mp4' | 'webp') => `video/how/${id}.${ext}`;

/** open How it plays from anywhere */
export const openHowItPlays = (id?: string) => window.dispatchEvent(new CustomEvent('tof-how', { detail: id }));

/** a muted looping clip that only plays while it is on screen */
function Clip({ id, focus, className }: { id: string; focus?: string; className?: string }) {
  const v = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const el = v.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) el.play().catch(() => {}); else el.pause(); }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  if (failed) return <img className={className} src={src(id, 'webp')} alt="" style={{ objectPosition: focus }} />;
  return <video ref={v} className={className} src={src(id, 'mp4')} poster={src(id, 'webp')} muted loop playsInline preload="metadata" style={{ objectPosition: focus }} onError={() => setFailed(true)} aria-hidden="true" />;
}

export function HowItPlays({ onClose, start }: { onClose: () => void; start?: string }) {
  const [open, setOpen] = useState<number | null>(() => { const k = FEATURES.findIndex((f) => f.id === start); return k >= 0 ? k : null; });
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') (open === null ? onClose() : setOpen(null)); };
    addEventListener('keydown', key); return () => removeEventListener('keydown', key);
  }, [open, onClose]);
  const f = open === null ? null : FEATURES[open];
  return (
    <div className="how" role="dialog" aria-label="How it plays" data-testid="how-it-plays">
      <div className="how__head">
        <div><small>Threads of Fortune</small><h2>How it plays</h2></div>
        <button className="btn small" onClick={onClose} aria-label="Close" data-testid="how-close">✕</button>
      </div>
      <p className="how__intro">Tap a square to watch it and read how it works.</p>
      <div className="how__grid">
        {FEATURES.map((x, k) => (
          <button key={x.id} className="how__tile" onClick={() => setOpen(k)} data-testid={`how-${x.id}`}>
            <Clip id={x.id} focus={x.focus} className="how__clip" />
            <span className="how__name">{x.name}</span>
          </button>
        ))}
      </div>
      {f && (
        <div className="how__view" data-testid="how-view" onClick={() => setOpen(null)}>
          <div className="how__card" onClick={(e) => e.stopPropagation()}>
            <div className="how__frame"><Clip key={f.id} id={f.id} className="how__full" /></div>
            <div className="how__text">
              <small>{open! + 1} of {FEATURES.length}</small>
              <h3>{f.name}</h3>
              <p><b>{f.what}</b> {f.how}</p>
            </div>
            <div className="how__nav">
              <button className="btn" onClick={() => setOpen((open! + FEATURES.length - 1) % FEATURES.length)} data-testid="how-prev">‹ Back</button>
              <button className="btn" onClick={() => setOpen(null)} data-testid="how-all">All</button>
              <button className="btn primary" onClick={() => setOpen((open! + 1) % FEATURES.length)} data-testid="how-next">Next ›</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
