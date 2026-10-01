import { useEffect, useMemo, useRef, useState } from 'react';
import { useGame } from '../../game/state/store';
import { bulletin, newsStart, type Lang } from '../../game/radio/bulletin';
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

  const news = newsStart(segs);
  const start = (l: Lang, from = 0) => {
    audio.sfx('tap');
    setOn(true); setLine(-1);
    if ((g.radioHeard ?? 0) < g.day) { useGame.setState({ radioHeard: g.day }); g.passTime(20); }
    if (!g.onboard?.radio) useGame.setState({ onboard: { ...(useGame.getState().onboard ?? {}), radio: true } });
    radio.play(l, bulletin(g.day, l), (i) => setLine(i), () => { setOn(false); setLine(-1); }, 1, from);
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
          <div className={`radio-pic ${on ? 'on' : ''}`}><img src="art/radio-stall.webp" alt="The wireless set" draggable={false} /></div>
          <div className="radio-face">
            <div className="radio-knobs">
              <button className={`knob ${lang === 'en' ? 'sel' : ''}`} onClick={() => tune('en')} data-testid="radio-en">Radio Giza<small>English</small></button>
              <button className="knob power" onClick={() => (on ? stop() : start(lang))} data-testid="radio-power">{on ? '■' : '▶'}</button>
              <button className={`knob ${lang === 'ar' ? 'sel' : ''}`} onClick={() => tune('ar')} data-testid="radio-ar">إذاعة الجيزة<small>عربي</small></button>
            </div>
          </div>
        </div>
        {line < news && <button className="btn small radio-skip" onClick={() => start(lang, news)} data-testid="radio-skip-news">{lang === 'ar' ? 'إلى الأخبار ⏭' : 'Skip to the news ⏭'}</button>}
        <div className={`radio-captions ${lang === 'ar' ? 'rtl' : ''}`} ref={box} dir={lang === 'ar' ? 'rtl' : 'ltr'} data-testid="radio-captions">
          {!on && line < 0 && <p className="hint">{lang === 'ar' ? 'اضغط زر التشغيل لسماع نشرة اليوم.' : 'Press play to hear this morning\'s bulletin.'}</p>}
          {/* tap a line to hear it from there */}
          {paras.map((p, i) => <p key={i} className={`${line >= p.from && line <= p.to ? 'on' : line > p.to ? 'past' : ''} seekable`} onClick={() => start(lang, p.from)} title={lang === 'ar' ? 'استمع من هنا' : 'Play from here'} data-testid={`radio-line-${i}`}>{p.text}</p>)}
        </div>
        <button className="btn radio-close" onClick={() => { stop(); onClose(); }} data-testid="radio-close">Turn it off</button>
      </div>
    </div>
  );
}

function localStorageGet(k: string) { try { return localStorage.getItem(k); } catch { return null; } }
function localStorageSet(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* private mode */ } }
