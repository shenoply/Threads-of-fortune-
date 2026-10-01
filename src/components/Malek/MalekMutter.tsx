// Malek talking to himself while you are in his shop: every so often an Egyptian phrase, spoken, with
// the Arabic, a reading and the meaning on screen. Nobody has to ask him.
import { useEffect, useRef, useState } from 'react';
import { pickArabic, type ArabicPhrase } from '../../data/malekArabic';
import { sayMalekArabic, stopMalekArabic } from '../../game/audio/malekArabic';
import { voice } from '../../game/audio/voice';

/** seconds before the first phrase, and between phrases */
const FIRST: [number, number] = [4, 7];
const EVERY: [number, number] = [14, 24];
const SHOW_MS = 4200;
const within = ([a, b]: [number, number]) => (a + Math.random() * (b - a)) * 1000;

export function MalekMutter({ quiet }: { quiet?: boolean }) {
  const [said, setSaid] = useState<ArabicPhrase | null>(null);
  const last = useRef<string | null>(null);
  const quietRef = useRef(quiet); quietRef.current = quiet;
  useEffect(() => {
    let next: number, hide: number;
    const speak = () => {
      // he keeps it to himself while you are reading something of his
      if (!quietRef.current && !voice.playing) {
        const p = pickArabic('shop', last.current);
        last.current = p.id;
        setSaid(p);
        sayMalekArabic(p.id);
        window.clearTimeout(hide);
        hide = window.setTimeout(() => setSaid(null), SHOW_MS);
      }
      next = window.setTimeout(speak, within(EVERY));
    };
    next = window.setTimeout(speak, within(FIRST));
    return () => { window.clearTimeout(next); window.clearTimeout(hide); stopMalekArabic(); };
  }, []);
  if (!said) return null;
  return (
    <div className="malek-mutter" role="status" data-testid="malek-mutter" data-phrase={said.id}>
      <b>MALEK, to himself</b>
      <span className="malek-mutter__ar" lang="ar" dir="rtl">{said.ar}</span>
      <span className="malek-mutter__en"><i>{said.latin}</i> · {said.en}</span>
    </div>
  );
}
