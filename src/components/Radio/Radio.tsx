import { useEffect, useMemo, useRef, useState } from 'react';
import { useGame } from '../../game/state/store';
import { bulletin, type Lang } from '../../game/radio/bulletin';
import { radio } from '../../game/radio/player';
import { audio } from '../../game/audio/engine';

/** The wireless set: two channels, one announcer each, reading this morning's bulletin. */
export function Radio({ onClose }: { onClose: () => void }) {
  const g = useGame();
  const [lang, setLang] = useState<Lang>(() => (localStorageGet('tof-radio-lang') as Lang) || 'en');
  const segs = useMemo(() => bulletin(g.day, lang), [g.day, lang]);
  // pieces that belong to one sentence (a date, a sentence around a town's name) show as one paragraph
  const paras = useMemo(() => {
    const out: { text: string; from: number; to: number }[] = [];
    segs.forEach((s, i) => {
      const prev = segs[i - 1];
      const joins = prev && (/^(ord|mon|y19)/.test(s.key) || s.key.startsWith('city-') || prev.key.startsWith('city-') || (s.key.replace(/-\d+$/, '') === prev.key.replace(/-\d+$/, '') && /-\d+$/.test(s.key)));
      if (joins) { const last = out[out.length - 1]; last.text += ' ' + s.text; last.to = i; }
      else out.push({ text: s.text, from: i, to: i });
    });
    return out;
  }, [segs]);
  const [line, setLine] = useState(-1);
  const [on, setOn] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const start = (l: Lang) => {
    audio.sfx('tap');
    setOn(true); setLine(-1);
    if ((g.radioHeard ?? 0) < g.day) { useGame.setState({ radioHeard: g.day }); g.passTime(20); }
    if (!g.onboard?.radio) useGame.setState({ onboard: { ...(useGame.getState().onboard ?? {}), radio: true } });
    radio.play(l, bulletin(g.day, l), (i) => setLine(i), () => { setOn(false); setLine(-1); });
  };
  const stop = () => { radio.stop(); setOn(false); setLine(-1); };
  const tune = (l: Lang) => {
    if (l === lang) return;
    setLang(l); localStorageSet('tof-radio-lang', l);
    if (on) start(l);
  };
  useEffect(() => () => radio.stop(), []);
  useEffect(() => { box.current?.querySelector('.on')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [line]);

  return (
    <div className="radio-wrap" role="dialog" aria-label="Radio Giza" data-testid="radio" onClick={() => { stop(); onClose(); }}>
      <div className="radio-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="radio-set">
          <div className="radio-arch">
            <div className="radio-grille"><span className={on ? 'glow on' : 'glow'} /></div>
          </div>
          <div className="radio-face">
            <div className="radio-dial" aria-hidden>
              <div className="needle" style={{ left: lang === 'en' ? '28%' : '72%' }} />
              <span>EN</span><span>ع</span>
            </div>
            <div className="radio-knobs">
              <button className={`knob ${lang === 'en' ? 'sel' : ''}`} onClick={() => tune('en')} data-testid="radio-en">Radio Giza<small>English</small></button>
              <button className="knob power" onClick={() => (on ? stop() : start(lang))} data-testid="radio-power">{on ? '■' : '▶'}</button>
              <button className={`knob ${lang === 'ar' ? 'sel' : ''}`} onClick={() => tune('ar')} data-testid="radio-ar">إذاعة الجيزة<small>عربي</small></button>
            </div>
          </div>
        </div>
        <div className={`radio-captions ${lang === 'ar' ? 'rtl' : ''}`} ref={box} dir={lang === 'ar' ? 'rtl' : 'ltr'} data-testid="radio-captions">
          {!on && line < 0 && <p className="hint">{lang === 'ar' ? 'اضغط زر التشغيل لسماع نشرة اليوم.' : 'Press play to hear this morning\'s bulletin.'}</p>}
          {paras.map((p, i) => <p key={i} className={line >= p.from && line <= p.to ? 'on' : line > p.to ? 'past' : ''}>{p.text}</p>)}
        </div>
        <button className="btn radio-close" onClick={() => { stop(); onClose(); }} data-testid="radio-close">Turn it off</button>
      </div>
    </div>
  );
}

function localStorageGet(k: string) { try { return localStorage.getItem(k); } catch { return null; } }
function localStorageSet(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* private mode */ } }
