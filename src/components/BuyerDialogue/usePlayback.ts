import { useCallback, useEffect, useRef, useState } from 'react';
import type { Line } from '../../game/types';
import { voice } from '../../game/audio/voice';
import { sayMalekArabic } from '../../game/audio/malekArabic';

export interface PlaybackView {
  seller: string;
  buyer: string;
  buyerMood?: Line['mood'];
  narrator: string;
  caption: string;
  speaking: 'seller' | 'buyer' | null;
  typed: number; // chars revealed of the active line
  active: Line | null;
  busy: boolean;
  lastSpeaker: 'seller' | 'buyer' | 'other';
}

const CPS = 70;

/** Plays encounter lines one at a time with a typewriter reveal, so seller and buyer never talk over each other. */
export function usePlayback(log: Line[], resetKey: string, buyerId = '') {
  const buyerRef = useRef(buyerId);
  buyerRef.current = buyerId;
  const [view, setView] = useState<PlaybackView>({ seller: '', buyer: '', narrator: '', caption: '', speaking: null, typed: 0, active: null, busy: false, lastSpeaker: 'other' });
  const played = useRef(0);
  const queue = useRef<Line[]>([]);
  const timer = useRef<number | null>(null);
  const activeRef = useRef<Line | null>(null);
  const typedRef = useRef(0);

  const clear = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  };

  const commit = useCallback((l: Line, v: PlaybackView): PlaybackView => {
    const n = { ...v };
    if (l.speaker === 'seller') { n.seller = l.text; n.lastSpeaker = 'seller'; }
    else if (l.speaker === 'buyer') { n.buyer = l.text; n.buyerMood = l.mood; n.lastSpeaker = 'buyer'; }
    else if (l.speaker === 'narrator') n.narrator = l.text;
    else n.caption = l.text;
    return n;
  }, []);

  const step = useCallback(() => {
    clear();
    const next = queue.current.shift();
    if (!next) {
      activeRef.current = null;
      setView((v) => ({ ...v, speaking: null, active: null, busy: false }));
      return;
    }
    activeRef.current = next;
    typedRef.current = 0;
    const isTalk = next.speaker === 'seller' || next.speaker === 'buyer';
    setView((v) => {
      const n = commit(next, v);
      return { ...n, speaking: isTalk ? (next.speaker as 'seller' | 'buyer') : null, typed: isTalk ? 0 : next.text.length, active: next, busy: true };
    });
    const speaker = next.speaker === 'seller' ? 'seller' : next.speaker === 'buyer' ? buyerRef.current : 'narrator';
    // If this character's voice file is still downloading, wait a moment rather than skip the recording.
    const waited = (next as Line & { _w?: number })._w ?? 0;
    if (voice.isLoading(speaker) && waited < 20) {
      (next as Line & { _w?: number })._w = waited + 1;
      queue.current.unshift(next);
      activeRef.current = null;
      timer.current = window.setTimeout(step, 150);
      return;
    }
    // Malek's Arabic "Ha?" / "Bah!" at the start of a line
    if (next.ar) sayMalekArabic(next.ar);
    let voiced = voice.has(speaker, next.text);
    if (voiced) voice.say(speaker, next.text).then(() => { voiced = false; });
    const waitVoice = (then: () => void) => {
      const poll = () => {
        if (voiced && voice.playing) timer.current = window.setTimeout(poll, 150);
        else then();
      };
      poll();
    };
    if (!isTalk) {
      timer.current = window.setTimeout(() => waitVoice(step), next.speaker === 'narrator' ? 350 : 900);
      return;
    }
    const tick = () => {
      typedRef.current = Math.min(next.text.length, typedRef.current + 2);
      setView((v) => ({ ...v, typed: typedRef.current }));
      if (typedRef.current < next.text.length) timer.current = window.setTimeout(tick, 2000 / CPS);
      else waitVoice(() => { timer.current = window.setTimeout(step, voice.count ? 300 : 450 + next.text.length * 10); });
    };
    timer.current = window.setTimeout(tick, 120);
  }, [commit]);

  const logRef = useRef(log);
  logRef.current = log;
  const mounted = useRef(false);
  // Reset on a new encounter. On first mount (e.g. returning from another tab) show the conversation as it stands.
  useEffect(() => {
    clear();
    queue.current = [];
    activeRef.current = null;
    let v: PlaybackView = { seller: '', buyer: '', narrator: '', caption: '', speaking: null, typed: 0, active: null, busy: false, lastSpeaker: 'other' };
    if (!mounted.current && logRef.current.some((l) => l.speaker === 'seller')) {
      for (const l of logRef.current) v = commit(l, v);
      v = { ...v, typed: 9999 };
      played.current = logRef.current.length;
    } else played.current = 0;
    mounted.current = true;
    setView(v);
  }, [resetKey, commit]);

  useEffect(() => {
    if (log.length < played.current) played.current = 0;
    if (log.length === played.current) return;
    const fresh = log.slice(played.current);
    played.current = log.length;
    // Anything still waiting from an earlier turn is shown instantly, then the new turn plays.
    if (activeRef.current || queue.current.length) {
      clear();
      let v: PlaybackView | null = null;
      setView((cur) => {
        let n = cur;
        if (activeRef.current) n = commit(activeRef.current, n);
        for (const l of queue.current) n = commit(l, n);
        v = n;
        return { ...n, typed: 9999 };
      });
      void v;
      queue.current = [];
      activeRef.current = null;
    }
    // Narrator guidance appears at once; spoken lines queue.
    const narr = fresh.filter((l) => l.speaker === 'narrator');
    if (narr.length) setView((v) => ({ ...v, narrator: narr[narr.length - 1].text }));
    queue.current.push(...fresh.filter((l) => l.speaker !== 'narrator'));
    step();
    return undefined;
  }, [log, step, commit]);

  useEffect(() => () => { clear(); voice.stop(); }, []);

  const skip = useCallback(() => {
    const a = activeRef.current;
    if (!a) return;
    if (typedRef.current < a.text.length && (a.speaker === 'seller' || a.speaker === 'buyer')) {
      clear();
      typedRef.current = a.text.length;
      setView((v) => ({ ...v, typed: a.text.length }));
      timer.current = window.setTimeout(step, 500);
    } else {
      voice.stop();
      step();
    }
  }, [step]);

  return { view, skip };
}
