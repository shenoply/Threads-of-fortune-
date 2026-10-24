// Short silent films for the moments that matter (the first sale, each new stall, the first caravan
// out on the road): five or ten seconds, full screen, with their own quiet sound. Each plays once;
// a tap ends it. Fired with window.dispatchEvent(new CustomEvent('tof:moment', { detail: id })).
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../../game/state/store';
import { audio } from '../../game/audio/engine';
import { filmLock } from '../../game/audio/voice';
import './moment.css';

const MOMENTS: Record<string, { title: string; sound: string }> = {
  'first-sale': { title: 'The first sale', sound: 'first-sale-ambience' },
  'up-mat': { title: 'A rug mat of your own', sound: 'up-mat-foley' },
  'up-bazaar': { title: 'The bazaar stall', sound: 'up-bazaar-ambience' },
  'up-khan': { title: 'Your shop in the Khan el-Khalili', sound: 'up-khan-ambience' },
  'caravan-road': { title: 'On the canal road', sound: 'caravan-road-ambience' },
};

export function MomentHost() {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    const on = (e: Event) => {
      const m = (e as CustomEvent<string>).detail;
      if (!MOMENTS[m] || navigator.webdriver) return;
      const seen = useGame.getState().momentsSeen ?? [];
      if (seen.includes(m)) return;
      useGame.setState({ momentsSeen: [...seen, m] });
      setId(m);
    };
    window.addEventListener('tof:moment', on);
    return () => window.removeEventListener('tof:moment', on);
  }, []);
  if (!id) return null;
  return <Moment id={id} onDone={() => setId(null)} />;
}

function Moment({ id, onDone }: { id: string; onDone: () => void }) {
  const m = MOMENTS[id];
  const v = useRef<HTMLVideoElement>(null);
  const [out, setOut] = useState(false);
  const done = useRef(false);
  const end = () => { if (done.current) return; done.current = true; setOut(true); window.setTimeout(onDone, 450); };
  useEffect(() => {
    filmLock.on();
    audio.muteMusic(true, 0.6);
    const s = audio.attach(new Audio(`audio/moments/${m.sound}.mp3`), 'sfx', 0.9);
    s.play().catch(() => {});
    v.current?.play().catch(() => end());
    const t = window.setTimeout(end, 12000);
    return () => { clearTimeout(t); s.pause(); audio.detach(s); audio.muteMusic(false); filmLock.off(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return createPortal(
    <div className={`moment ${out ? 'out' : ''}`} onClick={end} role="dialog" aria-label={m.title} data-testid="moment">
      <video ref={v} src={`video/${id}.mp4`} poster={`video/${id}-poster.webp`} muted playsInline preload="auto" onEnded={end} onError={end} />
      <div className="moment-cap"><small>{m.title}</small></div>
      <span className="moment-skip">Tap to skip</span>
    </div>,
    document.body,
  );
}
