// Malek talking to himself in his shop, in his own recorded voice: an Egyptian phrase or one of his own
// sentences, with the Arabic, a reading and the meaning on screen. Nothing plays by itself: the player
// presses "Hear Malek" and he says the next one.
import { useEffect, useRef, useState } from 'react';
import { MALEK_ARABIC, type ArabicPhrase } from '../../data/malekArabic';
import { sayMalekArabic, stopMalekArabic } from '../../game/audio/malekArabic';
import { voice } from '../../game/audio/voice';

const SHOW_MS = 4200;
const SHOP = MALEK_ARABIC.filter((p) => p.where.includes('shop'));

export function MalekMutter({ quiet }: { quiet?: boolean }) {
  const [said, setSaid] = useState<ArabicPhrase | null>(null);
  const turn = useRef(Math.floor(Math.random() * SHOP.length));
  const hide = useRef(0);
  useEffect(() => () => { window.clearTimeout(hide.current); stopMalekArabic(); }, []);
  const speak = () => {
    const p = SHOP[turn.current % SHOP.length];
    turn.current += 1;
    voice.stop();
    setSaid(p);
    sayMalekArabic(p.id);
    window.clearTimeout(hide.current);
    hide.current = window.setTimeout(() => setSaid(null), Math.max(SHOW_MS, p.en.length * 75));
  };
  return (
    <>
      {!quiet && (
        <button className="malek-listen" onClick={speak} data-testid="malek-listen" aria-label="Hear Malek talk to himself">
          <span aria-hidden="true">🔊</span> Hear Malek
        </button>
      )}
      {said && !quiet && (
        <div className="malek-mutter" role="status" data-testid="malek-mutter" data-phrase={said.id}>
          <b>MALEK, to himself</b>
          <span className="malek-mutter__ar" lang="ar" dir="rtl">{said.ar}</span>
          <span className="malek-mutter__en"><i>{said.latin}</i> · {said.en}</span>
        </div>
      )}
    </>
  );
}
