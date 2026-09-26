import { useEffect, useRef, useState } from 'react';
import { DOCUMENTARY } from '../../data/dialogue';
import { audio } from '../../game/audio/engine';
import { voice } from '../../game/audio/voice';
import { rugSrc } from '../RugViewer/rugArt';
import { RUGS, RUG_IDS, TIERS } from '../../data/rugs';

// The opening is required the first time on this device; after that it can be skipped.
const SEEN_KEY = 'tof-intro-seen-v2';
export const introSeen = () => { try { return localStorage.getItem(SEEN_KEY) === '1'; } catch { return true; } };
export const markIntroSeen = () => { try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* storage unavailable */ } };

const TOTAL = DOCUMENTARY.reduce((s, x) => s + x.dur, 0);

/** The opening film. It runs by itself, waits for each narration line to finish, then stops its own audio and hands over. */
export function Documentary({ onEnd, canSkip = true }: { onEnd: () => void; canSkip?: boolean }) {
  const [idx, setIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [textOn, setTextOn] = useState(false);
  const ended = useRef(false);

  const finish = () => {
    if (ended.current) return;
    ended.current = true;
    audio.stopMusic();
    audio.stopVoice();
    voice.stop();
    onEnd();
  };

  useEffect(() => {
    audio.ensure();
    voice.load().then(() => voice.preload(['narrator']));
    audio.startMusic('documentary');
    // warm the image cache so no shot pops in late
    DOCUMENTARY.forEach((d) => [d.img, ...(d.imgs ?? [])].forEach((src) => { if (src) { const im = new Image(); im.src = src; } }));
    const t0 = performance.now();
    let i = 0, shotStart = t0, spoken = false, done = 0;
    let raf = 0;
    const loop = () => {
      const now = performance.now();
      const into = now - shotStart;
      const d = DOCUMENTARY[i];
      if (!spoken && (voice.has('narrator', d.text) || into > 1500)) {
        spoken = true;
        voice.say('narrator', d.text);
      }
      // a shot lasts its planned time, or until its narration has finished, whichever is longer
      const over = into >= d.dur && (!voice.playing || into > d.dur + 6000) && spoken;
      if (over) {
        done += d.dur;
        i++;
        if (i >= DOCUMENTARY.length) { finish(); return; }
        shotStart = now; spoken = false;
        setIdx(i);
      }
      setElapsed(done + Math.min(into, DOCUMENTARY[Math.min(i, DOCUMENTARY.length - 1)].dur));
      setTextOn(into > 500 && (into < d.dur - 500 || voice.playing));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      audio.stopMusic();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="doc" data-testid="documentary">
      {DOCUMENTARY.map((d, k) => {
        const on = k === idx;
        if (k < idx - 1 || k > idx + 1) return null;
        const style = { ['--z0' as string]: d.zoom?.[0] ?? 1.08, ['--z1' as string]: d.zoom?.[1] ?? 1, ['--dur' as string]: `${d.dur + 2000}ms` } as React.CSSProperties;
        return (
          <div key={k} className={`dshot ${d.kind} ${on ? 'on' : ''}`} style={style}>
            {d.kind === 'image' && d.img && (
              <>
                <div className="dshot-blur" style={{ backgroundImage: `url(${d.img})` }} />
                <img className="dshot-img" src={d.img} alt="" style={{ objectPosition: d.focus }} />
              </>
            )}
            {d.kind === 'screen' && d.img && (
              <>
                <div className="dshot-blur" style={{ backgroundImage: `url(${d.img})` }} />
                <div className="dshot-phone">
                  <img src={d.img} alt="" />
                  {on && d.taps?.map((t, j) => (
                    <span key={j} className="dtap" style={{ left: `${t.x}%`, top: `${t.y}%`, animationDelay: `${t.at}ms` }}>
                      <i />
                      {t.label && <b>{t.label}</b>}
                    </span>
                  ))}
                </div>
              </>
            )}
            {d.kind === 'montage' && (
              <div className="dshot-montage">
                {d.imgs!.map((src, j) => <img key={src} src={src} alt="" style={{ animationDelay: `${j * 0.45}s` }} />)}
              </div>
            )}
            {d.kind === 'rugs' && (
              <div className="dshot-montage rugs">
                {['desert-star', 'cairo-garden', 'fayoum-hearth'].map((id, j) => <img key={id} src={rugSrc(RUGS[id])} alt={RUGS[id].name} style={{ animationDelay: `${j * 0.5}s` }} />)}
              </div>
            )}
            {d.kind === 'tiers' && d.tier && (
              <div className="dshot-tiers">
                <div className="dt-head"><small>TIER {['', 'I', 'II', 'III', 'IV'][d.tier]}</small><b>{TIERS[d.tier].name}</b><span>{TIERS[d.tier].note.split('. ')[0]}</span></div>
                <div className="dt-rugs">
                  {RUG_IDS.filter((id) => RUGS[id].tier === d.tier).slice(0, 4).map((id, j) => (
                    <figure key={id} style={{ animationDelay: `${j * 0.35}s` }}><img src={rugSrc(RUGS[id])} alt="" /><figcaption>{RUGS[id].name}</figcaption></figure>
                  ))}
                </div>
              </div>
            )}
            {d.kind === 'tierspan' && (
              <div className="dshot-tierspan">
                {[1, 2, 3, 4].map((tier, j) => {
                  const id = RUG_IDS.filter((r) => RUGS[r].tier === tier).slice(-1)[0];
                  return (
                    <figure key={tier} style={{ animationDelay: `${j * 0.9}s` }}>
                      <img src={rugSrc(RUGS[id])} alt="" />
                      <figcaption><b>{TIERS[tier].name}</b><span>{TIERS[tier].note.split('. ')[0]}</span></figcaption>
                    </figure>
                  );
                })}
              </div>
            )}
            {d.kind === 'money' && (
              <div className="dshot-money">
                <div className="dm-row" style={{ animationDelay: '0.3s' }}><span>Bought from Rashid</span><b className="neg">−£4.20</b></div>
                <div className="dm-row" style={{ animationDelay: '1.3s' }}><span>Sold to Samira</span><b className="pos">+£8.50</b></div>
                <div className="dm-row" style={{ animationDelay: '2.3s' }}><span>Rent, bread and wages</span><b className="neg">−£0.10</b></div>
                <div className="dm-row total" style={{ animationDelay: '3.4s' }}><span>Profit for tomorrow's stock</span><b className="pos">£4.20</b></div>
                <small style={{ animationDelay: '4.4s' }}>100 piastres = £1 · a labourer earns about £0.04 a day</small>
              </div>
            )}
            {d.kind === 'title' && (
              <>
                <div className="dshot-blur" style={{ backgroundImage: `url(${d.img})` }} />
                <div className="dshot-title"><small>GIZA · 1925</small><h1>Threads of Fortune</h1><span>A small stall. A wider world.</span></div>
              </>
            )}
          </div>
        );
      })}
      <div className="vignette" />
      {DOCUMENTARY[idx]?.kind !== 'title' && (
        <div className={`subtitle ${idx === 0 ? 'first' : ''}`} style={{ opacity: textOn ? 1 : 0 }} data-testid="doc-subtitle">
          {DOCUMENTARY[idx]?.text}
        </div>
      )}
      {canSkip ? (
        <button className="ghost-btn skip" onClick={finish} data-testid="skip-opening">
          Skip
        </button>
      ) : (
        <span className="skip first-watch">Your first look at the game</span>
      )}
      <div className="progress" style={{ width: `${Math.min(100, (elapsed / TOTAL) * 100)}%` }} />
    </div>
  );
}

export function DayOneCard({ onBegin }: { onBegin: () => void }) {
  return (
    <div className="dayone" data-testid="dayone">
      <div className="card">
        <div className="d">10 MARCH 1925 · GIZA</div>
        <h1>DAY ONE</h1>
        <h2>OPEN THE STALL</h2>
        <p>Three rugs. One hundred and twenty piastres. One cat.</p>
        <button className="big-btn" onClick={onBegin} data-testid="begin-day-one">
          Begin Day One
        </button>
      </div>
    </div>
  );
}
